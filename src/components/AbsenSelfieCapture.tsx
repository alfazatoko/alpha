import React, { useState, useRef, useEffect, useCallback } from 'react';
import { applySelfieWatermark } from '../lib/absenSelfieService';
import { cn } from '../lib/utils';

interface AbsenSelfieCaptureProps {
  storeName?: string;
  cashierName?: string;
  shiftName?: string;
  onSelfieCaptured: (base64: string | null) => void;
  disabled?: boolean;
}

export const AbsenSelfieCapture: React.FC<AbsenSelfieCaptureProps> = ({
  storeName = 'ALFAZA CELL',
  cashierName = 'Kasir',
  shiftName = 'Shift',
  onSelfieCaptured,
  disabled = false,
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Matikan stream kamera fisik & lampu indikator
  const stopLiveCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Bersihkan stream jika kasir berganti atau komponen unmount
  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, [stopLiveCamera]);

  useEffect(() => {
    stopLiveCamera();
    setPhotoPreview(null);
    onSelfieCaptured(null);
  }, [cashierName, shiftName]);

  // Nyalakan live video streaming kamera depan (PC Webcam / Tablet / HP)
  const startLiveCamera = async () => {
    setCameraError(null);
    setIsProcessing(true);

    try {
      // Cek apakah browser mendukung mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser Anda tidak mendukung live video stream. Gunakan opsi unggah manual.');
      }

      // Prioritas kamera depan (user) dengan resolusi optimal
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsStreaming(true);

      // Kaitkan stream ke elemen video
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.warn('Auto play video stream dicegah:', err);
          });
        }
      }, 50);
    } catch (err: any) {
      console.error('Gagal akses live kamera:', err);
      let errMsg = 'Tidak dapat mengakses kamera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Izin kamera ditolak. Harap izinkan akses kamera di browser Anda.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'Perangkat kamera tidak ditemukan di PC/perangkat ini.';
      }
      setCameraError(errMsg);
      setIsStreaming(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Tangkap frame live video dan aplikasikan watermark stempel
  const handleSnapPhoto = () => {
    const video = videoRef.current;
    if (!video || !isStreaming) return;

    setIsProcessing(true);

    try {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Cermin horizontal agar foto hasil sama persis dengan apa yang dilihat kasir di layar
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

        // Waktu presisi saat ini
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(':', '.');
        const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        // Terapkan stempel watermark anti-palsu
        const watermarkedBase64 = applySelfieWatermark(
          canvas,
          storeName,
          cashierName,
          shiftName,
          timeStr,
          dateStr
        );

        // Hentikan kamera dan simpan preview
        stopLiveCamera();
        setPhotoPreview(watermarkedBase64);
        onSelfieCaptured(watermarkedBase64);
      }
    } catch (err) {
      console.error('Gagal jepret live kamera:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Fallback alternatif: ambil dari input file / kamera native jika live stream diblokir
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);

          const now = new Date();
          const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(':', '.');
          const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

          const watermarkedBase64 = applySelfieWatermark(
            canvas,
            storeName,
            cashierName,
            shiftName,
            timeStr,
            dateStr
          );

          setPhotoPreview(watermarkedBase64);
          onSelfieCaptured(watermarkedBase64);
        }
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRetake = () => {
    setPhotoPreview(null);
    onSelfieCaptured(null);
    startLiveCamera();
  };

  return (
    <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-2.5 sm:p-3 space-y-2">
      {/* Hidden fallback file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-[10px] shadow-xs">
            <i className="fa-solid fa-camera"></i>
          </div>
          <div>
            <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-none">
              FOTO SELFIE WAJIB
            </h5>
            <p className="text-[8px] text-slate-500 font-bold leading-none mt-0.5">
              Live kamera kehadiran di toko
            </p>
          </div>
        </div>

        {photoPreview && (
          <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
            <i className="fa-solid fa-check"></i> FOTO SIAP
          </span>
        )}

        {isStreaming && (
          <span className="text-[8px] font-black bg-rose-100 text-rose-700 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> LIVE VIEW
          </span>
        )}
      </div>

      {/* ── KONDISI 1: LIVE KAMERA SEDANG AKTIF (VIEWFINDER + SHUTTER) ── */}
      {isStreaming && (
        <div className="relative rounded-2xl overflow-hidden border-2 border-teal-500 shadow-md bg-slate-950 flex flex-col items-center">
          {/* Live Video Feed - Cermin Horizontal */}
          <div className="relative w-full aspect-square max-h-[220px] sm:max-h-[240px] flex items-center justify-center overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ transform: 'scaleX(-1)' }}
              className="w-full h-full object-cover"
            />

            {/* Panduan Lingkaran Wajah Minimalis */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-36 h-44 rounded-full border-2 border-dashed border-white/60 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <span className="text-[8.5px] font-bold text-white/80 bg-black/50 px-2 py-0.5 rounded-full mt-28">
                  Posisikan Wajah
                </span>
              </div>
            </div>

            {/* Tombol Batal / Tutup Kamera di Pojok Kanan Atas */}
            <button
              type="button"
              onClick={stopLiveCamera}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center text-xs backdrop-blur-xs transition-all active:scale-90 cursor-pointer shadow-md"
              title="Tutup Kamera"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Bar Kontrol Jepret di Bawah Video */}
          <div className="w-full bg-slate-900/95 py-2.5 px-4 flex items-center justify-between border-t border-white/10">
            <button
              type="button"
              onClick={stopLiveCamera}
              className="text-[9.5px] font-black text-slate-300 hover:text-white uppercase tracking-wider px-2 py-1 rounded cursor-pointer"
            >
              Batal
            </button>

            {/* Tombol Shutter Bulat Khas Kamera Premium */}
            <button
              type="button"
              onClick={handleSnapPhoto}
              disabled={isProcessing}
              className="w-13 h-13 rounded-full border-3 border-white bg-rose-600 hover:bg-rose-500 active:scale-90 flex items-center justify-center shadow-lg transition-transform cursor-pointer"
              title="Jepret Foto Selfie"
            >
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-rose-600 text-base font-black shadow-inner">
                <i className="fa-solid fa-camera"></i>
              </div>
            </button>

            <span className="text-[9px] font-bold text-slate-400">
              Shift {shiftName}
            </span>
          </div>
        </div>
      )}

      {/* ── KONDISI 2: FOTO TELAH BERHASIL DIAMBIL (PREVIEW + WATERMARK) ── */}
      {!isStreaming && photoPreview && (
        <div className="relative rounded-xl overflow-hidden border border-teal-300 shadow-sm bg-black group max-h-[170px] flex items-center justify-center">
          <img
            src={photoPreview}
            alt="Selfie Preview"
            className="w-full h-auto max-h-[170px] object-cover"
          />
          {/* Tombol Foto Ulang */}
          <button
            type="button"
            onClick={handleRetake}
            className="absolute bottom-2 right-2 bg-white/95 hover:bg-white text-slate-800 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer border border-slate-200"
          >
            <i className="fa-solid fa-rotate-right text-teal-600"></i>
            <span>Foto Ulang</span>
          </button>
        </div>
      )}

      {/* ── KONDISI 3: BELUM MENGAMBIL FOTO (TOMBOL AKTIFKAN LIVE KAMERA) ── */}
      {!isStreaming && !photoPreview && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={startLiveCamera}
            disabled={disabled || isProcessing}
            className={cn(
              "w-full py-3.5 px-3 rounded-xl border-2 border-dashed border-teal-300 hover:border-teal-500 bg-white/90 hover:bg-white text-teal-800 transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer active:scale-98 shadow-xs",
              isProcessing && "opacity-60 cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2 py-1">
                <i className="fa-solid fa-circle-notch fa-spin text-sm text-teal-600"></i>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  Menghubungkan Kamera...
                </span>
              </div>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-base mb-0.5 shadow-2xs">
                  <i className="fa-solid fa-camera"></i>
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-700 leading-tight">
                  Buka Kamera Live Selfie
                </span>
                <span className="text-[8px] font-bold text-slate-400">
                  Webcam PC / Kamera Depan HP & Tablet Otomatis Aktif
                </span>
              </>
            )}
          </button>

          {/* Pesan Kesalahan jika Kamera Diblokir / Tidak Ada */}
          {cameraError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2 text-left space-y-1">
              <p className="text-[9px] font-bold text-rose-700 flex items-center gap-1">
                <i className="fa-solid fa-triangle-exclamation text-rose-500"></i> {cameraError}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-[8.5px] font-black text-rose-800 bg-white border border-rose-200 hover:bg-rose-100 py-1 px-2 rounded-lg transition-colors cursor-pointer text-center"
              >
                Gunakan Pilihan Alternatif (Kamera Bawaan / File)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
