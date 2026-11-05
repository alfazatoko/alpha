/**
 * categoryHelper.ts
 * Standar Arsitektur Sistem ID vs Display Label untuk Kategori Layanan & Sumber Transfer
 * 
 * 5 ID SISTEM UTAMA:
 * - BANK     : Transfer Bank (Default: Bank UOB)
 * - ewallet  : Dompet Digital (Default: DANA, di Toko 2 bisa dinamai GOPAY)
 * - PPOB     : Server Pulsa/Kuota (Default: Order Kuota)
 * - BANK_2   : Transfer Bank Sekunder (Default: Flip)
 * - PPOB_2   : Server PPOB Sekunder (Default: Sinergi Pulsa)
 * 
 * Logika perhitungan (Laporan, Saldo Keluar, Closing, Kasir, Profit) merujuk ke ID SISTEM.
 * Nama tampilan (Display Label) hanya untuk layer tampilan UI, struk, dan tombol kasir.
 */

export type TransferSystemId = 'BANK' | 'ewallet' | 'PPOB' | 'BANK_2' | 'PPOB_2';
export const TransferSystemId = {};
export type AppSystemId = TransferSystemId | 'TARIK' | 'AKSESORIS' | 'VOUCHER' | 'OTHER';

export interface TransferChannelDef {
  id: TransferSystemId;
  defaultLabel: string;
  defaultSub: string;
  icon: string;
  hideKey: string;
  legacyCategoryNames: string[];
  defaultHidden?: boolean;
}

export const TRANSFER_CHANNELS: TransferChannelDef[] = [
  {
    id: 'BANK',
    defaultLabel: 'Bank UOB',
    defaultSub: 'Bank',
    icon: 'fa-building-columns',
    hideKey: 'HIDE_BANK',
    legacyCategoryNames: ['Transfer Bank', 'BANK', 'Bank UOB', 'TRANSFER']
  },
  {
    id: 'ewallet',
    defaultLabel: 'DANA',
    defaultSub: 'E-Wallet',
    icon: 'fa-wallet',
    hideKey: 'HIDE_ewallet',
    legacyCategoryNames: ['DANA', 'Dana', 'ewallet', 'GOPAY', 'OVO', 'SHOPEEPAY']
  },
  {
    id: 'PPOB',
    defaultLabel: 'Order Kuota',
    defaultSub: 'PPOB',
    icon: 'fa-bolt',
    hideKey: 'HIDE_PPOB',
    legacyCategoryNames: ['Order Kuota', 'ORDER KUOTA', 'PPOB', 'Kuota']
  },
  {
    id: 'BANK_2',
    defaultLabel: 'Flip',
    defaultSub: 'Transfer',
    icon: 'fa-arrow-right-arrow-left',
    hideKey: 'HIDE_BANK_2',
    legacyCategoryNames: ['FLIP', 'Flip', 'BANK_2']
  },
  {
    id: 'PPOB_2',
    defaultLabel: 'Sinergi Pulsa',
    defaultSub: 'PPOB',
    icon: 'fa-tower-cell',
    hideKey: 'HIDE_PPOB_2',
    legacyCategoryNames: ['Sinergi Pulsa', 'SINERGI PULSA', 'PPOB_2', 'Sinergi'],
    defaultHidden: true
  }
];

export const DEFAULT_CUSTOM_BUTTON_LABELS: Record<string, string | boolean> = {
  DIGITAL: 'Transfer',
  TARIK: 'Tarik Tunai',
  AKSESORIS: 'Aksesoris',
  VOUCHER: 'Voucher',

  // 5 System IDs Utama
  BANK: 'Bank UOB',
  ewallet: 'DANA',
  PPOB: 'Order Kuota',
  BANK_2: 'Flip',
  PPOB_2: 'Sinergi Pulsa',

  // Hide flags untuk 5 System IDs
  HIDE_BANK: false,
  HIDE_ewallet: false,
  HIDE_PPOB: false,
  HIDE_BANK_2: false,
  HIDE_PPOB_2: true,

  // Legacy key aliases agar kompatibel jika ada data lama yang tersimpan
  DANA: 'DANA',
  'ORDER KUOTA': 'Order Kuota',
  FLIP: 'Flip',
  'SINERGI PULSA': 'Sinergi Pulsa',
  'HIDE_SINERGI PULSA': true,

  // Sumber Masuk / Tarik Tunai
  'EDC / ATM': 'EDC/ATM',
  QRIS: 'QRIS',
  'TRANSFER BANK': 'TRANSFER',
  TARIK_DANA: 'DANA',
  GOPAY: 'GOPAY'
};

