-- ==============================================================================
-- TABEL KHUSUS: PRESET TEKS OTOMATIS & ADMIN OTOMATIS (PER-TOKO)
-- Aplikasi ALFAZA CELL (ALPHA POS)
-- ==============================================================================

-- 1. Buat tabel store_presets jika belum ada
CREATE TABLE IF NOT EXISTS public.store_presets (
  store_id TEXT PRIMARY KEY,
  presets JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_rules JSONB NOT NULL DEFAULT '{"Transfer Bank":[],"DANA":[],"FLIP":[],"Tarik Tunai":[]}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.store_presets ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan Akses Penuh (Kasir & Owner dapat membaca dan menyimpan perubahan preset per-toko)
DROP POLICY IF EXISTS "Akses Penuh store_presets" ON public.store_presets;
CREATE POLICY "Akses Penuh store_presets"
  ON public.store_presets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Masukkan ke Supabase Realtime Publication
-- Supaya saat Owner/Kasir tambah atau hapus preset di HP 1, HP 2 langsung otomatis ter-update seketika
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'store_presets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_presets;
  END IF;
END $$;

-- 5. Migrasi aman: Pindahkan preset & admin rules yang sudah pernah dibuat di store_settings
-- Cast store_id::text dan cek jsonb_typeof agar kompatibel dengan tipe UUID & tidak error
INSERT INTO public.store_presets (store_id, presets, admin_rules, updated_at)
SELECT 
  s.store_id::text,
  CASE 
    WHEN s.presets IS NOT NULL AND jsonb_typeof(s.presets) = 'array' THEN
      COALESCE(
        (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(s.presets) elem
          WHERE elem->>'id' NOT LIKE '\_%' ESCAPE '\'
        ),
        '[]'::jsonb
      )
    ELSE '[]'::jsonb
  END as presets,
  CASE 
    WHEN s.presets IS NOT NULL AND jsonb_typeof(s.presets) = 'array' THEN
      COALESCE(
        (
          SELECT elem->'data'
          FROM jsonb_array_elements(s.presets) elem
          WHERE elem->>'id' = '_ADMIN_RULES_'
          LIMIT 1
        ),
        '{"Transfer Bank":[],"DANA":[],"FLIP":[],"Tarik Tunai":[]}'::jsonb
      )
    ELSE '{"Transfer Bank":[],"DANA":[],"FLIP":[],"Tarik Tunai":[]}'::jsonb
  END as admin_rules,
  now()
FROM public.store_settings s
WHERE s.store_id IS NOT NULL
ON CONFLICT (store_id) DO NOTHING;
