/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  History, 
  ArrowRightLeft, 
  Layers, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  Clock,
  User,
  ShieldCheck,
  Award,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Zap,
  Info,
  BarChart3,
  CalendarDays,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { 
  ShiftHandover, 
  Transaction, 
  VoucherProduct, 
  UserRole, 
  Cashier, 
  DetailedHandoverRecord,
  DailySummaryRecord,
  MonthlySummaryRecord 
} from '../types';

interface LaporanTabProps {
  shiftHandovers: ShiftHandover[];
  transactions: Transaction[];
  products: VoucherProduct[];
  activeCashierName: string;
  nextCashierName: string;
  userRole: UserRole;
  allCashiers?: Cashier[];
  detailedHandovers?: DetailedHandoverRecord[];
  activeStoreId?: string;
  onOpenHandoverModal: () => void;
}

export default function LaporanTab({
  shiftHandovers,
  transactions,
  products,
  activeCashierName,
  nextCashierName,
  userRole,
  allCashiers = [],
  detailedHandovers = [],
  activeStoreId,
  onOpenHandoverModal
}: LaporanTabProps) {
  // Navigation Sub-tab: 'harian' (Halaman 1) | 'bulanan' (Halaman 2)
  const [mainSubTab, setMainSubTab] = useState<'harian' | 'bulanan'>('harian');

  // Filter mode di Tab Harian: 'date' (spesifik tanggal) | 'month' (seluruh bulan berjalan)
  const [filterMode, setFilterMode] = useState<'date' | 'month'>('date');

  const [dateFilter, setDateFilter] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
  );
  const [typeFilter, setTypeFilter] = useState<'SEMUA' | 'PENJUALAN' | 'RESTOCK' | 'SERAH_TERIMA' | 'PASCA_CLOSING'>('SEMUA');
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>(
    userRole === 'owner' ? 'SEMUA' : activeCashierName
  );

  useEffect(() => {
    if (userRole !== 'owner') {
      setSelectedCashierFilter(activeCashierName);
    }
  }, [userRole, activeCashierName]);

  // Expanded accordion month in Tab 2
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const { todayStr, yesterdayStr, currentMonthKey } = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const yStr = new Date(yesterday.getTime() - yesterday.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    return {
      todayStr: tStr,
      yesterdayStr: yStr,
      currentMonthKey: tStr.substring(0, 7) // YYYY-MM
    };
  }, []);

  const getMonthLabel = (monthKey: string): string => {
    const parts = monthKey.split('-');
    if (parts.length !== 2) return monthKey;
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[month - 1] || parts[1]} ${year}`;
  };

  const formatDateIndo = (dateStr: string): string => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ENGINE AGREGASI REKAP HARIAN & BULANAN (Pre-Aggregated Running Cache)
  // ──────────────────────────────────────────────────────────────────────────
  const { dailySummaries, monthlySummaries } = useMemo(() => {
    const dailyMap = new Map<string, DailySummaryRecord>();

    // A. Masukkan dari detailedHandovers (semua shift yang sudah tutup)
    detailedHandovers.forEach((h) => {
      const date = h.date || (h.timestamp ? h.timestamp.split('T')[0] : '');
      if (!date) return;

      // Hitung profit untuk shift ini
      let handoverProfit = 0;
      (h.productsSummary || []).forEach(p => {
        const soldCount = p.soldStock ?? (p as any).soldPcs ?? Math.max(0, (p.initialStock + (p.incomingStock || 0)) - p.finalStock);
        const product = products.find(prod => prod.id === p.productId);
        const cogs = product ? product.costPrice : 0;
        handoverProfit += (soldCount * (p.price - cogs));
      });

      const tunai = (h.totalSalesAmount || 0) - (h.qrisAmount || 0);
      const qris = h.qrisAmount || 0;
      const omzet = h.totalSalesAmount || 0;
      const qty = h.totalSoldPcs || 0;

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          omzet: 0,
          profit: 0,
          tunai: 0,
          nonTunai: 0,
          quantity: 0,
          shiftCount: 0
        });
      }

      const current = dailyMap.get(date)!;
      current.omzet += omzet;
      current.profit += handoverProfit;
      current.tunai += tunai;
      current.nonTunai += qris;
      current.quantity += qty;
      current.shiftCount += 1;
    });

    // B. Masukkan penjualan shift aktif hari ini (transaksi berjalan yang belum di-closing)
    const todayHandovers = detailedHandovers.filter(h => (h.date === todayStr || (h.timestamp && h.timestamp.split('T')[0] === todayStr)));
    const lastHandoverTime = todayHandovers.length > 0 
      ? Math.max(...todayHandovers.map(h => new Date(h.timestamp).getTime()))
      : 0;

    const activeTodaySales = transactions
      .filter(t => t.type === 'PENJUALAN')
      .filter(t => {
        const tDate = new Date(new Date(t.timestamp).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const tTime = new Date(t.timestamp).getTime();
        return tDate === todayStr && tTime > lastHandoverTime;
      });

    if (activeTodaySales.length > 0) {
      if (!dailyMap.has(todayStr)) {
        dailyMap.set(todayStr, {
          date: todayStr,
          omzet: 0,
          profit: 0,
          tunai: 0,
          nonTunai: 0,
          quantity: 0,
          shiftCount: 0
        });
      }

      const todayRec = dailyMap.get(todayStr)!;
      activeTodaySales.forEach(s => {
        const amt = s.amount || 0;
        const q = s.quantity || 0;
        const cogs = s.cogs || ((products.find(p => p.id === s.productId)?.costPrice || 0) * q);
        const pMethod = s.paymentMethod;
        const notes = s.notes || '';

        todayRec.omzet += amt;
        todayRec.profit += (amt - cogs);
        todayRec.quantity += q;

        if (pMethod === 'NON_TUNAI' || pMethod === 'QRIS' || pMethod === 'TRANSFER' || notes.includes('[NON_TUNAI]') || notes.includes('[QRIS]') || notes.includes('[TRANSFER]')) {
          todayRec.nonTunai += amt;
        } else {
          todayRec.tunai += amt;
        }
      });
    }

    // Urutkan daftar harian dari tanggal terbaru
    const dailyList = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    // C. Agregasi ke Bulanan
    const monthlyMap = new Map<string, MonthlySummaryRecord>();
    dailyList.forEach(d => {
      const monthKey = d.date.substring(0, 7); // YYYY-MM
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          monthKey,
          monthLabel: getMonthLabel(monthKey),
          totalOmzet: 0,
          totalProfit: 0,
          totalTunai: 0,
          totalNonTunai: 0,
          totalQuantity: 0,
          daysActive: 0,
          avgDailySales: 0,
          isClosed: monthKey < currentMonthKey
        });
      }

      const mRec = monthlyMap.get(monthKey)!;
      mRec.totalOmzet += d.omzet;
      mRec.totalProfit += d.profit;
      mRec.totalTunai += d.tunai;
      mRec.totalNonTunai += d.nonTunai;
      mRec.totalQuantity += d.quantity;
      if (d.omzet > 0 || d.quantity > 0) {
        mRec.daysActive += 1;
      }
    });

    // Hitung rata-rata penjualan per hari
    monthlyMap.forEach(m => {
      m.avgDailySales = m.daysActive > 0 ? Math.round(m.totalOmzet / m.daysActive) : 0;
    });

    const monthlyList = Array.from(monthlyMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    return {
      dailySummaries: dailyList,
      monthlySummaries: monthlyList
    };
  }, [detailedHandovers, transactions, products, todayStr, currentMonthKey]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. AUTO-SYNC & ONLINE DATABASE PERSISTENCE
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const storeKey = activeStoreId || 'default';
    if (dailySummaries.length === 0 && monthlySummaries.length === 0) return;

    // A. Simpan ke LocalStorage segera
    try {
      localStorage.setItem(`v_${storeKey}_daily_summaries`, JSON.stringify(dailySummaries));
      localStorage.setItem(`v_${storeKey}_monthly_summaries`, JSON.stringify(monthlySummaries));
    } catch {}

    // B. Sinkronisasi Online ke Supabase
    if (!activeStoreId) return;

    const syncToCloud = async () => {
      try {
        // 1. Simpan ke store_voucher_app_data (JSONB fallback terjamin)
        const { data } = await supabase
          .from('store_voucher_app_data')
          .select('voucher_app_data')
          .eq('store_id', activeStoreId)
          .maybeSingle();

        const existingVoucherData = data?.voucher_app_data || {};
        const updatedVoucherData = {
          ...existingVoucherData,
          daily_summaries: dailySummaries,
          monthly_summaries: monthlySummaries
        };

        await supabase.from('store_voucher_app_data').upsert({
          store_id: activeStoreId,
          voucher_app_data: updatedVoucherData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'store_id' });

        // 2. Simpan ke tabel SQL baru jika tabel sudah dibuat
        try {
          if (monthlySummaries.length > 0) {
            const monthlyRows = monthlySummaries.map(m => ({
              id: `${activeStoreId}_${m.monthKey}`,
              store_id: activeStoreId,
              month_key: m.monthKey,
              month_label: m.monthLabel,
              total_omzet: m.totalOmzet,
              total_profit: m.totalProfit,
              total_tunai: m.totalTunai,
              total_non_tunai: m.totalNonTunai,
              total_quantity: m.totalQuantity,
              days_active: m.daysActive,
              avg_daily_sales: m.avgDailySales,
              is_closed: m.isClosed || false,
              updated_at: new Date().toISOString()
            }));
            await supabase.from('voucher_monthly_summaries').upsert(monthlyRows, { onConflict: 'id' });
          }

          if (dailySummaries.length > 0) {
            const dailyRows = dailySummaries.slice(0, 60).map(d => ({
              id: `${activeStoreId}_${d.date}`,
              store_id: activeStoreId,
              date: d.date,
              omzet: d.omzet,
              profit: d.profit,
              tunai: d.tunai,
              non_tunai: d.nonTunai,
              quantity: d.quantity,
              shift_count: d.shiftCount,
              updated_at: new Date().toISOString()
            }));
            await supabase.from('voucher_daily_summaries').upsert(dailyRows, { onConflict: 'id' });
          }
        } catch {
          // Tangani secara tenang jika tabel SQL baru belum di-execute user
        }
      } catch (err) {
        console.warn('Sync cloud error:', err);
      }
    };

    const timer = setTimeout(() => {
      syncToCloud();
    }, 1500);

    return () => clearTimeout(timer);
  }, [dailySummaries, monthlySummaries, activeStoreId]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const storeKey = activeStoreId || 'default';
      localStorage.setItem(`v_${storeKey}_daily_summaries`, JSON.stringify(dailySummaries));
      localStorage.setItem(`v_${storeKey}_monthly_summaries`, JSON.stringify(monthlySummaries));
      if (activeStoreId) {
        const { data } = await supabase
          .from('store_voucher_app_data')
          .select('voucher_app_data')
          .eq('store_id', activeStoreId)
          .maybeSingle();

        const existingVoucherData = data?.voucher_app_data || {};
        await supabase.from('store_voucher_app_data').upsert({
          store_id: activeStoreId,
          voucher_app_data: {
            ...existingVoucherData,
            daily_summaries: dailySummaries,
            monthly_summaries: monthlySummaries
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'store_id' });
      }
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. LOGIKA LAPORAN HARIAN (Existing Shift Sessions & Activity Logs)
  // ──────────────────────────────────────────────────────────────────────────
  const filteredActivities = useMemo(() => {
    const combined = [
      ...transactions.map(t => ({ ...t, activityType: t.type })),
      ...shiftHandovers.map(h => ({
        id: h.id,
        type: 'SERAH_TERIMA' as const,
        activityType: 'SERAH_TERIMA' as const,
        cashierName: h.fromCashierName,
        timestamp: h.timestamp,
        amount: h.inventoryValue,
        quantity: h.totalStockTransferred,
        notes: h.notes,
        toCashier: h.toCashierName
      }))
    ];

    return combined
      .filter(item => {
        const itemDate = new Date(new Date(item.timestamp).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const dateMatch = dateFilter ? itemDate === dateFilter : true;
        const typeMatch = typeFilter === 'SEMUA' 
          ? true 
          : typeFilter === 'PASCA_CLOSING'
            ? item.activityType === 'PENJUALAN' && (item.notes || '').includes('[PASCA-CLOSING]')
            : item.activityType === typeFilter;
        
        const cashierMatch = selectedCashierFilter === 'SEMUA' 
          ? true 
          : item.cashierName === selectedCashierFilter || (item as any).toCashier === selectedCashierFilter;
          
        return dateMatch && typeMatch && cashierMatch;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, shiftHandovers, dateFilter, typeFilter, selectedCashierFilter]);

  const paymentStats = useMemo(() => {
    let tunai = 0;
    let nonTunai = 0;
    let profit = 0;
    let quantity = 0;
    let pascaClosingQty = 0;

    filteredActivities.forEach(log => {
      if (log.activityType === 'PENJUALAN') {
        const amount = log.amount || 0;
        const qty = log.quantity || 0;
        quantity += qty;
        
        if (log.paymentMethod === 'NON_TUNAI' || log.paymentMethod === 'QRIS' || log.paymentMethod === 'TRANSFER') {
          nonTunai += amount;
        } else {
          tunai += amount;
        }
        
        const cogs = log.cogs || ((products.find(p => p.id === log.productId)?.costPrice || 0) * qty);
        profit += (amount - cogs);

        if ((log.notes || '').includes('[PASCA-CLOSING]')) {
          pascaClosingQty += qty;
        }
      }
    });
    
    return { tunai, nonTunai, profit, quantity, pascaClosingQty };
  }, [filteredActivities, products]);

  const shiftSessions = useMemo(() => {
    const todayHandovers = detailedHandovers
      .filter(h => {
        const hDate = new Date(new Date(h.timestamp).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return dateFilter ? hDate === dateFilter : true;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const todaySales = transactions
      .filter(t => t.type === 'PENJUALAN')
      .filter(t => {
        const tDate = new Date(new Date(t.timestamp).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return dateFilter ? tDate === dateFilter : true;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const sessionsMap = new Map<string, any>();

    todayHandovers.forEach((handover) => {
      const sessionKey = `closed-${handover.shiftNumber}-${handover.cashierFromName}`;
      
      let profit = 0;
      (handover.productsSummary || []).forEach(p => {
        const soldCount = p.soldStock ?? (p as any).soldPcs ?? Math.max(0, (p.initialStock + (p.incomingStock || 0)) - p.finalStock);
        const product = products.find(prod => prod.id === p.productId);
        const cogs = product ? product.costPrice : 0;
        profit += (soldCount * (p.price - cogs));
      });

      sessionsMap.set(sessionKey, {
        id: handover.id,
        shiftNumber: handover.shiftNumber,
        shiftName: handover.shiftName,
        cashierName: handover.cashierFromName,
        tunai: handover.totalSalesAmount - handover.qrisAmount,
        nonTunai: handover.qrisAmount,
        profit: profit,
        quantity: handover.totalSoldPcs,
        pascaClosingQty: 0
      });
    });

    const lastHandoverTime = todayHandovers.length > 0 
      ? new Date(todayHandovers[todayHandovers.length - 1].timestamp).getTime() 
      : 0;

    const activeSales = todaySales.filter(sale => new Date(sale.timestamp).getTime() > lastHandoverTime);
    
    activeSales.forEach((sale) => {
      const activeShiftNumber = todayHandovers.length + 1;
      const sessionKey = `active-${activeShiftNumber}-${sale.cashierName}`;

      if (!sessionsMap.has(sessionKey)) {
        sessionsMap.set(sessionKey, {
          id: `shift-active-${activeShiftNumber}-${sale.cashierName}`,
          shiftNumber: activeShiftNumber,
          shiftName: `Shift ${activeShiftNumber} (Sedang Berjalan)`,
          cashierName: sale.cashierName,
          tunai: 0,
          nonTunai: 0,
          profit: 0,
          quantity: 0,
          pascaClosingQty: 0
        });
      }

      const session = sessionsMap.get(sessionKey)!;
      const amount = (sale as any).amount || 0;
      const qty = (sale as any).quantity || 0;
      const notes = ((sale as any).notes || '');
      const payMethod = (sale as any).paymentMethod;
      
      session.quantity += qty;
      
      if (payMethod === 'NON_TUNAI' || payMethod === 'QRIS' || payMethod === 'TRANSFER' || notes.includes('[NON_TUNAI]') || notes.includes('[QRIS]') || notes.includes('[TRANSFER]')) {
        session.nonTunai += amount;
      } else {
        session.tunai += amount;
      }
      
      const cogs = (sale as any).cogs || ((products.find(p => p.id === (sale as any).productId)?.costPrice || 0) * qty);
      session.profit += (amount - cogs);

      if (notes.includes('[PASCA-CLOSING]')) {
        session.pascaClosingQty += qty;
      }
    });

    let sessions = Array.from(sessionsMap.values())
      .sort((a, b) => b.shiftNumber - a.shiftNumber);

    if (selectedCashierFilter !== 'SEMUA') {
      sessions = sessions.filter(s => s.cashierName === selectedCashierFilter);
    }
    return sessions;
  }, [transactions, detailedHandovers, dateFilter, selectedCashierFilter, products]);

  const isQuickSale = (log: any): boolean => {
    if (log.type !== 'PENJUALAN') return false;
    const notes = (log.notes || '').trim();
    return /^\[(TUNAI|NON_TUNAI|QRIS|TRANSFER)\]/.test(notes);
  };

  const getPaymentLabel = (log: any): string => {
    const notes = (log.notes || '').trim();
    if (notes.includes('[NON_TUNAI]')) return 'QRIS';
    if (notes.includes('[QRIS]')) return 'QRIS';
    if (notes.includes('[TRANSFER]')) return 'TF';
    if (notes.includes('[TUNAI]')) return 'TUNAI';
    if (log.paymentMethod === 'NON_TUNAI' || log.paymentMethod === 'QRIS' || log.paymentMethod === 'TRANSFER') return 'QRIS';
    return 'TUNAI';
  };

  const isPostClosing = (log: any): boolean => {
    return (log.notes || '').includes('[PASCA-CLOSING]');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 4. DATA BULAN BERJALAN AKTIF (Untuk Filter "Bulan Ini")
  // ──────────────────────────────────────────────────────────────────────────
  const currentMonthSummary = useMemo(() => {
    const match = monthlySummaries.find(m => m.monthKey === currentMonthKey);
    return match || {
      monthKey: currentMonthKey,
      monthLabel: getMonthLabel(currentMonthKey),
      totalOmzet: 0,
      totalProfit: 0,
      totalTunai: 0,
      totalNonTunai: 0,
      totalQuantity: 0,
      daysActive: 0,
      avgDailySales: 0,
      isClosed: false
    };
  }, [monthlySummaries, currentMonthKey]);

  const currentMonthDays = useMemo(() => {
    return dailySummaries.filter(d => d.date.startsWith(currentMonthKey));
  }, [dailySummaries, currentMonthKey]);

  return (
    <div className="space-y-3 pb-36 sm:pb-44" id="laporan-tab-container">
      
      {/* ── HEADER SUB-TAB SWITCHER (Halaman 1 vs Halaman 2) ── */}
      <div className="bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1 shadow-sm">
        <div className="grid grid-cols-2 gap-1 flex-1">
          <button
            onClick={() => setMainSubTab('harian')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
              mainSubTab === 'harian'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Laporan Harian & Berjalan</span>
          </button>
          
          <button
            onClick={() => setMainSubTab('bulanan')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
              mainSubTab === 'bulanan'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Analisis Bulanan (Pembanding)</span>
          </button>
        </div>

        {/* Tombol Refresh / Sinkronisasi Online */}
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          title="Sinkronkan data online"
          className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {/* ====================================================================== */}
      {/* ── SUB-TAB 1: LAPORAN HARIAN & BULAN BERJALAN ──────────────────────── */}
      {/* ====================================================================== */}
      {mainSubTab === 'harian' && (
        <div className="space-y-3">
          {/* FILTER GLOBAL */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 shadow-sm flex flex-col gap-2">
            
            {/* Row 1: Quick Filter Buttons (Hari Ini, Kemarin, Bulan Ini) & Date Picker */}
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    setFilterMode('date');
                    setDateFilter(todayStr);
                  }}
                  className={`px-2 py-1.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                    filterMode === 'date' && dateFilter === todayStr
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => {
                    setFilterMode('date');
                    setDateFilter(yesterdayStr);
                  }}
                  className={`px-2 py-1.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                    filterMode === 'date' && dateFilter === yesterdayStr
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  Kemarin
                </button>
                <button
                  onClick={() => {
                    setFilterMode('month');
                  }}
                  className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                    filterMode === 'month'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Bulan Ini
                </button>
              </div>
              
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner flex-1 min-w-[120px]">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input 
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setFilterMode('date');
                  }}
                  className="w-full bg-transparent border-none text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Row 2: Kasir Filter (Owner Only) */}
            {userRole === 'owner' && filterMode === 'date' && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/50 pt-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kasir</span>
                </div>
                <div className="relative w-36">
                  <select
                    value={selectedCashierFilter}
                    onChange={(e) => setSelectedCashierFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-2 pr-7 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none transition cursor-pointer"
                  >
                    <option value="SEMUA">Semua Kasir</option>
                    {allCashiers?.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAMPILAN 1.A: JIKA FILTER BULAN INI AKTIF                          */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {filterMode === 'month' ? (
            <div className="space-y-3">
              {/* Header Box Bulan Berjalan */}
              <div className="bg-gradient-to-br from-indigo-900/90 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <BarChart3 className="w-28 h-28" />
                </div>
                
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-1">
                      <Sparkles className="w-2.5 h-2.5" /> Bulan Berjalan
                    </span>
                    <h3 className="text-base font-black tracking-tight">{currentMonthSummary.monthLabel}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold">Hari Aktif:</span>
                    <span className="ml-1 text-[12px] font-black text-indigo-300 font-mono">{currentMonthSummary.daysActive} Hari</span>
                  </div>
                </div>

                {/* Grid 4 Kartu Metrik Utama */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {/* Total Omzet */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Omzet</span>
                    <p className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
                      Rp {currentMonthSummary.totalOmzet.toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* Estimasi Keuntungan (Owner Only) */}
                  {userRole === 'owner' ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 backdrop-blur-sm">
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Total Laba/Profit</span>
                      <p className="text-sm sm:text-base font-black text-amber-400 font-mono mt-0.5">
                        Rp {currentMonthSummary.totalProfit.toLocaleString('id-ID')}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rata-Rata / Hari</span>
                      <p className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
                        Rp {currentMonthSummary.avgDailySales.toLocaleString('id-ID')}
                      </p>
                    </div>
                  )}

                  {/* Tunai vs QRIS */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tunai</span>
                    <p className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5">
                      Rp {currentMonthSummary.totalTunai.toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">QRIS / Non-Tunai</span>
                    <p className="text-xs sm:text-sm font-black text-cyan-400 font-mono mt-0.5">
                      Rp {currentMonthSummary.totalNonTunai.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-3 text-[10px]">
                  <span className="text-slate-400">Total Voucher Terjual:</span>
                  <span className="font-black text-white font-mono">{currentMonthSummary.totalQuantity} pcs</span>
                </div>
              </div>

              {/* Rincian Hari Demi Hari di Bulan Berjalan */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Rincian Penjualan Per Tanggal (1 s/d Hari Ini)
                  </h4>
                  <span className="text-[9px] font-bold text-slate-400">
                    {currentMonthDays.length} Tanggal
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[460px] overflow-y-auto no-scrollbar pt-1">
                  {currentMonthDays.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-[10px]">
                      Belum ada catatan transaksi di bulan ini.
                    </div>
                  ) : (
                    currentMonthDays.map((day) => {
                      const isToday = day.date === todayStr;
                      return (
                        <div
                          key={day.date}
                          onClick={() => {
                            setDateFilter(day.date);
                            setFilterMode('date');
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isToday
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 hover:border-indigo-400'
                              : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-black text-slate-900 dark:text-white">
                                {formatDateIndo(day.date)}
                              </span>
                              {isToday && (
                                <span className="text-[8px] font-black uppercase px-1.5 py-px rounded-full bg-indigo-600 text-white shadow-xs">
                                  Hari Ini
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">
                              <span>Tunai: <b className="text-emerald-600 dark:text-emerald-400 font-mono">Rp {day.tunai.toLocaleString('id-ID')}</b></span>
                              <span>•</span>
                              <span>QRIS: <b className="text-cyan-600 dark:text-cyan-400 font-mono">Rp {day.nonTunai.toLocaleString('id-ID')}</b></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right">
                              <span className="block text-[11px] font-black text-slate-900 dark:text-white font-mono">
                                Rp {day.omzet.toLocaleString('id-ID')}
                              </span>
                              <div className="flex items-center justify-end gap-1 text-[9px]">
                                {userRole === 'owner' && (
                                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                                    +Rp {day.profit.toLocaleString('id-ID')}
                                  </span>
                                )}
                                <span className="text-slate-400">({day.quantity} pcs)</span>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <p className="text-[8px] text-slate-400 text-center pt-1">
                  💡 Klik salah satu tanggal di atas untuk melihat detail shift & log transaksi hari tersebut.
                </p>
              </div>
            </div>
          ) : (
            /* ────────────────────────────────────────────────────────────────── */
            /* TAMPILAN 1.B: JIKA FILTER TANGGAL SPESIFIK (HARI INI / KEMARIN)    */
            /* ────────────────────────────────────────────────────────────────── */
            <>
              {/* Total Penjualan Voucher Box - Dipecah per Sesi/Shift */}
              <div className="space-y-4 mt-4 mb-3">
                {shiftSessions.length === 0 ? (
                  <div className="text-center p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-[10px] font-bold text-slate-500">Belum ada sesi jualan di tanggal ini.</p>
                  </div>
                ) : (
                  shiftSessions.map((session) => (
                    <div key={session.id} className="relative mt-4">
                      <div className="absolute -top-2.5 left-0 right-0 flex justify-center z-10">
                        <span className="bg-slate-50 dark:bg-[#0f172a] px-2.5 py-0.5 text-[10px] font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase text-center border border-slate-200 dark:border-slate-800 rounded-full shadow-sm">
                          Total Jualan {session.shiftName} ({session.cashierName})
                        </span>
                      </div>
                      <div className="border border-slate-800 dark:border-slate-300 rounded-2xl pt-4 pb-3 px-2">
                        <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700/50">
                          {/* Laku */}
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <Layers className="w-3 h-3 stroke-[2.5]" />
                              <span className="text-[9px] font-extrabold tracking-wide uppercase">Laku</span>
                            </div>
                            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{session.quantity}</span>
                          </div>
                          {/* Tunai */}
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
                              <div className="w-3.5 h-3 bg-emerald-600 dark:bg-emerald-500 rounded-sm flex items-center justify-center relative">
                                <div className="w-1 h-1 bg-white dark:bg-slate-900 rounded-full"></div>
                                <div className="absolute top-0.5 right-0.5 w-0.5 h-0.5 bg-white dark:bg-slate-900 rounded-full"></div>
                              </div>
                              <span className="text-[9px] font-extrabold tracking-wide uppercase">Tunai</span>
                            </div>
                            <span className="text-[12px] font-black text-emerald-600 dark:text-emerald-500 font-mono text-center px-1 truncate w-full">Rp {session.tunai.toLocaleString('id-ID')}</span>
                          </div>
                          {/* QRIS / Non Tunai */}
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="flex items-center gap-1 text-cyan-600 dark:text-cyan-500">
                              <div className="grid grid-cols-2 gap-px w-3 h-3 p-px bg-cyan-600 dark:bg-cyan-500 rounded-sm">
                                <div className="bg-white dark:bg-slate-900 rounded-sm"></div>
                                <div className="bg-white dark:bg-slate-900 rounded-sm"></div>
                                <div className="bg-white dark:bg-slate-900 rounded-sm"></div>
                                <div className="bg-cyan-600 dark:bg-cyan-500"></div>
                              </div>
                              <span className="text-[9px] font-extrabold tracking-wide uppercase">Qris</span>
                            </div>
                            <span className="text-[12px] font-black text-cyan-600 dark:text-cyan-500 font-mono text-center px-1 truncate w-full">Rp {session.nonTunai.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Box Penjualan Khusus Pasca Closing */}
              {(() => {
                const postClosingTrx = filteredActivities.filter((log: any) => log.activityType === 'PENJUALAN' && (log.notes || '').includes('[PASCA-CLOSING]'));
                if (postClosingTrx.length === 0) return null;

                const totalPascaAmount = postClosingTrx.reduce((sum, t) => sum + ((t as any).amount || 0), 0);

                return (
                  <div className="relative mt-5 mb-3">
                    <div className="absolute -top-2.5 left-0 right-0 flex justify-center z-10">
                      <span className="bg-[#fffbeb] dark:bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black tracking-widest text-amber-700 dark:text-amber-400 uppercase rounded-full border border-amber-200 dark:border-amber-500/30 flex items-center gap-1 shadow-sm">
                        <span className="w-3 h-3 rounded-full border-2 border-amber-500 flex items-center justify-center text-[8px] leading-none">!</span>
                        INFO PENJUALAN SETELAH CLOSING
                      </span>
                    </div>
                    <div className="border-2 border-amber-300 dark:border-amber-500/40 bg-[#fffbeb] dark:bg-amber-950/20 rounded-2xl pt-6 pb-3 px-3 shadow-sm">
                      <p className="text-[9px] font-extrabold text-amber-700/70 dark:text-amber-500/70 uppercase tracking-widest mb-3 px-1">Tindakan Diperlukan</p>
                      
                      <div className="space-y-2 mb-3 bg-white dark:bg-black/20 rounded-xl p-2 border border-amber-100 dark:border-amber-900/30">
                        {postClosingTrx.map((trx: any, idx) => {
                          const payLabel = getPaymentLabel(trx);
                          return (
                            <div key={trx.id || idx} className="flex justify-between items-center py-1">
                               <div className="flex items-center gap-1.5">
                                 <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                 <span className="text-[11px] font-bold text-amber-950 dark:text-amber-100">
                                   {trx.quantity}x {trx.productName || 'Produk'}
                                 </span>
                                 <span className="text-[7px] font-black uppercase px-1 py-px rounded ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200/50">
                                   {payLabel}
                                 </span>
                               </div>
                               <span className="text-[11px] font-black text-amber-900 dark:text-amber-300 shrink-0">
                                 Rp {(trx.amount || 0).toLocaleString('id-ID')}
                               </span>
                            </div>
                          );
                        })}

                        <div className="flex justify-between items-center border-t border-amber-200/50 dark:border-amber-800/50 pt-2 mt-2 px-1">
                           <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400">Total Uang Fisik / QRIS:</span>
                           <span className="text-[16px] font-black text-amber-700 dark:text-amber-500">Rp {totalPascaAmount.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Box Keuntungan Khusus Owner */}
              {userRole === 'owner' && (
                <div className="relative mt-5 mb-3">
                  <div className="absolute -top-2.5 left-0 right-0 flex justify-center z-10">
                    <span className="bg-slate-50 dark:bg-[#0f172a] px-2.5 py-0.5 text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-500 uppercase">
                      Estimasi Keuntungan
                    </span>
                  </div>
                  <div className="border border-amber-500/30 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl pt-4 pb-3 px-4 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-amber-600 dark:text-amber-500 font-mono">
                      Rp {paymentStats.profit.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[8px] font-bold text-amber-700/60 dark:text-amber-500/60 mt-0.5 uppercase tracking-widest">
                      Laba Bersih Shift / Tanggal Ini
                    </span>
                  </div>
                </div>
              )}

              {/* Log Transparansi & Filter Aktivitas */}
              <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent backdrop-blur-xl rounded-xl p-3 space-y-2.5">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      Riwayat Aktivitas
                    </h4>
                    <span className="text-[8px] text-indigo-600 dark:text-indigo-400 font-black bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                      {filteredActivities.length} LOG
                    </span>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex">
                    <div className="relative">
                      <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-600 dark:text-slate-400" />
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className="w-full bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg pl-6 pr-1.5 py-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500 appearance-none transition"
                      >
                        <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="SEMUA">SEMUA JENIS</option>
                        <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="PENJUALAN">PENJUALAN</option>
                        <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="RESTOCK">RESTOK MASUK</option>
                        <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="SERAH_TERIMA">SERAH TERIMA</option>
                        <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="PASCA_CLOSING">PASCA CLOSING</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-600 dark:text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Info Legend */}
                  <div className="flex items-center gap-3 px-1 pt-0.5">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400">Jual (Kurangi Stok)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                      <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400">Jual Cepat (Tanpa Stok)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-0 max-h-[500px] overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200 dark:border-white/5 rounded-lg" id="laporan-activity-list">
                  {filteredActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-600 dark:text-slate-400 text-center">
                      <Search className="h-6 w-6 text-slate-400 mb-1.5" />
                      <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Tidak ada data ditemukan</p>
                      <p className="text-[8px] text-slate-500 mt-0.5">Coba ubah filter tanggal atau jenis.</p>
                    </div>
                  ) : (
                    filteredActivities.map((log: any) => {
                      const isSale = log.type === 'PENJUALAN';
                      const isRestock = log.type === 'RESTOCK' || log.type === 'TAMBAH_STOK';
                      const isHandover = log.type === 'SERAH_TERIMA';
                      const isQuick = isQuickSale(log);
                      const isClosingSale = isPostClosing(log);
                      const payLabel = isSale ? getPaymentLabel(log) : '';
                      
                      return (
                        <div 
                          key={log.id}
                          className={`px-2.5 py-2 flex items-center gap-2 transition-colors ${
                            isQuick 
                              ? 'bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20' 
                              : 'bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSale 
                              ? (isQuick 
                                  ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400' 
                                  : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400')
                              : isRestock 
                                ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            {isSale ? (isQuick ? <Zap className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />) :
                             isRestock ? <ArrowDownLeft className="w-3.5 h-3.5" /> :
                             <RefreshCw className="w-3 h-3" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] font-black truncate leading-tight ${
                                isSale 
                                  ? (isQuick ? 'text-amber-800 dark:text-amber-300' : 'text-slate-900 dark:text-white') 
                                  : 'text-slate-900 dark:text-white'
                              }`}>
                                {isHandover ? `Handover: ${log.cashierName}` : (log.productName || log.type)}
                              </span>
                              {isQuick && (
                                <span className="shrink-0 inline-flex items-center gap-0.5 text-[7px] font-black uppercase tracking-wide bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1 py-px rounded border border-amber-500/20 dark:border-amber-500/30">
                                  <Zap className="w-2 h-2" />Cepat
                                </span>
                              )}
                              {isClosingSale && (
                                <span className="shrink-0 text-[7px] font-black uppercase tracking-wide bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1 py-px rounded border border-rose-500/20">
                                  PASCA
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[8px] font-bold text-slate-500 dark:text-slate-500 truncate">
                                {log.cashierName}
                                {isHandover && <span className="text-slate-400"> ➔ {log.toCashier}</span>}
                              </span>
                              <span className="text-[7px] text-slate-400 dark:text-slate-600">•</span>
                              <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                                {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                {' '}•{new Date(log.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-0.5">
                            <span className={`text-[11px] font-black font-mono ${
                              isSale 
                                ? (isQuick ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')
                                : isRestock ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}>
                              {isSale ? `+Rp ${log.amount.toLocaleString('id-ID')}` :
                               isRestock ? `-Rp ${log.amount.toLocaleString('id-ID')}` :
                               `Rp ${log.amount.toLocaleString('id-ID')}`}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] font-bold text-slate-500 dark:text-slate-500">{log.quantity} pcs</span>
                              {isSale && (
                                <span className={`text-[7px] font-black uppercase px-1 py-px rounded ${
                                  payLabel === 'TUNAI' 
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800'
                                }`}>
                                  {payLabel}
                                </span>
                              )}
                              {!isSale && (
                                <span className="text-[7px] font-black uppercase px-1 py-px rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  {isHandover ? 'SHIFT' : 'STOK'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-start gap-1.5 px-1 pt-1">
                  <Info className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0 mt-px" />
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 leading-relaxed">
                    <span className="font-bold text-amber-600 dark:text-amber-400">Jual Cepat</span> = penjualan melalui menu Jual Cepat, <span className="font-bold">tidak mengurangi stok fisik</span>.
                    <span className="font-bold text-emerald-600 dark:text-emerald-400"> Jual Biasa</span> = penjualan produk, <span className="font-bold">otomatis mengurangi stok</span>.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* ── SUB-TAB 2: ANALISIS BULANAN (PEMBANDING BULAN KE BULAN) ──────────── */}
      {/* ====================================================================== */}
      {mainSubTab === 'bulanan' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Pembanding Performa Bulanan
              </h3>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                Laba, omzet, dan aktivitas voucher antar bulan yang telah dilalui.
              </p>
            </div>
          </div>

          {monthlySummaries.length === 0 ? (
            <div className="text-center py-12 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-6">
              <BarChart3 className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Belum Ada Rekap Bulanan</p>
              <p className="text-[9px] text-slate-400 mt-1">Data akan otomatis terkompilasi saat ada transaksi dan tutup shift.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthlySummaries.map((m, idx) => {
                const prevMonth = monthlySummaries[idx + 1];
                const isCurrent = m.monthKey === currentMonthKey;
                const isExpanded = expandedMonthKey === m.monthKey;

                // Pertumbuhan Omzet vs Bulan Lalu
                let omzetGrowth: number | null = null;
                if (prevMonth && prevMonth.totalOmzet > 0) {
                  omzetGrowth = Math.round(((m.totalOmzet - prevMonth.totalOmzet) / prevMonth.totalOmzet) * 100);
                }

                // Margin Keuntungan (%)
                const profitMargin = m.totalOmzet > 0 ? Math.round((m.totalProfit / m.totalOmzet) * 100) : 0;

                const daysInMonth = dailySummaries.filter(d => d.date.startsWith(m.monthKey));

                return (
                  <div 
                    key={m.monthKey}
                    className={`border rounded-2xl p-3.5 transition-all shadow-xs ${
                      isCurrent
                        ? 'bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-slate-900/60 border-indigo-500/40'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Header Card Bulan */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {m.monthLabel}
                          </h4>
                          {isCurrent ? (
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                              Sedang Berjalan
                            </span>
                          ) : (
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Tutup Buku
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                          {m.daysActive} hari aktif jualan • {m.totalQuantity} pcs terjual
                        </span>
                      </div>

                      {/* Pertumbuhan badge */}
                      {omzetGrowth !== null && (
                        <div className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-black ${
                          omzetGrowth >= 0 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {omzetGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{omzetGrowth >= 0 ? `+${omzetGrowth}%` : `${omzetGrowth}%`} vs bln lalu</span>
                        </div>
                      )}
                    </div>

                    {/* Metrik Utama 3 Kolom */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Omzet Penjualan</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white font-mono block mt-0.5">
                          Rp {m.totalOmzet.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {userRole === 'owner' ? (
                        <div>
                          <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider block">Laba / Profit</span>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono block mt-0.5">
                            Rp {m.totalProfit.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Rata-Rata / Hari</span>
                          <span className="text-xs font-black text-slate-900 dark:text-white font-mono block mt-0.5">
                            Rp {m.avgDailySales.toLocaleString('id-ID')}
                          </span>
                        </div>
                      )}

                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Margin Keuntungan</span>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono block mt-0.5">
                          {profitMargin}%
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Pembayaran Tunai & QRIS */}
                    <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 px-1 mt-2.5">
                      <div className="flex items-center gap-3">
                        <span>Tunai: <b className="text-emerald-600 dark:text-emerald-400 font-mono">Rp {m.totalTunai.toLocaleString('id-ID')}</b></span>
                        <span>•</span>
                        <span>QRIS: <b className="text-cyan-600 dark:text-cyan-400 font-mono">Rp {m.totalNonTunai.toLocaleString('id-ID')}</b></span>
                      </div>

                      {/* Tombol Accordion */}
                      <button
                        onClick={() => setExpandedMonthKey(isExpanded ? null : m.monthKey)}
                        className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        {isExpanded ? 'Tutup Rincian' : `Lihat ${daysInMonth.length} Tanggal`}
                        <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Accordion Daftar Tanggal dalam Bulan Tersebut */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 max-h-[300px] overflow-y-auto no-scrollbar">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                          Aktivitas Harian {m.monthLabel}:
                        </span>
                        {daysInMonth.map(d => (
                          <div 
                            key={d.date}
                            onClick={() => {
                              setDateFilter(d.date);
                              setFilterMode('date');
                              setMainSubTab('harian');
                            }}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-[10px] hover:border-indigo-500 transition cursor-pointer"
                          >
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {formatDateIndo(d.date)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                Rp {d.omzet.toLocaleString('id-ID')}
                              </span>
                              {userRole === 'owner' && (
                                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                                  (+Rp {d.profit.toLocaleString('id-ID')})
                                </span>
                              )}
                              <span className="text-slate-400 text-[9px]">{d.quantity} pcs</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Spacer ekstra agar seluruh konten tabel/accordion paling bawah dapat di-scroll jauh ke atas dan tidak tertutup navbar */}
      <div className="h-16 w-full pointer-events-none" aria-hidden="true" />
    </div>
  );
}
