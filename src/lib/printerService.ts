// ── CENTRALIZED PRINTER SERVICE (THERMAL ESC/POS & RAWBT) ──
// Mendukung koneksi Bluetooth Native (Capacitor/Cordova) dengan auto-reconnect,
// auto-fallback RawBT, formatting 32-kolom seragam, dan event prompt reconnect.

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
 * Cek apakah plugin bluetooth serial native tersedia di perangkat
 */
export const isBluetoothPluginAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).bluetoothSerial;
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
 */
export const connectBluetoothPrinter = (mac: string, timeoutMs = 4500): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!isBluetoothPluginAvailable() || !mac) {
      resolve(false);
      return;
    }

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
        // Jika mode secure gagal, coba mode connectInsecure
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
  } catch (e) {
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
// Memungkinkan komponen modal popup global mendengarkan permintaan sambungkan printer
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

/**
 * FUNGSI UTAMA CETAK STRUK TERPADU (Digunakan oleh seluruh halaman aplikasi)
 */
export const printThermalReceipt = async (
  rawText: string,
  options: PrintOptions = {}
): Promise<{ success: boolean; method: 'bluetooth' | 'rawbt' | 'prompt' | 'failed' }> => {
  const allowPrompt = options.allowPrompt !== false;
  const btMac = getStoredPrinterMac();

  // 1. Jika terdaftar Bluetooth Native Printer
  if (btMac && isBluetoothPluginAvailable()) {
    // Cek apakah socket saat ini sudah terhubung
    const isConnected = await checkBluetoothConnected();
    if (isConnected) {
      const writeOk = await writeBluetoothData(rawText);
      if (writeOk) {
        options.onSuccess?.();
        return { success: true, method: 'bluetooth' };
      }
    }

    // Jika belum terhubung atau write gagal, coba silent auto-reconnect
    const reconnected = await connectBluetoothPrinter(btMac, 3500);
    if (reconnected) {
      const writeAfterOk = await writeBluetoothData(rawText);
      if (writeAfterOk) {
        options.onSuccess?.();
        return { success: true, method: 'bluetooth' };
      }
    }

    // Jika auto-reconnect gagal dan diizinkan prompt dialog
    if (allowPrompt) {
      triggerPrinterPrompt({
        pendingText: rawText,
        mac: btMac,
        onSuccess: options.onSuccess
      });
      return { success: false, method: 'prompt' };
    }

    // Fallback otomatis ke RawBT jika tidak ada prompt
    const rawBtOk = printViaRawBt(rawText);
    if (rawBtOk) {
      options.onSuccess?.();
      return { success: true, method: 'rawbt' };
    }
    options.onError?.('Gagal cetak Bluetooth dan RawBT');
    return { success: false, method: 'failed' };
  }

  // 2. Jika tidak ada Bluetooth Native / berjalan di Web Browser -> Gunakan RawBT
  const rawBtOk = printViaRawBt(rawText);
  if (rawBtOk) {
    options.onSuccess?.();
    return { success: true, method: 'rawbt' };
  }

  options.onError?.('Tidak ada driver printer yang tersedia');
  return { success: false, method: 'failed' };
};
