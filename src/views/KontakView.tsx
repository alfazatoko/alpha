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
    try {
      const saved = localStorage.getItem(`alphaPro_${activeStoreId}_kontak_list`);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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
        try {
          const saved = localStorage.getItem(`alphaPro_${activeStoreId}_kontak_list`);
          const parsed = saved ? JSON.parse(saved) : [];
          setKontakList(Array.isArray(parsed) ? parsed : []);
        } catch {
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
    const list = Array.isArray(kontakList) ? kontakList : [];
    if (!searchText) return list;
    const q = searchText.toLowerCase();
    return list.filter(k => String(k.nama || "").toLowerCase().includes(q) || String(k.nomor || "").toLowerCase().includes(q));
  }, [kontakList, searchText]);

  // Categorize contacts by first letter for alphabetical grouping
  const grouped = useMemo(() => {
    const list = Array.isArray(filteredKontak) ? filteredKontak : [];
    const sorted = [...list].sort((a, b) => String(a.nama || "").localeCompare(String(b.nama || ""), 'id'));
    const map: Record<string, KontakRecord[]> = {};
    sorted.forEach(k => {
      const namaStr = String(k.nama || "");
      const letter = namaStr.length > 0 ? namaStr[0].toUpperCase() : '#';
      if (!map[letter]) map[letter] = [];
      map[letter].push(k);
    });
    return map;
  }, [filteredKontak]);

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
    <div className="page-view active hide-scrollbar pb-24" style={{backgroundColor:'#f1f5f9'}}>

      {/* ── Header Navy ── */}
      <div style={{background:'linear-gradient(135deg,#0f4c3a 0%,#1a6b52 60%,#0d8a5e 100%)'}} className="px-5 pt-10 pb-7 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{background:'#fff'}}></div>
        <div className="absolute top-12 -right-4 w-24 h-24 rounded-full opacity-5" style={{background:'#fff'}}></div>

        {/* Back + Title */}
        <div className="flex items-start gap-4 mb-6 relative z-10">
          <button
            onClick={() => setActiveView('view-beranda')}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/20 text-white shrink-0 mt-1 active:scale-90 transition-all"
            style={{background:'rgba(255,255,255,0.15)'}}
          >
            <i className="fa-solid fa-arrow-left text-sm"></i>
          </button>
          <div>
            <h1 className="font-black text-white text-xl leading-tight tracking-tight">BUKU KONTAK</h1>
            <p className="text-[10px] font-bold mt-1" style={{color:'rgba(255,255,255,0.6)'}}>DIREKTORI PELANGGAN & REKENING</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.13)', backdropFilter:'blur(8px)'}}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{color:'rgba(255,255,255,0.65)'}}>TOTAL KONTAK</p>
            <p className="text-2xl font-black text-white leading-none">{kontakList.length}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-2 h-2 rounded-full bg-emerald-300"></div>
              <p className="text-[9px] font-black" style={{color:'rgba(255,255,255,0.65)'}}>PELANGGAN TERDAFTAR</p>
            </div>
          </div>
          <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.13)', backdropFilter:'blur(8px)'}}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{color:'rgba(255,255,255,0.65)'}}>HASIL PENCARIAN</p>
            <p className="text-2xl font-black text-white leading-none">{filteredKontak.length}</p>
            <p className="text-[9px] font-black mt-2" style={{color:'rgba(255,255,255,0.5)'}}>KONTAK DITEMUKAN</p>
          </div>
        </div>
      </div>

      {/* ── Search + New Button ── */}
      <div className="px-4 mt-4 flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Cari nama atau nomor..."
            className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 bg-white text-xs font-bold outline-none shadow-sm"
          />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-black text-[10px] text-white uppercase tracking-wide shadow-md active:scale-95 transition-all whitespace-nowrap"
          style={{background:'linear-gradient(135deg,#0f4c3a,#0d8a5e)'}}
        >
          <Plus className="w-4 h-4" /> KONTAK BARU
        </button>
      </div>

      {/* ── Contact List ── */}
      <div className="px-4 mt-4 space-y-3">
        {filteredKontak.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-10 flex flex-col items-center justify-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{background:'linear-gradient(135deg,#e8f5ee,#d1ede0)'}}>
              <BookUser className="w-8 h-8" style={{color:'#0d8a5e'}} />
            </div>
            <p className="font-black text-sm text-gray-700 uppercase tracking-widest mb-1">BELUM ADA KONTAK</p>
            <p className="text-xs text-gray-400 text-center leading-relaxed mt-1">Tambahkan kontak pelanggan pertama Anda dengan tombol di atas.</p>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs text-white active:scale-95 transition-all"
              style={{background:'linear-gradient(135deg,#0f4c3a,#0d8a5e)'}}
            >
              <Plus className="w-4 h-4" /> Tambah Kontak
            </button>
          </div>
        ) : (
          /* Grouped Alphabetical List */
          Object.entries(grouped).map(([letter, contacts]) => (
            <div key={letter}>
              {/* Letter divider */}
              <div className="flex items-center gap-3 mb-2 px-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                  style={{background:'linear-gradient(135deg,#0f4c3a,#0d8a5e)'}}>
                  {letter}
                </div>
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{contacts.length} kontak</span>
              </div>

              {/* Cards for this letter */}
              <div className="space-y-2">
                {contacts.map(k => (
                  <div key={k.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.99] transition-all">
                    <div className="flex items-center gap-3 p-4">
                      {/* Avatar */}
                      <div
                        className="relative w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden cursor-pointer group"
                        style={{background: k.photoUrl ? undefined : 'linear-gradient(135deg,#e8f5ee,#b6e0cc)'}}
                        onClick={() => k.photoUrl && setPreviewImage(k.photoUrl)}
                      >
                        {k.photoUrl ? (
                          <>
                            <img src={k.photoUrl} alt={k.nama} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <i className="fa-solid fa-magnifying-glass-plus text-white text-xs"></i>
                            </div>
                          </>
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-2xl font-black" style={{color:'#0d8a5e'}}>
                            {k.nama && String(k.nama).length > 0 ? String(k.nama)[0].toUpperCase() : '#'}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-black text-sm text-gray-900 truncate leading-tight">{k.nama}</h4>
                            {k.nomor && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Phone className="w-3 h-3 flex-shrink-0" style={{color:'#0d8a5e'}} />
                                <p className="text-sm font-black truncate" style={{color:'#0d8a5e'}}>{k.nomor}</p>
                              </div>
                            )}
                            {k.keterangan && (
                              <p className="text-[10px] text-gray-400 font-semibold mt-0.5 line-clamp-1">{k.keterangan}</p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {k.nomor && (
                              <button
                                onClick={() => { navigator.clipboard.writeText(k.nomor); showToast("Nomor disalin!"); }}
                                className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                                style={{background:'#e8f5ee', color:'#0d8a5e'}}
                                title="Salin Nomor"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(k)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 active:scale-90 transition-all"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(k.id)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-50 text-red-500 active:scale-90 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom row: kasir badge + WhatsApp shortcut */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            {k.kasir && (
                              <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest" style={{background:'#e8f5ee', color:'#0d8a5e'}}>
                                {k.kasir}
                              </span>
                            )}
                          </div>
                          {k.nomor && /^(\+62|08)\d+$/.test(String(k.nomor).replace(/\s/g,'')) && (
                            <a
                              href={`https://wa.me/${String(k.nomor).replace(/\D/g,'').replace(/^0/,'62')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black active:scale-90 transition-all"
                              style={{background:'#dcfce7', color:'#16a34a'}}
                            >
                              <i className="fa-brands fa-whatsapp"></i> Chat
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Count footer */}
        {filteredKontak.length > 0 && (
          <div className="text-center py-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {filteredKontak.length} dari {kontakList.length} kontak ditampilkan
            </p>
          </div>
        )}
      </div>

      {/* ── Form Modal (Slide Up) ── */}
      {showForm && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={resetForm}>
          <div
            className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200"></div>
            </div>

            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#0f4c3a,#0d8a5e)'}}>
                  <i className="fa-solid fa-address-book text-white text-xs"></i>
                </div>
                <h3 className="font-black text-gray-900 text-[11px] uppercase tracking-tighter">
                  {editItem ? 'EDIT KONTAK' : 'TAMBAH KONTAK BARU'}
                </h3>
              </div>
              <button onClick={resetForm} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 active:scale-90">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Avatar preview */}
              {(photoUrl || editItem?.photoUrl) && (
                <div className="flex justify-center">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-md">
                    <img src={photoUrl || editItem?.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotoUrl("")} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow active:scale-90">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">NAMA PELANGGAN *</label>
                <input
                  ref={namaRef}
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  placeholder="Masukkan nama lengkap..."
                  onKeyDown={(e) => handleKeyDown(e, nomorRef)}
                  className="form-input-modern w-full"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">No.HP / Rekening / Token / PPOB</label>
                <input
                  ref={nomorRef}
                  value={nomor}
                  onChange={e => setNomor(e.target.value)}
                  placeholder="Contoh: 0812-xxxx-xxxx"
                  onKeyDown={(e) => handleKeyDown(e, keteranganRef)}
                  className="form-input-modern w-full"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">KETERANGAN / CATATAN</label>
                <textarea
                  ref={keteranganRef}
                  value={keterangan}
                  onChange={e => setKeterangan(e.target.value)}
                  placeholder="Contoh: Rekening BRI utama, pelanggan setia..."
                  rows={2}
                  onKeyDown={(e) => handleKeyDown(e, undefined, true)}
                  className="form-input-modern w-full resize-none"
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-[9px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">FOTO / BUKTI</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl py-3 cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-all group">
                    {isCapturing ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : <Camera className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />}
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Kamera</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  <label className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl py-3 cursor-pointer hover:bg-gray-100 transition-all group">
                    <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Galeri</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 pb-6 pt-2">
              <button
                onClick={handleSave}
                className="w-full text-white text-[11px] font-black py-3.5 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest"
                style={{background:'linear-gradient(135deg,#0f4c3a,#0d8a5e)'}}
              >
                <i className="fa-solid fa-floppy-disk mr-2"></i>
                {editItem ? 'SIMPAN PERUBAHAN' : 'SIMPAN KONTAK'}
              </button>
              {editItem && (
                <button onClick={resetForm} className="w-full mt-2 py-2.5 rounded-xl text-[10px] font-black text-gray-400 bg-gray-100 uppercase tracking-widest active:scale-95 transition-all">
                  Batal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Image Preview Modal ── */}
      {previewImage && (
        <div className="absolute inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full backdrop-blur-md active:scale-90">
            <X className="w-6 h-6" />
          </button>
          <img src={previewImage} alt="Large preview" className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default KontakView;

