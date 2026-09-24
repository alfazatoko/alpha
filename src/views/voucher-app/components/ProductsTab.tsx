/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  SlidersHorizontal, 
  ArrowLeft,
  X,
  CheckCircle,
  AlertTriangle,
  LayoutGrid,
  Table2,
  Minus,
  ListPlus,
  Loader2,
  Bot,
  Copy,
  Store,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import type { VoucherProduct, UserRole, Cashier } from '../types';
import { OPERATOR_STYLES } from '../data';
import ProviderLogo from './ProviderLogo';
import { supabase } from '../../../lib/supabase';
import { callGeminiAPI } from '../../../lib/botEngine';

interface ProductsTabProps {
  products: VoucherProduct[];
  activeCashierName: string;
  userRole: UserRole;
  theme?: 'dark' | 'light';
  onAddProduct: (product: Omit<VoucherProduct, 'id'>) => void;
  /** Menambahkan banyak produk sekaligus (batch) — solusi untuk stale closure bug pada upload massal */
  onBulkAddProducts?: (products: Omit<VoucherProduct, 'id'>[]) => void;
  onUpdateProduct: (product: VoucherProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onSelectProduct: (product: VoucherProduct) => void;
  onBack?: () => void;
  onOpenQuickSale?: (productId?: string) => void;
  /** Props baru untuk fitur salin produk antar toko */
  activeStoreId?: string;
  googleUid?: string;
  cashiers?: Cashier[];
  storeList?: Array<{ id: string; name: string; subtext?: string }>;
}

export default function ProductsTab({
  products,
  activeCashierName,
  userRole,
  theme = 'dark',
  onAddProduct,
  onBulkAddProducts,
  onUpdateProduct,
  onDeleteProduct,
  onSelectProduct,
  onBack,
  onOpenQuickSale,
  activeStoreId,
  googleUid,
  cashiers = [],
  storeList = []
}: ProductsTabProps) {
  const isLight = theme === 'light';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<string>('Semua');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  
  // View mode and Shift Tracking State
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  type ShiftItem = { awal: number; akhir: number | ''; qris: number };
  const [shiftTracking, setShiftTracking] = useState<Record<string, ShiftItem>>({});

  // Sync Shift Tracking with products & local storage
  useEffect(() => {
    const saved = localStorage.getItem('v_shift_tracking');
    const initialTracking = saved ? JSON.parse(saved) : {};
    
    let hasChanges = false;
    const nextTracking = { ...initialTracking };
    
    products.forEach(p => {
      if (!nextTracking[p.id]) {
        nextTracking[p.id] = { awal: p.currentStock, akhir: '', qris: 0 };
        hasChanges = true;
      }
    });
    
    setShiftTracking(nextTracking);
    if (hasChanges && !saved) {
      localStorage.setItem('v_shift_tracking', JSON.stringify(nextTracking));
    }
  }, [products]);

  // Auto save to local storage on change
  useEffect(() => {
    if (Object.keys(shiftTracking).length > 0) {
      localStorage.setItem('v_shift_tracking', JSON.stringify(shiftTracking));
    }
  }, [shiftTracking]);

  const handleShiftChange = (id: string, field: keyof ShiftItem, value: any) => {
    setShiftTracking(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };
  
  // Modals / Overlays
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VoucherProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<VoucherProduct | null>(null);
  const [isAddingBulkAI, setIsAddingBulkAI] = useState(false);
  const [bulkAIText, setBulkAIText] = useState('');
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [bulkParsedProducts, setBulkParsedProducts] = useState<any[]>([]);
  // true jika AI scan berhenti di tengah karena batas token —
  // dipakai untuk tampilkan warning bahwa hasil tidak lengkap
  const [isPartialScan, setIsPartialScan] = useState(false);

  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Owner two-column product visibility view
  const [ownerProductView, setOwnerProductView] = useState<'visible' | 'hidden'>('visible');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const [hiddenProductIds, setHiddenProductIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`alphaPro_${activeStoreId || 'default'}_hidden_products`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Load from Supabase Online
  useEffect(() => {
    if (!activeStoreId) return;
    
    // Initial fetch
    supabase.from('store_settings')
      .select('voucher_app_data')
      .eq('store_id', activeStoreId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data?.voucher_app_data?.global_hidden_products) {
          setHiddenProductIds(data.voucher_app_data.global_hidden_products);
          localStorage.setItem(`alphaPro_${activeStoreId}_hidden_products`, JSON.stringify(data.voucher_app_data.global_hidden_products));
        }
      });

    // Realtime Listener for sync across devices
    const sub = supabase.channel(`hidden_products_sync_${activeStoreId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings', filter: `store_id=eq.${activeStoreId}` }, (payload) => {
         const newData = (payload.new as any)?.voucher_app_data;
         if (newData?.global_hidden_products) {
           setHiddenProductIds(newData.global_hidden_products);
           localStorage.setItem(`alphaPro_${activeStoreId}_hidden_products`, JSON.stringify(newData.global_hidden_products));
         }
      }).subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [activeStoreId]);

  // STATE: Modal Salin Produk ke Toko Lain
  // ====================================================
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetStoreId, setCopyTargetStoreId] = useState('');
  const [copyTargetCashierId, setCopyTargetCashierId] = useState('all');
  // 'catalog' = salin nama+harga saja (stok=0) | 'withStock' = salin beserta jumlah stok
  const [copyMode, setCopyMode] = useState<'catalog' | 'withStock'>('catalog');
  // 'overwrite' = timpa semua | 'merge' = tambahkan yang belum ada
  const [copyConflict, setCopyConflict] = useState<'overwrite' | 'merge'>('overwrite');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [copyStatusMsg, setCopyStatusMsg] = useState('');
  const [targetStoreCashiers, setTargetStoreCashiers] = useState<Array<{id: string; name: string}>>([]);
  const [isLoadingTargetCashiers, setIsLoadingTargetCashiers] = useState(false);

  // Toko-toko lain (selain toko aktif saat ini) yang bisa jadi tujuan salin
  const otherStores = storeList.filter(s => s.id !== activeStoreId);

  // Muat daftar kasir dari toko tujuan saat pilihan toko berubah
  useEffect(() => {
    if (!copyTargetStoreId) {
      setTargetStoreCashiers([]);
      setCopyTargetCashierId('all');
      return;
    }
    setIsLoadingTargetCashiers(true);
    const kasirKey = `alphaPro_${copyTargetStoreId}_kasir_list`;
    try {
      const raw = localStorage.getItem(kasirKey);
      if (raw) {
        const kList: Record<string, { name?: string; role?: string }> = JSON.parse(raw);
        const kasirs = Object.entries(kList)
          .filter(([_, d]) => d.role !== 'owner')
          .map(([username, d]) => ({ id: `c_${username}`, name: d.name || username }));
        setTargetStoreCashiers(kasirs);
      } else {
        setTargetStoreCashiers([]);
      }
    } catch {
      setTargetStoreCashiers([]);
    }
    setCopyTargetCashierId('all');
    setIsLoadingTargetCashiers(false);
  }, [copyTargetStoreId]);

  /**
   * handleCopyProducts—Salin produk dari toko aktif ke toko tujuan
   * - Menulis ke localStorage setiap kasir di toko tujuan (atau satu kasir tertentu)
   * - Sync ke Supabase jika googleUid tersedia
   */
  const handleCopyProducts = async () => {
    if (!copyTargetStoreId) return;
    setCopyStatus('loading');
    setCopyStatusMsg('');
    try {
      const targetStoreKey = copyTargetStoreId;

      // Siapkan produk yang akan disalin dengan ID yang stabil
      const productsToCopy: VoucherProduct[] = products.map(p => {
        const baseId = p.id.includes('_copy_') ? p.id.split('_copy_')[0] : p.id;
        return {
          ...p,
          id: `${baseId}_copy_${copyTargetStoreId}`,
          currentStock: copyMode === 'withStock' ? p.currentStock : 0,
        };
      });

      // Tentukan kasir tujuan
      const targetCashierIds: string[] = copyTargetCashierId === 'all'
        ? (targetStoreCashiers.length > 0
            ? targetStoreCashiers.map(c => c.id)
            : ['c1']) // fallback jika tidak ada kasir terdaftar
        : [copyTargetCashierId];

      let allProductsToUpsert = new Map();
      let allStocksToUpsert: any[] = [];

      // Tulis ke localStorage tiap kasir tujuan
      for (const cashierId of targetCashierIds) {
        const prefix = `v_${targetStoreKey}_${cashierId}`;
        let finalProducts: VoucherProduct[];

        if (copyConflict === 'merge') {
          // Merge: tambah produk yang ID-nya belum ada
          const existingRaw = localStorage.getItem(`${prefix}_products`);
          const existing: VoucherProduct[] = existingRaw ? JSON.parse(existingRaw) : [];
          const existingNames = new Set(existing.map(p => p.name.toLowerCase()));
          const newOnes = productsToCopy.filter(p => !existingNames.has(p.name.toLowerCase()));
          finalProducts = [...existing, ...newOnes];
        } else {
          // Overwrite: timpa semua
          finalProducts = productsToCopy;
        }
        localStorage.setItem(`${prefix}_products`, JSON.stringify(finalProducts));

        // Siapkan data untuk database utama (Supabase)
        for (const p of finalProducts) {
          allProductsToUpsert.set(p.id, {
            id: p.id,
            store_id: copyTargetStoreId,
            name: p.name,
            category: p.category,
            operator: p.operator,
            cost_price: p.costPrice,
            selling_price: p.sellingPrice,
            min_stock_level: p.minStockLevel,
            description: p.description || '',
            barcode: p.barcode || '',
            sku: p.sku || ''
          });
          
          allStocksToUpsert.push({
            store_id: copyTargetStoreId,
            product_id: p.id,
            cashier_id: cashierId,
            current_stock: p.currentStock
          });
        }
      }

      // Sync ke Supabase jika online
      if (googleUid && copyTargetStoreId) {
        // 1. Update fallback store_settings
        const { data: existingData } = await supabase
          .from('store_settings')
          .select('voucher_app_data')
          .eq('store_id', copyTargetStoreId)
          .maybeSingle();

        const existingCloud = existingData?.voucher_app_data || {};
        const updatedCloud: Record<string, any> = { ...existingCloud };

        for (const cashierId of targetCashierIds) {
          const prefix = `v_${targetStoreKey}_${cashierId}`;
          const raw = localStorage.getItem(`${prefix}_products`);
          const finalProducts: VoucherProduct[] = raw ? JSON.parse(raw) : [];
          updatedCloud[cashierId] = {
            ...(existingCloud[cashierId] || {}),
            products: finalProducts
          };
        }

        await supabase.from('store_settings').upsert({
          store_id: copyTargetStoreId,
          voucher_app_data: updatedCloud
        }, { onConflict: 'store_id' });

        // 2. Jika mode timpa (overwrite) dan semua kasir dipilih, hapus produk lama di DB agar tidak muncul lagi
        if (copyConflict === 'overwrite' && copyTargetCashierId === 'all') {
           await supabase.from('voucher_products').delete().eq('store_id', copyTargetStoreId);
           await supabase.from('voucher_stocks').delete().eq('store_id', copyTargetStoreId);
        } else if (copyConflict === 'overwrite' && copyTargetCashierId !== 'all') {
           // Jika hanya satu kasir, kita hapus stok lama untuk kasir tersebut saja
           await supabase.from('voucher_stocks').delete().eq('store_id', copyTargetStoreId).eq('cashier_id', copyTargetCashierId);
        }

        // 3. Simpan ke tabel utama agar langsung terbaca di HP lain
        const productsArr = Array.from(allProductsToUpsert.values());
        if (productsArr.length > 0) {
           const { error: pErr } = await supabase.from('voucher_products').upsert(productsArr);
           if (pErr) console.error("Error upserting voucher_products:", pErr);
        }
        if (allStocksToUpsert.length > 0) {
           const { error: sErr } = await supabase.from('voucher_stocks').upsert(allStocksToUpsert);
           if (sErr) console.error("Error upserting voucher_stocks:", sErr);
        }
      }

      const targetStoreName = storeList.find(s => s.id === copyTargetStoreId)?.name || copyTargetStoreId;
      const modeLabel = copyMode === 'catalog' ? 'katalog (stok=0)' : 'beserta stok';
      setCopyStatus('success');
      setCopyStatusMsg(`Berhasil menyalin ${productsToCopy.length} produk (${modeLabel}) ke ${targetStoreName}!`);
    } catch (err: any) {
      setCopyStatus('error');
      setCopyStatusMsg('Gagal menyalin produk: ' + (err?.message || String(err)));
    }
  };

  const handleCloseCopyModal = () => {
    setShowCopyModal(false);
    setCopyTargetStoreId('');
    setCopyTargetCashierId('all');
    setCopyMode('catalog');
    setCopyConflict('overwrite');
    setCopyStatus('idle');
    setCopyStatusMsg('');
  };

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Pulsa' | 'Paket Data' | 'Token' | 'Game' | 'PLN'>('Paket Data');
  const [formOperator, setFormOperator] = useState<'Telkomsel' | 'Axis' | 'Indosat' | 'XL' | 'Tri' | 'Smartfren'>('Telkomsel');
  const [formCostPrice, setFormCostPrice] = useState<string>('6.500');
  const [formSellingPrice, setFormSellingPrice] = useState<string>('8.000');
  const [formCurrentStock, setFormCurrentStock] = useState<number>(15);
  const [formMinStockLevel, setFormMinStockLevel] = useState<number>(4);
  const [formDescription, setFormDescription] = useState('');
  const [formBarcode, setFormBarcode] = useState('');

  const filteredProducts = products.filter(p => {
    const safeName = (p.name || '').toLowerCase();
    const safeBarcode = p.barcode || '';
    const safeOperator = (p.operator || '').toLowerCase();
    const safeSearch = (searchQuery || '').toLowerCase();

    const matchesSearch = safeName.includes(safeSearch) || 
                          safeBarcode.includes(safeSearch) ||
                          safeOperator.includes(safeSearch);
                          
    // Pencocokan operator harus case-insensitive dan aman dari spasi berlebih
    const matchesOperator = selectedOperator === 'Semua' || safeOperator === selectedOperator.toLowerCase();
    
    const currentStock = typeof p.currentStock === 'number' ? p.currentStock : 0;
    const minStock = typeof p.minStockLevel === 'number' ? p.minStockLevel : 0;
    const matchesLowStock = !showLowStockOnly || currentStock <= minStock;

    // For cashier: only show non-hidden products
    const isHidden = hiddenProductIds.includes(p.id);
    if (userRole !== 'owner' && isHidden) return false;

    return matchesSearch && matchesOperator && matchesLowStock;
  });

  // Separate visible / hidden for owner two-col view
  const visibleProducts = filteredProducts.filter(p => !hiddenProductIds.includes(p.id));
  const hiddenProducts = filteredProducts.filter(p => hiddenProductIds.includes(p.id));

  // Helper: toggle product hidden state (Syncs to DB too)
  const handleToggleHide = async (p: VoucherProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProductId(null);
    
    const newHidden = hiddenProductIds.includes(p.id) 
      ? hiddenProductIds.filter(id => id !== p.id) 
      : [...hiddenProductIds, p.id];
      
    // Optimistic Update (Instant)
    setHiddenProductIds(newHidden);
    localStorage.setItem(`alphaPro_${activeStoreId || 'default'}_hidden_products`, JSON.stringify(newHidden));

    // Online Sync
    if (activeStoreId) {
      try {
        const { data } = await supabase.from('store_settings').select('voucher_app_data').eq('store_id', activeStoreId).maybeSingle();
        const existingData = data?.voucher_app_data || {};
        existingData.global_hidden_products = newHidden;
        
        await supabase.from('store_settings').upsert({
          store_id: activeStoreId,
          voucher_app_data: existingData
        }, { onConflict: 'store_id' });
      } catch (err) {
        console.error("Gagal sinkronisasi sembunyikan produk ke cloud:", err);
      }
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirmBulkDelete = () => {
    selectedProductIds.forEach(id => onDeleteProduct(id));
    setSelectedProductIds([]);
    setShowBulkDeleteModal(false);
    setIsBulkSelectMode(false);
  };

  const handleOpenAddForm = () => {
    setFormName('');
    setFormCategory('Paket Data');
    setFormOperator('Telkomsel');
    setFormCostPrice('6.500');
    setFormSellingPrice('8.000');
    setFormCurrentStock(15);
    setFormMinStockLevel(4);
    setFormDescription('Voucher Paket Data Berlaku 1 Hari');
    setFormBarcode(Math.floor(1000000000 + Math.random() * 9000000000).toString());
    setIsAddingNew(true);
  };

  const handleOpenEditForm = (p: VoucherProduct, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent product detail selection
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category as any);
    setFormOperator(p.operator as any);
    setFormCostPrice(p.costPrice.toLocaleString('id-ID'));
    setFormSellingPrice(p.sellingPrice.toLocaleString('id-ID'));
    setFormCurrentStock(p.currentStock);
    setFormMinStockLevel(p.minStockLevel);
    setFormDescription(p.description);
    setFormBarcode(p.barcode);
    setIsEditing(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    onAddProduct({
      name: formName,
      category: formCategory,
      operator: formOperator,
      costPrice: Number(String(formCostPrice).replace(/\D/g, '')),
      sellingPrice: Number(String(formSellingPrice).replace(/\D/g, '')),
      currentStock: Number(formCurrentStock),
      minStockLevel: Number(formMinStockLevel),
      description: formDescription,
      barcode: formBarcode,
      sku: `${formOperator.substring(0,3).toUpperCase()}-${formName.replace(/\s+/g, '-').toUpperCase()}`
    });

    setIsAddingNew(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !formName.trim()) return;

    onUpdateProduct({
      ...editingProduct,
      name: formName,
      category: formCategory,
      operator: formOperator,
      costPrice: Number(String(formCostPrice).replace(/\D/g, '')),
      sellingPrice: Number(String(formSellingPrice).replace(/\D/g, '')),
      currentStock: Number(formCurrentStock),
      minStockLevel: Number(formMinStockLevel),
      description: formDescription,
      barcode: formBarcode
    });

    setIsEditing(false);
    setEditingProduct(null);
  };

  const handleDeleteClick = (p: VoucherProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductToDelete(p);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  const handleParseBulk = () => {
    if (!bulkAIText.trim()) return;
    setIsParsingAI(true);
    try {
      const lines = bulkAIText.split('\n').filter(line => line.trim() !== '');
      const parsed = [];
      for (const line of lines) {
        const parts = line.split('=').map(p => p.trim());
        if (parts.length >= 5) {
          // Format: Nama Provider= Nama Produk= Harga Modal= Harga Jual= Stok= Stok Alert
          parsed.push({
            operator: parts[0],
            name: parts[1],
            costPrice: parseInt(parts[2].replace(/\D/g, '') || '0', 10),
            sellingPrice: parseInt(parts[3].replace(/\D/g, '') || '0', 10),
            stock: parseInt(parts[4].replace(/\D/g, '') || '0', 10),
            minStockLevel: parts.length > 5 ? parseInt(parts[5].replace(/\D/g, '') || '4', 10) : 4
          });
        }
      }
      setBulkParsedProducts(parsed);
    } catch (e) {
      console.error(e);
      alert('Gagal memproses data. Pastikan format sesuai.');
    } finally {
      setIsParsingAI(false);
    }
  };

  /**
   * salvagePartialJson — Coba selamatkan objek-objek JSON yang sudah lengkap
   * dari teks JSON array yang terpotong di tengah akibat batas token.
   *
   * Strategi:
   * 1. Coba append ']' langsung — jika produk terakhir kebetulan sudah selesai
   * 2. Potong di '}' terakhir lalu append ']' — buang objek yang belum selesai
   * 3. Extract semua objek lengkap dengan regex sebagai fallback terakhir
   */
  const salvagePartialJson = (rawText: string): any[] => {
    const text = rawText.replace(/\[SCAN_PARTIAL\]/g, '').trim();
    // Hapus markdown jika ada
    const clean = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    // Cari blok array
    const start = clean.indexOf('[');
    if (start === -1) return [];
    const body = clean.slice(start);

    // Strategi 1: append ']' langsung
    try {
      const r = JSON.parse(body.endsWith(']') ? body : body + ']');
      if (Array.isArray(r) && r.length > 0) return r;
    } catch {}

    // Strategi 2: potong di '}' terakhir lalu append ']'
    const lastBrace = body.lastIndexOf('}');
    if (lastBrace > 0) {
      try {
        const r = JSON.parse(body.substring(0, lastBrace + 1) + ']');
        if (Array.isArray(r) && r.length > 0) return r;
      } catch {}
    }

    // Strategi 3: ekstrak semua objek yang komplet dengan regex
    const matches = body.match(/\{[^{}]+\}/g);
    if (matches) {
      const salvaged = matches
        .map(m => { try { return JSON.parse(m); } catch { return null; } })
        .filter(Boolean)
        .filter(obj => obj.name || obj.operator);
      if (salvaged.length > 0) return salvaged;
    }

    return [];
  };

  const handleParseBulkAI = async () => {
    if (!bulkAIText.trim()) return;
    
    const apiKey = localStorage.getItem('alphaPro_gemini_api_key');
    if (!apiKey) {
      alert('API Key Gemini belum diset. Silakan isi di pengaturan Bot Alpha (ikon bot di beranda) untuk menggunakan fitur AI Scanner.');
      return;
    }

    setIsParsingAI(true);
    setIsPartialScan(false);
    try {
      const prompt = `Anda adalah sistem data extractor untuk aplikasi voucher konter.
Tugas Anda: Ekstrak SEMUA data voucher dari teks berantakan berikut.
Abaikan kalimat obrolan yang tidak relevan. Konversi harga (misal: "25rb", "25k") jadi angka utuh (25000).
Kembalikan HANYA array JSON valid (tanpa blok markdown, langsung array-nya saja) dengan format per item:
[{ "operator": "string", "name": "string", "costPrice": number, "sellingPrice": number, "stock": number, "minStockLevel": number }]
Jika stok alert tidak disebutkan, isi minStockLevel dengan 4. Jika operator tidak jelas, isi "Lainnya".
PENTING: Output harus dimulai dari karakter "[" dan diakhiri "]". Jangan tambahkan teks lain.

Teks yang akan diekstrak:
${bulkAIText}`;

      // Gunakan maxTokens 4096 agar JSON banyak produk tidak terpotong
      const reply = await callGeminiAPI(prompt, [], apiKey, undefined, 4096);

      // Cek apakah AI berhenti di tengah karena batas token
      const isPartial = reply.includes('[SCAN_PARTIAL]');

      // ── Robust JSON extraction ─────────────────────────────────────────────
      let cleanReply = reply.replace('[SCAN_PARTIAL]', '').trim();
      cleanReply = cleanReply.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

      // Cari array JSON di dalam teks
      const arrayMatch = cleanReply.match(/(\[[\s\S]*\])/);
      if (arrayMatch) cleanReply = arrayMatch[1];

      let parsed: any[] = [];
      try {
        parsed = JSON.parse(cleanReply);
        if (!Array.isArray(parsed)) parsed = [];
      } catch {
        // Parse gagal — coba salvage jika respons parsial
        if (isPartial) {
          parsed = salvagePartialJson(reply);
        } else {
          console.error('JSON parse error. Raw reply:', reply);
          throw new Error(
            'Gemini merespons tapi format JSON tidak valid. ' +
            'Coba kurangi jumlah data atau gunakan fitur Manual (=).'
          );
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        setBulkParsedProducts(parsed);
        setIsPartialScan(isPartial);
      } else if (isPartial) {
        // Batas token tercapai sebelum ada satu produk pun yang selesai
        alert('⚠️ Batas token tercapai sebelum ada data yang bisa diekstrak. Coba kurangi jumlah teks atau bagi menjadi beberapa bagian.');
      } else {
        alert('Gemini tidak menemukan data voucher dalam teks. Pastikan teks mengandung informasi produk (nama, harga, stok).');
      }
    } catch (e: any) {
      console.error('[AI Scan Error]', e);
      alert(`❌ Gagal scan dengan AI:\n\n${e.message}`);
    } finally {
      setIsParsingAI(false);
    }
  };

  const handleSaveBulk = () => {
    if (bulkParsedProducts.length === 0) return;

    // Siapkan semua produk sekaligus sebagai array
    const productsToAdd: Omit<VoucherProduct, 'id'>[] = bulkParsedProducts.map(p => ({
      name: (p.name || '').trim() || 'Produk Baru',
      category: 'Paket Data' as const,
      operator: (operatorsList.find(op => op.toLowerCase() === (p.operator || '').trim().toLowerCase()) || 'Lainnya') as VoucherProduct['operator'],
      costPrice: Number(p.costPrice) || 0,
      sellingPrice: Number(p.sellingPrice) || 0,
      currentStock: Number(p.stock) || 0,
      minStockLevel: Number(p.minStockLevel) || 4,
      description: 'Ditambahkan otomatis via massal',
      barcode: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    }));

    // Gunakan onBulkAddProducts jika tersedia (atomic batch — tidak stale closure)
    // Fallback ke loop onAddProduct jika prop belum disediakan
    if (onBulkAddProducts) {
      onBulkAddProducts(productsToAdd);
    } else {
      // Legacy fallback (tidak disarankan untuk batch besar)
      productsToAdd.forEach(p => onAddProduct(p));
    }

    setBulkParsedProducts([]);
    setBulkAIText('');
    setIsAddingBulkAI(false);
  };

  // Shift Tracking Helpers
  let totalLaku = 0;
  let totalOmset = 0;

  const operatorsList = ['Telkomsel', 'Axis', 'Indosat', 'XL', 'Tri', 'Smartfren', 'Lainnya'];
  const OP_COLORS: Record<string, string> = {
    'Telkomsel': 'bg-rose-600 text-slate-900 dark:text-white',
    'Axis': 'bg-purple-600 text-slate-900 dark:text-white',
    'Indosat': 'bg-yellow-500 text-slate-900',
    'XL': 'bg-blue-600 text-slate-900 dark:text-white',
    'Tri': 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-900 dark:text-white',
    'Smartfren': 'bg-pink-600 text-slate-900 dark:text-white'
  };

  function getShortName(name: string = '', operator: string = '') {
    const safeName = name || '';
    const safeOp = operator || '';
    let short = safeName.replace(new RegExp(safeOp, 'i'), '').trim();
    short = short.replace(/Hari/i, 'H').replace(/Bulan/i, 'B');
    return short || safeName; // Fallback to safeName if it becomes empty
  }
  
  if (viewMode === 'table') {
    filteredProducts.forEach(p => {
      const shift = shiftTracking[p.id] || { awal: p.currentStock, akhir: '', qris: 0 };
      const awal = shift.awal || 0;
      const akhir = shift.akhir === '' ? awal : Number(shift.akhir);
      const laku = Math.max(0, awal - akhir);
      totalLaku += laku;
      totalOmset += laku * p.sellingPrice;
    });
  }

  return (
    <div className="flex flex-col h-full space-y-3.5 pb-6" id="stok-voucher-container">
      {/* 1. Enhanced Header: Unified Mobile App Bar */}
      <div className="flex flex-col gap-3 mb-2 mt-1">
        
        {/* ROW 1: < (Back), Title (Center), x (Close) */}
        <div className="flex items-center justify-between relative px-1">
          {onBack ? (
            <button 
              onClick={onBack}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-95 ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-slate-300'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
          
          <div className="flex-1 text-center px-2">
            <h2 className={`text-[17px] font-black tracking-tight leading-tight ${isLight ? 'text-slate-800' : 'text-slate-900 dark:text-white'}`}>
              Stok Voucher
            </h2>
            <p className={`text-[10px] font-bold mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Daftar produk yang tersedia
            </p>
          </div>

          <button 
            onClick={onBack || (() => {})}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-95 ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-slate-300'
            }`}
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ROW 2: Search + Action Buttons Combined */}
        <div className="flex items-center gap-1.5 px-1">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full backdrop-blur-xl border rounded-xl pl-8 pr-3 py-1.5 text-[12px] focus:outline-none transition shadow-sm ${
                isLight 
                  ? 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-400' 
                  : 'bg-white/5 border-white/10 text-white placeholder-slate-400 focus:border-white/30'
              }`}
            />
          </div>

          {/* View Mode Toggles */}
          <div className={`flex shrink-0 rounded-xl p-1 border shadow-inner ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`}>
            <button 
              onClick={() => setViewMode('card')}
              className={`p-1 rounded-lg transition-all ${
                viewMode === 'card' 
                  ? (isLight ? 'bg-white text-cyan-600 shadow-sm border border-slate-200/60 font-bold' : 'bg-cyan-500/20 text-cyan-700 shadow-sm') 
                  : (isLight ? 'text-slate-500 hover:bg-slate-200/50' : 'text-slate-400 hover:bg-white/10')
              }`}
              title="Mode Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-1 rounded-lg transition-all ${
                viewMode === 'table' 
                  ? (isLight ? 'bg-white text-cyan-600 shadow-sm border border-slate-200/60 font-bold' : 'bg-cyan-500/20 text-cyan-700 shadow-sm') 
                  : (isLight ? 'text-slate-500 hover:bg-slate-200/50' : 'text-slate-400 hover:bg-white/10')
              }`}
              title="Mode Tabel & Shift"
            >
              <Table2 className="w-4 h-4" />
            </button>
          </div>
          
          {/* Add Actions Group - Visible only for Owner */}
          {userRole === 'owner' && (
            <div className={`flex shrink-0 rounded-xl p-1 border shadow-inner relative ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-cyan-400/20 rounded-full blur-md pointer-events-none" />
              {/* Salin ke Toko Lain */}
              {otherStores.length > 0 && (
                <>
                  <button
                    onClick={() => { setShowCopyModal(true); setCopyStatus('idle'); }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${isLight ? 'hover:bg-violet-100 text-violet-600' : 'hover:bg-violet-500/20 text-violet-400'}`}
                    title="Salin Daftar Produk ke Toko Lain"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <div className={`w-px mx-0.5 my-1.5 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
                </>
              )}
              {/* Bulk Add */}
              <button 
                onClick={() => setIsAddingBulkAI(true)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${isLight ? 'hover:bg-amber-100 text-amber-600' : 'hover:bg-amber-500/20 text-amber-500'}`}
                title="Tambah Massal"
              >
                <ListPlus className="w-4 h-4" />
              </button>
              <div className={`w-px mx-0.5 my-1.5 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
              {/* Add New */}
              <button 
                onClick={handleOpenAddForm}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${isLight ? 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700' : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'}`}
                title="Tambah Voucher Baru"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ROW 3: Provider Filter Bar (New Renovated - Minimalist Pills) */}
        <div className="flex gap-2 overflow-x-auto py-2 px-1 no-scrollbar items-center" id="products-provider-filter">
          {['Semua', 'Telkomsel', 'Axis', 'Indosat', 'XL', 'Tri', 'Smartfren'].map((op) => {
            const isSelected = selectedOperator === op;
            return (
              <button
                key={op}
                type="button"
                onClick={() => setSelectedOperator(op)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[11px] font-bold transition-all border ${
                  isSelected
                    ? (isLight ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-900 border-white shadow-md')
                    : (isLight ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' : 'bg-slate-800/50 text-slate-400 border-white/10 hover:bg-white/10')
                }`}
              >
                {op}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Quick Chips (Collapsible / Dynamic) */}
      <AnimatePresence>
        {showFilterDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-2 py-1"
          >
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none select-none">
              {['Semua', 'Telkomsel', 'Axis', 'Indosat', 'XL', 'Tri', 'Smartfren'].map((op) => (
                <button
                  key={op}
                  onClick={() => setSelectedOperator(op)}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold border whitespace-nowrap transition cursor-pointer ${
                    selectedOperator === op 
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200' 
                      : 'bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {op}
                </button>
              ))}
              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`px-3 py-1 rounded-xl text-[10px] font-bold border whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                  showLowStockOnly 
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300' 
                    : 'bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-500 font-black dark:text-amber-400" />
                Stok Rendah
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === 'card' ? (
        <div className="space-y-2.5 overflow-y-auto pb-32 scrollbar-thin scrollbar-thumb-white/10 flex-1 min-h-[500px]" id="stok-voucher-card-list">
          {/* Owner Two-Column Tab Header */}
          {userRole === 'owner' && (
            <div className={`flex gap-1 p-1 rounded-xl border shadow-inner mb-1 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/60 border-white/10'
            }`}>
              <button
                type="button"
                onClick={() => setOwnerProductView('visible')}
                className={`flex-1 py-2 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1.5 ${
                  ownerProductView === 'visible'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : (isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/10')
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Ditampilkan
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                  ownerProductView === 'visible' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>{visibleProducts.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setOwnerProductView('hidden')}
                className={`flex-1 py-2 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1.5 ${
                  ownerProductView === 'hidden'
                    ? 'bg-rose-500 text-white shadow-md'
                    : (isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/10')
                }`}
              >
                <X className="w-3.5 h-3.5" />
                Disembunyikan
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                  ownerProductView === 'hidden' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                }`}>{hiddenProducts.length}</span>
              </button>
            </div>
          )}

          {/* Product list based on view */}
          {(() => {
            const displayList = userRole === 'owner'
              ? (ownerProductView === 'visible' ? visibleProducts : hiddenProducts)
              : visibleProducts;

            if (displayList.length === 0) {
              return (
                <div className="text-center py-10 text-slate-500 text-xs bg-white/[0.03] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6">
                  {userRole === 'owner' && ownerProductView === 'hidden'
                    ? '✅ Tidak ada produk yang disembunyikan.'
                    : 'Tidak ada voucher yang cocok dengan pencarian.'}
                </div>
              );
            }

            return displayList.map((p) => {
              const isLowStock = p.currentStock <= p.minStockLevel;

              return (
                <div
                  key={p.id}
                  className={`backdrop-blur-xl border rounded-2xl p-3 shadow-md transition-all duration-200 relative flex flex-col group select-none ${
                    hiddenProductIds.includes(p.id)
                      ? (isLight ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-slate-800/40 border-white/5 opacity-70')
                      : (isLight
                          ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                          : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 border-slate-200 dark:border-white/5 text-slate-900 dark:text-white')
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                  {/* Main Row */}
                  <div className={`flex items-center justify-between w-full ${!hiddenProductIds.includes(p.id) ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => !hiddenProductIds.includes(p.id) && onSelectProduct(p)}>
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      {/* Left: Logo */}
                      <div className="flex shrink-0 items-center justify-center">
                        <ProviderLogo operator={p.operator} category={p.category} size="md" />
                      </div>

                      {/* Middle: Title & Price */}
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <h4 className={`text-[15px] font-bold tracking-tight truncate leading-tight ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'} ${hiddenProductIds.includes(p.id) ? 'line-through opacity-60' : ''}`}>
                          {p.name}
                        </h4>
                        <div className={`flex items-center gap-2 mt-1 text-[11px] font-bold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                          {userRole === 'owner' && (
                            <>
                              <span>Rp {p.costPrice.toLocaleString('id-ID')}</span>
                              <span className={isLight ? 'text-slate-600 dark:text-slate-300' : 'text-white/20'}>|</span>
                            </>
                          )}
                          <span className={isLight ? 'text-emerald-600 font-extrabold' : 'text-emerald-500 font-black dark:text-emerald-400'}>Rp {p.sellingPrice.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions & Stock Badge */}
                    <div className="flex items-center gap-3 shrink-0 pl-2">
                      {/* Arrow Expander Button */}
                      {userRole === 'owner' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedProductId(prev => prev === p.id ? null : p.id); }}
                          className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-500' : 'bg-white/5 hover:bg-white/10 text-slate-400'
                          }`}
                          title="Aksi Produk"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedProductId === p.id ? 'rotate-180' : ''}`} />
                        </button>
                      )}

                      {/* Stock Badge */}
                      <div className={`w-[56px] h-[56px] rounded-2xl border flex flex-col items-center justify-center transition-all shadow-sm ${
                        hiddenProductIds.includes(p.id)
                          ? 'bg-slate-100 border-slate-200 text-slate-400'
                          : isLowStock
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 font-black dark:text-rose-400'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-black dark:text-emerald-400'
                      }`}>
                        <span className="text-xl font-black leading-none tracking-tight">
                          {p.currentStock}
                        </span>
                        <span className="text-[9px] font-black tracking-widest uppercase leading-none mt-1 opacity-90">
                          STOK
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Actions Row (Accordion) */}
                  <AnimatePresence>
                    {userRole === 'owner' && expandedProductId === p.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`flex items-center justify-around p-1.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-white/10'}`}>
                          {/* Edit */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenEditForm(p, e); }} 
                            className={`flex items-center justify-center flex-1 gap-1.5 py-2.5 rounded-lg transition active:scale-95 ${isLight ? 'hover:bg-blue-100 text-blue-600' : 'hover:bg-blue-500/30 text-blue-400'}`}
                          >
                            <Pencil className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">Edit</span>
                          </button>
                          
                          <div className={`w-px h-6 mx-1 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
                          
                          {/* Hide / Show */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleHide(p, e); }} 
                            className={`flex items-center justify-center flex-1 gap-1.5 py-2.5 rounded-lg transition active:scale-95 ${
                              hiddenProductIds.includes(p.id) 
                                ? (isLight ? 'hover:bg-emerald-100 text-emerald-600' : 'hover:bg-emerald-500/30 text-emerald-400') 
                                : (isLight ? 'hover:bg-amber-100 text-amber-600' : 'hover:bg-amber-500/30 text-amber-400')
                            }`}
                          >
                            {hiddenProductIds.includes(p.id) ? <><CheckCircle className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">Tampilkan</span></> : <><X className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">Sembunyikan</span></>}
                          </button>
                          
                          <div className={`w-px h-6 mx-1 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
                          
                          {/* Delete */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(p, e); }} 
                            className={`flex items-center justify-center flex-1 gap-1.5 py-2.5 rounded-lg transition active:scale-95 ${isLight ? 'hover:bg-rose-100 text-rose-500' : 'hover:bg-rose-500/30 text-rose-400'}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">Hapus</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-3 pb-2 pt-1">
          {/* Bulk Action Header */}
          {userRole === 'owner' && (
            <div className="flex justify-between items-center px-1">
              <button 
                onClick={() => { setIsBulkSelectMode(!isBulkSelectMode); setSelectedProductIds([]); }}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition ${isBulkSelectMode ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-white border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent text-slate-600 dark:text-slate-400'}`}
              >
                {isBulkSelectMode ? 'Batal Tandai' : 'Tandai Massal'}
              </button>
              {isBulkSelectMode && (
                <div className="flex gap-2 items-center">
                  <label className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0} 
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="accent-cyan-500 w-3 h-3 rounded"
                    />
                    Semua
                  </label>
                  <button 
                    onClick={() => selectedProductIds.length > 0 && setShowBulkDeleteModal(true)}
                    disabled={selectedProductIds.length === 0}
                    className="text-[10px] font-bold bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-xl disabled:opacity-50 transition shadow-sm ml-2"
                  >
                    Hapus ({selectedProductIds.length})
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Table Container with scrolling */}
          <div className={`flex-1 overflow-auto rounded-xl border shadow-inner ${isLight ? 'border-slate-200 bg-white scrollbar-thin scrollbar-thumb-slate-300' : 'border-slate-200 dark:border-white/10 bg-white border-slate-200 shadow-sm dark:bg-slate-800 scrollbar-thin scrollbar-thumb-white/10'}`}>
            <table className="w-full text-[10px] text-center border-collapse">
              <thead className="sticky top-0 z-20 shadow-md">
                <tr className={isLight ? 'bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[8px] border-b border-slate-200' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-[8px] border-b border-white/20'}>
                  <th className={`py-3 px-3 text-left sticky left-0 z-20 w-[40%] shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    <div className="flex items-center gap-1.5">
                      {isBulkSelectMode && <span className="text-cyan-500">✓</span>}
                      VOUCHER
                    </div>
                  </th>
                  <th className="py-3 px-1 w-[20%]">STOK</th>
                  <th className="py-3 px-1 w-[20%]">HARGA</th>
                  <th className="py-3 px-2 w-[20%] text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {operatorsList.map(op => {
                  const opProducts = filteredProducts.filter(p => {
                    const safeOp = (p.operator || '').toLowerCase();
                    return safeOp.includes(op.toLowerCase()) || 
                      (op === 'Lainnya' && !operatorsList.slice(0,6).some(o => safeOp.includes(o.toLowerCase())));
                  });
                  if (opProducts.length === 0) return null;
                  
                  return (
                    <React.Fragment key={op}>
                      <tr className="bg-white dark:bg-slate-900">
                        <td colSpan={7} className={`py-2 px-3 font-black text-[9px] text-left uppercase tracking-widest sticky left-0 z-10 border-y border-slate-200 dark:border-white/10 ${OP_COLORS[op] || 'bg-slate-700 text-slate-900 dark:text-white'}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-white/30 rounded-full" />
                            {op}
                          </div>
                        </td>
                      </tr>
                      {opProducts.map(p => {
                        const shortName = getShortName(p.name, p.operator);
                        const fullPrice = p.sellingPrice.toLocaleString('id-ID');
                        
                        return (
                          <tr key={p.id} className={`transition-colors group border-b ${isLight ? 'hover:bg-slate-50 border-slate-100' : 'hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border-white/[0.05]'}`}>
                            <td className={`py-3 px-3 text-left font-black whitespace-nowrap sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] transition-colors text-[10px] uppercase leading-tight ${
                              isLight 
                                ? 'bg-white text-slate-900 group-hover:bg-slate-50' 
                                : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-900 dark:text-white group-hover:bg-slate-700'
                            }`}>
                              <div className="flex items-center gap-2">
                                {isBulkSelectMode && (
                                  <input 
                                    type="checkbox" 
                                    checked={selectedProductIds.includes(p.id)}
                                    onChange={() => toggleSelectProduct(p.id)}
                                    className="accent-cyan-500 w-3 h-3 rounded shrink-0 cursor-pointer"
                                  />
                                )}
                                {shortName}
                              </div>
                            </td>
                            <td className="py-1 px-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-900 dark:text-white text-[10px] font-black mx-auto shadow-inner border-2 ${
                                p.currentStock <= p.minStockLevel ? 'bg-rose-500/20 border-rose-500/40' : 'bg-indigo-500/10 border-indigo-500/30'
                              }`}>
                                {p.currentStock}
                              </div>
                            </td>
                            <td className="py-1 px-1 text-emerald-500 font-black dark:text-emerald-400 font-black text-[11px] tracking-tighter">
                              {fullPrice}
                            </td>
                            <td className="py-1 px-2 text-center">
                              <div className="flex items-center justify-center gap-3">
                                {userRole === 'owner' && (<button 
                                  onClick={(e) => handleOpenEditForm(p, e)}
                                  className="w-6 h-6 rounded bg-white/[0.06] hover:bg-white/[0.14] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>)}
                                {userRole === 'owner' && (
                                  <button 
                                    onClick={(e) => handleDeleteClick(p, e)}
                                    className="w-6 h-6 rounded bg-white/[0.06] hover:bg-rose-500/20 text-rose-300 flex items-center justify-center transition-colors"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => onOpenQuickSale && onOpenQuickSale(p.id)}
                                  className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded text-[9px] font-bold transition-colors whitespace-nowrap"
                                >
                                  Jual
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer removed per request */}
        </div>
      )}

      {/* Bulk Add Overlay */}
      <AnimatePresence>
        {isAddingBulkAI && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-amber-500/20 w-full max-w-lg rounded-3xl p-5 shadow-[0_0_50px_rgba(245,158,11,0.1)] relative overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setIsAddingBulkAI(false)}
                className="absolute top-5 right-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                Tambah Produk Massal
              </h3>
              
              <div className="space-y-4">
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent p-3 rounded-xl border border-slate-200 dark:border-white/10">
                  <p className="font-bold text-amber-300">Format Wajib per Baris (pisahkan dengan =):</p>
                  <p className="font-mono text-slate-900 dark:text-white">Nama Provider= Nama Produk= Harga Modal= Harga Jual= Stok= Stok Alert</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">Contoh: <br/>Telkomsel= Telkomsel 10GB 3hari= 15000= 20000= 10= 4<br/>Axis= Axis 6GB 1Hari= 6500= 8000= 15= 5</p>
                </div>

                <textarea
                  value={bulkAIText}
                  onChange={(e) => setBulkAIText(e.target.value)}
                  placeholder="Paste daftar produk di sini..."
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-amber-500/20 rounded-xl px-3 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition min-h-[120px] font-mono"
                />

                <div className="flex justify-between items-center mt-2 flex-wrap gap-3">
                  <div className="text-[10px] text-slate-500 max-w-[200px]">
                    Gunakan <b className="text-indigo-400">✨ Scan dengan AI</b> jika data dari WA/Catatan berantakan.
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleParseBulk}
                      disabled={!bulkAIText.trim()}
                      className="bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ListPlus className="w-4 h-4" />
                      Manual (=)
                    </button>
                    <button
                      onClick={handleParseBulkAI}
                      disabled={!bulkAIText.trim() || isParsingAI}
                      className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 shadow-lg shadow-indigo-500/30"
                    >
                      {isParsingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                      {isParsingAI ? 'Memproses...' : '✨ Scan dengan AI'}
                    </button>
                  </div>
                </div>

                {bulkParsedProducts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                    {/* ⚠️ Warning banner jika scan parsial akibat batas token */}
                    {isPartialScan && (
                      <div className="mb-3 px-3 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-2">
                        <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠️</span>
                        <div>
                          <p className="text-[11px] font-black text-amber-300 leading-snug">
                            Scan tidak sampai selesai — batas token AI tercapai
                          </p>
                          <p className="text-[10px] text-amber-400/80 mt-0.5 leading-snug">
                            Berhasil mengekstrak <b className="text-amber-300">{bulkParsedProducts.length} produk</b> dari sebagian data.
                            Produk yang belum ter-scan bisa dimasukkan manual atau scan ulang sisa teks-nya.
                          </p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs font-bold text-amber-300 mb-2">Hasil Susunan ({bulkParsedProducts.length} Produk){isPartialScan ? ' — Parsial' : ''}:</p>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {bulkParsedProducts.map((p, idx) => (
                        <div key={idx} className="bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200 dark:border-white/5 text-[10px]">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{p.name}</span>
                            <span className="text-amber-500 font-black dark:text-amber-400">{p.operator}</span>
                          </div>
                          <div className="flex gap-3 text-slate-600 dark:text-slate-400">
                            <span>Modal: <b className="text-slate-900 dark:text-white">Rp{p.costPrice?.toLocaleString('id-ID')}</b></span>
                            <span>Jual: <b className="text-emerald-500 font-black dark:text-emerald-400">Rp{p.sellingPrice?.toLocaleString('id-ID')}</b></span>
                            <span>Stok: <b className="text-cyan-400">{p.stock}</b></span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => { setBulkParsedProducts([]); setIsPartialScan(false); }}
                        className="flex-1 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent rounded-xl transition border border-slate-200 dark:border-white/10"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBulk}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-900 dark:text-white text-xs font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      >
                        {isPartialScan ? `Simpan & Sync ${bulkParsedProducts.length} Produk (Parsial)` : 'SIMPAN & SYNC'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-rose-500/30 w-full max-w-xs rounded-3xl p-5 shadow-[0_0_50px_rgba(244,63,94,0.1)] relative"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center border border-rose-500/30 mb-2">
                  <AlertTriangle className="w-6 h-6 text-rose-500 font-black dark:text-rose-400" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Konfirmasi Hapus</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Apakah Anda yakin ingin menghapus voucher <br/>
                  <b className="text-slate-900 dark:text-white">{productToDelete.name}</b> dari sistem?
                </p>
                <p className="text-[10px] text-slate-600 dark:text-slate-400">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
                
                <div className="flex gap-2 w-full mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                  <button
                    onClick={() => setProductToDelete(null)}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent rounded-xl transition border border-slate-200 dark:border-white/10"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-slate-900 dark:text-white text-xs font-bold py-2.5 rounded-xl transition shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showBulkDeleteModal && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-rose-500/30 w-full max-w-xs rounded-3xl p-5 shadow-[0_0_50px_rgba(244,63,94,0.1)] relative"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center border border-rose-500/30 mb-2">
                  <AlertTriangle className="w-6 h-6 text-rose-500 font-black dark:text-rose-400" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Hapus Massal</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Yakin hapus <b className="text-rose-500">{selectedProductIds.length}</b> voucher terpilih secara permanen?
                </p>
                
                <div className="flex gap-2 w-full mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                  <button
                    onClick={() => setShowBulkDeleteModal(false)}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent rounded-xl transition border border-slate-200 dark:border-white/10"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmBulkDelete}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-slate-900 dark:text-white text-xs font-bold py-2.5 rounded-xl transition shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Form Add / Edit Modal Overlay */}
      <AnimatePresence>
        {(isAddingNew || isEditing) && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-slate-200 dark:border-white/15 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => {
                  setIsAddingNew(false);
                  setIsEditing(false);
                  setEditingProduct(null);
                }}
                className="absolute top-5 right-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                {isAddingNew ? 'Tambah Voucher Baru' : 'Edit Info Voucher'}
              </h3>

              <form onSubmit={isAddingNew ? handleAddSubmit : handleEditSubmit} className="space-y-2.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Nama Voucher</label>
                  <input 
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Axis 6GB 1Hari"
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Operator</label>
                  <select
                    value={formOperator}
                    onChange={(e: any) => setFormOperator(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 transition"
                  >
                    {['Telkomsel', 'Axis', 'Indosat', 'XL', 'Tri', 'Smartfren'].map(op => (
                      <option key={op} value={op} className="bg-white dark:bg-slate-900">{op}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {userRole === 'owner' ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Harga Modal (Rp)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        required
                        value={formCostPrice}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormCostPrice(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-indigo-600 dark:text-indigo-200 font-bold focus:outline-none focus:border-cyan-400 transition"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1 hidden">
                      {/* Hidden for cashiers */}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Harga Jual (Rp)</label>
                    <input 
                      type="text"
                      inputMode="numeric"
                      required
                      value={formSellingPrice}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormSellingPrice(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-emerald-500 font-black dark:text-emerald-400 font-bold focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Stok Awal</label>
                    <input 
                      type="number"
                      required
                      value={formCurrentStock}
                      onChange={(e) => setFormCurrentStock(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Min. Alert Stok</label>
                    <input 
                      type="number"
                      required
                      value={formMinStockLevel}
                      onChange={(e) => setFormMinStockLevel(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setIsEditing(false);
                      setEditingProduct(null);
                    }}
                    className="flex-1 py-2.5 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition cursor-pointer shadow-lg shadow-cyan-600/30"
                  >
                    Simpan Voucher
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
          MODAL: SALIN PRODUK KE TOKO LAIN
          Hanya Owner, hanya tampil jika ada store lain
      ============================================================ */}
      <AnimatePresence>
        {showCopyModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="bg-white dark:bg-slate-900 border border-violet-500/20 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-[0_0_60px_rgba(139,92,246,0.15)] relative overflow-hidden"
            >
              {/* Header gradient strip */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-t-3xl" />

              <div className="p-5 pb-24 sm:pb-5 space-y-4">
                {/* Title */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                      <Copy className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">Salin Produk ke Toko Lain</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{products.length} produk dari toko ini akan disalin</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseCopyModal}
                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 flex items-center justify-center text-slate-500 dark:text-slate-400 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status: success / error */}
                {copyStatus === 'success' && (
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Berhasil!</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{copyStatusMsg}</p>
                    </div>
                  </div>
                )}
                {copyStatus === 'error' && (
                  <div className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">{copyStatusMsg}</p>
                  </div>
                )}

                {copyStatus !== 'success' && (
                  <div className="space-y-3">
                    {/* Pilih Toko Tujuan */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Store className="w-3 h-3" /> Toko Tujuan
                      </label>
                      <div className="relative">
                        <select
                          value={copyTargetStoreId}
                          onChange={e => setCopyTargetStoreId(e.target.value)}
                          className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 pr-8 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition cursor-pointer"
                        >
                          <option value="">— Pilih Toko Tujuan —</option>
                          {otherStores.map(s => (
                            <option key={s.id} value={s.id}>{s.name}{s.subtext ? ` (${s.subtext})` : ''}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Pilih Kasir di Toko Tujuan */}
                    {copyTargetStoreId && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                          Kasir Tujuan
                        </label>
                        {isLoadingTargetCashiers ? (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat kasir...
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              value={copyTargetCashierId}
                              onChange={e => setCopyTargetCashierId(e.target.value)}
                              className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 pr-8 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition cursor-pointer"
                            >
                              <option value="all">Semua Kasir di Toko Ini</option>
                              {targetStoreCashiers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode Salin */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Mode Salin</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCopyMode('catalog')}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            copyMode === 'catalog'
                              ? 'bg-violet-50 dark:bg-violet-500/15 border-violet-400/50 ring-1 ring-violet-400/30'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-violet-400/40'
                          }`}
                        >
                          <div className="text-[11px] font-black text-slate-900 dark:text-white">Katalog Saja</div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Stok = 0 di toko tujuan</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCopyMode('withStock')}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            copyMode === 'withStock'
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400/50 ring-1 ring-emerald-400/30'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400/40'
                          }`}
                        >
                          <div className="text-[11px] font-black text-slate-900 dark:text-white">Beserta Stok</div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Salin jumlah stok juga</div>
                        </button>
                      </div>
                    </div>

                    {/* Mode Konflik */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Jika Sudah Ada Produk</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCopyConflict('overwrite')}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            copyConflict === 'overwrite'
                              ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-400/50 ring-1 ring-rose-400/30'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-400/40'
                          }`}
                        >
                          <div className="text-[11px] font-black text-slate-900 dark:text-white">Timpa Semua</div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Ganti seluruh daftar lama</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCopyConflict('merge')}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            copyConflict === 'merge'
                              ? 'bg-cyan-50 dark:bg-cyan-500/15 border-cyan-400/50 ring-1 ring-cyan-400/30'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-cyan-400/40'
                          }`}
                        >
                          <div className="text-[11px] font-black text-slate-900 dark:text-white">Gabungkan</div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Tambah yang belum ada</div>
                        </button>
                      </div>
                    </div>

                    {/* Preview */}
                    {copyTargetStoreId && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700/50 space-y-1">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ringkasan</p>
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Dari Toko:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{storeList.find(s => s.id === activeStoreId)?.name || activeStoreId || 'Toko Ini'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Ke Toko:</span>
                            <span className="font-bold text-violet-600 dark:text-violet-400">{storeList.find(s => s.id === copyTargetStoreId)?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Jumlah Produk:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{products.length} produk</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Mode Stok:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{copyMode === 'catalog' ? 'Stok = 0' : 'Salin Stok Asli'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCloseCopyModal}
                        className="flex-1 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyProducts}
                        disabled={!copyTargetStoreId || copyStatus === 'loading'}
                        className="flex-1 py-3 text-xs font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl transition cursor-pointer shadow-lg shadow-violet-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {copyStatus === 'loading' ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Menyalin...</>
                        ) : (
                          <><Copy className="w-4 h-4" /> Salin Sekarang</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tombol tutup setelah sukses */}
                {copyStatus === 'success' && (
                  <button
                    type="button"
                    onClick={handleCloseCopyModal}
                    className="w-full py-3 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Selesai
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
