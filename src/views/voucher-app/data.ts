/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { VoucherProduct, Cashier, Transaction, LiveNotification, DetailedHandoverRecord } from './types';

export const INITIAL_PRODUCTS: VoucherProduct[] = [
  {
    id: 'prod-1',
    name: 'Axis 6GB 1Hari',
    category: 'Paket Data',
    operator: 'Axis',
    costPrice: 6500,
    sellingPrice: 8000,
    currentStock: 15,
    minStockLevel: 20,
    description: 'Voucher Internet Axis kuota 6GB berlaku 1 Hari nasional.',
    barcode: '9003890065',
    sku: 'AX-6GB-1D'
  },
  {
    id: 'prod-2',
    name: 'Tsel 10GB 3Hari',
    category: 'Paket Data',
    operator: 'Telkomsel',
    costPrice: 6500,
    sellingPrice: 8000,
    currentStock: 42,
    minStockLevel: 15,
    description: 'Voucher Paket Internet Telkomsel OMG 10GB berlaku selama 3 Hari.',
    barcode: '9012384729',
    sku: 'TS-10GB-3D'
  },
  {
    id: 'prod-3',
    name: 'im3 20GB 7Hari',
    category: 'Paket Data',
    operator: 'Indosat',
    costPrice: 6500,
    sellingPrice: 8000,
    currentStock: 8,
    minStockLevel: 12,
    description: 'Voucher Indosat Ooredoo Freedom Internet 20GB Full 24 Jam selama 7 Hari.',
    barcode: '9072303339',
    sku: 'IS-20GB-7D'
  },
  {
    id: 'prod-4',
    name: 'Tri 30GB 30Hari',
    category: 'Paket Data',
    operator: 'Tri',
    costPrice: 6500,
    sellingPrice: 8000,
    currentStock: 105,
    minStockLevel: 25,
    description: 'Voucher Tri Happy 30GB Full Kuota 24 Jam berlaku 30 Hari.',
    barcode: '9082394812',
    sku: 'TR-30GB-30D'
  },
  {
    id: 'prod-5',
    name: 'XL 12GB 1Hari',
    category: 'Paket Data',
    operator: 'XL',
    costPrice: 6500,
    sellingPrice: 8000,
    currentStock: 22,
    minStockLevel: 15,
    description: 'Voucher XL Xtra HotRod 12GB berlaku selama 1 Hari.',
    barcode: '9091827364',
    sku: 'XL-12GB-1D'
  },
  {
    id: 'prod-6',
    name: 'Smartfren 3GB 7Hari',
    category: 'Paket Data',
    operator: 'Smartfren',
    costPrice: 6500,
    sellingPrice: 8000,
    currentStock: 11,
    minStockLevel: 15,
    description: 'Voucher Smartfren 3GB Full Kuota 24 Jam berlaku selama 7 Hari.',
    barcode: '9051827390',
    sku: 'SF-3GB-7D'
  },
  {
    id: 'prod-7',
    name: 'Pulsa Telkomsel 50k',
    category: 'Pulsa',
    operator: 'Telkomsel',
    costPrice: 48500,
    sellingPrice: 51000,
    currentStock: 30,
    minStockLevel: 10,
    description: 'Voucher Fisik Isi Ulang Pulsa Telkomsel Nominal Rp 50.000.',
    barcode: '9021837492',
    sku: 'TS-P50K'
  },
  {
    id: 'prod-8',
    name: 'Token PLN 100k',
    category: 'PLN',
    operator: 'Telkomsel', // Standard operator mapped for general, but category PLN handles styling
    costPrice: 98500,
    sellingPrice: 101000,
    currentStock: 5,
    minStockLevel: 8,
    description: 'Voucher Token Listrik Prabayar PLN Nominal Rp 100.000.',
    barcode: '9039182731',
    sku: 'PLN-100K'
  },
  {
    id: 'prod-9',
    name: 'Mobile Legends 86 DM',
    category: 'Game',
    operator: 'Indosat',
    costPrice: 18000,
    sellingPrice: 20000,
    currentStock: 19,
    minStockLevel: 10,
    description: 'Voucher Top Up Game Mobile Legends Bang Bang 86 Diamonds.',
    barcode: '9049182745',
    sku: 'ML-86DM'
  }
];

