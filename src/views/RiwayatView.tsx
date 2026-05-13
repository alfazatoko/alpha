import React, { useState } from 'react'
import { formatRupiah, cn } from '../lib/utils'
import type { Transaction } from '../types'
import TransactionRow from '../components/TransactionRow'

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
  onEdit: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => void
}

const RiwayatView: React.FC<RiwayatViewProps> = (props) => {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const filteredTransactions = props.transactions.filter(t => {
    if (t.kategori.startsWith('Isi')) return false
    const date = t.timestamp.split('T')[0]
    const matchDate = date >= props.filterTanggalMulai && date <= props.filterTanggalAkhir
    const matchKategori = props.filterKategori === 'Semua' || t.kategori === props.filterKategori
    const matchSearch = t.keterangan.toLowerCase().includes(props.filterPencarian.toLowerCase())
    return matchDate && matchKategori && matchSearch
  })

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage)

  const totalNominal = filteredTransactions.reduce((s, t) => s + t.nominal, 0)
  const totalAdmin = filteredTransactions.reduce((s, t) => s + t.adminFee, 0)

  // Perhitungan Transaksi Hari Ini Saja (Abaikan Filter)
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayTransactions = props.transactions.filter(t => {
    if (t.kategori.startsWith('Isi')) return false
    return t.timestamp.split('T')[0] === todayStr
  })
  const todayCount = todayTransactions.length
  const todayVolume = todayTransactions.reduce((s, t) => s + t.nominal, 0)
  const todayLaba = todayTransactions.reduce((s, t) => s + t.adminFee, 0)

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
    <div className={cn("page-view hide-scrollbar bg-gray-50/50", props.active && "active")}>
      <div className="px-5 pt-7 pb-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-b-[2rem] shadow-lg shadow-indigo-500/20 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg tracking-wide text-white">Riwayat Transaksi</h2>
            <p className="text-violet-100 text-[11px] mt-1 opacity-90">Pantau semua arus kas keluar masuk</p>
          </div>
        </div>
        {props.kasirRole === 'owner' && props.setFilterKasir && (
          <div className="mt-3 bg-white/10 p-2 rounded-xl border border-white/20 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider"><i className="fa-solid fa-user-tie mr-1"></i> Mode Pantau Kasir:</span>
            <select 
              value={props.filterKasir || 'Semua'}
              onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
              className="bg-white text-violet-700 text-[10px] font-black rounded-lg px-2 py-1 outline-none border-none appearance-none"
            >
              <option value="Semua">Semua Kasir</option>
              <option value="kasir1">Kasir 1</option>
              <option value="kasir2">Kasir 2</option>
            </select>
          </div>
        )}
      </div>

      <div className="px-5 pb-8">
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] font-bold text-gray-400 mb-1 ml-1 block uppercase">Mulai</label>
              <input 
                type="date" 
                value={props.filterTanggalMulai}
                onChange={(e) => props.setFilterTanggalMulai(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" 
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-bold text-gray-400 mb-1 ml-1 block uppercase">Akhir</label>
              <input 
                type="date" 
                value={props.filterTanggalAkhir}
                onChange={(e) => props.setFilterTanggalAkhir(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" 
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-[2] relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-gray-300 text-[10px]"></i>
              <input 
                type="text" 
                placeholder="Cari keterangan..." 
                value={props.filterPencarian}
                onChange={(e) => props.setFilterPencarian(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-8 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" 
              />
            </div>
            <select 
              value={props.filterKategori}
              onChange={(e) => props.setFilterKategori(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-2 py-2.5 text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all appearance-none text-center"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Transfer Bank">Transfer Bank</option>
              <option value="DANA">DANA</option>
              <option value="FLIP">FLIP</option>
              <option value="Order Kuota">Order Kuota</option>
              <option value="Tarik Tunai">Tarik Tunai</option>
              <option value="Aksesoris">Aksesoris</option>
            </select>
          </div>
        </div>

        {/* SUMMARY HARI INI */}
        <div className="flex gap-2 mb-6">
          <div className="flex-[0.8] bg-white rounded-2xl py-3 pl-3 pr-1 shadow-sm border border-gray-50 border-l-[5px] border-l-blue-500">
            <div className="text-[9px] font-black text-slate-500 mb-1">JUMLAH TRX</div>
            <div className="text-[13px] font-black text-slate-800 truncate">{todayCount}</div>
          </div>
          <div className="flex-1 bg-white rounded-2xl py-3 pl-3 pr-1 shadow-sm border border-gray-50 border-l-[5px] border-l-purple-500">
            <div className="text-[9px] font-black text-slate-500 mb-1">TOTAL VOLUME</div>
            <div className="text-[13px] font-black text-slate-800 truncate">{formatRupiah(todayVolume)}</div>
          </div>
          <div className="flex-1 bg-white rounded-2xl py-3 pl-3 pr-1 shadow-sm border border-gray-50 border-l-[5px] border-l-emerald-500">
            <div className="text-[9px] font-black text-slate-500 mb-1">TOTAL LABA</div>
            <div className="text-[13px] font-black text-emerald-600 truncate">{formatRupiah(todayLaba)}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-list-ul text-violet-500"></i> Daftar Transaksi
          </h3>
        </div>

        <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm mb-8">
          <div className="grid grid-cols-[30px_45px_70px_1fr_60px_35px] gap-1 text-[9px] font-black text-gray-400 bg-gray-50/50 px-3 py-3 uppercase tracking-tighter border-b border-gray-50 items-center">
            <span className="text-center">#</span>
            <span className="text-center">Jam</span>
            <span className="text-center">Tipe</span>
            <span className="text-right pr-4">Nominal</span>
            <span className="text-right pr-2">ADMIN</span>
            <span></span>
          </div>
          <div className="divide-y divide-gray-50">
            {paginatedTransactions.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <i className="fa-solid fa-folder-open text-gray-200 text-3xl mb-2"></i>
                <p className="text-xs text-gray-400 font-medium">Tidak ada transaksi</p>
              </div>
            ) : (
              paginatedTransactions.map((t, i) => (
                <TransactionRow key={t.id} t={t} index={startIndex + i} onEdit={props.onEdit} onDelete={props.onDelete} kasirRole={props.kasirRole} />
              ))
            )}
          </div>
          <div className="px-5 py-4 bg-white text-[9px] font-bold text-gray-600 flex justify-between items-center border-t border-gray-50">
            <span className="bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm text-gray-500 font-black">{filteredTransactions.length} item</span>
            <div className="flex items-center gap-3 pr-2">
              <span className="text-blue-700 font-black text-[10px]">Nom: {formatRupiah(totalNominal)}</span>
              <span className="w-px h-3 bg-gray-200"></span>
              <span className="text-emerald-600 font-black text-[10px]">Adm: {formatRupiah(totalAdmin)}</span>
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-1.5 mb-8">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={cn(
                  "w-8 h-8 rounded-xl font-black text-[10px] transition-all",
                  currentPage === i + 1 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110" 
                    : "bg-white text-gray-400 border border-gray-200 hover:border-blue-400"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-plus-circle text-emerald-500"></i> Riwayat Tambah Saldo
          </h3>
        </div>

        <div className="flex gap-2 mb-4 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm inline-flex overflow-x-auto hide-scrollbar max-w-full">
          {['Semua', 'Saldo Bank', 'Saldo Real', 'Modal Tunai'].map(f => (
            <button 
              key={f}
              onClick={() => props.setActiveSaldoFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap",
                props.activeSaldoFilter === f 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm mb-4">
          <div className="grid grid-cols-5 gap-1 text-[9px] font-black text-gray-400 bg-gray-50/50 px-4 py-3 uppercase tracking-tighter border-b border-gray-50">
            <span>#</span><span>Jam</span><span>Jenis</span><span>Nominal</span><span>Ket</span>
          </div>
          <div className="divide-y divide-gray-50">
            {filteredSaldoTransactions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-xs font-medium">Tidak ada riwayat</div>
            ) : (
              filteredSaldoTransactions.map((t, i) => (
                <div key={t.id} className="grid grid-cols-5 gap-1 px-4 py-3 items-center text-[11px] text-gray-700 hover:bg-gray-50/50 transition-colors">
                  <span className="font-bold text-gray-400">{i+1}</span>
                  <span className="text-gray-500">{new Date(t.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-bold",
                      t.kategori.includes('Bank') ? "bg-blue-50 text-blue-600" : 
                      t.kategori.includes('Real') ? "bg-emerald-50 text-emerald-600" : "bg-fuchsia-50 text-fuchsia-600"
                    )}>
                      {t.kategori.replace('Isi ', '')}
                    </span>
                  </span>
                  <span className="font-black text-gray-800">{formatRupiah(t.nominal)}</span>
                  <span className="truncate text-gray-400 italic text-[10px]">{t.keterangan}</span>
                </div>
              ))
            )}
          </div>
          {filteredSaldoTransactions.length > 0 && (
            <div className="px-5 py-4 bg-white text-[9px] font-bold text-gray-600 flex justify-between items-center border-t border-gray-50">
              <span className="bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm text-gray-500 font-black">{filteredSaldoTransactions.length} item</span>
              <div className="flex items-center gap-3 pr-2">
                <span className="text-emerald-700 font-black text-[10px]">TOTAL: {formatRupiah(totalSaldoNominal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


export default RiwayatView
