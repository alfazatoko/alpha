import React, { useState, useRef } from "react";
import { ArrowLeft, Printer, Plus, Trash2 } from "lucide-react";
import { formatRupiah, formatInputRupiah, parseNominal, getLocalISOString, cn } from "../lib/utils";

interface NotaItem {
  nama: string;
  harga: string;
  jumlah: string;
}

const NotaView: React.FC<{ active: boolean; setActiveView: (v: string) => void; showToast: (m: string) => void; onConfirm: (t: string, m: string, c: () => void) => void; isPc?: boolean }> = ({ active, setActiveView, isPc }) => {
  
  const [shopName, setShopName] = useState(() => localStorage.getItem('nota_shopName') || localStorage.getItem('alphaPro_storeName') || "ALFAZA CELL");
  const [address, setAddress] = useState(() => localStorage.getItem('nota_address') || "Jl. Merdeka No. 123, Indonesia");
  const [footerText, setFooterText] = useState(() => localStorage.getItem('nota_footer') || "TERIMA KASIH");

  React.useEffect(() => {
    localStorage.setItem('nota_shopName', shopName);
    localStorage.setItem('nota_address', address);
    localStorage.setItem('nota_footer', footerText);
  }, [shopName, address, footerText]);
  const [items, setItems] = useState<NotaItem[]>([]);
  const [currentItem, setCurrentItem] = useState<NotaItem>({ nama: "", harga: "", jumlah: "" });
  const [tanggal, setTanggal] = useState(getLocalISOString().split('T')[0]);
  const [ukuranKertas, setUkuranKertas] = useState<'58mm'|'80mm'>('58mm');
  const [openSettingToko, setOpenSettingToko] = useState(false);

  const [isPreview, setIsPreview] = useState(false);
  
  const namaRef = useRef<HTMLInputElement>(null);
  const hargaRef = useRef<HTMLInputElement>(null);
  const jumlahRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>, isLast: boolean = false) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isLast) {
        handleSimpanItem();
        namaRef.current?.focus();
      } else {
        nextRef?.current?.focus();
      }
    }
  };

  const handleSimpanItem = () => {
    if (!currentItem.nama || !currentItem.harga || !currentItem.jumlah) return;
    setItems([...items, currentItem]);
    setCurrentItem({ nama: "", harga: "", jumlah: "" });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const harga = parseNominal(item.harga);
      const jumlah = parseFloat(item.jumlah) || 0;
      return total + (harga * jumlah);
    }, 0);
  };

  // Helper: format baris teks rata tengah (untuk kertas thermal ~32 karakter)
  const PAPER_WIDTH = 32;
  const centerText = (text: string) => {
    const pad = Math.max(0, Math.floor((PAPER_WIDTH - text.length) / 2));
    return ' '.repeat(pad) + text;
  };
  const rightAlignTwo = (left: string, right: string) => {
    const space = Math.max(1, PAPER_WIDTH - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };
  const divider = '-'.repeat(PAPER_WIDTH);

  const handlePrint = () => {
    const isNative = !!(window as any)?.Capacitor?.isNativePlatform?.() || /android/i.test(navigator.userAgent);
    
    if (isNative) {
      // Format teks biasa tanpa tag kode (plain text untuk RawBT)
      const noRef = Date.now().toString().slice(-6);
      let receiptText = '';
      receiptText += centerText(shopName) + '\n';
      receiptText += centerText(address) + '\n';
      receiptText += `Tgl: ${tanggal}\n`;
      receiptText += `No: #${noRef}\n`;
      receiptText += divider + '\n';
      
      items.forEach(item => {
        receiptText += item.nama + '\n';
        const qtyHarga = `${item.jumlah} x ${item.harga}`;
        const total = formatRupiah(parseNominal(item.harga) * (parseFloat(item.jumlah) || 0));
        receiptText += rightAlignTwo(qtyHarga, total) + '\n';
      });
      
      receiptText += divider + '\n';
      receiptText += rightAlignTwo('TOTAL:', formatRupiah(calculateTotal())) + '\n';
      receiptText += divider + '\n';
      receiptText += centerText(footerText) + '\n';
      receiptText += '\n\n\n';
      
      const btMacAddress = localStorage.getItem('bluetooth_printer_mac');
      if (btMacAddress && (window as any).bluetoothSerial) {
        // Gunakan bluetoothSerial jika terhubung ke native bluetooth
        (window as any).bluetoothSerial.write(
          receiptText,
          () => {
             // Berhasil cetak native
          },
          (err: any) => {
             alert('Gagal cetak via Bluetooth Native: ' + err);
          }
        );
      } else {
        // Coba rawbt:// scheme via anchor click (lebih kompatibel di Capacitor WebView)
        const tryPrint = (scheme: string) => {
          const a = document.createElement('a');
          a.href = scheme;
          a.rel = 'noopener';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };

        try {
          // Metode 1: rawbt: URI langsung (didukung semua versi RawBT)
          tryPrint(`rawbt:${encodeURIComponent(receiptText)}`);
        } catch (e) {
          try {
            // Metode 2: intent scheme sebagai fallback
            tryPrint(`intent:${encodeURIComponent(receiptText)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`);
          } catch (e2) {
            console.error("Gagal mencetak via RawBT", e2);
            alert("Gagal membuka printer. Pastikan aplikasi RawBT sudah terinstal dan printer sudah di-pair.");
          }
        }
      }
    } else {
      window.print();
    }
  };

  const ThermalReceipt = () => (
    <div className="bg-white text-black mx-auto p-3 flex flex-col font-mono" style={{ width: ukuranKertas, minHeight: '150px' }}>
      <div className="text-center mb-3">
        <h2 className="text-[14px] font-bold leading-tight">{shopName}</h2>
        <p className="text-[10px] leading-tight">{address}</p>
      </div>
      <div className="text-[10px] mb-2 border-b border-black border-dashed pb-2 space-y-0.5">
        <div className="flex justify-between"><span>Tgl:</span><span>{tanggal}</span></div>
        <div className="flex justify-between"><span>No:</span><span>#{Date.now().toString().slice(-6)}</span></div>
      </div>
      <table className="w-full text-[10px] mb-2">
        <thead>
          <tr className="border-b border-black border-dashed">
            <th className="text-left font-normal pb-1">Item</th>
            <th className="text-center font-normal px-1 pb-1">Qty</th>
            <th className="text-right font-normal pb-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="py-1 align-top pr-1 leading-tight">{item.nama}</td>
              <td className="py-1 text-center align-top leading-tight">{item.jumlah}</td>
              <td className="py-1 text-right align-top leading-tight">{formatRupiah(parseNominal(item.harga) * (parseFloat(item.jumlah) || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-black border-dashed pt-2 flex justify-between items-center text-[11px] font-bold">
        <span>TOTAL</span>
        <span className="text-[12px]">{formatRupiah(calculateTotal())}</span>
      </div>
      <div className="text-center mt-6 text-[10px]">
        <p className="font-bold whitespace-pre-wrap">{footerText}</p>
      </div>
    </div>
  );

  if (!active) return null;

  if (isPc) {
    return (
      <div className={cn("flex-grow h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden", active ? "flex" : "hidden")}>
        
        <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0 no-print">
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">Pembuat Nota Thermal</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Tulis daftar belanja dan cetak via printer thermal (Bluetooth/USB)</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={ukuranKertas} 
              onChange={(e) => setUkuranKertas(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="58mm">Kertas 58mm (Mini)</option>
              <option value="80mm">Kertas 80mm (Standar)</option>
            </select>
            <button 
              onClick={handlePrint} 
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black shadow-md flex items-center gap-2 uppercase tracking-widest transition-all active:scale-95"
              style={{ color: '#ffffff' }}
            >
              <Printer className="w-4 h-4" /> Cetak Nota
            </button>
          </div>
        </div>

        <div className="flex-grow flex overflow-hidden p-8 gap-8 no-print">
          
          <div className="w-[420px] shrink-0 h-full flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-thin">
            
            <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm">
              <div 
                className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => setOpenSettingToko(!openSettingToko)}
              >
                <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-store text-blue-600"></i> Pengaturan Toko
                </h4>
                <i className={cn("fa-solid fa-chevron-right text-slate-400 transition-transform duration-300 text-[10px]", openSettingToko && "rotate-90")}></i>
              </div>
              
              {openSettingToko && (
                <div className="px-6 pb-6 pt-2 space-y-3 border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Toko/Instansi</label>
                    <input 
                      value={shopName} 
                      onChange={e => setShopName(e.target.value)} 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Alamat Toko</label>
                    <input 
                      value={address} 
                      onChange={e => setAddress(e.target.value)} 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Teks Ucapan (Bawah)</label>
                    <textarea 
                      value={footerText} 
                      onChange={e => setFooterText(e.target.value)} 
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none resize-none" 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest pb-2 border-b border-slate-100 dark:border-slate-700">Input Data Barang/Jasa</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tanggal Transaksi</label>
                  <input 
                    type="date" 
                    value={tanggal} 
                    onChange={e => setTanggal(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Barang / Jasa</label>
                  <input 
                    ref={namaRef}
                    value={currentItem.nama} 
                    onChange={e => setCurrentItem({...currentItem, nama: e.target.value})} 
                    placeholder="Contoh: Transfer BRI 500rb..." 
                    onKeyDown={(e) => handleKeyDown(e, hargaRef)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Harga Satuan</label>
                    <input 
                      ref={hargaRef}
                      value={currentItem.harga} 
                      onChange={e => setCurrentItem({...currentItem, harga: formatInputRupiah(e.target.value)})} 
                      placeholder="0" 
                      onKeyDown={(e) => handleKeyDown(e, jumlahRef)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Jumlah (Qty)</label>
                    <input 
                      ref={jumlahRef}
                      type="number" 
                      value={currentItem.jumlah} 
                      onChange={e => setCurrentItem({...currentItem, jumlah: e.target.value})} 
                      placeholder="1" 
                      onKeyDown={(e) => handleKeyDown(e, undefined, true)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none" 
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSimpanItem} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black py-3.5 rounded-xl shadow-md transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2"
                  style={{ color: '#ffffff' }}
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah ke Daftar
                </button>
              </div>
            </div>

          </div>

          <div className="flex-grow h-full flex flex-col items-center justify-start overflow-y-auto pr-1 bg-slate-200 dark:bg-slate-950 rounded-2xl py-8">
            {items.length === 0 ? (
               <div className="text-center text-slate-400 italic text-sm mt-20">Belum ada item ditambahkan ke nota</div>
            ) : (
              <div className="shadow-2xl">
                 <ThermalReceipt />
              </div>
            )}
            
            {/* List for deleting items in PC */}
            <div className="mt-8 w-full max-w-sm">
               {items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 mb-2 rounded-xl shadow-sm">
                     <span className="text-xs font-bold text-slate-800 dark:text-white">{item.nama} ({item.jumlah})</span>
                     <button onClick={() => removeItem(i)} className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100">
                        <Trash2 className="w-3 h-3" />
                     </button>
                  </div>
               ))}
            </div>
          </div>

        </div>

        {/* PRINT ONLY SECTION */}
        <div className="hidden print:block w-full thermal-print-area">
           <ThermalReceipt />
        </div>

        <style>{`
          @media print {
            @page { margin: 20mm; size: auto; }
            body { margin: 0; padding: 0; background: white !important; display: flex !important; justify-content: center !important; align-items: flex-start !important; }
            body * { visibility: hidden; }
            .thermal-print-area, .thermal-print-area * { visibility: visible; }
            .thermal-print-area {
              position: static !important;
              transform: none !important;
              margin: 0 auto;
              padding: 0;
              width: auto;
              display: block;
            }
          }
        `}</style>
      </div>
    );
  }

  if (isPreview) {
    return (
      <div className="absolute inset-0 z-[100] bg-slate-100 dark:bg-slate-900 overflow-y-auto pb-20">
        <div className="sticky top-0 left-0 right-0 px-4 py-3 flex justify-between items-center z-50 no-print bg-[#0000c6] text-white shadow-md">
          <button 
            onClick={() => setIsPreview(false)} 
            className="px-3.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-black flex items-center gap-1.5 border border-white/20 active:scale-95 transition-all backdrop-blur-md shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> <span>KEMBALI</span>
          </button>
          
          <div className="flex items-center gap-2">
            <select 
              value={ukuranKertas} 
              onChange={(e) => setUkuranKertas(e.target.value as any)}
              className="bg-white/15 border border-white/20 text-white rounded-xl px-3 py-1.5 text-xs font-black outline-none cursor-pointer backdrop-blur-md"
            >
              <option value="58mm" className="text-slate-900">58mm (Mini)</option>
              <option value="80mm" className="text-slate-900">80mm (Standar)</option>
            </select>
            <button 
              onClick={handlePrint} 
              className="px-4 py-1.5 bg-white text-[#0000c6] hover:bg-blue-50 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" /> <span>CETAK</span>
            </button>
          </div>
        </div>

        <div className="pt-6 px-4 flex justify-center no-print">
          <div className="shadow-2xl rounded-sm">
            <ThermalReceipt />
          </div>
        </div>

        <div className="hidden print:block w-full thermal-print-area">
          <ThermalReceipt />
        </div>

        <style>{`
          @media print {
            @page { margin: 20mm; size: auto; }
            body { margin: 0; padding: 0; background: white !important; display: flex !important; justify-content: center !important; align-items: flex-start !important; }
            body * { visibility: hidden; }
            .thermal-print-area, .thermal-print-area * { visibility: visible; }
            .thermal-print-area {
              position: static !important;
              transform: none !important;
              margin: 0 auto;
              padding: 0;
              width: auto;
              display: block;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-view active bg-slate-50 dark:bg-slate-900 min-h-screen hide-scrollbar pb-24">
      {/* HEADER UTAMA: Senada Halaman Utama (bg-[#0000c6] + Geometric Pattern) */}
      <div className="relative bg-[#0000c6] text-white overflow-hidden pb-4 pt-6 px-4 shadow-md">
        {/* Futuristic Geometric Pattern (Sama dengan GlobalHeader halaman utama) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 mix-blend-overlay"></div>
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="stripes-nota" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
              </pattern>
            </defs>
            <circle cx="10%" cy="10%" r="60" fill="url(#stripes-nota)" />
            <circle cx="95%" cy="95%" r="80" fill="url(#stripes-nota)" />
            <circle cx="35%" cy="30%" r="20" fill="url(#stripes-nota)" opacity="0.8" />
            <circle cx="80%" cy="60%" r="30" fill="url(#stripes-nota)" opacity="0.6" />
            <circle cx="50%" cy="50%" r="90" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <circle cx="15%" cy="75%" r="7" fill="rgba(255,255,255,0.7)" />
            <circle cx="80%" cy="35%" r="4" fill="#ffffff" opacity="0.8" />
          </svg>
        </div>

        {/* Content Header Bar (Minimalis 1 Baris Utama) */}
        <div className="relative z-10 max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* Tombol Back */}
          <button 
            onClick={() => setActiveView('view-beranda')}
            className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 active:scale-90 hover:bg-white/25 transition-all shadow-sm"
            title="Kembali ke Beranda"
          >
            <i className="fa-solid fa-arrow-left text-sm"></i>
          </button>

          {/* Judul & Subtitle */}
          <div className="flex-1 text-center">
            <h1 className="text-xs sm:text-sm font-black text-white leading-tight uppercase tracking-widest drop-shadow-sm">
              NOTA THERMAL
            </h1>
            <p className="text-[7.5px] sm:text-[8.5px] text-blue-100 font-bold uppercase tracking-wider opacity-90 drop-shadow-sm mt-0.5">
              {shopName || 'ALFAZA CELL'} • CETAK STRUK BLUETOOTH / USB
            </p>
          </div>

          {/* Tombol Aksi Kanan (Cetak / Preview & Exit) */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setIsPreview(true)} 
              title="Preview & Cetak Struk"
              className="relative w-9 h-9 rounded-xl bg-white text-[#0000c6] flex items-center justify-center shadow-md active:scale-90 hover:bg-blue-50 transition-all font-black"
            >
              <Printer className="w-4 h-4" />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-1 rounded-full bg-rose-600 text-white text-[7.5px] font-black flex items-center justify-center border border-white shadow-sm">
                  {items.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveView('view-beranda')}
              className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 active:scale-90 hover:bg-white/25 transition-all shadow-sm"
              title="Tutup"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Status & Selector Bar (Mirip White Bar di Beranda) */}
      <div className="px-3 -mt-2.5 relative z-20 max-w-2xl mx-auto">
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm w-full flex items-center justify-between px-3 py-1.5 rounded-full shadow-md border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center gap-1.5">
            <span className="text-[8.5px] sm:text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <i className="fa-solid fa-receipt text-blue-600"></i> Kertas:
            </span>
            <div className="inline-flex rounded-full p-0.5 bg-slate-100 dark:bg-slate-700">
              <button
                type="button"
                onClick={() => setUkuranKertas('58mm')}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[8px] font-black transition-all",
                  ukuranKertas === '58mm'
                    ? "bg-[#0000c6] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-black"
                )}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setUkuranKertas('80mm')}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[8px] font-black transition-all",
                  ukuranKertas === '80mm'
                    ? "bg-[#0000c6] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-black"
                )}
              >
                80mm
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[8.5px] sm:text-[9px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <i className="fa-regular fa-calendar text-blue-600"></i>
              <span>{tanggal}</span>
            </span>
            <span className="text-[8.5px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
              {items.length} Item
            </span>
          </div>
        </div>
      </div>

      {/* Konten Utama Form Nota */}
      <div className="max-w-2xl mx-auto px-3.5 pt-3 space-y-3">
        {/* PENGATURAN TOKO */}
        <div className="shadow-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800 overflow-hidden">
          <div 
            className="p-3.5 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            onClick={() => setOpenSettingToko(!openSettingToko)}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#0000c6] dark:text-blue-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-store text-xs"></i>
              </div>
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-[11px] uppercase tracking-wider">
                  Pengaturan Toko & Footer
                </h3>
                <p className="text-[8.5px] text-slate-400 font-bold uppercase">
                  Nama, alamat & ucapan di struk
                </p>
              </div>
            </div>
            <i className={cn("fa-solid fa-chevron-right text-slate-400 transition-transform duration-300 text-xs", openSettingToko && "rotate-90")}></i>
          </div>
          
          {openSettingToko && (
            <div className="p-3.5 pt-1 space-y-2.5 border-t border-slate-100 dark:border-slate-700/80 animate-in slide-in-from-top-2 fade-in duration-200">
              <div>
                <label className="block text-[8.5px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">NAMA TOKO</label>
                <input 
                  value={shopName} 
                  onChange={e => setShopName(e.target.value)} 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:bg-white transition-all" 
                />
              </div>
              <div>
                <label className="block text-[8.5px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">ALAMAT TOKO</label>
                <input 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:bg-white transition-all" 
                />
              </div>
              <div>
                <label className="block text-[8.5px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">TEKS UCAPAN (BAWAH)</label>
                <textarea 
                  value={footerText} 
                  onChange={e => setFooterText(e.target.value)} 
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:bg-white transition-all resize-none" 
                />
              </div>
            </div>
          )}
        </div>

        {/* INPUT DATA NOTA */}
        <div className="p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800 space-y-3">
          <div className="flex items-center gap-2.5 pb-1">
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#0000c6] dark:text-blue-400 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-file-invoice text-xs"></i>
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-[11px] uppercase tracking-wider">
                Input Data Transaksi
              </h3>
              <p className="text-[8.5px] text-slate-400 font-bold uppercase">
                Tambahkan item ke daftar nota
              </p>
            </div>
          </div>
          
          <div className="space-y-2.5">
            <div>
              <label className="block text-[8.5px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">TANGGAL TRANSAKSI</label>
              <input 
                type="date" 
                value={tanggal} 
                onChange={e => setTanggal(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:bg-white transition-all" 
              />
            </div>

            <div>
              <label className="block text-[8.5px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">NAMA BARANG / JASA</label>
              <input 
                ref={namaRef}
                value={currentItem.nama} 
                onChange={e => setCurrentItem({...currentItem, nama: e.target.value})} 
                placeholder="Contoh: Tarik Tunai 1jt / Pulsa 50k" 
                onKeyDown={(e) => handleKeyDown(e, hargaRef)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:bg-white transition-all" 
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[8.5px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">HARGA SATUAN (RP)</label>
                <input 
                  ref={hargaRef}
                  value={currentItem.harga} 
                  onChange={e => setCurrentItem({...currentItem, harga: formatInputRupiah(e.target.value)})} 
                  placeholder="0" 
                  onKeyDown={(e) => handleKeyDown(e, jumlahRef)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:bg-white transition-all" 
                />
              </div>
              <div>
                <label className="block text-[8.5px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">JUMLAH (QTY)</label>
                <input 
                  ref={jumlahRef}
                  type="number" 
                  value={currentItem.jumlah} 
                  onChange={e => setCurrentItem({...currentItem, jumlah: e.target.value})} 
                  placeholder="1" 
                  onKeyDown={(e) => handleKeyDown(e, undefined, true)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:bg-white transition-all" 
                />
              </div>
            </div>

            <button 
              onClick={handleSimpanItem} 
              className="w-full bg-[#0000c6] hover:bg-blue-800 text-white text-[10px] font-black py-2.5 rounded-xl shadow-md transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2 mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> TAMBAH KE DAFTAR
            </button>
          </div>

          {/* Daftar Belanja */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daftar Item Nota</h4>
              <span className="text-[9px] font-bold text-slate-400">{items.length} item</span>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 italic text-xs">
                Belum ada barang ditambahkan
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{item.nama}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{item.jumlah} × Rp {item.harga}</p>
                    </div>
                    <div className="text-right flex items-center gap-2.5 shrink-0">
                      <p className="text-xs font-black text-blue-600 dark:text-blue-400">
                        {formatRupiah(parseNominal(item.harga) * (parseFloat(item.jumlah) || 0))}
                      </p>
                      <button 
                        onClick={() => removeItem(index)} 
                        className="w-6 h-6 rounded-lg bg-red-50 text-red-500 dark:bg-red-950/30 flex items-center justify-center hover:bg-red-100 active:scale-90 transition-all"
                        title="Hapus Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Total & Tombol Cetak */}
                <div className="bg-[#0000c6] p-4 rounded-2xl flex justify-between items-center text-white shadow-lg shadow-blue-900/20 mt-4">
                  <div>
                    <p className="text-[8.5px] font-black text-blue-200 uppercase tracking-widest">TOTAL BAYAR</p>
                    <p className="text-lg font-black leading-tight mt-0.5">{formatRupiah(calculateTotal())}</p>
                  </div>
                  <button 
                    onClick={() => setIsPreview(true)} 
                    className="px-3.5 py-2 bg-white text-[#0000c6] hover:bg-blue-50 text-xs font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Struk</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotaView;
