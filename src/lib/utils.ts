import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

export const getShiftInfo = (jam_masuk: string, finSettings?: Record<string, string>) => {
  const safeJam = (jam_masuk || '00:00').replace(/\./g, ':');
  const [hStr, mStr] = safeJam.split(':');
  const hour = parseInt(hStr || '0', 10);
  const min = parseInt(mStr || '0', 10);
  const currentMins = hour * 60 + min;

  const mode = finSettings?.shiftMode || '1-shift';
  let isLate = false;
  let lateMins = 0;
  let shiftName = 'PAGI';
  let isPagi = true;

  if (mode === '1-shift') {
    const startStr = finSettings?.shiftPagiStart || '08:00';
    const tol = parseInt(finSettings?.shiftPagiTolerance || '15', 10);
    const [h, m] = startStr.split(':').map(Number);
    const startMins = h * 60 + m;
    if (currentMins > startMins + tol) {
      isLate = true;
      lateMins = currentMins - startMins;
    }
    shiftName = 'PAGI'; // Label as Pagi but it means full day
    isPagi = true;
  } else {
    const startPagiStr = finSettings?.shiftPagiStart || '08:00';
    const tolPagi = parseInt(finSettings?.shiftPagiTolerance || '15', 10);
    const startSiangStr = finSettings?.shiftSiangStart || '15:00';
    const tolSiang = parseInt(finSettings?.shiftSiangTolerance || '15', 10);

    const [hP, mP] = startPagiStr.split(':').map(Number);
    const [hS, mS] = startSiangStr.split(':').map(Number);
    const startPagiMins = hP * 60 + mP;
    const startSiangMins = hS * 60 + mS;

    // Shift Pagi boundary is 13:30 (13*60+30), so Kasir Siang can clock in slightly early
    if (currentMins < 13 * 60 + 30) {
      shiftName = 'PAGI';
      isPagi = true;
      if (currentMins > startPagiMins + tolPagi) {
        isLate = true;
        lateMins = currentMins - startPagiMins;
      }
    } else {
      shiftName = 'SIANG';
      isPagi = false;
      if (currentMins > startSiangMins + tolSiang) {
        isLate = true;
        lateMins = currentMins - startSiangMins;
      }
    }
  }

  return { isLate, lateMins, shiftName, isPagi };
}
