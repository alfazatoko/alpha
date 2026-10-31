import React, { useState, useEffect, useRef } from 'react'
import { GlobalHeader } from '../components/GlobalHeader';
import { formatRupiah, cn, parseLocalISO, getLocalDateString } from '../lib/utils'
import type { Transaction } from '../types'
import TransactionRow from '../components/TransactionRow'
import type { KasirAccount } from '../components/LoginScreen'

interface RiwayatViewProps {
  active: boolean
  activeView?: string
  transactions: Transaction[]
  filterTanggalMulai: string
  setFilterTanggalMulai: (v: string) => void
  filterTanggalAkhir: string
  setFilterTanggalAkhir: (v: string) => void
  filterPencarian: string
  setFilterPencarian: (v: string) => void
  filterKategori: string[]
  setFilterKategori: (v: string[]) => void
  activeSaldoFilter: string
  setActiveSaldoFilter: (v: string) => void
  kasirRole?: string
  filterKasir?: string
  setFilterKasir?: (v: string) => void
  kasirList?: Record<string, KasirAccount>
  onEdit: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => void
  setActiveView: (v: string) => void
  storeName?: string
  storeSubtext?: string
  storePhoto?: string
  kasirName?: string
  setIsSidePanelOpen?: (v: boolean) => void
  isPc?: boolean
}

