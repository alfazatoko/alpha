import React, { useState, useEffect, useMemo } from "react";
import { CreditCard, Plus, Minus, Calendar } from "lucide-react";
import { formatRupiah, cn, getLocalISOString } from "../lib/utils";
import { supabase } from "../lib/supabase";

interface VoucherItem {
  id: number;
  name: string;
  price: number;
  modal: number;
  awal: number;
  akhir: number;
}

interface QrisItem {
  id: number;
  provider: string;
  nama: string;
  harga: number;
  qty: number;
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
};

const VoucherView: React.FC<{ active: boolean; setActiveView: (v: string) => void; showToast: (m: string) => void; onConfirm: (t: string, m: string, c: () => void) => void; isPc?: boolean; activeStoreId: string; kasirRole?: string }> = ({ active, setActiveView, showToast, onConfirm, isPc, activeStoreId, kasirRole }) => {
  const [selectedDate, setSelectedDate] = useState(getLocalISOString().split('T')[0]);

  const [dataVoucher, setDataVoucher] = useState<Record<string, VoucherItem[]>>(() => {
    const saved = localStorage.getItem(`alphaPro_${activeStoreId}_stok_voucher_${selectedDate}`);
    return saved ? JSON.parse(saved) : initialDataVoucher;
  });

  const [dataQris, setDataQris] = useState<QrisItem[]>(() => {
    const saved = localStorage.getItem(`alphaPro_${activeStoreId}_stok_qris_${selectedDate}`);
    return saved ? JSON.parse(saved) : [];
  });


  const [activeEditingCell, setActiveEditingCell] = useState<string | null>(null);
  const [selectedProviderTab, setSelectedProviderTab] = useState<string>('ALL');

  const [visibleCols, setVisibleCols] = useState({
    produk: true,
    awal: true,
    akhir: true,
    laku: true,
    modal: true,
    harga: true,
    total: true,
    qris: true
  });

  const toggleCol = (col: keyof typeof visibleCols) => {
    setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const visibleColCount = Object.keys(visibleCols).reduce((count, key) => {
    if (key === 'modal' && kasirRole !== 'owner') return count;
    return count + (visibleCols[key as keyof typeof visibleCols] ? 1 : 0);
  }, 0);

  useEffect(() => {
    const loadData = () => {
      if (activeStoreId && activeStoreId !== 'all') {
        const savedV = localStorage.getItem(`alphaPro_${activeStoreId}_stok_voucher_${selectedDate}`);
        setDataVoucher(savedV ? JSON.parse(savedV) : initialDataVoucher);

        const savedQ = localStorage.getItem(`alphaPro_${activeStoreId}_stok_qris_${selectedDate}`);
        setDataQris(savedQ ? JSON.parse(savedQ) : []);
      } else {
        setDataVoucher(initialDataVoucher);
        setDataQris([]);
      }
    };

    loadData();
    window.addEventListener('alphaSyncUpdate', loadData);
    return () => window.removeEventListener('alphaSyncUpdate', loadData);
  }, [selectedDate, activeStoreId]);

  useEffect(() => {
    if (activeStoreId && activeStoreId !== 'all') {
      localStorage.setItem(`alphaPro_${activeStoreId}_stok_voucher_${selectedDate}`, JSON.stringify(dataVoucher));
      localStorage.setItem(`alphaPro_${activeStoreId}_stok_qris_${selectedDate}`, JSON.stringify(dataQris));

      const syncToCloud = async () => {
        try {
          // Fetch existing voucher data to merge
          const { data } = await supabase.from('store_settings').select('voucher_data').eq('store_id', activeStoreId).maybeSingle();
          let existingData = data?.voucher_data || {};

          existingData[selectedDate] = {
            voucher: dataVoucher,
            qris: dataQris
          };

          await supabase.from('store_settings').upsert({
            store_id: activeStoreId,
            voucher_data: existingData,
            updated_at: new Date().toISOString()
          });
        } catch (e) {
          console.error("Gagal sync Voucher", e);
        }
      };

      const timer = setTimeout(syncToCloud, 1000);
      return () => clearTimeout(timer);
    }
  }, [dataVoucher, dataQris, selectedDate, activeStoreId]);

  const resetToDefault = () => {
    onConfirm("RESET STOK", "Reset semua stok ke pengaturan awal? Data hari ini akan hilang.", () => {
      setDataVoucher(initialDataVoucher);
      localStorage.removeItem(`alphaPro_${activeStoreId}_stok_voucher_${selectedDate}`);
      showToast("Stok berhasil direset");
    });
  };

  const handleEditItem = (provider: string, id: number, field: keyof VoucherItem, value: any) => {
    setDataVoucher(prev => {
      const newData = { ...prev };
      newData[provider] = newData[provider].map(item =>
        item.id === id ? { ...item, [field]: field === 'price' || field === 'modal' ? parseInt(value) || 0 : value } : item
      );
      return newData;
    });
  };

  const { totalQtyLaku, totalUangKeseluruhan, totalUangQris, totalLaba } = useMemo(() => {
    let qty = 0;
    let uang = 0;
    let qris = 0;
    let modal = 0;

    Object.values(dataVoucher).forEach(items => {
      items.forEach(item => {
        const laku = Math.max(0, item.awal - item.akhir);
        qty += laku;
        uang += laku * item.price;
        modal += laku * (item.modal || 0);
      });
    });

    dataQris.forEach(item => {
      qris += item.harga * item.qty;
    });

    return {
      totalQtyLaku: qty,
      totalUangKeseluruhan: uang,
      totalUangQris: qris,
      totalLaba: uang - modal
    };
  }, [dataVoucher, dataQris]);

  const [activeControl, setActiveControl] = useState<string | null>(null);

  const updateStok = (e: React.MouseEvent, provider: string, index: number, field: 'awal' | 'akhir', change: number) => {
    e.stopPropagation();
    setDataVoucher(prev => {
      const providerData = [...prev[provider]];
      const item = { ...providerData[index] };
      const val = item[field] + change;
      item[field] = val < 0 ? 0 : val;
      providerData[index] = item;
      return { ...prev, [provider]: providerData };
    });
  };

  const jualQris = (provider: string, idx: number) => {
    const item = dataVoucher[provider][idx];
    if (item.akhir > 0) {
      setDataVoucher(prev => {
        const providerData = [...prev[provider]];
        providerData[idx] = { ...providerData[idx], akhir: providerData[idx].akhir - 1 };
        return { ...prev, [provider]: providerData };
      });

      setDataQris(prev => {
        const existingIdx = prev.findIndex(q => q.nama === item.name && q.provider === provider);
        if (existingIdx >= 0) {
          const newData = [...prev];
          newData[existingIdx] = { ...newData[existingIdx], qty: newData[existingIdx].qty + 1 };
          return newData;
        } else {
          return [...prev, { id: Date.now(), provider, nama: item.name, harga: item.price, qty: 1 }];
        }
      });
    } else {
      showToast("Stok habis!");
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'TRI': return 'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/50';
      case 'TELKOMSEL': return 'bg-red-500 text-white border-red-600 dark:bg-red-600 dark:border-red-700';
      case 'AXIS': return 'bg-purple-600 text-white border-purple-700 dark:bg-purple-700 dark:border-purple-800';
      case 'XL': return 'bg-blue-800 text-white border-blue-900 dark:bg-blue-900 dark:border-blue-950';
      case 'SMARTFREN': return 'bg-pink-200 text-pink-900 border-pink-300 dark:bg-pink-950/20 dark:text-pink-300 dark:border-pink-900/50';
      case 'INDOSAT': return 'bg-yellow-300 text-yellow-900 border-yellow-400 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-900/50';
      default: return 'bg-gray-200 text-gray-800 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  if (!active) return null;

  if (activeStoreId === 'all') {
    const warningContent = (
      <div className="flex-grow h-full flex items-center justify-center p-6">
        <div className="p-6 text-center bg-amber-50 border border-amber-100 rounded-2xl max-w-md">
          <i className="fa-solid fa-store-slash text-amber-500 text-3xl mb-3"></i>
          <p className="text-xs font-black text-amber-800 uppercase tracking-widest">PILIH TOKO TERLEBIH DAHULU</p>
          <p className="text-[10px] text-amber-600/80 font-bold uppercase mt-1">Silakan pilih salah satu toko di Beranda untuk melihat data Voucher.</p>
        </div>
      </div>
    );
    if (isPc) {
      return (
        <div className={cn("flex-grow h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden", active ? "flex" : "hidden")}>
          {warningContent}
        </div>
      );
    }
    return (
      <div className="page-view active bg-gray-50 hide-scrollbar pb-24">
        <div className="px-4 pt-7 pb-4 border-b flex justify-center items-center bg-blue-800 text-white shadow-lg">
          <h2 className="font-black text-xs uppercase tracking-widest leading-none">STOK VOUCHER</h2>
        </div>
        {warningContent}
      </div>
    );
  }

  const providers = ['ALL', ...Object.keys(dataVoucher)];

  if (isPc) {
    return (
      <div className={cn("flex-grow h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden", active ? "flex" : "hidden")} onClick={() => { setActiveControl(null); }}>

        <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">Stok Voucher Fisik & Digital</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Pantau jumlah stock awal/akhir voucher serta pencatatan transaksi QRIS harian</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tanggal Pembukuan:</span>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <button className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-white px-4 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-2 shadow-sm uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-grow flex overflow-hidden p-8 gap-8">

          <div className="w-[360px] shrink-0 h-full flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-thin">

            <div className={cn("grid gap-3 shrink-0", kasirRole === 'owner' ? "grid-cols-4" : "grid-cols-3")}>
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm text-center">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider mb-1">Terjual</p>
                <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">{totalQtyLaku}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl p-4 border border-emerald-100 dark:border-emerald-900/30 shadow-sm text-center">
                <p className="text-[9px] text-emerald-500 dark:text-emerald-400 font-black uppercase tracking-wider mb-1">Uang Tunai</p>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 leading-tight truncate">{formatRupiah(totalUangKeseluruhan - totalUangQris)}</p>
              </div>
              <div className="bg-sky-50 dark:bg-sky-950/20 rounded-3xl p-4 border border-sky-100 dark:border-sky-900/30 shadow-sm text-center">
                <p className="text-[9px] text-sky-500 dark:text-sky-400 font-black uppercase tracking-wider mb-1">Via QRIS</p>
                <p className="text-xs font-black text-sky-600 dark:text-sky-400 leading-tight truncate">{formatRupiah(totalUangQris)}</p>
              </div>
              {kasirRole === 'owner' && (
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-3xl p-4 border border-amber-100 dark:border-amber-900/30 shadow-sm text-center">
                  <p className="text-[9px] text-amber-500 dark:text-amber-400 font-black uppercase tracking-wider mb-1">Total Laba</p>
                  <p className="text-xs font-black text-amber-600 dark:text-amber-400 leading-tight truncate">{formatRupiah(totalLaba)}</p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3 shrink-0">
              <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">Aksi Cepat</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={resetToDefault}
                  className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black py-3 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all uppercase tracking-wider"
                >
                  Reset Data
                </button>
                <button
                  onClick={() => setActiveEditingCell(activeEditingCell === 'master' ? null : 'master')}
                  className={cn(
                    "text-[10px] font-black py-3 rounded-2xl border transition-all uppercase tracking-wider",
                    activeEditingCell === 'master'
                      ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100 dark:shadow-none"
                      : "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-none"
                  )}
                  style={{ color: '#ffffff' }}
                >
                  {activeEditingCell === 'master' ? 'Batal Edit' : 'Edit Master'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex-grow flex flex-col min-h-[250px]">
              <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5 shrink-0">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Riwayat Penjualan QRIS</h4>
              </div>

              <div className="flex-grow overflow-y-auto scrollbar-thin p-6">
                {dataQris.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-center">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Belum ada transaksi QRIS</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {dataQris.map(item => (
                      <div key={item.id} className="py-3 flex justify-between items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{item.nama}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">{item.provider} • {item.qty} Qty</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-sky-600 dark:text-sky-400">{formatRupiah(item.harga * item.qty)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {dataQris.length > 0 && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 px-6 py-4 flex justify-between items-center border-t border-blue-100 dark:border-blue-900/30 shrink-0">
                  <span className="text-[10px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest">Total QRIS</span>
                  <span className="text-sm font-black text-blue-800 dark:text-blue-400">{formatRupiah(totalUangQris)}</span>
                </div>
              )}
            </div>

          </div>

          <div className="flex-grow h-full flex flex-col gap-6 overflow-hidden">

            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 shrink-0">
              {providers.map(prov => (
                <button
                  key={prov}
                  onClick={() => setSelectedProviderTab(prov)}
                  className={cn(
                    "px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all border shrink-0",
                    selectedProviderTab === prov
                      ? "bg-slate-800 border-slate-800 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-md"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50"
                  )}
                >
                  {prov}
                </button>
              ))}
            </div>

            <div className="flex-grow bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <div className="flex-grow overflow-y-auto scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      <th className="p-4 pl-6">Produk</th>
                      <th className="p-4 text-center">Stok Awal</th>
                      <th className="p-4 text-center">Stok Akhir</th>
                      <th className="p-4 text-center text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">Laku</th>
                      {kasirRole === 'owner' && <th className="p-4 text-right">Hrg Modal</th>}
                      <th className="p-4 text-right">Harga</th>
                      <th className="p-4 text-right text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">Total Nominal</th>
                      <th className="p-4 pr-6 text-center">QRIS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(dataVoucher)
                      .filter(p => selectedProviderTab === 'ALL' || selectedProviderTab === p)
                      .map(provider => (
                        <React.Fragment key={provider}>
                          {selectedProviderTab === 'ALL' && (
                            <tr className={cn(getProviderColor(provider), "text-[9px] font-black uppercase tracking-widest border-y border-slate-100 dark:border-slate-700/50")}>
                              <td colSpan={kasirRole === 'owner' ? 8 : 7} className="px-6 py-2">{provider}</td>
                            </tr>
                          )}
                          {dataVoucher[provider].map((item, idx) => {
                            const laku = Math.max(0, item.awal - item.akhir);
                            const totalNominal = laku * item.price;

                            return (
                              <tr key={item.id} className="border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                                <td className="p-3 pl-6">
                                  {activeEditingCell === 'master' ? (
                                    <input
                                      value={item.name}
                                      onChange={(e) => handleEditItem(provider, item.id, 'name', e.target.value)}
                                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                    />
                                  ) : (
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">{item.name}</span>
                                  )}
                                </td>

                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center min-h-[32px]">
                                    {activeControl === `${provider}-${item.id}-awal` ? (
                                      <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 p-1 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-inner animate-in zoom-in duration-150">
                                        <button
                                          onClick={(e) => updateStok(e, provider, idx, 'awal', -1)}
                                          className="w-6 h-6 rounded-lg bg-white border border-blue-200 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm active:scale-90 transition-all"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <div
                                          onClick={(e) => { e.stopPropagation(); setActiveControl(null); }}
                                          className="text-xs font-black text-blue-800 dark:text-blue-400 w-4 text-center cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded"
                                        >
                                          {item.awal}
                                        </div>
                                        <button
                                          onClick={(e) => updateStok(e, provider, idx, 'awal', 1)}
                                          className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm active:scale-90 transition-all"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={(e) => { e.stopPropagation(); setActiveControl(`${provider}-${item.id}-awal`); }}
                                        className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700"
                                      >
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.awal}</span>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center min-h-[32px]">
                                    {activeControl === `${provider}-${item.id}-akhir` ? (
                                      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 p-1 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-inner animate-in zoom-in duration-150">
                                        <button
                                          onClick={(e) => updateStok(e, provider, idx, 'akhir', -1)}
                                          className="w-6 h-6 rounded-lg bg-white border border-emerald-200 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm active:scale-90 transition-all"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <div
                                          onClick={(e) => { e.stopPropagation(); setActiveControl(null); }}
                                          className="text-xs font-black text-emerald-800 dark:text-emerald-400 w-4 text-center cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded"
                                        >
                                          {item.akhir}
                                        </div>
                                        <button
                                          onClick={(e) => updateStok(e, provider, idx, 'akhir', 1)}
                                          className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm active:scale-90 transition-all"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={(e) => { e.stopPropagation(); setActiveControl(`${provider}-${item.id}-akhir`); }}
                                        className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700"
                                      >
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.akhir}</span>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="p-3 text-center bg-emerald-50/10 dark:bg-emerald-950/5">
                                  <span className={cn("text-xs font-black", laku > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300 dark:text-slate-600")}>{laku}</span>
                                </td>

                                {kasirRole === 'owner' && (
                                  <td className="p-3 text-right">
                                    {activeEditingCell === 'master' ? (
                                      <input
                                        type="number"
                                        value={item.modal || 0}
                                        onChange={(e) => handleEditItem(provider, item.id, 'modal', e.target.value)}
                                        className="w-[80px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none text-right"
                                      />
                                    ) : (
                                      <span className="text-xs font-black text-amber-600 dark:text-amber-500">{formatRupiah(item.modal || 0)}</span>
                                    )}
                                  </td>
                                )}

                                <td className="p-3 text-right">
                                  {activeEditingCell === 'master' ? (
                                    <input
                                      type="number"
                                      value={item.price}
                                      onChange={(e) => handleEditItem(provider, item.id, 'price', e.target.value)}
                                      className="w-[80px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none text-right"
                                    />
                                  ) : (
                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400">{formatRupiah(item.price)}</span>
                                  )}
                                </td>

                                <td className="p-3 text-right bg-emerald-50/10 dark:bg-emerald-950/5">
                                  <span className={cn("text-xs font-black tracking-wide", totalNominal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300 dark:text-slate-600")}>
                                    {totalNominal > 0 ? formatRupiah(totalNominal) : '-'}
                                  </span>
                                </td>

                                <td className="p-3 pr-6 text-center">
                                  <button
                                    onClick={() => jualQris(provider, idx)}
                                    className="bg-sky-500 hover:bg-sky-600 text-white text-[9px] font-black px-3 py-1.5 rounded-xl shadow-sm active:scale-95 transition-all"
                                  >
                                    QRIS
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>
    );
  }

  if (!active) return null;

  return (
    <div className="page-view active bg-gray-50 hide-scrollbar pb-24" onClick={() => { setActiveControl(null); }}>
      <div className="px-4 pt-7 pb-4 border-b flex justify-between items-center bg-blue-800 text-white shadow-lg">
        <button
          onClick={() => setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="text-center">
          <h2 className="font-black text-xs uppercase tracking-widest leading-none">STOK VOUCHER</h2>
          <p className="text-[8px] text-white/50 mt-1 font-bold">ALFAZA CELL</p>
        </div>
        <button
          onClick={() => setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white p-5 shadow-lg flex justify-between items-center rounded-b-[2rem] mb-4">
        <div>
          <h2 className="text-sm font-black tracking-tight leading-none uppercase">Data Voucher</h2>
          <p className="text-[9px] text-blue-100 font-medium mt-1">{selectedDate}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
          <i className="fa-solid fa-ticket text-white text-xs"></i>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={resetToDefault}
          className="flex-1 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold py-2 rounded-lg border border-white/20 transition-all"
        >
          RESET DATA
        </button>
        <button
          onClick={() => setActiveEditingCell(activeEditingCell === 'master' ? null : 'master')}
          className={cn(
            "flex-1 text-[10px] font-bold py-2 rounded-lg border transition-all",
            activeEditingCell === 'master' ? "bg-yellow-400 text-yellow-900 border-yellow-500" : "bg-white/20 text-white border-white/20 hover:bg-white/30"
          )}
        >
          {activeEditingCell === 'master' ? 'SELESAI EDIT' : 'MODE EDIT'}
        </button>
      </div>

      <div className="bg-white/10 p-3 rounded-xl border border-white/10 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[9px] text-blue-200 font-bold uppercase tracking-widest">TANGGAL PEMBUKUAN</span>
          <span className="text-xs font-bold">{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <button className="bg-white text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
            <Calendar className="w-3 h-3" /> UBAH
          </button>
        </div>
      </div>


      <div className="p-4">
        <div className={cn("grid gap-2 mb-4", kasirRole === 'owner' ? "grid-cols-4" : "grid-cols-3")}>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-[9px] text-gray-400 font-bold uppercase mb-1">LAKU</div>
            <div className="text-base font-black text-gray-800">{totalQtyLaku}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-[9px] text-gray-400 font-bold uppercase mb-1">TUNAI</div>
            <div className="text-xs font-black text-emerald-600 truncate">{formatRupiah(totalUangKeseluruhan - totalUangQris)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-[9px] text-gray-400 font-bold uppercase mb-1">QRIS</div>
            <div className="text-xs font-black text-sky-600 truncate">{formatRupiah(totalUangQris)}</div>
          </div>
          {kasirRole === 'owner' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center shadow-sm">
              <div className="text-[9px] text-amber-500 font-bold uppercase mb-1">LABA</div>
              <div className="text-xs font-black text-amber-600 truncate">{formatRupiah(totalLaba)}</div>
            </div>
          )}
        </div>

        {/* Tab Navigasi Provider */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-4 shrink-0">
          {providers.map(prov => (
            <button
              key={prov}
              onClick={() => setSelectedProviderTab(prov)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border shrink-0",
                selectedProviderTab === prov
                  ? "bg-slate-800 border-slate-800 text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              {prov}
            </button>
          ))}
        </div>

        <div className="mb-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] text-gray-500 font-bold mb-3 uppercase tracking-wider text-center">Klik bulat di bawah ini untuk sembunyikan/munculkan kolom</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {Object.keys(visibleCols).map(col => {
              if (col === 'modal' && kasirRole !== 'owner') return null;
              const isVisible = visibleCols[col as keyof typeof visibleCols];
              return (
                <button
                  key={col}
                  onClick={() => toggleCol(col as keyof typeof visibleCols)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm transition-all border",
                    isVisible
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-100 text-gray-400 border-gray-200"
                  )}
                >
                  {col}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-bold text-gray-500 uppercase">
                  {visibleCols.produk && <th className="p-2">Produk</th>}
                  {visibleCols.awal && <th className="p-1 text-center">Awal</th>}
                  {visibleCols.akhir && <th className="p-1 text-center">Akhir</th>}
                  {visibleCols.laku && <th className="p-1 text-center text-emerald-600 bg-emerald-50/50">Laku</th>}
                  {kasirRole === 'owner' && visibleCols.modal && <th className="p-1 text-right">Modal</th>}
                  {visibleCols.harga && <th className="p-1 text-right">Harga</th>}
                  {visibleCols.total && <th className="p-1 text-right text-emerald-600 bg-emerald-50/50">Total</th>}
                  {visibleCols.qris && <th className="p-2 text-center">QRIS</th>}
                </tr>
              </thead>
              <tbody>
                {Object.keys(dataVoucher)
                  .filter(p => selectedProviderTab === 'ALL' || selectedProviderTab === p)
                  .map(provider => (
                    <React.Fragment key={provider}>
                      {selectedProviderTab === 'ALL' && (
                        <tr className={cn(getProviderColor(provider), "text-[9px] font-bold uppercase tracking-wider")}>
                          <td colSpan={visibleColCount} className="px-2 py-1.5">{provider}</td>
                        </tr>
                      )}
                      {dataVoucher[provider].map((item, idx) => {
                        const laku = Math.max(0, item.awal - item.akhir);
                        const totalNominal = laku * item.price;

                        return (
                          <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                            {visibleCols.produk && (
                              <td className="p-2">
                                {activeEditingCell === 'master' ? (
                                  <input
                                    value={item.name}
                                    onChange={(e) => handleEditItem(provider, item.id, 'name', e.target.value)}
                                    className="form-input-modern w-[70px] h-6 px-1 text-[10px]"
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-gray-800 block leading-tight whitespace-nowrap">{item.name}</span>
                                )}
                              </td>
                            )}
                            {visibleCols.awal && (
                              <td className="p-1 text-center">
                                <div className="flex items-center justify-center min-h-[28px]">
                                  {activeControl === `${provider}-${item.id}-awal` ? (
                                    <div className="flex items-center gap-1 bg-blue-50 p-1 rounded-lg border border-blue-100 shadow-sm animate-in zoom-in duration-200">
                                      <button
                                        onClick={(e) => updateStok(e, provider, idx, 'awal', -1)}
                                        className="w-6 h-6 rounded bg-white border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm active:scale-90 transition-all"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <div
                                        onClick={(e) => { e.stopPropagation(); setActiveControl(null); }}
                                        className="text-xs font-black text-blue-800 w-4 text-center cursor-pointer hover:bg-blue-100 rounded"
                                      >
                                        {item.awal}
                                      </div>
                                      <button
                                        onClick={(e) => updateStok(e, provider, idx, 'awal', 1)}
                                        className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white shadow-sm active:scale-90 transition-all"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={(e) => { e.stopPropagation(); setActiveControl(`${provider}-${item.id}-awal`); }}
                                      className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors bg-gray-50 border border-gray-100"
                                    >
                                      <span className="text-[10px] font-bold text-gray-800">{item.awal}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                            {visibleCols.akhir && (
                              <td className="p-1 text-center">
                                <div className="flex items-center justify-center min-h-[28px]">
                                  {activeControl === `${provider}-${item.id}-akhir` ? (
                                    <div className="flex items-center gap-1 bg-emerald-50 p-1 rounded-lg border border-emerald-100 shadow-sm animate-in zoom-in duration-200">
                                      <button
                                        onClick={(e) => updateStok(e, provider, idx, 'akhir', -1)}
                                        className="w-6 h-6 rounded bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm active:scale-90 transition-all"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <div
                                        onClick={(e) => { e.stopPropagation(); setActiveControl(null); }}
                                        className="text-xs font-black text-emerald-800 w-4 text-center cursor-pointer hover:bg-emerald-100 rounded"
                                      >
                                        {item.akhir}
                                      </div>
                                      <button
                                        onClick={(e) => updateStok(e, provider, idx, 'akhir', 1)}
                                        className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center text-white shadow-sm active:scale-90 transition-all"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={(e) => { e.stopPropagation(); setActiveControl(`${provider}-${item.id}-akhir`); }}
                                      className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors bg-gray-50 border border-gray-100"
                                    >
                                      <span className="text-[10px] font-bold text-gray-800">{item.akhir}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                            {visibleCols.laku && (
                              <td className="p-1 text-center bg-emerald-50/20">
                                <span className={cn("text-[10px] font-black", laku > 0 ? "text-emerald-600" : "text-gray-300")}>{laku}</span>
                              </td>
                            )}
                            {kasirRole === 'owner' && visibleCols.modal && (
                              <td className="p-1 text-right">
                                {activeEditingCell === 'master' ? (
                                  <input
                                    type="number"
                                    value={item.modal || 0}
                                    onChange={(e) => handleEditItem(provider, item.id, 'modal', e.target.value)}
                                    className="form-input-modern w-[45px] h-6 px-1 text-[10px] text-right"
                                  />
                                ) : (
                                  <span className="text-[9px] font-black text-amber-600">{((item.modal || 0) / 1000)}k</span>
                                )}
                              </td>
                            )}
                            {visibleCols.harga && (
                              <td className="p-1 text-right">
                                {activeEditingCell === 'master' ? (
                                  <input
                                    type="number"
                                    value={item.price}
                                    onChange={(e) => handleEditItem(provider, item.id, 'price', e.target.value)}
                                    className="form-input-modern w-[45px] h-6 px-1 text-[10px] text-right"
                                  />
                                ) : (
                                  <span className="text-[9px] font-black text-gray-500">{(item.price / 1000)}k</span>
                                )}
                              </td>
                            )}
                            {visibleCols.total && (
                              <td className="p-1 text-right bg-emerald-50/20">
                                <span className={cn("text-[9px] font-black tracking-tight", totalNominal > 0 ? "text-emerald-600" : "text-gray-300")}>
                                  {totalNominal > 0 ? formatRupiah(totalNominal).replace('Rp\u00a0', '').replace('Rp ', '') : '-'}
                                </span>
                              </td>
                            )}
                            {visibleCols.qris && (
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => jualQris(provider, idx)}
                                  className="bg-sky-500 text-white text-[8px] font-black px-1.5 py-1 rounded shadow-sm active:scale-95 transition-all"
                                >
                                  QRIS
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 p-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs text-gray-700 uppercase tracking-widest">RIWAYAT QRIS</h3>
          </div>
          <div className="p-0">
            {dataQris.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic text-xs font-medium">Belum ada penjualan QRIS hari ini</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {dataQris.map(item => (
                  <div key={item.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{item.nama}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">{item.provider} • {item.qty} Qty</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-sky-600">{formatRupiah(item.harga * item.qty)}</p>
                    </div>
                  </div>
                ))}
                <div className="bg-blue-50/30 p-4 flex justify-between items-center border-t-2 border-blue-100/50">
                  <span className="text-xs font-black text-blue-800 uppercase tracking-widest">TOTAL QRIS</span>
                  <span className="text-sm font-black text-blue-800">{formatRupiah(totalUangQris)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherView;
