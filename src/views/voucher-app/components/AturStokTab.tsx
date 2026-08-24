/** 
 * @license 
 * SPDX-License-Identifier: Apache-2.0 
 */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Lock, 
  Unlock, 
  Check, 
  Banknote, 
  Handshake, 
  AlertCircle,
  QrCode,
  Tag,
  Plus,
  Minus,
  Database,
  FileCheck2,
  ListFilter,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { VoucherProduct, Cashier, Transaction, UserRole } from '../types';

export interface StockAuditItem {
  productId: string;
  productName: string;
  price: number;
  previousStock: number;
  incomingStock: number;
  initialStock: number;
  finalStock: number;
  auditReason: 'penjualan' | 'audit' | null;
}

interface AturStokTabProps {
  products: VoucherProduct[];
  activeCashier: Cashier;
  nextCashier: Cashier;
  allCashiers?: Cashier[];
  sessionKey: string; // key unik per kasir+toko untuk localStorage
  transactions: Transaction[];
  userRole: UserRole;
  theme?: 'dark' | 'light';
  onUpdateProductStock: (productId: string, newStock: number, subReason?: 'penjualan' | 'audit' | 'restock') => void;
  onBulkUpdateProductStock: (updates: { productId: string; newStock: number; subReason?: 'penjualan' | 'audit' }[]) => void;
  onRecordHandover: (handoverData: any) => void;
  onSwitchCashier: () => void;
  onBackToDashboard: () => void;
}

/**
 * Compact circular operator logo for the stock table and modal
 */
