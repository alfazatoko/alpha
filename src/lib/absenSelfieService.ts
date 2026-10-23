// ── ABSENSI SELFIE SERVICE (ONLINE CLOUD & LOCAL CACHE) ──
// Mengelola unggah foto selfie ber-watermark, kompresi ringan WebP (~30KB),
// pengelompokan album per-kasir, dan penghapusan foto untuk menghemat ruang cloud.

import { supabase } from './supabase';

export interface AbsenSelfieRecord {
  id: string;
  store_id: string;
  cashier_id: string;
  cashier_name: string;
  tanggal: string; // YYYY-MM-DD
  jam: string;     // HH:mm
  shift_id: string;
  shift_name: string;
  is_late: boolean;
  alasan_telat?: string | null;
  photo_url?: string | null;
  photo_path?: string | null;
  photo_size_kb: number;
  is_photo_deleted: boolean;
  photo_deleted_at?: string | null;
  created_at?: string;
}

export interface CashierSelfieAlbum {
  cashier_id: string;
  cashier_name: string;
  total_photos: number;
  total_size_kb: number;
  latest_photo_url: string | null;
  latest_date: string | null;
}

/**
 * Cek apakah fitur wajib selfie sedang aktif (Default: OFF / false)
 */
export const isAbsenSelfieEnabled = (finSettings?: Record<string, string> | null): boolean => {
  return finSettings?.absenSelfieEnabled === 'true';
};

/**
 * Tempelkan Watermark Teks ke Gambar (Toko, Kasir, Shift, & Waktu Presisi)
 */
export const applySelfieWatermark = (
  canvas: HTMLCanvasElement,
  storeName: string,
  cashierName: string,
  shiftName: string,
  timeStr: string,
  dateStr: string
): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/webp', 0.8);

  const width = canvas.width;
  const height = canvas.height;

  // Banner semi-transparan di bagian bawah
  const bannerHeight = Math.max(50, Math.round(height * 0.16));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

  // Garis aksen cyan/emerald di atas banner
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, height - bannerHeight, width, 3);

  // Teks baris 1: Nama Toko & Shift
  const fontSize1 = Math.max(12, Math.round(bannerHeight * 0.28));
  ctx.font = `bold ${fontSize1}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${storeName.toUpperCase()} • ${shiftName.toUpperCase()}`, 12, height - bannerHeight + fontSize1 + 6);

  // Teks baris 2: Nama Kasir & Waktu
  const fontSize2 = Math.max(10, Math.round(bannerHeight * 0.24));
  ctx.font = `600 ${fontSize2}px sans-serif`;
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`KASIR: ${cashierName.toUpperCase()} | ${dateStr} ${timeStr}`, 12, height - 10);

  return canvas.toDataURL('image/webp', 0.82);
};

/**
 * Konversi base64 DataURL ke Blob murni tanpa fetch (100% aman di Android WebView / PC / iOS)
 */
