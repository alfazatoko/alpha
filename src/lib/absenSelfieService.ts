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

    // 1. Coba upload ke Supabase Storage jika ada koneksi
    try {
      const fileName = `${storeId}/${cashierId}/${tanggal}_${shiftId}_${Date.now()}.webp`;
      const res = await fetch(base64Image);
      const blob = await res.blob();

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
      }
    } catch (uploadError) {
      console.warn('Storage upload fallback ke local Base64:', uploadError);
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
      await supabase.from('absen_selfie_records').insert([
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
    } catch (dbErr) {
      console.warn('DB insert fallback ke local cache:', dbErr);
    }

    // 3. Simpan juga ke cache lokal per-toko untuk instan offline
    const localKey = `alphaPro_${storeId}_selfie_${cashierId}`;
    try {
      const existing: AbsenSelfieRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      // Batasi cache lokal maksimal 30 foto terakhir agar hemat memori HP
      const updated = [newRecord, ...existing.filter(r => r.tanggal !== tanggal || r.shift_id !== shiftId)].slice(0, 30);
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {}

    return { success: true, photoUrl: finalPhotoUrl };
  } catch (err: any) {
    console.error('Gagal simpan absen selfie:', err);
    return { success: false, error: err?.message || String(err) };
  }
};

/**
 * Ambil daftar ringkasan Album Kasir (Berapa foto & berapa KB per-kasir)
 */
export const fetchCashierAlbums = async (
  storeId: string,
  kasirList: Record<string, { name: string; role?: string }>
): Promise<CashierSelfieAlbum[]> => {
  const albums: CashierSelfieAlbum[] = [];

  // Filter kasir (kecuali owner)
  const cashiers = Object.entries(kasirList).filter(([id, acc]) => id !== 'owner' && acc.role !== 'owner');

  // Coba ambil statistik dari Supabase
  try {
    const { data, error } = await supabase
      .from('absen_selfie_records')
      .select('cashier_id, cashier_name, photo_size_kb, photo_url, is_photo_deleted, tanggal')
      .eq('store_id', storeId)
      .eq('is_photo_deleted', false)
      .order('tanggal', { ascending: false });

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

  // Fallback membaca dari localStorage per-kasir
  for (const [id, acc] of cashiers) {
    const localKey = `alphaPro_${storeId}_selfie_${id}`;
    let records: AbsenSelfieRecord[] = [];
    try {
      records = JSON.parse(localStorage.getItem(localKey) || '[]').filter((r: AbsenSelfieRecord) => !r.is_photo_deleted);
    } catch {}

    const totalSize = Math.round(records.reduce((acc, curr) => acc + (Number(curr.photo_size_kb) || 0), 0) * 10) / 10;
    const latest = records[0];

    albums.push({
      cashier_id: id,
      cashier_name: acc.name,
      total_photos: records.length,
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
  try {
    const { data, error } = await supabase
      .from('absen_selfie_records')
      .select('*')
      .eq('store_id', storeId)
      .eq('cashier_id', cashierId)
      .eq('is_photo_deleted', false)
      .order('tanggal', { ascending: false })
      .order('jam', { ascending: false });

    if (!error && data) {
      return data as AbsenSelfieRecord[];
    }
  } catch (e) {}

  // Fallback localStorage
  const localKey = `alphaPro_${storeId}_selfie_${cashierId}`;
  try {
    const records: AbsenSelfieRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    return records.filter(r => !r.is_photo_deleted);
  } catch {
    return [];
  }
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
