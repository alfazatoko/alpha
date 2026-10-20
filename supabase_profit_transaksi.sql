-- ==============================================================================
-- MIGRASI DATABASE PEMBUKUAN PROFIT TRANSAKSI (ADMIN FEE) - ALFAZA CELL
-- ==============================================================================
-- File ini murni untuk pembukuan laba admin fee dari riwayat transaksi kasir
-- Mendukung perhitungan admin fee tunai & non-tunai, multi-kasir, dan multi-toko.
-- ==============================================================================

-- 1. TABEL PROFIT HARIAN (Rekap Laba Admin Fee per Hari)
CREATE TABLE IF NOT EXISTS public.profit_harian (
  id TEXT PRIMARY KEY, -- Format: {store_id}_{kasir_id}_{tanggal}
  store_id TEXT NOT NULL DEFAULT 'all',
  kasir_id TEXT NOT NULL DEFAULT 'all', -- 'all' untuk gabungan semua kasir, atau id kasir spesifik
  kasir_name TEXT,
  tanggal DATE NOT NULL, -- Format: YYYY-MM-DD
  total_profit_admin NUMERIC NOT NULL DEFAULT 0, -- Total Laba Admin Fee (Tunai + Non-Tunai)
  admin_tunai NUMERIC NOT NULL DEFAULT 0, -- Admin fee dari transaksi tunai
  admin_non_tunai NUMERIC NOT NULL DEFAULT 0, -- Admin fee dari transaksi non-tunai / admin dalam
  total_transaksi INTEGER NOT NULL DEFAULT 0, -- Jumlah transaksi berbayar admin fee
  total_omzet NUMERIC NOT NULL DEFAULT 0, -- Total perputaran omzet/nominal transaksi
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_profit_harian UNIQUE(store_id, kasir_id, tanggal)
);

-- Index untuk pencarian cepat berdasarkan rentang tanggal & kasir
CREATE INDEX IF NOT EXISTS idx_profit_harian_store_kasir_tgl 
ON public.profit_harian (store_id, kasir_id, tanggal DESC);

CREATE INDEX IF NOT EXISTS idx_profit_harian_tanggal 
ON public.profit_harian (tanggal DESC);


-- 2. TABEL PROFIT BULANAN (Rekap Laba Admin Fee per Bulan)
CREATE TABLE IF NOT EXISTS public.profit_bulanan (
  id TEXT PRIMARY KEY, -- Format: {store_id}_{kasir_id}_{bulan} contoh: store1_all_2026-10
  store_id TEXT NOT NULL DEFAULT 'all',
  kasir_id TEXT NOT NULL DEFAULT 'all',
  kasir_name TEXT,
  bulan TEXT NOT NULL, -- Format: YYYY-MM (contoh: 2026-10)
  tahun INTEGER NOT NULL, -- Contoh: 2026
  bulan_angka INTEGER NOT NULL, -- 1 s/d 12
  nama_bulan TEXT NOT NULL, -- Contoh: 'Oktober 2026'
  total_profit_admin NUMERIC NOT NULL DEFAULT 0,
  admin_tunai NUMERIC NOT NULL DEFAULT 0,
  admin_non_tunai NUMERIC NOT NULL DEFAULT 0,
  total_transaksi INTEGER NOT NULL DEFAULT 0,
  total_omzet NUMERIC NOT NULL DEFAULT 0,
  hari_terbaik_tanggal DATE, -- Tanggal dengan profit tertinggi di bulan ini
  hari_terbaik_profit NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_profit_bulanan UNIQUE(store_id, kasir_id, bulan)
);

-- Index untuk rekap bulanan & tahunan
CREATE INDEX IF NOT EXISTS idx_profit_bulanan_store_tahun 
ON public.profit_bulanan (store_id, tahun, bulan_angka);


-- 3. ENABLE ROW LEVEL SECURITY & POLICY
ALTER TABLE public.profit_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_bulanan ENABLE ROW LEVEL SECURITY;

-- Grant permissions ke anon & authenticated
GRANT ALL ON TABLE public.profit_harian TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profit_bulanan TO anon, authenticated, service_role;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profit_harian' AND policyname = 'Allow all access to profit_harian') THEN
    CREATE POLICY "Allow all access to profit_harian" ON public.profit_harian FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profit_bulanan' AND policyname = 'Allow all access to profit_bulanan') THEN
    CREATE POLICY "Allow all access to profit_bulanan" ON public.profit_bulanan FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. AKTIFKAN REALTIME PUBLICATION
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profit_harian;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profit_bulanan;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

