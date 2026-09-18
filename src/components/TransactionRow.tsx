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

  const isKhusus = (t.keterangan || '').includes('[KHUSUS]')
  const isNonTunai = (t.keterangan || '').includes('[NON_TUNAI]')
  const rowColorClass = isKhusus ? "text-orange-600" : isNonTunai ? "text-purple-600" : "text-black"

  const formatRp = (num: number) => num.toLocaleString('id-ID');
  const formatK = (num: number) => (num % 1000 === 0) ? `${num / 1000}K` : formatRp(num);

  let formattedKeterangan = t.keterangan ? t.keterangan.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '-';
  let detailTable: React.ReactNode = null;

  if (t.kategori === 'Tarik Tunai' && t.keterangan?.startsWith('TARIK_TUNAI|')) {
    const parts = t.keterangan.split('|');
    const metode = parts[1]?.replace(' [ADMIN_DALAM]', '')?.replace(' [NON_TUNAI]', '') || 'Unknown';
    
    const adm = t.adminFee;
    const nom = t.nominal;
    const adminPotong = t.keterangan.includes('[ADMIN_DALAM]');
    
    if (adminPotong) {
      // Checkbox DALAM = DICEKLIS (Admin Potong Saldo)
      formattedKeterangan = `${metode} | Tarik ${formatK(nom - adm)} | (Admin Dalam) ${formatK(adm)} Potong saldo`;
      
      detailTable = (
        <div className="flex flex-col border border-slate-300 rounded-md overflow-hidden bg-white text-[10px] font-bold text-slate-600 mt-1 w-full">
           <div className="flex justify-between border-b border-slate-200 p-1.5 bg-slate-50">
              <span className="text-slate-500">Metode</span>
              <span className="text-slate-800 text-right flex-1 ml-2">{metode} <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded ml-1">ADMIN DALAM</span></span>
           </div>
           <div className="flex justify-between border-b border-slate-200 p-1.5">
              <span className="text-slate-500">Nominal Tarik</span>
              <span className="text-slate-800 text-right flex-1">Rp {formatRp(nom)}</span>
           </div>
           <div className="flex justify-between border-b border-slate-200 p-1.5">
              <span className="text-slate-500">Admin (Potong Saldo)</span>
              <span className="text-rose-600 font-black text-right flex-1">- Rp {formatRp(adm)}</span>
           </div>
           <div className="flex justify-between p-1.5 bg-blue-50/50 items-center">
              <span className="text-slate-700 font-black text-[9px]">UANG DISERAHKAN</span>
              <span className="text-blue-700 text-[12px] font-black text-right flex-1">
                 Rp {formatRp(nom - adm)}
              </span>
           </div>
        </div>
      );
    } else {
      // Checkbox DALAM = TIDAK DICEKLIS (Admin Tunai)
      formattedKeterangan = `${metode} | Tarik ${formatK(nom)} | Admin Tunai ${formatK(adm)}`;
      
      detailTable = (
        <div className="flex flex-col border border-slate-300 rounded-md overflow-hidden bg-white text-[10px] font-bold text-slate-600 mt-1 w-full">
           <div className="flex justify-between border-b border-slate-200 p-1.5 bg-slate-50">
              <span className="text-slate-500">Metode</span>
              <span className="text-slate-800 text-right flex-1 ml-2">{metode} <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded ml-1">ADMIN TUNAI</span></span>
           </div>
           <div className="flex justify-between border-b border-slate-200 p-1.5">
              <span className="text-slate-500">Nominal Tarik</span>
              <span className="text-slate-800 text-right flex-1">Rp {formatRp(nom)}</span>
           </div>
           <div className="flex justify-between border-b border-slate-200 p-1.5">
              <span className="text-slate-500">Admin (Tunai)</span>
              <span className="text-emerald-600 font-black text-right flex-1">+ Rp {formatRp(adm)}</span>
           </div>
           <div className="flex justify-between p-1.5 bg-blue-50/50 items-center">
              <span className="text-slate-700 font-black text-[9px]">UANG DISERAHKAN</span>
              <span className="text-blue-700 text-[12px] font-black text-right flex-1">
                 Rp {formatRp(nom)}
              </span>
           </div>
        </div>
      );
    }
  } else {
     // Generic table format for other transactions
      detailTable = (
        <div className="flex flex-col border border-slate-300 rounded-md overflow-hidden bg-white text-[10px] font-bold text-slate-600 mt-1 w-full">
           <div className="flex justify-between border-b border-slate-200 p-1.5 bg-slate-50">
              <span className="text-slate-500 min-w-[60px]">Keterangan</span>
              <span className="text-slate-800 text-right flex-1 ml-4 leading-tight break-words">{formattedKeterangan}</span>
           </div>
           <div className="flex justify-between border-b border-slate-200 p-1.5">
              <span className="text-slate-500">Total Nominal</span>
              <span className="text-slate-800 font-black text-right flex-1">Rp {formatRp(t.nominal)}</span>
           </div>
           {t.adminFee > 0 && (
           <div className="flex justify-between p-1.5 bg-rose-50/30">
              <span className="text-slate-500">Admin Fee</span>
              <span className="text-rose-600 font-black text-right flex-1">Rp {formatRp(t.adminFee)}</span>
           </div>
           )}
        </div>
      );
  }

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
          <div className="flex flex-col gap-[2px]">
            <div className={cn("text-[13px] font-black tracking-tight uppercase leading-tight", rowColorClass)}>
               {t.kategori}
            </div>
            <div className="text-[9px] text-blue-900 dark:text-blue-300 font-bold tracking-tight truncate max-w-[180px] sm:max-w-[260px] leading-none">
               {formattedKeterangan}
            </div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold tracking-tight leading-none">
               {dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} • {jam}
            </div>
          </div>
        </div>

        {/* NOMINAL & ADMIN */}
        <div className="flex flex-col items-end gap-0 pr-1 mt-0.5 shrink-0">
          <div className={cn(
            "text-[13px] font-black tracking-tight leading-tight",
            isKhusus ? "text-orange-600" : isNonTunai ? "text-purple-600" : (t.kategori === 'Tarik Tunai' ? "text-rose-600" : "text-black")
          )}>
            {t.nominal.toLocaleString('id-ID')}
          </div>
          <div className={cn(
            "text-[11px] font-extrabold uppercase", 
            isKhusus ? "text-orange-400" : (isNonTunai || (t.keterangan || '').includes('[ADMIN_DALAM]')) ? "text-[#0066AE]" : "text-emerald-600"
          )}>
            Admin: {t.adminFee.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {isOpen && (
        <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100 flex flex-col gap-2 animate-in slide-in-from-top-1 duration-200">
           <div className="flex flex-col gap-0.5 w-full">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Rincian Transaksi:</span>
                {t.isEdited && <span className="text-[7px] bg-amber-100 text-amber-700 px-1 py-[2px] rounded font-black leading-none">EDITED</span>}
              </div>
              
              {detailTable}
              
              <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-200/50">
                 <div className="flex flex-col gap-0.5">
                   <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Tanggal:</span>
                   <span className="text-[10px] font-bold text-slate-700 leading-tight">
                     {dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • {jam}
                   </span>
                 </div>
                 
                 <div className="flex gap-1.5 shrink-0">
                    {canEdit ? (
                      <button 
                        onClick={handleEditClick}
                        className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[9px] font-black flex items-center gap-1.5 hover:bg-blue-600 hover:text-white transition-all border border-blue-100 shadow-sm h-[26px]"
                      >
                        <i className="fa-solid fa-pen text-[7px]"></i> EDIT
                      </button>
                    ) : (
                      <span className="text-[8px] text-slate-400 font-bold italic py-1 px-2 bg-slate-100/50 rounded-lg h-[24px] flex items-center">
                        LOCKED
                      </span>
                    )}
                    {canDelete && (
                      <button 
                        onClick={handleDeleteClick}
                        className="bg-rose-50 text-rose-600 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm"
                      >
                        <i className="fa-solid fa-trash-can text-[9px]"></i>
                      </button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}

export default TransactionRow
