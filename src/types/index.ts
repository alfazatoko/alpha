export type TransactionCategory = 
  | 'Transfer Bank' 
  | 'DANA' 
  | 'FLIP' 
  | 'Order Kuota' 
  | 'Tarik Tunai' 
  | 'Aksesoris'
  | 'Isi Saldo Bank'
  | 'Isi Total Penjualan';

export interface Transaction {
  id: string;
  kategori: TransactionCategory | string;
  nominal: number;
  adminFee: number;
  keterangan: string;
  timestamp: string;
}

export interface AppState {
  saldoBank: number;
  totalPenjualan: number;
  transactions: Transaction[];
}
