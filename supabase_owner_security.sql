-- ==============================================================================
-- MIGRASI DATABASE: TABEL KEAMANAN & PIN OWNER (ALPHA PRO CLOUD)
-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda:
-- ==============================================================================

-- 1. Buat tabel public.owner_security jika belum ada
CREATE TABLE IF NOT EXISTS public.owner_security (
  user_id TEXT PRIMARY KEY,               -- googleUid / auth.users.id
  email TEXT,                            -- Email resmi Owner
  owner_name TEXT DEFAULT 'Owner',       -- Nama panggilan Owner
  pin TEXT NOT NULL DEFAULT '0000',      -- PIN akses panel Owner
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.owner_security ENABLE ROW LEVEL SECURITY;

-- 3. Policy RLS (Bisa diakses oleh client terautentikasi dan client anonim via user_id)
DROP POLICY IF EXISTS "Owner Security Select Policy" ON public.owner_security;
CREATE POLICY "Owner Security Select Policy" ON public.owner_security
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner Security Insert Policy" ON public.owner_security;
CREATE POLICY "Owner Security Insert Policy" ON public.owner_security
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owner Security Update Policy" ON public.owner_security;
CREATE POLICY "Owner Security Update Policy" ON public.owner_security
  FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Tambahkan ke Realtime Supabase agar perubahan PIN langsung tersinkron ke semua perangkat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'owner_security'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_security;
  END IF;
END $$;

-- 5. Muat ulang cache schema PostgREST agar tabel langsung terdeteksi
NOTIFY pgrst, 'reload schema';