/**
 * Membaca custom labels dari localStorage toko aktif
 */
export const getStoredCustomLabels = (storeId?: string): Record<string, any> => {
  try {
    const storeKey = storeId && storeId !== 'all' ? `alphaPro_${storeId}_custom_labels` : 'alphaPro_custom_labels';
    const saved = localStorage.getItem(storeKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Guard isolasi ketat: Hanya Toko 2 ('580cb19a-a010-4de2-a3c7-0aa021609dfa') yang menggunakan GOPAY.
      // Toko 1, toko lainnya, dan default global SELALU menggunakan DANA.
      if (storeId !== '580cb19a-a010-4de2-a3c7-0aa021609dfa' && parsed.ewallet === 'GOPAY') {
        parsed.ewallet = 'DANA';
        try { localStorage.setItem(storeKey, JSON.stringify(parsed)); } catch (e) {}
      }
      return { ...DEFAULT_CUSTOM_BUTTON_LABELS, ...parsed };
    }
  } catch (e) {}
  return { ...DEFAULT_CUSTOM_BUTTON_LABELS };
};

/**
 * Mendapatkan Label Tampilan Aktif untuk System ID tertentu
 */
export const getChannelDisplayLabel = (
  channelId: TransferSystemId,
  customLabels?: Record<string, any>
): string => {
  const labels = customLabels || getStoredCustomLabels();
  switch (channelId) {
    case 'BANK':
      return (labels.BANK || labels['Transfer Bank'] || 'Bank UOB') as string;
    case 'ewallet':
      return (labels.ewallet || labels.DANA || 'DANA') as string;
    case 'PPOB':
      return (labels.PPOB || labels['ORDER KUOTA'] || 'Order Kuota') as string;
    case 'BANK_2':
      return (labels.BANK_2 || labels.FLIP || 'Flip') as string;
    case 'PPOB_2':
      return (labels.PPOB_2 || labels['SINERGI PULSA'] || 'Sinergi Pulsa') as string;
    default:
      return channelId;
  }
};

/**
 * Cek apakah sebuah channel disembunyikan
 */
export const isChannelHidden = (
  channelId: TransferSystemId,
  customLabels?: Record<string, any>
): boolean => {
  const labels = customLabels || getStoredCustomLabels();
  switch (channelId) {
    case 'BANK':
      return !!labels.HIDE_BANK;
    case 'ewallet':
      return !!(labels.HIDE_ewallet ?? labels.HIDE_DANA);
    case 'PPOB':
      return !!(labels.HIDE_PPOB ?? labels['HIDE_ORDER KUOTA']);
    case 'BANK_2':
      return !!(labels.HIDE_BANK_2 ?? labels.HIDE_FLIP);
    case 'PPOB_2':
      return !!(labels.HIDE_PPOB_2 ?? labels['HIDE_SINERGI PULSA']);
    default:
      return false;
  }
};

/**
 * Mendapatkan ID SISTEM dari sebuah transaksi.
 * 1. Pertama cek apakah ada tag eksplisit [SYS:xxx] di keterangan transaksi.
 * 2. Jika tidak ada, cek kecocokan kategori dengan System ID atau nama bawaan lama.
 */
