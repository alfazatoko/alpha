-- ==============================================================================
-- TABEL & STORAGE ABSENSI SELFIE - ALFAZA POS
-- Terpisah bersih agar data tidak tercampur dengan tabel transaksi / toko lainnya.
-- ==============================================================================

-- 1. TABEL KHUSUS RECORD ABSENSI SELFIE
CREATE TABLE IF NOT EXISTS public.absen_selfie_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  cashier_id TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  tanggal DATE NOT NULL,
  jam TEXT NOT NULL,
  shift_id TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  is_late BOOLEAN NOT NULL DEFAULT FALSE,
  alasan_telat TEXT,
  photo_url TEXT,                -- URL publik foto (Supabase Storage) atau Base64 fallback
  photo_path TEXT,               -- Path file di bucket untuk penghapusan (misal: absen-selfie/store1/kasir1/xxx.webp)
  photo_size_kb NUMERIC DEFAULT 0, -- Ukuran KB foto untuk kalkulasi album
  is_photo_deleted BOOLEAN DEFAULT FALSE,
  photo_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEX UNTUK PERFORMA QUERY CEPAT
CREATE INDEX IF NOT EXISTS idx_selfie_store_kasir ON public.absen_selfie_records(store_id, cashier_id);
CREATE INDEX IF NOT EXISTS idx_selfie_tanggal ON public.absen_selfie_records(tanggal DESC);

-- KEAMANAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.absen_selfie_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for absen_selfie_records" ON public.absen_selfie_records;
CREATE POLICY "Allow all for absen_selfie_records" ON public.absen_selfie_records FOR ALL USING (true) WITH CHECK (true);

-- 2. SETUP STORAGE BUCKET 'absen-selfie'
INSERT INTO storage.buckets (id, name, public)
VALUES ('absen-selfie', 'absen-selfie', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- POLICY STORAGE BUCKET
DROP POLICY IF EXISTS "Public Read Absen Selfie" ON storage.objects;
CREATE POLICY "Public Read Absen Selfie" ON storage.objects FOR SELECT USING (bucket_id = 'absen-selfie');

DROP POLICY IF EXISTS "Public Upload Absen Selfie" ON storage.objects;
CREATE POLICY "Public Upload Absen Selfie" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'absen-selfie');

DROP POLICY IF EXISTS "Public Update Absen Selfie" ON storage.objects;
CREATE POLICY "Public Update Absen Selfie" ON storage.objects FOR UPDATE USING (bucket_id = 'absen-selfie');

DROP POLICY IF EXISTS "Public Delete Absen Selfie" ON storage.objects;
CREATE POLICY "Public Delete Absen Selfie" ON storage.objects FOR DELETE USING (bucket_id = 'absen-selfie');
