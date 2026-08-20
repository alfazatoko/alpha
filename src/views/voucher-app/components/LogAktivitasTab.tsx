/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Search, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Smartphone, 
  Clock, 
  Trash2, 
  ChevronRight, 
  Inbox, 
  ArrowRight, 
  TrendingDown, 
  TrendingUp, 
  User, 
  ShieldAlert, 
  ArrowUpRight, 
  DollarSign,
  ArrowLeft,
  SlidersHorizontal,
  Package,
  Check,
  RefreshCw,
  PlusCircle,
  MinusCircle
} from 'lucide-react';
import type { LiveNotification, UserRole } from '../types';

interface LogAktivitasTabProps {
  notifications: LiveNotification[];
  userRole: UserRole;
  theme?: 'dark' | 'light';
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNavigate?: (tab: any) => void;
  onBack?: () => void;
}

export default function LogAktivitasTab({ 
  notifications, 
  userRole,
  theme = 'dark',
  onMarkAllRead,
  onClearAll,
  onNavigate,
  onBack
}: LogAktivitasTabProps) {
  const isLight = theme === 'light';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'warning' | 'transfer' | 'success' | 'info'>('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  }); // YYYY-MM-DD
  const [showHighRiskOnly, setShowHighRiskOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Stats calculation
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayNotifs = notifications.filter(n => n.timestamp.startsWith(today));
    
    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      highRisk: notifications.filter(n => n.metadata?.isHighRisk || n.type === 'warning').length,
      todayCount: todayNotifs.length,
      potentialLoss: notifications.reduce((sum, n) => {
        if (n.metadata?.reason === 'audit' && n.metadata.delta && n.metadata.delta < 0) {
          return sum + (Math.abs(n.metadata.delta) * (n.metadata.unitPrice || 0));
        }
        return sum;
      }, 0)
    };
  }, [notifications]);

  // Filtering
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (n.metadata?.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (n.metadata?.cashierName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = selectedType === 'all' || n.type === selectedType;
      const matchDate = selectedDate ? n.timestamp.startsWith(selectedDate) : true;
      const matchHighRisk = showHighRiskOnly ? (n.metadata?.isHighRisk || n.type === 'warning') : true;
      return matchSearch && matchType && matchDate && matchHighRisk;
    });
  }, [notifications, searchQuery, selectedType, selectedDate, showHighRiskOnly]);

  // Grouping by Date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, LiveNotification[]> = {};
    filteredNotifications.forEach(n => {
      const d = new Date(n.timestamp);
      const dateKey = d.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(n);
    });
    return Object.entries(groups).sort((a, b) => {
       const timeA = new Date(a[1][0].timestamp).getTime();
       const timeB = new Date(b[1][0].timestamp).getTime();
       return timeB - timeA;
    });
  }, [filteredNotifications]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getTypeStyles = (type: string, isHighRisk?: boolean) => {
    if (isHighRisk) {
      return {
        bg: isLight ? 'bg-red-100 text-red-700 border-red-200' : 'bg-red-500/20 text-red-500 font-black dark:text-red-400 border-red-500/40',
        cardBorder: isLight ? 'border-red-300 shadow-xs' : 'border-red-500/40',
        badgeBg: isLight ? 'bg-red-100 text-red-800' : 'bg-red-500/30 text-red-300',
        icon: <ShieldAlert className="w-6 h-6" />
      };
    }
    switch (type) {
      case 'warning':
        return {
          bg: isLight ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-rose-500/20 text-rose-500 font-black dark:text-rose-400 border-rose-500/30',
          cardBorder: isLight ? 'border-rose-200 shadow-xs' : 'border-rose-500/30',
          badgeBg: isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-500/20 text-rose-300',
          icon: <AlertCircle className="w-6 h-6" />
        };
      case 'transfer':
        return {
          bg: isLight ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
          cardBorder: isLight ? 'border-indigo-200 shadow-xs' : 'border-indigo-500/30',
          badgeBg: isLight ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
          icon: <Smartphone className="w-6 h-6" />
        };
      case 'success':
        return {
          bg: isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/20 text-emerald-500 font-black dark:text-emerald-400 border-emerald-500/30',
          cardBorder: isLight ? 'border-emerald-200 shadow-xs' : 'border-emerald-500/30',
          badgeBg: isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300',
          icon: <CheckCircle2 className="w-6 h-6" />
        };
      default:
        return {
          bg: isLight ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
          cardBorder: isLight ? 'border-slate-200 shadow-xs' : 'border-slate-200 dark:border-white/10',
          badgeBg: isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300',
          icon: <Info className="w-6 h-6" />
        };
    }
  };

  return (
    <div className={`space-y-4 pb-24 ${isLight ? 'text-slate-900' : 'text-slate-100'}`} id="notifikasi-page-container">
      {/* Header: compact single row layout */}
      <div className={`p-3.5 rounded-2xl border ${
        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10'
      }`}>
        {/* Row 1: icon + title + buttons */}
        <div className="flex items-center gap-2">
          {onBack && (
            <button 
              onClick={onBack}
              className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center justify-center shrink-0 ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                  : 'bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
              }`}
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`text-sm font-black leading-tight truncate ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
              Notifikasi &amp; Log Aktivitas
            </h2>
            <p className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>
              Audit transaksi toko
            </p>
          </div>
          {/* Action buttons compact */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={onMarkAllRead}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1 transition cursor-pointer border ${
                isLight 
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200' 
                  : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border-indigo-500/40'
              }`}
            >
              <Check className="w-3 h-3" />
              Baca
            </button>
            {userRole === 'owner' && (
              <button 
                onClick={onClearAll}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1 transition cursor-pointer border ${
                  isLight 
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border-rose-500/40'
                }`}
              >
                <Trash2 className="w-3 h-3" />
                Hapus
              </button>
            )}
          </div>
        </div>

        {/* Stat cards: 4 compact boxes in 1 row */}
        <div className="grid grid-cols-4 gap-1.5 mt-3">
          <button 
            onClick={() => { setSelectedType('all'); setShowHighRiskOnly(false); }}
            className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-0.5 transition-all active:scale-95 ${
            isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-white/10'
          }`}>
            <span className={`text-[8px] font-bold uppercase tracking-wide leading-none ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total</span>
            <span className={`text-xl font-black leading-tight ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>{stats.todayCount}</span>
            <span className={`text-[7px] font-semibold leading-none ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>dari {stats.total}</span>
          </button>

          <button 
            onClick={() => { setSelectedType('warning'); setShowHighRiskOnly(true); }}
            className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-0.5 transition-all active:scale-95 ${
            isLight ? 'bg-rose-50/80 hover:bg-rose-100 border-rose-200' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20'
          }`}>
            <span className={`text-[8px] font-bold uppercase tracking-wide leading-none ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>Peringatan</span>
            <span className={`text-xl font-black leading-tight ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>{stats.highRisk}</span>
            <span className={`text-[7px] font-semibold leading-none ${isLight ? 'text-rose-400' : 'text-rose-500'}`}>Restock</span>
          </button>

          <button 
            onClick={() => setSelectedType('all')}
            className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-0.5 transition-all active:scale-95 ${
            isLight ? 'bg-blue-50/80 hover:bg-blue-100 border-blue-200' : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20'
          }`}>
            <span className={`text-[8px] font-bold uppercase tracking-wide leading-none ${isLight ? 'text-blue-600' : 'text-cyan-400'}`}>Blm Baca</span>
            <span className={`text-xl font-black leading-tight ${isLight ? 'text-blue-700' : 'text-cyan-400'}`}>{stats.unread}</span>
            <span className={`text-[7px] font-semibold leading-none ${isLight ? 'text-blue-400' : 'text-cyan-500'}`}>Notif</span>
          </button>

          <button 
            onClick={() => setSelectedType('all')}
            className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-0.5 transition-all active:scale-95 ${
            isLight ? 'bg-amber-50/80 hover:bg-amber-100 border-amber-200' : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20'
          }`}>
            <span className={`text-[8px] font-bold uppercase tracking-wide leading-none ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>Selisih</span>
            <span className={`text-sm font-black leading-tight font-mono ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
              {stats.potentialLoss > 0 ? `${(stats.potentialLoss/1000).toFixed(0)}K` : 'Rp0'}
            </span>
            <span className={`text-[7px] font-semibold leading-none ${isLight ? 'text-amber-500' : 'text-amber-500'}`}>Audit</span>
          </button>
        </div>
      </div>

      {/* Large Search & Filter Bar */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 sticky top-0 z-20 backdrop-blur-md ${
        isLight ? 'bg-white/95 border-slate-200 shadow-xs' : 'bg-white dark:bg-slate-900/95 border-slate-200 dark:border-white/10 shadow-lg'
      }`}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`} />
            <input 
              type="text"
              placeholder="Cari voucher, kasir, atau tipe aktivitas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold outline-none transition border ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white' 
                  : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-cyan-500'
              }`}
            />
          </div>

          <button 
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
              showFilters 
                ? (isLight ? 'bg-indigo-600 text-slate-900 dark:text-white keep-white border-indigo-600' : 'bg-cyan-500 text-white keep-white border-cyan-500')
                : (isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10')
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'Semua Log' },
            { id: 'warning', label: '🚨 Peringatan' },
            { id: 'success', label: '✅ Tambah Stok' },
            { id: 'transfer', label: '📱 Serah Terima' },
            { id: 'info', label: 'ℹ️ Lainnya' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedType(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                selectedType === f.id
                  ? (isLight ? 'bg-indigo-600 text-slate-900 dark:text-white keep-white border-indigo-600 shadow-xs' : 'bg-cyan-500 text-white keep-white border-cyan-500')
                  : (isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-white border-slate-200 shadow-sm dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5')
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Extended Filter Drawer (Date & High Risk) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-2 border-t border-dashed border-slate-200"
            >
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className={`flex items-center justify-between rounded-xl px-3 py-1.5 border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-900 border-slate-200 dark:border-white/10'}`}>
                  <div className="flex items-center gap-2 w-full">
                    <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                    <input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className={`w-full text-xs font-bold outline-none bg-transparent ${
                        isLight ? 'text-slate-800' : 'text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>
                  {selectedDate !== new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0] && (
                    <button 
                      onClick={() => setSelectedDate(new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0])}
                      className="text-[10px] text-indigo-500 hover:underline font-bold shrink-0 ml-2"
                    >
                      Hari Ini
                    </button>
                  )}
                </div>

                <button 
                  onClick={() => setShowHighRiskOnly(!showHighRiskOnly)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer w-full ${
                    showHighRiskOnly 
                      ? (isLight ? 'bg-rose-600 text-slate-900 dark:text-white keep-white border-rose-600' : 'bg-rose-500 text-white keep-white border-rose-500')
                      : (isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-500/10 text-rose-500 font-black dark:text-rose-400 border-rose-500/20')
                  }`}
                >
                  <span className="text-sm shrink-0">⚠️</span> Tampilkan Hanya Risiko
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Spacious Notification Cards */}
      <div className="space-y-4">
        {groupedNotifications.length === 0 ? (
          <div className={`p-10 rounded-2xl border text-center flex flex-col items-center justify-center ${
            isLight ? 'bg-white border-slate-200' : 'bg-white dark:bg-slate-900/30 border-slate-200 dark:border-white/10'
          }`}>
            <Inbox className={`w-12 h-12 mb-3 opacity-40 ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600'}`} />
            <h3 className={`text-base font-black ${isLight ? 'text-slate-800' : 'text-slate-900 dark:text-white'}`}>
              Tidak Ada Pemberitahuan
            </h3>
            <p className={`text-xs mt-1 max-w-xs ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
              Belum ada log atau aktivitas yang cocok dengan filter pencarian Anda.
            </p>
          </div>
        ) : (
          groupedNotifications.map(([date, items]) => (
            <div key={date} className="space-y-3">
              {/* Date Group Heading */}
              <div className="flex items-center gap-3 px-1">
                <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg border ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
                }`}>
                  {date}
                </span>
                <div className={`h-px flex-1 ${isLight ? 'bg-slate-200' : 'bg-slate-100 dark:bg-white/10'}`}></div>
              </div>

              {/* Large Column Card Items */}
              <div className="space-y-3">
                {items.map((n) => {
                  const style = getTypeStyles(n.type, n.metadata?.isHighRisk);
                  const delta = n.metadata?.delta || 0;
                  const unitPrice = n.metadata?.unitPrice || 0;
                  const totalRupiahImpact = Math.abs(delta * unitPrice);

                  return (
                    <div 
                      key={n.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isLight 
                          ? `bg-white ${style.cardBorder} hover:shadow-md` 
                          : `bg-white dark:bg-slate-900/90 ${style.cardBorder} hover:bg-white dark:bg-slate-800`
                      }`}
                    >
                      <div className="flex items-start gap-3.5 sm:gap-4">
                        {/* Large Icon Box */}
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${style.bg}`}>
                          {style.icon}
                        </div>

                        {/* Card Content Area */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className={`text-sm sm:text-base font-black ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                                {n.title}
                              </h4>
                              {!n.isRead && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-slate-900 dark:text-white keep-white animate-pulse">
                                  BARU
                                </span>
                              )}
                              {n.metadata?.isHighRisk && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-slate-900 dark:text-white keep-white">
                                  RISIKO TINGGI
                                </span>
                              )}
                            </div>

                            <span className={`text-xs font-bold shrink-0 font-mono px-2 py-0.5 rounded-md ${
                              isLight ? 'bg-slate-100 text-slate-600' : 'bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent text-slate-600 dark:text-slate-400'
                            }`}>
                              {formatTime(n.timestamp)}
                            </span>
                          </div>

                          <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-700 dark:text-slate-200'}`}>
                            {n.message}
                          </p>

                          {/* Large Context Transition Box (If Stock Delta Exists) */}
                          {n.metadata && (n.metadata.oldStock !== undefined || delta !== 0) && (
                            <div className={`mt-3 p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 ${
                              isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-slate-200 dark:border-white/10'
                            }`}>
                              {/* Stock Transition */}
                              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
                                <div className="flex flex-col">
                                  <span className={`text-[10px] font-semibold uppercase ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Stok Awal</span>
                                  <span className={`text-sm sm:text-base font-black font-mono ${isLight ? 'text-slate-800' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {n.metadata.oldStock ?? '-'}
                                  </span>
                                </div>
                                <ArrowRight className={`w-4 h-4 ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600'}`} />
                                <div className="flex flex-col">
                                  <span className={`text-[10px] font-semibold uppercase ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Stok Akhir</span>
                                  <span className={`text-sm sm:text-base font-black font-mono ${
                                    delta > 0 
                                      ? (isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400') 
                                      : (isLight ? 'text-rose-700' : 'text-rose-500 font-black dark:text-rose-400')
                                  }`}>
                                    {n.metadata.newStock ?? '-'}
                                  </span>
                                </div>
                              </div>

                              {/* Delta & Value Badges */}
                              <div className="flex items-center gap-2">
                                {delta !== 0 && (
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono border ${
                                    delta > 0 
                                      ? (isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30')
                                      : (isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/20 text-rose-300 border-rose-500/30')
                                  }`}>
                                    {delta > 0 ? `+${delta}` : delta} PCS
                                  </span>
                                )}
                                {totalRupiahImpact > 0 && (
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono border ${
                                    isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  }`}>
                                    Rp{totalRupiahImpact.toLocaleString('id-ID')}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Footer Meta: Kasir Name & Category */}
                          {n.metadata?.cashierName && (
                            <div className="mt-2.5 flex items-center gap-2 text-[11px] font-bold">
                              <span className={`flex items-center gap-1 ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                <User className="w-3.5 h-3.5" />
                                Dicatat oleh: <span className={isLight ? 'text-slate-800 font-black' : 'text-slate-700 dark:text-slate-200 font-black'}>{n.metadata.cashierName}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
