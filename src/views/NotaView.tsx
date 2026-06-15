import React, { useState, useRef } from "react";
import { ArrowLeft, Printer, Plus, Trash2 } from "lucide-react";
import { formatRupiah, formatInputRupiah, parseNominal, getLocalISOString, cn } from "../lib/utils";

interface NotaItem {
  nama: string;
  harga: string;
  jumlah: string;
}

const NotaView: React.FC<{ active: boolean; setActiveView: (v: string) => void; showToast: (m: string) => void; onConfirm: (t: string, m: string, c: () => void) => void; isPc?: boolean }> = ({ active, setActiveView, isPc }) => {
  
  const [shopName, setShopName] = useState("ALPHA - Agen BRILink");
  const [address, setAddress] = useState("Jl. Merdeka No. 123, Indonesia");
  const [items, setItems] = useState<NotaItem[]>([]);
  const [currentItem, setCurrentItem] = useState<NotaItem>({ nama: "", harga: "", jumlah: "" });
  const [tanggal, setTanggal] = useState(getLocalISOString().split('T')[0]);
  const [ukuranKertas, setUkuranKertas] = useState<'58mm'|'80mm'>('58mm');

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
      receiptText += centerText('TERIMA KASIH') + '\n';
      receiptText += '\n\n\n';
      
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
        // Metode 1: rawbt:// URI langsung (didukung semua versi RawBT)
        tryPrint(`rawbt://${encodeURIComponent(receiptText)}`);
      } catch (e) {
        try {
          // Metode 2: intent scheme sebagai fallback
          tryPrint(`intent:${encodeURIComponent(receiptText)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`);
        } catch (e2) {
          console.error("Gagal mencetak via RawBT", e2);
          alert("Gagal membuka printer. Pastikan aplikasi RawBT sudah terinstal dan printer sudah di-pair.");
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
        <p className="font-bold">TERIMA KASIH</p>
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
            
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest pb-2 border-b border-slate-100 dark:border-slate-700">Pengaturan Toko</h4>
              
              <div className="space-y-3">
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
              </div>
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
      <div className="absolute inset-0 z-[100] bg-slate-200 overflow-y-auto pb-20">
        <div className="sticky top-0 left-0 right-0 p-4 flex justify-between z-50 no-print bg-slate-900 shadow-md">
          <button onClick={() => setIsPreview(false)} className="px-5 py-2.5 bg-white/10 text-white rounded-full font-bold flex items-center gap-2 active:scale-95">
            <ArrowLeft className="w-4 h-4" /> KEMBALI
          </button>
          <div className="flex items-center gap-2">
            <select 
              value={ukuranKertas} 
              onChange={(e) => setUkuranKertas(e.target.value as any)}
              className="bg-white/10 border-none text-white rounded-full px-3 py-2.5 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="58mm" className="text-black">58mm</option>
              <option value="80mm" className="text-black">80mm</option>
            </select>
            <button onClick={handlePrint} className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-black shadow-xl flex items-center gap-2 active:scale-95">
              <Printer className="w-5 h-5" /> CETAK
            </button>
          </div>
        </div>

        <div className="pt-8 px-4 flex justify-center no-print">
           <div className="shadow-2xl">
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
    <div className="page-view active bg-gray-50 hide-scrollbar pb-24">
      <div className="px-4 pt-7 pb-4 border-b flex justify-between items-center bg-slate-900 text-white shadow-lg">
        <button 
          onClick={() => setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="text-center">
          <h2 className="font-black text-xs uppercase tracking-widest leading-none">NOTA DIGITAL</h2>
          <p className="text-[8px] text-white/50 mt-1 font-bold">ALFAZA CELL</p>
        </div>
        <button 
          onClick={() => setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white p-5 shadow-lg flex justify-between items-center rounded-b-[2rem] mb-4">
        <div>
          <h2 className="text-sm font-black tracking-tight leading-none uppercase">Nota Thermal</h2>
          <p className="text-[9px] text-blue-100 font-medium mt-1">Cetak struk via printer thermal</p>
        </div>
        <button onClick={() => setIsPreview(true)} className="w-10 h-10 rounded-2xl bg-white text-blue-600 flex items-center justify-center shadow-lg active:scale-90 transition-all">
          <Printer className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5">
        <div className="p-4 shadow-sm border border-gray-200 rounded-xl bg-white space-y-3">
          <h3 className="font-black text-black text-[11px] mb-3 flex items-center gap-2 uppercase tracking-tighter">
            <i className="fa-solid fa-file-invoice text-blue-700"></i> INPUT DATA NOTA
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">TANGGAL TRANSAKSI</label>
              <input 
                type="date" 
                value={tanggal} 
                onChange={e => setTanggal(e.target.value)} 
                className="form-input-modern w-full" 
              />
            </div>

            <div>
              <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">NAMA BARANG / JASA</label>
              <input 
                ref={namaRef}
                value={currentItem.nama} 
                onChange={e => setCurrentItem({...currentItem, nama: e.target.value})} 
                placeholder="Contoh: Tarik Tunai 1jt" 
                onKeyDown={(e) => handleKeyDown(e, hargaRef)}
                className="form-input-modern w-full" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex-1">
                <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">HARGA SATUAN</label>
                <input 
                  ref={hargaRef}
                  value={currentItem.harga} 
                  onChange={e => setCurrentItem({...currentItem, harga: formatInputRupiah(e.target.value)})} 
                  placeholder="0" 
                  onKeyDown={(e) => handleKeyDown(e, jumlahRef)}
                  className="form-input-modern w-full" 
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">JUMLAH (QTY)</label>
                <input 
                  ref={jumlahRef}
                  type="number" 
                  value={currentItem.jumlah} 
                  onChange={e => setCurrentItem({...currentItem, jumlah: e.target.value})} 
                  placeholder="1" 
                  onKeyDown={(e) => handleKeyDown(e, undefined, true)}
                  className="form-input-modern w-full" 
                />
              </div>
            </div>

            <button onClick={handleSimpanItem} className="w-full bg-blue-700 text-white text-[10px] font-black py-2.5 rounded-lg hover:bg-blue-800 shadow-md transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2">
              <Plus className="w-3.5 h-3.5" /> TAMBAH KE DAFTAR
            </button>
          </div>

          <div className="space-y-3 pt-6 border-t border-gray-100">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daftar Belanja</h4>
            {items.length === 0 ? (
              <div className="py-10 text-center text-gray-300 italic text-xs">Belum ada barang ditambahkan</div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl group">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-800">{item.nama}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{item.jumlah} x {item.harga}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <p className="text-xs font-black text-blue-600">{formatRupiah(parseNominal(item.harga) * (parseFloat(item.jumlah) || 0))}</p>
                      <button onClick={() => removeItem(index)} className="p-1.5 rounded-lg bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="bg-blue-600 p-5 rounded-2xl flex justify-between items-center text-white shadow-lg shadow-blue-100 mt-6">
                  <div>
                    <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest">Total Bayar</p>
                    <p className="text-xl font-black leading-none mt-1">{formatRupiah(calculateTotal())}</p>
                  </div>
                  <button onClick={() => setIsPreview(true)} className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all">
                    <Printer className="w-5 h-5" />
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
