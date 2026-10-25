import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { GlobalHeader } from '../components/GlobalHeader'
import { jsPDF } from 'jspdf'
import { formatRupiah, cn } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { fetchLaporanHarianRPC, fetchLaporanBulananRPC } from '../lib/laporanService'
import type { Transaction } from '../types'

interface PerformaKasirViewProps {
  active: boolean
  isPc: boolean
  setActiveView: (v: string) => void
  transactions: Transaction[]
  kasirList: Record<string, any>
  storeName?: string
  storePhoto?: string
  storeSubtext?: string
  kasirName?: string
  kasirRole?: string
  googleUid?: string
  targetStoreId?: string
}

interface DayKasirStat {
  tambahSaldo: number
  omset: number
  labaAdmin: number
  countTx: number
}

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const PerformaKasirView: React.FC<PerformaKasirViewProps> = (props) => {
  // Navigation tabs: 'harian' (Tgl 1 - 31), 'kasir' (Leaderboard), 'tahunan' (Rekap 12 Bulan)
  const [activeTab, setActiveTab] = useState<'harian' | 'kasir' | 'tahunan'>('harian')
  const [filterKasir, setFilterKasir] = useState<string>('Semua')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc') // Default terbaru di atas
  const [showModalSaldo, setShowModalSaldo] = useState(false)

  // Pastikan filter kasir tidak terkunci di 'owner'
  useEffect(() => {
    if (filterKasir && filterKasir.toLowerCase() === 'owner') {
      setFilterKasir('Semua')
    }
  }, [filterKasir])

  // Sinkronisasi data kasir langsung dari Cloud store_settings jika kasirList lokal belum lengkap
  const [fetchedCashiers, setFetchedCashiers] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!props.googleUid) return
    const loadCloudCashiers = async () => {
      try {
        if (props.targetStoreId && props.targetStoreId !== 'all') {
          const { data } = await supabase
            .from('store_settings')
            .select('cashiers')
            .eq('store_id', props.targetStoreId)
            .maybeSingle()
          if (data?.cashiers) {
            setFetchedCashiers(data.cashiers)
          }
        }
      } catch (e) {
        console.warn('Gagal memuat kasir dari cloud:', e)
      }
    }
    loadCloudCashiers()
  }, [props.googleUid, props.targetStoreId])

  // Gabungan kasir dari localStorage, props.kasirList, dan cloud store_settings
  const effectiveKasirList = useMemo(() => {
    const merged: Record<string, any> = {}
    if (props.targetStoreId) {
      try {
        const local = localStorage.getItem(`alphaPro_${props.targetStoreId}_kasir_list`)
        if (local) Object.assign(merged, JSON.parse(local))
      } catch (e) {}
    }
    if (props.kasirList) {
      Object.assign(merged, props.kasirList)
    }
    if (fetchedCashiers) {
      Object.assign(merged, fetchedCashiers)
    }
    return merged
  }, [props.kasirList, props.targetStoreId, fetchedCashiers])

  // Helper pemeta kasir_id riil dari transaksi ke kasir terdaftar (mengatasi typo/alias toko1 -> toko1_01 / Aulia)
  const resolveCashierKey = useCallback((rawId: string): string => {
    if (!rawId) return 'Unknown'
    const clean = rawId.trim()
    if (clean.toLowerCase() === 'owner') return 'owner'

    // 1. Direct match
    if (effectiveKasirList[clean]) return clean

    // 2. Case-insensitive key match
    const caseMatch = Object.keys(effectiveKasirList).find(
      k => k.toLowerCase() === clean.toLowerCase()
    )
    if (caseMatch) return caseMatch

    // 3. Match against account name
    const nameMatch = Object.keys(effectiveKasirList).find(
      k => (effectiveKasirList[k]?.name || '').trim().toLowerCase() === clean.toLowerCase()
    )
    if (nameMatch) return nameMatch

    // 4. Normalized comparison (ignore _, -, spaces)
    const normClean = clean.toLowerCase().replace(/[-_\s]/g, '')
    
    // Store aliases: toko1 or toko-01 -> toko1_01 (Aulia)
    if (normClean === 'toko1' || normClean === 'toko01' || normClean === 'toko101') {
      const auliaKey = Object.keys(effectiveKasirList).find(k => {
        const nk = k.toLowerCase().replace(/[-_\s]/g, '')
        const name = (effectiveKasirList[k]?.name || '').toLowerCase()
        return nk === 'toko101' || nk === 'toko1_01' || name.includes('aulia')
      })
      if (auliaKey) return auliaKey
    }

    if (normClean === 'toko2' || normClean === 'toko02' || normClean === 'toko102') {
      const toko2Key = Object.keys(effectiveKasirList).find(k => {
        const nk = k.toLowerCase().replace(/[-_\s]/g, '')
        return nk === 'toko102' || nk === 'toko201' || nk === 'toko02'
      })
      if (toko2Key) return toko2Key
    }

    // General prefix / contains match
    const prefixMatch = Object.keys(effectiveKasirList).find(k => {
      const nk = k.toLowerCase().replace(/[-_\s]/g, '')
      return nk === normClean || nk.startsWith(normClean) || normClean.startsWith(nk)
    })
    if (prefixMatch) return prefixMatch

    return clean
  }, [effectiveKasirList])

  // Helper mendapatkan Nama Lengkap Kasir (menampilkan nama asli seperti AULIA HESTY daripada username teknis)
  const getKasirDisplayName = useCallback((rawId: string): string => {
    if (!rawId) return 'Kasir'
    if (rawId.toLowerCase() === 'owner') return 'Owner'

    const resolvedKey = resolveCashierKey(rawId)
    const acc = effectiveKasirList[resolvedKey] || effectiveKasirList[rawId]
    
    if (acc?.name && acc.name.trim().length > 0 && acc.name.toLowerCase() !== resolvedKey.toLowerCase()) {
      return acc.name
    }

    const norm = rawId.toLowerCase().replace(/[-_\s]/g, '')
    if (norm === 'toko1' || norm === 'toko01' || norm === 'toko101') {
      return 'AULIA HESTY'
    }
    if (norm === 'toko2' || norm === 'toko02' || norm === 'toko102') {
      return 'toko1_02'
    }

    return acc?.name || rawId
  }, [effectiveKasirList, resolveCashierKey])

  // Date states
  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // State Raw Data dari Supabase transactions
  const [monthlyRawDataMap, setMonthlyRawDataMap] = useState<Map<string, DayKasirStat>>(new Map())
  const [yearlyRawDataMap, setYearlyRawDataMap] = useState<Map<string, DayKasirStat>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [expandedYearMonth, setExpandedYearMonth] = useState<string | null>(null)

  // Helper Kategori
  const isIsiCategory = useCallback((cat: string) => {
    const c = (cat || '').trim().toLowerCase()
    // Saldo real aplikasi bukan setoran modal bank/kasir
    if (c.includes('real aplikasi')) {
      return false
    }
    if (c.includes('pulsa') || c.includes('kuota') || c.includes('token') || c.includes('voucher') || c.includes('paket') || c.includes('data')) {
      return false
    }
    return c === 'isi saldo bank' || c === 'isi modal tunai kasir' || c.includes('isi saldo bank') || c.includes('setor modal') || c.includes('tambah saldo bank') || c.includes('topup saldo') || c.includes('isi modal')
  }, [])

  const isServiceCategory = useCallback((cat: string, ket?: string) => {
    const c = (cat || '').trim().toLowerCase()
    // Murni transaksi penjualan konsumen: kecualikan seluruh riwayat isi saldo, tambah modal, & saldo real aplikasi
    if (
      c.startsWith('isi') ||
      c.includes('isi saldo') ||
      c.includes('isi modal') ||
      c.includes('setor modal') ||
      c.includes('tambah saldo') ||
      c.includes('topup saldo') ||
      c.includes('real aplikasi')
    ) {
      return false
    }
    const k = (ket || '').toUpperCase()
    // Transaksi [KHUSUS] tidak dihitung sebagai layanan konsumen
    if (k.includes('[KHUSUS]')) return false
    return true
  }, [])

  // =========================================================================
  // 1. FETCH DATA BULANAN LANGSUNG DARI TABEL TRANSACTIONS (SUMBER DATA RIIL)
  // =========================================================================
  const fetchMonthlyData = useCallback(async () => {
    if (!props.googleUid) return
    setIsLoading(true)
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

      // ── 1. Prioritaskan Single Source of Truth SQL RPC ──
      const { data: rpcHarian, error: rpcErr } = await fetchLaporanHarianRPC({
        userId: props.googleUid,
        storeId: props.targetStoreId,
        kasirId: filterKasir,
        startDate: startDate,
        endDate: `${selectedMonth}-31`
      })

      if (!rpcErr && rpcHarian && rpcHarian.length > 0) {
        const tmpMap = new Map()
        rpcHarian.forEach(r => {
          const kId = (filterKasir && filterKasir !== 'Semua') ? filterKasir : 'Semua'
          tmpMap.set(`${r.tanggal}_${kId}`, {
            tambahSaldo: Number(r.tambah_saldo || 0),
            omset: Number(r.total_omzet || 0),
            labaAdmin: Number(r.total_laba || 0),
            countTx: Number(r.total_transaksi || 0)
          })
        })
        setMonthlyRawDataMap(tmpMap)
        setIsLoading(false)
        return
      }

      let from = 0
      const step = 1000
      let hasMore = true
      const tmpMap = new Map<string, DayKasirStat>()

      while (hasMore) {
        let query = supabase
          .from('transactions')
          .select('nominal, admin_fee, kategori, keterangan, timestamp, kasir_id')
          .eq('user_id', props.googleUid)
          .gte('timestamp', startDate)
          .lt('timestamp', endDate)
          .range(from, from + step - 1)

        if (props.targetStoreId && props.targetStoreId !== 'all') {
          query = query.eq('store_id', props.targetStoreId)
        }

        const { data: chunk, error } = await query
        if (error) {
          console.error('Error fetchMonthlyData:', error)
          break
        }

        if (chunk && chunk.length > 0) {
          chunk.forEach((t: any) => {
            const dStr = (t.timestamp || '').substring(0, 10)
            const kId = (t.kasir_id || 'Unknown').trim()
            const key = `${dStr}_${kId}`

            if (!tmpMap.has(key)) {
              tmpMap.set(key, { tambahSaldo: 0, omset: 0, labaAdmin: 0, countTx: 0 })
            }
            const cur = tmpMap.get(key)!

            if (isIsiCategory(t.kategori)) {
              cur.tambahSaldo += Number(t.nominal) || 0
            } else if (isServiceCategory(t.kategori, t.keterangan)) {
              cur.countTx += 1
              cur.labaAdmin += Number(t.admin_fee ?? t.adminFee ?? 0)
              if ((t.kategori || '').toLowerCase() !== 'tarik tunai') {
                cur.omset += Number(t.nominal) || 0
              }
            }
          })

          from += step
          if (chunk.length < step) hasMore = false
        } else {
          hasMore = false
        }
        if (from >= 50000) hasMore = false
      }

      setMonthlyRawDataMap(tmpMap)
    } catch (err) {
      console.error('fetchMonthlyData error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [props.googleUid, props.targetStoreId, selectedMonth, isIsiCategory, isServiceCategory])

  // =========================================================================
  // 2. FETCH DATA TAHUNAN LANGSUNG DARI TABEL TRANSACTIONS
  // =========================================================================
  const fetchYearlyData = useCallback(async () => {
    if (!props.googleUid) return
    setIsLoading(true)
    try {
      const year = selectedMonth.split('-')[0]
      const startDate = `${year}-01-01`
      const endDate = `${Number(year) + 1}-01-01`

      // ── 1. Prioritaskan Single Source of Truth SQL RPC Bulanan ──
      const { data: rpcBulanan, error: rpcYearErr } = await fetchLaporanBulananRPC({
        userId: props.googleUid,
        storeId: props.targetStoreId,
        kasirId: filterKasir,
        year: Number(year)
      })

      if (!rpcYearErr && rpcBulanan && rpcBulanan.length > 0) {
        const tmpMap = new Map()
        rpcBulanan.forEach(r => {
          const kId = (filterKasir && filterKasir !== 'Semua') ? filterKasir : 'Semua'
          tmpMap.set(`${r.bulan_key}_${kId}`, {
            tambahSaldo: Number(r.tambah_saldo || 0),
            omset: Number(r.total_omzet || 0),
            labaAdmin: Number(r.total_laba || 0),
            countTx: Number(r.total_transaksi || 0)
          })
        })
        setYearlyRawDataMap(tmpMap)
        setIsLoading(false)
        return
      }

      let from = 0
      const step = 1000
      let hasMore = true
      const tmpMap = new Map<string, DayKasirStat>()

      while (hasMore) {
        let query = supabase
          .from('transactions')
          .select('nominal, admin_fee, kategori, keterangan, timestamp, kasir_id')
          .eq('user_id', props.googleUid)
          .gte('timestamp', startDate)
          .lt('timestamp', endDate)
          .range(from, from + step - 1)

        if (props.targetStoreId && props.targetStoreId !== 'all') {
          query = query.eq('store_id', props.targetStoreId)
        }

        const { data: chunk, error } = await query
        if (error) break

        if (chunk && chunk.length > 0) {
          chunk.forEach((t: any) => {
            const mStr = (t.timestamp || '').substring(0, 7) // YYYY-MM
            const kId = (t.kasir_id || 'Unknown').trim()
            const key = `${mStr}_${kId}`

            if (!tmpMap.has(key)) {
              tmpMap.set(key, { tambahSaldo: 0, omset: 0, labaAdmin: 0, countTx: 0 })
            }
            const cur = tmpMap.get(key)!

            if (isIsiCategory(t.kategori)) {
              cur.tambahSaldo += Number(t.nominal) || 0
            } else if (isServiceCategory(t.kategori, t.keterangan)) {
              cur.countTx += 1
              cur.labaAdmin += Number(t.admin_fee ?? t.adminFee ?? 0)
              if ((t.kategori || '').toLowerCase() !== 'tarik tunai') {
                cur.omset += Number(t.nominal) || 0
              }
            }
          })
          from += step
          if (chunk.length < step) hasMore = false
        } else {
          hasMore = false
        }
        if (from >= 100000) hasMore = false
      }

      setYearlyRawDataMap(tmpMap)
    } catch (err) {
      console.error('fetchYearlyData error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [props.googleUid, props.targetStoreId, selectedMonth, isIsiCategory, isServiceCategory])

  // Trigger fetch saat tab aktif atau bulan berubah
  useEffect(() => {
    if (!props.active || !props.googleUid) return
    if (activeTab === 'tahunan') {
      fetchYearlyData()
    } else {
      fetchMonthlyData()
    }
  }, [props.active, props.googleUid, props.targetStoreId, selectedMonth, activeTab, fetchMonthlyData, fetchYearlyData])

  // =========================================================================
  // 3. KALKULASI DATA HARIAN (TANGGAL 1 s/d AKHIR BULAN)
  // =========================================================================
  const profitBulananData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    let maxDay = daysInMonth
    if (year === today.getFullYear() && month === today.getMonth() + 1) {
      maxDay = today.getDate()
    }

    const map = new Map<string, { tambahSaldo: number; omset: number; labaAdmin: number; totalTx: number }>()

    for (let i = 1; i <= maxDay; i++) {
      const dStr = `${selectedMonth}-${String(i).padStart(2, '0')}`
      map.set(dStr, { tambahSaldo: 0, omset: 0, labaAdmin: 0, totalTx: 0 })
    }

    // 1. Agregasi dari monthlyRawDataMap
    for (const [key, stat] of monthlyRawDataMap.entries()) {
      const [dStr, rawKId] = key.split('_')
      if (!map.has(dStr)) continue
      if (rawKId.toLowerCase() === 'owner') continue

      const resolvedKId = resolveCashierKey(rawKId)
      if (filterKasir !== 'Semua' && resolvedKId !== filterKasir && rawKId !== filterKasir) {
        continue
      }

      const dayItem = map.get(dStr)!
      dayItem.tambahSaldo += stat.tambahSaldo
      dayItem.omset += stat.omset
      dayItem.labaAdmin += stat.labaAdmin
      dayItem.totalTx += stat.countTx
    }

    // 2. Live merge hari ini dari memori props.transactions
    if (year === today.getFullYear() && month === today.getMonth() + 1) {
      const todayItem = map.get(todayStr)
      if (todayItem) {
        let liveTambah = 0
        let liveOmset = 0
        let liveAdmin = 0
        let liveCount = 0

        props.transactions.forEach(t => {
          if (t.timestamp.startsWith(todayStr)) {
            const rawKId = (t.kasir_id || '').trim()
            if (rawKId.toLowerCase() === 'owner') return
            const resolvedKId = resolveCashierKey(rawKId)
            if (filterKasir !== 'Semua' && resolvedKId !== filterKasir && rawKId !== filterKasir) {
              return
            }

            if (isIsiCategory(t.kategori)) {
              liveTambah += Number(t.nominal) || 0
            } else if (isServiceCategory(t.kategori, t.keterangan)) {
              liveCount += 1
              liveAdmin += Number(t.adminFee ?? (t as any).admin_fee ?? 0)
              if ((t.kategori || '').toLowerCase() !== 'tarik tunai') {
                liveOmset += Number(t.nominal) || 0
              }
            }
          }
        })

        if (liveTambah > todayItem.tambahSaldo) todayItem.tambahSaldo = liveTambah
        if (liveOmset > todayItem.omset) todayItem.omset = liveOmset
        if (liveAdmin > todayItem.labaAdmin) todayItem.labaAdmin = liveAdmin
        if (liveCount > todayItem.totalTx) todayItem.totalTx = liveCount
      }
    }

    const arr = Array.from(map.entries())
    if (sortOrder === 'desc') {
      arr.reverse()
    }
    return arr
  }, [monthlyRawDataMap, selectedMonth, filterKasir, props.transactions, todayStr, today, isIsiCategory, isServiceCategory, sortOrder, resolveCashierKey])

  // Total summary bulanan
  const totalBulananSummary = useMemo(() => {
    return profitBulananData.reduce((acc, [_, data]) => {
      acc.tambahSaldo += data.tambahSaldo
      acc.omset += data.omset
      acc.labaAdmin += data.labaAdmin
      acc.totalTx += data.totalTx
      return acc
    }, { tambahSaldo: 0, omset: 0, labaAdmin: 0, totalTx: 0 })
  }, [profitBulananData])

  // =========================================================================
  // 4. LEADERBOARD & PERFORMA MASING-MASING KASIR (TAMPILKAN SEMUA KASIR)
  // =========================================================================
  const kasirLeaderboard = useMemo(() => {
    const kMap = new Map<string, { omset: number; laba: number; tambahSaldo: number; count: number; name: string }>()

    // Daftarkan SEMUA kasir dari effectiveKasirList (exclude owner)
    Object.entries(effectiveKasirList).forEach(([kId, data]: [string, any]) => {
      if (kId.toLowerCase() !== 'owner' && (data?.role || '').toLowerCase() !== 'owner') {
        kMap.set(kId, {
          omset: 0,
          laba: 0,
          tambahSaldo: 0,
          count: 0,
          name: getKasirDisplayName(kId)
        })
      }
    })

    // Agregasi dari monthlyRawDataMap
    for (const [key, stat] of monthlyRawDataMap.entries()) {
      const [_, rawKId] = key.split('_')
      if (!rawKId || rawKId.toLowerCase() === 'owner') continue

      const resolvedKId = resolveCashierKey(rawKId)
      if (!kMap.has(resolvedKId)) {
        kMap.set(resolvedKId, {
          omset: 0,
          laba: 0,
          tambahSaldo: 0,
          count: 0,
          name: getKasirDisplayName(resolvedKId)
        })
      }
      const cur = kMap.get(resolvedKId)!
      cur.omset += stat.omset
      cur.laba += stat.labaAdmin
      cur.count += stat.countTx
      cur.tambahSaldo += stat.tambahSaldo
    }

    // Tampilkan SEMUA kasir terdaftar walaupun penjualan belum lengkap atau masih 0 transaksi
    return Array.from(kMap.entries())
      .filter(([kId]) => kId.toLowerCase() !== 'owner' && (effectiveKasirList[kId]?.role || '').toLowerCase() !== 'owner')
      .sort((a, b) => b[1].laba - a[1].laba || b[1].count - a[1].count)
  }, [monthlyRawDataMap, effectiveKasirList, resolveCashierKey, getKasirDisplayName])

  // =========================================================================
  // 5. DATA TAHUNAN (12 BULAN)
  // =========================================================================
  const yearlySummaryData = useMemo(() => {
    const year = selectedMonth.split('-')[0]
    const result = []

    for (let i = 1; i <= 12; i++) {
      const mStr = `${year}-${String(i).padStart(2, '0')}`
      const mLabel = INDO_MONTHS[i - 1]

      let totalOmset = 0
      let totalLaba = 0
      let totalTambahSaldo = 0
      let totalTx = 0

      for (const [key, stat] of yearlyRawDataMap.entries()) {
        if (key.startsWith(mStr + '_')) {
          const rawKId = key.split('_')[1]
          if (rawKId.toLowerCase() === 'owner') continue
          const resolvedKId = resolveCashierKey(rawKId)
          if (filterKasir !== 'Semua' && resolvedKId !== filterKasir && rawKId !== filterKasir) {
            continue
          }

          totalOmset += stat.omset
          totalLaba += stat.labaAdmin
          totalTambahSaldo += stat.tambahSaldo
          totalTx += stat.countTx
        }
      }

      result.push({
        monthStr: mStr,
        label: mLabel,
        totalOmset,
        totalLaba,
        totalTambahSaldo,
        totalTx
      })
    }
    return result
  }, [yearlyRawDataMap, selectedMonth, filterKasir, resolveCashierKey])

  // PDF Export
  const handleDownloadPDF = () => {
    const pdf = new jsPDF()
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(30, 41, 59)
    pdf.text('LAPORAN PERFORMA TRANSAKSI TOKO', 105, 20, { align: 'center' })

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 116, 139)
    const kasirLabel = filterKasir === 'Semua' ? 'Semua Kasir' : getKasirDisplayName(filterKasir)
    pdf.text(`Periode: ${selectedMonth}   |   Kasir: ${kasirLabel}`, 105, 28, { align: 'center' })

    let y = 42
    pdf.setFillColor(241, 245, 249)
    pdf.rect(15, y - 7, 180, 10, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(71, 85, 105)
    pdf.text('TANGGAL', 20, y)
    pdf.text('JUMLAH TRANSAKSI', 70, y)
    pdf.text('OMSET (Rp)', 135, y, { align: 'right' })
    pdf.text('FEE ADMIN (Rp)', 190, y, { align: 'right' })

    y += 9

    profitBulananData.forEach(([date, data]) => {
      const dayNum = date.split('-')[2]
      if (data.totalTx > 0 || data.omset > 0 || data.labaAdmin > 0) {
        pdf.setTextColor(51, 65, 85)
        pdf.text(dayNum, 20, y)
        pdf.text(`${data.totalTx} Transaksi`, 70, y)
        pdf.text(formatRupiah(data.omset).replace(',00', ''), 135, y, { align: 'right' })
        pdf.setTextColor(16, 185, 129)
        pdf.text(formatRupiah(data.labaAdmin).replace(',00', ''), 190, y, { align: 'right' })

        pdf.setDrawColor(241, 245, 249)
        pdf.line(15, y + 3, 195, y + 3)
        y += 8
        if (y > 275) {
          pdf.addPage()
          y = 20
        }
      }
    })

    y += 4
    pdf.setFillColor(15, 23, 42)
    pdf.rect(15, y - 7, 180, 12, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text('TOTAL BULAN INI', 20, y + 1)
    pdf.text(`${totalBulananSummary.totalTx} Trx`, 70, y + 1)
    pdf.setTextColor(226, 232, 240)
    pdf.text(formatRupiah(totalBulananSummary.omset).replace(',00', ''), 135, y + 1, { align: 'right' })
    pdf.setTextColor(52, 211, 153)
    pdf.text(formatRupiah(totalBulananSummary.labaAdmin).replace(',00', ''), 190, y + 1, { align: 'right' })

    pdf.save(`Performa_Transaksi_${selectedMonth}.pdf`)
  }

  if (!props.active) return null

  // Kasir dropdown options (bersih dari Owner, menampilkan nama asli kasir)
  const kasirOptions = Object.entries(effectiveKasirList)
    .filter(([username, data]: [string, any]) => username.toLowerCase() !== 'owner' && (data?.role || '').toLowerCase() !== 'owner')
    .map(([username, data]: [string, any]) => ({
      username,
      displayName: getKasirDisplayName(username)
    }))

  return (
    <div className={cn("page-view hide-scrollbar bg-slate-50 min-h-screen", props.active && "active")}>
      <GlobalHeader 
        storePhoto={props.storePhoto}
        storeName={props.storeName}
        storeSubtext={props.storeSubtext}
        kasirName={props.kasirName}
        kasirRole={props.kasirRole}
      />

      <div className="max-w-5xl mx-auto px-1 sm:px-5 -mt-8 relative z-10 space-y-3 sm:space-y-4 pb-44">
        
        {/* ================================================================= */}
        {/* TOP CONTROLS CARD: BULAN, KASIR & ACTIONS                         */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-[260px]">
            {/* Periode Bulan */}
            <div className="relative">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Bulan
              </label>
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black rounded-xl pl-3 pr-8 py-2 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                />
                <i className="fa-solid fa-calendar text-[10px] text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
            </div>

            {/* Filter Kasir */}
            <div className="flex-1 min-w-[140px] max-w-[220px]">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Pilih Kasir
              </label>
              <div className="relative">
                <select
                  value={filterKasir}
                  onChange={(e) => setFilterKasir(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black rounded-xl pl-3 pr-8 py-2 outline-none focus:border-emerald-500 cursor-pointer appearance-none shadow-2xs"
                >
                  <option value="Semua">Semua Kasir ({kasirOptions.length} Kasir)</option>
                  {kasirOptions.map(opt => (
                    <option key={opt.username} value={opt.username}>
                      {opt.displayName} ({opt.username})
                    </option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down text-[9px] text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'tahunan') fetchYearlyData()
                else fetchMonthlyData()
              }}
              disabled={isLoading}
              title="Perbarui Data Langsung dari Server"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs"
            >
              <i className={cn("fa-solid fa-rotate", isLoading && "fa-spin text-emerald-600")}></i>
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-rose-500/20 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-file-pdf"></i>
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* HERO KPI CARDS: RESPONSIF HP & TABLET/PC (TIDAK KEPOTONG DI HP)   */}
        {/* ================================================================= */}
        {props.isPc ? (
          /* PC / WIDE LAYOUT (4 Kolom Rapi) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Profit Admin Fee */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-5 text-white shadow-lg shadow-emerald-700/20 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                    Profit Admin Fee Toko
                  </span>
                  <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">
                    Laba Bersih
                  </span>
                </div>
                <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
                  +{formatRupiah(totalBulananSummary.labaAdmin).replace(',00', '')}
                </h2>
              </div>
              <p className="text-[10px] text-emerald-100 font-semibold mt-3 pt-2.5 border-t border-emerald-500/30 flex items-center justify-between">
                <span>Periode {selectedMonth}</span>
                <span>100% Real Transaksi</span>
              </p>
            </div>

            {/* Card 2: Omset Toko */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                    <i className="fa-solid fa-chart-pie text-blue-400 text-[11px]"></i>
                    Total Omset Penjualan
                  </span>
                  <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                    Perputaran
                  </span>
                </div>
                <h2 className="text-xl lg:text-2xl font-black tracking-tight text-white truncate" title={formatRupiah(totalBulananSummary.omset).replace(',00', '')}>
                  {formatRupiah(totalBulananSummary.omset).replace(',00', '')}
                </h2>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between">
                <span>Di Luar Tarik Tunai</span>
                <span className="text-blue-300 font-bold">{totalBulananSummary.totalTx} Trx</span>
              </p>
            </div>

            {/* Card 3: Transaksi Kasir */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <i className="fa-solid fa-receipt text-indigo-500 text-[11px]"></i>
                    Transaksi Kasir
                  </span>
                  <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                    Produktivitas
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-800">
                  {totalBulananSummary.totalTx.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-400">Transaksi</span>
                </h2>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="truncate">{filterKasir === 'Semua' ? 'Gabungan Seluruh Kasir' : getKasirDisplayName(filterKasir)}</span>
                <span className="text-emerald-600 font-bold">Aktif</span>
              </p>
            </div>

            {/* Card 4: Modal Saldo Bank */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 flex items-center gap-1.5">
                    <i className="fa-solid fa-building-columns text-[11px]"></i>
                    Tambah Saldo Bank
                  </span>
                  <button 
                    onClick={() => setShowModalSaldo(prev => !prev)}
                    className="text-[9px] font-bold bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full text-white transition-all cursor-pointer"
                  >
                    {showModalSaldo ? 'Tutup' : 'Lihat'}
                  </button>
                </div>
                <h2 className="text-xl lg:text-2xl font-black tracking-tight text-white">
                  +{formatRupiah(totalBulananSummary.tambahSaldo).replace(',00', '')}
                </h2>
              </div>
              <p className="text-[10px] text-blue-200 font-semibold mt-3 pt-2.5 border-t border-blue-500/40 flex items-center justify-between">
                <span>Setoran Modal Masuk</span>
                <span className="font-bold">Plafon Toko</span>
              </p>
            </div>
          </div>
        ) : (
          /* MOBILE / HP LAYOUT (Tidak Terhimpit / Nyaman Dibaca) */
          <div className="space-y-2.5">
            {/* Card 1: Profit Admin Fee Toko (Hero Card - Full Width) */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-4 text-white shadow-lg shadow-emerald-700/20 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-3 -translate-y-2 opacity-10 pointer-events-none">
                <i className="fa-solid fa-coins text-8xl text-white"></i>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                    Profit Admin Fee Toko
                  </span>
                  <span className="text-[9px] font-bold bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-white">
                    Laba Bersih
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  +{formatRupiah(totalBulananSummary.labaAdmin).replace(',00', '')}
                </h2>
              </div>
              <div className="text-[10px] text-emerald-100 font-semibold mt-2.5 pt-2 border-t border-emerald-500/30 flex items-center justify-between">
                <span>Periode {selectedMonth}</span>
                <span className="text-emerald-200 font-bold">100% Real Transaksi</span>
              </div>
            </div>

            {/* Row 2: 2 Column Grid untuk Omset & Transaksi */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Card 2: Total Omset Penjualan */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-3 text-white shadow-md flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1 mb-1">
                    <i className="fa-solid fa-chart-pie text-blue-400 text-[10px]"></i>
                    Omset Toko
                  </span>
                  <h3 className="text-sm font-black tracking-tight text-white truncate" title={formatRupiah(totalBulananSummary.omset).replace(',00', '')}>
                    {formatRupiah(totalBulananSummary.omset).replace(',00', '')}
                  </h3>
                </div>
                <p className="text-[9px] text-slate-400 font-semibold mt-2 pt-1.5 border-t border-slate-700/60">
                  Di Luar Tarik Tunai
                </p>
              </div>

              {/* Card 3: Total Transaksi Kasir */}
              <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
                    <i className="fa-solid fa-receipt text-indigo-500 text-[10px]"></i>
                    Transaksi Kasir
                  </span>
                  <h3 className="text-sm font-black text-slate-800">
                    {totalBulananSummary.totalTx.toLocaleString('id-ID')} <span className="text-[10px] font-bold text-slate-400">Trx</span>
                  </h3>
                </div>
                <p className="text-[9px] text-slate-400 font-semibold mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="truncate">{filterKasir === 'Semua' ? 'Semua Kasir' : getKasirDisplayName(filterKasir)}</span>
                  <span className="text-emerald-600 font-bold shrink-0 ml-1">Aktif</span>
                </p>
              </div>
            </div>

            {/* Card 4: Modal Saldo Bank (Isi Saldo) */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-3 text-white shadow-md flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs shadow-xs shrink-0">
                  <i className="fa-solid fa-building-columns text-white"></i>
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-200 block">
                    Tambah Saldo Bank (Modal)
                  </span>
                  <h3 className="text-sm font-black text-white truncate">
                    +{formatRupiah(totalBulananSummary.tambahSaldo).replace(',00', '')}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowModalSaldo(prev => !prev)}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition-all flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
              >
                <span>{showModalSaldo ? 'Tutup' : 'Rincian'}</span>
                <i className={cn("fa-solid text-[9px] transition-transform", showModalSaldo ? "fa-chevron-up" : "fa-chevron-down")}></i>
              </button>
            </div>

            {/* Rincian Dropdown Isi Saldo Bank */}
            {showModalSaldo && (
              <div className="bg-white rounded-2xl p-3 border border-blue-100 shadow-sm space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Rincian Pengisian Saldo Modal</span>
                  <span className="text-[9px] font-bold text-slate-400">Total: {formatRupiah(totalBulananSummary.tambahSaldo).replace(',00', '')}</span>
                </div>
                {profitBulananData
                  .filter(([_, d]) => d.tambahSaldo > 0)
                  .map(([date, d]) => (
                    <div key={date} className="flex justify-between items-center py-1.5 px-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-bold text-slate-700">Tanggal {date}</span>
                      <span className="font-black text-blue-600">+{formatRupiah(d.tambahSaldo).replace(',00', '')}</span>
                    </div>
                  ))}
                {profitBulananData.every(([_, d]) => d.tambahSaldo <= 0) && (
                  <p className="text-xs text-slate-400 text-center py-2.5">Belum ada transaksi pengisian modal bank di bulan ini</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB NAVIGATION: SEGMENTED SWITCHER                                */}
        {/* ================================================================= */}
        <div className="bg-slate-200/70 p-1.5 rounded-2xl flex gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('harian')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
              activeTab === 'harian' 
                ? "bg-white text-emerald-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <i className="fa-regular fa-calendar-days"></i>
            <span>Rincian Harian</span>
          </button>

          <button
            onClick={() => setActiveTab('kasir')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
              activeTab === 'kasir' 
                ? "bg-white text-purple-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <i className="fa-solid fa-trophy text-amber-500"></i>
            <span>Kinerja Kasir</span>
          </button>

          <button
            onClick={() => setActiveTab('tahunan')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
              activeTab === 'tahunan' 
                ? "bg-white text-blue-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <i className="fa-solid fa-chart-column"></i>
            <span>Rekap Tahunan</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: RINCIAN HARIAN (TABEL 3 KOLOM BERSIH & TIDAK CAMPUR BAUR)   */}
        {/* ================================================================= */}
        {activeTab === 'harian' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              
              {/* Header Tabel & Sort Toggle */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <span>Laporan Keuntungan Harian</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Otomatis dari catatan transaksi kasir ({selectedMonth})
                  </p>
                </div>

                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all"
                >
                  <i className="fa-solid fa-arrow-down-wide-short text-emerald-600"></i>
                  <span>{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
                </button>
              </div>

              {/* Body Tabel */}
              {isLoading ? (
                <div className="p-16 flex flex-col items-center justify-center text-slate-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-emerald-500"></i>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Memuat Transaksi...</p>
                </div>
              ) : (
                <div className="p-1 sm:p-4 space-y-2">
                  {profitBulananData.map(([date, data]) => {
                    const dateObj = new Date(date)
                    const dayName = !isNaN(dateObj.getTime()) ? INDO_DAYS[dateObj.getDay()] : ''
                    const dayNum = date.split('-')[2]
                    const monthNum = Number(date.split('-')[1])
                    const monthShort = INDO_MONTHS[monthNum - 1]?.substring(0, 3) || ''
                    const isToday = date === todayStr
                    const hasActivity = data.totalTx > 0 || data.labaAdmin > 0 || data.omset > 0 || data.tambahSaldo > 0

                    return (
                      <div 
                        key={date} 
                        className={cn(
                          "p-1.5 sm:p-3 rounded-2xl border transition-all",
                          isToday 
                            ? "bg-white border-emerald-300 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-400/40" 
                            : hasActivity 
                              ? "bg-white border-slate-200/80 shadow-2xs hover:border-slate-300" 
                              : "bg-white/60 border-slate-100 opacity-60 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                          {/* Sisi Kiri: Kolom Tanggal & Hari (Lebih Luas, Hari Minggu Terbaca Full) */}
                          <div className="w-12 sm:w-14 shrink-0 flex flex-col items-center text-center">
                            <div className={cn(
                              "w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-[11px] sm:text-sm shadow-xs",
                              isToday 
                                ? "bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-300" 
                                : hasActivity 
                                  ? "bg-slate-100 text-slate-800 border border-slate-300/80" 
                                  : "bg-slate-50 text-slate-400 border border-slate-200"
                            )}>
                              {dayNum}
                            </div>
                            <div className="mt-0.5 w-full">
                              <p className={cn("text-[9px] sm:text-[10px] font-black whitespace-nowrap leading-tight", isToday ? "text-emerald-700" : hasActivity ? "text-slate-800" : "text-slate-400")}>
                                {dayName}
                              </p>
                              <p className="text-[7.5px] sm:text-[8.5px] font-semibold text-slate-400 leading-tight whitespace-nowrap">
                                {dayNum} {monthShort}
                              </p>
                              {isToday && (
                                <span className="inline-block text-[6px] sm:text-[7px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded-full mt-0.5 shadow-2xs whitespace-nowrap">
                                  HARI INI
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Sisi Kanan: 4 Kotak (Kolom Trx & Laba Sedikit Lebih Ramping Kanan-Kiri) */}
                          <div className="grid grid-cols-[1.12fr_0.88fr] sm:grid-cols-2 gap-1 sm:gap-1.5 flex-1 min-w-0">
                            {/* Kotak 1: Omset Toko (Kiri Atas) */}
                            <div className="bg-slate-50/90 border border-slate-200/80 rounded-lg sm:rounded-xl py-1.5 px-1.5 sm:py-2 sm:px-2.5 flex flex-col justify-between min-w-0 shadow-2xs">
                              <span className="text-[8.5px] sm:text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-0.5 truncate">
                                <i className="fa-solid fa-chart-line text-[7.5px] sm:text-[8.5px] text-blue-500"></i>
                                <span>Omset</span>
                              </span>
                              <p className="text-[10px] sm:text-xs font-black text-slate-800 tracking-tighter leading-tight whitespace-nowrap" title={formatRupiah(data.omset).replace(',00', '')}>
                                {data.omset > 0 ? formatRupiah(data.omset).replace(',00', '') : 'Rp 0'}
                              </p>
                            </div>

                            {/* Kotak 2: Total Transaksi (Kanan Atas) - Dikecilkan Kanan Kiri */}
                            <div className="bg-indigo-50/70 border border-indigo-100/90 rounded-lg sm:rounded-xl py-1.5 px-1 sm:py-2 sm:px-2 flex flex-col justify-between min-w-0 shadow-2xs">
                              <span className="text-[8.5px] sm:text-[9.5px] font-extrabold uppercase tracking-wider text-indigo-500 flex items-center gap-1 mb-0.5 truncate">
                                <i className="fa-solid fa-receipt text-[7.5px] sm:text-[8.5px] text-indigo-500"></i>
                                <span>Transaksi</span>
                              </span>
                              <p className="text-[10px] sm:text-xs font-black text-indigo-950 tracking-tighter leading-tight whitespace-nowrap">
                                {data.totalTx} <span className="text-[8px] sm:text-[9px] font-bold text-indigo-400">Trx</span>
                              </p>
                            </div>

                            {/* Kotak 3: Isi Saldo Modal Bank (Kiri Bawah) */}
                            <div className={cn(
                              "rounded-lg sm:rounded-xl py-1.5 px-1.5 sm:py-2 sm:px-2.5 flex flex-col justify-between min-w-0 border transition-colors shadow-2xs",
                              data.tambahSaldo > 0 
                                ? "bg-blue-50/90 border-blue-200/90" 
                                : "bg-slate-50/50 border-slate-100"
                            )}>
                              <span className={cn(
                                "text-[8.5px] sm:text-[9.5px] font-extrabold uppercase tracking-wider flex items-center gap-1 mb-0.5 truncate",
                                data.tambahSaldo > 0 ? "text-blue-600" : "text-slate-400"
                              )}>
                                <i className="fa-solid fa-building-columns text-[7.5px] sm:text-[8.5px] text-blue-500"></i>
                                <span>Isi Saldo</span>
                              </span>
                              <p className={cn(
                                "text-[10px] sm:text-xs font-black tracking-tighter leading-tight whitespace-nowrap",
                                data.tambahSaldo > 0 ? "text-blue-700" : "text-slate-400"
                              )} title={formatRupiah(data.tambahSaldo).replace(',00', '')}>
                                {data.tambahSaldo > 0 ? `+${formatRupiah(data.tambahSaldo).replace(',00', '')}` : 'Rp 0'}
                              </p>
                            </div>

                            {/* Kotak 4: Laba Bersih Admin (Kanan Bawah) - Dikecilkan Kanan Kiri */}
                            <div className={cn(
                              "rounded-lg sm:rounded-xl py-1.5 px-1 sm:py-2 sm:px-2 flex flex-col justify-between min-w-0 border transition-colors shadow-2xs",
                              data.labaAdmin > 0 
                                ? "bg-emerald-50/90 border-emerald-200/90" 
                                : "bg-slate-50/50 border-slate-100"
                            )}>
                              <span className={cn(
                                "text-[8.5px] sm:text-[9.5px] font-extrabold uppercase tracking-wider flex items-center gap-1 mb-0.5 truncate",
                                data.labaAdmin > 0 ? "text-emerald-700" : "text-slate-400"
                              )}>
                                <i className="fa-solid fa-coins text-[7.5px] sm:text-[8.5px] text-emerald-500"></i>
                                <span>Laba Bersih</span>
                              </span>
                              <p className={cn(
                                "text-[10px] sm:text-xs font-black tracking-tighter leading-tight whitespace-nowrap",
                                data.labaAdmin > 0 ? "text-emerald-600" : "text-slate-400"
                              )} title={formatRupiah(data.labaAdmin).replace(',00', '')}>
                                {data.labaAdmin > 0 ? `+${formatRupiah(data.labaAdmin).replace(',00', '')}` : 'Rp 0'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* KARTU MUTASI MODAL SALDO BANK (DIPISAHKAN AGAR TIDAK BERCAMPUR) */}
            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
              <div 
                onClick={() => setShowModalSaldo(prev => !prev)}
                className="p-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 flex items-center justify-between cursor-pointer hover:opacity-95 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-sm shadow-md shadow-blue-500/20">
                    <i className="fa-solid fa-building-columns"></i>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">
                      Arus Modal Bank (Plafon Toko)
                    </span>
                    <h4 className="text-sm font-black text-slate-800">
                      Total Setoran Saldo: {formatRupiah(totalBulananSummary.tambahSaldo).replace(',00', '')}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">
                    {showModalSaldo ? 'Sembunyikan' : 'Buka Rincian'}
                  </span>
                  <i className={cn("fa-solid text-slate-400 text-xs transition-transform", showModalSaldo ? "fa-chevron-up" : "fa-chevron-down")}></i>
                </div>
              </div>

              {showModalSaldo && (
                <div className="p-4 border-t border-blue-50 space-y-2 max-h-72 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] font-bold text-slate-400 italic mb-2">
                    Rincian pengisian/setoran modal saldo bank dari Owner/Agen untuk operasional kasir:
                  </p>
                  {profitBulananData
                    .filter(([_, d]) => d.tambahSaldo > 0)
                    .map(([date, d]) => (
                      <div key={date} className="flex justify-between items-center py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-700">Tanggal {date}</span>
                        <span className="font-black text-blue-600">+{formatRupiah(d.tambahSaldo).replace(',00', '')}</span>
                      </div>
                    ))}
                  {profitBulananData.every(([_, d]) => d.tambahSaldo <= 0) && (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada transaksi pengisian modal bank di bulan ini</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: KINERJA & RANKING KASIR (LEADERBOARD BERSIH DARI OWNER)    */}
        {/* ================================================================= */}
        {activeTab === 'kasir' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <span>Ranking Produktivitas Kasir</span>
                    <i className="fa-solid fa-medal text-amber-500"></i>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Diurutkan berdasarkan kontribusi keuntungan Admin Fee toko ({selectedMonth})
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black uppercase">
                  {kasirLeaderboard.length} Kasir Aktif
                </span>
              </div>

              {kasirLeaderboard.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <i className="fa-solid fa-users-slash text-3xl mb-2 text-slate-300"></i>
                  <p className="text-xs font-black uppercase tracking-wider">Belum Ada Transaksi Kasir di Bulan Ini</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {kasirLeaderboard.map(([kId, data], idx) => {
                    const displayName = data.name || getKasirDisplayName(kId)
                    const totalProfit = totalBulananSummary.labaAdmin || 1
                    const percent = data.laba > 0 ? Math.min(100, Math.round((data.laba / totalProfit) * 100)) : 0
                    const hasSales = data.count > 0 || data.omset > 0 || data.laba > 0

                    return (
                      <div 
                        key={kId} 
                        className={cn(
                          "p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2.5",
                          hasSales 
                            ? "bg-slate-50/80 border-slate-100 hover:border-purple-200 hover:bg-purple-50/20" 
                            : "bg-white border-slate-100 opacity-75"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-xs",
                              hasSales && idx === 0 ? "bg-amber-100 text-amber-700 border border-amber-300" :
                              hasSales && idx === 1 ? "bg-slate-200 text-slate-700 border border-slate-300" :
                              hasSales && idx === 2 ? "bg-orange-100 text-orange-700 border border-orange-300" :
                              "bg-slate-100 text-slate-500"
                            )}>
                              {hasSales ? (idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1) : '-'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide truncate">
                                {displayName}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-semibold truncate">
                                User: <span className="font-mono text-slate-600 font-bold">{kId}</span> • {data.count} Transaksi
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={cn(
                              "text-xs sm:text-sm font-black block tracking-tight",
                              data.laba > 0 ? "text-emerald-600" : "text-slate-400"
                            )}>
                              {data.laba > 0 ? `+${formatRupiah(data.laba).replace(',00', '')}` : 'Rp 0'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              {hasSales ? `Kontribusi ${percent}%` : 'Belum Ada Penjualan'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar Kontribusi */}
                        <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              percent > 0 ? "bg-emerald-500" : "bg-transparent"
                            )}
                            style={{ width: `${Math.max(percent, percent > 0 ? 3 : 0)}%` }}
                          ></div>
                        </div>

                        {/* Detail Kaki Card */}
                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-200/50">
                          <span>Omset: <strong className="text-slate-700">{formatRupiah(data.omset).replace(',00', '')}</strong></span>
                          <button
                            onClick={() => {
                              setFilterKasir(kId)
                              setActiveTab('harian')
                            }}
                            className="text-purple-600 hover:text-purple-700 font-black flex items-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <span>Lihat Rincian Harian</span>
                            <i className="fa-solid fa-arrow-right text-[8px]"></i>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: REKAP TAHUNAN (12 BULAN LENGKAP)                            */}
        {/* ================================================================= */}
        {activeTab === 'tahunan' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <span>Rekapitulasi Transaksi Tahunan</span>
                    <i className="fa-solid fa-chart-line text-blue-500"></i>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Ringkasan performa 12 bulan di tahun {selectedMonth.split('-')[0]}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase">
                  Tahun {selectedMonth.split('-')[0]}
                </span>
              </div>

              {isLoading ? (
                <div className="p-16 flex flex-col items-center justify-center text-slate-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-blue-500"></i>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Memuat Rekap Tahunan...</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {yearlySummaryData.map((m) => {
                    const isSelected = m.monthStr === selectedMonth
                    const hasData = m.totalTx > 0 || m.totalLaba > 0 || m.totalOmset > 0

                    return (
                      <div 
                        key={m.monthStr}
                        onClick={() => {
                          setSelectedMonth(m.monthStr)
                          setActiveTab('harian')
                        }}
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center",
                          isSelected 
                            ? "bg-blue-50/50 border-blue-200 shadow-xs" 
                            : hasData 
                              ? "bg-slate-50/80 border-slate-100 hover:bg-slate-100/80" 
                              : "bg-white border-slate-100 opacity-40 hover:opacity-100"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-black", isSelected ? "text-blue-700" : "text-slate-800")}>
                              {m.label}
                            </span>
                            {hasData && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                                {m.totalTx} Trx
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            Omset: {formatRupiah(m.totalOmset).replace(',00', '')}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className={cn("text-xs sm:text-sm font-black block", hasData ? "text-emerald-600" : "text-slate-300")}>
                            +{formatRupiah(m.totalLaba).replace(',00', '')}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 flex items-center justify-end gap-1">
                            <span>Buka Bulan</span>
                            <i className="fa-solid fa-chevron-right text-[8px]"></i>
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default PerformaKasirView
