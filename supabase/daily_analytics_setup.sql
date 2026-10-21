-- ==================================================================================
-- ALFAZA CELL / ALPHA POS - SKRIP SETUP TABEL AGREGASI GRAFIK & ANALITIK HARIAN
-- File: supabase/daily_analytics_setup.sql
-- Keterangan: Menyimpan data rekap harian terkunci (Instan, Ringan, 100% Sinkron)
-- ==================================================================================

-- 1. Buat Tabel daily_analytics jika belum ada
CREATE TABLE IF NOT EXISTS public.daily_analytics (
    id TEXT PRIMARY KEY,                           -- Format unik: YYYY-MM-DD_storeId_kasirId
    tanggal DATE NOT NULL,                         -- Tanggal transaksi (YYYY-MM-DD)
    user_id TEXT NOT NULL,                        -- Google UID Pemilik Akun / Owner
    store_id TEXT NOT NULL,                       -- Cabang Toko
    kasir_id TEXT NOT NULL,                       -- ID Kasir
    
    -- Metrik Penjualan Riil (Sinkron 100% dengan Halaman Profit & Performa Kasir)
    total_transaksi INT DEFAULT 0,                 -- Murni jumlah transaksi penjualan riil
    total_omzet NUMERIC DEFAULT 0,                 -- Volume seluruh perputaran transaksi toko
    omzet_penjualan NUMERIC DEFAULT 0,             -- Omzet penjualan barang/jasa (tanpa Tarik Tunai)
    nominal_tarik_tunai NUMERIC DEFAULT 0,         -- Khusus nominal Tarik Tunai
    total_laba NUMERIC DEFAULT 0,                  -- Total laba admin fee
    laba_tunai NUMERIC DEFAULT 0,                  -- Laba dari uang tunai laci
    laba_non_tunai NUMERIC DEFAULT 0,              -- Laba non-tunai ([NON_TUNAI] / [ADMIN_DALAM])
    
    -- Rincian Kategori Penjualan (JSONB)
    kategori_breakdown JSONB DEFAULT '{}'::jsonb,  -- Contoh: {"Transfer Bank": 5000000, "Voucher": 250000}
    
    -- Status Kunci
    is_locked BOOLEAN DEFAULT FALSE,               -- TRUE jika tanggal < hari ini (sudah terkunci permanen)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index agar query rentang 7 hari, 30 hari, dan 1 tahun secepat kilat (< 0.05 detik)
CREATE INDEX IF NOT EXISTS idx_daily_analytics_lookup 
ON public.daily_analytics (user_id, store_id, tanggal, kasir_id);

CREATE INDEX IF NOT EXISTS idx_daily_analytics_date 
ON public.daily_analytics (user_id, tanggal);

-- 3. Kebijakan Keamanan RLS (Row Level Security)
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_analytics_select_policy" ON public.daily_analytics;
CREATE POLICY "daily_analytics_select_policy" 
ON public.daily_analytics 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "daily_analytics_all_policy" ON public.daily_analytics;
CREATE POLICY "daily_analytics_all_policy" 
ON public.daily_analytics 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 4. Fungsi SQL Stored Procedure untuk Merekap & Mengunci Seluruh Data Masa Lalu
CREATE OR REPLACE FUNCTION public.sync_daily_analytics_range(
    p_user_id TEXT,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    synced_days INT,
    total_records INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start DATE;
    v_end DATE;
    v_days INT;
    v_count INT;
BEGIN
    -- Jika parameter tanggal null, ambil dari transaksi paling awal toko
    IF p_start_date IS NULL THEN
        SELECT COALESCE(MIN(timestamp::date), CURRENT_DATE - INTERVAL '365 days')
        INTO v_start
        FROM public.transactions
        WHERE user_id = p_user_id;
    ELSE
        v_start := p_start_date;
    END IF;

    IF p_end_date IS NULL THEN
        v_end := CURRENT_DATE;
    ELSE
        v_end := p_end_date;
    END IF;

    -- Agregasi murni dari tabel transactions dengan kriteria persis sama dengan Profit & Performa Kasir
    WITH raw_filtered AS (
        SELECT 
            timestamp::date AS t_date,
            user_id,
            COALESCE(NULLIF(TRIM(store_id), ''), 'main_store') AS t_store_id,
            TRIM(COALESCE(kasir_id, 'Unknown')) AS t_kasir_id,
            COALESCE(nominal, 0) AS t_nominal,
            COALESCE(admin_fee, 0) AS t_admin,
            COALESCE(NULLIF(TRIM(kategori), ''), 'Lainnya') AS t_kategori,
            COALESCE(keterangan, '') AS t_keterangan
        FROM public.transactions
        WHERE user_id = p_user_id
          AND timestamp::date >= v_start
          AND timestamp::date <= v_end
          -- SINKRONISASI FILTER TRANSAKSI PENJUALAN RIIL:
          -- 1. Buang semua yang berawalan 'isi' (Isi Saldo Real Aplikasi, Isi Saldo Bank, Isi Modal, dll)
          AND LOWER(TRIM(COALESCE(kategori, ''))) NOT LIKE 'isi%'
          -- 2. Buang variasi modal & saldo real
          AND LOWER(COALESCE(kategori, '')) NOT LIKE '%isi modal%'
          AND LOWER(COALESCE(kategori, '')) NOT LIKE '%setor modal%'
          AND LOWER(COALESCE(kategori, '')) NOT LIKE '%real aplikasi%'
          AND LOWER(COALESCE(kategori, '')) NOT LIKE '%tambah saldo%'
          AND LOWER(COALESCE(kategori, '')) NOT LIKE '%topup saldo%'
          -- 3. Buang transaksi bertanda [KHUSUS]
          AND UPPER(COALESCE(keterangan, '')) NOT LIKE '%[KHUSUS]%'
    ),
    cat_aggregated AS (
        SELECT 
            t_date, user_id, t_store_id, t_kasir_id, t_kategori,
            SUM(t_nominal) AS cat_omzet
        FROM raw_filtered
        GROUP BY t_date, user_id, t_store_id, t_kasir_id, t_kategori
    ),
    cat_json_map AS (
        SELECT 
            t_date, user_id, t_store_id, t_kasir_id,
            jsonb_object_agg(t_kategori, cat_omzet) AS cat_json
        FROM cat_aggregated
        GROUP BY t_date, user_id, t_store_id, t_kasir_id
    ),
    daily_grouped AS (
        SELECT 
            r.t_date,
            r.user_id,
            r.t_store_id,
            r.t_kasir_id,
            COUNT(*)::INT AS tx_count,
            SUM(r.t_nominal) AS sum_omzet,
            SUM(CASE WHEN LOWER(r.t_kategori) != 'tarik tunai' THEN r.t_nominal ELSE 0 END) AS sum_omzet_penjualan,
            SUM(CASE WHEN LOWER(r.t_kategori) = 'tarik tunai' THEN r.t_nominal ELSE 0 END) AS sum_tarik,
            SUM(r.t_admin) AS sum_laba,
            SUM(CASE WHEN UPPER(r.t_keterangan) LIKE '%[NON_TUNAI]%' OR UPPER(r.t_keterangan) LIKE '%[ADMIN_DALAM]%' THEN r.t_admin ELSE 0 END) AS sum_laba_nontunai,
            SUM(CASE WHEN UPPER(r.t_keterangan) NOT LIKE '%[NON_TUNAI]%' AND UPPER(r.t_keterangan) NOT LIKE '%[ADMIN_DALAM]%' THEN r.t_admin ELSE 0 END) AS sum_laba_tunai
        FROM raw_filtered r
        GROUP BY r.t_date, r.user_id, r.t_store_id, r.t_kasir_id
    )
    INSERT INTO public.daily_analytics (
        id, tanggal, user_id, store_id, kasir_id,
        total_transaksi, total_omzet, omzet_penjualan, nominal_tarik_tunai,
        total_laba, laba_tunai, laba_non_tunai,
        kategori_breakdown, is_locked, updated_at
    )
    SELECT 
        (g.t_date::text || '_' || g.t_store_id || '_' || g.t_kasir_id) AS id,
        g.t_date,
        g.user_id,
        g.t_store_id,
        g.t_kasir_id,
        g.tx_count,
        g.sum_omzet,
        g.sum_omzet_penjualan,
        g.sum_tarik,
        g.sum_laba,
        g.sum_laba_tunai,
        g.sum_laba_nontunai,
        COALESCE(c.cat_json, '{}'::jsonb),
        (g.t_date < CURRENT_DATE) AS is_locked,
        NOW()
    FROM daily_grouped g
    LEFT JOIN cat_json_map c ON 
        g.t_date = c.t_date AND 
        g.t_store_id = c.t_store_id AND 
        g.t_kasir_id = c.t_kasir_id
    ON CONFLICT (id) DO UPDATE SET
        total_transaksi = EXCLUDED.total_transaksi,
        total_omzet = EXCLUDED.total_omzet,
        omzet_penjualan = EXCLUDED.omzet_penjualan,
        nominal_tarik_tunai = EXCLUDED.nominal_tarik_tunai,
        total_laba = EXCLUDED.total_laba,
        laba_tunai = EXCLUDED.laba_tunai,
        laba_non_tunai = EXCLUDED.laba_non_tunai,
        kategori_breakdown = EXCLUDED.kategori_breakdown,
        is_locked = (EXCLUDED.tanggal < CURRENT_DATE),
        updated_at = NOW();

    -- Ambil hasil ringkasan
    SELECT COUNT(DISTINCT tanggal), COUNT(*)
    INTO v_days, v_count
    FROM public.daily_analytics
    WHERE user_id = p_user_id
      AND tanggal >= v_start
      AND tanggal <= v_end;

    RETURN QUERY SELECT v_days, v_count;
END;
$$;
