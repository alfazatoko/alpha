import React, { useState, useEffect, useRef, useCallback } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { parseNominal, formatRupiah, formatInputRupiah, cn, getLocalISOString, getLocalDateString } from './lib/utils'
import type { Transaction } from './types'

// Components
import Navigation from './components/Navigation'
import SidePanel from './components/SidePanel'
import SidebarPC from './components/SidebarPC'
import TransactionForm from './components/TransactionForm'
import SummaryCards from './components/SummaryCards'
import LoginScreen, { type KasirAccount } from './components/LoginScreen'
import { GoogleAuthScreen } from './components/GoogleAuthScreen'
import { supabase } from './lib/supabase'
import { SelectorScreen } from './components/SelectorScreen'
import type { Store } from './types'


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

  // ── Multi-Store States ──
  const [selectedRole, setSelectedRole] = useState<'owner' | 'kasir' | null>(null)
  const [activeStoreId, setActiveStoreId] = useState<string | 'all'>('all')
  const [activeStore, setActiveStore] = useState<Store | null>(null)

  // ── Kasir Profile State ──
  const [isLoggedIn, setIsLoggedIn] = useState(hasBypass ? true : false)
  const [currentUsername, setCurrentUsername] = useState(hasBypass ? 'demo_owner' : '')
  const [currentAccount, setCurrentAccount] = useState<KasirAccount | null>(hasBypass ? { name: 'Demo Owner', role: 'owner', pin: '1234' } : null)
  const [kasirList, setKasirList] = useState<Record<string, KasirAccount>>({})

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
    const storedRole = localStorage.getItem('alphaPro_active_role') as 'owner' | 'kasir' | null
    const storedStoreId = localStorage.getItem('alphaPro_active_store_id') || 'all'
    const storedStore = localStorage.getItem('alphaPro_active_store')

    if (storedRole) {
      setSelectedRole(storedRole)
      setActiveStoreId(storedStoreId)
      if (storedStore) {
        try { setActiveStore(JSON.parse(storedStore)) } catch(e){}
      }

      if (storedRole === 'owner') {
        setIsLoggedIn(true)
        setCurrentUsername('owner')
        setCurrentAccount({ name: 'Owner', role: 'owner', pin: '' })
      } else if (storedLoggedIn === 'true' && storedUsername) {
        const storeKasirs = localStorage.getItem(`alphaPro_${storedStoreId}_kasir_list`)
        let kList: Record<string, KasirAccount> = {}
        
        if (storeKasirs) {
          try {
            kList = JSON.parse(storeKasirs)
          } catch(e){}
        }
        
        
        if (kList[storedUsername]) {
          setIsLoggedIn(true)
          setCurrentUsername(storedUsername)
          setCurrentAccount(kList[storedUsername])
          setKasirList(kList)
        }
      }
    }
  }, [])

  // Fetch store settings when activeStoreId changes
  useEffect(() => {
    if (!googleSession || activeStoreId === 'all') return

    const fetchStoreSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .eq('store_id', activeStoreId)
          .maybeSingle()

        if (error) throw error

        if (data) {
          const cList = data.cashiers || {}
          setKasirList(cList)
          localStorage.setItem(`alphaPro_${activeStoreId}_kasir_list`, JSON.stringify(cList))
        } else {
          setKasirList({})
        }
      } catch (err) {
        console.error('Error fetching store settings:', err)
      }
    }

    fetchStoreSettings()
  }, [activeStoreId, googleSession])

  // ── Login / Logout Handlers ──
  const handleLogin = useCallback((username: string, account: KasirAccount) => {
    localStorage.setItem('alphaPro_loggedIn', 'true')
    localStorage.setItem('alphaPro_username', username)
    localStorage.setItem('alphaPro_name', account.name)
    localStorage.setItem('alphaPro_role', account.role)
    setIsLoggedIn(true)
    setCurrentUsername(username)
    setCurrentAccount(account)
    window.location.hash = '#/beranda'
  }, [])

  const handleSelectRole = (role: 'owner' | 'kasir', storeId: string | 'all', store?: Store) => {
    setSelectedRole(role)
    setActiveStoreId(storeId)
    setActiveStore(store || null)
    localStorage.setItem('alphaPro_active_role', role)
    localStorage.setItem('alphaPro_active_store_id', storeId)
    if (store) {
      localStorage.setItem('alphaPro_active_store', JSON.stringify(store))
    } else {
      localStorage.removeItem('alphaPro_active_store')
    }

    window.location.hash = '#/beranda'

    if (role === 'owner') {
      localStorage.setItem('alphaPro_loggedIn', 'true')
      localStorage.setItem('alphaPro_username', 'owner')
      localStorage.setItem('alphaPro_name', 'Owner')
      localStorage.setItem('alphaPro_role', 'owner')
      setIsLoggedIn(true)
      setCurrentUsername('owner')
      setCurrentAccount({ name: 'Owner', role: 'owner', pin: '' })
    } else {
      localStorage.removeItem('alphaPro_loggedIn')
      localStorage.removeItem('alphaPro_username')
      localStorage.removeItem('alphaPro_name')
      localStorage.removeItem('alphaPro_role')
      setIsLoggedIn(false)
      setCurrentUsername('')
      setCurrentAccount(null)
      // ── ISOLASI KASIRLIST PER-TOKO ──
      // Reset kasirList dulu, lalu load dari localStorage toko yang dipilih.
      // Ini mencegah nama kasir toko lain bocor ke LoginScreen kasir.
      setKasirList({})
      if (storeId && storeId !== 'all') {
        try {
          const storedList = localStorage.getItem(`alphaPro_${storeId}_kasir_list`)
          if (storedList) setKasirList(JSON.parse(storedList))
        } catch(e) {
          console.error('Gagal load kasirList dari localStorage:', e)
        }
      }
    }
  }

  const handleExitStore = () => {
    localStorage.removeItem('alphaPro_loggedIn')
    localStorage.removeItem('alphaPro_username')
    localStorage.removeItem('alphaPro_name')
    localStorage.removeItem('alphaPro_role')
    localStorage.removeItem('alphaPro_active_role')
    localStorage.removeItem('alphaPro_active_store_id')
    localStorage.removeItem('alphaPro_active_store')
    setSelectedRole(null)
    setActiveStoreId('all')
    setActiveStore(null)
    setIsLoggedIn(false)
    setCurrentUsername('')
    setCurrentAccount(null)
    window.location.hash = '#/beranda'
  }

  const handleLogoutCashierOnly = () => {
    localStorage.removeItem('alphaPro_loggedIn')
    localStorage.removeItem('alphaPro_username')
    localStorage.removeItem('alphaPro_name')
    localStorage.removeItem('alphaPro_role')
    setIsLoggedIn(false)
    setCurrentUsername('')
    setCurrentAccount(null)
    window.location.hash = '#/beranda'
  }

  const handleLogoutGoogle = async () => {
    localStorage.clear()
    setSelectedRole(null)
    setActiveStoreId('all')
    setActiveStore(null)
    setIsLoggedIn(false)
    setCurrentUsername('')
    setCurrentAccount(null)
    window.location.hash = '#/beranda'
    await supabase.auth.signOut()
  }

  // ── Show loading if checking auth ──
  if (isCheckingAuth) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-50"><i className="fa-solid fa-circle-notch fa-spin text-blue-600 text-3xl"></i></div>
  }

  // ── Show Google Login if not authenticated ──
  if (!googleSession) {
    return <GoogleAuthScreen />
  }

  // ── Show Selector Screen if role not selected ──
  if (!selectedRole) {
    return (
      <SelectorScreen 
        googleUid={googleSession.user.id} 
        googleEmail={googleSession.user.email} 
        onSelectRole={handleSelectRole} 
        onLogoutGoogle={handleLogoutGoogle} 
      />
    )
  }

  // ── Show Profile Selection (Kasir) if not logged in ──
  if (!isLoggedIn || !currentAccount) {
    return (
      <div className="relative">
        <button 
          onClick={handleExitStore} 
          className="absolute top-4 right-4 z-50 bg-white/50 backdrop-blur-md px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-600 border border-blue-100 hover:bg-blue-50 transition-all shadow-md"
        >
          Pilih Toko Lain
        </button>
        <LoginScreen 
          onLogin={handleLogin} 
          storeName={activeStore?.name} 
          kasirListOverride={kasirList} 
        />
      </div>
    )
  }

  // ── Everything below only renders when fully logged in ──
  return (
    <MainApp 
      username={currentUsername} 
      account={currentAccount} 
      googleUid={googleSession.user.id} 
      googleEmail={googleSession.user.email}
      onLogout={selectedRole === 'owner' ? handleExitStore : handleLogoutCashierOnly}
      kasirList={kasirList}
      setKasirList={setKasirList}
      refreshKasirList={(newList) => { if (newList) setKasirList(newList) }}
      isLoggedIn={isLoggedIn}
      activeStoreId={activeStoreId}
      activeRole={selectedRole}
      activeStore={activeStore}
      onUpdateActiveCashier={(uname, acc) => {
        setCurrentUsername(uname)
        setCurrentAccount(acc)
      }}
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
  googleEmail?: string
  onLogout: () => void
  kasirList: Record<string, KasirAccount>
  setKasirList: React.Dispatch<React.SetStateAction<Record<string, KasirAccount>>>
  refreshKasirList: (newList?: Record<string, KasirAccount>) => void
  isLoggedIn: boolean
  activeStoreId: string | 'all'
  activeRole: 'owner' | 'kasir'
  activeStore: Store | null
  onUpdateActiveCashier: (username: string, account: KasirAccount) => void
}

