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

  const handlePrint = () => {
    window.print();
  };

  if (!active) return null;

  if (isPc) {
    return (
      <div className={cn("flex-grow h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden", active ? "flex" : "hidden")}>
        
        <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0 no-print">
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">Pembuat Nota Digital</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Tulis daftar belanja/jasa dan cetak struk nota fisik secara langsung</p>
          </div>
          
          <button 
            onClick={handlePrint} 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black shadow-md flex items-center gap-2 uppercase tracking-widest transition-all active:scale-95"
            style={{ color: '#ffffff' }}
          >
            <Printer className="w-4 h-4" /> Cetak Nota
          </button>
        </div>

        <div className="flex-grow flex overflow-hidden p-8 gap-8">
          
          <div className="w-[420px] shrink-0 h-full flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-thin no-print">
            
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

          <div className="flex-grow h-full flex flex-col items-center justify-start overflow-y-auto pr-1">
            <div className="bg-white text-slate-900 w-full max-w-[480px] p-10 rounded-2xl shadow-xl border border-slate-200 dark:border-none font-serif min-h-[600px] relative print:shadow-none print:border-none print:p-0">
              
              <div className="text-center mb-8 border-b-2 border-slate-900 pb-6">
                <h2 className="text-2xl font-black mb-1 text-slate-900">{shopName}</h2>
                <p className="text-xs font-bold text-slate-500">{address}</p>
              </div>

              <div className="mb-6 space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>TANGGAL:</span>
                  <span>{tanggal}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>NOMOR:</span>
                  <span>#{Date.now().toString().slice(-6)}</span>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="py-24 text-center text-slate-400 italic text-sm border-y border-dashed border-slate-200 my-6">
                  Belum ada item ditambahkan ke nota
                </div>
              ) : (
                <>
                  <table className="w-full mb-8">
                    <thead>
                      <tr className="border-b-2 border-slate-900 text-left text-xs text-slate-800">
                        <th className="py-2">ITEM</th>
                        <th className="py-2 text-center">QTY</th>
                        <th className="py-2 text-right">HARGA</th>
                        <th className="py-2 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, i) => (
                        <tr key={i} className="text-xs text-slate-800">
                          <td className="py-3 font-bold flex items-center justify-between group">
                            <span>{item.nama}</span>
                            <button 
                              onClick={() => removeItem(i)} 
                              className="p-1 rounded bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity no-print ml-2"
                              title="Hapus Item"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="py-3 text-center">{item.jumlah}</td>
                          <td className="py-3 text-right">{item.harga}</td>
                          <td className="py-3 text-right font-bold">{formatRupiah(parseNominal(item.harga) * (parseFloat(item.jumlah) || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-900">
                        <td colSpan={3} className="py-4 text-right font-black text-sm">TOTAL:</td>
                        <td className="py-4 text-right font-black text-base text-blue-700">{formatRupiah(calculateTotal())}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="text-center mt-12 border-t border-dashed border-slate-200 pt-6">
                    <p className="text-sm font-black italic text-slate-900">TERIMA KASIH</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Atas Kepercayaan Anda</p>
                  </div>
                </>
              )}

            </div>
          </div>

        </div>

        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; background: white !important; }
            .flex-grow, .h-full, .flex, .bg-slate-50 { display: block !important; height: auto !important; background: white !important; }
            .max-w-[480px] { max-w: 100% !important; box-shadow: none !important; border: none !important; padding: 0 !important; }
          }
        `}</style>
      </div>
    );
  }

  if (isPreview) {
    return (
      <div className="absolute inset-0 z-[100] bg-white overflow-y-auto">
        <div className="absolute top-4 left-4 right-4 flex justify-between z-50 no-print">
          <button onClick={() => setIsPreview(false)} className="px-5 py-2.5 bg-gray-900 text-white rounded-full font-bold shadow-xl flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> BATAL
          </button>
          <button onClick={handlePrint} className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-black shadow-xl flex items-center gap-2">
            <Printer className="w-5 h-5" /> CETAK NOTA
          </button>
        </div>

        <div className="pt-24 px-6 pb-12 max-w-lg mx-auto font-serif">
          <div className="text-center mb-8 border-b-2 border-black pb-6">
            <h2 className="text-3xl font-black mb-1">{shopName}</h2>
            <p className="text-sm font-bold text-gray-600">{address}</p>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm font-bold mb-1">
              <span>TANGGAL:</span>
              <span>{tanggal}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>NOMOR:</span>
              <span>#{Date.now().toString().slice(-6)}</span>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-black text-left text-xs">
                <th className="py-2">ITEM</th>
                <th className="py-2 text-center">QTY</th>
                <th className="py-2 text-right">HARGA</th>
                <th className="py-2 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, i) => (
                <tr key={i} className="text-sm">
                  <td className="py-3 font-bold">{item.nama}</td>
                  <td className="py-3 text-center">{item.jumlah}</td>
                  <td className="py-3 text-right">{item.harga}</td>
                  <td className="py-3 text-right font-bold">{formatRupiah(parseNominal(item.harga) * (parseFloat(item.jumlah) || 0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black">
                <td colSpan={3} className="py-4 text-right font-black text-lg">TOTAL:</td>
                <td className="py-4 text-right font-black text-lg text-blue-700">{formatRupiah(calculateTotal())}</td>
              </tr>
            </tfoot>
          </table>

          <div className="text-center mt-12 border-t border-dashed border-black pt-6">
            <p className="text-lg font-black italic">TERIMA KASIH</p>
            <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">Atas Kepercayaan Anda</p>
          </div>
        </div>

        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; }
            .fixed { position: static !important; }
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
          <h2 className="text-sm font-black tracking-tight leading-none uppercase">Nota Belanja</h2>
          <p className="text-[9px] text-blue-100 font-medium mt-1">Cetak struk belanja</p>
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
