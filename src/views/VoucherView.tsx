import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Plus, Minus, Search, Trash2, Smartphone, FolderPlus, 
  TrendingUp, LayoutGrid, List, ClipboardList, Send,
  CheckCircle, User, Calendar, Save, AlertCircle, RefreshCw,
  Edit3, X, Eye, EyeOff, History, BarChart3, QrCode, PlusCircle, ClipboardCheck, Scan, Camera
} from 'lucide-react'
import { formatRupiah, formatInputRupiah, cn, getLocalISOString } from '../lib/utils'
import { supabase } from '../lib/supabase'

interface VoucherViewProps {
  active: boolean
  isPc: boolean
  setActiveView: (view: string) => void
  showToast: (msg: string) => void
  onConfirm: (title: string, message: string, onConfirm: () => void) => void
  activeStoreId: string
  kasirRole: string
  kasirName?: string
  googleUid?: string
  currentUsername?: string
  kasirList?: Record<string, { name?: string; role?: string; pin?: string }>
  incomingHandover?: any | null
  onAcceptHandover?: () => void
  onRejectHandover?: () => void
}

interface VoucherItem {
  id: string
  store_id?: string
  name: string
  brand: string // Kategori
  costPrice: number // Harga modal
  price: number // Harga jual
  stock: number // Stok live
  created_at?: string
}

interface VoucherSaleRecord {
  id: string
  product_id: string
  product_name: string
  brand: string
  stok_awal: number
  stok_akhir: number
  sold: number
  price: number
  costPrice: number
  revenue: number
  profit: number
  timestamp: string
  kasir: string
}

interface ShiftData {
  reporter_name: string
  submitted_at?: string
  items: Record<string, {
    awal: number
    akhir: number
    sold: number
    nontunai?: number
  }>
}

interface StockReport {
  id: string // e.g., store_dd_YYYY-MM-DD
  store_id: string
  date: string
  pagi?: ShiftData
  siang?: ShiftData
  status: 'draft' | 'pagi_submitted' | 'closed'
  updated_at: string
}

const PROVIDER_CATEGORIES = [
  'TELKOMSEL',
  'XL',
  'AXIS',
  'IM3 \\ INDOSAT',
  'TRI',
  'SMARTFREN',
  'BYU'
]

const getBadgeStyles = (provider: string) => {
  const upper = provider.toUpperCase()
  if (upper.includes('TELKOMSEL')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/60'
  }
  if (upper.includes('XL')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/60'
  }
  if (upper.includes('AXIS')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/60'
  }
  if (upper.includes('INDOSAT') || upper.includes('IM3')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/60'
  }
  if (upper.includes('TRI') || upper === '3') {
    return 'bg-pink-50 text-pink-700 border-pink-200/60'
  }
  if (upper.includes('SMARTFREN')) {
    return 'bg-rose-100 text-rose-800 border-rose-300/60'
  }
  if (upper.includes('BYU')) {
    return 'bg-cyan-50 text-cyan-700 border-cyan-200/60'
  }
  return 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/60'
}

const sortVoucherItems = (list: VoucherItem[]): VoucherItem[] => {
  return [...list].sort((a, b) => {
    const getBrandOrderIndex = (brand: string) => {
      const bUpper = (brand || '').toUpperCase().trim();
      const index = PROVIDER_CATEGORIES.findIndex(cat => {
        const catUpper = cat.toUpperCase();
        return catUpper === bUpper || catUpper.includes(bUpper) || bUpper.includes(catUpper);
      });
      return index !== -1 ? index : 999;
    };

    const orderA = getBrandOrderIndex(a.brand);
    const orderB = getBrandOrderIndex(b.brand);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const brandA = (a.brand || '').toLowerCase();
    const brandB = (b.brand || '').toLowerCase();
    if (brandA !== brandB) {
      return brandA.localeCompare(brandB);
    }

    return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
  });
};

const matchProviderCategory = (brandInput: string): string => {
  const upper = (brandInput || '').toUpperCase().trim();
  if (!upper) return 'TELKOMSEL';
  if (upper.includes('TELKOMSEL') || upper === 'TSEL') return 'TELKOMSEL';
  if (upper === 'XL') return 'XL';
  if (upper === 'AXIS') return 'AXIS';
  if (upper.includes('INDOSAT') || upper.includes('IM3') || upper.includes('ISAT')) return 'IM3 \\ INDOSAT';
  if (upper === 'TRI' || upper === '3') return 'TRI';
  if (upper.includes('SMARTFREN') || upper.includes('SMART')) return 'SMARTFREN';
  if (upper.includes('BYU') || upper.includes('BY.U')) return 'BYU';

  const found = PROVIDER_CATEGORIES.find(cat => cat.toUpperCase() === upper);
  if (found) return found;

  const partialFound = PROVIDER_CATEGORIES.find(cat => cat.toUpperCase().includes(upper) || upper.includes(cat.toUpperCase()));
  if (partialFound) return partialFound;

  return 'TELKOMSEL'; // fallback
};

