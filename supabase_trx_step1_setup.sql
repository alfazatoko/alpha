-- ==============================================================================
-- LANGKAH 1: PERSIAPAN KOLOM, COUNTER & FUNGSI BACKFILL PER-BATCH (SUPER CEPAT)
-- File: supabase_trx_step1_setup.sql
-- Jalankan file ini di Supabase SQL Editor (selesai dalam < 1 detik).
-- Setelah selesai, lanjut ke Langkah 2 (jalankan backfill per batch).
-- ==============================================================================

-- 1. Tambah kolom urutan permanen (metadata-only, instan, tidak mengubah data lama)
ALTER TABLE IF EXISTS public.transactions
  ADD COLUMN IF NOT EXISTS trx_seq_lifetime BIGINT;

ALTER TABLE IF EXISTS public.transactions
  ADD COLUMN IF NOT EXISTS trx_seq_daily INTEGER;

-- Index sementara khusus baris yang belum bernomor agar backfill berjalan secepat kilat
CREATE INDEX IF NOT EXISTS idx_transactions_unseq_ts
  ON public.transactions (timestamp ASC, id ASC)
  WHERE trx_seq_lifetime IS NULL;

-- 2. Tabel counter atomik per toko
CREATE TABLE IF NOT EXISTS public.store_trx_counters (
  store_id TEXT PRIMARY KEY,
  last_lifetime_seq BIGINT NOT NULL DEFAULT 0,
  last_daily_date DATE,
  last_daily_seq INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store_trx_counters ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.store_trx_counters TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "store_trx_counters_all_access" ON public.store_trx_counters;
CREATE POLICY "store_trx_counters_all_access"
  ON public.store_trx_counters
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Optimasi trigger profit (jika ada): jangan hitung ulang profit bila UPDATE hanya mengisi nomor ID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_transactions_profit_auto_sync'
      AND tgrelid = 'public.transactions'::regclass
  ) THEN
    EXECUTE $exec$
      CREATE OR REPLACE FUNCTION public.trg_fn_sync_profit_on_transaction()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $fn$
      DECLARE
        v_date DATE;
        v_user_id TEXT;
        v_store_id TEXT;
      BEGIN
        IF TG_OP = 'UPDATE'
           AND OLD.nominal IS NOT DISTINCT FROM NEW.nominal
           AND OLD.admin_fee IS NOT DISTINCT FROM NEW.admin_fee
           AND OLD.kategori IS NOT DISTINCT FROM NEW.kategori
           AND OLD.keterangan IS NOT DISTINCT FROM NEW.keterangan
           AND OLD.timestamp IS NOT DISTINCT FROM NEW.timestamp
           AND OLD.store_id IS NOT DISTINCT FROM NEW.store_id
           AND OLD.kasir_id IS NOT DISTINCT FROM NEW.kasir_id
           AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id THEN
          RETURN NULL;
        END IF;

        IF TG_OP = 'DELETE' THEN
          v_date := OLD.timestamp::date;
          v_user_id := OLD.user_id::text;
          v_store_id := COALESCE(NULLIF(TRIM(OLD.store_id::text), ''), 'all');
        ELSE
          v_date := NEW.timestamp::date;
          v_user_id := NEW.user_id::text;
          v_store_id := COALESCE(NULLIF(TRIM(NEW.store_id::text), ''), 'all');
        END IF;

        PERFORM public.recalc_profit_single_date(v_user_id, v_date, v_store_id);

        IF TG_OP = 'UPDATE' AND OLD.timestamp::date IS DISTINCT FROM NEW.timestamp::date THEN
          PERFORM public.recalc_profit_single_date(OLD.user_id::text, OLD.timestamp::date, COALESCE(NULLIF(TRIM(OLD.store_id::text), ''), 'all'));
        END IF;

        RETURN NULL;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN NULL;
      END;
      $fn$;
    $exec$;
  END IF;
END $$;

-- 4. Fungsi backfill ringan per batch (default 3.000 baris sekali jalan agar anti-timeout)
CREATE OR REPLACE FUNCTION public.backfill_trx_seq_batch(
  p_batch_size INT DEFAULT 3000
)
RETURNS TABLE (
  updated_count INT,
  remaining_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INT := 0;
  v_remaining BIGINT := 0;
BEGIN
  WITH target_rows AS (
    SELECT
      t.id,
      COALESCE(NULLIF(TRIM(t.store_id::text), ''), 'default') AS s_key,
      LEFT(t.timestamp::text, 10)::date AS tx_date,
      t.timestamp
    FROM public.transactions t
    WHERE t.trx_seq_lifetime IS NULL
      AND LOWER(TRIM(COALESCE(t.kategori::text, ''))) NOT LIKE 'isi%'
      AND t.timestamp IS NOT NULL
      AND t.timestamp::text ~ '^\d{4}-\d{2}-\d{2}'
    ORDER BY t.timestamp ASC, t.id ASC
    LIMIT GREATEST(COALESCE(p_batch_size, 3000), 1)
  ),
  existing_daily AS (
    SELECT
      COALESCE(NULLIF(TRIM(t.store_id::text), ''), 'default') AS s_key,
      LEFT(t.timestamp::text, 10)::date AS tx_date,
      MAX(t.trx_seq_lifetime) AS max_lt,
      MAX(t.trx_seq_daily) AS max_dy
    FROM public.transactions t
    WHERE t.trx_seq_lifetime IS NOT NULL
      AND t.timestamp IS NOT NULL
      AND t.timestamp::text ~ '^\d{4}-\d{2}-\d{2}'
    GROUP BY 1, 2
  ),
  store_base AS (
    SELECT s_key, COALESCE(MAX(max_lt), 0) AS base_lifetime
    FROM existing_daily
    GROUP BY s_key
  ),
  numbered AS (
    SELECT
      tr.id,
      COALESCE(sb.base_lifetime, 0) + ROW_NUMBER() OVER (
        PARTITION BY tr.s_key
        ORDER BY tr.timestamp ASC, tr.id ASC
      ) AS calc_lifetime,
      COALESCE(ed.max_dy, 0) + ROW_NUMBER() OVER (
        PARTITION BY tr.s_key, tr.tx_date
        ORDER BY tr.timestamp ASC, tr.id ASC
      ) AS calc_daily
    FROM target_rows tr
    LEFT JOIN store_base sb ON sb.s_key = tr.s_key
    LEFT JOIN existing_daily ed ON ed.s_key = tr.s_key AND ed.tx_date = tr.tx_date
  ),
  upd AS (
    UPDATE public.transactions t
    SET
      trx_seq_lifetime = n.calc_lifetime,
      trx_seq_daily = n.calc_daily
    FROM numbered n
    WHERE t.id = n.id
    RETURNING t.id
  )
  SELECT COUNT(*)::INT INTO v_updated FROM upd;

  SELECT COUNT(*)
  INTO v_remaining
  FROM public.transactions t
  WHERE t.trx_seq_lifetime IS NULL
    AND LOWER(TRIM(COALESCE(t.kategori::text, ''))) NOT LIKE 'isi%'
    AND t.timestamp IS NOT NULL
    AND t.timestamp::text ~ '^\d{4}-\d{2}-\d{2}';

  RETURN QUERY SELECT v_updated, v_remaining;
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_trx_seq_batch TO anon, authenticated, service_role;

