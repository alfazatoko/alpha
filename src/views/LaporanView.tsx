import React, { useState, useEffect, useMemo } from 'react'
import { formatRupiah, cn } from '../lib/utils'
import type { Transaction } from '../types'

interface LaporanViewProps {
  active: boolean
  saldoBank: number
  totalPenjualan: number
  transactions: Transaction[]
  totalTarik: number
  totalAdmin: number
  totalAksesoris: number
  totalVolume: number
  totalSaldoKas: number
  penjualanDigital: number
  kasModal: number
  kasirRole?: string
  filterKasir?: string
  setFilterKasir?: (v: string) => void
  filterTanggal: string
  setFilterTanggal: (v: string) => void
  saldoReal: number
  onEdit: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => void
  kasirList: Record<string, any>
  setActiveView: (v: string) => void
  kasLainnya: number
  storeName?: string
  storeSubtext?: string
  storePhoto?: string
  kasirName?: string
  setIsSidePanelOpen?: (v: boolean) => void
  isPc?: boolean
  activeStoreId?: string
}

interface VoucherItem {
  id: number
  name: string
  price: number
  modal: number
  awal: number
  akhir: number
}

const initialDataVoucher: Record<string, VoucherItem[]> = {
  'AXIS': [
    { id: 301, name: '5.5 GB/1 H', price: 8000, modal: 6500, awal: 0, akhir: 0 },
    { id: 302, name: '15 GB/1 H', price: 10000, modal: 8500, awal: 0, akhir: 0 },
    { id: 303, name: '5,5 GB/2 H', price: 10000, modal: 8500, awal: 0, akhir: 0 },
    { id: 304, name: '3,5 GB/3 H', price: 11000, modal: 9500, awal: 0, akhir: 0 },
    { id: 305, name: '5.5 GB/3 H', price: 13000, modal: 11500, awal: 0, akhir: 0 },
    { id: 306, name: '9 GB/3 H', price: 15000, modal: 13500, awal: 0, akhir: 0 },
    { id: 307, name: '13 GB/3 H', price: 18000, modal: 16500, awal: 0, akhir: 0 },
    { id: 308, name: '5GB/5 H', price: 15000, modal: 13500, awal: 0, akhir: 0 },
    { id: 309, name: '6 GB/5 H', price: 17000, modal: 15500, awal: 0, akhir: 0 },
    { id: 310, name: '17 GB/5 H', price: 25000, modal: 23500, awal: 0, akhir: 0 },
    { id: 311, name: '25 GB/5 H', price: 28000, modal: 26500, awal: 0, akhir: 0 },
    { id: 312, name: '4 GB/7 H', price: 16000, modal: 14500, awal: 0, akhir: 0 },
    { id: 313, name: '12 GB/7 H', price: 25000, modal: 23500, awal: 0, akhir: 0 },
    { id: 314, name: '19 GB/7 H', price: 30000, modal: 28500, awal: 0, akhir: 0 },
    { id: 315, name: '6 GB/14 H', price: 23000, modal: 21500, awal: 0, akhir: 0 },
    { id: 316, name: '9 GB/14 H', price: 29000, modal: 27500, awal: 0, akhir: 0 },
    { id: 317, name: '27 GB/14 H', price: 46000, modal: 44500, awal: 0, akhir: 0 },
    { id: 318, name: '2 GB/28 H', price: 27000, modal: 25500, awal: 0, akhir: 0 },
    { id: 319, name: '7 GB/28 H', price: 33000, modal: 31500, awal: 0, akhir: 0 },
    { id: 320, name: '16 GB/28 H', price: 47000, modal: 45500, awal: 0, akhir: 0 },
    { id: 321, name: '26 GB/28 H', price: 63000, modal: 61500, awal: 0, akhir: 0 }
  ],
  'INDOSAT': [
    { id: 601, name: '5 GB/1 H', price: 8000, modal: 6500, awal: 0, akhir: 0 },
    { id: 602, name: '6 GB/2 H', price: 11000, modal: 9500, awal: 0, akhir: 0 },
    { id: 603, name: '8 GB/3 H', price: 16000, modal: 14500, awal: 0, akhir: 0 },
    { id: 604, name: '5 GB/5 H', price: 15000, modal: 13500, awal: 0, akhir: 0 },
    { id: 605, name: '6 GB/5 H', price: 17000, modal: 15500, awal: 0, akhir: 0 },
    { id: 606, name: '9 GB/5 H', price: 20000, modal: 18500, awal: 0, akhir: 0 },
    { id: 607, name: '13 GB/7 H', price: 25000, modal: 23500, awal: 0, akhir: 0 },
    { id: 608, name: '22 GB/7 H', price: 32000, modal: 30500, awal: 0, akhir: 0 },
    { id: 609, name: '7 GB/14 H', price: 24000, modal: 22500, awal: 0, akhir: 0 },
    { id: 610, name: '5 GB/30 H', price: 27000, modal: 25500, awal: 0, akhir: 0 },
    { id: 611, name: '7 GB/28 H', price: 35000, modal: 33500, awal: 0, akhir: 0 },
    { id: 612, name: '10 GB/28 H', price: 40000, modal: 38500, awal: 0, akhir: 0 },
    { id: 613, name: '16 GB/28 H', price: 50000, modal: 48500, awal: 0, akhir: 0 },
    { id: 614, name: '24 GB/28 H', price: 62000, modal: 60500, awal: 0, akhir: 0 },
    { id: 615, name: '30 GB/28 H', price: 70000, modal: 68500, awal: 0, akhir: 0 }
  ],
  'SMARTFREN': [
    { id: 501, name: '2 GB/3 H', price: 10000, modal: 8500, awal: 0, akhir: 0 },
    { id: 502, name: '4 GB/3 H', price: 11000, modal: 9500, awal: 0, akhir: 0 },
    { id: 503, name: '3 GB/5 H', price: 15000, modal: 13500, awal: 0, akhir: 0 },
    { id: 504, name: '6 GB/7 H', price: 17000, modal: 15500, awal: 0, akhir: 0 },
    { id: 505, name: '10 GB/6 H', price: 22000, modal: 20500, awal: 0, akhir: 0 },
    { id: 506, name: '4 GB/14 H', price: 22000, modal: 20500, awal: 0, akhir: 0 },
    { id: 507, name: '7 GB/28 H', price: 35000, modal: 33500, awal: 0, akhir: 0 },
    { id: 508, name: '10 GB/28 H', price: 44000, modal: 42500, awal: 0, akhir: 0 },
    { id: 509, name: 'Unli 2 GB/7 H', price: 28000, modal: 26500, awal: 0, akhir: 0 },
    { id: 510, name: 'Unli 1 GB/28 H', price: 72000, modal: 70500, awal: 0, akhir: 0 },
    { id: 511, name: 'Unli 2 GB/28 H', price: 95000, modal: 93500, awal: 0, akhir: 0 }
  ],
  'TELKOMSEL': [
    { id: 201, name: '4 GB/1 H', price: 8000, modal: 6500, awal: 0, akhir: 0 },
    { id: 202, name: '6 GB/2 H', price: 12000, modal: 10500, awal: 0, akhir: 0 },
    { id: 203, name: '5 GB/3 H', price: 15000, modal: 13500, awal: 0, akhir: 0 },
    { id: 204, name: '4 GB/5 H', price: 15000, modal: 13500, awal: 0, akhir: 0 },
    { id: 205, name: '9 GB/5 H', price: 25000, modal: 23500, awal: 0, akhir: 0 },
    { id: 206, name: '9 GB/7 H', price: 31000, modal: 29500, awal: 0, akhir: 0 },
    { id: 207, name: '10 GB/30 H', price: 45000, modal: 43500, awal: 0, akhir: 0 },
    { id: 208, name: '18 GB/30 H', price: 55000, modal: 53500, awal: 0, akhir: 0 }
  ],
  'TRI': [
    { id: 101, name: '6 GB/1 H', price: 8000, modal: 6500, awal: 0, akhir: 0 },
    { id: 102, name: '7 GB/2 H', price: 11000, modal: 9500, awal: 0, akhir: 0 },
    { id: 103, name: '8 GB/3 H', price: 14000, modal: 12500, awal: 0, akhir: 0 },
    { id: 104, name: '10 GB/3 H', price: 16000, modal: 14500, awal: 0, akhir: 0 },
    { id: 105, name: '10 GB/5 H', price: 20000, modal: 18500, awal: 0, akhir: 0 },
    { id: 106, name: '12 GB/5 H', price: 22000, modal: 20500, awal: 0, akhir: 0 },
    { id: 107, name: '15 GB/7 H', price: 25000, modal: 23500, awal: 0, akhir: 0 },
    { id: 108, name: '8 GB/14 H', price: 25000, modal: 23500, awal: 0, akhir: 0 },
    { id: 109, name: '7 GB/28 H', price: 34000, modal: 32500, awal: 0, akhir: 0 },
    { id: 110, name: '10 GB/28 H', price: 40000, modal: 38500, awal: 0, akhir: 0 },
    { id: 111, name: '16 GB/28 H', price: 50000, modal: 48500, awal: 0, akhir: 0 }
  ],
  'XL': [
    { id: 401, name: '3 GB/1 H', price: 8000, modal: 6500, awal: 0, akhir: 0 },
    { id: 402, name: '6 GB/2 H', price: 12000, modal: 10500, awal: 0, akhir: 0 },
    { id: 403, name: '3 GB/3 H', price: 12000, modal: 10500, awal: 0, akhir: 0 },
    { id: 404, name: '7 GB/3 H', price: 16000, modal: 14500, awal: 0, akhir: 0 },
    { id: 405, name: '2 GB/5 H', price: 13000, modal: 11500, awal: 0, akhir: 0 },
    { id: 406, name: '5 GB/5 H', price: 17000, modal: 15500, awal: 0, akhir: 0 },
    { id: 407, name: '15 GB/5 H', price: 27000, modal: 25500, awal: 0, akhir: 0 },
    { id: 408, name: '4 GB/7 H', price: 16000, modal: 14500, awal: 0, akhir: 0 },
    { id: 409, name: '7 GB/7 H', price: 21000, modal: 19500, awal: 0, akhir: 0 },
    { id: 410, name: '12 GB/7 H', price: 26000, modal: 24500, awal: 0, akhir: 0 },
    { id: 411, name: '20 GB/7 H', price: 32000, modal: 30500, awal: 0, akhir: 0 },
    { id: 412, name: '4 GB/14 H', price: 23000, modal: 21500, awal: 0, akhir: 0 },
    { id: 413, name: '7 GB/28 H', price: 34000, modal: 32500, awal: 0, akhir: 0 },
    { id: 414, name: '16 GB/28 H', price: 48000, modal: 46500, awal: 0, akhir: 0 },
    { id: 415, name: '23 GB/28 H', price: 63000, modal: 61500, awal: 0, akhir: 0 },
    { id: 416, name: '31 GB/28 H', price: 68000, modal: 66500, awal: 0, akhir: 0 }
  ]
}

