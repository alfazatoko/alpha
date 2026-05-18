import React, { useState, useEffect, useRef, useCallback } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { parseNominal, formatInputRupiah, cn, getLocalISOString, getLocalDateString } from './lib/utils'
import type { Transaction } from './types'

// Components
import Navigation from './components/Navigation'
import SidePanel from './components/SidePanel'
import LoginScreen, { getKasirAccounts, type KasirAccount } from './components/LoginScreen'
import { GoogleAuthScreen } from './components/GoogleAuthScreen'
import { supabase } from './lib/supabase'

// Views
import BerandaView from './views/BerandaView'
import RiwayatView from './views/RiwayatView'
import LaporanView from './views/LaporanView'
import AkunView from './views/AkunView'
import IsiSaldoView from './views/IsiSaldoView'
import KasbonView from './views/KasbonView'
import KontakView from './views/KontakView'
import VoucherView from './views/VoucherView'
import KalenderView from './views/KalenderView'
import NotaView from './views/NotaView'
import OtomatisView from './views/OtomatisView'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ion-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { name?: string }, HTMLElement>;
    }
  }
}

// Constants and helpers

const App: React.FC = () => {
  const hasBypass = typeof window !== 'undefined' && window.location.search.includes('bypass=true')

  // ── Google Auth State ──
  const [googleSession, setGoogleSession] = useState<any>(hasBypass ? { user: { id: 'bypass-google-uid', email: 'demo@alfaza.com' } } : null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(hasBypass ? false : true)

  // ── Kasir Profile State ──
  const [isLoggedIn, setIsLoggedIn] = useState(hasBypass ? true : false)
  const [currentUsername, setCurrentUsername] = useState(hasBypass ? 'demo_owner' : '')
  const [currentAccount, setCurrentAccount] = useState<KasirAccount | null>(hasBypass ? { name: 'Demo Owner', role: 'owner', pin: '1234' } : null)
  const [kasirList, setKasirList] = useState<Record<string, KasirAccount>>(() => {
    const list = getKasirAccounts()
    if (hasBypass && Object.keys(list).length === 0) {
      list['demo_owner'] = { name: 'Demo Owner', role: 'owner', pin: '1234' }
    }
    return list
  })

  const refreshKasirList = useCallback(() => {
    const list = getKasirAccounts()
    if (hasBypass && Object.keys(list).length === 0) {
      list['demo_owner'] = { name: 'Demo Owner', role: 'owner', pin: '1234' }
    }
    setKasirList(list)
  }, [hasBypass])

  useEffect(() => {
    refreshKasirList()
  }, [refreshKasirList])

  // Check Supabase Auth
  useEffect(() => {
    if (hasBypass) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setGoogleSession(session)
      setIsCheckingAuth(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setGoogleSession(session)
    })

    // Tangani Deep Link untuk Capacitor (Login Google/Email)
    const handleAppUrlOpen = async (event: any) => {
      try {
        const url = new URL(event.url.replace('#', '?'));
        const code = url.searchParams.get('code');
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');

        if (code) {
          // Flow PKCE
          await supabase.auth.exchangeCodeForSession(code);
        } else if (accessToken && refreshToken) {
          // Flow Implicit (Token langsung di URL)
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

        // Tutup browser internal jika masih terbuka
        if (Capacitor.isNativePlatform()) {
          await Browser.close();
        }
      } catch (err) {
        console.error('Gagal memproses deep link:', err);
      }
    };

    CapApp.addListener('appUrlOpen', handleAppUrlOpen);

    return () => {
      subscription.unsubscribe();
    }
  }, [])

  // Check persisted login on mount
  useEffect(() => {
    const storedLoggedIn = localStorage.getItem('alphaPro_loggedIn')
    const storedUsername = localStorage.getItem('alphaPro_username')
    const kasirList = getKasirAccounts()
    if (storedLoggedIn === 'true' && storedUsername && kasirList[storedUsername]) {
      setIsLoggedIn(true)
      setCurrentUsername(storedUsername)
      setCurrentAccount(kasirList[storedUsername])
    }
  }, [])

  // ── Login / Logout Handlers ──
  const handleLogin = useCallback((username: string, account: KasirAccount) => {
    localStorage.setItem('alphaPro_loggedIn', 'true')
    localStorage.setItem('alphaPro_username', username)
    localStorage.setItem('alphaPro_name', account.name)
    localStorage.setItem('alphaPro_role', account.role)
    setIsLoggedIn(true)
    setCurrentUsername(username)
    setCurrentAccount(account)
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('alphaPro_loggedIn')
    localStorage.removeItem('alphaPro_username')
    localStorage.removeItem('alphaPro_name')
    localStorage.removeItem('alphaPro_role')
    setIsLoggedIn(false)
    setCurrentUsername('')
    setCurrentAccount(null)
  }, [])

  // ── Show loading if checking auth ──
  if (isCheckingAuth) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-50"><i className="fa-solid fa-circle-notch fa-spin text-blue-600 text-3xl"></i></div>
  }

  // ── Show Google Login if not authenticated ──
  if (!googleSession) {
    return <GoogleAuthScreen />
  }

  // ── Show Profile Selection (Kasir) if not selected ──
  if (!isLoggedIn || !currentAccount) {
    return (
      <div className="relative">
        <button 
          onClick={() => supabase.auth.signOut()} 
          className="absolute top-4 right-4 z-50 bg-white/50 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-100 hover:bg-red-50 transition-all"
        >
          Logout Google
        </button>
        <LoginScreen onLogin={handleLogin} />
      </div>
    )
  }

  // ── Everything below only renders when fully logged in ──
  return (
    <MainApp 
      username={currentUsername} 
      account={currentAccount} 
      googleUid={googleSession.user.id} 
      onLogout={handleLogout}
      kasirList={kasirList}
      refreshKasirList={refreshKasirList}
      isLoggedIn={isLoggedIn}
    />
  )
}