const RiwayatView: React.FC<RiwayatViewProps> = (props) => {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const [currentTime, setCurrentTime] = useState(new Date())
  const [activePcTab, setActivePcTab] = useState<'transaksi' | 'tambah-saldo'>('transaksi')
  const [isPcKategoriOpen, setIsPcKategoriOpen] = useState(false)
  const [isPcKpiCollapsed, setIsPcKpiCollapsed] = useState(false)
  const isManualCollapseRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' })
    }
  }
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' })
  const fullDate = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const clockStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // Local filter states for bottom sheet
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [localKategori, setLocalKategori] = useState<string[]>(props.filterKategori)
  const [localPencarian, setLocalPencarian] = useState(props.filterPencarian)
  const [localDari, setLocalDari] = useState(props.filterTanggalMulai)
  const [localSampai, setLocalSampai] = useState(props.filterTanggalAkhir)

  // Synchronize local states when sheet opens or outer props change
  useEffect(() => {
    if (isFilterOpen) {
      setLocalKategori(props.filterKategori)
      setLocalPencarian(props.filterPencarian)
      setLocalDari(props.filterTanggalMulai)
      setLocalSampai(props.filterTanggalAkhir)
    }
  }, [isFilterOpen, props.filterKategori, props.filterPencarian, props.filterTanggalMulai, props.filterTanggalAkhir])

  const handleCari = () => {
    props.setFilterKategori(localKategori)
    props.setFilterPencarian(localPencarian)
    props.setFilterTanggalMulai(localDari)
    props.setFilterTanggalAkhir(localSampai)
    setCurrentPage(1)
    setIsFilterOpen(false)
  }

  const handleResetFilters = () => {
    const today = getLocalDateString()
    setLocalKategori(['Semua'])
    setLocalPencarian('')
    setLocalDari(today)
    setLocalSampai(today)
  }



  // 1. Filter berdasarkan Rentang Tanggal (Untuk Kartu Dashboard Atas)
  const dateFilteredTransactions = props.transactions.filter(t => {
    if (t.kategori.startsWith('Isi')) return false
    const date = t.timestamp.split('T')[0]
    return date >= props.filterTanggalMulai && date <= props.filterTanggalAkhir
  })

  // 2. Filter berdasarkan Kategori, Pencarian, & Kasir (Untuk List & Footer Bawah)
  const filteredTransactions = dateFilteredTransactions.filter(t => {
    const matchKategori = props.filterKategori.includes('Semua') || props.filterKategori.includes(t.kategori)
    const matchSearch = !props.filterPencarian || 
                      t.keterangan.toLowerCase().includes(props.filterPencarian.toLowerCase()) ||
                      t.nominal.toString().includes(props.filterPencarian)
    const matchKasir = !props.filterKasir || props.filterKasir === 'Semua' || t.kasir_id === props.filterKasir
    return matchKategori && matchSearch && matchKasir
  })

  // Summary untuk Kartu Atas (Total Hari/Rentang yang dipilih)
  // DISINKRONKAN: Mengeluarkan [KHUSUS] dan [NON_TUNAI] agar cocok dengan saldo laci di Dashboard
  const todayCount = dateFilteredTransactions.length
  const todayTarikTunai = dateFilteredTransactions
    .filter(t => t.kategori === 'Tarik Tunai' && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]'))
    .reduce((s, t) => s + t.nominal, 0)
  const todayUangMasuk = dateFilteredTransactions
    .filter(t => t.kategori !== 'Tarik Tunai' && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]'))
    .reduce((s, t) => s + t.nominal, 0)
  const todayVolume = dateFilteredTransactions
    .filter(t => !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]'))
    .reduce((s, t) => s + t.nominal, 0)
  const todayAdmin = dateFilteredTransactions
    .filter(t => !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]'))
    .reduce((s, t) => s + t.adminFee, 0)

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage)

  const totalNominal = filteredTransactions.reduce((s, t) => s + t.nominal, 0)
  const totalAdmin = filteredTransactions.reduce((s, t) => s + t.adminFee, 0)

  const filteredSaldoTransactions = props.transactions.filter(t => {
    if (!t.kategori.startsWith('Isi')) return false
    const date = t.timestamp.split('T')[0]
    const matchDate = date >= props.filterTanggalMulai && date <= props.filterTanggalAkhir
    const matchType = props.activeSaldoFilter === 'Semua' || 
                    (props.activeSaldoFilter === 'Saldo Bank' && t.kategori.includes('Saldo Bank')) ||
                    (props.activeSaldoFilter === 'Saldo Real' && t.kategori.includes('Real Aplikasi')) ||
                    (props.activeSaldoFilter === 'Modal Tunai' && t.kategori.includes('Modal Tunai'))
    return matchDate && matchType
  })

  const totalSaldoNominal = filteredSaldoTransactions.reduce((s, t) => s + t.nominal, 0)

  if (props.isPc) {
    if (!props.active) return null;

    // Calculate stats for the second tab (Tambah Saldo)
    const saldoBankTotal = filteredSaldoTransactions.filter(t => t.kategori.includes('Saldo Bank')).reduce((s, t) => s + t.nominal, 0)
    const saldoRealTotal = filteredSaldoTransactions.filter(t => t.kategori.includes('Real Aplikasi')).reduce((s, t) => s + t.nominal, 0)
    const modalTunaiTotal = filteredSaldoTransactions.filter(t => t.kategori.includes('Modal Tunai')).reduce((s, t) => s + t.nominal, 0)

    const isFullPage = props.activeView === 'view-transaksi';

    return (
      <div className="flex-grow h-full flex flex-col bg-slate-50 dark:bg-slate-900 p-3 lg:p-4 overflow-hidden">
        {/* HEADER SECTION (Ringkas & Padat) */}
        {isFullPage ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase leading-none">
                  Jurnal & Riwayat Transaksi
                </h1>
                <button
                  onClick={() => {
                    const next = !isPcKpiCollapsed;
                    isManualCollapseRef.current = next;
                    setIsPcKpiCollapsed(next);
                  }}
                  className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                  title={isPcKpiCollapsed ? "Tampilkan 4 Kartu Ringkasan" : "Tutup Kartu Ringkasan agar Area Daftar Riwayat Lebih Luas"}
                >
                  <i className={cn("fa-solid text-[8px] transition-transform", isPcKpiCollapsed ? "fa-chevron-down" : "fa-chevron-up")}></i>
                  <span>{isPcKpiCollapsed ? "Buka Ringkasan" : "Tutup Ringkasan"}</span>
                </button>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase mt-1">
                Pemantauan menyeluruh seluruh transaksi masuk, keluar, dan mutasi saldo modal
              </p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
              <button
                onClick={() => setActivePcTab('transaksi')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  activePcTab === 'transaksi'
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                Transaksi Utama ({filteredTransactions.length})
              </button>
              <button
                onClick={() => setActivePcTab('tambah-saldo')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  activePcTab === 'tambah-saldo'
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                Mutasi Tambah Saldo ({filteredSaldoTransactions.length})
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-wider uppercase">Jurnal Transaksi</h3>
              <button
                onClick={() => {
                  const next = !isPcKpiCollapsed;
                  isManualCollapseRef.current = next;
                  setIsPcKpiCollapsed(next);
                }}
                className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 text-[8px] font-bold"
              >
                <i className={cn("fa-solid text-[7px] mr-1", isPcKpiCollapsed ? "fa-chevron-down" : "fa-chevron-up")}></i>
                {isPcKpiCollapsed ? "Buka Ringkasan" : "Tutup Ringkasan"}
              </button>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => setActivePcTab('transaksi')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                  activePcTab === 'transaksi'
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                )}
              >
                Transaksi ({filteredTransactions.length})
              </button>
              <button
                onClick={() => setActivePcTab('tambah-saldo')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                  activePcTab === 'tambah-saldo'
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                )}
              >
                Saldo ({filteredSaldoTransactions.length})
              </button>
            </div>
          </div>
        )}

        {/* KPI DASHBOARD CARDS (Compact & Bisa Ditutup) */}
        {isFullPage && !isPcKpiCollapsed && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-2.5 shrink-0 animate-in fade-in duration-150">
            {activePcTab === 'transaksi' ? (
              <>
                {/* Total Transaksi */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 px-3.5 border border-slate-100 dark:border-slate-700/50 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <i className="fa-solid fa-file-invoice-dollar text-xs"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Total Transaksi</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight mt-0.5 tabular-nums">
                      {filteredTransactions.length} <span className="text-[9px] font-bold text-slate-400">Trx</span>
                    </p>
                  </div>
                </div>

                {/* Total Volume */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 px-3.5 border border-slate-100 dark:border-slate-700/50 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                    <i className="fa-solid fa-calculator text-xs"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Total Volume</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight mt-0.5 tabular-nums truncate" title={formatRupiah(totalNominal)}>
                      {formatRupiah(totalNominal).replace(',00', '')}
                    </p>
                  </div>
                </div>

                {/* Total Admin */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 px-3.5 border border-slate-100 dark:border-slate-700/50 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <i className="fa-solid fa-percent text-xs"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Total Admin</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5 tabular-nums truncate" title={formatRupiah(totalAdmin)}>
                      {formatRupiah(totalAdmin).replace(',00', '')}
                    </p>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 px-3.5 border border-slate-100 dark:border-slate-700/50 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <i className="fa-solid fa-money-bill-wave text-xs"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Grand Total</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight mt-0.5 tabular-nums truncate" title={formatRupiah(totalNominal + totalAdmin)}>
                      {formatRupiah(totalNominal + totalAdmin).replace(',00', '')}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 px-3.5 border border-slate-100 dark:border-slate-700/50 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-950/40 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400 shrink-0">
                    <i className="fa-solid fa-wallet text-xs"></i>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Total Mutasi</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight mt-0.5">{filteredSaldoTransactions.length}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 px-3.5 border border-slate-100 dark:border-slate-700/50 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <i className="fa-solid fa-building-columns text-xs"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Mutasi Bank</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight mt-0.5 truncate" title={formatRupiah(saldoBankTotal)}>
                      {formatRupiah(saldoBankTotal).replace(',00', '')}
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 px-3.5 border border-slate-100 dark:border-slate-700/50 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <i className="fa-solid fa-mobile-screen text-xs"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Mutasi Real App</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight mt-0.5 truncate" title={formatRupiah(saldoRealTotal)}>
                      {formatRupiah(saldoRealTotal).replace(',00', '')}
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 px-3.5 border border-slate-100 dark:border-slate-700/50 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <i className="fa-solid fa-vault text-xs"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Mutasi Modal Tunai</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight mt-0.5 truncate" title={formatRupiah(modalTunaiTotal)}>
                      {formatRupiah(modalTunaiTotal).replace(',00', '')}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* HORIZONTAL FILTER BAR (Sticky di atas saat discroll, Ringkas & Anti-Tabrakan) */}
        <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs py-1.5 shrink-0 mt-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 shadow-xs border border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-2 items-end">
            {/* Rentang Tanggal: 1 Baris Solid Tanpa Pecah / Menabrak */}
            <div className="shrink-0">
              <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Rentang Tanggal</label>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
                <button 
                  onClick={() => {
                    const tMulai = new Date(props.filterTanggalMulai);
                    const tAkhir = new Date(props.filterTanggalAkhir);
                    if (!isNaN(tMulai.getTime()) && !isNaN(tAkhir.getTime())) {
                      tMulai.setDate(tMulai.getDate() - 1);
                      tAkhir.setDate(tAkhir.getDate() - 1);
                      props.setFilterTanggalMulai(tMulai.toISOString().split('T')[0]);
                      props.setFilterTanggalAkhir(tAkhir.toISOString().split('T')[0]);
                      setCurrentPage(1);
                    }
                  }}
                  className="w-6 h-6 shrink-0 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-all active:scale-95 cursor-pointer"
                  title="Hari Sebelumnya"
                >
                  <i className="fa-solid fa-chevron-left text-[8px]"></i>
                </button>
                
                <input 
                  type="date"
                  value={props.filterTanggalMulai}
                  onChange={(e) => { props.setFilterTanggalMulai(e.target.value); setCurrentPage(1); }}
                  className="w-[102px] bg-transparent border-0 px-1 py-0.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none text-center cursor-pointer"
                />
                <span className="text-slate-400 font-black text-[10px] px-0.5">-</span>
                <input 
                  type="date"
                  value={props.filterTanggalAkhir}
                  onChange={(e) => { props.setFilterTanggalAkhir(e.target.value); setCurrentPage(1); }}
                  className="w-[102px] bg-transparent border-0 px-1 py-0.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none text-center cursor-pointer"
                />

                <button 
                  onClick={() => {
                    const tMulai = new Date(props.filterTanggalMulai);
                    const tAkhir = new Date(props.filterTanggalAkhir);
                    if (!isNaN(tMulai.getTime()) && !isNaN(tAkhir.getTime())) {
                      tMulai.setDate(tMulai.getDate() + 1);
                      tAkhir.setDate(tAkhir.getDate() + 1);
                      props.setFilterTanggalMulai(tMulai.toISOString().split('T')[0]);
                      props.setFilterTanggalAkhir(tAkhir.toISOString().split('T')[0]);
                      setCurrentPage(1);
                    }
                  }}
                  className="w-6 h-6 shrink-0 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-all active:scale-95 cursor-pointer"
                  title="Hari Berikutnya"
                >
                  <i className="fa-solid fa-chevron-right text-[8px]"></i>
                </button>
              </div>
            </div>

            {activePcTab === 'transaksi' ? (
              <>
                {/* Kategori Checklist Dropdown (Lebar Pas & Tidak Menabrak) */}
                <div className="w-[130px] shrink-0 relative">
                  <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Kategori</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsPcKategoriOpen(!isPcKategoriOpen)}
                      className="w-full h-[28px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-0.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 text-left flex justify-between items-center cursor-pointer"
                    >
                      <span className="truncate max-w-[90px]">
                        {props.filterKategori.includes('Semua') 
                          ? 'Semua Kategori' 
                          : props.filterKategori.join(', ')}
                      </span>
                      <i className="fa-solid fa-chevron-down text-[8px] text-slate-400 pointer-events-none"></i>
                    </button>
                    
                    {isPcKategoriOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsPcKategoriOpen(false)} />
                        
                        <div className="absolute top-full left-0 mt-1 w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2.5 z-40 space-y-1 max-h-[250px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                          {['Semua', 'Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris'].map(cat => {
                            const isChecked = props.filterKategori.includes(cat);
                            return (
                              <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1.5 rounded-lg transition-colors text-left">
                                <input 
                                  type="checkbox" 
                                  className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500 border-slate-300 dark:border-slate-600 dark:bg-slate-900 cursor-pointer"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (cat === 'Semua') {
                                      props.setFilterKategori(['Semua'])
                                    } else {
                                      let next = [...props.filterKategori]
                                      if (next.includes('Semua')) next = []
                                      
                                      if (e.target.checked) {
                                        next.push(cat)
                                      } else {
                                        next = next.filter(c => c !== cat)
                                      }
                                      
                                      if (next.length === 0) next = ['Semua']
                                      props.setFilterKategori(next)
                                    }
                                    setCurrentPage(1);
                                  }}
                                />
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                  {cat === 'Semua' ? 'Semua Kategori' : cat}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Pencarian (No. HP / ID / Keterangan) */}
                <div className="flex-1 min-w-[130px]">
                  <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Cari (HP / ID / Keterangan)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Masukkan kata kunci..."
                      value={props.filterPencarian}
                      onChange={(e) => {
                        props.setFilterPencarian(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full h-[28px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-2.5 py-0.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                    <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[9px]"></i>
                  </div>
                </div>

                {/* Owner Kasir Filter */}
                {props.kasirRole === 'owner' && props.kasirList && (
                  <div className="w-[120px] shrink-0">
                    <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Pantau Kasir</label>
                    <div className="relative">
                      <select 
                        value={props.filterKasir || 'Semua'}
                        onChange={(e) => {
                          props.setFilterKasir && props.setFilterKasir(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full h-[28px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-2 pr-6 py-0.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 cursor-pointer appearance-none truncate"
                      >
                        <option value="Semua">Semua Kasir</option>
                        {Object.entries(props.kasirList)
                          .filter(([id, acc]) => id.toLowerCase() !== 'owner' && (acc.role || '').toLowerCase() !== 'owner')
                          .map(([id, acc]) => (
                            <option key={id} value={id}>{acc.name}</option>
                          ))}
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 pointer-events-none"></i>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Saldo Mutasi Specific Type Filters */
              <div className="shrink-0">
                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Jenis Penambahan</label>
                <div className="flex gap-1">
                  {['Semua', 'Saldo Bank', 'Saldo Real', 'Modal Tunai'].map(f => (
                    <button 
                      key={f}
                      onClick={() => props.setActiveSaldoFilter(f)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-lg text-[9px] font-black transition-all border uppercase tracking-wider h-[28px]",
                        props.activeSaldoFilter === f 
                          ? "bg-[#118ee9] border-[#118ee9] text-white dark:bg-blue-500 dark:border-blue-500" 
                          : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      {f.replace('Saldo ', '')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reset Button */}
            <button 
              onClick={() => {
                const today = getLocalDateString()
                props.setFilterKategori(['Semua'])
                props.setFilterPencarian('')
                props.setFilterTanggalMulai(today)
                props.setFilterTanggalAkhir(today)
                if (props.setFilterKasir) props.setFilterKasir('Semua')
                props.setActiveSaldoFilter('Semua')
                setCurrentPage(1);
              }}
              className="h-[28px] px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all shrink-0 flex items-center gap-1 self-end cursor-pointer"
              title="Reset Semua Filter"
            >
              <i className="fa-solid fa-rotate-left text-[8px]"></i>
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* TABEL AREA: Berkembang penuh & sticky header saat discroll ke atas */}
        {activePcTab === 'transaksi' ? (
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden flex flex-col mt-1.5">
            <div 
              onScroll={(e) => {
                const st = e.currentTarget.scrollTop;
                if (st > 20 && !isPcKpiCollapsed) {
                  setIsPcKpiCollapsed(true);
                } else if (st === 0 && isPcKpiCollapsed && !isManualCollapseRef.current) {
                  setIsPcKpiCollapsed(false);
                }
              }}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar"
            >
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 shadow-xs">
                  <tr>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-12 text-center">No</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-36">Waktu</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-24">Kasir</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-36">Kategori</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Keterangan</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right w-32">Nominal</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right w-28">Admin Fee</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right w-32">Total</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest bg-slate-50/10">
                        Tidak ada transaksi dalam filter ini
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((t, i) => {
                      const dateObj = parseLocalISO(t.timestamp)
                      const jam = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      const tgl = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      
                      const isToday = t.timestamp.startsWith(getLocalDateString())
                      const canEdit = isToday
                      const canDelete = isToday && props.kasirRole === 'owner'
                      
                      const isKhusus = (t.keterangan || '').includes('[KHUSUS]')
                      const isNonTunai = (t.keterangan || '').includes('[NON_TUNAI]')

                      const kasirNameStr = (t.kasir_id && props.kasirList?.[t.kasir_id]?.name) || t.kasir_id || 'Kasir';

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-2 px-3 text-xs text-slate-400 dark:text-slate-500 font-bold text-center">{startIndex + i + 1}</td>
                          <td className="py-2 px-3 text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{tgl} • {jam}</td>
                          <td className="py-2 px-3 text-xs font-bold text-slate-700 dark:text-slate-300">{kasirNameStr}</td>
                          <td className="py-2 px-3">
                            {(() => {
                              let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
                              if (t.kategori === 'Transfer Bank') badgeStyle = "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30";
                              else if (t.kategori === 'DANA') badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30";
                              else if (t.kategori === 'FLIP') badgeStyle = "bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/30";
                              else if (t.kategori === 'Order Kuota') badgeStyle = "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30";
                              else if (t.kategori === 'Tarik Tunai') badgeStyle = "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30";
                              else if (t.kategori === 'Aksesoris') badgeStyle = "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100 dark:bg-fuchsia-950/30 dark:text-fuchsia-400 dark:border-fuchsia-900/30";
                              
                              return (
                                <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap", badgeStyle)}>
                                  {t.kategori}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap items-center gap-1.5 max-w-[320px]">
                              {(() => {
                                const feeMatch = (t.keterangan || '').match(/\[FEE_APP:(\d+)\]/i);
                                const appFee = feeMatch ? parseInt(feeMatch[1], 10) : 0;
                                const cleanKet = (t.keterangan || '')
                                  .replace(/\[\s*fee_app:\d+\s*\]/gi, '')
                                  .replace(/\[\s*non[_\s]tunai\s*\]/gi, '')
                                  .replace(/\[\s*khusus\s*\]/gi, '')
                                  .replace(/\[\s*admin[_\s]dalam\s*\]/gi, '')
                                  .replace(/\[\s*split:[^\]]*\]/gi, '')
                                  .trim();
                                return (
                                  <>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={t.keterangan}>
                                      {cleanKet || '-'}
                                    </span>
                                    {appFee > 0 && (
                                      <span className="text-[7px] bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 px-1 py-0.2 rounded font-black border border-amber-200 dark:border-amber-900/30">
                                        FEE: {appFee.toLocaleString('id-ID')}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                              {isKhusus && (
                                <span className="text-[7px] bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 px-1 py-0.2 rounded font-black border border-orange-200 dark:border-orange-900/30">KHUSUS</span>
                              )}
                              {isNonTunai && (
                                <span className="text-[7px] bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 px-1 py-0.2 rounded font-black border border-purple-200 dark:border-purple-900/30">NON TUNAI</span>
                              )}
                              {t.isEdited && (
                                <span className="text-[7px] bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 px-1 py-0.2 rounded font-black border border-amber-200 dark:border-amber-900/30">EDIT</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-xs font-bold text-right text-slate-700 dark:text-slate-300 tabular-nums">
                            {(() => {
                              const feeMatch = (t.keterangan || '').match(/\[FEE_APP:(\d+)\]/i);
                              const appFee = feeMatch ? parseInt(feeMatch[1], 10) : 0;
                              return (
                                <div>
                                  <div>{t.nominal.toLocaleString('id-ID')}</div>
                                  {appFee > 0 && (
                                    <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                                      ({(t.nominal - appFee).toLocaleString('id-ID')} + Fee {appFee.toLocaleString('id-ID')})
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-2 px-3 text-xs font-bold text-right text-emerald-600 tabular-nums">+{t.adminFee.toLocaleString('id-ID')}</td>
                          <td className="py-2 px-3 text-xs font-black text-right text-slate-900 dark:text-white tabular-nums">{(t.nominal + t.adminFee).toLocaleString('id-ID')}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {canEdit ? (
                                <button 
                                  onClick={() => props.onEdit(t)}
                                  className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white px-2 py-0.5 rounded-lg text-[8px] font-black flex items-center gap-1 transition-all border border-blue-100 dark:border-blue-900/30"
                                >
                                  <i className="fa-solid fa-pen text-[7px]"></i> EDIT
                                </button>
                              ) : (
                                <span className="text-[7px] text-slate-400 dark:text-slate-500 font-bold italic py-0.5 px-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">LOCKED</span>
                              )}
                              {canDelete && (
                                <button 
                                  onClick={() => props.onDelete?.(t)}
                                  className="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white w-6 h-6 rounded-lg flex items-center justify-center transition-all border border-rose-100 dark:border-rose-900/30"
                                >
                                  <i className="fa-solid fa-trash-can text-[8px]"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* TABEL FOOTER & PAGINATION (Kompak) */}
            <div className="shrink-0 flex flex-wrap items-center justify-between px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/90 border-t border-slate-100 dark:border-slate-700 gap-2">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{filteredTransactions.length} Items</span>
              <div className="flex items-center gap-4">
                <div className="text-blue-600 dark:text-blue-400 font-black text-xs whitespace-nowrap uppercase flex items-center gap-1.5">
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold">NOMINAL:</span>
                  {formatRupiah(totalNominal).replace(',00', '')}
                </div>
                <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700"></div>
                <div className="text-emerald-600 dark:text-emerald-400 font-black text-xs whitespace-nowrap uppercase flex items-center gap-1.5">
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold">ADMIN:</span>
                  {formatRupiah(totalAdmin).replace(',00', '')}
                </div>
                <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700"></div>
                <div className="text-slate-900 dark:text-white font-black text-xs whitespace-nowrap uppercase flex items-center gap-1.5">
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold">TOTAL:</span>
                  {formatRupiah(totalNominal + totalAdmin).replace(',00', '')}
                </div>
              </div>
              
              {/* Pagination Mini */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={cn(
                        "w-6 h-6 rounded-lg font-black text-[10px] transition-all flex items-center justify-center",
                        currentPage === i + 1 
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs" 
                          : "bg-white text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MUTASI TAMBAH SALDO WIDESCREEN TABLE */
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden flex flex-col mt-1.5">
            <div 
              onScroll={(e) => {
                const st = e.currentTarget.scrollTop;
                if (st > 20 && !isPcKpiCollapsed) {
                  setIsPcKpiCollapsed(true);
                } else if (st === 0 && isPcKpiCollapsed && !isManualCollapseRef.current) {
                  setIsPcKpiCollapsed(false);
                }
              }}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar"
            >
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 shadow-xs">
                  <tr>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-12 text-center">No</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-36">Waktu</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-48">Jenis Mutasi</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Keterangan</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right w-40">Nominal</th>
                    <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredSaldoTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest bg-slate-50/10">
                        Tidak ada mutasi saldo dalam filter ini
                      </td>
                    </tr>
                  ) : (
                    filteredSaldoTransactions.map((t, i) => {
                      const dateObj = parseLocalISO(t.timestamp)
                      const jam = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      const tgl = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      
                      const isToday = t.timestamp.startsWith(getLocalDateString())
                      const canEdit = isToday
                      const canDelete = isToday && props.kasirRole === 'owner'
                      
                      let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
                      if (t.kategori.includes('Bank')) badgeStyle = "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30";
                      else if (t.kategori.includes('Real')) badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30";
                      else if (t.kategori.includes('Modal')) badgeStyle = "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100 dark:bg-fuchsia-950/30 dark:text-fuchsia-400 dark:border-fuchsia-900/30";

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-2 px-3 text-xs text-slate-400 dark:text-slate-500 font-bold text-center">{i + 1}</td>
                          <td className="py-2 px-3 text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{tgl} • {jam}</td>
                          <td className="py-2 px-3">
                            <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap", badgeStyle)}>
                              {t.kategori.replace('Isi ', 'TAMBAH ')}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-600 dark:text-slate-400 font-bold">{t.keterangan || '-'}</td>
                          <td className="py-2 px-3 text-xs font-black text-right text-slate-900 dark:text-white tabular-nums">{t.nominal.toLocaleString('id-ID')}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {canEdit ? (
                                <button 
                                  onClick={() => props.onEdit(t)}
                                  className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white px-2 py-0.5 rounded-lg text-[8px] font-black flex items-center gap-1 transition-all border border-blue-100 dark:border-blue-900/30"
                                >
                                  <i className="fa-solid fa-pen text-[7px]"></i> EDIT
                                </button>
                              ) : (
                                <span className="text-[7px] text-slate-400 dark:text-slate-500 font-bold italic py-0.5 px-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">LOCKED</span>
                              )}
                              {canDelete && (
                                <button 
                                  onClick={() => props.onDelete?.(t)}
                                  className="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white w-6 h-6 rounded-lg flex items-center justify-center transition-all border border-rose-100 dark:border-rose-900/30"
                                >
                                  <i className="fa-solid fa-trash-can text-[8px]"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredSaldoTransactions.length > 0 && (
              <div className="shrink-0 bg-slate-50/80 dark:bg-slate-800/90 px-5 py-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 shadow-xs">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{filteredSaldoTransactions.length} Items</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs whitespace-nowrap uppercase flex items-center gap-1.5">
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold">TOTAL PENAMBAHAN:</span>
                  {formatRupiah(totalSaldoNominal).replace(',00', '')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("page-view hide-scrollbar", props.active && "active")} style={{ backgroundColor: 'var(--container-bg, #ffffff)' }}>
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
        compactMode={true}
        extraBgPadding={true}
      />

      <div className="mx-1.5 mb-3 mt-[-1.25rem] relative z-[40]">
        <div className="bg-gradient-to-r from-[#004A8B] to-[#0069BA] rounded-t-[1.5rem] rounded-b-[2rem] shadow-lg border-[2px] border-white p-3.5 overflow-hidden relative">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full border border-white/40 bg-white/10 flex items-center justify-center shrink-0">
               <i className="fa-solid fa-clock text-lg text-white"></i>
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-[10px] font-bold text-white mb-0.5 truncate">Arus kas keluar masuk</p>
               <h2 className="text-base font-black text-white leading-none truncate">Data Transaksi</h2>
             </div>
          </div>

          {/* FILTER KASIR & TANGGAL DI DALAM HEADER BIRU */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-col gap-2">
            
            {/* OWNER ONLY: FILTER KASIR */}
            {props.kasirRole === 'owner' && props.kasirList && (
              <div className="flex-1 bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm transition-all">
                <div className="flex-1 flex items-center min-w-0">
                  <div className="relative flex-1 min-w-0">
                    <select 
                      value={props.filterKasir || 'Semua'}
                      onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                      className="w-full bg-transparent text-white text-[10px] sm:text-[11px] font-black outline-none border-none cursor-pointer appearance-none pr-4 truncate font-sans"
                    >
                      <option value="Semua" className="text-slate-800">Semua Kasir</option>
                      {Object.entries(props.kasirList)
                        .filter(([id, acc]) => id.toLowerCase() !== 'owner' && (acc.role || '').toLowerCase() !== 'owner')
                        .map(([id, acc]) => (
                          <option key={id} value={id} className="text-slate-800">{acc.name}</option>
                        ))}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-0 top-1/2 -translate-y-1/2 text-[8px] text-white/70 pointer-events-none"></i>
                  </div>
                </div>
              </div>
            )}

            {/* FILTER TANGGAL */}
            <div className="w-full bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl px-2.5 py-1.5 flex justify-between items-center transition-all shadow-sm">
              <div 
                className="flex items-center gap-2 text-left flex-1 overflow-hidden cursor-pointer active:opacity-70 pl-1"
                onClick={() => setIsFilterOpen(true)}
              >
                <i className="fa-solid fa-sliders text-[10px] text-white shrink-0"></i>
                <div className="min-w-0 flex-1 flex items-center">
                  <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-wider truncate">
                    {(() => {
                      const cat = props.filterKategori.includes('Semua') ? 'Riwayat' : props.filterKategori.join(', ');
                      const search = props.filterPencarian ? ` "${props.filterPencarian}"` : '';
                      let dateText = '';
                      if (props.filterTanggalMulai === props.filterTanggalAkhir) {
                        const d = new Date(props.filterTanggalMulai);
                        if (!isNaN(d.getTime())) {
                          const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
                          const dayName = days[d.getDay()];
                          const parts = props.filterTanggalMulai.split('-');
                          if(parts.length === 3) {
                            dateText = `${dayName} ${parts[2]}-${parts[1]}-${parts[0]}`;
                          } else {
                            dateText = props.filterTanggalMulai;
                          }
                        } else {
                          dateText = props.filterTanggalMulai;
                        }
                      } else {
                        dateText = `${props.filterTanggalMulai} s/d ${props.filterTanggalAkhir}`;
                      }
                      return `${cat}${search} • ${dateText}`;
                    })()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const tMulai = new Date(props.filterTanggalMulai);
                    const tAkhir = new Date(props.filterTanggalAkhir);
                    if (!isNaN(tMulai.getTime()) && !isNaN(tAkhir.getTime())) {
                      tMulai.setDate(tMulai.getDate() - 1);
                      tAkhir.setDate(tAkhir.getDate() - 1);
                      props.setFilterTanggalMulai(tMulai.toISOString().split('T')[0]);
                      props.setFilterTanggalAkhir(tAkhir.toISOString().split('T')[0]);
                      setCurrentPage(1);
                    }
                  }}
                  className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95"
                >
                  <i className="fa-solid fa-chevron-left text-[11px]"></i>
                </button>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const tMulai = new Date(props.filterTanggalMulai);
                    const tAkhir = new Date(props.filterTanggalAkhir);
                    if (!isNaN(tMulai.getTime()) && !isNaN(tAkhir.getTime())) {
                      tMulai.setDate(tMulai.getDate() + 1);
                      tAkhir.setDate(tAkhir.getDate() + 1);
                      props.setFilterTanggalMulai(tMulai.toISOString().split('T')[0]);
                      props.setFilterTanggalAkhir(tAkhir.toISOString().split('T')[0]);
                      setCurrentPage(1);
                    }
                  }}
                  className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95"
                >
                  <i className="fa-solid fa-chevron-right text-[11px]"></i>
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFilterOpen(true);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-all active:scale-95 ml-0.5"
                >
                  <i className="fa-solid fa-chevron-down text-[12px]"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-1.5 pb-20 pt-1">

        {/* SUMMARY CARDS — 2x2 grid: TRX | Admin / Uang Masuk | Tarik Tunai */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Baris 1 kiri: TRX */}
          <div className="bg-white border border-gray-100 rounded-2xl py-3 px-3 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
              <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest">TRX Hari Ini</div>
            </div>
            <div className="text-3xl font-black text-blue-600 leading-none mt-1">{todayCount}</div>
            <div className="text-[8px] font-bold text-slate-400 mt-1">Jumlah Transaksi</div>
          </div>

          {/* Baris 1 kanan: Admin */}
          <div className="bg-white border border-gray-100 rounded-2xl py-3 px-3 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
              <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Admin Fee</div>
            </div>
            <div className="text-base font-black text-emerald-600 leading-tight mt-1 truncate">
              {formatRupiah(todayAdmin).replace(',00', '')}
            </div>
            <div className="text-[8px] font-bold text-slate-400 mt-1">Total Admin Fee</div>
          </div>

          {/* Baris 2 kiri: Uang Masuk */}
          <div className="bg-white border border-gray-100 rounded-2xl py-3 px-3 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0"></div>
              <div className="text-[9px] font-black text-violet-600 uppercase tracking-widest">Uang Masuk</div>
            </div>
            <div className="text-sm font-black text-violet-700 leading-tight mt-1 truncate">
              {formatRupiah(todayUangMasuk).replace(',00', '')}
            </div>
            <div className="text-[8px] font-bold text-slate-400 mt-0.5">Penjualan → Laci</div>
          </div>

          {/* Baris 2 kanan: Tarik Tunai */}
          <div className="bg-white border border-gray-100 rounded-2xl py-3 px-3 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
              <div className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Tarik Tunai</div>
            </div>
            <div className="text-sm font-black text-rose-600 leading-tight mt-1 truncate">
              {formatRupiah(todayTarikTunai).replace(',00', '')}
            </div>
            <div className="text-[8px] font-bold text-slate-400 mt-0.5">Laci → Pembeli</div>
          </div>
        </div>

        {/* TABS TRANSAKSI & SALDO */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
          <button 
            onClick={() => setActivePcTab('transaksi')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shrink-0",
              activePcTab === 'transaksi' 
                ? "bg-[#118ee9] text-white border-[#118ee9] shadow-md shadow-[#118ee9]/20" 
                : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
            )}
          >
            Riwayat Transaksi
          </button>
          <button 
            onClick={() => setActivePcTab('tambah-saldo')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shrink-0",
              activePcTab === 'tambah-saldo' 
                ? "bg-[#118ee9] text-white border-[#118ee9] shadow-md shadow-[#118ee9]/20" 
                : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
            )}
          >
            Riwayat Tambah Saldo
          </button>
        </div>

        {activePcTab === 'transaksi' && (
          <>
          {/* QUICK CHIP FILTER KATEGORI */}
          <div className="relative flex items-center mb-4 group">
            <button 
              onClick={() => handleScroll('left')}
              className="absolute left-0 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center -ml-3 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <i className="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            <div ref={scrollRef} className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 w-full px-2 scroll-smooth">
              {['Semua', 'Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris'].map(cat => {
                const isActive = props.filterKategori.includes(cat);
                return (
                  <button 
                    key={cat}
                    onClick={() => {
                      props.setFilterKategori([cat]);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border shrink-0",
                      isActive 
                        ? "bg-[#118ee9] border-[#118ee9] text-white shadow-md shadow-[#118ee9]/20" 
                        : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {cat === 'Semua' ? 'Semua Kategori' : cat}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => handleScroll('right')}
              className="absolute right-0 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center -mr-3 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>

          <div className="flex flex-col">
          <div className="flex flex-col border-t border-slate-200">
            {paginatedTransactions.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tidak ada transaksi</p>
              </div>
            ) : (
              paginatedTransactions.map((t, i) => (
                <TransactionRow 
                  key={t.id} 
                  t={t} 
                  index={startIndex + i} 
                  onEdit={props.onEdit} 
                  onDelete={props.onDelete} 
                  kasirRole={props.kasirRole}
                  storeName={props.storeName}
                  storeSubtext={props.storeSubtext}
                  kasirName={props.kasirName}
                  kasirList={props.kasirList}
                />
              ))
            )}
          </div>

          {/* FOOTER TOTAL (4 kolom: Items | Uang Masuk | Tarik Tunai | Admin) */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-3.5 border-t border-slate-100 bg-white shadow-sm rounded-b-2xl px-3">
            <div className="text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">
              {filteredTransactions.length} Items
            </div>
            <div className="w-px h-2.5 bg-slate-200"></div>
            <div className="text-violet-600 font-black text-[9px] whitespace-nowrap uppercase flex items-center gap-1">
              <span className="text-[7px] opacity-70">MASUK:</span>
              {formatRupiah(filteredTransactions.filter(t => t.kategori !== 'Tarik Tunai').reduce((s, t) => s + t.nominal, 0)).replace(',00', '')}
            </div>
            <div className="w-px h-2.5 bg-slate-200"></div>
            <div className="text-rose-600 font-black text-[9px] whitespace-nowrap uppercase flex items-center gap-1">
              <span className="text-[7px] opacity-70">TARIK:</span>
              {formatRupiah(filteredTransactions.filter(t => t.kategori === 'Tarik Tunai').reduce((s, t) => s + t.nominal, 0)).replace(',00', '')}
            </div>
            <div className="w-px h-2.5 bg-slate-200"></div>
            <div className="text-emerald-600 font-black text-[9px] whitespace-nowrap uppercase flex items-center gap-1">
              <span className="text-[7px] opacity-70">ADM:</span>
              {formatRupiah(totalAdmin).replace(',00', '')}
            </div>
          </div>
        </div>

        {/* PAGINATION (Smaller) */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-1.5 mt-2 mb-8">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={cn(
                  "w-7 h-7 rounded-lg font-black text-[9px] transition-all",
                  currentPage === i + 1 
                    ? "bg-slate-900 text-white" 
                    : "bg-white text-slate-400 border border-slate-200"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
          </>
        )}

        {/* RIWAYAT TAMBAH SALDO SECTION (Rapat) */}
        {activePcTab === 'tambah-saldo' && (
          <div className="mt-0">
            <div className="flex gap-1 mb-4">
            {['Semua', 'Saldo Bank', 'Saldo Real', 'Modal Tunai'].map(f => (
              <button 
                key={f}
                onClick={() => props.setActiveSaldoFilter(f)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[8px] font-black transition-all border",
                  props.activeSaldoFilter === f 
                    ? "bg-[#118ee9] border-[#118ee9] text-white" 
                    : "bg-white border-slate-100 text-slate-400"
                )}
              >
                {f.replace('Saldo ', '').toUpperCase()}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="flex flex-col">
              {filteredSaldoTransactions.length === 0 ? (
                <div className="py-6 text-center text-slate-300 text-[10px] font-bold">KOSONG</div>
              ) : (
                  filteredSaldoTransactions.map((t, i) => {
                    const isToday = t.timestamp.startsWith(getLocalDateString())
                    const canEdit = isToday
                    const canDelete = isToday && props.kasirRole === 'owner'

                    return (
                    <div key={t.id} className="py-3 px-4 flex flex-col gap-1 hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                       <div className="flex justify-between items-start">
                         <div className="flex gap-4 items-start">
                            <div className="text-[9px] font-black text-slate-300 w-4 mt-0.5">{i+1}</div>
                            <div className="flex flex-col gap-0.5">
                               <div className={cn(
                                 "text-[13px] font-black uppercase leading-tight",
                                 t.kategori.includes('Bank') ? "text-blue-600" : 
                                 t.kategori.includes('Real') ? "text-emerald-600" : "text-fuchsia-600"
                               )}>
                                 {t.kategori.replace('Isi ', 'TAMBAH ')}
                               </div>
                               
                               <div className="text-[10px] text-slate-700 font-black italic break-words pr-2">
                                 {t.keterangan || '-'}
                               </div>

                               <div className="text-[9px] text-slate-400 font-bold mt-1">
                                  {(() => {
                                    const d = parseLocalISO(t.timestamp);
                                    const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
                                    const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                                    const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                    return `${hari}, ${tgl}, ${jam}`;
                                  })()}
                               </div>
                            </div>
                         </div>
                         
                         <div className="text-right flex flex-col items-end justify-between self-stretch min-h-[50px]">
                            <div className="text-[13px] font-black text-slate-800 leading-tight">
                              {formatRupiah(t.nominal).replace(',00', '')}
                            </div>
                            
                            <div className="flex justify-end items-center gap-1.5 mt-auto pt-2">
                              {canEdit ? (
                                <button 
                                  onClick={() => props.onEdit(t)}
                                  className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1"
                                >
                                  <i className="fa-solid fa-pen text-[7px]"></i> EDIT
                                </button>
                              ) : (
                                <span className="text-[7px] text-slate-400 font-bold italic py-1 px-2.5 bg-slate-50 border border-slate-100 rounded-lg">LOCKED</span>
                              )}
                              {canDelete && (
                                <button 
                                  onClick={() => props.onDelete?.(t)}
                                  className="bg-rose-50 text-rose-600 w-6 h-6 rounded-lg flex items-center justify-center"
                                >
                                  <i className="fa-solid fa-trash-can text-[8px]"></i>
                                </button>
                              )}
                            </div>
                         </div>
                       </div>
                    </div>
                    )
                  })
              )}
            </div>
            {filteredSaldoTransactions.length > 0 && (
              <div className="bg-white px-6 py-4 flex items-center justify-center gap-2 border-t border-slate-100 shadow-sm rounded-b-2xl">
                <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">{filteredSaldoTransactions.length} Items</span>
                <div className="w-px h-2.5 bg-slate-200"></div>
                <span className="text-emerald-600 font-black text-[10px] whitespace-nowrap uppercase flex items-center gap-1">
                  <span className="text-[8px] opacity-60">TOTAL:</span>
                  {formatRupiah(totalSaldoNominal).replace(',00', '')}
                </span>
              </div>
            )}
          </div>
          </div>
        )}
      </div>
      {/* FILTER BOTTOM SHEET (PHOTO 3 STYLE) */}
      {isFilterOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white rounded-t-[2rem] z-[210] px-4 pt-4 pb-6 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"></div>
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-[11px] text-slate-800 uppercase tracking-widest">Pencarian</h3>
              <button onClick={() => setIsFilterOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all">
                <i className="fa-solid fa-xmark text-[10px]"></i>
              </button>
            </div>
            
            <div className="space-y-3 mb-5 text-left">
              {/* Jenis Kategori -> Multiple Checkboxes */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Jenis Kategori</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {['Semua', 'Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris'].map(cat => {
                    const isChecked = localKategori.includes(cat);
                    return (
                      <label 
                        key={cat}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer p-2 rounded-xl border transition-all",
                          isChecked 
                            ? "bg-blue-50/50 border-blue-200" 
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          checked={isChecked}
                          onChange={(e) => {
                            if (cat === 'Semua') {
                              setLocalKategori(['Semua'])
                            } else {
                              let next = [...localKategori]
                              if (next.includes('Semua')) next = []
                              
                              if (e.target.checked) {
                                next.push(cat)
                              } else {
                                next = next.filter(c => c !== cat)
                              }
                              
                              if (next.length === 0) next = ['Semua']
                              setLocalKategori(next)
                            }
                          }}
                        />
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider",
                          isChecked ? "text-blue-700" : "text-slate-600"
                        )}>
                          {cat === 'Semua' ? 'Semua Kategori' : cat}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* No. HP / ID Trx / ID Plgn (Pencarian) */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">No. HP / ID Trx / ID Plgn</label>
                <input 
                  type="text" 
                  placeholder="Masukkan nomor HP atau ID..." 
                  value={localPencarian}
                  onChange={(e) => setLocalPencarian(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-slate-100 py-1.5 text-[11px] font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:border-teal-600" 
                />
              </div>

              {/* Dari Tanggal */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dari Tanggal</label>
                <div 
                  className="relative border-b-2 border-slate-100 py-1.5 cursor-pointer flex justify-between items-center"
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input');
                    if (input) (input as any).showPicker?.();
                  }}
                >
                  <input 
                    type="date"
                    className="w-full text-[11px] font-bold text-slate-800 outline-none bg-transparent pointer-events-none"
                    value={localDari}
                    onChange={(e) => setLocalDari(e.target.value)}
                  />
                  <i className="fa-regular fa-calendar text-slate-400 text-[11px] absolute right-1 pointer-events-none"></i>
                </div>
              </div>

              {/* Ke Tanggal */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ke Tanggal</label>
                <div 
                  className="relative border-b-2 border-slate-100 py-1.5 cursor-pointer flex justify-between items-center"
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input');
                    if (input) (input as any).showPicker?.();
                  }}
                >
                  <input 
                    type="date"
                    className="w-full text-[11px] font-bold text-slate-800 outline-none bg-transparent pointer-events-none"
                    value={localSampai}
                    onChange={(e) => setLocalSampai(e.target.value)}
                  />
                  <i className="fa-regular fa-calendar text-slate-400 text-[11px] absolute right-1 pointer-events-none"></i>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={handleResetFilters}
                className="flex-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-black py-2.5 rounded-full text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Reset
              </button>
              <button 
                onClick={handleCari}
                className="flex-grow-[1.5] bg-teal-700 hover:bg-teal-800 text-white font-black py-2.5 rounded-full text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-teal-700/20"
              >
                Cari
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


export default RiwayatView
