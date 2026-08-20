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
  ChevronDown
} from 'lucide-react';
import type { ShiftHandover, Transaction, VoucherProduct, UserRole } from '../types';

interface LaporanTabProps {
  shiftHandovers: ShiftHandover[];
  transactions: Transaction[];
  products: VoucherProduct[];
  activeCashierName: string;
  nextCashierName: string;
  userRole: UserRole;
  onOpenHandoverModal: () => void;
}

export default function LaporanTab({
  shiftHandovers,
  transactions,
  products,
  activeCashierName,
  nextCashierName,
  userRole,
  onOpenHandoverModal
}: LaporanTabProps) {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState<'SEMUA' | 'PENJUALAN' | 'RESTOCK' | 'SERAH_TERIMA'>('SEMUA');

  // Calculate today's overall statistics
  const totalRegisterVouchers = products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0);

  // Active cashier statistics for current shift
  const currentShiftSales = transactions.filter(
    t => t.type === 'PENJUALAN' && t.cashierName === activeCashierName
  );
  const currentShiftRevenue = currentShiftSales.reduce((acc, s) => acc + s.amount, 0);
  const currentShiftQuantity = currentShiftSales.reduce((acc, s) => acc + s.quantity, 0);

  const paymentStats = useMemo(() => {
    let tunai = 0;
    let nonTunai = 0;
    let profit = 0;

    currentShiftSales.forEach(s => {
      if (s.paymentMethod === 'NON_TUNAI' || s.paymentMethod === 'QRIS' || s.paymentMethod === 'TRANSFER') {
        nonTunai += s.amount;
      } else {
        tunai += s.amount;
      }
      const cogs = s.cogs || ((products.find(p => p.id === s.productId)?.costPrice || 0) * s.quantity);
      profit += (s.amount - cogs);
    });
    
    const total = tunai + nonTunai;
    return {
      tunai, nonTunai, total, profit,
      tunaiPct: total > 0 ? (tunai / total) * 100 : 0,
      nonTunaiPct: total > 0 ? (nonTunai / total) * 100 : 0
    };
  }, [currentShiftSales, products]);

  // Unified activity log filtering
  const filteredActivities = useMemo(() => {
    // Combine transactions and handovers into a unified view if needed
    // or just filter transactions if they contain everything.
    // Based on requirement, we'll filter the transactions list mostly,
    // but handovers are in a separate list. Let's merge them for a unified history.
    
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
        return dateMatch && typeMatch;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, shiftHandovers, dateFilter, typeFilter]);

  return (
    <div className="space-y-4 pb-8" id="laporan-tab-container">
      {/* Shift Overview Banner */}
      <div className="bg-indigo-50 dark:bg-slate-900 dark:bg-gradient-to-r dark:from-indigo-950/60 dark:to-purple-950/40 border border-indigo-500/15 rounded-2xl p-5 relative overflow-hidden flex items-center justify-between shadow-lg">
        <div className="space-y-1">
          <span className="text-[10px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Shift Aktif
          </span>
          <h3 className="text-base font-black text-slate-900 dark:text-white">{activeCashierName}</h3>
          <p className="text-[10px] text-slate-600 dark:text-slate-400">Bertanggung jawab penuh atas fisik register</p>
        </div>

        <button 
          onClick={onOpenHandoverModal}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-slate-900 dark:text-white text-xs font-bold py-2 px-3.5 rounded-xl transition border border-indigo-500/20 cursor-pointer"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Tutup Shift
        </button>
      </div>

      {/* New Total Penjualan Voucher Box */}
      <div className="relative mt-8 mb-4">
        <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
          <span className="bg-slate-50 dark:bg-[#0f172a] px-3 py-0.5 text-[11px] font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase">
            Total Penjualan Voucher
          </span>
        </div>
        <div className="border border-slate-800 dark:border-slate-300 rounded-[20px] pt-5 pb-4 px-2">
          <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700/50">
            {/* Laku */}
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="text-[10px] font-extrabold tracking-wide uppercase">Laku</span>
              </div>
              <span className="text-base font-black text-slate-900 dark:text-white font-mono">{currentShiftQuantity}</span>
            </div>
            {/* Tunai */}
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                <div className="w-4 h-3.5 bg-emerald-600 dark:bg-emerald-500 rounded-sm flex items-center justify-center relative">
                  <div className="w-1.5 h-1.5 bg-white dark:bg-slate-900 rounded-full"></div>
                  <div className="absolute top-0.5 right-0.5 w-0.5 h-0.5 bg-white dark:bg-slate-900 rounded-full"></div>
                </div>
                <span className="text-[10px] font-extrabold tracking-wide uppercase">Tunai</span>
              </div>
              <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-500 font-mono text-center px-1 truncate w-full">Rp {paymentStats.tunai.toLocaleString('id-ID')}</span>
            </div>
            {/* QRIS / Non Tunai */}
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-500">
                <div className="grid grid-cols-2 gap-px w-3.5 h-3.5 p-px bg-cyan-600 dark:bg-cyan-500 rounded-sm">
                  <div className="bg-white dark:bg-slate-900 rounded-sm"></div>
                  <div className="bg-white dark:bg-slate-900 rounded-sm"></div>
                  <div className="bg-white dark:bg-slate-900 rounded-sm"></div>
                  <div className="bg-cyan-600 dark:bg-cyan-500"></div>
                </div>
                <span className="text-[10px] font-extrabold tracking-wide uppercase">Qris</span>
              </div>
              <span className="text-[13px] font-black text-cyan-600 dark:text-cyan-500 font-mono text-center px-1 truncate w-full">Rp {paymentStats.nonTunai.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Box Keuntungan Khusus Owner */}
      {userRole === 'owner' && (
        <div className="relative mt-7 mb-4">
          <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
            <span className="bg-slate-50 dark:bg-[#0f172a] px-3 py-0.5 text-[11px] font-black tracking-widest text-amber-600 dark:text-amber-500 uppercase">
              Estimasi Keuntungan
            </span>
          </div>
          <div className="border border-amber-500/30 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 rounded-[20px] pt-5 pb-4 px-4 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-amber-600 dark:text-amber-500 font-mono">
              Rp {paymentStats.profit.toLocaleString('id-ID')}
            </span>
            <span className="text-[9px] font-bold text-amber-700/60 dark:text-amber-500/60 mt-1 uppercase tracking-widest">
              Laba Bersih Shift Ini
            </span>
          </div>
        </div>
      )}

      {/* Log Transparansi & Filter */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Riwayat Aktivitas
            </h4>
            <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-black bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              {filteredActivities.length} LOG
            </span>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 dark:text-slate-400" />
              <input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-2 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 dark:text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-2 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500 appearance-none transition"
              >
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="SEMUA">SEMUA JENIS</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="PENJUALAN">PENJUALAN</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="RESTOCK">RESTOK MASUK</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="SERAH_TERIMA">SERAH TERIMA</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 dark:text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar" id="laporan-activity-list">
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-600 dark:text-slate-400 text-center bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl">
              <Search className="h-8 w-8 text-slate-700 mb-2" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tidak ada data ditemukan</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Coba ubah filter tanggal atau jenis.</p>
            </div>
          ) : (
            filteredActivities.map((log: any) => {
              const isSale = log.type === 'PENJUALAN';
              const isRestock = log.type === 'RESTOCK' || log.type === 'TAMBAH_STOK';
              const isHandover = log.type === 'SERAH_TERIMA';
              
              return (
                <div 
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 space-y-2 flex flex-col hover:bg-slate-800/20 transition"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                        isSale ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500 font-black dark:text-emerald-400' :
                        isRestock ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-600 dark:text-indigo-400' :
                        'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 font-black dark:text-amber-400'
                      }`}>
                        {isSale ? <ArrowUpRight className="w-3.5 h-3.5" /> :
                         isRestock ? <ArrowDownLeft className="w-3.5 h-3.5" /> :
                         <RefreshCw className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-[11px] font-black text-slate-900 dark:text-white leading-tight">
                          {isHandover ? `Handover: ${log.cashierName}` : (log.productName || log.type)}
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                          <User className="w-2.5 h-2.5" />
                          {log.cashierName}
                          {isHandover && <span className="text-slate-600">➔ {log.toCashier}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-[11px] font-black ${
                        isSale ? 'text-emerald-500 font-black dark:text-emerald-400' :
                        isRestock ? 'text-indigo-600 dark:text-indigo-400' :
                        'text-amber-500 font-black dark:text-amber-400'
                      }`}>
                        {isSale ? `+Rp ${log.amount.toLocaleString('id-ID')}` :
                         isRestock ? `-Rp ${log.amount.toLocaleString('id-ID')}` :
                         `Rp ${log.amount.toLocaleString('id-ID')}`}
                      </p>
                      <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{log.quantity} pcs</p>
                    </div>
                  </div>

                  {log.notes && (
                    <p className="text-[9px] text-slate-600 dark:text-slate-400 italic bg-white/[0.02] p-1.5 rounded-lg border border-slate-200 dark:border-white/5">
                      "{log.notes}"
                    </p>
                  )}

                  <div className="flex justify-between items-center pt-1 text-[9px] text-slate-600 border-t border-slate-200 dark:border-white/5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • 
                      {new Date(log.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent px-1.5 py-0.5 rounded uppercase text-[8px] font-bold tracking-widest">
                      {isHandover ? 'HANDOVER' : (isSale ? 'JUAL' : 'STOK')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
