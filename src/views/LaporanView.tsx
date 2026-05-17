import React from 'react'
import { formatRupiah, cn } from '../lib/utils'
import type { Transaction } from '../types'

interface LaporanViewProps {
  active: boolean
  saldoBank: number
  totalPenjualan: number
  transactions: Transaction[]
  totalTarik: number
  totalAdmin: number
  totalAksesoris: number
  totalVolume: number
  totalSaldoKas: number
  penjualanDigital: number
  kasModal: number
  kasirRole?: string
  filterKasir?: string
  setFilterKasir?: (v: string) => void
  filterTanggal: string
  setFilterTanggal: (v: string) => void
  saldoReal: number
  onEdit: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => void
  kasirList: Record<string, any>
  setActiveView: (v: string) => void
  kasLainnya: number
}

const LaporanView: React.FC<LaporanViewProps> = (props) => {
  const [showShareMenu, setShowShareMenu] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);

  // Hitung ulang total berdasarkan transaksi yang difilter agar laporan akurat sesuai tanggal terpilih
  const sum = (txs: Transaction[]) => txs.reduce((s, t) => s + t.nominal, 0)
  const sumAdmin = (txs: Transaction[]) => txs.reduce((s, t) => s + t.adminFee, 0)
  
  const currentIsiBank = sum(props.transactions.filter(t => t.kategori === 'Isi Saldo Bank'))
  const currentPenjualanDigital = sum(props.transactions.filter(t => ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori) && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]')))
  const currentSaldoBank = currentIsiBank - sum(props.transactions.filter(t => ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori)))
  
  const currentTotalAksesoris = sum(props.transactions.filter(t => t.kategori === 'Aksesoris' && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]')))
  const currentTotalTarik = sum(props.transactions.filter(t => t.kategori === 'Tarik Tunai' && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]')))
  
  // Kas Lain Nya Calculations
  const txsAdminDalam = props.transactions.filter(t => (t.keterangan || '').includes('[ADMIN_DALAM]'))
  const totalAdminDalam = sumAdmin(txsAdminDalam)

  const txsNonTunai = props.transactions.filter(t => (t.keterangan || '').includes('[NON_TUNAI]'))
  const totalNonTunai = txsNonTunai.reduce((s, t) => s + t.nominal + t.adminFee, 0)

  const txsKhusus = props.transactions.filter(t => (t.keterangan || '').includes('[KHUSUS]'))
  const totalKhusus = txsKhusus.reduce((s, t) => s + t.nominal + t.adminFee, 0)

  // Admin fee (exclude Admin Dalam and transactions from LAIN tab)
  const currentTotalAdmin = sumAdmin(props.transactions.filter(t => !(t.keterangan || '').includes('[ADMIN_DALAM]') && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]')))
  const currentTotalSaldoKas = props.kasModal + currentPenjualanDigital + currentTotalAksesoris + currentTotalAdmin - currentTotalTarik

  const handleShare = async (type: 'download-pdf' | 'share-pdf' | 'share-excel') => {
    setShowShareMenu(false);
    setIsSharing(true);
    try {
      if (type === 'download-pdf' || type === 'share-pdf') {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;
        
        const el = document.getElementById('laporan-content');
        if (!el) {
          setIsSharing(false);
          return;
        }
        
        const headerAction = document.getElementById('laporan-header-actions');
        const shareBtn = document.getElementById('laporan-share-action');
        if (headerAction) headerAction.style.display = 'none';
        if (shareBtn) shareBtn.style.display = 'none';

        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#f9fafb' });
        
        if (headerAction) headerAction.style.display = 'flex';
        if (shareBtn) shareBtn.style.display = 'flex';

        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = 210; // A4 width in mm
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [pdfWidth, pdfHeight]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        const fileName = `Laporan_Alfaza_${props.filterTanggal}.pdf`;
        
        if (type === 'download-pdf') {
          pdf.save(fileName);
        } else {
          try {
            const { Share } = await import('@capacitor/share');
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const pdfBase64 = pdf.output('datauristring').split(',')[1];
            
            const result = await Filesystem.writeFile({
              path: fileName,
              data: pdfBase64,
              directory: Directory.Cache
            });
            await Share.share({
              title: 'Laporan Alfaza Cell',
              text: `Laporan keuangan tanggal ${props.filterTanggal}`,
              files: [result.uri],
              dialogTitle: 'Bagikan Laporan PDF'
            });
          } catch (e) {
            console.error('Share failed, fallback to download', e);
            pdf.save(fileName);
          }
        }
      } else if (type === 'share-excel') {
        let csvContent = "Kategori,Jumlah Transaksi,Nominal,Laba/Admin\n";
        const categories = ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris', 'Transaksi Khusus'];
        
        categories.forEach(cat => {
          let filtered = [];
          if (cat === 'Transaksi Khusus') {
            filtered = props.transactions.filter(t => (t.keterangan || '').includes('[KHUSUS]'));
          } else {
            filtered = props.transactions.filter(t => t.kategori === cat && !(t.keterangan || '').includes('[KHUSUS]'));
          }
          if (filtered.length > 0) {
            const qty = filtered.length;
            const nom = filtered.reduce((s,t) => s + t.nominal, 0);
            const laba = filtered.reduce((s,t) => s + t.adminFee, 0);
            csvContent += `"${cat}",${qty},${nom},${laba}\n`;
          }
        });
        
        csvContent += `\nRingkasan Kas\n`;
        csvContent += `"Modal Tunai Kasir",${props.kasModal}\n`;
        csvContent += `"Penjualan Digital",${currentPenjualanDigital}\n`;
        csvContent += `"Penjualan Aksesoris",${currentTotalAksesoris}\n`;
        csvContent += `"Total Admin Fee",${currentTotalAdmin}\n`;
        csvContent += `"Tarik Tunai Nasabah",-${currentTotalTarik}\n`;
        csvContent += `"Total KAS LAINNYA",${totalAdminDalam + totalNonTunai + totalKhusus}\n`;
        csvContent += `"TOTAL SALDO LACI KASIR",${currentTotalSaldoKas}\n`;
        
        const fileName = `Laporan_Alfaza_${props.filterTanggal}.csv`;
        try {
          const { Share } = await import('@capacitor/share');
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          
          const result = await Filesystem.writeFile({
            path: fileName,
            data: btoa(unescape(encodeURIComponent(csvContent))),
            directory: Directory.Cache
          });
          await Share.share({
            title: 'Laporan Alfaza Cell',
            text: `Data Laporan Excel (CSV) tanggal ${props.filterTanggal}`,
            files: [result.uri],
            dialogTitle: 'Bagikan Laporan Excel'
          });
        } catch (e) {
          console.error('Share failed, fallback to download', e);
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
        }
      }
    } catch (e) {
      console.error("Error generating share file:", e);
      alert("Terjadi kesalahan saat memproses file bagikan.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div id="laporan-content" className={cn("page-view hide-scrollbar bg-gray-50/50", props.active && "active")}>
      {/* HEADER BARU */}
      <div id="laporan-header-actions" className="px-4 pt-12 pb-4 border-b flex justify-between items-center theme-header text-white shadow-lg">
        <button 
          onClick={() => props.setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="text-center">
          <h2 className="font-black text-xs uppercase tracking-widest leading-none">LAPORAN KEUANGAN</h2>
          <p className="text-[8px] text-white/50 mt-1 font-bold">ALFAZA CELL</p>
        </div>
        <button 
          onClick={() => props.setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="px-1.5 pt-5 pb-4 theme-header text-white shadow-lg shadow-emerald-500/20 mb-4">
        <div className="flex justify-between items-center px-2 relative">
          <div>
            <h2 className="font-bold text-sm tracking-wide">Rekapitulasi</h2>
            <p className="text-emerald-100 text-[10px] opacity-90">Arus kas & laba</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              id="laporan-share-action"
              onClick={() => setShowShareMenu(!showShareMenu)}
              disabled={isSharing}
              className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md flex items-center gap-1.5 hover:bg-white/30 transition-all active:scale-95"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">Bagikan</span>
              {isSharing ? <i className="fa-solid fa-circle-notch fa-spin text-white text-[10px]"></i> : <i className="fa-solid fa-share-nodes text-white text-[10px]"></i>}
            </button>
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <i className="fa-solid fa-chart-line text-white text-xs"></i>
            </div>
          </div>

          {/* Share Menu Dropdown */}
          {showShareMenu && (
            <div className="absolute right-2 top-10 w-[180px] bg-white rounded-2xl shadow-xl border border-emerald-100/50 overflow-hidden z-50">
              <button onClick={() => handleShare('download-pdf')} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-700 hover:bg-emerald-50 flex items-center gap-3 border-b border-gray-50 transition-colors">
                <i className="fa-solid fa-download text-emerald-500 w-4 text-center text-sm"></i> Download PDF
              </button>
              <button onClick={() => handleShare('share-pdf')} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-700 hover:bg-emerald-50 flex items-center gap-3 border-b border-gray-50 transition-colors">
                <i className="fa-brands fa-whatsapp text-green-500 w-4 text-center text-sm"></i> Share PDF
              </button>
              <button onClick={() => handleShare('share-excel')} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-700 hover:bg-emerald-50 flex items-center gap-3 transition-colors">
                <i className="fa-solid fa-file-excel text-green-600 w-4 text-center text-sm"></i> Share Excel
              </button>
            </div>
          )}
        </div>
        {props.kasirRole === 'owner' && props.setFilterKasir && (
          <div className="mt-3 bg-white/10 p-2 rounded-xl border border-white/20 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider"><i className="fa-solid fa-user-tie mr-1"></i> Mode Pantau Kasir:</span>
            <div className="relative">
              <select 
                value={props.filterKasir || 'Semua'}
                onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                className="bg-white bg-none text-emerald-700 text-[10px] font-black rounded-lg pl-2 pr-6 py-1 outline-none border-none appearance-none cursor-pointer"
              >
                <option value="Semua">Semua Kasir</option>
                {Object.entries(props.kasirList).map(([id, acc]) => (
                  <option key={id} value={id}>{acc.name}</option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[7px] text-emerald-400 pointer-events-none"></i>
            </div>
          </div>
        )}

        <div className="mt-3 bg-white/10 p-2 rounded-xl border border-white/20 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider flex-shrink-0"><i className="fa-solid fa-calendar-day mr-1"></i> Tanggal Laporan:</span>
          <div className="flex items-center gap-2 flex-grow">
            <input 
              type="date"
              value={props.filterTanggal}
              onChange={(e) => props.setFilterTanggal(e.target.value)}
              className="bg-white text-emerald-700 text-[10px] font-black rounded-lg px-2 py-1 outline-none border-none flex-grow"
            />
          </div>
        </div>
      </div>

      <div className="px-1.5 pb-5 space-y-2.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-3xl shadow-lg shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest flex items-center gap-1.5"><i className="fa-solid fa-building-columns"></i> Saldo Bank</p>
            <p className="text-base font-black text-white mt-2 drop-shadow-sm">{formatRupiah(currentSaldoBank)}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-4 rounded-3xl shadow-lg shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            <p className="text-[10px] text-emerald-50 font-bold uppercase tracking-widest flex items-center gap-1.5"><i className="fa-solid fa-cash-register"></i> Saldo Laci Kasir</p>
            <p className="text-base font-black text-white mt-2 drop-shadow-sm">{formatRupiah(currentTotalSaldoKas)}</p>
          </div>
        </div>
        
        <div className="bg-white border border-gray-100 rounded-[2rem] p-4 shadow-xl shadow-gray-200/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-xs text-gray-800 tracking-widest uppercase flex items-center gap-2">
              <i className="fa-solid fa-chart-pie text-indigo-500 text-sm"></i> Rekap per Kategori
            </h3>
            <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-tighter">Otomatis</span>
          </div>
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-50">
                  <th className="pb-2 font-black uppercase text-[10px] tracking-widest opacity-80">Kategori</th>
                  <th className="pb-2 font-black uppercase text-[10px] tracking-widest opacity-80 text-center">Qty</th>
                  <th className="pb-2 font-black uppercase text-[10px] tracking-widest opacity-80">Nominal</th>
                  <th className="pb-2 font-black uppercase text-[10px] tracking-widest opacity-80 text-right">Laba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris', 'Transaksi Khusus'].map(cat => {
                  let filtered = [];
                  if (cat === 'Transaksi Khusus') {
                    // Group ALL khusus transactions as requested
                    filtered = props.transactions.filter(t => (t.keterangan || '').includes('[KHUSUS]'));
                  } else {
                    // Filter by category and exclude anything already grouped in Khusus or Non Tunai
                    filtered = props.transactions.filter(t => 
                      t.kategori === cat && 
                      !(t.keterangan || '').includes('[KHUSUS]')
                    );
                  }
                  
                  if (filtered.length === 0) return null
                  
                  let catColor = "bg-gray-100 text-gray-600";
                  if (cat === 'Transfer Bank') catColor = "bg-blue-100 text-blue-700";
                  if (cat === 'DANA') catColor = "bg-cyan-100 text-cyan-700";
                  if (cat === 'FLIP') catColor = "bg-orange-100 text-orange-700";
                  if (cat === 'Order Kuota') catColor = "bg-emerald-100 text-emerald-700";
                  if (cat === 'Tarik Tunai') catColor = "bg-rose-100 text-rose-700";
                  if (cat === 'Aksesoris') catColor = "bg-fuchsia-100 text-fuchsia-700";
                  if (cat === 'Transaksi Khusus') catColor = "bg-purple-100 text-purple-700";

                  return (
                    <tr key={cat} className="group hover:bg-gray-50/80 transition-all">
                      <td className="py-1 pr-2">
                        <span className={cn("px-2 py-0.5 rounded-xl text-xs font-black whitespace-nowrap inline-block", catColor)}>
                          {cat}
                        </span>
                      </td>
                      <td className="py-1 font-bold text-gray-500 text-center text-xs">{filtered.length}</td>
                      <td className="py-1 font-black text-gray-800 text-xs">{formatRupiah(filtered.reduce((s,t) => s+t.nominal, 0))}</td>
                      <td className="py-1 font-black text-emerald-600 text-right text-xs">{formatRupiah(filtered.reduce((s,t) => s+t.adminFee, 0))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <h4 className="text-[13px] font-extrabold text-emerald-600 mb-1.5 tracking-widest uppercase flex items-center gap-1.5">
              <i className="fa-solid fa-arrow-down-long"></i> KAS MASUK
            </h4>
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-emerald-100 space-y-1">
              <div className="flex justify-between items-center bg-gray-50/50 px-3 py-1 rounded-xl border border-gray-100/50">
                <span className="text-[13px] font-bold text-gray-700 flex items-center gap-2"><i className="fa-solid fa-vault text-[12px]"></i> Modal Tunai Kasir</span>
                <span className="font-black text-[14px] text-gray-800">{formatRupiah(props.kasModal)}</span>
              </div>
              <div className="flex justify-between items-center bg-blue-50/50 px-3 py-1 rounded-xl border border-blue-100/50">
                <span className="text-[13px] font-bold text-blue-700 flex items-center gap-2"><i className="fa-solid fa-globe text-[12px]"></i> Penjualan Digital</span>
                <span className="font-black text-[14px] text-blue-600">{formatRupiah(currentPenjualanDigital)}</span>
              </div>
              <div className="flex justify-between items-center bg-fuchsia-50/50 px-3 py-1 rounded-xl border border-fuchsia-100/50">
                <span className="text-[13px] font-bold text-fuchsia-700 flex items-center gap-2"><i className="fa-solid fa-headphones text-[12px]"></i> Penjualan Aksesoris</span>
                <span className="font-black text-[14px] text-fuchsia-600">{formatRupiah(currentTotalAksesoris)}</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50/50 px-3 py-1 rounded-xl border border-emerald-100/50">
                <span className="text-[13px] font-bold text-emerald-700 flex items-center gap-2"><i className="fa-solid fa-piggy-bank text-[12px]"></i> Total Admin Fee</span>
                <span className="font-black text-[14px] text-emerald-600">{formatRupiah(currentTotalAdmin)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-extrabold text-rose-600 mb-1.5 tracking-widest uppercase flex items-center gap-1.5">
              <i className="fa-solid fa-arrow-up-long"></i> KAS KELUAR
            </h4>
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-rose-100 space-y-1">
              <div className="flex justify-between items-center bg-rose-50/50 px-3 py-1 rounded-xl border border-rose-100/50">
                <span className="text-[13px] font-bold text-rose-700 flex items-center gap-2"><i className="fa-solid fa-money-bill-transfer text-[12px]"></i> Tarik Tunai Nasabah</span>
                <span className="font-black text-[14px] text-rose-600">-{formatRupiah(currentTotalTarik)}</span>
              </div>
            </div>
          </div>

          <div className="pt-1 -mx-3">
            <div className="bg-[#051c5f] px-4 py-4 rounded-[1.8rem] flex justify-between items-center shadow-xl shadow-blue-900/20 border border-blue-800">
              <div className="border border-blue-700 bg-blue-900/30 rounded-xl px-3 py-1.5 flex flex-col">
                <span className="font-black text-[10px] text-blue-200 tracking-[0.2em] uppercase leading-[1.2]">Total Saldo</span>
                <span className="font-black text-[10px] text-blue-200 tracking-[0.2em] uppercase leading-[1.2]">Laci Kasir</span>
              </div>
              <span className="font-black text-2xl text-green-400 drop-shadow-[0_2px_10px_rgba(74,222,128,0.3)]">{formatRupiah(currentTotalSaldoKas)}</span>
            </div>
          </div>

          <div>
            <div className="mb-2">
              <h4 className="text-[13px] font-extrabold text-purple-600 tracking-widest uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-layer-group"></i> KAS LAIN NYA
              </h4>
              <p className="text-[10px] font-bold text-purple-400/80 italic ml-5 -mt-0.5">Pemasukan Tambahan</p>
            </div>
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-purple-100 space-y-1">
              <div className="flex justify-between items-center bg-purple-50/50 px-3 py-1 rounded-xl border border-purple-100/50">
                <span className="text-[13px] font-bold text-purple-700 flex items-center gap-2"><i className="fa-solid fa-tags text-[12px]"></i> Admin Dalam/Non Tunai</span>
                <span className="font-black text-[14px] text-purple-600">{formatRupiah(totalAdminDalam)}</span>
              </div>
              <div className="flex justify-between items-center bg-indigo-50/50 px-3 py-1 rounded-xl border border-indigo-100/50">
                <span className="text-[13px] font-bold text-indigo-700 flex items-center gap-2"><i className="fa-solid fa-credit-card text-[12px]"></i> Transaksi Non Tunai</span>
                <span className="font-black text-[14px] text-indigo-600">{formatRupiah(totalNonTunai)}</span>
              </div>
              <div className="flex justify-between items-center bg-fuchsia-50/50 px-3 py-1 rounded-xl border border-fuchsia-100/50">
                <span className="text-[13px] font-bold text-fuchsia-700 flex items-center gap-2"><i className="fa-solid fa-star text-[12px]"></i> Transaksi Khusus</span>
                <span className="font-black text-[14px] text-fuchsia-600">{formatRupiah(totalKhusus)}</span>
              </div>
              <div className="mt-2 pt-2 border-t-2 border-purple-100/50 flex justify-between items-center px-3 py-1.5 bg-purple-100/30 rounded-xl">
                <span className="text-[13px] font-black text-purple-800 flex items-center gap-2">TOTAL KAS LAIN NYA</span>
                <span className="font-black text-[15px] text-purple-700">{formatRupiah(totalAdminDalam + totalNonTunai + totalKhusus)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-indigo-100 rounded-[1.8rem] p-3.5 -mx-3 shadow-xl shadow-indigo-500/10">
            <div className="flex justify-between items-center mb-3 px-1">
              <h4 className="text-[13px] font-black text-indigo-800 tracking-widest uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-scale-balanced text-indigo-500"></i> JURNAL PENYESUAIAN SALDO
              </h4>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black uppercase">Otomatis</span>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center p-1.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                <div>
                  <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-tight">1. Modal Saldo Bank (Isi)</p>
                  <p className="text-[9px] text-indigo-400 font-medium italic -mt-0.5">Total pengisian/setoran saldo hari ini</p>
                </div>
                <span className="font-black text-[13px] text-indigo-900">
                  {formatRupiah(currentIsiBank)}
                </span>
              </div>

              <div className="flex justify-between items-center p-1.5 bg-orange-50/50 rounded-xl border border-orange-100/50">
                <div>
                  <p className="text-[11px] font-bold text-orange-700 uppercase tracking-tight">2. Penjualan Digital</p>
                  <p className="text-[9px] text-orange-400 font-medium italic -mt-0.5">Saldo Bank yang sudah terpakai</p>
                </div>
                <span className="font-black text-[13px] text-orange-900">-{formatRupiah(currentPenjualanDigital)}</span>
              </div>

              <div className="flex justify-between items-center p-1.5 bg-blue-50/80 rounded-xl border-2 border-blue-100">
                <div>
                  <p className="text-[11px] font-bold text-blue-700 uppercase tracking-tight">3. Sisa Saldo (Buku)</p>
                  <p className="text-[9px] text-blue-400 font-medium italic -mt-0.5">Uang seharusnya di bank</p>
                </div>
                <span className="font-black text-[13px] text-blue-900">{formatRupiah(currentSaldoBank)}</span>
              </div>

              <div className="flex justify-between items-center p-1.5 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                <div>
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-tight">4. Saldo Real App (HP)</p>
                  <p className="text-[9px] text-emerald-400 font-medium italic -mt-0.5 whitespace-nowrap">Input menu 'Isi Saldo'</p>
                </div>
                <span className="font-black text-[13px] text-emerald-900">{formatRupiah(props.saldoReal)}</span>
              </div>

              {(() => {
                const selisih = props.saldoReal - currentSaldoBank;
                
                return (
                  <div className={cn(
                    "mt-3 p-3.5 -mx-1.5 rounded-2xl flex justify-between items-center border-2",
                    selisih === 0 ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/30" : 
                    selisih > 0 ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30" : "bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-500/30"
                  )}>
                    <div>
                      <p className="text-[12px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        {selisih === 0 ? <><i className="fa-solid fa-circle-check"></i> STATUS: KLOP</> : 
                         selisih > 0 ? <><i className="fa-solid fa-circle-exclamation"></i> STATUS: SURPLUS</> : 
                         <><i className="fa-solid fa-circle-xmark"></i> STATUS: SELISIH</>}
                      </p>
                      <p className="text-[10px] opacity-90 font-bold italic mt-0.5">
                        {selisih === 0 ? 'Sisa saldo di HP cocok dengan catatan buku' : 
                         selisih > 0 ? 'Saldo di HP lebih besar dari catatan' : 'Saldo di HP lebih kecil (Uang kurang)'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-[16px] block">{selisih === 0 ? '✓ MATCH' : formatRupiah(selisih)}</span>
                      {selisih !== 0 && <span className="text-[9px] font-black opacity-80 uppercase tracking-widest">Periksa Kembali</span>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LaporanView
