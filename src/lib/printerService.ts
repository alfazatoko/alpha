// ── CENTRALIZED PRINTER SERVICE (THERMAL ESC/POS & RAWBT) ──
// Terinspirasi dari arsitektur WebAppPrinter (developersismedika/webappprinter):
// Menggunakan mekanisme "Smart On-Demand Socket":
// Buka koneksi cepat saat cetak -> Tembak data -> Tutup socket dengan bersih di finally.
// Hal ini mencegah "Hanging Socket" dan memungkinkan printer thermal portabel
// masuk mode hemat daya (sleep) tanpa pernah memutus fungsionalitas cetak aplikasi!

export const RECEIPT_WIDTH = 32;

/**
 * Format string agar berada tepat di tengah kertas (32 kolom)
 */
export const formatReceiptCenter = (text: string, width = RECEIPT_WIDTH): string => {
  const clean = (text || '').trim().substring(0, width);
  const pad = Math.max(0, Math.floor((width - clean.length) / 2));
  return ' '.repeat(pad) + clean;
};

/**
 * Format baris 2 kolom rata kiri dan kanan (32 kolom)
 */
export const formatReceiptRow = (left: string, right: string, width = RECEIPT_WIDTH): string => {
  const l = (left || '').trim();
  const r = (right || '').trim();
  const space = width - l.length - r.length;
  return l + (space > 0 ? ' '.repeat(space) : ' ') + r;
};

/**
 * Pembatas garis strip / putus-putus
 */
export const formatReceiptDivider = (char = '-', width = RECEIPT_WIDTH): string => {
  return char.repeat(width);
};

/**
 * Pembatas garis ganda
 */
export const formatReceiptDoubleDivider = (width = RECEIPT_WIDTH): string => {
  return '='.repeat(width);
};

/**
 * Ambil MAC Address printer Bluetooth yang tersimpan di localStorage
 */
export const getStoredPrinterMac = (): string | null => {
  try {
    return localStorage.getItem('bluetooth_printer_mac');
  } catch {
    return null;
  }
};

/**
 * Simpan MAC Address printer Bluetooth
 */
export const setStoredPrinterMac = (mac: string): void => {
  try {
    localStorage.setItem('bluetooth_printer_mac', mac);
  } catch {}
};

/**
 * Ambil Nama Printer Bluetooth yang tersimpan di localStorage
 */
export const getStoredPrinterName = (): string | null => {
  try {
    return localStorage.getItem('bluetooth_printer_name');
  } catch {
    return null;
  }
};

/**
 * Simpan Nama Printer Bluetooth
 */
export const setStoredPrinterName = (name: string): void => {
  try {
    localStorage.setItem('bluetooth_printer_name', name);
  } catch {}
};

/**
 * Hapus / Lupakan Printer yang tersimpan
 */
export const clearStoredPrinter = (): void => {
  try {
    localStorage.removeItem('bluetooth_printer_mac');
    localStorage.removeItem('bluetooth_printer_name');
    localStorage.removeItem('use_web_bluetooth');
  } catch {}
};

/**
 * Cek apakah aplikasi berjalan di Kiosk Android Bridge (developersismedika/webappprinter)
 */
export const isAndroidBridgeAvailable = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    !!(window as any).Android &&
    typeof (window as any).Android.printToDevice === 'function'
  );
};

/**
 * Cek apakah plugin bluetooth serial native tersedia di perangkat (Capacitor/Cordova)
 */
export const isBluetoothPluginAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).bluetoothSerial;
};

/**
 * Putuskan koneksi socket Bluetooth secara bersih & hentikan scanning
 */
export const disconnectBluetooth = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!isBluetoothPluginAvailable()) {
      resolve();
      return;
    }
    try {
      // Hentikan proses scanning discovery jika sedang berjalan
      if (typeof (window as any).bluetoothSerial?.stopDiscovering === 'function') {
        (window as any).bluetoothSerial.stopDiscovering();
      }
      (window as any).bluetoothSerial.disconnect(
        () => resolve(),
        () => resolve()
      );
    } catch {
      resolve();
    }
  });
};

/**
 * Cek apakah socket bluetooth saat ini aktif terhubung
 */
export const checkBluetoothConnected = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!isBluetoothPluginAvailable()) {
      resolve(false);
      return;
    }
    (window as any).bluetoothSerial.isConnected(
      () => resolve(true),
      () => resolve(false)
    );
  });
};

/**
 * Sambungkan ke printer Bluetooth dengan timeout & mode fallback Insecure
 * Mengikuti best practice: bersihkan socket lama terlebih dahulu sebelum connect!
 */
export const connectBluetoothPrinter = async (mac: string, timeoutMs = 4500): Promise<boolean> => {
  if (!isBluetoothPluginAvailable() || !mac) {
    return false;
  }

  // 1. Bersihkan sisa socket lama dan berikan jeda singkat
  await disconnectBluetooth();
  await new Promise((r) => setTimeout(r, 150));

  return new Promise((resolve) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        resolve(false);
      }
    }, timeoutMs);

    // Coba mode connect normal
    (window as any).bluetoothSerial.connect(
      mac,
      () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve(true);
        }
      },
      () => {
        // Jika mode secure gagal, coba mode connectInsecure (kompatibel printer murah/Cina)
        if (finished) return;
        (window as any).bluetoothSerial.connectInsecure(
          mac,
          () => {
            if (!finished) {
              finished = true;
              clearTimeout(timer);
              resolve(true);
            }
          },
          () => {
            if (!finished) {
              finished = true;
              clearTimeout(timer);
              resolve(false);
            }
          }
        );
      }
    );
  });
};

