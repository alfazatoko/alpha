import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Versi aplikasi tersinkronisasi otomatis dari package.json via Vite define
export const APP_VERSION = (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) ? __APP_VERSION__ : '1.3.2';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const parseNominal = (value: string) => {
  return parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
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

export const getActiveShifts = (finSettings?: Record<string, string>): ActiveShiftItem[] => {
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
    const mode = finSettings?.shiftMode || '2-shift-siang-malam';
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
      // Default: Siang dan Malam
      siangEnabled = true;
      malamEnabled = true;
    }
  }

  if (pagiEnabled) {
    const startTime = finSettings?.shiftPagiStart || '06:00';
    const endTime = finSettings?.shiftPagiEnd || '11:59';
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
    const startTime = finSettings?.shiftSiangStart || '12:00';
    const endTime = finSettings?.shiftSiangEnd || '17:59';
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
      id: 'SIANG',
      name: 'ABSEN SIANG',
      label: '12:00 - 17:59',
      startTime: '12:00',
      endTime: '17:59',
      tolerance: 15,
    });
    shifts.push({
      id: 'MALAM',
      name: 'ABSEN MALAM',
      label: '18:00 - 23:59',
      startTime: '18:00',
      endTime: '23:59',
      tolerance: 15,
    });
  }

  return shifts;
};

export const checkShiftLateness = (
  jam_masuk: string,
  shiftId: 'PAGI' | 'SIANG' | 'MALAM',
  finSettings?: Record<string, string>
) => {
  const safeJam = (jam_masuk || '00:00').replace(/\./g, ':');
  const [hStr, mStr] = safeJam.split(':');
  const hour = parseInt(hStr || '0', 10);
  const min = parseInt(mStr || '0', 10);
  const currentMins = hour * 60 + min;

  let startStr = '12:00';
  let tolStr = '15';

  if (shiftId === 'PAGI') {
    startStr = finSettings?.shiftPagiStart || '06:00';
    tolStr = finSettings?.shiftPagiTolerance || '15';
  } else if (shiftId === 'SIANG') {
    startStr = finSettings?.shiftSiangStart || '12:00';
    tolStr = finSettings?.shiftSiangTolerance || '15';
  } else if (shiftId === 'MALAM') {
    startStr = finSettings?.shiftMalamStart || '18:00';
    tolStr = finSettings?.shiftMalamTolerance || '15';
  }

  const [h, m] = startStr.split(':').map(Number);
  const startMins = (h || 0) * 60 + (m || 0);
  const tol = parseInt(tolStr, 10) || 0;

  let isLate = false;
  let lateMins = 0;

  if (currentMins > startMins + tol) {
    isLate = true;
    lateMins = currentMins - startMins;
  }

  return { isLate, lateMins, shiftName: shiftId };
};

export const getShiftInfo = (
  jam_masuk: string,
  finSettings?: Record<string, string>,
  explicitShift?: 'PAGI' | 'SIANG' | 'MALAM'
) => {
  if (explicitShift) {
    const lateness = checkShiftLateness(jam_masuk, explicitShift, finSettings);
    return {
      isLate: lateness.isLate,
      lateMins: lateness.lateMins,
      shiftName: explicitShift,
      isPagi: explicitShift === 'PAGI',
      isSiang: explicitShift === 'SIANG',
      isMalam: explicitShift === 'MALAM',
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

  if (hasPagi && hasSiang && hasMalam) {
    if (currentMins < 12 * 60) detectedId = 'PAGI';
    else if (currentMins < 18 * 60) detectedId = 'SIANG';
    else detectedId = 'MALAM';
  } else if (hasSiang && hasMalam) {
    if (currentMins < 17 * 60 + 30) detectedId = 'SIANG';
    else detectedId = 'MALAM';
  } else if (hasPagi && hasSiang) {
    if (currentMins < 13 * 60 + 30) detectedId = 'PAGI';
    else detectedId = 'SIANG';
  } else if (hasPagi && hasMalam) {
    if (currentMins < 15 * 60) detectedId = 'PAGI';
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
