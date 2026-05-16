import React, { useState } from 'react'
import type { Transaction } from '../types'
import { cn, parseLocalISO, getLocalDateString } from '../lib/utils'

interface TransactionRowProps {
  t: Transaction
  index: number
  onEdit: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => void
  kasirRole?: string
}

const TransactionRow: React.FC<TransactionRowProps> = ({ t, index, onEdit, onDelete, kasirRole }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dateObj = parseLocalISO(t.timestamp)
  const jam = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(t);
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(t);
  }

  const isToday = t.timestamp.startsWith(getLocalDateString())
  const canEdit = isToday
  const canDelete = isToday && kasirRole === 'owner'

  return (
    <div className="flex flex-col group transaction-row-container">
      <div 
        className="flex justify-between items-start py-1 cursor-pointer active:bg-slate-50 transition-all px-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex gap-3">
          {/* NOMOR & ACTION */}
          <div className="flex flex-col items-center justify-center w-7 gap-1 mt-0.5">
            <span className="text-[12px] font-bold text-slate-400">{index + 1}</span>
            <i className={cn("fa-solid fa-chevron-down text-[8px] text-blue-500 transition-transform duration-300", isOpen && "rotate-180")}></i>
          </div>

          {/* INFO UTAMA */}
          <div className="flex flex-col gap-0">
            <div className="text-[16px] font-black text-slate-800 tracking-tight uppercase leading-tight">
               {t.kategori}
            </div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em]">
               {dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • {jam}
            </div>
          </div>
        </div>

        {/* NOMINAL & ADMIN */}
        <div className="flex flex-col items-end gap-0">
          <div className={cn(
            "text-[16px] font-black tracking-tight leading-tight",
            t.kategori === 'Tarik Tunai' ? "text-rose-600" : "text-slate-800"
          )}>
            {t.nominal.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-emerald-600 font-extrabold uppercase">
            Admin: {t.adminFee.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {isOpen && (
        <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100 flex justify-between items-center animate-in slide-in-from-top-1 duration-200">
           <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Keterangan:</span>
              <span className="text-[10px] font-bold text-slate-700 leading-tight max-w-[180px]">
                {t.keterangan || '-'}
                {t.isEdited && <span className="ml-1 text-[7px] bg-amber-100 text-amber-700 px-1 rounded font-black">EDIT</span>}
              </span>
           </div>
           
           <div className="flex gap-1.5">
              {canEdit ? (
                <button 
                  onClick={handleEditClick}
                  className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[9px] font-black flex items-center gap-1.5 hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                >
                  <i className="fa-solid fa-pen text-[7px]"></i> EDIT
                </button>
              ) : (
                <span className="text-[8px] text-slate-400 font-bold italic py-1 px-2 bg-slate-100/50 rounded-lg">
                  LOCKED
                </span>
              )}
              {canDelete && (
                <button 
                  onClick={handleDeleteClick}
                  className="bg-rose-50 text-rose-600 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                >
                  <i className="fa-solid fa-trash-can text-[9px]"></i>
                </button>
              )}
           </div>
        </div>
      )}
    </div>
  )
}

export default TransactionRow
