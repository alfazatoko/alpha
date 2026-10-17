-- ==============================================================================
-- MIGRASI DATABASE LAPORAN BULANAN & HARIAN VOUCHER - ALFAZA CELL
-- ==============================================================================

-- 1. TABEL REKAP HARIAN VOUCHER (Pre-Aggregated Daily Cache)
CREATE TABLE IF NOT EXISTS public.voucher_daily_summaries (
  id TEXT PRIMARY KEY, -- Format: {store_id}_{YYYY-MM-DD}
  store_id TEXT NOT NULL,
  date DATE NOT NULL,
  omzet NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  tunai NUMERIC NOT NULL DEFAULT 0,
  non_tunai NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  shift_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, date)
);

-- 2. TABEL REKAP BULANAN VOUCHER (Monthly Comparison & History)
CREATE TABLE IF NOT EXISTS public.voucher_monthly_summaries (
  id TEXT PRIMARY KEY, -- Format: {store_id}_{YYYY-MM}
  store_id TEXT NOT NULL,
  month_key TEXT NOT NULL, -- Format: YYYY-MM (contoh: 2026-10)
  month_label TEXT NOT NULL, -- Contoh: Oktober 2026
  total_omzet NUMERIC NOT NULL DEFAULT 0,
  total_profit NUMERIC NOT NULL DEFAULT 0,
  total_tunai NUMERIC NOT NULL DEFAULT 0,
  total_non_tunai NUMERIC NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  days_active INTEGER NOT NULL DEFAULT 0,
  avg_daily_sales NUMERIC NOT NULL DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, month_key)
);

-- 3. ENABLE ROW LEVEL SECURITY & POLICY
ALTER TABLE public.voucher_daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_monthly_summaries ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voucher_daily_summaries' AND policyname = 'Allow all access to voucher_daily_summaries') THEN
    CREATE POLICY "Allow all access to voucher_daily_summaries" ON public.voucher_daily_summaries FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voucher_monthly_summaries' AND policyname = 'Allow all access to voucher_monthly_summaries') THEN
    CREATE POLICY "Allow all access to voucher_monthly_summaries" ON public.voucher_monthly_summaries FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. AKTIFKAN REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.voucher_daily_summaries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voucher_monthly_summaries;
