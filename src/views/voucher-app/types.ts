/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'kasir' | 'owner';

export interface VoucherProduct {
  id: string;
  name: string;
  category: 'Pulsa' | 'Paket Data' | 'Token' | 'Game' | 'PLN';
  operator: 'Telkomsel' | 'Axis' | 'Indosat' | 'XL' | 'Tri' | 'Smartfren';
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStockLevel: number;
  description: string;
  barcode: string;
  sku: string;
}

export interface Cashier {
  id: string;
  name: string;
  role: 'Administrator' | 'Kasir Utama' | 'Kasir Shift';
  email: string;
  avatar: string;
  isOnline: boolean;
  pin?: string;
  // Profil & HRIS Fields
  alamat?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  tanggalJoin?: string;
  gajiPokok?: number;
  totalOffBulanIni?: number;
}

export interface HandoverProductDetail {
  productId: string;
  productName: string;
  price: number;
  previousStock: number;
  incomingStock: number;
  initialStock: number;
  finalStock: number;
  soldStock: number;
  subtotalSales: number;
}

export interface DetailedHandoverRecord {
  id: string;
  date: string; // YYYY-MM-DD for fast filtering
  timestamp: string; // ISO string with time
  shiftNumber: number; // 1 (Pagi) or 2 (Sore/Malam)
  shiftName: string; // 'Shift 1 (Pagi)' or 'Shift 2 (Sore/Malam)'
  cashierFromId: string;
  cashierFromName: string;
  cashierToId: string;
  cashierToName: string;
  totalInitialStock: number;
  totalIncomingStock: number;
  totalFinalStock: number;
  totalSoldPcs: number;
  totalSalesAmount: number;
  qrisAmount: number;
  qrisPcs: number;
  cashExpected: number;
  cashPhysical: number;
  cashDifference: number;
  note?: string;
  isLocked: boolean; // Immutable after creation
  productsSummary: HandoverProductDetail[];
}

export interface ShiftHandover {
  id: string;
  timestamp: string;
  fromCashierId: string;
  fromCashierName: string;
  toCashierId: string;
  toCashierName: string;
  totalProductsCount: number;
  totalStockTransferred: number;
  inventoryValue: number;
  status: 'Otomatis (Closed)' | 'Berhasil Diserahterimakan';
  notes: string;
}

export interface Transaction {
  id: string;
  type: 'PENJUALAN' | 'RESTOCK' | 'SERAH_TERIMA' | 'TAMBAH_STOK' | 'EDIT_STOK';
  productId?: string;
  productName?: string;
  quantity: number;
  amount: number; // For sale: revenue, for restock: cost, for serah terima: inventory value
  cogs?: number; // Cost of Goods Sold for profit calculation
  cashierName: string;
  timestamp: string;
  notes?: string;
  paymentMethod?: 'TUNAI' | 'QRIS' | 'TRANSFER' | 'NON_TUNAI';
}

export interface LiveNotification {
  id: string;
  type: 'transfer' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  metadata?: {
    oldStock?: number;
    newStock?: number;
    delta?: number;
    productId?: string;
    productName?: string;
    cashierName?: string;
    unitPrice?: number;
    isHighRisk?: boolean;
    reason?: 'audit' | 'restock' | 'sale' | 'transfer';
    subReason?: 'penjualan' | 'audit' | 'restock';
  };
}
