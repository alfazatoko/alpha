-- ==============================================================================
-- SISTEM DATABASE PROFIT & LABA ADMIN (ALFAZA CELL) - VERSI FINAL BERSIH
-- File: supabase_profit_transaksi.sql
-- ==============================================================================

-- 0. HAPUS TRIGGER SEMENTARA AGAR APLIKASI SEGERA NORMAL & LANCAR
DROP TRIGGER IF EXISTS trg_transactions_profit_auto_sync ON public.transactions;

-- PASTIKAN TABEL TRANSACTIONS MEMILIKI KOLOM user_id & store_id
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS store_id TEXT;

-- 1. BERSIHKAN TABEL REKAP LAMA (TRANSAKSI ASLI 100% AMAN)
DROP TABLE IF EXISTS public.profit_harian CASCADE;
DROP TABLE IF EXISTS public.profit_bulanan CASCADE;


-- 2. BUAT TABEL PROFIT HARIAN BARU
CREATE TABLE public.profit_harian (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',
  store_id TEXT NOT NULL DEFAULT 'all',
  kasir_id TEXT NOT NULL DEFAULT 'Semua',
  kasir_name TEXT,
  tanggal DATE NOT NULL,
  total_profit_admin NUMERIC NOT NULL DEFAULT 0,
  admin_tunai NUMERIC NOT NULL DEFAULT 0,
  admin_non_tunai NUMERIC NOT NULL DEFAULT 0,
  total_transaksi INTEGER NOT NULL DEFAULT 0,
  total_omzet NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_profit_harian UNIQUE(user_id, store_id, kasir_id, tanggal)
);

CREATE INDEX idx_profit_harian_lookup 
ON public.profit_harian (user_id, store_id, kasir_id, tanggal DESC);

CREATE INDEX idx_profit_harian_tgl 
ON public.profit_harian (tanggal DESC);


-- 3. BUAT TABEL PROFIT BULANAN BARU
CREATE TABLE public.profit_bulanan (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',
  store_id TEXT NOT NULL DEFAULT 'all',
  kasir_id TEXT NOT NULL DEFAULT 'Semua',
  kasir_name TEXT,
  bulan TEXT NOT NULL,
  tahun INTEGER NOT NULL,
  bulan_angka INTEGER NOT NULL,
  nama_bulan TEXT NOT NULL,
  total_profit_admin NUMERIC NOT NULL DEFAULT 0,
  admin_tunai NUMERIC NOT NULL DEFAULT 0,
  admin_non_tunai NUMERIC NOT NULL DEFAULT 0,
  total_transaksi INTEGER NOT NULL DEFAULT 0,
  total_omzet NUMERIC NOT NULL DEFAULT 0,
  hari_terbaik_tanggal DATE,
  hari_terbaik_profit NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_profit_bulanan UNIQUE(user_id, store_id, kasir_id, bulan)
);

CREATE INDEX idx_profit_bulanan_lookup 
ON public.profit_bulanan (user_id, store_id, kasir_id, tahun, bulan_angka);


-- 4. RLS & PERMISSIONS
ALTER TABLE public.profit_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_bulanan ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.profit_harian TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profit_bulanan TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "profit_harian_all_access" ON public.profit_harian;
CREATE POLICY "profit_harian_all_access" ON public.profit_harian FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profit_bulanan_all_access" ON public.profit_bulanan;
CREATE POLICY "profit_bulanan_all_access" ON public.profit_bulanan FOR ALL USING (true) WITH CHECK (true);

-- Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profit_harian;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profit_bulanan;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;


-- HAPUS FUNGSI LAMA AGAR TIDAK TERJADI BENTROK OVERLOAD / CACHE FUNCTION
DROP FUNCTION IF EXISTS public.recalc_profit_single_date(text, date, text);
DROP FUNCTION IF EXISTS public.recalc_profit_single_date(text, date);
DROP FUNCTION IF EXISTS public.rekap_ulang_semua_profit();
DROP FUNCTION IF EXISTS public.rekap_ulang_semua_profit(text);
DROP FUNCTION IF EXISTS public.trg_fn_sync_profit_on_transaction();


