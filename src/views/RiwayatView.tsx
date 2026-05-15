import React, { useState } from 'react'
import { formatRupiah, cn, parseLocalISO } from '../lib/utils'
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
  filterKategori: string
  setFilterKategori: (v: string) => void
  activeSaldoFilter: string
  setActiveSaldoFilter: (v: string) => void
  kasirRole?: string
  filterKasir?: string
  setFilterKasir?: (v: string) => void
  kasirList?: Record<string, KasirAccount>
  onEdit: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => void
}

const RiwayatView: React.FC<RiwayatViewProps> = (props) => {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Local date state (hanya diterapkan saat klik TAMPILKAN)
  const [localDari, setLocalDari] = useState(props.filterTanggalMulai)
  const [localSampai, setLocalSampai] = useState(props.filterTanggalAkhir)

  const handleTampilkan = () => {
    props.setFilterTanggalMulai(localDari)
    props.setFilterTanggalAkhir(localSampai)
    setCurrentPage(1)
  }

  // 1. Filter berdasarkan Rentang Tanggal (Untuk Kartu Dashboard Atas)
  const dateFilteredTransactions = props.transactions.filter(t => {
    if (t.kategori.startsWith('Isi')) return false
    const date = t.timestamp.split('T')[0]
    return date >= props.filterTanggalMulai && date <= props.filterTanggalAkhir
  })

  // 2. Filter berdasarkan Kategori, Pencarian, & Kasir (Untuk List & Footer Bawah)
  const filteredTransactions = dateFilteredTransactions.filter(t => {
    const matchKategori = props.filterKategori === 'Semua' || t.kategori === props.filterKategori
    const matchSearch = !props.filterPencarian || 
                      t.keterangan.toLowerCase().includes(props.filterPencarian.toLowerCase()) ||
                      t.nominal.toString().includes(props.filterPencarian)
    const matchKasir = !props.filterKasir || props.filterKasir === 'Semua' || t.kasir_id === props.filterKasir
    return matchKategori && matchSearch && matchKasir
  })

  // Summary untuk Kartu Atas (Total Hari/Rentang yang dipilih)
  const todayCount = dateFilteredTransactions.length
  const todayVolume = dateFilteredTransactions.reduce((s, t) => s + t.nominal, 0)
  const todayAdmin = dateFilteredTransactions.reduce((s, t) => s + t.adminFee, 0)

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
      {/* HEADER */}
      <div className="px-1.5 pt-6 pb-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-b-[2rem] shadow-lg shadow-indigo-500/20">
        <h2 className="font-bold text-lg tracking-wide text-white">Riwayat Transaksi</h2>
        <p className="text-violet-100 text-[11px] mt-0.5 opacity-90">Pantau semua arus kas keluar masuk</p>

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
        {/* CARI + KATEGORI (1 baris, tanpa label) */}
        <div className="flex gap-1.5 mb-2">
          <div className="relative flex-[2]">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
            <input 
              type="text" 
              placeholder="Cari..." 
              value={props.filterPencarian}
              onChange={(e) => props.setFilterPencarian(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-[11px] focus:outline-none focus:border-violet-500 font-bold text-slate-700" 
            />
          </div>
          <div className="relative flex-1">
            <select 
              value={props.filterKategori}
              onChange={(e) => props.setFilterKategori(e.target.value)}
              className="w-full h-full bg-white bg-none border border-slate-200 pl-2 pr-6 rounded-lg text-[11px] font-black text-slate-700 focus:outline-none focus:border-violet-500 appearance-none shadow-sm"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Transfer Bank">Transfer Bank</option>
              <option value="DANA">DANA</option>
              <option value="FLIP">FLIP</option>
              <option value="Order Kuota">Order Kuota</option>
              <option value="Tarik Tunai">Tarik Tunai</option>
              <option value="Aksesoris">Aksesoris</option>
            </select>
            <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 pointer-events-none"></i>
          </div>
        </div>

        {/* TANGGAL + TAMPILKAN (1 baris, tanpa label) */}
        <div className="flex gap-1.5 mb-2 items-center">
          <div 
            className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg py-2 px-3 cursor-pointer shadow-sm"
            onClick={(e) => {
              const input = (e.currentTarget as HTMLElement).querySelector('input');
              if (input) (input as any).showPicker?.();
            }}
          >
            <input 
              type="date"
              className="w-full text-[11px] font-bold text-slate-700 focus:outline-none bg-transparent pointer-events-none"
              value={localDari}
              onChange={(e) => setLocalDari(e.target.value)}
            />
          </div>
          <div 
            className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg py-2 px-3 cursor-pointer shadow-sm"
            onClick={(e) => {
              const input = (e.currentTarget as HTMLElement).querySelector('input');
              if (input) (input as any).showPicker?.();
            }}
          >
            <input 
              type="date"
              className="w-full text-[11px] font-bold text-slate-700 focus:outline-none bg-transparent pointer-events-none"
              value={localSampai}
              onChange={(e) => setLocalSampai(e.target.value)}
            />
          </div>
          <button 
            onClick={handleTampilkan}
            className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md shadow-indigo-500/20 whitespace-nowrap"
          >
            CEK
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
                  <div key={t.id} className="p-5 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="text-[9px] font-black text-slate-300 w-4">{i+1}</div>
                        <div className="flex flex-col gap-0.5">
                           <div className={cn(
                             "text-[9px] font-black uppercase",
                             t.kategori.includes('Bank') ? "text-blue-600" : 
                             t.kategori.includes('Real') ? "text-emerald-600" : "text-fuchsia-600"
                           )}>
                             {t.kategori.replace('Isi ', '')}
                           </div>
                           <div className="text-[10px] text-slate-400 font-bold">
                              {(() => {
                                const d = parseLocalISO(t.timestamp);
                                return `${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                              })()}
                           </div>
                        </div>
                     </div>
                     <div className="text-right flex flex-col items-end gap-0.5">
                        <div className="text-sm font-black text-slate-800">{formatRupiah(t.nominal).replace(',00', '')}</div>
                        <div className="text-[9px] text-slate-400 font-bold italic truncate max-w-[120px]">{t.keterangan || '-'}</div>
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
    </div>
  )
}


export default RiwayatView
