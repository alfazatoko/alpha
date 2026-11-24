import { supabase } from './supabase';
import type { Transaction } from '../types';

export interface OfflinePendingTransaction {
  id: string; // Idempotency key (misal: "1732454500000" atau "offline_...")
  user_id: string;
  kasir_id: string;
  kategori: string;
  nominal: number;
  admin_fee: number;
  keterangan: string;
  timestamp: string;
  store_id: string;
  created_at?: string;
  retry_count?: number;
}

const STORAGE_OFFLINE_QUEUE_KEY = 'alphaPro_offline_tx_queue';
const STORAGE_STORE_TOTAL_COUNT_PREFIX = 'alphaPro_total_tx_count_';

/**
 * Mendapatkan daftar antrean transaksi offline dari localStorage
 */
export const getOfflineQueue = (): OfflinePendingTransaction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse offline queue:', e);
    return [];
  }
};

/**
 * Menyimpan transaksi baru ke antrean offline localStorage
 */
export const saveToOfflineQueue = (tx: OfflinePendingTransaction) => {
  try {
    const queue = getOfflineQueue();
    // Cegah duplikasi berdasarkan id
    if (!queue.some(item => item.id === tx.id)) {
      queue.push({ ...tx, created_at: tx.created_at || new Date().toISOString(), retry_count: 0 });
      localStorage.setItem(STORAGE_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      // Dispatch custom event agar UI header dan antrean langsung update
      window.dispatchEvent(new CustomEvent('alphaOfflineQueueUpdated', { detail: { count: queue.length } }));
    }
  } catch (e) {
    console.error('Failed to save to offline queue:', e);
  }
};

/**
 * Menghapus transaksi yang berhasil disinkronkan dari antrean offline
 */
export const removeFromOfflineQueue = (txId: string) => {
  try {
    const queue = getOfflineQueue().filter(item => item.id !== txId);
    localStorage.setItem(STORAGE_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('alphaOfflineQueueUpdated', { detail: { count: queue.length } }));
  } catch (e) {
    console.error('Failed to remove from offline queue:', e);
  }
};

/**
 * Mengambil total transaksi toko seumur hidup dari Supabase & cache lokal
 */
export const fetchStoreTotalTransactionCount = async (storeId: string): Promise<number> => {
  if (!storeId || storeId === 'all') return 0;
  
  const cacheKey = `${STORAGE_STORE_TOTAL_COUNT_PREFIX}${storeId}`;
  let cachedCount = 0;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cachedCount = parseInt(raw, 10) || 0;
  } catch {}

  // Jika online, sinkronkan count dari Supabase
  if (navigator.onLine) {
    try {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);

      if (!error && typeof count === 'number') {
        const accurateCount = Math.max(cachedCount, count);
        localStorage.setItem(cacheKey, accurateCount.toString());
        return accurateCount;
      }
    } catch (e) {
      console.warn('Could not fetch exact store transaction count from server:', e);
    }
  }

  return cachedCount;
};

/**
 * Menambahkan counter lokal ketika transaksi baru disimpan (online maupun offline)
 */
export const incrementStoreTotalCount = (storeId: string): number => {
  if (!storeId || storeId === 'all') return 1;
  const cacheKey = `${STORAGE_STORE_TOTAL_COUNT_PREFIX}${storeId}`;
  let current = 0;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) current = parseInt(raw, 10) || 0;
  } catch {}
  current += 1;
  try {
    localStorage.setItem(cacheKey, current.toString());
  } catch {}
  return current;
};

/**
 * Format ID Transaksi:
 * Format: #TRX-[NomorUrutSeumurHidup]-[DDMMYY]-[NomorUrutHariIni]
 * Contoh: #TRX-2845-241126-015
 */
export const formatDisplayInvoiceId = (
  lifetimeNo: number | string,
  timestampStr: string,
  todayNo: number | string
): string => {
  const d = new Date(timestampStr || Date.now());
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const ddmmyy = `${dd}${mm}${yy}`;

  const lifetimeStr = String(lifetimeNo || '1');
  const todayStr = String(todayNo || '1').padStart(3, '0');

  return `#TRX-${lifetimeStr}-${ddmmyy}-${todayStr}`;
};

/**
 * Eksekusi Sinkronisasi Seluruh Antrean Offline ke Supabase
 */
let isSyncing = false;
export const syncOfflineTransactions = async (
  onSuccessEach?: (tx: Transaction) => void
): Promise<{ success: number; failed: number }> => {
  if (isSyncing || !navigator.onLine) return { success: 0, failed: 0 };
  isSyncing = true;

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    isSyncing = false;
    return { success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    try {
      const payload = {
        id: item.id,
        user_id: item.user_id,
        kasir_id: item.kasir_id,
        kategori: item.kategori,
        nominal: item.nominal,
        admin_fee: item.admin_fee,
        keterangan: item.keterangan,
        timestamp: item.timestamp,
        store_id: item.store_id
      };

      // Gunakan upsert dengan onConflict id agar 100% aman (idempotent / tidak duplikat)
      const { error } = await supabase
        .from('transactions')
        .upsert(payload, { onConflict: 'id' });

      if (!error) {
        removeFromOfflineQueue(item.id);
        successCount++;
        if (onSuccessEach) {
          onSuccessEach({
            id: item.id,
            kategori: item.kategori,
            nominal: item.nominal,
            adminFee: item.admin_fee,
            keterangan: item.keterangan,
            timestamp: item.timestamp,
            kasir_id: item.kasir_id,
            store_id: item.store_id
          });
        }
      } else {
        console.error('Failed to sync item:', item.id, error);
        failedCount++;
      }
    } catch (err) {
      console.error('Error during sync item:', item.id, err);
      failedCount++;
    }
  }

  isSyncing = false;
  return { success: successCount, failed: failedCount };
};

