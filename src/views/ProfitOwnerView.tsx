import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { formatRupiah, cn, getLocalDateString } from '../lib/utils';
import type { Transaction } from '../types';
import { supabase } from '../lib/supabase';
import { fetchLaporanHarianRPC, fetchLaporanBulananRPC } from '../lib/laporanService';

interface ProfitOwnerViewProps {
  transactions: Transaction[];
  allTransactions?: Transaction[];
  kasirList?: Record<string, any>;
  filterKasir?: string;
  setFilterKasir?: (kasirId: string) => void;
  activeStoreId?: string;
  pantauStoreId?: string;
  userId?: string;
  showToast?: (msg: string) => void;
  isPc?: boolean;
}

interface DayProfitData {
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  dayName: string;
  totalAdmin: number;
  adminTunai: number;
  adminNonTunai: number;
  totalTrx: number;
  totalOmzet: number;
}

interface MonthProfitData {
  monthKey: string; // YYYY-MM
  monthNum: number; // 1-12
  monthLabel: string;
  year: number;
  totalAdmin: number;
  adminTunai: number;
  adminNonTunai: number;
  totalTrx: number;
  totalOmzet: number;
  bestDay?: { dateStr: string; totalAdmin: number };
}

interface MonthKPIType {
  totalAdmin: number;
  totalTunai: number;
  totalNonTunai: number;
  totalTrx: number;
  totalOmzet: number;
  avgPerDay: number;
  bestDay: DayProfitData | null;
  activeDaysCount: number;
}

interface YearKPIType {
  totalAdmin: number;
  totalTunai: number;
  totalNonTunai: number;
  totalTrx: number;
  totalOmzet: number;
  avgPerMonth: number;
  bestMonth: MonthProfitData | null;
  activeMonths: number;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const ProfitOwnerView: React.FC<ProfitOwnerViewProps> = ({
  transactions,
  allTransactions,
  kasirList = {},
  filterKasir = 'Semua',
  setFilterKasir,
  activeStoreId,
  pantauStoreId,
  userId,
  showToast,
  isPc = false
}) => {
  // Navigation sub-views: 'bulan' (1-31), 'tahun' (Jan-Des), 'thebest' (Rekor)
  const [activeTab, setActiveTab] = useState<'bulan' | 'tahun' | 'thebest'>('bulan');

  // Date selection states
  const today = useMemo(() => new Date(), []);
  const currentYearNum = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1; // 1-12

  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [drillDownFromYear, setDrillDownFromYear] = useState(false);

  const monthKeySelected = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const daysInSelectedMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Sorting for daily view: default tanggal terbaru di atas, dan default tampilkan yang ada laba
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [filterOnlyActiveDays, setFilterOnlyActiveDays] = useState<boolean>(true);

  // Sorting & Filtering for annual/monthly view: default bulan berjalan di atas, awal tahun di bawah
  const [sortYearAsc, setSortYearAsc] = useState<boolean>(false);
  const [filterYearMode, setFilterYearMode] = useState<'berjalan' | 'active' | 'all'>('berjalan');

  // Cloud sync status
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Detail Modal for a specific day
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayProfitData | null>(null);

  // Target Store ID
  const effectiveStoreId = (pantauStoreId && pantauStoreId !== 'all')
    ? pantauStoreId
    : (activeStoreId && activeStoreId !== 'all' ? activeStoreId : 'all');

  // Pre-aggregated states from SQL database (Instan 0.1s, tidak tarik ribuan transaksi)
  const [sqlDailyMap, setSqlDailyMap] = useState<Record<string, any>>({});
  const [sqlMonthlyMap, setSqlMonthlyMap] = useState<Record<string, any>>({});
  const [isLoadedFromSQL, setIsLoadedFromSQL] = useState<boolean>(false);
  const [isLoadingSQL, setIsLoadingSQL] = useState<boolean>(false);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);

  // Remote transactions fetched from Supabase (hanya jika SQL belum terisi / fallback)
  const [remoteTransactions, setRemoteTransactions] = useState<Transaction[]>([]);
  const [isFetchingRemote, setIsFetchingRemote] = useState<boolean>(false);

