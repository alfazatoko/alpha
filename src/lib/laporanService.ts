import { supabase } from './supabase'

export interface LaporanHarianRow {
  tanggal: string // YYYY-MM-DD
  total_transaksi: number
  total_omzet: number
  total_laba: number
  laba_tunai: number
  laba_non_tunai: number
  tambah_saldo: number
}

export interface LaporanBulananRow {
  bulan_angka: number // 1..12
  bulan_key: string // YYYY-MM
  nama_bulan: string
  total_transaksi: number
  total_omzet: number
  total_laba: number
  laba_tunai: number
  laba_non_tunai: number
  tambah_saldo: number
  hari_terbaik_tanggal: string | null
  hari_terbaik_laba: number
}

export interface LaporanKasirRow {
  kasir_id: string
  total_transaksi: number
  total_omzet: number
  total_laba: number
  tambah_saldo: number
}

/**
 * Mengambil data rekap harian dari Single Source of Truth SQL RPC
 */
export async function fetchLaporanHarianRPC(params: {
  userId: string
  storeId?: string
  kasirId?: string
  startDate?: string
  endDate?: string
}): Promise<{ data: LaporanHarianRow[] | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('rpc_laporan_harian', {
      p_user_id: params.userId,
      p_store_id: params.storeId && params.storeId !== 'all' ? params.storeId : 'all',
      p_kasir_id: params.kasirId && params.kasirId !== 'Semua' ? params.kasirId : 'Semua',
      p_start_date: params.startDate || null,
      p_end_date: params.endDate || null,
    })
    if (error) {
      console.warn('Gagal memanggil rpc_laporan_harian:', error)
      return { data: null, error }
    }
    return { data: (data as LaporanHarianRow[]) || [], error: null }
  } catch (err) {
    console.warn('Catch error fetchLaporanHarianRPC:', err)
    return { data: null, error: err }
  }
}

/**
 * Mengambil data rekap tahunan (12 bulan) dari Single Source of Truth SQL RPC
 */
export async function fetchLaporanBulananRPC(params: {
  userId: string
  storeId?: string
  kasirId?: string
  year: number
}): Promise<{ data: LaporanBulananRow[] | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('rpc_laporan_bulanan', {
      p_user_id: params.userId,
      p_store_id: params.storeId && params.storeId !== 'all' ? params.storeId : 'all',
      p_kasir_id: params.kasirId && params.kasirId !== 'Semua' ? params.kasirId : 'Semua',
      p_year: params.year,
    })
    if (error) {
      console.warn('Gagal memanggil rpc_laporan_bulanan:', error)
      return { data: null, error }
    }
    return { data: (data as LaporanBulananRow[]) || [], error: null }
  } catch (err) {
    console.warn('Catch error fetchLaporanBulananRPC:', err)
    return { data: null, error: err }
  }
}

/**
 * Mengambil leaderboard performa per-kasir dari Single Source of Truth SQL RPC
 */
export async function fetchLaporanKasirLeaderboardRPC(params: {
  userId: string
  storeId?: string
  startDate?: string
  endDate?: string
}): Promise<{ data: LaporanKasirRow[] | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('rpc_laporan_kasir_leaderboard', {
      p_user_id: params.userId,
      p_store_id: params.storeId && params.storeId !== 'all' ? params.storeId : 'all',
      p_start_date: params.startDate || null,
      p_end_date: params.endDate || null,
    })
    if (error) {
      console.warn('Gagal memanggil rpc_laporan_kasir_leaderboard:', error)
      return { data: null, error }
    }
    return { data: (data as LaporanKasirRow[]) || [], error: null }
  } catch (err) {
    console.warn('Catch error fetchLaporanKasirLeaderboardRPC:', err)
    return { data: null, error: err }
  }
}
