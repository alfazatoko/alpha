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
  const [mainTab, setMainTab] = useState<'profit' | 'performa_kasir'>('profit')
  const [filterKasir, setFilterKasir] = useState<string>('Semua')
  const [subTabKasir, setSubTabKasir] = useState<'rekap' | 'tambah_saldo'>('rekap')
  
  // Date states
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-CA')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })

  // State Data Monthly Snapshot dari DB
  const [monthlyPerforma, setMonthlyPerforma] = useState<any[]>([])
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Fetch data agregat dari performa_harian
  const fetchMonthly = async () => {
    if (!props.googleUid) return
    setIsLoadingMonth(true)
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
    if (!props.active || !props.googleUid) return
    fetchMonthly()
  }, [props.active, props.googleUid, props.targetStoreId, selectedMonth])

  // Helper kategori
  const isIsiCategory = (cat: string) => {
    const c = (cat || '').toLowerCase()
    return c.includes('isi saldo bank') || c.startsWith('isi') || c.includes('modal') || c.includes('setor')
  }

  const isSalesCategory = (cat: string, ket?: string) => {
    const c = (cat || '').toLowerCase()
    const k = (ket || '').toUpperCase()
    if (k.includes('[KHUSUS]') || k.includes('[NON_TUNAI]') || k.includes('[ADMIN_DALAM]')) return false
    if (isIsiCategory(cat) || c.includes('tarik tunai')) return false
    return true
  }

  // Deduplikasi monthlyPerforma agar tidak terjadi sum ganda jika ada row duplikat di DB
  const deduplicatedMonthlyPerforma = useMemo(() => {
    const uniqueMap = new Map<string, any>()
    monthlyPerforma.forEach(p => {
      // Filter per kasir jika filterKasir != 'Semua'
      if (filterKasir !== 'Semua' && p.kasir_id !== filterKasir) return
      const key = `${p.tanggal}_${p.kasir_id}_${p.store_id || ''}`
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, p)
      } else {
        const existing = uniqueMap.get(key)
        if ((p.id && existing.id && p.id > existing.id) || (p.timestamp && existing.timestamp && p.timestamp > existing.timestamp)) {
          uniqueMap.set(key, p)
        }
      }
    })
    return Array.from(uniqueMap.values())
  }, [monthlyPerforma, filterKasir])

  // --- KALKULASI FITUR PROFIT ---
  // 1. Profit Hari Ini (Live dari props.transactions & closing snapshot hari ini)
  const profitHariIni = useMemo(() => {
    const todayTxs = props.transactions.filter(t => t.timestamp.startsWith(todayStr))
    let adminFeeTotal = 0
    let countTx = 0

    todayTxs.forEach(t => {
      if (isSalesCategory(t.kategori, t.keterangan)) {
        adminFeeTotal += Number(t.adminFee) || 0
        countTx++
      }
    })

    // Voucher profit hari ini dari localStorage (jika toko spesifik)
    let voucherProfit = 0
    if (props.targetStoreId && props.targetStoreId !== 'all') {
      const savedV = localStorage.getItem(`alphaPro_${props.targetStoreId}_stok_voucher_${todayStr}`)
      if (savedV) {
        try {
          const dataVoucher = JSON.parse(savedV)
          Object.values(dataVoucher).forEach((items: any) => {
            items.forEach((item: any) => {
              const laku = Math.max(0, (item.awal || 0) - (item.akhir || 0))
              if (item.modal && laku > 0) {
                voucherProfit += laku * ((item.price || 0) - item.modal)
              }
            })
          })
        } catch (e) {}
      }
    }

    return {
      adminFee: adminFeeTotal,
      voucherProfit: voucherProfit,
      totalProfit: adminFeeTotal + voucherProfit,
      countTx
    }
  }, [props.transactions, todayStr, props.targetStoreId])

  // 2. Profit Bulanan (Dari deduplicatedMonthlyPerforma + merge raw transactions untuk seluruh tgl 1 s/d skrg)
  const profitBulananData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    let maxDay = daysInMonth
    if (year === today.getFullYear() && month === today.getMonth() + 1) {
      maxDay = today.getDate()
    }

    const map = new Map<string, { tambahSaldo: number, omset: number, labaAdmin: number, labaVoucher: number, totalLaba: number, totalTx: number, isClosed: boolean }>()

    for (let i = 1; i <= maxDay; i++) {
      const dStr = `${selectedMonth}-${String(i).padStart(2, '0')}`
      map.set(dStr, { tambahSaldo: 0, omset: 0, labaAdmin: 0, labaVoucher: 0, totalLaba: 0, totalTx: 0, isClosed: false })
    }

    // Akumulasi raw transaksi dari props.transactions untuk SELURUH tanggal di bulan terpilih (tgl 1 - skrg)
    const rawDataMap = new Map<string, { tambahSaldo: number, omset: number, labaAdmin: number, countTx: number }>()
    props.transactions.forEach(t => {
      if (t.timestamp.startsWith(selectedMonth)) {
        if (filterKasir !== 'Semua' && t.kasir_id && t.kasir_id !== filterKasir) return
        const dStr = t.timestamp.substring(0, 10)
        if (!rawDataMap.has(dStr)) {
          rawDataMap.set(dStr, { tambahSaldo: 0, omset: 0, labaAdmin: 0, countTx: 0 })
        }
        const cur = rawDataMap.get(dStr)!
        if (isIsiCategory(t.kategori)) {
          cur.tambahSaldo += Number(t.nominal) || 0
        } else if (isSalesCategory(t.kategori, t.keterangan)) {
          cur.countTx += 1
          cur.labaAdmin += Number(t.adminFee) || 0
          cur.omset += Number(t.nominal) || 0
        }
      }
    })

    deduplicatedMonthlyPerforma.forEach(p => {
      const date = p.tanggal
      if (map.has(date)) {
        const current = map.get(date)!
        const labaAdmin = Number(p.laba_admin) || Number(p.laba) || 0
        const labaVoucher = Number(p.laba_voucher) || 0
        current.tambahSaldo += Number(p.tambah_saldo) || 0
        current.omset += Number(p.omset) || 0
        current.labaAdmin += labaAdmin
        current.labaVoucher += labaVoucher
        current.totalLaba += (Number(p.laba) || (labaAdmin + labaVoucher))
        current.totalTx += Number(p.total_transaksi) || 0
        current.isClosed = true
      }
    })

    // Garansi sempurna: Gabungkan / fallback ke rawDataMap untuk SEMUA tanggal (tgl 1 - skrg)
    map.forEach((current, dateStr) => {
      const raw = rawDataMap.get(dateStr)
      if (raw) {
        if (raw.tambahSaldo > current.tambahSaldo) current.tambahSaldo = raw.tambahSaldo
        if (raw.omset > current.omset) current.omset = raw.omset
        if (raw.labaAdmin > current.labaAdmin) current.labaAdmin = raw.labaAdmin
        if (raw.countTx > current.totalTx) current.totalTx = raw.countTx
      }
    })

    // Merge data hari ini jika ada voucher profit
    if (year === today.getFullYear() && month === today.getMonth() + 1) {
      const todayData = map.get(todayStr)
      if (todayData) {
        todayData.labaVoucher = Math.max(todayData.labaVoucher, profitHariIni.voucherProfit)
        todayData.totalLaba = todayData.labaAdmin + todayData.labaVoucher
      }
    }

    return Array.from(map.entries())
  }, [deduplicatedMonthlyPerforma, selectedMonth, props.transactions, todayStr, profitHariIni, filterKasir])

  const totalBulananSummary = useMemo(() => {
    return profitBulananData.reduce((acc, [_, data]) => {
      acc.tambahSaldo += data.tambahSaldo
      acc.omset += data.omset
      acc.labaAdmin += data.labaAdmin
      acc.labaVoucher += data.labaVoucher
      acc.totalLaba += data.totalLaba
      acc.totalTx += data.totalTx
      return acc
    }, { tambahSaldo: 0, omset: 0, labaAdmin: 0, labaVoucher: 0, totalLaba: 0, totalTx: 0 })
  }, [profitBulananData])

  // --- KALKULASI FITUR PERFORMA KASIR ---
  // Filter transaksi kasir terpilih HANYA untuk bulan terpilih (selectedMonth)
  const kasirTransactions = useMemo(() => {
    return props.transactions.filter(t => {
      const isKasirMatch = filterKasir === 'Semua' || t.kasir_id === filterKasir
      const isMonthMatch = t.timestamp.startsWith(selectedMonth)
      return isKasirMatch && isMonthMatch
    })
  }, [props.transactions, filterKasir, selectedMonth])

  // 1. Riwayat Tambah Saldo Kasir (Modal/Bank/Real)
  const kasirTambahSaldoHistory = useMemo(() => {
    return kasirTransactions.filter(t => isIsiCategory(t.kategori))
  }, [kasirTransactions])

  const totalTambahSaldoKasir = useMemo(() => {
    return kasirTambahSaldoHistory.reduce((s, t) => s + (Number(t.nominal) || 0), 0)
  }, [kasirTambahSaldoHistory])

  // 2. KPI Kasir (Omset, Profit Admin, Transaksi Count)
  const kpiKasir = useMemo(() => {
    let omset = 0, profitAdmin = 0, count = 0
    kasirTransactions.forEach(t => {
      if (isSalesCategory(t.kategori, t.keterangan)) {
        count++
        profitAdmin += Number(t.adminFee) || 0
        omset += Number(t.nominal) || 0
      }
    })
    return { omset, profitAdmin, count }
  }, [kasirTransactions])

  // Performa Kasir Leaderboard
  const kasirLeaderboard = useMemo(() => {
    const map = new Map<string, { omset: number, laba: number, tambahSaldo: number, count: number }>()
    // Filter transaksi bulan terpilih
    const monthlyTxs = props.transactions.filter(t => t.timestamp.startsWith(selectedMonth))
    monthlyTxs.forEach(t => {
      const kId = t.kasir_id || 'Unknown'
      const current = map.get(kId) || { omset: 0, laba: 0, tambahSaldo: 0, count: 0 }

      if (isIsiCategory(t.kategori)) {
        current.tambahSaldo += Number(t.nominal) || 0
      } else if (isSalesCategory(t.kategori, t.keterangan)) {
        current.count++
        current.laba += Number(t.adminFee) || 0
        current.omset += Number(t.nominal) || 0
      }
      map.set(kId, current)
    })
    return Array.from(map.entries()).sort((a, b) => b[1].omset - a[1].omset)
  }, [props.transactions, selectedMonth])

  // --- SINKRONISASI DATA TRANSAKSI LAMA (PULL HISTORY) ---
  const handleSyncHistory = async () => {
    if (!confirm('Tarik data dari tanggal 1 sampai hari ini ke tabel pembukuan harian? Proses ini membutuhkan waktu beberapa detik.')) return
    setIsSyncing(true)
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

      let allRawData: any[] = []
      let from = 0
      const step = 1000
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('transactions')
          .select('nominal, admin_fee, kategori, keterangan, timestamp, kasir_id, store_id')
          .eq('user_id', props.googleUid)
          .gte('timestamp', startDate)
          .lt('timestamp', endDate)
          .range(from, from + step - 1)
        
        if (props.targetStoreId && props.targetStoreId !== 'all') {
          query = query.eq('store_id', props.targetStoreId)
        }

        const { data: chunk, error } = await query
        if (error) throw error

        if (chunk && chunk.length > 0) {
          allRawData = [...allRawData, ...chunk]
          from += step
          if (chunk.length < step) hasMore = false
        } else {
          hasMore = false
        }
        if (from >= 50000) hasMore = false
      }

      if (allRawData.length === 0) throw new Error('Tidak ada data transaksi di bulan ini.')

      const map = new Map<string, any>()
      allRawData.forEach((t: any) => {
        const dateStr = t.timestamp.substring(0, 10)
        const key = `${dateStr}_${t.kasir_id}`

        if (!map.has(key)) {
          map.set(key, { 
            user_id: props.googleUid, 
            store_id: t.store_id || null, 
            kasir_id: t.kasir_id, 
            tanggal: dateStr, 
            omset: 0, laba: 0, laba_admin: 0, laba_voucher: 0, pengeluaran: 0, tambah_saldo: 0, total_transaksi: 0,
            timestamp: t.timestamp
          })
        }
        const current = map.get(key)!
        if (isIsiCategory(t.kategori)) {
          current.tambah_saldo += Number(t.nominal) || 0
        } else if (isSalesCategory(t.kategori, t.keterangan)) {
          current.total_transaksi += 1
          const adminFee = Number(t.admin_fee) || 0
          current.laba_admin += adminFee
          current.laba += adminFee
          current.omset += Number(t.nominal) || 0
        } else if (t.kategori === 'Tarik Tunai') {
          current.pengeluaran += Number(t.nominal) || 0
        }
      })

      const records = Array.from(map.values())
      for (const rec of records) {
        const { data: existing } = await supabase
          .from('performa_harian')
          .select('id')
          .eq('user_id', props.googleUid)
          .eq('kasir_id', rec.kasir_id)
          .eq('tanggal', rec.tanggal)
          .single()

        if (existing) {
          await supabase.from('performa_harian').update(rec).eq('id', existing.id)
        } else {
          await supabase.from('performa_harian').insert([rec])
        }
      }
      
      await fetchMonthly()
      alert('Berhasil sinkronisasi riwayat transaksi ke pembukuan harian!')
    } catch (err: any) {
      console.error(err)
      alert('Gagal sinkronisasi: ' + err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  // PDF Export
  const handleDownloadPDF = () => {
    const pdf = new jsPDF()
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(30, 41, 59)
    pdf.text(mainTab === 'profit' ? 'LAPORAN PEMBUKUAN TOKO' : 'LAPORAN PERFORMA KASIR', 105, 20, { align: 'center' })
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 116, 139)
    pdf.text(`Periode: ${selectedMonth}   |   Kasir: ${filterKasir === 'Semua' ? 'Semua Kasir' : filterKasir}`, 105, 28, { align: 'center' })
    
    let y = 42
    pdf.setFillColor(241, 245, 249)
    pdf.rect(15, y-7, 180, 10, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(71, 85, 105)
    pdf.text('TANGGAL', 20, y)
    pdf.text('TAMBAH SALDO BANK (Rp)', 80, y, { align: 'right' })
    pdf.text('OMSET PENJUALAN (Rp)', 140, y, { align: 'right' })
    pdf.text('FEE ADMIN (Rp)', 190, y, { align: 'right' })
    
    y += 9
    
    profitBulananData.forEach(([date, data]) => {
      const dayNum = date.split('-')[2]
      if (data.tambahSaldo > 0 || data.omset > 0 || data.labaAdmin > 0) {
        pdf.setTextColor(51, 65, 85)
        pdf.text(dayNum, 20, y)
        pdf.setTextColor(37, 99, 235)
        pdf.text(formatRupiah(data.tambahSaldo).replace(',00',''), 80, y, { align: 'right' })
        pdf.setTextColor(51, 65, 85)
        pdf.text(formatRupiah(data.omset).replace(',00',''), 140, y, { align: 'right' })
        pdf.setTextColor(16, 185, 129)
        pdf.text(formatRupiah(data.labaAdmin).replace(',00',''), 190, y, { align: 'right' })
        
        pdf.setDrawColor(241, 245, 249)
        pdf.line(15, y+3, 195, y+3)
        y += 8
        if (y > 275) {
          pdf.addPage()
          y = 20
        }
      }
    })
    
    y += 4
    pdf.setFillColor(15, 23, 42)
    pdf.rect(15, y-7, 180, 12, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text('TOTAL BULAN INI', 20, y+1)
    pdf.setTextColor(147, 197, 253)
    pdf.text(formatRupiah(totalBulananSummary.tambahSaldo).replace(',00',''), 80, y+1, { align: 'right' })
    pdf.setTextColor(226, 232, 240)
    pdf.text(formatRupiah(totalBulananSummary.omset).replace(',00',''), 140, y+1, { align: 'right' })
    pdf.setTextColor(52, 211, 153)
    pdf.text(formatRupiah(totalBulananSummary.labaAdmin).replace(',00',''), 190, y+1, { align: 'right' })
    
    pdf.save(`Laporan_${mainTab.toUpperCase()}_${selectedMonth}.pdf`)
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
              <h1 className="text-[15px] font-black text-white leading-tight uppercase tracking-widest">
                {mainTab === 'profit' ? 'Laporan Pembukuan Toko' : 'Performa Kasir'}
              </h1>
              <p className="text-[10px] text-white/80 font-bold uppercase mt-0.5 tracking-wider">
                {mainTab === 'profit' ? 'Tambah Saldo Bank, Omset & Admin Fee' : 'Omset, Admin Fee & Tambah Saldo Kasir'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-8 relative z-10 space-y-4 pb-24">
        
        {/* MAIN TAB SWITCHER: PROFIT vs PERFORMA KASIR */}
        <div className="bg-white rounded-[2rem] p-2 shadow-lg border border-slate-100 flex gap-2">
          <button
            onClick={() => setMainTab('profit')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              mainTab === 'profit' ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "bg-transparent text-slate-500 hover:bg-slate-50"
            )}
          >
            <i className="fa-solid fa-chart-line text-sm"></i> Pembukuan Toko
          </button>
          <button
            onClick={() => setMainTab('performa_kasir')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              mainTab === 'performa_kasir' ? "bg-purple-600 text-white shadow-md shadow-purple-200" : "bg-transparent text-slate-500 hover:bg-slate-50"
            )}
          >
            <i className="fa-solid fa-user-gear text-sm"></i> Performa Kasir
          </button>
        </div>

        {/* ==================================== TAB 1: PROFIT / PEMBUKUAN TOKO ==================================== */}
        {mainTab === 'profit' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Cards Ringkasan Profit Hari Ini */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-coins text-[10px]"></i>
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Admin Fee Hari Ini</p>
                </div>
                <p className="text-base font-black text-emerald-600">{formatRupiah(profitHariIni.adminFee).replace(',00', '')}</p>
                <div className="flex gap-2 text-[8px] font-bold text-slate-400 mt-1">
                  <span>{profitHariIni.countTx} Transaksi</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-3xl shadow-sm text-white">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-calendar-check text-[10px] text-amber-400"></i>
                  </div>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Total Fee Admin {selectedMonth}</p>
                </div>
                <p className="text-base font-black text-amber-400">{formatRupiah(totalBulananSummary.labaAdmin).replace(',00', '')}</p>
                <p className="text-[8px] font-bold text-slate-400 mt-1">Akumulasi Pembukuan Harian</p>
              </div>
            </div>

            {/* Filter Periode, Filter Kasir & Action Buttons */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Periode Bulan</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filter Kasir</label>
                  <select
                    value={filterKasir}
                    onChange={(e) => setFilterKasir(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Semua">Semua Kasir</option>
                    {Object.entries(props.kasirList || {}).map(([username, data]: [string, any]) => (
                      <option key={username} value={username}>{data.name || username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncHistory}
                  disabled={isSyncing}
                  title="Tarik Riwayat Riwayat ke Pembukuan"
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  {isSyncing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-rotate"></i>}
                  <span className="hidden sm:inline">Sinkronkan</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-file-pdf"></i>
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
            </div>

            {/* Tabel Profit Tanggal 1 s/d 31 */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[320px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Riwayat Pembukuan Tanggal 1 - 31</h3>
                <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">Singkron Riwayat</span>
              </div>

              {isLoadingMonth ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-emerald-500"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest">Memuat Pembukuan Toko...</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-10 shadow-sm">
                        <tr>
                          <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Tgl</th>
                          <th className="py-2.5 px-3 text-[9px] font-black text-purple-600 uppercase tracking-widest border-b border-slate-200">Kasir</th>
                          <th className="py-2.5 px-3 text-[9px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-200 text-right">Tambah Saldo Bank</th>
                          <th className="py-2.5 px-3 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 text-right">Omset Penjualan</th>
                          <th className="py-2.5 px-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest border-b border-slate-200 text-right">Admin Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profitBulananData.map(([date, data]) => {
                          const dayNum = date.split('-')[2]
                          const hasData = data.tambahSaldo > 0 || data.omset > 0 || data.labaAdmin > 0
                          return (
                            <tr key={date} className={cn("transition-colors hover:bg-slate-50", !hasData && "opacity-40 grayscale")}>
                              <td className="py-3 px-3 flex items-center gap-1.5">
                                <span className={cn("text-[11px] font-black", hasData ? "text-slate-800" : "text-slate-400")}>{dayNum}</span>
                                {data.isClosed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Sudah Closing"></span>}
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  {filterKasir === 'Semua' ? 'Gabungan' : (props.kasirList?.[filterKasir]?.name || filterKasir)}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className={cn("text-[10px] font-black", hasData ? "text-blue-600" : "text-slate-300")}>{formatRupiah(data.tambahSaldo).replace(',00', '')}</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className={cn("text-[10px] font-bold", hasData ? "text-slate-700" : "text-slate-300")}>{formatRupiah(data.omset).replace(',00', '')}</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className={cn("text-[10px] font-black text-emerald-600", !hasData && "text-slate-300")}>+{formatRupiah(data.labaAdmin).replace(',00', '')}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 mt-auto text-white shrink-0 grid grid-cols-3 gap-2 text-center border-t border-slate-700">
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">TOTAL SALDO BANK</p>
                      <p className="text-xs font-black text-blue-400">{formatRupiah(totalBulananSummary.tambahSaldo).replace(',00', '')}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">TOTAL OMSET</p>
                      <p className="text-xs font-black text-slate-200">{formatRupiah(totalBulananSummary.omset).replace(',00', '')}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">TOTAL ADMIN FEE</p>
                      <p className="text-xs font-black text-emerald-400">+{formatRupiah(totalBulananSummary.labaAdmin).replace(',00', '')}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ==================================== TAB 2: PERFORMA KASIR ==================================== */}
        {mainTab === 'performa_kasir' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Filter Pilih Kasir */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Pilih Kasir</label>
              <div className="relative">
                <select 
                  value={filterKasir}
                  onChange={(e) => setFilterKasir(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-3 appearance-none outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="Semua">Semua Kasir (Gabungan)</option>
                  {Object.entries(props.kasirList || {}).map(([username, data]: [string, any]) => (
                    <option key={username} value={username}>{data.name || username}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
              </div>
            </div>

            {/* KPI Cards Kasir */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Tambah Saldo</p>
                <p className="text-xs font-black text-blue-600 truncate">{formatRupiah(totalTambahSaldoKasir).replace(',00', '')}</p>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Omset Penjualan</p>
                <p className="text-xs font-black text-slate-800 truncate">{formatRupiah(kpiKasir.omset).replace(',00', '')}</p>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Profit Admin Fee</p>
                <p className="text-xs font-black text-emerald-600 truncate">+{formatRupiah(kpiKasir.profitAdmin).replace(',00', '')}</p>
              </div>
            </div>

            {/* Sub-Tab Switcher Kasir */}
            <div className="bg-slate-200/60 rounded-2xl p-1 flex gap-1">
              <button
                onClick={() => setSubTabKasir('rekap')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  subTabKasir === 'rekap' ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Leaderboard & Rekap
              </button>
              <button
                onClick={() => setSubTabKasir('tambah_saldo')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  subTabKasir === 'tambah_saldo' ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Total Tambah Saldo Bank
              </button>
            </div>

            {/* Sub-Tab 1: Leaderboard & Rekap */}
            {subTabKasir === 'rekap' && (
              <div className="space-y-4">
                {filterKasir === 'Semua' && kasirLeaderboard.length > 0 && (
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-3">Ringkasan Performa Masing-Masing Kasir</h3>
                    <div className="space-y-2.5">
                      {kasirLeaderboard.map(([kId, data], idx) => {
                        const kName = props.kasirList[kId]?.name || kId
                        return (
                          <div key={kId} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center font-black text-xs", idx === 0 ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-600")}>
                                  {idx + 1}
                                </div>
                                <p className="text-xs font-black text-slate-800 uppercase">{kName}</p>
                              </div>
                              <span className="text-[9px] font-bold text-slate-400">{data.count} Transaksi</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-[9px]">
                              <div>
                                <span className="text-slate-400 font-bold block">Tambah Saldo</span>
                                <span className="font-bold text-blue-600">{formatRupiah(data.tambahSaldo).replace(',00', '')}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block">Omset</span>
                                <span className="font-bold text-slate-700">{formatRupiah(data.omset).replace(',00', '')}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 font-bold block">Profit Fee</span>
                                <span className="font-black text-emerald-600">+{formatRupiah(data.laba).replace(',00', '')}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 2: Mutasi Tambah Saldo Kasir (Total Isi Saldo Bank Tanggal 1-31 Singkron Laporan) */}
            {subTabKasir === 'tambah_saldo' && (
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-3xl text-white shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-100">TOTAL TAMBAH SALDO BANK ({selectedMonth})</p>
                      <p className="text-xl font-black mt-1">{formatRupiah(totalTambahSaldoKasir).replace(',00', '')}</p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                      <i className="fa-solid fa-building-columns text-lg"></i>
                    </div>
                  </div>
                  <p className="text-[9px] font-bold text-blue-200 mt-2 italic flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check text-emerald-400"></i> Singkron dengan "1. Modal Saldo Bank (Isi)" di Halaman Laporan
                  </p>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Akumulasi Tambah Saldo Per Tanggal</h3>
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">Singkron Laporan</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto custom-scrollbar">
                    {profitBulananData.map(([date, data]) => {
                      const dayNum = date.split('-')[2]
                      if (data.tambahSaldo <= 0) return null
                      return (
                        <div key={date} className="p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center border border-blue-100">
                              {dayNum}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800">Tanggal {date}</p>
                              <p className="text-[9px] font-bold text-slate-400">Total Pengisian/Setoran Saldo Bank</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-blue-600">+{formatRupiah(data.tambahSaldo).replace(',00', '')}</span>
                          </div>
                        </div>
                      )
                    })}
                    {profitBulananData.every(([_, data]) => data.tambahSaldo <= 0) && (
                      <div className="p-8 text-center text-slate-400">
                        <i className="fa-solid fa-building-columns text-3xl mb-2 text-slate-300"></i>
                        <p className="text-[10px] font-black uppercase tracking-widest">Belum ada transaksi tambah saldo bank di bulan ini</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}

export default PerformaKasirView
