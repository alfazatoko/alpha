import React, { useState, useEffect, useRef } from 'react';
import { formatRupiah, formatInputRupiah, cn } from '../lib/utils';

export interface SaldoRealClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSaldoBank: number;
  isSaving: boolean;
  kasirRole?: string;
  quickOptions: string[];
  kasirList?: Record<string, any>;
  initialCatatan: string;
  onCatatanChange?: (val: string) => void;
  onSave: (
    finalRows: { nominal: number; keterangan: string }[],
    options: { isOperkan: boolean; targetKasirId: string },
    catatan: string,
    andShareWA: boolean
  ) => void;
  onOpenManageClosingOptions: () => void;
  onOpenKasirPenerimaSheet: () => void;
  targetKasirId: string;
  setTargetKasirId: (id: string) => void;
  isOperkanSaldo: boolean;
  setIsOperkanSaldo: (val: boolean) => void;
}

export const SaldoRealClosingModal: React.FC<SaldoRealClosingModalProps> = React.memo(({
  isOpen,
  onClose,
  currentSaldoBank,
  isSaving,
  kasirRole,
  quickOptions,
  kasirList,
  initialCatatan,
  onCatatanChange,
  onSave,
  onOpenManageClosingOptions,
  onOpenKasirPenerimaSheet,
  targetKasirId,
  setTargetKasirId,
  isOperkanSaldo,
  setIsOperkanSaldo,
}) => {
  // Local state isolated from parent to eliminate typing and scroll lag
  const [rows, setRows] = useState<{ nominal: string; keterangan: string }[]>([
    { nominal: '', keterangan: '' },
    { nominal: '', keterangan: '' },
  ]);
  const [catatan, setCatatan] = useState(initialCatatan || '');
  const [showCatatanInput, setShowCatatanInput] = useState(Boolean(initialCatatan && initialCatatan.trim()));
  const [confirmSelisih, setConfirmSelisih] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initial note when modal opens
  useEffect(() => {
    if (isOpen) {
      setCatatan(initialCatatan || '');
      setShowCatatanInput(Boolean(initialCatatan && initialCatatan.trim()));
      setConfirmSelisih(false);
    }
  }, [isOpen, initialCatatan]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Keyboard shortcut listener (1, 2, 3, 4)
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === '1' && quickOptions[0]) { e.preventDefault(); toggleRowOption(quickOptions[0]); }
      if (e.key === '2' && quickOptions[1]) { e.preventDefault(); toggleRowOption(quickOptions[1]); }
      if (e.key === '3' && quickOptions[2]) { e.preventDefault(); toggleRowOption(quickOptions[2]); }
      if (e.key === '4' && quickOptions[3]) { e.preventDefault(); toggleRowOption(quickOptions[3]); }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, quickOptions, rows]);

  if (!isOpen) return null;

  const totalNominal = rows.reduce((sum, r) => sum + (parseInt(r.nominal.replace(/\./g, '')) || 0), 0);
  const selisihLive = totalNominal - currentSaldoBank;
  const isKlopLive = totalNominal > 0 && selisihLive === 0;
  const isSurplusLive = totalNominal > 0 && selisihLive > 0;
  const isAllEmpty = rows.every(r => !r.nominal);

  const toggleRowOption = (opt: string) => {
    setRows(prev => {
      const existingIndex = prev.findIndex(r => r.keterangan === opt);
      if (existingIndex !== -1) {
        const next = [...prev];
        next.splice(existingIndex, 1);
        if (next.length === 0) return [{ nominal: '', keterangan: '' }, { nominal: '', keterangan: '' }];
        if (next.length === 1) return [...next, { nominal: '', keterangan: '' }];
        return next;
      } else {
        const next = [...prev];
        const emptyIndex = next.findIndex(r => r.keterangan === '' && (!r.nominal || r.nominal === '0' || r.nominal === ''));
        if (emptyIndex !== -1) {
          next[emptyIndex].keterangan = opt;
        } else {
          next.push({ nominal: '', keterangan: opt });
        }
        return next;
      }
    });
  };

  const handleKetChange = (index: number, val: string) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], keterangan: val };
      return next;
    });
  };

  const handleNominalChange = (index: number, val: string) => {
    const formatted = formatInputRupiah(val);
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], nominal: formatted };
      return next;
    });
    if (confirmSelisih) setConfirmSelisih(false);
  };

  const handleAddRow = (focusNext = false) => {
    setRows(prev => [...prev, { nominal: '', keterangan: '' }]);
    if (focusNext) {
      setTimeout(() => {
        const nextEl = document.getElementById(`closing-ket-${rows.length}`);
        nextEl?.focus();
      }, 50);
    }
  };

  const handleRemoveRow = (index: number) => {
    setRows(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next.length > 0 ? next : [{ nominal: '', keterangan: '' }];
    });
    if (confirmSelisih) setConfirmSelisih(false);
  };

  const handleCatatanInput = (val: string) => {
    setCatatan(val);
    // Debounce syncing to parent/storage to avoid blocking UI on mobile
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onCatatanChange?.(val);
    }, 400);
  };

  const handleSaveSubmit = (andShareWA = false) => {
    const finalRows = rows
      .map(r => ({ nominal: parseInt(r.nominal.replace(/\./g, '')) || 0, keterangan: r.keterangan.trim() }))
      .filter(r => r.nominal > 0);

    if (finalRows.length === 0) {
      alert('Silakan isi minimal 1 saldo aplikasi!');
      return;
    }

    if (isOperkanSaldo && !targetKasirId) {
      alert('Pilih kasir penerima terlebih dahulu!');
      return;
    }

    const selisih = totalNominal - currentSaldoBank;
    if (selisih < 0 && !confirmSelisih) {
      setConfirmSelisih(true);
      return;
    }

    // Flush any pending note update immediately
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onCatatanChange?.(catatan);

    onSave(
      finalRows,
      { isOperkan: isOperkanSaldo, targetKasirId },
      catatan,
      andShareWA
    );

    // Reset rows to fresh empty state
    setRows([{ nominal: '', keterangan: '' }, { nominal: '', keterangan: '' }]);
    setConfirmSelisih(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-1.5 sm:p-4 animate-in fade-in duration-150">
      {/* Overlay: Pure solid tint without GPU-heavy backdrop-filter blur for mobile speed */}
      <div 
        className="absolute inset-0 bg-slate-950/80" 
        onClick={() => !isSaving && onClose()}
      />
      
      <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl w-full max-w-xl sm:max-w-2xl overflow-hidden shadow-2xl relative z-10 border border-slate-100 dark:border-slate-700/80 flex flex-col max-h-[96vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER: Ramping, Hemat Tempat & Full Layar Friendly */}
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-emerald-500/20 flex justify-between items-center bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/15 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
              <i className="fa-solid fa-calculator text-[10px] sm:text-xs"></i>
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-[11px] sm:text-xs uppercase tracking-wider leading-tight truncate">
                Update Saldo Closing
              </h3>
              <p className="text-[8px] sm:text-[9px] text-emerald-100 font-medium truncate">
                Sisa saldo riil & pesan serah terima
              </p>
            </div>
          </div>

          {/* Action buttons on header right */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Tombol Bagikan Icon (Tanpa teks WA, di samping X) */}
            <button
              type="button"
              onClick={() => handleSaveSubmit(true)}
              disabled={isSaving || isAllEmpty}
              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all text-white border border-white/20 shadow-sm disabled:opacity-40"
              title="Simpan Saldo & Langsung Bagikan ke WhatsApp"
            >
              <i className="fa-brands fa-whatsapp text-xs sm:text-sm"></i>
            </button>

            {/* Tombol Tutup X */}
            <button 
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white border border-white/20"
              title="Tutup"
            >
              <i className="fa-solid fa-xmark text-[10px] sm:text-xs"></i>
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE DENGAN HARDWARE ACCELERATION TOUCH) */}
        <div 
          className="p-2 sm:p-3.5 overflow-y-auto custom-scrollbar flex-1 space-y-2 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <datalist id="aplikasi-suggestions">
            {quickOptions.map(opt => (
              <option key={opt} value={opt} />
            ))}
          </datalist>

          {/* QUICK CHIPS */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Pilihan Cepat Aplikasi:
                </span>
                {kasirRole === 'owner' && (
                  <button 
                    type="button" 
                    onClick={onOpenManageClosingOptions}
                    className="text-[7.5px] sm:text-[8.5px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5 transition-all"
                    title="Atur Pilihan Cepat (Khusus Owner)"
                  >
                    <i className="fa-solid fa-pen-to-square text-[7px]" /> Atur (Owner)
                  </button>
                )}
              </div>
              <span className="text-[7.5px] sm:text-[8.5px] font-bold text-slate-400 italic">
                Klik pasang / hapus
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {quickOptions.map((opt, idx) => {
                const isSelected = rows.some(r => r.keterangan === opt && r.nominal !== '');
                return (
                  <button 
                    key={opt}
                    type="button"
                    onClick={() => toggleRowOption(opt)}
                    className={cn(
                      "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95", 
                      isSelected 
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-xs shadow-emerald-600/30" 
                        : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600"
                    )}
                  >
                    <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[7.5px] sm:text-[8px]">{idx + 1}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LIST KOLOM SALDO APLIKASI */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate mr-2">
                Daftar Akun & Nominal:
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                {rows.filter(r => r.nominal).length} Terisi
              </span>
            </div>

            <div className="space-y-1">
              {rows.map((row, index) => (
                <div 
                  key={index} 
                  className="p-1 sm:p-1.5 rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/40 hover:border-emerald-300/70 dark:hover:border-emerald-600/50 transition-all flex items-center gap-1 sm:gap-1.5 group"
                >
                  <div className="w-3.5 text-center shrink-0">
                    <span className="text-[8px] sm:text-[9px] font-black text-slate-400">#{index + 1}</span>
                  </div>

                  {/* Input Nama Aplikasi */}
                  <div className="flex-[4] min-w-0">
                    <input 
                      id={`closing-ket-${index}`}
                      type="text"
                      list="aplikasi-suggestions"
                      value={row.keterangan}
                      onChange={(e) => handleKetChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById(`closing-nom-${index}`)?.focus();
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-[11px] font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      placeholder="Nama Akun"
                    />
                  </div>

                  {/* Input Nominal Saldo */}
                  <div className="flex-[5] min-w-0 relative">
                    <span className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 text-[9px] sm:text-[10px] font-black text-slate-400 select-none">Rp</span>
                    <input 
                      id={`closing-nom-${index}`}
                      type="text"
                      inputMode="numeric"
                      value={row.nominal}
                      onChange={(e) => handleNominalChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const nextKet = document.getElementById(`closing-ket-${index + 1}`);
                          if (nextKet) {
                            nextKet.focus();
                          } else {
                            handleAddRow(true);
                          }
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-6 sm:pl-7 pr-1.5 sm:pr-2 py-1 text-[11px] sm:text-xs font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      placeholder="0"
                    />
                  </div>

                  {/* Tombol Hapus Baris */}
                  <div className="w-5 sm:w-6 shrink-0 flex items-center justify-center">
                    {rows.length > 1 ? (
                      <button 
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-all active:scale-95"
                        title="Hapus baris"
                      >
                        <i className="fa-solid fa-trash-can text-[9px]"></i>
                      </button>
                    ) : (
                      <div className="w-5 sm:w-6"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button 
              type="button"
              onClick={() => handleAddRow(false)}
              className="w-full py-1 sm:py-1.5 rounded-lg border border-dashed border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 font-black text-[9px] sm:text-[10px] uppercase tracking-wider hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all flex items-center justify-center gap-1 active:scale-98"
            >
              <i className="fa-solid fa-plus text-[9px]"></i> Tambah Kolom Aplikasi
            </button>
          </div>

          {/* CATATAN KASIR / PESAN CLOSING (TOGGLE COLLAPSED BY DEFAULT) */}
          {!showCatatanInput ? (
            <button
              type="button"
              onClick={() => setShowCatatanInput(true)}
              className="w-full py-1.5 px-2.5 rounded-lg border border-dashed border-amber-300 dark:border-amber-700/80 bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold flex items-center justify-between hover:bg-amber-100/60 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-1.5">
                <i className="fa-solid fa-note-sticky text-amber-600 text-[9px]"></i>
                <span>+ Tulis Catatan Kasir / Pesan Closing</span>
              </div>
              {catatan.trim() ? (
                <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-black">
                  Terisi
                </span>
              ) : (
                <span className="text-[8px] text-amber-600/70 italic">Opsional</span>
              )}
            </button>
          ) : (
            <div className="p-2 sm:p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl space-y-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1">
                  <i className="fa-solid fa-note-sticky text-amber-600 text-[9px]"></i>
                  Catatan Kasir / Pesan Closing
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[7.5px] sm:text-[8.5px] font-bold text-amber-700/70 dark:text-amber-400/70 italic">
                    Tersinkron ke Laporan & WA
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCatatanInput(false)}
                    className="w-4 h-4 rounded flex items-center justify-center text-amber-600 hover:text-amber-800 text-[9px]"
                    title="Sembunyikan Catatan"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
              <textarea
                autoFocus
                value={catatan}
                onChange={(e) => handleCatatanInput(e.target.value)}
                rows={2}
                placeholder="Tulis pesan kendala shift, selisih uang, catatan operan saldo, atau info penting..."
                className="w-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/70 rounded-md p-1.5 text-[11px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none font-medium transition-all"
              />
            </div>
          )}

          {/* OPERKAN SALDO KE SHIFT SELANJUTNYA */}
          <div className="p-2 sm:p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 rounded-xl space-y-1">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isOperkanSaldo}
                onChange={(e) => {
                  setIsOperkanSaldo(e.target.checked);
                  if (!e.target.checked) setTargetKasirId('');
                }}
                className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-[9.5px] sm:text-[10px] font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                Operkan Saldo Ini ke Kasir Selanjutnya
              </span>
            </label>

            {isOperkanSaldo && (
              <div className="pt-1 border-t border-blue-200/60 dark:border-blue-800/60 animate-in fade-in duration-200">
                <label className="block text-[8px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-0.5">
                  Pilih Kasir Penerima (Shift Selanjutnya)
                </label>
                <button
                  type="button"
                  onClick={onOpenKasirPenerimaSheet}
                  className="w-full bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-md px-2 py-1 text-[11px] font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 cursor-pointer text-left flex justify-between items-center hover:bg-slate-50 transition-colors"
                >
                  {targetKasirId ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[8px] font-black uppercase">
                        {((kasirList && kasirList[targetKasirId]?.name) || targetKasirId).charAt(0)}
                      </div>
                      <span className="text-[11px]">{(kasirList && kasirList[targetKasirId]?.name) || targetKasirId}</span>
                    </div>
                  ) : (
                    <span className="opacity-70 text-[10.5px]">-- Pilih Kasir Penerima --</span>
                  )}
                  <i className="fa-solid fa-chevron-down text-[9px] opacity-50"></i>
                </button>
              </div>
            )}
          </div>

          {/* LIVE SUMMARY / SELISIH */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/70 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-500 dark:text-slate-400">Total Input Saldo Kasir:</span>
              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">{formatRupiah(totalNominal)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-500 dark:text-slate-400">Sisa Saldo Seharusnya (Buku):</span>
              <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">{formatRupiah(currentSaldoBank)}</span>
            </div>
            <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider text-slate-500">Status Saldo:</span>
              {totalNominal === 0 ? (
                <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 italic">Belum ada input</span>
              ) : isKlopLive ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                  <i className="fa-solid fa-circle-check text-emerald-600"></i> KLOP (Rp 0)
                </span>
              ) : isSurplusLive ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-blue-300 dark:border-blue-800">
                  <i className="fa-solid fa-arrow-trend-up text-blue-600"></i> +{formatRupiah(selisihLive)}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-rose-300 dark:border-rose-800">
                  <i className="fa-solid fa-triangle-exclamation text-rose-600"></i> MINUS {formatRupiah(selisihLive)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER: HANYA 1 BARIS PENDEK & COMPACT */}
        <div className="p-2 sm:p-2.5 border-t border-slate-100 dark:border-slate-700/80 bg-white dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => handleSaveSubmit(false)}
            disabled={isSaving || isAllEmpty}
            className={cn(
              "w-full text-white rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-xs hover:shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-1.5",
              confirmSelisih 
                ? "bg-gradient-to-r from-rose-600 to-red-600 shadow-rose-500/20" 
                : "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700"
            )}
          >
            {isSaving ? (
              <><i className="fa-solid fa-spinner fa-spin text-xs"></i> MENYIMPAN...</>
            ) : confirmSelisih ? (
              <><i className="fa-solid fa-triangle-exclamation text-xs"></i> TETAP SIMPAN (SELISIH)</>
            ) : (
              <><i className="fa-solid fa-floppy-disk text-xs"></i> SIMPAN SALDO</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
