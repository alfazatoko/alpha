import React, { useState, useEffect, useMemo, useRef } from "react";
import { BookUser, Plus, Trash2, Edit, Search, X, Camera, ImageIcon, Loader2, Phone, Copy } from "lucide-react";
import { compressImage, cn } from "../lib/utils";
import { supabase } from "../lib/supabase";

interface KontakRecord {
  id: string;
  nama: string;
  nomor: string;
  keterangan: string;
  photoUrl?: string;
  kasir?: string;
}

const KontakView: React.FC<{
  active: boolean;
  setActiveView: (v: string) => void;
  kasirName: string;
  showToast: (m: string) => void;
  onConfirm: (t: string, m: string, c: () => void) => void;
  isPc?: boolean;
  activeStoreId: string;
}> = ({ active, setActiveView, kasirName, showToast, onConfirm, isPc, activeStoreId }) => {
  const [kontakList, setKontakList] = useState<KontakRecord[]>(() => {
    const saved = localStorage.getItem(`alphaPro_${activeStoreId}_kontak_list`);
    return saved ? JSON.parse(saved) : [];
  });
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
    const loadData = () => {
      if (activeStoreId && activeStoreId !== 'all') {
        const saved = localStorage.getItem(`alphaPro_${activeStoreId}_kontak_list`);
        if (saved) {
          setKontakList(JSON.parse(saved));
        } else {
          setKontakList([]);
        }
      } else {
        setKontakList([]);
      }
    };

    loadData();
    window.addEventListener('alphaSyncUpdate', loadData);
    return () => window.removeEventListener('alphaSyncUpdate', loadData);
  }, [activeStoreId]);

  useEffect(() => {
    if (activeStoreId && activeStoreId !== 'all') {
      localStorage.setItem(`alphaPro_${activeStoreId}_kontak_list`, JSON.stringify(kontakList));

      const syncToCloud = async () => {
        try {
          await supabase.from('store_settings').upsert({
            store_id: activeStoreId,
            kontak_data: kontakList,
            updated_at: new Date().toISOString()
          });
        } catch (e) {
          console.error("Gagal sync Kontak", e);
        }
      };

      const timer = setTimeout(syncToCloud, 1000);
      return () => clearTimeout(timer);
    }
  }, [kontakList, activeStoreId]);

  const resetForm = () => {
    setNama("");
    setNomor("");
    setKeterangan("");
    setPhotoUrl("");
    setEditItem(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!nama.trim()) return showToast("Nama harus diisi");

    if (editItem) {
      setHutangList(kontakList.map(k => k.id === editItem.id ? { ...k, nama, nomor, keterangan, photoUrl } : k));
    } else {
      const newKontak: KontakRecord = {
        id: Date.now().toString(),
        nama,
        nomor,
        keterangan,
        photoUrl,
        kasir: kasirName
      };
      setKontakList([newKontak, ...kontakList]);
      showToast("Kontak berhasil ditambah");
    }
    resetForm();
  };

  const setHutangList = (val: KontakRecord[]) => {
    setKontakList(val);
  };

  const handleDelete = (id: string) => {
    onConfirm("HAPUS KONTAK", "Yakin ingin menghapus kontak ini?", () => {
      setKontakList(kontakList.filter(k => k.id !== id));
      showToast("Kontak Berhasil Dihapus");
    });
  };

  const openEdit = (k: KontakRecord) => {
    setEditItem(k);
    setNama(k.nama);
    setNomor(k.nomor || "");
    setKeterangan(k.keterangan || "");
    setPhotoUrl(k.photoUrl || "");
    if (!isPc) {
      setShowForm(true);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    try {
      const compressedBase64 = await compressImage(file);
      setPhotoUrl(compressedBase64);
    } catch (err) {
      console.error("Compression failed", err);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCapturing(false);
    }
  };

  const filteredKontak = useMemo(() => {
    if (!searchText) return kontakList;
    const q = searchText.toLowerCase();
    return kontakList.filter(k => k.nama.toLowerCase().includes(q) || (k.nomor || "").toLowerCase().includes(q));
  }, [kontakList, searchText]);

  if (!active) return null;

  if (activeStoreId === 'all') {
    const warningContent = (
      <div className="flex-grow h-full flex items-center justify-center p-6">
        <div className="p-6 text-center bg-amber-50 border border-amber-100 rounded-2xl max-w-md">
          <i className="fa-solid fa-store-slash text-amber-500 text-3xl mb-3"></i>
          <p className="text-xs font-black text-amber-800 uppercase tracking-widest">PILIH TOKO TERLEBIH DAHULU</p>
          <p className="text-[10px] text-amber-600/80 font-bold uppercase mt-1">Silakan pilih salah satu toko di Beranda untuk melihat data Kontak.</p>
        </div>
      </div>
    );
    if (isPc) {
      return (
        <div className={cn("flex-grow h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden", active ? "flex" : "hidden")}>
          {warningContent}
        </div>
      );
    }
    return (
      <div className="page-view active bg-gray-50 hide-scrollbar pb-24">
        <div className="px-4 pt-7 pb-4 border-b flex justify-center items-center bg-emerald-500 text-white shadow-lg">
          <h2 className="font-black text-xs uppercase tracking-widest leading-none">KONTAK PELANGGAN</h2>
        </div>
        {warningContent}
      </div>
    );
  }

  if (isPc) {
    return (
      <div className={cn("flex-grow h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden", active ? "flex" : "hidden")}>
        <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">Kontak Pelanggan</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Kelola data kontak nohp, rekening bank, token listrik, dll</p>
          </div>
        </div>

        <div className="flex-grow flex overflow-hidden p-8 gap-8">

          <div className="w-[380px] shrink-0 h-full flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-thin">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  {editItem ? "Edit Kontak Pelanggan" : "Tambah Kontak Baru"}
                </h4>
                {editItem && (
                  <button onClick={resetForm} className="text-[9px] font-black text-rose-500 hover:underline uppercase tracking-wider">
                    Batal Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Nama Pelanggan</label>
                  <input
                    ref={namaRef}
                    value={nama}
                    onChange={e => setNama(e.target.value)}
                    placeholder="Masukkan nama..."
                    onKeyDown={(e) => handleKeyDown(e, nomorRef)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800/20"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">NoHP / No Rekening / Token</label>
                  <input
                    ref={nomorRef}
                    value={nomor}
                    onChange={e => setNomor(e.target.value)}
                    placeholder="Ketik nomor/detail di sini..."
                    onKeyDown={(e) => handleKeyDown(e, keteranganRef)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800/20"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Keterangan</label>
                  <textarea
                    ref={keteranganRef}
                    value={keterangan}
                    onChange={e => setKeterangan(e.target.value)}
                    placeholder="Contoh: Rekening BRI Utama..."
                    rows={2}
                    onKeyDown={(e) => handleKeyDown(e, undefined, true)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-300 transition-all group">
                    {isCapturing ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Camera className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />}
                    <span className="text-[9px] font-black text-slate-400 group-hover:text-blue-700 uppercase tracking-widest">Kamera</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  <label className="flex flex-col items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 transition-all group">
                    <ImageIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    <span className="text-[9px] font-black text-slate-400 group-hover:text-slate-700 uppercase tracking-widest">Galeri</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>

                {photoUrl && (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner bg-slate-50 dark:bg-slate-900">
                    <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotoUrl("")} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg active:scale-90 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button
                  onClick={handleSave}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-4 rounded-xl shadow-md transition-all active:scale-95 uppercase tracking-widest"
                  style={{ color: '#ffffff' }}
                >
                  {editItem ? "Simpan Perubahan Kontak" : "Simpan Kontak"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-grow h-full flex flex-col gap-6 overflow-hidden">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm shrink-0">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Cari nama pelanggan atau nomor..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 pb-6">
              {filteredKontak.length === 0 ? (
                <div className="text-center py-24 text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl">
                  <BookUser className="w-16 h-16 mx-auto mb-4 text-slate-200 dark:text-slate-700" />
                  <p className="text-xs font-black uppercase tracking-wider">Belum ada kontak terdaftar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {filteredKontak.map(k => (
                    <div key={k.id} className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                      <div className="flex gap-4">
                        <div
                          className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex-shrink-0 flex items-center justify-center overflow-hidden border border-emerald-100 dark:border-emerald-900 cursor-pointer group/photo relative"
                          onClick={() => k.photoUrl && setPreviewImage(k.photoUrl)}
                        >
                          {k.photoUrl ? (
                            <img src={k.photoUrl} alt={k.nama} className="w-full h-full object-cover transition-transform group-hover/photo:scale-105" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-emerald-200 dark:text-emerald-800" />
                          )}
                          {k.photoUrl && (
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px]">
                              <i className="fa-solid fa-magnifying-glass-plus"></i>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 truncate">{k.nama}</h4>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {k.nomor && (
                                <button
                                  onClick={() => { navigator.clipboard.writeText(k.nomor); showToast("Nomor disalin!"); }}
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                                  title="Salin Nomor"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => openEdit(k)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(k.id)} className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {k.nomor && (
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <Phone className="w-4 h-4" /> {k.nomor}
                              </p>
                            </div>
                          )}
                          {k.keterangan && <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{k.keterangan}</p>}
                          {k.kasir && <span className="text-[8px] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-black mt-2 inline-block uppercase tracking-widest">Kasir: {k.kasir}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {previewImage && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <button className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-6 h-6" />
            </button>
            <img src={previewImage} alt="Large preview" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-view active bg-gray-50 hide-scrollbar pb-24">
      <div className="px-4 pt-7 pb-4 border-b flex justify-between items-center bg-emerald-500 text-white shadow-lg">
        <button
          onClick={() => setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="text-center">
          <h2 className="font-black text-xs uppercase tracking-widest leading-none">KONTAK PELANGGAN</h2>
          <p className="text-[8px] text-white/50 mt-1 font-bold">ALFAZA CELL</p>
        </div>
        <button
          onClick={() => setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="px-5 py-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-b-[2rem] shadow-lg mb-4 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-sm tracking-wide">Buku Kontak</h2>
          <p className="text-emerald-100 text-[10px] opacity-90">Simpan nomor pelanggan</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="w-10 h-10 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-lg active:scale-90 transition-all">
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
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-gray-800 truncate">{k.nama}</h4>
                      <div className="flex items-center gap-1">
                        {k.nomor && (
                          <button
                            onClick={() => { navigator.clipboard.writeText(k.nomor); showToast("Nomor disalin!"); }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 active:scale-95 transition-all"
                            title="Copy Nomor"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => openEdit(k)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 active:scale-95 transition-all">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(k.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 active:scale-95 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {k.nomor && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-base font-black text-blue-600 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {k.nomor}</p>
                      </div>
                    )}
                    {k.keterangan && <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{k.keterangan}</p>}
                    {k.kasir && <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black mt-2 inline-block uppercase tracking-widest">Penulis: {k.kasir}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={resetForm}>
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
                <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">Nohp, No Rekening, PPOB, Token Listrik</label>
                <input
                  ref={nomorRef}
                  value={nomor}
                  onChange={e => setNomor(e.target.value)}
                  inputMode="text"
                  placeholder="Ketik nomor/keterangan di sini..."
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
        <div className="absolute inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
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
