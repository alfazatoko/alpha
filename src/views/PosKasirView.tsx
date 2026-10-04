import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  barcode: string;
  nama: string;
  harga: number;
  stok: number;
  satuan: string;
  kategori: string;
}

interface CartItem {
  product: Product;
  qty: number;
  diskon: number;
}

interface PosTransaction {
  id: string;
  timestamp: string;
  items: CartItem[];
  subtotal: number;
  diskonTotal: number;
  grandTotal: number;
  metodeBayar: 'TUNAI' | 'QRIS';
  uangDiterima: number;
  kembalian: number;
  kasir: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const generateId = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const PRODUCTS_KEY = 'alphaPro_pos_products';
const TRANSACTIONS_KEY = 'alphaPro_pos_transactions';

// LocalStorage fallback cache
function cacheProducts(p: Product[]) { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(p)); }
function getCachedProducts(): Product[] { try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); } catch { return []; } }
function cacheTransactions(t: PosTransaction[]) { localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(t)); }
function getCachedTransactions(): PosTransaction[] { try { return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]'); } catch { return []; } }

// Supabase helpers
async function fetchProducts(storeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('pos_products')
    .select('*')
    .eq('store_id', storeId)
    .order('nama');
  if (error || !data) return getCachedProducts();
  const mapped = data.map((r: any) => ({
    id: r.id, barcode: r.barcode, nama: r.nama,
    harga: r.harga, stok: r.stok, satuan: r.satuan, kategori: r.kategori
  }));
  cacheProducts(mapped);
  return mapped;
}

async function upsertProduct(storeId: string, p: Product): Promise<void> {
  await supabase.from('pos_products').upsert({
    id: p.id, store_id: storeId, barcode: p.barcode, nama: p.nama,
    harga: p.harga, stok: p.stok, satuan: p.satuan, kategori: p.kategori
  }, { onConflict: 'id' });
}

async function deleteProductRemote(storeId: string, id: string): Promise<void> {
  await supabase.from('pos_products').delete().eq('id', id).eq('store_id', storeId);
}

async function insertTransaction(storeId: string, trx: PosTransaction): Promise<void> {
  await supabase.from('pos_transactions').insert({
    id: trx.id, store_id: storeId, kasir: trx.kasir,
    items: trx.items, subtotal: trx.subtotal,
    diskon_total: trx.diskonTotal, grand_total: trx.grandTotal,
    metode_bayar: trx.metodeBayar, uang_diterima: trx.uangDiterima,
    kembalian: trx.kembalian
  });
}

async function fetchTransactions(storeId: string): Promise<PosTransaction[]> {
  const { data, error } = await supabase
    .from('pos_transactions')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return getCachedTransactions();
  const mapped = data.map((r: any) => ({
    id: r.id, timestamp: r.created_at, kasir: r.kasir,
    items: r.items, subtotal: r.subtotal, diskonTotal: r.diskon_total,
    grandTotal: r.grand_total, metodeBayar: r.metode_bayar,
    uangDiterima: r.uang_diterima, kembalian: r.kembalian
  }));
  cacheTransactions(mapped);
  return mapped;
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface PosKasirViewProps {
  kasirName?: string;
  kasirRole?: string;
  storeName?: string;
  storeSubtext?: string;
  storeId?: string;
  onBack?: () => void;
  clockStr?: string;
  fullDate?: string;
}

const PosKasirView: React.FC<PosKasirViewProps> = ({ kasirName = 'Kasir', kasirRole, storeName = 'ALFA TOKO', storeSubtext, storeId = 'default', onBack, clockStr = '', fullDate = '' }) => {
  const [products, setProducts] = useState<Product[]>(getCachedProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'kasir' | 'produk' | 'riwayat'>('kasir');
  const [isLoading, setIsLoading] = useState(true);

  const [showBayarModal, setShowBayarModal] = useState(false);
  const [showStruk, setShowStruk] = useState<PosTransaction | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [metodeBayar, setMetodeBayar] = useState<'TUNAI' | 'QRIS'>('TUNAI');
  const [uangDiterima, setUangDiterima] = useState('');

  const [transactions, setTransactions] = useState<PosTransaction[]>(getCachedTransactions);

  const searchRef = useRef<HTMLInputElement>(null);

  // Load data dari Supabase saat pertama buka
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [prods, trxs] = await Promise.all([
        fetchProducts(storeId),
        fetchTransactions(storeId)
      ]);
      setProducts(prods);
      setTransactions(trxs);
      setIsLoading(false);
    })();

    // Realtime sync: produk berubah dari perangkat lain
    const channel = supabase.channel(`pos_products_${storeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_products', filter: `store_id=eq.${storeId}` }, () => {
        fetchProducts(storeId).then(setProducts);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [storeId]);


  const subtotal = cart.reduce((s, i) => s + (i.product.harga * i.qty), 0);
  const diskonTotal = cart.reduce((s, i) => s + (i.product.harga * i.qty * i.diskon / 100), 0);
  const grandTotal = subtotal - diskonTotal;
  const uangNum = parseInt(uangDiterima.replace(/\D/g, '') || '0', 10);
  const kembalian = metodeBayar === 'TUNAI' ? uangNum - grandTotal : 0;

  const filteredProducts = products.filter(p =>
    p.nama.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search) ||
    p.kategori.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = useCallback((product: Product) => {
    if (product.stok <= 0) return;
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id);
      if (idx >= 0) {
        const cur = prev[idx];
        if (cur.qty >= product.stok) return prev;
        const updated = [...prev];
        updated[idx] = { ...cur, qty: cur.qty + 1 };
        return updated;
      }
      return [...prev, { product, qty: 1, diskon: 0 }];
    });
    setSearch('');
    setShowDropdown(false);
    searchRef.current?.focus();
  }, []);

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.flatMap(i => {
      if (i.product.id !== id) return [i];
      const newQty = i.qty + delta;
      if (newQty <= 0) return [];
      if (newQty > i.product.stok) return [i];
      return [{ ...i, qty: newQty }];
    }));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));
  const clearCart = () => setCart([]);

  useEffect(() => {
    let buffer = '';
    let timer: any;
    const onKey = (e: KeyboardEvent) => {
      if (activeTab !== 'kasir' || showBayarModal) return;
      if (e.key === 'Enter' && buffer.length > 3) {
        const found = products.find(p => p.barcode === buffer);
        if (found) addToCart(found);
        buffer = '';
        return;
      }
      if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => { buffer = ''; }, 300);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [products, addToCart, activeTab, showBayarModal]);

  const confirmPayment = async () => {
    if (metodeBayar === 'TUNAI' && uangNum < grandTotal) return;
    if (cart.length === 0) return;

    // Kurangi stok lokal dulu (optimistic)
    const updatedProducts = products.map(p => {
      const item = cart.find(i => i.product.id === p.id);
      if (item) return { ...p, stok: p.stok - item.qty };
      return p;
    });
    setProducts(updatedProducts);
    cacheProducts(updatedProducts);

    // Update stok di Supabase untuk setiap produk yang terjual
    await Promise.all(
      cart.map(item => upsertProduct(storeId, updatedProducts.find(p => p.id === item.product.id)!))
    );

    const trx: PosTransaction = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      items: cart,
      subtotal,
      diskonTotal,
      grandTotal,
      metodeBayar,
      uangDiterima: uangNum,
      kembalian,
      kasir: kasirName,
    };
    const updatedTrx = [trx, ...transactions];
    setTransactions(updatedTrx);
    cacheTransactions(updatedTrx);
    await insertTransaction(storeId, trx);

    setShowBayarModal(false);
    setUangDiterima('');
    setCart([]);
    setShowStruk(trx);
  };

  const saveProduct = async (p: Product) => {
    const isNew = !products.find(x => x.id === p.id);
    const updated = isNew ? [...products, p] : products.map(x => x.id === p.id ? p : x);
    setProducts(updated);
    cacheProducts(updated);
    await upsertProduct(storeId, p);
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const deleteProduct = async (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    cacheProducts(updated);
    await deleteProductRemote(storeId, id);
    setShowDeleteConfirm(null);
  };

  const handlePrint = () => {
    const printEl = document.getElementById('struk-print');
    if (!printEl) return;
    const win = window.open('', '_blank', 'width=320,height=600');
    if (!win) return;
    win.document.write(`<html><head><title>Struk</title><style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Courier New',monospace;}body{width:58mm;font-size:10pt;}.center{text-align:center;}.bold{font-weight:bold;}.divider{border-top:1px dashed #000;margin:4px 0;}.row{display:flex;justify-content:space-between;}.small{font-size:8pt;}</style></head><body>${printEl.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F7F7F7] font-sans overflow-hidden">

      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-4 py-2.5 shrink-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <i className="fa-solid fa-arrow-left text-sm"></i>
            </button>
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">{storeName}</p>
              <h1 className="text-sm font-black text-gray-900 leading-tight">POS Kasir</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400"><i className="fa-solid fa-user text-[9px] mr-1"></i>{kasirName}</p>
              <p className="text-[12px] font-black text-gray-900 tabular-nums">{clockStr}</p>
            </div>
            <div className="w-[1px] h-8 bg-gray-200 shrink-0"></div>
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] font-black text-emerald-600">LIVE</span>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mt-2.5 border-b border-gray-100 -mx-4 px-4">
          {([
            { id: 'kasir', label: 'Kasir', icon: 'fa-cash-register' },
            { id: 'produk', label: 'Produk', icon: 'fa-box' },
            { id: 'riwayat', label: 'Riwayat', icon: 'fa-clock-rotate-left' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black transition-all border-b-2 -mb-[1px] ${activeTab === tab.id ? 'text-[#0066FF] border-[#0066FF]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
            >
              <i className={`fa-solid ${tab.icon} text-[10px]`}></i>
              {tab.label}
              {tab.id === 'kasir' && cart.length > 0 && (
                <span className="bg-[#0066FF] text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">{cart.reduce((s, i) => s + i.qty, 0)}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* TAB KASIR */}
      {activeTab === 'kasir' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="px-3 pt-3 pb-2 bg-white border-b border-gray-100 shrink-0 relative">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm shrink-0"></i>
              <input
                ref={searchRef}
                type="text"
                autoFocus
                placeholder="Cari nama / barcode produk..."
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(e.target.value.length > 0); }}
                onFocus={() => setShowDropdown(search.length > 0)}
                className="flex-1 bg-transparent text-[12px] font-bold text-gray-800 outline-none placeholder-gray-400"
              />
              {search && <button onClick={() => { setSearch(''); setShowDropdown(false); }} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark text-xs"></i></button>}
              <button onClick={() => { const bc = window.prompt('Masukkan kode barcode:'); if (!bc) return; const found = products.find(p => p.barcode === bc.trim()); if (found) addToCart(found); else alert('Produk tidak ditemukan'); }} className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-all shrink-0">
                <i className="fa-solid fa-barcode text-sm"></i>
              </button>
            </div>
            {showDropdown && filteredProducts.length > 0 && (
              <div className="absolute left-3 right-3 top-full bg-white rounded-xl border border-gray-200 shadow-xl z-50 max-h-60 overflow-y-auto mt-1">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => addToCart(p)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 text-left">
                    <div>
                      <p className="text-[12px] font-black text-gray-800">{p.nama}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{p.kategori} • Stok: {p.stok} {p.satuan}</p>
                    </div>
                    <span className="text-[12px] font-black text-[#0066FF] shrink-0 ml-2">{formatRp(p.harga)}</span>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && search && filteredProducts.length === 0 && (
              <div className="absolute left-3 right-3 top-full bg-white rounded-xl border border-gray-200 shadow-xl z-50 mt-1 px-4 py-3 text-center">
                <p className="text-[11px] font-bold text-gray-400">Produk tidak ditemukan</p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                <i className="fa-solid fa-cart-shopping text-5xl"></i>
                <p className="text-sm font-black uppercase tracking-widest">Keranjang Kosong</p>
                <p className="text-[11px] font-bold text-gray-400">Cari atau scan produk untuk memulai</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div key={item.product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-2.5 flex items-center gap-3">
                    <span className="text-[11px] font-black text-gray-300 w-4 text-center shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black text-gray-900 truncate">{item.product.nama}</p>
                      <p className="text-[10px] font-bold text-gray-400">{formatRp(item.product.harga)} / {item.product.satuan}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors">
                        <i className="fa-solid fa-minus text-[9px]"></i>
                      </button>
                      <span className="text-[13px] font-black text-gray-900 w-5 text-center tabular-nums">{item.qty}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} disabled={item.qty >= item.product.stok} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors disabled:opacity-30">
                        <i className="fa-solid fa-plus text-[9px]"></i>
                      </button>
                    </div>
                    <p className="text-[12px] font-black text-gray-900 tabular-nums shrink-0">{formatRp(item.product.harga * item.qty)}</p>
                    <button onClick={() => removeFromCart(item.product.id)} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors shrink-0">
                      <i className="fa-solid fa-trash text-[10px]"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cart.reduce((s, i) => s + i.qty, 0)} item • TOTAL BAYAR</p>
                  <p className="text-xl font-black text-gray-900 leading-tight tabular-nums">{formatRp(grandTotal)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={clearCart} className="px-3 py-2 rounded-xl border border-gray-200 text-gray-400 text-[11px] font-black hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all">
                    <i className="fa-solid fa-trash-can mr-1"></i>Batal
                  </button>
                  <button onClick={() => { setShowBayarModal(true); setMetodeBayar('TUNAI'); setUangDiterima(''); }} className="px-5 py-2.5 bg-[#0066FF] text-white rounded-xl font-black text-[13px] hover:bg-[#0052cc] active:scale-95 transition-all shadow-lg shadow-blue-500/30">
                    <i className="fa-solid fa-cash-register mr-2"></i>BAYAR
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB PRODUK */}
      {activeTab === 'produk' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="px-3 pt-3 pb-2 bg-white border-b border-gray-100 shrink-0 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
              <input type="text" placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-[12px] font-bold outline-none text-gray-800 placeholder-gray-400" />
            </div>
            <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }} className="flex items-center gap-2 px-3 py-2 bg-[#0066FF] text-white text-[11px] font-black rounded-xl hover:bg-[#0052cc] active:scale-95 transition-all shadow-md shadow-blue-500/30 shrink-0">
              <i className="fa-solid fa-plus"></i>Tambah
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                <i className="fa-solid fa-box-open text-5xl"></i>
                <p className="text-sm font-black uppercase tracking-widest">Belum Ada Produk</p>
                <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }} className="px-4 py-2 bg-[#0066FF] text-white text-[11px] font-black rounded-xl">Tambah Produk Pertama</button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black text-gray-900">{p.nama}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[9px] font-black text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded-full">{p.kategori}</span>
                        {p.barcode && <span className="text-[9px] font-bold text-gray-400"><i className="fa-solid fa-barcode mr-1"></i>{p.barcode}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-black text-[#0066FF] tabular-nums">{formatRp(p.harga)}</p>
                      <p className={`text-[10px] font-black ${p.stok <= 5 ? 'text-rose-500' : 'text-emerald-500'}`}>Stok: {p.stok} {p.satuan}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => { setEditingProduct(p); setShowProductForm(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors">
                        <i className="fa-solid fa-pen text-[10px]"></i>
                      </button>
                      <button onClick={() => setShowDeleteConfirm(p.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
                        <i className="fa-solid fa-trash text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB RIWAYAT */}
      {activeTab === 'riwayat' && (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
              <i className="fa-solid fa-clock-rotate-left text-5xl"></i>
              <p className="text-sm font-black uppercase tracking-widest">Belum Ada Transaksi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(trx => {
                const d = new Date(trx.timestamp);
                const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                return (
                  <button key={trx.id} onClick={() => setShowStruk(trx)} className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-3 flex items-center gap-3 text-left hover:border-blue-200 transition-all">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gray-100">
                      <i className={`fa-solid ${trx.metodeBayar === 'QRIS' ? 'fa-qrcode' : 'fa-money-bill'} text-gray-500 text-sm`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black text-gray-900">{trx.items.length} item • {trx.kasir}</p>
                      <p className="text-[10px] font-bold text-gray-400">{dateStr} {timeStr} • {trx.metodeBayar}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-black text-gray-900 tabular-nums">{formatRp(trx.grandTotal)}</p>
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">LUNAS</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL BAYAR */}
      {showBayarModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 animate-in slide-in-from-bottom-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[15px] font-black text-gray-900">Pembayaran</h2>
              <button onClick={() => setShowBayarModal(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3 mb-4 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Pembayaran</p>
              <p className="text-2xl font-black text-gray-900 tabular-nums">{formatRp(grandTotal)}</p>
              <p className="text-[10px] font-bold text-gray-400 mt-1">{cart.reduce((s, i) => s + i.qty, 0)} item</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['TUNAI', 'QRIS'] as const).map(m => (
                <button key={m} onClick={() => { setMetodeBayar(m); setUangDiterima(''); }} className={`py-3 rounded-2xl border-2 font-black text-[12px] flex flex-col items-center gap-1 transition-all ${metodeBayar === m ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                  <i className={`fa-solid ${m === 'TUNAI' ? 'fa-money-bill-wave' : 'fa-qrcode'} text-lg`}></i>
                  {m}
                </button>
              ))}
            </div>
            {metodeBayar === 'TUNAI' && (
              <div className="mb-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Uang Diterima</label>
                <div className="flex items-center gap-2 bg-gray-50 border-2 border-gray-200 focus-within:border-[#0066FF] rounded-xl px-3 py-2.5 transition-all">
                  <span className="text-[12px] font-black text-gray-400">Rp</span>
                  <input type="number" autoFocus placeholder="0" value={uangDiterima} onChange={e => setUangDiterima(e.target.value)} className="flex-1 bg-transparent text-[16px] font-black text-gray-900 outline-none tabular-nums" />
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[grandTotal, Math.ceil(grandTotal / 5000) * 5000, Math.ceil(grandTotal / 10000) * 10000, Math.ceil(grandTotal / 50000) * 50000].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).map(amt => (
                    <button key={amt} onClick={() => setUangDiterima(String(amt))} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors">{formatRp(amt)}</button>
                  ))}
                </div>
                {uangNum >= grandTotal && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600">Kembalian</span>
                    <span className="text-[14px] font-black text-emerald-700 tabular-nums">{formatRp(kembalian)}</span>
                  </div>
                )}
              </div>
            )}
            {metodeBayar === 'QRIS' && (
              <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <i className="fa-solid fa-qrcode text-4xl text-[#0066FF] mb-2"></i>
                <p className="text-[11px] font-black text-blue-600">Arahkan kamera ke QRIS toko</p>
                <p className="text-[10px] font-bold text-gray-400 mt-1">Konfirmasi setelah pembayaran berhasil</p>
              </div>
            )}
            <button onClick={confirmPayment} disabled={metodeBayar === 'TUNAI' && uangNum < grandTotal} className="w-full py-3.5 bg-[#0066FF] text-white font-black text-[14px] rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-[#0052cc] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <i className="fa-solid fa-check mr-2"></i>
              {metodeBayar === 'TUNAI' ? 'KONFIRMASI TERIMA UANG' : 'KONFIRMASI QRIS LUNAS'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL STRUK */}
      {showStruk && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xs shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div id="struk-print" className="p-4 font-mono text-[11px]">
              <div className="text-center mb-3">
                <p className="font-bold text-[13px]">{storeName}</p>
                {storeSubtext && <p className="text-gray-500">{storeSubtext}</p>}
                <div className="border-t border-dashed border-gray-300 mt-2 pt-2 text-gray-400 text-[9px]">
                  <p>Kasir: {showStruk.kasir} • {new Date(showStruk.timestamp).toLocaleDateString('id-ID')} {new Date(showStruk.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p>No: {showStruk.id}</p>
                </div>
              </div>
              <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
                {showStruk.items.map(item => (
                  <div key={item.product.id}>
                    <p className="font-bold">{item.product.nama}</p>
                    <div className="flex justify-between text-gray-600">
                      <span>{item.qty} x {formatRp(item.product.harga)}</span>
                      <span>{formatRp(item.product.harga * item.qty)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-300 mt-2 pt-2 space-y-1">
                <div className="flex justify-between font-bold text-[13px]">
                  <span>TOTAL</span><span>{formatRp(showStruk.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>{showStruk.metodeBayar}</span>
                  <span>{showStruk.metodeBayar === 'TUNAI' ? formatRp(showStruk.uangDiterima) : 'LUNAS'}</span>
                </div>
                {showStruk.metodeBayar === 'TUNAI' && (
                  <div className="flex justify-between font-bold">
                    <span>Kembalian</span><span>{formatRp(showStruk.kembalian)}</span>
                  </div>
                )}
              </div>
              <p className="text-center text-gray-400 text-[9px] mt-3 border-t border-dashed border-gray-300 pt-2">Terima kasih atas kunjungan Anda</p>
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <button onClick={handlePrint} className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl font-black text-[12px] flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors">
                <i className="fa-solid fa-print"></i>Print
              </button>
              <button onClick={() => setShowStruk(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-black text-[12px] hover:bg-gray-200 transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM PRODUK */}
      {showProductForm && (
        <ProductFormModal product={editingProduct} onSave={saveProduct} onClose={() => { setShowProductForm(false); setEditingProduct(null); }} />
      )}

      {/* MODAL DELETE CONFIRM */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 w-full max-w-xs shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="fa-solid fa-trash text-red-500 text-xl"></i>
            </div>
            <h3 className="text-[14px] font-black text-gray-900 mb-1">Hapus Produk?</h3>
            <p className="text-[11px] font-bold text-gray-400 mb-4">Produk ini akan dihapus dari daftar</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-black text-[12px]">Batal</button>
              <button onClick={() => deleteProduct(showDeleteConfirm)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-black text-[12px] hover:bg-red-600">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Product Form Modal ───────────────────────────────────────────────────────
interface ProductFormProps {
  product: Product | null;
  onSave: (p: Product) => void;
  onClose: () => void;
}

const ProductFormModal: React.FC<ProductFormProps> = ({ product, onSave, onClose }) => {
  const [form, setForm] = useState<Product>(product || {
    id: generateId(),
    barcode: '',
    nama: '',
    harga: 0,
    stok: 0,
    satuan: 'pcs',
    kategori: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return;
    onSave(form);
  };

  const set = (k: keyof Product, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-3xl p-5 animate-in slide-in-from-bottom-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[15px] font-black text-gray-900">{product ? 'Edit Produk' : 'Tambah Produk'}</h2>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { label: 'Nama Produk *', key: 'nama', type: 'text', placeholder: 'contoh: Aqua 600ml' },
            { label: 'Barcode', key: 'barcode', type: 'text', placeholder: 'Opsional' },
            { label: 'Kategori', key: 'kategori', type: 'text', placeholder: 'contoh: Minuman, Snack' },
            { label: 'Satuan', key: 'satuan', type: 'text', placeholder: 'pcs, kg, liter...' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">{label}</label>
              <input
                type={type}
                required={key === 'nama'}
                placeholder={placeholder}
                value={String(form[key as keyof Product])}
                onChange={e => set(key as keyof Product, e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[12px] font-bold text-gray-800 outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Harga Jual *</label>
              <input type="number" required min={0} placeholder="0" value={form.harga || ''} onChange={e => set('harga', parseInt(e.target.value || '0', 10))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[12px] font-bold text-gray-800 outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Stok Awal</label>
              <input type="number" min={0} placeholder="0" value={form.stok || ''} onChange={e => set('stok', parseInt(e.target.value || '0', 10))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[12px] font-bold text-gray-800 outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>
          </div>
          <button type="submit" className="w-full py-3.5 bg-[#0066FF] text-white font-black text-[14px] rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-[#0052cc] active:scale-[0.98] transition-all mt-2">
            <i className="fa-solid fa-floppy-disk mr-2"></i>
            {product ? 'Simpan Perubahan' : 'Tambah Produk'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PosKasirView;