const MainApp: React.FC<MainAppProps> = ({ 
  username, 
  account, 
  googleUid, 
  googleEmail, 
  onLogout, 
  kasirList, 
  setKasirList,
  refreshKasirList, 
  isLoggedIn,
  activeStoreId,
  activeRole,
  activeStore,
  onUpdateActiveCashier
}) => {

  // PWA Update State
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // Navigation State
  const [activeView, setActiveView] = useState('view-beranda')

  // ── Multi-Store States & Derived Store Info ──
  const [pantauStoreId, setPantauStoreId] = useState<string | 'all'>(activeStoreId)
  const [stores, setStores] = useState<Store[]>([])
  const targetStoreId = activeRole === 'owner' ? pantauStoreId : activeStoreId

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
      const key = activeStoreId !== 'all' ? `alphaPro_${activeStoreId}_runningTexts` : 'alphaPro_runningTexts'
      const saved = localStorage.getItem(key)
      const parsed = saved ? JSON.parse(saved) : null
      return Array.isArray(parsed) ? parsed : Array(15).fill('')
    } catch (e) {
      return Array(15).fill('')
    }
  })
  const [mainAnnouncement, setMainAnnouncement] = useState<string>(() => {
    const key = activeStoreId !== 'all' ? `alphaPro_${activeStoreId}_mainAnnouncement` : 'alphaPro_mainAnnouncement'
    return localStorage.getItem(key) || 'Selamat Datang di ALFAZA CELL'
  })

  // Presets Otomatis State
  const [presets, setPresets] = useState<any[]>(() => {
    try {
      const key = activeStoreId !== 'all' ? `alphaPro_${googleUid}_${activeStoreId}_presets` : `alphaPro_${googleUid}_presets`
      const saved = localStorage.getItem(key)
      const parsed = saved ? JSON.parse(saved) : null
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  })

  useEffect(() => {
    if (googleUid) {
      const key = activeStoreId !== 'all' ? `alphaPro_${googleUid}_${activeStoreId}_presets` : `alphaPro_${googleUid}_presets`
      const saved = localStorage.getItem(key)
      if (saved) {
        try {
          setPresets(JSON.parse(saved))
        } catch(e){}
      } else {
        setPresets([])
      }
    }
  }, [googleUid, activeStoreId])

  const handleUploadToCloud = async () => {
    if (!googleUid || targetStoreId === 'all') return
    
    // Save locally
    localStorage.setItem(`alphaPro_${targetStoreId}_kasir_list`, JSON.stringify(kasirList))
    localStorage.setItem(`alphaPro_${googleUid}_${targetStoreId}_presets`, JSON.stringify(presets))
    localStorage.setItem(`alphaPro_${targetStoreId}_runningTexts`, JSON.stringify(runningTexts))
    localStorage.setItem(`alphaPro_${targetStoreId}_mainAnnouncement`, mainAnnouncement)

    const isPin = localStorage.getItem(`alphaPro_${targetStoreId}_isPinEnabled`) !== 'false'

    const { error } = await supabase.from('store_settings').upsert({
      store_id: targetStoreId,
      cashiers: kasirList,
      presets: presets,
      running_texts: runningTexts,
      main_announcement: mainAnnouncement,
      is_pin_enabled: isPin,
      updated_at: new Date().toISOString()
    })
    
    if (error) {
      console.error("Gagal sync upload ke cloud:", error.message)
    } else {
      showToast("PENGATURAN DISINKRONKAN KE CLOUD!")
    }
  }

  const handleSaveCashierSelf = async (username: string, updatedAccount: { name: string, pin: string }) => {
    if (activeStoreId === 'all') return
    const updatedList = {
      ...kasirList,
      [username]: {
        ...kasirList[username],
        name: updatedAccount.name,
        pin: updatedAccount.pin
      }
    }
    setKasirList(updatedList)
    localStorage.setItem(`alphaPro_${activeStoreId}_kasir_list`, JSON.stringify(updatedList))
    
    // Update active session locally via callback
    onUpdateActiveCashier(username, updatedList[username])
    localStorage.setItem('alphaPro_name', updatedAccount.name)

    // Sync directly to cloud
    const isPin = localStorage.getItem(`alphaPro_${activeStoreId}_isPinEnabled`) !== 'false'
    const { error } = await supabase.from('store_settings').upsert({
      store_id: activeStoreId,
      cashiers: updatedList,
      presets: presets,
      running_texts: runningTexts,
      main_announcement: mainAnnouncement,
      is_pin_enabled: isPin,
      updated_at: new Date().toISOString()
    })

    if (error) {
      console.error("Gagal sinkronisasi data kasir baru ke cloud:", error.message)
      throw new Error("Gagal menyimpan ke Cloud, namun data lokal terupdate.")
    }
  }

  const handleDownloadFromCloud = async (silent: boolean = false) => {
    if (!googleUid) return
    
    if (targetStoreId === 'all') {
      setKasirList({})
      setPresets([])
      setRunningTexts(Array(15).fill(''))
      setMainAnnouncement('Selamat Datang di ALFAZA CELL')
      return
    }
    
    const { data, error } = await supabase.from('store_settings').select('*').eq('store_id', targetStoreId).maybeSingle()
    
    if (error) {
      console.error("Gagal sync download dari cloud:", error.message)
      return
    }

    if (data) {
      let changed = false

      if (data.cashiers) {
        const local = localStorage.getItem(`alphaPro_${targetStoreId}_kasir_list`)
        const remoteStr = JSON.stringify(data.cashiers)
        if (local !== remoteStr) {
          localStorage.setItem(`alphaPro_${targetStoreId}_kasir_list`, remoteStr)
          setKasirList(data.cashiers)
          changed = true
        }
      }
      if (data.presets) {
        const local = localStorage.getItem(`alphaPro_${googleUid}_${targetStoreId}_presets`)
        const remoteStr = JSON.stringify(data.presets)
        if (local !== remoteStr) {
          localStorage.setItem(`alphaPro_${googleUid}_${targetStoreId}_presets`, remoteStr)
          setPresets(data.presets)
          changed = true
        }
      }
      if (data.running_texts) {
        const local = localStorage.getItem(`alphaPro_${targetStoreId}_runningTexts`)
        const remoteStr = JSON.stringify(data.running_texts)
        if (local !== remoteStr) {
          localStorage.setItem(`alphaPro_${targetStoreId}_runningTexts`, remoteStr)
          setRunningTexts(data.running_texts)
          changed = true
        }
      }
      if (data.main_announcement) {
        const local = localStorage.getItem(`alphaPro_${targetStoreId}_mainAnnouncement`)
        if (local !== data.main_announcement) {
          localStorage.setItem(`alphaPro_${targetStoreId}_mainAnnouncement`, data.main_announcement)
          setMainAnnouncement(data.main_announcement)
          changed = true
        }
      }
      if (data.is_pin_enabled !== undefined) {
        const local = localStorage.getItem(`alphaPro_${targetStoreId}_isPinEnabled`)
        const remoteStr = String(data.is_pin_enabled)
        if (local !== remoteStr) {
          localStorage.setItem(`alphaPro_${targetStoreId}_isPinEnabled`, remoteStr)
          changed = true
        }
      }

      // Sync Kasbon
      if (data.kasbon_data) {
        const local = localStorage.getItem(`alphaPro_${targetStoreId}_kasbon_list`)
        const remoteStr = JSON.stringify(data.kasbon_data)
        if (local !== remoteStr) {
          localStorage.setItem(`alphaPro_${targetStoreId}_kasbon_list`, remoteStr)
          changed = true
        }
      }

      // Sync Kontak
      if (data.kontak_data) {
        const local = localStorage.getItem(`alphaPro_${targetStoreId}_kontak_list`)
        const remoteStr = JSON.stringify(data.kontak_data)
        if (local !== remoteStr) {
          localStorage.setItem(`alphaPro_${targetStoreId}_kontak_list`, remoteStr)
          changed = true
        }
      }

      // Sync Voucher
      if (data.voucher_data) {
        for (const date in data.voucher_data) {
          if (data.voucher_data[date].voucher) {
            localStorage.setItem(`alphaPro_${targetStoreId}_stok_voucher_${date}`, JSON.stringify(data.voucher_data[date].voucher))
          }
          if (data.voucher_data[date].qris) {
            localStorage.setItem(`alphaPro_${targetStoreId}_stok_qris_${date}`, JSON.stringify(data.voucher_data[date].qris))
          }
        }
        // Always trigger update for voucher just in case
        changed = true;
      }

      if (changed) {
        window.dispatchEvent(new Event('alphaSyncUpdate'))
      }

      if (changed && !silent) {
        showToast("PENGATURAN DISINKRONKAN DARI CLOUD!")
      }
    }
  }

  // Auto-download settings when targetStoreId changes
  useEffect(() => {
    if (googleUid) {
      // Load local data FIRST for the new targetStoreId before fetching cloud
      if (targetStoreId === 'all') {
        setKasirList({})
        setPresets([])
        setRunningTexts(Array(15).fill(''))
        setMainAnnouncement('Selamat Datang di ALFAZA CELL')
      } else {
        try { const lk = localStorage.getItem(`alphaPro_${targetStoreId}_kasir_list`); setKasirList(lk ? JSON.parse(lk) : {}); } catch(e){}
        try { const lp = localStorage.getItem(`alphaPro_${googleUid}_${targetStoreId}_presets`); setPresets(lp ? JSON.parse(lp) : []); } catch(e){}
        try { const lr = localStorage.getItem(`alphaPro_${targetStoreId}_runningTexts`); setRunningTexts(lr ? JSON.parse(lr) : Array(15).fill('')); } catch(e){}
        setMainAnnouncement(localStorage.getItem(`alphaPro_${targetStoreId}_mainAnnouncement`) || 'Selamat Datang di ALFAZA CELL')
      }

      handleDownloadFromCloud(true)
    }
  }, [googleUid, targetStoreId])

  const savePresets = async (newPresets: any[]) => {
    setPresets(newPresets)
    const targetId = targetStoreId !== 'all' ? targetStoreId : activeStoreId
    if (googleUid) {
      // Simpan ke localStorage
      const key = targetId !== 'all' ? `alphaPro_${googleUid}_${targetId}_presets` : `alphaPro_${googleUid}_presets`
      localStorage.setItem(key, JSON.stringify(newPresets))
      
      // Auto-sync ke Supabase cloud agar tidak hilang saat app update
      if (targetId && targetId !== 'all') {
        const isPin = localStorage.getItem(`alphaPro_${targetId}_isPinEnabled`) !== 'false'
        await supabase.from('store_settings').upsert({
          store_id: targetId,
          cashiers: kasirList,
          presets: newPresets,
          running_texts: runningTexts,
          main_announcement: mainAnnouncement,
          is_pin_enabled: isPin,
          updated_at: new Date().toISOString()
        })
      }
    }
  }


  const [storeName, setStoreName] = useState('ALFAZA CELL')
  const [storeSubtext, setStoreSubtext] = useState('Pembukuan Agen brilink & Konter')
  const [storePhoto, setStorePhoto] = useState('')

  // Keep pantauStoreId in sync with activeStoreId if cashier
  useEffect(() => {
    if (activeRole === 'kasir') {
      setPantauStoreId(activeStoreId)
    }
  }, [activeStoreId, activeRole])

  // Fetch stores list for owner
  useEffect(() => {
    if (activeRole !== 'owner') return
    const fetchStores = async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', googleUid)
        .order('created_at', { ascending: true })
      if (!error && data) {
        setStores(data)
      }
    }
    fetchStores()
  }, [activeRole, googleUid])

  // Sync active store details based on pantauStoreId or activeStore
  useEffect(() => {
    if (activeRole === 'kasir' && activeStore) {
      setStoreName(activeStore.name)
      setStoreSubtext(activeStore.subtext || '')
      setStorePhoto(activeStore.photo_url || '')
    } else if (activeRole === 'owner') {
      if (pantauStoreId === 'all') {
        setStoreName('Pusat Monitoring')
        setStoreSubtext('Memantau Semua Toko')
        setStorePhoto('')
      } else {
        const s = stores.find(st => st.id === pantauStoreId)
        if (s) {
          setStoreName(s.name)
          setStoreSubtext(s.subtext || '')
          setStorePhoto(s.photo_url || '')
        }
      }
    }
  }, [activeRole, activeStore, pantauStoreId, stores])

  const saveStoreName = async (name: string) => {
    const targetId = activeRole === 'owner' ? pantauStoreId : activeStoreId
    if (targetId === 'all') return
    const { error } = await supabase.from('stores').update({ name }).eq('id', targetId)
    if (!error) {
      setStores(prev => prev.map(s => s.id === targetId ? { ...s, name } : s))
      if (activeStore && targetId === activeStore.id) {
        const updated = { ...activeStore, name }
        localStorage.setItem('alphaPro_active_store', JSON.stringify(updated))
      }
      setStoreName(name)
    }
  }

  const saveStoreSubtext = async (subtext: string) => {
    const targetId = activeRole === 'owner' ? pantauStoreId : activeStoreId
    if (targetId === 'all') return
    const { error } = await supabase.from('stores').update({ subtext }).eq('id', targetId)
    if (!error) {
      setStores(prev => prev.map(s => s.id === targetId ? { ...s, subtext } : s))
      if (activeStore && targetId === activeStore.id) {
        const updated = { ...activeStore, subtext }
        localStorage.setItem('alphaPro_active_store', JSON.stringify(updated))
      }
      setStoreSubtext(subtext)
    }
  }

  const saveStorePhoto = async (photo_url: string) => {
    const targetId = activeRole === 'owner' ? pantauStoreId : activeStoreId
    if (targetId === 'all') return
    const { error } = await supabase.from('stores').update({ photo_url }).eq('id', targetId)
    if (!error) {
      setStores(prev => prev.map(s => s.id === targetId ? { ...s, photo_url } : s))
      if (activeStore && targetId === activeStore.id) {
        const updated = { ...activeStore, photo_url }
        localStorage.setItem('alphaPro_active_store', JSON.stringify(updated))
      }
      setStorePhoto(photo_url)
    }
  }

  const saveRunningTexts = async (texts: string[]) => {
    setRunningTexts(texts)
    const targetId = activeRole === 'owner' ? pantauStoreId : activeStoreId
    const key = targetId !== 'all' ? `alphaPro_${targetId}_runningTexts` : 'alphaPro_runningTexts'
    localStorage.setItem(key, JSON.stringify(texts))

    if (targetId !== 'all') {
      const isPin = localStorage.getItem(`alphaPro_${targetId}_isPinEnabled`) !== 'false'
      await supabase.from('store_settings').upsert({
        store_id: targetId,
        cashiers: kasirList,
        presets: presets,
        running_texts: texts,
        main_announcement: mainAnnouncement,
        is_pin_enabled: isPin,
        updated_at: new Date().toISOString()
      })
    }
  }

  const saveMainAnnouncement = async (text: string) => {
    setMainAnnouncement(text)
    const targetId = activeRole === 'owner' ? pantauStoreId : activeStoreId
    const key = targetId !== 'all' ? `alphaPro_${targetId}_mainAnnouncement` : 'alphaPro_mainAnnouncement'
    localStorage.setItem(key, text)

    if (targetId !== 'all') {
      const isPin = localStorage.getItem(`alphaPro_${targetId}_isPinEnabled`) !== 'false'
      await supabase.from('store_settings').upsert({
        store_id: targetId,
        cashiers: kasirList,
        presets: presets,
        running_texts: runningTexts,
        main_announcement: text,
        is_pin_enabled: isPin,
        updated_at: new Date().toISOString()
      })
    }
  }


  // Fetch from Supabase
  useEffect(() => {
    const fetchTransactions = async () => {
      // CLEAR TRANSACTIONS SEBELUM FETCH AGAR TIDAK TERJADI STATE LEAK (SALDO TERCAMPUR)
      setTransactions([])
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', googleUid)

      if (targetStoreId !== 'all') {
        query = query.eq('store_id', targetStoreId)
      }

      const { data, error } = await query.order('timestamp', { ascending: false })

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
          kasir_id: row.kasir_id,
          store_id: row.store_id
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
        (payload: any) => {
          if (targetStoreId !== 'all') {
            const row = payload.new || payload.old
            if (row && row.store_id !== targetStoreId) {
              return
            }
          }
          fetchTransactions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [googleUid, targetStoreId, activeRole])


  // Fetch and Record Attendance
  useEffect(() => {
    if (!googleUid || !isLoggedIn || !username) return

    const today = getLocalDateString()
    
    const manageAbsensi = async () => {
      // 1. Check/Record today's attendance for current user and current store
      let checkQuery = supabase
        .from('absensi')
        .select('*')
        .eq('user_id', googleUid)
        .eq('username', username)
        .eq('tanggal', today)

      if (activeStoreId !== 'all') {
        checkQuery = checkQuery.eq('store_id', activeStoreId)
      }

      const { data: current, error: checkError } = await checkQuery.maybeSingle()

      if (checkError) {
        console.error("Absensi Fetch Error:", checkError.message || checkError)
      }

      if (current) {
        setTodayAbsen(current.jam_masuk)
      } else {
        // Record new attendance (or fallback local if error)
        const now = new Date()
        const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        
        const { error: insertError } = await supabase.from('absensi').insert({
          user_id: googleUid,
          username,
          nama: account.name,
          tanggal: today,
          jam_masuk: jam,
          status: 'Hadir',
          store_id: activeStoreId !== 'all' ? activeStoreId : null
        })

        if (insertError) {
          console.error("Absensi Insert Error:", insertError.message || insertError)
        }

        // Tetap set state lokal agar UI kasir tidak menampilkan --:--:--
        setTodayAbsen(jam)
      }

      // 2. Fetch all attendance for owner view or current store for cashier
      setAbsensi([]) // CLEAR PREVIOUS STATE TO PREVENT LEAK
      
      let allQuery = supabase
        .from('absensi')
        .select('*')
        .eq('user_id', googleUid)

      if (targetStoreId !== 'all') {
        allQuery = allQuery.eq('store_id', targetStoreId)
      }

      const { data: allData } = await allQuery.order('tanggal', { ascending: false })
      
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
  }, [googleUid, isLoggedIn, username, account?.name, activeStoreId, activeRole, targetStoreId])


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
    if (account.role === 'owner') {
      if (pantauStoreId !== 'all') {
        relevantTxs = relevantTxs.filter(t => t.store_id === pantauStoreId)
      }
      if (filterKasir !== 'Semua') {
        relevantTxs = relevantTxs.filter(t => t.kasir_id === filterKasir)
      }
    } else {
      relevantTxs = transactions.filter(t => t.kasir_id === username);
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
  }, [transactions, account?.role, username, filterKasir, pantauStoreId])

  // Fetch Aggregated Report for LaporanView
  useEffect(() => {
    const fetchDailyReport = async () => {

      let query = supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', googleUid)
        .eq('tanggal', filterTanggalLaporan)
        
      if (targetStoreId !== 'all') {
        query = query.eq('store_id', targetStoreId)
      }

      const { data } = await query.maybeSingle()
      
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
    const finalStoreId = activeRole === 'owner' ? (pantauStoreId === 'all' ? null : pantauStoreId) : activeStoreId
    if (!finalStoreId) {
      setIsSaving(false)
      return showToast('Pilih cabang (toko) terlebih dahulu!')
    }
    const newTx = {
      id,
      user_id: googleUid,
      kasir_id: username,
      kategori: formKategori,
      nominal: finalNominal,
      admin_fee: finalAdmin,
      keterangan: finalKeterangan,
      timestamp: getLocalISOString(),
      store_id: finalStoreId
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
          kasir_id: newTx.kasir_id,
          store_id: newTx.store_id || undefined
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
    const finalStoreId = activeRole === 'owner' ? (pantauStoreId === 'all' ? null : pantauStoreId) : activeStoreId
    if (!finalStoreId) {
      setIsSaving(false)
      return showToast('Pilih cabang (toko) terlebih dahulu!')
    }
    const newTx = {
      id,
      user_id: googleUid,
      kasir_id: kasirId,
      kategori: kategori,
      nominal,
      admin_fee: 0,
      keterangan: 'Topup Modal by Owner',
      timestamp: getLocalISOString(),
      store_id: finalStoreId
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
          kasir_id: newTx.kasir_id,
          store_id: newTx.store_id || undefined
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
    const finalStoreId = activeRole === 'owner' ? (pantauStoreId === 'all' ? null : pantauStoreId) : activeStoreId
    if (!finalStoreId) {
      setIsSaving(false)
      return showToast('Pilih cabang (toko) terlebih dahulu!')
    }
    const newTx = {
      id,
      user_id: googleUid,
      kasir_id: username,
      kategori: 'Isi ' + isiJenis,
      nominal,
      admin_fee: 0,
      keterangan: isiKeterangan || 'Setoran Saldo',
      timestamp: getLocalISOString(),
      store_id: finalStoreId
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
          kasir_id: newTx.kasir_id,
          store_id: newTx.store_id || undefined
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

  const handleSimpanSaldoRealAplikasi = (nominal: number, keterangan: string) => {
    if (isSaving) return
    if (nominal < 0) return showToast('Nominal tidak valid!')

    setIsSaving(true)

    const id = Date.now().toString()
    const finalStoreId = activeRole === 'owner' ? (pantauStoreId === 'all' ? null : pantauStoreId) : activeStoreId
    if (!finalStoreId) {
      setIsSaving(false)
      return showToast('Pilih cabang (toko) terlebih dahulu!')
    }
    const newTx = {
      id,
      user_id: googleUid,
      kasir_id: username,
      kategori: 'Isi Saldo Real Aplikasi',
      nominal,
      admin_fee: 0,
      keterangan: keterangan || 'Update Saldo Real HP',
      timestamp: getLocalISOString(),
      store_id: finalStoreId
    }

    supabase.from('transactions').insert(newTx).then(({ error }) => {
      setIsSaving(false)
      if (error) {
        showToast('Gagal update: ' + error.message)
      } else {
        const optimisticTx: Transaction = {
          id: newTx.id,
          kategori: newTx.kategori,
          nominal: newTx.nominal,
          adminFee: newTx.admin_fee,
          keterangan: newTx.keterangan,
          timestamp: newTx.timestamp,
          kasir_id: newTx.kasir_id,
          store_id: newTx.store_id || undefined
        }
        setTransactions(prev => [optimisticTx, ...prev])
        showToast('Saldo Real Aplikasi Diperbarui!')
      }
    })
  }


  const handleStartEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setEditKategori(tx.kategori)
    setEditNominal(tx.nominal.toLocaleString('id-ID').replace(/,/g, '.'))
    
    if (tx.kategori === 'Order Kuota') {
      setEditAdmin((tx.nominal + tx.adminFee).toLocaleString('id-ID').replace(/,/g, '.'))
    } else {
      setEditAdmin(tx.adminFee.toLocaleString('id-ID').replace(/,/g, '.'))
    }
    
    setEditKeterangan(tx.keterangan)
  }

  const handleSaveEdit = () => {
    if (!editingTx || isSaving) return
    const newNominal = parseNominal(editNominal)
    let newAdmin = parseNominal(editAdmin)

    if (editKategori === 'Order Kuota') {
      newAdmin = newAdmin - newNominal;
    }

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
  
  // Apply Store and Kasir Filter (Owner sees all/filtered store, Kasir ONLY sees active store)
  const storeFilteredTransactions = activeRole === 'owner'
    ? (pantauStoreId !== 'all' ? transactions.filter(t => t.store_id === pantauStoreId) : transactions)
    : transactions;

  const displayTransactions = account.role === 'owner' 
    ? (filterKasir !== 'Semua' ? storeFilteredTransactions.filter(t => t.kasir_id === filterKasir) : storeFilteredTransactions)
    : storeFilteredTransactions.filter(t => t.kasir_id === username);

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

  const totalSaldoBank = todayTransactions
    .filter(t => t.kategori === 'Isi Saldo Bank')
    .reduce((s, t) => s + t.nominal, 0)

  return (
    <div className={cn("app-container", `theme-${theme}`, screenSize !== 'auto' && screenSize)}>
      {screenSize === 'pc' && (
        <SidebarPC 
          activeView={activeView} 
          setActiveView={setActiveView} 
          storeName={storeName}
          storeSubtext={storeSubtext}
          storePhoto={storePhoto}
          kasirName={account?.name}
          kasirRole={account?.role}
          setIsSidePanelOpen={setIsSidePanelOpen}
          onLogout={() => setShowLogoutConfirm(true)}
        />
      )}
      
      {screenSize === 'pc' ? (
        <div className="flex-1 flex gap-4 p-4 h-full bg-slate-50 dark:bg-slate-900 overflow-hidden fade-in modular-pc">
          


          {/* Right Column: Dynamic View Container */}
          <div className="flex-1 h-full relative rounded-[2rem] overflow-hidden shadow-xl ring-1 ring-slate-100 bg-white dark:bg-slate-800 dark:ring-slate-600 flex flex-col">
            {activeView !== 'view-akun' && activeView !== 'view-laporan' && activeView !== 'view-transaksi' && activeView !== 'view-beranda' && (
              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 rounded-t-[2rem] shadow-md">
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 capitalize">{(() => {
                  const titles: Record<string, string> = {
                    'view-beranda': 'Beranda',
                    'view-transaksi': 'Riwayat',
                    'view-laporan': 'Laporan',
                    'view-akun': 'Akun',
                    'view-isi-saldo': 'Isi Saldo',
                    'view-kasbon': 'Kasbon',
                    'view-kontak': 'Kontak',
                    'view-stok-voucher': 'Voucher',
                    'view-kalender': 'Kalender',
                    'view-nota': 'Nota',
                    'view-otomatis': 'Otomatis',
                    'view-owner-monitor': 'Monitor Toko',
                    'view-owner-laporan': 'Laporan Owner',
                    'view-owner-grafik': 'Grafik Penjualan',
                    'view-owner-performa': 'Performa Kasir',
                    'view-owner-absen': 'Absensi Karyawan',
                    'view-owner-izin': 'Izin Karyawan',
                    'view-owner-gaji': 'Penggajian',
                    'view-owner-backup': 'Backup & Restore',
                    'view-owner-saldo': 'Manajemen Saldo'
                  };
                  return titles[activeView] || 'Dashboard';
                })()}</h2>
              </div>
            )}
            {(() => {
              switch (activeView) {
                case 'view-beranda':
                  return (
                    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-900 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-5 gap-4 shrink-0">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-building-columns"></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Bank</p>
                            <p className="text-sm font-black text-slate-800 dark:text-white truncate mt-0.5" title={formatRupiah(totalSaldoBank)}>{formatRupiah(totalSaldoBank).replace(',00', '')}</p>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-cash-register"></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Laci Kasir</p>
                            <p className="text-sm font-black text-slate-800 dark:text-white truncate mt-0.5" title={formatRupiah(totalSaldoKas)}>{formatRupiah(totalSaldoKas).replace(',00', '')}</p>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-mobile-screen"></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Digital</p>
                            <p className="text-sm font-black text-slate-800 dark:text-white truncate mt-0.5" title={formatRupiah(penjualanDigital)}>{formatRupiah(penjualanDigital).replace(',00', '')}</p>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-money-bill-wave"></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Tarik Tunai</p>
                            <p className="text-sm font-black text-slate-800 dark:text-white truncate mt-0.5" title={formatRupiah(totalTarik)}>{formatRupiah(totalTarik).replace(',00', '')}</p>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-headphones"></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aksesoris</p>
                            <p className="text-sm font-black text-slate-800 dark:text-white truncate mt-0.5" title={formatRupiah(totalAksesoris)}>{formatRupiah(totalAksesoris).replace(',00', '')}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-6 flex-1 min-h-0">
                        {/* Transaction Form (Left/Main side) */}
                        <div className="flex-[2] min-h-0 bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-xl ring-1 ring-slate-100 dark:ring-slate-700/50 flex flex-col relative overflow-hidden">
                          <div className="flex items-center gap-3 mb-6 shrink-0">
                            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Input Transaksi</h3>
                          </div>
                          <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar pb-6">
                            <TransactionForm 
                              kategori={formKategori} setKategori={setFormKategori}
                              nominal={formNominal} setNominal={setFormNominal}
                              admin={formAdmin} setAdmin={setFormAdmin}
                              keterangan={formKeterangan} setKeterangan={setFormKeterangan}
                              onSave={handleSimpanTransaksi} isSaving={isSaving} presets={presets}
                            />
                          </div>
                        </div>
                        
                        {/* Right Side: Summary Cards & Akses Cepat */}
                        <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-6">
                          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-xl ring-1 ring-slate-100 dark:ring-slate-700/50 shrink-0">
                            <SummaryCards totalAdmin={totalAdmin} totalVolume={totalVolume} totalTransactions={todayTransactions.length} />
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-xl ring-1 ring-slate-100 dark:ring-slate-700/50 shrink-0">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-1 h-4 bg-purple-600 rounded-full"></div>
                              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Akses Cepat</h3>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-center">
                              {[
                                { id: 'view-kasbon', label: 'KASBON', icon: 'fa-file-invoice', color: 'bg-blue-500 hover:bg-blue-600' },
                                { id: 'view-kontak', label: 'KONTAK', icon: 'fa-address-book', color: 'bg-emerald-500 hover:bg-emerald-600' },
                                { id: 'view-stok-voucher', label: 'VOUCHER', icon: 'fa-ticket', color: 'bg-orange-500 hover:bg-orange-600' },
                                { id: 'view-kalender', label: 'KALENDER', icon: 'fa-calendar-days', color: 'bg-red-500 hover:bg-red-600' },
                                { id: 'view-nota', label: 'NOTA', icon: 'fa-receipt', color: 'bg-purple-500 hover:bg-purple-600' },
                              ].map((item) => (
                                <button 
                                  key={item.id} 
                                  onClick={() => setActiveView(item.id)} 
                                  className={"flex flex-col items-center justify-center p-3 group active:scale-95 transition-transform bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 " + (activeView === item.id ? "ring-2 ring-violet-500" : "")}
                                >
                                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md transition-colors", item.color)}>
                                    <i className={cn("fa-solid text-sm", item.icon)}></i>
                                  </div>
                                  <p className="text-[8px] font-black text-slate-700 dark:text-slate-300 mt-2 tracking-tighter uppercase">{item.label}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                case 'view-transaksi':
                  return (
                    <RiwayatView
                      active={true}
                      activeView={activeView}
                      isPc={screenSize === 'pc'}
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
                  );
                case 'view-laporan':
                  return (
                    <LaporanView
                      active={true}
                      isPc={screenSize === 'pc'}
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
                      saldoReal={filterTanggalLaporan === todayISO ? totalSaldoReal : displayTransactions.filter(t => t.timestamp.startsWith(filterTanggalLaporan) && t.kategori === 'Isi Saldo Real Aplikasi').reduce((s, t) => s + t.nominal, 0)}
                      onUpdateSaldoReal={handleSimpanSaldoRealAplikasi}
                      isSaving={isSaving}
                      onEdit={handleStartEdit}
                      onDelete={handleDeleteTx}
                      kasirList={kasirList}
                      storeName={storeName}
                      storeSubtext={storeSubtext}
                      storePhoto={storePhoto}
                      kasirName={account.name}
                      setIsSidePanelOpen={setIsSidePanelOpen}
                      activeStoreId={targetStoreId}
                    />
                  );
                case 'view-akun':
                  return (
                    <AkunView
                      active={true}
                      isPc={screenSize === 'pc'}
                      setActiveView={setActiveView}
                      kasirName={account.name}
                      kasirRole={account.role}
                      googleEmail={googleEmail}
                      googleUid={googleUid}
                      onLogout={onLogout}
                      onUploadToCloud={handleUploadToCloud}
                      onDownloadFromCloud={handleDownloadFromCloud}
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
                      onConfirm={handleConfirm}
                      currentUsername={username}
                      kasirList={kasirList}
                      onSaveCashierSelf={handleSaveCashierSelf}
                      activeStoreId={targetStoreId}
                      transactions={transactions}
                    />
                  );
                case 'view-isi-saldo':
                  return (
                    <IsiSaldoView
                      active={true}
                      isPc={screenSize === 'pc'}
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
                  );
                case 'view-kasbon':
                  return <KasbonView active={true} isPc={screenSize === 'pc'} setActiveView={setActiveView} kasirName={account.name} showToast={showToast} onConfirm={handleConfirm} activeStoreId={targetStoreId} />;
                case 'view-kontak':
                  return <KontakView active={true} isPc={screenSize === 'pc'} setActiveView={setActiveView} kasirName={account.name} showToast={showToast} onConfirm={handleConfirm} activeStoreId={targetStoreId} />;
                case 'view-stok-voucher':
                  return <VoucherView active={true} isPc={screenSize === 'pc'} setActiveView={setActiveView} showToast={showToast} onConfirm={handleConfirm} activeStoreId={targetStoreId} kasirRole={account.role} />;
                case 'view-kalender':
                  return <KalenderView active={true} isPc={screenSize === 'pc'} setActiveView={setActiveView} showToast={showToast} onConfirm={handleConfirm} />;
                case 'view-nota':
                  return <NotaView active={true} isPc={screenSize === 'pc'} setActiveView={setActiveView} showToast={showToast} onConfirm={handleConfirm} />;
                case 'view-otomatis':
                  return (
                    <OtomatisView
                      active={true}
                      isPc={screenSize === 'pc'}
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
                      onConfirm={handleConfirm}
                      activeStoreId={targetStoreId}
                    />
                  );
                case 'view-owner-monitor':
                case 'view-owner-laporan':
                case 'view-owner-grafik':
                case 'view-owner-performa':
                case 'view-owner-absen':
                case 'view-owner-izin':
                case 'view-owner-gaji':
                case 'view-owner-backup':
                case 'view-owner-saldo':
                  return (
                    <BerandaView
                      active={true}
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
                      activeStoreId={activeStoreId}
                      pantauStoreId={pantauStoreId}
                      setPantauStoreId={setPantauStoreId}
                      stores={stores}
                      isPc={screenSize === 'pc'}
                    />
                  );
                default:
                  return null;
              }
            })()}
          </div>
        </div>
      ) : (
        <>
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
            activeStoreId={activeStoreId}
            pantauStoreId={pantauStoreId}
            setPantauStoreId={setPantauStoreId}
            stores={stores}
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
                ? displayTransactions.filter(t => t.timestamp.startsWith(todayISO) && t.kategori === 'Isi Saldo Real Aplikasi').reduce((s, t) => s + t.nominal, 0)
                : displayTransactions
                    .filter(t => t.timestamp.startsWith(filterTanggalLaporan) && t.kategori === 'Isi Saldo Real Aplikasi')
                    .reduce((s, t) => s + t.nominal, 0)
            }
            onUpdateSaldoReal={handleSimpanSaldoRealAplikasi}
            isSaving={isSaving}
            onEdit={handleStartEdit}
            onDelete={handleDeleteTx}
            kasirList={kasirList}
            storeName={storeName}
            storeSubtext={storeSubtext}
            storePhoto={storePhoto}
            kasirName={account.name}
            setIsSidePanelOpen={setIsSidePanelOpen}
            activeStoreId={targetStoreId}
          />

          <AkunView 
            active={activeView === 'view-akun'} 
            setActiveView={setActiveView}
            kasirName={account.name}
            kasirRole={account.role}
            googleEmail={googleEmail}
            googleUid={googleUid}
            onLogout={onLogout}
            onUploadToCloud={handleUploadToCloud}
            onDownloadFromCloud={handleDownloadFromCloud}
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
            onConfirm={handleConfirm}
            currentUsername={username}
            kasirList={kasirList}
            onSaveCashierSelf={handleSaveCashierSelf}
            activeStoreId={targetStoreId}
            transactions={transactions}
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

          <KasbonView active={activeView === 'view-kasbon'} setActiveView={setActiveView} kasirName={account.name} showToast={showToast} onConfirm={handleConfirm} activeStoreId={targetStoreId} />
          <KontakView active={activeView === 'view-kontak'} setActiveView={setActiveView} kasirName={account.name} showToast={showToast} onConfirm={handleConfirm} activeStoreId={targetStoreId} />
          <VoucherView active={activeView === 'view-stok-voucher'} setActiveView={setActiveView} showToast={showToast} onConfirm={handleConfirm} activeStoreId={targetStoreId} kasirRole={account.role} />
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
            onConfirm={handleConfirm}
            activeStoreId={targetStoreId}
          />

          <Navigation activeView={activeView} setActiveView={setActiveView} />
        </>
      )}

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
      {editingTx && (() => {
        const isSaldoEdit = editingTx.kategori.includes('Isi ');
        
        return (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xs uppercase tracking-widest text-blue-800">
                  <i className="fa-solid fa-pen-to-square mr-2"></i> Edit {isSaldoEdit ? 'Saldo' : 'Transaksi'}
                </h3>
                <button onClick={() => setEditingTx(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {/* Tanda Mata (Original Data) */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start gap-3">
                  <i className="fa-solid fa-eye text-slate-400 mt-0.5"></i>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Asli Sebelum Diedit</p>
                    <p className="text-[11px] font-bold text-slate-600 leading-tight">
                      {editingTx.kategori} • {formatRupiah(editingTx.nominal).replace(',00', '')}
                      {!isSaldoEdit && editingTx.adminFee > 0 && ` • Admin: ${formatRupiah(editingTx.adminFee).replace(',00', '')}`}
                    </p>
                    <p className="text-[10px] text-slate-500 italic mt-1">"{editingTx.keterangan || '-'}"</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block tracking-tighter">Kategori</label>
                  <div className="relative">
                    <select 
                      value={editKategori} 
                      onChange={e => setEditKategori(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, editNominalRef)}
                      className="form-input-modern w-full appearance-none pr-8"
                    >
                      {isSaldoEdit ? (
                        <>
                          <option value="Isi Saldo Bank">Isi Saldo Bank</option>
                          <option value="Isi Modal Tunai Kasir">Isi Modal Tunai Kasir</option>
                          <option value="Isi Saldo Real Aplikasi">Isi Saldo Real Aplikasi</option>
                        </>
                      ) : (
                        <>
                          <option value="Transfer Bank">Transfer Bank</option>
                          <option value="DANA">DANA</option>
                          <option value="FLIP">FLIP</option>
                          <option value="Order Kuota">Order Kuota</option>
                          <option value="Tarik Tunai">Tarik Tunai</option>
                          <option value="Aksesoris">Aksesoris</option>
                        </>
                      )}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>
                  </div>
                </div>

                <div className={cn("grid gap-3", isSaldoEdit ? "grid-cols-1" : "grid-cols-2")}>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block tracking-tighter">
                      {editKategori === 'Order Kuota' ? 'Harga Modal' : 'Nominal'}
                    </label>
                    <input 
                      ref={editNominalRef}
                      value={editNominal} 
                      onChange={e => setEditNominal(formatInputRupiah(e.target.value))}
                      onKeyDown={(e) => handleEditKeyDown(e, isSaldoEdit ? editKeteranganRef : editAdminRef)}
                      className="form-input-modern w-full"
                    />
                  </div>
                  {!isSaldoEdit && (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block tracking-tighter">
                        {editKategori === 'Order Kuota' ? 'Harga Jual' : 'Admin'}
                      </label>
                      <input 
                        ref={editAdminRef}
                        value={editAdmin} 
                        onChange={e => setEditAdmin(formatInputRupiah(e.target.value))}
                        onKeyDown={(e) => handleEditKeyDown(e, editKeteranganRef)}
                        className="form-input-modern w-full text-emerald-600"
                      />
                    </div>
                  )}
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
        );
      })()}


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
      {confirmDialog && confirmDialog.show && (() => {
        const isDangerous = confirmDialog.title.toUpperCase().includes('HAPUS') || confirmDialog.title.toUpperCase().includes('RESET');
        const iconClass = isDangerous ? "fa-solid fa-triangle-exclamation text-xl animate-pulse" : "fa-solid fa-circle-question text-xl";
        const accentBg = isDangerous ? "bg-rose-50 text-rose-600" : "bg-purple-50 text-purple-600";
        const primaryBtnBg = isDangerous 
          ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" 
          : "bg-purple-600 hover:bg-purple-700 shadow-purple-200";

        return (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-[280px] shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300 border border-gray-100">
              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-inner", accentBg)}>
                <i className={iconClass}></i>
              </div>
              <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-900 mb-1.5">{confirmDialog.title}</h3>
              <p className="text-[10px] font-bold text-gray-500 mb-5 leading-relaxed px-1">{confirmDialog.message}</p>
              <div className="flex gap-2 w-full">
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border border-gray-200/50"
                >
                  Batal
                </button>
                <button 
                  onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                  className={cn("flex-1 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all", primaryBtnBg)}
                  style={{ color: '#ffffff' }}
                >
                  Ya, Lanjut
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Logout Confirmation Notif */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-xs shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <i className="fa-solid fa-power-off text-2xl animate-pulse"></i>
            </div>
            <h3 className="font-black text-xs uppercase tracking-widest text-red-600 mb-2">KELUAR & SYNC</h3>
            <p className="text-[11px] font-bold text-gray-500 mb-6 leading-relaxed px-2">Yakin ingin keluar? Pengaturan (kasir & preset) lokal Anda akan otomatis di-upload sebagai backup online di Cloud.</p>
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isSaving}
                className="flex-1 bg-gray-100 text-gray-500 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  setIsSaving(true)
                  await handleUploadToCloud()
                  setIsSaving(false)
                  setShowLogoutConfirm(false)
                  onLogout()
                }}
                disabled={isSaving}
                className="flex-1 bg-red-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                )}
                {isSaving ? "Sync & Keluar..." : "Keluar & Sync"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Update Toast */}
      {needRefresh && (
        <div className="fixed bottom-28 left-4 right-4 z-[400] md:left-auto md:right-4 md:w-96 bg-gray-900/95 backdrop-blur-md text-white p-4 rounded-3xl shadow-2xl border border-white/10 flex flex-col gap-3 animate-in slide-in-from-bottom duration-300 pointer-events-auto">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <i className="fa-solid fa-cloud-arrow-down text-lg"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Versi Baru Tersedia</p>
              <p className="text-[9px] font-bold text-gray-300 uppercase leading-relaxed">Pembaruan sistem terdeteksi. Perbarui sekarang untuk menggunakan versi terbaru.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button 
              onClick={() => setNeedRefresh(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all border border-white/5"
            >
              Nanti saja
            </button>
            <button 
              onClick={() => updateServiceWorker(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-rotate-right"></i> PERBARUI SEKARANG
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
