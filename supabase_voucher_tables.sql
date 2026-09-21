-- ==============================================================================
-- MIGRASI DATABASE VOUCHER APP - ALFAZA CELL (FIX TEXT ID)
-- ==============================================================================

-- DROP EXISTING TABLES
DROP TABLE IF EXISTS public.voucher_transactions;
DROP TABLE IF EXISTS public.voucher_handovers;
DROP TABLE IF EXISTS public.voucher_stocks;
DROP TABLE IF EXISTS public.voucher_products CASCADE;

-- 1. TABEL PRODUK GLOBAL (1 Toko = 1 List Produk)
CREATE TABLE public.voucher_products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  operator TEXT NOT NULL,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  min_stock_level INTEGER NOT NULL DEFAULT 5,
  description TEXT,
  barcode TEXT,
  sku TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL STOK PER-KASIR
CREATE TABLE public.voucher_stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id TEXT NOT NULL,
  product_id TEXT REFERENCES public.voucher_products(id) ON DELETE CASCADE,
  cashier_id TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, product_id, cashier_id)
);

-- 3. TABEL TRANSAKSI (Riwayat penjualan, tambah stok, restock)
CREATE TABLE public.voucher_transactions (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  type TEXT NOT NULL,
  product_id TEXT REFERENCES public.voucher_products(id) ON DELETE SET NULL,
  product_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  cogs NUMERIC DEFAULT 0,
  cashier_id TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  payment_method TEXT,
  notes TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL SERAH TERIMA (Riwayat handover)
CREATE TABLE public.voucher_handovers (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  from_cashier_id TEXT NOT NULL,
  from_cashier_name TEXT NOT NULL,
  to_cashier_id TEXT NOT NULL,
  to_cashier_name TEXT NOT NULL,
  total_products_count INTEGER NOT NULL DEFAULT 0,
  total_stock_transferred INTEGER NOT NULL DEFAULT 0,
  inventory_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  notes TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AKTIFKAN REALTIME UNTUK TABEL-TABEL INI
-- Agar jika ada perubahan stok atau penambahan produk di HP 1, HP 2 langsung otomatis update
alter publication supabase_realtime add table public.voucher_products;
alter publication supabase_realtime add table public.voucher_stocks;
alter publication supabase_realtime add table public.voucher_transactions;