export const base64ToBlob = (base64Data: string): Blob => {
  try {
    const parts = base64Data.split(';base64,');
    const contentType = parts[0]?.split(':')[1] || 'image/webp';
    const raw = window.atob(parts[1] || parts[0]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  } catch (e) {
    console.error('Error base64ToBlob:', e);
    return new Blob([base64Data], { type: 'image/webp' });
  }
};

/**
 * Simpan Record Absen Selfie ke Supabase dan LocalStorage
 */
export const saveAbsenSelfieRecord = async (params: {
  storeId: string;
  cashierId: string;
  cashierName: string;
  tanggal: string;
  jam: string;
  shiftId: string;
  shiftName: string;
  isLate: boolean;
  alasanTelat?: string;
  base64Image: string;
}): Promise<{ success: boolean; photoUrl?: string; error?: string }> => {
  try {
    const {
      storeId,
      cashierId,
      cashierName,
      tanggal,
      jam,
      shiftId,
      shiftName,
      isLate,
      alasanTelat,
      base64Image
    } = params;

    // Hitung estimasi ukuran KB dari base64
    const approxBytes = Math.round((base64Image.length * 3) / 4);
    const photoSizeKb = Math.round((approxBytes / 1024) * 10) / 10;

    let finalPhotoUrl = base64Image;
    let photoPath = null;

    // 1. Upload ke Supabase Storage via Blob murni (anti-gagal di WebView HP)
    try {
      const blob = base64ToBlob(base64Image);
      const safeStoreId = storeId ? storeId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
      const safeCashierId = cashierId ? cashierId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'kasir';
      const fileName = `${safeStoreId}/${safeCashierId}/${tanggal}_${shiftId}_${Date.now()}.webp`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('absen-selfie')
        .upload(fileName, blob, {
          contentType: 'image/webp',
          upsert: true
        });

      if (!uploadErr && uploadData) {
        photoPath = uploadData.path;
        const { data: publicUrlData } = supabase.storage
          .from('absen-selfie')
          .getPublicUrl(uploadData.path);
        if (publicUrlData?.publicUrl) {
          finalPhotoUrl = publicUrlData.publicUrl;
        }
      } else if (uploadErr) {
        console.error('Storage upload error:', uploadErr.message || uploadErr);
      }
    } catch (uploadError) {
      console.warn('Storage upload catch error:', uploadError);
    }

    const newRecord: AbsenSelfieRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `selfie_${Date.now()}`,
      store_id: storeId,
      cashier_id: cashierId,
      cashier_name: cashierName,
      tanggal,
      jam,
      shift_id: shiftId,
      shift_name: shiftName,
      is_late: isLate,
      alasan_telat: alasanTelat || null,
      photo_url: finalPhotoUrl,
      photo_path: photoPath,
      photo_size_kb: photoSizeKb,
      is_photo_deleted: false,
      created_at: new Date().toISOString()
    };

    // 2. Simpan ke Supabase DB table `absen_selfie_records`
    try {
      const { data: insertData, error: insertErr } = await supabase.from('absen_selfie_records').insert([
        {
          store_id: storeId,
          cashier_id: cashierId,
          cashier_name: cashierName,
          tanggal,
          jam,
          shift_id: shiftId,
          shift_name: shiftName,
          is_late: isLate,
          alasan_telat: alasanTelat || null,
          photo_url: finalPhotoUrl,
          photo_path: photoPath,
          photo_size_kb: photoSizeKb,
          is_photo_deleted: false
        }
      ]);

      if (insertErr) {
        console.error('Supabase DB Insert error:', insertErr.message || insertErr);
      }
    } catch (dbErr) {
      console.warn('DB insert fallback error:', dbErr);
    }

    // 3. Simpan juga ke cache lokal multi-key untuk instan offline di HP yang sama
    const localKeys = [
      `alphaPro_${storeId}_selfie_${cashierId}`,
      `alphaPro_selfie_${cashierId}`,
      `alphaPro_default_selfie_${cashierId}`
    ];
    for (const localKey of localKeys) {
      try {
        const existing: AbsenSelfieRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
        const updated = [newRecord, ...existing.filter(r => r.tanggal !== tanggal || r.shift_id !== shiftId)].slice(0, 30);
        localStorage.setItem(localKey, JSON.stringify(updated));
      } catch {}
    }

    return { success: true, photoUrl: finalPhotoUrl };
  } catch (err: any) {
    console.error('Gagal simpan absen selfie:', err);
    return { success: false, error: err?.message || String(err) };
  }
};

/**
 * Ambil daftar ringkasan Album Kasir (Berapa foto & berapa KB per-kasir)
 * Mencakup Cloud Supabase (antar HP) dan Local Storage Fallback
 */
export const fetchCashierAlbums = async (
  storeId: string,
  kasirList: Record<string, { name: string; role?: string }>
): Promise<CashierSelfieAlbum[]> => {
  const albums: CashierSelfieAlbum[] = [];

  // Filter kasir (kecuali owner)
  const cashiers = Object.entries(kasirList).filter(([id, acc]) => id !== 'owner' && acc.role !== 'owner');
  const cashierIds = cashiers.map(([id]) => id);

  // 1. Coba ambil dari Supabase Cloud (berfungsi lintas HP & lintas store)
  try {
    let query = supabase
      .from('absen_selfie_records')
      .select('cashier_id, cashier_name, photo_size_kb, photo_url, is_photo_deleted, tanggal')
      .eq('is_photo_deleted', false)
      .order('tanggal', { ascending: false });

    if (cashierIds.length > 0) {
      query = query.in('cashier_id', cashierIds);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      for (const [id, acc] of cashiers) {
        const kasirData = data.filter(d => d.cashier_id === id);
        const totalSize = Math.round(kasirData.reduce((acc, curr) => acc + (Number(curr.photo_size_kb) || 0), 0) * 10) / 10;
        const latest = kasirData[0];
        albums.push({
          cashier_id: id,
          cashier_name: acc.name,
          total_photos: kasirData.length,
          total_size_kb: totalSize,
          latest_photo_url: latest?.photo_url || null,
          latest_date: latest?.tanggal || null
        });
      }
      return albums;
    }
  } catch (e) {
    console.warn('Gagal fetch album dari Supabase, membaca dari local cache:', e);
  }

  // 2. Fallback membaca dari localStorage per-kasir (multi-keys)
  for (const [id, acc] of cashiers) {
    let records: AbsenSelfieRecord[] = [];
    const localKeys = [
      `alphaPro_${storeId}_selfie_${id}`,
      `alphaPro_selfie_${id}`,
      `alphaPro_default_selfie_${id}`
    ];
    for (const key of localKeys) {
      try {
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        if (stored.length > records.length) {
          records = stored;
        }
      } catch {}
    }

    const validRecords = records.filter((r: AbsenSelfieRecord) => !r.is_photo_deleted);
    const totalSize = Math.round(validRecords.reduce((acc, curr) => acc + (Number(curr.photo_size_kb) || 0), 0) * 10) / 10;
    const latest = validRecords[0];

    albums.push({
      cashier_id: id,
      cashier_name: acc.name,
      total_photos: validRecords.length,
      total_size_kb: totalSize,
      latest_photo_url: latest?.photo_url || null,
      latest_date: latest?.tanggal || null
    });
  }

  return albums;
};

