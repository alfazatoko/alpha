-- ==============================================================================
-- JALUR SQL TUNGGAL & TERPADU (SINGLE SOURCE OF TRUTH)
-- Menghubungkan Halaman Grafik, Performa Kasir, dan Profit Owner
-- ==============================================================================

-- 1. Index Khusus untuk Performa Super Cepat
CREATE INDEX IF NOT EXISTS idx_transactions_laporan_singkron 
ON public.transactions (user_id, timestamp, store_id, kasir_id);

-- 2. FUNGSI RPC 1: REKAP HARIAN (UNTUK TABEL HARIAN & GRAFIK)
DROP FUNCTION IF EXISTS public.rpc_laporan_harian(text, text, text, date, date);

CREATE OR REPLACE FUNCTION public.rpc_laporan_harian(
  p_user_id TEXT,
  p_store_id TEXT DEFAULT 'all',
  p_kasir_id TEXT DEFAULT 'Semua',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  tanggal DATE,
  total_transaksi INT,
  total_omzet NUMERIC,
  total_laba NUMERIC,
  laba_tunai NUMERIC,
  laba_non_tunai NUMERIC,
  tambah_saldo NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  WITH filtered_txs AS (
    SELECT
      t.timestamp::date AS tx_date,
      t.nominal,
      t.admin_fee,
      t.kategori,
      t.keterangan,
      t.kasir_id
    FROM public.transactions t
    WHERE (p_user_id IS NULL OR p_user_id = '' OR t.user_id::text = p_user_id)
      AND (p_store_id IS NULL OR p_store_id = '' OR p_store_id = 'all' OR t.store_id::text = p_store_id)
      AND (
        (p_kasir_id IS NOT NULL AND p_kasir_id != '' AND p_kasir_id != 'Semua' AND t.kasir_id::text = p_kasir_id)
        OR
        ((p_kasir_id IS NULL OR p_kasir_id = '' OR p_kasir_id = 'Semua') AND LOWER(TRIM(COALESCE(t.kasir_id::text, ''))) != 'owner')
      )
      AND (p_start_date IS NULL OR t.timestamp::date >= p_start_date)
      AND (p_end_date IS NULL OR t.timestamp::date <= p_end_date)
  )
  SELECT
    tx.tx_date AS tanggal,
    -- Total transaksi penjualan/layanan konsumen
    COUNT(CASE 
      WHEN LOWER(TRIM(COALESCE(tx.kategori::text, ''))) NOT LIKE 'isi%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%isi modal%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%setor modal%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%real aplikasi%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%tambah saldo%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%topup saldo%'
       AND UPPER(COALESCE(tx.keterangan::text, '')) NOT LIKE '%[KHUSUS]%'
      THEN 1 
      ELSE NULL 
    END)::INT AS total_transaksi,
    
    -- Total Omzet (Kecualikan Tarik Tunai dan Transaksi Pengisian/Modal)
    COALESCE(SUM(CASE 
      WHEN LOWER(TRIM(COALESCE(tx.kategori::text, ''))) NOT LIKE 'isi%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%isi modal%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%setor modal%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%real aplikasi%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%tambah saldo%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%topup saldo%'
       AND UPPER(COALESCE(tx.keterangan::text, '')) NOT LIKE '%[KHUSUS]%'
       AND LOWER(TRIM(COALESCE(tx.kategori::text, ''))) != 'tarik tunai'
      THEN COALESCE(tx.nominal, 0)
      ELSE 0
    END), 0) AS total_omzet,

    -- Total Laba Admin
    COALESCE(SUM(CASE 
      WHEN LOWER(TRIM(COALESCE(tx.kategori::text, ''))) NOT LIKE 'isi%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%isi modal%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%setor modal%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%real aplikasi%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%tambah saldo%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%topup saldo%'
       AND UPPER(COALESCE(tx.keterangan::text, '')) NOT LIKE '%[KHUSUS]%'
      THEN COALESCE(tx.admin_fee, 0)
      ELSE 0
    END), 0) AS total_laba,

    -- Laba Admin Tunai
    COALESCE(SUM(CASE 
      WHEN LOWER(TRIM(COALESCE(tx.kategori::text, ''))) NOT LIKE 'isi%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%isi modal%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%setor modal%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%real aplikasi%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%tambah saldo%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%topup saldo%'
       AND UPPER(COALESCE(tx.keterangan::text, '')) NOT LIKE '%[KHUSUS]%'
       AND UPPER(COALESCE(tx.keterangan::text, '')) NOT LIKE '%[NON_TUNAI]%'
       AND UPPER(COALESCE(tx.keterangan::text, '')) NOT LIKE '%[ADMIN_DALAM]%'
      THEN COALESCE(tx.admin_fee, 0)
      ELSE 0
    END), 0) AS laba_tunai,

    -- Laba Admin Non-Tunai
    COALESCE(SUM(CASE 
      WHEN LOWER(TRIM(COALESCE(tx.kategori::text, ''))) NOT LIKE 'isi%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%isi modal%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%setor modal%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%real aplikasi%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%tambah saldo%'
       AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%topup saldo%'
       AND UPPER(COALESCE(tx.keterangan::text, '')) NOT LIKE '%[KHUSUS]%'
       AND (UPPER(COALESCE(tx.keterangan::text, '')) LIKE '%[NON_TUNAI]%' OR UPPER(COALESCE(tx.keterangan::text, '')) LIKE '%[ADMIN_DALAM]%')
      THEN COALESCE(tx.admin_fee, 0)
      ELSE 0
    END), 0) AS laba_non_tunai,

    -- Tambah Saldo Bank / Modal Kasir
    COALESCE(SUM(CASE 
      WHEN (
        LOWER(TRIM(COALESCE(tx.kategori::text, ''))) LIKE '%isi saldo bank%'
        OR LOWER(COALESCE(tx.kategori::text, '')) LIKE '%isi modal%'
        OR LOWER(COALESCE(tx.kategori::text, '')) LIKE '%setor modal%'
        OR LOWER(COALESCE(tx.kategori::text, '')) LIKE '%tambah saldo bank%'
        OR LOWER(COALESCE(tx.kategori::text, '')) LIKE '%topup saldo%'
      )
      AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%real aplikasi%'
      AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%pulsa%'
      AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%kuota%'
      AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%token%'
      AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%voucher%'
      AND LOWER(COALESCE(tx.kategori::text, '')) NOT LIKE '%paket%'
      THEN COALESCE(tx.nominal, 0)
      ELSE 0
    END), 0) AS tambah_saldo

  FROM filtered_txs tx
  GROUP BY tx.tx_date
  ORDER BY tx.tx_date DESC;
END;
$ ;

-- 3. FUNGSI RPC 2: REKAP BULANAN (12 BULAN PER TAHUN)
DROP FUNCTION IF EXISTS public.rpc_laporan_bulanan(text, text, text, int);

CREATE OR REPLACE FUNCTION public.rpc_laporan_bulanan(
  p_user_id TEXT,
  p_store_id TEXT DEFAULT 'all',
  p_kasir_id TEXT DEFAULT 'Semua',
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS TABLE (
  bulan_angka INT,
  bulan_key TEXT,
  nama_bulan TEXT,
  total_transaksi INT,
  total_omzet NUMERIC,
  total_laba NUMERIC,
  laba_tunai NUMERIC,
  laba_non_tunai NUMERIC,
  tambah_saldo NUMERIC,
  hari_terbaik_tanggal DATE,
  hari_terbaik_laba NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_start_date DATE := (p_year::TEXT || '-01-01')::DATE;
  v_end_date DATE := (p_year::TEXT || '-12-31')::DATE;
BEGIN
  RETURN QUERY
  WITH daily_data AS (
    SELECT * FROM public.rpc_laporan_harian(
      p_user_id,
      p_store_id,
      p_kasir_id,
      v_start_date,
      v_end_date
    )
  ),
  month_series AS (
    SELECT generate_series(1, 12) AS m_num
  ),
  month_names AS (
    SELECT ARRAY['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'] AS names
  ),
  best_days AS (
    SELECT DISTINCT ON (EXTRACT(MONTH FROM tanggal)::INT)
      EXTRACT(MONTH FROM tanggal)::INT AS m_num,
      tanggal AS b_date,
      total_laba AS b_laba
    FROM daily_data
    ORDER BY EXTRACT(MONTH FROM tanggal)::INT, total_laba DESC, tanggal DESC
  )
  SELECT
    ms.m_num AS bulan_angka,
    (p_year::TEXT || '-' || LPAD(ms.m_num::TEXT, 2, '0')) AS bulan_key,
    mn.names[ms.m_num] AS nama_bulan,
    COALESCE(SUM(d.total_transaksi), 0)::INT AS total_transaksi,
    COALESCE(SUM(d.total_omzet), 0) AS total_omzet,
    COALESCE(SUM(d.total_laba), 0) AS total_laba,
    COALESCE(SUM(d.laba_tunai), 0) AS laba_tunai,
    COALESCE(SUM(d.laba_non_tunai), 0) AS laba_non_tunai,
    COALESCE(SUM(d.tambah_saldo), 0) AS tambah_saldo,
    bd.b_date AS hari_terbaik_tanggal,
    COALESCE(bd.b_laba, 0) AS hari_terbaik_laba
  FROM month_series ms
  CROSS JOIN month_names mn
  LEFT JOIN daily_data d ON EXTRACT(MONTH FROM d.tanggal)::INT = ms.m_num
  LEFT JOIN best_days bd ON bd.m_num = ms.m_num
  GROUP BY ms.m_num, mn.names[ms.m_num], bd.b_date, bd.b_laba
  ORDER BY ms.m_num ASC;
END;
$ ;

-- 4. FUNGSI RPC 3: LEADERBOARD KASIR (BREAKDOWN PER KASIR)
DROP FUNCTION IF EXISTS public.rpc_laporan_kasir_leaderboard(text, text, date, date);

CREATE OR REPLACE FUNCTION public.rpc_laporan_kasir_leaderboard(
  p_user_id TEXT,
  p_store_id TEXT DEFAULT 'all',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  kasir_id TEXT,
  total_transaksi INT,
  total_omzet NUMERIC,
  total_laba NUMERIC,
  tambah_saldo NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(TRIM(t.kasir_id::text), ''), 'Unknown') AS kasir_id,
    
    COUNT(CASE 
      WHEN LOWER(TRIM(COALESCE(t.kategori::text, ''))) NOT LIKE 'isi%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%isi modal%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%setor modal%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%real aplikasi%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%tambah saldo%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%topup saldo%'
       AND UPPER(COALESCE(t.keterangan::text, '')) NOT LIKE '%[KHUSUS]%'
      THEN 1 ELSE NULL 
    END)::INT AS total_transaksi,

    COALESCE(SUM(CASE 
      WHEN LOWER(TRIM(COALESCE(t.kategori::text, ''))) NOT LIKE 'isi%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%isi modal%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%setor modal%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%real aplikasi%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%tambah saldo%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%topup saldo%'
       AND UPPER(COALESCE(t.keterangan::text, '')) NOT LIKE '%[KHUSUS]%'
       AND LOWER(TRIM(COALESCE(t.kategori::text, ''))) != 'tarik tunai'
      THEN COALESCE(t.nominal, 0) ELSE 0 
    END), 0) AS total_omzet,

    COALESCE(SUM(CASE 
      WHEN LOWER(TRIM(COALESCE(t.kategori::text, ''))) NOT LIKE 'isi%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%isi modal%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%setor modal%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%real aplikasi%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%tambah saldo%'
       AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%topup saldo%'
       AND UPPER(COALESCE(t.keterangan::text, '')) NOT LIKE '%[KHUSUS]%'
      THEN COALESCE(t.admin_fee, 0) ELSE 0 
    END), 0) AS total_laba,

    COALESCE(SUM(CASE 
      WHEN (
        LOWER(TRIM(COALESCE(t.kategori::text, ''))) LIKE '%isi saldo bank%'
        OR LOWER(COALESCE(t.kategori::text, '')) LIKE '%isi modal%'
        OR LOWER(COALESCE(t.kategori::text, '')) LIKE '%setor modal%'
        OR LOWER(COALESCE(t.kategori::text, '')) LIKE '%tambah saldo bank%'
        OR LOWER(COALESCE(t.kategori::text, '')) LIKE '%topup saldo%'
      )
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%real aplikasi%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%pulsa%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%kuota%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%token%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%voucher%'
      AND LOWER(COALESCE(t.kategori::text, '')) NOT LIKE '%paket%'
      THEN COALESCE(t.nominal, 0) ELSE 0 
    END), 0) AS tambah_saldo

  FROM public.transactions t
  WHERE (p_user_id IS NULL OR p_user_id = '' OR t.user_id::text = p_user_id)
    AND (p_store_id IS NULL OR p_store_id = '' OR p_store_id = 'all' OR t.store_id::text = p_store_id)
    AND LOWER(TRIM(COALESCE(t.kasir_id::text, ''))) != 'owner'
    AND (p_start_date IS NULL OR t.timestamp::date >= p_start_date)
    AND (p_end_date IS NULL OR t.timestamp::date <= p_end_date)
  GROUP BY COALESCE(NULLIF(TRIM(t.kasir_id::text), ''), 'Unknown')
  ORDER BY total_laba DESC, total_transaksi DESC;
END;
$ ;

-- 5. Berikan Izin Eksekusi Fungsi RPC
GRANT EXECUTE ON FUNCTION public.rpc_laporan_harian TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_laporan_bulanan TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_laporan_kasir_leaderboard TO anon, authenticated, service_role;
