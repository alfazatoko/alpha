/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  History, 
  ArrowRightLeft, 
  Layers, 
  TrendingUp, 
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
  Zap,
  Info
} from 'lucide-react';
import type { ShiftHandover, Transaction, VoucherProduct, UserRole, Cashier } from '../types';

interface LaporanTabProps {
  shiftHandovers: ShiftHandover[];
  transactions: Transaction[];
  products: VoucherProduct[];
  activeCashierName: string;
  nextCashierName: string;
  userRole: UserRole;
  allCashiers?: Cashier[];
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
  onOpenHandoverModal
}: LaporanTabProps) {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState<'SEMUA' | 'PENJUALAN' | 'RESTOCK' | 'SERAH_TERIMA'>('SEMUA');
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>(
    userRole === 'owner' ? 'SEMUA' : activeCashierName
  );

  // Calculate today's overall statistics
  const totalRegisterVouchers = products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0);

  // Unified activity log filtering
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
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
        const dateMatch = dateFilter ? itemDate === dateFilter : true;
        const typeMatch = typeFilter === 'SEMUA' ? true : item.activityType === typeFilter;
        
        const cashierMatch = selectedCashierFilter === 'SEMUA' 
          ? true 
          : item.cashierName === selectedCashierFilter || (item as any).toCashier === selectedCashierFilter;
          
        return dateMatch && typeMatch && cashierMatch;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, shiftHandovers, dateFilter, typeFilter, selectedCashierFilter]);

  // Aggregate stats from the filtered activities (for the selected day & cashier)
  const paymentStats = useMemo(() => {
    let tunai = 0;
    let nonTunai = 0;
    let profit = 0;
    let quantity = 0;

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
      }
    });
    
    return { tunai, nonTunai, profit, quantity };
  }, [filteredActivities, products]);

  /**
   * Deteksi "Penjualan Cepat" — jual yang TIDAK mengurangi stok fisik sistem.
   * Format notes quick sale: "[TUNAI]", "[NON_TUNAI]", "[TUNAI] [PASCA-CLOSING]", dll.
   * Regular sale dari product detail biasanya: "Penyesuaian penjualan"
   */
  const isQuickSale = (log: any): boolean => {
    if (log.type !== 'PENJUALAN') return false;
    const notes = (log.notes || '').trim();
    // Quick sale notes selalu dimulai dengan [TUNAI] atau [NON_TUNAI]
    return /^\[(TUNAI|NON_TUNAI|QRIS|TRANSFER)\]/.test(notes);
  };

  /** Clean payment method text from notes */
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

  return (
    <div className="space-y-3 pb-8" id="laporan-tab-container">
      {userRole === 'owner' && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm flex items-center justify-between">
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

      {/* Total Penjualan Voucher Box */}
      <div className="relative mt-4 mb-3">
        <div className="absolute -top-2.5 left-0 right-0 flex justify-center z-10">
          <span className="bg-slate-50 dark:bg-[#0f172a] px-2.5 py-0.5 text-[10px] font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase text-center border border-slate-200 dark:border-slate-800 rounded-full shadow-sm">
            Total Jualan Hari Ini {selectedCashierFilter !== 'SEMUA' ? `(${selectedCashierFilter})` : ''}
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
              <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{paymentStats.quantity}</span>
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
              <span className="text-[12px] font-black text-emerald-600 dark:text-emerald-500 font-mono text-center px-1 truncate w-full">Rp {paymentStats.tunai.toLocaleString('id-ID')}</span>
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
              <span className="text-[12px] font-black text-cyan-600 dark:text-cyan-500 font-mono text-center px-1 truncate w-full">Rp {paymentStats.nonTunai.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>

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
              Laba Bersih Shift Ini
            </span>
          </div>
        </div>
      )}

      {/* Log Transparansi & Filter */}
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
          <div className="grid grid-cols-2 gap-1.5">
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-600 dark:text-slate-400" />
              <input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg pl-6 pr-1.5 py-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
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
                  {/* Icon */}
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

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-black truncate leading-tight ${
                        isSale 
                          ? (isQuick ? 'text-amber-800 dark:text-amber-300' : 'text-slate-900 dark:text-white') 
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {isHandover ? `Handover: ${log.cashierName}` : (log.productName || log.type)}
                      </span>
                      {/* Quick Sale Badge */}
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

                  {/* Right: Amount + Badges */}
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

        {/* Info tip for quick sale */}
        <div className="flex items-start gap-1.5 px-1 pt-1">
          <Info className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0 mt-px" />
          <p className="text-[8px] text-slate-400 dark:text-slate-500 leading-relaxed">
            <span className="font-bold text-amber-600 dark:text-amber-400">Jual Cepat</span> = penjualan yang dicatat melalui menu Jual Cepat, <span className="font-bold">tidak mengurangi stok fisik</span> di sistem.
            <span className="font-bold text-emerald-600 dark:text-emerald-400"> Jual Biasa</span> = penjualan melalui produk, <span className="font-bold">otomatis mengurangi stok</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
