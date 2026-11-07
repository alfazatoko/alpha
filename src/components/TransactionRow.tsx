import React, { useState, useEffect } from 'react'
import type { Transaction } from '../types'
import { cn, parseLocalISO, getLocalDateString } from '../lib/utils'
import type { KasirAccount } from './LoginScreen'
import { printThermalReceipt, formatReceiptCenter, formatReceiptRow, formatReceiptDivider, formatReceiptDoubleDivider } from '../lib/printerService'
import { isPpobTx, getStoredCustomLabels, parseTransactionDetails } from '../lib/categoryHelper'

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

  const isKhusus = (t.keterangan || '').toUpperCase().includes('[KHUSUS]')
  const isNonTunai = (t.keterangan || '').toUpperCase().includes('[NON_TUNAI]')
  const rowColorClass = isKhusus ? "text-orange-600" : isNonTunai ? "text-purple-600" : "text-black"

  const formatRp = (num: number) => num.toLocaleString('id-ID');
  const getCategoryIcon = (kat: string = '') => {
    const k = kat.toLowerCase();
    if (k.includes('kuota') || k.includes('ppob') || k.includes('pulsa') || k.includes('sinergi')) return 'fa-solid fa-wifi';
    if (k.includes('bank') || k.includes('flip') || k.includes('transfer')) return 'fa-solid fa-building-columns';
    if (k.includes('dana') || k.includes('wallet') || k.includes('gopay') || k.includes('ovo')) return 'fa-solid fa-wallet';
    if (k.includes('tarik')) return 'fa-solid fa-money-bill-transfer';
    if (k.includes('aksesoris')) return 'fa-solid fa-headphones';
    if (k.includes('voucher')) return 'fa-solid fa-ticket';
    return 'fa-solid fa-wifi';
  };
  const formatK = (num: number) => (num % 1000 === 0) ? `${num / 1000}K` : formatRp(num);

  const customLabels = getStoredCustomLabels(t.store_id);

  // Bersihkan tag teknis internal dari keterangan tampilan
  let rawCleanKet = (t.keterangan || '')
    .replace(/\[\s*(non[_\s]tunai|admin[_\s]dalam|khusus)\s*\]/gi, '')
    .replace(/\[\s*sys:[^\]]*\]/gi, '')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Ekstrak Fee / Biaya Aplikasi jika ada
  let appFee = 0;
  if (rawCleanKet.includes('[FEE_APP:')) {
    const feeMatch = rawCleanKet.match(/\[FEE_APP:(\d+)\]/i);
    if (feeMatch) {
      appFee = parseInt(feeMatch[1], 10);
      rawCleanKet = rawCleanKet.replace(/\[fee_app:\d+\]/ig, '').trim();
    }
  }

  const isOrderKuota = isPpobTx(t, customLabels);
  // Untuk Order Kuota: di database t.nominal sudah modal riil (termasuk fee app), dan t.adminFee sudah laba bersih (Jual - Modal Riil).
  // Untuk kategori lain (Flip, Bank, Dana, Sinergi): t.nominal adalah nominal murni, dan t.adminFee adalah tarif kotor kasir.
  const displayModalPokok = (appFee > 0 && isOrderKuota) ? Math.max(0, t.nominal - appFee) : t.nominal;
  const displayTotalModal = (appFee > 0 && !isOrderKuota) ? (t.nominal + appFee) : t.nominal;
  const displayAdminFee = (appFee > 0 && !isOrderKuota) ? Math.max(0, t.adminFee - appFee) : t.adminFee;
  const displayTotal = appFee > 0
    ? (displayTotalModal + displayAdminFee)
    : (t.nominal + (!t.keterangan?.includes('[ADMIN_DALAM]') && t.kategori !== 'Tarik Tunai' ? t.adminFee : 0));


  const parsed = parseTransactionDetails(t, customLabels);

  const displayJenisTransaksi = parsed.baris1Judul;
  const displaySubKategori = parsed.baris2Sub;
  const displayCatatanTambahan = parsed.baris3Catatan;
  const subLabelTitle = parsed.kategoriTransaksi === 'Tarik Tunai' ? 'Layanan / Metode:' : 'Layanan / Produk:';
  const receiptSubLabel = parsed.kategoriTransaksi === 'Tarik Tunai' ? 'Metode    :' : 'Tujuan    :';

  const cleanDigits = (s: string) => s.replace(/\D/g, '');

  const hasAdminDalam = (t.keterangan || '').toUpperCase().includes('[ADMIN_DALAM]');
  let adminFeeLabel = hasAdminDalam 
    ? "Admin Toko (Potong Dalam):" 
    : isNonTunai 
    ? "Admin Toko (Non Tunai):" 
    : "Admin Toko (Tunai):";

  const isSplitPayment = (t.keterangan || '').includes('[SPLIT:');
  
  // Tentukan Sumber Uang Keluar (menyesuaikan aplikasi/kategori yang dipilih)
  let modalSumberKeluar = '—';
  if (parsed.kategoriTransaksi === 'Tarik Tunai') {
    modalSumberKeluar = 'Laci Kasir';
  } else if (parsed.kategoriTransaksi === 'Transfer') {
    modalSumberKeluar = parsed.sumberTransaksi || 'Bank UOB';
  } else {
    modalSumberKeluar = '—';
  }

  // Tentukan Sumber Uang Masuk
  let modalSumberMasuk = 'Laci Kasir';
  if (parsed.kategoriTransaksi === 'Tarik Tunai') {
    modalSumberMasuk = parsed.layananProduk || 'EDC / Bank';
  } else if (isSplitPayment) {
    modalSumberMasuk = 'Sebagian Tunai & Non Tunai';
  } else if (isNonTunai) {
    modalSumberMasuk = (parsed.kategoriTransaksi === 'Aksesoris' || parsed.kategoriTransaksi === 'Voucher') ? 'QRIS' : 'Non Tunai / QRIS';
  } else {
    modalSumberMasuk = 'Laci Kasir';
  }

  let modalTransaksiLabel = displaySubKategori 
    ? `${displayJenisTransaksi} > ${displaySubKategori}` 
    : displayJenisTransaksi;
  let modalKeterangan = displayCatatanTambahan || '-';
  let listKeterangan = displaySubKategori || displayCatatanTambahan || (appFee > 0 ? `Fee App: Rp ${formatRp(appFee)}` : '-');

  const displayDetailTransaksi = parsed.kategoriTransaksi;

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
    let text = formatReceiptCenter(effectiveStoreName.toUpperCase()) + '\n';
    if (effectiveStoreSubtext) {
      text += formatReceiptCenter(effectiveStoreSubtext) + '\n';
    }
    text += formatReceiptDoubleDivider() + '\n';
    text += `Kasir : ${effectiveKasirName}\n`;
    text += `No    : ${t.id ? t.id.slice(0, 18) : '-'}\n`;
    text += `Waktu : ${dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} ${jam}\n`;
    text += formatReceiptDivider() + '\n';
    text += `Transaksi : ${parsed.kategoriTransaksi.toUpperCase().substring(0, 20)}\n`;
    if (parsed.kategoriTransaksi === 'Transfer' && parsed.sumberTransaksi && parsed.sumberTransaksi !== '-') {
      text += `Sumber    : ${parsed.sumberTransaksi.toUpperCase().substring(0, 20)}\n`;
    }
    if (parsed.layananProduk) {
      const subLabel = parsed.kategoriTransaksi === 'Tarik Tunai' ? 'Metode    :' : 'Tujuan    :';
      text += `${subLabel} ${parsed.layananProduk.toUpperCase().substring(0, 20)}\n`;
    }
    if (parsed.catatanTambahan) {
      text += `Ket       : ${parsed.catatanTambahan.substring(0, 20)}\n`;
    }
    text += formatReceiptDivider() + '\n';

    if (appFee > 0) {
      text += formatReceiptRow(isOrderKuota ? 'Harga Modal' : 'Nominal', 'Rp ' + formatRp(displayModalPokok)) + '\n';
      text += formatReceiptRow('Fee / Biaya Aplikasi', 'Rp ' + formatRp(appFee)) + '\n';
      text += formatReceiptRow('Total Modal', 'Rp ' + formatRp(displayTotalModal)) + '\n';
      text += formatReceiptRow(adminFeeLabel.replace(' :', '').replace(':', ''), 'Rp ' + formatRp(displayAdminFee)) + '\n';
      text += formatReceiptDivider() + '\n';
      text += formatReceiptRow('TOTAL', 'Rp ' + formatRp(displayTotal)) + '\n';
    } else if (t.kategori === 'Tarik Tunai') {
      const totalTarik = t.nominal + (!hasAdminDalam ? t.adminFee : 0);
      text += formatReceiptRow('Nominal Tarik', 'Rp ' + formatRp(t.nominal - (hasAdminDalam ? t.adminFee : 0))) + '\n';
      text += formatReceiptRow(hasAdminDalam ? 'Admin (Potong)' : 'Admin (Tunai)', 'Rp ' + formatRp(t.adminFee)) + '\n';
      text += formatReceiptDivider() + '\n';
      text += formatReceiptRow('TOTAL', 'Rp ' + formatRp(totalTarik)) + '\n';
    } else if (t.kategori === 'Aksesoris' || t.kategori === 'Voucher' || t.adminFee === 0) {
      text += formatReceiptRow('Harga Barang', 'Rp ' + formatRp(t.nominal)) + '\n';
      text += formatReceiptDivider() + '\n';
      text += formatReceiptRow('TOTAL', 'Rp ' + formatRp(t.nominal)) + '\n';
    } else {
      text += formatReceiptRow(t.kategori === 'Order Kuota' ? 'Harga Modal' : 'Nominal', 'Rp ' + formatRp(t.nominal)) + '\n';
      text += formatReceiptRow(t.kategori === 'Order Kuota' ? 'Laba / Admin' : 'Biaya Admin', 'Rp ' + formatRp(t.adminFee)) + '\n';
      text += formatReceiptDivider() + '\n';
      text += formatReceiptRow('TOTAL', 'Rp ' + formatRp(t.nominal + (!hasAdminDalam ? t.adminFee : 0))) + '\n';
    }

    text += formatReceiptDoubleDivider() + '\n';
    text += formatReceiptCenter('Terima Kasih Atas') + '\n';
    text += formatReceiptCenter('Kepercayaan Anda') + '\n';
    text += '\n\n\n'; // Feed lines for paper tear
    return text;
  };

  const handleExecutePrint = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsPrinting(true);

    try {
      const receiptText = generateReceiptText();
      const res = await printThermalReceipt(receiptText);
      if (res.success) {
        setShowStrukPreview(false);
      }
    } catch (err: any) {
      console.error('Print transaction error:', err);
    } finally {
      setIsPrinting(false);
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
               {displayJenisTransaksi}
            </div>
            {displaySubKategori ? (
              <div className="text-[10px] text-blue-900 font-black tracking-tight truncate max-w-[180px] sm:max-w-[260px] leading-tight">
                 {displaySubKategori}
              </div>
            ) : listKeterangan && listKeterangan !== '-' ? (
              <div className="text-[9px] text-blue-900 font-bold tracking-tight truncate max-w-[180px] sm:max-w-[260px] leading-none">
                 {listKeterangan}
              </div>
            ) : null}
            {displaySubKategori && displayCatatanTambahan && (
              <div className="text-[9px] text-slate-500 font-medium tracking-tight truncate max-w-[180px] sm:max-w-[260px] leading-none">
                 {displayCatatanTambahan}
              </div>
            )}
            <div className="text-[9px] text-slate-500 font-bold tracking-tight leading-none mt-0.5">
               {dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} • {jam}
            </div>
          </div>
        </div>

        {/* NOMINAL & ADMIN */}
        <div className="flex flex-col items-end gap-0.5 pr-1 mt-0.5 shrink-0">
          <div className="flex items-center gap-1">
            {appFee > 0 && (
              <span className="text-[7.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 px-1 py-0.2 rounded leading-none whitespace-nowrap">
                fee {appFee.toLocaleString('id-ID')}
              </span>
            )}
            <div className={cn(
              "text-[13px] font-black tracking-tight leading-tight",
              isKhusus ? "text-orange-600" : isNonTunai ? "text-purple-600" : (t.kategori === 'Tarik Tunai' ? "text-rose-600" : "text-slate-900")
            )}>
              {(appFee > 0 && isOrderKuota ? displayModalPokok : t.nominal).toLocaleString('id-ID')}
            </div>
          </div>
          {t.kategori === 'Aksesoris' || t.kategori === 'Voucher' || displayAdminFee === 0 ? (
            isNonTunai ? (
              <span className="text-[8px] font-black uppercase text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                NON TUNAI
              </span>
            ) : null
          ) : (
            <div className={cn(
              "text-[11px] font-extrabold uppercase", 
              isKhusus ? "text-orange-400" : isNonTunai ? "text-purple-600" : ((t.keterangan || '').includes('[ADMIN_DALAM]') ? "text-[#0066AE]" : "text-emerald-600")
            )}>
              Admin: {displayAdminFee.toLocaleString('id-ID')}
            </div>
          )}
        </div>
      </div>

      {/* DETAIL POPUP MODAL (DESAIN BARU SESUAI FOTO) */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-2 py-3 sm:p-4 animate-in fade-in duration-200" 
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        >
          <div 
            className="bg-[#F2F6FC] rounded-3xl w-full max-w-[440px] overflow-hidden shadow-2xl border border-blue-100 flex flex-col animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Royal Blue with White Checkmark & Title (Lebih pendek & kompak) */}
            <div className="bg-gradient-to-r from-[#0066FF] to-[#0052cc] py-2.5 px-3.5 text-white flex items-center justify-between relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#0066FF] shadow-xs shrink-0">
                  <i className="fa-solid fa-check text-sm font-black"></i>
                </div>
                <div className="h-6 w-[1.5px] bg-white/30 shrink-0"></div>
                <div>
                  <h3 className="font-bold text-white text-sm tracking-tight leading-tight">Rincian Transaksi</h3>
                  <p className="text-[10px] text-blue-100/90 font-medium leading-none mt-0.5">Transaksi berhasil diproses</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 relative z-10">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStrukPreview(true);
                  }}
                  className="w-7 h-7 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Print Struk"
                >
                  <i className="fa-solid fa-print text-xs"></i>
                </button>
                {canDelete && (
                  <button 
                    type="button"
                    onClick={(e) => { setIsOpen(false); handleDeleteClick(e); }}
                    className="w-7 h-7 rounded-full bg-white/20 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Hapus Transaksi"
                  >
                    <i className="fa-solid fa-trash-can text-[11px]"></i>
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Tutup"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-3 space-y-1.5">
              {/* KARTU 1: INFO 4 KOTAK (Lebih lebar, kepinggir, muat full teks & tanggal 1 baris) */}
              <div className="bg-white rounded-2xl px-2.5 sm:px-3 py-2.5 shadow-xs border border-slate-100 grid grid-cols-[1.35fr_1fr] gap-x-2 gap-y-2">
                {/* Kasir */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-user text-xs"></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-gray-400 font-medium block leading-none mb-0.5">Kasir</span>
                    <span className="text-xs font-bold text-gray-900 block leading-tight truncate">
                      {effectiveKasirName}
                    </span>
                  </div>
                </div>

                {/* Sumber Uang Keluar (Teks Merah) */}
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-bag-shopping text-xs"></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-gray-400 font-medium block leading-tight truncate mb-0.5">Sumber Uang Keluar</span>
                    <span className="text-xs font-black text-rose-600 block leading-tight break-words">
                      {modalSumberKeluar}
                    </span>
                  </div>
                </div>

                {/* Waktu (Muat full teks dan tanggal 1 baris) */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-calendar-days text-xs"></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-gray-400 font-medium block leading-none mb-0.5">Waktu</span>
                    <span className="text-[11.5px] sm:text-xs font-bold text-gray-900 block leading-tight whitespace-nowrap">
                      {dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} {jam.replace(':', '.')}
                    </span>
                  </div>
                </div>

                {/* Sumber Uang Masuk (Teks Hijau) */}
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-cash-register text-xs"></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-gray-400 font-medium block leading-tight truncate mb-0.5">Sumber Uang Masuk</span>
                    <span className="text-xs font-black text-emerald-600 block leading-tight break-words">
                      {modalSumberMasuk}
                    </span>
                  </div>
                </div>
              </div>

              {/* KARTU 2: STRUKTUR HIERARKI KATEGORI, SUMBER & LAYANAN / PRODUK */}
              <div className="bg-[#EBF3FF] border border-blue-100 rounded-2xl px-3 py-2 flex flex-col shadow-2xs">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-blue-200/60">
                  <span className="text-gray-500 font-medium">Kategori Transaksi :</span>
                  <span className="font-black text-gray-900 text-right">{parsed.kategoriTransaksi}</span>
                </div>
                {parsed.kategoriTransaksi === 'Transfer' && parsed.sumberTransaksi && parsed.sumberTransaksi !== '-' && (
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-blue-200/60">
                    <span className="text-gray-500 font-medium">Sumber Transaksi :</span>
                    <span className="font-black text-blue-700 text-right uppercase">{parsed.sumberTransaksi}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs pt-1.5">
                  <span className="text-gray-500 font-medium">
                    {parsed.kategoriTransaksi === 'Tarik Tunai' ? 'Layanan / Metode :' : 'Layanan / Produk :'}
                  </span>
                  <span className="font-black text-gray-900 text-right uppercase">
                    {parsed.layananProduk || t.kategori}
                  </span>
                </div>
                {parsed.catatanTambahan && (
                  <div className="flex items-center justify-between text-[11px] pt-1.5 mt-1 border-t border-blue-200/50">
                    <span className="text-gray-400 font-medium">Ket. Tambahan:</span>
                    <span className="font-semibold text-gray-700 text-right">{parsed.catatanTambahan}</span>
                  </div>
                )}
              </div>

              {/* KARTU 3: RINCIAN MODAL */}
              <div className="bg-white rounded-2xl border border-slate-100 px-3 py-2.5 shadow-xs space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <i className="fa-solid fa-coins text-[#0066FF] text-sm"></i>
                  <h4 className="text-xs font-black text-gray-900">Rincian Modal</h4>
                </div>

                <div className="space-y-2 text-xs">
                  {appFee > 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-700">
                          <i className="fa-solid fa-wallet text-[#0066FF] text-xs w-3.5 text-center"></i>
                          <span className="font-medium">{isOrderKuota ? 'Harga Modal' : 'Nominal'}</span>
                        </div>
                        <span className="font-black text-gray-900 tabular-nums">Rp {formatRp(displayModalPokok)}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-700">
                          <i className="fa-solid fa-tags text-[#0066FF] text-xs w-3.5 text-center"></i>
                          <span className="font-medium">Fee / Biaya Aplikasi</span>
                        </div>
                        <span className="font-black text-rose-500 tabular-nums">Rp {formatRp(appFee)}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-gray-900">
                          <i className="fa-solid fa-calculator text-[#0066FF] text-xs w-3.5 text-center"></i>
                          <span className="font-black">Total Modal</span>
                        </div>
                        <span className="font-black text-gray-900 tabular-nums">Rp {formatRp(displayTotalModal)}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-700">
                          <i className="fa-solid fa-star text-amber-500 text-xs w-3.5 text-center"></i>
                          <span className="font-medium">{adminFeeLabel || 'Admin Toko (Tunai)'}</span>
                        </div>
                        <span className="font-black text-emerald-600 tabular-nums">Rp {formatRp(displayAdminFee)}</span>
                      </div>
                    </>
                  ) : (t.kategori === 'Aksesoris' || t.kategori === 'Voucher' || t.adminFee === 0) ? (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-gray-700">
                        <i className="fa-solid fa-box text-[#0066FF] text-xs w-3.5 text-center"></i>
                        <span className="font-medium">Harga Barang</span>
                      </div>
                      <span className="font-black text-gray-900 tabular-nums">Rp {formatRp(t.nominal)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-700">
                          <i className="fa-solid fa-wallet text-[#0066FF] text-xs w-3.5 text-center"></i>
                          <span className="font-medium">{t.kategori === 'Order Kuota' ? 'Harga Modal' : 'Nominal'}</span>
                        </div>
                        <span className="font-black text-gray-900 tabular-nums">Rp {formatRp(t.nominal - (t.keterangan?.includes('[ADMIN_DALAM]') ? t.adminFee : 0))}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-700">
                          <i className="fa-solid fa-star text-amber-500 text-xs w-3.5 text-center"></i>
                          <span className="font-medium">{t.kategori === 'Order Kuota' ? 'Laba / Admin' : (adminFeeLabel || 'Admin Toko (Tunai)')}</span>
                        </div>
                        <span className="font-black text-emerald-600 tabular-nums">Rp {formatRp(t.adminFee)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* KARTU 4: TOTAL BANNER BESAR */}
              <div className="bg-gradient-to-r from-[#0066FF] to-[#0052cc] rounded-2xl p-3.5 shadow-md text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white text-sm">
                    <i className="fa-solid fa-tag"></i>
                  </div>
                  <div className="h-5 w-[1.5px] bg-white/30"></div>
                  <span className="text-sm font-bold text-white tracking-wide">Total</span>
                </div>
                <span className="text-xl font-black text-white tabular-nums tracking-tight">
                  Rp {formatRp(displayTotal)}
                </span>
              </div>

              {/* TOMBOL AKSI BAWAH (PRINT & LOCKED / EDIT - LEBIH KOMPAK & MINIMALIS) */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStrukPreview(true);
                  }}
                  className="bg-white hover:bg-blue-50 text-[#0066FF] border border-blue-300 font-bold rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <i className="fa-solid fa-print text-xs"></i>
                  Print
                </button>

                {canEdit ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      setIsOpen(false);
                      handleEditClick(e);
                    }}
                    className="bg-[#0066FF] hover:bg-blue-700 text-white font-bold rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <i className="fa-solid fa-pen text-xs"></i>
                    Edit
                  </button>
                ) : (
                  <div className="bg-[#0066FF] text-white font-bold rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 text-xs shadow-xs opacity-90 select-none">
                    <i className="fa-solid fa-lock text-xs"></i>
                    Locked
                  </div>
                )}
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
                  <span>Kasir :</span>
                  <span className="font-semibold text-slate-800">{effectiveKasirName}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>No    :</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[140px]">{t.id ? t.id.slice(0, 16) : '-'}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Waktu :</span>
                  <span className="font-semibold text-slate-800">{dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} • {jam}</span>
                </div>

                <div className="border-b border-dashed border-slate-300 my-2"></div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-start text-[10px]">
                    <span className="text-slate-500 font-sans font-bold">Transaksi:</span>
                    <span className="font-bold text-slate-800 text-right flex-1 ml-2">{parsed.kategoriTransaksi.toUpperCase()}</span>
                  </div>
                  {parsed.kategoriTransaksi === 'Transfer' && parsed.sumberTransaksi && parsed.sumberTransaksi !== '-' && (
                    <div className="flex justify-between items-start text-[10px]">
                      <span className="text-slate-500 font-sans font-bold">Sumber:</span>
                      <span className="font-bold text-slate-800 text-right flex-1 ml-2">{parsed.sumberTransaksi.toUpperCase()}</span>
                    </div>
                  )}
                  {parsed.layananProduk && (
                    <div className="flex justify-between items-start text-[10px]">
                      <span className="text-slate-500 font-sans font-bold">
                        {parsed.kategoriTransaksi === 'Tarik Tunai' ? 'Metode:' : 'Tujuan:'}
                      </span>
                      <span className="font-bold text-slate-800 text-right flex-1 ml-2">{parsed.layananProduk.toUpperCase()}</span>
                    </div>
                  )}
                  {parsed.catatanTambahan && (
                    <div className="flex justify-between items-start text-[10px]">
                      <span className="text-slate-500 font-sans font-bold">Ket  :</span>
                      <span className="text-slate-700 text-right flex-1 ml-2 break-words">{parsed.catatanTambahan}</span>
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-slate-300 my-2"></div>

                {/* Pricing Breakdown */}
                <div className="flex flex-col gap-1 text-[11px]">
                  {appFee > 0 ? (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-600">{isOrderKuota ? 'Harga Modal' : 'Nominal'}</span>
                        <span>Rp {formatRp(displayModalPokok)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-rose-600">
                        <span>Fee / Biaya Aplikasi</span>
                        <span>Rp {formatRp(appFee)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold pt-0.5 border-t border-dotted border-slate-200">
                        <span>Total Modal</span>
                        <span>Rp {formatRp(displayTotalModal)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-emerald-700">
                        <span>{adminFeeLabel.replace(' :', '').replace(':', '')}</span>
                        <span>Rp {formatRp(displayAdminFee)}</span>
                      </div>
                      <div className="border-b border-dashed border-slate-300 my-1"></div>
                      <div className="flex justify-between font-black text-[12px] text-slate-900">
                        <span>TOTAL</span>
                        <span>Rp {formatRp(displayTotal)}</span>
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
                  ) : (t.kategori === 'Aksesoris' || t.kategori === 'Voucher' || t.adminFee === 0) ? (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-600">Harga Barang</span>
                        <span>Rp {formatRp(t.nominal)}</span>
                      </div>
                      <div className="border-b border-dashed border-slate-300 my-1"></div>
                      <div className="flex justify-between font-black text-[12px] text-slate-900">
                        <span>TOTAL</span>
                        <span>Rp {formatRp(t.nominal)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-600">{t.kategori === 'Order Kuota' ? 'Harga Modal' : 'Nominal'}</span>
                        <span>Rp {formatRp(t.nominal)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-600">{t.kategori === 'Order Kuota' ? 'Laba / Admin' : 'Biaya Admin'}</span>
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
