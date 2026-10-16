-- ========================================================
-- TABEL KHUSUS KUSTOMISASI LABEL TOMBOL TOKO (ALFAZA ALPHA)
-- Tidak menyentuh / tidak merusak tabel transaksi & tabel lama.
-- ========================================================

-- 1. Buat tabel store_custom_labels
CREATE TABLE IF NOT EXISTS public.store_custom_labels (
  store_id TEXT PRIMARY KEY,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Aktifkan Row Level Security (RLS) & Policy agar dapat diakses aplikasi
ALTER TABLE public.store_custom_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for store_custom_labels" ON public.store_custom_labels;
CREATE POLICY "Allow all for store_custom_labels"
  ON public.store_custom_labels
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Tambahkan ke Realtime Publication agar otomatis sync detik itu juga ke seluruh HP kasir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'store_custom_labels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_custom_labels;
  END IF;
END $$;