/**
 * Ambil seluruh foto absen kasir tertentu
 */
export const fetchCashierSelfiePhotos = async (
  storeId: string,
  cashierId: string
): Promise<AbsenSelfieRecord[]> => {
  // 1. Dari Supabase Cloud
  try {
    const { data, error } = await supabase
      .from('absen_selfie_records')
      .select('*')
      .eq('cashier_id', cashierId)
      .eq('is_photo_deleted', false)
      .order('tanggal', { ascending: false })
      .order('jam', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as AbsenSelfieRecord[];
    }
  } catch (e) {}

  // 2. Fallback localStorage multi-keys
  const localKeys = [
    `alphaPro_${storeId}_selfie_${cashierId}`,
    `alphaPro_selfie_${cashierId}`,
    `alphaPro_default_selfie_${cashierId}`
  ];
  for (const key of localKeys) {
    try {
      const records: AbsenSelfieRecord[] = JSON.parse(localStorage.getItem(key) || '[]');
      const valid = records.filter(r => !r.is_photo_deleted);
      if (valid.length > 0) {
        return valid;
      }
    } catch {}
  }

  return [];
};

/**
 * Hapus SATU foto selfie (Data teks absensi tetap utuh, hanya file gambar yang dihapus)
 */
export const deleteSingleSelfiePhoto = async (
  storeId: string,
  cashierId: string,
  recordId: string,
  photoPath?: string | null
): Promise<boolean> => {
  try {
    // 1. Hapus file dari Supabase Storage jika ada path
    if (photoPath) {
      try {
        await supabase.storage.from('absen-selfie').remove([photoPath]);
      } catch (err) {}
    }

    // 2. Update record di DB: set `is_photo_deleted = true`, kosongkan `photo_url`
    try {
      await supabase
        .from('absen_selfie_records')
        .update({
          is_photo_deleted: true,
          photo_url: null,
          photo_deleted_at: new Date().toISOString()
        })
        .eq('id', recordId);
    } catch (err) {}

    // 3. Update localStorage
    const localKey = `alphaPro_${storeId}_selfie_${cashierId}`;
    try {
      const records: AbsenSelfieRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      const updated = records.map(r => {
        if (r.id === recordId) {
          return { ...r, is_photo_deleted: true, photo_url: null };
        }
        return r;
      });
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {}

    return true;
  } catch (err) {
    console.error('Gagal hapus foto selfie:', err);
    return false;
  }
};

/**
 * Hapus MASAL foto selfie untuk satu kasir (misal: semua foto atau foto bulan lalu)
 */
export const deleteBulkCashierPhotos = async (
  storeId: string,
  cashierId: string,
  scope: 'all' | 'older_than_30_days'
): Promise<{ success: boolean; count: number }> => {
  try {
    const photos = await fetchCashierSelfiePhotos(storeId, cashierId);
    let targetPhotos = photos;

    if (scope === 'older_than_30_days') {
      const now = new Date();
      targetPhotos = photos.filter(p => {
        const photoDate = new Date(p.tanggal);
        const diffDays = (now.getTime() - photoDate.getTime()) / (1000 * 3600 * 24);
        return diffDays > 30;
      });
    }

    if (targetPhotos.length === 0) {
      return { success: true, count: 0 };
    }

    // Kumpulkan paths untuk storage
    const paths = targetPhotos.map(p => p.photo_path).filter(Boolean) as string[];
    if (paths.length > 0) {
      try {
        await supabase.storage.from('absen-selfie').remove(paths);
      } catch (e) {}
    }

    // Update DB
    const ids = targetPhotos.map(p => p.id);
    try {
      await supabase
        .from('absen_selfie_records')
        .update({
          is_photo_deleted: true,
          photo_url: null,
          photo_deleted_at: new Date().toISOString()
        })
        .in('id', ids);
    } catch (e) {}

    // Update localStorage
    const localKey = `alphaPro_${storeId}_selfie_${cashierId}`;
    try {
      const records: AbsenSelfieRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      const updated = records.map(r => {
        if (ids.includes(r.id)) {
          return { ...r, is_photo_deleted: true, photo_url: null };
        }
        return r;
      });
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {}

    return { success: true, count: targetPhotos.length };
  } catch (err) {
    console.error('Gagal hapus masal foto:', err);
    return { success: false, count: 0 };
  }
};
