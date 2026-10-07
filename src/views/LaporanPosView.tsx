import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface PosTransaction {
  id: string;
  timestamp: string;
  items: any[];
  subtotal: number;
  diskonTotal: number;
  grandTotal: number;
  metodeBayar: 'TUNAI' | 'QRIS';
  uangDiterima: number;
  kembalian: number;
  kasir: string;
}

interface LaporanPosViewProps {
  storeId: string;
  onBack: () => void;
}

export const LaporanPosView: React.FC<LaporanPosViewProps> = ({ storeId, onBack }) => {
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'hari_ini' | 'bulan_ini' | 'semua'>('hari_ini');
  
  // Date selection for custom filtering (optional, keeping it simple for now)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [storeId]);

  const fetchData = async () => {
    setIsLoading(true);
    // Fetch all for this store to allow client side filtering, 
    // or we can fetch based on date. For simplicity & speed on small scale, fetch all or last 1000.
    const { data, error } = await supabase
      .from('pos_transactions')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (!error && data) {
      setTransactions(data.map(r => ({
        id: r.id, timestamp: r.created_at, kasir: r.kasir,
        items: r.items, subtotal: r.subtotal, diskonTotal: r.diskon_total,
        grandTotal: r.grand_total, metodeBayar: r.metode_bayar,
        uangDiterima: r.uang_diterima, kembalian: r.kembalian
      })));
    } else {
       // fallback local
       try {
           const cached = localStorage.getItem('alphaPro_pos_transactions');
           if (cached) {
               setTransactions(JSON.parse(cached));
           }
       } catch(e) {}
    }
    setIsLoading(false);
  };

  const filteredTransactions = useMemo(() => {
    const today = new Date();
    // Offset local timezone
    const offset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today.getTime() - offset)).toISOString().slice(0, -1);
    const todayStr = localISOTime.split('T')[0];
    const monthStr = todayStr.substring(0, 7); // YYYY-MM

    return transactions.filter(trx => {
      // Assuming trx.timestamp is ISO string
      const trxDateStr = trx.timestamp.substring(0, 10);
      const trxMonthStr = trx.timestamp.substring(0, 7);

      if (filterType === 'hari_ini') return trxDateStr === selectedDate;
      if (filterType === 'bulan_ini') return trxMonthStr === monthStr;
      return true; // semua
    });
  }, [transactions, filterType, selectedDate]);

  // Kalkulasi KPI
  const { totalPendapatan, totalTransaksi, totalItem, totalTunai, totalQris } = useMemo(() => {
    let pendapatan = 0;
    let item = 0;
    let tunai = 0;
    let qris = 0;

    filteredTransactions.forEach(trx => {
      pendapatan += trx.grandTotal;
      item += trx.items.reduce((acc, curr) => acc + curr.qty, 0);
      if (trx.metodeBayar === 'TUNAI') tunai += trx.grandTotal;
      if (trx.metodeBayar === 'QRIS') qris += trx.grandTotal;
    });

    return {
      totalPendapatan: pendapatan,
      totalTransaksi: filteredTransactions.length,
      totalItem: item,
      totalTunai: tunai,
      totalQris: qris
    };
  }, [filteredTransactions]);

  // Kalkulasi Produk Terlaris
  const topProducts = useMemo(() => {
    const productMap: Record<string, { nama: string; qty: number; nominal: number }> = {};
    
    filteredTransactions.forEach(trx => {
      trx.items.forEach(item => {
        const pId = item.product.id;
        if (!productMap[pId]) {
          productMap[pId] = { nama: item.product.nama, qty: 0, nominal: 0 };
        }
        productMap[pId].qty += item.qty;
        productMap[pId].nominal += (item.product.harga * item.qty);
      });
    });

    return Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5); // Top 5
  }, [filteredTransactions]);

  const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#004A8B] to-[#0069BA] pt-6 pb-4 px-4 sticky top-0 z-50 shadow-md rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 text-white">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-lg font-black leading-tight">Laporan Penjualan</h1>
            <p className="text-[11px] text-blue-100 font-medium opacity-90">Pantau performa POS Kasir</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5 pb-20">
        
        {/* Filter Section */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button 
            onClick={() => { setFilterType('hari_ini'); setSelectedDate(new Date().toISOString().split('T')[0]); }} 
            className={cn("px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shadow-sm", filterType === 'hari_ini' ? "bg-[#0066FF] text-white" : "bg-white text-slate-600 border border-slate-200")}
          >
            Hari Ini
          </button>
          <button 
            onClick={() => setFilterType('bulan_ini')} 
            className={cn("px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shadow-sm", filterType === 'bulan_ini' ? "bg-[#0066FF] text-white" : "bg-white text-slate-600 border border-slate-200")}
          >
            Bulan Ini
          </button>
          <button 
            onClick={() => setFilterType('semua')} 
            className={cn("px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shadow-sm", filterType === 'semua' ? "bg-[#0066FF] text-white" : "bg-white text-slate-600 border border-slate-200")}
          >
            Semua Waktu
          </button>
        </div>

        {filterType === 'hari_ini' && (
          <div className="bg-white rounded-xl p-1 border border-slate-200 shadow-sm flex items-center px-3">
             <i className="fa-regular fa-calendar text-slate-400 mr-2 text-sm"></i>
             <input 
               type="date" 
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="w-full bg-transparent py-2 text-[13px] font-bold text-slate-700 outline-none"
             />
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <i className="fa-solid fa-spinner fa-spin text-[#0066FF] text-2xl"></i>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                  <i className="fa-solid fa-wallet text-emerald-500 text-sm"></i>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pendapatan Bersih</p>
                <p className="text-sm font-black text-slate-800 mt-0.5 truncate">{formatRp(totalPendapatan)}</p>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                  <i className="fa-solid fa-receipt text-blue-500 text-sm"></i>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Transaksi</p>
                <p className="text-sm font-black text-slate-800 mt-0.5"><span className="text-xl">{totalTransaksi}</span> Struk</p>
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
               <h3 className="text-[13px] font-black text-slate-800 mb-3 flex items-center gap-2">
                 <i className="fa-solid fa-chart-pie text-indigo-500"></i> Metode Pembayaran
               </h3>
               <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-600">Tunai</span>
                      <span className="text-slate-800">{formatRp(totalTunai)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: totalPendapatan ? `${(totalTunai / totalPendapatan) * 100}%` : '0%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-600">QRIS / Non-Tunai</span>
                      <span className="text-slate-800">{formatRp(totalQris)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-400 h-full rounded-full" style={{ width: totalPendapatan ? `${(totalQris / totalPendapatan) * 100}%` : '0%' }}></div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Produk Terlaris */}
            {topProducts.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <h3 className="text-[13px] font-black text-slate-800 mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-medal text-amber-500"></i> Produk Terlaris
                </h3>
                <div className="space-y-3">
                  {topProducts.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-800 truncate">{p.nama}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{p.qty} Terjual</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-black text-emerald-600">{formatRp(p.nominal)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Riwayat Transaksi Ringkas */}
            <div className="space-y-3">
               <h3 className="text-[13px] font-black text-slate-800 flex items-center gap-2">
                 <i className="fa-solid fa-list text-slate-400"></i> Daftar Transaksi
               </h3>
               {filteredTransactions.length === 0 ? (
                 <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-6 text-center">
                    <p className="text-[12px] font-bold text-slate-400">Belum ada transaksi di periode ini.</p>
                 </div>
               ) : (
                 <div className="space-y-2">
                   {filteredTransactions.map(trx => {
                     const d = new Date(trx.timestamp);
                     const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                     const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                     return (
                       <div key={trx.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex justify-between items-center gap-2">
                          <div className="flex gap-3 items-center min-w-0">
                             <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                                <i className={cn("fa-solid text-[11px]", trx.metodeBayar === 'QRIS' ? 'fa-qrcode text-blue-500' : 'fa-money-bill-wave text-emerald-500')}></i>
                             </div>
                             <div className="min-w-0">
                               <p className="text-[11px] font-black text-slate-800 truncate">{trx.id}</p>
                               <p className="text-[9px] font-bold text-slate-400">{dateStr}, {timeStr} • {trx.items.length} Item</p>
                             </div>
                          </div>
                          <div className="text-right shrink-0">
                             <p className="text-[12px] font-black text-slate-800">{formatRp(trx.grandTotal)}</p>
                             <p className="text-[9px] font-bold text-slate-500">{trx.kasir}</p>
                          </div>
                       </div>
                     )
                   })}
                 </div>
               )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LaporanPosView;
