-- =========================================================================
-- MIGRASI & PEMBERSIHAN DATABASE SUPABASE: ALPHA PRO POS KASIR
-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda:
-- =========================================================================

-- 1. Tambah kolom resmi promo_banners di tabel store_settings (jika belum ada)
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS promo_banners jsonb DEFAULT '[]'::jsonb;

-- 2. Pindahkan data banner yang sebelumnya tersangkut di kolom 'presets' ke 'promo_banners'
UPDATE public.store_settings
SET promo_banners = (
  SELECT elem->'data'
  FROM jsonb_array_elements(presets) AS elem
  WHERE elem->>'id' = '_PROMO_BANNERS_'
  LIMIT 1
)
WHERE presets::text LIKE '%_PROMO_BANNERS_%' 
  AND (promo_banners IS NULL OR promo_banners = '[]'::jsonb);

-- 3. Bersihkan & buang objek palsu '_PROMO_BANNERS_' dari kolom presets
-- (Ini seketika menyembuhkan HP-HP kasir lama dari error toLowerCase!)
UPDATE public.store_settings
SET presets = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(presets) AS elem
  WHERE elem->>'id' != '_PROMO_BANNERS_'
)
WHERE presets::text LIKE '%_PROMO_BANNERS_%';

-- 4. Muat ulang cache schema PostgREST agar kolom baru langsung aktif
NOTIFY pgrst, 'reload schema';
