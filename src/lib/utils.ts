import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

declare const __APP_VERSION__: string;

// Versi aplikasi tersinkronisasi otomatis dari package.json via Vite define
export const APP_VERSION = (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) ? __APP_VERSION__ : '1.3.5';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseNominal = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : Math.round(value);
  return parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 0;
};

export const formatRupiah = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null) return 'Rp 0';
  const num = typeof amount === 'number' ? amount : parseNominal(amount);
  const valid = Math.round(isNaN(num) ? 0 : num);
  const formatted = valid.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp ${formatted}`;
};

export const formatInputRupiah = (value: string) => {
  if (!value) return '';
  const nominal = value.replace(/[^0-9]/g, '');
  return nominal.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Mendapatkan string ISO dalam waktu lokal (WIB) tanpa akhiran 'Z'
export const getLocalISOString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000; // offset dalam milidetik
  const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, -1);
  return localISOTime;
};

// Mendapatkan tanggal lokal saja (YYYY-MM-DD)
export const getLocalDateString = () => {
  return getLocalISOString().split('T')[0];
};

// Memformat objek Date ke tanggal lokal string YYYY-MM-DD
export const formatLocalISO = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Memparsing string ISO lokal kembali menjadi objek Date di timezone lokal
export const parseLocalISO = (iso: string) => {
  if (!iso) return new Date();
  const [datePart, timePart] = iso.split('T');
  if (!datePart) return new Date(iso);
  
  const [y, m, d] = datePart.split('-').map(Number);
  
  if (!timePart) {
    // Jika hanya tanggal (YYYY-MM-DD), buat objek date di jam 00:00 local
    return new Date(y, m - 1, d, 0, 0, 0);
  }
  
  const [h, min, sec] = timePart.split(':').map(v => parseFloat(v));
  return new Date(y, m - 1, d, h || 0, min || 0, Math.floor(sec || 0));
};

export const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export interface ActiveShiftItem {
  id: 'PAGI' | 'SIANG' | 'MALAM';
  name: string;
  label: string;
  startTime: string;
  endTime: string;
  tolerance: number;
}

/**
 * Helper to check if current app version meets required min version (e.g. 1.3.2)
 */
export const isVersionSupported = (currentVer: string = APP_VERSION, minVer: string = '1.3.2'): boolean => {
  try {
    const curParts = (currentVer || '').split('.').map(n => parseInt(n, 10) || 0);
    const minParts = (minVer || '').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(curParts.length, minParts.length); i++) {
      const c = curParts[i] || 0;
      const m = minParts[i] || 0;
      if (c > m) return true;
      if (c < m) return false;
    }
    return true;
  } catch {
    return true;
  }
};

export const getActiveShifts = (
  finSettings?: Record<string, string>,
  clientVersion: string = APP_VERSION
): ActiveShiftItem[] => {
  // Hanya aktif untuk aplikasi yang sudah di-update ke versi terbaru (1.3.2+)
  const minRequired = finSettings?.min_app_version || '1.3.2';
  if (!isVersionSupported(clientVersion, minRequired)) {
    return [];
  }

  if (finSettings?.absenEnabled === 'false') {
    return [];
  }

  const shifts: ActiveShiftItem[] = [];

  let hasExplicit = false;
  let pagiEnabled = false;
  let siangEnabled = false;
  let malamEnabled = false;

  if (
    finSettings?.shiftPagiEnabled !== undefined ||
    finSettings?.shiftSiangEnabled !== undefined ||
    finSettings?.shiftMalamEnabled !== undefined
  ) {
    hasExplicit = true;
    pagiEnabled = finSettings?.shiftPagiEnabled === 'true';
    siangEnabled = finSettings?.shiftSiangEnabled === 'true';
    malamEnabled = finSettings?.shiftMalamEnabled === 'true';
  }

  if (!hasExplicit) {
    const mode = finSettings?.shiftMode || '2-shift-pagi-siang';
    if (mode === '1-shift-siang') {
      siangEnabled = true;
    } else if (mode === '1-shift-pagi') {
      pagiEnabled = true;
    } else if (mode === '1-shift') {
      siangEnabled = true;
    } else if (mode === '2-shift-siang-malam') {
      siangEnabled = true;
      malamEnabled = true;
    } else if (mode === '2-shift-pagi-siang' || mode === '2-shift') {
      pagiEnabled = true;
      siangEnabled = true;
    } else if (mode === '3-shift') {
      pagiEnabled = true;
      siangEnabled = true;
      malamEnabled = true;
    } else {
      // Default: Pagi dan Siang (standar konter Alfaza)
      pagiEnabled = true;
      siangEnabled = true;
    }
  }

  if (pagiEnabled) {
    const startTime = finSettings?.shiftPagiStart || '07:00';
    const endTime = finSettings?.shiftPagiEnd || '15:59';
    shifts.push({
      id: 'PAGI',
      name: 'ABSEN PAGI',
      label: `${startTime} - ${endTime}`,
      startTime,
      endTime,
      tolerance: parseInt(finSettings?.shiftPagiTolerance || '15', 10),
    });
  }

  if (siangEnabled) {
    const startTime = finSettings?.shiftSiangStart || (pagiEnabled ? '15:00' : '12:00');
    const endTime = finSettings?.shiftSiangEnd || '22:59';
    shifts.push({
      id: 'SIANG',
      name: 'ABSEN SIANG',
      label: `${startTime} - ${endTime}`,
      startTime,
      endTime,
      tolerance: parseInt(finSettings?.shiftSiangTolerance || '15', 10),
    });
  }

  if (malamEnabled) {
    const startTime = finSettings?.shiftMalamStart || '18:00';
    const endTime = finSettings?.shiftMalamEnd || '23:59';
    shifts.push({
      id: 'MALAM',
      name: 'ABSEN MALAM',
      label: `${startTime} - ${endTime}`,
      startTime,
      endTime,
      tolerance: parseInt(finSettings?.shiftMalamTolerance || '15', 10),
    });
  }

  if (shifts.length === 0 && finSettings?.absenEnabled !== 'false') {
    shifts.push({
      id: 'PAGI',
      name: 'ABSEN PAGI',
      label: '07:00 - 15:59',
      startTime: '07:00',
      endTime: '15:59',
      tolerance: 15,
    });
    shifts.push({
      id: 'SIANG',
      name: 'ABSEN SIANG',
      label: '15:00 - 22:59',
      startTime: '15:00',
      endTime: '22:59',
      tolerance: 15,
    });
  }

  return shifts;
};

export const checkShiftLateness = (
  jam_masuk: string,
  shiftId: 'PAGI' | 'SIANG' | 'MALAM' | string,
  finSettings?: Record<string, string>
) => {
  const normShift = (shiftId || '').toUpperCase() as 'PAGI' | 'SIANG' | 'MALAM';
  const safeJam = (jam_masuk || '00:00').replace(/\./g, ':');
  const [hStr, mStr] = safeJam.split(':');
  const hour = parseInt(hStr || '0', 10);
  const min = parseInt(mStr || '0', 10);
  const currentMins = hour * 60 + min;

  let startStr = '07:00';
  let tolStr = '15';

  if (normShift === 'PAGI') {
    startStr = finSettings?.shiftPagiStart || '07:00';
    tolStr = finSettings?.shiftPagiTolerance || '15';
  } else if (normShift === 'SIANG') {
    startStr = finSettings?.shiftSiangStart || (finSettings?.shiftPagiEnabled === 'true' ? '15:00' : '12:00');
    tolStr = finSettings?.shiftSiangTolerance || '15';
  } else if (normShift === 'MALAM') {
    startStr = finSettings?.shiftMalamStart || '18:00';
    tolStr = finSettings?.shiftMalamTolerance || '15';
  }

  const [h, m] = startStr.replace(/\./g, ':').split(':').map(Number);
  const startMins = (h || 0) * 60 + (m || 0);
  const tol = parseInt(tolStr, 10) || 0;

  // Kasir yang absen jam berapapun sebelum atau tepat pada jam masuk + toleransi adalah SAH & TEPAT WAKTU (TIDAK TELAT)
  let isLate = false;
  let lateMins = 0;

  if (currentMins > startMins + tol) {
    isLate = true;
    lateMins = currentMins - startMins;
  }

  return { isLate, lateMins, shiftName: normShift || 'PAGI' };
};

export const getShiftInfo = (
  jam_masuk: string,
  finSettings?: Record<string, string>,
  explicitShift?: 'PAGI' | 'SIANG' | 'MALAM' | string
) => {
  const normShift = explicitShift ? (explicitShift.toUpperCase() as 'PAGI' | 'SIANG' | 'MALAM') : undefined;
  if (normShift && (normShift === 'PAGI' || normShift === 'SIANG' || normShift === 'MALAM')) {
    const lateness = checkShiftLateness(jam_masuk, normShift, finSettings);
    return {
      isLate: lateness.isLate,
      lateMins: lateness.lateMins,
      shiftName: normShift,
      isPagi: normShift === 'PAGI',
      isSiang: normShift === 'SIANG',
      isMalam: normShift === 'MALAM',
    };
  }

  if (!jam_masuk || jam_masuk === '-' || !jam_masuk.trim()) {
    return {
      isLate: false,
      lateMins: 0,
      shiftName: '-' as any,
      isPagi: false,
      isSiang: false,
      isMalam: false,
    };
  }

  const safeJam = (jam_masuk || '00:00').replace(/\./g, ':');
  const [hStr, mStr] = safeJam.split(':');
  const hour = parseInt(hStr || '0', 10);
  const min = parseInt(mStr || '0', 10);
  const currentMins = hour * 60 + min;

  const activeShifts = getActiveShifts(finSettings);
  if (activeShifts.length === 0) {
    return { isLate: false, lateMins: 0, shiftName: 'PAGI', isPagi: true, isSiang: false, isMalam: false };
  }

  if (activeShifts.length === 1) {
    const s = activeShifts[0];
    const lateness = checkShiftLateness(jam_masuk, s.id, finSettings);
    return {
      isLate: lateness.isLate,
      lateMins: lateness.lateMins,
      shiftName: s.id,
      isPagi: s.id === 'PAGI',
      isSiang: s.id === 'SIANG',
      isMalam: s.id === 'MALAM',
    };
  }

  let detectedId: 'PAGI' | 'SIANG' | 'MALAM' = activeShifts[0].id;
  const hasPagi = activeShifts.some(s => s.id === 'PAGI');
  const hasSiang = activeShifts.some(s => s.id === 'SIANG');
  const hasMalam = activeShifts.some(s => s.id === 'MALAM');

  const siangShift = activeShifts.find(s => s.id === 'SIANG');
  const malamShift = activeShifts.find(s => s.id === 'MALAM');

  const parseMins = (str?: string, defaultMins: number = 0) => {
    if (!str) return defaultMins;
    const [h, m] = str.replace(/\./g, ':').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const siangStartMins = parseMins(siangShift?.startTime, 12 * 60);
  const malamStartMins = parseMins(malamShift?.startTime, 18 * 60);

  if (hasPagi && hasSiang && hasMalam) {
    if (currentMins < siangStartMins) detectedId = 'PAGI';
    else if (currentMins < malamStartMins) detectedId = 'SIANG';
    else detectedId = 'MALAM';
  } else if (hasSiang && hasMalam) {
    if (currentMins < malamStartMins) detectedId = 'SIANG';
    else detectedId = 'MALAM';
  } else if (hasPagi && hasSiang) {
    if (currentMins < siangStartMins) detectedId = 'PAGI';
    else detectedId = 'SIANG';
  } else if (hasPagi && hasMalam) {
    if (currentMins < malamStartMins) detectedId = 'PAGI';
    else detectedId = 'MALAM';
  }

  const lateness = checkShiftLateness(jam_masuk, detectedId, finSettings);
  return {
    isLate: lateness.isLate,
    lateMins: lateness.lateMins,
    shiftName: detectedId,
    isPagi: detectedId === 'PAGI',
    isSiang: detectedId === 'SIANG',
    isMalam: detectedId === 'MALAM',
  };
};
