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
  let displayKategori = t.kategori;

  if (formattedKeterangan.includes('\n')) {
    const parts = formattedKeterangan.split('\n');
    displayKategori = parts[0];
    formattedKeterangan = parts.slice(1).join(' ');
  }
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
    <div className="flex flex-col group transaction-row-container border-b border-slate-200/60 last:border-b-0 pb-1.5 mb-1.5">
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

      {/* DETAIL POPUP MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
          <div 
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center bg-slate-50 border-b border-slate-200 p-3 px-4">
              <h3 className="font-black text-slate-700 text-sm tracking-tight uppercase">Rincian Transaksi</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            {/* Body */}
            <div className="p-4 flex flex-col gap-3">
              {/* Waktu & Transaksi */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500 font-bold">Waktu:</span>
                  <span className="text-slate-800 font-bold">{dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} {jam}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500 font-bold">Transaksi:</span>
                  <span className="text-blue-600 font-black">{displayKategori}</span>
                </div>
              </div>

              {/* Keterangan */}
              <div className="flex justify-between items-center bg-slate-50 rounded-lg p-2.5 px-3 text-[12px] border border-slate-100">
                <span className="text-slate-500 font-bold min-w-[90px]">Ket. Tambahan:</span>
                <span className="text-slate-800 font-black text-right break-words flex-1 leading-tight">{formattedKeterangan}</span>
              </div>

              {/* Sumber Uang (Keluar/Masuk) */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center bg-rose-50/50 rounded-lg p-2.5 px-3 text-[12px] border border-rose-100">
                  <span className="text-rose-600 font-black flex items-center gap-1.5">
                    <i className="fa-solid fa-arrow-up-right text-[10px]"></i> Sumber Uang Keluar:
                  </span>
                  <span className="text-rose-900 font-black text-right">{t.kategori === 'Tarik Tunai' ? 'Laci Kasir' : t.kategori}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50/50 rounded-lg p-2.5 px-3 text-[12px] border border-emerald-100">
                  <span className="text-emerald-600 font-black flex items-center gap-1.5">
                    <i className="fa-solid fa-arrow-down-left text-[10px]"></i> Sumber Uang Masuk:
                  </span>
                  <span className="text-emerald-900 font-black text-right">{t.kategori === 'Tarik Tunai' ? (t.keterangan?.split('|')[1]?.replace(/\[.*?\]/g, '').trim() || 'EDC / Bank') : 'Laci Kasir'}</span>
                </div>
              </div>

              {/* Nominal & Admin */}
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500 font-bold">Nominal:</span>
                  <span className="text-slate-800 font-black">Rp {formatRp(t.nominal - (t.keterangan?.includes('[ADMIN_DALAM]') ? t.adminFee : 0))}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500 font-bold">Biaya Admin:</span>
                  <span className="text-slate-800 font-black">Rp {formatRp(t.adminFee)}</span>
                </div>
              </div>

              {/* Total (Dashed Border) */}
              <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-300 mt-1">
                <span className="text-slate-800 font-black text-[13px]">Total:</span>
                <span className="text-blue-600 font-black text-[14px]">Rp {formatRp(t.nominal + (!t.keterangan?.includes('[ADMIN_DALAM]') && t.kategori !== 'Tarik Tunai' ? t.adminFee : 0))}</span>
              </div>

              {/* Edit / Delete Actions */}
              <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-100">
                {t.isEdited && <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-black tracking-widest">EDITED</span>}
                {!t.isEdited && <div></div>}
                <div className="flex gap-2">
                  {canEdit ? (
                    <button 
                      onClick={(e) => { setIsOpen(false); handleEditClick(e); }}
                      className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-1.5 hover:bg-blue-600 hover:text-white transition-all border border-blue-100 shadow-sm"
                    >
                      <i className="fa-solid fa-pen text-[9px]"></i> EDIT
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold italic py-2 px-3 bg-slate-100 rounded-xl">LOCKED</span>
                  )}
                  {canDelete && (
                    <button 
                      onClick={(e) => { setIsOpen(false); handleDeleteClick(e); }}
                      className="bg-rose-50 text-rose-600 w-9 h-9 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm"
                    >
                      <i className="fa-solid fa-trash-can text-[11px]"></i>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionRow
