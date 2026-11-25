-- ==============================================================================
-- LANGKAH 3: SINKRONISASI COUNTER, INDEX & AKTIFKAN TRIGGER OTOMATIS
-- File: supabase_trx_step3_finalize.sql
-- Jalankan file ini SETELAH Langkah 2 (backfill_trx_seq_batch) menghasilkan remaining_count = 0.
-- ==============================================================================

-- 1. Tangkap jika ada 1-2 transaksi baru yang masuk saat jeda antar langkah
SELECT * FROM public.backfill_trx_seq_batch(3000);

-- 2. Sinkronkan tabel counter dengan nomor terakhir masing-masing toko
WITH per_store_date AS (
  SELECT
    COALESCE(NULLIF(TRIM(store_id::text), ''), 'default') AS s_key,
    LEFT(timestamp::text, 10)::date AS tx_date,
    MAX(trx_seq_lifetime) AS max_lt,
    MAX(trx_seq_daily) AS max_dy
  FROM public.transactions
  WHERE trx_seq_lifetime IS NOT NULL
    AND LOWER(TRIM(COALESCE(kategori::text, ''))) NOT LIKE 'isi%'
    AND timestamp IS NOT NULL
    AND timestamp::text ~ '^\d{4}-\d{2}-\d{2}'
  GROUP BY 1, 2
),
latest_per_store AS (
  SELECT DISTINCT ON (s_key)
    s_key,
    MAX(max_lt) OVER (PARTITION BY s_key) AS max_lifetime,
    tx_date AS max_date,
    max_dy AS max_daily
  FROM per_store_date
  ORDER BY s_key, tx_date DESC
)
INSERT INTO public.store_trx_counters (
  store_id, last_lifetime_seq, last_daily_date, last_daily_seq, updated_at
)
SELECT
  s_key, max_lifetime, max_date, max_daily, NOW()
FROM latest_per_store
ON CONFLICT (store_id) DO UPDATE SET
  last_lifetime_seq = GREATEST(public.store_trx_counters.last_lifetime_seq, EXCLUDED.last_lifetime_seq),
  last_daily_date = CASE
    WHEN public.store_trx_counters.last_daily_date IS NULL
      OR EXCLUDED.last_daily_date > public.store_trx_counters.last_daily_date
      THEN EXCLUDED.last_daily_date
    ELSE public.store_trx_counters.last_daily_date
  END,
  last_daily_seq = CASE
    WHEN public.store_trx_counters.last_daily_date IS NULL
      OR EXCLUDED.last_daily_date > public.store_trx_counters.last_daily_date
      THEN EXCLUDED.last_daily_seq
    WHEN EXCLUDED.last_daily_date = public.store_trx_counters.last_daily_date
      THEN GREATEST(public.store_trx_counters.last_daily_seq, EXCLUDED.last_daily_seq)
    ELSE public.store_trx_counters.last_daily_seq
  END,
  updated_at = NOW();

-- 3. Bersihkan index sementara & buat index permanen untuk query cepat
DROP INDEX IF EXISTS public.idx_transactions_unseq_ts;

CREATE INDEX IF NOT EXISTS idx_transactions_store_seq
  ON public.transactions (store_id, trx_seq_lifetime);

CREATE INDEX IF NOT EXISTS idx_transactions_store_date_seq
  ON public.transactions (store_id, timestamp, trx_seq_daily);

-- 4. Trigger otomatis saat INSERT transaksi baru
CREATE OR REPLACE FUNCTION public.fn_transactions_assign_seq_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_key TEXT;
  v_tx_date DATE;
  v_cur_lifetime BIGINT;
  v_cur_date DATE;
  v_cur_daily INTEGER;
  v_new_lifetime BIGINT;
  v_new_daily INTEGER;
BEGIN
  -- Transaksi Tambah Saldo / Modal (Isi ...) tidak memakai nomor urut transaksi konsumen
  IF LOWER(TRIM(COALESCE(NEW.kategori::text, ''))) LIKE 'isi%' THEN
    NEW.trx_seq_lifetime := NULL;
    NEW.trx_seq_daily := NULL;
    RETURN NEW;
  END IF;

  -- Jika ID sudah ada (misal retry upsert offline), jangan increment counter lagi
  IF EXISTS (SELECT 1 FROM public.transactions WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_store_key := COALESCE(NULLIF(TRIM(NEW.store_id::text), ''), 'default');

  BEGIN
    v_tx_date := LEFT(NEW.timestamp::text, 10)::date;
  EXCEPTION WHEN OTHERS THEN
    v_tx_date := CURRENT_DATE;
  END;

  IF v_tx_date IS NULL THEN
    v_tx_date := CURRENT_DATE;
  END IF;

  INSERT INTO public.store_trx_counters (
    store_id, last_lifetime_seq, last_daily_date, last_daily_seq, updated_at
  )
  VALUES (v_store_key, 0, v_tx_date, 0, NOW())
  ON CONFLICT (store_id) DO NOTHING;

  SELECT last_lifetime_seq, last_daily_date, last_daily_seq
  INTO v_cur_lifetime, v_cur_date, v_cur_daily
  FROM public.store_trx_counters
  WHERE store_id = v_store_key
  FOR UPDATE;

  v_new_lifetime := COALESCE(v_cur_lifetime, 0) + 1;

  IF v_cur_date IS NULL OR v_tx_date > v_cur_date THEN
    v_new_daily := 1;
    UPDATE public.store_trx_counters
    SET
      last_lifetime_seq = v_new_lifetime,
      last_daily_date = v_tx_date,
      last_daily_seq = v_new_daily,
      updated_at = NOW()
    WHERE store_id = v_store_key;

  ELSIF v_tx_date = v_cur_date THEN
    v_new_daily := COALESCE(v_cur_daily, 0) + 1;
    UPDATE public.store_trx_counters
    SET
      last_lifetime_seq = v_new_lifetime,
      last_daily_seq = v_new_daily,
      updated_at = NOW()
    WHERE store_id = v_store_key;

  ELSE
    SELECT COALESCE(MAX(trx_seq_daily), 0) + 1
    INTO v_new_daily
    FROM public.transactions
    WHERE COALESCE(NULLIF(TRIM(store_id::text), ''), 'default') = v_store_key
      AND timestamp IS NOT NULL
      AND timestamp::text ~ '^\d{4}-\d{2}-\d{2}'
      AND LEFT(timestamp::text, 10)::date = v_tx_date
      AND trx_seq_daily IS NOT NULL;

    UPDATE public.store_trx_counters
    SET
      last_lifetime_seq = v_new_lifetime,
      updated_at = NOW()
    WHERE store_id = v_store_key;
  END IF;

  NEW.trx_seq_lifetime := v_new_lifetime;
  NEW.trx_seq_daily := v_new_daily;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_assign_seq_insert ON public.transactions;
CREATE TRIGGER trg_transactions_assign_seq_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_transactions_assign_seq_insert();

-- 5. Trigger proteksi saat EDIT (UPDATE): nomor ID tidak pernah berubah
CREATE OR REPLACE FUNCTION public.fn_transactions_protect_seq_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.trx_seq_lifetime IS NOT NULL THEN
    NEW.trx_seq_lifetime := OLD.trx_seq_lifetime;
  END IF;
  IF OLD.trx_seq_daily IS NOT NULL THEN
    NEW.trx_seq_daily := OLD.trx_seq_daily;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_protect_seq_update ON public.transactions;
CREATE TRIGGER trg_transactions_protect_seq_update
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_transactions_protect_seq_update();