const LaporanView: React.FC<LaporanViewProps> = (props) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' })
  const fullDate = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const clockStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const [showShareMenu, setShowShareMenu] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);

  // Hitung ulang total berdasarkan transaksi yang difilter agar laporan akurat sesuai tanggal terpilih
  const sum = (txs: Transaction[]) => txs.reduce((s, t) => s + t.nominal, 0)
  const sumAdmin = (txs: Transaction[]) => txs.reduce((s, t) => s + t.adminFee, 0)
  
  const currentIsiBank = sum(props.transactions.filter(t => t.kategori === 'Isi Saldo Bank'))
  const currentPenjualanDigital = sum(props.transactions.filter(t => ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori) && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]')))
  const currentSaldoBank = currentIsiBank - sum(props.transactions.filter(t => ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori)))
  
  const currentTotalAksesoris = sum(props.transactions.filter(t => t.kategori === 'Aksesoris' && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]')))
  const currentTotalTarik = sum(props.transactions.filter(t => t.kategori === 'Tarik Tunai' && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]')))
  
  // Kas Lain Nya Calculations
  const txsAdminDalam = props.transactions.filter(t => (t.keterangan || '').includes('[ADMIN_DALAM]'))
  const totalAdminDalam = sumAdmin(txsAdminDalam)

  const txsNonTunai = props.transactions.filter(t => (t.keterangan || '').includes('[NON_TUNAI]'))
  const totalNonTunai = txsNonTunai.reduce((s, t) => s + t.nominal + t.adminFee, 0)

  const txsKhusus = props.transactions.filter(t => (t.keterangan || '').includes('[KHUSUS]'))
  const totalKhusus = txsKhusus.reduce((s, t) => s + t.nominal + t.adminFee, 0)

  // Admin fee (exclude Admin Dalam and transactions from LAIN tab)
  const currentTotalAdmin = sumAdmin(props.transactions.filter(t => !(t.keterangan || '').includes('[ADMIN_DALAM]') && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]')))
  const currentTotalSaldoKas = props.kasModal + currentPenjualanDigital + currentTotalAksesoris + currentTotalAdmin - currentTotalTarik

  const [syncTrigger, setSyncTrigger] = useState(0)
  useEffect(() => {
    const handleSync = () => setSyncTrigger(prev => prev + 1)
    window.addEventListener('alphaSyncUpdate', handleSync)
    return () => window.removeEventListener('alphaSyncUpdate', handleSync)
  }, [])

  const { totalQtyLaku, totalUangKeseluruhan, totalUangQris } = useMemo(() => {
    if (!props.activeStoreId) {
      return { totalQtyLaku: 0, totalUangKeseluruhan: 0, totalUangQris: 0 }
    }
    const savedV = localStorage.getItem(`alphaPro_${props.activeStoreId}_stok_voucher_${props.filterTanggal}`)
    const dataVoucher = savedV ? JSON.parse(savedV) : initialDataVoucher

    const savedQ = localStorage.getItem(`alphaPro_${props.activeStoreId}_stok_qris_${props.filterTanggal}`)
    const dataQris = savedQ ? JSON.parse(savedQ) : []

    let qty = 0
    let uang = 0
    let qris = 0
    
    Object.values(dataVoucher).forEach((items: any) => {
      items.forEach((item: any) => {
        const laku = Math.max(0, item.awal - item.akhir)
        qty += laku
        uang += laku * item.price
      });
    });
    
    dataQris.forEach((item: any) => {
      qris += item.harga * item.qty
    });
    
    return { 
      totalQtyLaku: qty, 
      totalUangKeseluruhan: uang, 
      totalUangQris: qris
    }
  }, [props.activeStoreId, props.filterTanggal, syncTrigger])

  const handleShare = async (type: 'download-pdf' | 'share-pdf' | 'share-excel' | 'share-wa-text') => {
    setShowShareMenu(false);
    setIsSharing(true);
    try {
      if (type === 'download-pdf' || type === 'share-pdf') {
        const jsPDF = (await import('jspdf')).default;
        
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Define margins and pointer
        let y = 10;
        
        // 1. Header (Deep Blue / Navy card)
        pdf.setFillColor(5, 28, 95);
        pdf.rect(10, y, 190, 36, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text((props.storeName || 'ALFAZA CELL').toUpperCase(), 15, y + 9);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(200, 210, 255);
        pdf.text(props.storeSubtext || 'Pembukuan Agen brilink & Konter', 15, y + 14);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`Kasir: ${props.kasirName || '-'} (${props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'})`, 15, y + 23);
        
        if (props.filterKasir && props.filterKasir !== 'Semua') {
          const kasirObj = props.kasirList[props.filterKasir];
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(200, 210, 255);
          pdf.text(`Pantau Kasir: ${kasirObj ? kasirObj.name : props.filterKasir}`, 15, y + 28);
        }
        
        // Date on Right of Header
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(200, 210, 255);
        pdf.text('Laporan Tanggal:', 195, y + 9, { align: 'right' });
        
        pdf.setFontSize(12);
        pdf.setTextColor(255, 220, 100);
        pdf.text(props.filterTanggal, 195, y + 15, { align: 'right' });
        
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7.5);
        pdf.setTextColor(200, 210, 255);
        pdf.text(`Waktu Cetak: ${new Date().toLocaleString('id-ID')}`, 195, y + 30, { align: 'right' });
        
        y += 42;
        
        // 2. Summary Boxes (Bank & Laci)
        // Box 1: Saldo Bank
        pdf.setFillColor(235, 245, 255);
        pdf.rect(10, y, 92, 20, 'F');
        pdf.setDrawColor(200, 225, 255);
        pdf.rect(10, y, 92, 20, 'D');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(30, 80, 150);
        pdf.text('SALDO BANK', 15, y + 6);
        pdf.setFontSize(12.5);
        pdf.setTextColor(5, 28, 95);
        pdf.text(formatRupiah(currentSaldoBank), 15, y + 14);
        
        // Box 2: Saldo Laci Kasir
        pdf.setFillColor(230, 250, 240);
        pdf.rect(108, y, 92, 20, 'F');
        pdf.setDrawColor(180, 240, 200);
        pdf.rect(108, y, 92, 20, 'D');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(20, 120, 80);
        pdf.text('SALDO LACI KASIR', 113, y + 6);
        pdf.setFontSize(12.5);
        pdf.setTextColor(10, 90, 50);
        pdf.text(formatRupiah(currentTotalSaldoKas), 113, y + 14);
        
        y += 25;
        
        // 2b. Voucher Summary Row in PDF
        pdf.setFillColor(250, 250, 250);
        pdf.rect(10, y, 190, 12, 'F');
        pdf.setDrawColor(230, 230, 235);
        pdf.rect(10, y, 190, 12, 'D');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 100);
        pdf.text('REKAP VOUCHER:', 15, y + 8);
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Laku: ${totalQtyLaku} pcs`, 50, y + 8);
        pdf.text(`Tunai: ${formatRupiah(totalUangKeseluruhan - totalUangQris)}`, 100, y + 8);
        pdf.text(`QRIS: ${formatRupiah(totalUangQris)}`, 150, y + 8);
        
        y += 18;
        
        // 3. Table: Rekap per Kategori
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(5, 28, 95);
        pdf.text('REKAP PER KATEGORI', 10, y);
        y += 3.5;
        
        pdf.setFillColor(240, 244, 248);
        pdf.rect(10, y, 190, 7, 'F');
        pdf.setDrawColor(210, 215, 220);
        pdf.line(10, y, 200, y);
        pdf.line(10, y + 7, 200, y + 7);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(60, 60, 60);
        pdf.text('Kategori', 13, y + 4.5);
        pdf.text('Qty', 90, y + 4.5, { align: 'center' });
        pdf.text('Nominal', 140, y + 4.5, { align: 'right' });
        pdf.text('Laba / Admin', 195, y + 4.5, { align: 'right' });
        
        y += 7;
        
        const categories = ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris', 'Transaksi Khusus'];
        let rowCount = 0;
        categories.forEach(cat => {
          let filtered = [];
          if (cat === 'Transaksi Khusus') {
            filtered = props.transactions.filter(t => (t.keterangan || '').includes('[KHUSUS]'));
          } else {
            filtered = props.transactions.filter(t => 
              t.kategori === cat && 
              !(t.keterangan || '').includes('[KHUSUS]')
            );
          }
          
          if (filtered.length > 0) {
            const qty = filtered.length;
            const nom = filtered.reduce((s,t) => s + t.nominal, 0);
            const laba = filtered.reduce((s,t) => s + t.adminFee, 0);
            
            if (rowCount % 2 === 1) {
              pdf.setFillColor(249, 250, 251);
              pdf.rect(10, y, 190, 6, 'F');
            }
            
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(40, 40, 40);
            pdf.text(cat, 13, y + 4.2);
            
            pdf.setFont('helvetica', 'bold');
            pdf.text(String(qty), 90, y + 4.2, { align: 'center' });
            pdf.text(formatRupiah(nom), 140, y + 4.2, { align: 'right' });
            
            pdf.setTextColor(16, 185, 129); // green
            pdf.text(formatRupiah(laba), 195, y + 4.2, { align: 'right' });
            
            pdf.setDrawColor(240, 242, 245);
            pdf.line(10, y + 6, 200, y + 6);
            
            y += 6;
            rowCount++;
          }
        });
        
        y += 6;
        
        // 4. Details Section (Two Columns)
        const col1X = 10;
        const col2X = 108;
        const startY = y;
        
        // Col 1: Kas Masuk & Kas Keluar
        let col1Y = startY;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(16, 185, 129);
        pdf.text('KAS MASUK', col1X, col1Y);
        col1Y += 3.5;
        
        const drawPDFDetailRow = (cx: number, cy: number, label: string, value: number, isMinus = false) => {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(cx, cy, 92, 6, 'F');
          pdf.setDrawColor(240, 242, 245);
          pdf.rect(cx, cy, 92, 6, 'D');
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(60, 60, 60);
          pdf.text(label, cx + 3, cy + 4.2);
          
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(20, 20, 20);
          pdf.text(`${isMinus ? '-' : ''}${formatRupiah(value)}`, cx + 89, cy + 4.2, { align: 'right' });
          return cy + 6.5;
        };
        
        col1Y = drawPDFDetailRow(col1X, col1Y, 'Modal Tunai Kasir', props.kasModal);
        col1Y = drawPDFDetailRow(col1X, col1Y, 'Penjualan Digital', currentPenjualanDigital);
        col1Y = drawPDFDetailRow(col1X, col1Y, 'Penjualan Aksesoris', currentTotalAksesoris);
        col1Y = drawPDFDetailRow(col1X, col1Y, 'Total Admin Fee', currentTotalAdmin);
        
        col1Y += 2;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(225, 29, 72);
        pdf.text('KAS KELUAR', col1X, col1Y);
        col1Y += 3.5;
        col1Y = drawPDFDetailRow(col1X, col1Y, 'Tarik Tunai Nasabah', currentTotalTarik, true);
        
        // Total Saldo Laci Kasir Banner (under col1)
        col1Y += 2;
        pdf.setFillColor(5, 28, 95);
        pdf.rect(col1X, col1Y, 92, 9, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(200, 210, 255);
        pdf.text('TOTAL SALDO LACI KASIR', col1X + 3, col1Y + 5.8);
        pdf.setFontSize(9.5);
        pdf.setTextColor(74, 222, 128);
        pdf.text(formatRupiah(currentTotalSaldoKas), col1X + 89, col1Y + 5.8, { align: 'right' });
        col1Y += 9;
        
        // Col 2: Kas Lainnya
        let col2Y = startY;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(124, 58, 237);
        pdf.text('KAS LAINNYA', col2X, col2Y);
        col2Y += 3.5;
        
        col2Y = drawPDFDetailRow(col2X, col2Y, 'Admin Dalam/Non Tunai', totalAdminDalam);
        col2Y = drawPDFDetailRow(col2X, col2Y, 'Transaksi Non Tunai', totalNonTunai);
        col2Y = drawPDFDetailRow(col2X, col2Y, 'Transaksi Khusus', totalKhusus);
        
        col2Y += 2;
        pdf.setFillColor(124, 58, 237);
        pdf.rect(col2X, col2Y, 92, 9, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(240, 230, 255);
        pdf.text('TOTAL KAS LAINNYA', col2X + 3, col2Y + 5.8);
        pdf.setFontSize(9.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(formatRupiah(totalAdminDalam + totalNonTunai + totalKhusus), col2X + 89, col2Y + 5.8, { align: 'right' });
        col2Y += 9;
        
        y = Math.max(col1Y, col2Y) + 6;
        
        // 5. Jurnal Penyesuaian Saldo Section
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(5, 28, 95);
        pdf.text('JURNAL PENYESUAIAN SALDO', 10, y);
        y += 3.5;
        
        pdf.setFillColor(250, 251, 252);
        pdf.rect(10, y, 190, 38, 'F');
        pdf.setDrawColor(210, 215, 220);
        pdf.rect(10, y, 190, 38, 'D');
        
        let itemY = y + 1.5;
        const drawPDFJurnalRow = (label: string, subtitle: string, val: number, isMinus = false) => {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(40, 40, 40);
          pdf.text(label, 14, itemY + 3.2);
          
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(7);
          pdf.setTextColor(120, 120, 120);
          pdf.text(subtitle, 14, itemY + 6.8);
          
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8.5);
          pdf.setTextColor(20, 20, 20);
          pdf.text(`${isMinus ? '-' : ''}${formatRupiah(val)}`, 196, itemY + 5, { align: 'right' });
          
          pdf.setDrawColor(240, 242, 245);
          pdf.line(12, itemY + 8.5, 198, itemY + 8.5);
          itemY += 9;
        };
        
        drawPDFJurnalRow('1. Modal Saldo Bank (Isi)', 'Total pengisian/setoran saldo hari ini', currentIsiBank);
        drawPDFJurnalRow('2. Penjualan Digital', 'Saldo Bank yang sudah terpakai', currentPenjualanDigital, true);
        drawPDFJurnalRow('3. Sisa Saldo (Buku)', 'Uang seharusnya di bank', currentSaldoBank);
        drawPDFJurnalRow('4. Saldo Real App (HP)', "Input menu 'Isi Saldo'", props.saldoReal);
        
        // Status box under Jurnal - Centered and narrower to prevent cut-off issues
        const selisih = props.saldoReal - currentSaldoBank;
        let statusText = '';
        let statusDesc = '';
        let statusVal = '';
        let r = 0, g = 0, b = 0;
        
        if (selisih === 0) {
          statusText = 'STATUS: KLOP';
          statusDesc = 'Sisa saldo di HP cocok dengan catatan buku';
          statusVal = '✓ MATCH';
          r = 16; g = 185; b = 129; // Emerald green
        } else if (selisih > 0) {
          statusText = 'STATUS: SURPLUS';
          statusDesc = 'Saldo di HP lebih besar dari catatan';
          statusVal = `+${formatRupiah(selisih)}`;
          r = 37; g = 99; b = 235; // Blue
        } else {
          statusText = 'STATUS: SELISIH';
          statusDesc = 'Saldo di HP lebih kecil (Uang kurang)';
          statusVal = formatRupiah(selisih);
          r = 225; g = 29; b = 72; // Rose/Red
        }
        
        const boxWidth = 150;
        const boxHeight = 15;
        const boxX = (210 - boxWidth) / 2; // 30mm margin on left and right
        const boxY = y + 38;
        
        pdf.setFillColor(r, g, b);
        pdf.rect(boxX, boxY, boxWidth, boxHeight, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(`${statusText} (${statusVal})`, 105, boxY + 5.5, { align: 'center' });
        
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7.5);
        pdf.setTextColor(240, 240, 240);
        pdf.text(statusDesc, 105, boxY + 10.5, { align: 'center' });
        
        // Footer at bottom of A4
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7.5);
        pdf.setTextColor(140, 140, 140);
        pdf.text('Dokumen ini dibuat otomatis oleh Aplikasi ALFAZA CELL dan sah sebagai rekapitulasi keuangan.', 105, 285, { align: 'center' });
        
        const fileName = `Laporan_Alfaza_${props.filterTanggal}.pdf`;
        
        if (type === 'download-pdf') {
          pdf.save(fileName);
        } else {
          try {
            const { Share } = await import('@capacitor/share');
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const pdfBase64 = pdf.output('datauristring').split(',')[1];
            
            const result = await Filesystem.writeFile({
              path: fileName,
              data: pdfBase64,
              directory: Directory.Cache
            });
            await Share.share({
              title: 'Laporan Alfaza Cell',
              text: `Laporan keuangan tanggal ${props.filterTanggal}`,
              files: [result.uri],
              dialogTitle: 'Bagikan Laporan PDF'
            });
          } catch (e) {
            console.error('Share failed, fallback to download', e);
            pdf.save(fileName);
          }
        }
      } else if (type === 'share-wa-text') {
        const lines = [
          `*LAPORAN KEUANGAN HARIAN*`,
          `*${(props.storeName || 'ALFAZA CELL').toUpperCase()}*`,
          `_${props.storeSubtext || 'Pembukuan Agen brilink & Konter'}_`,
          `==================================`,
          `📅 *Tanggal:* ${props.filterTanggal}`,
          `👤 *Kasir:* ${props.kasirName || '-'} (${props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'})`,
          props.filterKasir && props.filterKasir !== 'Semua' ? `👁️ *Mode Pantau:* ${props.kasirList[props.filterKasir]?.name || props.filterKasir}` : '',
          `==================================`,
          `💵 *Saldo Laci Kasir:* *${formatRupiah(currentTotalSaldoKas)}*`,
          `🏦 *Saldo Bank:* *${formatRupiah(currentSaldoBank)}*`,
          `==================================`,
          `🎟️ *REKAP PENJUALAN VOUCHER*`,
          `• Laku: ${totalQtyLaku} pcs`,
          `• Tunai: ${formatRupiah(totalUangKeseluruhan - totalUangQris)}`,
          `• QRIS: ${formatRupiah(totalUangQris)}`,
          `==================================`,
          `📊 *REKAP PER KATEGORI*`
        ].filter(Boolean);

        const categories = ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris', 'Transaksi Khusus'];
        categories.forEach(cat => {
          let filtered = [];
          if (cat === 'Transaksi Khusus') {
            filtered = props.transactions.filter(t => (t.keterangan || '').includes('[KHUSUS]'));
          } else {
            filtered = props.transactions.filter(t => 
              t.kategori === cat && 
              !(t.keterangan || '').includes('[KHUSUS]')
            );
          }
          if (filtered.length > 0) {
            const qty = filtered.length;
            const nom = filtered.reduce((s,t) => s + t.nominal, 0);
            const laba = filtered.reduce((s,t) => s + t.adminFee, 0);
            lines.push(`• *${cat}* (${qty} Qty)\n  Nominal: ${formatRupiah(nom)}\n  Laba: ${formatRupiah(laba)}`);
          }
        });

        lines.push(`==================================`);
        lines.push(`📥 *KAS MASUK*`);
        lines.push(`• Modal Tunai Kasir: ${formatRupiah(props.kasModal)}`);
        lines.push(`• Penjualan Digital: ${formatRupiah(currentPenjualanDigital)}`);
        lines.push(`• Penjualan Aksesoris: ${formatRupiah(currentTotalAksesoris)}`);
        lines.push(`• Total Admin Fee: ${formatRupiah(currentTotalAdmin)}`);
        
        lines.push(`==================================`);
        lines.push(`📤 *KAS KELUAR*`);
        lines.push(`• Tarik Tunai Nasabah: -${formatRupiah(currentTotalTarik)}`);
        
        lines.push(`==================================`);
        lines.push(`💼 *KAS LAINNYA*`);
        lines.push(`• Admin Dalam: ${formatRupiah(totalAdminDalam)}`);
        lines.push(`• Transaksi Non Tunai: ${formatRupiah(totalNonTunai)}`);
        lines.push(`• Transaksi Khusus: ${formatRupiah(totalKhusus)}`);
        lines.push(`*Total Kas Lainnya:* ${formatRupiah(totalAdminDalam + totalNonTunai + totalKhusus)}`);
        
        lines.push(`==================================`);
        lines.push(`⚖️ *JURNAL PENYESUAIAN SALDO*`);
        lines.push(`• 1. Modal Saldo Bank (Isi): ${formatRupiah(currentIsiBank)}`);
        lines.push(`• 2. Penjualan Digital: -${formatRupiah(currentPenjualanDigital)}`);
        lines.push(`• 3. Sisa Saldo (Buku): ${formatRupiah(currentSaldoBank)}`);
        lines.push(`• 4. Saldo Real HP: ${formatRupiah(props.saldoReal)}`);
        
        const selisih = props.saldoReal - currentSaldoBank;
        let statusStr = '';
        if (selisih === 0) statusStr = '✅ KLOP (✓ MATCH)';
        else if (selisih > 0) statusStr = `🔵 SURPLUS (+${formatRupiah(selisih)})`;
        else statusStr = `🔴 SELISIH (${formatRupiah(selisih)})`;
        
        lines.push(`👉 *STATUS:* *${statusStr}*`);
        lines.push(`==================================`);
        lines.push(`_Dicetak via Aplikasi ALFAZA CELL_`);

        const text = lines.join('\n');

        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { Share } = await import('@capacitor/share');
          await Share.share({
            title: 'Laporan Keuangan',
            text: text,
            dialogTitle: 'Bagikan Laporan WA'
          });
        } else {
          if (navigator.share) {
            await navigator.share({
              title: 'Laporan Keuangan',
              text: text
            });
          } else {
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
          }
        }
      } else if (type === 'share-excel') {
        let csvContent = "Kategori,Jumlah Transaksi,Nominal,Laba/Admin\n";
        const categories = ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris', 'Transaksi Khusus'];
        
        categories.forEach(cat => {
          let filtered = [];
          if (cat === 'Transaksi Khusus') {
            filtered = props.transactions.filter(t => (t.keterangan || '').includes('[KHUSUS]'));
          } else {
            filtered = props.transactions.filter(t => t.kategori === cat && !(t.keterangan || '').includes('[KHUSUS]'));
          }
          if (filtered.length > 0) {
            const qty = filtered.length;
            const nom = filtered.reduce((s,t) => s + t.nominal, 0);
            const laba = filtered.reduce((s,t) => s + t.adminFee, 0);
            csvContent += `"${cat}",${qty},${nom},${laba}\n`;
          }
        });
        
        csvContent += `\nRingkasan Kas\n`;
        csvContent += `"Modal Tunai Kasir",${props.kasModal}\n`;
        csvContent += `"Penjualan Digital",${currentPenjualanDigital}\n`;
        csvContent += `"Penjualan Aksesoris",${currentTotalAksesoris}\n`;
        csvContent += `"Total Admin Fee",${currentTotalAdmin}\n`;
        csvContent += `"Tarik Tunai Nasabah",-${currentTotalTarik}\n`;
        csvContent += `"Total KAS LAINNYA",${totalAdminDalam + totalNonTunai + totalKhusus}\n`;
        csvContent += `"TOTAL SALDO LACI KASIR",${currentTotalSaldoKas}\n`;
        csvContent += `\nRekap Penjualan Voucher\n`;
        csvContent += `"Voucher Laku (Qty)",${totalQtyLaku}\n`;
        csvContent += `"Voucher Tunai",${totalUangKeseluruhan - totalUangQris}\n`;
        csvContent += `"Voucher QRIS",${totalUangQris}\n`;
        
        const fileName = `Laporan_Alfaza_${props.filterTanggal}.csv`;
        try {
          const { Share } = await import('@capacitor/share');
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          
          const result = await Filesystem.writeFile({
            path: fileName,
            data: btoa(unescape(encodeURIComponent(csvContent))),
            directory: Directory.Cache
          });
          await Share.share({
            title: 'Laporan Alfaza Cell',
            text: `Data Laporan Excel (CSV) tanggal ${props.filterTanggal}`,
            files: [result.uri],
            dialogTitle: 'Bagikan Laporan Excel'
          });
        } catch (e) {
          console.error('Share failed, fallback to download', e);
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
        }
      }
    } catch (e) {
      console.error("Error generating share file:", e);
      alert("Terjadi kesalahan saat memproses file bagikan.");
    } finally {
      setIsSharing(false);
    }
  };

  if (props.isPc) {
    if (!props.active) return null;
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 p-6 overflow-y-auto hide-scrollbar">
        {/* TOP BAR & TOOLBAR */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Rekapitulasi Laporan</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">Arus kas, laba, & penyesuaian</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Tanggal Laporan */}
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Tanggal Laporan</span>
              <input 
                type="date"
                value={props.filterTanggal}
                onChange={(e) => props.setFilterTanggal(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Pantau Kasir (Owner Only) */}
            {props.kasirRole === 'owner' && props.setFilterKasir && (
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Pantau Kasir</span>
                <select 
                  value={props.filterKasir || 'Semua'}
                  onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 cursor-pointer"
                >
                  <option value="Semua">Semua Kasir</option>
                  {Object.entries(props.kasirList).map(([id, acc]) => (
                    <option key={id} value={id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons Share */}
            <div className="relative">
              <button 
                onClick={() => setShowShareMenu(!showShareMenu)}
                disabled={isSharing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-500/10"
              >
                <span>Bagikan</span>
                {isSharing ? <i className="fa-solid fa-circle-notch fa-spin text-[10px]"></i> : <i className="fa-solid fa-share-nodes text-[10px]"></i>}
              </button>

              {showShareMenu && (
                <div className="absolute right-0 top-12 w-[180px] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button onClick={() => handleShare('download-pdf')} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 border-b border-gray-50 dark:border-slate-700 transition-colors">
                    <i className="fa-solid fa-download text-emerald-500 w-4 text-center text-sm"></i> Download PDF
                  </button>
                  <button onClick={() => handleShare('share-pdf')} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 border-b border-gray-50 dark:border-slate-700 transition-colors">
                    <i className="fa-solid fa-file-pdf text-red-500 w-4 text-center text-sm"></i> Share PDF
                  </button>
                  <button onClick={() => handleShare('share-wa-text')} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 border-b border-gray-50 dark:border-slate-700 transition-colors">
                    <i className="fa-brands fa-whatsapp text-green-500 w-4 text-center text-sm"></i> Share WA Teks
                  </button>
                  <button onClick={() => handleShare('share-excel')} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors">
                    <i className="fa-solid fa-file-excel text-green-600 w-4 text-center text-sm"></i> Share Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 1: STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Card 1: Saldo Bank */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] shadow-sm relative overflow-hidden text-white">
            <div className="absolute right-4 bottom-4 text-white/5 text-7xl font-bold"><i className="fa-solid fa-building-columns"></i></div>
            <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-building-columns text-blue-200"></i> Saldo Bank
            </p>
            <p className="text-2xl font-black mt-3 drop-shadow-sm">{formatRupiah(currentSaldoBank)}</p>
            <p className="text-[9px] text-blue-200 font-medium mt-1 uppercase tracking-wider">Saldo buku tersisa di bank</p>
          </div>

          {/* Card 2: Saldo Laci Kasir */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[2rem] shadow-sm relative overflow-hidden text-white">
            <div className="absolute right-4 bottom-4 text-white/5 text-7xl font-bold"><i className="fa-solid fa-cash-register"></i></div>
            <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-cash-register text-emerald-200"></i> Saldo Laci Kasir
            </p>
            <p className="text-2xl font-black mt-3 drop-shadow-sm">{formatRupiah(currentTotalSaldoKas)}</p>
            <p className="text-[9px] text-emerald-200 font-medium mt-1 uppercase tracking-wider">Uang tunai fisik dalam laci</p>
          </div>

          {/* Card 3: Modal Awal Kasir */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 rounded-[2rem] shadow-sm relative overflow-hidden text-white">
            <div className="absolute right-4 bottom-4 text-white/5 text-7xl font-bold"><i className="fa-solid fa-vault"></i></div>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-vault text-slate-400"></i> Modal Awal Kasir
            </p>
            <p className="text-2xl font-black mt-3 drop-shadow-sm">{formatRupiah(props.kasModal)}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-1 uppercase tracking-wider">Modal laci saat buka toko</p>
          </div>
        </div>

        {/* VOUCHER SALES SUMMARY FOR PC */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-ticket text-sm"></i>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Voucher Terjual (LAKU)</p>
                <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{totalQtyLaku} pcs</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-money-bill-wave text-sm"></i>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Pembayaran Tunai</p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatRupiah(totalUangKeseluruhan - totalUangQris)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-qrcode text-sm"></i>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Pembayaran QRIS</p>
                <p className="text-lg font-black text-sky-600 dark:text-sky-400 mt-0.5">{formatRupiah(totalUangQris)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: GRID TABLE & ADJUSTMENT JOURNAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
          {/* Rekap per Kategori Table */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-xs text-slate-800 dark:text-slate-200 tracking-widest uppercase flex items-center gap-2">
                <i className="fa-solid fa-chart-pie text-indigo-500"></i> Rekap per Kategori
              </h3>
              <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded-lg uppercase tracking-wider">Otomatis</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="pb-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kategori</th>
                    <th className="pb-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center w-20">Qty</th>
                    <th className="pb-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nominal</th>
                    <th className="pb-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Laba / Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                  {['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris', 'Transaksi Khusus'].map(cat => {
                    let filtered = [];
                    if (cat === 'Transaksi Khusus') {
                      filtered = props.transactions.filter(t => (t.keterangan || '').includes('[KHUSUS]'));
                    } else {
                      filtered = props.transactions.filter(t => 
                        t.kategori === cat && 
                        !(t.keterangan || '').includes('[KHUSUS]')
                      );
                    }
                    
                    if (filtered.length === 0) return null;
                    
                    let catColor = "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
                    if (cat === 'Transfer Bank') catColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                    if (cat === 'DANA') catColor = "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
                    if (cat === 'FLIP') catColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
                    if (cat === 'Order Kuota') catColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
                    if (cat === 'Tarik Tunai') catColor = "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
                    if (cat === 'Aksesoris') catColor = "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400";
                    if (cat === 'Transaksi Khusus') catColor = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";

                    return (
                      <tr key={cat} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all">
                        <td className="py-2.5">
                          <span className={cn("px-2.5 py-0.5 rounded-xl text-xs font-black uppercase tracking-wider inline-block", catColor)}>
                            {cat}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-slate-500 text-center text-xs">{filtered.length}</td>
                        <td className="py-2.5 font-black text-slate-800 dark:text-slate-200 text-xs">{formatRupiah(filtered.reduce((s,t) => s+t.nominal, 0))}</td>
                        <td className="py-2.5 font-black text-emerald-600 dark:text-emerald-400 text-right text-xs">{formatRupiah(filtered.reduce((s,t) => s+t.adminFee, 0))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Jurnal Penyesuaian Saldo Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xs text-slate-800 dark:text-slate-200 tracking-widest uppercase flex items-center gap-2">
                <i className="fa-solid fa-scale-balanced text-indigo-500"></i> Jurnal Penyesuaian
              </h3>
              <span className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black uppercase">Otomatis</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-2.5 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                <div>
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-tight">1. Modal Saldo Bank (Isi)</p>
                  <p className="text-[9px] text-slate-400 font-medium italic -mt-0.5">Total setoran saldo bank hari ini</p>
                </div>
                <span className="font-black text-xs text-indigo-900 dark:text-white">
                  {formatRupiah(currentIsiBank)}
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-orange-50/30 dark:bg-orange-950/20 rounded-2xl border border-orange-100/50 dark:border-orange-900/30">
                <div>
                  <p className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-tight">2. Penjualan Digital</p>
                  <p className="text-[9px] text-slate-400 font-medium italic -mt-0.5">Saldo terpakai untuk transaksi digital</p>
                </div>
                <span className="font-black text-xs text-orange-600 dark:text-orange-400">-{formatRupiah(currentPenjualanDigital)}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border-2 border-blue-100 dark:border-blue-900/50">
                <div>
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-tight">3. Sisa Saldo (Buku)</p>
                  <p className="text-[9px] text-slate-400 font-medium italic -mt-0.5">Sisa saldo di bank teoritis</p>
                </div>
                <span className="font-black text-xs text-blue-900 dark:text-white">{formatRupiah(currentSaldoBank)}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
                <div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">4. Saldo Real App (HP)</p>
                  <p className="text-[9px] text-slate-400 font-medium italic -mt-0.5">Input manual sisa saldo di HP</p>
                </div>
                <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">{formatRupiah(props.saldoReal)}</span>
              </div>

              {(() => {
                const selisih = props.saldoReal - currentSaldoBank;
                
                return (
                  <div className={cn(
                    "mt-4 p-4 rounded-[1.8rem] flex justify-between items-center border-2",
                    selisih === 0 ? "bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-500/20" : 
                    selisih > 0 ? "bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/20" : "bg-rose-600 border-rose-400 text-white shadow-md shadow-rose-500/20"
                  )}>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 leading-none">
                        {selisih === 0 ? <><i className="fa-solid fa-circle-check"></i> KLOP</> : 
                         selisih > 0 ? <><i className="fa-solid fa-circle-exclamation"></i> SURPLUS</> : 
                         <><i className="fa-solid fa-circle-xmark"></i> SELISIH</>}
                      </p>
                      <p className="text-[9px] opacity-90 font-bold italic mt-1 leading-tight">
                        {selisih === 0 ? 'Catatan sisa saldo HP & buku pas' : 
                         selisih > 0 ? 'Saldo di HP surplus dibanding buku' : 'Uang di bank kurang dari catatan'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm block">{selisih === 0 ? '✓ MATCH' : formatRupiah(selisih)}</span>
                      {selisih !== 0 && <span className="text-[8px] font-black opacity-80 uppercase tracking-widest">Cek Kembali</span>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* SECTION 3: CASH FLOW DETAILS (3 COLUMNS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Kas Masuk */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 mb-3 tracking-widest uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-arrow-down-long"></i> KAS MASUK
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 px-3 py-2 rounded-xl border border-gray-100/50 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><i className="fa-solid fa-vault text-[10px]"></i> Modal Tunai</span>
                  <span className="font-black text-xs text-slate-800 dark:text-slate-200">{formatRupiah(props.kasModal)}</span>
                </div>
                <div className="flex justify-between items-center bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2"><i className="fa-solid fa-globe text-[10px]"></i> Digital</span>
                  <span className="font-black text-xs text-blue-600 dark:text-blue-400">{formatRupiah(currentPenjualanDigital)}</span>
                </div>
                <div className="flex justify-between items-center bg-fuchsia-50/50 dark:bg-fuchsia-950/20 px-3 py-2 rounded-xl border border-fuchsia-100/50 dark:border-fuchsia-900/30">
                  <span className="text-[11px] font-bold text-fuchsia-700 dark:text-fuchsia-400 flex items-center gap-2"><i className="fa-solid fa-headphones text-[10px]"></i> Aksesoris</span>
                  <span className="font-black text-xs text-fuchsia-600 dark:text-fuchsia-400">{formatRupiah(currentTotalAksesoris)}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2"><i className="fa-solid fa-piggy-bank text-[10px]"></i> Admin Fee</span>
                  <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">{formatRupiah(currentTotalAdmin)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase">Total Masuk</span>
              <span className="text-sm font-black text-emerald-600">{formatRupiah(props.kasModal + currentPenjualanDigital + currentTotalAksesoris + currentTotalAdmin)}</span>
            </div>
          </div>

          {/* Kas Keluar */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 mb-3 tracking-widest uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-arrow-up-long"></i> KAS KELUAR
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 rounded-xl border border-rose-100/50 dark:border-rose-900/30">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2"><i className="fa-solid fa-money-bill-transfer text-[10px]"></i> Tarik Tunai</span>
                  <span className="font-black text-xs text-rose-600 dark:text-rose-400">-{formatRupiah(currentTotalTarik)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase">Total Keluar</span>
              <span className="text-sm font-black text-rose-600">-{formatRupiah(currentTotalTarik)}</span>
            </div>
          </div>

          {/* Kas Lainnya */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between">
            <div>
              <div className="mb-3">
                <h4 className="text-xs font-black text-purple-600 dark:text-purple-400 tracking-widest uppercase flex items-center gap-1.5">
                  <i className="fa-solid fa-layer-group"></i> KAS LAINNYA
                </h4>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Pemasukan luar laci</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-purple-50/50 dark:bg-purple-950/20 px-3 py-2 rounded-xl border border-purple-100/50 dark:border-purple-900/30">
                  <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2"><i className="fa-solid fa-tags text-[10px]"></i> Admin Dalam</span>
                  <span className="font-black text-xs text-purple-600 dark:text-purple-400">{formatRupiah(totalAdminDalam)}</span>
                </div>
                <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-2 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2"><i className="fa-solid fa-credit-card text-[10px]"></i> Non Tunai</span>
                  <span className="font-black text-xs text-indigo-600 dark:text-indigo-400">{formatRupiah(totalNonTunai)}</span>
                </div>
                <div className="flex justify-between items-center bg-fuchsia-50/50 dark:bg-fuchsia-950/20 px-3 py-2 rounded-xl border border-fuchsia-100/50 dark:border-fuchsia-900/30">
                  <span className="text-[11px] font-bold text-fuchsia-700 dark:text-fuchsia-400 flex items-center gap-2"><i className="fa-solid fa-star text-[10px]"></i> Khusus</span>
                  <span className="font-black text-xs text-fuchsia-600 dark:text-fuchsia-400">{formatRupiah(totalKhusus)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase">Total Lainnya</span>
              <span className="text-sm font-black text-purple-600">{formatRupiah(totalAdminDalam + totalNonTunai + totalKhusus)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="laporan-content" className={cn("page-view hide-scrollbar bg-gray-50/50", props.active && "active")}>
      {/* HEADER TOKO IDENTIK BERANDA */}
      <div id="laporan-header-actions" className="relative theme-header" style={{ paddingBottom: '2.5rem' }}>
        <div className="px-4 pt-12 pb-2 flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {props.storePhoto ? (
                <img src={props.storePhoto} alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white/50 shadow-md" />
              ) : (
                <img src="/logo_icon.png" alt="Logo" className="w-12 h-12 object-contain" />
              )}
              <div>
                <h1 className="text-[13px] font-black text-white leading-tight uppercase tracking-widest">{props.storeName || 'ALFAZA CELL'}</h1>
                <p className="text-blue-200 text-[8px] font-bold uppercase tracking-tighter opacity-80">{props.storeSubtext || 'Pembukuan Agen brilink & Konter'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-white text-[10px] font-black">{props.kasirName}</span>
                  <span className={cn("text-[7px] px-1.5 py-0.5 rounded-full font-black", props.kasirRole === 'owner' ? "bg-amber-400 text-amber-900" : "bg-white/25 text-white")}>
                    {props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-blue-200 text-[8px] font-bold uppercase tracking-widest leading-none mb-1">{dayName}</p>
              <p className="text-white text-[10px] font-black tracking-tight leading-none mb-1">{fullDate}</p>
              <p className="text-blue-100 text-xs font-black tabular-nums tracking-widest">{clockStr}</p>
            </div>
          </div>

          <button onClick={() => props.setIsSidePanelOpen?.(true)} className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-90 hover:bg-white/20 transition-all">
            <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
          </button>
        </div>
      </div>

      <div className="px-1.5 pt-6 pb-5 bg-gradient-to-r from-indigo-700 to-blue-600 text-white rounded-b-[2rem] shadow-lg shadow-blue-500/20 mb-4" style={{ marginTop: '-2.5rem', position: 'relative', zIndex: 10 }}>
        <div className="flex justify-between items-center px-2 relative">
          <div>
            <h2 className="font-bold text-sm tracking-wide">Rekapitulasi</h2>
            <p className="text-emerald-100 text-[10px] opacity-90">Arus kas & laba</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              id="laporan-share-action"
              onClick={() => setShowShareMenu(!showShareMenu)}
              disabled={isSharing}
              className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md flex items-center gap-1.5 hover:bg-white/30 transition-all active:scale-95"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">Bagikan</span>
              {isSharing ? <i className="fa-solid fa-circle-notch fa-spin text-white text-[10px]"></i> : <i className="fa-solid fa-share-nodes text-white text-[10px]"></i>}
            </button>
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <i className="fa-solid fa-chart-line text-white text-xs"></i>
            </div>
          </div>

          {/* Share Menu Dropdown */}
          {showShareMenu && (
            <div className="absolute right-2 top-10 w-[180px] bg-white rounded-2xl shadow-xl border border-emerald-100/50 overflow-hidden z-50">
              <button onClick={() => handleShare('download-pdf')} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-700 hover:bg-emerald-50 flex items-center gap-3 border-b border-gray-50 transition-colors">
                <i className="fa-solid fa-download text-emerald-500 w-4 text-center text-sm"></i> Download PDF
              </button>
              <button onClick={() => handleShare('share-pdf')} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-700 hover:bg-emerald-50 flex items-center gap-3 border-b border-gray-50 transition-colors">
                <i className="fa-solid fa-file-pdf text-red-500 w-4 text-center text-sm"></i> Share PDF
              </button>
              <button onClick={() => handleShare('share-wa-text')} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-700 hover:bg-emerald-50 flex items-center gap-3 border-b border-gray-50 transition-colors">
                <i className="fa-brands fa-whatsapp text-green-500 w-4 text-center text-sm"></i> Share WA Teks
              </button>
              <button onClick={() => handleShare('share-excel')} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-700 hover:bg-emerald-50 flex items-center gap-3 transition-colors">
                <i className="fa-solid fa-file-excel text-green-600 w-4 text-center text-sm"></i> Share Excel
              </button>
            </div>
          )}
        </div>
        {props.kasirRole === 'owner' && props.setFilterKasir && (
          <div className="mt-3 bg-white/10 p-2 rounded-xl border border-white/20 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider"><i className="fa-solid fa-user-tie mr-1"></i> Mode Pantau Kasir:</span>
            <div className="relative">
              <select 
                value={props.filterKasir || 'Semua'}
                onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                className="bg-white bg-none text-emerald-700 text-[10px] font-black rounded-lg pl-2 pr-6 py-1 outline-none border-none appearance-none cursor-pointer"
              >
                <option value="Semua">Semua Kasir</option>
                {Object.entries(props.kasirList).map(([id, acc]) => (
                  <option key={id} value={id}>{acc.name}</option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[7px] text-emerald-400 pointer-events-none"></i>
            </div>
          </div>
        )}

        <div className="mt-3 bg-white/10 p-2 rounded-xl border border-white/20 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider flex-shrink-0"><i className="fa-solid fa-calendar-day mr-1"></i> Tanggal Laporan:</span>
          <div className="flex items-center gap-2 flex-grow">
            <input 
              type="date"
              value={props.filterTanggal}
              onChange={(e) => props.setFilterTanggal(e.target.value)}
              className="bg-white text-emerald-700 text-[10px] font-black rounded-lg px-2 py-1 outline-none border-none flex-grow"
            />
          </div>
        </div>
      </div>

      <div className="px-1.5 pb-5 space-y-2.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-3xl shadow-lg shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest flex items-center gap-1.5"><i className="fa-solid fa-building-columns"></i> Saldo Bank</p>
            <p className="text-base font-black text-white mt-2 drop-shadow-sm">{formatRupiah(currentSaldoBank)}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-4 rounded-3xl shadow-lg shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            <p className="text-[10px] text-emerald-50 font-bold uppercase tracking-widest flex items-center gap-1.5"><i className="fa-solid fa-cash-register"></i> Saldo Laci Kasir</p>
            <p className="text-base font-black text-white mt-2 drop-shadow-sm">{formatRupiah(currentTotalSaldoKas)}</p>
          </div>
        </div>
        
        <div className="bg-white border border-gray-100 rounded-[2rem] p-4 shadow-xl shadow-gray-200/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-xs text-gray-800 tracking-widest uppercase flex items-center gap-2">
              <i className="fa-solid fa-chart-pie text-indigo-500 text-sm"></i> Rekap per Kategori
            </h3>
            <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-tighter">Otomatis</span>
          </div>
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-50">
                  <th className="pb-2 font-black uppercase text-[10px] tracking-widest opacity-80">Kategori</th>
                  <th className="pb-2 font-black uppercase text-[10px] tracking-widest opacity-80 text-center">Qty</th>
                  <th className="pb-2 font-black uppercase text-[10px] tracking-widest opacity-80">Nominal</th>
                  <th className="pb-2 font-black uppercase text-[10px] tracking-widest opacity-80 text-right">Laba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris', 'Transaksi Khusus'].map(cat => {
                  let filtered = [];
                  if (cat === 'Transaksi Khusus') {
                    // Group ALL khusus transactions as requested
                    filtered = props.transactions.filter(t => (t.keterangan || '').includes('[KHUSUS]'));
                  } else {
                    // Filter by category and exclude anything already grouped in Khusus or Non Tunai
                    filtered = props.transactions.filter(t => 
                      t.kategori === cat && 
                      !(t.keterangan || '').includes('[KHUSUS]')
                    );
                  }
                  
                  if (filtered.length === 0) return null
                  
                  let catColor = "bg-gray-100 text-gray-600";
                  if (cat === 'Transfer Bank') catColor = "bg-blue-100 text-blue-700";
                  if (cat === 'DANA') catColor = "bg-cyan-100 text-cyan-700";
                  if (cat === 'FLIP') catColor = "bg-orange-100 text-orange-700";
                  if (cat === 'Order Kuota') catColor = "bg-emerald-100 text-emerald-700";
                  if (cat === 'Tarik Tunai') catColor = "bg-rose-100 text-rose-700";
                  if (cat === 'Aksesoris') catColor = "bg-fuchsia-100 text-fuchsia-700";
                  if (cat === 'Transaksi Khusus') catColor = "bg-purple-100 text-purple-700";

                  return (
                    <tr key={cat} className="group hover:bg-gray-50/80 transition-all">
                      <td className="py-1 pr-2">
                        <span className={cn("px-2 py-0.5 rounded-xl text-xs font-black whitespace-nowrap inline-block", catColor)}>
                          {cat}
                        </span>
                      </td>
                      <td className="py-1 font-bold text-gray-500 text-center text-xs">{filtered.length}</td>
                      <td className="py-1 font-black text-gray-800 text-xs">{formatRupiah(filtered.reduce((s,t) => s+t.nominal, 0))}</td>
                      <td className="py-1 font-black text-emerald-600 text-right text-xs">{formatRupiah(filtered.reduce((s,t) => s+t.adminFee, 0))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <h4 className="text-[13px] font-extrabold text-emerald-600 mb-1.5 tracking-widest uppercase flex items-center gap-1.5">
              <i className="fa-solid fa-arrow-down-long"></i> KAS MASUK
            </h4>
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-emerald-100 space-y-1">
              <div className="flex justify-between items-center bg-gray-50/50 px-3 py-1 rounded-xl border border-gray-100/50">
                <span className="text-[13px] font-bold text-gray-700 flex items-center gap-2"><i className="fa-solid fa-vault text-[12px]"></i> Modal Tunai Kasir</span>
                <span className="font-black text-[14px] text-gray-800">{formatRupiah(props.kasModal)}</span>
              </div>
              <div className="flex justify-between items-center bg-blue-50/50 px-3 py-1 rounded-xl border border-blue-100/50">
                <span className="text-[13px] font-bold text-blue-700 flex items-center gap-2"><i className="fa-solid fa-globe text-[12px]"></i> Penjualan Digital</span>
                <span className="font-black text-[14px] text-blue-600">{formatRupiah(currentPenjualanDigital)}</span>
              </div>
              <div className="flex justify-between items-center bg-fuchsia-50/50 px-3 py-1 rounded-xl border border-fuchsia-100/50">
                <span className="text-[13px] font-bold text-fuchsia-700 flex items-center gap-2"><i className="fa-solid fa-headphones text-[12px]"></i> Penjualan Aksesoris</span>
                <span className="font-black text-[14px] text-fuchsia-600">{formatRupiah(currentTotalAksesoris)}</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50/50 px-3 py-1 rounded-xl border border-emerald-100/50">
                <span className="text-[13px] font-bold text-emerald-700 flex items-center gap-2"><i className="fa-solid fa-piggy-bank text-[12px]"></i> Total Admin Fee</span>
                <span className="font-black text-[14px] text-emerald-600">{formatRupiah(currentTotalAdmin)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-extrabold text-rose-600 mb-1.5 tracking-widest uppercase flex items-center gap-1.5">
              <i className="fa-solid fa-arrow-up-long"></i> KAS KELUAR
            </h4>
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-rose-100 space-y-1">
              <div className="flex justify-between items-center bg-rose-50/50 px-3 py-1 rounded-xl border border-rose-100/50">
                <span className="text-[13px] font-bold text-rose-700 flex items-center gap-2"><i className="fa-solid fa-money-bill-transfer text-[12px]"></i> Tarik Tunai Nasabah</span>
                <span className="font-black text-[14px] text-rose-600">-{formatRupiah(currentTotalTarik)}</span>
              </div>
            </div>
          </div>

          <div className="pt-1 -mx-3">
            <div className="bg-[#051c5f] px-4 py-4 rounded-[1.8rem] flex justify-between items-center shadow-xl shadow-blue-900/20 border border-blue-800">
              <div className="border border-blue-700 bg-blue-900/30 rounded-xl px-3 py-1.5 flex flex-col">
                <span className="font-black text-[10px] text-blue-200 tracking-[0.2em] uppercase leading-[1.2]">Total Saldo</span>
                <span className="font-black text-[10px] text-blue-200 tracking-[0.2em] uppercase leading-[1.2]">Laci Kasir</span>
              </div>
              <span className="font-black text-2xl text-green-400 drop-shadow-[0_2px_10px_rgba(74,222,128,0.3)]">{formatRupiah(currentTotalSaldoKas)}</span>
            </div>
          </div>

          {/* Voucher Summary Columns */}
          <div className="relative mt-7 mb-3">
            <div className="absolute -top-2 left-0 w-full flex justify-center z-10">
              <h4 className="bg-gray-50 px-2 text-[11px] font-black text-gray-800 tracking-widest uppercase whitespace-nowrap">
                TOTAL PENJUALAN VOUCHER
              </h4>
            </div>
            <div className="bg-white border border-black rounded-[1.5rem] pt-5 pb-3 px-1 shadow-sm grid grid-cols-3 divide-x divide-gray-100">
              <div className="flex flex-col items-center justify-center px-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <i className="fa-solid fa-ticket text-[10px] text-blue-500"></i>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Laku</span>
                </div>
                <span className="text-[13px] font-black text-gray-800">{totalQtyLaku}</span>
              </div>

              <div className="flex flex-col items-center justify-center px-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <i className="fa-solid fa-money-bill-wave text-[10px] text-emerald-500"></i>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tunai</span>
                </div>
                <span className="text-[13px] font-black text-emerald-600 truncate w-full text-center">{formatRupiah(totalUangKeseluruhan - totalUangQris)}</span>
              </div>

              <div className="flex flex-col items-center justify-center px-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <i className="fa-solid fa-qrcode text-[10px] text-sky-500"></i>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">QRIS</span>
                </div>
                <span className="text-[13px] font-black text-sky-600 truncate w-full text-center">{formatRupiah(totalUangQris)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2">
              <h4 className="text-[13px] font-extrabold text-purple-600 tracking-widest uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-layer-group"></i> KAS LAIN NYA
              </h4>
              <p className="text-[10px] font-bold text-purple-400/80 italic ml-5 -mt-0.5">Pemasukan Tambahan</p>
            </div>
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-purple-100 space-y-1">
              <div className="flex justify-between items-center bg-purple-50/50 px-3 py-1 rounded-xl border border-purple-100/50">
                <span className="text-[13px] font-bold text-purple-700 flex items-center gap-2"><i className="fa-solid fa-tags text-[12px]"></i> Admin Dalam/Non Tunai</span>
                <span className="font-black text-[14px] text-purple-600">{formatRupiah(totalAdminDalam)}</span>
              </div>
              <div className="flex justify-between items-center bg-indigo-50/50 px-3 py-1 rounded-xl border border-indigo-100/50">
                <span className="text-[13px] font-bold text-indigo-700 flex items-center gap-2"><i className="fa-solid fa-credit-card text-[12px]"></i> Transaksi Non Tunai</span>
                <span className="font-black text-[14px] text-indigo-600">{formatRupiah(totalNonTunai)}</span>
              </div>
              <div className="flex justify-between items-center bg-fuchsia-50/50 px-3 py-1 rounded-xl border border-fuchsia-100/50">
                <span className="text-[13px] font-bold text-fuchsia-700 flex items-center gap-2"><i className="fa-solid fa-star text-[12px]"></i> Transaksi Khusus</span>
                <span className="font-black text-[14px] text-fuchsia-600">{formatRupiah(totalKhusus)}</span>
              </div>
              <div className="mt-2 pt-2 border-t-2 border-purple-100/50 flex justify-between items-center px-3 py-1.5 bg-purple-100/30 rounded-xl">
                <span className="text-[13px] font-black text-purple-800 flex items-center gap-2">TOTAL KAS LAIN NYA</span>
                <span className="font-black text-[15px] text-purple-700">{formatRupiah(totalAdminDalam + totalNonTunai + totalKhusus)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-indigo-100 rounded-[1.8rem] p-3.5 -mx-3 shadow-xl shadow-indigo-500/10">
            <div className="flex justify-between items-center mb-3 px-1">
              <h4 className="text-[13px] font-black text-indigo-800 tracking-widest uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-scale-balanced text-indigo-500"></i> JURNAL PENYESUAIAN SALDO
              </h4>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black uppercase">Otomatis</span>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center p-1.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                <div>
                  <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-tight">1. Modal Saldo Bank (Isi)</p>
                  <p className="text-[9px] text-indigo-400 font-medium italic -mt-0.5">Total pengisian/setoran saldo hari ini</p>
                </div>
                <span className="font-black text-[13px] text-indigo-900">
                  {formatRupiah(currentIsiBank)}
                </span>
              </div>

              <div className="flex justify-between items-center p-1.5 bg-orange-50/50 rounded-xl border border-orange-100/50">
                <div>
                  <p className="text-[11px] font-bold text-orange-700 uppercase tracking-tight">2. Penjualan Digital</p>
                  <p className="text-[9px] text-orange-400 font-medium italic -mt-0.5">Saldo Bank yang sudah terpakai</p>
                </div>
                <span className="font-black text-[13px] text-orange-900">-{formatRupiah(currentPenjualanDigital)}</span>
              </div>

              <div className="flex justify-between items-center p-1.5 bg-blue-50/80 rounded-xl border-2 border-blue-100">
                <div>
                  <p className="text-[11px] font-bold text-blue-700 uppercase tracking-tight">3. Sisa Saldo (Buku)</p>
                  <p className="text-[9px] text-blue-400 font-medium italic -mt-0.5">Uang seharusnya di bank</p>
                </div>
                <span className="font-black text-[13px] text-blue-900">{formatRupiah(currentSaldoBank)}</span>
              </div>

              <div className="flex justify-between items-center p-1.5 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                <div>
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-tight">4. Saldo Real App (HP)</p>
                  <p className="text-[9px] text-emerald-400 font-medium italic -mt-0.5 whitespace-nowrap">Input menu 'Isi Saldo'</p>
                </div>
                <span className="font-black text-[13px] text-emerald-900">{formatRupiah(props.saldoReal)}</span>
              </div>

              {(() => {
                const selisih = props.saldoReal - currentSaldoBank;
                
                return (
                  <div className={cn(
                    "mt-3 p-3.5 -mx-1.5 rounded-2xl flex justify-between items-center border-2",
                    selisih === 0 ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/30" : 
                    selisih > 0 ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30" : "bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-500/30"
                  )}>
                    <div>
                      <p className="text-[12px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        {selisih === 0 ? <><i className="fa-solid fa-circle-check"></i> STATUS: KLOP</> : 
                         selisih > 0 ? <><i className="fa-solid fa-circle-exclamation"></i> STATUS: SURPLUS</> : 
                         <><i className="fa-solid fa-circle-xmark"></i> STATUS: SELISIH</>}
                      </p>
                      <p className="text-[10px] opacity-90 font-bold italic mt-0.5">
                        {selisih === 0 ? 'Sisa saldo di HP cocok dengan catatan buku' : 
                         selisih > 0 ? 'Saldo di HP lebih besar dari catatan' : 'Saldo di HP lebih kecil (Uang kurang)'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-[16px] block">{selisih === 0 ? '✓ MATCH' : formatRupiah(selisih)}</span>
                      {selisih !== 0 && <span className="text-[9px] font-black opacity-80 uppercase tracking-widest">Periksa Kembali</span>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LaporanView