export const INITIAL_CASHIERS: Cashier[] = [
  {
    id: 'cashier-1',
    name: 'Budi Satria',
    role: 'Kasir Utama',
    email: 'budi.satria@voucherku.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    isOnline: true
  },
  {
    id: 'cashier-2',
    name: 'Ahmad Rifai',
    role: 'Kasir Shift',
    email: 'ahmad.rifai@voucherku.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
    isOnline: false
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'trx-1',
    type: 'PENJUALAN',
    productId: 'prod-2',
    productName: 'Tsel 10GB 3Hari',
    quantity: 1,
    amount: 8000,
    cashierName: 'Budi Satria',
    timestamp: '2026-08-16T08:15:00-07:00',
    notes: 'Penjualan tunai ke pelanggan'
  },
  {
    id: 'trx-2',
    type: 'PENJUALAN',
    productId: 'prod-1',
    productName: 'Axis 6GB 1Hari',
    quantity: 2,
    amount: 16000,
    cashierName: 'Budi Satria',
    timestamp: '2026-08-16T09:30:00-07:00',
    notes: 'Pembayaran Qris'
  },
  {
    id: 'trx-3',
    type: 'RESTOCK',
    productId: 'prod-3',
    productName: 'im3 20GB 7Hari',
    quantity: 10,
    amount: 65000,
    cashierName: 'Budi Satria',
    timestamp: '2026-08-15T16:45:00-07:00',
    notes: 'Restock voucher dari supplier PT. Sumber Pulsa'
  }
];

export const INITIAL_NOTIFICATIONS: LiveNotification[] = [
  {
    id: 'notif-1',
    type: 'success',
    title: 'Aplikasi Siap Digunakan',
    message: 'Sistem Pembukuan Stok Voucher berhasil dimuat. Selamat bertugas!',
    timestamp: new Date().toISOString(),
    isRead: false
  },
  {
    id: 'notif-2',
    type: 'warning',
    title: 'Stok Hampir Habis!',
    message: 'Stok voucher "im3 20GB 7Hari" tersisa 8 pcs (Minimum: 12 pcs).',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isRead: false
  }
];