export const getTransactionSystemId = (
  tx: { kategori?: string; keterangan?: string } | undefined | null,
  customLabels?: Record<string, any>
): AppSystemId => {
  if (!tx) return 'OTHER';

  const ket = (tx.keterangan || '').trim();
  const kat = (tx.kategori || '').trim();

  // GUARD PRIORITAS PERTAMA:
  // Transaksi 'Isi Saldo Bank', 'Isi Modal Tunai', 'Modal Awal', dll.
  // adalah INJEKSI MODAL, bukan transaksi layanan/penjualan.
  // Harus di-return 'OTHER' SEBELUM logika apapun di bawah ini berjalan.
  const lowerKatGuard = kat.toLowerCase();
  if (
    lowerKatGuard.startsWith('isi saldo') ||
    lowerKatGuard.startsWith('isi modal') ||
    lowerKatGuard === 'modal awal' ||
    lowerKatGuard === 'saldo awal' ||
    lowerKatGuard === 'isi modal tunai'
  ) return 'OTHER';

  // 1. Cek marker eksplisit di keterangan: [SYS:ewallet], [SYS:BANK], dll
  const sysMatch = ket.match(/\[SYS:(BANK|ewallet|PPOB|BANK_2|PPOB_2|TARIK|AKSESORIS|VOUCHER)\]/i);
  if (sysMatch && sysMatch[1]) {
    const val = sysMatch[1].toUpperCase();
    if (val === 'BANK') return 'BANK';
    if (val === 'EWALLET') return 'ewallet';
    if (val === 'PPOB') return 'PPOB';
    if (val === 'BANK_2') return 'BANK_2';
    if (val === 'PPOB_2') return 'PPOB_2';
    if (val === 'TARIK') return 'TARIK';
    if (val === 'AKSESORIS') return 'AKSESORIS';
    if (val === 'VOUCHER') return 'VOUCHER';
  }

  // 2. Cek apakah kategori cocok dengan System ID langsung
  if (kat === 'BANK') return 'BANK';
  if (kat === 'ewallet') return 'ewallet';
  if (kat === 'PPOB') return 'PPOB';
  if (kat === 'BANK_2') return 'BANK_2';
  if (kat === 'PPOB_2') return 'PPOB_2';

  // 3. Cek apakah kategori cocok dengan nama tampilan aktif di toko
  const labels = customLabels || getStoredCustomLabels();
  const ewalletLabel = (labels.ewallet || labels.DANA || 'DANA').toString().toLowerCase();
  const bankLabel = (labels.BANK || 'Bank UOB').toString().toLowerCase();
  const ppobLabel = (labels.PPOB || labels['ORDER KUOTA'] || 'Order Kuota').toString().toLowerCase();
  const bank2Label = (labels.BANK_2 || labels.FLIP || 'Flip').toString().toLowerCase();
  const ppob2Label = (labels.PPOB_2 || labels['SINERGI PULSA'] || 'Sinergi Pulsa').toString().toLowerCase();

  const lowerKat = kat.toLowerCase();
  if (lowerKat === ewalletLabel) return 'ewallet';
  if (lowerKat === bankLabel) return 'BANK';
  if (lowerKat === ppobLabel) return 'PPOB';
  if (lowerKat === bank2Label) return 'BANK_2';
  if (lowerKat === ppob2Label) return 'PPOB_2';

  // 4. Cek riwayat lama (backward compatibility data lama di database)
  if (lowerKat.includes('dana') || lowerKat === 'gopay' || lowerKat === 'ovo' || lowerKat === 'shopeepay') return 'ewallet';
  if (lowerKat.includes('order kuota') || lowerKat.includes('kuota')) return 'PPOB';
  if (lowerKat.includes('flip')) return 'BANK_2';
  if (lowerKat.includes('sinergi')) return 'PPOB_2';
  if (lowerKat.includes('transfer') || lowerKat.includes('bank') || lowerKat.includes('uob')) return 'BANK';

  if (lowerKat.includes('tarik') || lowerKat.includes('tunai')) return 'TARIK';
  if (lowerKat.includes('aksesoris')) return 'AKSESORIS';
  if (lowerKat.includes('voucher')) return 'VOUCHER';

  return 'OTHER';
};

/**
 * Menentukan apakah sebuah transaksi termasuk Transfer Saldo Bank / Digital (Keluar Modal Bank)
 * Digunakan untuk: Penjualan Digital & Pengurangan Saldo Bank Kasir.
 */
export const isDigitalTransferTx = (
  tx: { kategori?: string; keterangan?: string } | undefined | null,
  customLabels?: Record<string, any>
): boolean => {
  const sysId = getTransactionSystemId(tx, customLabels);
  return ['BANK', 'ewallet', 'PPOB', 'BANK_2', 'PPOB_2'].includes(sysId);
};

