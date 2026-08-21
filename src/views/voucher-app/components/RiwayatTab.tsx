/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Calendar, 
  Lock, 
  User, 
  Package, 
  Banknote, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  ArrowRight, 
  Filter, 
  ShieldCheck,
  Search,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Receipt
} from 'lucide-react';
import type { DetailedHandoverRecord } from '../types';

interface RiwayatTabProps {
  handoverRecords: DetailedHandoverRecord[];
  onSelectRecord?: (record: DetailedHandoverRecord) => void;
  onNavigateToStock?: () => void;
  onBackToDashboard?: () => void;
}

export default function RiwayatTab({
  handoverRecords,
  onSelectRecord,
  onNavigateToStock,
  onBackToDashboard
}: RiwayatTabProps) {
  // Today's date string in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Filter states
  const [viewMode, setViewMode] = useState<'daily' | 'archive'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'all' | '1' | '2'>('all');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [searchVoucherQuery, setSearchVoucherQuery] = useState<string>('');

  // Group records by date for archive view
  const archivedDates = useMemo(() => {
    const dates: Record<string, { count: number; sales: number }> = {};
    handoverRecords.forEach(rec => {
      if (!dates[rec.date]) {
        dates[rec.date] = { count: 0, sales: 0 };
      }
      dates[rec.date].count++;
      dates[rec.date].sales += rec.totalSalesAmount;
    });
    return Object.entries(dates).sort((a, b) => b[0].localeCompare(a[0]));
  }, [handoverRecords]);

  // Filtered records based on selected date & shift
  const filteredRecords = useMemo(() => {
    return handoverRecords.filter((rec) => {
      const matchDate = selectedDate ? rec.date === selectedDate : true;
      const matchShift = selectedShiftFilter === 'all' ? true : String(rec.shiftNumber) === selectedShiftFilter;
      return matchDate && matchShift;
    });
  }, [handoverRecords, selectedDate, selectedShiftFilter]);

  // Aggregate totals for the selected date
  const daySummary = useMemo(() => {
    const recordsForDay = handoverRecords.filter((rec) => rec.date === selectedDate);
    const totalTrx      = recordsForDay.reduce((sum, r) => sum + r.totalSoldPcs, 0);
    const totalUangMasuk = recordsForDay.reduce((sum, r) => sum + r.totalSalesAmount, 0);
    const totalTarikTunai = recordsForDay.reduce((sum, r) => sum + r.cashPhysical, 0);
    const totalAdmin    = recordsForDay.reduce((sum, r) => sum + r.cashExpected, 0);
    const totalQris     = recordsForDay.reduce((sum, r) => sum + r.qrisAmount, 0);
    const completedShifts = recordsForDay.length;

    return {
      totalTrx,
      totalUangMasuk,
      totalTarikTunai,
      totalAdmin,
      totalQris,
      completedShifts
    };
  }, [handoverRecords, selectedDate]);

  // Helper: format currency compact (e.g. 16.071.688 → 16,07 Jt)
  const fmtCompact = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace('.', ',')} Jt`;
    if (n >= 1_000)    return `${(n / 1_000).toFixed(1).replace('.', ',')} Rb`;
    return n.toLocaleString('id-ID');
  };

  // Format date helper: "17 Agustus 2026"
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Quick date presets
  const handleSetQuickDate = (type: 'today' | 'yesterday') => {
    const d = new Date();
    if (type === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12 text-slate-700 dark:text-slate-200" id="riwayat-serah-terima-container">
      
      {/* HEADER SECTION: Clean & Minimalist */}
      <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{viewMode === 'daily' ? 'Riwayat Serah Terima' : 'Arsip Audit Lengkap'}</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Arsip Terkunci
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {viewMode === 'daily' 
                  ? 'Catatan resmi serah terima stok & uang antar kasir per shift.' 
                  : 'Kumpulan seluruh data audit dari waktu ke waktu.'}
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${viewMode === 'daily' ? 'bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300'}`}
            >
              Harian
            </button>
            <button
              onClick={() => setViewMode('archive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${viewMode === 'archive' ? 'bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300'}`}
            >
              Semua Arsip
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'daily' ? (
        <>
          {/* FILTER BAR & DATE SELECTOR */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Date Input */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2 bg-white border-slate-200 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent font-bold text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                  />
                </div>
                
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {formatDateLabel(selectedDate)}
                </span>
              </div>

              {/* Quick Date Buttons */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('today')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedDate === todayStr 
                      ? 'bg-slate-700 text-slate-900 dark:text-white font-bold shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('yesterday')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedDate !== todayStr 
                      ? 'bg-slate-700 text-slate-900 dark:text-white font-bold shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
                  }`}
                >
                  Kemarin
                </button>
              </div>
            </div>

            {/* Shift Filter Pills */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/40">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 mr-1">Filter Shift:</span>
              <button
                type="button"
                onClick={() => setSelectedShiftFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  selectedShiftFilter === 'all'
                    ? 'bg-slate-700 border-slate-600 text-slate-900 dark:text-white'
                    : 'bg-white border-slate-200 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedShiftFilter('1')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  selectedShiftFilter === '1'
                    ? 'bg-slate-700 border-slate-600 text-slate-900 dark:text-white'
                    : 'bg-white border-slate-200 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
                }`}
              >
                S1 (Pagi)
              </button>
              <button
                type="button"
                onClick={() => setSelectedShiftFilter('2')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  selectedShiftFilter === '2'
                    ? 'bg-slate-700 border-slate-600 text-slate-900 dark:text-white'
                    : 'bg-white border-slate-200 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
                }`}
              >
                S2 (Malam)
              </button>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                REKAP TOTAL HARIAN — 4 Kolom: TRX | Uang Masuk | Tarik Tunai | Admin
            ───────────────────────────────────────────────────────────────── */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-2">

              {/* Row 1: TRX + Shift */}
              <div className="grid grid-cols-2 gap-2">
                {/* TRX */}
                <div className="bg-gradient-to-br from-indigo-950/60 to-indigo-900/30 border border-indigo-500/20 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-black text-indigo-400 tracking-widest block">TRX</span>
                    <div className="text-2xl font-black font-mono text-white mt-0.5 leading-none">
                      {daySummary.totalTrx}
                    </div>
                    <span className="text-[9px] text-indigo-400 font-bold">Voucher Terjual</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>

                {/* Shift Selesai */}
                <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/30 border border-slate-600/30 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest block">Shift</span>
                    <div className="text-2xl font-black font-mono text-white mt-0.5 leading-none">
                      {daySummary.completedShifts}
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold">Selesai Hari Ini</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-slate-600/20 border border-slate-600/30 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Row 2: Uang Masuk + Tarik Tunai + Admin — 3 equal cols */}
              <div className="grid grid-cols-3 gap-2">
                {/* Uang Masuk */}
                <div className="bg-emerald-50 dark:bg-slate-950/50 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-2.5 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-black text-emerald-700 dark:text-emerald-400 tracking-widest">Uang Masuk</span>
                    <Banknote className="w-3 h-3 text-emerald-500/60" />
                  </div>
                  <div className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm leading-tight">
                    Rp {fmtCompact(daySummary.totalUangMasuk)}
                  </div>
                  <div className="text-[8px] text-emerald-500/60 font-bold">Total Omset</div>
                </div>

                {/* Tarik Tunai */}
                <div className="bg-cyan-50 dark:bg-slate-950/50 border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-2.5 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-black text-cyan-700 dark:text-cyan-400 tracking-widest">Tarik Tunai</span>
                    <Banknote className="w-3 h-3 text-cyan-500/60" />
                  </div>
                  <div className="font-mono font-black text-cyan-700 dark:text-cyan-400 text-sm leading-tight">
                    Rp {fmtCompact(daySummary.totalTarikTunai)}
                  </div>
                  <div className="text-[8px] text-cyan-500/60 font-bold">Kas Fisik</div>
                </div>

                {/* Admin */}
                <div className="bg-amber-50 dark:bg-slate-950/50 border border-amber-200 dark:border-amber-500/20 rounded-xl p-2.5 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-black text-amber-700 dark:text-amber-400 tracking-widest">Admin</span>
                    <QrCode className="w-3 h-3 text-amber-500/60" />
                  </div>
                  <div className="font-mono font-black text-amber-700 dark:text-amber-400 text-sm leading-tight">
                    Rp {fmtCompact(daySummary.totalAdmin)}
                  </div>
                  <div className="text-[8px] text-amber-500/60 font-bold">Kas Ekspektasi</div>
                </div>
              </div>
            </div>
          </div>

          {/* LIST OF SHIFT HANDOVER CARDS FOR THE SELECTED DATE */}
          <div className="space-y-3">
            {filteredRecords.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <History className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum Ada Riwayat Serah Terima</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Tidak ada catatan serah terima kasir pada tanggal <strong className="text-slate-600 dark:text-slate-300">{formatDateLabel(selectedDate)}</strong>.
                  </p>
                </div>
                {onNavigateToStock && (
                  <button
                    type="button"
                    onClick={onNavigateToStock}
                    className="px-4 py-2 bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5" /> Buka Atur Stok Shift Sekarang
                  </button>
                )}
              </div>
            ) : (
              filteredRecords.map((record) => {
                const isExpanded = expandedRecordId === record.id;
                const isCashMatched = record.cashDifference === 0;

                const timeFormatted = (() => {
                  try {
                    return new Date(record.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) + ' WIB';
                  } catch {
                    return 'Waktu Selesai';
                  }
                })();

                // Filter products in detail view if search is used
                const displayedProducts = (record.productsSummary || []).filter(p => 
                  searchVoucherQuery.trim() === '' || 
                  p.productName.toLowerCase().includes(searchVoucherQuery.toLowerCase())
                );

                return (
                  <div 
                    key={record.id}
                    className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition hover:border-slate-700"
                  >
                    {/* RECORD MAIN HEADER & SUMMARY ROW */}
                    <div className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
                        
                        {/* Shift & Time */}
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center">
                            {record.shiftNumber}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-800 dark:text-white">{record.shiftName}</h3>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-700 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-600 dark:text-slate-400" /> {timeFormatted}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                              Oleh: <span className="text-slate-700 dark:text-slate-200 font-semibold">{record.cashierFromName}</span> ➔ Ke: <span className="text-slate-700 dark:text-slate-200 font-semibold">{record.cashierToName}</span>
                            </p>
                          </div>
                        </div>

                        {/* Lock Status & Toggle Detail Button */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                            className="px-3 py-1.5 bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-slate-700 shadow-sm"
                          >
                            {isExpanded ? 'Tutup Detail' : 'Rincian Voucher'}
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* ───────────────────────────────────────────────────────────
                          SUMMARY STATS — 5 kolom mini: TRX | Uang Masuk | Tarik Tunai | Admin | Status
                      ─────────────────────────────────────────────────────────── */}
                      <div className="grid grid-cols-5 gap-1.5 text-xs">

                        {/* 1. TRX */}
                        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-2 space-y-0.5 col-span-1">
                          <div className="text-[8px] uppercase font-black text-indigo-700 dark:text-indigo-400 tracking-widest">TRX</div>
                          <div className="font-mono font-black text-indigo-800 dark:text-indigo-300 text-base leading-none">
                            {record.totalSoldPcs}
                          </div>
                          <div className="text-[8px] text-indigo-400/70 font-bold">Pcs Laku</div>
                        </div>

                        {/* 2. Uang Masuk */}
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-2 space-y-0.5 col-span-1">
                          <div className="text-[8px] uppercase font-black text-emerald-700 dark:text-emerald-400 tracking-widest">Masuk</div>
                          <div className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-[11px] leading-tight">
                            {fmtCompact(record.totalSalesAmount)}
                          </div>
                          <div className="text-[8px] text-emerald-400/70 font-bold">Omset</div>
                        </div>

                        {/* 3. Tarik Tunai */}
                        <div className="bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-2 space-y-0.5 col-span-1">
                          <div className="text-[8px] uppercase font-black text-cyan-700 dark:text-cyan-400 tracking-widest">Tunai</div>
                          <div className="font-mono font-black text-cyan-400 text-[11px] leading-tight">
                            {fmtCompact(record.cashPhysical)}
                          </div>
                          <div className="text-[8px] text-cyan-400/70 font-bold">Kas Fisik</div>
                        </div>

                        {/* 4. Admin */}
                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-2 space-y-0.5 col-span-1">
                          <div className="text-[8px] uppercase font-black text-amber-700 dark:text-amber-400 tracking-widest">Admin</div>
                          <div className="font-mono font-black text-amber-400 text-[11px] leading-tight">
                            {fmtCompact(record.cashExpected)}
                          </div>
                          <div className="text-[8px] text-amber-400/70 font-bold">Ekspektasi</div>
                        </div>

                        {/* 5. Status Kas */}
                        <div className={`rounded-xl p-2 space-y-0.5 col-span-1 border ${
                          isCashMatched
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20'
                        }`}>
                          <div className={`text-[8px] uppercase font-black tracking-widest ${
                            isCashMatched ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                          }`}>Kas</div>
                          <div className={`flex items-center justify-center pt-0.5 ${
                            isCashMatched ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                          }`}>
                            {isCashMatched
                              ? <CheckCircle2 className="w-5 h-5" />
                              : <AlertCircle className="w-5 h-5" />
                            }
                          </div>
                          <div className={`text-[7px] font-black text-center ${
                            isCashMatched ? 'text-emerald-600 dark:text-emerald-400/80' : 'text-rose-600 dark:text-rose-400/80'
                          }`}>
                            {isCashMatched ? 'PAS' : `Selisih`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* EXPANDABLE PRODUCT-LEVEL DETAIL TABLE */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              Rincian Voucher
                            </span>

                            <div className="relative">
                              <Search className="w-3 h-3 text-slate-600 dark:text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Cari..."
                                value={searchVoucherQuery}
                                onChange={(e) => setSearchVoucherQuery(e.target.value)}
                                className="bg-white border-slate-200 shadow-sm dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-6 pr-2 py-0.5 text-[10px] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Product Detail Table */}
                          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 no-scrollbar">
                            <table className="w-full text-left text-[10px] border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase tracking-tighter bg-slate-50 dark:bg-slate-900/80">
                                  <th className="py-2 px-2">Nama Voucher</th>
                                  <th className="py-2 px-1 text-center">Awal</th>
                                  <th className="py-2 px-1 text-center">Akhir</th>
                                  <th className="py-2 px-1 text-center text-emerald-700 dark:text-emerald-400">Laku</th>
                                  <th className="py-2 px-2 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                                {displayedProducts.map((p, idx) => (
                                  <tr key={p.productId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                    <td className="py-2 px-2 font-sans font-bold text-slate-800 dark:text-slate-200">{p.productName}</td>
                                    <td className="py-2 px-1 text-center font-bold text-slate-700 dark:text-slate-400">{p.initialStock}</td>
                                    <td className="py-2 px-1 text-center font-bold text-slate-700 dark:text-slate-400">{p.finalStock}</td>
                                    <td className="py-2 px-1 text-center font-black text-emerald-700 dark:text-emerald-400">{p.soldStock}</td>
                                    <td className="py-2 px-2 text-right font-bold text-slate-800 dark:text-slate-200">
                                      {(p.soldStock * p.price).toLocaleString('id-ID')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {archivedDates.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-white border-slate-200 shadow-sm dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shadow-inner">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto font-bold">Belum ada arsip data audit tersimpan. Selesaikan shift hari ini untuk mulai mencatat riwayat.</p>
            </div>
          ) : (
            archivedDates.map(([date, stats]) => (
              <button
                key={date}
                onClick={() => {
                  setSelectedDate(date);
                  setViewMode('daily');
                }}
                className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl transition hover:border-indigo-500/50 hover:bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center text-indigo-700 dark:text-indigo-300">
                    <span className="text-[10px] font-black uppercase leading-none opacity-60">
                      {new Date(date).toLocaleDateString('id-ID', { month: 'short' })}
                    </span>
                    <span className="text-lg font-black leading-none mt-1">
                      {new Date(date).getDate()}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{formatDateLabel(date)}</h4>
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {stats.count} Audit
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Rp{stats.sales.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-white border-slate-200 shadow-sm dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:bg-indigo-500 group-hover:text-slate-900 dark:hover:text-white transition shadow-sm">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