// ════════════════════════════════════════════════
// MainApp — the original App, now receiving kasir info
// ════════════════════════════════════════════════
interface MainAppProps {
  username: string
  account: KasirAccount
  googleUid: string
  onLogout: () => void
  kasirList: Record<string, KasirAccount>
  refreshKasirList: () => void
  isLoggedIn: boolean
}

const MainApp: React.FC<MainAppProps> = ({ username, account, googleUid, onLogout, kasirList, refreshKasirList, isLoggedIn }) => {

  // Navigation State
  const [activeView, setActiveView] = useState('view-beranda')

  // Sync activeView with URL Hash
  useEffect(() => {
    const viewToHash: Record<string, string> = {
      'view-beranda': 'beranda',
      'view-transaksi': 'riwayat',
      'view-isi-saldo': 'isi-saldo',
      'view-laporan': 'laporan',
      'view-akun': 'akun',
      'view-kasbon': 'kasbon',
      'view-kontak': 'kontak',
      'view-stok-voucher': 'voucher',
      'view-kalender': 'kalender',
      'view-nota': 'nota',
      'view-owner-monitor': 'owner-monitor',
      'view-owner-laporan': 'owner-laporan',
      'view-owner-grafik': 'owner-grafik',
      'view-owner-performa': 'owner-performa',
      'view-owner-absen': 'owner-absen',
      'view-owner-izin': 'owner-izin',
      'view-owner-gaji': 'owner-gaji',
      'view-owner-backup': 'owner-backup',
      'view-owner-saldo': 'owner-saldo'
    }
    const hashToView: Record<string, string> = Object.fromEntries(
      Object.entries(viewToHash).map(([v, h]) => [h, v])
    )

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '')
      if (hashToView[hash]) {
        setActiveView(hashToView[hash])
      } else if (hash === '' || hash === '/') {
        setActiveView('view-beranda')
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // Initial check on load

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const viewToHash: Record<string, string> = {
      'view-beranda': 'beranda',
      'view-transaksi': 'riwayat',
      'view-isi-saldo': 'isi-saldo',
      'view-laporan': 'laporan',
      'view-akun': 'akun',
      'view-kasbon': 'kasbon',
      'view-kontak': 'kontak',
      'view-stok-voucher': 'voucher',
      'view-kalender': 'kalender',
      'view-nota': 'nota',
      'view-owner-monitor': 'owner-monitor',
      'view-owner-laporan': 'owner-laporan',
      'view-owner-grafik': 'owner-grafik',
      'view-owner-performa': 'owner-performa',
      'view-owner-absen': 'owner-absen',
      'view-owner-izin': 'owner-izin',
      'view-owner-gaji': 'owner-gaji',
      'view-owner-backup': 'owner-backup',
      'view-owner-saldo': 'owner-saldo'
    }
    const hash = viewToHash[activeView] || activeView.replace('view-', '')
    if (window.location.hash !== `#/${hash}`) {
      window.history.pushState(null, '', `#/${hash}`)
    }
  }, [activeView])
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [screenSize, setScreenSize] = useState(localStorage.getItem('screen') || 'tablet')
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)

  // Apply theme class to <html> element and persist to localStorage
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-blue', 'theme-neon')
    root.classList.add(`theme-${theme}`)
    localStorage.setItem('theme', theme)
  }, [theme])

  const isOwnerView = activeView.startsWith('view-owner-')

  // Persist screen size to localStorage
  useEffect(() => {
    localStorage.setItem('screen', screenSize)
  }, [screenSize])
  
  // App Data State — synced with Supabase
  const [saldoBank, setSaldoBank] = useState<number>(0)
  const [totalPenjualan, setTotalPenjualan] = useState<number>(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [kasModal, setKasModal] = useState<number>(0)
  const [absensi, setAbsensi] = useState<any[]>([])
  const [todayAbsen, setTodayAbsen] = useState<string>('--:--:--')

  // Running Text State
  const [runningTexts, setRunningTexts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('alphaPro_runningTexts')
      const parsed = saved ? JSON.parse(saved) : null
      return Array.isArray(parsed) ? parsed : Array(15).fill('')
    } catch (e) {
      return Array(15).fill('')
    }
  })
  const [mainAnnouncement, setMainAnnouncement] = useState<string>(() => {
    return localStorage.getItem('alphaPro_mainAnnouncement') || 'Selamat Datang di ALFAZA CELL'
  })

  // Presets Otomatis State
  const [presets, setPresets] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(`alphaPro_${googleUid}_presets`)
      const parsed = saved ? JSON.parse(saved) : null
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  })

  useEffect(() => {
    if (googleUid) {
      const saved = localStorage.getItem(`alphaPro_${googleUid}_presets`)
      if (saved) {
        try {
          setPresets(JSON.parse(saved))
        } catch(e){}
      }
    }
  }, [googleUid])

  const savePresets = (newPresets: any[]) => {
    setPresets(newPresets)
    if (googleUid) {
      localStorage.setItem(`alphaPro_${googleUid}_presets`, JSON.stringify(newPresets))
    }
  }

  // Store Profile State (with defensive fallbacks)
  const [storeName, setStoreName] = useState<string>(() => {
    return localStorage.getItem('alphaPro_storeName') || 'ALFAZA CELL'
  })
  const [storeSubtext, setStoreSubtext] = useState<string>(() => {
    return localStorage.getItem('alphaPro_storeSubtext') || 'Pembukuan Agen brilink & Konter'
  })
  const [storePhoto, setStorePhoto] = useState<string>(() => {
    return localStorage.getItem('alphaPro_storePhoto') || ''
  })

  const saveStoreName = (name: string) => {
    setStoreName(name)
    localStorage.setItem('alphaPro_storeName', name)
  }
  const saveStoreSubtext = (sub: string) => {
    setStoreSubtext(sub)
    localStorage.setItem('alphaPro_storeSubtext', sub)
  }
  const saveStorePhoto = (photo: string) => {
    setStorePhoto(photo)
    localStorage.setItem('alphaPro_storePhoto', photo)
  }

  const saveRunningTexts = (texts: string[]) => {
    setRunningTexts(texts)
    localStorage.setItem('alphaPro_runningTexts', JSON.stringify(texts))
  }

  const saveMainAnnouncement = (text: string) => {
    setMainAnnouncement(text)
    localStorage.setItem('alphaPro_mainAnnouncement', text)
  }

  // Fetch from Supabase
  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', googleUid)
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error)
      } else if (data) {
        // Map database row to Transaction type
        const mappedTx = data.map(row => ({
          id: row.id,
          kategori: row.kategori,
          nominal: Number(row.nominal),
          adminFee: Number(row.admin_fee),
          keterangan: row.keterangan || '-',
          timestamp: row.timestamp,
          kasir_id: row.kasir_id
        }))
        setTransactions(mappedTx)
      }
    }

    fetchTransactions()

    // Realtime Subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${googleUid}`
        },
        () => {
          // Re-fetch everything on change for simplicity and consistency
          fetchTransactions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [googleUid])

  // Fetch and Record Attendance
  useEffect(() => {
    if (!googleUid || !isLoggedIn || !username) return

    const today = getLocalDateString()
    
    const manageAbsensi = async () => {
      // 1. Check/Record today's attendance for current user
      const { data: current, error: checkError } = await supabase
        .from('absensi')
        .select('*')
        .eq('user_id', googleUid)
        .eq('username', username)
        .eq('tanggal', today)
        .maybeSingle()

      if (!checkError && !current) {
        // Record new attendance
        const now = new Date()
        const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        await supabase.from('absensi').insert({
          user_id: googleUid,
          username,
          nama: account.name,
          tanggal: today,
          jam_masuk: jam,
          status: 'Hadir'
        })
        setTodayAbsen(jam)
      } else if (current) {
        setTodayAbsen(current.jam_masuk)
      }

      // 2. Fetch all attendance for owner view
      const { data: allData } = await supabase
        .from('absensi')
        .select('*')
        .eq('user_id', googleUid)
        .order('tanggal', { ascending: false })
      
      if (allData) setAbsensi(allData)
    }

    manageAbsensi()

    // Realtime attendance updates
    const channel = supabase
      .channel('absensi-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi', filter: `user_id=eq.${googleUid}` }, () => {
        manageAbsensi()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [googleUid, isLoggedIn, username, account?.name])

  // Filter State
  const [filterTanggalMulai, setFilterTanggalMulai] = useState(getLocalDateString())
  const [filterTanggalAkhir, setFilterTanggalAkhir] = useState(getLocalDateString())
  const [filterPencarian, setFilterPencarian] = useState('')
  const [filterKategori, setFilterKategori] = useState<string[]>(['Semua'])
  const [activeSaldoFilter, setActiveSaldoFilter] = useState('Semua')
  const [filterKasir, setFilterKasir] = useState('Semua')
  
  // Laporan Date Filter
  const [filterTanggalLaporan, setFilterTanggalLaporan] = useState(getLocalDateString())
  const [dailyReport, setDailyReport] = useState<any>(null)

  // Recalculate daily balances whenever transactions change
  useEffect(() => {
    let relevantTxs = transactions;
    if (account.role !== 'owner') {
      relevantTxs = transactions.filter(t => t.kasir_id === username);
    } else if (filterKasir !== 'Semua') {
      relevantTxs = transactions.filter(t => t.kasir_id === filterKasir);
    }

    const todayISO = getLocalDateString()
    const todayTxs = relevantTxs.filter(t => t.timestamp.startsWith(todayISO))
    
    let calcSaldoBank = 0
    let calcKasModal = 0
    let calcPenjualan = 0
    let calcAdminFee = 0
    let calcTarikTunai = 0

    todayTxs.forEach(tx => {
      const isKhusus = (tx.keterangan || '').includes('[KHUSUS]');
      const isNonTunai = (tx.keterangan || '').includes('[NON_TUNAI]');
      const isAdminDalam = (tx.keterangan || '').includes('[ADMIN_DALAM]');
      const isAksesoris = tx.kategori === 'Aksesoris';
      
      if (tx.kategori === 'Isi Saldo Bank') calcSaldoBank += tx.nominal
      if (tx.kategori === 'Isi Modal Tunai Kasir') calcKasModal += tx.nominal
      
      if (['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(tx.kategori)) {
        calcSaldoBank -= tx.nominal
        // Jika KHUSUS atau NON_TUNAI, masuk ke Kas Lainnya, bukan Penjualan Digital
        if (!(isKhusus || isNonTunai)) {
          calcPenjualan += tx.nominal
        }
      }

      if (isAksesoris) {
        calcPenjualan += tx.nominal
      }

      if (tx.kategori === 'Tarik Tunai') {
        calcTarikTunai += tx.nominal
      }

      if (tx.kategori === 'Kas Lainnya') {
        // Obsolete
      }

      // Hitung Admin Fee
      if (!(isAdminDalam || isNonTunai || isKhusus)) {
        calcAdminFee += (tx.adminFee || 0)
      }
    })

    setSaldoBank(calcSaldoBank)
    setKasModal(calcKasModal)
    setTotalPenjualan(calcPenjualan)
  }, [transactions, account?.role, username, filterKasir])

  // Fetch Aggregated Report for LaporanView
  useEffect(() => {
    const fetchDailyReport = async () => {

      const { data } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', googleUid)
        .eq('tanggal', filterTanggalLaporan)
        .maybeSingle()
      
      if (data) {
        setDailyReport({
          saldoBank: Number(data.saldo_bank),
          kasModal: Number(data.modal_kasir),
          penjualanDigital: Number(data.penjualan_digital),
          totalAksesoris: Number(data.penjualan_aksesoris),
          totalAdmin: Number(data.total_admin),
          totalTarik: Number(data.total_tarik),
          kasLainnya: Number(data.kas_lainnya || 0),
          saldoReal: Number(data.saldo_real || 0),
          totalSaldoKas: Number(data.modal_kasir) + Number(data.penjualan_digital) + Number(data.penjualan_aksesoris) + Number(data.total_admin) - Number(data.total_tarik)
        })
      } else {
        // Fallback: Calculate manually
        const dateTxs = transactions.filter(t => t.timestamp.startsWith(filterTanggalLaporan))
        let filteredTxs = dateTxs;
        if (account?.role !== 'owner') {
          filteredTxs = dateTxs.filter(t => t.kasir_id === username)
        } else if (filterKasir !== 'Semua') {
          filteredTxs = dateTxs.filter(t => t.kasir_id === filterKasir)
        }

        let sBank = 0, kMod = 0, pDig = 0, pAks = 0, tAdm = 0, tTar = 0, kKhusus = 0, kNonTunai = 0;
        filteredTxs.forEach(tx => {
          const isKhusus = (tx.keterangan || '').includes('[KHUSUS]');
          const isNonTunai = (tx.keterangan || '').includes('[NON_TUNAI]');
          const isLain = isKhusus || isNonTunai;
          const isAksesoris = tx.kategori === 'Aksesoris';
          
          if (tx.kategori === 'Isi Saldo Bank') sBank += tx.nominal;
          if (tx.kategori === 'Isi Modal Tunai Kasir') kMod += tx.nominal;
          
          if (['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(tx.kategori)) {
            sBank -= tx.nominal;
            if (!isLain) pDig += tx.nominal;
          }
          
          if (isAksesoris && !isLain) pAks += tx.nominal;
          if (tx.kategori === 'Tarik Tunai' && !isLain) tTar += tx.nominal;
          if (!isLain) tAdm += tx.adminFee;

          // Hitung detail Kas Lainnya untuk laporan
          if (isKhusus) kKhusus += (tx.nominal + tx.adminFee);
          if (isNonTunai) kNonTunai += (tx.nominal + tx.adminFee);
        });

        setDailyReport({
          saldoBank: sBank,
          kasModal: kMod,
          penjualanDigital: pDig,
          totalAksesoris: pAks,
          totalAdmin: tAdm,
          totalTarik: tTar,
          kasLainnya: kKhusus + kNonTunai,
          totalKhusus: kKhusus,
          totalNonTunai: kNonTunai,
          saldoReal: 0,
          totalSaldoKas: kMod + pDig + pAks + tAdm - tTar
        })
      }
    }

    if (googleUid && isLoggedIn) {
      fetchDailyReport()
    }
  }, [googleUid, isLoggedIn, filterTanggalLaporan, filterKasir, username, account?.role, transactions])
  
  // Form State
  const [formKategori, setFormKategori] = useState('')
  const [formNominal, setFormNominal] = useState('')
  const [formAdmin, setFormAdmin] = useState('')
  const [formKeterangan, setFormKeterangan] = useState('')
  
  // Isi Saldo State
  const [isiJenis, setIsiJenis] = useState('')
  const [isiNominal, setIsiNominal] = useState('')
  const [isiKeterangan, setIsiKeterangan] = useState('')

  // Filter states moved above useEffect
  // Edit Transaction State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editKategori, setEditKategori] = useState('')
  const [editNominal, setEditNominal] = useState('')
  const [editAdmin, setEditAdmin] = useState('')
  const [editKeterangan, setEditKeterangan] = useState('')
  
  // Loading & Notification State
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ show: boolean, message: string } | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean, title: string, message: string, onConfirm: () => void } | null>(null)

  const editNominalRef = useRef<HTMLInputElement>(null)
  const editAdminRef = useRef<HTMLInputElement>(null)
  const editKeteranganRef = useRef<HTMLTextAreaElement>(null)

  const handleEditKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>, isLast: boolean = false) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isLast) {
        handleSaveEdit()
      } else {
        nextRef?.current?.focus()
      }
    }
  }

  // Daily Reset Check (Only alerts now, balances are calculated from today's txs automatically)
  useEffect(() => {
    const checkReset = () => {
      const today = new Date().toLocaleDateString('id-ID')
      const lastReset = localStorage.getItem(`alphaPro_${googleUid}_${username}_last_reset_date`)

      if (lastReset && lastReset !== today) {
        showToast(`HARI BARU: ${today}`);
      }
      localStorage.setItem(`alphaPro_${googleUid}_${username}_last_reset_date`, today)
    }

    checkReset()
    const interval = setInterval(checkReset, 60000)
    return () => clearInterval(interval)
  }, [googleUid, username])

  // Handlers
  const showToast = (msg: string) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ show: true, title, message, onConfirm })
  }

  const handleSimpanTransaksi = (options?: { activeTab: string, subTab: string, isAdminNonTunai: boolean }) => {
    if (isSaving) return
    const nominal = parseNominal(formNominal)
    const admin = parseNominal(formAdmin)
    
    if (!formKategori) return showToast('Pilih kategori transaksi!')
    if (nominal <= 0) return showToast('Masukkan nominal yang valid!')

    setIsSaving(true)
    
    let finalKeterangan = formKeterangan || '-';
    if (options) {
      if (options.isAdminNonTunai) finalKeterangan += ' [ADMIN_DALAM]';
      if (options.activeTab === 'LAIN') {
        if (options.subTab.toLowerCase() === 'khusus') finalKeterangan += ' [KHUSUS]';
        if (options.subTab.toLowerCase() === 'non_tunai') finalKeterangan += ' [NON_TUNAI]';
      }
    }

    let finalNominal = nominal;
    let finalAdmin = admin;

    if (formKategori === 'Order Kuota') {
      finalAdmin = admin - nominal;
      finalNominal = nominal;
    }

    // Proses simpan ke Supabase
    const id = Date.now().toString()
    const newTx = {
      id,
      user_id: googleUid,
      kasir_id: username,
      kategori: formKategori,
      nominal: finalNominal,
      admin_fee: finalAdmin,
      keterangan: finalKeterangan,
      timestamp: getLocalISOString()
    }

    supabase.from('transactions').insert(newTx).then(({ error }) => {
      setIsSaving(false)
      if (error) {
        showToast('Gagal simpan: ' + error.message)
      } else {
        // Optimistic UI Update
        const optimisticTx: Transaction = {
          id: newTx.id,
          kategori: newTx.kategori,
          nominal: newTx.nominal,
          adminFee: newTx.admin_fee,
          keterangan: newTx.keterangan,
          timestamp: newTx.timestamp,
          kasir_id: newTx.kasir_id
        }
        setTransactions(prev => [optimisticTx, ...prev])

        setFormKategori('')
        setFormNominal('')
        setFormAdmin('')
        setFormKeterangan('')
        showToast('Transaksi Berhasil Disimpan!')
      }
    })
  }

  const handleOwnerTambahModal = (kasirId: string, nominal: number, kategori: string) => {
    if (isSaving) return
    setIsSaving(true)

    const id = Date.now().toString()
    const newTx = {
      id,
      user_id: googleUid,
      kasir_id: kasirId,
      kategori: kategori,
      nominal,
      admin_fee: 0,
      keterangan: 'Topup Modal by Owner',
      timestamp: getLocalISOString()
    }

    supabase.from('transactions').insert(newTx).then(({ error }) => {
      setIsSaving(false)
      if (error) {
        showToast('Gagal tambah modal: ' + error.message)
      } else {
        const optimisticTx: Transaction = {
          id: newTx.id,
          kategori: newTx.kategori,
          nominal: newTx.nominal,
          adminFee: newTx.admin_fee,
          keterangan: newTx.keterangan,
          timestamp: newTx.timestamp,
          kasir_id: newTx.kasir_id
        }
        setTransactions(prev => [optimisticTx, ...prev])
        showToast(`Modal ${kasirId} berhasil ditambahkan!`)
      }
    })
  }

  const handleSimpanIsiSaldo = () => {
    if (isSaving) return
    const nominal = parseNominal(isiNominal)
    if (!isiJenis) return showToast('Pilih jenis saldo!')
    if (nominal <= 0) return showToast('Nominal tidak valid!')

    setIsSaving(true)

    const id = Date.now().toString()
    const newTx = {
      id,
      user_id: googleUid,
      kasir_id: username,
      kategori: 'Isi ' + isiJenis,
      nominal,
      admin_fee: 0,
      keterangan: isiKeterangan || 'Setoran Saldo',
      timestamp: getLocalISOString()
    }

    supabase.from('transactions').insert(newTx).then(({ error }) => {
      setIsSaving(false)
      if (error) {
        showToast('Gagal update: ' + error.message)
      } else {
        // Optimistic UI Update
        const optimisticTx: Transaction = {
          id: newTx.id,
          kategori: newTx.kategori,
          nominal: newTx.nominal,
          adminFee: newTx.admin_fee,
          keterangan: newTx.keterangan,
          timestamp: newTx.timestamp,
          kasir_id: newTx.kasir_id
        }
        setTransactions(prev => [optimisticTx, ...prev])

        setIsiJenis('')
        setIsiNominal('')
        setIsiKeterangan('')
        showToast('Saldo Berhasil Diperbarui!')
        setActiveView('view-beranda')
      }
    })
  }

  const handleStartEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setEditKategori(tx.kategori)
    setEditNominal(tx.nominal.toLocaleString('id-ID').replace(/,/g, '.'))
    setEditAdmin(tx.adminFee.toLocaleString('id-ID').replace(/,/g, '.'))
    setEditKeterangan(tx.keterangan)
  }

  const handleSaveEdit = () => {
    if (!editingTx || isSaving) return
    const newNominal = parseNominal(editNominal)
    const newAdmin = parseNominal(editAdmin)

    setIsSaving(true)

    supabase.from('transactions').update({
      kategori: editKategori,
      nominal: newNominal,
      admin_fee: newAdmin,
      keterangan: editKeterangan,
    }).eq('id', editingTx.id).then(({ error }) => {
      setIsSaving(false)
      if (error) {
        showToast('Gagal edit: ' + error.message)
      } else {
        // Optimistic UI Update
        setTransactions(prev => prev.map(t => {
          if (t.id === editingTx.id) {
            return {
              ...t,
              kategori: editKategori,
              nominal: newNominal,
              adminFee: newAdmin,
              keterangan: editKeterangan,
              isEdited: true,
            }
          }
          return t
        }))

        setEditingTx(null)
        showToast('Transaksi Berhasil Diperbarui!')
      }
    })
  }

  const handleDeleteTx = (tx: Transaction) => {
    handleConfirm('HAPUS TRANSAKSI', 'Hapus permanen transaksi ini?', () => {
      supabase.from('transactions').delete().eq('id', tx.id).then(({ error }) => {
        if (error) {
          showToast('Gagal menghapus: ' + error.message)
        } else {
          setTransactions(prev => prev.filter(t => t.id !== tx.id))
          showToast('Berhasil Dihapus!')
        }
      })
    })
  }

  // Today's Date in Local Time (YYYY-MM-DD)
  const todayISO = new Date().toLocaleDateString('en-CA')
  
  // Apply Kasir Filter (Owner sees all/filtered, Kasir ONLY sees their own)
  const displayTransactions = account.role === 'owner' 
    ? (filterKasir !== 'Semua' ? transactions.filter(t => t.kasir_id === filterKasir) : transactions)
    : transactions.filter(t => t.kasir_id === username);

  // Filtered Transactions for Dashboard (Today Only)
  const todayTransactions = displayTransactions.filter(t => t.timestamp.startsWith(todayISO))

  // Derived Calculations (Dashboard - Today Only)
  // Exclude [KHUSUS] and [NON_TUNAI] from totals that affect Cashier Drawer, but ALWAYS include Aksesoris
  
  const totalTarik = todayTransactions
    .filter(t => t.kategori === 'Tarik Tunai' && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]'))
    .reduce((s, t) => s + t.nominal, 0)

  const totalAdmin = todayTransactions
    .filter(t => !t.kategori.startsWith('Isi') && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]'))
    .reduce((s, t) => s + t.adminFee, 0)

  const totalAksesoris = todayTransactions
    .filter(t => t.kategori === 'Aksesoris' && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]'))
    .reduce((s, t) => s + t.nominal, 0)

  const totalVolume = todayTransactions.filter(t => !t.kategori.startsWith('Isi')).reduce((s, t) => s + t.nominal, 0)
  
  // Penjualan Digital: Transfer + DANA + FLIP + Kuota (Today Only, Cashier drawer only)
  const penjualanDigital = todayTransactions
    .filter(t => ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori) && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]'))
    .reduce((s, t) => s + t.nominal, 0)

  // Saldo Real Aplikasi: Akumulasi dari input manual di Isi Saldo (Today Only)
  const totalSaldoReal = todayTransactions
    .filter(t => t.kategori === 'Isi Saldo Real Aplikasi')
    .reduce((s, t) => s + t.nominal, 0)

  const totalKhusus = todayTransactions
    .filter(t => (t.keterangan || '').includes('[KHUSUS]'))
    .reduce((s, t) => s + (t.nominal + t.adminFee), 0)

  const totalNonTunai = todayTransactions
    .filter(t => (t.keterangan || '').includes('[NON_TUNAI]'))
    .reduce((s, t) => s + (t.nominal + t.adminFee), 0)

  const kasLainnya = totalKhusus + totalNonTunai

  // Saldo Laci Kasir (Cumulative Calculation)
  const totalSaldoKas = kasModal + penjualanDigital + totalAksesoris + totalAdmin - totalTarik

  return (
    <div className={cn("app-container", `theme-${theme}`, screenSize !== 'auto' && screenSize)}>
      
      <BerandaView 
        active={activeView === 'view-beranda' || isOwnerView} 
        activeView={activeView}
        setIsSidePanelOpen={setIsSidePanelOpen}
        setActiveView={setActiveView}
        saldoBank={saldoBank}
        totalPenjualan={totalPenjualan}
        lastTx={todayTransactions.find(t => !t.kategori.startsWith('Isi'))}
        formKategori={formKategori}
        setFormKategori={setFormKategori}
        formNominal={formNominal}
        setFormNominal={setFormNominal}
        formAdmin={formAdmin}
        setFormAdmin={setFormAdmin}
        formKeterangan={formKeterangan}
        setFormKeterangan={setFormKeterangan}
        handleSimpanTransaksi={handleSimpanTransaksi}
        transactions={todayTransactions}
        isSaving={isSaving}
        totalAdmin={totalAdmin}
        totalVolume={totalVolume}
        totalAksesoris={totalAksesoris}
        totalTarik={totalTarik}
        totalSaldoKas={totalSaldoKas}
        penjualanDigital={penjualanDigital}
        kasModal={kasModal}
        kasirName={account.name}
        kasirRole={account.role}
        filterKasir={filterKasir}
        setFilterKasir={setFilterKasir}
        onLogout={onLogout}
        kasirList={kasirList}
        refreshKasirList={refreshKasirList}
        jamAbsen={todayAbsen}
        absensiList={absensi}
        runningTexts={runningTexts}
        mainAnnouncement={mainAnnouncement}
        storeName={storeName}
        storeSubtext={storeSubtext}
        storePhoto={storePhoto}
        handleOwnerTambahModal={handleOwnerTambahModal}
        kasLainnya={kasLainnya}
        totalKhusus={totalKhusus}
        totalNonTunai={totalNonTunai}
        username={username}
        showToast={showToast}
        onConfirm={handleConfirm}
        presets={presets}
      />

      <RiwayatView 
        active={activeView === 'view-transaksi'}
        setActiveView={setActiveView}
        transactions={displayTransactions}
        filterTanggalMulai={filterTanggalMulai}
        setFilterTanggalMulai={setFilterTanggalMulai}
        filterTanggalAkhir={filterTanggalAkhir}
        setFilterTanggalAkhir={setFilterTanggalAkhir}
        filterPencarian={filterPencarian}
        setFilterPencarian={setFilterPencarian}
        filterKategori={filterKategori}
        setFilterKategori={setFilterKategori}
        activeSaldoFilter={activeSaldoFilter}
        setActiveSaldoFilter={setActiveSaldoFilter}
        kasirRole={account.role}
        filterKasir={filterKasir}
        setFilterKasir={setFilterKasir}
        kasirList={kasirList}
        onEdit={handleStartEdit}
        onDelete={handleDeleteTx}
        storeName={storeName}
        storeSubtext={storeSubtext}
        storePhoto={storePhoto}
        kasirName={account.name}
        setIsSidePanelOpen={setIsSidePanelOpen}
      />

      <LaporanView 
        active={activeView === 'view-laporan'}
        setActiveView={setActiveView}
        saldoBank={dailyReport ? dailyReport.saldoBank : saldoBank}
        totalPenjualan={dailyReport ? (dailyReport.penjualanDigital + dailyReport.totalAksesoris) : totalPenjualan}
        transactions={displayTransactions.filter(t => t.timestamp.startsWith(filterTanggalLaporan))}
        totalTarik={dailyReport ? dailyReport.totalTarik : totalTarik}
        totalAdmin={dailyReport ? dailyReport.totalAdmin : totalAdmin}
        totalAksesoris={dailyReport ? dailyReport.totalAksesoris : totalAksesoris}
        totalVolume={totalVolume}
        totalSaldoKas={dailyReport ? dailyReport.totalSaldoKas : totalSaldoKas}
        penjualanDigital={dailyReport ? dailyReport.penjualanDigital : penjualanDigital}
        kasModal={dailyReport ? dailyReport.kasModal : kasModal}
        kasLainnya={dailyReport ? dailyReport.kasLainnya : kasLainnya}
        kasirRole={account.role}
        filterKasir={filterKasir}
        setFilterKasir={setFilterKasir}
        filterTanggal={filterTanggalLaporan}
        setFilterTanggal={setFilterTanggalLaporan}
        saldoReal={
          filterTanggalLaporan === todayISO 
            ? totalSaldoReal 
            : displayTransactions
                .filter(t => t.timestamp.startsWith(filterTanggalLaporan) && t.kategori === 'Isi Saldo Real Aplikasi')
                .reduce((s, t) => s + t.nominal, 0)
        }
        onEdit={handleStartEdit}
        onDelete={handleDeleteTx}
        kasirList={kasirList}
        storeName={storeName}
        storeSubtext={storeSubtext}
        storePhoto={storePhoto}
        kasirName={account.name}
        setIsSidePanelOpen={setIsSidePanelOpen}
      />

      <AkunView 
        active={activeView === 'view-akun'} 
        setActiveView={setActiveView}
        kasirName={account.name}
        kasirRole={account.role}
        onLogout={onLogout}
        onRequestLogout={() => setShowLogoutConfirm(true)}
        runningTexts={runningTexts}
        mainAnnouncement={mainAnnouncement}
        onSaveRunningTexts={saveRunningTexts}
        onSaveMainAnnouncement={saveMainAnnouncement}
        storeName={storeName}
        storeSubtext={storeSubtext}
        storePhoto={storePhoto}
        onSaveStoreName={saveStoreName}
        onSaveStoreSubtext={saveStoreSubtext}
        onSaveStorePhoto={saveStorePhoto}
        setIsSidePanelOpen={setIsSidePanelOpen}
      />

      <IsiSaldoView 
        active={activeView === 'view-isi-saldo'}
        setActiveView={setActiveView}
        isiJenis={isiJenis}
        setIsiJenis={setIsiJenis}
        isiNominal={isiNominal}
        setIsiNominal={setIsiNominal}
        isiKeterangan={isiKeterangan}
        setIsiKeterangan={setIsiKeterangan}
        handleSimpanIsiSaldo={handleSimpanIsiSaldo}
        isSaving={isSaving}
        showToast={showToast}
        storeName={storeName}
        storeSubtext={storeSubtext}
        storePhoto={storePhoto}
        kasirName={account.name}
        kasirRole={account.role}
        setIsSidePanelOpen={setIsSidePanelOpen}
      />

      <KasbonView active={activeView === 'view-kasbon'} setActiveView={setActiveView} kasirName={account.name} showToast={showToast} onConfirm={handleConfirm} />
      <KontakView active={activeView === 'view-kontak'} setActiveView={setActiveView} kasirName={account.name} showToast={showToast} onConfirm={handleConfirm} />
      <VoucherView active={activeView === 'view-stok-voucher'} setActiveView={setActiveView} showToast={showToast} onConfirm={handleConfirm} />
      <KalenderView active={activeView === 'view-kalender'} setActiveView={setActiveView} showToast={showToast} onConfirm={handleConfirm} />
      <NotaView active={activeView === 'view-nota'} setActiveView={setActiveView} showToast={showToast} onConfirm={handleConfirm} />
      <OtomatisView 
        active={activeView === 'view-otomatis'} 
        setActiveView={setActiveView} 
        showToast={showToast} 
        presets={presets}
        setPresets={savePresets}
        storeName={storeName}
        storeSubtext={storeSubtext}
        storePhoto={storePhoto}
        kasirName={account.name}
        kasirRole={account.role}
        setIsSidePanelOpen={setIsSidePanelOpen}
      />

      <Navigation activeView={activeView} setActiveView={setActiveView} />

      <SidePanel 
        isOpen={isSidePanelOpen}
        setIsOpen={setIsSidePanelOpen}
        theme={theme}
        setTheme={setTheme}
        screenSize={screenSize}
        setScreenSize={setScreenSize}
        jamAbsen={todayAbsen}
        kasirName={account.name}
        storeName={storeName}
        storeSubtext={storeSubtext}
      />


      {/* Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xs uppercase tracking-widest text-blue-800">
                <i className="fa-solid fa-pen-to-square mr-2"></i> Edit Transaksi
              </h3>
              <button onClick={() => setEditingTx(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block tracking-tighter">Kategori</label>
              <div className="relative">
                <select 
                  value={editKategori} 
                  onChange={e => setEditKategori(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(e, editNominalRef)}
                  className="form-input-modern w-full appearance-none pr-8"
                >
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="DANA">DANA</option>
                  <option value="FLIP">FLIP</option>
                  <option value="Order Kuota">Order Kuota</option>
                  <option value="Tarik Tunai">Tarik Tunai</option>
                  <option value="Aksesoris">Aksesoris</option>
                </select>
                <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>
              </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block tracking-tighter">Nominal</label>
                  <input 
                    ref={editNominalRef}
                    value={editNominal} 
                    onChange={e => setEditNominal(formatInputRupiah(e.target.value))}
                    onKeyDown={(e) => handleEditKeyDown(e, editAdminRef)}
                    className="form-input-modern w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block tracking-tighter">Admin</label>
                  <input 
                    ref={editAdminRef}
                    value={editAdmin} 
                    onChange={e => setEditAdmin(formatInputRupiah(e.target.value))}
                    onKeyDown={(e) => handleEditKeyDown(e, editKeteranganRef)}
                    className="form-input-modern w-full text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block tracking-tighter">Keterangan</label>
                <textarea 
                  ref={editKeteranganRef}
                  value={editKeterangan} 
                  onChange={e => setEditKeterangan(e.target.value)}
                  rows={2}
                  onKeyDown={(e) => handleEditKeyDown(e, undefined, true)}
                  className="form-input-modern w-full resize-none"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="w-full bg-blue-700 text-white font-black py-4 rounded-2xl text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-70 disabled:scale-100"
            >
              {isSaving ? (
                <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
              ) : (
                <i className="fa-solid fa-check-circle"></i>
              )}
              {isSaving ? "SEDANG MENYIMPAN..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}

      {/* Floating Success Notification */}
      {toast && (
        <div className="fixed bottom-24 left-0 right-0 z-[200] flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white/20 backdrop-blur-md">
            <div className="w-5 h-5 bg-white text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
              <i className="fa-solid fa-check text-[10px] font-black"></i>
            </div>
            <span className="font-black text-[10px] uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Global Confirm Dialog */}
      {confirmDialog && confirmDialog.show && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-xs shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <i className="fa-solid fa-circle-question text-2xl"></i>
            </div>
            <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 mb-2">{confirmDialog.title}</h3>
            <p className="text-[11px] font-bold text-gray-500 mb-6 leading-relaxed px-2">{confirmDialog.message}</p>
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="flex-1 bg-gray-100 text-gray-500 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all"
              >
                Ya, Lanjut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Notif */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-xs shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <i className="fa-solid fa-power-off text-2xl"></i>
            </div>
            <h3 className="font-black text-xs uppercase tracking-widest text-red-600 mb-2">KONFIRMASI KELUAR</h3>
            <p className="text-[11px] font-bold text-gray-500 mb-6 leading-relaxed px-2">Yakin ingin keluar dari sesi kasir ini?</p>
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-500 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                className="flex-1 bg-red-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}

export default App
