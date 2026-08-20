/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Layers, 
  AlertTriangle, 
  ArrowRightLeft, 
  Search, 
  Plus, 
  FileText, 
  QrCode, 
  Bell, 
  User, 
  Clock, 
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  X,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  Package,
  SlidersHorizontal,
  PlusCircle,
  MinusCircle,
  Check,
  History,
  ShoppingCart,
  DollarSign,
  BarChart3,
  ScanLine,
  Flame,
  Zap,
  Tag,
  ShieldCheck,
  Send,
  DownloadCloud,
  Activity,
  Database,
  Settings,
  ArrowRight
} from 'lucide-react';
import type { VoucherProduct, Transaction, LiveNotification, Cashier, UserRole } from '../types';
import { OPERATOR_STYLES } from '../data';
import ProviderLogo from './ProviderLogo';

interface DashboardTabProps {
  products: VoucherProduct[];
  transactions: Transaction[];
  notifications: LiveNotification[];
  activeCashier: Cashier;
  nextCashier: Cashier;
  userRole: UserRole;
  theme?: 'dark' | 'light';
  onNavigate: (tab: 'beranda' | 'produk' | 'pencarian' | 'laporan' | 'profil' | 'stok' | 'riwayat' | 'notif') => void;
  onOpenQuickSale: () => void;
  onOpenQuickRestock: () => void;
  onOpenHandoverModal: () => void;
  onSearchQueryChange: (query: string) => void;
  onQuickAdjustStock: (productId: string, delta: number) => void;
  onSelectProduct: (p: VoucherProduct) => void;
  onMarkNotificationsRead?: () => void;
}

