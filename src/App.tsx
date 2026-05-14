import React, { useState, useEffect, useRef, useCallback } from 'react'
import { parseNominal, formatInputRupiah, cn } from './lib/utils'
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

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ion-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { name?: string }, HTMLElement>;
    }
  }
}

// Constants and helpers

const App: React.FC = () => {
  // ── Google Auth State ──
  const [googleSession, setGoogleSession] = useState<any>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // ── Kasir Profile State ──
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUsername, setCurrentUsername] = useState('')
  const [currentAccount, setCurrentAccount] = useState<KasirAccount | null>(null)
  const [kasirList, setKasirList] = useState<Record<string, KasirAccount>>({})

  const refreshKasirList = useCallback(() => {
    setKasirList(getKasirAccounts())
  }, [])

  useEffect(() => {
    refreshKasirList()
  }, [refreshKasirList])

  // Check Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setGoogleSession(session)
      setIsCheckingAuth(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setGoogleSession(session)
    })

    return () => subscription.unsubscribe()
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
  if (!isLoggedIn) {
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
      account={currentAccount!} 
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
      'view-saldo': 'saldo',
      'view-laporan': 'laporan',
      'view-akun': 'akun'
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
      'view-saldo': 'saldo',
      'view-laporan': 'laporan',
      'view-akun': 'akun'
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
    root.classList.remove('theme-light', 'theme-gray', 'theme-neon')
    root.classList.add(`theme-${theme}`)
    localStorage.setItem('theme', theme)
  }, [theme])

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
    const saved = localStorage.getItem('alphaPro_runningTexts')
    return saved ? JSON.parse(saved) : Array(15).fill('')
  })
  const [mainAnnouncement, setMainAnnouncement] = useState<string>(() => {
    return localStorage.getItem('alphaPro_mainAnnouncement') || 'Selamat Datang di ALFAZA CELL'
  })

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

    const today = new Date().toLocaleDateString('en-CA')
    
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
  }, [googleUid, isLoggedIn, username, account.name])

  // Filter State
  const [filterTanggalMulai, setFilterTanggalMulai] = useState(new Date().toISOString().split('T')[0])
  const [filterTanggalAkhir, setFilterTanggalAkhir] = useState(new Date().toISOString().split('T')[0])
  const [filterPencarian, setFilterPencarian] = useState('')
  const [filterKategori, setFilterKategori] = useState('Semua')
  const [activeSaldoFilter, setActiveSaldoFilter] = useState('Semua')
  const [filterKasir, setFilterKasir] = useState('Semua')
  
  // Laporan Date Filter
  const [filterTanggalLaporan, setFilterTanggalLaporan] = useState(new Date().toLocaleDateString('en-CA'))
  const [dailyReport, setDailyReport] = useState<any>(null)

  // Recalculate daily balances whenever transactions change
  useEffect(() => {
    let relevantTxs = transactions;
    if (account.role !== 'owner') {
      relevantTxs = transactions.filter(t => t.kasir_id === username);
    } else if (filterKasir !== 'Semua') {
      relevantTxs = transactions.filter(t => t.kasir_id === filterKasir);
    }

    const todayISO = new Date().toLocaleDateString('en-CA')
    const todayTxs = relevantTxs.filter(t => t.timestamp.startsWith(todayISO))
    
    let calcSaldoBank = 0
    let calcKasModal = 0
    let calcPenjualan = 0

    // Saldo Bank, Modal Tunai, dan Penjualan dihitung per hari (hanya transaksi hari ini).
    // Cocok untuk sistem per shift kasir yang 리set setiap hari.
    todayTxs.forEach(tx => {
      if (tx.kategori === 'Isi Saldo Bank') calcSaldoBank += tx.nominal
      if (tx.kategori === 'Isi Modal Tunai Kasir') calcKasModal += tx.nominal
      if (['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(tx.kategori)) {
        calcSaldoBank -= tx.nominal
        calcPenjualan += tx.nominal
      }
      if (tx.kategori === 'Aksesoris') calcPenjualan += tx.nominal
    })

    setSaldoBank(calcSaldoBank)
    setKasModal(calcKasModal)
    setTotalPenjualan(calcPenjualan)
  }, [transactions, account.role, username, filterKasir])

  // Fetch Aggregated Report for LaporanView
  useEffect(() => {
    const fetchDailyReport = async () => {
      let targetKasir = filterKasir;
      if (account.role !== 'owner') targetKasir = username;

      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', googleUid)
        .eq('kasir_id', targetKasir)
        .eq('report_date', filterTanggalLaporan)
        .single()

      if (!error && data) {
        setDailyReport({
          saldoBank: Number(data.saldo_bank),
          kasModal: Number(data.modal_kasir),
          penjualanDigital: Number(data.penjualan_digital),
          totalAksesoris: Number(data.penjualan_aksesoris),
          totalAdmin: Number(data.total_admin),
          totalTarik: Number(data.total_tarik),
          saldoReal: Number(data.saldo_real || 0),
          totalSaldoKas: Number(data.modal_kasir) + Number(data.penjualan_digital) + Number(data.penjualan_aksesoris) + Number(data.total_admin) - Number(data.total_tarik)
        })
      } else {
        // Fallback: Calculate manually from transactions state for the selected date
        let relevantTxs = transactions;
        if (account.role !== 'owner') {
          relevantTxs = transactions.filter(t => t.kasir_id === username);
        } else if (filterKasir !== 'Semua') {
          relevantTxs = transactions.filter(t => t.kasir_id === filterKasir);
        }

        const filtered = relevantTxs.filter(t => t.timestamp.startsWith(filterTanggalLaporan));
        
        let sBank = 0, kMod = 0, pDig = 0, pAks = 0, tAdm = 0, tTar = 0;
        filtered.forEach(tx => {
          if (tx.kategori === 'Isi Saldo Bank') sBank += tx.nominal;
          if (tx.kategori === 'Isi Modal Tunai Kasir') kMod += tx.nominal;
          if (['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(tx.kategori)) {
            sBank -= tx.nominal;
            pDig += tx.nominal;
          }
          if (tx.kategori === 'Aksesoris') pAks += tx.nominal;
          if (tx.kategori === 'Tarik Tunai') tTar += tx.nominal;
          tAdm += tx.adminFee;
        });

        setDailyReport({
          saldoBank: sBank,
          kasModal: kMod,
          penjualanDigital: pDig,
          totalAksesoris: pAks,
          totalAdmin: tAdm,
          totalTarik: tTar,
          saldoReal: 0,
          totalSaldoKas: kMod + pDig + pAks + tAdm - tTar
        });
      }
    }

    if (activeView === 'view-laporan') {
      fetchDailyReport()
    }
  }, [filterTanggalLaporan, filterKasir, googleUid, activeView, account.role, username])
  
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
        alert(`Selamat datang di hari baru (${today}). Dashboard menampilkan rekap harian baru.`)
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

  const handleSimpanTransaksi = () => {
    if (isSaving) return
    const nominal = parseNominal(formNominal)
    const admin = parseNominal(formAdmin)
    
    if (!formKategori) return alert('Pilih kategori transaksi!')
    if (nominal <= 0) return alert('Masukkan nominal yang valid!')

    setIsSaving(true)
    
    // Proses simpan ke Supabase
    const id = Date.now().toString()
    const newTx = {
      id,
      user_id: googleUid,
      kasir_id: username,
      kategori: formKategori,
      nominal,
      admin_fee: admin,
      keterangan: formKeterangan || '-',
      timestamp: new Date().toISOString()
    }

    supabase.from('transactions').insert(newTx).then(({ error }) => {
      setIsSaving(false)
      if (error) {
        alert('Gagal menyimpan ke server: ' + error.message)
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

  const handleSimpanIsiSaldo = () => {
    if (isSaving) return
    const nominal = parseNominal(isiNominal)
    if (!isiJenis) return alert('Pilih jenis saldo!')
    if (nominal <= 0) return alert('Nominal tidak valid!')

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
      timestamp: new Date().toISOString()
    }

    supabase.from('transactions').insert(newTx).then(({ error }) => {
      setIsSaving(false)
      if (error) {
        alert('Gagal update saldo: ' + error.message)
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
        alert('Gagal edit: ' + error.message)
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
    if (window.confirm('Yakin ingin menghapus transaksi ini permanen?')) {
      supabase.from('transactions').delete().eq('id', tx.id).then(({ error }) => {
        if (error) {
          alert('Gagal menghapus: ' + error.message)
        } else {
          setTransactions(prev => prev.filter(t => t.id !== tx.id))
          showToast('Transaksi Berhasil Dihapus!')
        }
      })
    }
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
  const totalTarik = todayTransactions.filter(t => t.kategori === 'Tarik Tunai').reduce((s, t) => s + t.nominal, 0)
  const totalAdmin = todayTransactions.reduce((s, t) => s + t.adminFee, 0)
  const totalAksesoris = todayTransactions.filter(t => t.kategori === 'Aksesoris').reduce((s, t) => s + t.nominal, 0)
  const totalVolume = todayTransactions.filter(t => !t.kategori.startsWith('Isi')).reduce((s, t) => s + t.nominal, 0)
  
  // Penjualan Digital: Transfer + DANA + FLIP + Kuota (Today Only)
  const penjualanDigital = todayTransactions
    .filter(t => ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori))
    .reduce((s, t) => s + t.nominal, 0)

  // Saldo Real Aplikasi: Akumulasi dari input manual di Isi Saldo (Today Only)
  const totalSaldoReal = todayTransactions
    .filter(t => t.kategori === 'Isi Saldo Real Aplikasi')
    .reduce((s, t) => s + t.nominal, 0)

  // Saldo Laci Kasir (Cumulative Calculation - usually doesn't reset to 0 in reality)
  // But if the user wants it to look like it resets, we could filter this too.
  // However, Saldo Bank and Kas Modal are cumulative.
  const totalSaldoKas = kasModal + penjualanDigital + totalAksesoris + totalAdmin - totalTarik

  return (
    <div className={cn("app-container", `theme-${theme}`, screenSize !== 'auto' && screenSize)}>
      
      <BerandaView 
        active={activeView === 'view-beranda'}
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
      />

      <RiwayatView 
        active={activeView === 'view-transaksi'}
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
      />

      <LaporanView 
        active={activeView === 'view-laporan'}
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
      />

      <AkunView 
        active={activeView === 'view-akun'} 
        kasirName={account.name}
        kasirRole={account.role}
        onLogout={onLogout}
        onRequestLogout={() => setShowLogoutConfirm(true)}
        runningTexts={runningTexts}
        mainAnnouncement={mainAnnouncement}
        onSaveRunningTexts={saveRunningTexts}
        onSaveMainAnnouncement={saveMainAnnouncement}
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
      />

      <KasbonView active={activeView === 'view-kasbon'} setActiveView={setActiveView} />
      <KontakView active={activeView === 'view-kontak'} setActiveView={setActiveView} />
      <VoucherView active={activeView === 'view-stok-voucher'} setActiveView={setActiveView} />
      <KalenderView active={activeView === 'view-kalender'} setActiveView={setActiveView} />
      <NotaView active={activeView === 'view-nota'} setActiveView={setActiveView} />

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
                <select 
                  value={editKategori} 
                  onChange={e => setEditKategori(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(e, editNominalRef)}
                  className="form-input-modern w-full"
                >
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="DANA">DANA</option>
                  <option value="FLIP">FLIP</option>
                  <option value="Order Kuota">Order Kuota</option>
                  <option value="Tarik Tunai">Tarik Tunai</option>
                  <option value="Aksesoris">Aksesoris</option>
                </select>
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

      {/* Logout Confirmation Notif */}
      {showLogoutConfirm && (
        <div className="fixed bottom-24 left-0 right-0 z-[210] flex justify-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white border-2 border-red-500 text-red-600 px-5 py-4 rounded-[2rem] shadow-2xl flex flex-col items-center gap-3 backdrop-blur-md max-w-[300px]">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow-inner">
                <i className="fa-solid fa-power-off text-[12px] font-black"></i>
              </div>
              <span className="font-black text-[11px] uppercase tracking-tight">Yakin ingin keluar?</span>
            </div>
            <div className="flex gap-2 w-full mt-1">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-500 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                BATAL
              </button>
              <button 
                onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all"
              >
                KELUAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}

export default App
