export type TransactionCategory = 
  | 'Transfer Bank' 
  | 'DANA' 
  | 'FLIP' 
  | 'Order Kuota' 
  | 'Tarik Tunai' 
  | 'Aksesoris'
  | 'Isi Saldo Bank'
  | 'Isi Saldo Real Aplikasi'
  | 'Isi Modal Tunai Kasir'
  | 'Isi Total Penjualan';

export interface Transaction {
  id: string;
  kategori: TransactionCategory | string;
  nominal: number;
  adminFee: number;
  keterangan: string;
  timestamp: string;
  isEdited?: boolean;
  originalNominal?: number;
  originalAdminFee?: number;
  originalKategori?: string;
  kasir_id?: string;
  store_id?: string; // Menyimpan ID toko transaksi ini
}

export interface GajiBonusRecord {
  id: string;
  user_id: string;
  store_id: string;
  kasir_id: string;
  jenis: 'Gaji' | 'Bonus';
  nominal: number;
  keterangan: string;
  timestamp: string;
}

export interface AppState {
  saldoBank: number;
  totalPenjualan: number;
  transactions: Transaction[];
}

export interface Absensi {
  id?: number;
  username: string;
  nama: string;
  tanggal: string; // YYYY-MM-DD
  jam_masuk: string; // HH:mm:ss
  status: 'Hadir' | 'Libur' | 'Lembur';
  store_id?: string; // Menyimpan ID toko absensi ini
  alasan_telat?: string;
}

export interface PresetOtomatis {
  id: string;
  kategori?: string;
  keterangan: string;
  modal: number;
  jual: number;
}

export interface Store {
  id: string;
  user_id: string;
  name: string;
  subtext?: string;
  photo_url?: string;
  created_at?: string;
}

export interface StoreSettings {
  store_id: string;
  cashiers: Record<string, any>;
  presets: PresetOtomatis[];
  running_texts: string[];
  main_announcement: string;
  is_pin_enabled: boolean;
}

export interface OperkanSaldo {
  id: string;
  store_id: string;
  pengirim_id: string;
  pengirim_name: string;
  penerima_id: string;
  penerima_name: string;
  nominal_total: number;
  items: { nominal: number; keterangan: string }[];
  catatan?: string;
  status: 'PENDING' | 'DITERIMA' | 'DIAMBIL_KEMBALI';
  diterima_oleh?: string;
  diterima_name?: string;
  tanggal_kirim: string;
  tanggal_terima?: string;
}

