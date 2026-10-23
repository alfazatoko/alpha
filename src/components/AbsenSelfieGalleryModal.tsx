import React, { useState, useEffect } from 'react';
import {
  fetchCashierAlbums,
  fetchCashierSelfiePhotos,
  deleteSingleSelfiePhoto,
  deleteBulkCashierPhotos,
  type CashierSelfieAlbum,
  type AbsenSelfieRecord
} from '../lib/absenSelfieService';
import { cn } from '../lib/utils';

interface AbsenSelfieGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName?: string;
  kasirList: Record<string, { name: string; role?: string }>;
  showToast?: (msg: string) => void;
}

export const AbsenSelfieGalleryModal: React.FC<AbsenSelfieGalleryModalProps> = ({
  isOpen,
  onClose,
  storeId,
  storeName = 'Toko',
  kasirList,
  showToast
}) => {
  const [albums, setAlbums] = useState<CashierSelfieAlbum[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<{ id: string; name: string } | null>(null);
  const [photos, setPhotos] = useState<AbsenSelfieRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<AbsenSelfieRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load daftar album kasir saat modal dibuka
  const loadAlbums = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchCashierAlbums(storeId, kasirList);
      setAlbums(data);
    } catch (e) {
      console.error('Gagal load albums:', e);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, kasirList]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCashier(null);
      setPreviewPhoto(null);
      return;
    }
    loadAlbums();
  }, [isOpen, loadAlbums]);

  // Load foto-foto saat kasir dipilih
  const handleOpenCashierFolder = async (cashierId: string, cashierName: string) => {
    setSelectedCashier({ id: cashierId, name: cashierName });
    setIsLoading(true);
    try {
      const data = await fetchCashierSelfiePhotos(storeId, cashierId);
      setPhotos(data);
    } catch (e) {
      console.error('Gagal load photos:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Hapus satu foto
  const handleDeleteSingle = async (photo: AbsenSelfieRecord) => {
    if (!confirm(`Hapus foto selfie absen tanggal ${photo.tanggal} (${photo.shift_name})?\n\nCatatan teks riwayat absen kasir tetap aman dan tidak akan hilang.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const ok = await deleteSingleSelfiePhoto(storeId, photo.cashier_id, photo.id, photo.photo_path);
      if (ok) {
        setPhotos(prev => prev.filter(p => p.id !== photo.id));
        setAlbums(prev =>
          prev.map(a => {
            if (a.cashier_id === photo.cashier_id) {
              return {
                ...a,
                total_photos: Math.max(0, a.total_photos - 1),
                total_size_kb: Math.max(0, Math.round((a.total_size_kb - (photo.photo_size_kb || 0)) * 10) / 10)
              };
            }
            return a;
          })
        );
        if (showToast) showToast('Foto selfie berhasil dibersihkan.');
        if (previewPhoto?.id === photo.id) setPreviewPhoto(null);
      } else {
        alert('Gagal menghapus foto.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Hapus foto masal (Bulan lalu / Semua)
  const handleDeleteBulk = async (scope: 'older_than_30_days' | 'all') => {
    if (!selectedCashier) return;

    const label = scope === 'older_than_30_days' ? 'lebih dari 30 hari yang lalu' : 'SEMUA foto';
    if (!confirm(`Apakah Anda yakin ingin menghapus ${label} untuk kasir ${selectedCashier.name}?\n\nRuang database cloud akan segera dilegakan. Rekapan jam hadir & gaji kasir tetap aman.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteBulkCashierPhotos(storeId, selectedCashier.id, scope);
      if (res.success) {
        if (showToast) showToast(`${res.count} foto selfie berhasil dibersihkan.`);
        // Reload photos
        const updated = await fetchCashierSelfiePhotos(storeId, selectedCashier.id);
        setPhotos(updated);
        // Refresh albums
        const updatedAlbums = await fetchCashierAlbums(storeId, kasirList);
        setAlbums(updatedAlbums);
      } else {
        alert('Gagal menghapus masal foto.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg shadow-sm">
              <i className="fa-solid fa-images"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base uppercase tracking-wider">
                  ALBUM FOTO SELFIE ABSENSI
                </h3>
                <span className="text-[8px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">
                  Mode Owner
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                {selectedCashier
                  ? `Folder Kasir: ${selectedCashier.name} • ${photos.length} Foto Tersimpan`
                  : `Folder Arsip Bukti Kehadiran Wajah Kasir • ${storeName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedCashier) {
                  handleOpenCashierFolder(selectedCashier.id, selectedCashier.name);
                } else {
                  loadAlbums();
                }
              }}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-teal-600 hover:text-teal-700 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Segarkan Foto"
            >
              <i className={cn("fa-solid fa-arrows-rotate text-xs", isLoading && "fa-spin")}></i>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        {/* BODY MODAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
          {/* JIKA DI DALAM FOLDER KASIR */}
          {selectedCashier ? (
            <div className="space-y-4">
              {/* Bar Tombol Aksi di dalam folder */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedCashier(null)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  <span>Kembali ke Semua Folder</span>
                </button>

                {photos.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDeleteBulk('older_than_30_days')}
                      disabled={isDeleting}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all"
                      title="Hapus foto yang lebih lama dari 1 bulan"
                    >
                      <i className="fa-solid fa-broom mr-1"></i> Bersihkan &gt; 30 Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBulk('all')}
                      disabled={isDeleting}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all"
                      title="Kosongkan seluruh foto di folder ini"
                    >
                      <i className="fa-solid fa-trash-can mr-1"></i> Hapus Semua Foto
                    </button>
                  </div>
                )}
              </div>

              {/* Grid Foto Selfie Kasir */}
              {isLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>
                  <p className="text-xs font-bold uppercase tracking-wider">Memuat Galeri Foto...</p>
                </div>
              ) : photos.length === 0 ? (
                <div className="py-16 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-xl mx-auto mb-2">
                    <i className="fa-solid fa-camera-slash"></i>
                  </div>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                    Belum Ada Foto Selfie Tersimpan
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Foto selfie kasir ini akan otomatis muncul di sini saat fitur selfie aktif dan kasir melakukan absen.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map(photo => (
                    <div
                      key={photo.id}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col"
                    >
                      {/* Gambar Foto */}
                      <div 
                        className="relative aspect-4/3 bg-black cursor-pointer overflow-hidden"
                        onClick={() => setPreviewPhoto(photo)}
                      >
                        {photo.photo_url ? (
                          <img
                            src={photo.photo_url}
                            alt="Absen Selfie"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                            <i className="fa-solid fa-image-slash text-xl mb-1"></i>
                            <span className="text-[8px] uppercase">Foto Dibersihkan</span>
                          </div>
                        )}

                        {/* Badge Shift di atas foto */}
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="text-[8px] font-black bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md uppercase">
                            {photo.shift_name}
                          </span>
                        </div>

                        {/* Tombol Hapus Satuan di pojok kanan atas */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSingle(photo);
                          }}
                          disabled={isDeleting}
                          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center shadow-md backdrop-blur-xs active:scale-90 transition-all opacity-90 group-hover:opacity-100"
                          title="Hapus foto ini"
                        >
                          <i className="fa-solid fa-trash-can text-[10px]"></i>
                        </button>
                      </div>

                      {/* Detail Keterangan */}
                      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-100">
                              {photo.tanggal}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 font-mono">
                              {photo.jam}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center justify-between">
                            <span className={cn(
                              "text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase",
                              photo.is_late 
                                ? "bg-orange-100 text-orange-700 border border-orange-200" 
                                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            )}>
                              {photo.is_late ? 'Terlambat' : 'Tepat Waktu'}
                            </span>
                            <span className="text-[7.5px] text-slate-400 font-bold">
                              ±{photo.photo_size_kb || 30} KB
                            </span>
                          </div>
                        </div>

                        {photo.alasan_telat && (
                          <p className="text-[8px] text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 truncate" title={photo.alasan_telat}>
                            <span className="font-bold">Alasan:</span> {photo.alasan_telat}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TAMPILAN UTAMA: LEMARI FOLDER ALBUM PER-KASIR */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50/70 dark:bg-slate-800/40 p-3 rounded-2xl border border-blue-100/80 dark:border-slate-700">
                <div>
                  <p className="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest leading-none">
                    Daftar Folder Karyawan
                  </p>
                  <p className="text-[8.5px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                    Pilih folder nama kasir untuk membuka galeri foto atau membersihkan memori cloud
                  </p>
                </div>
                <span className="text-[9px] font-black bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-xl shadow-2xs border border-blue-100">
                  {albums.length} Kasir
                </span>
              </div>

              {isLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>
                  <p className="text-xs font-bold uppercase tracking-wider">Memuat Folder Kasir...</p>
                </div>
              ) : albums.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-3xl">
                  <i className="fa-solid fa-folder-open text-3xl text-slate-300 mb-2"></i>
                  <p className="text-xs font-bold uppercase">Belum ada akun kasir terdaftar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {albums.map(album => (
                    <div
                      key={album.cashier_id}
                      onClick={() => handleOpenCashierFolder(album.cashier_id, album.cashier_name)}
                      className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-blue-400 rounded-3xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar / Folder Icon */}
                        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl shadow-md shrink-0 group-hover:scale-105 transition-transform">
                          {album.latest_photo_url ? (
                            <img
                              src={album.latest_photo_url}
                              alt={album.cashier_name}
                              className="w-full h-full rounded-2xl object-cover"
                            />
                          ) : (
                            <i className="fa-solid fa-folder-closed"></i>
                          )}
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-slate-800 text-blue-600 flex items-center justify-center text-[10px] shadow-sm border border-slate-200">
                            <i className="fa-solid fa-camera text-[8px]"></i>
                          </span>
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate group-hover:text-blue-600 transition-colors">
                            {album.cashier_name}
                          </h4>
                          <p className="text-[9px] font-bold text-slate-500 mt-0.5">
                            {album.total_photos} Foto Selfie • ±{album.total_size_kb} KB
                          </p>
                          <p className="text-[8px] text-slate-400 mt-0.5 truncate">
                            {album.latest_date ? `Terakhir: ${album.latest_date}` : 'Belum ada foto'}
                          </p>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center transition-colors shrink-0 ml-2">
                        <i className="fa-solid fa-chevron-right text-xs"></i>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL ZOOM / PRATINJAU FOTO LENGKAP */}
        {previewPhoto && (
          <div 
            className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in"
            onClick={() => setPreviewPhoto(null)}
          >
            <div 
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative animate-in zoom-in-95"
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>

              <div className="bg-black flex items-center justify-center max-h-[60vh]">
                <img
                  src={previewPhoto.photo_url || ''}
                  alt="Zoom Selfie"
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase">
                    {previewPhoto.cashier_name} • {previewPhoto.shift_name}
                  </h4>
                  <span className={cn(
                    "text-[8px] font-black px-2 py-0.5 rounded-full uppercase",
                    previewPhoto.is_late ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {previewPhoto.is_late ? 'Terlambat' : 'Tepat Waktu'}
                  </span>
                </div>

                <p className="text-[9px] text-slate-500 font-bold">
                  Waktu: {previewPhoto.tanggal} pukul {previewPhoto.jam}
                </p>

                {previewPhoto.alasan_telat && (
                  <div className="bg-orange-50 p-2 rounded-xl border border-orange-100 text-[9px] text-orange-800 font-medium">
                    <span className="font-bold">Keterangan:</span> {previewPhoto.alasan_telat}
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteSingle(previewPhoto)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-trash-can"></i> Hapus Foto Ini
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
