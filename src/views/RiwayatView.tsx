import React, { useState } from 'react'
import { formatRupiah, cn } from '../lib/utils'
import type { Transaction } from '../types'

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
  onEdit: (tx: Transaction) => void
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

  const filteredSaldoTransactions = props.transactions.filter(t => {
    if (!t.kategori.startsWith('Isi')) return false
    const date = t.timestamp.split('T')[0]
    const matchDate = date >= props.filterTanggalMulai && date <= props.filterTanggalAkhir
    const matchType = props.activeSaldoFilter === 'Semua' || 
                    (props.activeSaldoFilter === 'Bank' && t.kategori.includes('Bank')) ||
                    (props.activeSaldoFilter === 'TUNAI' && t.kategori.includes('Penjualan'))
    return matchDate && matchType
  })

  return (
    <div className={cn("page-view hide-scrollbar bg-gray-50/50", props.active && "active")}>
      <div className="px-5 pt-7 pb-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-b-[2rem] shadow-lg shadow-indigo-500/20 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg tracking-wide text-white">Riwayat Transaksi</h2>
            <p className="text-violet-100 text-[11px] mt-1 opacity-90">Pantau semua arus kas keluar masuk</p>
          </div>
          <span className="text-[10px] bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full font-bold border border-white/30">
            LENGKAP
          </span>
        </div>
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
              <option value="Semua">Kategori</option>
              <option value="Transfer Bank">Transfer</option>
              <option value="DANA">DANA</option>
              <option value="FLIP">FLIP</option>
              <option value="Order Kuota">Kuota</option>
              <option value="Tarik Tunai">Tarik</option>
              <option value="Aksesoris">Aksesoris</option>
            </select>
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
                <TransactionRow key={t.id} t={t} index={startIndex + i} onEdit={props.onEdit} />
              ))
            )}
          </div>
          <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white text-[9px] font-bold text-gray-600 flex justify-between items-center border-t border-gray-50">
            <span className="bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">{filteredTransactions.length} item</span>
            <div className="flex gap-3">
              <span className="text-blue-700 font-black">Nom: {formatRupiah(totalNominal)}</span>
              <span className="text-emerald-600 font-black border-l border-gray-200 pl-3">Adm: {formatRupiah(totalAdmin)}</span>
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

        <div className="flex gap-2 mb-4 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm inline-flex">
          {['Semua', 'Bank', 'TUNAI'].map(f => (
            <button 
              key={f}
              onClick={() => props.setActiveSaldoFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all",
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
                      t.kategori.includes('Bank') ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
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
        </div>
      </div>
    </div>
  )
}

const TransactionRow: React.FC<{ t: Transaction, index: number, onEdit: (tx: Transaction) => void }> = ({ t, index, onEdit }) => {
  const [isOpen, setIsOpen] = useState(false)
  const jam = new Date(t.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const fullDate = new Date(t.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  
  // Warna dinamis berdasarkan kategori
  let catColor = "border-gray-200";
  let catBadge = "bg-gray-100 text-gray-600";
  if (t.kategori === 'Transfer Bank') { catColor = "border-blue-400"; catBadge = "bg-blue-50 text-blue-600"; }
  if (t.kategori === 'DANA') { catColor = "border-cyan-400"; catBadge = "bg-cyan-50 text-cyan-600"; }
  if (t.kategori === 'FLIP') { catColor = "border-orange-400"; catBadge = "bg-orange-50 text-orange-600"; }
  if (t.kategori === 'Order Kuota') { catColor = "border-emerald-400"; catBadge = "bg-emerald-50 text-emerald-600"; }
  if (t.kategori === 'Tarik Tunai') { catColor = "border-rose-400"; catBadge = "bg-rose-50 text-rose-600"; }
  if (t.kategori === 'Aksesoris') { catColor = "border-fuchsia-400"; catBadge = "bg-fuchsia-50 text-fuchsia-600"; }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(t);
  }

  return (
    <>
      <div 
        className={cn(
          "grid grid-cols-[30px_45px_70px_1fr_60px_35px] gap-1 px-3 py-3.5 items-center text-[11px] text-gray-700 hover:bg-gray-50 cursor-pointer border-l-4 transition-all",
          catColor
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-bold text-gray-400 text-center text-[10px]">{index + 1}</span>
        <span className="text-gray-500 text-[10px] text-center font-bold">{jam}</span>
        <span className="flex justify-center">
          <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter block text-center truncate max-w-[65px]", catBadge)}>
            {t.kategori === 'Transfer Bank' ? 'Transfer' : 
             t.kategori === 'Order Kuota' ? 'Kuota' : t.kategori}
          </span>
        </span>
        <span className="font-black text-gray-800 text-xs tabular-nums text-right pr-4">
          {t.nominal.toLocaleString('id-ID')}
        </span>
        <span className="font-bold text-emerald-600 text-xs tabular-nums text-right pr-2">
          {t.adminFee.toLocaleString('id-ID')}
        </span>
        <span className="flex justify-center items-center">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20 flex items-center justify-center transition-all duration-300">
            <i className={cn("fa-solid fa-chevron-down text-[8px] transition-transform duration-300", isOpen && "rotate-180")}></i>
          </div>
        </span>
      </div>
      {isOpen && (
        <div className="bg-gray-50 border-t border-gray-100 block w-full">
          <div className="py-4 px-6 space-y-4">
            {/* Baris 2: Detail Utama & Edit */}
            <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 flex items-center gap-2">
                  <span className="w-20 font-bold text-gray-400 uppercase tracking-widest text-[8px]">Tanggal:</span> 
                  <span className="text-gray-700 font-black flex items-center gap-2">
                    {fullDate} - {jam}
                    {t.isEdited && (
                      <span className="bg-amber-50 text-amber-600 text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-200">
                        <i className="fa-solid fa-eye text-[7px]"></i> TEREDIT
                      </span>
                    )}
                  </span>
                </p>
                <p className="text-[10px] text-gray-500 flex items-start gap-2">
                  <span className="w-20 font-bold text-gray-400 uppercase tracking-widest text-[8px] mt-0.5">Keterangan:</span> 
                  <span className="text-gray-700 font-black leading-relaxed max-w-[220px] text-[11px]">{t.keterangan || '-'}</span>
                </p>
              </div>
              <button 
                onClick={handleEditClick}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-pen-to-square"></i> EDIT
              </button>
            </div>

            {/* Baris 3: Data Asli (Jika Ada) */}
            {t.isEdited && (
              <div className="bg-amber-50/50 p-3 rounded-2xl border border-dashed border-amber-200 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-clock-rotate-left text-amber-600 text-[10px]"></i>
                  <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Data Sebelum Edit</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/80 p-2 rounded-xl border border-amber-100/50">
                    <p className="text-[7px] text-amber-600/60 uppercase font-black tracking-tighter">Kategori</p>
                    <p className="text-[10px] font-black text-gray-400 italic line-through">{t.originalKategori}</p>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-amber-100/50">
                    <p className="text-[7px] text-amber-600/60 uppercase font-black tracking-tighter">Nominal</p>
                    <p className="text-[10px] font-black text-gray-400 italic line-through">{t.originalNominal?.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-amber-100/50">
                    <p className="text-[7px] text-amber-600/60 uppercase font-black tracking-tighter">Admin</p>
                    <p className="text-[10px] font-black text-gray-400 italic line-through">{t.originalAdminFee?.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default RiwayatView
