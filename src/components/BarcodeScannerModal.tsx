import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onScan, onClose }) => {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    // Prevent multiple renders in dev
    const el = document.getElementById('reader');
    if (el && el.innerHTML) return;

    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 80, // Bentuk pipih memanjang agar gampang scan barcode kemasan
      },
      fps: 10,
      aspectRatio: 1.0,
      videoConstraints: {
        facingMode: 'environment'
      },
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
      ]
    }, false);

    scanner.render(
      (text) => {
        scanner.clear();
        onScanRef.current(text);
      },
      (error) => {
        // Abaikan error frame (normal terjadi saat mencari barcode)
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 relative">
        
        <div className="p-3 flex justify-between items-center bg-white border-b border-gray-100 z-10 relative shrink-0">
          <h2 className="font-black text-gray-900 text-sm ml-2">
            <i className="fa-solid fa-barcode mr-2 text-[#0066FF]"></i>Scan Barcode
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors">
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
        
        <div className="bg-black relative min-h-[300px] flex items-center justify-center p-2">
           <div id="reader" className="w-full bg-black rounded-2xl overflow-hidden border-2 border-[#0066FF]/30"></div>
           <style>{`
             #reader__dashboard_section_csr span { color: white !important; font-size: 12px; margin-right: 5px; }
             #reader__dashboard_section_csr select { font-size: 11px; padding: 4px; border-radius: 4px; color: black; outline: none; }
             #reader__dashboard_section_swaplink { display: none !important; }
             #reader button { background: #0066FF; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; margin-top: 5px; cursor: pointer; }
             #reader video { border-radius: 12px; object-fit: cover; }
           `}</style>
        </div>
        
        <div className="p-4 bg-gray-50 text-center shrink-0">
          <p className="text-[11px] font-bold text-gray-500 leading-snug">
            Arahkan garis merah kamera tepat di tengah barcode produk (Aqua, Indomie, dll)
          </p>
        </div>

      </div>
    </div>
  );
};