/**
 * Menentukan apakah transaksi adalah PPOB (Order Kuota / Sinergi)
 */
export const isPpobTx = (
  tx: { kategori?: string; keterangan?: string } | undefined | null,
  customLabels?: Record<string, any>
): boolean => {
  const sysId = getTransactionSystemId(tx, customLabels);
  return sysId === 'PPOB' || sysId === 'PPOB_2';
};

/**
 * Mendapatkan Nama Tampilan Bersih untuk ditampilkan pada baris transaksi / struk
 */
export const getTransactionDisplayTitle = (
  tx: { kategori?: string; keterangan?: string } | undefined | null,
  customLabels?: Record<string, any>
): string => {
  if (!tx) return '-';
  const sysId = getTransactionSystemId(tx, customLabels);
  if (sysId === 'BANK') return getChannelDisplayLabel('BANK', customLabels);
  if (sysId === 'ewallet') return getChannelDisplayLabel('ewallet', customLabels);
  if (sysId === 'PPOB') return getChannelDisplayLabel('PPOB', customLabels);
  if (sysId === 'BANK_2') return getChannelDisplayLabel('BANK_2', customLabels);
  if (sysId === 'PPOB_2') return getChannelDisplayLabel('PPOB_2', customLabels);
  if (sysId === 'TARIK') return 'Tarik Tunai';
  if (sysId === 'AKSESORIS') return 'Aksesoris';
  if (sysId === 'VOUCHER') return 'Voucher';
  return tx.kategori || '-';
};

/**
 * Normalisasi nama kategori ke nama tampilan aktif per toko
 */
export const getNormalizedCategory = (
  rawCategory: string = '',
  tx?: { kategori?: string; keterangan?: string } | null,
  customLabels?: Record<string, any>
): string => {
  return getTransactionDisplayTitle(tx || { kategori: rawCategory }, customLabels);
};


/**
 * Meresolve nama kategori/label tampilan ke System ID.
 * Kebalikan dari getTransactionDisplayTitle.
 * Digunakan untuk filter kategori di RiwayatView.
 */
export const resolveSystemId = (
  categoryLabel: string,
  customLabels?: Record<string, any>
): AppSystemId => {
  const labels = customLabels || getStoredCustomLabels();
  const lower = categoryLabel.toLowerCase().trim();

  // Cek exact match dengan System ID
  const systemIds: AppSystemId[] = ['BANK', 'ewallet', 'PPOB', 'BANK_2', 'PPOB_2', 'TARIK', 'AKSESORIS', 'VOUCHER'];
  for (const sid of systemIds) {
    if (lower === sid.toLowerCase()) return sid;
  }

  // Cek match dengan display label masing-masing channel
  const channels: Array<{ id: TransferSystemId }> = [
    { id: 'BANK' }, { id: 'ewallet' }, { id: 'PPOB' }, { id: 'BANK_2' }, { id: 'PPOB_2' }
  ];
  for (const ch of channels) {
    const displayLabel = getChannelDisplayLabel(ch.id, labels).toLowerCase();
    if (lower === displayLabel) return ch.id;
  }

  // Fallback label bawaan lama
  if (['transfer bank', 'bank', 'bni', 'bca', 'bri', 'mandiri'].includes(lower)) return 'BANK';
  if (['dana', 'ovo', 'gopay', 'ewallet', 'e-wallet', 'dompet digital'].includes(lower)) return 'ewallet';
  if (['ppob', 'order kuota', 'kuota', 'listrik', 'bpjs'].includes(lower)) return 'PPOB';
  if (['flip', 'bank 2', 'bank2'].includes(lower)) return 'BANK_2';
  if (['sinergi', 'sinergi pulsa', 'ppob 2', 'ppob2'].includes(lower)) return 'PPOB_2';
  if (['tarik', 'tarik tunai', 'penarikan'].includes(lower)) return 'TARIK';
  if (['aksesoris', 'aksesori', 'accessories'].includes(lower)) return 'AKSESORIS';
  if (['voucher', 'voucher fisik'].includes(lower)) return 'VOUCHER';

  return 'OTHER';
};
