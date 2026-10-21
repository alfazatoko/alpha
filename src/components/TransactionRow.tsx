import React, { useState, useEffect } from 'react'
import type { Transaction } from '../types'
import { cn, parseLocalISO, getLocalDateString } from '../lib/utils'
import type { KasirAccount } from './LoginScreen'

interface TransactionRowProps {
  t: Transaction
  index: number
  onEdit: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => void
  kasirRole?: string
  storeName?: string
  storeSubtext?: string
  kasirName?: string
  kasirList?: Record<string, KasirAccount>
}

const TransactionRow: React.FC<TransactionRowProps> = ({ 
  t, 
  index, 
  onEdit, 
  onDelete, 
  kasirRole,
  storeName,
  storeSubtext,
  kasirName,
  kasirList 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showStrukPreview, setShowStrukPreview] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  
  useEffect(() => {
    const handleOpen = (e: any) => {
      if (e.detail === t.id) {
        setIsOpen(true);
      }
    };
    window.addEventListener('openRiwayatDetail', handleOpen);
    return () => window.removeEventListener('openRiwayatDetail', handleOpen);
  }, [t.id]);

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
  let listKeterangan = formattedKeterangan;
  let modalKeterangan = formattedKeterangan;
  let modalTransaksiLabel = displayKategori;
  const hasAdminDalam = (t.keterangan || '').toUpperCase().includes('[ADMIN_DALAM]');
  let adminFeeLabel = hasAdminDalam ? "Biaya admin ( Potong Dalam ) :" : "Biaya Admin (Tunai):";

  let appFee = 0;
  if ((t.kategori === 'Order Kuota' || t.kategori === 'FLIP') && t.keterangan?.includes('[FEE_APP:')) {
    const match = t.keterangan.match(/\[FEE_APP:(\d+)\]/);
    if (match) {
      appFee = parseInt(match[1], 10);
      listKeterangan = listKeterangan.replace(/\[fee_app:\d+\]/ig, '').trim();
      modalKeterangan = modalKeterangan.replace(/\[fee_app:\d+\]/ig, '').trim();
    }
  }
  const displayAdminFee = appFee > 0 ? Math.max(0, t.adminFee - appFee) : t.adminFee;

  let isTarikTunaiFormat = false;
  let metodeRaw = '';
  
  if (t.kategori === 'Tarik Tunai') {
    if (t.keterangan?.startsWith('TARIK_TUNAI|')) {
       isTarikTunaiFormat = true;
       metodeRaw = t.keterangan.split('|')[1] || '';
    } else if (t.keterangan?.toLowerCase().startsWith('tarik tunai :')) {
       isTarikTunaiFormat = true;
       metodeRaw = t.keterangan.split(':')[1] || '';
    }
  }

  if (isTarikTunaiFormat) {
    metodeRaw = metodeRaw.replace(/\[ADMIN_DALAM\]/ig, '').replace(/\[NON_TUNAI\]/ig, '').trim();
    if (metodeRaw.toUpperCase() === 'QRIS') metodeRaw = 'QRIS';
    else if (metodeRaw.toUpperCase() === 'EDC') metodeRaw = 'EDC';
    else if (metodeRaw.toUpperCase() === 'ATM') metodeRaw = 'ATM';
    else if (metodeRaw.toUpperCase().includes('BANK')) metodeRaw = 'BANK';
    else metodeRaw = metodeRaw.charAt(0).toUpperCase() + metodeRaw.slice(1).toLowerCase();

    const adm = t.adminFee;
    const nom = t.nominal;
    const adminPotong = hasAdminDalam;

    modalTransaksiLabel = `TARIK TUNAI > ${metodeRaw.toUpperCase()}`;

    const tarikNom = adminPotong ? (nom - adm) : nom;
    
    listKeterangan = `${metodeRaw} | Tarik ${formatK(tarikNom)} | Adm ${formatK(adm)}`;
    modalKeterangan = `Tarik ${formatK(tarikNom)} | Adm ${formatK(adm)}`;

    if (adminPotong) {
      adminFeeLabel = "Biaya admin ( Potong Dalam ) :";
    } else {
      adminFeeLabel = "Biaya Admin (Tunai):";
    }
  } else {
    // Fallback penghapusan label Admin Dalam secara umum jika tidak tercover di atas
    if (listKeterangan.toLowerCase().includes('[admin_dalam]')) {
      adminFeeLabel = "Biaya admin ( Potong Dalam ) :";
      listKeterangan = listKeterangan.replace(/\[admin_dalam\]/ig, '').replace(/\s+/g, ' ').trim();
    }
    if (modalKeterangan.toLowerCase().includes('[admin_dalam]')) {
      adminFeeLabel = "Biaya admin ( Potong Dalam ) :";
      modalKeterangan = modalKeterangan.replace(/\[admin_dalam\]/ig, '').replace(/\s+/g, ' ').trim();
    }
  }

  const effectiveStoreName = storeName || (() => {
    try {
      const savedStore = localStorage.getItem('alphaPro_active_store')
      if (savedStore) return JSON.parse(savedStore).name || 'ALFAZA CELL'
    } catch {}
    return 'ALFAZA CELL'
  })()

  const effectiveStoreSubtext = storeSubtext || (() => {
    try {
      const savedStore = localStorage.getItem('alphaPro_active_store')
      if (savedStore) return JSON.parse(savedStore).subtext || ''
    } catch {}
    return ''
  })()

  const effectiveKasirName = (() => {
    // 1. Cari nama kasir yang mencatat transaksi dari kasirList
    if (t.kasir_id) {
      if (kasirList && kasirList[t.kasir_id]?.name) {
        return kasirList[t.kasir_id].name
      }
      try {
        const savedStore = localStorage.getItem('alphaPro_active_store')
        const activeStoreId = savedStore ? JSON.parse(savedStore).id : null
        if (activeStoreId) {
          const storeKasirs = localStorage.getItem(`alphaPro_${activeStoreId}_kasir_list`)
          if (storeKasirs) {
            const parsed = JSON.parse(storeKasirs)
            if (parsed[t.kasir_id]?.name) return parsed[t.kasir_id].name
          }
        }
        const globalKasirs = localStorage.getItem('alphaPro_kasir_list')
        if (globalKasirs) {
          const parsed = JSON.parse(globalKasirs)
          if (parsed[t.kasir_id]?.name) return parsed[t.kasir_id].name
        }
      } catch {}
      return t.kasir_id
    }
    // 2. Fallback jika t.kasir_id belum tercatat di data lama
    if (kasirName) return kasirName
    return localStorage.getItem('alphaPro_name') || 'Kasir'
  })()

  const generateReceiptText = () => {
    const w = 32;
    const center = (s: string) => {
      const txt = (s || '').substring(0, w);
      return ' '.repeat(Math.max(0, Math.floor((w - txt.length) / 2))) + txt;
    };
    const right = (left: string, rightStr: string) => {
      const l = (left || '').substring(0, 18);
      const r = (rightStr || '');
      const space = w - l.length - r.length;
      return l + (space > 0 ? ' '.repeat(space) : ' ') + r;
    };

    let text = center(effectiveStoreName.toUpperCase()) + '\n';
    if (effectiveStoreSubtext) {
      text += center(effectiveStoreSubtext) + '\n';
    }
    text += '='.repeat(w) + '\n';
    text += `Waktu : ${dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} ${jam}\n`;
    text += `No    : ${t.id ? t.id.slice(0, 18) : '-'}\n`;
    text += `Kasir : ${effectiveKasirName}\n`;
    text += '-'.repeat(w) + '\n';
    text += `Jenis : ${modalTransaksiLabel.substring(0, 24)}\n`;
    if (modalKeterangan && modalKeterangan !== '-') {
      text += `Ket   : ${modalKeterangan.substring(0, 24)}\n`;
    }
    text += '-'.repeat(w) + '\n';

    if (appFee > 0) {
      text += right('Harga Modal', 'Rp ' + formatRp(t.nominal)) + '\n';
      text += right('Fee Aplikasi', 'Rp ' + formatRp(appFee)) + '\n';
      text += right('Total Modal', 'Rp ' + formatRp(t.nominal + appFee)) + '\n';
      text += right(adminFeeLabel.replace(' :', '').replace(':', ''), 'Rp ' + formatRp(displayAdminFee)) + '\n';
      text += '-'.repeat(w) + '\n';
      text += right('TOTAL', 'Rp ' + formatRp(t.nominal + appFee + displayAdminFee)) + '\n';
    } else if (t.kategori === 'Tarik Tunai') {
      const totalTarik = t.nominal + (!hasAdminDalam ? t.adminFee : 0);
      text += right('Nominal Tarik', 'Rp ' + formatRp(t.nominal - (hasAdminDalam ? t.adminFee : 0))) + '\n';
      text += right(hasAdminDalam ? 'Admin (Potong)' : 'Admin (Tunai)', 'Rp ' + formatRp(t.adminFee)) + '\n';
      text += '-'.repeat(w) + '\n';
      text += right('TOTAL', 'Rp ' + formatRp(totalTarik)) + '\n';
    } else {
      text += right('Nominal', 'Rp ' + formatRp(t.nominal)) + '\n';
      text += right('Biaya Admin', 'Rp ' + formatRp(t.adminFee)) + '\n';
      text += '-'.repeat(w) + '\n';
      text += right('TOTAL', 'Rp ' + formatRp(t.nominal + (!hasAdminDalam ? t.adminFee : 0))) + '\n';
    }

    text += '='.repeat(w) + '\n';
    text += center('Terima Kasih Atas') + '\n';
    text += center('Kepercayaan Anda') + '\n';
    text += '\n\n\n'; // Feed lines for paper tear
    return text;
  };

  const handleExecutePrint = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsPrinting(true);

    const receiptText = generateReceiptText();
    const btMac = localStorage.getItem('bluetooth_printer_mac');

    const tryRawBtPrint = () => {
      const tryPrint = (scheme: string) => {
        const a = document.createElement('a');
        a.href = scheme;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      try {
        tryPrint(`rawbt:${encodeURIComponent(receiptText)}`);
        setShowStrukPreview(false);
      } catch (e) {
        try {
          tryPrint(`intent:${encodeURIComponent(receiptText)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`);
          setShowStrukPreview(false);
        } catch (e2) {
          alert('Gagal membuka printer RawBT. Pastikan printer menyala dan bluetooth aktif.');
        }
      } finally {
        setTimeout(() => setIsPrinting(false), 500);
      }
    };

    // 1. Eksekusi via Bluetooth Serial (Capacitor / Android Native)
    if ((window as any).bluetoothSerial) {
      if (!btMac) {
        setIsPrinting(false);
        alert('Printer Bluetooth belum diatur.\nSilakan hubungkan printer di menu Akun > Printer & Hardware terlebih dahulu.');
        return;
      }

      // Coba tulis langsung jika sudah terhubung
      (window as any).bluetoothSerial.write(
        receiptText,
        () => {
          setIsPrinting(false);
          setShowStrukPreview(false);
        },
        () => {
          // Jika belum tersambung, coba auto-connect ke printer yang tersimpan
          (window as any).bluetoothSerial.connect(
            btMac,
            () => {
              (window as any).bluetoothSerial.write(
                receiptText,
                () => {
                  setIsPrinting(false);
                  setShowStrukPreview(false);
                },
                (errWrite: any) => {
                  setIsPrinting(false);
                  alert('Gagal cetak ke Printer: ' + errWrite);
                }
              );
            },
            () => {
              // Coba mode Insecure jika mode normal ditolak
              (window as any).bluetoothSerial.connectInsecure(
                btMac,
                () => {
                  (window as any).bluetoothSerial.write(
                    receiptText,
                    () => {
                      setIsPrinting(false);
                      setShowStrukPreview(false);
                    },
                    (errInsec: any) => {
                      setIsPrinting(false);
                      alert('Gagal cetak via Bluetooth Insecure: ' + errInsec);
                    }
                  );
                },
                () => {
                  setIsPrinting(false);
                  // Fallback ke RawBT
                  tryRawBtPrint();
                }
              );
            }
          );
        }
      );
    } else {
      // 2. Web / Browser / Fallback RawBT
      tryRawBtPrint();
    }
  };

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
               {listKeterangan}
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
            Admin: {displayAdminFee.toLocaleString('id-ID')}
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
            <div className="p-3.5 flex flex-col gap-2.5">
              {/* Waktu & Kasir & Transaksi */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500 font-bold">Waktu:</span>
                  <span className="text-slate-800 font-bold">
                    {dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} {jam}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500 font-bold">Kasir:</span>
                  <span className="text-slate-800 font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-user-circle text-blue-500 text-[11px]"></i>
                    {effectiveKasirName}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500 font-bold">Transaksi:</span>
                  <span className="text-blue-600 font-black">{modalTransaksiLabel}</span>
                </div>
              </div>

              {/* Kolom Info Transaksi (Ket Tambahan, Sumber Keluar, Sumber Masuk) - Dibuat Rapat & Rapi */}
              <div className="flex flex-col gap-1.5">
                {/* Keterangan */}
                <div className="flex justify-between items-center bg-slate-50/80 rounded-lg py-1.5 px-3 text-[11.5px] border border-slate-100">
                  <span className="text-slate-500 font-bold min-w-[90px]">Ket. Tambahan:</span>
                  <span className="text-slate-800 font-black text-right break-words flex-1 leading-tight">{modalKeterangan}</span>
                </div>

                {/* Sumber Uang (Keluar/Masuk) */}
                <div className="flex justify-between items-center bg-rose-50/50 rounded-lg py-1.5 px-3 text-[11.5px] border border-rose-100">
                  <span className="text-rose-600 font-black flex items-center gap-1.5">
                    <i className="fa-solid fa-arrow-up-right text-[9px]"></i> Sumber Uang Keluar:
                  </span>
                  <span className="text-rose-900 font-black text-right">{t.kategori === 'Tarik Tunai' ? 'Laci Kasir' : t.kategori}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50/50 rounded-lg py-1.5 px-3 text-[11.5px] border border-emerald-100">
                  <span className="text-emerald-600 font-black flex items-center gap-1.5">
                    <i className="fa-solid fa-arrow-down-left text-[9px]"></i> Sumber Uang Masuk:
                  </span>
                  <span className="text-emerald-900 font-black text-right">{t.kategori === 'Tarik Tunai' ? (t.keterangan?.split('|')[1]?.replace(/\[.*?\]/g, '').replace(/bank uob/ig, 'Bank').trim() || 'EDC / Bank') : 'Laci Kasir'}</span>
                </div>
              </div>

              {/* Nominal & Admin */}
              <div className="flex flex-col gap-1 mt-0.5">
                {appFee > 0 ? (
                  <>
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-slate-500 font-bold">Harga Modal:</span>
                      <span className="text-slate-800 font-black">Rp {formatRp(t.nominal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-slate-500 font-bold">Fee Aplikasi:</span>
                      <span className="text-rose-600 font-black">Rp {formatRp(appFee)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] pt-1.5 mt-0.5 border-t border-slate-100">
                      <span className="text-slate-600 font-black">Total Modal:</span>
                      <span className="text-slate-800 font-black">Rp {formatRp(t.nominal + appFee)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-slate-500 font-bold">{adminFeeLabel}</span>
                      <span className="text-emerald-600 font-black">Rp {formatRp(displayAdminFee)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-slate-500 font-bold">Nominal:</span>
                      <span className="text-slate-800 font-black">Rp {formatRp(t.nominal - (t.keterangan?.includes('[ADMIN_DALAM]') ? t.adminFee : 0))}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-slate-500 font-bold">{adminFeeLabel}</span>
                      <span className="text-slate-800 font-black">Rp {formatRp(t.adminFee)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Total (Dashed Border) */}
              <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-300 mt-0.5">
                <span className="text-slate-800 font-black text-[13px]">Total:</span>
                <span className="text-blue-600 font-black text-[14px]">Rp {formatRp(t.nominal + (!t.keterangan?.includes('[ADMIN_DALAM]') && t.kategori !== 'Tarik Tunai' ? t.adminFee : 0))}</span>
              </div>

              {/* Edit / Delete Actions */}
              <div className="flex justify-between items-center mt-1 pt-2.5 border-t border-slate-100">
                {t.isEdited && <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-black tracking-widest">EDITED</span>}
                {!t.isEdited && <div></div>}
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStrukPreview(true);
                    }}
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white px-3.5 py-2 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all border border-emerald-200/80 shadow-xs cursor-pointer active:scale-95"
                    title="Review & Cetak Struk"
                  >
                    <i className="fa-solid fa-print text-[10px]"></i>
                    PRINT
                  </button>
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

      {/* MODAL REVIEW STRUK TRANSAKSI SEBELUM DICETAK */}
      {showStrukPreview && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 animate-in fade-in duration-150"
          onClick={(e) => { 
            e.stopPropagation(); 
            if (!isPrinting) setShowStrukPreview(false); 
          }}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-[320px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-slate-800/90 border-b border-slate-700 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-receipt"></i>
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Review Struk</h4>
                  <p className="text-[9px] text-slate-400 font-medium">Ringkasan sebelum dicetak</p>
                </div>
              </div>
              <button 
                type="button"
                disabled={isPrinting}
                onClick={() => setShowStrukPreview(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>

            {/* Modal Body: Thermal Paper Simulation */}
            <div className="p-3 overflow-y-auto flex-1 bg-slate-950/40">
              <div className="bg-white text-slate-800 rounded-xl p-3.5 shadow-md font-mono text-[11px] leading-relaxed border border-slate-200 select-none">
                {/* Store Header */}
                <div className="text-center font-black text-[12px] text-slate-900 tracking-wider uppercase">
                  {effectiveStoreName}
                </div>
                {effectiveStoreSubtext && (
                  <div className="text-center text-[10px] text-slate-500 font-sans mt-0.5 leading-tight">
                    {effectiveStoreSubtext}
                  </div>
                )}

                <div className="border-b border-dashed border-slate-300 my-2"></div>

                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Waktu :</span>
                  <span className="font-semibold text-slate-800">{dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} • {jam}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>No    :</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[140px]">{t.id ? t.id.slice(0, 16) : '-'}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Kasir :</span>
                  <span className="font-semibold text-slate-800">{effectiveKasirName}</span>
                </div>

                <div className="border-b border-dashed border-slate-300 my-2"></div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-start text-[10px]">
                    <span className="text-slate-500 font-sans font-bold">Jenis:</span>
                    <span className="font-bold text-slate-800 text-right flex-1 ml-2">{modalTransaksiLabel}</span>
                  </div>
                  {modalKeterangan && modalKeterangan !== '-' && (
                    <div className="flex justify-between items-start text-[10px]">
                      <span className="text-slate-500 font-sans font-bold">Ket  :</span>
                      <span className="text-slate-700 text-right flex-1 ml-2 break-words">{modalKeterangan}</span>
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-slate-300 my-2"></div>

                {/* Pricing Breakdown */}
                <div className="flex flex-col gap-1 text-[11px]">
                  {appFee > 0 ? (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-600">Harga Modal</span>
                        <span>Rp {formatRp(t.nominal)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-rose-600">
                        <span>Fee Aplikasi</span>
                        <span>Rp {formatRp(appFee)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold pt-0.5 border-t border-dotted border-slate-200">
                        <span>Total Modal</span>
                        <span>Rp {formatRp(t.nominal + appFee)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-emerald-700">
                        <span>{adminFeeLabel.replace(' :', '').replace(':', '')}</span>
                        <span>Rp {formatRp(displayAdminFee)}</span>
                      </div>
                      <div className="border-b border-dashed border-slate-300 my-1"></div>
                      <div className="flex justify-between font-black text-[12px] text-slate-900">
                        <span>TOTAL</span>
                        <span>Rp {formatRp(t.nominal + appFee + displayAdminFee)}</span>
                      </div>
                    </>
                  ) : t.kategori === 'Tarik Tunai' ? (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-600">Nominal Tarik</span>
                        <span>Rp {formatRp(t.nominal - (hasAdminDalam ? t.adminFee : 0))}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-600">{hasAdminDalam ? 'Admin (Potong)' : 'Admin (Tunai)'}</span>
                        <span>Rp {formatRp(t.adminFee)}</span>
                      </div>
                      <div className="border-b border-dashed border-slate-300 my-1"></div>
                      <div className="flex justify-between font-black text-[12px] text-slate-900">
                        <span>TOTAL</span>
                        <span>Rp {formatRp(t.nominal + (!hasAdminDalam ? t.adminFee : 0))}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-600">Nominal</span>
                        <span>Rp {formatRp(t.nominal)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-600">Biaya Admin</span>
                        <span>Rp {formatRp(t.adminFee)}</span>
                      </div>
                      <div className="border-b border-dashed border-slate-300 my-1"></div>
                      <div className="flex justify-between font-black text-[12px] text-slate-900">
                        <span>TOTAL</span>
                        <span>Rp {formatRp(t.nominal + (!hasAdminDalam ? t.adminFee : 0))}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-b border-dashed border-slate-300 my-2"></div>

                <div className="text-center text-[9px] text-slate-500 font-sans">
                  <div>Terima Kasih Atas</div>
                  <div>Kepercayaan Anda</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                disabled={isPrinting}
                onClick={() => setShowStrukPreview(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPrinting}
                onClick={handleExecutePrint}
                className="flex-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/40 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <i className={cn("fa-solid", isPrinting ? "fa-circle-notch fa-spin" : "fa-print")}></i>
                {isPrinting ? 'Mencetak...' : 'Cetak Struk'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionRow
