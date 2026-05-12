import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, CreditCard, Plus, Minus, Calendar } from "lucide-react";
import { formatRupiah, cn } from "../lib/utils";

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

const VoucherView: React.FC<{ active: boolean; setActiveView: (v: string) => void }> = ({ active, setActiveView }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dataVoucher, setDataVoucher] = useState<Record<string, VoucherItem[]>>(JSON.parse(localStorage.getItem(`stok_voucher_${selectedDate}`) || JSON.stringify(initialDataVoucher)));
  const [dataQris, setDataQris] = useState<QrisItem[]>(JSON.parse(localStorage.getItem(`stok_qris_${selectedDate}`) || "[]"));
  
  
  const [activeEditingCell, setActiveEditingCell] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(`stok_voucher_${selectedDate}`, JSON.stringify(dataVoucher));
    localStorage.setItem(`stok_qris_${selectedDate}`, JSON.stringify(dataQris));
  }, [dataVoucher, dataQris, selectedDate]);

  const resetToDefault = () => {
    if (confirm("Reset semua stok ke pengaturan awal? Data hari ini akan hilang.")) {
      setDataVoucher(initialDataVoucher);
      localStorage.removeItem(`stok_voucher_${selectedDate}`);
    }
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

  const { totalQtyLaku, totalUangKeseluruhan, totalUangQris } = useMemo(() => {
    let qty = 0;
    let uang = 0;
    let qris = 0;
    
    Object.values(dataVoucher).forEach(items => {
      items.forEach(item => {
        const laku = Math.max(0, item.awal - item.akhir);
        qty += laku;
        uang += laku * item.price;
      });
    });
    
    dataQris.forEach(item => {
      qris += item.harga * item.qty;
    });
    
    return { 
      totalQtyLaku: qty, 
      totalUangKeseluruhan: uang, 
      totalUangQris: qris 
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
      alert("Stok habis!");
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'TRI': return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'TELKOMSEL': return 'bg-red-500 text-white border-red-600';
      case 'AXIS': return 'bg-purple-600 text-white border-purple-700';
      case 'XL': return 'bg-blue-800 text-white border-blue-900';
      case 'SMARTFREN': return 'bg-pink-200 text-pink-900 border-pink-300';
      case 'INDOSAT': return 'bg-yellow-300 text-yellow-900 border-yellow-400';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  if (!active) return null;

  return (
    <div className="page-view active bg-gray-50 hide-scrollbar pb-24" onClick={() => setActiveEditingCell(null)}>
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white p-5 shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setActiveView('view-beranda')} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-black tracking-tight leading-none">STOK VOUCHER</h2>
            <p className="text-[10px] text-blue-100 font-medium mt-1">{selectedDate}</p>
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
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
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
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-bold text-gray-500 uppercase">
                  <th className="p-3">Produk</th>
                  <th className="p-3 text-center">Awal</th>
                  <th className="p-3 text-center">Akhir</th>
                  <th className="p-3 text-right">Jual</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(dataVoucher).map(provider => (
                  <React.Fragment key={provider}>
                    <tr className={cn(getProviderColor(provider), "text-[10px] font-bold uppercase tracking-wider")}>
                      <td colSpan={5} className="px-3 py-2">{provider}</td>
                    </tr>
                    {dataVoucher[provider].map((item, idx) => {
                      return (
                        <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="p-3">
                            {activeEditingCell === 'master' ? (
                                <input 
                                  value={item.name} 
                                  onChange={(e) => handleEditItem(provider, item.id, 'name', e.target.value)}
                                  className="form-input-modern w-full h-7 px-1.5"
                                />
                            ) : (
                              <span className="text-xs font-bold text-gray-800 block leading-tight">{item.name}</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center min-h-[32px]">
                              {activeControl === `${provider}-${item.id}-awal` ? (
                                <div className="flex items-center gap-2 bg-blue-50 p-1 rounded-lg border border-blue-100 shadow-sm animate-in zoom-in duration-200">
                                  <button 
                                    onClick={(e) => updateStok(e, provider, idx, 'awal', -1)} 
                                    className="w-7 h-7 rounded-md bg-white border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm active:scale-90 transition-all"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-xs font-black text-blue-800 w-4">{item.awal}</span>
                                  <button 
                                    onClick={(e) => updateStok(e, provider, idx, 'awal', 1)} 
                                    className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-sm active:scale-90 transition-all"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  onClick={(e) => { e.stopPropagation(); setActiveControl(`${provider}-${item.id}-awal`); }}
                                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  <span className="text-xs font-bold text-gray-800">{item.awal}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center min-h-[32px]">
                              {activeControl === `${provider}-${item.id}-akhir` ? (
                                <div className="flex items-center gap-2 bg-emerald-50 p-1 rounded-lg border border-emerald-100 shadow-sm animate-in zoom-in duration-200">
                                  <button 
                                    onClick={(e) => updateStok(e, provider, idx, 'akhir', -1)} 
                                    className="w-7 h-7 rounded-md bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm active:scale-90 transition-all"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-xs font-black text-emerald-800 w-4">{item.akhir}</span>
                                  <button 
                                    onClick={(e) => updateStok(e, provider, idx, 'akhir', 1)} 
                                    className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center text-white shadow-sm active:scale-90 transition-all"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  onClick={(e) => { e.stopPropagation(); setActiveControl(`${provider}-${item.id}-akhir`); }}
                                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  <span className="text-xs font-bold text-gray-800">{item.akhir}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {activeEditingCell === 'master' ? (
                                <input 
                                  type="number"
                                  value={item.price} 
                                  onChange={(e) => handleEditItem(provider, item.id, 'price', e.target.value)}
                                  className="form-input-modern w-full h-7 px-1 text-right"
                                />
                            ) : (
                              <span className="text-[10px] font-black text-gray-600">{(item.price/1000)}k</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => jualQris(provider, idx)}
                              className="bg-sky-500 text-white text-[9px] font-black px-2 py-1 rounded shadow-sm active:scale-95 transition-all"
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