function CompactOperatorLogo({ name, operator, size = 'sm' }: { name: string; operator?: string; size?: 'sm' | 'md' | 'lg' }) {
  const text = (operator || name || '').toLowerCase();
  
  const dim = size === 'lg' 
    ? 'w-8 h-8 sm:w-9 sm:h-9' 
    : size === 'md'
    ? 'w-6 h-6 sm:w-7 sm:h-7'
    : 'w-5 h-5 sm:w-6 sm:h-6';

  const fontText = size === 'lg' ? 'text-xs sm:text-sm' : size === 'md' ? 'text-[9.5px] sm:text-[10.5px]' : 'text-[8px] sm:text-[8.5px]';
  const svgSize = size === 'lg' ? 'w-4 h-4 sm:w-5 sm:h-5' : size === 'md' ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-3 h-3 sm:w-3.5 sm:h-3.5';

  if (text.includes('axis')) {
    return (
      <div className={`${dim} rounded-full bg-[#7c2d82] flex items-center justify-center text-slate-900 dark:text-white font-black ${fontText} tracking-tight shadow-xs shrink-0 border border-purple-400/30`}>
        axis
      </div>
    );
  }
  if (text.includes('telkomsel') || text.includes('tsel')) {
    return (
      <div className={`${dim} rounded-full bg-[#e11424] flex items-center justify-center text-slate-900 dark:text-white shadow-xs shrink-0 border border-red-400/30`}>
        <svg viewBox="0 0 100 100" className={svgSize}>
          <polygon points="50,5 92,50 50,95 8,50" fill="#ffffff" />
          <path d="M 28 32 L 72 32 L 72 44 L 56 44 L 56 75 L 44 75 L 44 44 L 28 44 Z" fill="#e11424" />
        </svg>
      </div>
    );
  }
  if (text.includes('im3') || text.includes('indosat') || text.includes('isat')) {
    return (
      <div className={`${dim} rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-black font-black ${fontText} tracking-tight shadow-xs border border-yellow-300/50`}>
        im3
      </div>
    );
  }
  if (text.includes('tri') || text.includes('3')) {
    return (
      <div className={`${dim} rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-black ${fontText} shadow-xs shrink-0 border border-slate-700`}>
        3
      </div>
    );
  }
  if (text.includes('xl')) {
    return (
      <div className={`${dim} rounded-full bg-[#0284c7] flex items-center justify-center text-slate-900 dark:text-white font-black ${fontText} shadow-xs shrink-0 border border-blue-400/40`}>
        XL
      </div>
    );
  }
  if (text.includes('smartfren') || text.includes('smart')) {
    return (
      <div className={`${dim} rounded-full bg-[#e11d48] flex items-center justify-center text-slate-900 dark:text-white font-black ${fontText} shadow-xs shrink-0 border border-pink-400/30`}>
        S
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-slate-900 dark:text-white font-bold ${fontText} shadow-xs shrink-0`}>
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
}

export default function AturStokTab({
  products,
  activeCashier,
  nextCashier,
  allCashiers,
  sessionKey,
  transactions,
  userRole,
  theme = 'dark',
  onUpdateProductStock,
  onBulkUpdateProductStock,
  onRecordHandover,
  onSwitchCashier,
  onBackToDashboard
}: AturStokTabProps) {

  // ─── SESSION PERSISTENCE KEY ───────────────────────────────────────────────
  // Dibaca satu kali saat mount; fallback ke key generik jika prop belum ada
  const SK = sessionKey || `audit_session_default`;

  // ─── LOAD SESSION DARI LOCALSTORAGE (sekali saat mount) ────────────────────
  const loadedSession = (() => {
    try {
      const raw = localStorage.getItem(SK);
      if (!raw) return null;
      return JSON.parse(raw) as {
        currentStep: 1 | 2 | 3 | 4;
        items: StockAuditItem[];
        isInitialLocked: boolean;
        showIncomingStock: boolean;
        showStatusColumn: boolean;
        cashPhysical: string;
        catatanSelisih: string;
        selectedToCashierId: string;
        sessionStartedAt: string;
      };
    } catch { return null; }
  })();

  const [isRestoredSession] = useState(!!loadedSession);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(loadedSession?.currentStep ?? 1);
  const [items, setItems] = useState<StockAuditItem[]>(loadedSession?.items ?? []);
  const [isInitialLocked, setIsInitialLocked] = useState(loadedSession?.isInitialLocked ?? false);
  const [activeEditingRow, setActiveEditingRow] = useState<{ step: 1 | 2; type: 'incoming' | 'initial' | 'final'; productId: string | null }>({ step: 1, type: 'initial', productId: null });
  const [showIncomingStock, setShowIncomingStock] = useState(loadedSession?.showIncomingStock ?? false);
  const [showStatusColumn, setShowStatusColumn] = useState(loadedSession?.showStatusColumn ?? false);
  const [selectedOperator, setSelectedOperator] = useState<string>('SEMUA');

  const filteredItems = useMemo(() => {
    if (selectedOperator === 'SEMUA') return items;
    return items.filter(item => {
      const brand = item.productName.split(' ')[0].toLowerCase();
      const op = selectedOperator.toLowerCase();
      
      if (op === 'indosat' || op === 'im3') {
        return brand.includes('indosat') || brand.includes('im3') || brand.includes('isat');
      }
      if (op === 'tsel' || op === 'telkomsel') {
        return brand.includes('telkomsel') || brand.includes('tsel');
      }
      if (op === 'three' || op === '3') {
        return brand.includes('three') || brand.includes('3');
      }
      return brand.includes(op);
    });
  }, [items, selectedOperator]);

  // Global Keyboard Shortcuts for Edit Modal
  useEffect(() => {
    if (!activeEditingRow.productId) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow default input behavior for text inputs but let Enter save
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter') {
          e.preventDefault();
          setActiveEditingRow(prev => ({ ...prev, productId: null }));
        }
        return;
      }
      
      const currentIdx = filteredItems.findIndex(i => i.productId === activeEditingRow.productId);
      const hasPrev = currentIdx > 0;
      const hasNext = currentIdx < filteredItems.length - 1;

      if (e.key === 'Enter') {
        e.preventDefault();
        setActiveEditingRow(prev => ({ ...prev, productId: null }));
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        setActiveEditingRow(prev => ({ ...prev, productId: filteredItems[currentIdx - 1].productId }));
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        setActiveEditingRow(prev => ({ ...prev, productId: filteredItems[currentIdx + 1].productId }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeEditingRow, filteredItems]);

  // Step 3 Cash States
  const [cashPhysical, setCashPhysical] = useState(loadedSession?.cashPhysical ?? '');
  const [catatanSelisih, setCatatanSelisih] = useState(loadedSession?.catatanSelisih ?? '');
  const [isHandoverSuccess, setIsHandoverSuccess] = useState(false);

  // Kasir penerima serah terima (bisa dipilih dari daftar)
  const [selectedToCashierId, setSelectedToCashierId] = useState<string>(loadedSession?.selectedToCashierId ?? nextCashier.id);

  // ── SELF-HANDOVER: Kasir bisa serah terima ke diri sendiri (untuk toko 1 kasir / rotasi jadwal) ──
  // Buat virtual entry "diri sendiri" yang selalu tersedia
  const selfCashierOption = { ...activeCashier, name: activeCashier.name + ' (Tutup Shift)', id: activeCashier.id + '__self' };
  // Daftar kasir lain (exclude diri sendiri)
  const otherCashiers = (allCashiers || [nextCashier]).filter(c => c.id !== activeCashier.id);
  // Gabungkan: kasir lain DULU, lalu opsi diri sendiri di bawah
  const availableToCashiers = [...otherCashiers, selfCashierOption];
  // Resolve kasir terpilih — jika self, gunakan selfCashierOption
  const selectedToCashier = availableToCashiers.find(c => c.id === selectedToCashierId) || (otherCashiers[0] || selfCashierOption);
  // Flag apakah ini self-handover
  const isSelfHandover = selectedToCashier.id === selfCashierOption.id;

  const isLight = theme === 'light';

  // ─── AUTO-SAVE SESI KE LOCALSTORAGE ────────────────────────────────────────
  // Simpan setiap kali ada perubahan state penting.
  // isHandoverSuccess dikecualikan — sesi hanya dihapus saat selesai.
  useEffect(() => {
    if (isHandoverSuccess) return; // Jangan simpan state "sudah selesai"
    const session = {
      currentStep,
      items,
      isInitialLocked,
      showIncomingStock,
      showStatusColumn,
      cashPhysical,
      catatanSelisih,
      selectedToCashierId,
      sessionStartedAt: loadedSession?.sessionStartedAt ?? new Date().toISOString()
    };
    try {
      localStorage.setItem(SK, JSON.stringify(session));
    } catch { /* storage penuh atau private mode */ }
  }, [currentStep, items, isInitialLocked, showIncomingStock, showStatusColumn, cashPhysical, catatanSelisih, selectedToCashierId, isHandoverSuccess]);


  // Initialize items from products — hanya jika TIDAK ada sesi yang di-restore
  useEffect(() => {
    if (isRestoredSession) return; // Sesi lama sudah di-load, jangan overwrite
    if (items.length === 0 && products.length > 0) {
      const initialItems = products.map(p => ({
        productId: p.id,
        productName: p.name,
        price: p.sellingPrice || 0,
        previousStock: p.currentStock || 0,
        incomingStock: 0,
        initialStock: p.currentStock || 0,
        finalStock: p.currentStock || 0,
        auditReason: null as 'penjualan' | 'audit' | null
      }));
      setItems(initialItems);
    }
  }, [products, isRestoredSession]);

  // Find current shift transactions
  const currentShiftTransactions = useMemo(() => {
    const shiftTrx = [];
    for (const trx of transactions) {
      if (trx.type === 'SERAH_TERIMA') break;
      shiftTrx.push(trx);
    }
    return shiftTrx;
  }, [transactions]);

  // Aggregate values
  const totalPreviousStock = items.reduce((sum, i) => sum + i.previousStock, 0);
  const totalIncomingStock = items.reduce((sum, i) => sum + i.incomingStock, 0);
  const totalInitialStock = items.reduce((sum, i) => sum + i.initialStock, 0);
  const totalFinalStock = items.reduce((sum, i) => sum + i.finalStock, 0);

  // Sales calculations
  const totalSoldPcs = items.reduce((sum, i) => sum + Math.max(0, i.initialStock - i.finalStock), 0);
  const totalSalesAmount = items.reduce((sum, i) => sum + (Math.max(0, i.initialStock - i.finalStock) * i.price), 0);
  
  // Calculate digital payments from shift transactions
  const { totalDigitalAmount, totalDigitalPcs } = useMemo(() => {
    const digitalTrx = currentShiftTransactions.filter(trx => 
      trx.type === 'PENJUALAN' && 
      (trx.paymentMethod === 'NON_TUNAI' || trx.paymentMethod === 'QRIS' || trx.paymentMethod === 'TRANSFER')
    );
    return {
      totalDigitalAmount: digitalTrx.reduce((sum, trx) => sum + trx.amount, 0),
      totalDigitalPcs: digitalTrx.reduce((sum, trx) => sum + trx.quantity, 0)
    };
  }, [currentShiftTransactions]);

  const totalCashExpected = Math.max(0, totalSalesAmount - totalDigitalAmount);
  const physicalCashValue = parseInt(cashPhysical.replace(/\D/g, '') || '0', 10);
  const cashDifference = physicalCashValue - totalCashExpected;
  const isCashMatched = physicalCashValue === totalCashExpected;

  const handleCashPhysicalChange = (raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) {
      setCashPhysical('');
      return;
    }
    const formatted = parseInt(clean, 10).toLocaleString('id-ID');
    setCashPhysical(formatted);
  };

  const handleSyncCashPhysical = () => {
    if (totalCashExpected === 0) {
      setCashPhysical('0');
    } else {
      setCashPhysical(totalCashExpected.toLocaleString('id-ID'));
    }
  };

  const handleInitialDelta = (productId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newInitial = Math.max(0, item.initialStock + delta);
        const expected = item.previousStock + item.incomingStock;
        let reason = item.auditReason;
        if (newInitial < expected && !reason) {
          reason = 'penjualan';
        } else if (newInitial >= expected) {
          reason = null;
        }
        return { 
          ...item, 
          initialStock: newInitial,
          finalStock: newInitial,
          auditReason: reason
        };
      }
      return item;
    }));
  };

  const handleIncomingDelta = (productId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newIncoming = Math.max(0, item.incomingStock + delta);
        return { 
          ...item, 
          incomingStock: newIncoming,
          initialStock: item.previousStock + newIncoming,
          finalStock: item.previousStock + newIncoming
        };
      }
      return item;
    }));
  };

  const handleFinalDelta = (productId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, finalStock: Math.max(0, item.finalStock + delta) };
      }
      return item;
    }));
  };

  const handleSetInitialDirect = (productId: string, val: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newInitial = Math.max(0, val);
        const expected = item.previousStock + item.incomingStock;
        let reason = item.auditReason;
        if (newInitial < expected && !reason) {
          reason = 'penjualan';
        } else if (newInitial >= expected) {
          reason = null;
        }
        return { 
          ...item, 
          initialStock: newInitial,
          finalStock: newInitial,
          auditReason: reason
        };
      }
      return item;
    }));
  };

  const handleSetFinalDirect = (productId: string, val: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, finalStock: Math.max(0, val) };
      }
      return item;
    }));
  };

  const handleLockInitialStock = () => {
    setIsInitialLocked(true);
    setCurrentStep(2);
    // Push updates to parent state
    items.forEach(item => {
      if (item.initialStock !== item.previousStock) {
        onUpdateProductStock(item.productId, item.initialStock, item.auditReason || undefined);
      }
    });
  };

  const handleCompleteHandover = () => {
    // Hapus sesi dari localStorage — serah terima sudah selesai
    try { localStorage.removeItem(SK); } catch { }
    setIsHandoverSuccess(true);
    onRecordHandover({
      initialStock: totalInitialStock,
      incomingStock: totalIncomingStock,
      finalStock: totalFinalStock,
      totalSold: totalSoldPcs,
      totalSales: totalSalesAmount,
      qrisAmount: totalDigitalAmount,
      qrisPcs: totalDigitalPcs,
      cashExpected: totalCashExpected,
      cashPhysical: physicalCashValue,
      cashDiff: cashDifference,
      note: catatanSelisih,
      // Kirim ID asli (tanpa '__self') agar App.tsx bisa proses dengan benar
      toCashierId: isSelfHandover ? activeCashier.id : selectedToCashier.id,
      toCashierName: isSelfHandover ? activeCashier.name : selectedToCashier.name,
      isSelfHandover,        // ← flag penting untuk App.tsx
      items: items.map(i => ({
        productId: i.productId,
        name: i.productName,
        initialStock: i.initialStock,
        finalStock: i.finalStock,
        soldPcs: Math.max(0, i.initialStock - i.finalStock),
        price: i.price,
        subtotal: Math.max(0, i.initialStock - i.finalStock) * i.price
      }))
    });
  };

  const handleFinishAndSwitch = () => {
    try { localStorage.removeItem(SK); } catch { }
    // ✅ Tidak ganti kasir — kasir yang login tetap
    // Kasir penerima harus login sendiri menggunakan akunnya
    onSwitchCashier(); // Hanya trigger notifikasi di App.tsx
    onBackToDashboard();
  };

  return (
    <div className={`w-full space-y-3 font-sans pb-16 ${isLight ? 'text-slate-800' : 'text-slate-700 dark:text-slate-200'}`} id="atur-stok-container">
      
      {/* BANNER: Sesi Dilanjutkan (jika restore dari localStorage) */}
      {isRestoredSession && !isHandoverSuccess && (
        <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 border ${
          isLight
            ? 'bg-amber-50 border-amber-300 text-amber-800'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-wide ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>Melanjutkan Sesi Sebelumnya</p>
            <p className={`text-[9px] font-medium mt-0.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
              Step {currentStep}/4 tersimpan
              {loadedSession?.sessionStartedAt ? ` · Dimulai ${new Date(loadedSession.sessionStartedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset dan mulai audit baru dari awal?')) {
                try { localStorage.removeItem(SK); } catch { }
                window.location.reload();
              }
            }}
            className={`text-[9px] font-black px-2 py-1 rounded-lg border cursor-pointer transition ${
              isLight ? 'border-amber-400 text-amber-700 hover:bg-amber-100' : 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            Reset
          </button>
        </div>
      )}

      {/* 1. TOP CARD: KELOLA STOK & TUTUP SHIFT */}
      <div className={`rounded-xl p-3 shadow-xs relative overflow-hidden border ${
        isLight 
          ? 'bg-white border-slate-200' 
          : 'bg-gradient-to-r from-[#172554] via-[#0f172a] to-[#0a0f1d] border-blue-500/20 shadow-md'
      }`}>
        {!isLight && (
          <div className="absolute -top-10 -left-10 w-36 h-36 bg-blue-600/15 blur-[40px] rounded-full pointer-events-none" />
        )}
        
        <div className="flex items-center justify-between gap-2 relative z-10">
          {/* Kiri: Icon + judul + badge role */}
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl p-[1px] shadow-xs shrink-0 ${
              isLight 
                ? 'bg-blue-600' 
                : 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-blue-500/20'
            }`}>
              <div className={`w-full h-full rounded-[11px] flex items-center justify-center ${
                isLight ? 'bg-blue-50' : 'bg-white dark:bg-slate-800'
              }`}>
                <Package className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              </div>
            </div>
            <div>
              <h2 className={`text-xs sm:text-sm font-bold tracking-tight leading-snug ${
                isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'
              }`}>
                Kelola Stok & Tutup Shift
              </h2>
              <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 border ${
                isLight 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-blue-950/80 text-blue-400 border-blue-500/40'
              }`}>
                {activeCashier.role === "Kasir Utama" || activeCashier.role === "Administrator" ? 'Kasir Utama' : 'Kasir'}
              </span>
            </div>
          </div>
          
          {/* Kanan: Kasir Aktif → Penerima */}
          <div className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 border ${
            isLight 
              ? 'bg-slate-50 border-slate-200' 
              : 'bg-slate-50 dark:bg-slate-800/80 border-blue-500/15'
          }`}>
            {/* Kasir Aktif */}
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border ${
                isLight ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-blue-600/30 border-blue-500/40 text-blue-300'
              }`}>
                {activeCashier.name.charAt(0).toUpperCase()}
              </div>
              <span className={`text-[7px] font-semibold leading-none ${isLight ? 'text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>Aktif</span>
              <span className={`text-[9px] font-black leading-none max-w-[52px] truncate text-center ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{activeCashier.name}</span>
            </div>

            {/* Arrow */}
            <svg className={`w-3 h-3 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>

            {/* Kasir Penerima */}
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border ${
                currentStep >= 4
                  ? (isLight ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-emerald-600/30 border-emerald-500/40 text-emerald-300')
                  : (isLight ? 'bg-slate-100 border-slate-300 text-slate-500' : 'bg-slate-700 border-slate-600 text-slate-400')
              }`}>
                {currentStep >= 4 ? selectedToCashier.name.charAt(0).toUpperCase() : '?'}
              </div>
              <span className={`text-[7px] font-semibold leading-none ${isLight ? 'text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>Penerima</span>
              <span className={`text-[9px] font-black leading-none max-w-[52px] truncate text-center ${
                currentStep >= 4
                  ? (isLight ? 'text-emerald-700' : 'text-emerald-400')
                  : (isLight ? 'text-slate-400' : 'text-slate-500')
              }`}>
                {currentStep >= 4 ? selectedToCashier.name : 'Pilih di\u00a0Step\u00a04'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. COMPACT STEPPER BAR */}
      <div className="px-1 py-0.5">
        <div className="relative flex items-center justify-between max-w-xs mx-auto">
          {/* Background Line */}
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] ${isLight ? 'bg-slate-200' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800'}`} />
          
          {/* Active Line Fill */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />

          {[1, 2, 3, 4].map((step) => {
            const isActive = currentStep === step;
            const isPassed = currentStep > step;
            
            return (
              <button
                key={step}
                onClick={() => {
                  if (step === 1 || isInitialLocked) {
                    setCurrentStep(step as any);
                  }
                }}
                className={`relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-slate-900 dark:text-white shadow-md shadow-blue-500/30 border-2 border-white dark:border-blue-400' 
                    : isPassed
                      ? (isLight ? 'bg-blue-50 text-blue-700 border border-blue-300 font-black' : 'bg-white dark:bg-slate-800 text-blue-400 border border-blue-500/40')
                      : (isLight ? 'bg-white text-slate-600 dark:text-slate-400 border border-slate-300 shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-700')
                }`}
              >
                {step}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LANGKAH 1: HITUNG STOK AWAL (BUKA SHIFT) */}
      {/* ========================================================================= */}
      {currentStep === 1 && !isHandoverSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2.5"
        >
          {/* Outer Header Text */}
          <div className="px-1 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-xs">
                1
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-bold tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                  Hitung Stok Awal (Buka Shift)
                </h3>
                <p className={`text-[9.5px] sm:text-[10px] mt-0.5 leading-tight ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>
                  Cocokkan fisik etalase dengan sisa stok shift sebelumnya. Ketuk baris untuk mengatur jumlah.
                </p>
              </div>
            </div>
            
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
              isLight 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Quick Metric & Action Row - 4 BALANCED MODERN CARDS */}
          <div className="grid grid-cols-4 gap-1.5 px-0.5">
            {/* 1. Total Stok Awal */}
            <div className={`rounded-xl p-2 flex flex-col justify-between min-w-0 border shadow-xs ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800' 
                : 'bg-white dark:bg-slate-800 border-blue-500/30 text-slate-900 dark:text-white'
            }`}>
              <div className="flex items-center justify-between gap-0.5">
                <span className={`text-[8px] sm:text-[9.5px] font-bold uppercase truncate ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                  Stok Awal
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setItems(prev => prev.map(item => ({
                      ...item,
                      initialStock: item.previousStock + item.incomingStock,
                      finalStock: item.previousStock + item.incomingStock,
                      auditReason: null
                    })));
                  }}
                  className="text-blue-500 hover:text-emerald-500 p-0.5 transition cursor-pointer"
                  title="Samakan semua stok awal dengan shift lalu"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                </button>
              </div>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className={`text-sm sm:text-lg font-black tracking-tight font-mono ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                  {totalInitialStock}
                </span>
                <span className={`text-[8px] sm:text-[9px] font-semibold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  Pcs
                </span>
              </div>
            </div>

            {/* 2. Stok Shift Lalu */}
            <div className={`rounded-xl p-2 flex flex-col justify-between min-w-0 border shadow-xs ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800' 
                : 'bg-white dark:bg-slate-800 border-blue-500/30 text-slate-900 dark:text-white'
            }`}>
              <span className={`text-[8px] sm:text-[9.5px] font-bold uppercase truncate ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                Shift Lalu
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className={`text-sm sm:text-lg font-black tracking-tight font-mono ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                  {totalPreviousStock}
                </span>
                <span className={`text-[8px] sm:text-[9px] font-semibold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  Pcs
                </span>
              </div>
            </div>

            {/* 3. Tambah Stok Masuk */}
            <button 
              type="button"
              onClick={() => setShowIncomingStock(!showIncomingStock)}
              className={`rounded-xl p-2 flex flex-col justify-between min-w-0 border shadow-xs transition cursor-pointer text-left ${
                showIncomingStock 
                  ? 'bg-blue-600 text-slate-900 dark:text-white border-blue-600 shadow-sm' 
                  : (isLight 
                      ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800' 
                      : 'bg-white dark:bg-slate-800 hover:bg-blue-950/60 border-blue-500/30 text-slate-900 dark:text-white')
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[8px] sm:text-[9.5px] font-bold uppercase truncate ${
                  showIncomingStock ? 'text-slate-900 dark:text-white' : (isLight ? 'text-blue-600' : 'text-blue-400')
                }`}>
                  + Masuk
                </span>
                <Plus className="w-3 h-3 shrink-0" />
              </div>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className={`text-sm sm:text-lg font-black tracking-tight font-mono ${
                  showIncomingStock ? 'text-slate-900 dark:text-white' : (isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white')
                }`}>
                  {totalIncomingStock}
                </span>
                <span className={`text-[8px] sm:text-[9px] font-semibold ${
                  showIncomingStock ? 'text-blue-100' : (isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400')
                }`}>
                  Pcs
                </span>
              </div>
            </button>
            
            {/* 4. Filter / Kolom Status */}
            <button 
              type="button"
              onClick={() => setShowStatusColumn(!showStatusColumn)}
              className={`rounded-xl p-2 flex flex-col justify-between min-w-0 border shadow-xs transition cursor-pointer text-left ${
                showStatusColumn 
                  ? (isLight ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-amber-500 bg-amber-950/50 text-amber-300')
                  : (isLight ? 'bg-white border-slate-200 hover:border-amber-400 text-slate-800' : 'bg-white dark:bg-slate-800 border-blue-500/30 hover:border-amber-500/60 text-slate-900 dark:text-white')
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[8px] sm:text-[9.5px] font-bold uppercase truncate ${
                  showStatusColumn ? 'text-amber-700 dark:text-amber-300' : (isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400')
                }`}>
                  Status
                </span>
                <ListFilter className="w-3 h-3 shrink-0" />
              </div>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className={`text-[10px] sm:text-xs font-black tracking-tight ${
                  showStatusColumn ? (isLight ? 'text-amber-700' : 'text-amber-300') : (isLight ? 'text-slate-700' : 'text-slate-600 dark:text-slate-300')
                }`}>
                  {showStatusColumn ? 'Aktif' : 'Ringkas'}
                </span>
              </div>
            </button>
          </div>

          {/* Operator Filter Chips */}
          <div className="flex gap-1 overflow-x-auto pb-1.5 pt-1 px-0.5 custom-scrollbar">
            {['SEMUA', 'AXIS', 'XL', 'TSEL', 'INDOSAT', 'THREE', 'SMARTFREN'].map(op => {
              const isActive = selectedOperator === op;
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => setSelectedOperator(op)}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 transition-all active:scale-95 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : (isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-850 hover:bg-slate-750 text-slate-300')
                  }`}
                >
                  {op === 'TSEL' ? 'TELKOMSEL' : op === 'THREE' ? '3' : op}
                </button>
              );
            })}
          </div>

          {/* VOUCHER TABLE - STRICTLY 100% FIT IN 1 SCREEN (NO HORIZONTAL SCROLL) */}
          <div className={`w-full overflow-hidden rounded-xl border shadow-xs ${
            isLight 
              ? 'bg-white border-slate-200' 
              : 'bg-white dark:bg-slate-800 border-blue-900/40 shadow-md'
          }`}>
            <table className="w-full table-fixed text-left border-collapse bg-transparent">
              <thead className={`border-b ${
                isLight 
                  ? 'bg-slate-50/90 border-slate-200 text-slate-800 font-bold' 
                  : 'bg-white dark:bg-slate-800 border-blue-900/40 text-slate-600 dark:text-slate-300 font-bold'
              }`}>
                <tr className="text-[9px] sm:text-[10px] uppercase tracking-tight">
                  <th className={`py-2 px-2 font-bold ${
                    showIncomingStock && showStatusColumn 
                      ? 'w-[36%]' 
                      : showIncomingStock || showStatusColumn 
                        ? 'w-[42%]' 
                        : 'w-[50%]'
                  }`}>
                    VOUCHER
                  </th>
                  <th className={`py-2 px-1 text-center font-bold ${
                    showIncomingStock && showStatusColumn 
                      ? 'w-[14%]' 
                      : showIncomingStock || showStatusColumn 
                        ? 'w-[18%]' 
                        : 'w-[22%]'
                  }`}>
                    LALU
                  </th>
                  {showIncomingStock && (
                    <th className={`py-2 px-1 text-center font-bold ${
                      showStatusColumn ? 'w-[18%]' : 'w-[20%]'
                    } ${
                      isLight ? 'text-blue-700 bg-blue-50/50' : 'text-blue-400 bg-blue-950/30'
                    }`}>
                      MASUK
                    </th>
                  )}
                  <th className={`py-2 px-1.5 text-center font-bold ${
                    showIncomingStock && showStatusColumn 
                      ? 'w-[20%]' 
                      : showIncomingStock || showStatusColumn 
                        ? 'w-[24%]' 
                        : 'w-[28%]'
                  } ${
                    isLight ? 'text-blue-700' : 'text-blue-400'
                  }`}>
                    STOK AWAL
                  </th>
                  {showStatusColumn && (
                    <th className={`py-2 px-1 text-center font-bold ${
                      showIncomingStock ? 'w-[12%]' : 'w-[16%]'
                    }`}>
                      STATUS
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`text-xs divide-y ${
                isLight ? 'divide-slate-100 bg-white' : 'divide-blue-900/20'
              }`}>
                {filteredItems.map((item) => {
                  const expectedInitial = item.previousStock + item.incomingStock;
                  const isMatched = item.initialStock === expectedInitial;
                  const diffWithExpected = item.initialStock - expectedInitial;
                  const productDetails = products.find(p => p.id === item.productId);
                  const isEditingThis = activeEditingRow.productId === item.productId && activeEditingRow.type === 'initial';

                  const nameParts = item.productName.split(' ');
                  const brandTitle = nameParts[0];
                  const variantSubtitle = nameParts.slice(1).join(' ');

                  return (
                    <tr 
                      key={item.productId} 
                      onClick={() => !isInitialLocked && setActiveEditingRow({ step: 1, type: 'initial', productId: item.productId })}
                      className={`transition-colors cursor-pointer ${
                        isEditingThis 
                          ? (isLight ? 'bg-blue-100/70 ring-1 ring-blue-400' : 'bg-blue-900/40 ring-1 ring-blue-500/50')
                          : (isLight ? 'hover:bg-blue-50/60 bg-white' : 'hover:bg-blue-950/30')
                      }`}
                    >
                      {/* PRODUK VOUCHER */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CompactOperatorLogo name={brandTitle} operator={productDetails?.operator} size="md" />
                          <div className="flex flex-col min-w-0 leading-tight">
                            {/* Baris 1: Nama Provider */}
                            <span className={`text-sm sm:text-base font-black truncate ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                              {brandTitle}
                            </span>
                            {/* Baris 2: Total GB / Masa Aktif */}
                            <span className={`text-xs sm:text-[13px] font-bold truncate ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-300'}`}>
                              {variantSubtitle || item.productName}
                            </span>
                            {/* Baris 3: Harga */}
                            <span className={`text-[10px] sm:text-xs font-mono font-bold ${
                              isLight ? 'text-blue-700' : 'text-blue-400'
                            }`}>
                              @Rp{item.price.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* STOK SHIFT LALU */}
                      <td className={`py-2 px-1 text-center font-mono font-bold text-xs sm:text-sm ${isLight ? 'text-slate-800' : 'text-slate-600 dark:text-slate-300'}`}>
                        {item.previousStock}
                      </td>

                      {/* TAMBAHAN MASUK (OPTIONAL) */}
                      {showIncomingStock && (
                        <td className={`py-2 px-1 text-center ${isLight ? 'bg-blue-50/30' : 'bg-blue-950/20'}`} onClick={(e) => e.stopPropagation()}>
                          <div className={`inline-flex items-center gap-0.5 rounded-lg p-0.5 border ${
                            isLight ? 'bg-white border-blue-200' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-900 border-blue-500/30'
                          }`}>
                            <button
                              type="button"
                              onClick={() => handleIncomingDelta(item.productId, -1)}
                              className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center cursor-pointer ${
                                isLight ? 'bg-slate-100 text-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              -
                            </button>
                            <span className={`text-xs font-mono font-bold min-w-3 text-center ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                              {item.incomingStock}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleIncomingDelta(item.productId, 1)}
                              className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center cursor-pointer ${
                                isLight ? 'bg-slate-100 text-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </td>
                      )}

                      {/* STOK FISIK AWAL */}
                      <td className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isInitialLocked) {
                              setActiveEditingRow({ step: 1, type: 'initial', productId: item.productId });
                            }
                          }}
                          className={`inline-flex items-center justify-center min-w-[36px] py-1 px-2 rounded-lg border transition cursor-pointer active:scale-95 ${
                            isLight 
                              ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' 
                              : 'bg-blue-950/40 hover:bg-blue-900/50 border-blue-500/30 text-blue-400'
                          }`}
                          title="Ketuk untuk ubah stok awal"
                        >
                          <span className="text-xs sm:text-sm font-black font-mono tracking-tight">
                            {item.initialStock}
                          </span>
                        </button>
                      </td>

                      {/* STATUS (OPTIONAL) */}
                      {showStatusColumn && (
                        <td className="py-2 px-1 text-center">
                          {isMatched ? (
                            <span className={`inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1 py-0.5 rounded border ${
                              isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950/60 text-emerald-500 font-black dark:text-emerald-400 border-emerald-500/30'
                            }`}>
                              <CheckCircle2 className="w-2.5 h-2.5" /> Pas
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1 py-0.5 rounded border ${
                              diffWithExpected > 0 
                                ? (isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-950/60 text-blue-400 border-blue-500/30')
                                : (isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-950/60 text-rose-500 font-black dark:text-rose-400 border-rose-500/30')
                            }`}>
                              {diffWithExpected > 0 ? `+${diffWithExpected}` : diffWithExpected}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Bar: Total Stok & Kunci */}
          <div className={`rounded-xl p-3 flex items-center justify-between gap-2 border shadow-xs ${
            isLight 
              ? 'bg-white border-slate-200 text-slate-800' 
              : 'bg-white dark:bg-slate-800 border-blue-500/20 shadow-md text-slate-900 dark:text-white'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                isLight 
                  ? 'bg-slate-100 border-slate-200 text-slate-600' 
                  : 'bg-white dark:bg-slate-800 border-slate-700/70 text-slate-600 dark:text-slate-400'
              }`}>
                <Database className="w-4 h-4" />
              </div>
              
              <div className="flex flex-col">
                <span className={`text-[8px] font-semibold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Stok Shift Lalu</span>
                <span className={`text-xs sm:text-sm font-bold leading-tight ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                  {totalPreviousStock}
                </span>
              </div>
              
              <div className={`w-[1px] h-5 mx-1 ${isLight ? 'bg-slate-200' : 'bg-slate-700/60'}`} />
              
              <div className="flex flex-col">
                <span className={`text-[8px] font-semibold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Total Siap Jual</span>
                <div className="flex items-baseline gap-0.5">
                  <span className={`text-xs sm:text-sm font-bold leading-tight ${isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'}`}>
                    {totalInitialStock}
                  </span>
                  <span className={`text-[8.5px] font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-500/70'}`}>
                    Pcs
                  </span>
                </div>
              </div>
            </div>

            {isInitialLocked ? (
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setIsInitialLocked(false)} 
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-[9px] sm:text-[10px] transition flex items-center gap-1 cursor-pointer border ${
                    isLight 
                      ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' 
                      : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-700'
                  }`}
                >
                  <Unlock className="w-3 h-3" /> Buka Kunci
                </button>
                <button 
                  onClick={() => setCurrentStep(2)} 
                  className="px-3.5 py-1.5 bg-blue-600 text-slate-900 dark:text-white rounded-lg font-bold text-[9px] sm:text-[10px] hover:bg-blue-500 transition flex items-center gap-1 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Lanjut <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLockInitialStock} 
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-900 dark:text-white rounded-xl font-bold text-[9.5px] sm:text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" /> Kunci Stok Awal & Lanjut
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 2. LANGKAH 2: HITUNG STOK AKHIR (TUTUP SHIFT) */}
      {/* ========================================================================= */}
      {currentStep === 2 && !isHandoverSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2.5"
        >
          {/* Header */}
          <div className="px-1 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-xs">
                2
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-bold tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                  Hitung Stok Akhir (Tutup Shift)
                </h3>
                <p className={`text-[9.5px] sm:text-[10px] mt-0.5 leading-tight ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>
                  Ketuk angka sisa fisik voucher untuk mengatur sisa akhir. Terjual dihitung otomatis.
                </p>
              </div>
            </div>
            
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
              isLight 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-black dark:text-emerald-400'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Summary Badges - 4 BALANCED MODERN CARDS MATCHING STEP 1 */}
          <div className="grid grid-cols-4 gap-1.5 px-0.5">
            {/* 1. Stok Awal */}
            <div className={`rounded-xl p-2 flex flex-col justify-between min-w-0 border shadow-xs ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800' 
                : 'bg-white dark:bg-slate-800 border-blue-500/30 text-slate-900 dark:text-white'
            }`}>
              <span className={`text-[8px] sm:text-[9.5px] font-bold uppercase truncate ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                Stok Awal
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className={`text-sm sm:text-lg font-black tracking-tight font-mono ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                  {totalInitialStock}
                </span>
                <span className={`text-[8px] sm:text-[9px] font-semibold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  Pcs
                </span>
              </div>
            </div>

            {/* 2. Sisa Akhir */}
            <div className={`rounded-xl p-2 flex flex-col justify-between min-w-0 border shadow-xs ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800' 
                : 'bg-white dark:bg-slate-800 border-blue-500/30 text-slate-900 dark:text-white'
            }`}>
              <span className={`text-[8px] sm:text-[9.5px] font-bold uppercase truncate ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                Sisa Akhir
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className={`text-sm sm:text-lg font-black tracking-tight font-mono ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                  {totalFinalStock}
                </span>
                <span className={`text-[8px] sm:text-[9px] font-semibold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  Pcs
                </span>
              </div>
            </div>

            {/* 3. Terjual */}
            <div className={`rounded-xl p-2 flex flex-col justify-between min-w-0 border shadow-xs ${
              isLight 
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' 
                : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
            }`}>
              <span className={`text-[8px] sm:text-[9.5px] font-bold uppercase truncate ${isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'}`}>
                Terjual
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className={`text-sm sm:text-lg font-black tracking-tight font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'}`}>
                  {totalSoldPcs}
                </span>
                <span className={`text-[8px] sm:text-[9px] font-semibold ${isLight ? 'text-emerald-600' : 'text-emerald-500/80'}`}>
                  Pcs
                </span>
              </div>
            </div>

            {/* 4. Total Uang */}
            <div className={`rounded-xl p-2 flex flex-col justify-between min-w-0 border shadow-xs ${
              isLight 
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' 
                : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
            }`}>
              <span className={`text-[8px] sm:text-[9.5px] font-bold uppercase truncate ${isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'}`}>
                Total Uang
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5 truncate">
                <span className={`text-[11px] sm:text-sm font-black tracking-tight font-mono truncate ${isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'}`}>
                  Rp{totalSalesAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Operator Filter Chips */}
          <div className="flex gap-1 overflow-x-auto pb-1.5 pt-1 px-0.5 custom-scrollbar">
            {['SEMUA', 'AXIS', 'XL', 'TSEL', 'INDOSAT', 'THREE', 'SMARTFREN'].map(op => {
              const isActive = selectedOperator === op;
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => setSelectedOperator(op)}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 transition-all active:scale-95 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : (isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-850 hover:bg-slate-750 text-slate-300')
                  }`}
                >
                  {op === 'TSEL' ? 'TELKOMSEL' : op === 'THREE' ? '3' : op}
                </button>
              );
            })}
          </div>

          {/* Table: Strictly 100% Fit in 1 Screen without Horizontal Scroll */}
          <div className={`w-full overflow-hidden rounded-xl border shadow-xs ${
            isLight ? 'bg-white border-slate-200' : 'bg-white dark:bg-slate-800 border-blue-900/40 shadow-md'
          }`}>
            <table className="w-full table-fixed text-left border-collapse bg-transparent">
              <thead className={`border-b ${
                isLight ? 'bg-slate-50/90 border-slate-200 text-slate-800 font-bold' : 'bg-white dark:bg-slate-800 border-blue-900/40 text-slate-600 dark:text-slate-300 font-bold'
              }`}>
                <tr className="text-[9px] sm:text-[10px] uppercase tracking-tight">
                  <th className="py-2 px-2 w-[36%] sm:w-[32%] font-bold">VOUCHER</th>
                  <th className="py-2 px-1 text-center w-[14%] sm:w-[14%] font-bold">AWAL</th>
                  <th className={`py-2 px-1 text-center w-[22%] sm:w-[24%] font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'}`}>AKHIR</th>
                  <th className={`py-2 px-1 text-center w-[12%] sm:w-[14%] font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'}`}>TERJUAL</th>
                  <th className="py-2 px-2 text-right w-[16%] sm:w-[16%] font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody className={`text-xs divide-y ${
                isLight ? 'divide-slate-100 bg-white' : 'divide-blue-900/20'
              }`}>
                {filteredItems.map((item) => {
                  const isEditingFinal = activeEditingRow.step === 2 && 
                                         activeEditingRow.type === 'final' && 
                                         activeEditingRow.productId === item.productId;
                  const productDetails = products.find(p => p.id === item.productId);
                  const nameParts = item.productName.split(' ');
                  const brandTitle = nameParts[0];
                  const variantSubtitle = nameParts.slice(1).join(' ');
                  const soldCount = Math.max(0, item.initialStock - item.finalStock);
                  const subtotal = soldCount * item.price;

                  return (
                    <tr 
                      key={item.productId} 
                      onClick={() => setActiveEditingRow({ step: 2, type: 'final', productId: item.productId })}
                      className={`transition-colors cursor-pointer ${
                        isEditingFinal 
                          ? (isLight ? 'bg-emerald-100/70 ring-1 ring-emerald-400' : 'bg-emerald-900/40 ring-1 ring-emerald-500/50')
                          : (isLight ? 'hover:bg-emerald-50/60 bg-white' : 'hover:bg-blue-950/30')
                      }`}
                    >
                      {/* PRODUK VOUCHER */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CompactOperatorLogo name={brandTitle} operator={productDetails?.operator} size="md" />
                          <div className="flex flex-col min-w-0 leading-tight">
                            {/* Baris 1: Nama Provider */}
                            <span className={`text-sm sm:text-base font-black truncate ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                              {brandTitle}
                            </span>
                            {/* Baris 2: Total GB / Masa Aktif */}
                            <span className={`text-xs sm:text-[13px] font-bold truncate ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-300'}`}>
                              {variantSubtitle || item.productName}
                            </span>
                            {/* Baris 3: Harga */}
                            <span className={`text-[10px] sm:text-xs font-mono font-bold ${
                              isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'
                            }`}>
                              @Rp{item.price.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* AWAL */}
                      <td className={`py-2 px-1 text-center font-mono font-bold text-xs sm:text-sm ${isLight ? 'text-slate-800' : 'text-slate-600 dark:text-slate-300'}`}>
                        {item.initialStock}
                      </td>
                      
                      {/* SISA AKHIR */}
                      <td className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEditingRow({ step: 2, type: 'final', productId: item.productId });
                          }}
                          className={`inline-flex items-center justify-center min-w-[36px] py-1 px-2 rounded-lg border transition cursor-pointer active:scale-95 ${
                            isLight 
                              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' 
                              : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/30 text-emerald-500 font-black dark:text-emerald-400'
                          }`}
                          title="Ketuk untuk ubah sisa akhir"
                        >
                          <span className="text-xs sm:text-sm font-black font-mono tracking-tight">
                            {item.finalStock}
                          </span>
                        </button>
                      </td>

                      {/* TERJUAL */}
                      <td className={`py-2 px-1 text-center font-mono font-black text-xs sm:text-sm ${
                        isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'
                      }`}>
                        {soldCount}
                      </td>

                      {/* TOTAL NILAI */}
                      <td className={`py-2 px-2 text-right font-mono font-black text-[11px] sm:text-xs leading-tight ${
                        isLight ? 'text-slate-900' : 'text-slate-100'
                      }`}>
                        {subtotal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer rounded-xl border shadow-xs ${
                isLight 
                  ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900' 
                  : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-700'
              }`}
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${isLight ? 'text-slate-700' : 'text-slate-600 dark:text-slate-300'}`} /> Kembali ke Stok Awal
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              Lanjut: Cek Tunai & QRIS <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 3. LANGKAH 3: CEK TUNAI VS NON-TUNAI / QRIS */}
      {/* ========================================================================= */}
      {currentStep === 3 && !isHandoverSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Header */}
          <div className="px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                3
              </div>
              <div>
                <h3 className={`text-sm sm:text-base font-bold tracking-tight leading-snug ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                  Status Terjual (Tunai vs QRIS)
                </h3>
                <p className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-300'}`}>
                  Pisahkan pembayaran non-tunai (QRIS) dari total penjualan untuk menghitung uang kas di laci.
                </p>
              </div>
            </div>

            <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 shrink-0 ${
              isCashMatched
                ? (isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs' : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300')
                : (isLight ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs' : 'bg-amber-950/80 border-amber-500/40 text-amber-300')
            }`}>
              {isCashMatched ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
              Uang: {isCashMatched ? 'PAS (Rp0)' : `Selisih Rp${Math.abs(cashDifference).toLocaleString('id-ID')}`}
            </span>
          </div>

          {/* 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Card 1: Total Penjualan */}
            <div className={`rounded-xl p-3 border shadow-xs space-y-1 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-white dark:bg-slate-800 border-blue-500/20 text-slate-900 dark:text-white'
            }`}>
              <div className={`flex items-center justify-between text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>
                <span>Total Penjualan</span>
                <Package className="w-4 h-4 opacity-70 text-blue-500" />
              </div>
              <div className={`text-base sm:text-lg font-black font-mono tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                Rp{totalSalesAmount.toLocaleString('id-ID')}
              </div>
              <div className={`text-xs font-bold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {totalSoldPcs} Pcs voucher fisik
              </div>
            </div>

            {/* Card 2: QRIS/Transfer (Digital) */}
            <div className={`rounded-xl p-3 border shadow-xs space-y-1.5 ${
              isLight ? 'bg-white border-blue-200 ring-1 ring-blue-100 text-slate-800' : 'bg-white dark:bg-slate-800 border-blue-500/30 text-slate-900 dark:text-white'
            }`}>
              <div className={`flex items-center justify-between text-xs font-semibold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                <span>Non-Tunai (-)</span>
                <QrCode className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-center gap-1.5 py-1">
                <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>Rp</span>
                <span className={`font-mono font-bold text-sm ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                  {totalDigitalAmount.toLocaleString('id-ID')}
                </span>
              </div>
              <div className={`text-xs flex items-center justify-between pt-0.5 border-t ${isLight ? 'border-slate-200 text-slate-600' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <span className="font-bold">Total Qty Digital:</span>
                <span className="font-mono text-xs font-bold">{totalDigitalPcs} Pcs</span>
              </div>
            </div>

            {/* Card 3: Uang Laci Wajib */}
            <div className={`rounded-xl p-3 border shadow-xs space-y-1 ${
              isLight ? 'bg-white border-emerald-200 ring-1 ring-emerald-100 text-slate-800' : 'bg-white dark:bg-slate-800 border-emerald-500/30 text-slate-900 dark:text-white'
            }`}>
              <div className={`flex items-center justify-between text-xs font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'}`}>
                <span>Uang Laci (Wajib)</span>
                <Banknote className="w-4 h-4 text-emerald-500" />
              </div>
              <div className={`text-base sm:text-lg font-black font-mono tracking-tight ${isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'}`}>
                Rp{totalCashExpected.toLocaleString('id-ID')}
              </div>
              <div className={`text-xs font-bold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                Penjualan dikurangi QRIS
              </div>
            </div>
          </div>

          {/* Cash Input & Reconciliation Box */}
          <div className={`rounded-xl p-3.5 space-y-2.5 border shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-white dark:bg-slate-800 border-blue-500/20'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs sm:text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                Hitung Uang Tunai Fisik di Laci:
              </span>
              <button
                type="button"
                onClick={handleSyncCashPhysical}
                className={`text-xs font-bold underline cursor-pointer transition ${
                  isLight ? 'text-blue-600 hover:text-blue-800' : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                Samakan (Rp{totalCashExpected.toLocaleString('id-ID')})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${
                isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-700'
              }`}>
                <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>Fisik: Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={cashPhysical}
                  onChange={(e) => handleCashPhysicalChange(e.target.value)}
                  className={`w-full bg-transparent font-mono font-black text-sm sm:text-base focus:outline-none ${
                    isLight ? 'text-slate-900 placeholder-slate-400' : 'text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600'
                  }`}
                />
              </div>

              <div className={`text-xs px-3 py-2 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800'
              }`}>
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>Selisih Fisik:</span>
                <span className={`font-mono font-black text-xs sm:text-sm ${
                  cashDifference === 0 
                    ? (isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400')
                    : cashDifference > 0 
                      ? (isLight ? 'text-amber-700' : 'text-amber-500 font-black dark:text-amber-400')
                      : (isLight ? 'text-rose-700' : 'text-rose-500 font-black dark:text-rose-400')
                }`}>
                  {cashDifference === 0 
                    ? 'Rp0 (PAS)' 
                    : `${cashDifference > 0 ? '+ ' : '- '}Rp${Math.abs(cashDifference).toLocaleString('id-ID')}`}
                </span>
              </div>
            </div>

            {!isCashMatched && (
              <input
                type="text"
                placeholder="Catatan selisih (misal: kembalian kurang / uang koin tercecer)"
                value={catatanSelisih}
                onChange={(e) => setCatatanSelisih(e.target.value)}
                className={`w-full rounded-xl p-2.5 text-xs focus:outline-none border mt-1 font-bold ${
                  isLight 
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500'
                }`}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer rounded-xl border shadow-xs ${
                isLight 
                  ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900' 
                  : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-700'
              }`}
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${isLight ? 'text-slate-700' : 'text-slate-600 dark:text-slate-300'}`} /> Kembali ke Stok Akhir
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              Lanjut: Serah Terima <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 4. LANGKAH 4: SERAH TERIMA KASIR */}
      {/* ========================================================================= */}
      {currentStep === 4 && !isHandoverSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="px-1 flex items-center justify-between gap-2">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                4
              </div>
              <div>
                <h3 className={`text-sm sm:text-base font-bold tracking-tight leading-snug ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                  Serah Terima Kasir
                </h3>
                <p className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-300'}`}>
                  Shift {activeCashier.name} selesai — pilih kasir penerima stok.
                </p>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-semibold ${
              isLight ? 'bg-white border-slate-200 text-slate-700 shadow-2xs' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className={`rounded-xl p-3 space-y-1 border shadow-xs ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-white dark:bg-slate-800 border-blue-500/20 text-slate-900 dark:text-white'
            }`}>
              <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>1. Sisa Stok Diserahkan</span>
              <div className={`text-base sm:text-lg font-black font-mono ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                {totalFinalStock} Pcs
              </div>
              <div className={`text-xs ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Awal: {totalInitialStock} • Terjual: {totalSoldPcs}</div>
            </div>

            <div className={`rounded-xl p-3 space-y-1 border shadow-xs ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-white dark:bg-slate-800 border-blue-500/20 text-slate-900 dark:text-white'
            }`}>
              <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>2. Uang Tunai Laci</span>
              <div className={`text-base sm:text-lg font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-500 dark:text-emerald-400'}`}>
                Rp{physicalCashValue.toLocaleString('id-ID')}
              </div>
              <div className={`text-xs ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {isCashMatched ? 'Status: Sesuai (PAS)' : `Selisih Rp${Math.abs(cashDifference).toLocaleString('id-ID')}`}
              </div>
            </div>

            <div className={`rounded-xl p-3 space-y-1 border shadow-xs ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-white dark:bg-slate-800 border-blue-500/20 text-slate-900 dark:text-white'
            }`}>
              <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>3. Non-Tunai</span>
              <div className={`text-base sm:text-lg font-black font-mono ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                Rp{totalDigitalAmount.toLocaleString('id-ID')}
              </div>
              <div className={`text-xs ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>{totalDigitalPcs} transaksi digital</div>
            </div>
          </div>

          {/* ===== PILIH KASIR PENERIMA ===== */}
          <div className={`rounded-xl p-3.5 space-y-2.5 border shadow-xs ${
            isLight ? 'bg-white border-slate-200' : 'bg-white dark:bg-slate-800 border-indigo-500/20'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-4 rounded-full ${isLight ? 'bg-indigo-500' : 'bg-indigo-400'}`} />
              <span className={`text-xs font-black uppercase tracking-wide ${isLight ? 'text-slate-800' : 'text-slate-900 dark:text-white'}`}>
                Pilih Kasir Penerima
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {availableToCashiers.map((cashier) => {
                const isSelected = selectedToCashierId === cashier.id;
                const isSelf = cashier.id.endsWith('__self');
                const displayName = isSelf ? activeCashier.name : cashier.name;
                return (
                  <button
                    key={cashier.id}
                    type="button"
                    onClick={() => setSelectedToCashierId(cashier.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
                      isSelected
                        ? isSelf
                          ? (isLight ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-amber-400 bg-amber-500/10')
                          : (isLight ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-emerald-500 bg-emerald-500/10')
                        : (isLight ? 'border-slate-200 bg-slate-50 hover:border-indigo-300' : 'border-slate-700 bg-slate-800/50 hover:border-indigo-500/50')
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 border-2 ${
                      isSelected
                        ? isSelf
                          ? 'bg-amber-400 border-amber-300 text-white'
                          : 'bg-emerald-500 border-emerald-400 text-white'
                        : (isLight ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300')
                    }`}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-sm font-bold truncate ${
                          isSelected
                            ? isSelf
                              ? (isLight ? 'text-amber-800' : 'text-amber-300')
                              : (isLight ? 'text-emerald-800' : 'text-emerald-300')
                            : (isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white')
                        }`}>{displayName}</p>
                        {isSelf && (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${
                            isSelected
                              ? 'bg-amber-400/30 text-amber-700 dark:text-amber-300'
                              : (isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-400')
                          }`}>Tutup Shift</span>
                        )}
                      </div>
                      <p className={`text-[10px] font-medium ${
                        isSelected
                          ? isSelf
                            ? (isLight ? 'text-amber-600' : 'text-amber-400')
                            : (isLight ? 'text-emerald-600' : 'text-emerald-400')
                          : (isLight ? 'text-slate-500' : 'text-slate-600 dark:text-slate-400')
                      }`}>
                        {isSelf ? 'Stok di-reset & siap shift berikutnya' : cashier.role}
                      </p>
                    </div>
                    {isSelected && (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isSelf ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flow Arrow Summary */}
          <div className={`rounded-xl p-3 flex items-center justify-between gap-2 text-xs border shadow-xs ${
            isSelfHandover
              ? (isLight ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200' : 'bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border-amber-500/30')
              : (isLight ? 'bg-gradient-to-r from-blue-50 to-emerald-50 border-slate-200' : 'bg-gradient-to-r from-blue-500/5 to-emerald-500/5 border-slate-700')
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 ${
                isLight ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-blue-600/30 border-blue-500/50 text-blue-300'
              }`}>
                {activeCashier.name.charAt(0)}
              </div>
              <div>
                <span className={`text-[8px] font-bold uppercase block ${isLight ? 'text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>Menyerahkan</span>
                <span className={`font-black text-xs ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>{activeCashier.name}</span>
              </div>
            </div>
            {isSelfHandover ? (
              <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${
                isLight ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              }`}>↺ TUTUP SHIFT</span>
            ) : (
              <ArrowRight className={`w-5 h-5 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
            )}
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 ${
                isSelfHandover
                  ? (isLight ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-amber-600/30 border-amber-500/50 text-amber-300')
                  : (isLight ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300')
              }`}>
                {activeCashier.name.charAt(0)}
              </div>
              <div>
                <span className={`text-[8px] font-bold uppercase block ${isLight ? 'text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>
                  {isSelfHandover ? 'Shift Baru' : 'Menerima'}
                </span>
                <span className={`font-black text-xs ${
                  isSelfHandover
                    ? (isLight ? 'text-amber-800' : 'text-amber-400')
                    : (isLight ? 'text-emerald-800' : 'text-emerald-400')
                }`}>
                  {isSelfHandover ? activeCashier.name : selectedToCashier.name}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex items-center justify-between gap-2 pt-1 border-t ${
            isLight ? 'border-slate-200' : 'border-slate-200 dark:border-slate-800'
          }`}>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer rounded-xl border shadow-xs ${
                isLight 
                  ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50' 
                  : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${isLight ? 'text-slate-700' : 'text-slate-600 dark:text-slate-300'}`} /> Cek Uang
            </button>

            <button
              type="button"
              onClick={handleCompleteHandover}
              className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 ${
                isSelfHandover
                  ? 'bg-amber-500 hover:bg-amber-400'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Handshake className="w-4 h-4" />
              {isSelfHandover ? '↺ Tutup Shift & Reset Stok' : `Serahkan ke ${selectedToCashier.name}`}
            </button>
          </div>
        </motion.div>
      )}

      {/* SUCCESS MODAL AFTER HANDOVER */}
      {isHandoverSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-5 shadow-2xl text-center space-y-3 border ${
            isLight 
              ? 'bg-white border-emerald-200 text-slate-800' 
              : 'bg-white dark:bg-slate-800 border-emerald-500/30 text-slate-100'
          }`}
        >
          <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center border ${
            isLight 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-black dark:text-emerald-400'
          }`}>
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              Serah Terima Berhasil Diselesaikan!
            </h3>
            <p className={`text-[10px] sm:text-[11px] max-w-sm mx-auto ${isLight ? 'text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>
              Shift {activeCashier.name} telah selesai. Stok sisa ({totalFinalStock} Pcs) sudah disalin ke akun <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-700 dark:text-slate-200'}`}>{selectedToCashier.name}</span>. Kasir penerima silakan login dengan akun masing-masing.
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleFinishAndSwitch}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" /> Selesai &amp; Kembali ke Beranda
            </button>
          </div>
        </motion.div>
      )}

      {/* FLOATING FOCUS EDIT CARD (1 BARIS MELAYANG DENGAN LATAR SEDIKIT BLUR) */}
      <AnimatePresence>
        {activeEditingRow.productId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2.5px] flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto"
            onClick={() => setActiveEditingRow(prev => ({ ...prev, productId: null }))}
          >
            {(() => {
              const item = items.find(i => i.productId === activeEditingRow.productId);
              if (!item) return null;
              const currentIdx = filteredItems.findIndex(i => i.productId === activeEditingRow.productId);
              const hasPrev = currentIdx > 0;
              const hasNext = currentIdx < filteredItems.length - 1;
              const productDetails = products.find(p => p.id === item.productId);
              const nameParts = item.productName.split(' ');
              const brandTitle = nameParts[0];
              const variantSubtitle = nameParts.slice(1).join(' ');
              const isStep1 = activeEditingRow.step === 1;
              const soldCount = Math.max(0, item.initialStock - item.finalStock);
              const subtotal = soldCount * item.price;
              const expectedInitial = item.previousStock + item.incomingStock;

              return (
                <motion.div
                  initial={{ scale: 0.9, y: 25, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 25, opacity: 0 }}
                  transition={{ type: 'spring', damping: 24, stiffness: 350 }}
                  className={`w-full max-w-sm sm:max-w-md rounded-2xl p-4 sm:p-5 shadow-2xl border flex flex-col gap-3.5 relative ${
                    isLight 
                      ? 'bg-white border-slate-200 text-slate-900 shadow-2xl' 
                      : 'bg-white dark:bg-slate-800 border-blue-500/30 text-slate-900 dark:text-white shadow-2xl shadow-blue-950/90'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header Bar */}
                  <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isLight ? 'bg-slate-100 text-slate-700' : 'bg-blue-950 text-blue-300 border border-blue-800/40'
                      }`}>
                        Item {currentIdx + 1} dari {filteredItems.length}
                      </span>
                      <span className={`text-[11px] font-bold ${
                        isStep1 ? (isLight ? 'text-blue-600' : 'text-blue-400') : (isLight ? 'text-emerald-600' : 'text-emerald-500 font-black dark:text-emerald-400')
                      }`}>
                        {isStep1 ? 'Edit Stok Awal' : 'Edit Sisa Akhir'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveEditingRow(prev => ({ ...prev, productId: null }))}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition ${
                        isLight ? 'hover:bg-slate-100 text-slate-600 dark:text-slate-400' : 'hover:bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Product Card Box - Centered & Enlarged */}
                  <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 ${
                    isLight 
                      ? 'bg-slate-50/80 border-slate-200 shadow-xs' 
                      : 'bg-slate-50 dark:bg-slate-800 border-blue-900/40 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-center gap-2">
                      <CompactOperatorLogo name={brandTitle} operator={productDetails?.operator} size="lg" />
                      <span className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                        {brandTitle}
                      </span>
                    </div>
                    <span className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-700' : 'text-slate-700 dark:text-slate-200'}`}>
                      {variantSubtitle || item.productName}
                    </span>
                    <span className={`text-xs sm:text-sm font-mono font-bold px-2.5 py-0.5 rounded-full ${
                      isStep1
                        ? (isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-950/80 text-blue-300 border border-blue-800/50')
                        : (isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50')
                    }`}>
                      @Rp{item.price.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Content for Step 1 (Stok Awal) */}
                  {isStep1 && (
                    <div className="space-y-3">
                      {/* Context Stats */}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className={`p-2 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                        }`}>
                          <div className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Shift Lalu</div>
                          <div className="text-sm sm:text-base font-black font-mono">{item.previousStock} Pcs</div>
                        </div>
                        <div className={`p-2 rounded-xl border ${
                          isLight ? 'bg-blue-50/60 border-blue-200' : 'bg-blue-950/40 border-blue-800/40'
                        }`}>
                          <div className="text-[10px] uppercase font-bold text-blue-500">Stok Masuk</div>
                          <div className="text-sm sm:text-base font-black font-mono text-blue-600 dark:text-blue-400">
                            +{item.incomingStock} Pcs
                          </div>
                        </div>
                      </div>

                      {/* Big Stepper Container */}
                      <div className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2.5 ${
                        isLight 
                          ? 'bg-blue-50/40 border-blue-200' 
                          : 'bg-blue-950/20 border-blue-500/20'
                      }`}>
                        <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                          STOK AWAL FISIK SAAT INI
                        </span>

                        {/* Giant Stepper */}
                        <div className="flex items-center justify-center gap-3 w-full">
                          <button
                            type="button"
                            onClick={() => handleInitialDelta(item.productId, -1)}
                            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl font-black cursor-pointer active:scale-90 transition border shadow-xs ${
                              isLight 
                                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' 
                                : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-white border-slate-700'
                            }`}
                            title="Kurangi 1"
                          >
                            <Minus className="w-6 h-6 stroke-[3]" />
                          </button>

                          <div className="flex flex-col items-center min-w-[90px]">
                            <span className={`font-mono font-black text-4xl sm:text-5xl ${
                              isLight ? 'text-blue-700' : 'text-blue-400'
                            }`}>
                              {item.initialStock}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Pcs</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleInitialDelta(item.productId, 1)}
                            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl font-black cursor-pointer active:scale-90 transition bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
                            title="Tambah 1"
                          >
                            <Plus className="w-6 h-6 stroke-[3]" />
                          </button>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSetInitialDirect(item.productId, expectedInitial)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                              item.initialStock === expectedInitial
                                ? (isLight ? 'bg-blue-600 text-slate-900 dark:text-white border-blue-600' : 'bg-blue-600 text-slate-900 dark:text-white border-blue-500')
                                : (isLight ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-700 dark:text-slate-200')
                            }`}
                          >
                            Pas dg Lalu ({expectedInitial})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInitialDelta(item.productId, 5)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                              isLight ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInitialDelta(item.productId, 10)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                              isLight ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Content for Step 2 (Sisa Akhir) */}
                  {!isStep1 && (
                    <div className="space-y-3">
                      {/* Context Stats */}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className={`p-2 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                        }`}>
                          <div className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Stok Awal</div>
                          <div className="text-sm sm:text-base font-black font-mono">{item.initialStock} Pcs</div>
                        </div>
                        <div className={`p-2 rounded-xl border ${
                          isLight ? 'bg-emerald-50/60 border-emerald-200' : 'bg-emerald-950/40 border-emerald-800/40'
                        }`}>
                          <div className="text-[10px] uppercase font-bold text-emerald-500 font-black dark:text-emerald-400">Terjual</div>
                          <div className="text-sm sm:text-base font-black font-mono text-emerald-500 font-black dark:text-emerald-400">
                            {soldCount} Pcs
                          </div>
                        </div>
                      </div>

                      {/* Big Stepper Container */}
                      <div className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2.5 ${
                        isLight 
                          ? 'bg-emerald-50/40 border-emerald-200' 
                          : 'bg-emerald-950/20 border-emerald-500/20'
                      }`}>
                        <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-500 font-black dark:text-emerald-400">
                          SISA VOUCHER DI ETALASE (AKHIR)
                        </span>

                        {/* Giant Stepper */}
                        <div className="flex items-center justify-center gap-3 w-full">
                          <button
                            type="button"
                            onClick={() => handleFinalDelta(item.productId, -1)}
                            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl font-black cursor-pointer active:scale-90 transition border shadow-xs ${
                              isLight 
                                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' 
                                : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-white border-slate-700'
                            }`}
                            title="Kurangi 1"
                          >
                            <Minus className="w-6 h-6 stroke-[3]" />
                          </button>

                          <div className="flex flex-col items-center min-w-[90px]">
                            <span className={`font-mono font-black text-4xl sm:text-5xl ${
                              isLight ? 'text-emerald-700' : 'text-emerald-500 font-black dark:text-emerald-400'
                            }`}>
                              {item.finalStock}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Pcs Sisa</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleFinalDelta(item.productId, 1)}
                            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl font-black cursor-pointer active:scale-90 transition bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
                            title="Tambah 1"
                          >
                            <Plus className="w-6 h-6 stroke-[3]" />
                          </button>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSetFinalDirect(item.productId, 0)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                              item.finalStock === 0
                                ? 'bg-rose-600 text-slate-900 dark:text-white border-rose-600'
                                : (isLight ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-700 dark:text-slate-200')
                            }`}
                          >
                            Habis (0)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetFinalDirect(item.productId, item.initialStock)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                              item.finalStock === item.initialStock
                                ? 'bg-emerald-600 text-slate-900 dark:text-white border-emerald-600'
                                : (isLight ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-700 dark:text-slate-200')
                            }`}
                          >
                            Utuh ({item.initialStock})
                          </button>
                        </div>
                      </div>

                      {/* Subtotal Banner */}
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                      }`}>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Uang Penjualan</span>
                        <span className="text-sm font-black font-mono text-emerald-500 font-black dark:text-emerald-400">
                          Rp{subtotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer Navigation & Finish */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={!hasPrev}
                        onClick={() => {
                          if (hasPrev) {
                            setActiveEditingRow(prev => ({ ...prev, productId: filteredItems[currentIdx - 1].productId }));
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition cursor-pointer ${
                          !hasPrev 
                            ? 'opacity-40 cursor-not-allowed border-transparent' 
                            : (isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-700 dark:text-slate-200')
                        }`}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                      </button>
                      <button
                        type="button"
                        disabled={!hasNext}
                        onClick={() => {
                          if (hasNext) {
                            setActiveEditingRow(prev => ({ ...prev, productId: filteredItems[currentIdx + 1].productId }));
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition cursor-pointer ${
                          !hasNext 
                            ? 'opacity-40 cursor-not-allowed border-transparent' 
                            : (isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-700 dark:text-slate-200')
                        }`}
                      >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveEditingRow(prev => ({ ...prev, productId: null }))}
                      className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition active:scale-95 text-slate-900 dark:text-white ${
                        isStep1 ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      }`}
                    >
                      <Check className="w-4 h-4" /> Simpan & Tutup
                    </button>
                  </div>
                </motion.div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