export const INITIAL_DETAILED_HANDOVERS: DetailedHandoverRecord[] = [
  {
    id: 'rec-shift1-17aug',
    date: '2026-08-17',
    timestamp: '2026-08-17T15:58:00+07:00',
    shiftNumber: 1,
    shiftName: 'Shift 1 (Pagi)',
    cashierFromId: 'cashier-1',
    cashierFromName: 'Budi Satria',
    cashierToId: 'cashier-2',
    cashierToName: 'Siti Rahma',
    totalInitialStock: 120,
    totalIncomingStock: 10,
    totalFinalStock: 85,
    totalSoldPcs: 35,
    totalSalesAmount: 280000,
    qrisAmount: 80000,
    qrisPcs: 10,
    cashExpected: 200000,
    cashPhysical: 200000,
    cashDifference: 0,
    note: 'Kondisi fisik aman, uang pas tidak ada selisih.',
    isLocked: true,
    productsSummary: [
      {
        productId: 'prod-1',
        productName: 'Axis 6GB 1Hari',
        price: 8000,
        previousStock: 20,
        incomingStock: 5,
        initialStock: 25,
        finalStock: 15,
        soldStock: 10,
        subtotalSales: 80000
      },
      {
        productId: 'prod-2',
        productName: 'Tsel 10GB 3Hari',
        price: 8000,
        previousStock: 50,
        incomingStock: 5,
        initialStock: 55,
        finalStock: 42,
        soldStock: 13,
        subtotalSales: 104000
      },
      {
        productId: 'prod-3',
        productName: 'im3 20GB 7Hari',
        price: 8000,
        previousStock: 15,
        incomingStock: 0,
        initialStock: 15,
        finalStock: 8,
        soldStock: 7,
        subtotalSales: 56000
      },
      {
        productId: 'prod-4',
        productName: 'Tri 30GB 30Hari',
        price: 8000,
        previousStock: 35,
        incomingStock: 0,
        initialStock: 35,
        finalStock: 30,
        soldStock: 5,
        subtotalSales: 40000
      }
    ]
  },
  {
    id: 'rec-shift2-17aug',
    date: '2026-08-17',
    timestamp: '2026-08-17T23:05:00+07:00',
    shiftNumber: 2,
    shiftName: 'Shift 2 (Sore/Malam)',
    cashierFromId: 'cashier-2',
    cashierFromName: 'Siti Rahma',
    cashierToId: 'cashier-1',
    cashierToName: 'Budi Satria',
    totalInitialStock: 85,
    totalIncomingStock: 0,
    totalFinalStock: 57,
    totalSoldPcs: 28,
    totalSalesAmount: 224000,
    qrisAmount: 64000,
    qrisPcs: 8,
    cashExpected: 160000,
    cashPhysical: 160000,
    cashDifference: 0,
    note: 'Tutup toko jam 23:00, etalase rapi.',
    isLocked: true,
    productsSummary: [
      {
        productId: 'prod-1',
        productName: 'Axis 6GB 1Hari',
        price: 8000,
        previousStock: 15,
        incomingStock: 0,
        initialStock: 15,
        finalStock: 10,
        soldStock: 5,
        subtotalSales: 40000
      },
      {
        productId: 'prod-2',
        productName: 'Tsel 10GB 3Hari',
        price: 8000,
        previousStock: 42,
        incomingStock: 0,
        initialStock: 42,
        finalStock: 30,
        soldStock: 12,
        subtotalSales: 96000
      },
      {
        productId: 'prod-3',
        productName: 'im3 20GB 7Hari',
        price: 8000,
        previousStock: 8,
        incomingStock: 0,
        initialStock: 8,
        finalStock: 3,
        soldStock: 5,
        subtotalSales: 40000
      },
      {
        productId: 'prod-4',
        productName: 'Tri 30GB 30Hari',
        price: 8000,
        previousStock: 30,
        incomingStock: 0,
        initialStock: 30,
        finalStock: 24,
        soldStock: 6,
        subtotalSales: 48000
      }
    ]
  }
];

export const OPERATOR_STYLES: Record<string, { bg: string; text: string; border: string; logoBg: string }> = {
  Telkomsel: {
    bg: 'from-red-500/10 to-red-600/5',
    text: 'text-red-500',
    border: 'border-red-500/20',
    logoBg: 'bg-red-500'
  },
  Axis: {
    bg: 'from-purple-500/10 to-purple-600/5',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    logoBg: 'bg-purple-600'
  },
  Indosat: {
    bg: 'from-yellow-500/10 to-yellow-600/5',
    text: 'text-yellow-500',
    border: 'border-yellow-500/20',
    logoBg: 'bg-yellow-500'
  },
  XL: {
    bg: 'from-blue-500/10 to-blue-600/5',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    logoBg: 'bg-blue-600'
  },
  Tri: {
    bg: 'from-pink-500/10 to-pink-600/5',
    text: 'text-pink-400',
    border: 'border-pink-500/20',
    logoBg: 'bg-pink-600'
  },
  Smartfren: {
    bg: 'from-rose-500/10 to-rose-600/5',
    text: 'text-rose-500 font-black dark:text-rose-400',
    border: 'border-rose-500/20',
    logoBg: 'bg-rose-500'
  }
};
