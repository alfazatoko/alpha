import React, { useState, useMemo, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import { formatRupiah, cn } from '../lib/utils'
import { supabase } from '../lib/supabase'
import type { Transaction } from '../types'

interface PerformaKasirViewProps {
  active: boolean
  isPc: boolean
  setActiveView: (v: string) => void
  transactions: Transaction[]
  kasirList: Record<string, any>
  storeName?: string
  kasirRole?: string
  googleUid?: string
  targetStoreId?: string
}

const PerformaKasirView: React.FC<PerformaKasirViewProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'harian' | 'bulanan'>('harian')
  const [filterKasir, setFilterKasir] = useState<string>('Semua')
  
  // Date states
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-CA')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })

  // Filter Transactions based on Kasir (For Harian - Using Props which has today's live data)
  const kasirFilteredTransactions = useMemo(() => {
    if (filterKasir === 'Semua') return props.transactions
    return props.transactions.filter(t => t.kasir_id === filterKasir)
  }, [props.transactions, filterKasir])

  // --- TAB 1: HARIAN DATA ---
  const todayTransactions = useMemo(() => {
    return kasirFilteredTransactions.filter(t => t.timestamp.startsWith(todayStr))
  }, [kasirFilteredTransactions, todayStr])

  const kpiHarian = useMemo(() => {
    let omset = 0, laba = 0, pengeluaran = 0, count = 0
    todayTransactions.forEach(t => {
      const isKhususAtauNonTunai = (t.keterangan || '').includes('[KHUSUS]') || (t.keterangan || '').includes('[NON_TUNAI]')
      const isIsi = String(t.kategori).startsWith('Isi')
      
      if (!isIsi && !isKhususAtauNonTunai) {
        count++
        laba += Number(t.adminFee) || 0
        if (t.kategori === 'Tarik Tunai') {
          pengeluaran += Number(t.nominal) || 0
        } else {
          omset += Number(t.nominal) || 0
        }
      }
    })
    return { omset, laba, pengeluaran, count }
  }, [todayTransactions])

  // Leaderboard Kasir (Hari Ini)
  const kasirLeaderboard = useMemo(() => {
    const map = new Map<string, { omset: number, laba: number }>()
    todayTransactions.forEach(t => {
      const isKhususAtauNonTunai = (t.keterangan || '').includes('[KHUSUS]') || (t.keterangan || '').includes('[NON_TUNAI]')
      const isIsi = String(t.kategori).startsWith('Isi')
      if (!isIsi && !isKhususAtauNonTunai) {
        const kId = t.kasir_id || 'Unknown'
        const current = map.get(kId) || { omset: 0, laba: 0 }
        current.laba += Number(t.adminFee) || 0
        if (t.kategori !== 'Tarik Tunai') {
          current.omset += Number(t.nominal) || 0
        }
        map.set(kId, current)
      }
    })
    return Array.from(map.entries()).sort((a, b) => b[1].omset - a[1].omset)
  }, [todayTransactions])


  // --- TAB 2: BULANAN DATA (FETCH DIRECTLY FROM PERFORMA_HARIAN) ---
  const [monthlyPerforma, setMonthlyPerforma] = useState<any[]>([])
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const fetchMonthly = async () => {
    setIsLoadingMonth(true)
    try {
      // Determine start and end dates for the month
      const [year, month] = selectedMonth.split('-').map(Number)
      const startDate = `${selectedMonth}-01`
      
      // Next month start date
      let nextYear = year
      let nextMonth = month + 1
      if (nextMonth > 12) {
        nextMonth = 1
        nextYear++
      }
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

      let query = supabase
        .from('performa_harian')
        .select('*')
        .eq('user_id', props.googleUid)
        .gte('tanggal', startDate)
        .lt('tanggal', endDate)

      if (props.targetStoreId && props.targetStoreId !== 'all') {
        query = query.eq('store_id', props.targetStoreId)
      }

      const { data, error } = await query

      if (!error && data) {
        setMonthlyPerforma(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingMonth(false)
    }
  }

  useEffect(() => {
    if (!props.active || activeTab !== 'bulanan' || !props.googleUid) return;
    fetchMonthly()
  }, [props.active, activeTab, props.googleUid, props.targetStoreId, selectedMonth])

  const handleSyncHistory = async () => {
    if (!confirm('Tarik data dari tanggal 1 sampai hari ini ke tabel baru? Proses ini memakan waktu beberapa detik.')) return;
    setIsSyncing(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number)
      const startDate = `${selectedMonth}-01`
      let nextYear = year
      let nextMonth = month + 1
      if (nextMonth > 12) {
        nextMonth = 1
        nextYear++
      }
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

      // 1. Fetch raw transactions with pagination (to bypass 1000 row API limit)
      let allRawData: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('transactions')
          .select('nominal, admin_fee, kategori, keterangan, timestamp, kasir_id, store_id')
          .eq('user_id', props.googleUid)
          .gte('timestamp', startDate)
          .lt('timestamp', endDate)
          .range(from, from + step - 1);
        
        if (props.targetStoreId && props.targetStoreId !== 'all') {
          query = query.eq('store_id', props.targetStoreId);
        }

        const { data: chunk, error } = await query;
        if (error) throw error;

        if (chunk && chunk.length > 0) {
          allRawData = [...allRawData, ...chunk];
          from += step;
          if (chunk.length < step) hasMore = false;
        } else {
          hasMore = false;
        }
        
        // Safety break (max 50,000 transactions)
        if (from >= 50000) hasMore = false;
      }
      
      const rawData = allRawData;
      if (rawData.length === 0) throw new Error('Tidak ada data transaksi di bulan ini.');

      // 2. Group by date and kasir
      const map = new Map<string, any>();
      rawData.forEach((t: any) => {
        const isKhususAtauNonTunai = (t.keterangan || '').includes('[KHUSUS]') || (t.keterangan || '').includes('[NON_TUNAI]');
        const isIsi = String(t.kategori).startsWith('Isi');
        if (!isIsi && !isKhususAtauNonTunai) {
          const dateStr = t.timestamp.substring(0, 10);
          const key = `${dateStr}_${t.kasir_id}`;
          if (!map.has(key)) {
            map.set(key, { 
              user_id: props.googleUid, 
              store_id: t.store_id || null, 
              kasir_id: t.kasir_id, 
              tanggal: dateStr, 
              omset: 0, laba: 0, pengeluaran: 0, total_transaksi: 0,
              timestamp: t.timestamp
            });
          }
          const current = map.get(key)!;
          current.total_transaksi += 1;
          current.laba += Number(t.admin_fee) || 0;
          if (t.kategori === 'Tarik Tunai') {
            current.pengeluaran += Number(t.nominal) || 0;
          } else {
            current.omset += Number(t.nominal) || 0;
          }
        }
      });

      // 3. Upsert to performa_harian
      const records = Array.from(map.values());
      for (const rec of records) {
        // Check existing
        const { data: existing, error: existError } = await supabase
          .from('performa_harian')
          .select('id')
          .eq('user_id', props.googleUid)
          .eq('kasir_id', rec.kasir_id)
          .eq('tanggal', rec.tanggal)
          .single();

        if (existError && existError.code !== 'PGRST116') {
          // PGRST116 is "Not Found", which is fine. Anything else means table doesn't exist or DB error
          throw existError;
        }

        if (existing) {
          const { error: updErr } = await supabase.from('performa_harian').update(rec).eq('id', existing.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase.from('performa_harian').insert([rec]);
          if (insErr) throw insErr;
        }
      }
      
      // Reload
      await fetchMonthly();
      alert('Berhasil menarik semua data riwayat ke tabel baru!');
    } catch (err: any) {
      console.error(err);
      alert('Gagal sinkronisasi: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  }

  // Filter Monthly by Kasir
  const kasirFilteredMonthlyTx = useMemo(() => {
    if (filterKasir === 'Semua') return monthlyPerforma
    return monthlyPerforma.filter(t => t.kasir_id === filterKasir)
  }, [monthlyPerforma, filterKasir])

  // Group by date (1 - 31)
  const monthlyData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    
    // Determine the max day to show
    let maxDay = daysInMonth;
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth() + 1) {
      maxDay = now.getDate();
    }

    const map = new Map<string, { omset: number, laba: number }>()
    
    for (let i = 1; i <= maxDay; i++) {
      const dStr = `${selectedMonth}-${String(i).padStart(2, '0')}`
      map.set(dStr, { omset: 0, laba: 0 })
    }

    kasirFilteredMonthlyTx.forEach(p => {
      const date = p.tanggal
      if (map.has(date)) {
        const current = map.get(date)!
        current.omset += Number(p.omset) || 0
        current.laba += Number(p.laba) || 0
      }
    })
    
    return Array.from(map.entries())
  }, [kasirFilteredMonthlyTx, selectedMonth])

  const totalBulanIni = useMemo(() => {
    return monthlyData.reduce((acc, [_, data]) => {
      acc.omset += data.omset
      acc.laba += data.laba
      return acc
    }, { omset: 0, laba: 0 })
  }, [monthlyData])

  const handleDownloadPDF = () => {
    const pdf = new jsPDF();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(30, 41, 59);
    pdf.text('LAPORAN PERFORMA KASIR', 105, 20, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Bulan: ${selectedMonth}   |   Kasir: ${filterKasir === 'Semua' ? 'Semua Kasir' : filterKasir}`, 105, 28, { align: 'center' });
    
    // Draw table header
    let y = 42;
    pdf.setFillColor(241, 245, 249);
    pdf.rect(15, y-7, 180, 10, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text('TANGGAL', 20, y);
    pdf.text('TOTAL OMSET (Rp)', 105, y, { align: 'right' });
    pdf.text('TOTAL LABA (Rp)', 190, y, { align: 'right' });
    
    pdf.setFont('helvetica', 'bold');
    y += 9;
    
    let hasData = false;
    monthlyData.forEach(([date, data]) => {
       const dayNum = date.split('-')[2];
       if (data.omset > 0 || data.laba > 0) {
         hasData = true;
         pdf.setTextColor(51, 65, 85);
         pdf.text(dayNum, 20, y);
         pdf.text(formatRupiah(data.omset).replace(',00',''), 105, y, { align: 'right' });
         pdf.setTextColor(16, 185, 129); // emerald-500
         pdf.text(formatRupiah(data.laba).replace(',00',''), 190, y, { align: 'right' });
         
         pdf.setDrawColor(241, 245, 249);
         pdf.line(15, y+3, 195, y+3);
         y += 8;
         
         if (y > 275) {
            pdf.addPage();
            y = 20;
         }
       }
    });

    if (!hasData) {
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(148, 163, 184);
        pdf.text('Tidak ada data performa bulan ini', 105, y + 10, { align: 'center' });
        y += 20;
    }
    
    // Draw totals footer
    y += 4;
    pdf.setFillColor(15, 23, 42); // slate-900
    pdf.rect(15, y-7, 180, 12, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('TOTAL KESELURUHAN', 20, y+1);
    pdf.setTextColor(147, 197, 253); // blue-300
    pdf.text(formatRupiah(totalBulanIni.omset).replace(',00',''), 105, y+1, { align: 'right' });
    pdf.setTextColor(52, 211, 153); // emerald-400
    pdf.text(formatRupiah(totalBulanIni.laba).replace(',00',''), 190, y+1, { align: 'right' });
    
    pdf.save(`Performa_Kasir_${filterKasir}_${selectedMonth}.pdf`);
  }

  if (!props.active) return null

  return (
    <div className={cn("page-view hide-scrollbar bg-slate-50", props.active && "active")}>
      <div className="relative theme-header" style={{ paddingBottom: '3rem' }}>
        <div className="px-5 pt-12 pb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => props.setActiveView('view-beranda')}
              className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all backdrop-blur-sm"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <div>
              <h1 className="text-[15px] font-black text-white leading-tight uppercase tracking-widest">Performa Kasir</h1>
              <p className="text-[10px] text-white/80 font-bold uppercase mt-0.5 tracking-wider">Laporan Keuangan & Kinerja</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-8 relative z-10 space-y-4 pb-24">
        
        {/* TAB SWITCHER */}
        <div className="bg-white rounded-[2rem] p-2 shadow-lg border border-slate-100 flex gap-2">
          <button
            onClick={() => setActiveTab('harian')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'harian' ? "bg-purple-600 text-white shadow-md shadow-purple-200" : "bg-transparent text-slate-500 hover:bg-slate-50"
            )}
          >
            <i className="fa-solid fa-calendar-day"></i> Hari Ini
          </button>
          <button
            onClick={() => setActiveTab('bulanan')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'bulanan' ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-transparent text-slate-500 hover:bg-slate-50"
            )}
          >
            <i className="fa-solid fa-calendar-days"></i> Bulan Ini
          </button>
        </div>

        {/* TAB 1: HARIAN */}
        {activeTab === 'harian' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Pilih Kasir</label>
              <div className="relative">
                <select 
                  value={filterKasir}
                  onChange={(e) => setFilterKasir(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-3 appearance-none outline-none focus:border-purple-400"
                >
                  <option value="Semua">Semua Kasir (Gabungan)</option>
                  {Object.entries(props.kasirList || {}).map(([username, data]: [string, any]) => (
                    <option key={username} value={username}>{data.name || username}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-wallet text-[10px]"></i>
                  </div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Omset</p>
                </div>
                <p className="text-sm font-black text-slate-800 break-words">{formatRupiah(kpiHarian.omset).replace(',00', '')}</p>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-3xl shadow-sm shadow-emerald-200 flex flex-col justify-center text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                    <i className="fa-solid fa-coins text-[10px]"></i>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-50">Laba Bersih</p>
                </div>
                <p className="text-sm font-black break-words">{formatRupiah(kpiHarian.laba).replace(',00', '')}</p>
              </div>
            </div>

            {/* Leaderboard Hari Ini (If 'Semua' Kasir is selected) */}
            {filterKasir === 'Semua' && kasirLeaderboard.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4">Performa Masing-Masing Kasir (Hari Ini)</h3>
                <div className="space-y-3">
                  {kasirLeaderboard.map(([kId, data], idx) => {
                    const kName = props.kasirList[kId]?.name || kId
                    return (
                      <div key={kId} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-xs", idx === 0 ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-500")}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase">{kName}</p>
                            <p className="text-[9px] font-bold text-slate-500 mt-0.5">Omset: {formatRupiah(data.omset)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-emerald-600">+{formatRupiah(data.laba)}</p>
                          <p className="text-[8px] font-bold text-emerald-600/50 uppercase mt-0.5 tracking-wider">LABA</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BULANAN */}
        {activeTab === 'bulanan' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Pilih Kasir</label>
                <div className="relative">
                  <select 
                    value={filterKasir}
                    onChange={(e) => setFilterKasir(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-3 appearance-none outline-none focus:border-blue-400"
                  >
                    <option value="Semua">Semua Kasir</option>
                    {Object.entries(props.kasirList || {}).map(([username, data]: [string, any]) => (
                      <option key={username} value={username}>{data.name || username}</option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Bulan</label>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700">
                      {selectedMonth}
                  </div>
                  
                  <button 
                    onClick={handleSyncHistory}
                    disabled={isSyncing}
                    title="Tarik Riwayat Transaksi Lama ke Performa"
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    {isSyncing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-rotate"></i>}
                    <span className="hidden sm:inline">Sinkronisasi</span>
                  </button>
                  
                  <button 
                    onClick={handleDownloadPDF}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-file-pdf"></i>
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Riwayat Table 1-31 */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col relative min-h-[300px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between z-10">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Riwayat Tanggal 1 - 31</h3>
                <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded-md">BULAN INI</span>
              </div>
              
              {isLoadingMonth ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-blue-500"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest">Mengambil Data Bulan Ini...</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-10 shadow-sm">
                        <tr>
                          <th className="py-2.5 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Tgl</th>
                          <th className="py-2.5 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-right">Omset</th>
                          <th className="py-2.5 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-right">Laba</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {monthlyData.map(([date, data]) => {
                          const dayNum = date.split('-')[2]
                          const hasData = data.omset > 0 || data.laba > 0
                          return (
                            <tr key={date} className={cn("transition-colors hover:bg-slate-50", !hasData && "opacity-40 grayscale")}>
                              <td className="py-3 px-4">
                                <span className={cn("text-[11px] font-black", hasData ? "text-slate-800" : "text-slate-400")}>{dayNum}</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className={cn("text-[10px] font-bold", hasData ? "text-slate-700" : "text-slate-300")}>{formatRupiah(data.omset).replace(',00', '')}</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className={cn("text-[10px] font-black", hasData ? "text-emerald-600" : "text-slate-300")}>{formatRupiah(data.laba).replace(',00', '')}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Total Summary Footer */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 mt-auto text-white flex flex-col gap-3 shrink-0">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">TOTAL OMSET {selectedMonth}</span>
                      <span className="text-sm font-black text-blue-300">{formatRupiah(totalBulanIni.omset).replace(',00', '')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">TOTAL LABA {selectedMonth}</span>
                      <span className="text-base font-black text-emerald-400">+{formatRupiah(totalBulanIni.laba).replace(',00', '')}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            
          </div>
        )}

      </div>
    </div>
  )
}

export default PerformaKasirView
