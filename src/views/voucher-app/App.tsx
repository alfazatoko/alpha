/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  Search, 
  Tag, 
  User, 
  Bell, 
  X, 
  Clock, 
  CheckCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  ChevronRight,
  Activity,
  Wifi,
  Battery,
  Flame,
  FileText,
  RotateCcw,
  Home,
  History,
  Menu,
  ShoppingCart,
  ClipboardList,
  ShieldCheck,
  Lock,
  Unlock,
  Shield,
  Settings,
  Sun,
  Moon,
  ArrowLeft,
  Package, 
  Minus, 
  Plus, 
  Banknote, 
  QrCode, 
  Zap, 
  PackageOpen,
  Info,
  LogOut,
  Palette
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Core types & data
import type { VoucherProduct, Cashier, Transaction, LiveNotification, ShiftHandover, DetailedHandoverRecord, UserRole } from './types';
import { INITIAL_PRODUCTS, INITIAL_CASHIERS, INITIAL_TRANSACTIONS, INITIAL_NOTIFICATIONS, INITIAL_DETAILED_HANDOVERS, OPERATOR_STYLES } from './data';

// Tab components
import DashboardTab from './components/DashboardTab';
import ProductsTab from './components/ProductsTab';
import SearchTab from './components/SearchTab';
import ProfileTab from './components/ProfileTab';
import LaporanTab from './components/LaporanTab';
import DetailProductView from './components/DetailProductView';
import AturStokTab from './components/AturStokTab';
import RiwayatTab from './components/RiwayatTab';
import LogAktivitasTab from './components/LogAktivitasTab';

interface VoucherAppProps {
  onExit?: () => void;
  externalRole?: 'owner' | 'kasir';
  externalCashierName?: string;
  activeStoreId?: string;
  googleUid?: string;
  kasirList?: Record<string, { name?: string; role?: string; pin?: string }>;
  externalSearchQuery?: string;
  externalTab?: string;
  onClearExternalTab?: () => void;
  onClearExternalSearchQuery?: () => void;
  /** Daftar semua toko milik user — untuk fitur salin produk antar toko */
  storeList?: Array<{ id: string; name: string; subtext?: string }>;
}

