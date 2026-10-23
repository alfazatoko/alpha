import React, { useState, useEffect } from 'react';
import {
  subscribePrinterPrompt,
  connectBluetoothPrinter,
  writeBluetoothData,
  printViaRawBt,
  type PrinterPromptEvent
} from '../lib/printerService';
import { cn } from '../lib/utils';

export const PrinterReconnectModal: React.FC<{
  showToast?: (msg: string) => void;
}> = ({ showToast }) => {
  const [promptEvent, setPromptEvent] = useState<PrinterPromptEvent | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribePrinterPrompt((event) => {
      setPromptEvent(event);
      setErrorStatus(null);
      setIsConnecting(false);
    });
    return unsubscribe;
  }, []);

  if (!promptEvent) return null;

  const macAddress = promptEvent.mac || localStorage.getItem('bluetooth_printer_mac');

  const handleReconnectAndPrint = async () => {
    if (!macAddress) {
      setErrorStatus('Alamat printer belum disimpan. Silakan atur printer terlebih dahulu di Akun.');
      return;
    }

    setIsConnecting(true);
    setErrorStatus(null);

    try {
      const ok = await connectBluetoothPrinter(macAddress, 5000);
      if (ok) {
        const writeOk = await writeBluetoothData(promptEvent.pendingText);
        if (writeOk) {
          if (showToast) showToast('Printer tersambung & struk berhasil dicetak!');
          promptEvent.onSuccess?.();
          setPromptEvent(null);
          return;
        } else {
          setErrorStatus('Tersambung tetapi gagal mengirim data struk. Coba ulangi.');
        }
      } else {
        setErrorStatus('Gagal menyambung. Pastikan printer Bluetooth menyala dan berada di dekat HP.');
      }
    } catch (e: any) {
      setErrorStatus('Error koneksi: ' + (e?.message || e));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGoToAkunSettings = () => {
    localStorage.setItem('open_akun_category', 'printer');
    localStorage.setItem('open_akun_tab', 'printer');
    setPromptEvent(null);
    window.location.hash = '#/akun';
    if (showToast) showToast('Membuka menu Pengaturan Printer...');
  };

  const handlePrintViaRawBt = () => {
    printViaRawBt(promptEvent.pendingText);
    promptEvent.onSuccess?.();
    setPromptEvent(null);
    if (showToast) showToast('Mengirim struk ke Layanan Print RawBT...');
  };

  return (
    <div 
      className="fixed inset-0 z-[300] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !isConnecting && setPromptEvent(null)}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-sm">
              <i className="fa-solid fa-print"></i>
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide leading-tight">
                Koneksi Printer Terputus
              </h3>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                Printer thermal sedang offline / mode tidur
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isConnecting}
            onClick={() => setPromptEvent(null)}
            className="w-8 h-8 rounded-full bg-white/80 dark:bg-slate-700 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-5 space-y-4">
          {/* Card Info Status Printer */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Printer Terdaftar:</span>
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                Idle / Offline
              </span>
            </div>
            <p className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono truncate">
              {macAddress || 'Belum ada printer Bluetooth tersimpan'}
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-2 border-t border-slate-200/60 dark:border-slate-800 pt-2">
              Printer Bluetooth kasir otomatis masuk mode hemat daya jika tidak dipakai. Nyalakan tombol power printer atau sambungkan ulang di bawah.
            </p>
          </div>

          {/* Pesan Error jika koneksi gagal */}
          {errorStatus && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl flex items-start gap-2 text-left">
              <i className="fa-solid fa-circle-exclamation text-rose-600 text-xs mt-0.5"></i>
              <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 leading-tight">
                {errorStatus}
              </p>
            </div>
          )}

          {/* Tombol Aksi Cepat */}
          <div className="space-y-2">
            {/* 1. Tombol Sambungkan Ulang & Cetak Langsung */}
            <button
              type="button"
              disabled={isConnecting}
              onClick={handleReconnectAndPrint}
              className={cn(
                "w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer",
                isConnecting
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
              )}
            >
              {isConnecting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  <span>Menyambungkan ke Printer...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-bolt"></i>
                  <span>Sambungkan Ulang &amp; Cetak</span>
                </>
              )}
            </button>

            {/* 2. Tombol Navigasi ke Halaman Akun Bluetooth Settings */}
            <button
              type="button"
              disabled={isConnecting}
              onClick={handleGoToAkunSettings}
              className="w-full py-2.5 rounded-2xl font-bold text-[11px] uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <i className="fa-solid fa-sliders text-xs"></i>
              <span>Buka Pengaturan Printer (Akun)</span>
            </button>

            {/* 3. Tombol Alternatif Cetak via RawBT */}
            <button
              type="button"
              disabled={isConnecting}
              onClick={handlePrintViaRawBt}
              className="w-full py-2.5 rounded-2xl font-bold text-[10.5px] uppercase tracking-wider border border-amber-300 dark:border-amber-700/60 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <i className="fa-solid fa-file-invoice text-xs"></i>
              <span>Cetak Darurat via RawBT</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
          <button
            type="button"
            disabled={isConnecting}
            onClick={() => setPromptEvent(null)}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-3 py-1 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
