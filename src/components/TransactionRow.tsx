import React, { useState } from 'react'
import type { Transaction } from '../types'
import { cn } from '../lib/utils'

interface TransactionRowProps {
  t: Transaction
  index: number
  onEdit: (tx: Transaction) => void
}

const TransactionRow: React.FC<TransactionRowProps> = ({ t, index, onEdit }) => {
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
          "grid grid-cols-[30px_45px_70px_1fr_60px_35px] gap-1 px-3 py-4 items-center text-[11px] text-gray-700 hover:bg-gray-50/80 cursor-pointer border-l-[3px] transition-all relative overflow-hidden",
          catColor
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-bold text-gray-400 text-center text-[10px]">{index + 1}</span>
        <span className="text-gray-500 text-[10px] text-center font-bold tracking-tighter">{jam}</span>
        <span className="flex justify-center">
          <span className={cn("px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-tighter block text-center truncate max-w-[60px]", catBadge)}>
            {t.kategori === 'Transfer Bank' ? 'TRANSFER' : 
             t.kategori === 'Order Kuota' ? 'KUOTA' : t.kategori}
          </span>
        </span>
        <span className="font-black text-black text-sm tabular-nums text-right pr-4 tracking-tighter">
          {t.nominal.toLocaleString('id-ID')}
        </span>
        <span className="font-bold text-emerald-600 text-xs tabular-nums text-right pr-2 tracking-tighter">
          {t.adminFee.toLocaleString('id-ID')}
        </span>
        <span className="flex justify-center items-center">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/40 flex items-center justify-center transition-all duration-300 active:scale-90">
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

export default TransactionRow
