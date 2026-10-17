import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface PosTransaction {
  id: string;
  timestamp: string;
  items: any[];
  subtotal: number;
  diskonTotal: number;
  grandTotal: number;
  metodeBayar: 'TUNAI' | 'QRIS';
  uangDiterima: number;
  kembalian: number;
  kasir: string;
}

interface MonthlySummary {
  monthKey: string; // '2026-03'
  monthLabel: string; // 'Maret 2026'
  shortLabel: string; // 'Mar'
  year: number;
  month: number;
  totalPendapatan: number;
  totalTransaksi: number;
  totalItem: number;
  totalTunai: number;
  totalQris: number;
  topProducts: { nama: string; qty: number; nominal: number }[];
  transactions: PosTransaction[];
  prevMonthRevenue: number | null;
  diffRevenue: number;
  percentageChange: number;
  trendStatus: 'up' | 'down' | 'stable' | 'first';
  prevMonthLabel: string;
}

interface LaporanPosViewProps {
  storeId: string;
  onBack: () => void;
}

export const LaporanPosView: React.FC<LaporanPosViewProps> = ({ storeId, onBack }) => {
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'hari_ini' | 'bulan_ini' | 'semua'>('hari_ini');
  
  // Date selection for 'hari_ini'
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Expanded state for Monthly list in 'semua'
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [txLimit, setTxLimit] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, [storeId]);

  const fetchData = async () => {
    setIsLoading(true);
    let query = supabase
      .from('pos_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3000);

    if (storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTransactions(data.map(r => ({
        id: r.id, 
        timestamp: r.created_at, 
        kasir: r.kasir || 'Kasir',
        items: r.items || [], 
        subtotal: Number(r.subtotal) || 0, 
        diskonTotal: Number(r.diskon_total) || 0,
        grandTotal: Number(r.grand_total) || 0, 
        metodeBayar: r.metode_bayar || 'TUNAI',
        uangDiterima: Number(r.uang_diterima) || 0, 
        kembalian: Number(r.kembalian) || 0
      })));
    } else {
      // fallback local
      try {
        const cached = localStorage.getItem('alphaPro_pos_transactions');
        if (cached) {
          setTransactions(JSON.parse(cached));
        }
      } catch (e) {
        console.error('Error parsing local cached pos transactions:', e);
      }
    }
    setIsLoading(false);
  };

  // Filter for 'hari_ini' & 'bulan_ini'
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today.getTime() - offset)).toISOString().slice(0, -1);
    const todayStr = localISOTime.split('T')[0];
    const monthStr = todayStr.substring(0, 7); // YYYY-MM

    return transactions.filter(trx => {
      const trxDateStr = (trx.timestamp || '').substring(0, 10);
      const trxMonthStr = (trx.timestamp || '').substring(0, 7);

      if (filterType === 'hari_ini') return trxDateStr === selectedDate;
      if (filterType === 'bulan_ini') return trxMonthStr === monthStr;
      return true; // semua
    });
  }, [transactions, filterType, selectedDate]);

  // Kalkulasi KPI untuk 'hari_ini' & 'bulan_ini'
  const { totalPendapatan, totalTransaksi, totalTunai, totalQris } = useMemo(() => {
    let pendapatan = 0;
    let item = 0;
    let tunai = 0;
    let qris = 0;

    filteredTransactions.forEach(trx => {
      pendapatan += trx.grandTotal;
      if (Array.isArray(trx.items)) {
        item += trx.items.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
      }
      if (trx.metodeBayar === 'TUNAI') tunai += trx.grandTotal;
      if (trx.metodeBayar === 'QRIS') qris += trx.grandTotal;
    });

    return {
      totalPendapatan: pendapatan,
      totalTransaksi: filteredTransactions.length,
      totalItem: item,
      totalTunai: tunai,
      totalQris: qris
    };
  }, [filteredTransactions]);

  // Kalkulasi Produk Terlaris untuk 'hari_ini' & 'bulan_ini'
  const topProducts = useMemo(() => {
    const productMap: Record<string, { nama: string; qty: number; nominal: number }> = {};
    
    filteredTransactions.forEach(trx => {
      if (Array.isArray(trx.items)) {
        trx.items.forEach(item => {
          const pId = item.product?.id || item.nama || 'unknown';
          const pNama = item.product?.nama || item.nama || 'Produk';
          const pHarga = Number(item.product?.harga) || Number(item.harga) || 0;
          const pQty = Number(item.qty) || 0;
          if (!productMap[pId]) {
            productMap[pId] = { nama: pNama, qty: 0, nominal: 0 };
          }
          productMap[pId].qty += pQty;
          productMap[pId].nominal += (pHarga * pQty);
        });
      }
    });

    return Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredTransactions]);

  // =========================================================================
  // LOGIKA PENGELOMPOKAN DATA PER-KATEGORI BULAN (TAB 'SEMUA')
  // =========================================================================
  const monthlyReports = useMemo<MonthlySummary[]>(() => {
    if (!transactions.length) return [];

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthShortNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
    ];

    // 1. Kelompokkan transaksi berdasarkan YYYY-MM
    const groups: Record<string, PosTransaction[]> = {};
    transactions.forEach(trx => {
      const key = (trx.timestamp || '').substring(0, 7); // e.g. '2026-03'
      if (!key || key.length < 7) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(trx);
    });

    // 2. Urutkan bulan dari yang terbaru ke terlama (Maret 2026, Februari 2026, ...)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    const getMonthInfo = (yearMonth: string) => {
      const [yStr, mStr] = yearMonth.split('-');
      const y = parseInt(yStr, 10) || 0;
      const m = parseInt(mStr, 10) || 1;
      const monthIdx = Math.max(0, Math.min(11, m - 1));
      return {
        label: `${monthNames[monthIdx]} ${y}`,
        shortLabel: `${monthShortNames[monthIdx]}`,
        year: y,
        month: m
      };
    };

    // Precalculate total pendapatan tiap bulan
    const monthTotals: Record<string, number> = {};
    sortedKeys.forEach(key => {
      monthTotals[key] = groups[key].reduce((acc, t) => acc + (t.grandTotal || 0), 0);
    });

    // 3. Bangun ringkasan bulanan lengkap dengan pembanding tren (+ / -)
    return sortedKeys.map(key => {
      const trxs = groups[key];
      const { label, shortLabel, year, month } = getMonthInfo(key);

      let totalPendapatan = 0;
      let totalItem = 0;
      let totalTunai = 0;
      let totalQris = 0;
      const productMap: Record<string, { nama: string; qty: number; nominal: number }> = {};

      trxs.forEach(trx => {
        totalPendapatan += trx.grandTotal || 0;
        if (Array.isArray(trx.items)) {
          trx.items.forEach((item: any) => {
            const qty = Number(item.qty) || 0;
            totalItem += qty;
            const pId = item.product?.id || item.nama || 'unknown';
            const pNama = item.product?.nama || item.nama || 'Produk';
            const pHarga = Number(item.product?.harga) || Number(item.harga) || 0;
            if (!productMap[pId]) {
              productMap[pId] = { nama: pNama, qty: 0, nominal: 0 };
            }
            productMap[pId].qty += qty;
            productMap[pId].nominal += (pHarga * qty);
          });
        }
        if (trx.metodeBayar === 'TUNAI') totalTunai += trx.grandTotal || 0;
        if (trx.metodeBayar === 'QRIS') totalQris += trx.grandTotal || 0;
      });

      const topProds = Object.values(productMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      // Hitung bulan sebelumnya secara kalender (misal: 2026-03 -> 2026-02, 2026-01 -> 2025-12)
      let prevY = year;
      let prevM = month - 1;
      if (prevM < 1) {
        prevM = 12;
        prevY -= 1;
      }
      const prevKey = `${prevY}-${String(prevM).padStart(2, '0')}`;
      const prevInfo = getMonthInfo(prevKey);

      let prevRevenue: number | null = null;
      let diff = 0;
      let pct = 0;
      let trendStatus: 'up' | 'down' | 'stable' | 'first' = 'first';

      if (monthTotals[prevKey] !== undefined) {
        prevRevenue = monthTotals[prevKey];
        diff = totalPendapatan - prevRevenue;
        if (prevRevenue > 0) {
          pct = (diff / prevRevenue) * 100;
        } else if (totalPendapatan > 0) {
          pct = 100;
        }
        if (diff > 0) trendStatus = 'up';
        else if (diff < 0) trendStatus = 'down';
        else trendStatus = 'stable';
      } else {
        // Jika data bulan persis sebelumnya tidak ada, cek apakah ada data bulan sebelum ini di riwayat
        const currentIdx = sortedKeys.indexOf(key);
        if (currentIdx < sortedKeys.length - 1) {
          const earlierKey = sortedKeys[currentIdx + 1];
          const earlierRev = monthTotals[earlierKey];
          prevRevenue = earlierRev;
          diff = totalPendapatan - earlierRev;
          if (earlierRev > 0) {
            pct = (diff / earlierRev) * 100;
          } else if (totalPendapatan > 0) {
            pct = 100;
          }
          if (diff > 0) trendStatus = 'up';
          else if (diff < 0) trendStatus = 'down';
          else trendStatus = 'stable';
        } else {
          trendStatus = 'first'; // Bulan tertua / pembuka dalam database
        }
      }

      return {
        monthKey: key,
        monthLabel: label,
        shortLabel,
        year,
        month,
        totalPendapatan,
        totalTransaksi: trxs.length,
        totalItem,
        totalTunai,
        totalQris,
        topProducts: topProds,
        transactions: trxs,
        prevMonthRevenue: prevRevenue,
        diffRevenue: diff,
        percentageChange: pct,
        trendStatus,
        prevMonthLabel: prevInfo.shortLabel
      };
    });
  }, [transactions]);

  // Total All-Time Revenue across all months
  const grandAllRevenue = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (t.grandTotal || 0), 0);
  }, [transactions]);

  const formatRp = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

  const toggleMonth = (monthKey: string) => {
    setExpandedMonth(prev => prev === monthKey ? null : monthKey);
  };

  const handleShowMoreTx = (monthKey: string) => {
    setTxLimit(prev => ({
      ...prev,
      [monthKey]: (prev[monthKey] || 15) + 20
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#004A8B] to-[#0069BA] pt-6 pb-4 px-4 sticky top-0 z-50 shadow-md rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 text-white">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all cursor-pointer">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-lg font-black leading-tight">Laporan Penjualan</h1>
            <p className="text-[11px] text-blue-100 font-medium opacity-90">Pantau performa POS Kasir</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 pb-20">
        
        {/* Filter Section Tabs */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button 
            onClick={() => { setFilterType('hari_ini'); setSelectedDate(new Date().toISOString().split('T')[0]); }} 
            className={cn("px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shadow-sm cursor-pointer", filterType === 'hari_ini' ? "bg-[#0066FF] text-white" : "bg-white text-slate-600 border border-slate-200")}
          >
            Hari Ini
          </button>
          <button 
            onClick={() => setFilterType('bulan_ini')} 
            className={cn("px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shadow-sm cursor-pointer", filterType === 'bulan_ini' ? "bg-[#0066FF] text-white" : "bg-white text-slate-600 border border-slate-200")}
          >
            Bulan Ini
          </button>
          <button 
            onClick={() => setFilterType('semua')} 
            className={cn("px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shadow-sm cursor-pointer flex items-center gap-1.5", filterType === 'semua' ? "bg-[#0066FF] text-white" : "bg-white text-slate-600 border border-slate-200")}
          >
            <span>Semua (Per-Bulan)</span>
            <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded-full">Bulanan</span>
          </button>
        </div>

        {/* Date Selector for 'hari_ini' */}
        {filterType === 'hari_ini' && (
          <div className="bg-white rounded-xl p-1 border border-slate-200 shadow-sm flex items-center px-3 animate-in fade-in duration-200">
             <i className="fa-regular fa-calendar text-slate-400 mr-2 text-sm"></i>
             <input 
               type="date" 
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="w-full bg-transparent py-2 text-[13px] font-bold text-slate-700 outline-none"
             />
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <i className="fa-solid fa-spinner fa-spin text-[#0066FF] text-2xl"></i>
          </div>
        ) : filterType === 'semua' ? (
          /* ========================================================================= */
          /* TAMPILAN TAB "SEMUA": DAFTAR PER-KATEGORI BULAN & TREN NAIK/TURUN         */
          /* ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-300">
            
            {/* Banner Total Seluruh Waktu */}
            <div className="bg-gradient-to-r from-[#004A8B] to-[#0069BA] rounded-2xl p-4 text-white shadow-md flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Total Penjualan Semua Waktu</p>
                <p className="text-xl font-black text-white mt-0.5">{formatRp(grandAllRevenue)}</p>
                <p className="text-[10px] text-blue-100 font-medium mt-1">
                  {monthlyReports.length} Periode Bulan Tercatat • {transactions.length} Total Transaksi
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-xl shadow-inner">
                <i className="fa-solid fa-chart-line"></i>
              </div>
            </div>

            {/* Header Petunjuk */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Riwayat Per-Bulan ({monthlyReports.length})
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Klik nama bulan untuk melihat rincian produk & struk
                </p>
              </div>
              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                Pembanding Tren Aktif
              </span>
            </div>

            {monthlyReports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-8 text-center">
                <i className="fa-solid fa-calendar-xmark text-slate-300 text-3xl mb-2"></i>
                <p className="text-xs font-bold text-slate-500">Belum ada riwayat transaksi penjualan.</p>
              </div>
            ) : (
              /* DAFTAR KARTU BULAN */
              <div className="space-y-3">
                {monthlyReports.map((m) => {
                  const isExpanded = expandedMonth === m.monthKey;
                  const currentLimit = txLimit[m.monthKey] || 15;
                  const visibleTx = m.transactions.slice(0, currentLimit);
                  const hasMoreTx = m.transactions.length > currentLimit;

                  return (
                    <div 
                      key={m.monthKey}
                      className={cn(
                        "bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden",
                        isExpanded ? "border-blue-400 ring-2 ring-blue-50" : "border-slate-200 hover:border-blue-300"
                      )}
                    >
                      {/* HEADER KARTU BULAN (KLIK UNTUK EXPAND) */}
                      <button
                        type="button"
                        onClick={() => toggleMonth(m.monthKey)}
                        className="w-full p-4 text-left flex items-center justify-between gap-3 bg-white hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
                      >
                        {/* Kiri: Info Bulan & Omset */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                            isExpanded ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-blue-50 text-blue-600 border-blue-100"
                          )}>
                            <i className="fa-regular fa-calendar-days text-lg"></i>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5 leading-tight">
                              <span>{m.monthLabel}</span>
                            </h4>
                            <p className="text-sm font-black text-slate-900 mt-0.5 truncate">
                              {formatRp(m.totalPendapatan)}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                              {m.totalTransaksi} Transaksi • {m.totalItem} Item
                            </p>
                          </div>
                        </div>

                        {/* Kanan: Badge Tren & Chevron */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {/* BADGE TREN SESUAI PERMINTAAN */}
                          {m.trendStatus === 'up' && (
                            <div className="flex flex-col items-end text-right">
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs">
                                <i className="fa-solid fa-arrow-trend-up text-[10px] text-emerald-600"></i>
                                ▲ Naik {m.percentageChange.toFixed(1)}%
                              </span>
                              <span className="text-[8.5px] font-bold text-emerald-600 mt-0.5">
                                (+{formatRp(m.diffRevenue)} vs {m.prevMonthLabel})
                              </span>
                            </div>
                          )}

                          {m.trendStatus === 'down' && (
                            <div className="flex flex-col items-end text-right">
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs">
                                <i className="fa-solid fa-arrow-trend-down text-[10px] text-rose-600"></i>
                                ▼ Turun {Math.abs(m.percentageChange).toFixed(1)}%
                              </span>
                              <span className="text-[8.5px] font-bold text-rose-600 mt-0.5">
                                (-{formatRp(Math.abs(m.diffRevenue))} vs {m.prevMonthLabel})
                              </span>
                            </div>
                          )}

                          {m.trendStatus === 'stable' && (
                            <div className="flex flex-col items-end text-right">
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                ⚪ Stabil 0%
                              </span>
                              <span className="text-[8.5px] font-medium text-slate-400 mt-0.5">
                                (Sama vs {m.prevMonthLabel})
                              </span>
                            </div>
                          )}

                          {m.trendStatus === 'first' && (
                            <div className="flex flex-col items-end text-right">
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                ⚪ Bulan Awal
                              </span>
                              <span className="text-[8.5px] font-medium text-slate-400 mt-0.5">
                                (Data Pembuka)
                              </span>
                            </div>
                          )}

                          {/* Icon Chevron Expand */}
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                            isExpanded ? "bg-blue-50 text-blue-600 rotate-180" : "text-slate-300"
                          )}>
                            <i className="fa-solid fa-chevron-down text-xs"></i>
                          </div>
                        </div>
                      </button>

                      {/* RINCIAN ALUR BULANAN (EXPANDED CONTENT) */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          
                          {/* 1. Ringkasan Kas & Metode Bayar di Bulan ini */}
                          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
                            <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fa-solid fa-wallet text-blue-600"></i>
                              <span>Metode Bayar {m.monthLabel}</span>
                            </h5>
                            
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                                <p className="text-[9px] font-bold text-emerald-800 uppercase">Tunai</p>
                                <p className="text-xs font-black text-emerald-950 mt-0.5">{formatRp(m.totalTunai)}</p>
                                <p className="text-[8.5px] font-semibold text-emerald-700 mt-0.5">
                                  {m.totalPendapatan ? Math.round((m.totalTunai / m.totalPendapatan) * 100) : 0}% dari Omset
                                </p>
                              </div>
                              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100">
                                <p className="text-[9px] font-bold text-blue-800 uppercase">QRIS / Non-Tunai</p>
                                <p className="text-xs font-black text-blue-950 mt-0.5">{formatRp(m.totalQris)}</p>
                                <p className="text-[8.5px] font-semibold text-blue-700 mt-0.5">
                                  {m.totalPendapatan ? Math.round((m.totalQris / m.totalPendapatan) * 100) : 0}% dari Omset
                                </p>
                              </div>
                            </div>

                            {/* Progress bar komparasi */}
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                              <div 
                                className="bg-emerald-500 h-full transition-all" 
                                style={{ width: m.totalPendapatan ? `${(m.totalTunai / m.totalPendapatan) * 100}%` : '0%' }}
                                title="Tunai"
                              />
                              <div 
                                className="bg-blue-500 h-full transition-all" 
                                style={{ width: m.totalPendapatan ? `${(m.totalQris / m.totalPendapatan) * 100}%` : '0%' }}
                                title="QRIS"
                              />
                            </div>
                          </div>

                          {/* 2. Top 5 Produk Terlaris di Bulan Ini */}
                          {m.topProducts.length > 0 && (
                            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
                              <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fa-solid fa-medal text-amber-500"></i>
                                <span>Produk Terlaris ({m.shortLabel})</span>
                              </h5>
                              <div className="space-y-2">
                                {m.topProducts.map((p, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs gap-2 py-1 border-b border-slate-50 last:border-none">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0",
                                        idx === 0 ? "bg-amber-100 text-amber-800" : idx === 1 ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500"
                                      )}>
                                        {idx + 1}
                                      </span>
                                      <span className="font-bold text-slate-800 truncate">{p.nama}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-black text-slate-900 block leading-tight">{formatRp(p.nominal)}</span>
                                      <span className="text-[9px] font-semibold text-slate-400">{p.qty} Terjual</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. Daftar Struk Transaksi di Bulan Ini */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fa-solid fa-receipt text-slate-400"></i>
                                <span>Daftar Struk ({m.transactions.length})</span>
                              </h5>
                              <span className="text-[9px] text-slate-400 font-bold">
                                Menampilkan {visibleTx.length} dari {m.transactions.length}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {visibleTx.map(trx => {
                                const d = new Date(trx.timestamp);
                                const timeStr = isNaN(d.getTime()) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                const dateStr = isNaN(d.getTime()) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                                return (
                                  <div key={trx.id} className="bg-white rounded-xl border border-slate-200 p-2.5 flex justify-between items-center gap-2 shadow-xs">
                                    <div className="flex gap-2.5 items-center min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                                        <i className={cn("fa-solid text-[10px]", trx.metodeBayar === 'QRIS' ? 'fa-qrcode text-blue-500' : 'fa-money-bill-wave text-emerald-500')}></i>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-black text-slate-800 truncate">{trx.id}</p>
                                        <p className="text-[8.5px] font-bold text-slate-400">{dateStr}, {timeStr} • {trx.items?.length || 0} Item</p>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-[11px] font-black text-slate-800">{formatRp(trx.grandTotal)}</p>
                                      <span className="text-[8px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                                        {trx.kasir}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Tombol Muat Lebih Banyak */}
                            {hasMoreTx && (
                              <button
                                type="button"
                                onClick={() => handleShowMoreTx(m.monthKey)}
                                className="w-full py-2 bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-98 cursor-pointer mt-1"
                              >
                                Tampilkan Struk Lainnya ({m.transactions.length - visibleTx.length} lagi)
                              </button>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        ) : (
          /* ========================================================================= */
          /* TAMPILAN TAB "HARI INI" & "BULAN INI" (STANDAR OPERASIONAL CEPAT)         */
          /* ========================================================================= */
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                  <i className="fa-solid fa-wallet text-emerald-500 text-sm"></i>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pendapatan Bersih</p>
                <p className="text-sm font-black text-slate-800 mt-0.5 truncate">{formatRp(totalPendapatan)}</p>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                  <i className="fa-solid fa-receipt text-blue-500 text-sm"></i>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Transaksi</p>
                <p className="text-sm font-black text-slate-800 mt-0.5"><span className="text-xl">{totalTransaksi}</span> Struk</p>
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
               <h3 className="text-[13px] font-black text-slate-800 mb-3 flex items-center gap-2">
                 <i className="fa-solid fa-chart-pie text-indigo-500"></i> Metode Pembayaran
               </h3>
               <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-600">Tunai</span>
                      <span className="text-slate-800">{formatRp(totalTunai)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: totalPendapatan ? `${(totalTunai / totalPendapatan) * 100}%` : '0%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-600">QRIS / Non-Tunai</span>
                      <span className="text-slate-800">{formatRp(totalQris)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-400 h-full rounded-full transition-all" style={{ width: totalPendapatan ? `${(totalQris / totalPendapatan) * 100}%` : '0%' }}></div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Produk Terlaris */}
            {topProducts.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <h3 className="text-[13px] font-black text-slate-800 mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-medal text-amber-500"></i> Produk Terlaris
                </h3>
                <div className="space-y-3">
                  {topProducts.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-800 truncate">{p.nama}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{p.qty} Terjual</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-black text-emerald-600">{formatRp(p.nominal)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Riwayat Transaksi Ringkas */}
            <div className="space-y-3">
               <h3 className="text-[13px] font-black text-slate-800 flex items-center gap-2">
                 <i className="fa-solid fa-list text-slate-400"></i> Daftar Transaksi
               </h3>
               {filteredTransactions.length === 0 ? (
                 <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-6 text-center">
                    <p className="text-[12px] font-bold text-slate-400">Belum ada transaksi di periode ini.</p>
                 </div>
               ) : (
                 <div className="space-y-2">
                   {filteredTransactions.map(trx => {
                     const d = new Date(trx.timestamp);
                     const timeStr = isNaN(d.getTime()) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                     const dateStr = isNaN(d.getTime()) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                     return (
                       <div key={trx.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex justify-between items-center gap-2">
                          <div className="flex gap-3 items-center min-w-0">
                             <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                                <i className={cn("fa-solid text-[11px]", trx.metodeBayar === 'QRIS' ? 'fa-qrcode text-blue-500' : 'fa-money-bill-wave text-emerald-500')}></i>
                             </div>
                             <div className="min-w-0">
                               <p className="text-[11px] font-black text-slate-800 truncate">{trx.id}</p>
                               <p className="text-[9px] font-bold text-slate-400">{dateStr}, {timeStr} • {trx.items?.length || 0} Item</p>
                             </div>
                          </div>
                          <div className="text-right shrink-0">
                             <p className="text-[12px] font-black text-slate-800">{formatRp(trx.grandTotal)}</p>
                             <p className="text-[9px] font-bold text-slate-500">{trx.kasir}</p>
                          </div>
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LaporanPosView;