export default function DashboardTab({
  products,
  transactions,
  notifications,
  activeCashier,
  nextCashier,
  userRole,
  theme = 'dark',
  onNavigate,
  onOpenQuickSale,
  onOpenQuickRestock,
  onOpenHandoverModal,
  onSearchQueryChange,
  onQuickAdjustStock,
  onSelectProduct,
  onMarkNotificationsRead
}: DashboardTabProps) {
  const isLight = theme === 'light';
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [scanResult, setScanResult] = useState<VoucherProduct | null>(null);
  const [showAturStokModal, setShowAturStokModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  // --- OWNER DASHBOARD CALCULATIONS ---
  
  const [ownerFilterCashier, setOwnerFilterCashier] = useState<string>('Semua Kasir');
  const [trendingDate, setTrendingDate] = useState<string>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });

  const ownerStats = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTxs = transactions.filter(t => t.timestamp.startsWith(today) && ['PENJUALAN', 'RESTOCK', 'TAMBAH_STOK', 'EDIT_STOK'].includes(t.type));
    
    // Total global asset value is always based on current stock
    const totalAssetValue = products.reduce((sum, p) => sum + (p.currentStock * p.sellingPrice), 0);
    const lowStockCount = products.filter(p => p.currentStock <= p.minStockLevel).length;

    // To compute Stok Awal & Stok Akhir accurately based on historical tracking
    const sortedTxs = [...todayTxs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    let tempGlobalStock = products.reduce((acc, p) => acc + p.currentStock, 0);
    
    const timeline = [];
    for (const tx of sortedTxs) {
      const stockAfter = tempGlobalStock;
      let delta = 0;
      if (tx.type === 'PENJUALAN') {
        delta = -tx.quantity;
      } else if (['RESTOCK', 'TAMBAH_STOK', 'EDIT_STOK'].includes(tx.type)) {
        delta = tx.quantity; // Assuming positive means increase
      }
      const stockBefore = tempGlobalStock - delta;
      
      timeline.push({ ...tx, stockAfter, stockBefore });
      tempGlobalStock = stockBefore;
    }

    // Filter transactions for the selected scope
    let scopeTxs = timeline;
    if (ownerFilterCashier !== 'Semua Kasir') {
      scopeTxs = timeline.filter(t => t.cashierName === ownerFilterCashier);
    }

    let stokAwal = 0;
    let stokAkhir = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalItemsSold = 0;

    if (scopeTxs.length > 0) {
      // Timeline is newest first. So oldest is at the end of the array.
      const oldestTx = scopeTxs[scopeTxs.length - 1];
      const newestTx = scopeTxs[0];
      
      stokAwal = oldestTx.stockBefore;
      stokAkhir = newestTx.stockAfter;

      for (const tx of scopeTxs) {
        if (tx.type === 'PENJUALAN') {
          totalItemsSold += tx.quantity;
          const product = products.find(p => p.id === tx.productId || p.name === tx.productName);
          const sellPrice = (product?.sellingPrice || 0);
          const costPrice = (product?.costPrice || 0);
          
          totalRevenue += tx.quantity * sellPrice;
          totalProfit += tx.quantity * (sellPrice - costPrice);
        }
      }
    } else {
      // No transactions for this cashier today. Awal = Akhir = Current Stock (if Semua Kasir or no tx)
      stokAwal = products.reduce((acc, p) => acc + p.currentStock, 0);
      stokAkhir = stokAwal;
    }

    return { totalAssetValue, totalRevenue, totalProfit, totalItemsSold, stokAwal, stokAkhir, lowStockCount };
  }, [products, transactions, ownerFilterCashier]);

  const uniqueCashiersToday = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTxs = transactions.filter(t => t.timestamp.startsWith(today));
    return Array.from(new Set(todayTxs.map(t => t.cashierName))).filter(Boolean);
  }, [transactions]);

  const trendingProducts = React.useMemo(() => {
    // Filter sales transactions for the selected date
    const dateTxs = transactions.filter(t => 
      t.timestamp.startsWith(trendingDate) && 
      t.type === 'PENJUALAN'
    );

    // Aggregate sales by product
    const salesMap = new Map<string, { product: VoucherProduct | undefined, totalQty: number, totalRevenue: number }>();
    
    dateTxs.forEach(tx => {
      const pid = tx.productId || '';
      if (!pid) return;
      
      if (!salesMap.has(pid)) {
        salesMap.set(pid, {
          product: products.find(p => p.id === pid),
          totalQty: 0,
          totalRevenue: 0
        });
      }
      
      const entry = salesMap.get(pid)!;
      entry.totalQty += tx.quantity;
      entry.totalRevenue += tx.quantity * ((entry.product?.sellingPrice) || 0);
    });

    // Convert map to array, sort by quantity descending, take top 5
    const sortedList = Array.from(salesMap.values())
      .filter(item => item.product !== undefined) // ensure product exists
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);

    return sortedList;
  }, [transactions, products, trendingDate]);


  const stockMovement = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return products.map(p => {
      const pLogs = notifications.filter(n => n.metadata?.productId === p.id && n.timestamp.startsWith(today));
      
      // restockQty: Official restocks + Audit increases
      const restockQty = pLogs.filter(n => 
        n.metadata?.reason === 'restock' || 
        (n.metadata?.reason === 'audit' && (n.metadata?.delta || 0) > 0)
      ).reduce((sum, n) => sum + (n.metadata?.delta || 0), 0);
      
      // soldOnlyQty: Real sales for revenue
      const soldOnlyQty = Math.abs(pLogs.filter(n => 
        (n.metadata?.reason === 'sale' || (n.metadata?.reason === 'audit' && n.metadata?.subReason === 'penjualan')) && 
        (n.metadata?.delta || 0) < 0
      ).reduce((sum, n) => sum + (n.metadata?.delta || 0), 0));

      // lossOnlyQty: Audit losses (Hilang)
      const lossOnlyQty = Math.abs(pLogs.filter(n => 
        (n.metadata?.reason === 'audit' && n.metadata?.subReason === 'audit') && 
        (n.metadata?.delta || 0) < 0
      ).reduce((sum, n) => sum + (n.metadata?.delta || 0), 0));

      const totalOut = soldOnlyQty + lossOnlyQty;
      
      return { 
        ...p, 
        restock: restockQty, 
        sold: totalOut, 
        revenue: soldOnlyQty * p.sellingPrice 
      };
    }).filter(item => item.sold > 0 || item.restock > 0 || item.currentStock < 5);
  }, [products, notifications]);

  // Statistics calculations
  const totalStock = products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalValue = products.reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0);
  
  // Sales count for today
  const todaySalesCount = transactions
    .filter(t => t.type === 'PENJUALAN' && t.timestamp.startsWith(new Date().toISOString().split('T')[0]))
    .reduce((acc, t) => acc + t.quantity, 0);

  // Filter low stock products
  const lowStockProducts = products.filter(p => p.currentStock <= p.minStockLevel);
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  // Analytics for today
  const todayDateString = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t => t.timestamp.startsWith(todayDateString));

  const totalTunaiToday = todayTransactions
    .filter(t => t.type === 'PENJUALAN' && (!t.notes || !t.notes.includes('[NON TUNAI]')))
    .reduce((acc, t) => acc + t.amount, 0);

  const totalQrisToday = todayTransactions
    .filter(t => t.type === 'PENJUALAN' && t.notes?.includes('[NON TUNAI]'))
    .reduce((acc, t) => acc + t.amount, 0);

  // Top selling voucher today
  const salesByProductMap: Record<string, { name: string; qty: number }> = {};
  todayTransactions.filter(t => t.type === 'PENJUALAN').forEach(t => {
    if (t.productId && t.productName) {
      if (!salesByProductMap[t.productId]) {
        salesByProductMap[t.productId] = { name: t.productName, qty: 0 };
      }
      salesByProductMap[t.productId].qty += t.quantity;
    }
  });

  const topSoldVoucher = Object.values(salesByProductMap).sort((a, b) => b.qty - a.qty)[0];

  const formatIDRCompact = (num: number) => {
    if (num >= 1000000) {
      return `Rp ${(num / 1000000).toFixed(1).replace('.', ',')}jt`;
    }
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  const handleMockScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = products.find(p => p.barcode === scannedCode || p.sku.toLowerCase() === scannedCode.toLowerCase());
    if (found) {
      setScanResult(found);
    } else {
      setScanResult(null);
      const partialFound = products.find(p => p.name.toLowerCase().includes(scannedCode.toLowerCase()));
      if (partialFound) {
        setScanResult(partialFound);
      }
    }
  };

  const selectRandomBarcode = () => {
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    if (randomProduct) {
      setScannedCode(randomProduct.barcode);
      setScanResult(randomProduct);
    }
  };

  if (userRole === 'owner') {
    return (
      <div className="space-y-3 pb-24" id="owner-dashboard-container">
        {/* Owner Executive Header - More compact */}
        <div className="flex items-center justify-between px-1 mt-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white leading-none">Owner Dashboard</h2>
              <p className="text-[8px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em] mt-1">Audit Terpusat</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10">
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[7px] font-black text-emerald-500/80 uppercase tracking-tighter">Live Monitor</span>
          </div>
        </div>

        {/* 2-Row Menu (Produk, Atur Stok, Restok, Riwayat + Secondary Row) */}
        <div className="space-y-3">
          <div className={`grid grid-cols-4 gap-2 rounded-3xl p-3 shadow-sm border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700/50'}`} id="owner-quick-access-grid">
            {/* 1. PRODUK */}
            <button
              type="button"
              onClick={() => onNavigate('produk')}
              className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-violet-500 shadow-lg shadow-violet-500/30 flex items-center justify-center text-white group-hover:scale-105 transition-all">
                <Package className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className={`text-[9px] sm:text-[10px] font-black mt-2 leading-tight text-center uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>PRODUK</span>
            </button>

            {/* 2. ATUR STOK */}
            <button
              type="button"
              onClick={() => onNavigate('stok')}
              className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-sky-500 shadow-lg shadow-sky-500/30 flex items-center justify-center text-white group-hover:scale-105 transition-all">
                <SlidersHorizontal className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className={`text-[9px] sm:text-[10px] font-black mt-2 leading-tight text-center uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>ATUR STOK</span>
            </button>

            {/* 3. RESTOK */}
            <button
              type="button"
              onClick={onOpenQuickRestock}
              className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white group-hover:scale-105 transition-all">
                <PlusCircle className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className={`text-[9px] sm:text-[10px] font-black mt-2 leading-tight text-center uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>RESTOK</span>
            </button>

            {/* 4. RIWAYAT */}
            <button
              type="button"
              onClick={() => onNavigate('riwayat')}
              className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30 flex items-center justify-center text-white group-hover:scale-105 transition-all">
                <History className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className={`text-[9px] sm:text-[10px] font-black mt-2 leading-tight text-center uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>RIWAYAT</span>
            </button>
          </div>

          <div className={`grid grid-cols-5 gap-1 sm:gap-2 rounded-3xl p-3 shadow-sm border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700/50'}`}>
            <button onClick={onOpenQuickSale} className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-orange-500 flex items-center justify-center text-white group-hover:scale-105 transition-all shadow-md shadow-orange-500/20"><ShoppingCart className="w-5 h-5 sm:w-5 sm:h-5" /></div>
              <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 leading-tight text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Jual Cepat</span>
            </button>
            <button onClick={() => onNavigate('pencarian')} className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-fuchsia-500 flex items-center justify-center text-white group-hover:scale-105 transition-all shadow-md shadow-fuchsia-500/20"><Search className="w-5 h-5 sm:w-5 sm:h-5" /></div>
              <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 leading-tight text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Pencarian</span>
            </button>
            <button onClick={() => onNavigate('laporan')} className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-500 flex items-center justify-center text-white group-hover:scale-105 transition-all shadow-md shadow-blue-500/20"><BarChart3 className="w-5 h-5 sm:w-5 sm:h-5" /></div>
              <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 leading-tight text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Laporan</span>
            </button>
            <button onClick={() => onNavigate('notif')} className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer" id="btn-owner-notifikasi">
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-red-500 flex items-center justify-center text-white group-hover:scale-105 transition-all shadow-md shadow-red-500/20">
                <Bell className="w-5 h-5 sm:w-5 sm:h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-0 right-0 h-3 w-3 bg-red-600 border border-white rounded-full text-[7px] flex items-center justify-center text-white font-black">{unreadNotificationsCount}</span>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 leading-tight text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Notifikasi</span>
            </button>
            <button onClick={() => onNavigate('profil')} className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-600 flex items-center justify-center text-white group-hover:scale-105 transition-all shadow-md shadow-slate-600/20"><User className="w-5 h-5 sm:w-5 sm:h-5" /></div>
              <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 leading-tight text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Akun</span>
            </button>
          </div>
        </div>

        {/* Owner Quick Access (Harga, Audit, Laporan, Sistem) - Moved Up */}
        <div className="grid grid-cols-4 gap-2">
           {[
             { label: 'Harga', icon: Settings, tab: 'produk', color: 'violet' },
             { label: 'Audit', icon: Activity, tab: 'riwayat', color: 'rose' },
             { label: 'Laporan', icon: FileText, tab: 'laporan', color: 'blue' },
             { label: 'Sistem', icon: ShieldCheck, tab: 'profil', color: 'slate' }
           ].map((btn) => (
             <button 
               key={btn.label}
               onClick={() => onNavigate(btn.tab as any)} 
               className={`flex-1 flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700/50'}`}
             >
               <div className={`w-8 h-8 rounded-full bg-${btn.color}-500 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-md shadow-${btn.color}-500/20`}>
                 <btn.icon className="w-4 h-4" />
               </div>
               <span className={`text-[7px] font-black uppercase tracking-widest ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{btn.label}</span>
             </button>
           ))}
        </div>

        
        {/* Cashier Filter for Owner */}
        <div className="flex items-center justify-between mb-3 mt-4 px-1">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Filter Kinerja:</span>
          </div>
          <select 
            value={ownerFilterCashier}
            onChange={(e) => setOwnerFilterCashier(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-900 dark:text-white rounded-lg px-2 py-1 outline-none focus:border-indigo-500 shadow-sm appearance-none cursor-pointer"
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          >
            <option value="Semua Kasir" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Semua Kasir (Global)</option>
            {uniqueCashiersToday.map(c => (
              <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c}</option>
            ))}
          </select>
        </div>

        {/* Dynamic Financial Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* ASET GLOBAL */}
          {userRole === 'owner' && (
            <div className={`col-span-2 border p-4 rounded-[1.5rem] relative overflow-hidden flex items-center justify-between shadow-sm ${isLight ? 'bg-violet-50/50 border-violet-200' : 'bg-violet-950/20 border-violet-500/20'}`}>
              <div>
                <p className={`text-[8px] font-black uppercase tracking-widest mb-1.5 ${isLight ? 'text-violet-700' : 'text-violet-400'}`}>Nilai Aset Seluruh Stok (Global)</p>
                <p className={`text-xl font-black tracking-tight ${isLight ? 'text-violet-900' : 'text-white'}`}>Rp {ownerStats.totalAssetValue.toLocaleString('id-ID')}</p>
              </div>
              <Database className={`w-8 h-8 ${isLight ? 'text-violet-500/20' : 'text-violet-500/30'}`} />
            </div>
          )}

          {/* KEUANGAN (Berdasarkan Filter) */}
          {userRole === 'owner' ? (
            <div className={`col-span-2 p-4 rounded-[1.5rem] shadow-sm border relative overflow-hidden ${isLight ? 'bg-blue-50/50 border-blue-200' : 'bg-blue-950/20 border-blue-500/20'}`}>
              <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
              <div className="flex items-start justify-between">
                <div className="space-y-3 w-full">
                  <div className="flex items-center gap-3">
                    <TrendingUp className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>Keuntungan Bersih</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isLight ? 'text-blue-800/60' : 'text-blue-200/50'}`}>Total Penjualan (Omset)</p>
                      <p className={`text-sm font-bold ${isLight ? 'text-blue-900' : 'text-blue-100'}`}>Rp {ownerStats.totalRevenue.toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isLight ? 'text-blue-800/60' : 'text-blue-200/50'}`}>Total Modal Terjual</p>
                      <p className={`text-sm font-bold ${isLight ? 'text-blue-900' : 'text-blue-100'}`}>Rp {(ownerStats.totalRevenue - ownerStats.totalProfit).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  
                  <div className={`pt-2 mt-2 border-t ${isLight ? 'border-blue-200/60' : 'border-blue-500/20'} flex items-center justify-between`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-blue-800' : 'text-blue-300'}`}>Laba Bersih (Margin)</p>
                    <p className={`text-xl font-black tracking-tight ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>Rp {ownerStats.totalProfit.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`bg-slate-100 dark:bg-slate-800 border p-4 rounded-[1.5rem] shadow-sm ${isLight ? 'bg-blue-50/50 border-blue-200' : 'bg-blue-950/20 border-blue-500/20'}`}>
              <p className={`text-[8px] font-black uppercase tracking-widest mb-1.5 ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>Omzet Pendapatan</p>
              <p className={`text-lg font-black tracking-tight leading-none ${isLight ? 'text-blue-900' : 'text-white'}`}>Rp {ownerStats.totalRevenue.toLocaleString('id-ID')}</p>
            </div>
          )}

          <div className={`p-4 rounded-[1.5rem] flex flex-col justify-center shadow-sm relative overflow-hidden border ${userRole === 'owner' ? 'col-span-2' : ''} ${isLight ? 'bg-rose-50/50 border-rose-200' : 'bg-rose-950/20 border-rose-500/20'}`}>
            <div className={`absolute right-2 top-2 opacity-10 ${isLight ? 'text-rose-900' : 'text-rose-400'}`}>
              <Activity className="w-10 h-10" />
            </div>
            <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>Total Terjual</p>
            <p className={`text-2xl font-black tracking-tight leading-none mt-1 ${isLight ? 'text-rose-900' : 'text-white'}`}>{ownerStats.totalItemsSold} <span className={`text-[10px] font-bold ml-0.5 uppercase ${isLight ? 'text-rose-700/60' : 'text-rose-200/50'}`}>Voucher</span></p>
          </div>

          {/* STOK FISIK (Berdasarkan Filter) */}
          <div className={`col-span-2 border p-4 rounded-[1.5rem] flex items-center justify-between mt-1 shadow-sm relative overflow-hidden ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-800/80 border-slate-700/50'}`}>
             <div className="absolute top-0 left-0 w-1 h-full bg-slate-500/50"></div>
             <div className="text-center w-full">
              <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Stok Awal</p>
              <p className="text-xl font-black text-slate-800 dark:text-slate-200 leading-none">{ownerStats.stokAwal.toLocaleString('id-ID')}</p>
              <p className="text-[6px] font-black text-slate-400 dark:text-slate-500 uppercase mt-1 tracking-widest">Saat Buka</p>
            </div>
            
            <div className="px-4 text-slate-400 dark:text-slate-600 flex flex-col items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 mb-1"></div>
              <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 mt-1"></div>
            </div>
            
            <div className="text-center w-full">
              <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Stok Akhir</p>
              <p className="text-xl font-black text-slate-800 dark:text-slate-200 leading-none">{ownerStats.stokAkhir.toLocaleString('id-ID')}</p>
              <p className="text-[6px] font-black text-slate-400 dark:text-slate-500 uppercase mt-1 tracking-widest">Tersisa Saat Ini</p>
            </div>
          </div>
        </div>

        
        {ownerStats.lowStockCount > 0 && (
          <div 
            onClick={() => setShowLowStockModal(true)}
            className="mb-6 bg-rose-500/10 border border-rose-500/20 p-3 rounded-[1rem] flex items-center justify-between cursor-pointer animate-pulse-slow"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <div>
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none">Peringatan Stok Habis</p>
                <p className="text-[8px] font-bold text-rose-500 font-black dark:text-rose-400 mt-1">Ada {ownerStats.lowStockCount} produk yang perlu segera direstock</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-rose-500/50" />
          </div>
        )}

        
        {/* Trending Voucher Section */}
        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-4 mb-6 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Flame className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">Produk Terlaris</h3>
                <p className="text-[7px] font-bold text-slate-600 dark:text-slate-400 mt-1">Top 5 Voucher Penjualan Terbanyak</p>
              </div>
            </div>
            
            <input 
              type="date" 
              value={trendingDate}
              onChange={(e) => setTrendingDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[9px] font-bold text-slate-900 dark:text-white rounded-md px-2 py-1 outline-none focus:border-orange-500/50 shadow-sm"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2 relative z-10">
            {trendingProducts.length > 0 ? (
              trendingProducts.map((item, index) => (
                <div key={item.product?.id} onClick={() => item.product && onSelectProduct(item.product)} className="flex items-center justify-between bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:bg-white/10 p-2 rounded-xl cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${
                      index === 0 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 
                      index === 1 ? 'bg-slate-300/20 text-slate-600 dark:text-slate-300 border border-slate-300/30' :
                      index === 2 ? 'bg-orange-600/20 text-orange-600 border border-orange-600/30' :
                      'bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{item.product?.name}</p>
                      <p className="text-[8px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{item.product?.operator}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-500 font-black dark:text-emerald-400">{item.totalQty} <span className="text-[7px] font-bold text-emerald-500/50">PCS</span></p>
                    <p className="text-[8px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">Rp {item.totalRevenue.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-xl bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent">
                <Search className="w-6 h-6 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Belum Ada Transaksi</p>
                <p className="text-[8px] font-bold text-slate-600 dark:text-slate-400 mt-1">Pada tanggal yang dipilih</p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Recap - Refined Table */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
            <h3 className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Recap Audit Selisih</h3>
            <span className="text-[7px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded uppercase">Daily</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[7px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-white/5">
                  <th className="pl-5 py-3 w-[25%]">VOUCHER</th>
                  <th className="px-2 py-3 text-center">AWAL</th>
                  <th className="px-2 py-3 text-center">MASUK</th>
                  <th className="px-2 py-3 text-center">AKHIR</th>
                  <th className="px-2 py-3 text-center">KELUAR</th>
                  <th className="pr-5 py-3 text-right">OMZET</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stockMovement.map((item) => (
                  <tr key={item.id} className="active:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent transition-colors">
                    <td className="pl-5 py-3">
                      <p className="text-[8px] font-black text-slate-900 dark:text-white truncate max-w-[80px] uppercase leading-tight">{item.name}</p>
                    </td>
                    <td className="px-2 py-3 text-center text-[9px] font-bold text-slate-600 dark:text-slate-400">
                      {item.currentStock + item.sold - item.restock}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className={`text-[9px] font-black ${item.restock > 0 ? 'text-emerald-500 font-black dark:text-emerald-400' : 'text-slate-600'}`}>
                        {item.restock > 0 ? `+${item.restock}` : '0'}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="text-[9px] font-black text-slate-900 dark:text-white">{item.currentStock}</span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className={`text-[9px] font-black ${item.sold > 0 ? 'text-rose-500 font-black dark:text-rose-400' : 'text-slate-600'}`}>
                        {item.sold > 0 ? `-${item.sold}` : '0'}
                      </span>
                    </td>
                    <td className="pr-5 py-3 text-right">
                      <p className="text-[9px] font-black text-amber-500 font-black dark:text-amber-400">Rp {item.revenue.toLocaleString('id-ID')}</p>
                    </td>
                  </tr>
                ))}
                {stockMovement.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center opacity-30">
                      <p className="text-[8px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Tidak ada aktivitas</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Low Stock Owner */}
        <AnimatePresence>
          {showLowStockModal && (
            <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/15 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]"
              >
                <button 
                  onClick={() => setShowLowStockModal(false)}
                  className="absolute top-4 right-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent transition cursor-pointer z-10"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2 mb-4 shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 font-black dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Low Stock</h3>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400">{lowStockProducts.length} produk butuh restock</p>
                  </div>
                </div>

                <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                  {lowStockProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-600 dark:text-slate-400 text-center bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-white/5">
                      <CheckCircle className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
                      <p className="text-xs font-bold">Semua Stok Aman!</p>
                    </div>
                  ) : (
                    lowStockProducts.map((p) => {
                      const isEmpty = p.currentStock === 0;
                      return (
                        <div 
                          key={p.id}
                          onClick={() => {
                            setShowLowStockModal(false);
                            onSelectProduct(p);
                          }}
                          className={`border rounded-xl p-2.5 flex items-center justify-between transition cursor-pointer ${
                            isEmpty 
                              ? 'bg-rose-500/15 border-rose-500/30' 
                              : 'bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border-slate-200 dark:border-white/5 hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <ProviderLogo operator={p.operator} category={p.category} size="sm" />
                            <div className="min-w-0">
                              <h5 className={`text-xs font-bold truncate ${isEmpty ? 'text-rose-300' : 'text-slate-900 dark:text-white'}`}>{p.name}</h5>
                              <p className="text-[9px] text-slate-600 dark:text-slate-400 truncate">
                                {isEmpty ? '⚠️ SEGERA RESTOCK!' : `Modal: Rp ${p.costPrice.toLocaleString('id-ID')}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              isEmpty 
                                ? 'bg-rose-600/30 text-rose-500 font-black dark:text-rose-400 border-rose-500/40 animate-pulse' 
                                : 'bg-red-500/10 text-red-500 font-black dark:text-red-400 border-red-500/15'
                            }`}>
                              {p.currentStock} STOK
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-4" id="dashboard-tab-container">
      {/* Quick Action Buttons Section */}
      <div className="space-y-4" id="dashboard-quick-actions-panel">
        {/* ROW 1: 4 Large Priority Action Buttons (PRODUK, ATUR STOK, RESTOK, RIWAYAT) */}
        <div className={`grid grid-cols-4 gap-2 rounded-3xl p-3 shadow-sm border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700/50'}`} id="dashboard-priority-actions-bar">
          {/* 1. PRODUK */}
          <button
            type="button"
            onClick={() => onNavigate('produk')}
            className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            id="btn-quick-produk"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-violet-500 shadow-lg shadow-violet-500/30 flex items-center justify-center text-white group-hover:scale-105 transition-all">
              <Package className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className={`text-[9px] sm:text-[10px] font-black mt-2 leading-tight text-center uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              PRODUK
            </span>
          </button>

          {/* 2. ATUR STOK */}
          <button
            type="button"
            onClick={() => onNavigate('stok')}
            className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            id="btn-quick-atur-stok"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-sky-500 shadow-lg shadow-sky-500/30 flex items-center justify-center text-white group-hover:scale-105 transition-all">
              <SlidersHorizontal className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className={`text-[9px] sm:text-[10px] font-black mt-2 leading-tight text-center uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              ATUR STOK
            </span>
          </button>

          {/* 3. RESTOK */}
          <button
            type="button"
            onClick={onOpenQuickRestock}
            className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            id="btn-quick-restok"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white group-hover:scale-105 transition-all">
              <PlusCircle className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className={`text-[9px] sm:text-[10px] font-black mt-2 leading-tight text-center uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              RESTOK
            </span>
          </button>

          {/* 4. RIWAYAT */}
          <button
            type="button"
            onClick={() => onNavigate('riwayat')}
            className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            id="btn-quick-riwayat"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30 flex items-center justify-center text-white group-hover:scale-105 transition-all">
              <History className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className={`text-[9px] sm:text-[10px] font-black mt-2 leading-tight text-center uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              RIWAYAT
            </span>
          </button>
        </div>

        {/* ROW 2: 5 Standard Compact Buttons (Jual Cepat, Pencarian, Laporan, Notifikasi, Akun) */}
        <div className={`grid grid-cols-5 gap-1 sm:gap-2 rounded-3xl p-3 shadow-sm border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700/50'}`} id="dashboard-secondary-actions-bar">
          {/* 1. Jual Cepat */}
          <button
            type="button"
            onClick={onOpenQuickSale}
            className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            id="btn-quick-jual"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-orange-500 flex items-center justify-center text-white group-hover:scale-105 transition-all shadow-md shadow-orange-500/20">
              <ShoppingCart className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
            <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 leading-tight text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Jual Cepat
            </span>
          </button>

          {/* 2. Pencarian */}
          <button
            type="button"
            onClick={() => onNavigate('pencarian')}
            className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            id="btn-quick-pencarian"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-fuchsia-500 flex items-center justify-center text-white group-hover:scale-105 transition-all shadow-md shadow-fuchsia-500/20">
              <Search className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
            <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 leading-tight text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Pencarian
            </span>
          </button>

          {/* 3. Laporan */}
          <button
            type="button"
            onClick={() => onNavigate('laporan')}
            className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            id="btn-quick-laporan"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-500 flex items-center justify-center text-white group-hover:scale-105 transition-all shadow-md shadow-blue-500/20">
              <BarChart3 className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
            <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 leading-tight text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Laporan
            </span>
          </button>

          {/* 4. Notifikasi */}
          <button
            type="button"
            onClick={() => onNavigate('notif')}
            className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            id="btn-quick-notifikasi"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-red-500 flex items-center justify-center text-white group-hover:scale-105 transition-all shadow-md shadow-red-500/20">
              <Bell className="w-5 h-5 sm:w-5 sm:h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 bg-red-500 text-[8px] sm:text-[9px] font-black text-slate-900 dark:text-white items-center justify-center leading-none">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                </span>
              )}
            </div>
            <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 leading-tight text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Notifikasi
            </span>
          </button>

          {/* 5. Akun */}
          <button
            type="button"
            onClick={() => onNavigate('profil')}
            className="group relative flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
            id="btn-quick-profil"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-600 flex items-center justify-center text-white group-hover:scale-105 transition-all shadow-md shadow-slate-600/20">
              <User className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
            <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 leading-tight text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Akun
            </span>
          </button>
        </div>
      </div>

      {/* Dashboard Analytics Section */}
      <div className="grid grid-cols-2 gap-4" id="dashboard-analytics-cards">
        <div className={`col-span-2 border rounded-2xl p-4 flex items-center justify-between ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-gradient-to-r from-indigo-600/10 to-transparent border-slate-200 dark:border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-500">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h4 className={`text-[11px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Analitik Hari Ini</h4>
              <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>Performa transaksi shift berjalan</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm sm:text-base font-black ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>{(totalTunaiToday + totalQrisToday).toLocaleString('id-ID')}</div>
            <div className={`text-[9px] font-bold uppercase tracking-tight ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Total Omzet</div>
          </div>
        </div>

        {/* Card 1: Saldo Tunai (Laci) */}
        <div className={`border rounded-2xl p-3.5 space-y-1 ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 shadow-lg'
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Tunai di Laci</span>
          </div>
          <div className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>Rp {totalTunaiToday.toLocaleString('id-ID')}</div>
          <p className={`text-[8px] font-bold leading-tight ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Uang fisik yang harus ada di laci saat ini.</p>
        </div>

        {/* Card 2: Saldo Digital (QRIS) */}
        <div className={`border rounded-2xl p-3.5 space-y-1 ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 shadow-lg'
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-500">
              <ScanLine className="w-3.5 h-3.5" />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Saldo QRIS/TF</span>
          </div>
          <div className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>Rp {totalQrisToday.toLocaleString('id-ID')}</div>
          <p className={`text-[8px] font-bold leading-tight ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Total dana masuk lewat Jual Cepat (Non-Tunai).</p>
        </div>

        {/* Card 3: Voucher Terlaris Today (Full Width) */}
        {topSoldVoucher && (
          <div className="col-span-2 bg-white dark:bg-slate-800 border border-indigo-500/10 rounded-2xl p-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/10">
                <Flame className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-black text-amber-500/80 uppercase tracking-widest">Produk Terlaris Hari Ini</div>
                <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">{topSoldVoucher.name}</h5>
              </div>
            </div>
            <div className="shrink-0 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 text-center">
              <div className="text-xs font-black text-amber-500 font-black dark:text-amber-400">{topSoldVoucher.qty}</div>
              <div className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">Pcs</div>
            </div>
          </div>
        )}
      </div>

      {/* 3 Stats Grid */}
      <div className={`grid ${userRole === 'owner' ? 'grid-cols-3' : 'grid-cols-2'} gap-2`} id="dashboard-stats-grid">
        {/* Total Stock */}
        <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-center flex flex-col justify-between" id="stat-total-stock">
          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide line-clamp-1">Total Stok</span>
          <div className="text-xl font-black text-slate-900 dark:text-white my-1">{totalStock.toLocaleString('id-ID')}</div>
          <span className="text-[8px] text-slate-600 dark:text-slate-400 font-bold">Voucher</span>
        </div>

        {/* Nilai Inventaris */}
        {userRole === 'owner' && (
          <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-center flex flex-col justify-between" id="stat-inventory-value">
            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide line-clamp-1">Nilai Inventaris</span>
            <div className="text-xl font-black text-emerald-500 font-black dark:text-emerald-400 my-1">{formatIDRCompact(totalValue)}</div>
            <span className="text-[8px] text-slate-600 dark:text-slate-400 font-bold">Rp (Modal)</span>
          </div>
        )}

        {/* Penjualan Hari Ini */}
        <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-center flex flex-col justify-between" id="stat-sales-today">
          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide line-clamp-1">Penjualan</span>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 my-1">{todaySalesCount} Pcs</div>
          <span className="text-[8px] text-slate-600 dark:text-slate-400 font-bold">Hari Ini</span>
        </div>
      </div>

      {/* Stok Rendah Panel with "Semua >" */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3" id="dashboard-low-stock-panel">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Stok Rendah
          </h4>
          <button 
            onClick={() => onNavigate('produk')}
            className="text-[10px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5 font-bold"
          >
            Semua <ChevronRight className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-slate-600 dark:text-slate-400 text-center bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-white/5">
            <CheckCircle className="h-6 w-6 text-emerald-500 mb-1" />
            <p className="text-[10px] font-bold">Semua Stok Aman!</p>
          </div>
        ) : (
          <div className="space-y-2.5" id="low-stock-list">
            {lowStockProducts.slice(0, 3).map((p) => {
              const opStyle = OPERATOR_STYLES[p.operator] || { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/10', logoBg: 'bg-slate-500' };
              const isEmpty = p.currentStock === 0;
              
              return (
                <div 
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  className={`border rounded-xl p-2.5 flex items-center justify-between transition cursor-pointer ${
                    isEmpty 
                      ? 'bg-rose-500/15 border-rose-500/30 animate-pulse-slow' 
                      : 'bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border-slate-200 dark:border-white/5 hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <ProviderLogo operator={p.operator} category={p.category} size="sm" />
                    <div className="min-w-0">
                      <h5 className={`text-xs font-bold truncate ${isEmpty ? 'text-rose-300' : 'text-slate-900 dark:text-white'}`}>{p.name}</h5>
                      <p className="text-[9px] text-slate-600 dark:text-slate-400 truncate">
                        {isEmpty ? '⚠️ SEGERA RESTOCK!' : `Rp ${p.sellingPrice.toLocaleString('id-ID')}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isEmpty 
                        ? 'bg-rose-600/30 text-rose-500 font-black dark:text-rose-400 border-rose-500/40' 
                        : 'bg-red-500/10 text-red-500 font-black dark:text-red-400 border-red-500/15'
                    }`}>
                      {p.currentStock} STOK
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aktivitas Terbaru (Transparency audit feed) */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3" id="recent-activities-panel">
        <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300">
          Aktivitas Terbaru
        </h4>

        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1" id="activity-log-list">
          {transactions.length === 0 ? (
            <p className="text-[10px] text-slate-600 dark:text-slate-400 py-3 text-center italic">Belum ada transaksi hari ini.</p>
          ) : (
            transactions.slice(0, 10).map((trx) => (
              <div 
                key={trx.id}
                className="p-2.5 rounded-xl bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 flex items-start gap-4 justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{trx.productName}</p>
                  <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-0.5 font-bold">Oleh: {trx.cashierName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[10px] font-black ${
                    trx.type === 'PENJUALAN' ? 'text-red-500 font-black dark:text-red-400' : 
                    (trx.type === 'RESTOCK' || trx.type === 'TAMBAH_STOK') ? 'text-emerald-500 font-black dark:text-emerald-400' : 
                    trx.type === 'EDIT_STOK' ? (trx.notes?.includes('bertambah') ? 'text-emerald-500 font-black dark:text-emerald-400' : 'text-amber-500 font-black dark:text-amber-400') : 
                    'text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {trx.type === 'PENJUALAN' ? '-' : 
                     (trx.type === 'RESTOCK' || trx.type === 'TAMBAH_STOK') ? '+' : 
                     trx.type === 'EDIT_STOK' ? (trx.notes?.includes('bertambah') ? '+' : '-') : ''}{trx.quantity} Pcs
                  </p>
                  <p className="text-[7px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                    {trx.notes}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Barcode Scanner simulator modal */}
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="modal-barcode-checker">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-slate-200 shadow-sm dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-xs rounded-2xl p-5 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => {
                  setShowScanner(false);
                  setScannedCode('');
                  setScanResult(null);
                }}
                className="absolute top-4 right-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent transition"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <QrCode className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-black text-slate-900 dark:text-white">Scan & Cek Voucher</h3>
              </div>

              <form onSubmit={handleMockScanSubmit} className="space-y-3.5">
                <div>
                  <input 
                    type="text" 
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    placeholder="Barcode atau Nama..."
                    className="w-full bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 transition"
                    autoFocus
                  />
                </div>

                <div className="flex justify-between items-center bg-white/2 p-2 rounded-lg border border-slate-200 dark:border-white/5">
                  <span className="text-[9px] text-slate-600 dark:text-slate-400">Simulasi acak voucher:</span>
                  <button
                    type="button"
                    onClick={selectRandomBarcode}
                    className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-bold cursor-pointer"
                  >
                    Acak Kode
                  </button>
                </div>
              </form>

              {/* Scan result display */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                {scanResult ? (
                  <div className="space-y-3 bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl p-3">
                    <div>
                      <span className="text-[8px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {scanResult.operator}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1.5">{scanResult.name}</h4>
                    </div>

                    <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-200 dark:border-white/5">
                      <span className="text-slate-600 dark:text-slate-400">Stok Saat Ini:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{scanResult.currentStock} Pcs</span>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => {
                          onQuickAdjustStock(scanResult.id, 1);
                          const updated = products.find(p => p.id === scanResult.id);
                          if (updated) setScanResult({ ...updated, currentStock: updated.currentStock + 1 });
                        }}
                        className="flex-1 py-1 bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-500 font-black dark:text-emerald-400 text-[10px] font-bold rounded-lg transition border border-emerald-500/20 cursor-pointer"
                      >
                        +1 Stok
                      </button>
                      <button
                        onClick={() => {
                          if (scanResult.currentStock > 0) {
                            onQuickAdjustStock(scanResult.id, -1);
                            const updated = products.find(p => p.id === scanResult.id);
                            if (updated) setScanResult({ ...updated, currentStock: updated.currentStock - 1 });
                          }
                        }}
                        disabled={scanResult.currentStock <= 0}
                        className="flex-1 py-1 bg-red-600/15 hover:bg-red-600/30 text-red-500 font-black dark:text-red-400 text-[10px] font-bold rounded-lg transition border border-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        -1 Stok
                      </button>
                    </div>
                  </div>
                ) : scannedCode ? (
                  <p className="text-center text-[10px] text-slate-600 dark:text-slate-400 py-3">⚠️ Kode "{scannedCode}" tidak ditemukan.</p>
                ) : (
                  <p className="text-center text-[9px] text-slate-600 dark:text-slate-400 py-3 leading-relaxed">Masukkan kode barcode atau klik acak di atas untuk pengecekan.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal ATUR STOK Menu */}
      <AnimatePresence>
        {showAturStokModal && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="modal-atur-stok">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/15 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setShowAturStokModal(false)}
                className="absolute top-4 right-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-black dark:text-emerald-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Menu Atur Stok</h3>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">Pilih opsi kelola stok voucher</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Opsi 1: Tambah Stok Masuk (Restock) */}
                <button
                  onClick={() => {
                    setShowAturStokModal(false);
                    onOpenQuickRestock();
                  }}
                  className="w-full p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-between text-left transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 font-black dark:text-emerald-400 flex items-center justify-center">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-300 transition">Tambah Stok Masuk (Restock)</h4>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400">Input stok voucher baru masuk</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-500 font-black dark:text-emerald-400 group-hover:translate-x-0.5 transition" />
                </button>

                {/* Opsi 2: Catat Penjualan / Pengeluaran */}
                <button
                  onClick={() => {
                    setShowAturStokModal(false);
                    onOpenQuickSale();
                  }}
                  className="w-full p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 flex items-center justify-between text-left transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-500 font-black dark:text-rose-400 flex items-center justify-center">
                      <MinusCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-300 transition">Catat Penjualan / Keluar</h4>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400">Kurangi stok saat transaksi terjual</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-500 font-black dark:text-rose-400 group-hover:translate-x-0.5 transition" />
                </button>

                {/* Opsi 3: Kelola di Halaman Produk */}
                <button
                  onClick={() => {
                    setShowAturStokModal(false);
                    onNavigate('produk');
                  }}
                  className="w-full p-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-between text-left transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-700 dark:text-indigo-300 transition">Daftar & Edit Stok Produk</h4>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400">Lihat semua stok & ubah batas min. alert</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Notifikasi Lengkap */}
      <AnimatePresence>
        {showNotificationModal && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="modal-notifikasi-dashboard">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-3xl p-5 shadow-2xl relative overflow-hidden border ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/15 text-slate-900 dark:text-white'
              }`}
            >
              <button 
                onClick={() => setShowNotificationModal(false)}
                className={`absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer ${
                  isLight ? 'text-slate-600 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent'
                }`}
              >
                <X className="h-5 w-5" />
              </button>

              <div className={`flex items-center justify-between pb-3 border-b mb-4 ${isLight ? 'border-slate-100' : 'border-slate-200 dark:border-white/10'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>Pusat Notifikasi</h3>
                    <p className={`text-xs font-bold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>{notifications.length} pemberitahuan log aktivitas</p>
                  </div>
                </div>

                {unreadNotificationsCount > 0 && onMarkNotificationsRead && (
                  <button 
                    onClick={onMarkNotificationsRead}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      isLight ? 'text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100' : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20'
                    }`}
                  >
                    Tandai Dibaca
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-10 text-slate-600 dark:text-slate-400">
                    <CheckCircle className="w-10 h-10 mx-auto text-emerald-500/70 mb-2" />
                    <p className="text-sm font-bold">Semua notifikasi aman & kosong.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      className={`p-3.5 rounded-2xl border transition ${
                        isLight
                          ? n.type === 'warning' 
                            ? 'bg-red-50 border-red-200 text-red-950 shadow-xs' 
                            : n.type === 'transfer' 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-xs' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs'
                          : n.type === 'warning' 
                            ? 'bg-red-500/15 border-red-500/30 text-red-100' 
                            : n.type === 'transfer' 
                            ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-100' 
                            : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-black flex items-center gap-3 ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                          {n.type === 'warning' ? '🚨' : n.type === 'transfer' ? '🔄' : '🔔'}
                          {n.title}
                        </span>
                        <span className={`text-[10px] font-mono shrink-0 px-2 py-0.5 rounded-md ${isLight ? 'bg-white text-slate-600 border border-slate-200' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'}`}>
                          {new Date(n.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-xs mt-1.5 leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-600 dark:text-slate-300'}`}>{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${isLight ? 'border-slate-100' : 'border-slate-200 dark:border-white/10'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationModal(false);
                    onNavigate('notif');
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                    isLight ? 'bg-indigo-600 hover:bg-indigo-700 text-slate-900 dark:text-white keep-white shadow-xs' : 'bg-indigo-600 hover:bg-indigo-500 text-white keep-white'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  Buka Halaman Notifikasi & Audit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