  // Fetch older transactions for the selected year from Supabase with pagination (FALLBACK ONLY)
  const fetchTransactionsForYear = useCallback(async (year: number) => {
    setIsFetchingRemote(true);
    try {
      let uid = userId;
      if (!uid) {
        const { data: authData } = await supabase.auth.getUser();
        uid = authData.user?.id || '';
      }

      const startStr = `${year}-01-01T00:00:00`;
      const endStr = `${year}-12-31T23:59:59`;

      let allRawData: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('transactions')
          .select('id, kasir_id, nominal, admin_fee, timestamp, kategori, store_id, keterangan')
          .gte('timestamp', startStr)
          .lte('timestamp', endStr)
          .order('timestamp', { ascending: false })
          .range(from, from + step - 1);

        if (uid) {
          query = query.eq('user_id', uid);
        }

        if (effectiveStoreId !== 'all') {
          query = query.eq('store_id', effectiveStoreId);
        }

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allRawData.push(...data);
          from += step;
          if (data.length < step) hasMore = false;
        }

        if (from >= 40000) hasMore = false; // Cap at 40k records
      }

      if (allRawData.length > 0) {
        const formatted: Transaction[] = allRawData.map(r => ({
          id: r.id,
          kategori: r.kategori,
          nominal: Number(r.nominal || 0),
          adminFee: Number(r.admin_fee ?? (r as any).adminFee ?? 0),
          keterangan: r.keterangan || '',
          timestamp: r.timestamp,
          kasir_id: r.kasir_id,
          store_id: r.store_id
        }));
        setRemoteTransactions(formatted);
      }
    } catch (e) {
      console.warn('Gagal mengambil riwayat transaksi dari Supabase:', e);
    } finally {
      setIsFetchingRemote(false);
    }
  }, [userId, effectiveStoreId]);

  // Fetch dari database SQL pre-aggregated: profit_harian & profit_bulanan (< 31 baris, instan!)
  const fetchSQLProfitData = useCallback(async () => {
    setIsLoadingSQL(true);
    try {
      let uid = userId;
      if (!uid) {
        const { data: authData } = await supabase.auth.getUser();
        uid = authData.user?.id || '';
      }

      const startMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(daysInSelectedMonth).padStart(2, '0')}`;
      const kasirTarget = (filterKasir && filterKasir !== 'Semua') ? filterKasir : 'Semua';

      // ── 1. Prioritaskan Single Source of Truth SQL RPC ──
      const [resHarianRPC, resBulananRPC] = await Promise.all([
        fetchLaporanHarianRPC({
          userId: uid,
          storeId: effectiveStoreId,
          kasirId: kasirTarget,
          startDate: startMonthStr,
          endDate: endMonthStr
        }),
        fetchLaporanBulananRPC({
          userId: uid,
          storeId: effectiveStoreId,
          kasirId: kasirTarget,
          year: selectedYear
        })
      ]);

      if (!resHarianRPC.error && resHarianRPC.data && resHarianRPC.data.length > 0) {
        const dMap: Record<string, any> = {};
        resHarianRPC.data.forEach(r => {
          dMap[r.tanggal] = {
            tanggal: r.tanggal,
            total_profit_admin: Number(r.total_laba || 0),
            admin_tunai: Number(r.laba_tunai || 0),
            admin_non_tunai: Number(r.laba_non_tunai || 0),
            total_transaksi: Number(r.total_transaksi || 0),
            total_omzet: Number(r.total_omzet || 0)
          };
        });
        setSqlDailyMap(dMap);
        setIsLoadedFromSQL(true);

        if (!resBulananRPC.error && resBulananRPC.data && resBulananRPC.data.length > 0) {
          const mMap: Record<string, any> = {};
          resBulananRPC.data.forEach(r => {
            mMap[r.bulan_key] = {
              bulan: r.bulan_key,
              total_profit_admin: Number(r.total_laba || 0),
              admin_tunai: Number(r.laba_tunai || 0),
              admin_non_tunai: Number(r.laba_non_tunai || 0),
              total_transaksi: Number(r.total_transaksi || 0),
              total_omzet: Number(r.total_omzet || 0),
              hari_terbaik_tanggal: r.hari_terbaik_tanggal,
              hari_terbaik_profit: Number(r.hari_terbaik_laba || 0)
            };
          });
          setSqlMonthlyMap(mMap);
        }
        return;
      }

      // 1. Fetch Harian (Maksimal 31 baris data)
      let queryHarian = supabase
        .from('profit_harian')
        .select('*')
        .gte('tanggal', startMonthStr)
        .lte('tanggal', endMonthStr);

      if (uid) queryHarian = queryHarian.eq('user_id', uid);
      if (effectiveStoreId !== 'all') queryHarian = queryHarian.eq('store_id', effectiveStoreId);
      queryHarian = queryHarian.eq('kasir_id', kasirTarget);

      // 2. Fetch Bulanan (Maksimal 12 baris data untuk rekap setahun)
      let queryBulanan = supabase
        .from('profit_bulanan')
        .select('*')
        .eq('tahun', selectedYear);

      if (uid) queryBulanan = queryBulanan.eq('user_id', uid);
      if (effectiveStoreId !== 'all') queryBulanan = queryBulanan.eq('store_id', effectiveStoreId);
      queryBulanan = queryBulanan.eq('kasir_id', kasirTarget);

      const [resHarian, resBulanan] = await Promise.all([queryHarian, queryBulanan]);

      let hasSQLData = false;
      const uniqueHarianDates = new Set((resHarian.data || []).map((r: any) => r.tanggal)).size;
      if (!resHarian.error && resHarian.data && uniqueHarianDates >= 5) {
        const dMap: Record<string, any> = {};
        resHarian.data.forEach((r: any) => {
          if (!dMap[r.tanggal]) {
            dMap[r.tanggal] = { ...r };
          } else {
            dMap[r.tanggal].total_profit_admin = Number(dMap[r.tanggal].total_profit_admin || 0) + Number(r.total_profit_admin || 0);
            dMap[r.tanggal].admin_tunai = Number(dMap[r.tanggal].admin_tunai || 0) + Number(r.admin_tunai || 0);
            dMap[r.tanggal].admin_non_tunai = Number(dMap[r.tanggal].admin_non_tunai || 0) + Number(r.admin_non_tunai || 0);
            dMap[r.tanggal].total_transaksi = Number(dMap[r.tanggal].total_transaksi || 0) + Number(r.total_transaksi || 0);
            dMap[r.tanggal].total_omzet = Number(dMap[r.tanggal].total_omzet || 0) + Number(r.total_omzet || 0);
          }
        });
        setSqlDailyMap(dMap);
        hasSQLData = true;
      } else {
        setSqlDailyMap({});
      }

      if (!resBulanan.error && resBulanan.data && resBulanan.data.length > 0) {
        const mMap: Record<string, any> = {};
        resBulanan.data.forEach((r: any) => {
          if (!mMap[r.bulan]) {
            mMap[r.bulan] = { ...r };
          } else {
            mMap[r.bulan].total_profit_admin = Number(mMap[r.bulan].total_profit_admin || 0) + Number(r.total_profit_admin || 0);
            mMap[r.bulan].admin_tunai = Number(mMap[r.bulan].admin_tunai || 0) + Number(r.admin_tunai || 0);
            mMap[r.bulan].admin_non_tunai = Number(mMap[r.bulan].admin_non_tunai || 0) + Number(r.admin_non_tunai || 0);
            mMap[r.bulan].total_transaksi = Number(mMap[r.bulan].total_transaksi || 0) + Number(r.total_transaksi || 0);
            mMap[r.bulan].total_omzet = Number(mMap[r.bulan].total_omzet || 0) + Number(r.total_omzet || 0);
          }
        });
        setSqlMonthlyMap(mMap);
        hasSQLData = true;
      } else {
        setSqlMonthlyMap({});
      }

      setIsLoadedFromSQL(hasSQLData);

      // Hanya panggil fetch data transaksi mentah jika tabel SQL belum terisi
      if (!hasSQLData) {
        fetchTransactionsForYear(selectedYear);
      }
    } catch (err) {
      console.warn('Gagal memuat profit dari SQL, beralih ke fallback transaksi:', err);
      setIsLoadedFromSQL(false);
      fetchTransactionsForYear(selectedYear);
    } finally {
      setIsLoadingSQL(false);
    }
  }, [userId, selectedYear, selectedMonth, daysInSelectedMonth, effectiveStoreId, filterKasir, fetchTransactionsForYear]);

  useEffect(() => {
    fetchSQLProfitData();

    // Subscribe ke realtime changes pada tabel profit_harian
    const channel = supabase
      .channel('profit_owner_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profit_harian' },
        () => {
          fetchSQLProfitData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSQLProfitData]);

  // Combined transactions pool: local props + remote fetched
  const allTxPool = useMemo(() => {
    const map = new Map<string, Transaction>();
    // 1. Add remote transactions
    remoteTransactions.forEach(t => {
      if (t.id) map.set(t.id, t);
    });
    // 2. Add props.allTransactions or props.transactions
    const local = allTransactions && allTransactions.length > 0 ? allTransactions : transactions;
    local.forEach(t => {
      if (t.id) map.set(t.id, t);
    });
    return Array.from(map.values());
  }, [remoteTransactions, allTransactions, transactions]);

  // Filter valid transactions:
  // - Exclude pure capital injections (Isi Saldo, Isi Modal, etc.)
  // - Filter by store
  // - Filter by cashier (Default 'Semua' = gabungan semua kasir)
  const filteredTransactions = useMemo(() => {
    return allTxPool.filter(t => {
      if (!t || !t.timestamp) return false;

      // Exclude non-transaction entries (Isi Modal, Isi Saldo Bank, Saldo Real Aplikasi, etc.)
      const kat = (t.kategori || '').toLowerCase();
      if (
        kat.startsWith('isi') ||
        kat.includes('isi saldo') ||
        kat.includes('isi modal') ||
        kat.includes('setor modal') ||
        kat.includes('tambah saldo') ||
        kat.includes('topup saldo') ||
        kat.includes('real aplikasi')
      ) {
        return false;
      }

      // Filter Toko
      if (effectiveStoreId !== 'all' && t.store_id && t.store_id !== effectiveStoreId) {
        return false;
      }

      // Filter Kasir (Default: Semua Kasir)
      if (filterKasir && filterKasir !== 'Semua' && t.kasir_id !== filterKasir) {
        return false;
      }

      return true;
    });
  }, [allTxPool, effectiveStoreId, filterKasir]);

  // =========================================================================
  // 1. DATA HARIAN BULAN BERJALAN (1 s/d 31)
  // =========================================================================
  const dailyProfitList = useMemo<DayProfitData[]>(() => {
    // Map of day number to data
    const dayMap = new Map<number, DayProfitData>();

    // Initialize all days 1 to daysInSelectedMonth
    for (let d = 1; d <= daysInSelectedMonth; d++) {
      const dateStr = `${monthKeySelected}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(selectedYear, selectedMonth - 1, d);
      const dayName = DAY_NAMES[dateObj.getDay()];

      if (isLoadedFromSQL && sqlDailyMap[dateStr]) {
        const sqlRow = sqlDailyMap[dateStr];
        dayMap.set(d, {
          dateStr,
          dayNum: d,
          dayName,
          totalAdmin: Number(sqlRow.total_profit_admin || 0),
          adminTunai: Number(sqlRow.admin_tunai || 0),
          adminNonTunai: Number(sqlRow.admin_non_tunai || 0),
          totalTrx: Number(sqlRow.total_transaksi || 0),
          totalOmzet: Number(sqlRow.total_omzet || 0)
        });
      } else {
        dayMap.set(d, {
          dateStr,
          dayNum: d,
          dayName,
          totalAdmin: 0,
          adminTunai: 0,
          adminNonTunai: 0,
          totalTrx: 0,
          totalOmzet: 0
        });
      }
    }

    // Jika belum ada di SQL, hitung dari data transaksi mentah (fallback)
    if (!isLoadedFromSQL) {
      filteredTransactions.forEach(t => {
        const tDate = t.timestamp.substring(0, 10);
        if (tDate.startsWith(monthKeySelected)) {
          const dNum = parseInt(tDate.substring(8, 10), 10);
          const item = dayMap.get(dNum);
          if (item) {
            const fee = Number(t.adminFee || (t as any).admin_fee || 0);
            const nominal = Number(t.nominal || 0);
            const isNonTunai = (t.keterangan || '').includes('[NON_TUNAI]') || (t.keterangan || '').includes('[ADMIN_DALAM]');

            item.totalAdmin += fee;
            if (isNonTunai) {
              item.adminNonTunai += fee;
            } else {
              item.adminTunai += fee;
            }
            item.totalTrx += 1;
            item.totalOmzet += nominal;
          }
        }
      });
    }

    const result = Array.from(dayMap.values());
    return sortAsc ? result : [...result].reverse();
  }, [daysInSelectedMonth, monthKeySelected, selectedYear, selectedMonth, isLoadedFromSQL, sqlDailyMap, filteredTransactions, sortAsc]);

  const displayedDailyProfitList = useMemo(() => {
    if (filterOnlyActiveDays) {
      return dailyProfitList.filter(d => d.totalAdmin > 0);
    }
    return dailyProfitList;
  }, [dailyProfitList, filterOnlyActiveDays]);

  // Daily Summary Stats (Month KPI)
  const monthKPI = useMemo<MonthKPIType>(() => {
    let totalAdmin = 0;
    let totalTunai = 0;
    let totalNonTunai = 0;
    let totalTrx = 0;
    let totalOmzet = 0;
    let bestDay: DayProfitData | null = null;
    let activeDaysCount = 0;

    dailyProfitList.forEach(d => {
      totalAdmin += d.totalAdmin;
      totalTunai += d.adminTunai;
      totalNonTunai += d.adminNonTunai;
      totalTrx += d.totalTrx;
      totalOmzet += d.totalOmzet;

      if (d.totalAdmin > 0 || d.totalTrx > 0) {
        activeDaysCount += 1;
      }
      if (!bestDay || d.totalAdmin > bestDay.totalAdmin) {
        bestDay = d;
      }
    });

    const todayDateStr = getLocalDateString();
    const passedDaysInCurrentMonth = todayDateStr.startsWith(monthKeySelected)
      ? parseInt(todayDateStr.substring(8, 10), 10)
      : daysInSelectedMonth;

    const divisor = passedDaysInCurrentMonth > 0 ? passedDaysInCurrentMonth : 1;
    const avgPerDay = Math.round(totalAdmin / divisor);
    const finalBestDay: DayProfitData | null = (bestDay && (bestDay as DayProfitData).totalAdmin > 0) ? bestDay : null;

    return {
      totalAdmin,
      totalTunai,
      totalNonTunai,
      totalTrx,
      totalOmzet,
      avgPerDay,
      bestDay: finalBestDay,
      activeDaysCount
    };
  }, [dailyProfitList, daysInSelectedMonth, monthKeySelected]);

  // Highest daily admin fee for progress-bar scaling
  const maxDayAdmin = useMemo(() => {
    return Math.max(...dailyProfitList.map(d => d.totalAdmin), 1);
  }, [dailyProfitList]);

  // =========================================================================
  // 2. DATA REKAP TAHUNAN (Januari s/d Desember)
  // =========================================================================
  const yearProfitList = useMemo<MonthProfitData[]>(() => {
    return MONTH_NAMES.map((name, idx) => {
      const mNum = idx + 1;
      const mKey = `${selectedYear}-${String(mNum).padStart(2, '0')}`;

      // 1. Jika data sudah ada di SQL pre-aggregated (profit_bulanan), langsung pakai instan!
      if (isLoadedFromSQL && sqlMonthlyMap[mKey]) {
        const sqlRow = sqlMonthlyMap[mKey];
        return {
          monthKey: mKey,
          monthNum: mNum,
          monthLabel: `${name} ${selectedYear}`,
          year: selectedYear,
          totalAdmin: Number(sqlRow.total_profit_admin || 0),
          adminTunai: Number(sqlRow.admin_tunai || 0),
          adminNonTunai: Number(sqlRow.admin_non_tunai || 0),
          totalTrx: Number(sqlRow.total_transaksi || 0),
          totalOmzet: Number(sqlRow.total_omzet || 0),
          bestDay: sqlRow.hari_terbaik_tanggal ? {
            dateStr: sqlRow.hari_terbaik_tanggal,
            totalAdmin: Number(sqlRow.hari_terbaik_profit || 0)
          } : undefined
        };
      }

      // 2. Fallback hitung di client
      let totalAdmin = 0;
      let adminTunai = 0;
      let adminNonTunai = 0;
      let totalTrx = 0;
      let totalOmzet = 0;

      const dayFeeMap: Record<string, number> = {};

      filteredTransactions.forEach(t => {
        const tDate = t.timestamp.substring(0, 10);
        if (tDate.startsWith(mKey)) {
          const fee = Number(t.adminFee || (t as any).admin_fee || 0);
          const nominal = Number(t.nominal || 0);
          const isNonTunai = (t.keterangan || '').includes('[NON_TUNAI]') || (t.keterangan || '').includes('[ADMIN_DALAM]');

          totalAdmin += fee;
          if (isNonTunai) {
            adminNonTunai += fee;
          } else {
            adminTunai += fee;
          }
          totalTrx += 1;
          totalOmzet += nominal;

          dayFeeMap[tDate] = (dayFeeMap[tDate] || 0) + fee;
        }
      });

      let bestDay: { dateStr: string; totalAdmin: number } | undefined = undefined;
      let maxFee = 0;
      Object.entries(dayFeeMap).forEach(([dateStr, fee]) => {
        if (fee > maxFee) {
          maxFee = fee;
          bestDay = { dateStr, totalAdmin: fee };
        }
      });

      return {
        monthKey: mKey,
        monthNum: mNum,
        monthLabel: `${name} ${selectedYear}`,
        year: selectedYear,
        totalAdmin,
        adminTunai,
        adminNonTunai,
        totalTrx,
        totalOmzet,
        bestDay
      };
    });
  }, [selectedYear, isLoadedFromSQL, sqlMonthlyMap, filteredTransactions]);

  // Filtered & Sorted Monthly Profit List for Year View
  const displayedYearProfitList = useMemo(() => {
    let list = yearProfitList;

    // Filter berdasarkan mode
    if (filterYearMode === 'berjalan' && selectedYear === currentYearNum) {
      list = list.filter(m => m.monthNum <= currentMonthNum);
    } else if (filterYearMode === 'active') {
      list = list.filter(m => m.totalAdmin > 0);
    }

    // Urutan: default sortYearAsc = false (Bulan terbaru/berjalan di paling atas, awal tahun di paling bawah)
    return sortYearAsc ? list : [...list].reverse();
  }, [yearProfitList, filterYearMode, selectedYear, currentYearNum, currentMonthNum, sortYearAsc]);

  const yearKPI = useMemo<YearKPIType>(() => {
    let totalAdmin = 0;
    let totalTunai = 0;
    let totalNonTunai = 0;
    let totalTrx = 0;
    let totalOmzet = 0;
    let bestMonth: MonthProfitData | null = null;
    let activeMonths = 0;

    yearProfitList.forEach(m => {
      totalAdmin += m.totalAdmin;
      totalTunai += m.adminTunai;
      totalNonTunai += m.adminNonTunai;
      totalTrx += m.totalTrx;
      totalOmzet += m.totalOmzet;
      if (m.totalAdmin > 0) activeMonths += 1;
      if (!bestMonth || m.totalAdmin > bestMonth.totalAdmin) {
        bestMonth = m;
      }
    });

    const avgPerMonth = activeMonths > 0 ? Math.round(totalAdmin / activeMonths) : 0;
    const finalBestMonth: MonthProfitData | null = (bestMonth && (bestMonth as MonthProfitData).totalAdmin > 0) ? bestMonth : null;
    return {
      totalAdmin,
      totalTunai,
      totalNonTunai,
      totalTrx,
      totalOmzet,
      avgPerMonth,
      bestMonth: finalBestMonth,
      activeMonths
    };
  }, [yearProfitList]);

  const maxMonthAdmin = useMemo(() => {
    return Math.max(...yearProfitList.map(m => m.totalAdmin), 1);
  }, [yearProfitList]);

  // =========================================================================
  // 3. THE BEST (REKOR PENJUALAN & PROFIT ADMIN FEE)
  // =========================================================================
  const theBestRecords = useMemo(() => {
    // 1. Group by Month across ALL transactions
    const monthMap: Record<string, { label: string; year: number; admin: number; trx: number; omzet: number }> = {};
    // 2. Group by Year
    const yearMap: Record<number, { year: number; admin: number; trx: number; omzet: number }> = {};
    // 3. Group by Day
    const dayMap: Record<string, { dateStr: string; admin: number; trx: number; omzet: number }> = {};
    // 4. Group by Kasir
    const kasirMap: Record<string, { kasirId: string; name: string; admin: number; trx: number; omzet: number }> = {};

    filteredTransactions.forEach(t => {
      const fee = Number(t.adminFee || (t as any).admin_fee || 0);
      const nominal = Number(t.nominal || 0);
      const tDate = t.timestamp.substring(0, 10);
      if (!tDate || tDate.length < 10) return;

      const [yStr, mStr] = tDate.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const mKey = `${yStr}-${mStr}`;

      // Month aggregate
      if (!monthMap[mKey]) {
        const mLabel = `${MONTH_NAMES[m - 1] || 'Bulan'} ${y}`;
        monthMap[mKey] = { label: mLabel, year: y, admin: 0, trx: 0, omzet: 0 };
      }
      monthMap[mKey].admin += fee;
      monthMap[mKey].trx += 1;
      monthMap[mKey].omzet += nominal;

      // Year aggregate
      if (!yearMap[y]) {
        yearMap[y] = { year: y, admin: 0, trx: 0, omzet: 0 };
      }
      yearMap[y].admin += fee;
      yearMap[y].trx += 1;
      yearMap[y].omzet += nominal;

      // Day aggregate
      if (!dayMap[tDate]) {
        dayMap[tDate] = { dateStr: tDate, admin: 0, trx: 0, omzet: 0 };
      }
      dayMap[tDate].admin += fee;
      dayMap[tDate].trx += 1;
      dayMap[tDate].omzet += nominal;

      // Kasir aggregate
      const kId = t.kasir_id || 'Unknown';
      const kName = kasirList[kId]?.name || kId;
      if (!kasirMap[kId]) {
        kasirMap[kId] = { kasirId: kId, name: kName, admin: 0, trx: 0, omzet: 0 };
      }
      kasirMap[kId].admin += fee;
      kasirMap[kId].trx += 1;
      kasirMap[kId].omzet += nominal;
    });

    const topMonths = Object.values(monthMap)
      .sort((a, b) => b.admin - a.admin)
      .slice(0, 5);

    const topYears = Object.values(yearMap)
      .sort((a, b) => b.admin - a.admin);

    const topDays = Object.values(dayMap)
      .sort((a, b) => b.admin - a.admin)
      .slice(0, 5);

    const topKasirs = Object.values(kasirMap)
      .sort((a, b) => b.admin - a.admin);

    return {
      topMonths,
      topYears,
      topDays,
      topKasirs
    };
  }, [filteredTransactions, kasirList]);

  // =========================================================================
  // 4. SINKRONISASI DATA PROFIT KE SUPABASE SECARA ONLINE
  // =========================================================================
  // AUTOMATIC SYNC TO ONLINE SUPABASE CLOUD (BERJALAN DI LATAR BELAKANG)
  // =========================================================================
  // 4. SINKRONISASI DATA PROFIT KE SUPABASE SECARA ONLINE
  // =========================================================================
  const handleSyncToOnlineCloud = async (silent = true) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      let uid = userId;
      if (!uid) {
        const { data: authData } = await supabase.auth.getUser();
        uid = authData.user?.id || '';
      }

      // 1. Prepare Daily Summaries for Current Month
      const dailyRows = dailyProfitList
        .filter(d => d.totalTrx > 0 || d.totalAdmin > 0)
        .map(d => ({
          id: `${uid}_${effectiveStoreId}_${filterKasir}_${d.dateStr}`,
          user_id: uid,
          store_id: effectiveStoreId,
          kasir_id: filterKasir,
          kasir_name: filterKasir === 'Semua' ? 'Gabungan Kasir' : (kasirList[filterKasir]?.name || filterKasir),
          tanggal: d.dateStr,
          total_profit_admin: d.totalAdmin,
          admin_tunai: d.adminTunai,
          admin_non_tunai: d.adminNonTunai,
          total_transaksi: d.totalTrx,
          total_omzet: d.totalOmzet,
          updated_at: new Date().toISOString()
        }));

      // 2. Prepare Monthly Summary
      const monthlyRow = {
        id: `${uid}_${effectiveStoreId}_${filterKasir}_${monthKeySelected}`,
        user_id: uid,
        store_id: effectiveStoreId,
        kasir_id: filterKasir,
        kasir_name: filterKasir === 'Semua' ? 'Gabungan Kasir' : (kasirList[filterKasir]?.name || filterKasir),
        bulan: monthKeySelected,
        tahun: selectedYear,
        bulan_angka: selectedMonth,
        nama_bulan: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`,
        total_profit_admin: monthKPI.totalAdmin,
        admin_tunai: monthKPI.totalTunai,
        admin_non_tunai: monthKPI.totalNonTunai,
        total_transaksi: monthKPI.totalTrx,
        total_omzet: monthKPI.totalOmzet,
        hari_terbaik_tanggal: monthKPI.bestDay ? monthKPI.bestDay.dateStr : null,
        hari_terbaik_profit: monthKPI.bestDay ? monthKPI.bestDay.totalAdmin : 0,
        updated_at: new Date().toISOString()
      };

      // Upsert to Supabase
      if (dailyRows.length > 0) {
        await supabase.from('profit_harian').upsert(dailyRows, { onConflict: 'id' });
      }
      await supabase.from('profit_bulanan').upsert([monthlyRow], { onConflict: 'id' });

      setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      if (!silent && showToast) showToast('Data profit berhasil tersimpan online di Cloud!');
    } catch (e: any) {
      console.warn('Sync cloud notice:', e.message || e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger Rekap Ulang Seluruh Data SQL secara manual
  const handleRunFullRekapSQL = async () => {
    setIsManualSyncing(true);
    try {
      let uid = userId;
      if (!uid) {
        const { data: authData } = await supabase.auth.getUser();
        uid = authData.user?.id || '';
      }

      // 1. Coba panggil Stored Procedure SQL Supabase
      const { error } = await supabase.rpc('rekap_ulang_semua_profit', { p_user_id: uid });
      if (!error) {
        if (showToast) showToast('Database Profit SQL berhasil direkap otomatis!');
        await fetchSQLProfitData();
      } else {
        // 2. Fallback jika function SQL belum di-create: sync via client
        await handleSyncToOnlineCloud(false);
        await fetchSQLProfitData();
      }
    } catch (e: any) {
      await handleSyncToOnlineCloud(false);
      await fetchSQLProfitData();
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Auto-sync otomatis ke Cloud Supabase saat data dihitung tanpa perlu tekan tombol
  useEffect(() => {
    if (isFetchingRemote || dailyProfitList.length === 0 || isSyncing) return;
    const timer = setTimeout(() => {
      // handleSyncToOnlineCloud(true); // dinonaktifkan: data dihitung terpusat oleh SQL RPC
    }, 2000);
    return () => clearTimeout(timer);
  }, [selectedMonth, selectedYear, filterKasir, dailyProfitList.length, isFetchingRemote]);

  // Helper navigate from Year View to Month View when a month card is clicked
  const handleMonthCardClick = (monthNum: number) => {
    setSelectedMonth(monthNum);
    setDrillDownFromYear(true);
    setActiveTab('bulan');
  };

  // Available cashiers list
  const cashierOptions = useMemo(() => {
    return Object.entries(kasirList).filter(
      ([id, acc]) => id.toLowerCase() !== 'owner' && (acc.role || '').toLowerCase() !== 'owner'
    );
  }, [kasirList]);

  // Year choices
  const availableYears = [currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1];

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-3.5 pb-12 animate-in fade-in duration-300">
      
      {/* ── HEADER UTAMA: TITLE & ONLINE SYNC STATUS (COMPACT MODE HP, TANPA TOMBOL MANUAL) ── */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-white shadow-md relative overflow-hidden border border-emerald-500/20">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

        <div className="relative z-10 flex items-center justify-between gap-2">
          {/* Kiri: Icon & Info Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 shrink-0">
              <i className="fa-solid fa-hand-holding-dollar text-sm sm:text-xl"></i>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[7.5px] sm:text-[8.5px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                  Pembukuan Murni
                </span>
                <span className="text-[7.5px] sm:text-[8.5px] font-bold text-slate-300">Mode Owner</span>
              </div>
              <h2 className="text-sm sm:text-xl font-black tracking-tight text-white mt-0.5 leading-tight truncate">
                PROFIT ADMIN FEE
              </h2>
              <p className="text-[7.5px] sm:text-[9px] text-emerald-200/80 font-medium leading-tight mt-0.5 truncate">
                Akumulasi laba admin fee riwayat transaksi harian, bulanan & tahunan
              </p>
            </div>
          </div>

          {/* Kanan: Status Database SQL (Instan) & Tombol Rekap */}
          <div className="shrink-0 flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-2 sm:px-2.5 py-1 rounded-xl">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                isLoadedFromSQL ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : (isLoadingSQL ? "bg-amber-400 animate-ping" : "bg-blue-400")
              )}></span>
              <span className="text-[7.5px] sm:text-[8px] text-emerald-300 font-bold whitespace-nowrap">
                {isLoadingSQL ? "Memuat SQL..." : (isLoadedFromSQL ? "SQL Instan" : "Offline / Fallback")}
              </span>
            </div>
            <button
              onClick={handleRunFullRekapSQL}
              disabled={isManualSyncing}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[7.5px] sm:text-[8px] font-black uppercase px-2 py-1 rounded-xl border border-white/20 transition-all cursor-pointer"
              title="Rekap Ulang Seluruh Data ke Database SQL"
            >
              <i className={cn("fa-solid fa-arrows-rotate text-[8px]", isManualSyncing && "fa-spin text-amber-300")}></i>
              <span className="hidden sm:inline">{isManualSyncing ? "Merekap..." : "Rekap SQL"}</span>
            </button>
          </div>
        </div>

        {/* ── GLOBAL FILTER: KASIR SELECTOR & BULAN / TAHUN SELECTOR ── */}
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          {/* Kasir Selector: Default Gabungan Semua Kasir */}
          <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-xl border border-white/20 transition-all flex-1 min-w-0">
            <i className="fa-solid fa-users text-emerald-400 text-[10px] shrink-0"></i>
            <div className="flex-1 min-w-0">
              <label className="text-[7px] sm:text-[7.5px] font-black uppercase text-emerald-200 block leading-tight">
                Filter Kasir:
              </label>
              <select
                value={filterKasir}
                onChange={(e) => setFilterKasir && setFilterKasir(e.target.value)}
                className="bg-transparent text-white font-black text-[10px] sm:text-xs outline-none border-none cursor-pointer w-full appearance-none pr-3 truncate leading-tight"
              >
                <option value="Semua" className="text-slate-900">✨ GABUNGAN SEMUA KASIR (Default)</option>
                {cashierOptions.map(([id, acc]) => (
                  <option key={id} value={id} className="text-slate-900">
                    Kasir: {acc.name || id}
                  </option>
                ))}
              </select>
            </div>
            <i className="fa-solid fa-chevron-down text-[7.5px] text-white/60 pointer-events-none"></i>
          </div>

          {/* Quick Period Info Tag */}
          <div className="shrink-0">
            <span className="text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider text-emerald-200 bg-white/5 border border-white/10 px-2 py-1 rounded-xl flex items-center gap-1">
              <i className="fa-regular fa-calendar-check text-emerald-400 text-[8px]"></i>
              <span className="whitespace-nowrap">
                {activeTab === 'bulan' && `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
                {activeTab === 'tahun' && `Tahun ${selectedYear}`}
                {activeTab === 'thebest' && `Rekor Sepanjang Masa`}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── TAB NAVIGASI: 3 TAMPILAN (PAS 100% LAYAR HP, TIDAK AKAN MELEBAR KESAMPING) ── */}
      <div className="bg-white p-1 rounded-2xl shadow-xs border border-slate-200/80 grid grid-cols-3 gap-1 w-full max-w-full overflow-hidden">
        <button
          onClick={() => {
            setActiveTab('bulan');
            setDrillDownFromYear(false);
          }}
          className={cn(
            "flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl font-black transition-all duration-200 active:scale-95 text-center min-w-0 w-full",
            activeTab === 'bulan'
              ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <i className="fa-solid fa-calendar-days text-[11px] sm:text-xs shrink-0"></i>
          <span className="text-[9.5px] sm:text-xs uppercase tracking-tight font-black whitespace-nowrap">
            1. Bulan
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('tahun');
            setDrillDownFromYear(false);
          }}
          className={cn(
            "flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl font-black transition-all duration-200 active:scale-95 text-center min-w-0 w-full",
            activeTab === 'tahun'
              ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <i className="fa-solid fa-calendar text-[11px] sm:text-xs shrink-0"></i>
          <span className="text-[9.5px] sm:text-xs uppercase tracking-tight font-black whitespace-nowrap">
            2. Tahun
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('thebest');
            setDrillDownFromYear(false);
          }}
          className={cn(
            "flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl font-black transition-all duration-200 active:scale-95 text-center min-w-0 w-full",
            activeTab === 'thebest'
              ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <i className="fa-solid fa-trophy text-[11px] sm:text-xs shrink-0"></i>
          <span className="text-[9.5px] sm:text-xs uppercase tracking-tight font-black whitespace-nowrap">
            3. Rekor
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── TAMPILAN 1: BULAN BERJALAN (1 s/d 31) ──                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'bulan' && (
        <div className="space-y-4">
          
          {/* Banner Drill-down from year view */}
          {drillDownFromYear && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex items-center justify-between text-blue-900 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-arrow-left text-blue-600"></i>
                <p className="text-[11px] font-bold">
                  Melihat rincian harian: <span className="font-black">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('tahun');
                  setDrillDownFromYear(false);
                }}
                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-blue-700 active:scale-95"
              >
                Kembali ke Tahunan
              </button>
            </div>
          )}

          {/* Month & Year Bar Selector */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedMonth === 1) {
                    setSelectedMonth(12);
                    setSelectedYear(y => y - 1);
                  } else {
                    setSelectedMonth(m => m - 1);
                  }
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90"
                title="Bulan Sebelumnya"
              >
                <i className="fa-solid fa-chevron-left text-xs"></i>
              </button>

              <div className="text-center min-w-[140px]">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Pilih Bulan</p>
                <h3 className="text-sm font-black text-slate-800 tracking-tight">
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </h3>
              </div>

              <button
                onClick={() => {
                  if (selectedMonth === 12) {
                    setSelectedMonth(1);
                    setSelectedYear(y => y + 1);
                  } else {
                    setSelectedMonth(m => m + 1);
                  }
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90"
                title="Bulan Berikutnya"
              >
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </button>
            </div>

            {/* Quick Actions & Sorting */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-[10px] font-black uppercase hover:bg-slate-100 active:scale-95"
                title="Ubah Urutan Tanggal"
              >
                <i className={cn("fa-solid text-xs", sortAsc ? "fa-arrow-down-1-9 text-emerald-600" : "fa-arrow-down-9-1 text-blue-600")}></i>
                <span>Tgl {sortAsc ? `1 → ${daysInSelectedMonth}` : `${daysInSelectedMonth} → 1`}</span>
              </button>

              {/* Reset to current month */}
              <button
                onClick={() => {
                  setSelectedYear(currentYearNum);
                  setSelectedMonth(currentMonthNum);
                }}
                className="px-2.5 py-1.5 rounded-xl text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 active:scale-95"
              >
                Bulan Ini
              </button>
            </div>
          </div>

          {/* ── 4 KARTU STATISTIK BULAN BERJALAN: RESPONSIF TANPA TERPOTONG (LINDUNG) DI HP ── */}
          <div className="space-y-2.5">
            {/* KARTU 1: BANNER UTAMA TOTAL PROFIT (LEBAR PENUH, ANGKA BESAR JELAS TERBACA) */}
            <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 p-3.5 sm:p-4 rounded-2xl text-white shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="text-[8px] sm:text-[9px] font-black uppercase text-emerald-200 tracking-wider">
                    Total Laba Admin Fee Bulan Ini
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5 tabular-nums">
                    {formatRupiah(monthKPI.totalAdmin)}
                  </h3>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1.5 pt-2 sm:pt-0 border-t border-white/15 sm:border-none">
                  <span className="text-[9px] sm:text-[10px] font-black bg-white/20 px-2.5 py-1 rounded-lg border border-white/20 text-white">
                    {monthKPI.totalTrx} Transaksi
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-emerald-200 font-bold">
                    {daysInSelectedMonth} Hari ({monthKPI.activeDaysCount} hari aktif)
                  </span>
                </div>
              </div>
            </div>

            {/* KARTU 2 & 3: RATA-RATA / HARI & HARI TERTINGGI (GRID 2 KOLOM RAPI & LUAS) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Rata-Rata Per Hari */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-wider truncate">
                      Rata-Rata / Hari
                    </p>
                    <i className="fa-solid fa-chart-line text-emerald-500 text-[10px]"></i>
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-slate-800 tracking-tight mt-1 tabular-nums">
                    {formatRupiah(monthKPI.avgPerDay)}
                  </h4>
                </div>
                <p className="text-[8px] sm:text-[9px] text-slate-500 font-bold mt-1.5 truncate">
                  Aktif: <span className="text-emerald-700 font-black">{monthKPI.activeDaysCount} hari</span>
                </p>
              </div>

              {/* Hari Tertinggi */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-wider truncate">
                      Hari Tertinggi
                    </p>
                    <i className="fa-solid fa-fire text-amber-500 text-[10px]"></i>
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-amber-600 tracking-tight mt-1 tabular-nums truncate">
                    {monthKPI.bestDay ? formatRupiah(monthKPI.bestDay.totalAdmin) : 'Rp 0'}
                  </h4>
                </div>
                <p className="text-[8px] sm:text-[9px] text-slate-500 font-black mt-1.5 truncate">
                  {monthKPI.bestDay ? `${monthKPI.bestDay.dayName}, Tgl ${monthKPI.bestDay.dayNum}` : '-'}
                </p>
              </div>
            </div>

            {/* KARTU 4: KOMPOSISI FEE (LEBAR PENUH - TUNAI & NON-TUNAI TERBACA 100% LENGKAP) */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Komposisi Laba Admin Fee
                </p>
                <span className="text-[7.5px] text-slate-400 font-medium">
                  *Semua dihitung penuh sebagai profit
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs">
                <div className="bg-emerald-50/70 border border-emerald-100 p-2 sm:p-2.5 rounded-xl flex flex-col justify-between">
                  <span className="text-[8px] text-slate-500 font-bold uppercase">Fee Tunai:</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-700 tabular-nums mt-0.5">
                    {formatRupiah(monthKPI.totalTunai)}
                  </span>
                </div>
                <div className="bg-indigo-50/70 border border-indigo-100 p-2 sm:p-2.5 rounded-xl flex flex-col justify-between">
                  <span className="text-[8px] text-slate-500 font-bold uppercase">Fee Non-Tunai:</span>
                  <span className="text-xs sm:text-sm font-black text-indigo-700 tabular-nums mt-0.5">
                    {formatRupiah(monthKPI.totalNonTunai)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── LIST BREAKDOWN HARI 1 s/d 31 (RESPONSIF HP & TAB) ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-3.5 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Rincian Harian (Tgl 1 s/d {daysInSelectedMonth})
                </h4>
                {isLoadingSQL && (
                  <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md animate-pulse flex items-center gap-1">
                    <i className="fa-solid fa-spinner fa-spin text-[8px]"></i> Memuat SQL...
                  </span>
                )}
                {!isLoadingSQL && isFetchingRemote && (
                  <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md animate-pulse flex items-center gap-1">
                    <i className="fa-solid fa-spinner fa-spin text-[8px]"></i> Memuat data...
                  </span>
                )}
              </div>

              {/* Toggle Filter: Ada Laba (Default) vs Tampilkan Semua 1-31 */}
              <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
                <button
                  onClick={() => setFilterOnlyActiveDays(true)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all",
                    filterOnlyActiveDays
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Ada Laba ({dailyProfitList.filter(d => d.totalAdmin > 0).length})
                </button>
                <button
                  onClick={() => setFilterOnlyActiveDays(false)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all",
                    !filterOnlyActiveDays
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Semua (1-{daysInSelectedMonth})
                </button>
              </div>
            </div>

            {/* List / Table Items (Layout Menumpuk Rapi di HP) */}
            {displayedDailyProfitList.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <i className="fa-regular fa-folder-open text-3xl mb-2 text-slate-300"></i>
                <p className="text-xs font-bold text-slate-600">Belum ada transaksi dengan laba di bulan ini</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Pilih "Semua" untuk melihat seluruh tanggal</p>
                <button
                  type="button"
                  onClick={() => setFilterOnlyActiveDays(false)}
                  className="mt-3 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-[10px] font-black uppercase transition-all"
                >
                  Tampilkan Semua Tanggal (1-{daysInSelectedMonth})
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayedDailyProfitList.map((day) => {
                const todayStr = getLocalDateString();
                const isToday = day.dateStr === todayStr;
                const isBestDay = monthKPI.bestDay?.dateStr === day.dateStr && day.totalAdmin > 0;
                const pct = maxDayAdmin > 0 ? Math.min(100, Math.round((day.totalAdmin / maxDayAdmin) * 100)) : 0;

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => setSelectedDayDetail(day)}
                    className={cn(
                      "p-2.5 sm:p-3.5 transition-colors cursor-pointer group hover:bg-slate-50 flex flex-col gap-1.5",
                      isToday ? "bg-emerald-50/60 border-l-4 border-l-emerald-500" : ""
                    )}
                  >
                    {/* BARIS 1: Header Tanggal (Kiri) + Nominal Laba (Kanan) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Kotak Tanggal */}
                        <div className={cn(
                          "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center font-black shrink-0 transition-transform group-hover:scale-105",
                          isToday
                            ? "bg-emerald-600 text-white shadow-xs"
                            : isBestDay
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-slate-100 text-slate-700"
                        )}>
                          <span className="text-[11px] sm:text-[13px] leading-none">{day.dayNum}</span>
                          <span className="text-[6.5px] sm:text-[7.5px] uppercase font-bold tracking-tight mt-0.5">{day.dayName.substring(0, 3)}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[11px] sm:text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                              {day.dayName}, {day.dayNum} {MONTH_NAMES[selectedMonth - 1]}
                            </p>
                            {isToday && (
                              <span className="text-[7px] font-black uppercase bg-emerald-600 text-white px-1.5 py-0.2 rounded-full shrink-0">
                                Hari Ini
                              </span>
                            )}
                            {isBestDay && (
                              <span className="text-[7px] font-black uppercase bg-amber-500 text-white px-1.5 py-0.2 rounded-full flex items-center gap-1 shrink-0">
                                <i className="fa-solid fa-crown text-[6px]"></i> Tertinggi
                              </span>
                            )}
                          </div>
                          <p className="text-[8.5px] text-slate-400 font-bold mt-0.5 flex items-center gap-1 flex-wrap">
                            <span><i className="fa-solid fa-receipt text-[8px] mr-0.5"></i>{day.totalTrx} Trx</span>
                            {day.totalOmzet > 0 && (
                              <span>• Omzet: {formatRupiah(day.totalOmzet)}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Kanan: Profit Admin Fee */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="text-right">
                          <p className={cn(
                            "text-xs sm:text-sm font-black tracking-tight tabular-nums",
                            day.totalAdmin > 0 ? "text-emerald-700" : "text-slate-400"
                          )}>
                            {formatRupiah(day.totalAdmin)}
                          </p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all text-[9px]"></i>
                      </div>
                    </div>

                    {/* BARIS 2: Bar Mini & Detail Tunai / Non-Tunai (Menumpuk ke bawah di HP, selalu terbaca jelas) */}
                    <div className="pt-1 border-t border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[8px]">
                      {/* Bar Visual Kecil */}
                      <div className="flex items-center gap-1.5 flex-1 max-w-full sm:max-w-[200px]">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              isBestDay ? "bg-amber-500" : day.totalAdmin > 0 ? "bg-emerald-500" : "bg-transparent"
                            )}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="text-slate-500 font-bold text-[8px] whitespace-nowrap">
                          {pct}% dari puncak
                        </span>
                      </div>

                      {/* Teks Rincian Non-Tunai & Tunai (Font kecil rapi agar terbaca di HP) */}
                      <div className="flex items-center gap-2 text-slate-500 font-medium justify-between sm:justify-end text-[8px]">
                        {day.adminTunai > 0 && (
                          <span className="text-emerald-700 font-black">
                            Tunai: {formatRupiah(day.adminTunai)}
                          </span>
                        )}
                        {day.adminNonTunai > 0 && (
                          <span className="text-indigo-600 font-black">
                            Non-tunai: {formatRupiah(day.adminNonTunai)}
                          </span>
                        )}
                        {day.totalAdmin === 0 && (
                          <span className="text-slate-300 italic">Nol admin fee</span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── TAMPILAN 2: REKAP PERTAHUN (JANUARI s/d DESEMBER) ──            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tahun' && (
        <div className="space-y-3 sm:space-y-4">
          
          {/* Year Picker Toolbar */}
          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedYear(y => y - 1)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90"
                title="Tahun Sebelumnya"
              >
                <i className="fa-solid fa-chevron-left text-[10px] sm:text-xs"></i>
              </button>

              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs sm:text-sm px-3 py-1.5 rounded-xl outline-none cursor-pointer border-none"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>Tahun {y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setSelectedYear(y => y + 1)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90"
                title="Tahun Berikutnya"
              >
                <i className="fa-solid fa-chevron-right text-[10px] sm:text-xs"></i>
              </button>
            </div>

            <p className="text-[8.5px] sm:text-[9.5px] text-slate-500 font-bold text-right">
              💡 Ketuk bulan untuk rincian 1-31
            </p>
          </div>

          {/* 3 STATS KARTU TAHUNAN: KHUSUS MODE HP (TEKS PAS, TIDAK TERPOTONG) */}
          <div className="space-y-2">
            {/* KARTU 1: BANNER UTAMA TOTAL PROFIT TAHUNAN (LEBAR PENUH) */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-900 p-3 sm:p-4 rounded-2xl text-white shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-6 -mt-6 blur-xl pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                <div>
                  <p className="text-[8px] sm:text-[9px] font-black uppercase text-blue-200 tracking-wider">
                    Total Laba Admin Fee {selectedYear}
                  </p>
                  <h3 className="text-base sm:text-xl font-black tracking-tight text-white mt-0.5 tabular-nums">
                    {formatRupiah(yearKPI.totalAdmin)}
                  </h3>
                </div>

                <div className="pt-1 sm:pt-0 border-t border-white/15 sm:border-none flex items-center gap-1.5">
                  <span className="text-[8.5px] sm:text-[9.5px] font-bold text-blue-100 bg-white/15 backdrop-blur-xs px-2.5 py-0.5 rounded-lg border border-white/20">
                    <i className="fa-solid fa-receipt text-[8px] mr-1 text-blue-200"></i>
                    {yearKPI.totalTrx} Transaksi sepanjang tahun {selectedYear}
                  </span>
                </div>
              </div>
            </div>

            {/* KARTU 2 & 3: GRID 2 KOLOM RAPI & COMPACT UNTUK HP */}
            <div className="grid grid-cols-2 gap-2">
              {/* Rata-Rata / Bulan */}
              <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[7.5px] sm:text-[8.5px] font-black uppercase text-slate-400 tracking-wider">
                      Rata-Rata / Bulan
                    </p>
                    <i className="fa-solid fa-chart-pie text-blue-500 text-[9px]"></i>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight mt-0.5 tabular-nums">
                    {formatRupiah(yearKPI.avgPerMonth)}
                  </h4>
                </div>
                <p className="text-[7.5px] sm:text-[8.5px] text-slate-500 font-bold mt-1.5 flex items-center gap-1">
                  <i className="fa-regular fa-calendar-check text-[7.5px] text-slate-400"></i>
                  <span>Dari {yearKPI.activeMonths} bulan aktif beroperasi</span>
                </p>
              </div>

              {/* Bulan Paling Banyak Profit */}
              <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[7.5px] sm:text-[8.5px] font-black uppercase text-amber-700/80 tracking-wider">
                      Bulan Paling Banyak Profit
                    </p>
                    <i className="fa-solid fa-crown text-amber-500 text-[9px]"></i>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-amber-600 tracking-tight mt-0.5 tabular-nums">
                    {yearKPI.bestMonth ? formatRupiah(yearKPI.bestMonth.totalAdmin) : 'Rp 0'}
                  </h4>
                </div>
                <p className="text-[7.5px] sm:text-[8.5px] text-amber-700 font-black mt-1.5 flex items-center gap-1 truncate">
                  <span>👑 {yearKPI.bestMonth ? yearKPI.bestMonth.monthLabel : '-'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* ── DAFTAR BREAKDOWN BULANAN: MENURUN KEBAWAH (BULAN BERJALAN DI ATAS, AWAL TAHUN DI BAWAH) ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></div>
                <div>
                  <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800">
                    {filterYearMode === 'berjalan' && selectedYear === currentYearNum
                      ? `Rekap Bulan Berjalan (${selectedYear})`
                      : filterYearMode === 'active'
                      ? `Rekap Bulan Ada Laba (${selectedYear})`
                      : `Rekap 12 Bulan (${selectedYear})`}
                  </h4>
                  <p className="text-[8px] sm:text-[8.5px] text-slate-500 font-bold">
                    {sortYearAsc 
                      ? 'Januari s/d ' + (filterYearMode === 'berjalan' && selectedYear === currentYearNum ? MONTH_NAMES[currentMonthNum - 1] : 'Desember')
                      : (filterYearMode === 'berjalan' && selectedYear === currentYearNum ? MONTH_NAMES[currentMonthNum - 1] : 'Desember') + ' s/d Januari'}
                  </p>
                </div>
              </div>

              {/* Action Controls: Sort button & Filter pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSortYearAsc(!sortYearAsc)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-[8.5px] sm:text-[9px] font-black uppercase hover:bg-slate-100 active:scale-95 transition-all"
                  title="Ubah Urutan Bulan"
                >
                  <i className={cn("fa-solid text-[9px]", sortYearAsc ? "fa-arrow-down-1-9 text-emerald-600" : "fa-arrow-down-9-1 text-blue-600")}></i>
                  <span>{sortYearAsc ? 'Jan → Des' : 'Bulan Ini → Jan'}</span>
                </button>

                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                  <button
                    onClick={() => setFilterYearMode('berjalan')}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[8px] sm:text-[8.5px] font-black uppercase transition-all",
                      filterYearMode === 'berjalan'
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Bulan Berjalan
                  </button>

                  <button
                    onClick={() => setFilterYearMode('active')}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[8px] sm:text-[8.5px] font-black uppercase transition-all",
                      filterYearMode === 'active'
                        ? "bg-white text-emerald-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Ada Laba
                  </button>

                  <button
                    onClick={() => setFilterYearMode('all')}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[8px] sm:text-[8.5px] font-black uppercase transition-all",
                      filterYearMode === 'all'
                        ? "bg-white text-slate-800 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Semua (12)
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {displayedYearProfitList.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <i className="fa-regular fa-calendar-xmark text-2xl mb-2 text-slate-300"></i>
                  <p className="text-xs font-bold text-slate-600">Tidak ada data bulan yang sesuai filter</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Pilih filter "Bulan Berjalan" atau "Semua (12)" untuk melihat rincian</p>
                </div>
              ) : (
                displayedYearProfitList.map((month) => {
                  const isBestMonth = yearKPI.bestMonth?.monthKey === month.monthKey && month.totalAdmin > 0;
                  const isCurrentMonth = currentYearNum === selectedYear && currentMonthNum === month.monthNum;
                  const pct = maxMonthAdmin > 0 ? Math.min(100, Math.round((month.totalAdmin / maxMonthAdmin) * 100)) : 0;

                return (
                  <div
                    key={month.monthKey}
                    onClick={() => handleMonthCardClick(month.monthNum)}
                    className={cn(
                      "p-2.5 sm:p-3 transition-colors cursor-pointer group hover:bg-slate-50 flex flex-col gap-1",
                      isCurrentMonth ? "bg-blue-50/50 border-l-4 border-l-blue-600" : ""
                    )}
                  >
                    {/* BARIS ATAS: Nomor & Nama Bulan (Kiri) + Nominal Laba (Kanan) */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Kiri */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          "w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-transform group-hover:scale-105",
                          isCurrentMonth
                            ? "bg-blue-600 text-white shadow-xs"
                            : isBestMonth
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700"
                        )}>
                          {month.monthNum}
                        </div>

                        <div className="min-w-0">
                          {/* Baris Atas: Nama Bulan + Trx + Badge Status */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-blue-700 transition-colors uppercase tracking-tight">
                              {MONTH_NAMES[month.monthNum - 1]}
                            </h4>

                            {/* Trx diletakkan di samping nama bulan */}
                            <span className="text-[8px] sm:text-[8.5px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-md flex items-center gap-1 shrink-0">
                              <i className="fa-solid fa-receipt text-[7px] text-slate-400"></i>
                              {month.totalTrx} Trx
                            </span>

                            {isCurrentMonth && (
                              <span className="text-[7px] sm:text-[7.5px] font-black uppercase bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full shrink-0">
                                Berjalan
                              </span>
                            )}
                            {isBestMonth && (
                              <span className="text-[7px] sm:text-[7.5px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0">
                                👑 Rekor
                              </span>
                            )}
                          </div>

                          {/* Baris Bawah: Omzet (di bawah nama bulan & trx) */}
                          <p className="text-[8px] sm:text-[8.5px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                            <span>Omzet: {formatRupiah(month.totalOmzet)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Kanan */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="text-right">
                          <span className="text-[7px] sm:text-[7.5px] font-black uppercase text-slate-400 tracking-wider block">
                            Laba Admin
                          </span>
                          <span className={cn(
                            "text-xs sm:text-sm font-black tracking-tight tabular-nums block",
                            month.totalAdmin > 0 ? "text-emerald-700" : "text-slate-400"
                          )}>
                            {formatRupiah(month.totalAdmin)}
                          </span>
                        </div>
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                          <i className="fa-solid fa-chevron-right text-[8px]"></i>
                        </div>
                      </div>
                    </div>

                    {/* BARIS BAWAH: Micro Progress Bar & Quick Link */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isBestMonth ? "bg-amber-500" : isCurrentMonth ? "bg-blue-600" : "bg-emerald-500"
                          )}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 shrink-0">
                        {pct}% dari puncak
                      </span>
                      <span className="text-[8px] sm:text-[8.5px] font-bold text-blue-600 shrink-0 group-hover:underline flex items-center gap-0.5 ml-1">
                        Cek 1-31 <i className="fa-solid fa-arrow-right text-[7px]"></i>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── TAMPILAN 3: THE BEST (REKOR PENJUALAN & PROFIT PALING BANYAK) ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'thebest' && (
        <div className="space-y-4">
          
          <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-yellow-600 p-4 sm:p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl shrink-0 shadow-inner">
                🏆
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black tracking-tight uppercase">
                  PAPAN REKOR PROFIT TERTINGGI
                </h3>
                <p className="text-[10px] text-amber-100 font-medium mt-0.5">
                  Daftar bulan, tahun, hari & kasir dengan perolehan keuntungan admin fee paling banyak
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. TOP BULAN TERBAIK SEPANJANG MASA */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">
                    📅
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Bulan Paling Banyak Profit
                    </h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Peringkat laba admin fee per bulan</p>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Top 5 Rekor
                </span>
              </div>

              <div className="space-y-2">
                {theBestRecords.topMonths.map((m, idx) => {
                  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                  return (
                    <div
                      key={m.label}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 hover:bg-amber-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base shrink-0">{medals[idx] || `${idx + 1}.`}</span>
                        <div>
                          <p className="text-xs font-black text-slate-800">{m.label}</p>
                          <p className="text-[9px] text-slate-400 font-medium">{m.trx} transaksi tercatat</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-700">{formatRupiah(m.admin)}</p>
                        <p className="text-[8px] text-slate-400">Omzet: {formatRupiah(m.omzet)}</p>
                      </div>
                    </div>
                  );
                })}
                {theBestRecords.topMonths.length === 0 && (
                  <p className="text-[10px] text-slate-400 text-center py-4">Belum ada data bulan yang cukup</p>
                )}
              </div>
            </div>

            {/* 2. TOP TAHUN TERBAIK */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-black">
                    📆
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Tahun Paling Banyak Profit
                    </h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Total laba admin fee akumulasi tahunan</p>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Perbandingan
                </span>
              </div>

              <div className="space-y-2">
                {theBestRecords.topYears.map((y, idx) => {
                  const medals = ['👑', '⭐', '✨'];
                  return (
                    <div
                      key={y.year}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 hover:bg-blue-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base shrink-0">{medals[idx] || '🎯'}</span>
                        <div>
                          <p className="text-xs font-black text-slate-800">Tahun {y.year}</p>
                          <p className="text-[9px] text-slate-400 font-medium">{y.trx} transaksi</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-blue-700">{formatRupiah(y.admin)}</p>
                        <p className="text-[8px] text-slate-400">Total Omzet: {formatRupiah(y.omzet)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. TOP HARI REKOR TERBESAR */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-black">
                    ⚡
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Rekor Profit Harian Tertinggi
                    </h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">1 Hari dengan lonjakan laba terbanyak</p>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Top 5 Hari
                </span>
              </div>

              <div className="space-y-2">
                {theBestRecords.topDays.map((d, idx) => (
                  <div
                    key={d.dateStr}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-800">{d.dateStr}</p>
                        <p className="text-[9px] text-slate-400 font-medium">{d.trx} transaksi hari itu</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-rose-600">{formatRupiah(d.admin)}</p>
                      <p className="text-[8px] text-slate-400">Omzet: {formatRupiah(d.omzet)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. KASIR KONTRIBUTOR PROFIT TERBANYAK */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-black">
                    🎖️
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Kasir Kontributor Terbanyak
                    </h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Total laba admin fee yang dihasilkan kasir</p>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Peringkat
                </span>
              </div>

              <div className="space-y-2">
                {theBestRecords.topKasirs.map((k, idx) => (
                  <div
                    key={k.kasirId}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-800">{k.name}</p>
                        <p className="text-[9px] text-slate-400 font-medium">{k.trx} transaksi selesai</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-purple-700">{formatRupiah(k.admin)}</p>
                      <p className="text-[8px] text-slate-400">Omzet: {formatRupiah(k.omzet)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL RINCIAN HARI YANG DI-KLIK ── */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Rincian Profit Harian
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {selectedDayDetail.dayName}, {selectedDayDetail.dayNum} {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs active:scale-90"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="bg-emerald-50 p-3.5 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Total Profit Admin Fee:</span>
                <span className="text-base font-black text-emerald-700">
                  {formatRupiah(selectedDayDetail.totalAdmin)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black uppercase text-slate-400">Admin Fee Tunai</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">{formatRupiah(selectedDayDetail.adminTunai)}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black uppercase text-slate-400">Admin Fee Non-Tunai</p>
                  <p className="text-xs font-black text-indigo-700 mt-0.5">{formatRupiah(selectedDayDetail.adminNonTunai)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black uppercase text-slate-400">Total Transaksi</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">{selectedDayDetail.totalTrx} Trx</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black uppercase text-slate-400">Total Omzet Transaksi</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">{formatRupiah(selectedDayDetail.totalOmzet)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedDayDetail(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfitOwnerView;
