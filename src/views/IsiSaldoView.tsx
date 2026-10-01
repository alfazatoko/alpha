import React, { useRef, useState, useEffect } from 'react'
import { GlobalHeader } from '../components/GlobalHeader';
import { formatInputRupiah, cn, formatRupiah } from '../lib/utils'
import type { OperkanSaldo } from '../types'

interface IsiSaldoViewProps {
  active: boolean
  isPc?: boolean
  setActiveView: (v: string) => void
  isiJenis: string
  setIsiJenis: (v: string) => void
  isiNominal: string
  setIsiNominal: (v: string) => void
  isiKeterangan: string
  setIsiKeterangan: (v: string) => void
  handleSimpanIsiSaldo: () => void
  isSaving?: boolean
  showToast: (m: string) => void
  storeName?: string
  storeSubtext?: string
  storePhoto?: string
  kasirName?: string
  kasirRole?: string
  setIsSidePanelOpen?: (v: boolean) => void
  activeStoreId?: string
  // Props baru untuk sistem operan saldo
  pendingOperkan?: OperkanSaldo | null
  currentUsername?: string
  onTerimaOperkan?: (operkan: OperkanSaldo) => void
}

const IsiSaldoView: React.FC<IsiSaldoViewProps> = (props) => {
  const nominalRef = useRef<HTMLInputElement>(null)
  const keteranganRef = useRef<HTMLTextAreaElement>(null)

  const [currentTime, setCurrentTime] = useState(new Date())
  const [showOperkanModal, setShowOperkanModal] = useState(false)
  const [isConfirmingOperkan, setIsConfirmingOperkan] = useState(false)
  // Step konfirmasi: null = tampilan info, 'terima' = konfirmasi terima, 'ambil' = konfirmasi ambil kembali
  const [confirmStep, setConfirmStep] = useState<null | 'terima' | 'ambil'>(null)
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' })
  const fullDate = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const clockStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const quickOptions = ['BANK', 'FLIP', 'ORDER KUOTA', 'DANA', 'TAMBAH SALDOBANK']

  const toggleOption = (opt: string) => {
    let current = props.isiKeterangan
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    if (current.includes(opt)) {
      current = current.filter(c => c !== opt)
    } else {
      current.push(opt)
    }
    props.setIsiKeterangan(current.join(', '))
  }

  useEffect(() => {
    if (!props.active) return
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      if (e.key === '1') { e.preventDefault(); toggleOption('BANK'); }
      if (e.key === '2') { e.preventDefault(); toggleOption('FLIP'); }
      if (e.key === '3') { e.preventDefault(); toggleOption('ORDER KUOTA'); }
      if (e.key === '4') { e.preventDefault(); toggleOption('DANA'); }
      if (e.key === '5') { e.preventDefault(); toggleOption('TAMBAH SALDOBANK'); }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [props.active, props.isiKeterangan])

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>, isLast: boolean = false) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isLast) {
        props.handleSimpanIsiSaldo()
      } else {
        nextRef?.current?.focus()
      }
    }
  }

  // Helper: apakah user ini adalah pengirim atau penerima?
  const operkan = props.pendingOperkan
  const isPengirim = operkan?.pengirim_id === props.currentUsername
  const isPenerima = operkan?.penerima_id === props.currentUsername
  const hasOperkan = !!operkan && (isPengirim || isPenerima)

  const handleKonfirmasiOperkan = async (action: 'terima' | 'ambil') => {
    if (!operkan || !props.onTerimaOperkan) return
    setIsConfirmingOperkan(true)
    try {
      await props.onTerimaOperkan(operkan)
      setShowOperkanModal(false)
      setConfirmStep(null)
    } finally {
      setIsConfirmingOperkan(false)
    }
  }

  const closeModal = () => {
    if (isConfirmingOperkan) return
    setShowOperkanModal(false)
    setConfirmStep(null)
  }

  // ── Popup Konfirmasi Operan Saldo (2 Tahap) ──
  const renderOperkanModal = () => {
    if (!showOperkanModal || !operkan) return null
    const tanggalKirim = new Date(operkan.tanggal_kirim)
    const tglStr = tanggalKirim.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const jamStr = tanggalKirim.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

    // ── TAHAP 2: Konfirmasi Final ──
    if (confirmStep) {
      const isTerima = confirmStep === 'terima'
      return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 bg-white dark:bg-slate-800 w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-in slide-in-from-bottom-4 duration-200">
            {/* Header konfirmasi */}
            <div className={cn(
              "px-5 py-4 text-white",
              isTerima
                ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                : "bg-gradient-to-r from-rose-500 to-red-600"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <i className={cn("text-xl", isTerima ? "fa-solid fa-circle-check" : "fa-solid fa-rotate-left")} />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest">
                    {isTerima ? "Konfirmasi Terima Saldo" : "Konfirmasi Ambil Kembali"}
                  </h3>
                  <p className="text-[10px] opacity-85 font-medium mt-0.5">
                    {isTerima
                      ? "Saldo akan masuk ke saldo bank kamu"
                      : "Saldo akan kembali ke saldo bank kasir pengirim"
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Rincian singkat */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {isTerima ? "Saldo yang akan kamu terima" : "Saldo yang akan diambil kembali"}
                </p>
                {operkan.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">{item.keterangan || `Aplikasi ${idx + 1}`}</span>
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">{formatRupiah(item.nominal)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 mt-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase">TOTAL</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatRupiah(operkan.nominal_total)}</span>
                </div>
              </div>

              {/* Info aksi */}
              <div className={cn(
                "rounded-xl px-4 py-3 border text-xs font-semibold",
                isTerima
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
              )}>
                <i className={cn("mr-1.5", isTerima ? "fa-solid fa-info-circle" : "fa-solid fa-triangle-exclamation")} />
                {isTerima
                  ? `Transaksi "Isi Saldo Bank" akan dibuat atas namamu (${operkan.penerima_name}).`
                  : `Transaksi "Isi Saldo Bank" akan dikembalikan ke ${operkan.pengirim_name}. Operan ini akan dibatalkan.`
                }
              </div>

              {/* Tombol final */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleKonfirmasiOperkan(confirmStep)}
                  disabled={isConfirmingOperkan}
                  className={cn(
                    "w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 text-white",
                    isTerima
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25"
                      : "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-rose-500/25"
                  )}
                >
                  {isConfirmingOperkan ? (
                    <><i className="fa-solid fa-circle-notch fa-spin" /> Memproses...</>
                  ) : isTerima ? (
                    <><i className="fa-solid fa-check-circle" /> Ya, Terima Saldo</>
                  ) : (
                    <><i className="fa-solid fa-rotate-left" /> Ya, Ambil Kembali</>
                  )}
                </button>
                <button
                  onClick={() => setConfirmStep(null)}
                  disabled={isConfirmingOperkan}
                  className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-60"
                >
                  <i className="fa-solid fa-arrow-left mr-1.5" /> Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // ── TAHAP 1: Tampilan Rincian + Pilihan Aksi ──
    return (
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
        <div className="relative z-10 bg-white dark:bg-slate-800 w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className={cn(
            "px-5 py-4 flex items-center justify-between",
            isPenerima
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              : "bg-gradient-to-r from-slate-600 to-slate-700 text-white"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <i className={cn("text-lg", isPenerima ? "fa-solid fa-bell" : "fa-solid fa-clock")} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest">
                  {isPenerima ? "Rincian Saldo Operan" : "Saldo Operan Menunggu"}
                </h3>
                <p className="text-[10px] opacity-80 font-medium mt-0.5">
                  {isPenerima ? "Dikirim oleh " + operkan.pengirim_name : "Belum dikonfirmasi " + operkan.penerima_name}
                </p>
              </div>
            </div>
            <button onClick={closeModal} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Info Pengirim & Penerima */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Dari</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-black shadow-sm uppercase flex-shrink-0">
                    {operkan.pengirim_name.charAt(0)}
                  </div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{operkan.pengirim_name}</span>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Untuk</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[9px] font-black shadow-sm uppercase flex-shrink-0">
                    {operkan.penerima_name.charAt(0)}
                  </div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{operkan.penerima_name}</span>
                </div>
              </div>
            </div>

            {/* Tanggal Kirim */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <i className="fa-solid fa-calendar-clock text-[10px] text-slate-400" />
              <span className="font-semibold">Dikirim: {tglStr}, pukul {jamStr}</span>
            </div>

            {/* Rincian Saldo */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-900/30 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Rincian Saldo</p>
              {operkan.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-200/70 dark:border-slate-700/50 last:border-0">
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">{item.keterangan || `Aplikasi ${idx + 1}`}</span>
                  <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">{formatRupiah(item.nominal)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 mt-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TOTAL</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatRupiah(operkan.nominal_total)}</span>
              </div>
            </div>

            {/* Catatan */}
            {operkan.catatan && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
                <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Catatan Pengirim</p>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic">"{operkan.catatan}"</p>
              </div>
            )}

            {/* Pilihan Aksi — Tahap 1 */}
            <div className="pt-1 space-y-2">
              {isPenerima && (
                <button
                  onClick={() => setConfirmStep('terima')}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-check-circle" /> Terima Saldo
                </button>
              )}
              {isPengirim && (
                <button
                  onClick={() => setConfirmStep('ambil')}
                  className="w-full bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-rotate-left" /> Ambil Kembali
                </button>
              )}
              <button
                onClick={closeModal}
                className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Tombol Banner SALDO OPERAN ──
  const renderOperkanBanner = () => {
    if (!hasOperkan) return null

    return (
      <button
        onClick={() => setShowOperkanModal(true)}
        className={cn(
          "w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] shadow-lg relative overflow-hidden",
          isPenerima
            ? "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-white shadow-amber-400/30"
            : "bg-gradient-to-r from-slate-500 to-slate-600 border-slate-400 text-white shadow-slate-400/20"
        )}
      >
        {/* Animasi pulse untuk penerima */}
        {isPenerima && (
          <span className="absolute top-2 right-2 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        )}

        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          isPenerima ? "bg-white/25" : "bg-white/15"
        )}>
          <i className={cn("text-lg", isPenerima ? "fa-solid fa-bell" : "fa-solid fa-clock")} />
        </div>

        <div className="flex-1 text-left">
          <p className="text-[11px] font-black uppercase tracking-widest leading-none">
            {isPenerima ? "🔔 ADA SALDO OPERAN UNTUKMU!" : "🕐 SALDO OPERAN MENUNGGU"}
          </p>
          <p className="text-[10px] opacity-85 font-semibold mt-0.5">
            {isPenerima
              ? `dari ${operkan?.pengirim_name} — ${formatRupiah(operkan?.nominal_total || 0)}`
              : `Menunggu ${operkan?.penerima_name} konfirmasi`
            }
          </p>
        </div>

        <div className="flex-shrink-0">
          <i className="fa-solid fa-chevron-right text-sm opacity-80" />
        </div>
      </button>
    )
  }

  if (props.isPc) {
    return (
      <div className={cn("flex-grow h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden", props.active ? "flex" : "hidden")}>
        {renderOperkanModal()}
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">Pengaturan Saldo & Modal</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Top-up saldo plafon bank, saldo aplikasi HP, atau setoran modal kasir</p>
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex-grow p-8 overflow-y-auto scrollbar-thin flex items-start justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-5xl items-start">
            {/* Description/Explanation Cards */}
            <div className="lg:col-span-5 space-y-4">
              {/* Banner Operan Saldo (PC) */}
              {hasOperkan && (
                <div className="rounded-3xl overflow-hidden shadow-sm">
                  {renderOperkanBanner()}
                </div>
              )}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-circle-info text-blue-600"></i> Informasi Jenis Saldo
                </h3>
                
                <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <p className="font-black text-slate-800 dark:text-slate-200 text-[10px] uppercase tracking-wider mb-1">🏦 Saldo Bank (Plafon)</p>
                    <p className="text-[11px] leading-relaxed">Uang digital yang mengendap di rekening bank terdaftar (misal: BRI, Mandiri, BCA) sebagai plafon transaksi Brilink.</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <p className="font-black text-slate-800 dark:text-slate-200 text-[10px] uppercase tracking-wider mb-1">📱 Saldo Real Aplikasi (HP)</p>
                    <p className="text-[11px] leading-relaxed">Saldo modal di dalam aplikasi keagenan HP (misal: Brilink Mobile, Kioser, dll) yang langsung berkurang saat melakukan transfer.</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <p className="font-black text-slate-800 dark:text-slate-200 text-[10px] uppercase tracking-wider mb-1">💵 Modal Tunai Kasir</p>
                    <p className="text-[11px] leading-relaxed">Uang tunai cash di laci kasir (fisik) yang disiapkan sebagai modal kembalian atau penarikan tunai.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Form */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Form Manajemen Saldo</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Lakukan input penyesuaian/top-up saldo di bawah ini</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">JENIS SALDO</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => props.setIsiJenis('Saldo Bank')}
                      className={cn("py-3.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all", props.isiJenis === 'Saldo Bank' ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400/50")}
                    >
                      <i className="fa-solid fa-building-columns"></i> SALDO BANK
                    </button>
                    <button 
                      onClick={() => props.setIsiJenis('Modal Tunai Kasir')}
                      className={cn("py-3.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all", props.isiJenis === 'Modal Tunai Kasir' ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400/50")}
                    >
                      <i className="fa-solid fa-money-bill-wave"></i> KASIR (TUNAI)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">NOMINAL TOP-UP (RP)</label>
                  <input 
                    ref={nominalRef}
                    type="text" 
                    inputMode="numeric" 
                    placeholder="0" 
                    value={props.isiNominal}
                    onChange={(e) => props.setIsiNominal(formatInputRupiah(e.target.value))}
                    onKeyDown={(e) => handleKeyDown(e, keteranganRef)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-xs font-black text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800/20 tracking-wider"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickOptions.map((opt, idx) => {
                    const isSelected = props.isiKeterangan.split(',').map(s=>s.trim()).includes(opt)
                    return (
                      <button 
                        key={opt}
                        onClick={() => toggleOption(opt)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all", 
                          isSelected 
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                            : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400/50"
                        )}
                      >
                        {idx + 1}. {opt}
                      </button>
                    )
                  })}
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">KETERANGAN</label>
                  <textarea 
                    ref={keteranganRef}
                    rows={3} 
                    placeholder="Contoh: Setoran tunai sore hari..." 
                    value={props.isiKeterangan}
                    onChange={(e) => props.setIsiKeterangan(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, undefined, true)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800/20 resize-none"
                  ></textarea>
                </div>

                <button 
                  onClick={props.handleSimpanIsiSaldo} 
                  disabled={props.isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black py-4 rounded-xl shadow-md transition-all active:scale-95 uppercase tracking-widest mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                  style={{ color: '#ffffff' }}
                >
                  {props.isSaving ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                  )}
                  {props.isSaving ? 'MEMPROSES...' : 'SIMPAN SALDO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("page-view hide-scrollbar bg-gray-50/50", props.active && "active")}>
      {renderOperkanModal()}
      {/* HEADER TOKO IDENTIK BERANDA */}
      <GlobalHeader 
        storePhoto={props.storePhoto}
        storeName={props.storeName}
        storeSubtext={props.storeSubtext}
        kasirName={props.kasirName}
        kasirRole={props.kasirRole}
        dayName={dayName}
        fullDate={fullDate}
        clockStr={clockStr}
        onMenuClick={() => props.setIsSidePanelOpen?.(true)}
      />

      <div className="px-1.5 pt-6 pb-5 bg-gradient-to-r from-indigo-700 to-blue-600 text-white rounded-b-[2rem] shadow-lg shadow-blue-500/20 mb-6" style={{ marginTop: '-2.5rem', position: 'relative', zIndex: 10 }}>
        <div className="px-2 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-sm tracking-wide">Pengaturan Saldo</h2>
            <p className="text-blue-100 text-[10px] opacity-90">Atur modal & rekap harian</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
            <i className="fa-solid fa-vault text-xs"></i>
          </div>
        </div>
      </div>

      <div className="px-1.5 pb-8 space-y-5">
        {/* Banner Operan Saldo (Mobile) */}
        {hasOperkan && (
          <div className="mx-0.5">
            {renderOperkanBanner()}
          </div>
        )}

        <div className="p-4 shadow-sm border border-gray-200 rounded-xl bg-white space-y-3">
          <h3 className="font-black text-black text-[11px] mb-3 flex items-center gap-2 uppercase tracking-tighter">
            <i className="fa-solid fa-vault text-blue-700"></i> MANAJEMEN SALDO
          </h3>
          
          <div>
            <label className="block text-[9px] font-black text-black mb-1.5 uppercase tracking-widest">JENIS SALDO</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => props.setIsiJenis('Saldo Bank')}
                className={cn("py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all", props.isiJenis === 'Saldo Bank' ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20" : "bg-gray-50 border-gray-200 text-gray-600")}
              >
                <i className="fa-solid fa-building-columns text-sm"></i> 
                <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">SALDO BANK</span>
              </button>
              <button 
                onClick={() => props.setIsiJenis('Modal Tunai Kasir')}
                className={cn("py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all", props.isiJenis === 'Modal Tunai Kasir' ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-gray-50 border-gray-200 text-gray-600")}
              >
                <i className="fa-solid fa-money-bill-wave text-sm"></i> 
                <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">TUNAI (KASIR)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">NOMINAL TOP-UP</label>
            <input 
              ref={nominalRef}
              type="text" 
              inputMode="numeric" 
              placeholder="0" 
              value={props.isiNominal}
              onChange={(e) => props.setIsiNominal(formatInputRupiah(e.target.value))}
              onKeyDown={(e) => handleKeyDown(e, keteranganRef)}
              className="form-input-modern w-full"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-1">
            {quickOptions.map((opt, idx) => {
              const isSelected = props.isiKeterangan.split(',').map(s=>s.trim()).includes(opt)
              return (
                <button 
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all", 
                    isSelected 
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                      : "bg-white border-gray-300 text-gray-500 hover:border-blue-400"
                  )}
                >
                  {idx + 1}. {opt}
                </button>
              )
            })}
          </div>

          <div>
            <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">KETERANGAN</label>
            <textarea 
              ref={keteranganRef}
              rows={2} 
              placeholder="Contoh: Setoran tunai sore hari..." 
              value={props.isiKeterangan}
              onChange={(e) => props.setIsiKeterangan(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, undefined, true)}
              className="form-input-modern w-full resize-none"
            ></textarea>
          </div>

          <button 
            onClick={props.handleSimpanIsiSaldo} 
            disabled={props.isSaving}
            className="w-full bg-blue-700 text-white text-[10px] font-black py-3 rounded-lg hover:bg-blue-800 shadow-md transition-all active:scale-95 uppercase tracking-widest mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
          >
            {props.isSaving ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fa-solid fa-cloud-arrow-up"></i>
            )}
            {props.isSaving ? 'MEMPROSES...' : 'SIMPAN SALDO'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default IsiSaldoView