export default function App({ onExit, externalRole, externalCashierName, activeStoreId, googleUid, kasirList, externalSearchQuery, externalTab, onClearExternalTab, onClearExternalSearchQuery, storeList }: VoucherAppProps = {}) {
  // Navigation tabs (Home, Catalog, Search, Reports, Profile/Settings, Atur Stok, Riwayat)
  const [activeTab, setActiveTab] = useState<'beranda' | 'produk' | 'pencarian' | 'laporan' | 'profil' | 'stok' | 'riwayat' | 'notif'>('beranda');
  
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const isLight = theme === 'light';

  // Core Persistent States
  const [products, setProducts] = useState<VoucherProduct[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [shiftHandovers, setShiftHandovers] = useState<ShiftHandover[]>([]);
  const [detailedHandovers, setDetailedHandovers] = useState<DetailedHandoverRecord[]>([]);

  // ✅ SOLUSI 3: State banner "Stok Diterima" saat kasir penerima login
  const [pendingHandoverInfo, setPendingHandoverInfo] = useState<{
    fromCashierName: string;
    toCashierName: string;
    totalStockTransferred: number;
    timestamp: string;
  } | null>(null);

  // Role & Access Control States
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(externalRole || 'kasir');
  const [showRoleSidebar, setShowRoleSidebar] = useState(false);

  useEffect(() => {
    if (externalTab) {
      setActiveTab(externalTab as any);
      if (onClearExternalTab) onClearExternalTab();
    }
  }, [externalTab, onClearExternalTab]);

  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSaleSearchQuery(externalSearchQuery);
      setRestockSearchQuery(externalSearchQuery);
      if (onClearExternalSearchQuery) onClearExternalSearchQuery();
    }
  }, [externalSearchQuery, onClearExternalSearchQuery]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Shift & Cashier states
  const [cashiers, setCashiers] = useState<Cashier[]>(INITIAL_CASHIERS);
  const [activeCashierIndex, setActiveCashierIndex] = useState<number>(0);

  // Sync with external props from Host App
  // FIXED: 'cashiers' removed from deps to prevent infinite loop
  // Syncs `cashiers` list with `kasirList` from the host app (Owner settings)
  useEffect(() => {
    if (externalRole) setCurrentUserRole(externalRole);
    if (kasirList && Object.keys(kasirList).length > 0) {
      const newCashiers: Cashier[] = Object.entries(kasirList)
        .filter(([_, data]) => data.role !== 'owner')
        .map(([username, data], idx) => ({
          id: `c_${username}`,
          name: data.name || username,
          role: 'Kasir Shift',
          email: `${username.toLowerCase().replace(/\s/g, '')}@alfazacell.com`,
          avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(data.name || username),
          isOnline: true
        }));
      setCashiers(newCashiers);
      
      if (externalCashierName) {
        const idx = newCashiers.findIndex(c => c.name === externalCashierName);
        if (idx !== -1) setActiveCashierIndex(idx);
      }
    } else if (externalCashierName) {
      setCashiers(prev => {
        const idx = prev.findIndex(c => c.name === externalCashierName);
        if (idx !== -1) {
          setActiveCashierIndex(idx);
          return prev;
        } else {
          const newCashier: Cashier = { 
            id: `c${prev.length + 1}`, 
            name: externalCashierName, 
            role: 'Kasir Shift', 
            email: `${externalCashierName.toLowerCase().replace(/\s/g, '')}@alfazacell.com`,
            avatar: 'https://ui-avatars.com/api/?name=' + externalCashierName,
            isOnline: true 
          };
          setActiveCashierIndex(prev.length);
          return [...prev, newCashier];
        }
      });
    }
  }, [externalRole, externalCashierName, kasirList]);

  // ✅ SOLUSI 3: Cek flag pending_handover saat kasir aktif berubah
  // Jika ada flag, tampilkan banner sekali lalu hapus flag tersebut
  useEffect(() => {
    const storeKey = activeStoreId || 'default';
    const cashierId = cashiers[activeCashierIndex]?.id;
    if (!cashierId) return;
    const flagKey = `v_${storeKey}_${cashierId}_pending_handover`;
    try {
      const raw = localStorage.getItem(flagKey);
      if (raw) {
        const flag = JSON.parse(raw);
        setPendingHandoverInfo(flag);
        // Hapus flag agar tidak muncul lagi saat refresh
        localStorage.removeItem(flagKey);
      } else {
        setPendingHandoverInfo(null);
      }
    } catch {
      setPendingHandoverInfo(null);
    }
  }, [activeCashierIndex, cashiers, activeStoreId]);

  // Detail view context routing state
  const [selectedProduct, setSelectedProduct] = useState<VoucherProduct | null>(null);

  // Notification / Toast UI
  const [showNotificationDrop, setShowNotificationDrop] = useState(false);
  const [latestToast, setLatestToast] = useState<LiveNotification | null>(null);

  // Modals / Overlays
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [showQuickRestock, setShowQuickRestock] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showHandoverSuccessOverlay, setShowHandoverSuccessOverlay] = useState(false);

  // External event listener to trigger Quick Sale from Beranda
  useEffect(() => {
    const handleOpenQuickSaleEvent = () => {
      setSaleSearchQuery('');
      setSaleSelectedOperator('SEMUA');
      setFormPaymentMethod('NON_TUNAI'); // default to NON TUNAI as requested by user
      setFormQuantity(1);
      setFormNote('');
      setShowQuickSale(true);
    };
    window.addEventListener('open-voucher-quick-sale', handleOpenQuickSaleEvent);
    return () => window.removeEventListener('open-voucher-quick-sale', handleOpenQuickSaleEvent);
  }, []);

  // Global Keyboard Shortcuts for Quick Sale
  useEffect(() => {
    if (!showQuickSale) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // If the user presses Enter while focused on a button (like + or TUNAI),
        // we override it to confirm the sale instead, unless it's the cancel button.
        if (e.target instanceof HTMLButtonElement && e.target.id === 'btn-cancel-quick-sale') {
          return; // Let cancel button work normally
        }
        
        e.preventDefault();
        document.getElementById('btn-confirm-quick-sale')?.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQuickSale]);
  const [handoverSuccessSummary, setHandoverSuccessSummary] = useState<ShiftHandover | null>(null);

  // Quick Action Forms Fields
  const [formProductId, setFormProductId] = useState('');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formNote, setFormNote] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'TUNAI' | 'NON_TUNAI' | 'QRIS' | 'TRANSFER'>('TUNAI');
  const [saleSearchQuery, setSaleSearchQuery] = useState('');
  const [restockSearchQuery, setRestockSearchQuery] = useState('');
  const [saleSelectedOperator, setSaleSelectedOperator] = useState<string>('SEMUA');
  const [restockSelectedOperator, setRestockSelectedOperator] = useState<string>('SEMUA');

  // List of operator options for quick filtering
  const OPERATOR_CHIPS = [
    { id: 'SEMUA', label: 'SEMUA', opValue: 'SEMUA' },
    { id: 'AXIS', label: 'AXIS', opValue: 'AXIS' },
    { id: 'XL', label: 'XL', opValue: 'XL' },
    { id: 'TSEL', label: 'TSEL', opValue: 'TELKOMSEL' },
    { id: 'INDOSAT', label: 'INDOSAT', opValue: 'INDOSAT' },
    { id: 'TRI', label: 'TRI', opValue: 'TRI' },
    { id: 'SMARTFREN', label: 'SMARTFREN', opValue: 'SMARTFREN' },
  ];

  // Helper filter matching operator & product title with fuzzy multi-word support
  const filterProductsByOperatorAndTitle = (
    productList: VoucherProduct[],
    selectedOpValue: string,
    query: string
  ) => {
    let list = productList;
    if (selectedOpValue && selectedOpValue !== 'SEMUA') {
      list = list.filter((p) => {
        const pOp = p.operator.toUpperCase();
        const targetOp = selectedOpValue.toUpperCase();
        return pOp === targetOp || (targetOp === 'TELKOMSEL' && pOp === 'TSEL') || (targetOp === 'TSEL' && pOp === 'TELKOMSEL');
      });
    }

    if (!query.trim()) return list;
    const cleanQuery = query.toLowerCase().trim();
    const compactQuery = cleanQuery.replace(/[\s-_]+/g, '');
    const words = cleanQuery.split(/[\s-_]+/).filter(Boolean);

    return list.filter((p) => {
      const nameLower = p.name.toLowerCase();
      const nameCompact = nameLower.replace(/[\s-_]+/g, '');
      const opLower = p.operator.toLowerCase();
      const descLower = (p.description || '').toLowerCase();
      const full = `${nameLower} ${opLower} ${descLower}`;
      const fullCompact = full.replace(/[\s-_]+/g, '');

      // Check compact substring (e.g. "axis1hari" in "axis6gb1hari")
      if (nameCompact.includes(compactQuery) || fullCompact.includes(compactQuery)) return true;

      // Check all separate words match
      return words.every(w => full.includes(w) || fullCompact.includes(w));
    });
  };

  // Live clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Audio Context reference
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load state from localStorage on mount & when cashier changes
  useEffect(() => {
    const storeKey = activeStoreId || 'default';
    const cashierId = cashiers[activeCashierIndex]?.id || 'c1';
    const prefix = `v_${storeKey}_${cashierId}`;
    // ✅ SOLUSI 1: detailedHandovers kini GLOBAL per-toko (bukan per-kasir)
    // Key: v_${storeKey}_all_detailed_handovers
    // Semua kasir dalam satu toko berbagi riwayat serah terima yang sama
    const globalDetailedHandoversKey = `v_${storeKey}_all_detailed_handovers`;

    const cachedProducts = localStorage.getItem(`${prefix}_products`);
    const cachedTransactions = localStorage.getItem(`${prefix}_transactions`);
    const cachedNotifications = localStorage.getItem(`${prefix}_notifications`);
    const cachedHandovers = localStorage.getItem(`${prefix}_handovers`);
    // Baca dari global key; fallback ke per-cashier key lama (migrasi data lama)
    const cachedDetailedHandovers =
      localStorage.getItem(globalDetailedHandoversKey) ||
      localStorage.getItem(`${prefix}_detailed_handovers`);
    const cachedLastResetDate = localStorage.getItem(`v_${storeKey}_last_reset_date`);
    const cachedTheme = localStorage.getItem('v_theme') as 'dark' | 'light' | null;

    let loadedProducts = cachedProducts ? JSON.parse(cachedProducts) : INITIAL_PRODUCTS;
    let loadedTransactions = cachedTransactions ? JSON.parse(cachedTransactions) : INITIAL_TRANSACTIONS;
    let loadedNotifications = cachedNotifications ? JSON.parse(cachedNotifications) : INITIAL_NOTIFICATIONS;
    let loadedHandovers = cachedHandovers ? JSON.parse(cachedHandovers) : [];
    let loadedDetailedHandovers = cachedDetailedHandovers ? JSON.parse(cachedDetailedHandovers) : INITIAL_DETAILED_HANDOVERS;

    // Daily Reset Check (Store wide, not just per cashier)
    const today = new Date().toLocaleDateString('id-ID');
    if (cachedLastResetDate && cachedLastResetDate !== today) {
      loadedTransactions = [];
      loadedNotifications = [
        {
          id: `notif-reset-${Date.now()}`,
          type: 'info',
          title: 'Awal Buku Baru',
          message: `Sistem telah mereset Saldo Laci & Omzet ke Rp 0 untuk tanggal ${today}. Selamat berjualan!`,
          timestamp: new Date().toISOString(),
          isRead: false
        }
      ];
      localStorage.setItem(`${prefix}_transactions`, JSON.stringify([]));
      localStorage.setItem(`${prefix}_notifications`, JSON.stringify(loadedNotifications));
      localStorage.setItem(`v_${storeKey}_last_reset_date`, today);
    } else if (!cachedLastResetDate) {
      localStorage.setItem(`v_${storeKey}_last_reset_date`, today);
    }

    setProducts(loadedProducts);
    setTransactions(loadedTransactions);
    setNotifications(loadedNotifications);
    setShiftHandovers(loadedHandovers);
    setDetailedHandovers(loadedDetailedHandovers);
    if (cachedTheme) setTheme(cachedTheme);

    // If online mode is active, fetch from cloud
    if (activeStoreId) {
      supabase.from('store_settings').select('voucher_app_data').eq('store_id', activeStoreId).maybeSingle().then(({ data }) => {
        if (data && data.voucher_app_data) {
          const cashierData = data.voucher_app_data[cashierId];
          // ✅ SOLUSI 1: Baca all_detailed_handovers dari level toko (bukan per-kasir)
          const cloudGlobalDetailedHandovers = data.voucher_app_data['all_detailed_handovers'];
          if (cloudGlobalDetailedHandovers) setDetailedHandovers(cloudGlobalDetailedHandovers);
          if (cashierData) {
            if (cashierData.products) setProducts(cashierData.products);
            if (cashierData.transactions) setTransactions(cashierData.transactions);
            if (cashierData.notifications) setNotifications(cashierData.notifications);
            if (cashierData.handovers) setShiftHandovers(cashierData.handovers);
            // detailedHandovers per-kasir lama sudah diprioritaskan ke global; skip
          } else if (!cachedProducts && data.voucher_app_data.products) {
            setProducts(data.voucher_app_data.products);
          }
        }
      });
    }
  }, [activeStoreId, activeCashierIndex]);

  // Push to Supabase on every change (Debounced)
  useEffect(() => {
    const storeKey = activeStoreId || 'default';
    const cashierId = cashiers[activeCashierIndex]?.id || 'c1';
    const prefix = `v_${storeKey}_${cashierId}`;
    const globalDetailedHandoversKey = `v_${storeKey}_all_detailed_handovers`;

    // Save locally per-store & per-cashier
    localStorage.setItem(`${prefix}_products`, JSON.stringify(products));
    localStorage.setItem(`${prefix}_transactions`, JSON.stringify(transactions));
    localStorage.setItem(`${prefix}_notifications`, JSON.stringify(notifications));
    localStorage.setItem(`${prefix}_handovers`, JSON.stringify(shiftHandovers));
    // ✅ SOLUSI 1: Simpan detailedHandovers ke key GLOBAL (per-toko)
    localStorage.setItem(globalDetailedHandoversKey, JSON.stringify(detailedHandovers));

    if (!activeStoreId) return;

    // Debounced save to Supabase
    const timeout = setTimeout(() => {
      supabase.from('store_settings').select('voucher_app_data').eq('store_id', activeStoreId).maybeSingle().then(({ data }) => {
        const existingData = data?.voucher_app_data || {};
        const newData = {
          ...existingData,
          // ✅ SOLUSI 1: all_detailed_handovers disimpan di level toko (bukan per-kasir)
          all_detailed_handovers: detailedHandovers,
          [cashierId]: {
            products,
            transactions,
            notifications,
            handovers: shiftHandovers
            // detailedHandovers TIDAK disimpan per-kasir lagi
          }
        };
        supabase.from('store_settings').upsert({
          store_id: activeStoreId,
          voucher_app_data: newData
        }, { onConflict: 'store_id' }).then(({ error }) => {
          if (error) console.error("Error syncing voucher app data to supabase", error);
        });
      });
    }, 2500);

    return () => clearTimeout(timeout);
  }, [products, transactions, notifications, shiftHandovers, detailedHandovers, activeStoreId, activeCashierIndex]);

  // Watch for day change while app is open
  useEffect(() => {
    const checkDayChange = setInterval(() => {
      const storeKey = activeStoreId || 'default';
      const today = new Date().toLocaleDateString('id-ID');
      // FIXED: Use the correct scoped key (v_${storeKey}_last_reset_date)
      // Previously used 'v_last_reset_date' (wrong key) which could trigger
      // unexpected reloads if stale value existed from old sessions.
      const cachedLastResetDate = localStorage.getItem(`v_${storeKey}_last_reset_date`);
      if (cachedLastResetDate && cachedLastResetDate !== today) {
        // Instead of hard reload, just update state gracefully
        setTransactions([]);
        localStorage.setItem(`v_${storeKey}_last_reset_date`, today);
      }
    }, 60000); // Check every minute
    return () => clearInterval(checkDayChange);
  }, [activeStoreId]);

  // Save states helper
  const saveState = (
    updatedProducts: VoucherProduct[], 
    updatedTrx: Transaction[], 
    updatedNotifs: LiveNotification[], 
    updatedHandovers?: ShiftHandover[],
    updatedDetailedHandovers?: DetailedHandoverRecord[]
  ) => {
    // (Saving is now handled by the global debounced useEffect)
  };

  // Clock trigger
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Soft synth sound cue
  const playBeep = (freq = 600, duration = 0.15) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio blocked or failed
    }
  };

  // Push Notifications with custom real-time messaging
  const pushNotification = (
    type: 'info' | 'warning' | 'success' | 'transfer', 
    title: string, 
    message: string, 
    list: LiveNotification[],
    metadata?: LiveNotification['metadata']
  ) => {
    const newNotif: LiveNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
      metadata
    };

    const updated = [newNotif, ...list];
    setNotifications(updated);
    setLatestToast(newNotif);

    if (type === 'warning') playBeep(380, 0.35);
    else if (type === 'transfer') playBeep(720, 0.28);
    else playBeep(580, 0.12);

    setTimeout(() => {
      setLatestToast(prev => prev?.id === newNotif.id ? null : prev);
    }, 5000);

    return updated;
  };

  const handleBulkUpdateProductStock = (updates: { productId: string, newStock: number, subReason?: 'penjualan' | 'audit' }[]) => {
    let currentProducts = [...products];
    let currentTransactions = [...transactions];
    let currentNotifications = [...notifications];

    updates.forEach(update => {
      const p = currentProducts.find(prod => prod.id === update.productId);
      if (p && p.currentStock !== update.newStock) {
        const delta = update.newStock - p.currentStock;
        const isAudit = update.subReason === 'audit';
        
        // Push notification
        const newNotif: LiveNotification = {
          id: `notif-${Date.now()}-${Math.random()}`,
          type: isAudit ? "warning" : "success",
          title: isAudit ? "SELISIH AUDIT" : "UPDATE STOK",
          message: isAudit 
            ? `${activeCashier.name} melaporkan selisih: "${p.name}" berkurang ${Math.abs(delta)} pcs (Barang Hilang).`
            : `${activeCashier.name} mengupdate stok "${p.name}" menjadi ${update.newStock} pcs.`,
          timestamp: new Date().toISOString(),
          isRead: false,
          metadata: {
            oldStock: p.currentStock,
            newStock: update.newStock,
            delta,
            productId: p.id,
            productName: p.name,
            cashierName: activeCashier.name,
            unitPrice: p.sellingPrice,
            reason: "audit",
            subReason: update.subReason || (delta < 0 ? "penjualan" : "restock")
          }
        };
        currentNotifications = [newNotif, ...currentNotifications];

        // Create transaction log if it's a significant change
        const newTrx: Transaction = {
          id: `trx-${Date.now()}-${Math.random()}`,
          type: 'EDIT_STOK',
          productId: p.id,
          productName: p.name,
          quantity: Math.abs(delta),
          // If it's an audit loss, it doesn't add to cash revenue
          amount: isAudit ? 0 : p.sellingPrice * Math.abs(delta),
          cashierName: activeCashier.name,
          timestamp: new Date().toISOString(),
          notes: delta > 0 
            ? `Selisih bertambah ${delta}` 
            : `Selisih kurang ${Math.abs(delta)}${isAudit ? ' (Audit Hilang)' : ''}`
        };
        currentTransactions = [newTrx, ...currentTransactions];

        // Update product in the temp list
        currentProducts = currentProducts.map(prod => prod.id === p.id ? { ...prod, currentStock: update.newStock } : prod);
      }
    });

    setProducts(currentProducts);
    setTransactions(currentTransactions);
    setNotifications(currentNotifications);
  };

  const activeCashier = cashiers[activeCashierIndex] || cashiers[0];
  const nextCashier = cashiers[activeCashierIndex === 0 ? 1 : 0] || cashiers[1];

  // Manual & quick stock modifier
  const handleAdjustStock = (productId: string, quantity: number, type: 'RESTOCK' | 'PENJUALAN', note: string, skipStockUpdate: boolean = false, subReason?: 'penjualan' | 'audit', paymentMethod: 'TUNAI' | 'QRIS' | 'TRANSFER' | 'NON_TUNAI' = 'TUNAI') => {
    let updatedNotifs = [...notifications];
    const targetProduct = products.find(p => p.id === productId);
    
    if (skipStockUpdate && type === 'PENJUALAN') {
      const totalAmount = (targetProduct?.sellingPrice || 0) * quantity;
      updatedNotifs = pushNotification(
        'transfer',
        'Catatan Penjualan Voucher Digital',
        `Berhasil mencatat dana NON-TUNAI/QRIS sebesar Rp ${totalAmount.toLocaleString('id-ID')} untuk ${quantity} pcs "${targetProduct?.name || 'Voucher'}". Catatan: Transaksi ini hanya mencatat saldo digital tanpa mengurangi stok fisik sistem.`,
        updatedNotifs
      );
    }

    let updatedProducts = products;
    if (!skipStockUpdate) {
      updatedProducts = products.map(p => {
        if (p.id === productId) {
          const delta = type === 'RESTOCK' ? quantity : -quantity;
          const nextStock = p.currentStock + delta;
          const oldStock = p.currentStock;
          
          if (type === 'PENJUALAN' && nextStock === 0) {
            updatedNotifs = pushNotification(
              'warning',
              'STOK HABIS (0)!',
              `Voucher "${p.name}" sudah HABIS TOTAL (0 pcs). Segera RESTOCK sekarang!`,
              updatedNotifs
            );
          } else if (type === 'PENJUALAN' && nextStock <= p.minStockLevel) {
            updatedNotifs = pushNotification(
              'warning',
              'Stok Voucher Rendah!',
              `Voucher "${p.name}" tersisa ${nextStock} pcs. Restock disarankan.`,
              updatedNotifs
            );
          }

          if (type === 'RESTOCK') {
            updatedNotifs = pushNotification(
              'success',
              'TAMBAH STOK',
              `${activeCashier.name} telah menambahkan stok baru sebanyak ${quantity} pcs (Owner Supply).`,
              updatedNotifs,
              {
                oldStock,
                newStock: nextStock,
                delta: quantity,
                productId: p.id,
                productName: p.name,
                cashierName: activeCashier.name,
                unitPrice: p.sellingPrice,
                reason: 'restock'
              }
            );
          } else {
            const isAudit = subReason === 'audit';
            updatedNotifs = pushNotification(
              isAudit ? 'warning' : 'info',
              isAudit ? 'SELISIH STOK' : 'Voucher Terjual',
              isAudit 
                ? `Audit selisih: Stok "${p.name}" dikurangi ${quantity} pcs (Tidak menambah omzet).`
                : `Berhasil mencatat penjualan ${quantity} pcs Voucher "${p.name}" (${note}).`,
              updatedNotifs,
              {
                oldStock,
                newStock: nextStock,
                delta: -quantity,
                productId: p.id,
                productName: p.name,
                cashierName: activeCashier.name,
                unitPrice: p.sellingPrice,
                reason: isAudit ? 'audit' : 'sale',
                subReason: isAudit ? 'audit' : 'penjualan'
              }
            );
          }

          return { ...p, currentStock: nextStock };
        }
        return p;
      });
    }

    const newTrx: Transaction = {
      id: `trx-${Date.now()}`,
      type,
      productId,
      productName: targetProduct?.name || 'Voucher',
      quantity,
      // RESTOCK from owner doesn't touch cashier money
      amount: type === 'RESTOCK' ? 0 : (targetProduct?.sellingPrice || 0) * quantity,
      cogs: type === 'PENJUALAN' ? (targetProduct?.costPrice || 0) * quantity : undefined,
      cashierName: activeCashier.name,
      timestamp: new Date().toISOString(),
      notes: note,
      paymentMethod: type === 'PENJUALAN' ? paymentMethod : undefined
    };

    const updatedTrx = [newTrx, ...transactions];
    
    setProducts(updatedProducts);
    setTransactions(updatedTrx);

    // Keep active selectedProduct in details view updated
    if (selectedProduct && selectedProduct.id === productId && !skipStockUpdate) {
      setSelectedProduct({
        ...selectedProduct,
        currentStock: selectedProduct.currentStock + (type === 'RESTOCK' ? quantity : -quantity)
      });
    }
  };

  const handleQuickAdjustStock = (productId: string, delta: number) => {
    const isSale = delta < 0;
    const absDelta = Math.abs(delta);
    handleAdjustStock(
      productId,
      absDelta,
      isSale ? 'PENJUALAN' : 'RESTOCK',
      isSale ? 'Penyesuaian penjualan' : 'Restock cepat'
    );
  };

  const handleAddProduct = (newProductData: Omit<VoucherProduct, 'id'>) => {
    const newProduct: VoucherProduct = {
      ...newProductData,
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 100000)}`
    };

    const newTransaction: Transaction = {
      id: `trx-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      type: 'TAMBAH_STOK',
      productId: newProduct.id,
      productName: newProduct.name,
      quantity: newProduct.currentStock,
      amount: newProduct.costPrice * newProduct.currentStock,
      cashierName: activeCashier.name,
      timestamp: new Date().toISOString(),
      notes: 'Pendaftaran voucher baru'
    };

    // Use functional updater to avoid stale closure issues
    setProducts(prev => [newProduct, ...prev]);
    setTransactions(prev => [newTransaction, ...prev]);

    pushNotification(
      'success',
      'Voucher Terdaftar',
      `Voucher "${newProduct.name}" berhasil dimasukkan ke sistem.`,
      notifications
    );
  };

  /**
   * handleBulkAddProducts — Menambahkan banyak produk sekaligus dalam SATU setState call.
   * Ini solusi untuk bug di mana forEach + onAddProduct hanya menyimpan produk terakhir
   * karena React mem-batch update state dan setiap call closure membaca state lama (stale closure).
   */
  const handleBulkAddProducts = (productsData: Omit<VoucherProduct, 'id'>[]) => {
    if (!productsData || productsData.length === 0) return;

    const now = Date.now();
    const cashierName = activeCashier.name;

    // Buat semua produk baru dengan ID unik
    const newProducts: VoucherProduct[] = productsData.map((data, index) => ({
      ...data,
      id: `prod-${now}-${index}-${Math.floor(Math.random() * 100000)}`
    }));

    // Buat semua transaksi log sekaligus
    const newTransactions: Transaction[] = newProducts.map((p, index) => ({
      id: `trx-${now}-${index}-${Math.floor(Math.random() * 100000)}`,
      type: 'TAMBAH_STOK' as const,
      productId: p.id,
      productName: p.name,
      quantity: p.currentStock,
      amount: p.costPrice * p.currentStock,
      cashierName,
      timestamp: new Date().toISOString(),
      notes: 'Ditambahkan via upload massal'
    }));

    // Satu atomic setState call — tidak ada stale closure, semua produk tersimpan
    setProducts(prev => [...newProducts, ...prev]);
    setTransactions(prev => [...newTransactions, ...prev]);

    pushNotification(
      'success',
      `${newProducts.length} Voucher Ditambahkan`,
      `Berhasil mendaftarkan ${newProducts.length} produk voucher baru ke sistem secara massal.`,
      notifications
    );
  };

  const handleUpdateProduct = (updatedProduct: VoucherProduct) => {
    const oldProduct = products.find(p => p.id === updatedProduct.id);
    const updatedProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    
    let updatedTransactions = [...transactions];
    // If stock changed during edit, log it
    if (oldProduct && oldProduct.currentStock !== updatedProduct.currentStock) {
      const stockDiff = updatedProduct.currentStock - oldProduct.currentStock;
      const newTransaction: Transaction = {
        id: `trx-${Date.now()}`,
        type: 'EDIT_STOK',
        productId: updatedProduct.id,
        productName: updatedProduct.name,
        quantity: Math.abs(stockDiff),
        amount: updatedProduct.costPrice * Math.abs(stockDiff),
        cashierName: activeCashier.name,
        timestamp: new Date().toISOString(),
        notes: `Edit stok (${stockDiff > 0 ? '+' : ''}${stockDiff})`
      };
      updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
    }

    const updatedNotifs = pushNotification(
      'success',
      'Informasi Diperbarui',
      `Perubahan voucher "${updatedProduct.name}" berhasil disimpan.`,
      notifications
    );

    setProducts(updatedProducts);

    if (selectedProduct && selectedProduct.id === updatedProduct.id) {
      setSelectedProduct(updatedProduct);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    const targetProduct = products.find(p => p.id === productId);
    const updatedProducts = products.filter(p => p.id !== productId);
    const updatedNotifs = pushNotification(
      'info',
      'Voucher Dihapus',
      `Voucher "${targetProduct?.name || ''}" dihapus dari sistem.`,
      notifications
    );

    setProducts(updatedProducts);

    if (selectedProduct && selectedProduct.id === productId) {
      setSelectedProduct(null);
    }
  };

  // Tutup Shift / Serah Terima — TIDAK mengganti kasir aktif
  // Hanya mencatat handover record ke riwayat & localStorage
  const handleExecuteShiftHandover = (
    customNotes: string,
    toCashierIdOverride?: string,
    toCashierNameOverride?: string,
    finalProductsOverride?: VoucherProduct[]
  ) => {
    const storeKey = activeStoreId || 'default';
    const finalProducts = finalProductsOverride || products;
    const totalProductsCount = finalProducts.length;
    const totalStockTransferred = finalProducts.reduce((acc, p) => acc + p.currentStock, 0);
    const inventoryValue = finalProducts.reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0);

    const fromCashierName = activeCashier.name;
    const toCashierId = toCashierIdOverride || nextCashier.id;
    const toCashierName = toCashierNameOverride || nextCashier.name;

    const newHandover: ShiftHandover = {
      id: `handover-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromCashierId: activeCashier.id,
      fromCashierName,
      toCashierId,
      toCashierName,
      totalProductsCount,
      totalStockTransferred,
      inventoryValue,
      status: 'Berhasil Diserahterimakan',
      notes: customNotes || 'Serah terima tutup shift kasir'
    };

    const updatedHandovers = [newHandover, ...shiftHandovers];

    const newTrx: Transaction = {
      id: `trx-handover-${Date.now()}`,
      type: 'SERAH_TERIMA',
      quantity: totalStockTransferred,
      amount: inventoryValue,
      cashierName: fromCashierName,
      timestamp: new Date().toISOString(),
      notes: `Serah terima ke ${toCashierName}. Notes: ${newHandover.notes}`
    };

    const updatedTrx = [newTrx, ...transactions];

    const updatedNotifs = pushNotification(
      'transfer',
      'Serah Terima Berhasil!',
      `Stok ${totalStockTransferred} voucher telah diserahkan dari ${fromCashierName} ke ${toCashierName}. ${fromCashierName} tetap login.`,
      notifications
    );

    // ✅ Salin produk dengan stok akhir ke storage kasir penerima
    // Saat kasir penerima login nanti, stoknya sudah terisi otomatis
    const toPrefix = `v_${storeKey}_${toCashierId}`;
    // Ambil produk yang sudah ada di kasir penerima (jika ada), lalu update stoknya
    const existingToProducts = (() => {
      try {
        const raw = localStorage.getItem(`${toPrefix}_products`);
        return raw ? JSON.parse(raw) as VoucherProduct[] : null;
      } catch { return null; }
    })();

    // Buat daftar produk kasir penerima: ambil stok dari hasil serah terima
    const productsForReceiver: VoucherProduct[] = finalProducts.map(p => {
      const existingP = existingToProducts?.find(ep => ep.id === p.id);
      return existingP
        ? { ...existingP, currentStock: p.currentStock } // update stok, pertahankan data lain
        : { ...p }; // copy penuh jika belum ada
    });

    // Simpan produk yang sudah diupdate ke storage kasir penerima
    localStorage.setItem(`${toPrefix}_products`, JSON.stringify(productsForReceiver));

    // Catat transaksi handover di log kasir penerima juga
    const existingToTrx = (() => {
      try {
        const raw = localStorage.getItem(`${toPrefix}_transactions`);
        return raw ? JSON.parse(raw) as Transaction[] : [];
      } catch { return []; }
    })();
    const receiverOpeningTrx: Transaction = {
      id: `trx-opening-${Date.now()}`,
      type: 'SERAH_TERIMA',
      quantity: totalStockTransferred,
      amount: inventoryValue,
      cashierName: toCashierName,
      timestamp: new Date().toISOString(),
      notes: `Menerima serah terima stok dari ${fromCashierName}. Stok awal shift: ${totalStockTransferred} pcs.`
    };
    localStorage.setItem(`${toPrefix}_transactions`, JSON.stringify([receiverOpeningTrx, ...existingToTrx]));

    // ✅ SOLUSI 2: Reset stok kasir PENGIRIM ke 0 setelah serah terima
    // Riwayat historis tetap aman di detailedHandovers & transactions
    const zeroedProducts: VoucherProduct[] = products.map(p => ({ ...p, currentStock: 0 }));
    const fromPrefix = `v_${storeKey}_${activeCashier.id}`;
    localStorage.setItem(`${fromPrefix}_products`, JSON.stringify(zeroedProducts));
    setProducts(zeroedProducts);

    // ✅ SOLUSI 3: Tulis flag "pending handover" ke storage kasir penerima
    // Saat kasir penerima login, flag ini dibaca dan banner ditampilkan sekali
    const pendingHandoverFlag = {
      fromCashierName,
      toCashierName,
      totalStockTransferred,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(`${toPrefix}_pending_handover`, JSON.stringify(pendingHandoverFlag));

    // ✅ TIDAK mengganti activeCashierIndex — kasir yang login tetap sama
    setShiftHandovers(updatedHandovers);
    setTransactions(updatedTrx);
    setNotifications(updatedNotifs);

    setHandoverSuccessSummary(newHandover);
    setShowHandoverSuccessOverlay(true);
    setShowHandoverModal(false);
  };

  const handleQuickSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId) return;
    
    const finalNote = `[${formPaymentMethod}]${formNote ? ' ' + formNote : ''}`;
    
    handleAdjustStock(
      formProductId,
      formQuantity,
      'PENJUALAN',
      finalNote,
      true, // skipStockUpdate = true: Jual cepat hanya mencatat transaksi, tidak memotong stok fisik sistem
      undefined,
      formPaymentMethod
    );

    setFormProductId('');
    setFormQuantity(1);
    setFormNote('');
    setFormPaymentMethod('TUNAI');
    setShowQuickSale(false);
  };

  const handleQuickRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId) return;

    handleAdjustStock(
      formProductId,
      formQuantity,
      'RESTOCK',
      formNote || 'Input restock supplier'
    );

    setFormProductId('');
    setFormQuantity(1);
    setFormNote('');
    setShowQuickRestock(false);
  };

  const handleSeedDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setShiftHandovers([]);
    setActiveCashierIndex(0);
    
    const storeKey = activeStoreId || 'default';
    localStorage.removeItem(`v_${storeKey}_c1_products`);
    localStorage.removeItem(`v_${storeKey}_c1_transactions`);
    localStorage.removeItem(`v_${storeKey}_c1_notifications`);
    localStorage.removeItem(`v_${storeKey}_c1_handovers`);
    localStorage.removeItem(`v_${storeKey}_c1_detailed_handovers`);
    localStorage.removeItem(`v_${storeKey}_c2_products`);
    localStorage.removeItem(`v_${storeKey}_c2_transactions`);
    localStorage.removeItem(`v_${storeKey}_c2_notifications`);
    localStorage.removeItem(`v_${storeKey}_c2_handovers`);
    localStorage.removeItem(`v_${storeKey}_c2_detailed_handovers`);
    localStorage.removeItem(`v_${storeKey}_cashier_idx`);
    localStorage.setItem(`v_${storeKey}_cashier_idx`, '0');

    // Also clear from Supabase if online
    if (activeStoreId) {
      supabase.from('store_settings').upsert({
        store_id: activeStoreId,
        voucher_app_data: null
      }, { onConflict: 'store_id' });
    }
    
    // Force reload to completely wipe memory state
    window.location.reload(); 
  };

  const handleClearAllData = () => {
    setProducts([]);
    setTransactions([]);
    setNotifications([]);
    setShiftHandovers([]);
    setActiveCashierIndex(0);
    localStorage.clear();
  };

  const handleImportBackup = (data: any) => {
    if (data.products) setProducts(data.products);
    if (data.transactions) setTransactions(data.transactions);
    if (data.handovers) setShiftHandovers(data.handovers);
    
    saveState(data.products || [], data.transactions || [], notifications, data.handovers || []);
  };

  const handleSwitchRole = (role: UserRole) => {
    if (role === 'owner' && currentUserRole !== 'owner') {
      setShowPinModal(true);
      setPinInput('');
      setPinError(false);
    } else if (role === 'kasir') {
      setCurrentUserRole('kasir');
      setShowRoleSidebar(false);
      
      const updatedNotifs = pushNotification(
        'info',
        'Mode Kasir Aktif',
        'Anda sekarang menggunakan hak akses Kasir (Terbatas).',
        notifications
      );
      setNotifications(updatedNotifs);
    }
    setShowRoleSidebar(false);
  };

  const handlePinSubmit = () => {
    if (pinInput === '0000') {
      setCurrentUserRole('owner');
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
      
      const updatedNotifs = pushNotification(
        'success',
        'Akses Owner Terbuka',
        'Selamat datang Owner! Seluruh fitur manajemen sekarang aktif.',
        notifications
      );
      setNotifications(updatedNotifs);
    } else {
      setPinError(true);
      setPinInput('');
      // Shake effect or just error text
    }
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('v_theme', newTheme);
  };

  return (
    <div className={`w-full h-full bg-slate-50 dark:bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden relative ${theme === 'light' ? 'theme-light' : ''}`} id="mobile-root-shell">
      

      {/* SEAMLESS APP CONTAINER */}
      <div className="relative w-full h-full bg-transparent flex flex-col overflow-hidden z-10 transition-all duration-300">



        {/* Dynamic Application Header (Logo VS BERANDA, bells, alerts) - shown on tabs other than 'produk' */}
        {activeTab !== 'produk' && !selectedProduct && (
          <header className="h-14 bg-[#00529C] border-b border-[#003d75] px-5 flex items-center justify-between sticky top-0 z-30 shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (activeTab !== 'beranda') {
                    setActiveTab('beranda');
                  } else if (onExit) {
                    onExit();
                  }
                }}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                title="Kembali"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-lg">
                <Package className="w-4 h-4 text-[#00529C]" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-[10px] font-black tracking-widest text-white uppercase leading-none mb-0.5">
                  {activeTab === 'beranda' ? 'BERANDA VOUCHER' : activeTab === 'pencarian' ? 'CARI VOUCHER' : activeTab === 'laporan' ? 'LAPORAN' : activeTab === 'profil' ? 'PROFIL' : activeTab === 'stok' ? 'ATUR STOK' : activeTab === 'riwayat' ? 'RIWAYAT' : 'LOG AUDIT'}
                </h1>
                <div className="flex items-center gap-1">
                  {currentUserRole === 'owner' ? (
                    <span className="flex items-center gap-1 text-[7px] font-black text-amber-300 uppercase tracking-tighter">
                      <ShieldCheck className="w-1.5 h-1.5" /> Owner
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[9px] font-black text-blue-100 tracking-tight">
                      <User className="w-2.5 h-2.5" />
                      <span className="max-w-[90px] truncate">{activeCashier.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KASIR AKTIF BADGE - info utama di header */}

            <div className="flex items-center gap-2">

              {/* Theme Toggle Button */}
              <button
                onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
                className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer border border-transparent"
                title={`Beralih ke tema ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notification bell drop */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setActiveTab('notif');
                  }}
                  className={`p-1.5 transition relative cursor-pointer rounded-lg flex items-center justify-center ${
                    activeTab === 'notif' 
                      ? 'bg-white text-[#00529C]' 
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Bell className={`h-4 w-4 ${activeTab === 'notif' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 border border-slate-900" />
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Floating Active Toast Banner */}
        <AnimatePresence>
          {latestToast && (
            <motion.div 
              initial={{ opacity: 0, y: -15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              className={`absolute top-15 inset-x-3 z-50 border p-3 rounded-xl shadow-2xl flex gap-2.5 items-start ${
                latestToast.type === 'transfer' 
                  ? 'bg-indigo-950 border-indigo-500/50 shadow-indigo-500/20' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/15 shadow-black/40'
              }`}
              id="toast-notification-banner"
            >
              <div className="text-xs shrink-0 mt-0.5">
                {latestToast.type === 'warning' ? '🚨' : latestToast.type === 'transfer' ? '📱' : '✅'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-[10px] font-black ${latestToast.type === 'transfer' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>{latestToast.title}</h4>
                <p className="text-[9px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{latestToast.message}</p>
              </div>
              <button onClick={() => setLatestToast(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CORE APP TAB VIEW CONTENT (Encapsulated screen) */}
        <div className={`flex-1 overflow-y-auto ${activeTab === 'stok' ? 'p-4 sm:p-6' : 'p-4 sm:p-6'} pb-20 z-10`} id="main-scroll-pane">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedProduct ? 'details' : activeTab}
              initial={{ opacity: 0, x: selectedProduct ? 20 : 0, y: selectedProduct ? 0 : 5 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: selectedProduct ? -20 : 0, y: selectedProduct ? 0 : -5 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {/* If a product is currently selected, render the Middle "Detail Produk" phone mockup view */}
              {selectedProduct ? (
                <DetailProductView 
                  product={selectedProduct} userRole={currentUserRole}
                  transactions={transactions}
                  onBack={() => setSelectedProduct(null)}
                  onUpdateProduct={handleUpdateProduct}
                  onDelete={handleDeleteProduct}
                  onAdjustStock={handleAdjustStock}
                />
              ) : (
                <>
                  {/* ✅ SOLUSI 3: Banner "Stok Diterima" — tampil sekali saat login setelah menerima serah terima */}
                  {activeTab === 'beranda' && pendingHandoverInfo && (
                    <div className="mx-3 mt-3 mb-0 animate-in slide-in-from-top-2 duration-300">
                      <div className="relative flex items-start gap-3 rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 px-4 py-3 shadow-md backdrop-blur-sm overflow-hidden">
                        {/* Decorative glow */}
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full pointer-events-none" />

                        {/* Icon */}
                        <div className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mt-0.5">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0 relative z-10">
                          <p className="text-[11px] font-black text-emerald-300 uppercase tracking-widest leading-none mb-1">
                            Stok Diterima — Shift Dimulai!
                          </p>
                          <p className="text-xs text-emerald-100 font-medium leading-snug">
                            <span className="font-bold text-white">{pendingHandoverInfo.fromCashierName}</span> telah menyerahkan{' '}
                            <span className="font-black text-emerald-300">{pendingHandoverInfo.totalStockTransferred} pcs</span> voucher kepada Anda.
                          </p>
                          <p className="text-[9px] text-emerald-400/70 font-semibold mt-1">
                            {new Date(pendingHandoverInfo.timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB · Silakan mulai shift Anda.
                          </p>
                        </div>

                        {/* Close Button */}
                        <button
                          type="button"
                          onClick={() => setPendingHandoverInfo(null)}
                          className="shrink-0 w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-emerald-300 transition cursor-pointer relative z-10 mt-0.5"
                          title="Tutup notifikasi"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'beranda' && (
                    <DashboardTab
                      products={products}
                      transactions={transactions}
                      notifications={notifications}
                      activeCashier={activeCashier}
                      nextCashier={nextCashier}
                      userRole={currentUserRole}
                      theme={theme}
                      kasirList={kasirList}
                      hasActiveAuditSession={(() => {
                        try {
                          return !!localStorage.getItem(`audit_${activeStoreId || 'default'}_${activeCashier.id}`);
                        } catch { return false; }
                      })()}
                      onResumeAudit={() => setActiveTab('stok')}
                      onNavigate={setActiveTab}
                      onOpenQuickSale={() => {
                        setSaleSearchQuery('');
                        setSaleSelectedOperator('SEMUA');
                        setFormPaymentMethod('NON_TUNAI');
                        if (products.length > 0) setFormProductId(products[0].id);
                        setFormQuantity(1);
                        setFormNote('');
                        setShowQuickSale(true);
                      }}
                      onOpenQuickRestock={() => {
                        setRestockSearchQuery('');
                        setRestockSelectedOperator('SEMUA');
                        if (products.length > 0) setFormProductId(products[0].id);
                        setFormQuantity(1);
                        setFormNote('');
                        setShowQuickRestock(true);
                      }}
                      onOpenHandoverModal={() => setShowHandoverModal(true)}
                      onSearchQueryChange={() => {}}
                      onQuickAdjustStock={handleQuickAdjustStock}
                      onSelectProduct={setSelectedProduct}
                      onMarkNotificationsRead={() => {
                        const updated = notifications.map(n => ({ ...n, isRead: true }));
                        setNotifications(updated);
                        saveState(products, transactions, updated, shiftHandovers);
                      }}
                    />
                  )}

                  {activeTab === 'produk' && (
                    <ProductsTab
                      products={products}
                      activeCashierName={activeCashier.name}
                      userRole={currentUserRole}
                      theme={theme}
                      onAddProduct={handleAddProduct}
                      onBulkAddProducts={handleBulkAddProducts}
                      onUpdateProduct={handleUpdateProduct}
                      onDeleteProduct={handleDeleteProduct}
                      onSelectProduct={setSelectedProduct}
                      onBack={() => setActiveTab('beranda')}
                      onOpenQuickSale={(productId?: string) => {
                        setSaleSearchQuery('');
                        setSaleSelectedOperator('SEMUA');
                        if (productId) {
                          setFormProductId(productId);
                        } else if (products.length > 0) {
                          setFormProductId(products[0].id);
                        }
                        setFormQuantity(1);
                        setFormNote('');
                        setShowQuickSale(true);
                      }}
                      activeStoreId={activeStoreId}
                      googleUid={googleUid}
                      cashiers={cashiers}
                      storeList={storeList}
                    />
                  )}

                  {activeTab === 'pencarian' && (
                    <SearchTab
                      products={products}
                      onSelectProduct={setSelectedProduct}
                      onNavigate={setActiveTab}
                    />
                  )}

                  {activeTab === 'laporan' && (
                    <LaporanTab 
                      shiftHandovers={shiftHandovers}
                      transactions={transactions}
                      products={products}
                      activeCashierName={activeCashier.name}
                      nextCashierName={nextCashier.name}
                      userRole={currentUserRole}
                      onOpenHandoverModal={() => setShowHandoverModal(true)}
                    />
                  )}

                  {activeTab === 'stok' && (
                    <AturStokTab 
                      products={products}
                      activeCashier={activeCashier}
                      nextCashier={nextCashier}
                      allCashiers={cashiers}
                      sessionKey={`audit_${activeStoreId || 'default'}_${activeCashier.id}`}
                      transactions={transactions}
                      userRole={currentUserRole}
                      theme={theme}
                      onUpdateProductStock={(productId, newStock, subReason) => {
                        const p = products.find(prod => prod.id === productId);
                        if (p) {
                          if (p.currentStock !== newStock) {
                             const delta = newStock - p.currentStock;
                             const isAudit = subReason === 'audit';
                             const updatedNotifs = pushNotification(
                               isAudit ? "warning" : "success",
                               isAudit ? "SELISIH AUDIT" : "UPDATE STOK",
                               isAudit 
                                 ? `${activeCashier.name} melaporkan selisih: "${p.name}" berkurang ${Math.abs(delta)} pcs (Barang Hilang).`
                                 : `${activeCashier.name} mengupdate stok "${p.name}" menjadi ${newStock} pcs.`,
                               notifications,
                               {
                                 oldStock: p.currentStock,
                                 newStock,
                                 delta,
                                 productId: p.id,
                                 productName: p.name,
                                 cashierName: activeCashier.name,
                                 unitPrice: p.sellingPrice,
                                 reason: "audit",
                                 subReason: subReason || (delta < 0 ? "penjualan" : "restock")
                               }
                             );
                            setNotifications(updatedNotifs);
                          }
                          handleUpdateProduct({ ...p, currentStock: newStock });
                        }
                      }}
                      onBulkUpdateProductStock={handleBulkUpdateProductStock}
                      onRecordHandover={(handoverData) => {
                        // ====================================================
                        // SERAH TERIMA — LOGIKA BARU:
                        // 1. Catat riwayat handover di Riwayat tab
                        // 2. Salin stok akhir ke storage kasir penerima
                        // 3. Kasir yang login TIDAK BERUBAH
                        // ====================================================
                        const now = new Date();
                        const dateStr = now.toISOString().split('T')[0];

                        // Cari kasir penerima dari daftar cashiers berdasarkan id
                        const toCashier = cashiers.find(c => c.id === handoverData.toCashierId) || cashiers.find(c => c.name === handoverData.toCashierName);
                        const toCashierId = toCashier?.id || handoverData.toCashierId || 'unknown';
                        const toCashierName = toCashier?.name || handoverData.toCashierName || 'Kasir Berikutnya';

                        // Hitung shiftNumber berdasarkan urutan di hari ini
                        const todayRecords = detailedHandovers.filter(r => r.date === dateStr);
                        const shiftNum = todayRecords.length + 1;
                        const shiftTitle = `Shift ${shiftNum} (${activeCashier.name})`;

                        // Bangun daftar produk dengan stok = finalStock dari audit
                        // Ini yang akan disalin ke storage kasir penerima
                        const finalProductsForReceiver: VoucherProduct[] = products.map(p => {
                          const auditItem = (handoverData.items || []).find((i: any) => i.productId === p.id);
                          const finalStock = auditItem ? auditItem.finalStock : p.currentStock;
                          return { ...p, currentStock: finalStock };
                        });

                        const newDetailedRecord: DetailedHandoverRecord = {
                          id: `rec-${Date.now()}`,
                          date: dateStr,
                          timestamp: now.toISOString(),
                          shiftNumber: shiftNum,
                          shiftName: shiftTitle,
                          cashierFromId: activeCashier.id,
                          cashierFromName: activeCashier.name,
                          cashierToId: toCashierId,
                          cashierToName: toCashierName,
                          totalInitialStock: handoverData.initialStock,
                          totalIncomingStock: handoverData.incomingStock,
                          totalFinalStock: handoverData.finalStock,
                          totalSoldPcs: handoverData.totalSold,
                          totalSalesAmount: handoverData.totalSales,
                          qrisAmount: handoverData.qrisAmount,
                          qrisPcs: handoverData.qrisPcs || 0,
                          cashExpected: handoverData.cashExpected,
                          cashPhysical: handoverData.cashPhysical || 0,
                          cashDifference: handoverData.cashDiff || 0,
                          note: handoverData.note || 'Serah terima kasir reguler',
                          isLocked: true,
                          productsSummary: handoverData.items || []
                        };

                        const updatedDetailed = [newDetailedRecord, ...detailedHandovers];
                        setDetailedHandovers(updatedDetailed);

                        // Jalankan handover — menyalin stok ke kasir penerima
                        // Kasir yang login TIDAK DIGANTI
                        handleExecuteShiftHandover(
                          `Serah terima: Stok fisik ${handoverData.finalStock} PCS, Kas Rp${handoverData.cashPhysical?.toLocaleString('id-ID')}`,
                          toCashierId,
                          toCashierName,
                          finalProductsForReceiver
                        );
                        saveState(products, transactions, notifications, shiftHandovers, updatedDetailed);
                      }}
                      onSwitchCashier={() => {
                        // ✅ Tidak ganti kasir — hanya notifikasi saja
                        // Kasir penerima harus login sendiri
                        const updatedNotifs = pushNotification(
                          'success',
                          'Serah Terima Selesai',
                          `Stok telah diserahkan. Anda masih login sebagai ${activeCashier.name}. Kasir penerima silakan login sendiri.`,
                          notifications
                        );
                        setNotifications(updatedNotifs);
                      }}
                      onBackToDashboard={() => setActiveTab('beranda')}
                    />
                  )}

                  {activeTab === 'riwayat' && (
                    <RiwayatTab 
                      handoverRecords={detailedHandovers}
                      allCashiers={cashiers}
                      onBackToDashboard={() => setActiveTab('beranda')}
                    />
                  )}

                  {activeTab === 'notif' && (
                    <LogAktivitasTab 
                      notifications={notifications}
                      userRole={currentUserRole}
                      theme={theme}
                      onMarkAllRead={() => {
                        const updated = notifications.map(n => ({ ...n, isRead: true }));
                        setNotifications(updated);
                        saveState(products, transactions, updated, shiftHandovers, detailedHandovers);
                      }}
                      onClearAll={() => {
                        setNotifications([]);
                        saveState(products, transactions, [], shiftHandovers, detailedHandovers);
                      }}
                    />
                  )}

                  {activeTab === 'profil' && (
                    <ProfileTab
                      activeCashier={activeCashier}
                      nextCashier={nextCashier}
                      shiftHandovers={shiftHandovers}
                      transactions={transactions}
                      products={products}
                      userRole={currentUserRole}
                      onOpenHandoverModal={() => setShowHandoverModal(true)}
                      onSeedDemoData={handleSeedDemoData}
                      onClearAllData={handleClearAllData}
                      onImportBackup={handleImportBackup}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>


        {/* DIALOG MODAL: QUICK SALE */}
        <AnimatePresence>
          {showQuickSale && (() => {
            const filteredSaleProducts = filterProductsByOperatorAndTitle(products, saleSelectedOperator, saleSearchQuery);
            const activeSelectedId = formProductId || (filteredSaleProducts.length > 0 ? filteredSaleProducts[0].id : (products.length > 0 ? products[0].id : ''));
            const selectedProduct = products.find(p => p.id === activeSelectedId) || null;

            return (
              <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3" id="quick-sale-modal">
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className={`w-full rounded-3xl p-3 shadow-2xl relative space-y-1.5 text-xs max-h-[90vh] overflow-y-auto border flex flex-col ${
                    isLight 
                      ? 'bg-white border-slate-200 text-slate-900' 
                      : 'bg-white border-slate-200 shadow-sm dark:bg-slate-900 border-slate-200 dark:border-white/15 text-slate-900 dark:text-white'
                  }`}
                >
                  <button 
                    onClick={() => setShowQuickSale(false)}
                    className={`absolute top-4 right-4 p-1 rounded-lg transition ${isLight ? 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:bg-white/10'}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <h3 className={`text-xs font-black flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                    <ArrowUpRight className="h-5 w-5 text-emerald-500 bg-emerald-500/10 rounded p-0.5" />
                    Catat Penjualan Voucher
                  </h3>

                  <form 
                    onSubmit={(e) => {
                      if (!formProductId && selectedProduct) {
                        setFormProductId(selectedProduct.id);
                      }
                      handleQuickSaleSubmit(e);
                    }} 
                    className="space-y-2 flex-1 flex flex-col"
                  >
                    <div className="space-y-1">
                      <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar" id="sale-provider-filter">
                        {OPERATOR_CHIPS.map((chip) => {
                          const isSelected = saleSelectedOperator === chip.opValue;
                          return (
                            <button
                              key={chip.id}
                              type="button"
                              onClick={() => setSaleSelectedOperator(chip.opValue)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[9px] font-black whitespace-nowrap transition-all border ${
                                isSelected
                                  ? `bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm`
                                  : 'bg-white border-slate-200 shadow-sm dark:bg-white/5 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-emerald-400'
                              }`}
                            >
                              <span className={`text-[8px] font-black uppercase ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>{chip.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={saleSearchQuery}
                          onChange={(e) => setSaleSearchQuery(e.target.value)}
                          placeholder="🔍 Cari & Pilih Voucher..."
                          className={`w-full border rounded-xl pl-9 pr-16 py-2 text-xs focus:outline-none transition shadow-inner ${
                            isLight 
                              ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500 focus:border-emerald-500' 
                              : 'bg-white border-slate-200 dark:bg-slate-950 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:border-emerald-500'
                          }`}
                        />
                        {(saleSearchQuery || saleSelectedOperator !== 'SEMUA') && (
                          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-500 dark:text-emerald-400 pointer-events-none">
                            {filteredSaleProducts.length}
                          </span>
                        )}
                        {saleSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setSaleSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        </div>

                      <div className="h-28 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-white/5 rounded-xl p-1 bg-slate-50 dark:bg-slate-950/30" id="sale-product-list">
                        {filteredSaleProducts.length === 0 ? (
                          <div className="text-center py-4 text-slate-600 dark:text-slate-400 text-[10px]">
                            {saleSelectedOperator !== 'SEMUA' 
                              ? `Tidak ada voucher ${saleSelectedOperator} yang cocok`
                              : `Tidak ada voucher yang cocok dengan "${saleSearchQuery}"`
                            }
                          </div>
                        ) : (
                          filteredSaleProducts.map((p) => {
                            const isSelected = activeSelectedId === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setFormProductId(p.id)}
                                className={`w-full text-left px-2 py-1.5 rounded-lg border transition-all flex justify-between items-center ${
                                  isSelected 
                                    ? `bg-emerald-50 text-emerald-700 border-emerald-500 shadow-sm dark:bg-emerald-500/10 dark:text-emerald-300` 
                                    : `bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-white/10 dark:hover:bg-slate-800 ${isLight ? 'text-slate-700' : 'text-slate-300'}`
                                }`}
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-1 h-3 rounded-full ${isSelected ? 'bg-emerald-500' : (p.currentStock <= p.minStockLevel ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600')}`}></div>
                                    <h4 className="text-[10px] font-black truncate">{p.name}</h4>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-[11px] font-black">Rp {p.sellingPrice.toLocaleString('id-ID')}</div>
                                  <div className={`text-[8px] font-bold ${p.currentStock <= p.minStockLevel ? 'text-red-500' : 'text-slate-500'}`}>
                                    Stok: {p.currentStock}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {selectedProduct && (
                      <div className="bg-amber-400 border border-white/60 shadow-[0_0_14px_rgba(251,191,36,0.35)] rounded-xl px-3 py-2 flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="text-[9px] uppercase font-black text-amber-950 flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3 shrink-0" />
                            Dipilih:
                          </span>
                          <h4 className="text-[12px] font-black text-black leading-tight truncate">{selectedProduct.name}</h4>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-[8px] font-bold text-amber-900 uppercase">Harga</span>
                          <p className="text-xs font-black text-amber-950">
                            Rp {selectedProduct.sellingPrice.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>Jumlah Jual (Pcs)</label>
                        <div className="flex gap-1">
                          {[1, 2, 5, 10].map((qty) => (
                            <button
                              key={qty}
                              type="button"
                              onClick={() => setFormQuantity(qty)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition border ${
                                formQuantity === qty 
                                  ? 'bg-emerald-600 text-white border-emerald-500' 
                                  : (isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200' : 'bg-white border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10')
                              }`}
                            >
                              +{qty}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => setFormQuantity(Math.max(1, formQuantity - 1))}
                          className={`w-10 h-10 flex items-center justify-center rounded-l-xl border-y border-l transition ${isLight ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-800 dark:hover:bg-slate-800'}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={selectedProduct?.currentStock || 1}
                          required
                          value={formQuantity}
                          onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                          className={`flex-1 w-full border-y px-4 py-2.5 font-black text-lg text-center focus:outline-none focus:border-emerald-500 transition appearance-none ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-white border-slate-200 dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'}`}
                          style={{ MozAppearance: 'textfield' }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormQuantity(Math.min(selectedProduct?.currentStock || 1, formQuantity + 1))}
                          className={`w-10 h-10 flex items-center justify-center rounded-r-xl border-y border-r transition ${isLight ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-800 dark:hover:bg-slate-800'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Metode Pembayaran</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFormPaymentMethod('TUNAI')}
                          className={`py-2 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-1.5 ${
                            formPaymentMethod === 'TUNAI'
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                              : (isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200' : 'bg-white border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10')
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          TUNAI
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormPaymentMethod('NON_TUNAI')}
                          className={`py-2 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-1.5 ${
                            formPaymentMethod === 'NON_TUNAI'
                              ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                              : 'bg-white border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-white/10'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          NON TUNAI
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Keterangan tambahan (Opsional)"
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                        className="w-full bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-900 dark:text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition"
                      />
                    </div>

                    {selectedProduct && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5 rounded-xl flex justify-between items-center mt-1">
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Total Jual:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          Rp {(selectedProduct.sellingPrice * formQuantity).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1 mt-auto">
                      <button
                        type="button"
                        id="btn-cancel-quick-sale"
                        onClick={() => setShowQuickSale(false)}
                        className="flex-1 py-2 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        id="btn-confirm-quick-sale"
                        disabled={!selectedProduct}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/50"
                      >
                        Konfirmasi Jual
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>

        {/* DIALOG MODAL: QUICK RESTOCK */}
        <AnimatePresence>
          {showQuickRestock && (() => {
            const filteredRestockProducts = filterProductsByOperatorAndTitle(products, restockSelectedOperator, restockSearchQuery);
            const activeSelectedId = formProductId || (filteredRestockProducts.length > 0 ? filteredRestockProducts[0].id : (products.length > 0 ? products[0].id : ''));
            const selectedProduct = products.find(p => p.id === activeSelectedId) || null;

            return (
              <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3" id="quick-restock-modal">
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="bg-white border-slate-200 shadow-sm dark:bg-slate-900 border border-slate-200 dark:border-white/15 w-full rounded-3xl p-4 shadow-2xl relative space-y-2 text-xs max-h-[88vh] overflow-y-auto"
                >
                  <button 
                    onClick={() => setShowQuickRestock(false)}
                    className="absolute top-4 right-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:bg-white/10 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ArrowDownLeft className="h-5 w-5 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 rounded p-0.5" />
                    Restock Voucher Masuk
                  </h3>

                  <form 
                    onSubmit={(e) => {
                      if (!formProductId && selectedProduct) {
                        setFormProductId(selectedProduct.id);
                      }
                      handleQuickRestockSubmit(e);
                    }} 
                    className="space-y-3"
                  >
                    {/* Filter Operator & Kolom Cari */}
                    <div className="space-y-1.5">
                      {/* Operator chips - compact pill style */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {OPERATOR_CHIPS.map((chip) => (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setRestockSelectedOperator(chip.opValue)}
                            className={`px-2 py-1 rounded-xl text-[9px] font-black whitespace-nowrap transition-all border ${
                              restockSelectedOperator === chip.opValue
                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                : 'bg-white border-slate-200 shadow-sm dark:bg-white/5 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>

                      {/* Search input — label as placeholder */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={restockSearchQuery}
                          onChange={(e) => setRestockSearchQuery(e.target.value)}
                          placeholder="🔍 Cari & Pilih Voucher..."
                          className="w-full bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/15 focus:border-indigo-500 rounded-xl pl-9 pr-16 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:outline-none transition shadow-inner"
                          autoFocus={false}
                        />
                        {(restockSearchQuery || restockSelectedOperator !== 'SEMUA') && (
                          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[9px] font-bold text-indigo-500 dark:text-indigo-400 pointer-events-none">
                            {filteredRestockProducts.length}
                          </span>
                        )}
                        {restockSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setRestockSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Filtered Result Product List */}
                      <div className="max-h-28 overflow-y-auto space-y-1 rounded-xl bg-slate-50 dark:bg-slate-900/40 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 p-1 no-scrollbar">
                        {filteredRestockProducts.length === 0 ? (
                          <div className="text-center py-4 text-slate-600 dark:text-slate-400 text-[10px]">
                            {restockSelectedOperator !== 'SEMUA' 
                              ? `Tidak ada voucher ${restockSelectedOperator} yang cocok`
                              : `Tidak ada voucher yang cocok dengan "${restockSearchQuery}"`
                            }
                          </div>
                        ) : (
                          filteredRestockProducts.map((p) => {
                            const isSelected = activeSelectedId === p.id;
                            const opStyle = OPERATOR_STYLES[p.operator] || { text: 'text-indigo-600 dark:text-indigo-400', border: 'border-slate-200 dark:border-white/10' };
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setFormProductId(p.id)}
                                className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected 
                                    ? 'bg-indigo-500/20 border-indigo-500 text-slate-900 dark:text-white shadow-sm' 
                                    : 'bg-white/[0.02] hover:bg-white/[0.06] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${opStyle.border} ${opStyle.text} bg-white border-slate-200 shadow-sm dark:bg-slate-900 shrink-0`}>
                                    {p.operator}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-tight">{p.name}</p>
                                    <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-0.5">
                                      Stok saat ini: <span className="text-slate-800 dark:text-slate-300 font-bold">{p.currentStock} pcs</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 block">
                                    Rp {p.costPrice.toLocaleString('id-ID')}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[8px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/30 px-1 rounded uppercase">Dipilih</span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Selected Product Highlight Banner — compact */}
                    {selectedProduct && (
                      <motion.div 
                        key={selectedProduct.id}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-amber-400 border border-white/60 shadow-[0_0_14px_rgba(251,191,36,0.35)] rounded-xl px-3 py-2 flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] uppercase font-black text-amber-950 flex items-center gap-0.5">
                            <ArrowDownLeft className="w-3 h-3 shrink-0" />
                            Dipilih:
                          </span>
                          <h4 className="text-[12px] font-black text-black leading-tight truncate">{selectedProduct.name}</h4>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-[8px] font-bold text-amber-900 uppercase">Modal</span>
                          <p className="text-xs font-black text-amber-950">
                            Rp {selectedProduct.costPrice.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Quantity Field with Quick Steppers — compact */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Jumlah Masuk (Pcs)</label>
                        <div className="flex gap-1">
                          {[1, 5, 10, 20].map((qty) => (
                            <button
                              key={qty}
                              type="button"
                              onClick={() => setFormQuantity(qty)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition border ${
                                formQuantity === qty 
                                  ? 'bg-indigo-600 text-white border-indigo-500' 
                                  : 'bg-white border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                              }`}
                            >
                              +{qty}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Stepper Row: number left, buttons right */}
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5">
                        <input
                          type="number"
                          min="1"
                          required
                          value={formQuantity}
                          onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                          className="w-16 bg-transparent border-none text-slate-900 dark:text-white text-lg font-black focus:outline-none"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setFormQuantity(q => Math.max(1, q - 1))}
                            className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400 font-black text-base hover:bg-red-200 dark:hover:bg-red-500/30 transition active:scale-95"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormQuantity(q => q + 1)}
                            className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-base hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Supplier / Catatan</label>
                      <input
                        type="text"
                        placeholder="Contoh: PT. Sumber Voucher, Sales Distributor"
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                        className="w-full bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {selectedProduct && (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-xl flex justify-between items-center">
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-[10px]">Total Modal:</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400 text-base">
                          Rp {(selectedProduct.costPrice * formQuantity).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => setShowQuickRestock(false)}
                        className="flex-1 py-2.5 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedProduct}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-slate-900 dark:text-white font-bold rounded-xl transition cursor-pointer shadow-lg shadow-indigo-950/50"
                      >
                        Simpan Masuk
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>

        {/* DIALOG MODAL: AUTOMATED SHIFT CLOSING HANDOVER */}
        <AnimatePresence>
          {showHandoverModal && (
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-end justify-center p-3" id="handover-modal-box">
              <motion.div 
                initial={{ y: 150 }}
                animate={{ y: 0 }}
                exit={{ y: 150 }}
                className="bg-white border-slate-200 shadow-sm dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full rounded-3xl p-5 shadow-2xl relative space-y-4 text-xs"
              >
                <button 
                  onClick={() => setShowHandoverModal(false)}
                  className="absolute top-5 right-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent transition"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1.5 mb-1">
                  <RotateCcw className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-white">Tutup Shift & Handover Otomatis</h3>
                </div>

                <div className="space-y-3.5">
                  <div className="flex justify-between items-center bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                    <div>
                      <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase font-semibold">Kasir Aktif (Shift 1)</span>
                      <p className="font-bold text-slate-900 dark:text-white text-[11px]">{activeCashier.name}</p>
                    </div>
                    <span className="text-slate-600 dark:text-slate-400">➔</span>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase font-semibold">Kasir Penerima (Shift 2)</span>
                      <p className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">{nextCashier.name}</p>
                    </div>
                  </div>

                  <div className="bg-indigo-500/10 border border-indigo-500/15 p-3 rounded-xl space-y-1.5">
                    <span className="text-[9px] text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider">Aset Voucher yang Dialihkan</span>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Total Jenis Voucher:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{products.length} Jenis</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Total Volume Stok:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{products.reduce((acc, p) => acc + p.currentStock, 0)} Pcs</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-white/5">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">Nilai Persediaan (Buku):</span>
                      <span className="font-black text-emerald-500 font-black dark:text-emerald-400">
                        Rp {products.reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Keterangan / Berita Acara</label>
                    <input
                      type="text"
                      placeholder="Contoh: Kas sesuai rekap, laci aman..."
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      className="w-full bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowHandoverModal(false)}
                      className="flex-1 py-2 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteShiftHandover(formNote)}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-slate-900 dark:text-white font-black rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/30"
                    >
                      Tutup Shift
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* CELEBRATION SHIFT TRANSFER SUCCESS OVERLAY */}
        <AnimatePresence>
          {showHandoverSuccessOverlay && handoverSuccessSummary && (
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4" id="success-handover-celebration">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white border-slate-200 shadow-sm dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full rounded-3xl p-5 text-center space-y-3.5 relative overflow-hidden"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="mx-auto w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-black dark:text-emerald-400 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Serah Terima Sukses!</h3>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Pertukaran shift kasir otomatis dicatat real-time.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl p-3 text-left space-y-1.5 text-[10px]">
                  <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-1">
                    <span className="text-slate-600 dark:text-slate-400 font-bold">Shift Lama (Diserahkan):</span>
                    <span className="font-bold text-slate-900 dark:text-white">{handoverSuccessSummary.fromCashierName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-1">
                    <span className="text-slate-600 dark:text-slate-400 font-bold">Shift Baru (Mulai):</span>
                    <span className="font-bold text-slate-900 dark:text-white">{handoverSuccessSummary.toCashierName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-1">
                    <span className="text-slate-600 dark:text-slate-400 font-bold">Voucher Diserahkan:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{handoverSuccessSummary.totalStockTransferred} Pcs</span>
                  </div>
                  <div className="flex justify-between pt-0.5 font-semibold">
                    <span className="text-emerald-500 font-black dark:text-emerald-400">Total Nilai Buku:</span>
                    <span className="font-black text-emerald-500 font-black dark:text-emerald-400">Rp {handoverSuccessSummary.inventoryValue.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <p className="text-[10px] text-emerald-300 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                  Tanggung jawab fisik sekarang dipegang penuh oleh <strong className="text-slate-900 dark:text-white">{handoverSuccessSummary.toCashierName}</strong>.
                </p>

                <button
                  onClick={() => {
                    setShowHandoverSuccessOverlay(false);
                    setHandoverSuccessSummary(null);
                    setActiveTab('beranda');
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-slate-900 dark:text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Mulai Shift Baru
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ROLE SELECTION SIDEBAR */}
        <AnimatePresence>
          {showRoleSidebar && (
            <div className="absolute inset-0 z-[100] flex" id="role-sidebar-container">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRoleSidebar(false)}
                className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-64 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-white/10 p-5 shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-slate-900 dark:text-white text-sm shadow-lg shadow-indigo-600/30">
                      VS
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-white tracking-widest">VOUCHERKU</span>
                  </div>
                  <button onClick={() => setShowRoleSidebar(false)} className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6 flex-1">
                  <div>
                    <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-3">Hak Akses Sistem</p>
                    <div className="space-y-2">
                      <button 
                        onClick={() => handleSwitchRole('kasir')}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${currentUserRole === 'kasir' ? 'bg-indigo-500/20 border-indigo-500/40 text-slate-900 dark:text-white' : 'bg-white border-slate-200 shadow-sm dark:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-white/10 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        <div className={`p-2 rounded-xl ${currentUserRole === 'kasir' ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black">Mode Kasir</p>
                          <p className="text-[9px] font-bold opacity-60">Akses terbatas sistem</p>
                        </div>
                        {currentUserRole === 'kasir' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                      </button>

                      <button 
                        onClick={() => handleSwitchRole('owner')}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${currentUserRole === 'owner' ? 'bg-amber-500/20 border-amber-500/40 text-slate-900 dark:text-white' : 'bg-white border-slate-200 shadow-sm dark:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-white/10 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        <div className={`p-2 rounded-xl ${currentUserRole === 'owner' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black">Mode Owner</p>
                          <p className="text-[9px] font-bold opacity-60">Kontrol penuh admin</p>
                        </div>
                        {currentUserRole === 'owner' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-3">Sistem & Pengaturan</p>
                    <div className="space-y-1">
                      <button onClick={() => { setActiveTab('profil'); setShowRoleSidebar(false); }} className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white transition-colors text-[11px] font-bold">
                        <Settings className="w-4 h-4" /> Pengaturan
                      </button>
                      {currentUserRole === 'owner' && (
                        <button onClick={() => { setActiveTab('laporan'); setShowRoleSidebar(false); }} className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white transition-colors text-[11px] font-bold">
                          <Activity className="w-4 h-4" /> Laporan Audit
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">
                      {activeCashier.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-900 dark:text-white">{activeCashier.name}</p>
                      <p className="text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase">Aktif Sekarang</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* PIN VERIFICATION MODAL */}
        <AnimatePresence>
          {showPinModal && (
            <div className="absolute inset-0 z-[200] flex items-center justify-center p-6" id="pin-modal-overlay">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/95 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8" />
                </div>
                
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Verifikasi Owner</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">Masukkan 4 digit PIN keamanan untuk membuka akses penuh sistem.</p>

                <div className="space-y-4">
                  <div className="flex justify-center gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div 
                        key={i} 
                        className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${pinInput.length > i ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-slate-200 dark:border-white/10 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent'}`}
                      >
                        {pinInput.length > i && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}
                      </div>
                    ))}
                  </div>

                  {pinError && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] font-black text-rose-500 uppercase tracking-widest"
                    >
                      PIN SALAH! SILAHKAN COBA LAGI
                    </motion.p>
                  )}

                  <div className="grid grid-cols-3 gap-3 pt-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          if (num === 'C') setPinInput('');
                          else if (num === 'OK') handlePinSubmit();
                          else if (typeof num === 'number' && pinInput.length < 4) {
                            setPinInput(prev => prev + num);
                            setPinError(false);
                          }
                        }}
                        className={`h-12 rounded-xl flex items-center justify-center font-black text-lg transition-all ${num === 'OK' ? 'bg-amber-500 text-white shadow-lg col-span-1' : 'bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/5'}`}
                      >
                        {num === 'OK' ? <ShieldCheck className="w-6 h-6" /> : num}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setShowPinModal(false)}
                    className="w-full mt-4 text-[10px] font-black text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition"
                  >
                    Batal Verifikasi
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* VOUCHER BOTTOM NAVIGATION */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-white/10 px-2 py-1 z-[150] shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe">
          <ul className="flex justify-around items-center max-w-lg mx-auto">
            <li className="flex-1" onClick={() => onExit?.()}>
              <div className="flex flex-col items-center cursor-pointer group py-1">
                <div className="transition-all duration-300 mb-0.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                  <ArrowLeft className="w-5 h-5 stroke-[2px]" />
                </div>
                <span className="text-[9px] font-black tracking-tight text-slate-500 transition-colors duration-300">Utama</span>
              </div>
            </li>
            
            <li className="flex-1" onClick={() => { setActiveTab('beranda'); setSelectedProduct(null); }}>
              <div className="flex flex-col items-center cursor-pointer group py-1">
                <div className={activeTab === 'beranda' && !selectedProduct ? "transition-all duration-300 mb-0.5 text-[#00529C] scale-110" : "transition-all duration-300 mb-0.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}>
                  <Home className={activeTab === 'beranda' && !selectedProduct ? "w-5 h-5 stroke-[2.5px]" : "w-5 h-5 stroke-[2px]"} />
                </div>
                <span className={activeTab === 'beranda' && !selectedProduct ? "text-[9px] font-black tracking-tight transition-colors duration-300 text-[#00529C]" : "text-[9px] font-black tracking-tight transition-colors duration-300 text-slate-500"}>Beranda</span>
              </div>
            </li>

            <li className="flex-1" onClick={() => {
              setSaleSearchQuery('');
              setSaleSelectedOperator('SEMUA');
              setFormPaymentMethod('NON_TUNAI');
              if (products.length > 0) setFormProductId(products[0].id);
              setFormQuantity(1);
              setFormNote('');
              setShowQuickSale(true);
            }}>
              <div className="flex flex-col items-center cursor-pointer group py-1 relative">
                <div className="absolute -top-3 bg-rose-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg shadow-rose-500/40 border-2 border-white dark:border-slate-900 group-active:scale-95 transition-transform">
                  <ShoppingCart className="w-4 h-4 stroke-[2.5px]" />
                </div>
                <span className="text-[9px] font-black tracking-tight text-slate-500 transition-colors duration-300 mt-5">Jual</span>
              </div>
            </li>

            <li className="flex-1" onClick={() => { setActiveTab('produk'); setSelectedProduct(null); }}>
              <div className="flex flex-col items-center cursor-pointer group py-1">
                <div className={activeTab === 'produk' || selectedProduct ? "transition-all duration-300 mb-0.5 text-[#00529C] scale-110" : "transition-all duration-300 mb-0.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}>
                  <Package className={activeTab === 'produk' || selectedProduct ? "w-5 h-5 stroke-[2.5px]" : "w-5 h-5 stroke-[2px]"} />
                </div>
                <span className={activeTab === 'produk' || selectedProduct ? "text-[9px] font-black tracking-tight transition-colors duration-300 text-[#00529C]" : "text-[9px] font-black tracking-tight transition-colors duration-300 text-slate-500"}>Produk</span>
              </div>
            </li>

            <li className="flex-1" onClick={() => { setActiveTab('riwayat'); setSelectedProduct(null); }}>
              <div className="flex flex-col items-center cursor-pointer group py-1">
                <div className={activeTab === 'riwayat' ? "transition-all duration-300 mb-0.5 text-[#00529C] scale-110" : "transition-all duration-300 mb-0.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}>
                  <History className={activeTab === 'riwayat' ? "w-5 h-5 stroke-[2.5px]" : "w-5 h-5 stroke-[2px]"} />
                </div>
                <span className={activeTab === 'riwayat' ? "text-[9px] font-black tracking-tight transition-colors duration-300 text-[#00529C]" : "text-[9px] font-black tracking-tight transition-colors duration-300 text-slate-500"}>Riwayat</span>
              </div>
            </li>
          </ul>
        </nav>

      </div> {/* Closing smartphone frame */}
    </div>
  );
}

