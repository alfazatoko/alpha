import React, { useState, useEffect, useMemo, useRef } from "react";
import { BookUser, Plus, Trash2, Edit, Search, X, Camera, ImageIcon, Loader2, Phone, Copy } from "lucide-react";

interface KontakRecord {
  id: string;
  nama: string;
  nomor: string;
  keterangan: string;
  photoUrl?: string;
}

const KontakView: React.FC<{ active: boolean; setActiveView: (v: string) => void }> = ({ active, setActiveView }) => {
  const [kontakList, setKontakList] = useState<KontakRecord[]>(JSON.parse(localStorage.getItem("kontak_list") || "[]"));
  const [searchText, setSearchText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<KontakRecord | null>(null);

  const [nama, setNama] = useState("");
  const [nomor, setNomor] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const namaRef = useRef<HTMLInputElement>(null);
  const nomorRef = useRef<HTMLInputElement>(null);
  const keteranganRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>, isLast: boolean = false) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isLast) {
        handleSave();
      } else {
        nextRef?.current?.focus();
      }
    }
  };

  useEffect(() => {
    localStorage.setItem("kontak_list", JSON.stringify(kontakList));
  }, [kontakList]);

  const resetForm = () => {
    setNama("");
    setNomor("");
    setKeterangan("");
    setPhotoUrl("");
    setEditItem(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!nama.trim()) return alert("Nama harus diisi");

    if (editItem) {
      setKontakList(kontakList.map(k => k.id === editItem.id ? { ...k, nama, nomor, keterangan, photoUrl } : k));
    } else {
      const newKontak: KontakRecord = {
        id: Date.now().toString(),
        nama,
        nomor,
        keterangan,
        photoUrl
      };
      setKontakList([newKontak, ...kontakList]);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Hapus kontak ini?")) {
      setKontakList(kontakList.filter(k => k.id !== id));
    }
  };

  const openEdit = (k: KontakRecord) => {
    setEditItem(k);
    setNama(k.nama);
    setNomor(k.nomor || "");
    setKeterangan(k.keterangan || "");
    setPhotoUrl(k.photoUrl || "");
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

  const filteredKontak = useMemo(() => {
    if (!searchText) return kontakList;
    const q = searchText.toLowerCase();
    return kontakList.filter(k => k.nama.toLowerCase().includes(q) || (k.nomor || "").toLowerCase().includes(q));
  }, [kontakList, searchText]);

  if (!active) return null;

  return (
    <div className="page-view active bg-gray-50 hide-scrollbar pb-24">
      <div className="px-5 pt-7 pb-4 border-b bg-white flex items-center gap-3">
        <button onClick={() => setActiveView('view-beranda')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fa-solid fa-arrow-left text-sm"></i>
        </button>
        <h2 className="font-bold flex-1">Kontak Pelanggan</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={searchText} 
              onChange={e => setSearchText(e.target.value)} 
              placeholder="Cari nama atau nomor..." 
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-blue-400 transition-all" 
            />
          </div>
        </div>

        <div className="space-y-3">
          {filteredKontak.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <BookUser className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-medium">Belum ada kontak</p>
            </div>
          ) : (
            filteredKontak.map(k => (
              <div key={k.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-14 h-14 rounded-2xl bg-blue-50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-blue-100 cursor-pointer"
                    onClick={() => k.photoUrl && setPreviewImage(k.photoUrl)}
                  >
                    {k.photoUrl ? (
                      <img src={k.photoUrl} alt={k.nama} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-blue-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-gray-800 truncate">{k.nama}</h4>
                    {k.nomor && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-base font-black text-blue-600 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {k.nomor}</p>
                        <button 
                          onClick={() => { navigator.clipboard.writeText(k.nomor); alert("Nomor disalin!"); }} 
                          className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <Copy className="w-2.5 h-2.5" /> Copy
                        </button>
                      </div>
                    )}
                    {k.keterangan && <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{k.keterangan}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => openEdit(k)} className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(k.id)} className="p-2 rounded-xl bg-red-50 text-red-600">
                      <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-black text-[11px] flex items-center gap-2 uppercase tracking-tighter">
                <i className="fa-solid fa-address-book text-blue-700"></i> {editItem ? "EDIT KONTAK" : "TAMBAH KONTAK BARU"}
              </h3>
              <button onClick={resetForm} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">NAMA</label>
                <input 
                  ref={namaRef}
                  value={nama} 
                  onChange={e => setNama(e.target.value)} 
                  placeholder="Masukkan nama..." 
                  onKeyDown={(e) => handleKeyDown(e, nomorRef)}
                  className="form-input-modern w-full" 
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">NOMOR HP / WHATSAPP</label>
                <input 
                  ref={nomorRef}
                  value={nomor} 
                  onChange={e => setNomor(e.target.value)} 
                  inputMode="tel" 
                  placeholder="0812..." 
                  onKeyDown={(e) => handleKeyDown(e, keteranganRef)}
                  className="form-input-modern w-full" 
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">KETERANGAN</label>
                <textarea 
                  ref={keteranganRef}
                  value={keterangan} 
                  onChange={e => setKeterangan(e.target.value)} 
                  placeholder="Contoh: Pelanggan setia..." 
                  rows={2} 
                  onKeyDown={(e) => handleKeyDown(e, undefined, true)}
                  className="form-input-modern w-full resize-none" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl py-3 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all group">
                  {isCapturing ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <Camera className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />}
                  <span className="text-[9px] font-black text-gray-400 group-hover:text-blue-700 uppercase tracking-widest">Kamera</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                </label>
                <label className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl py-3 cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition-all group">
                  <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  <span className="text-[9px] font-black text-gray-400 group-hover:text-gray-700 uppercase tracking-widest">Galeri</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>

              {photoUrl && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50">
                  <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => setPhotoUrl("")} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg active:scale-90 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <button onClick={handleSave} className="w-full bg-blue-700 text-white text-[10px] font-black py-2.5 rounded-lg hover:bg-blue-800 shadow-md transition-all active:scale-95 uppercase tracking-widest">
              SIMPAN KONTAK
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

export default KontakView;