/**
 * Tulis raw string ke Bluetooth Serial
 */
export const writeBluetoothData = (text: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!isBluetoothPluginAvailable()) {
      resolve(false);
      return;
    }
    (window as any).bluetoothSerial.write(
      text,
      () => resolve(true),
      () => resolve(false)
    );
  });
};

/**
 * Cetak via aplikasi external RawBT print service (intent URI)
 */
export const printViaRawBt = (text: string): boolean => {
  try {
    const url = `rawbt:${encodeURIComponent(text)}`;
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    try {
      const intentUrl = `intent:${encodeURIComponent(text)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
      const a = document.createElement('a');
      a.href = intentUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch {
      return false;
    }
  }
};

// ── GLOBAL RECONNECT EVENT BUS ──
export type PrinterPromptEvent = {
  pendingText: string;
  mac: string | null;
  onSuccess?: () => void;
};

type PrinterPromptListener = (event: PrinterPromptEvent) => void;
const promptListeners: Set<PrinterPromptListener> = new Set();

export const subscribePrinterPrompt = (listener: PrinterPromptListener) => {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
};

export const triggerPrinterPrompt = (event: PrinterPromptEvent) => {
  if (promptListeners.size > 0) {
    promptListeners.forEach((fn) => fn(event));
  } else {
    // Jika tidak ada listener popup aktif, otomatis cetak via RawBT
    printViaRawBt(event.pendingText);
    event.onSuccess?.();
  }
};

export interface PrintOptions {
  onSuccess?: () => void;
  onError?: (err: any) => void;
  silent?: boolean;
  allowPrompt?: boolean; // Jika true, buka dialog reconnect jika putus
}

// Anti-spam lock untuk mencegah crash tabrakan socket
let isPrintingLock = false;

/**
 * FUNGSI UTAMA CETAK STRUK TERPADU (Smart On-Demand Socket ala webappprinter)
 * Buka koneksi cepat -> Tembak data -> Lepas socket bersih
 */
export const printThermalReceipt = async (
  rawText: string,
  options: PrintOptions = {}
): Promise<{ success: boolean; method: 'android_bridge' | 'bluetooth' | 'rawbt' | 'prompt' | 'failed' }> => {
  if (isPrintingLock) {
    options.onError?.('Proses cetak sedang berlangsung, mohon tunggu...');
    return { success: false, method: 'failed' };
  }

  isPrintingLock = true;
  try {
    // 1. Prioritas Utama: Jika aplikasi berjalan di dalam Kiosk Wrapper Android (webappprinter bridge)
    if (isAndroidBridgeAvailable()) {
      try {
        const res = (window as any).Android.printToDevice(rawText);
        if (res === 'ok' || res === true) {
          options.onSuccess?.();
          return { success: true, method: 'android_bridge' };
        }
      } catch (e) {
        console.warn('Gagal lewat Android bridge, mencoba metode lain...', e);
      }
    }

    // 2. Prioritas Kedua: Bluetooth Native (Capacitor / Cordova)
    const btMac = getStoredPrinterMac();
    if (btMac && isBluetoothPluginAvailable()) {
      // Buka koneksi On-Demand (Fresh Socket)
      let connected = await connectBluetoothPrinter(btMac, 4500);

      if (connected) {
        const writeOk = await writeBluetoothData(rawText);
        if (writeOk) {
          // Beri jeda 800ms agar seluruh buffer terkirim ke kertas printer
          await new Promise((r) => setTimeout(r, 800));
          // Lepas socket secara bersih (seperti webappprinter) agar printer bebas sleep
          await disconnectBluetooth();
          options.onSuccess?.();
          return { success: true, method: 'bluetooth' };
        }
      }

      // Percobaan ulang (Retry sekali lagi jika printer baru bangun dari sleep)
      await disconnectBluetooth();
      await new Promise((r) => setTimeout(r, 200));
      const retryConnected = await connectBluetoothPrinter(btMac, 4500);
      if (retryConnected) {
        const retryWriteOk = await writeBluetoothData(rawText);
        if (retryWriteOk) {
          await new Promise((r) => setTimeout(r, 800));
          await disconnectBluetooth();
          options.onSuccess?.();
          return { success: true, method: 'bluetooth' };
        }
      }

      // Jika printer benar-benar tidak merespons (misal mati/jauh)
      if (options.allowPrompt !== false) {
        triggerPrinterPrompt({
          pendingText: rawText,
          mac: btMac,
          onSuccess: options.onSuccess
        });
        return { success: false, method: 'prompt' };
      }

      // Fallback otomatis ke RawBT
      const rawBtOk = printViaRawBt(rawText);
      if (rawBtOk) {
        options.onSuccess?.();
        return { success: true, method: 'rawbt' };
      }
      options.onError?.('Printer Bluetooth tidak merespons dan RawBT tidak tersedia');
      return { success: false, method: 'failed' };
    }

    // 3. Fallback ke RawBT Driver jika di browser atau belum pairing native bluetooth
    const rawBtOk = printViaRawBt(rawText);
    if (rawBtOk) {
      options.onSuccess?.();
      return { success: true, method: 'rawbt' };
    }

    options.onError?.('Tidak ada driver atau printer Bluetooth yang disandingkan');
    return { success: false, method: 'failed' };
  } finally {
    isPrintingLock = false;
  }
};
