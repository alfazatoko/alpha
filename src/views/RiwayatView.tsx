import React, { useState, useEffect } from 'react'
import { formatRupiah, cn, parseLocalISO, getLocalDateString } from '../lib/utils'
import type { Transaction } from '../types'
import TransactionRow from '../components/TransactionRow'
import type { KasirAccount } from '../components/LoginScreen'

interface RiwayatViewProps {
  active: boolean
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
}

const RiwayatView: React.FC<RiwayatViewProps> = (props) => {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const [currentTime, setCurrentTime] = useState(new Date())
  
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

  return (
    <div className={cn("page-view hide-scrollbar", props.active && "active")} style={{ backgroundColor: 'var(--container-bg, #ffffff)' }}>
      {/* HEADER TOKO IDENTIK BERANDA */}
      <div className="relative theme-header" style={{ paddingBottom: '2.5rem' }}>
        <div className="px-4 pt-12 pb-2 flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {props.storePhoto ? (
                <img src={props.storePhoto} alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white/50 shadow-md" />
              ) : (
                <img src="/logo_icon.png" alt="Logo" className="w-12 h-12 object-contain" />
              )}
              <div>
                <h1 className="text-[13px] font-black text-white leading-tight uppercase tracking-widest">{props.storeName || 'ALFAZA CELL'}</h1>
                <p className="text-blue-200 text-[8px] font-bold uppercase tracking-tighter opacity-80">{props.storeSubtext || 'Pembukuan Agen brilink & Konter'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-white text-[10px] font-black">{props.kasirName}</span>
                  <span className={cn("text-[7px] px-1.5 py-0.5 rounded-full font-black", props.kasirRole === 'owner' ? "bg-amber-400 text-amber-900" : "bg-white/25 text-white")}>
                    {props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-blue-200 text-[8px] font-bold uppercase tracking-widest leading-none mb-1">{dayName}</p>
              <p className="text-white text-[10px] font-black tracking-tight leading-none mb-1">{fullDate}</p>
              <p className="text-blue-100 text-xs font-black tabular-nums tracking-widest">{clockStr}</p>
            </div>
          </div>

          <button onClick={() => props.setIsSidePanelOpen?.(true)} className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-90 hover:bg-white/20 transition-all">
            <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
          </button>
        </div>
      </div>

      <div className="px-1.5 pt-6 pb-5 bg-gradient-to-r from-indigo-700 to-blue-600 text-white rounded-b-[2rem] shadow-lg shadow-blue-500/20" style={{ marginTop: '-2.5rem', position: 'relative', zIndex: 10 }}>
        <div className="px-2 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-sm tracking-wide">Data Transaksi</h2>
            <p className="text-blue-100 text-[10px] opacity-90">Arus kas keluar masuk</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
            <i className="fa-solid fa-clock text-white text-xs"></i>
          </div>
        </div>

        {/* OWNER ONLY: FILTER KASIR DI DALAM HEADER */}
        {props.kasirRole === 'owner' && props.kasirList && (
          <div className="mt-3 bg-white/10 p-2 rounded-xl border border-white/20 flex items-center justify-between">
             <span className="text-[12px] font-bold text-white uppercase tracking-wider">
               <i className="fa-solid fa-user-gear mr-1"></i> Mode Pantau Kasir:
             </span>
             <div className="relative">
                <select 
                  value={props.filterKasir || 'Semua'}
                  onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                  className="bg-white bg-none text-violet-700 text-[12px] font-black rounded-lg pl-2 pr-6 py-1 outline-none border-none appearance-none cursor-pointer"
                >
                  <option value="Semua">Semua Kasir</option>
                  {Object.entries(props.kasirList).map(([id, acc]) => (
                    <option key={id} value={id}>{acc.name}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[7px] text-violet-400 pointer-events-none"></i>
             </div>
          </div>
        )}
      </div>

      <div className="px-1.5 pb-20 pt-3">
        {/* FILTER BARU (Filter Transaksi) - COMPACT MOBILE */}
        <div className="mb-3">
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-violet-500 rounded-lg px-2.5 py-1.5 flex justify-between items-center shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2 text-left w-full overflow-hidden">
              <i className="fa-solid fa-sliders text-[9px] text-violet-600 shrink-0"></i>
              <div className="min-w-0 flex-1 flex items-center gap-1.5">
                <span className="text-[9px] font-black text-slate-800 uppercase tracking-wider shrink-0">Filter:</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter truncate">
                  {props.filterKategori.includes('Semua') ? 'Semua Kategori' : props.filterKategori.join(', ')}
                  {props.filterPencarian ? ` • "${props.filterPencarian}"` : ''}
                  {` • ${props.filterTanggalMulai === props.filterTanggalAkhir ? props.filterTanggalMulai : `${props.filterTanggalMulai} - ${props.filterTanggalAkhir}`}`}
                </span>
              </div>
            </div>
            <i className="fa-solid fa-chevron-down text-[8px] text-slate-400 ml-1 shrink-0"></i>
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          <div className="bg-white rounded-lg py-1.5 px-1 border border-slate-100 flex flex-col items-center justify-center">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">TRX</div>
            <div className="text-[14px] font-black text-blue-600 leading-none">{todayCount}</div>
          </div>
          <div className="bg-white rounded-lg py-1.5 px-1 border border-slate-100 flex flex-col items-center justify-center">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">NOMINAL</div>
            <div className="text-[12px] font-black text-slate-800 leading-none truncate w-full text-center px-1">
              {formatRupiah(todayVolume).replace(',00', '').replace('Rp ', '')}
            </div>
          </div>
          <div className="bg-white rounded-lg py-1.5 px-1 border border-slate-100 flex flex-col items-center justify-center">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">ADMIN</div>
            <div className="text-[12px] font-black text-emerald-600 leading-none truncate w-full text-center px-1">
              {formatRupiah(todayAdmin).replace(',00', '').replace('Rp ', '')}
            </div>
          </div>
        </div>

        {/* DAFTAR TRANSAKSI SECTION */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 bg-violet-600 rounded-full"></div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Daftar Transaksi</h3>
        </div>

        <div className="flex flex-col">
          <div className="divide-y divide-slate-200 border-t border-slate-200">
            {paginatedTransactions.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tidak ada transaksi</p>
              </div>
            ) : (
              paginatedTransactions.map((t, i) => (
                <TransactionRow key={t.id} t={t} index={startIndex + i} onEdit={props.onEdit} onDelete={props.onDelete} kasirRole={props.kasirRole} />
              ))
            )}
          </div>

          {/* FOOTER TOTAL (Single Line with Dividers) */}
          <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100 bg-white shadow-sm rounded-b-2xl">
            <div className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">
              {filteredTransactions.length} Items
            </div>
            <div className="w-px h-2.5 bg-slate-200"></div>
            <div className="text-blue-600 font-black text-[10px] whitespace-nowrap uppercase flex items-center gap-1">
              <span className="text-[8px] opacity-60">NOM:</span>
              {formatRupiah(totalNominal).replace(',00', '')}
            </div>
            <div className="w-px h-2.5 bg-slate-200"></div>
            <div className="text-emerald-600 font-black text-[10px] whitespace-nowrap uppercase flex items-center gap-1">
              <span className="text-[8px] opacity-60">ADM:</span>
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

        {/* RIWAYAT TAMBAH SALDO SECTION (Rapat) */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <i className="fa-solid fa-wallet text-blue-600 text-xs"></i>
            <h3 className="text-[10px] font-black text-slate-800 tracking-widest">RIWAYAT TAMBAH SALDO</h3>
          </div>

          <div className="flex gap-1 mb-4">
            {['Semua', 'Saldo Bank', 'Saldo Real', 'Modal Tunai'].map(f => (
              <button 
                key={f}
                onClick={() => props.setActiveSaldoFilter(f)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[8px] font-black transition-all border",
                  props.activeSaldoFilter === f 
                    ? "bg-violet-600 border-violet-600 text-white" 
                    : "bg-white border-slate-100 text-slate-400"
                )}
              >
                {f.replace('Saldo ', '').toUpperCase()}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-50">
              {filteredSaldoTransactions.length === 0 ? (
                <div className="py-6 text-center text-slate-300 text-[10px] font-bold">KOSONG</div>
              ) : (
                filteredSaldoTransactions.map((t, i) => (
                  <div key={t.id} className="py-1.5 px-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="text-[9px] font-black text-slate-300 w-4">{i+1}</div>
                        <div className="flex flex-col gap-0">
                           <div className={cn(
                             "text-[13px] font-black uppercase leading-tight",
                             t.kategori.includes('Bank') ? "text-blue-600" : 
                             t.kategori.includes('Real') ? "text-emerald-600" : "text-fuchsia-600"
                           )}>
                             {t.kategori.replace('Isi ', 'TAMBAH ')}
                           </div>
                           <div className="text-[10px] text-slate-400 font-bold">
                              {(() => {
                                const d = parseLocalISO(t.timestamp);
                                return `${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                              })()}
                           </div>
                        </div>
                     </div>
                      <div className="text-right flex flex-col items-end gap-0">
                        <div className="text-[13px] font-black text-slate-800 leading-tight">{formatRupiah(t.nominal).replace(',00', '')}</div>
                        <div className="text-[10px] text-slate-400 font-bold italic truncate max-w-[120px]">{t.keterangan || '-'}</div>
                     </div>
                  </div>
                ))
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
                <div className="grid grid-cols-2 gap-2">
                  {['Semua', 'Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris'].map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        checked={localKategori.includes(cat)}
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
                      <span className="text-xs font-bold text-slate-700">{cat === 'Semua' ? 'Semua Kategori' : cat}</span>
                    </label>
                  ))}
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