-- 5. FUNGSI SQL: REKAP ULANG SATU HARI (MENGGUNAKAN CTE AGAR 100% BEBAS DARI ERROR GROUP BY)
CREATE OR REPLACE FUNCTION public.recalc_profit_single_date(
  p_user_id TEXT,
  p_date DATE,
  p_store_id TEXT DEFAULT 'all'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_key TEXT;
  v_year INT;
  v_month_num INT;
  v_month_name TEXT;
  v_month_names TEXT[] := ARRAY['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
BEGIN
  IF p_date IS NULL THEN RETURN; END IF;
  
  v_month_key := to_char(p_date, 'YYYY-MM');
  v_year := EXTRACT(YEAR FROM p_date)::INT;
  v_month_num := EXTRACT(MONTH FROM p_date)::INT;
  v_month_name := v_month_names[v_month_num] || ' ' || v_year::TEXT;

  -- 5A. Hapus data harian lama untuk tanggal & user ini
  DELETE FROM public.profit_harian 
  WHERE tanggal = p_date 
    AND (p_user_id IS NULL OR p_user_id = '' OR user_id IS NULL OR user_id = p_user_id)
    AND (p_store_id = 'all' OR store_id = p_store_id);

  -- 5B. Insert Rekap Harian per Kasir (Menggunakan CTE raw_txs agar GROUP BY bersih)
  WITH raw_txs AS (
    SELECT
      COALESCE(t.user_id::text, '') AS c_user_id,
      COALESCE(NULLIF(TRIM(t.store_id::text), ''), 'all') AS c_store_id,
      COALESCE(NULLIF(TRIM(t.kasir_id::text), ''), 'Unknown') AS c_kasir_id,
      COALESCE(t.admin_fee, 0) AS c_admin_fee,
      COALESCE(t.nominal, 0) AS c_nominal,
      CASE WHEN UPPER(COALESCE(t.keterangan::text, '')) LIKE '%[NON_TUNAI]%' OR UPPER(COALESCE(t.keterangan::text, '')) LIKE '%[ADMIN_DALAM]%' THEN COALESCE(t.admin_fee, 0) ELSE 0 END AS c_admin_nontunai,
      CASE WHEN UPPER(COALESCE(t.keterangan::text, '')) NOT LIKE '%[NON_TUNAI]%' AND UPPER(COALESCE(t.keterangan::text, '')) NOT LIKE '%[ADMIN_DALAM]%' THEN COALESCE(t.admin_fee, 0) ELSE 0 END AS c_admin_tunai
    FROM public.transactions t
    WHERE t.timestamp::date = p_date
      AND (p_user_id IS NULL OR p_user_id = '' OR t.user_id IS NULL OR t.user_id::text = p_user_id)
      AND (p_store_id = 'all' OR t.store_id::text = p_store_id)
      AND LOWER(TRIM(COALESCE(t.kategori::text, ''))) NOT LIKE 'isi%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%isi modal%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%setor modal%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%real aplikasi%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%tambah saldo%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%topup saldo%'
      AND UPPER(COALESCE(t.keterangan::text, '')) NOT LIKE '%[KHUSUS]%'
  )
  INSERT INTO public.profit_harian (
    id, user_id, store_id, kasir_id, kasir_name, tanggal,
    total_profit_admin, admin_tunai, admin_non_tunai,
    total_transaksi, total_omzet, updated_at
  )
  SELECT
    (c_user_id || '_' || c_store_id || '_' || c_kasir_id || '_' || p_date::TEXT) AS id,
    c_user_id AS user_id,
    c_store_id AS store_id,
    c_kasir_id AS kasir_id,
    c_kasir_id AS kasir_name,
    p_date AS tanggal,
    COALESCE(SUM(c_admin_fee), 0) AS total_profit_admin,
    COALESCE(SUM(c_admin_tunai), 0) AS admin_tunai,
    COALESCE(SUM(c_admin_nontunai), 0) AS admin_non_tunai,
    COUNT(*)::INT AS total_transaksi,
    COALESCE(SUM(c_nominal), 0) AS total_omzet,
    NOW() AS updated_at
  FROM raw_txs
  GROUP BY c_user_id, c_store_id, c_kasir_id
  ON CONFLICT (id) DO UPDATE SET
    total_profit_admin = EXCLUDED.total_profit_admin,
    admin_tunai = EXCLUDED.admin_tunai,
    admin_non_tunai = EXCLUDED.admin_non_tunai,
    total_transaksi = EXCLUDED.total_transaksi,
    total_omzet = EXCLUDED.total_omzet,
    updated_at = NOW();

  -- 5C. Insert Rekap Harian GABUNGAN SEMUA KASIR (kasir_id = 'Semua')
  WITH raw_txs AS (
    SELECT
      COALESCE(t.user_id::text, '') AS c_user_id,
      COALESCE(NULLIF(TRIM(t.store_id::text), ''), 'all') AS c_store_id,
      COALESCE(t.admin_fee, 0) AS c_admin_fee,
      COALESCE(t.nominal, 0) AS c_nominal,
      CASE WHEN UPPER(COALESCE(t.keterangan::text, '')) LIKE '%[NON_TUNAI]%' OR UPPER(COALESCE(t.keterangan::text, '')) LIKE '%[ADMIN_DALAM]%' THEN COALESCE(t.admin_fee, 0) ELSE 0 END AS c_admin_nontunai,
      CASE WHEN UPPER(COALESCE(t.keterangan::text, '')) NOT LIKE '%[NON_TUNAI]%' AND UPPER(COALESCE(t.keterangan::text, '')) NOT LIKE '%[ADMIN_DALAM]%' THEN COALESCE(t.admin_fee, 0) ELSE 0 END AS c_admin_tunai
    FROM public.transactions t
    WHERE t.timestamp::date = p_date
      AND (p_user_id IS NULL OR p_user_id = '' OR t.user_id IS NULL OR t.user_id::text = p_user_id)
      AND (p_store_id = 'all' OR t.store_id::text = p_store_id)
      AND LOWER(TRIM(COALESCE(t.kategori::text, ''))) NOT LIKE 'isi%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%isi modal%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%setor modal%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%real aplikasi%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%tambah saldo%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%topup saldo%'
      AND UPPER(COALESCE(t.keterangan::text, '')) NOT LIKE '%[KHUSUS]%'
  )
  INSERT INTO public.profit_harian (
    id, user_id, store_id, kasir_id, kasir_name, tanggal,
    total_profit_admin, admin_tunai, admin_non_tunai,
    total_transaksi, total_omzet, updated_at
  )
  SELECT
    (c_user_id || '_' || c_store_id || '_Semua_' || p_date::TEXT) AS id,
    c_user_id AS user_id,
    c_store_id AS store_id,
    'Semua' AS kasir_id,
    'Gabungan Semua Kasir' AS kasir_name,
    p_date AS tanggal,
    COALESCE(SUM(c_admin_fee), 0) AS total_profit_admin,
    COALESCE(SUM(c_admin_tunai), 0) AS admin_tunai,
    COALESCE(SUM(c_admin_nontunai), 0) AS admin_non_tunai,
    COUNT(*)::INT AS total_transaksi,
    COALESCE(SUM(c_nominal), 0) AS total_omzet,
    NOW() AS updated_at
  FROM raw_txs
  GROUP BY c_user_id, c_store_id
  ON CONFLICT (id) DO UPDATE SET
    total_profit_admin = EXCLUDED.total_profit_admin,
    admin_tunai = EXCLUDED.admin_tunai,
    admin_non_tunai = EXCLUDED.admin_non_tunai,
    total_transaksi = EXCLUDED.total_transaksi,
    total_omzet = EXCLUDED.total_omzet,
    updated_at = NOW();

  -- 5D. Update Rekap BULANAN untuk bulan ini
  INSERT INTO public.profit_bulanan (
    id, user_id, store_id, kasir_id, kasir_name,
    bulan, tahun, bulan_angka, nama_bulan,
    total_profit_admin, admin_tunai, admin_non_tunai,
    total_transaksi, total_omzet,
    hari_terbaik_tanggal, hari_terbaik_profit, updated_at
  )
  SELECT
    (h.user_id || '_' || h.store_id || '_' || h.kasir_id || '_' || v_month_key) AS id,
    h.user_id,
    h.store_id,
    h.kasir_id,
    MAX(h.kasir_name),
    v_month_key AS bulan,
    v_year AS tahun,
    v_month_num AS bulan_angka,
    v_month_name AS nama_bulan,
    COALESCE(SUM(h.total_profit_admin), 0) AS total_profit_admin,
    COALESCE(SUM(h.admin_tunai), 0) AS admin_tunai,
    COALESCE(SUM(h.admin_non_tunai), 0) AS admin_non_tunai,
    COALESCE(SUM(h.total_transaksi), 0)::INT AS total_transaksi,
    COALESCE(SUM(h.total_omzet), 0) AS total_omzet,
    (SELECT tanggal FROM public.profit_harian bh WHERE bh.user_id = h.user_id AND bh.store_id = h.store_id AND bh.kasir_id = h.kasir_id AND to_char(bh.tanggal, 'YYYY-MM') = v_month_key ORDER BY bh.total_profit_admin DESC, bh.tanggal DESC LIMIT 1) AS hari_terbaik_tanggal,
    COALESCE((SELECT MAX(total_profit_admin) FROM public.profit_harian bh WHERE bh.user_id = h.user_id AND bh.store_id = h.store_id AND bh.kasir_id = h.kasir_id AND to_char(bh.tanggal, 'YYYY-MM') = v_month_key), 0) AS hari_terbaik_profit,
    NOW() AS updated_at
  FROM public.profit_harian h
  WHERE to_char(h.tanggal, 'YYYY-MM') = v_month_key
    AND (p_user_id IS NULL OR p_user_id = '' OR h.user_id IS NULL OR h.user_id = p_user_id)
    AND (p_store_id = 'all' OR h.store_id = p_store_id)
  GROUP BY h.user_id, h.store_id, h.kasir_id
  ON CONFLICT (id) DO UPDATE SET
    total_profit_admin = EXCLUDED.total_profit_admin,
    admin_tunai = EXCLUDED.admin_tunai,
    admin_non_tunai = EXCLUDED.admin_non_tunai,
    total_transaksi = EXCLUDED.total_transaksi,
    total_omzet = EXCLUDED.total_omzet,
    hari_terbaik_tanggal = EXCLUDED.hari_terbaik_tanggal,
    hari_terbaik_profit = EXCLUDED.hari_terbaik_profit,
    updated_at = NOW();

END;
$$;


-- 6. TRIGGER DATABASE: DILENGKAPI PENGAMAN TINGGI (FAIL-SAFE)
CREATE OR REPLACE FUNCTION public.trg_fn_sync_profit_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date DATE;
  v_user_id TEXT;
  v_store_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_date := OLD.timestamp::date;
    v_user_id := OLD.user_id::text;
    v_store_id := COALESCE(NULLIF(TRIM(OLD.store_id::text), ''), 'all');
  ELSE
    v_date := NEW.timestamp::date;
    v_user_id := NEW.user_id::text;
    v_store_id := COALESCE(NULLIF(TRIM(NEW.store_id::text), ''), 'all');
  END IF;

  -- Jalankan rekap instan hanya untuk tanggal transaksi tersebut
  PERFORM public.recalc_profit_single_date(v_user_id, v_date, v_store_id);

  IF TG_OP = 'UPDATE' AND OLD.timestamp::date IS DISTINCT FROM NEW.timestamp::date THEN
    PERFORM public.recalc_profit_single_date(OLD.user_id::text, OLD.timestamp::date, COALESCE(NULLIF(TRIM(OLD.store_id::text), ''), 'all'));
  END IF;

  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- PENGAMAN: JANGAN GAGALKAN TRANSAKSI KASIR JIKA ADA GANGGUAN PADA REKAP
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_profit_auto_sync ON public.transactions;
CREATE TRIGGER trg_transactions_profit_auto_sync
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_sync_profit_on_transaction();


-- 7. FUNGSI MIGRASI / REKAP AWAL (DIJALANKAN SEKALI UNTUK SELURUH DATA LAMA)
CREATE OR REPLACE FUNCTION public.rekap_ulang_semua_profit(
  p_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_hari_direkap INT,
  total_bulan_direkap INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_days INT := 0;
  v_months INT := 0;
BEGIN
  -- Iterasi seluruh tanggal unik yang memiliki transaksi (dengan casting ::text aman)
  FOR r IN 
    SELECT DISTINCT 
      timestamp::date AS tgl, 
      COALESCE(user_id::text, '') AS uid, 
      COALESCE(NULLIF(TRIM(store_id::text), ''), 'all') AS str_id
    FROM public.transactions
    WHERE (p_user_id IS NULL OR p_user_id = '' OR user_id IS NULL OR user_id::text = p_user_id)
      AND timestamp IS NOT NULL
    ORDER BY timestamp::date ASC
  LOOP
    PERFORM public.recalc_profit_single_date(r.uid, r.tgl, r.str_id);
    v_days := v_days + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_months FROM public.profit_bulanan WHERE (p_user_id IS NULL OR p_user_id = '' OR user_id = p_user_id);

  RETURN QUERY SELECT v_days, v_months;
END;
$$;


-- ==============================================================================
-- 8. BERIKAN HAK AKSES EKSEKUSI KE KLIEN APLIKASI (ANON & AUTHENTICATED)
-- ==============================================================================
GRANT EXECUTE ON FUNCTION public.rekap_ulang_semua_profit TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalc_profit_single_date TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profit_harian TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profit_bulanan TO anon, authenticated, service_role;


-- ==============================================================================
-- 9. EKSEKUSI REKAP OTOMATIS SEKARANG JUGA
-- Menghitung seluruh transaksi historis ke dalam database profit_harian & profit_bulanan
-- ==============================================================================
SELECT * FROM public.rekap_ulang_semua_profit();

