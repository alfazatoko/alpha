import React, { useState, useEffect, useMemo } from "react";
import { Receipt, Plus, Trash2, Edit, Check, Search, Ban, X, Camera, ImageIcon, Loader2 } from "lucide-react";
import { formatRupiah, formatInputRupiah, parseNominal, cn } from "../lib/utils";

interface HutangRecord {
  id: string;
  nama: string;
  nominal: number;
  keterangan: string;
  tanggal: string;
  lunas: boolean;
  tglLunas?: string;
  photoUrl?: string;
}

const KasbonView: React.FC<{ active: boolean; setActiveView: (v: string) => void }> = ({ active, setActiveView }) => {
  const [hutangList, setHutangList] = useState<HutangRecord[]>(JSON.parse(localStorage.getItem("hutang_list") || "[]"));
  const [searchText, setSearchText] = useState("");
  const [showLunas, setShowLunas] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<HutangRecord | null>(null);

  const [nama, setNama] = useState("");
  const [nominalDisplay, setNominalDisplay] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("hutang_list", JSON.stringify(hutangList));
  }, [hutangList]);

  const resetForm = () => {
    setNama("");
    setNominalDisplay("");
    setKeterangan("");
    setPhotoUrl("");
    setEditItem(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!nama.trim()) return alert("Nama harus diisi");
    const n = parseNominal(nominalDisplay);
    if (n <= 0) return alert("Nominal harus diisi");

    if (editItem) {
      setHutangList(hutangList.map(h => h.id === editItem.id ? { ...h, nama, nominal: n, keterangan, photoUrl } : h));
    } else {
      const newHutang: HutangRecord = {
        id: Date.now().toString(),
        nama,
        nominal: n,
        keterangan,
        tanggal: new Date().toLocaleDateString('id-ID'),
        lunas: false,
        photoUrl
      };
      setHutangList([newHutang, ...hutangList]);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Hapus kasbon ini?")) {
      setHutangList(hutangList.filter(h => h.id !== id));
    }
  };

  const handleLunas = (h: HutangRecord) => {
    setHutangList(hutangList.map(item => 
      item.id === h.id ? { ...item, lunas: !item.lunas, tglLunas: !item.lunas ? new Date().toLocaleDateString('id-ID') : undefined } : item
    ));
  };

  const openEdit = (h: HutangRecord) => {
    setEditItem(h);
    setNama(h.nama);
    setNominalDisplay(formatInputRupiah(h.nominal.toString()));
    setKeterangan(h.keterangan || "");
    setPhotoUrl(h.photoUrl || "");
    setShowForm(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsCapturing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoUrl(event.target?.result as string);
      setIsCapturing(false);
    };
    reader.readAsDataURL(file);
  };

  const filteredHutang = useMemo(() => {
    let list = hutangList;
    if (!showLunas) list = list.filter(h => !h.lunas);
    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter(h => h.nama.toLowerCase().includes(q) || (h.keterangan || "").toLowerCase().includes(q));
    }
    return list;
  }, [hutangList, showLunas, searchText]);

  const totalHutang = hutangList.filter(h => !h.lunas).reduce((sum, h) => sum + h.nominal, 0);

  if (!active) return null;

  return (
    <div className="page-view active bg-gray-50 hide-scrollbar pb-24">
      <div className="px-5 pt-7 pb-4 border-b bg-white flex items-center gap-3">
        <button onClick={() => setActiveView('view-beranda')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fa-solid fa-arrow-left text-sm"></i>
        </button>
        <h2 className="font-bold flex-1">Kasbon Pelanggan</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-blue-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Piutang (Belum Lunas)</p>
          <h3 className="text-xl font-black text-red-600">{formatRupiah(totalHutang)}</h3>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={searchText} 
              onChange={e => setSearchText(e.target.value)} 
              placeholder="Cari nama atau keterangan..." 
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-blue-400 transition-all" 
            />
          </div>
          <button 
            onClick={() => setShowLunas(!showLunas)} 
            className={cn(
              "px-3 py-2.5 rounded-xl border font-bold text-[10px] transition-all",
              showLunas ? "bg-green-50 border-green-200 text-green-600" : "bg-white border-gray-200 text-gray-500"
            )}
          >
            {showLunas ? "LUNAS: ON" : "LUNAS: OFF"}
          </button>
        </div>

        <div className="space-y-3">
          {filteredHutang.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-medium">Belum ada data kasbon</p>
            </div>
          ) : (
            filteredHutang.map(h => (
              <div key={h.id} className={cn("bg-white rounded-2xl p-4 shadow-sm border transition-all", h.lunas ? 'border-green-100 bg-green-50/30' : 'border-gray-100')}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-gray-800 truncate">{h.nama}</h4>
                    {h.keterangan && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{h.keterangan}</p>}
                  </div>
                  <div className="text-right ml-3">
                    <p className={cn("font-black text-sm", h.lunas ? 'text-green-600 line-through' : 'text-red-600')}>
                      {formatRupiah(h.nominal)}
                    </p>
                    <span className="text-[9px] text-gray-400 font-medium block mt-1">{h.tanggal}</span>
                  </div>
                </div>

                {h.photoUrl && (
                  <div 
                    className="w-full aspect-video rounded-xl bg-gray-50 border border-gray-100 mb-3 overflow-hidden cursor-pointer"
                    onClick={() => setPreviewImage(h.photoUrl!)}
                  >
                    <img src={h.photoUrl} alt="Struk" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <span className="text-[9px] text-gray-400">
                    {h.lunas ? `Lunas: ${h.tglLunas}` : "Belum Lunas"}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleLunas(h)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1", h.lunas ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600')}>
                      {h.lunas ? <Ban className="w-3 h-3" /> : <Check className="w-3 h-3" />} {h.lunas ? "Batal" : "Lunas"}
                    </button>
                    <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(h.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-4" onClick={resetForm}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg">{editItem ? "Edit Kasbon" : "Tambah Kasbon Baru"}</h3>
              <button onClick={resetForm} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Nama Pelanggan</label>
                <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Masukkan nama..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Nominal Hutang</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-400 text-sm">Rp</span>
                  <input 
                    value={nominalDisplay} 
                    onChange={e => setNominalDisplay(formatInputRupiah(e.target.value))} 
                    inputMode="numeric" 
                    placeholder="0" 
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Keterangan</label>
                <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Contoh: Pinjam saldo bank, belum bayar..." rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center gap-2 bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl py-4 cursor-pointer hover:bg-blue-100 transition-all">
                  {isCapturing ? <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> : <Camera className="w-6 h-6 text-blue-600" />}
                  <span className="text-[10px] font-bold text-blue-700">Kamera</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                </label>
                <label className="flex flex-col items-center justify-center gap-2 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl py-4 cursor-pointer hover:bg-gray-100 transition-all">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-500">Galeri</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>

              {photoUrl && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 group">
                  <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => setPhotoUrl("")} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg active:scale-90 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <button onClick={handleSave} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all">
              SIMPAN DATA KASBON
            </button>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full backdrop-blur-md">
            <X className="w-6 h-6" />
          </button>
          <img src={previewImage} alt="Large preview" className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default KasbonView;
