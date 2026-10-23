import React, { useState, useRef } from 'react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Buat canvas untuk resize dan watermark
        const canvas = document.createElement('canvas');
        const maxDim = 600; // Ukuran optimal: tajam tapi di bawah ~35KB
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

          setPhotoPreview(watermarkedBase64);
          onSelfieCaptured(watermarkedBase64);
        }
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
    // Reset file input agar bisa ambil ulang
    e.target.value = '';
  };

  const handleRetake = () => {
    setPhotoPreview(null);
    onSelfieCaptured(null);
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-2.5 sm:p-3 space-y-2">
      {/* Hidden file input with front camera capture priority */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] shadow-xs">
            <i className="fa-solid fa-camera"></i>
          </div>
          <div>
            <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-none">
              FOTO SELFIE WAJIB
            </h5>
            <p className="text-[8px] text-slate-500 font-bold leading-none mt-0.5">
              Bukti kehadiran fisik di toko
            </p>
          </div>
        </div>

        {photoPreview && (
          <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
            <i className="fa-solid fa-check"></i> FOTO SIAP
          </span>
        )}
      </div>

      {/* Area Pratinjau Foto atau Tombol Buka Kamera */}
      {photoPreview ? (
        <div className="relative rounded-xl overflow-hidden border border-blue-200 shadow-sm bg-black group max-h-[160px] flex items-center justify-center">
          <img
            src={photoPreview}
            alt="Selfie Preview"
            className="w-full h-auto max-h-[160px] object-cover"
          />
          {/* Tombol Foto Ulang */}
          <button
            type="button"
            onClick={handleRetake}
            className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-slate-800 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
          >
            <i className="fa-solid fa-rotate-right text-blue-600"></i>
            <span>Foto Ulang</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing}
          className={cn(
            "w-full py-3.5 px-3 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white/80 hover:bg-white text-blue-700 transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer active:scale-98 shadow-xs",
            isProcessing && "opacity-60 cursor-not-allowed"
          )}
        >
          {isProcessing ? (
            <div className="flex items-center gap-2 py-1">
              <i className="fa-solid fa-circle-notch fa-spin text-sm text-blue-600"></i>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                Memproses Foto...
              </span>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm mb-0.5">
                <i className="fa-solid fa-camera-rotate"></i>
              </div>
              <span className="text-[10.5px] font-black uppercase tracking-wider text-blue-700 leading-tight">
                Ketuk Untuk Buka Kamera Selfie
              </span>
              <span className="text-[8px] font-bold text-slate-400">
                Kamera depan otomatis aktif • Wajib di area toko
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
