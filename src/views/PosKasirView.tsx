import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GlobalHeader } from '../components/GlobalHeader';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { cn } from '../lib/utils';
import { playTransactionSound } from '../lib/audioManager';
// ─── Types ───────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  barcode: string;
  nama: string;
  harga: number;
  stok: number;
  satuan: string;
  kategori: string;
  image_url?: string;
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

interface PrintSettings {
  namaToko: string;
  alamat: string;
  ucapan: string;
  enableStok?: boolean;
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
    harga: r.harga, stok: r.stok, satuan: r.satuan, kategori: r.kategori,
    image_url: r.image_url
  }));
  cacheProducts(mapped);
  return mapped;
}

async function upsertProduct(storeId: string, p: Product): Promise<void> {
  await supabase.from('pos_products').upsert({
    id: p.id, store_id: storeId, barcode: p.barcode, nama: p.nama,
    harga: p.harga, stok: p.stok, satuan: p.satuan, kategori: p.kategori,
    image_url: p.image_url
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
  storePhoto?: string;
  dayName?: string;
  storeId?: string;
  onBack?: () => void;
  onGoToLaporan?: () => void;
  clockStr?: string;
  fullDate?: string;
}

const PosKasirView: React.FC<PosKasirViewProps> = ({ kasirName = 'Kasir', kasirRole, storeName = 'ALFA TOKO', storeSubtext, storePhoto, dayName, storeId = 'default', onBack, onGoToLaporan, clockStr = '', fullDate = '' }) => {
  const [products, setProducts] = useState<Product[]>(getCachedProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'kasir' | 'produk' | 'riwayat' | 'setting'>('kasir');
  const [isLoading, setIsLoading] = useState(true);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
    const saved = localStorage.getItem(`pos_settings_${storeId}`);
    const defaultSettings = {
      namaToko: storeName,
      alamat: storeSubtext || '',
      ucapan: 'Terima kasih atas kunjungan Anda',
      enableStok: true
    };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [showBayarModal, setShowBayarModal] = useState(false);
  const [showStruk, setShowStruk] = useState<PosTransaction | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [openSettingAplikasi, setOpenSettingAplikasi] = useState(false);
  const [openSettingStruk, setOpenSettingStruk] = useState(false);

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
    if (printSettings.enableStok && product.stok <= 0) return;
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id);
      if (idx >= 0) {
        const cur = prev[idx];
        if (printSettings.enableStok && cur.qty >= product.stok) return prev;
        const updated = [...prev];
        updated[idx] = { ...cur, qty: cur.qty + 1 };
        return updated;
      }
      return [...prev, { product, qty: 1, diskon: 0 }];
    });
    setSearch('');
    setShowDropdown(false);
    searchRef.current?.focus();
  }, [printSettings.enableStok]);

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.flatMap(i => {
      if (i.product.id !== id) return [i];
      const newQty = i.qty + delta;
      if (newQty <= 0) return [];
      if (printSettings.enableStok && newQty > i.product.stok) return [i];
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

    // Kurangi stok lokal dulu (optimistic) jika sistem stok aktif
    if (printSettings.enableStok) {
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
    }

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
    playTransactionSound(storeId);
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
    if (!showStruk) return;
    
    // Generate text for RawBT / Bluetooth Serial (ESC/POS compatible plain text)
    const w = 32;
    const center = (s: string) => {
      const txt = s.substring(0, w);
      return ' '.repeat(Math.max(0, Math.floor((w - txt.length) / 2))) + txt;
    };
    const right = (left: string, right: string) => {
      const space = w - left.length - right.length;
      return left + (space > 0 ? ' '.repeat(space) : ' ') + right;
    };
    
    const dateStr = new Date(showStruk.timestamp).toLocaleDateString('id-ID');
    const timeStr = new Date(showStruk.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    let text = center(printSettings.namaToko || 'TOKO SAYA') + '\n';
    if (printSettings.alamat) {
      text += center(printSettings.alamat) + '\n';
    }
    text += '-'.repeat(w) + '\n';
    text += `No   : ${showStruk.id}\n`;
    text += `Kasir: ${showStruk.kasir}\n`;
    text += `Waktu: ${dateStr} ${timeStr}\n`;
    text += '-'.repeat(w) + '\n';
    
    showStruk.items.forEach(item => {
      text += `${item.product.nama.substring(0, w)}\n`;
      text += right(`${item.qty} x ${item.product.harga.toLocaleString('id-ID')}`, (item.product.harga * item.qty).toLocaleString('id-ID')) + '\n';
    });
    
    text += '-'.repeat(w) + '\n';
    text += right('TOTAL', `Rp ${showStruk.grandTotal.toLocaleString('id-ID')}`) + '\n';
    text += right(showStruk.metodeBayar, showStruk.metodeBayar === 'TUNAI' ? `Rp ${showStruk.uangDiterima.toLocaleString('id-ID')}` : 'LUNAS') + '\n';
    
    if (showStruk.metodeBayar === 'TUNAI') {
      text += right('Kembalian', `Rp ${showStruk.kembalian.toLocaleString('id-ID')}`) + '\n';
    }
    
    text += '-'.repeat(w) + '\n';
    if (printSettings.ucapan) {
      text += center(printSettings.ucapan) + '\n';
    }
    text += '\n\n\n'; // Feed lines for paper tear

    // Eksekusi print menggunakan Bluetooth Native / RawBT
    const btMac = localStorage.getItem('bluetooth_printer_mac');
    if (btMac && (window as any).bluetoothSerial) {
      // Connect first if not connected, but usually it's handled, let's just write.
      // If write fails, we could try reconnecting, but write will throw error so user knows.
      (window as any).bluetoothSerial.write(text, 
        () => { console.log('Print bluetooth success'); }, 
        (err: any) => {
          // If write fails, maybe try to connect then write
          (window as any).bluetoothSerial.connect(btMac, () => {
             (window as any).bluetoothSerial.write(text, () => {}, () => alert('Gagal print ke Bluetooth: ' + err));
          }, () => {
             (window as any).bluetoothSerial.connectInsecure(btMac, () => {
               (window as any).bluetoothSerial.write(text, () => {}, () => alert('Gagal print ke Bluetooth Insecure: ' + err));
             }, () => {
               alert('Gagal terhubung ke Printer Bluetooth. Pastikan printer menyala.');
             });
          });
        }
      );
    } else {
      // Fallback ke aplikasi RawBT via intent URI
      const url = `rawbt:${encodeURIComponent(text)}`;
      const a = document.createElement('a'); 
      a.href = url; 
      document.body.appendChild(a); 
      a.click(); 
      document.body.removeChild(a);
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans">

      {/* HEADER */}
      <div className="shrink-0 z-30 bg-[#F9FBFF]">
        {/* Header Toko Identik */}
        <GlobalHeader 
          storePhoto={storePhoto}
          storeName={storeName}
          storeSubtext={storeSubtext}
          kasirName={kasirName}
          kasirRole={kasirRole}
          dayName={dayName}
          fullDate={fullDate}
          clockStr={clockStr}
          onMenuClick={onBack}
        />
        
        {/* Blue Card Header (POS Kasir) */}
        <div className="mx-1.5 mb-2 mt-2 relative z-[40]">
          <div className="bg-gradient-to-r from-[#004A8B] to-[#0069BA] rounded-t-[1.5rem] rounded-b-[2rem] shadow-lg border-[2px] border-white p-3.5 overflow-hidden relative">
            <div className="flex items-center gap-3">
               <button onClick={onBack} className="w-10 h-10 rounded-full border border-white/40 bg-white/10 flex items-center justify-center shrink-0 text-white hover:bg-white/20 transition-all active:scale-95 shadow-sm">
                 <i className="fa-solid fa-arrow-left text-lg"></i>
               </button>
               <div className="flex-1 min-w-0">
                 <p className="text-[10px] font-bold text-white mb-0.5 truncate uppercase tracking-widest">Aplikasi Kasir</p>
                 <h2 className="text-base font-black text-white leading-none truncate">POS Kasir</h2>
               </div>
               <button onClick={() => setActiveTab('riwayat')} className="w-10 h-10 rounded-full border border-white/40 bg-white/10 flex items-center justify-center shrink-0 text-white hover:bg-white/20 transition-all active:scale-95 shadow-sm">
                 <i className="fa-solid fa-clock-rotate-left text-lg"></i>
               </button>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mt-2.5 border-b border-gray-100 px-4">
          {([
            { id: 'kasir', label: 'Kasir', icon: 'fa-cash-register' },
            { id: 'produk', label: 'Produk', icon: 'fa-box' },
            { id: 'riwayat', label: 'Riwayat', icon: 'fa-clock-rotate-left' },
            { id: 'setting', label: 'Setting', icon: 'fa-gear' },
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
      </div>

      {/* TAB KASIR */}
      {activeTab === 'kasir' && (
        <div className="flex flex-col flex-1">
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
              <button onClick={() => setShowScanner(true)} className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-all shrink-0">
                <i className="fa-solid fa-barcode text-sm"></i>
              </button>
            </div>
            {showDropdown && filteredProducts.length > 0 && (
              <div className="absolute left-3 right-3 top-full bg-white rounded-xl border border-gray-200 shadow-xl z-50 max-h-60 overflow-y-auto mt-1">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => addToCart(p)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 text-left">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 bg-gray-100" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-box text-gray-300 text-[10px]"></i>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[12px] font-black text-gray-800 truncate">{p.nama}</p>
                        <p className="text-[10px] text-gray-400 font-bold truncate">{p.kategori}{printSettings.enableStok ? ` • Stok: ${p.stok} ${p.satuan}` : ''}</p>
                      </div>
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

          <div className="flex-1 px-3 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                <i className="fa-solid fa-cart-shopping text-5xl"></i>
                <p className="text-sm font-black uppercase tracking-widest">Keranjang Kosong</p>
                <p className="text-[11px] font-bold text-gray-400">Cari atau scan produk untuk memulai</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div key={item.product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-2.5 flex items-center gap-2 sm:gap-3">
                    <span className="text-[10px] font-black text-gray-300 w-3 sm:w-4 text-center shrink-0 hidden sm:block">{idx + 1}</span>
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0 bg-gray-50" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-box text-gray-300 text-xs"></i>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black text-gray-900 truncate leading-tight">{item.product.nama}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{formatRp(item.product.harga)} / {item.product.satuan}</p>
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
            <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-[90px] shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
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
        <div className="flex flex-col flex-1">
          <div className="px-3 pt-3 pb-2 bg-white border-b border-gray-100 shrink-0 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
              <input type="text" placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-[12px] font-bold outline-none text-gray-800 placeholder-gray-400" />
            </div>
            <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }} className="flex items-center gap-2 px-3 py-2 bg-[#0066FF] text-white text-[11px] font-black rounded-xl hover:bg-[#0052cc] active:scale-95 transition-all shadow-md shadow-blue-500/30 shrink-0">
              <i className="fa-solid fa-plus"></i>Tambah
            </button>
          </div>
          <div className="flex-1 px-3 pt-2 pb-[90px]">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                <i className="fa-solid fa-box-open text-5xl"></i>
                <p className="text-sm font-black uppercase tracking-widest">Belum Ada Produk</p>
                <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }} className="px-4 py-2 bg-[#0066FF] text-white text-[11px] font-black rounded-xl">Tambah Produk Pertama</button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  filteredProducts.reduce((acc, p) => {
                    const cat = p.kategori?.trim() || 'Umum';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(p);
                    return acc;
                  }, {} as Record<string, Product[]>)
                ).sort((a, b) => a[0] === 'Umum' ? 1 : b[0] === 'Umum' ? -1 : a[0].localeCompare(b[0]))
                .map(([cat, prods]) => (
                  <div key={cat} className="space-y-2">
                    <div 
                      className="flex justify-between items-center px-2 py-1.5 bg-gray-50 rounded-xl cursor-pointer select-none"
                      onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
                    >
                      <h3 className="font-black text-gray-800 text-[12px] uppercase tracking-wider flex items-center">
                        <i className={`fa-solid fa-chevron-${expandedCats[cat] ? 'down' : 'right'} text-[10px] text-gray-400 mr-2 w-3 text-center transition-transform`}></i>
                        {cat} <span className="text-[#0066FF] text-[10px] ml-1.5 bg-blue-50 px-1.5 rounded-full">{prods.length}</span>
                      </h3>
                      {cat !== 'Umum' && (
                        <div className="flex gap-2">
                          <button onClick={(e) => {
                            e.stopPropagation();
                            const newName = window.prompt(`Ubah nama kategori "${cat}" menjadi:`, cat);
                            if (!newName || newName.trim() === '' || newName === cat) return;
                            const trimmed = newName.trim();
                            const updatedProducts = products.map(p => (p.kategori?.trim() || 'Umum') === cat ? { ...p, kategori: trimmed } : p);
                            setProducts(updatedProducts);
                            localStorage.setItem('alphaPro_pos_products', JSON.stringify(updatedProducts));
                            updatedProducts.filter(p => p.kategori === trimmed).forEach(p => {
                              supabase.from('pos_products').update({ kategori: trimmed }).eq('id', p.id).then();
                            });
                          }} className="text-[#0066FF] hover:text-blue-800 text-[11px] font-bold">Edit</button>
                          
                          <button onClick={(e) => {
                            e.stopPropagation();
                            if (!window.confirm(`Hapus kategori "${cat}"? Produk di dalamnya akan dipindah ke kategori "Umum".`)) return;
                            const updatedProducts = products.map(p => (p.kategori?.trim() || 'Umum') === cat ? { ...p, kategori: 'Umum' } : p);
                            setProducts(updatedProducts);
                            localStorage.setItem('alphaPro_pos_products', JSON.stringify(updatedProducts));
                            updatedProducts.filter(p => p.kategori === 'Umum').forEach(p => {
                              supabase.from('pos_products').update({ kategori: 'Umum' }).eq('id', p.id).then();
                            });
                          }} className="text-red-500 hover:text-red-700 text-[11px] font-bold">Hapus</button>
                        </div>
                      )}
                    </div>
                    {expandedCats[cat] && (
                      <div className="space-y-2 pl-2">
                        {prods.map(p => (
                          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-2.5 flex items-center gap-3">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 bg-gray-50 border border-gray-100" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                                <i className="fa-solid fa-box text-gray-300 text-sm"></i>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-black text-gray-900">{p.nama}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {p.barcode && <span className="text-[9px] font-bold text-gray-400"><i className="fa-solid fa-barcode mr-1"></i>{p.barcode}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[13px] font-black text-[#0066FF] tabular-nums">{`Rp ${p.harga.toLocaleString('id-ID')}`}</p>
                              {printSettings.enableStok && (
                                <p className={`text-[10px] font-black ${p.stok <= 5 ? 'text-rose-500' : 'text-emerald-500'}`}>Stok: {p.stok} {p.satuan}</p>
                              )}
                            </div>
                            <div className="flex gap-1.5 shrink-0 ml-1">
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
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB RIWAYAT */}
      {activeTab === 'riwayat' && (
        <div className="flex-1 px-3 pt-3 pb-[90px] flex flex-col">
          <div className="mb-4 text-center shrink-0">
             <button onClick={onGoToLaporan} className="w-full bg-[#0066FF]/10 text-[#0066FF] border border-[#0066FF]/20 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-[#0066FF]/20 active:scale-95 transition-all">
               <i className="fa-solid fa-chart-line mr-2"></i>Lihat Laporan Lengkap
             </button>
          </div>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-300 gap-3">
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

      {activeTab === 'setting' && (
        <div className="flex-1 px-4 pt-4 pb-[90px] bg-white">
          <div className="max-w-md mx-auto space-y-3">
            <div className="mb-4">
              <h2 className="text-sm font-black text-gray-900 mb-0.5"><i className="fa-solid fa-gear mr-2 text-[#0066FF]"></i>Pengaturan Kasir</h2>
              <p className="text-[10px] text-gray-500 font-bold">Sesuaikan preferensi aplikasi dan struk printer.</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div 
                className="bg-slate-50 border-b border-gray-200 px-3 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setOpenSettingAplikasi(!openSettingAplikasi)}
              >
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                  <i className="fa-solid fa-laptop-code text-[#0066FF]"></i> Sistem Aplikasi
                </label>
                <i className={cn("fa-solid fa-chevron-right text-slate-400 transition-transform duration-300", openSettingAplikasi && "rotate-90")}></i>
              </div>
              
              {openSettingAplikasi && (
                <div className="p-4 animate-in slide-in-from-top-2 fade-in duration-200">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="enableStok"
                      checked={printSettings.enableStok}
                      onChange={e => setPrintSettings(s => ({ ...s, enableStok: e.target.checked }))}
                      className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF] group-hover:border-blue-400 transition-colors cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-[12px] font-black text-gray-800 group-hover:text-[#0066FF] transition-colors">Gunakan Sistem Stok Barang</span>
                      <span className="block text-[10px] text-gray-500 font-bold mt-1 leading-relaxed">Jika dimatikan, produk bebas dijual tanpa memotong stok (Form stok disembunyikan).</span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div 
                className="bg-slate-50 border-b border-gray-200 px-3 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setOpenSettingStruk(!openSettingStruk)}
              >
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                  <i className="fa-solid fa-receipt text-[#0066FF]"></i> Pengaturan Struk
                </label>
                <i className={cn("fa-solid fa-chevron-right text-slate-400 transition-transform duration-300", openSettingStruk && "rotate-90")}></i>
              </div>
              
              {openSettingStruk && (
                <div className="p-4 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200 bg-white">
                  <div>
                    <label className="text-[11px] font-black text-gray-700 block mb-1">Nama Toko (Header)</label>
                    <input
                      type="text"
                      value={printSettings.namaToko}
                      onChange={e => setPrintSettings(s => ({ ...s, namaToko: e.target.value }))}
                      placeholder="Contoh: ALFAZA CELL"
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[12px] font-black text-gray-800 outline-none focus:border-[#0066FF] focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-gray-700 block mb-1">Alamat / Keterangan</label>
                    <textarea
                      value={printSettings.alamat}
                      onChange={e => setPrintSettings(s => ({ ...s, alamat: e.target.value }))}
                      placeholder="Contoh: Jl. Kemerdekaan No.123"
                      rows={2}
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[12px] font-black text-gray-800 outline-none focus:border-[#0066FF] focus:bg-white transition-all resize-none shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-gray-700 block mb-1">Teks Ucapan (Footer)</label>
                    <textarea
                      value={printSettings.ucapan}
                      onChange={e => setPrintSettings(s => ({ ...s, ucapan: e.target.value }))}
                      placeholder="Contoh: Terima kasih atas kunjungan Anda"
                      rows={2}
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[12px] font-black text-gray-800 outline-none focus:border-[#0066FF] focus:bg-white transition-all resize-none shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                localStorage.setItem(`pos_settings_${storeId}`, JSON.stringify(printSettings));
                alert('Pengaturan berhasil disimpan!');
              }}
              className="w-full py-2.5 bg-[#0066FF] text-white font-black text-[12px] rounded-xl shadow-[0_4px_12px_-4px_rgba(0,102,255,0.5)] hover:bg-[#0052cc] active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-save"></i> SIMPAN PENGATURAN
            </button>
          </div>
        </div>
      )}

      {/* MODAL BAYAR */}
      {showBayarModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 animate-in zoom-in-95 shadow-2xl">
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
                <p className="font-bold text-[13px] whitespace-pre-wrap">{printSettings.namaToko}</p>
                {printSettings.alamat && <p className="text-gray-500 whitespace-pre-wrap">{printSettings.alamat}</p>}
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
              {printSettings.ucapan && (
                <p className="text-center text-gray-400 text-[9px] mt-3 border-t border-dashed border-gray-300 pt-2 whitespace-pre-wrap">{printSettings.ucapan}</p>
              )}
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
        <ProductFormModal 
          enableStok={printSettings.enableStok} 
          product={editingProduct} 
          categories={Array.from(new Set(products.map(p => p.kategori?.trim() || 'Umum'))).sort()}
          onSave={saveProduct} 
          onClose={() => { setShowProductForm(false); setEditingProduct(null); }} 
        />
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

      {/* SCANNER MODAL */}
      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onScan={(text) => {
            setShowScanner(false);
            const found = products.find(p => p.barcode === text.trim());
            if (found) {
              addToCart(found);
            } else {
              alert(`Produk dengan barcode ${text} tidak ditemukan.`);
            }
          }}
        />
      )}
      {/* FLOATING CART / INPUT PENJUALAN BUTTON */}
      <button
        onClick={() => {
          setActiveTab('kasir');
          setTimeout(() => searchRef.current?.focus(), 100);
        }}
        className="fixed bottom-[90px] right-4 z-[100] bg-gradient-to-r from-[#0066FF] to-[#0052cc] text-white rounded-full p-1.5 shadow-[0_8px_30px_rgba(0,102,255,0.4)] flex items-center hover:scale-105 active:scale-95 transition-all duration-300 animate-in slide-in-from-bottom-10 fade-in zoom-in-95"
      >
        <div className="bg-white/20 rounded-full w-12 h-12 flex items-center justify-center relative backdrop-blur-sm">
          <i className="fa-solid fa-cart-plus text-xl"></i>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#FF3B30] text-white text-[10px] font-black min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full border-2 border-[#0052cc] shadow-sm">
              {cart.reduce((s, i) => s + i.qty, 0)}
            </span>
          )}
        </div>
        <div className="text-left px-3 pr-4">
          <p className="text-[9px] font-bold text-blue-100 uppercase tracking-widest mb-0.5">
            {cart.length > 0 ? 'Keranjang Kasir' : 'Mulai Transaksi'}
          </p>
          <p className="text-[14px] font-black tabular-nums leading-none">
            {cart.length > 0 ? formatRp(grandTotal) : 'Input Penjualan'}
          </p>
        </div>
      </button>
    </div>
  );
};

// ─── Product Form Modal ───────────────────────────────────────────────────────
interface ProductFormProps {
  product: Product | null;
  categories: string[];
  onSave: (p: Product) => void;
  onClose: () => void;
  enableStok?: boolean;
}

const ProductFormModal: React.FC<ProductFormProps> = ({ product, categories, onSave, onClose, enableStok = true }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [form, setForm] = useState<Product>(product || {
    id: generateId(),
    barcode: '',
    nama: '',
    harga: 0,
    stok: 0,
    satuan: 'pcs',
    kategori: '',
    image_url: ''
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Compress Image
      const compressedFile = await new Promise<File>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > height) { if (width > 500) { height *= 500 / width; width = 500; } } 
            else { if (height > 500) { width *= 500 / height; height = 500; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) resolve(new File([blob], `${Date.now()}.webp`, { type: "image/webp" }));
              else reject(new Error("Compression failed"));
            }, "image/webp", 0.7);
          };
          img.onerror = reject;
        };
        reader.onerror = reject;
      });

      // 2. Upload to Supabase Storage
      const fileName = `${form.id}_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('pos-products').upload(fileName, compressedFile, { upsert: true });
      if (error) throw error;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage.from('pos-products').getPublicUrl(fileName);
      set('image_url', publicUrl);
    } catch (err: any) {
      console.error(err);
      alert('Gagal upload gambar. Pesan: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return;
    onSave(form);
  };

  const set = (k: keyof Product, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 animate-in zoom-in-95 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[15px] font-black text-gray-900">{product ? 'Edit Produk' : 'Tambah Produk'}</h2>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          
          <div className="flex flex-col items-center justify-center mb-4">
            <div 
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${form.image_url ? 'border-transparent bg-gray-50' : 'border-gray-300 hover:border-blue-500 bg-gray-50'}`}
            >
              {form.image_url ? (
                <>
                  <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <i className="fa-solid fa-camera text-white text-lg"></i>
                    <span className="text-white text-[9px] font-bold mt-1">Ubah Foto</span>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400 group-hover:text-blue-500 transition-colors">
                  <i className={`fa-solid ${uploading ? 'fa-spinner fa-spin' : 'fa-image'} text-2xl mb-1`}></i>
                  <p className="text-[9px] font-bold uppercase">{uploading ? 'Upload...' : 'Tambah Foto'}</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          </div>

          {[
            { label: 'Nama Produk *', key: 'nama', type: 'text', placeholder: 'contoh: Aqua 600ml' },
            { label: 'Barcode', key: 'barcode', type: 'text', placeholder: 'Opsional' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">{label}</label>
              <div className="relative flex items-center">
                <input
                  type={type}
                  required={key === 'nama'}
                  placeholder={placeholder}
                  value={String(form[key as keyof Product])}
                  onChange={e => set(key as keyof Product, e.target.value)}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[12px] font-bold text-gray-800 outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-blue-100 transition-all ${key === 'barcode' ? 'pr-12' : ''}`}
                />
                {key === 'barcode' && (
                  <button type="button" onClick={() => setShowScanner(true)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#0066FF]/10 text-[#0066FF] hover:bg-[#0066FF]/20 flex items-center justify-center transition-colors">
                    <i className="fa-solid fa-barcode text-sm"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Kategori</label>
              <input
                type="text"
                list="category-options"
                placeholder="Pilih atau Ketik Baru..."
                value={form.kategori || ''}
                onChange={e => set('kategori', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[12px] font-bold text-gray-800 outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <datalist id="category-options">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Satuan</label>
              <select
                value={form.satuan || 'pcs'}
                onChange={e => set('satuan', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[12px] font-bold text-gray-800 outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
              >
                <option value="pcs">Pcs (Satuan)</option>
                <option value="kg">Kg (Kiloan)</option>
                <option value="liter">Liter</option>
                <option value="gram">Gram</option>
                <option value="lusin">Lusin</option>
                <option value="karton">Karton / Dus</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
                <option value="renceng">Renceng</option>
                <option value="porsi">Porsi</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Harga Jual *</label>
              <input 
                type="text" 
                required 
                placeholder="Rp 0" 
                value={form.harga ? `Rp ${form.harga.toLocaleString('id-ID')}` : ''} 
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  set('harga', parseInt(val || '0', 10));
                }} 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[12px] font-bold text-gray-800 outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-blue-100 transition-all" 
              />
            </div>
            {enableStok && (
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Stok Awal</label>
                <input 
                  type="text" 
                  placeholder="0" 
                  value={form.stok ? form.stok.toLocaleString('id-ID') : ''} 
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    set('stok', parseInt(val || '0', 10));
                  }} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[12px] font-bold text-gray-800 outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-blue-100 transition-all" 
                />
              </div>
            )}
          </div>
          <button type="submit" className="w-full py-3.5 bg-[#0066FF] text-white font-black text-[14px] rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-[#0052cc] active:scale-[0.98] transition-all mt-2">
            <i className="fa-solid fa-floppy-disk mr-2"></i>
            {product ? 'Simpan Perubahan' : 'Tambah Produk'}
          </button>
        </form>
      </div>

      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onScan={(text) => {
            setShowScanner(false);
            set('barcode', text);
          }}
        />
      )}
    </div>
  );
};

export default PosKasirView;