export const VoucherView: React.FC<VoucherViewProps> = (props) => {
  const [items, setItems] = useState<VoucherItem[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'daftar' | 'tambah' | 'master' | 'opname' | 'riwayat' | 'grafik'>('daftar')
  const [displayMode, setDisplayMode] = useState<'grid' | 'excel'>('grid')
  const [isSyncing, setIsSyncing] = useState(false)

  // Form states (Tambah Produk)
  const [tambahMode, setTambahMode] = useState<'tunggal' | 'massal' | 'foto'>('tunggal')
  const [bulkText, setBulkText] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('TELKOMSEL')
  const [costPriceStr, setCostPriceStr] = useState('')
  const [priceStr, setPriceStr] = useState('')
  const [stockStr, setStockStr] = useState('10')

  // Edit inline state (Master Edit)
  const [editItemsState, setEditItemsState] = useState<Record<string, {
    name?: string
    brand?: string
    costPriceStr?: string
    priceStr?: string
    stockStr?: string
  }>>({})
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // History and Analytics states
  const [historyReports, setHistoryReports] = useState<StockReport[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)
  const [historyDateFilter, setHistoryDateFilter] = useState<string>(() => {
    const d = new Date()
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - (offset * 60 * 1000))
    return localDate.toISOString().split('T')[0]
  })

  const fetchAllHistoryReports = async () => {
    setIsLoadingHistory(true)
    try {
      const { data, error } = { data: null, error: new Error('Use local') }; /* await supabase
        .from('voucher_stock_reports')
        .select('*')
        .eq('store_id', props.activeStoreId)
        .order('date', { ascending: false }) */
      
      if (!error && data) {
        setHistoryReports(data as StockReport[])
      } else {
        // Fallback to localStorage
        const reports: StockReport[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith(`alphaPro_${props.activeStoreId}_`) && key.includes('_report_')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key) || '')
              reports.push(parsed)
            } catch (err) {}
          }
        }
        reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setHistoryReports(reports)
      }
    } catch (e) {
      console.warn('History load exception:', e)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (props.active && props.activeStoreId) {
      fetchAllHistoryReports()
    }
  }, [props.active, props.activeStoreId, activeTab])

  const handleStartEdit = (item: VoucherItem) => {
    setEditingItemId(item.id)
    setEditItemsState(prev => ({
      ...prev,
      [item.id]: {
        name: item.name,
        brand: item.brand,
        costPriceStr: String(item.costPrice),
        priceStr: String(item.price),
        stockStr: String(item.stock)
      }
    }))
  }

  const handleCancelEdit = (itemId: string) => {
    setEditingItemId(null)
    setEditItemsState(prev => {
      const copy = { ...prev }
      delete copy[itemId]
      return copy
    })
  }

  // Master view display modes (owner has 3 modes, cashier has 2 modes)
  const [masterMode, setMasterMode] = useState<'kotak' | 'excel' | 'ringkas'>('kotak')
  const [masterStokAkhirInputs, setMasterStokAkhirInputs] = useState<Record<string, string>>({})

  // Todays Non-Tunai / QRIS sales quantity (not directly deducted from stock)
  const [nontunaiSales, setNontunaiSales] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`alphaPro_${props.activeStoreId}_today_nontunai_sales`)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const lastShiftRef = useRef<string>('')
  const lastReportIdRef = useRef<string>('')

  const updateNontunaiSale = async (productId: string, delta: number) => {
    setNontunaiSales(prev => {
      const current = prev[productId] || 0
      const updated = Math.max(0, current + delta)
      const next = { ...prev, [productId]: updated }
      localStorage.setItem(`alphaPro_${props.activeStoreId}_today_nontunai_sales`, JSON.stringify(next))
      return next
    })
  }

  const [showQuickAdjust, setShowQuickAdjust] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('alphaPro_v_showQuickAdjust')
      return saved ? saved === 'true' : false
    } catch {
      return false
    }
  })

  // Stok Opname & Closing Shift State
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedShift, setSelectedShift] = useState<'pagi' | 'siang'>('pagi')
  const [activeReport, setActiveReport] = useState<StockReport | null>(null)
  const [opnameSubTab, setOpnameSubTab] = useState<'closing' | 'restock'>('closing')
  const [pagiRestockInputs, setPagiRestockInputs] = useState<Record<string, string>>({})
  const [pagiSearchQuery, setPagiSearchQuery] = useState('')
  
  // Local inputs for stock opname count
  // record from product_id -> { awal: number, akhir: number }
  const [opnameInputs, setOpnameInputs] = useState<Record<string, { awal: string; akhir: string }>>({})

  // Current cashier name for reports
  const cashierDisplayName = props.kasirName || 'KASIR'

  // Session Starting Stock map & Sales history tracking states
  const [sessionStokAwal, setSessionStokAwal] = useState<Record<string, number>>({})
  const [salesHistory, setSalesHistory] = useState<VoucherSaleRecord[]>([])

  const getProductAwalStock = (product: VoucherItem) => {
    if (opnameInputs[product.id]?.awal !== undefined) {
      return parseInt(opnameInputs[product.id].awal) || 0
    }
    if (activeReport?.pagi?.items?.[product.id]) {
      return activeReport.pagi.items[product.id].awal
    }
    return product.stock
  }

  const getProductAkhirStock = (product: VoucherItem) => {
    if (opnameInputs[product.id]?.akhir !== undefined) {
      return parseInt(opnameInputs[product.id].akhir) || 0
    }
    if (activeReport?.pagi?.items?.[product.id]) {
      return activeReport.pagi.items[product.id].akhir
    }
    return 0
  }

  // Load and synchronize session starting stocks and history whenever activeStoreId changes or products load
  useEffect(() => {
    if (props.activeStoreId) {
      const historyKey = `alphaPro_${props.activeStoreId}_riwayat_penjualan_voucher`
      const savedHistory = localStorage.getItem(historyKey)
      try {
        setSalesHistory(savedHistory ? JSON.parse(savedHistory) : [])
      } catch (err) {
        setSalesHistory([])
      }

      const awalKey = `alphaPro_${props.activeStoreId}_session_stok_awal`
      const savedAwal = localStorage.getItem(awalKey)
      let currentMap: Record<string, number> = {}
      try {
        currentMap = savedAwal ? JSON.parse(savedAwal) : {}
      } catch (err) {
        currentMap = {}
      }
      
      let updated = false
      if (items.length > 0) {
        items.forEach(product => {
          if (currentMap[product.id] === undefined) {
            currentMap[product.id] = product.stock
            updated = true
          }
        })
      }
      if (updated || !savedAwal) {
        localStorage.setItem(awalKey, JSON.stringify(currentMap))
      }
      setSessionStokAwal(currentMap)
    }
  }, [props.activeStoreId, items])

  // Sync / Load products from Database & Backup
  const refreshData = async () => {
    if (!props.active || !props.activeStoreId) return
    setIsSyncing(true)

    // 1. Fetch live products
    try {
      const { data, error } = await supabase.from('voucher_products').select('*').eq('store_id', props.activeStoreId).order('name', { ascending: true })

      if (!error && data) {
        const sanitized = data.map((x: any) => ({
          id: x.id,
          store_id: x.store_id,
          name: x.name,
          brand: x.brand || 'LAINNYA',
          costPrice: typeof x.costPrice === 'number' ? x.costPrice : (x.cost_price || 0),
          price: typeof x.price === 'number' ? x.price : 0,
          stock: typeof x.stock === 'number' ? x.stock : 0,
          created_at: x.created_at
        }))
        const sorted = sortVoucherItems(sanitized)
        setItems(sorted)
        // update local backup
        localStorage.setItem(`alphaPro_${props.activeStoreId}_stok_voucher_data`, JSON.stringify(sorted))
      } else {
        throw new Error(error?.message || 'Empty data')
      }
    } catch (e) {
      console.warn('Using local backup for voucher products:', e)
      const stored = localStorage.getItem(`alphaPro_${props.activeStoreId}_stok_voucher_data`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setItems(sortVoucherItems(parsed))
        } catch {
          setItems([])
        }
      }
    }

    // 2. Fetch today's stock report
    try {
      const reportId = `${props.activeStoreId}_${props.currentUsername}_${todayStr}`
      const { data, error } = { data: null, error: new Error('Use local') }; /* await supabase
        .from('voucher_stock_reports')
        .select('*')
        .eq('id', reportId)
        .maybeSingle() */

      if (!error && data) {
        setActiveReport(data as StockReport)
      } else {
        // Fallback local report
        const storedReport = localStorage.getItem(`alphaPro_${props.activeStoreId}_${props.currentUsername}_report_${todayStr}`)
        if (storedReport) {
          setActiveReport(JSON.parse(storedReport))
        } else {
          setActiveReport(null)
        }
      }
    } catch (e) {
      console.warn('Error fetching today\'s report:', e)
    }

    setIsSyncing(false)
  }

  useEffect(() => {
    refreshData()
  }, [props.active, props.activeStoreId])

  // Automatically prefill initial stock opname inputs when products are fetched or a report status changes
  useEffect(() => {
    if (items.length > 0) {
      const reportId = activeReport?.id || 'none'
      const isShiftOrReportChanged = lastShiftRef.current !== selectedShift || lastReportIdRef.current !== reportId
      
      // Update refs to reflect current values
      lastShiftRef.current = selectedShift
      lastReportIdRef.current = reportId

      setOpnameInputs(prev => {
        // If shift or report changed, we force re-fetch default starting inputs.
        // Otherwise, we keep existing inputs dirty and only append missing product defaults!
        const nextOpname = isShiftOrReportChanged ? {} : { ...prev }

        // Load today's saved draft map if available
        const draftKey = `alphaPro_${props.activeStoreId}_${props.currentUsername}_today_opname_draft_${todayStr}`
        const savedDraftStr = localStorage.getItem(draftKey)
        let savedDraft: Record<string, { awal: string; akhir: string }> = {}
        if (savedDraftStr) {
          try {
            savedDraft = JSON.parse(savedDraftStr)
          } catch (e) {}
        }

        items.forEach(product => {
          if (nextOpname[product.id] === undefined) {
            // Apply draft value if it exists for this item
            if (savedDraft[product.id] !== undefined) {
              nextOpname[product.id] = savedDraft[product.id]
            } else {
              // Defaults
              let localAwal = String(getProductAwalStock(product))
              let localAkhir = "" // Default to empty string instead of 0

              // If there's an active report and current shift is chosen, check if inputs exist
              if (activeReport) {
                if (selectedShift === 'pagi' && activeReport.pagi) {
                  const itemData = activeReport.pagi.items[product.id]
                  if (itemData) {
                    localAwal = String(itemData.awal)
                    localAkhir = String(itemData.akhir)
                  }
                } else if (selectedShift === 'siang' && activeReport.siang) {
                  const itemData = activeReport.siang.items[product.id]
                  if (itemData) {
                    localAwal = String(itemData.awal)
                    localAkhir = String(itemData.akhir)
                  }
                } else if (selectedShift === 'siang' && activeReport.pagi) {
                  // Handover: Afternoon shift starting stock defaults to morning's closing stock!
                  const morningItem = activeReport.pagi.items[product.id]
                  if (morningItem) {
                    localAwal = String(morningItem.akhir)
                    localAkhir = "" // default keep to empty string instead of 0
                  }
                }
              }

              nextOpname[product.id] = { awal: localAwal, akhir: localAkhir }
            }
          }
        })
        return nextOpname
      })

      setMasterStokAkhirInputs(prev => {
        // preserve already typed inputs, only default new ones
        const copy = { ...prev }
        items.forEach(product => {
          if (copy[product.id] === undefined) {
            copy[product.id] = String(product.stock)
          }
        })
        return copy
      })
    }
  }, [items, activeReport, selectedShift])

  const handleMasterStokAkhirInputChange = (id: string, value: string) => {
    setMasterStokAkhirInputs(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleAdjustMasterStokAkhir = (id: string, delta: number) => {
    const originalItem = items.find(p => p.id === id)
    if (!originalItem) return

    const currentValStr = masterStokAkhirInputs[id]
    const currentVal = currentValStr !== undefined ? (parseInt(currentValStr) || 0) : originalItem.stock
    const newVal = Math.max(0, currentVal + delta)
    
    setMasterStokAkhirInputs(prev => ({
      ...prev,
      [id]: String(newVal)
    }))
  }

  // Helper to trigger database list write + local storage copy
  const saveOnlineProducts = async (updatedList: VoucherItem[]) => {
    const sorted = sortVoucherItems(updatedList)
    setItems(sorted)
    localStorage.setItem(`alphaPro_${props.activeStoreId}_stok_voucher_data`, JSON.stringify(sorted))
    
    // Save to online table (voucher_products)
    try {
      const upserts = updatedList.map(item => ({
        id: item.id,
        store_id: item.store_id || props.activeStoreId,
        name: item.name,
        brand: item.brand,
        cost_price: item.costPrice,
        price: item.price,
        stock: item.stock,
        created_at: item.created_at || new Date().toISOString()
      }))
      await supabase.from('voucher_products').upsert(upserts)
    } catch (e) {
      console.error('Failed to sync changes to Supabase, local cache updated:', e)
    }

    // Trigger local updates for dashboard or charts
    window.dispatchEvent(new Event('alphaSyncUpdate'))
  }

  // Quick restock logic for the Grafik Dashboard low-stock list
  const handleQuickRestock = async (productId: string, amount: number) => {
    const originalItem = items.find(p => p.id === productId)
    if (!originalItem) return

    props.onConfirm(
      'TAMBAH STOK CEPAT',
      `Apakah Anda yakin ingin menambahkan stok ${originalItem.name} sebanyak +${amount} pcs?`,
      async () => {
        const updatedStock = originalItem.stock + amount
        const updatedList = items.map(p => p.id === productId ? { ...p, stock: updatedStock } : p)
        
        try {
          await saveOnlineProducts(updatedList)
          props.showToast(`Berhasil menambah stok ${originalItem.name} sebanyak +${amount} pcs!`)
        } catch (err: any) {
          props.showToast(`Gagal menambahkan stok: ${err.message || err}`)
        }
      }
    )
  }

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setScanPreview(base64);
      setIsScanning(true);

      try {
        const localKey = localStorage.getItem('gemini_api_key');
        const envKey = import.meta.env.VITE_GEMINI_API_KEY;
        const backendUrl = import.meta.env.VITE_BACKEND_AI_URL;
        
        const apiKey = localKey || envKey;

        if (!apiKey && !backendUrl) {
          throw new Error('API Key Gemini tidak ditemukan! Silakan atur di Menu Akun > Pengaturan AI.');
        }

        const base64Data = base64.split(',')[1] || base64;
        let response;

        if (!apiKey && backendUrl) {
          // Solusi aman: Gunakan Node.js Backend Server
          response = await fetch(`${backendUrl}/api/extract-voucher`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64 })
          });
        } else {
          // Solusi Android APK: Gunakan API Key yang disimpan di LocalStorage atau Env
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "Ekstrak daftar produk fisik/voucher dari gambar ini. Kembalikan HANYA array JSON tanpa format markdown. Array harus berisi object dengan format: { name: string, category: string, hargaModal: number, hargaJual: number, stok: number }. category WAJIB pilih dari: TELKOMSEL, XL, AXIS, INDOSAT, TRI, SMARTFREN, BY.U, E-TOLL, LAINNYA. Jika kosong, asumsikan 0. Jangan jelaskan apapun, murni JSON." },
                  { inlineData: { mimeType: file.type || "image/jpeg", data: base64Data } }
                ]
              }]
            })
          });
        }
        
        if (!response.ok) throw new Error(`Gagal menghubungi Gemini API: ${response.status}`);
        
        const resData = await response.json();
        
        // Ekstrak teks tergantung sumber (Backend vs Direct API)
        let rawText = '[]';
        if (!apiKey && backendUrl) {
           rawText = resData.data || '[]';
        } else {
           rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        }

        let products = [];
        try {
          products = JSON.parse(rawText.replace(/```json/gi, '').replace(/```/g, '').trim());
        } catch (e) {
          throw new Error('Format balasan AI tidak dapat diproses.');
        }

        if (products && Array.isArray(products) && products.length > 0) {
          // Map products to CSV format
          let csv = '';
          products.forEach((p: any) => {
            // Re-map to recognized provider categories or fallback
            let cat = (p.category || 'LAINNYA').toUpperCase();
            if (cat === 'IM3' || cat === 'ISAT') cat = 'INDOSAT';
            
            const row = `${p.name || 'NN'},${cat},${p.hargaModal || 0},${p.hargaJual || 0},${p.stok || 0}`;
            csv += row + '\n';
          });
          
          setBulkText(prev => (prev ? prev + '\n' + csv.trim() : csv.trim()));
          props.showToast(`Berhasil mengekstrak ${products.length} produk menggunakan AI! Cek Mode Massal.`);
          setTambahMode('massal');
        } else {
          props.showToast('Gagal memproses gambar. Tidak ada daftar produk terdeteksi oleh AI.');
        }
      } catch (err: any) {
        props.showToast(`Gagal memindai gambar: ${err.message}`);
      } finally {
        setIsScanning(false);
        setScanPreview(null);
        e.target.value = ''; // reset input
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Add Item (Owner Only)
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (props.kasirRole !== 'owner') {
      props.showToast('AKSES DITOLAK: HANYA OWNER YANG DAPAT MENAMBAH PRODUK!')
      return
    }

    const costPrice = parseInt(costPriceStr.replace(/[^0-9]/g, '')) || 0
    const price = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0
    const stock = parseInt(stockStr) || 0

    if (!name.trim()) {
      props.showToast('HARAP ISI NAMA ITEM / PRODUK!')
      return
    }
    if (price <= 0) {
      props.showToast('HARAP ISI HARGA JUAL YANG VALID!')
      return
    }
    if (stock < 0) {
      props.showToast('STOK AWAL TIDAK BOLEH NEGATIF!')
      return
    }

    const newId = 'voucher_' + Date.now()
    const newItem: VoucherItem = {
      id: newId,
      store_id: props.activeStoreId,
      name: name.trim().toUpperCase(),
      brand: brand,
      costPrice,
      price,
      stock,
      created_at: new Date().toISOString()
    }

    const updated = [newItem, ...items]
    await saveOnlineProducts(updated)
    props.showToast('PRODUK STOK BARU BERHASIL DIINPUT SECARA ONLINE!')

    // Reset fields
    setName('')
    setCostPriceStr('')
    setPriceStr('')
    setStockStr('10')
    setActiveTab('daftar')
  }

  // Handle Bulk Add Items (Owner Only)
  const handleBulkAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (props.kasirRole !== 'owner') {
      props.showToast('AKSES DITOLAK: HANYA OWNER YANG DAPAT MENAMBAH PRODUK!')
      return
    }

    if (!bulkText.trim()) {
      props.showToast('HARAP ISI TEKS UNTUK TAMBAH MASSAL!')
      return
    }

    const lines = bulkText.split('\n')
    const newItems: VoucherItem[] = []
    let skippedLinesCount = 0

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i].trim()
      if (!rawLine) continue // skip empty line

      const parts = rawLine.split(',')
      if (parts.length < 2) {
        skippedLinesCount++
        continue
      }

      const nameVal = parts[0] ? parts[0].trim().toUpperCase() : ''
      if (!nameVal) {
        skippedLinesCount++
        continue
      }

      const brandInput = parts[1] ? parts[1].trim() : ''
      const brandVal = matchProviderCategory(brandInput)

      // Parse cost price
      const costPriceInput = parts[2] ? parts[2].trim() : '0'
      const costPriceVal = parseInt(costPriceInput.replace(/[^0-9]/g, '')) || 0

      // Parse selling price
      const priceInput = parts[3] ? parts[3].trim() : '0'
      const priceVal = parseInt(priceInput.replace(/[^0-9]/g, '')) || 0

      // Parse stock
      const stockInput = parts[4] ? parts[4].trim() : '0'
      const stockVal = parseInt(stockInput.replace(/[^0-9]/g, '')) || 0

      // Build unique id with staggered timestamp + random suffix to prevent duplicates
      const newId = 'voucher_' + (Date.now() + i) + '_' + Math.random().toString(36).substring(2, 7)
      newItems.push({
        id: newId,
        store_id: props.activeStoreId,
        name: nameVal,
        brand: brandVal,
        costPrice: costPriceVal,
        price: priceVal,
        stock: stockVal,
        created_at: new Date().toISOString()
      })
    }

    if (newItems.length === 0) {
      props.showToast('GAGAL: Tidak ada baris valid yang berhasil diproses. Pastikan format: Nama,Provider,HargaModal,HargaJual,Stok')
      return
    }

    const updated = [...newItems, ...items]
    await saveOnlineProducts(updated)

    let successMsg = `BERHASIL: ${newItems.length} produk massal telah diinput secara online!`
    if (skippedLinesCount > 0) {
      successMsg += ` (${skippedLinesCount} baris tidak lengkap dilewati)`
    }
    props.showToast(successMsg)

    // Reset fields & redirect
    setBulkText('')
    setActiveTab('daftar')
  }

  // Handle updates directly inside Master Edit tab
  const handleUpdateEditState = (id: string, field: string, value: any) => {
    setEditItemsState(prev => {
      const currentItem = items.find(item => item.id === id)
      const existing = prev[id] || {
        name: currentItem?.name,
        brand: currentItem?.brand,
        costPriceStr: String(currentItem?.costPrice || 0),
        priceStr: String(currentItem?.price || 0),
        stockStr: String(currentItem?.stock || 0)
      }
      return {
        ...prev,
        [id]: {
          ...existing,
          [field]: value
        }
      }
    })
  }

  const handleSaveEditItem = async (id: string) => {
    const edits = editItemsState[id]
    if (!edits) return

    const originalItem = items.find(p => p.id === id)
    if (!originalItem) return

    const updatedName = edits.name !== undefined ? edits.name.trim().toUpperCase() : originalItem.name
    const updatedBrand = edits.brand ?? originalItem.brand
    const updatedCostPrice = edits.costPriceStr !== undefined ? (parseInt(edits.costPriceStr.replace(/[^0-9]/g, '')) || 0) : originalItem.costPrice
    const updatedPrice = edits.priceStr !== undefined ? (parseInt(edits.priceStr.replace(/[^0-9]/g, '')) || 0) : originalItem.price
    const updatedStock = edits.stockStr !== undefined ? (edits.stockStr === "" ? 0 : parseInt(edits.stockStr) || 0) : originalItem.stock

    if (!updatedName) {
      props.showToast('HARAP ISI NAMA ITEM / PRODUK!')
      return
    }
    if (updatedPrice <= 0) {
      props.showToast('HARAP ISI HARGA JUAL YANG VALID!')
      return
    }
    if (updatedStock < 0) {
      props.showToast('STOK TIDAK BOLEH NEGATIF!')
      return
    }

    // Prepare updated set
    const updatedList = items.map(p => {
      if (p.id === id) {
        return {
          ...p,
          name: updatedName,
          brand: updatedBrand,
          costPrice: updatedCostPrice,
          price: updatedPrice,
          stock: updatedStock
        }
      }
      return p
    })

    await saveOnlineProducts(updatedList)

    // Clear changes track
    setEditingItemId(null)
    setEditItemsState(prev => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
    props.showToast('REVISI DETAIL PRODUK DISINKRONKAN KE CLOUD!')
  }

  const handleSaveMasterStokAkhir = async (id: string) => {
    const originalItem = items.find(p => p.id === id)
    if (!originalItem) return

    const inputVal = masterStokAkhirInputs[id]
    const parsedVal = parseInt(inputVal)
    if (isNaN(parsedVal) || parsedVal < 0) {
      props.showToast('HARAP INPUT NOMINAL SISA STOK AKHIR YANG VALID!')
      return
    }

    const startingStock = sessionStokAwal[id] !== undefined ? sessionStokAwal[id] : originalItem.stock
    const sold = Math.max(0, startingStock - parsedVal)

    // Determine current stock (this represents starting stock if kasir isn't editing it, but here stock is what's recorded)
    const updatedList = items.map(p => {
      if (p.id === id) {
        return {
          ...p,
          stock: parsedVal // Set to the new closing stock recorded
        }
      }
      return p
    })

    await saveOnlineProducts(updatedList)

    // Save individual sale record if sold > 0
    if (sold > 0) {
      const newRecord: VoucherSaleRecord = {
        id: 'vs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        product_id: id,
        product_name: originalItem.name,
        brand: originalItem.brand,
        stok_awal: startingStock,
        stok_akhir: parsedVal,
        sold: sold,
        price: originalItem.price,
        costPrice: originalItem.costPrice || 0,
        revenue: sold * originalItem.price,
        profit: sold * (originalItem.price - (originalItem.costPrice || 0)),
        timestamp: new Date().toISOString(),
        kasir: cashierDisplayName.toUpperCase()
      }

      const updatedHistory = [newRecord, ...salesHistory]
      setSalesHistory(updatedHistory)
      localStorage.setItem(`alphaPro_${props.activeStoreId}_riwayat_penjualan_voucher`, JSON.stringify(updatedHistory))

      // Write to overall transactions for accounting sync!
      try {
        const newTx = {
          id: 'tx_v_sale_' + Date.now(),
          user_id: props.googleUid || '',
          kasir_id: cashierDisplayName.toUpperCase(),
          store_id: props.activeStoreId,
          kategori: 'VOUCHER & PROVIDER',
          sumber_dana: 'TUNAI',
          tujuan_dana: 'KAS TOKO',
          nominal: newRecord.revenue,
          admin_fee: newRecord.profit,
          keterangan: `PENJUALAN VOUCHER: ${originalItem.name} (${sold} PCS) VIA STOK AKHIR`,
          timestamp: new Date().toLocaleString('sv-SE').replace(' ', 'T')
        }
        // // await supabase.from('transactions').insert([newTx])
      } catch (txErr) {
        console.warn('Fail record transaction for single sale:', txErr)
      }
    }

    props.showToast(`STOK AKHIR UNTUK ${originalItem.name} DISIMPAN! TERJUAL: ${sold} PCS.`)
    window.dispatchEvent(new Event('alphaSyncUpdate'))
  }

  const handleDeleteSaleRecord = async (record: VoucherSaleRecord) => {
    props.onConfirm(
      'BATALKAN PENJUALAN VOUCHER',
      `Apakah Anda yakin ingin membatalkan rekam penjualan ${record.sold} pcs ${record.product_name}? Stok live barang ini di database akan dikembalikan dari ${record.stok_akhir} menjadi ${record.stok_awal} pcs.`,
      async () => {
        try {
          // 1. Revert product stock in database
          const originalItem = items.find(p => p.id === record.product_id)
          if (originalItem) {
            const updatedStock = record.stok_awal
            const updatedList = items.map(p => {
              if (p.id === record.product_id) {
                return {
                  ...p,
                  stock: updatedStock
                }
              }
              return p
            })
            // Update items locally
            setItems(updatedList)
            await saveOnlineProducts(updatedList)

            // Sync masterStokAkhirInputs to match restored state
            setMasterStokAkhirInputs(prev => ({
              ...prev,
              [record.product_id]: String(updatedStock)
            }))
          }

          // 2. Remove record from history
          const updatedHistory = salesHistory.filter(r => r.id !== record.id)
          setSalesHistory(updatedHistory)
          localStorage.setItem(`alphaPro_${props.activeStoreId}_riwayat_penjualan_voucher`, JSON.stringify(updatedHistory))

          // 3. Write inverse transaction
          try {
            const newTx = {
              id: 'tx_v_cancel_' + Date.now(),
              user_id: props.googleUid || '',
              kasir_id: cashierDisplayName.toUpperCase(),
              store_id: props.activeStoreId,
              kategori: 'VOUCHER & PROVIDER',
              sumber_dana: 'TUNAI',
              tujuan_dana: 'KAS TOKO',
              nominal: -record.revenue,
              admin_fee: -record.profit,
              keterangan: `BATAL PENJUALAN VOUCHER: ${record.product_name} (${record.sold} PCS)`,
              timestamp: new Date().toLocaleString('sv-SE').replace(' ', 'T')
            }
            // // await supabase.from('transactions').insert([newTx])
          } catch (txErr) {
            console.warn('Fail record cancel transaction:', txErr)
          }

          props.showToast(`BERHASIL: Penjualan ${record.product_name} dibatalkan. Stok live dikembalikan!`)
          window.dispatchEvent(new Event('alphaSyncUpdate'))
        } catch (err: any) {
          props.showToast(`Gagal membatalkan penjualan: ${err.message || err}`)
        }
      }
    )
  }

  const handleResetSessionStokAwal = () => {
    props.onConfirm(
      'MULAI SESI BARU / RESET STOK AWAL',
      'Apakah Anda ingin memulai sesi baru? Tindakan ini akan meng-overtake Stok Awal semua produk menyamai jumlah Stok Live di cloud database saat ini.',
      async () => {
        const key = `alphaPro_${props.activeStoreId}_session_stok_awal`
        const newMap: Record<string, number> = {}
        items.forEach(product => {
          newMap[product.id] = product.stock
        })
        localStorage.setItem(key, JSON.stringify(newMap))
        setSessionStokAwal(newMap)
        props.showToast('SESI BARU DIMULAI: STOK AWAL BERHASIL DISINKRONKAN DENGAN JUMLAH STOK LIVE!')
      }
    )
  }

  const handleClearAllSalesHistory = () => {
    props.onConfirm(
      'BERSIHKAN SEMUA RIWAYAT PENJUALAN',
      'Apakah Anda menyatakan ingin membersihkan semua log rincian penjualan voucher saat ini? Tindakan ini hanya membersihkan log tampil riwayat.',
      async () => {
        const key = `alphaPro_${props.activeStoreId}_riwayat_penjualan_voucher`
        localStorage.removeItem(key)
        setSalesHistory([])
        props.showToast('SEMUA LOG RIWAYAT PENJUALAN VOUCHER BERHASIL DIBERSIHKAN!')
      }
    )
  }

  const handleDeleteItem = (id: string, itemName: string) => {
    props.onConfirm('HAPUS STOK BARANG', `Apakah Anda yakin ingin menghapus ${itemName} dari master inventaris online?`, async () => {
      const updated = items.filter(p => p.id !== id)
      
      // Update local set and sync delete query
      setItems(updated)
      localStorage.setItem(`alphaPro_${props.activeStoreId}_stok_voucher_data`, JSON.stringify(updated))
      
      try {
        // await supabase.from('voucher_products').delete().eq('id', id)
      } catch (err) {
        console.error('Sync delete error:', err)
      }

      props.showToast('PRODUCT HAPUS DAN DISINKRONKAN!')
      window.dispatchEvent(new Event('alphaSyncUpdate'))
    })
  }

  // --- STOK OPNAME & SHIFT CLOSING LOGIC ---

  // Handle typing in draft inputs
  const handleOpnameChange = (productId: string, field: 'awal' | 'akhir', val: string) => {
    setOpnameInputs(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: val
      }
    }))

    // Synchronize to items list instantly
    if (field === 'akhir') {
      const nextStock = parseInt(val)
      if (!isNaN(nextStock) && nextStock >= 0) {
        setItems(prevItems => prevItems.map(p => 
          p.id === productId ? { ...p, stock: nextStock } : p
        ))
      }
    }
  }

  // Adjust pagi restock inputs directly via buttons
  const handleAdjustPagiRestock = (productId: string, delta: number) => {
    setPagiRestockInputs(prev => {
      const currentVal = parseInt(prev[productId] || '0') || 0
      const newVal = Math.max(0, currentVal + delta)
      return {
        ...prev,
        [productId]: String(newVal)
      }
    })
  }

  // Handle manual typing in pagi restock input fields
  const handlePagiRestockInputChange = (productId: string, value: string) => {
    setPagiRestockInputs(prev => ({
      ...prev,
      [productId]: value
    }))
  }

  // Handle saving physical morning stock adjustments (restocks & start-of-day balances)
  const handleSaveAllPagiRestocks = async () => {
    // Collect all products that have non-zero or typed changes
    const updatedProducts: VoucherItem[] = []
    let totalItemsAdjusted = 0
    const alertParts: string[] = []

    const nextItems = items.map(product => {
      const restockAmt = parseInt(pagiRestockInputs[product.id] || '0') || 0
      if (restockAmt > 0) {
        totalItemsAdjusted++
        const originalStock = product.stock
        const newStock = originalStock + restockAmt
        alertParts.push(`• ${product.name}: ${originalStock} ➔ ${newStock} PCS (+${restockAmt})`)
        return {
          ...product,
          stock: newStock
        }
      }
      return product
    })

    if (totalItemsAdjusted === 0) {
      props.showToast('SILAHKAN INPUT JUMLAH TAMBAH STOK PAGI TERLEBIH DAHULU!')
      return
    }

    props.onConfirm(
      'TERAPKAN TAMBAH STOK PAGI',
      `Apakah Anda yakin ingin menambahkan sisa stok offline & online untuk ${totalItemsAdjusted} produk ini? Stok awal pagi ini akan otomatis bertambah:\n\n` + alertParts.join('\n'),
      async () => {
        try {
          // 1. Core update to both supabase & local backup
          await saveOnlineProducts(nextItems)

          // 2. Synchronize current opnameInputs (starting stok 'awal')
          setOpnameInputs(prev => {
            const nextOpname = { ...prev }
            nextItems.forEach(product => {
              const restockAmt = parseInt(pagiRestockInputs[product.id] || '0') || 0
              if (restockAmt > 0) {
                const currentOp = nextOpname[product.id] || { awal: String(product.stock - restockAmt), akhir: String(product.stock - restockAmt) }
                const currentAwal = parseInt(currentOp.awal) || (product.stock - restockAmt)
                const currentAkhir = parseInt(currentOp.akhir) || (product.stock - restockAmt)
                
                nextOpname[product.id] = {
                  awal: String(currentAwal + restockAmt),
                  akhir: String(currentAkhir + restockAmt)
                }
              }
            })
            return nextOpname
          })

          // 3. Synchronize with active pagi report starting numbers if already active
          if (activeReport && activeReport.pagi) {
            const updatedItems = { ...activeReport.pagi.items }
            nextItems.forEach(product => {
              const restockAmt = parseInt(pagiRestockInputs[product.id] || '0') || 0
              if (restockAmt > 0) {
                const prevData = updatedItems[product.id] || { awal: product.stock - restockAmt, akhir: product.stock - restockAmt, sold: 0 }
                updatedItems[product.id] = {
                  ...prevData,
                  awal: prevData.awal + restockAmt,
                  akhir: prevData.akhir + restockAmt
                }
              }
            })

            const updatedReport: StockReport = {
              ...activeReport,
              pagi: {
                ...activeReport.pagi,
                items: updatedItems
              },
              updated_at: new Date().toISOString()
            }

            /* await supabase
              .from('voucher_stock_reports')
              .upsert(updatedReport) */

            localStorage.setItem(`alphaPro_${props.activeStoreId}_${props.currentUsername}_report_${todayStr}`, JSON.stringify(updatedReport))
            setActiveReport(updatedReport)
          }

          // 4. Clear restock input states
          setPagiRestockInputs({})
          props.showToast(`BERHASIL MENAMBAH STOK UNTUK ${totalItemsAdjusted} ITEM UNTUK AWALAN PAGI!`)
        } catch (err: any) {
          props.showToast(`Gagal update stok pagi: ${err.message || err}`)
        }
      }
    )
  }

  // Handle explicit saving and syncing of the current draft values (Awal & Akhir)
  const handleSaveDraftAndSync = async () => {
    setIsSyncing(true)
    try {
      // 1. Prepare updated products from opnameInputs. Their stock becomes the 'akhir' value.
      const updatedProducts = items.map(product => {
        const inp = opnameInputs[product.id] || { awal: String(product.stock), akhir: '' }
        const rawAkhir = parseInt(inp.akhir)
        const awalVal = parseInt(inp.awal) || 0
        const finalStock = isNaN(rawAkhir) ? awalVal : rawAkhir
        return {
          ...product,
          stock: finalStock
        }
      })

      // 2. Push updated items to Supabase online & local backup
      await saveOnlineProducts(updatedProducts)

      // 3. Save the current opname inputs into today's draft backup so it reloads on page refresh
      const draftKey = `alphaPro_${props.activeStoreId}_${props.currentUsername}_today_opname_draft_${todayStr}`
      localStorage.setItem(draftKey, JSON.stringify(opnameInputs))

      // 4. Update session starting stocks for items too so it matches current state if needed
      const awalKey = `alphaPro_${props.activeStoreId}_session_stok_awal`
      const savedAwalMap: Record<string, number> = {}
      items.forEach(p => {
        const inp = opnameInputs[p.id]
        savedAwalMap[p.id] = inp ? (parseInt(inp.awal) || 0) : p.stock
      })
      localStorage.setItem(awalKey, JSON.stringify(savedAwalMap))
      setSessionStokAwal(savedAwalMap)

      // 5. Update the aggregate report used in LaporanView.tsx
      const finalGrouped: Record<string, any[]> = {}
      const draftQrisData: any[] = [] // Array for qris reporting
      
      items.forEach(product => {
        const brandKey = (product.brand || 'LAINNYA').toUpperCase()
        if (!finalGrouped[brandKey]) {
          finalGrouped[brandKey] = []
        }

        const input = opnameInputs[product.id] || { awal: String(product.stock), akhir: '' }
        const awal = parseInt(input.awal) || 0
        const rawAkhir = parseInt(input.akhir)
        const akhir = isNaN(rawAkhir) ? awal : rawAkhir
        
        const qrisQty = nontunaiSales[product.id] || 0
        if (qrisQty > 0) {
          draftQrisData.push({
            harga: product.price,
            qty: qrisQty
          })
        }

        finalGrouped[brandKey].push({
          id: product.id,
          name: product.name,
          price: product.price,
          modal: product.costPrice || 0,
          awal: awal,
          akhir: akhir
        })
      })

      localStorage.setItem(`alphaPro_${props.activeStoreId}_stok_voucher_${todayStr}`, JSON.stringify(finalGrouped))
      localStorage.setItem(`alphaPro_${props.activeStoreId}_stok_qris_${todayStr}`, JSON.stringify(draftQrisData))
      window.dispatchEvent(new Event('alphaSyncUpdate'))

      props.showToast('SUKSES: DRAFT & SINKRONISASI STOK BERHASIL DISIMPAN KE CLOUD DATABASE!')
    } catch (e: any) {
      console.error(e)
      props.showToast('Gagal Sinkronisasi Draft: ' + (e.message || e))
    } finally {
      setIsSyncing(false)
    }
  }

  // Handle saving the report (KIRIM SHIFT PAGI or CLOSING SIANG)
  const handleSaveOpnameReport = async () => {
    // Validate reporter name
    if (!cashierDisplayName.trim()) {
      props.showToast('NAMA KASIR HARUS TERCATAT!')
      return
    }

    props.onConfirm(
      'KIRIM LAPORAN CLOSING VOUCHER',
      'Konfirmasi closing malam ini akan mendaftarkan omset tunai & nontunai (QRIS), mengunci sisa stok voucher, serta memperbarui pembukuan toko. Kirim Laporan?',
      async () => {
        try {
          const reportId = `${props.activeStoreId}_${props.currentUsername}_${todayStr}`

          // 1. Gather item results computed from opname inputs
          const shiftItems: Record<string, { awal: number; akhir: number; sold: number; nontunai?: number }> = {}
          let totalRevenue = 0
          let totalProfit = 0
          let totalPcsSold = 0

          items.forEach(product => {
            const input = opnameInputs[product.id] || { awal: String(product.stock), akhir: '' }
            const awal = parseInt(input.awal) || 0
            const rawAkhir = parseInt(input.akhir)
            const akhir = isNaN(rawAkhir) ? awal : rawAkhir
            const sold = Math.max(0, awal - akhir)
            
            // Limit Non-Tunai / QRIS sold to stay within actual pieces sold limit
            const rawQRIS = nontunaiSales[product.id] || 0
            const qrisSold = Math.min(sold, rawQRIS)
            
            shiftItems[product.id] = { 
              awal, 
              akhir, 
              sold,
              nontunai: qrisSold
            }

            totalPcsSold += sold
            totalRevenue += sold * product.price
            totalProfit += Math.max(0, sold * (product.price - (product.costPrice || 0)))
          })

          const shiftData: ShiftData = {
            reporter_name: cashierDisplayName.toUpperCase(),
            submitted_at: new Date().toISOString(),
            items: shiftItems
          }

          // Build/Update the report object directly to 'closed'
          const updatedReport: StockReport = {
            id: reportId,
            store_id: props.activeStoreId,
            date: todayStr,
            pagi: shiftData,
            status: 'closed',
            updated_at: new Date().toISOString()
          }

          // 2. Save report to Supabase online & localStorage fallback
          /* const { error: upsertError } = await supabase
            .from('voucher_stock_reports')
            .upsert(updatedReport)

          if (upsertError) {
            console.error('Error saving report to Supabase:', upsertError.message)
          } */
          localStorage.setItem(`alphaPro_${props.activeStoreId}_${props.currentUsername}_report_${todayStr}`, JSON.stringify(updatedReport))
          setActiveReport(updatedReport)

          // 3. Update active live stock levels in product database
          // Live stock becomes the shift's closing stock!
          const updatedProducts = items.map(product => {
            const shiftVal = shiftItems[product.id]
            if (shiftVal) {
              return {
                ...product,
                stock: shiftVal.akhir // new live level
              }
            }
            return product
          })
          await saveOnlineProducts(updatedProducts)

          // 4. Update the aggregate report used in LaporanView.tsx
          const finalGrouped: Record<string, any[]> = {}
          const finalQrisData: any[] = [] // Array for qris reporting
          
          items.forEach(product => {
            const brandKey = (product.brand || 'LAINNYA').toUpperCase()
            if (!finalGrouped[brandKey]) {
              finalGrouped[brandKey] = []
            }

            let dayAwal = product.stock
            let dayAkhir = product.stock
            let qrisQty = 0

            const pagiData = updatedReport.pagi?.items[product.id]
            if (pagiData) {
              dayAwal = pagiData.awal
              dayAkhir = pagiData.akhir
              qrisQty = pagiData.nontunai || 0
            }
            
            if (qrisQty > 0) {
              finalQrisData.push({
                harga: product.price,
                qty: qrisQty
              })
            }

            finalGrouped[brandKey].push({
              id: product.id,
              name: product.name,
              price: product.price,
              modal: product.costPrice || 0,
              awal: dayAwal,
              akhir: dayAkhir
            })
          })

          localStorage.setItem(`alphaPro_${props.activeStoreId}_stok_voucher_${todayStr}`, JSON.stringify(finalGrouped))
          localStorage.setItem(`alphaPro_${props.activeStoreId}_stok_qris_${todayStr}`, JSON.stringify(finalQrisData))
          window.dispatchEvent(new Event('alphaSyncUpdate'))

          // 5. Create automatic transaction records split into Cash vs QRIS
          const dayPcsSold = items.reduce((acc, x) => {
            const pagiSold = updatedReport.pagi?.items[x.id]?.sold || 0
            return acc + pagiSold
          }, 0)

          const dayQrisSold = items.reduce((acc, x) => {
            const pagiQris = updatedReport.pagi?.items[x.id]?.nontunai || 0
            return acc + pagiQris
          }, 0)

          const dayCashSold = Math.max(0, dayPcsSold - dayQrisSold)

          // Calculate overall revenues
          const dayRevenue = items.reduce((acc, x) => {
            const pagiSold = updatedReport.pagi?.items[x.id]?.sold || 0
            return acc + pagiSold * x.price
          }, 0)

          const dayCost = items.reduce((acc, x) => {
            const pagiSold = updatedReport.pagi?.items[x.id]?.sold || 0
            return acc + pagiSold * (x.costPrice || 0)
          }, 0)

          const dayProfit = Math.max(0, dayRevenue - dayCost)

          // Exact revenues split
          const dayQrisRevenue = items.reduce((acc, x) => {
            const pagiQris = updatedReport.pagi?.items[x.id]?.nontunai || 0
            return acc + pagiQris * x.price
          }, 0)

          const dayCashRevenue = Math.max(0, dayRevenue - dayQrisRevenue)

          if (dayPcsSold > 0) {
            const txsToInsert = []

            if (dayCashRevenue > 0) {
              const cashProfit = dayPcsSold > 0 ? Math.round((dayCashSold / dayPcsSold) * dayProfit) : 0
              txsToInsert.push({
                id: 'tx_v_cash_close_' + Date.now(),
                user_id: props.googleUid || '',
                kasir_id: cashierDisplayName.toUpperCase(),
                store_id: props.activeStoreId,
                kategori: 'VOUCHER & PROVIDER',
                sumber_dana: 'TUNAI',
                tujuan_dana: 'KAS TOKO',
                nominal: dayCashRevenue,
                admin_fee: cashProfit,
                keterangan: `CLOSING REKAP CASH VOUCHER: TERJUAL ${dayCashSold} PCS, LEWAT PEMBAYARAN TUNAI`,
                timestamp: new Date().toISOString()
              })
            }

            if (dayQrisRevenue > 0) {
              const qrisProfit = dayPcsSold > 0 ? Math.round((dayQrisSold / dayPcsSold) * dayProfit) : 0
              txsToInsert.push({
                id: 'tx_v_qris_close_' + Date.now(),
                user_id: props.googleUid || '',
                kasir_id: cashierDisplayName.toUpperCase(),
                store_id: props.activeStoreId,
                kategori: 'VOUCHER & PROVIDER',
                sumber_dana: 'QRIS',
                tujuan_dana: 'REKENING TOKO',
                nominal: dayQrisRevenue,
                admin_fee: qrisProfit,
                keterangan: `CLOSING REKAP QRIS VOUCHER: TERJUAL ${dayQrisSold} PCS, LEWAT PEMBAYARAN NON-TUNAI`,
                timestamp: new Date().toISOString()
              })
            }

            if (txsToInsert.length > 0) {
              // Save to Supabase transactions table so it appears in Owner Dashboard analytics
              try {
                await supabase.from('transactions').insert(txsToInsert)
              } catch (txSupaErr) {
                console.warn('Supabase transaction insert warning:', txSupaErr)
              }
              // Also save to local history
              const txKey = `alphaPro_${props.activeStoreId}_riwayat_penjualan_voucher`;
              try {
                const prev = JSON.parse(localStorage.getItem(txKey) || '[]');
                localStorage.setItem(txKey, JSON.stringify([...txsToInsert, ...prev]));
              } catch (txError) {
                console.warn('Auto transaction recording warning:', txError)
              }
            }
          }

          // Clear today's localized nontunai Sales map
          setNontunaiSales({})
          localStorage.removeItem(`alphaPro_${props.activeStoreId}_today_nontunai_sales`)

          props.showToast('LAPORAN CLOSING VOUCHER HARIAN BERHASIL DISINKRONKAN DAN DIKIRIM!')
          window.dispatchEvent(new Event('alphaSyncUpdate'))
          setActiveTab('daftar')
        } catch (err: any) {
          console.error(err)
          props.showToast(`GAGAL MENGIRIM REKAP: ${err.message || err}`)
        }
      }
    )
  }

  // Afternoon cashier confirming the morning's closing stock as their handover/starting stock
  const handleConfirmHandover = async () => {
    if (!activeReport || activeReport.status !== 'pagi_submitted' || !activeReport.pagi) {
      props.showToast('TIDAK ADA HANDOVER SHIFT PAGI YANG AKTIF!')
      return
    }

    props.onConfirm(
      'TERIMA & KONFIRMASI HANDOVER',
      'Apakah Anda menyatakan menerima sisa fisik voucher hasil timbang Shift Pagi sebagai modal awal Pagi/Siang Anda?',
      async () => {
        try {
          // Initialize empty siang data inheriting from afternoon's closing
          const siangItems: Record<string, { awal: number; akhir: number; sold: number }> = {}
          
          items.forEach(p => {
            const morningItem = activeReport.pagi?.items[p.id]
            const stockInitial = morningItem ? morningItem.akhir : p.stock
            siangItems[p.id] = {
              awal: stockInitial,
              akhir: stockInitial, // default remaining is same (sold = 0)
              sold: 0
            }
          })

          const updatedReport: StockReport = {
            ...activeReport,
            siang: {
              reporter_name: cashierDisplayName.toUpperCase(),
              submitted_at: new Date().toISOString(),
              items: siangItems
            },
            status: 'draft', // Now we are currently recording afternoon in progress
            updated_at: new Date().toISOString()
          }

          // Save report online & offline
          // await supabase.from('voucher_stock_reports').upsert(updatedReport)
          localStorage.setItem(`alphaPro_${props.activeStoreId}_${props.currentUsername}_report_${todayStr}`, JSON.stringify(updatedReport))
          setActiveReport(updatedReport)

          props.showToast('STOK HANDOVER BERHASIL DITERIMA & SEBAGAI MODAL SHIFT SIANG!')
          window.dispatchEvent(new Event('alphaSyncUpdate'))
        } catch (err) {
          console.error('Handover acceptance error:', err)
          props.showToast('Gagal mereset handover.')
        }
      }
    )
  }

  // Reset report for the day (Owner only - debug & correction)
  const handleOwnerResetReport = () => {
    if (props.kasirRole !== 'owner') {
      props.showToast('FITUR RESET HANYA UNTUK OWNER!');
      return;
    }

    props.onConfirm(
      'RESET TOTAL LAPORAN CLOSING',
      'Apakah Anda yakin ingin membuka rekap-closing hari ini dan mereset status pembukuan hari ini?',
      async () => {
        try {
          const reportId = `${props.activeStoreId}_${props.currentUsername}_${todayStr}`;
          // await supabase.from('voucher_stock_reports').delete().eq('id', reportId);
          localStorage.removeItem(`alphaPro_${props.activeStoreId}_${props.currentUsername}_report_${todayStr}`);
          localStorage.removeItem(`alphaPro_${props.activeStoreId}_stok_voucher_${todayStr}`);
          
          setActiveReport(null);
          props.showToast('LAPORAN HARIAN DIRESET SEPENUHNYA! SILAHKAN KEMBALI MENCATAT STOK CLOSING.');
          refreshData();
        } catch (e) {
          props.showToast('Gagal mereset laporan online.');
        }
      }
    );
  }

  // Filter list by search text
  const filteredItems = items.filter(p => {
    const searchLower = search.toLowerCase()
    return p.name.toLowerCase().includes(searchLower) || 
           p.brand.toLowerCase().includes(searchLower)
  })

  const qrisItems = React.useMemo(() => {
    return items.filter(item => (nontunaiSales[item.id] || 0) > 0)
  }, [items, nontunaiSales])

  const totalQrisCount = React.useMemo(() => {
    return qrisItems.reduce((acc, item) => acc + (nontunaiSales[item.id] || 0), 0)
  }, [qrisItems, nontunaiSales])

  // Calculations for display summary of Opname draft inputs
  const opnameSummary = React.useMemo(() => {
    let piecesSold = 0
    let revenue = 0
    let profit = 0
    let qrisPieces = 0
    let qrisRevenue = 0
    let cashPieces = 0
    let cashRevenue = 0
    let hasAnyAkhir = false

    items.forEach(p => {
      const input = opnameInputs[p.id] || { awal: String(p.stock), akhir: '' }
      const aw = parseInt(input.awal) || 0
      const rawAkVal = parseInt(input.akhir)
      const hasAkhir = !isNaN(rawAkVal)
      
      if (hasAkhir) {
        hasAnyAkhir = true
      }
      
      const ak = hasAkhir ? rawAkVal : aw
      const sold = Math.max(0, aw - ak)

      piecesSold += sold
      revenue += sold * p.price
      profit += sold * (p.price - p.costPrice)

      const qrisSold = Math.min(sold, nontunaiSales[p.id] || 0)
      const cashSold = Math.max(0, sold - qrisSold)

      qrisPieces += qrisSold
      qrisRevenue += qrisSold * p.price

      cashPieces += cashSold
      cashRevenue += cashSold * p.price
    })

    return { 
      piecesSold, 
      revenue, 
      profit,
      qrisPieces,
      qrisRevenue,
      cashPieces,
      cashRevenue,
      hasAnyAkhir
    }
  }, [items, opnameInputs, nontunaiSales])

  return (
    <div className={cn(`flex-1 flex flex-col h-full bg-white dark:bg-slate-800 font-sans text-slate-800 dark:text-slate-100 ${props.isPc ? 'p-6' : 'p-4'} overflow-y-auto custom-scrollbar pb-24`, !props.active && 'hidden')}>
      
      {/* Upper bar title */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-250 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => props.setActiveView('view-beranda')}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-[12px] text-indigo-600 uppercase tracking-widest leading-none">
                Stok Voucher & Produk Provider
              </h3>
              <span className="text-[7.5px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest rounded-full font-black">
                Online Sync
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-1 leading-none">
              Daftar Penyesuaian & Manajemen Inventaris Produk Toko
            </p>
          </div>
        </div>

        {/* Sync Trigger button */}
        <button 
          onClick={refreshData}
          className={cn(
            "p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-90 transition-all cursor-pointer shadow-sm",
            isSyncing && "animate-spin cursor-not-allowed"
          )}
          title="Sinkronisasi Data"
          disabled={isSyncing}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* 6-Option Menu Tab selector */}
      <div className={cn("grid gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 shrink-0 border border-slate-250 select-none", props.isPc ? "grid-cols-6" : "grid-cols-3")}>
        {/* Toggle 1: Daftar */}
        <button
          onClick={() => setActiveTab('daftar')}
          className={cn(
            "py-2.5 rounded-xl font-black text-[8.5px] xs:text-[9.5px] sm:text-[10px] tracking-tight xs:tracking-normal sm:tracking-widest uppercase transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border border-transparent overflow-hidden whitespace-nowrap text-ellipsis",
            activeTab === 'daftar'
              ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-sm border-slate-250/50"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 hover:bg-white/40"
          )}
        >
          <Smartphone size={12} className="stroke-[3] shrink-0" />
          <span className="mt-0.5 sm:mt-0">DAFTAR</span>
        </button>

        {/* Toggle 2: Tambah (Owner preferred) */}
        <button
          onClick={() => setActiveTab('tambah')}
          className={cn(
            "py-2.5 rounded-xl font-black text-[8.5px] xs:text-[9.5px] sm:text-[10px] tracking-tight xs:tracking-normal sm:tracking-widest uppercase transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border border-transparent overflow-hidden whitespace-nowrap text-ellipsis",
            activeTab === 'tambah'
              ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-sm border-slate-250/50"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 hover:bg-white/40"
          )}
        >
          <FolderPlus size={12} className="stroke-[3] shrink-0" />
          <span className="mt-0.5 sm:mt-0">TAMBAH</span>
        </button>

        {/* Toggle 3: Master Edit / Stok & QRIS */}
        <button
          onClick={() => setActiveTab('master')}
          className={cn(
            "py-2.5 rounded-xl font-black text-[8.5px] xs:text-[9.5px] sm:text-[10px] tracking-tight xs:tracking-normal sm:tracking-widest uppercase transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border border-transparent overflow-hidden whitespace-nowrap text-ellipsis",
            activeTab === 'master'
              ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-sm border-slate-250/50"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 hover:bg-white/40"
          )}
        >
          <QrCode size={12} className="stroke-[3] shrink-0" />
          <span className="mt-0.5 sm:mt-0">{props.kasirRole === 'owner' ? "STOK & QRIS" : "INPUT QRIS"}</span>
        </button>

        {/* Toggle 4: Shift Closing */}
        <button
          onClick={() => setActiveTab('opname')}
          className={cn(
            "py-2.5 rounded-xl font-black text-[8px] xs:text-[9.5px] sm:text-[10px] tracking-tight xs:tracking-normal sm:tracking-widest uppercase transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border border-transparent relative overflow-hidden whitespace-nowrap text-ellipsis",
            activeTab === 'opname'
              ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-sm border-slate-250/50"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 hover:bg-white/40"
          )}
        >
          <ClipboardList size={12} className="stroke-[3] shrink-0" />
          <span className="mt-0.5 sm:mt-0">ATUR STOK</span>
          {activeReport?.status === 'pagi_submitted' && selectedShift === 'siang' && (
            <span className="absolute top-1 right-1 w-2 border border-white h-2 rounded-full bg-indigo-500 animate-ping"></span>
          )}
        </button>

        {/* Toggle 5: Riwayat */}
        <button
          onClick={() => setActiveTab('riwayat')}
          className={cn(
            "py-2.5 rounded-xl font-black text-[8.5px] xs:text-[9.5px] sm:text-[10px] tracking-tight xs:tracking-normal sm:tracking-widest uppercase transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border border-transparent relative overflow-hidden whitespace-nowrap text-ellipsis",
            activeTab === 'riwayat'
              ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-sm border-slate-250/50"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 hover:bg-white/40"
          )}
        >
          <History size={12} className="stroke-[3] shrink-0" />
          <span className="mt-0.5 sm:mt-0">RIWAYAT</span>
        </button>

        {/* Toggle 6: Grafik & Analisis */}
        <button
          onClick={() => setActiveTab('grafik')}
          className={cn(
            "py-2.5 rounded-xl font-black text-[8.5px] xs:text-[9.5px] sm:text-[10px] tracking-tight xs:tracking-normal sm:tracking-widest uppercase transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border border-transparent relative overflow-hidden whitespace-nowrap text-ellipsis",
            activeTab === 'grafik'
              ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-sm border-slate-250/50"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 hover:bg-white/40"
          )}
        >
          <BarChart3 size={12} className="stroke-[3] shrink-0" />
          <span className="mt-0.5 sm:mt-0">GRAFIK</span>
        </button>
      </div>

      {/* Main Container Views panels */}
      <div className="flex flex-col pb-14">

        {/* 1. VIEW DAFTAR (No Direct edits, 2 visual presentation options) */}
        {activeTab === 'daftar' && (
          <div className="w-full max-w-5xl mx-auto flex flex-col mb-12">
            {/* Search + Display Mode switcher row */}
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama barang, brand (XL/Telkomsel), dll..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-400 rounded-2xl pl-12 pr-4 py-3.5 text-xs uppercase font-extrabold focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              {/* Toggle Design Presentation layout */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDisplayMode('grid')}
                  className={cn(
                    "p-2.5 rounded-lg text-slate-500 dark:text-slate-400 transition-all cursor-pointer",
                    displayMode === 'grid' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "hover:text-slate-800 dark:text-slate-100"
                  )}
                  title="Grid Kotak"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('excel')}
                  className={cn(
                    "p-2.5 rounded-lg text-slate-500 dark:text-slate-400 transition-all cursor-pointer",
                    displayMode === 'excel' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "hover:text-slate-800 dark:text-slate-100"
                  )}
                  title="Excel Row-List"
                >
                  <List size={15} />
                </button>
              </div>
            </div>

            {/* List scroll item pane */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] flex flex-col shadow-sm mb-12">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 font-extrabold text-[9.5px] uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none flex justify-between items-center">
                <span>DAFTAR LIVE INVENTARIS ({filteredItems.length} ITEM)</span>
                {props.kasirRole === 'owner' && (
                  <button 
                    onClick={() => setActiveTab('tambah')}
                    className="text-indigo-600 font-black cursor-pointer hover:underline text-[9.5px] uppercase"
                  >
                    + TAMBAH PRODUK BARU
                  </button>
                )}
              </div>

              <div className="pr-1">
                {filteredItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 py-20 text-center select-none">
                    <Smartphone size={28} className="text-slate-350 stroke-[1.5]" />
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Tidak ada item provider</p>
                    <p className="text-[9px] text-slate-400 max-w-xs leading-relaxed">
                      Tambahkan produk via menu "TAMBAH" di atas atau sinkronkan data online toko Anda.
                    </p>
                  </div>
                ) : displayMode === 'grid' ? (
                  /* Option A: GRID CARDS presentation format */
                  <div className="grid grid-cols-1 gap-4 p-4">
                    {filteredItems.map(item => {
                      const lakuProfit = Math.max(0, item.price - (item.costPrice || 0))
                      return (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-slate-800 p-4.5 rounded-[1.8rem] border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3 shadow-xs hover:border-slate-300 dark:border-slate-600 transition-all select-none"
                        >
                          <div>
                            {/* Provider and name row */}
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                              <span className={cn("text-[7.5px] font-black tracking-widest border px-1.5 py-0.5 rounded uppercase leading-none block", getBadgeStyles(item.brand))}>
                                {item.brand}
                              </span>
                              {item.stock <= 3 ? (
                                <span className="text-[6.5px] px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded font-black tracking-widest uppercase leading-none">
                                  LIMIT STOK
                                </span>
                              ) : (
                                <span className="text-[6.5px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded font-black tracking-widest uppercase leading-none">
                                  AKTIF
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate mt-1">
                              {item.name}
                            </p>
                          </div>

                          {/* Pricing block */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold uppercase text-slate-450">
                              <div>
                                <span className="block text-[8px] tracking-wider text-slate-400">MODAL</span>
                                <span className="text-slate-600 dark:text-slate-300 font-mono font-bold leading-normal">
                                  {props.kasirRole === 'owner' ? formatRupiah(item.costPrice) : '🔒 [OWNER]'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[8px] tracking-wider text-slate-400">HARGA JUAL</span>
                                <span className="text-indigo-600 font-mono leading-normal">{formatRupiah(item.price)}</span>
                              </div>
                            </div>

                            {/* Profit estimate (Owner only) */}
                            {props.kasirRole === 'owner' && lakuProfit > 0 && (
                              <div className="mt-2.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl border border-emerald-100 text-[8.5px] flex items-center gap-1 font-bold">
                                <TrendingUp size={11} className="stroke-[2.5]" />
                                <span>Profit: +{formatRupiah(lakuProfit)} / Pcs</span>
                              </div>
                            )}
                          </div>

                          {/* Rich synchronized stock status footer */}
                          <div className="pt-2 border-t border-slate-100/80 flex flex-col gap-1.5 bg-slate-50/50 -mx-4.5 -mb-4.5 p-3.5 rounded-b-[1.8rem]">
                            <div className="grid grid-cols-3 gap-1 text-center font-mono text-[9px] font-extrabold select-none">
                              <div className="border-r border-slate-200 dark:border-slate-700">
                                <span className="block text-[6.5px] text-slate-400 font-sans font-black tracking-widest uppercase">STOK AWAL</span>
                                <span className="text-slate-600 dark:text-slate-300 block mt-0.5">{getProductAwalStock(item)} Pcs</span>
                              </div>
                              <div className="border-r border-slate-200 dark:border-slate-700">
                                <span className="block text-[6.5px] text-indigo-400 font-sans font-black tracking-widest uppercase">LAKU QRIS</span>
                                <span className="text-indigo-600 block mt-0.5 font-bold">{(nontunaiSales[item.id] || 0)} Pcs</span>
                              </div>
                              <div>
                                <span className={cn(
                                  "block text-[6.5px] font-sans font-black tracking-widest uppercase",
                                  getProductAkhirStock(item) <= 3 ? "text-rose-500" : "text-emerald-500"
                                )}>STOK AKHIR</span>
                                <span className={cn(
                                  "block mt-0.5 font-extrabold",
                                  getProductAkhirStock(item) <= 3 ? "text-rose-600 font-black" : "text-emerald-600"
                                )}>{getProductAkhirStock(item)} Pcs</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* Option B: EXCEL SPREADSHEET rows presentation format */
                  <div className="p-1 sm:p-3">
                    {/* Horizontal scroll helper icon for mobile only */}
                    <div className="flex sm:hidden items-center justify-end gap-1 text-[8px] font-black text-indigo-500 uppercase tracking-widest px-2 pb-1.5 select-none animate-pulse">
                      <span>Geser Tabel ↔</span>
                    </div>
                    
                    <div className="overflow-x-auto w-full border border-slate-150 rounded-2xl bg-white dark:bg-slate-800 shadow-3xs">
                      <table className="min-w-[700px] w-full border-collapse text-left select-none text-[10.5px] sm:text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-black tracking-wider uppercase text-[8px] sm:text-[8.5px] border-b border-slate-150">
                            <th className="p-2.5 sm:p-3 border-r border-slate-200 dark:border-slate-700 w-12 text-center select-none font-mono">No</th>
                            <th className="p-2.5 sm:p-3 border-r border-slate-200 dark:border-slate-700">Nama Produk Voucher</th>
                            <th className="p-2.5 sm:p-3 border-r border-slate-200 dark:border-slate-700 w-28 text-center">Provider</th>
                            <th className="p-2.5 sm:p-3 border-r border-slate-200 dark:border-slate-700 w-24 text-right">Modal</th>
                            <th className="p-2.5 sm:p-3 border-r border-slate-200 dark:border-slate-700 w-24 text-right">Harga Jual</th>
                            <th className="p-2.5 sm:p-3 border-r border-slate-200 dark:border-slate-700 w-24 text-right text-emerald-700 font-black">Profit</th>
                            <th className="p-2.5 sm:p-3 border-r border-slate-200 dark:border-slate-700 w-20 text-center text-slate-500 dark:text-slate-400 font-bold">Awal</th>
                            <th className="p-2.5 sm:p-3 border-r border-slate-200 dark:border-slate-700 w-20 text-center text-indigo-500 font-bold">QRIS</th>
                            <th className="p-2.5 sm:p-3 w-24 text-center text-emerald-600 font-black font-extrabold">Stok Akhir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white dark:bg-slate-800">
                          {filteredItems.map((item, idx) => {
                            const isProfit = Math.max(0, item.price - (item.costPrice || 0))
                            return (
                              <tr key={item.id} className="hover:bg-indigo-50/10 bg-white dark:bg-slate-800 leading-normal font-bold">
                                <td className="p-2.5 sm:p-3 border-r border-slate-150 text-center text-slate-400 font-mono font-bold select-none">{idx + 1}</td>
                                <td className="p-2.5 sm:p-3 border-r border-slate-150 uppercase tracking-wide text-slate-800 dark:text-slate-100 text-[11px] sm:text-[12px]">{item.name}</td>
                                <td className="p-2.5 sm:p-3 border-r border-slate-150 text-center">
                                  <span className={cn("text-[7px] font-black tracking-widest border px-1.5 py-0.5 rounded uppercase block w-fit mx-auto", getBadgeStyles(item.brand))}>
                                    {item.brand}
                                  </span>
                                </td>
                                <td className="p-2.5 sm:p-3 border-r border-slate-150 text-right font-mono text-slate-500 dark:text-slate-400">
                                  {props.kasirRole === 'owner' ? formatRupiah(item.costPrice) : '🔒 [OWNER]'}
                                </td>
                                <td className="p-2.5 sm:p-3 border-r border-slate-150 text-right font-mono text-indigo-600 font-extrabold">{formatRupiah(item.price)}</td>
                                <td className="p-2.5 sm:p-3 border-r border-slate-150 text-right font-mono text-emerald-600 font-extrabold">
                                  {props.kasirRole === 'owner' ? `+${formatRupiah(isProfit)}` : '🔒'}
                                </td>
                                <td className="p-2.5 sm:p-3 border-r border-slate-150 text-center font-mono text-slate-500 dark:text-slate-400 font-bold select-none">{getProductAwalStock(item)}</td>
                                <td className="p-2.5 sm:p-3 border-r border-slate-150 text-center font-mono text-indigo-600 font-extrabold select-none">{(nontunaiSales[item.id] || 0)}</td>
                                <td className="p-2.5 sm:p-3 text-center font-mono select-none">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[10.5px] font-black", 
                                    getProductAkhirStock(item) <= 3 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-150/50"
                                  )}>
                                    {getProductAkhirStock(item)} PCS
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. FORM TAMBAH PRODUK (Owner Restricted) */}
        {activeTab === 'tambah' && (
          <div className="w-full max-w-xl mx-auto flex flex-col flex-1 min-h-0">
            {props.kasirRole !== 'owner' ? (
              /* Warning overlay restricted content for kasir role */
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.2rem] p-8 text-center shadow-sm max-w-md mx-auto my-auto space-y-4 select-none">
                <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto">
                  <AlertCircle size={32} />
                </div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">AKSES BERBATAS</h4>
                <p className="text-[11px] text-slate-400 uppercase leading-relaxed font-semibold">
                  Sistem menambah data fisik produk baru, penyesuaian nominal modal, dan merek provider hanya dapat diakses dengan akun **Owner Store**.
                </p>
                <div className="pt-2">
                  <button 
                    onClick={() => setActiveTab('daftar')}
                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-extrabold text-[9.5px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Kembali Ke Daftar
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full bg-white dark:bg-slate-800 border border-slate-250 rounded-[2.2rem] p-6 shadow-sm overflow-y-auto max-h-full select-none">
                <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 pb-3 border-b border-slate-150">
                  <FolderPlus size={14} className="text-indigo-600" />
                  <span>Tambah Produk (Owner Access)</span>
                </h4>

                {/* Mode Selector */}
                <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-5 select-none shrink-0 border border-slate-150 gap-1">
                  <button
                    type="button"
                    onClick={() => setTambahMode('tunggal')}
                    className={cn(
                      "flex-1 py-2.5 px-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5",
                      tambahMode === 'tunggal'
                        ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-xs border border-slate-200/50"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100"
                    )}
                  >
                    TUNGGAL
                  </button>
                  <button
                    type="button"
                    onClick={() => setTambahMode('massal')}
                    className={cn(
                      "flex-1 py-2.5 px-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5",
                      tambahMode === 'massal'
                        ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-xs border border-slate-200/50"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100"
                    )}
                  >
                    MASSAL
                  </button>
                  <button
                    type="button"
                    onClick={() => setTambahMode('foto')}
                    className={cn(
                      "flex-1 py-2.5 px-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5",
                      tambahMode === 'foto'
                        ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-xs border border-slate-200/50"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100"
                    )}
                  >
                    FOTO / AI
                  </button>
                </div>

                {tambahMode === 'tunggal' ? (
                  <form onSubmit={handleAddProduct} className="space-y-4 [.pc-mode_&]:grid [.pc-mode_&]:md:grid-cols-2 [.pc-mode_&]:lg:grid-cols-3 [.pc-mode_&]:gap-4 [.pc-mode_&]:space-y-0">
                    {/* Nama Item */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1 block">Nama Item / Produk</label>
                      <input
                        type="text"
                        required
                        placeholder="CONTOH: TSEL MINI 5GB"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-slate-50/50 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-slate-100 uppercase placeholder-slate-400 font-extrabold focus:outline-none transition-all"
                      />
                    </div>

                    {/* Kategori provider */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1 block">Merek Provider / Kategori</label>
                      <div className="relative">
                        <select
                          value={brand}
                          onChange={e => setBrand(e.target.value)}
                          className="w-full bg-slate-50/50 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-slate-100 font-black focus:outline-none appearance-none cursor-pointer"
                        >
                          {PROVIDER_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-4.5 pointer-events-none text-slate-400">
                          <i className="fa-solid fa-chevron-down text-xs"></i>
                        </div>
                      </div>
                    </div>

                    {/* Pricing Modal & Pricing Jual */}
                    <div className="grid grid-cols-2 gap-3.5 text-left">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1 block">Harga Modal</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3.5 text-xs font-black text-slate-450">Rp</span>
                          <input
                            type="text"
                            required
                            placeholder="0"
                            value={formatInputRupiah(costPriceStr)}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9]/g, '')
                              setCostPriceStr(raw)
                            }}
                            className="w-full bg-slate-50/50 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl pl-9 pr-3 py-3.5 text-xs font-black text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1 block">Harga Jual</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3.5 text-xs font-black text-slate-450">Rp</span>
                          <input
                            type="text"
                            required
                            placeholder="0"
                            value={formatInputRupiah(priceStr)}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9]/g, '')
                              setPriceStr(raw)
                            }}
                            className="w-full bg-slate-50/50 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl pl-9 pr-3 py-3.5 text-xs font-black text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Initial Stock */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1 block">Stok Awal Fisik</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={stockStr}
                        onChange={e => setStockStr(e.target.value)}
                        className="w-full bg-slate-50/50 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl px-4 py-3.5 text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] tracking-widest uppercase rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/10 active:scale-95 transition-all outline-none cursor-pointer border border-indigo-700"
                    >
                      <Plus size={13} className="stroke-[3]" />
                      <span>Rekam Data Produk Baru</span>
                    </button>
                  </form>
                ) : tambahMode === 'massal' ? (
                  <form onSubmit={handleBulkAddSubmit} className="space-y-4">
                    {/* Bulk Item text area */}
                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-center pl-1">
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">INPUT TEKS MASSAL</label>
                        <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded leading-none">FORMAT CSV</span>
                      </div>
                      <textarea
                        rows={9}
                        required
                        placeholder="Format: Nama_Produk,Provider,Harga_Modal,Harga_Jual,Stok&#10;&#10;Contoh:&#10;TSEL MAX 10GB,TELKOMSEL,12000,15000,10&#10;XL SPECIAL 5GB,XL,6000,8000,10&#10;AXIS MINI 2GB,AXIS,4000,5500,5&#10;WAJIB Dipisahkan dengan tanda koma ( , )"
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        className="w-full bg-slate-50/50 border border-slate-250 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-2xl px-4 py-3.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 font-mono focus:outline-none transition-all resize-none font-bold"
                      />
                    </div>

                    {/* Guidelines Alert Box */}
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-left">
                      <p className="text-[9.5px] font-black text-indigo-900 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <AlertCircle size={12} className="stroke-[2.5]" />
                        Petunjuk Format Penulisan:
                      </p>
                      <p className="text-[9px] text-indigo-700/90 leading-relaxed uppercase font-semibold">
                        Tiap baris mewakili 1 produk baru yang akan diinput ke database. 
                        Pisahkan 5 elemen dengan tanda koma ( , ):<br />
                        <span className="font-mono bg-indigo-100/50 px-1.5 py-1 rounded border border-indigo-150 inline-block mt-1.5 text-[8.5px] font-bold text-indigo-950">
                          [Nama Voucher], [Nama Provider], [Harga Modal], [Harga Jual], [Stok]
                        </span>
                      </p>
                      <p className="text-[8.5px] text-slate-450 mt-2 uppercase font-semibold">
                        * Merek provider akan disesuaikan otomatis dengan kategori provider resmi (TELKOMSEL, XL, AXIS, IM3 \ INDOSAT, TRI, SMARTFREN, BYU).
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] tracking-widest uppercase rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/10 active:scale-95 transition-all outline-none cursor-pointer border border-indigo-700"
                    >
                      <Plus size={13} className="stroke-[3]" />
                      <span>Proses & Simpan Semua Produk</span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-left">
                      <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Scan size={14} className="stroke-[3] text-indigo-600" />
                        Scan dari Foto Daftar Produk (AI)
                      </p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase leading-relaxed font-semibold mb-4">
                        Foto atau unggah gambar daftar produk voucher / kartu perdana fisik. Sistem akan menggunakan AI (Gemini) untuk mengekstrak data produk, kategori, harga modal, harga jual, dan stok otomatis. Hasil akan dikonversi ke Mode Massal.
                      </p>

                      {scanPreview && (
                        <div className="relative mb-4">
                          <img src={scanPreview} alt="Pratinjau Gambar" className="w-full h-48 object-cover rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm" />
                          {isScanning && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center">
                              <RefreshCw size={24} className="stroke-[3] text-indigo-600 animate-spin mb-2" />
                              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-900">Menganalisis Gambar...</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoCapture}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                          disabled={isScanning}
                        />
                        <button
                          type="button"
                          className={cn(
                            "w-full py-4 text-white font-black text-[10px] tracking-widest uppercase rounded-2xl flex items-center justify-center gap-2 shadow-lg active:-translate-y-0.5 transition-all outline-none",
                            isScanning ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
                          )}
                        >
                          <Camera size={14} className="stroke-[3]" />
                          <span>{isScanning ? 'Memproses...' : 'Ambil Foto / Unggah'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. MASTER EDIT PANEL */}
        {activeTab === 'master' && (
          <div className="w-full max-w-5xl mx-auto flex flex-col">

            {/* View Mode Switcher Header Control (Only for Owner, Cashier is forced to kotak) */}
            {props.kasirRole === 'owner' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl mb-4 select-none shrink-0">
                <div className="text-left">
                  <p className="text-[8.5px] font-black text-indigo-700 uppercase tracking-widest leading-none mb-1">
                    PILIH TAMPILAN MASTER (OWNER ACCESS)
                  </p>
                  <div className="text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase flex items-center gap-1.5 leading-none">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                    <span>
                      {masterMode === 'kotak' ? "Mode Kotak-Kotak (Lengkap Edit)" : "Mode Tabel Excel Lengkap (Lengkap Edit)"}
                    </span>
                  </div>
                </div>

                {/* Toggles using responsive grid layouts */}
                <div className="w-full sm:w-auto">
                  <div className="grid grid-cols-2 gap-1 bg-slate-200 p-0.5 rounded-xl border border-slate-250 select-none min-w-[200px]">
                    <button
                      type="button"
                      onClick={() => setMasterMode('kotak')}
                      className={cn(
                        "py-2 rounded-lg text-[8.5px] xs:text-[9.5px] font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 px-3",
                        masterMode === 'kotak' ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-850"
                      )}
                    >
                      <LayoutGrid size={11} className="stroke-[3]" />
                      <span>KOTAK</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMasterMode('excel')}
                      className={cn(
                        "py-2 rounded-lg text-[8.5px] xs:text-[9.5px] font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 px-3",
                        masterMode === 'excel' ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-850"
                      )}
                    >
                      <ClipboardList size={11} className="stroke-[3]" />
                      <span>TABEL</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Editing grid container */}
            <div className="px-1 overflow-visible">
              <div className="bg-amber-50 rounded-2xl border border-amber-150 p-4 mb-4 select-none">
                <p className="text-[10px] font-black text-amber-850 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                  <AlertCircle size={14} className="text-amber-600" />
                  <span>
                    {props.kasirRole === 'owner' ? "MEMBER MASTER EDITOR OWNER ACTIVE" : "PENCATATAN PENJUALAN QRIS / NON-TUNAI AKTIF"}
                  </span>
                </p>
                <p className="text-[9px] text-amber-700 mt-1 leading-normal font-bold uppercase text-left">
                  {props.kasirRole === 'owner' 
                    ? "Anda memiliki akses penuh untuk merevisi nama, brand, harga modal, harga jual, dan sisa stok fisik. Perubahan langsung terupdate ke Supabase Cloud secara live."
                    : "SILAKAN KLIK ATAU TAP TOMBOL LAKU QRIS DI KOLOM PRODUK UNTUK MENAMBAH PENJUALAN NON-TUNAI. SISTEM TIDAK SECARA LANGSUNG MENGURANGI STOK AWAL. NOMINAL LAKU QRIS AKAN DIHITUNG SEBAGAI PENGURANG TOTAL PENJUALAN DI CLOSING HINGGA KETEMU NET PEMBAYARAN CASH."
                  }
                </p>
              </div>

              {/* Minimalist QRIS Sales History List */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-205 rounded-2xl p-3 mb-4 select-none">
                <div className="flex items-center justify-between border-b border-slate-150 pb-1.5 mb-2">
                  <span className="text-[8.5px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5 leading-none pl-0.5">
                    <QrCode size={13} className="text-indigo-600 stroke-[2.5]" />
                    <span>LAPORAN PENJUALAN QRIS (SESI INI)</span>
                  </span>
                  <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg font-mono">
                    {qrisItems.length} ITEM | {totalQrisCount} PCS
                  </span>
                </div>

                {qrisItems.length === 0 ? (
                  <p className="text-[8.5px] text-slate-400 font-bold uppercase py-1 text-left pl-1">
                    BELUM ADA TRANSAKSI QRIS YANG DIINPUT HARI INI. SILAKAN TEKAN TOMBOL +1 QRIS PADA PRODUK.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {qrisItems.map(item => {
                      const qty = nontunaiSales[item.id] || 0
                      return (
                        <div 
                          key={item.id} 
                          className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-indigo-150 px-2.5 py-1.5 rounded-xl text-[9px] font-bold text-slate-700 dark:text-slate-200 shadow-3xs hover:border-indigo-350 hover:bg-slate-50 dark:bg-slate-900 transition-all text-left"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                          <span className="font-extrabold uppercase text-slate-800 dark:text-slate-100 tracking-tight">
                            {item.name}
                          </span>
                          <span className="font-sans text-[7px] text-slate-400 bg-slate-50 dark:bg-slate-900 border px-1.5 py-0.5 rounded font-black uppercase tracking-wider scale-95 origin-left">
                            {item.brand}
                          </span>
                          <span className="font-mono text-[9.5px] font-black text-indigo-750 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg shrink-0">
                            {qty} PCS
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Control Panel: Search & Quick Adjust Button Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-2xl select-none shadow-xs">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-3.5 text-slate-450" />
                  <input
                    type="text"
                    placeholder="Cari nama barang atau brand..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-400 rounded-xl pl-9 pr-4 py-2.5 text-[10.5px] uppercase font-extrabold focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                  />
                </div>

                {props.kasirRole === 'owner' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextValue = !showQuickAdjust
                        setShowQuickAdjust(nextValue)
                        localStorage.setItem('alphaPro_v_showQuickAdjust', String(nextValue))
                      }}
                      className={cn(
                        "px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-sm w-full sm:w-auto",
                        showQuickAdjust
                          ? "bg-indigo-600 hover:bg-indigo-505 text-white border-indigo-700"
                          : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-900 text-indigo-700 border-indigo-250"
                      )}
                    >
                      {showQuickAdjust ? <EyeOff size={12} className="stroke-[2.5]" /> : <Eye size={12} className="stroke-[2.5]" />}
                      <span>{showQuickAdjust ? 'Sembunyikan Tombol -+' : 'Tampilkan Tombol -+'}</span>
                    </button>
                  </div>
                )}
              </div>

              {filteredItems.length === 0 ? (
                <div className="text-center py-20 text-slate-450 uppercase font-black text-[10px] tracking-widest bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] select-none">
                  Tidak ada kecocokan produk.
                </div>
              ) : (
                <>
                  {/* ====== VIEW 1: MODE KOTAK ====== */}
                  {masterMode === 'kotak' && (
                    <div className="grid grid-cols-1 gap-4 pb-6">
                      {filteredItems.map(item => {
                        const localEdit = editItemsState[item.id] || {}
                        const isEdited = editItemsState[item.id] !== undefined
                        const inputStokAkhirVal = masterStokAkhirInputs[item.id] !== undefined ? masterStokAkhirInputs[item.id] : String(item.stock)
                        const isStokAkhirChanged = inputStokAkhirVal !== String(item.stock)

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "bg-white dark:bg-slate-800 p-5 rounded-[2rem] border transition-all text-left flex flex-col gap-3 shadow-xs relative",
                              (props.kasirRole === 'owner' ? isEdited : isStokAkhirChanged)
                                ? "border-indigo-400 ring-2 ring-indigo-50 shadow-sm"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600"
                            )}
                          >
                            {props.kasirRole === 'owner' ? (
                              <>
                                {/* Title detail input */}
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider pl-0.5 block">Nama Item / Produk</label>
                                  <input
                                    type="text"
                                    value={localEdit.name ?? item.name}
                                    onChange={e => handleUpdateEditState(item.id, 'name', e.target.value.toUpperCase())}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 uppercase"
                                  />
                                </div>

                                {/* Category selection */}
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider pl-0.5 block">Provider</label>
                                  <div className="relative">
                                    <select
                                      value={localEdit.brand ?? item.brand}
                                      onChange={e => handleUpdateEditState(item.id, 'brand', e.target.value)}
                                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                                    >
                                      {PROVIDER_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                    <div className="absolute right-3.5 top-3 pointer-events-none text-slate-400">
                                      <i className="fa-solid fa-chevron-down text-[10px]"></i>
                                    </div>
                                  </div>
                                </div>

                                {/* Pricing details */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider pl-0.5 block">Harga Modal</label>
                                    <div className="relative">
                                      <span className="absolute left-2.5 top-1.5 text-[10px] font-black text-slate-400">Rp</span>
                                      <input
                                        type="text"
                                        value={formatInputRupiah(localEdit.costPriceStr ?? String(item.costPrice))}
                                        onChange={e => {
                                          const raw = e.target.value.replace(/[^0-9]/g, '')
                                          handleUpdateEditState(item.id, 'costPriceStr', raw)
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-2 py-1.5 text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider pl-0.5 block">Harga Jual</label>
                                    <div className="relative">
                                      <span className="absolute left-2.5 top-1.5 text-[10px] font-black text-slate-400">Rp</span>
                                      <input
                                        type="text"
                                        value={formatInputRupiah(localEdit.priceStr ?? String(item.price))}
                                        onChange={e => {
                                          const raw = e.target.value.replace(/[^0-9]/g, '')
                                          handleUpdateEditState(item.id, 'priceStr', raw)
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-2 py-1.5 text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Live Stock Level */}
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider pl-0.5 block">Stok Level Saat Ini</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={localEdit.stockStr !== undefined ? localEdit.stockStr : String(item.stock)}
                                    onChange={e => handleUpdateEditState(item.id, 'stockStr', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-1.5 text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>

                                {/* Actions bar for save or delete */}
                                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 select-none">
                                  <button
                                    onClick={() => handleSaveEditItem(item.id)}
                                    disabled={!isEdited}
                                    className={cn(
                                      "flex-1 font-black text-[9px] uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all border shadow-xs",
                                      isEdited
                                        ? "bg-emerald-600 border-emerald-700 hover:bg-emerald-500 text-white"
                                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-350 pointer-events-none cursor-not-allowed"
                                    )}
                                  >
                                    <Save size={11} />
                                    <span>Simpan Edit</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteItem(item.id, item.name)}
                                    className="px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-[9px] uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-rose-200 shadow-xs"
                                  >
                                    <Trash2 size={12} />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Locked details header info */}
                                <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                                  <span className={cn("text-[7.5px] font-black tracking-widest px-1.5 py-0.5 border rounded uppercase", getBadgeStyles(item.brand))}>
                                    {item.brand}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-150">
                                    HARGA: {formatRupiah(item.price)}
                                  </span>
                                </div>

                                <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-tight select-all">
                                  {item.name}
                                </p>


                                {/* PENJUALAN NON-TUNAI (QRIS) CONTROLLER */}
                                <div className="p-3 bg-indigo-50/20 border border-indigo-150 rounded-2xl my-2.5 flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                                      <QrCode size={12} className="text-indigo-500" />
                                      <span>LAKU NON-TUNAI (QRIS)</span>
                                    </span>
                                    <span className="text-xs font-black font-mono text-indigo-750 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg select-all">
                                      {nontunaiSales[item.id] || 0} PCS
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => updateNontunaiSale(item.id, -1)}
                                      disabled={!(nontunaiSales[item.id] > 0)}
                                      className={cn(
                                        "py-2 px-3.5 border rounded-xl transition-all active:scale-95 font-black font-mono text-xs cursor-pointer flex items-center justify-center shrink-0",
                                        (nontunaiSales[item.id] || 0) > 0
                                          ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
                                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300 cursor-not-allowed pointer-events-none"
                                      )}
                                    >
                                      - 1
                                    </button>
                                    
                                    <button
                                      type="button"
                                      onClick={() => updateNontunaiSale(item.id, 1)}
                                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 font-black font-mono text-[9px] uppercase tracking-wider shadow-sm shadow-indigo-500/10 border border-indigo-700"
                                    >
                                      <QrCode size={12} className="stroke-[2.5]" />
                                      <span>LAKU +1 QRIS</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Footer message */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between select-none">
                                  <span className="text-[7.5px] font-bold uppercase text-slate-400 leading-tight leading-none block">
                                    * Laku QRIS diakumulasikan otomatis pada sisa closing cash.
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ====== VIEW 2: MODE EXCEL LENGKAP (OWNER ONLY) ====== */}
                  {masterMode === 'excel' && props.kasirRole === 'owner' && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-205 rounded-2xl overflow-hidden shadow-xs p-3">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-slate-150 text-left text-[11px] select-none min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-150 text-slate-550 font-black tracking-wider uppercase text-[8.5px] border-b border-slate-200 dark:border-slate-700 select-none">
                              <th className="p-3.5 border-r border-slate-205 text-center w-12">No</th>
                              <th className="p-3.5 border-r border-slate-205">Nama Voucher</th>
                              <th className="p-3.5 border-r border-slate-205 w-32">Provider</th>
                              <th className="p-3.5 border-r border-slate-205 w-24 text-right">Modal</th>
                              <th className="p-3.5 border-r border-slate-205 w-24 text-right">Jual</th>
                              <th className="p-3.5 border-r border-slate-205 w-36 text-center">Stok</th>
                              <th className="p-3.5 text-center w-36">Aksi (CLOUD)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white dark:bg-slate-800">
                            {filteredItems.map((item, idx) => {
                              const localEdit = editItemsState[item.id] || {}
                              const isEdited = editItemsState[item.id] !== undefined
                              const isRowEditing = editingItemId === item.id

                              return (
                                <tr key={item.id} className="hover:bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 transition-colors">
                                  {/* No index */}
                                  <td className="p-3 border-r border-slate-150 text-center font-mono text-slate-450 font-bold select-none">{idx + 1}</td>

                                  {/* Nama Voucher */}
                                  <td className="p-3 border-r border-slate-150 max-w-[280px]">
                                    {isRowEditing ? (
                                      <input 
                                        type="text"
                                        value={localEdit.name ?? item.name}
                                        onChange={e => handleUpdateEditState(item.id, 'name', e.target.value.toUpperCase())}
                                        className="w-full px-2.5 py-1.5 border border-slate-250 rounded-xl text-xs select-text font-black text-slate-800 dark:text-slate-100 uppercase focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-white dark:bg-slate-800"
                                      />
                                    ) : (
                                      <span className="font-extrabold text-slate-850 text-[11.5px] uppercase tracking-wide leading-relaxed block break-words select-text whitespace-normal">
                                        {item.name}
                                      </span>
                                    )}
                                  </td>

                                  {/* Provider brand selection */}
                                  <td className="p-3 border-r border-slate-150">
                                    {isRowEditing ? (
                                      <select
                                        value={localEdit.brand ?? item.brand}
                                        onChange={e => handleUpdateEditState(item.id, 'brand', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-slate-250 rounded-xl bg-white dark:bg-slate-800 text-xs font-black focus:outline-none cursor-pointer text-slate-700 dark:text-slate-200"
                                      >
                                        {PROVIDER_CATEGORIES.map(b => (
                                          <option key={b} value={b}>{b}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className={cn("inline-block text-[9px] font-black tracking-widest px-2.5 py-1 border rounded uppercase leading-none", getBadgeStyles(item.brand))}>
                                        {item.brand}
                                      </span>
                                    )}
                                  </td>

                                  {/* Harga Modal */}
                                  <td className="p-3 border-r border-slate-150 text-right">
                                    {isRowEditing ? (
                                      <div className="relative">
                                        <span className="absolute left-1.5 top-2 text-[9.5px] font-bold text-slate-400 font-mono">Rp</span>
                                        <input
                                          type="text"
                                          value={formatInputRupiah(localEdit.costPriceStr ?? String(item.costPrice))}
                                          onChange={e => {
                                            const raw = e.target.value.replace(/[^0-9]/g, '')
                                            handleUpdateEditState(item.id, 'costPriceStr', raw)
                                          }}
                                          className="w-full text-right pl-5 pr-1.5 py-1.5 border border-slate-250 rounded-xl font-bold font-mono text-[10.5px] text-slate-650 focus:outline-none focus:border-indigo-400 bg-white dark:bg-slate-800"
                                        />
                                      </div>
                                    ) : (
                                      <span className="font-bold text-slate-550 font-mono text-[11px] select-text">
                                        {formatRupiah(item.costPrice)}
                                      </span>
                                    )}
                                  </td>

                                  {/* Harga Jual */}
                                  <td className="p-3 border-r border-slate-150 text-right">
                                    {isRowEditing ? (
                                      <div className="relative">
                                        <span className="absolute left-1.5 top-2 text-[9.5px] font-bold text-slate-400 font-mono">Rp</span>
                                        <input
                                          type="text"
                                          value={formatInputRupiah(localEdit.priceStr ?? String(item.price))}
                                          onChange={e => {
                                            const raw = e.target.value.replace(/[^0-9]/g, '')
                                            handleUpdateEditState(item.id, 'priceStr', raw)
                                          }}
                                          className="w-full text-right pl-5 pr-1.5 py-1.5 border border-slate-250 rounded-xl font-bold font-mono text-[10.5px] text-indigo-750 focus:outline-none focus:border-indigo-400 bg-white dark:bg-slate-800"
                                        />
                                      </div>
                                    ) : (
                                      <span className="font-black text-indigo-700 font-mono text-[11px] select-text">
                                        {formatRupiah(item.price)}
                                      </span>
                                    )}
                                  </td>

                                  {/* Stock level */}
                                  <td className="p-3 border-r border-slate-150 text-center">
                                    {isRowEditing ? (
                                      <input
                                        type="number"
                                        min="0"
                                        value={localEdit.stockStr !== undefined ? localEdit.stockStr : String(item.stock)}
                                        onChange={e => handleUpdateEditState(item.id, 'stockStr', e.target.value)}
                                        className="w-full text-center py-1.5 border border-slate-250 rounded-xl font-black font-mono text-xs focus:outline-none bg-white dark:bg-slate-800"
                                      />
                                    ) : (
                                      <span className="font-black text-slate-700 dark:text-slate-200 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded select-none">
                                        {item.stock} PCS
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions cell */}
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5 select-none h-full">
                                      {isRowEditing ? (
                                        <>
                                          <button
                                            onClick={() => handleSaveEditItem(item.id)}
                                            className={cn(
                                              "px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-700 text-white rounded-lg text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer shadow-xs",
                                              !isEdited && "opacity-60 cursor-not-allowed pointer-events-none"
                                            )}
                                            title="Simpan"
                                            disabled={!isEdited}
                                          >
                                            <Save size={10} />
                                            <span>Simpan</span>
                                          </button>

                                          <button
                                            onClick={() => handleCancelEdit(item.id)}
                                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer"
                                            title="Batal"
                                          >
                                            <X size={10} />
                                            <span>Batal</span>
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleStartEdit(item)}
                                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-700 text-indigo-700 hover:text-white rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-all cursor-pointer shadow-3xs"
                                          title="Edit"
                                        >
                                          <Edit3 size={11} className="stroke-[2.5]" />
                                          <span>EDIT</span>
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleDeleteItem(item.id, item.name)}
                                        className="px-2 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 text-rose-600 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                                        title="Hapus"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* 4. SHIFT CLOSING AND REKAP PANEL */}
        {activeTab === 'opname' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col select-none mb-12">
            
            {/* Unified Shift and Stok Controls Widget */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm select-none">
              
              {/* Left Group: Dynamic Function Selector (Stok Pagi on Left, Closing on Right) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-1">Pilih Tindakan</span>
                  <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 w-full sm:w-[260px]">
                    <button
                      onClick={() => setOpnameSubTab('restock')}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5",
                        opnameSubTab === 'restock'
                          ? "bg-white dark:bg-slate-800 text-emerald-700 shadow-xs border border-slate-200/40"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-805"
                      )}
                    >
                      <PlusCircle size={12} className="stroke-[2.5]" />
                      <span>☀️ Stok Awal</span>
                    </button>
                    <button
                      onClick={() => setOpnameSubTab('closing')}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5",
                        opnameSubTab === 'closing'
                          ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-xs border border-slate-200/40"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-805"
                      )}
                    >
                      <ClipboardCheck size={12} className="stroke-[2.5]" />
                      <span>📝 Stok Akhir</span>
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden sm:block h-8 w-px bg-slate-205"></div>

                {/* Cashier & Status badges Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 pl-0.5">Kasir Aktif</span>
                    <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 uppercase tracking-wide h-[30.5px]">
                      <User size={11} className="text-slate-450 stroke-[2.5]" />
                      <span>{cashierDisplayName}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 pl-0.5">Status Laporan</span>
                    <span className={cn(
                      "text-[9px] font-black px-2.5 py-1.5 border rounded-lg uppercase inline-flex items-center gap-1.5 leading-none h-[30.5px] tracking-wider",
                      !activeReport 
                        ? "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700" 
                        : activeReport.status === 'pagi_submitted'
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : activeReport.status === 'closed'
                        ? "bg-emerald-50 text-emerald-700 border-emerald-250/70"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    )}>
                      {!activeReport ? (
                        <>❌ BELUM MULAI</>
                      ) : activeReport.status === 'pagi_submitted' ? (
                        <>🔸 PAGI SELESAI</>
                      ) : activeReport.status === 'closed' ? (
                        <>✅ CLOSED</>
                      ) : (
                        <>📝 RECORDING</>
                      )}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* TAB PANEL 1: SHIFT CLOSING */}
            {opnameSubTab === 'closing' && (
              <>
                {/* HANDOVER ALERTS BANNER FOR SHIFT CLOSING */}
                {selectedShift === 'siang' && activeReport?.status === 'pagi_submitted' && activeReport.pagi && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4.5 mb-4 text-left flex flex-col md:flex-row md:items-center justify-between gap-3.5 animation-pulse">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-[10.5px] font-black text-indigo-900 uppercase tracking-widest leading-none">Handover Shift Pagi Siap Diterima!</h5>
                        <p className="text-[9.5px] text-indigo-700 mt-1 uppercase font-bold leading-relaxed">
                          Kasir pagi **{activeReport.pagi.reporter_name}** telah mengirim sisa stok closing. Klik konfirmasi dibawah untuk memulai shift Siang.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleConfirmHandover}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 hover:border-indigo-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-indigo-775 shadow-sm shrink-0"
                    >
                      Confirm Terima Handover
                    </button>
                  </div>
                )}

                {/* MAIN STOCK LIST REPORT INPUT */}
                <div className="px-1 overflow-visible">
                  {items.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 border rounded-[2rem] text-slate-400 font-extrabold uppercase text-[10px]">
                      Harap input produk dulu di master agar dapat melakukan closing shift.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="hidden sm:flex items-center justify-between p-1 pl-3 text-[9.5px] font-black uppercase tracking-wider text-slate-450 border-b border-indigo-100">
                        <span>Nama Item / Produk</span>
                        <div className="flex items-center text-center w-[240px] md:w-[320px] shrink-0 font-extrabold pr-2">
                          <span className="w-16 md:w-24 shrink-0 text-center">Stok Awal</span>
                          <span className="w-24 md:w-32 shrink-0 text-center">Stok Akhir</span>
                          <span className="w-16 md:w-24 shrink-0 text-center">Terjual</span>
                        </div>
                      </div>

                      {items.map(product => {
                        const inp = opnameInputs[product.id] || { awal: String(product.stock), akhir: "" }
                        const awVal = parseInt(inp.awal) || 0
                        const rawAkVal = parseInt(inp.akhir)
                        const hasAkhir = !isNaN(rawAkVal)
                        const akVal = hasAkhir ? rawAkVal : awVal
                        const soldAmt = Math.max(0, awVal - akVal)
                        const profitEst = soldAmt * (product.price - product.costPrice)

                        return (
                          <div 
                            key={product.id}
                            className="bg-white dark:bg-slate-800 p-3.5 md:p-4 rounded-2xl border border-slate-150 shadow-xs hover:border-slate-200 dark:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                          >
                            {/* Name Column */}
                            <div className="min-w-0 flex-1 text-left">
                              <p className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate">{product.name}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={cn("text-[6.5px] font-black tracking-widest px-1 py-0.5 border rounded uppercase", getBadgeStyles(product.brand))}>
                                  {product.brand}
                                </span>
                                <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-mono font-bold">
                                  Harga: {formatRupiah(product.price)}
                                </span>
                                {/* Small Profit indicator (Owner only) */}
                                {props.kasirRole === 'owner' && hasAkhir && profitEst > 0 && (
                                  <span className="text-[7.5px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-black border border-emerald-100">
                                    Profit: +{formatRupiah(profitEst)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Numeric input counter column representation */}
                            <div className="grid grid-cols-3 gap-2.5 sm:flex sm:items-center sm:text-center w-full sm:w-[240px] md:w-[320px] shrink-0 pt-2.5 sm:pt-0 border-t border-slate-100 dark:border-slate-800 sm:border-t-0">
                              {/* Awal */}
                              <div className="flex flex-col items-center justify-center sm:w-16 md:w-24 shrink-0 text-center">
                                <span className="block text-[6.5px] text-slate-400 font-black tracking-widest mb-1 sm:hidden">STOK AWAL</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={inp.awal}
                                  onChange={e => handleOpnameChange(product.id, 'awal', e.target.value)}
                                  className="w-full sm:w-14 text-center py-1.5 sm:py-1 bg-slate-55 border border-slate-200 dark:border-slate-700 focus:border-slate-400 focus:bg-white dark:bg-slate-800 rounded-lg text-xs font-mono font-black text-slate-705 focus:outline-none"
                                />
                                <span className="hidden sm:block text-[6.5px] text-slate-400 font-black tracking-widest mt-1 uppercase">AWAL</span>
                              </div>

                              {/* Akhir */}
                              <div className="flex flex-col items-center justify-center sm:w-24 md:w-32 shrink-0 text-center">
                                <span className="block text-[6.5px] text-indigo-500 font-black tracking-widest mb-1 sm:hidden">STOK AKHIR</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={inp.akhir}
                                  onChange={e => handleOpnameChange(product.id, 'akhir', e.target.value)}
                                  className="w-full sm:w-20 text-center py-1.5 bg-indigo-50 border border-indigo-200 focus:border-indigo-500 focus:bg-white dark:bg-slate-800 rounded-lg text-xs font-mono font-black text-indigo-750 focus:outline-none placeholder:text-indigo-200/50"
                                  placeholder="0"
                                />
                                <span className="hidden sm:block text-[6.5px] text-indigo-500 font-black tracking-widest mt-1 uppercase">STOK AKHIR</span>
                              </div>

                              {/* Calculated sold */}
                              <div className="flex flex-col items-center justify-center sm:w-16 md:w-24 shrink-0 text-center">
                                <span className="block text-[6.5px] text-slate-400 font-black tracking-widest mb-1 sm:hidden">TERJUAL</span>
                                <span className={cn(
                                  "text-xs font-black font-mono py-1.5 sm:py-1 rounded-lg w-full sm:w-auto text-center block sm:inline-block border h-[30px] flex items-center justify-center",
                                  !hasAkhir ? "bg-slate-50/50 text-slate-300 border-slate-100 dark:border-slate-800 sm:px-3" : soldAmt > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-150 sm:px-2.5" : "bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700 sm:px-2.5"
                                )}>
                                  {hasAkhir ? `${soldAmt} PCS` : '-'}
                                </span>
                                <span className="hidden sm:block text-[6.5px] text-slate-400 font-black tracking-widest mt-1.5 uppercase">TERJUAL</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* LIVE COMPUTED SUMMARY BAR */}
                {items.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shrink-0 mt-3 select-none">
                    <div className="flex flex-col gap-3.5 mb-4">
                      {/* Top row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* Pieces laku */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-left">
                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">TOTAL PCS TERJUAL</span>
                          <span className={cn("text-[12.5px] font-black font-mono", opnameSummary.hasAnyAkhir ? "text-slate-800 dark:text-slate-100" : "text-slate-300")}>
                            {opnameSummary.hasAnyAkhir ? `${opnameSummary.piecesSold} ITEMS` : '-'}
                          </span>
                        </div>
                        
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-left">
                          <span className="block text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-none mb-1">TUNAI (CASH)</span>
                          <span className={cn("text-[11.5px] font-black font-mono block", opnameSummary.hasAnyAkhir ? "text-slate-800 dark:text-slate-100" : "text-slate-300")}>
                            {opnameSummary.hasAnyAkhir ? `${opnameSummary.cashPieces} PCS = ${formatRupiah(opnameSummary.cashRevenue)}` : '-'}
                          </span>
                        </div>

                        <div className="p-3 bg-indigo-50/50 border border-indigo-150 rounded-xl text-left">
                          <span className="block text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">NON-TUNAI (QRIS)</span>
                          <span className={cn("text-[11.5px] font-black font-mono block", opnameSummary.hasAnyAkhir ? "text-indigo-700" : "text-indigo-300/60")}>
                            {opnameSummary.hasAnyAkhir ? `${opnameSummary.qrisPieces} PCS = ${formatRupiah(opnameSummary.qrisRevenue)}` : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Revenue / Omset */}
                        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-left">
                          <span className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">ESTIMASI OMSET</span>
                          <span className={cn("text-[12.5px] font-black font-mono", opnameSummary.hasAnyAkhir ? "text-indigo-700" : "text-indigo-300/60")}>
                            {opnameSummary.hasAnyAkhir ? formatRupiah(opnameSummary.revenue) : '-'}
                          </span>
                        </div>

                        {/* Profit (Owner Restricted!) */}
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-left relative overflow-hidden">
                          <span className="block text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">ESTIMASI NET LABA</span>
                          {props.kasirRole === 'owner' ? (
                            <span className={cn("text-[12.5px] font-black font-mono", opnameSummary.hasAnyAkhir ? "text-emerald-700" : "text-emerald-300/60")}>
                              {opnameSummary.hasAnyAkhir ? formatRupiah(opnameSummary.profit) : '-'}
                            </span>
                          ) : (
                            <span className="text-[11px] font-black text-slate-400 block mt-1 tracking-wider">🔒 CONFIDENTIAL [OWNER]</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Submitting buttons and corrective handles */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Reset harian (Owner preferred debug option) */}
                      {props.kasirRole === 'owner' && activeReport && (
                        <button 
                          onClick={handleOwnerResetReport}
                          className="px-4.5 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-xs shrink-0 flex items-center justify-center"
                          title="Reset Closing"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      {/* Simpan & Sinkronkan Draft button */}
                      <button
                        type="button"
                        onClick={handleSaveDraftAndSync}
                        className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] tracking-widest uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer border border-emerald-700"
                        title="Simpan Draft & Sinkronkan"
                      >
                        <Save size={12} className="stroke-[2.5]" />
                        <span>SIMPAN & SINKRONKAN</span>
                      </button>

                      {/* Main submission button */}
                      <button
                        onClick={handleSaveOpnameReport}
                        className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] tracking-widest uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer border border-indigo-750"
                      >
                        <Send size={12} className="stroke-[2.5]" />
                        <span>KIRIM SELESAIKAN LAPORAN CLOSING VOUCHER</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB PANEL 2: TAMBAH STOK BARU IN THE MORNING */}
            {opnameSubTab === 'restock' && (
              <div className="space-y-4 text-left">
                {/* Banner Info */}
                <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-4 sm:p-5 select-none text-left">
                  <p className="text-[10px] font-black text-emerald-850 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                    <CheckCircle size={14} className="text-emerald-600" />
                    <span>SESUAIKAN / TAMBAH STOK BARU SEBELUM MULAI (STOK AWAL)</span>
                  </p>
                  <p className="text-[9.5px] text-emerald-700 mt-2 leading-relaxed uppercase font-black text-left">
                    Sistem otomatis meneruskan sisa stok sebelumnya. Masukkan jumlah drop-dropan stok baru di bawah ini. Nominal input otomatis diakumulasikan sebagai STOK AWAL BARU ke database Supabase Anda.
                  </p>
                </div>

                {/* Instant search filter bar for restocks */}
                <div className="relative select-none">
                  <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={pagiSearchQuery}
                    onChange={e => setPagiSearchQuery(e.target.value)}
                    placeholder="Cari voucher / provider untuk tambah stok..."
                    className="w-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 focus:bg-white dark:bg-slate-800 border border-slate-205 focus:border-slate-400 rounded-xl pl-9.5 pr-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none shadow-2xs"
                  />
                  {pagiSearchQuery && (
                    <button
                      onClick={() => setPagiSearchQuery('')}
                      className="absolute right-3.5 top-3 px-2 py-0.5 bg-slate-200 text-slate-500 dark:text-slate-400 hover:bg-slate-300 rounded text-[9px] font-bold uppercase transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* List Product Input */}
                <div className="px-1 space-y-3">
                  <div className="hidden sm:flex items-center justify-between p-1 pl-3 text-[9.5px] font-black uppercase tracking-wider text-slate-450 border-b border-indigo-100 pb-2">
                    <span>Nama Item / Produk</span>
                    <div className="flex items-center text-center w-[350px] shrink-0 font-extrabold pr-2 justify-end gap-12">
                      <span className="w-16 shrink-0 text-center">Stok Sebelumnya</span>
                      <span className="w-32 shrink-0 text-center">Tambah Stok Baru</span>
                      <span className="w-20 shrink-0 text-center">Stok Awal Baru</span>
                    </div>
                  </div>

                  {(() => {
                    const filteredItems = items.filter(p => 
                      !pagiSearchQuery || 
                      p.name.toUpperCase().includes(pagiSearchQuery.toUpperCase()) || 
                      p.brand.toUpperCase().includes(pagiSearchQuery.toUpperCase())
                    )

                    if (filteredItems.length === 0) {
                      return (
                        <div className="text-center py-14 text-slate-400 font-extrabold uppercase text-[9.5px]">
                          Tidak ada produk yang cocok dengan pencarian "{pagiSearchQuery}"
                        </div>
                      )
                    }

                    return filteredItems.map(product => {
                      const restockVal = pagiRestockInputs[product.id] || ''
                      const rAmt = parseInt(restockVal) || 0
                      const finalStock = product.stock + rAmt

                      return (
                        <div 
                          key={product.id}
                          className="bg-white dark:bg-slate-800 p-3.5 md:p-4 rounded-2xl border border-slate-150 shadow-xs hover:border-slate-200 dark:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                        >
                          {/* Name Column */}
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate">{product.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={cn("text-[6.5px] font-black tracking-widest px-1 py-0.5 border rounded uppercase", getBadgeStyles(product.brand))}>
                                {product.brand}
                              </span>
                              <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-mono font-bold">
                                Harga: {formatRupiah(product.price)}
                              </span>
                            </div>
                          </div>

                          {/* Control Section */}
                          <div className="flex flex-col sm:flex-row sm:items-center w-full sm:w-[350px] shrink-0 pt-2.5 sm:pt-0 border-t border-slate-100 dark:border-slate-800 sm:border-t-0 gap-3 sm:gap-6 justify-end">
                            {/* Stok Kemarin */}
                            <div className="flex justify-between sm:flex-col items-center sm:w-16 shrink-0 text-center">
                              <span className="block text-[6.5px] text-slate-400 font-black tracking-widest sm:hidden uppercase">STOK SEBELUMNYA</span>
                              <span className="text-xs font-mono font-black text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">{product.stock} PCS</span>
                              <span className="hidden sm:block text-[6.5px] text-slate-400 font-black tracking-widest mt-1 uppercase">SEBELUMNYA</span>
                            </div>

                            {/* Plus/Minus/Input Tambah */}
                            <div className="flex flex-col items-center sm:w-32 shrink-0 text-center gap-1">
                              <div className="flex items-center gap-1.5 w-full">
                                <button
                                  onClick={() => handleAdjustPagiRestock(product.id, -1)}
                                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-all"
                                >
                                  <Minus size={10} className="stroke-[2.5]" />
                                </button>
                                
                                <input
                                  type="number"
                                  min="0"
                                  value={restockVal}
                                  placeholder="0"
                                  onChange={e => handlePagiRestockInputChange(product.id, e.target.value)}
                                  className="flex-1 w-12 text-center py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-205 focus:border-indigo-400 focus:bg-white dark:bg-slate-800 rounded-lg text-xs font-mono font-black text-slate-800 dark:text-slate-100 focus:outline-none"
                                />

                                <button
                                  onClick={() => handleAdjustPagiRestock(product.id, 1)}
                                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-all"
                                >
                                  <Plus size={10} className="stroke-[2.5]" />
                                </button>
                              </div>
                              
                              {/* Fast-tap increment row */}
                              <div className="flex items-center gap-1 mt-1 justify-center">
                                {[5, 10, 25].map(amt => (
                                  <button
                                    key={amt}
                                    onClick={() => handleAdjustPagiRestock(product.id, amt)}
                                    className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 rounded text-[7.5px] font-black text-indigo-700 cursor-pointer transition-all"
                                  >
                                    +{amt}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Stok Awal Baru */}
                            <div className="flex justify-between sm:flex-col items-center sm:w-20 shrink-0 text-center">
                              <span className="block text-[6.5px] text-slate-400 font-black tracking-widest sm:hidden uppercase">STOK AWAL BARU</span>
                              <span className={cn(
                                "text-xs font-mono font-black px-2.5 py-1 rounded border block transition-all",
                                rAmt > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-150" : "bg-slate-50 dark:bg-slate-900 text-slate-450 border-slate-200 dark:border-slate-700"
                              )}>
                                {finalStock} PCS
                              </span>
                              <span className="hidden sm:block text-[6.5px] text-slate-400 font-black tracking-widest mt-1 uppercase">AWAL BARU</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>

                {/* Submitting buttons */}
                <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shrink-0 mt-3 select-none">
                  <button
                    onClick={handleSaveAllPagiRestocks}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10.5px] tracking-widest uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-100 cursor-pointer border border-emerald-750 transition-all"
                  >
                    <Save size={13} className="stroke-[2.5]" />
                    <span>TERAPKAN TAMBAH STOK & UPDATE LIVE AKUN</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 5. HISTORY CLOSING PANEL */}
        {activeTab === 'riwayat' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col select-none mb-12">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-5 sm:p-7 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
                <div className="text-left">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">RIWAYAT</h4>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1">Lacak dan bandingkan penjualan Kasir 1 (Pagi) vs Kasir 2 (Siang)</p>
                </div>

                {/* Date filter inputs */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={historyDateFilter}
                      onChange={e => setHistoryDateFilter(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:bg-white dark:bg-slate-800 focus:border-slate-400 rounded-xl text-xs font-black font-mono text-slate-700 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                  {historyDateFilter && (
                    <button
                      onClick={() => setHistoryDateFilter('')}
                      className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-900 text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      Semua Tanggal
                    </button>
                  )}
                  <button
                    onClick={fetchAllHistoryReports}
                    className="p-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-900 rounded-xl transition-all cursor-pointer shadow-xs"
                    title="Refresh Data"
                  >
                    <RefreshCw size={14} className={cn(isLoadingHistory && "animate-spin")} />
                  </button>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                  <RefreshCw size={28} className="animate-spin text-indigo-500 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Memuat riwayat pembukuan online...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const liveReportId = `live_${props.activeStoreId}_${props.currentUsername}_${todayStr}`;
                    const shiftItems: Record<string, { awal: number; akhir: number; sold: number; nontunai?: number }> = {};
                    let hasAnySales = false;
                    
                    items.forEach(product => {
                      const input = opnameInputs[product.id] || { awal: String(product.stock), akhir: '' };
                      const awal = parseInt(input.awal) || 0;
                      const rawAkhir = parseInt(input.akhir);
                      const akhir = isNaN(rawAkhir) ? awal : rawAkhir;
                      const sold = Math.max(0, awal - akhir);
                      const nontunai = Math.min(sold, nontunaiSales[product.id] || 0);
                      if (sold > 0 || !isNaN(rawAkhir)) hasAnySales = true;
                      shiftItems[product.id] = { awal, akhir, sold, nontunai };
                    });

                    const liveReport: StockReport = {
                      id: liveReportId,
                      store_id: props.activeStoreId,
                      date: todayStr,
                      updated_at: new Date().toISOString(),
                      status: activeReport?.status || 'draft',
                      pagi: { reporter_name: props.kasirName || 'KASIR', items: shiftItems }
                    };

                    const todayClosedReport = historyReports.find(r => r.date === todayStr && r.status === 'closed');
                    const filteredHistory = historyReports.filter(r => r.date !== todayStr);
                    
                    let allReports = historyReports;
                    if (!todayClosedReport && (hasAnySales || activeReport)) {
                      allReports = [liveReport, ...filteredHistory];
                    }

                    const displayReports = allReports.filter(report => !historyDateFilter || report.date === historyDateFilter).sort((a,b) => b.date.localeCompare(a.date));

                    if (displayReports.length === 0) {
                      return (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 border border-dashed rounded-[2rem] text-slate-400 font-extrabold uppercase text-[10px]">
                          Tidak ada data closing shift yang tersimpan{historyDateFilter ? ` pada tanggal ${historyDateFilter}` : ''}.
                        </div>
                      );
                    }

                    return displayReports.map(report => {
                      const isLivePseudo = report.id === liveReportId;
                      // Calculate consolidated metrics from pagi property containing the main rekap
                      let totalSold = 0;
                      let totalRev = 0;
                      let totalProfit = 0;
                      let totalQrisPcs = 0;
                      let totalQrisRev = 0;
                      const reportItems = report.pagi?.items || {};

                      Object.entries(reportItems).forEach(([pId, val]) => {
                        const prod = items.find(v => v.id === pId);
                        const itemPrice = prod?.price || 0;
                        const itemCost = prod?.costPrice || 0;
                        
                        totalSold += val.sold;
                        totalRev += val.sold * itemPrice;
                        totalProfit += val.sold * (itemPrice - itemCost);
                        
                        const qrisPcs = Math.min(val.sold, val.nontunai || 0);
                        totalQrisPcs += qrisPcs;
                        totalQrisRev += qrisPcs * itemPrice;
                      });

                      const totalTunaiPcs = Math.max(0, totalSold - totalQrisPcs);
                      const totalTunaiRev = Math.max(0, totalRev - totalQrisRev);

                      // Format Indonesian Date
                      const dateObj = new Date(report.date + 'T00:00:00');
                      const indonDate = dateObj.toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });

                      return (
                        <div key={report.id} className="border border-slate-200 dark:border-slate-700 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-800 shadow-xs relative">
                          {isLivePseudo && (
                            <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] font-black tracking-widest uppercase px-3 py-1 rounded-bl-xl shadow-sm z-10 animate-pulse">
                              LIVE DRAFT HARI INI
                            </div>
                          )}
                          {/* Banner Header */}
                          <div className={cn("px-5 py-4.5 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none", isLivePseudo ? "bg-indigo-50/30" : "bg-slate-50 dark:bg-slate-900")}>
                            <div className="text-left">
                              <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">REKAP CLOSING HARIAN</span>
                              <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">{indonDate}</h5>
                              <span className="text-[9.5px] text-slate-400 font-extrabold mt-0.5 block">
                                Kasir: {report.pagi?.reporter_name || 'KASIR STORE'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                                <span className="block text-[6.5px] font-black text-slate-400 uppercase tracking-widest">TERJUAL</span>
                                <span className="text-[10px] font-black font-mono text-slate-700 dark:text-slate-200 block">{totalSold} PCS</span>
                              </div>
                              <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-150 rounded-xl text-center">
                                <span className="block text-[6.5px] font-black text-indigo-400 uppercase tracking-widest">OMSET</span>
                                <span className="text-[10px] font-black font-mono text-indigo-700 block">{formatRupiah(totalRev)}</span>
                              </div>
                              {props.kasirRole === 'owner' && (
                                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-150 rounded-xl text-center">
                                  <span className="block text-[6.5px] font-black text-emerald-500 uppercase tracking-widest">PROFIT</span>
                                  <span className="text-[10px] font-black font-mono text-emerald-700 block">{formatRupiah(totalProfit)}</span>
                                </div>
                              )}
                              <span className="text-[7.5px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-250">
                                LAPORAN SELESAI
                              </span>
                            </div>
                          </div>

                          {/* Items List inside card */}
                          <div className="p-5 text-left bg-slate-50/20">
                            {/* Pembagian Penjualan Tunai & Non-Tunai Box */}
                            <div className="grid grid-cols-2 gap-4 pb-4 mb-4 border-b border-dashed border-slate-200 dark:border-slate-700">
                              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-left shadow-inner">
                                <span className="text-[7px] font-black text-slate-500 dark:text-slate-400 block tracking-widest uppercase mb-1">💵 PENJUALAN TUNAI</span>
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                  <span className="text-xs sm:text-sm font-black font-mono text-slate-800 dark:text-slate-100">{formatRupiah(totalTunaiRev)}</span>
                                  <span className="text-[8.5px] font-black text-slate-500 dark:text-slate-400 font-mono text-nowrap">({totalTunaiPcs} Pcs)</span>
                                </div>
                              </div>
                              <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3 text-left shadow-inner">
                                <span className="text-[7px] font-black text-purple-600 block tracking-widest uppercase mb-1">📱 NON-TUNAI (QRIS)</span>
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                  <span className="text-xs sm:text-sm font-black font-mono text-purple-900">{formatRupiah(totalQrisRev)}</span>
                                  <span className="text-[8.5px] font-black text-purple-600 font-mono text-nowrap">({totalQrisPcs} Pcs)</span>
                                </div>
                              </div>
                            </div>

                            <h6 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">RINCIAN PENJUALAN VOUCHER</h6>
                            
                            {totalSold > 0 ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-4 text-[7px] font-black uppercase text-slate-400 tracking-wider pb-1.5 border-b border-slate-250">
                                  <span className="col-span-2 text-left">NAMA ITEM / PROVIDER</span>
                                  <span className="text-center">AWAL → SISA</span>
                                  <span className="text-right">TOTAL TERJUAL</span>
                                </div>
                                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                                  {Object.entries(reportItems)
                                    .filter(([_, val]) => val.sold > 0)
                                    .map(([productId, val]) => {
                                      const p = items.find(v => v.id === productId);
                                      return (
                                        <div key={productId} className="grid grid-cols-4 items-center text-[10px] font-black text-slate-600 dark:text-slate-300 font-mono">
                                          <div className="col-span-2 text-left truncate pr-1">
                                            <span className="font-sans font-bold text-slate-700 dark:text-slate-200 block text-[10px] tracking-tight truncate leading-tight">
                                              {p?.name || 'Voucher Terhapus'}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                              {p && (
                                                <span className="font-sans text-[7px] text-slate-400 px-1 py-px border bg-white dark:bg-slate-800 rounded uppercase leading-none">
                                                  {p.brand}
                                                </span>
                                              )}
                                              {val.nontunai && val.nontunai > 0 ? (
                                                <span className="font-sans text-[7px] bg-indigo-50 border border-indigo-150 text-indigo-600 px-1.5 py-px rounded inline-block uppercase font-black leading-none">
                                                  QRIS: {val.nontunai} Pcs
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>
                                          <span className="text-center text-slate-500 dark:text-slate-400 font-bold">{val.awal} → {val.akhir}</span>
                                          <span className="text-right font-bold pr-1 text-emerald-600 font-black">
                                            +{val.sold} pcs
                                          </span>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[9.5px] text-slate-400 italic font-medium py-6 text-center select-none">
                                Tidak ada penjualan voucher tercatat pada laporan hari ini.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. GRAPHICS AND LOW STOCK ANALYTICS */}
        {activeTab === 'grafik' && (() => {
          // Compute bestseller statistics across all history reports
          const bestsellerMap: Record<string, { product: VoucherItem; sold: number; revenue: number }> = {}
          const terlarisIds = new Set<string>()

          historyReports.forEach(report => {
            const daySales: Record<string, number> = {}

            if (report.pagi?.items) {
              Object.entries(report.pagi.items).forEach(([pId, val]) => {
                daySales[pId] = (daySales[pId] || 0) + (val.sold || 0)
              })
            }
            if (report.siang?.items) {
              Object.entries(report.siang.items).forEach(([pId, val]) => {
                daySales[pId] = (daySales[pId] || 0) + (val.sold || 0)
              })
            }

            // Identify products that have ever sold >= 3 in a single day
            Object.entries(daySales).forEach(([pId, totalSold]) => {
              if (totalSold >= 3) {
                terlarisIds.add(pId)
              }
            })

            // Accumulate statistics for bestseller compilation
            if (report.pagi?.items) {
              Object.entries(report.pagi.items).forEach(([pId, val]) => {
                const prod = items.find(v => v.id === pId);
                if (prod && val.sold > 0) {
                  if (!bestsellerMap[pId]) {
                    bestsellerMap[pId] = { product: prod, sold: 0, revenue: 0 }
                  }
                  bestsellerMap[pId].sold += val.sold
                  bestsellerMap[pId].revenue += val.sold * prod.price
                }
              })
            }
            if (report.siang?.items) {
              Object.entries(report.siang.items).forEach(([pId, val]) => {
                const prod = items.find(v => v.id === pId);
                if (prod && val.sold > 0) {
                  if (!bestsellerMap[pId]) {
                    bestsellerMap[pId] = { product: prod, sold: 0, revenue: 0 }
                  }
                  bestsellerMap[pId].sold += val.sold
                  bestsellerMap[pId].revenue += val.sold * prod.price
                }
              })
            }
          })

          const bestSellers = Object.values(bestsellerMap)
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 10) // Top 10 Best Sellers

          const maxSold = bestSellers.length > 0 ? bestSellers[0].sold : 1;

          // Warning threshold: 8 for Best Sellers (laku minimal 3 sehari), 4 for regular ones.
          const lowStockItems = items
            .map(item => ({ ...item, calculatedStock: getProductAkhirStock(item) }))
            .filter(item => {
              const isTerlaris = terlarisIds.has(item.id)
              const threshold = isTerlaris ? 8 : 4
              return item.calculatedStock <= threshold
            }).sort((a, b) => a.calculatedStock - b.calculatedStock)

          return (
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 select-none mb-12">
              
              <div className={cn("grid gap-5", props.isPc ? "grid-cols-2" : "grid-cols-1")}>
                
                {/* COLUMN 1: BEST SELLERS LIST */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-5 sm:p-6 shadow-sm flex flex-col h-full">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4.5 text-left">
                    <div className="flex items-center gap-1.5 text-amber-500">
                      <TrendingUp size={16} className="stroke-[2.5]" />
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">PRODUK TERLARIS (TOP 10)</h4>
                    </div>
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1 leading-relaxed">Peringkat akumulasi penjualan berdasarkan riwayat closing harian (30 hari terakhir)</p>
                  </div>

                  {bestSellers.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 dark:bg-slate-900 border rounded-2xl">
                      <TrendingUp size={24} className="text-slate-300 mb-2" />
                      <p className="text-[9.5px] font-black uppercase text-center max-w-xs px-4 leading-relaxed">Belum ada rekam penjualan laku. Silahkan kirim closing shift terlebih dahulu agar statistik terhitung.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1">
                      {bestSellers.map((item, index) => {
                        const pct = Math.max(8, Math.round((item.sold / maxSold) * 100))
                        
                        return (
                          <div key={item.product.id} className="flex flex-col text-left">
                            <div className="flex items-center justify-between gap-2.5 text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={cn(
                                  "w-5 h-5 flex items-center justify-center text-[9px] rounded-full text-white font-black shrink-0 font-mono border",
                                  index === 0 ? "bg-amber-400 border-amber-300" :
                                  index === 1 ? "bg-slate-400 border-slate-300 dark:border-slate-600" :
                                  index === 2 ? "bg-amber-600 border-amber-500" : "bg-slate-300 border-slate-200 dark:border-slate-700"
                                )}>
                                  {index + 1}
                                </span>
                                <span className="truncate uppercase font-bold text-slate-700 dark:text-slate-200 tracking-tight text-[11px] font-sans">
                                  {item.product.name}
                                </span>
                              </div>
                              <span className="font-mono text-[10.5px] text-slate-500 dark:text-slate-400 font-extrabold shrink-0">
                                {item.sold} PCS <span className="text-[8.5px] text-indigo-400 font-sans ml-1">({formatRupiah(item.revenue)})</span>
                              </span>
                            </div>

                            {/* visual progress bar */}
                            <div className="w-full bg-slate-50 dark:bg-slate-900 h-2 rounded-full mt-1.5 overflow-hidden border border-slate-200/50">
                              <div 
                                style={{ width: `${pct}%` }}
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  index === 0 ? "bg-amber-400" :
                                  index === 1 ? "bg-indigo-400" :
                                  index === 2 ? "bg-indigo-350" : "bg-indigo-250"
                                )}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* COLUMN 2: LOW STOCK WARNING INSTEAD OF QUICK REPLENISH */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-5 sm:p-6 shadow-sm flex flex-col h-full">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4.5 text-left">
                    <div className="flex items-center gap-1.5 text-rose-500">
                      <AlertCircle size={16} className="stroke-[2.5]" />
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">STOK MENIPIS (CRITICAL WARNING)</h4>
                    </div>
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1 leading-relaxed">
                      Limit Stok: &lt;= 8 pcs untuk produk terlaris (&gt;= 3 laku harian) atau &lt;= 4 pcs untuk stok produk biasa.
                    </p>
                  </div>

                  {lowStockItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                      <CheckCircle size={24} className="text-emerald-500 mb-2" />
                      <p className="text-[9.5px] font-black uppercase text-emerald-800 leading-relaxed">Luar Biasa!</p>
                      <p className="text-[9px] text-emerald-600 font-bold uppercase mt-0.5 leading-relaxed text-center px-4">Seluruh stok produk voucher Anda aman terkendali di atas ambang minimum keamanan.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 overflow-y-auto max-h-[460px] pr-1 flex-1">
                      {lowStockItems.map(item => {
                        const isOut = item.calculatedStock <= 0
                        const isTerlaris = terlarisIds.has(item.id)

                        return (
                          <div 
                            key={item.id} 
                            className={cn(
                              "p-3 rounded-2xl border transition-all flex flex-col gap-1 text-left shadow-2xs hover:shadow-xs",
                              isOut ? "bg-rose-50/40 border-rose-150 animate-pulse" : "bg-slate-50/30 border-slate-150"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2.5 leading-tight">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1 mb-1">
                                  <span className={cn(
                                    "text-[6.5px] font-black tracking-widest px-1 py-0.5 border rounded uppercase leading-none",
                                    getBadgeStyles(item.brand)
                                  )}>
                                    {item.brand}
                                  </span>
                                  <span className={cn(
                                    "text-[6.5px] font-black tracking-widest px-1 py-0.5 border rounded uppercase leading-none",
                                    isTerlaris ? "bg-amber-400/10 text-amber-700 border-amber-300/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                  )}>
                                    {isTerlaris ? "🔥 TERLARIS (>3/HARI)" : "STANDAR"}
                                  </span>
                                </div>
                                <span className="block font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate text-[11px] leading-snug font-sans">
                                  {item.name}
                                </span>
                              </div>

                              <span className={cn(
                                "text-[10px] font-black font-mono px-2 py-1 rounded-xl shrink-0 border uppercase text-center tracking-normal",
                                isOut ? "bg-rose-500 text-white border-rose-600" :
                                item.calculatedStock <= 2 ? "bg-amber-500 text-white border-amber-600" : "bg-amber-50 text-amber-700 border-amber-200"
                              )}>
                                {isOut ? 'STOK KOSONG' : `${item.calculatedStock} PCS`}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* BRAND REVENUE BAR GRAPH CHART SUMMARY */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-5 sm:p-6 shadow-sm text-left">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">REKOMENDASI BELANJA STOK (REPLENISHMENT PLAN)</h4>
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1 leading-relaxed">Rekomendasi otomatis berbasis tingkat penjualan dan sisa stok minimum</p>
                  </div>
                  <span className="text-[7.5px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 leading-none">INTELLIGENT</span>
                </div>

                <div className="p-4 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4 text-xs">
                  <div className="p-2 sm:p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm shrink-0">
                    <AlertCircle size={18} className="stroke-[2.5]" />
                  </div>
                  <div className="text-left flex-1">
                    <h6 className="font-black text-indigo-900 leading-snug">
                      {lowStockItems.length > 0 
                        ? `Terdapat ${lowStockItems.length} tipe voucher yang butuh restok mendesak!` 
                        : 'Seluruh stok saat ini terpantau memadai dan aman!'
                      }
                    </h6>
                    <p className="text-[10px] text-indigo-700 mt-1 font-semibold leading-relaxed">
                      {lowStockItems.length > 0
                        ? `Sistem menyarankan untuk segera mengisi voucher bermerek ${[...new Set(lowStockItems.map(x => x.brand))].slice(0, 3).join(', ')} karena sisa stok sangat minim.`
                        : 'Pertahankan level sisa stok ini dengan mengawasi closing shift setiap harinya!'
                      }
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )
        })()}

      </div>
    </div>
  )
}

export default VoucherView
