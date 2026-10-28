-- ==============================================================================
-- TABEL DATABASE ONLINE: PILIHAN TUJUAN TRANSAKSI & NOMINAL FEE APLIKASI
-- Form Transaksi POS (DANA +200, GOPAY +900, MAXIM +2200, TOKEN LISTRIK +1850, dll.)
-- ==============================================================================

-- 1. Buat tabel store_popup_lists jika belum ada
CREATE TABLE IF NOT EXISTS public.store_popup_lists (
  store_id TEXT PRIMARY KEY,
  lists JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.store_popup_lists ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan Akses Penuh (Kasir & Owner dapat membaca dan menyimpan perubahan)
DROP POLICY IF EXISTS "Akses Penuh store_popup_lists" ON public.store_popup_lists;
CREATE POLICY "Akses Penuh store_popup_lists"
  ON public.store_popup_lists
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Masukkan ke Supabase Realtime Publication
-- Supaya saat di-edit di HP 1, HP 2 langsung otomatis berubah detik itu juga
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'store_popup_lists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_popup_lists;
  END IF;
END $$;

-- 5. Seed data default nominal fee (DANA +200, GOPAY +900, OVO +700, SHOPEEPAY +100, LINKAJA +800, MAXIM +2200, TOKEN LISTRIK +1850)
-- Untuk toko yang sudah terdaftar di store_settings
INSERT INTO public.store_popup_lists (store_id, lists, updated_at)
SELECT 
  s.store_id,
  '{
    "ORDER_KUOTA": [
      { "id": "DANA", "name": "DANA", "icon": "fa-wallet", "color": "text-blue-500", "fee": 200 },
      { "id": "GOPAY", "name": "GOPAY", "icon": "fa-wallet", "color": "text-green-500", "fee": 900 },
      { "id": "OVO", "name": "OVO", "icon": "fa-wallet", "color": "text-purple-500", "fee": 700 },
      { "id": "SHOPEEPAY", "name": "SHOPEEPAY", "icon": "fa-wallet", "color": "text-orange-500", "fee": 100 },
      { "id": "LINKAJA", "name": "LINKAJA", "icon": "fa-wallet", "color": "text-red-500", "fee": 800 },
      { "id": "MAXIM", "name": "MAXIM", "icon": "fa-car", "color": "text-yellow-500", "fee": 2200 },
      { "id": "PULSA", "name": "PULSA", "icon": "fa-mobile-screen", "color": "text-amber-500", "fee": 0 },
      { "id": "TOKEN LISTRIK", "name": "TOKEN LISTRIK", "icon": "fa-bolt", "color": "text-amber-500", "fee": 1850 },
      { "id": "PDAM", "name": "PDAM", "icon": "fa-faucet-drip", "color": "text-blue-400", "fee": 0 },
      { "id": "TAGIHAN LAIN", "name": "TAGIHAN LAIN", "icon": "fa-file-invoice", "color": "text-slate-500", "fee": 0 }
    ],
    "FLIP": [
      { "id": "BANK BRI", "name": "BRI", "icon": "fa-building-columns", "color": "text-blue-600", "fee": 0 },
      { "id": "BANK BNI", "name": "BNI", "icon": "fa-building-columns", "color": "text-orange-600", "fee": 0 },
      { "id": "BANK BCA", "name": "BCA", "icon": "fa-building-columns", "color": "text-blue-800", "fee": 0 },
      { "id": "BANK MANDIRI", "name": "MANDIRI", "icon": "fa-building-columns", "color": "text-yellow-600", "fee": 0 },
      { "id": "BANK LAINNYA", "name": "LAINNYA", "icon": "fa-building-columns", "color": "text-slate-600", "fee": 0 },
      { "id": "DANA", "name": "DANA", "icon": "fa-wallet", "color": "text-blue-500", "fee": 200 },
      { "id": "GOPAY", "name": "GOPAY", "icon": "fa-wallet", "color": "text-green-500", "fee": 900 },
      { "id": "OVO", "name": "OVO", "icon": "fa-wallet", "color": "text-purple-500", "fee": 700 },
      { "id": "SHOPEEPAY", "name": "SHOPEEPAY", "icon": "fa-wallet", "color": "text-orange-500", "fee": 100 },
      { "id": "LINKAJA", "name": "LINKAJA", "icon": "fa-wallet", "color": "text-red-500", "fee": 800 }
    ]
  }'::jsonb,
  now()
FROM public.store_settings s
ON CONFLICT (store_id) DO NOTHING;
