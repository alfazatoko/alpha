-- SQL Migration untuk Supabase: Tambah kolom promo_banners di store_settings
-- Jalankan skrip ini di SQL Editor Supabase dashboard proyek Anda:

-- 1. Tambahkan kolom promo_banners bertipe jsonb ke tabel store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS promo_banners jsonb DEFAULT '[]'::jsonb;

-- 2. Muat ulang cache skema PostgREST agar kolom langsung dikenali tanpa error schema cache
NOTIFY pgrst, 'reload schema';
