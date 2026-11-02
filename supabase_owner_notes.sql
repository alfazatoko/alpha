-- ==============================================================================
-- MIGRASI DATABASE: TABEL CATATAN OWNER ONLINE (ALPHA PRO CLOUD)
-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda:
-- ==============================================================================

-- 1. Buat tabel public.owner_notes jika belum ada
CREATE TABLE IF NOT EXISTS public.owner_notes (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL DEFAULT 'all',
  judul TEXT NOT NULL,
  isi TEXT NOT NULL,
  kategori TEXT DEFAULT 'Penting',
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  selesai BOOLEAN DEFAULT FALSE,
  favorit BOOLEAN DEFAULT FALSE,
  foto TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Pastikan kolom-kolom baru (favorit, foto, dll) ada jika tabel sudah ada sebelumnya
ALTER TABLE public.owner_notes ADD COLUMN IF NOT EXISTS store_id TEXT NOT NULL DEFAULT 'all';
ALTER TABLE public.owner_notes ADD COLUMN IF NOT EXISTS favorit BOOLEAN DEFAULT FALSE;
ALTER TABLE public.owner_notes ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE public.owner_notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.owner_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Index untuk pencarian & pengurutan cepat
CREATE INDEX IF NOT EXISTS idx_owner_notes_store ON public.owner_notes(store_id);
CREATE INDEX IF NOT EXISTS idx_owner_notes_tanggal ON public.owner_notes(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_owner_notes_selesai ON public.owner_notes(selesai);
CREATE INDEX IF NOT EXISTS idx_owner_notes_favorit ON public.owner_notes(favorit);

-- 4. Aktifkan Row Level Security (RLS)
ALTER TABLE public.owner_notes ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan RLS (Izinkan akses penuh SELECT, INSERT, UPDATE, DELETE untuk aplikasi)
DROP POLICY IF EXISTS "Allow all for owner_notes" ON public.owner_notes;
CREATE POLICY "Allow all for owner_notes"
  ON public.owner_notes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Tambahkan ke Realtime Supabase agar catatan langsung sinkron detik itu juga antar-perangkat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'owner_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_notes;
  END IF;
END $$;

-- 7. Muat ulang cache schema PostgREST Supabase
NOTIFY pgrst, 'reload schema';
