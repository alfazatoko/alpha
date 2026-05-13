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
}

export interface AppState {
  saldoBank: number;
  totalPenjualan: number;
  transactions: Transaction[];
}
