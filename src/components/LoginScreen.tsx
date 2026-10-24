import React, { useState, useEffect, useMemo } from 'react'
import { getLocalDateString, getShiftInfo, getActiveShifts, checkShiftLateness, APP_VERSION, isVersionSupported } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { isAbsenSelfieEnabled, saveAbsenSelfieRecord } from '../lib/absenSelfieService'
import { AbsenSelfieCapture } from './AbsenSelfieCapture'

export interface KasirAccount {
  pin: string
  role: 'owner' | 'kasir'
  name: string
  password?: string
  targetTrx?: number
  alamat?: string
  tempatLahir?: string
  tanggalLahir?: string
  tanggalJoin?: string
  catatanAwalKerja?: string
  gajiPokok?: number
  totalOffBulanIni?: number
  avatar?: string
  paymentHistory?: any[]
  [key: string]: any
}

export const getDefaultKasirAccounts = (): Record<string, KasirAccount> => ({
  'owner': { pin: '0000', role: 'owner', name: 'Owner' },
  'kasir1': { pin: '1234', role: 'kasir', name: 'Kasir 1' },
  'kasir2': { pin: '5678', role: 'kasir', name: 'Kasir 2' },
})

export const getKasirAccounts = (): Record<string, KasirAccount> => {
  const stored = localStorage.getItem('alphaPro_kasir_list')
  if (stored) {
    try { return JSON.parse(stored) } catch(e) {}
  }
  return getDefaultKasirAccounts()
}

export const saveKasirAccounts = (accounts: Record<string, KasirAccount>) => {
  localStorage.setItem('alphaPro_kasir_list', JSON.stringify(accounts))
}

interface LoginScreenProps {
  onLogin: (username: string, account: KasirAccount, alasan_telat?: string, shiftName?: string) => void
  storeName?: string
  storeId?: string
  storePhoto?: string
  kasirListOverride?: Record<string, KasirAccount>
  financialSettings?: Record<string, string>
  googleUid?: string
}

const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  storeName, 
  storeId, 
  storePhoto,
  kasirListOverride, 
  financialSettings: propFinancialSettings,
  googleUid
}) => {
  const [selectedUser, setSelectedUser] = useState(() => {
    try {
      const saved = localStorage.getItem(storeId && storeId !== 'all' ? `alphaPro_${storeId}_last_selected_user` : 'alphaPro_last_selected_user')
      return (saved && saved.toLowerCase() !== 'owner') ? saved : ''
    } catch {
      return ''
    }
  })
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(true)
  const [error, setError] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [isPinEnabled, setIsPinEnabled] = useState(true)
  const [kasirList, setKasirList] = useState<Record<string, KasirAccount>>({})
  const [hasAbsenToday, setHasAbsenToday] = useState(false)
  const [onlineTodayAbsen, setOnlineTodayAbsen] = useState<Record<string, { date: string; time: string; shift?: string }>>(() => {
    const today = getLocalDateString()
    const storeKey = storeId ? `alphaPro_${storeId}_absen_harian` : 'alphaPro_absen_harian'
    try {
      const storeAbsens = JSON.parse(localStorage.getItem(storeKey) || '{}')
      const legacyAbsens = JSON.parse(localStorage.getItem('alphaPro_absen_harian') || '{}')
      const merged = { ...legacyAbsens, ...storeAbsens }
      const res: Record<string, { date: string; time: string; shift?: string }> = {}
      for (const [k, v] of Object.entries(merged)) {
        if ((v as any)?.date === today) {
          res[k] = v as any
        }
      }
      return res
    } catch {
      return {}
    }
  })
  const [selectedShift, setSelectedShift] = useState<'PAGI' | 'SIANG' | 'MALAM'>('SIANG')
  const [alasanTelat, setAlasanTelat] = useState('')
  const [currentTimeStr, setCurrentTimeStr] = useState(() => 
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  )
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [searchCashier, setSearchCashier] = useState('')
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dedicated Absensi Modal (Anti-Skip Gate) states
  const [isAbsenModalOpen, setIsAbsenModalOpen] = useState(false)
  const [authenticatedAccount, setAuthenticatedAccount] = useState<KasirAccount | null>(null)
  const [absenModalError, setAbsenModalError] = useState('')
  const [isSubmittingAbsen, setIsSubmittingAbsen] = useState(false)

  // Reset foto selfie jika kasir atau shift berganti
  useEffect(() => {
    setCapturedSelfie(null)
  }, [selectedUser, selectedShift])

  // Live financial & shift settings synced with Supabase Realtime
  const [liveFinancialSettings, setLiveFinancialSettings] = useState<Record<string, string>>(() => {
    if (propFinancialSettings && Object.keys(propFinancialSettings).length > 0) {
      return propFinancialSettings
    }
    try {
      const key = storeId && storeId !== 'all' ? `alphaPro_${storeId}_financial` : 'alphaPro_financial'
      const stored = localStorage.getItem(key) || localStorage.getItem('alphaPro_financial')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  // Sync when prop updates
  useEffect(() => {
    if (propFinancialSettings && Object.keys(propFinancialSettings).length > 0) {
      setLiveFinancialSettings(propFinancialSettings)
    }
  }, [propFinancialSettings])

  // Real-time synchronization from Supabase for this store
  useEffect(() => {
    if (!storeId || storeId === 'all') return

    // 1. Fetch fresh store_settings from cloud (financial_settings & promo_banners)
    supabase
      .from('store_settings')
      .select('financial_settings, promo_banners')
      .eq('store_id', storeId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          if (data.financial_settings) {
            setLiveFinancialSettings(data.financial_settings)
            localStorage.setItem(`alphaPro_${storeId}_financial`, JSON.stringify(data.financial_settings))
          }
          if (data.promo_banners && Array.isArray(data.promo_banners) && data.promo_banners.length > 0) {
            try {
              localStorage.setItem(`alphaPro_${storeId}_promoBanners`, JSON.stringify(data.promo_banners))
              localStorage.setItem('alphaPro_promoBanners', JSON.stringify(data.promo_banners))
            } catch (e) {}
          }
        }
      })

    // 2. Realtime listener for live updates from Owner phone
    const channel = supabase
      .channel(`login_store_settings_${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_settings',
          filter: `store_id=eq.${storeId}`
        },
        (payload: any) => {
          const newFin = payload.new?.financial_settings
          if (newFin) {
            setLiveFinancialSettings(newFin)
            try {
              localStorage.setItem(`alphaPro_${storeId}_financial`, JSON.stringify(newFin))
            } catch (e) {}
          }
          let newBanners = payload.new?.promo_banners
          if (!newBanners && payload.new?.presets && Array.isArray(payload.new.presets)) {
            const bItem = payload.new.presets.find((p: any) => p && p.id === '_PROMO_BANNERS_')
            if (bItem?.data && Array.isArray(bItem.data)) {
              newBanners = bItem.data
            }
          }
          if (newBanners && Array.isArray(newBanners)) {
            try {
              localStorage.setItem(`alphaPro_${storeId}_promoBanners`, JSON.stringify(newBanners))
              localStorage.setItem('alphaPro_promoBanners', JSON.stringify(newBanners))
            } catch (e) {}
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId])

  // Online Multi-Device Attendance Synchronization via Supabase & Realtime
  useEffect(() => {
    const today = getLocalDateString()

    const fetchOnlineAttendance = async () => {
      try {
        let absQuery = supabase
          .from('absensi')
          .select('username, nama, tanggal, jam_masuk, shift, status')
          .eq('tanggal', today)

        if (storeId && storeId !== 'all') {
          absQuery = absQuery.eq('store_id', storeId)
        } else if (googleUid) {
          absQuery = absQuery.eq('user_id', googleUid)
        }

        const { data: absData, error: absErr } = await absQuery

        const newMap: Record<string, { date: string; time: string; shift?: string }> = {}

        if (!absErr && Array.isArray(absData)) {
          for (const row of absData) {
            if (row.username && row.status !== 'Libur' && row.status !== 'Izin') {
              newMap[row.username] = {
                date: row.tanggal,
                time: row.jam_masuk || '',
                shift: row.shift || ''
              }
            }
          }
        }

        // Juga cek rekaman selfie di Supabase
        try {
          let sQuery = supabase
            .from('absen_selfie_records')
            .select('cashier_id, shift_id, shift_name, jam, tanggal')
            .eq('tanggal', today)

          if (storeId && storeId !== 'all') {
            sQuery = sQuery.eq('store_id', storeId)
          }

          const { data: sData } = await sQuery
          if (Array.isArray(sData)) {
            for (const sRow of sData) {
              if (sRow.cashier_id && !newMap[sRow.cashier_id]) {
                newMap[sRow.cashier_id] = {
                  date: sRow.tanggal,
                  time: sRow.jam || '',
                  shift: sRow.shift_id || sRow.shift_name || ''
                }
              }
            }
          }
        } catch (e) {}

        if (Object.keys(newMap).length > 0) {
          setOnlineTodayAbsen(prev => ({ ...prev, ...newMap }))

          // Simpan juga ke cache lokal agar instan
          const storeKey = storeId ? `alphaPro_${storeId}_absen_harian` : 'alphaPro_absen_harian'
          try {
            const currentStore = JSON.parse(localStorage.getItem(storeKey) || '{}')
            const merged = { ...currentStore, ...newMap }
            localStorage.setItem(storeKey, JSON.stringify(merged))
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Gagal sinkron absensi online:', err)
      }
    }

    fetchOnlineAttendance()

    // Realtime channel listener untuk tabel absensi & absen_selfie_records
    const filter = storeId && storeId !== 'all' ? `store_id=eq.${storeId}` : undefined
    const channel = supabase
      .channel(`login_realtime_absensi_${storeId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'absensi',
          ...(filter ? { filter } : {})
        },
        () => {
          fetchOnlineAttendance()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'absen_selfie_records',
          ...(filter ? { filter } : {})
        },
        () => {
          fetchOnlineAttendance()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, googleUid])

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Check active shifts from store financial settings (only active for updated app v1.3.2+)
  const activeShifts = useMemo(() => {
    if (!isVersionSupported(APP_VERSION, '1.3.2')) return []
    return getActiveShifts(liveFinancialSettings, APP_VERSION)
  }, [liveFinancialSettings])

  const isAbsenFeatureActive = activeShifts.length > 0

  // Check if cashier has already clocked in today for this store (Online First with Local Cache fallback)
  useEffect(() => {
    if (selectedUser && selectedUser.toLowerCase() !== 'owner' && (kasirList[selectedUser]?.role || '').toLowerCase() !== 'owner') {
      const today = getLocalDateString()
      const storeKey = storeId ? `alphaPro_${storeId}_absen_harian` : 'alphaPro_absen_harian'
      let alreadyAbsen = false

      // 1. Cek dari online state Supabase
      if (onlineTodayAbsen[selectedUser]?.date === today) {
        alreadyAbsen = true
      } else {
        // 2. Fallback cek dari cache lokal
        try {
          const storeAbsens = JSON.parse(localStorage.getItem(storeKey) || '{}')
          const legacyAbsens = JSON.parse(localStorage.getItem('alphaPro_absen_harian') || '{}')
          if (storeAbsens[selectedUser]?.date === today || legacyAbsens[selectedUser]?.date === today) {
            alreadyAbsen = true
          }
        } catch (e) {}
      }

      setHasAbsenToday(alreadyAbsen)
    } else {
      setHasAbsenToday(false)
    }
  }, [selectedUser, kasirList, storeId, onlineTodayAbsen])

  // Smart auto-select shift based on current time
  useEffect(() => {
    if (activeShifts.length > 0) {
      const [hStr, mStr] = currentTimeStr.split(':')
      const mins = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0)

      let bestShift = activeShifts[0].id
      if (activeShifts.some(s => s.id === 'PAGI') && mins < 12 * 60) {
        bestShift = 'PAGI'
      } else if (activeShifts.some(s => s.id === 'SIANG') && mins >= 12 * 60 && mins < 18 * 60) {
        bestShift = 'SIANG'
      } else if (activeShifts.some(s => s.id === 'MALAM') && (mins >= 18 * 60 || mins < 5 * 60)) {
        bestShift = 'MALAM'
      } else if (activeShifts.some(s => s.id === 'MALAM') && mins >= 17 * 60 + 30) {
        bestShift = 'MALAM'
      } else if (activeShifts.some(s => s.id === 'SIANG')) {
        bestShift = 'SIANG'
      }
      setSelectedShift(bestShift)
    }
  }, [activeShifts, currentTimeStr])

  // Lateness info for the currently selected shift
  const shiftLateness = useMemo(() => {
    if (!selectedShift || activeShifts.length === 0) return { isLate: false, lateMins: 0 }
    return checkShiftLateness(currentTimeStr, selectedShift, liveFinancialSettings)
  }, [selectedShift, currentTimeStr, liveFinancialSettings, activeShifts])

  useEffect(() => {
    if (kasirListOverride) {
      setKasirList(kasirListOverride)
    } else {
      setKasirList(getKasirAccounts())
    }
  }, [kasirListOverride])

  // Save last selected cashier for fast repeat login
  useEffect(() => {
    if (selectedUser && selectedUser.toLowerCase() !== 'owner') {
      try {
        if (storeId && storeId !== 'all') {
          localStorage.setItem(`alphaPro_${storeId}_last_selected_user`, selectedUser)
        }
        localStorage.setItem('alphaPro_last_selected_user', selectedUser)
      } catch (e) {}
    }
  }, [selectedUser, storeId])

  // Close popup modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isUserModalOpen) {
        setIsUserModalOpen(false)
      }
    }
    if (isUserModalOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isUserModalOpen])

  // Check if PIN is enabled from localStorage
  useEffect(() => {
    const enabled = localStorage.getItem('alphaPro_isPinEnabled')
    if (enabled === 'false') {
      setIsPinEnabled(false)
    }
  }, [])

  // Check if specific cashier has already clocked in today (Online First)
  const isCashierAbsenToday = (userId: string) => {
    const today = getLocalDateString()
    if (onlineTodayAbsen[userId]?.date === today) return true
    const storeKey = storeId ? `alphaPro_${storeId}_absen_harian` : 'alphaPro_absen_harian'
    try {
      const storeAbsens = JSON.parse(localStorage.getItem(storeKey) || '{}')
      const legacyAbsens = JSON.parse(localStorage.getItem('alphaPro_absen_harian') || '{}')
      return Boolean(storeAbsens[userId]?.date === today || legacyAbsens[userId]?.date === today)
    } catch {
      return false
    }
  }

  // Filter non-owner cashiers (pastikan akun ID 'owner' dan role 'owner' tidak pernah muncul)
  const cashierEntries = useMemo(() => {
    return Object.entries(kasirList).filter(([id, acc]) => 
      id.toLowerCase() !== 'owner' && 
      (acc.role || '').toLowerCase() !== 'owner'
    )
  }, [kasirList])

  // Filtered cashier list for dropdown
  const filteredCashiers = useMemo(() => {
    if (!searchCashier.trim()) return cashierEntries
    const q = searchCashier.toLowerCase()
    return cashierEntries.filter(([_id, acc]) => (acc.name || '').toLowerCase().includes(q))
  }, [cashierEntries, searchCashier])

  // Is attendance actively shown on screen?
  // When active (login 1 / belum absen): compact layout so everything fits on screen.
  // When inactive (login 2 / sudah absen): enlarged layout for comfortable viewing and faster selection.
  const isAbsenShowing = Boolean(
    selectedUser && 
    selectedUser.toLowerCase() !== 'owner' && 
    (kasirList[selectedUser]?.role || '').toLowerCase() !== 'owner' && 
    isAbsenFeatureActive && 
    !hasAbsenToday
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setError('')

    if (!selectedUser || selectedUser.toLowerCase() === 'owner') {
      setError('Silakan pilih kasir.')
      triggerShake()
      return
    }

    const account = kasirList[selectedUser]
    if (!account || (account.role || '').toLowerCase() === 'owner') {
      setError('Akun tidak valid untuk login kasir.')
      triggerShake()
      return
    }

    // 1. Validasi PIN terlebih dahulu (Keamanan utama)
    if (isPinEnabled) {
      if (!pin) {
        setError('PIN harus diisi.')
        triggerShake()
        return
      }

      if (account.pin !== pin) {
        setError('PIN salah. Coba lagi.')
        setPin('')
        triggerShake()
        return
      }
    }

    // 2. PIN Valid! Cek apakah kasir perlu melakukan absensi hari ini
    const needsAbsen = Boolean(
      account.role !== 'owner' && 
      isAbsenFeatureActive && 
      !hasAbsenToday
    )

    if (needsAbsen) {
      // Buka popup modal absen (Anti-Skip Gate)
      setAuthenticatedAccount(account)
      setIsAbsenModalOpen(true)
      setAbsenModalError('')
      return
    }

    // 3. Jika sudah absen hari ini atau fitur absen tidak aktif -> Langsung masuk
    setIsSubmitting(true)
    try {
      onLogin(selectedUser, account)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Konfirmasi dan simpan absensi dari dalam Popup Modal (Anti-Skip Gate)
  const handleConfirmAbsenAndLogin = async () => {
    if (isSubmittingAbsen || !authenticatedAccount) return
    setAbsenModalError('')

    if (!selectedShift) {
      setAbsenModalError('Harap pilih shift kerja Anda.')
      return
    }

    if (shiftLateness.isLate && !alasanTelat.trim()) {
      setAbsenModalError('Wajib isi keterangan alasan keterlambatan.')
      return
    }

    if (isAbsenSelfieEnabled(liveFinancialSettings) && !capturedSelfie) {
      setAbsenModalError('Wajib ambil foto selfie bukti kehadiran terlebih dahulu.')
      return
    }

    setIsSubmittingAbsen(true)

    try {
      const today = getLocalDateString()
      const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      const timeWithSec = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      const storeKey = storeId ? `alphaPro_${storeId}_absen_harian` : 'alphaPro_absen_harian'

      // 1. Simpan ke local cache langsung (0ms)
      try {
        const storeAbsens = JSON.parse(localStorage.getItem(storeKey) || '{}')
        storeAbsens[selectedUser] = { date: today, time, shift: selectedShift }
        localStorage.setItem(storeKey, JSON.stringify(storeAbsens))

        const legacyAbsens = JSON.parse(localStorage.getItem('alphaPro_absen_harian') || '{}')
        legacyAbsens[selectedUser] = { date: today, time, shift: selectedShift }
        localStorage.setItem('alphaPro_absen_harian', JSON.stringify(legacyAbsens))
      } catch (e) {}

      // Update state instan
      setOnlineTodayAbsen(prev => ({
        ...prev,
        [selectedUser]: { date: today, time, shift: selectedShift }
      }))
      setHasAbsenToday(true)

      // Payload absensi Supabase
      const absPayload: any = {
        user_id: googleUid || null,
        store_id: storeId && storeId !== 'all' ? storeId : null,
        username: selectedUser,
        nama: authenticatedAccount.name || selectedUser,
        tanggal: today,
        jam_masuk: timeWithSec,
        status: 'Hadir',
        shift: selectedShift
      }
      if (shiftLateness.isLate && alasanTelat.trim()) {
        absPayload.alasan_telat = alasanTelat.trim()
      }

      // 2. Jalankan sinkronisasi Cloud secara paralel (Tabel absensi & Upload foto selfie)
      const cloudSyncTask = Promise.all([
        (async () => {
          try {
            let { error: absInsertErr } = await supabase.from('absensi').insert([absPayload])
            if (absInsertErr && (absInsertErr.message?.toLowerCase().includes('shift') || absInsertErr.details?.toLowerCase().includes('shift'))) {
              delete absPayload.shift
              absInsertErr = (await supabase.from('absensi').insert([absPayload])).error
            }
            if (absInsertErr) {
              console.warn('Supabase absensi insert warning:', absInsertErr.message || absInsertErr)
            }
          } catch (err) {
            console.warn('Absensi cloud insert catch:', err)
          }
        })(),
        capturedSelfie ? (async () => {
          try {
            await saveAbsenSelfieRecord({
              storeId: storeId && storeId !== 'all' ? storeId : 'default',
              cashierId: selectedUser,
              cashierName: authenticatedAccount.name || selectedUser,
              tanggal: today,
              jam: time,
              shiftId: selectedShift,
              shiftName: activeShifts.find(s => s.id === selectedShift)?.name || selectedShift,
              isLate: shiftLateness.isLate,
              alasanTelat: shiftLateness.isLate ? alasanTelat.trim() : undefined,
              base64Image: capturedSelfie,
            })
          } catch (err) {
            console.error('Upload selfie error:', err)
          }
        })() : Promise.resolve()
      ])

      // Beri batas tunggu kilat (maksimal 1.2 detik).
      // Bila jaringan normal, selesai dalam sekejap ratusan milidetik.
      // Bila jaringan PC lambat/tethering, kasir TIDAK STUCK dan langsung masuk kasir,
      // sementara sinkronisasi foto tetap rampung di background tanpa gangguan.
      await Promise.race([
        cloudSyncTask,
        new Promise(resolve => setTimeout(resolve, 1200))
      ])

      // 3. Tutup modal & masuk ke aplikasi utama kasir!
      setIsAbsenModalOpen(false)
      onLogin(
        selectedUser, 
        authenticatedAccount, 
        shiftLateness.isLate ? alasanTelat.trim() : undefined,
        selectedShift
      )
    } finally {
      setIsSubmittingAbsen(false)
    }
  }

  // Tombol Batal di Modal Absen (Kembali ke login awal dengan aman)
  const handleCancelAbsenModal = () => {
    setIsAbsenModalOpen(false)
    setAuthenticatedAccount(null)
    setPin('')
    setCapturedSelfie(null)
    setAlasanTelat('')
    setAbsenModalError('')
  }

  const triggerShake = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }

  const effectiveStorePhoto = storePhoto || (storeId && storeId !== 'all' ? localStorage.getItem(`alphaPro_${storeId}_store_photo`) : null) || localStorage.getItem('alphaPro_store_photo') || null

  return (
    <div className="login-screen !py-4 !px-4 min-h-[100dvh] flex items-center justify-center">
      {/* ── CARD LOGIN KASIR (SUPER MINIMALIS & BERSIH) ── */}
      <div 
        className={`login-card ${isShaking ? 'shake' : ''} shadow-2xl transition-all duration-300 ease-in-out !py-6 !px-6 sm:!py-7 sm:!px-8 !max-w-[425px] !rounded-3xl border border-slate-100`}
      >
        {/* Logo Toko & Header */}
        <div className="login-header !mb-4">
          <div className="mx-auto mb-2 flex items-center justify-center w-14 h-14">
            <img 
              src={effectiveStorePhoto || "/logo_icon.png"} 
              onError={(e) => { (e.currentTarget.src = '/logo_icon.png') }} 
              alt={storeName || "Logo Toko"} 
              className="w-14 h-14 rounded-2xl object-cover shadow-md border border-slate-100" 
            />
          </div>
          <h1 className="login-title font-black tracking-tight leading-tight !text-xl sm:!text-2xl">
            {storeName ? storeName.toUpperCase() : 'ALPHA'} <span className="login-title-accent">{storeName ? '' : 'Pro'}</span>
          </h1>
          <p className="login-subtitle text-slate-500 font-semibold leading-tight !text-xs sm:!text-[13px] !mt-1">
            {storeName ? 'Login Kasir' : 'Pembukuan Agen Brilink & Konter'}
          </p>
        </div>

        {/* Form Login Utama */}
        <form onSubmit={handleSubmit} className="login-form gap-3.5 sm:gap-4">
          {/* User Select Trigger (Opens Popup Modal) */}
          <div className="login-field">
            <div className="flex items-center justify-between mb-1.5">
              <label className="login-label !mb-0 font-bold text-slate-700 text-xs sm:text-[13px]">
                Pilih Kasir
              </label>
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserModalOpen(true)
                    setError('')
                  }}
                  className="text-[10px] sm:text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Ganti Kasir
                </button>
              )}
            </div>
            
            <div>
              <button
                type="button"
                onClick={() => {
                  setIsUserModalOpen(true)
                  setError('')
                }}
                className="w-full flex items-center justify-between text-left transition-all duration-200 border bg-slate-50/70 hover:bg-white focus:bg-white hover:border-blue-400 outline-none cursor-pointer group shadow-xs h-14 py-3 px-4 rounded-2xl text-base sm:text-lg font-bold border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    selectedUser 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xs' 
                      : 'bg-slate-200 text-slate-400'
                  } w-8 h-8 text-xs sm:w-9 sm:h-9 sm:text-sm`}>
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <span className={`truncate ${
                      selectedUser && kasirList[selectedUser] ? 'text-slate-900 font-black' : 'text-slate-400 font-medium'
                    } text-sm sm:text-base`}>
                      {selectedUser && kasirList[selectedUser] ? kasirList[selectedUser].name : 'Pilih Kasir...'}
                    </span>
                    {selectedUser && kasirList[selectedUser] && (
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold uppercase shrink-0 border border-blue-100">
                        Kasir
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={`font-bold rounded-lg transition-all ${
                    selectedUser 
                      ? 'text-[11px] text-blue-600 bg-blue-50/90 group-hover:bg-blue-100 px-2 py-0.5 border border-blue-200/60' 
                      : 'text-xs text-white bg-blue-600 px-2.5 py-1 shadow-xs group-hover:bg-blue-700'
                  }`}>
                    {selectedUser ? 'Ganti' : 'Pilih'}
                  </span>
                  <i className="fa-solid fa-chevron-right text-slate-400 text-xs group-hover:text-blue-600 transition-colors"></i>
                </div>
              </button>
            </div>
          </div>

          {/* Status info jika kasir sudah absen hari ini (Terdeteksi Online) */}
          {selectedUser && kasirList[selectedUser]?.role !== 'owner' && isAbsenFeatureActive && hasAbsenToday && (
            <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl px-3 py-2 flex items-center justify-between text-emerald-900 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs shadow-xs shrink-0">
                  <i className="fa-solid fa-check"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black leading-tight uppercase text-emerald-950 truncate">
                    Sudah Absen Hari Ini
                  </p>
                  <p className="text-[9px] text-emerald-700 font-bold leading-none mt-0.5 truncate">
                    {onlineTodayAbsen[selectedUser]?.shift ? `Shift ${onlineTodayAbsen[selectedUser]?.shift}` : 'Kehadiran Aktif'}
                    {onlineTodayAbsen[selectedUser]?.time ? ` • Jam ${onlineTodayAbsen[selectedUser]?.time.slice(0, 5)}` : ''}
                  </p>
                </div>
              </div>
              <span className="text-[8.5px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200/80 shrink-0 uppercase tracking-wide flex items-center gap-1">
                <i className="fa-solid fa-cloud-check text-emerald-600"></i>
                Online
              </span>
            </div>
          )}

          {/* PIN Input (Hidden if PIN is disabled) */}
          {isPinEnabled && (
            <div className="login-field">
              <label className="login-label font-bold text-slate-700 text-xs sm:text-[13px] mb-1.5">
                Masukkan PIN
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute text-gray-400 pointer-events-none left-4 top-1/2 -translate-y-1/2 text-sm sm:text-base z-10"></i>
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, '')); setError('') }}
                  placeholder="MASUKKAN PIN"
                  maxLength={6}
                  className="login-input tracking-wider py-3.5 !pl-14 !pr-12 text-base sm:text-lg rounded-2xl h-14 tracking-widest font-black border-slate-300 shadow-sm"
                  style={{ paddingLeft: '3.75rem', paddingRight: '3rem' }}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-1 flex items-center justify-center cursor-pointer right-3.5 z-10"
                  title={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                >
                  <i className={`fa-solid ${showPin ? 'fa-eye' : 'fa-eye-slash'} text-sm sm:text-base`}></i>
                </button>
              </div>
            </div>
          )}

          {/* PIN Info if disabled */}
          {!isPinEnabled && selectedUser && (
            <p className="text-[10px] text-emerald-600 font-bold text-center mt-0.5 animate-pulse">
              <i className="fa-solid fa-shield-check mr-1"></i> Mode Tanpa PIN Aktif
            </p>
          )}

          {/* Error Message */}
          {error && (
            <div className="login-error py-2.5 px-3.5 text-xs sm:text-sm rounded-2xl gap-2 font-bold animate-shake">
              <i className="fa-solid fa-circle-exclamation text-xs"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`login-btn flex items-center justify-center gap-2 py-3.5 sm:py-4 text-base sm:text-lg rounded-2xl mt-2 font-black tracking-widest shadow-xl shadow-blue-500/30 active:scale-98 transition-all cursor-pointer ${
              isSubmitting ? 'opacity-80 cursor-wait' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-arrow-right-to-bracket text-sm sm:text-base"></i>
                <span>MASUK</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="login-footer text-slate-400 font-medium text-xs mt-3">
          ALPHA Pro v{APP_VERSION}
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* POPUP / MODAL KHUSUS ABSENSI KEHADIRAN (ANTI-SKIP GATE)       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isAbsenModalOpen && authenticatedAccount && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          onClick={(e) => e.stopPropagation()} // Anti-Skip: Click outside does NOT dismiss!
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg shadow-md shadow-blue-500/20">
                  <i className="fa-solid fa-calendar-check"></i>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                    ABSENSI KEHADIRAN KASIR
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold leading-tight mt-0.5">
                    Lengkapi absensi sebelum membuka kasir
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <i className="fa-solid fa-clock text-[9px]"></i> {currentTimeStr}
                </span>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 text-left">
              {/* Profile Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {authenticatedAccount.name}
                      </span>
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 uppercase shrink-0">
                        Kasir
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                      {storeName || 'Toko'} • {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                  Belum Absen
                </span>
              </div>

              {/* Shift Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <i className="fa-solid fa-business-time text-blue-600"></i>
                    Pilih Shift Hari Ini
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Ketuk untuk memilih
                  </span>
                </div>
                <div className={`grid gap-2 ${activeShifts.length === 1 ? 'grid-cols-1' : activeShifts.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {activeShifts.map((shift) => {
                    const isSelected = selectedShift === shift.id

                    let bgClasses = ''
                    let iconElement = null
                    let labelColor = 'text-white'

                    if (shift.id === 'PAGI') {
                      bgClasses = isSelected
                        ? 'bg-gradient-to-br from-sky-600 via-blue-700 to-amber-700 ring-2 ring-amber-400 shadow-md scale-[1.01]'
                        : 'bg-gradient-to-br from-sky-700 via-blue-800 to-amber-800 hover:scale-[1.01] shadow-xs border-amber-300/30'
                      iconElement = <i className="fa-solid fa-cloud-sun text-amber-300 text-sm filter drop-shadow shrink-0"></i>
                      labelColor = 'text-amber-100'
                    } else if (shift.id === 'SIANG') {
                      bgClasses = isSelected
                        ? 'bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-700 ring-2 ring-indigo-300 shadow-md scale-[1.01]'
                        : 'bg-gradient-to-br from-blue-800 via-indigo-800 to-purple-900 hover:scale-[1.01] shadow-xs border-indigo-300/30'
                      iconElement = <i className="fa-solid fa-sun text-yellow-300 text-sm filter drop-shadow shrink-0"></i>
                      labelColor = 'text-indigo-100'
                    } else {
                      bgClasses = isSelected
                        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 ring-2 ring-purple-400 shadow-md scale-[1.01]'
                        : 'bg-gradient-to-br from-slate-900 via-gray-950 to-slate-950 hover:scale-[1.01] shadow-xs border-slate-700/50'
                      iconElement = <i className="fa-solid fa-moon text-indigo-200 text-sm filter drop-shadow shrink-0"></i>
                      labelColor = 'text-indigo-200'
                    }

                    return (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => { setSelectedShift(shift.id); setAbsenModalError(''); }}
                        className={`relative rounded-2xl py-2.5 px-2 text-white transition-all flex flex-col items-center justify-center text-center cursor-pointer border select-none ${bgClasses}`}
                      >
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-white text-emerald-600 rounded-full flex items-center justify-center text-[8px] font-black shadow ring-1 ring-emerald-500">
                            <i className="fa-solid fa-check"></i>
                          </span>
                        )}
                        <div className="flex items-center justify-center gap-1.5 mb-0.5">
                          {iconElement}
                          <span className="text-xs font-black uppercase tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">
                            {shift.name}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] bg-black/40 px-2 py-0.5 rounded-full border border-white/10 ${labelColor} leading-none mt-1`}>
                          {shift.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Foto Selfie Absensi (Wajib jika diaktifkan oleh Owner di Pengaturan - Tepat di bawah pilih shift) */}
              {isAbsenSelfieEnabled(liveFinancialSettings) && (
                <div>
                  <AbsenSelfieCapture
                    storeName={storeName || 'ALFAZA CELL'}
                    cashierName={authenticatedAccount.name || selectedUser}
                    shiftName={activeShifts.find(s => s.id === selectedShift)?.name || selectedShift}
                    onSelfieCaptured={setCapturedSelfie}
                  />
                </div>
              )}

              {/* Keterangan Terlambat (OTOMATIS MUNCUL HANYA JIKA TERLAMBAT - Posisi paling bawah & lebih compact) */}
              {shiftLateness.isLate && (
                <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-black text-rose-800 flex items-center gap-1.5">
                      <i className="fa-solid fa-triangle-exclamation text-rose-600"></i>
                      Keterangan Terlambat Absen <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[8.5px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                      <i className="fa-solid fa-clock text-[8px]"></i> Telat {shiftLateness.lateMins} Menit
                    </span>
                  </div>
                  <textarea
                    className="w-full text-xs p-2 rounded-xl border border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 bg-white placeholder-gray-400 text-gray-800 outline-none resize-none transition-all shadow-inner leading-normal h-12"
                    placeholder="Tulis alasan keterlambatan Anda di sini (wajib diisi)..."
                    rows={2}
                    value={alasanTelat}
                    onChange={(e) => { setAlasanTelat(e.target.value); setAbsenModalError(''); }}
                    autoFocus
                  />
                </div>
              )}

              {/* Error Message inside Absen Modal */}
              {absenModalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2 animate-shake">
                  <i className="fa-solid fa-circle-exclamation shrink-0"></i>
                  <span>{absenModalError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Actions (Anti-Skip Gate) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={handleConfirmAbsenAndLogin}
                disabled={isSubmittingAbsen}
                className={`w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm tracking-wide shadow-lg shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isSubmittingAbsen ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                {isSubmittingAbsen ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Menyimpan Absensi Cloud...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-arrow-right-to-bracket"></i>
                    <span>KIRIM ABSENSI & BUKA KASIR</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmittingAbsen}
                onClick={handleCancelAbsenModal}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors text-center cursor-pointer"
              >
                Batal / Kembali ke Layar Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL PILIH PENGGUNA / KASIR */}
      {isUserModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsUserModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-base border border-blue-100 shadow-xs">
                  <i className="fa-solid fa-users"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">Pilih Kasir</h3>
                  <p className="text-xs text-slate-500 font-medium">Silakan pilih nama kasir untuk login</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Tutup Popup"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Search Bar (jika kasir lebih dari 2) */}
            {cashierEntries.length > 2 && (
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
                  <input
                    type="text"
                    value={searchCashier}
                    onChange={(e) => setSearchCashier(e.target.value)}
                    placeholder="Cari nama kasir..."
                    className="w-full pl-8 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium transition-all shadow-xs"
                    autoFocus
                  />
                  {searchCashier && (
                    <button 
                      type="button" 
                      onClick={() => setSearchCashier('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                      title="Hapus pencarian"
                    >
                      <i className="fa-solid fa-circle-xmark"></i>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Cashier List */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 max-h-[55vh] flex-1">
              {filteredCashiers.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2 text-xl">
                    <i className="fa-solid fa-user-slash"></i>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600">Tidak ada kasir yang cocok</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Coba kata kunci pencarian yang lain</p>
                </div>
              ) : (
                filteredCashiers.map(([id, acc]) => {
                  const isSelected = selectedUser === id
                  const alreadyAbsen = isCashierAbsenToday(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(id)
                        setIsUserModalOpen(false)
                        setError('')
                      }}
                      className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-100 shadow-sm'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 bg-white shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 transition-transform group-hover:scale-105 ${
                          isSelected
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 border border-blue-200/60'
                        }`}>
                          <i className="fa-solid fa-user text-base"></i>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`block font-extrabold truncate text-sm sm:text-base ${
                              isSelected ? 'text-blue-950' : 'text-slate-800'
                            }`}>
                              {acc.name}
                            </span>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 shrink-0 uppercase tracking-wide">
                              Kasir
                            </span>
                          </div>
                          {isAbsenFeatureActive && (
                            <p className="text-[11px] mt-1 font-medium flex items-center gap-1.5">
                              {alreadyAbsen ? (
                                <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                                  <i className="fa-solid fa-circle-check text-[10px]"></i> Sudah Absen Hari Ini
                                  {onlineTodayAbsen[id]?.shift ? ` (${onlineTodayAbsen[id].shift})` : ''}
                                </span>
                              ) : (
                                <span className="text-amber-600 flex items-center gap-1 font-semibold">
                                  <i className="fa-solid fa-clock text-[10px]"></i> Belum Absen
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isSelected ? (
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-md shadow-blue-500/30">
                            <i className="fa-solid fa-check font-black"></i>
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full border border-slate-200 group-hover:border-blue-400 group-hover:bg-blue-50 flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-colors">
                            <i className="fa-solid fa-chevron-right text-xs"></i>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-medium text-slate-500">
                Total: <strong className="text-slate-700">{cashierEntries.length}</strong> Kasir terdaftar
              </span>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginScreen
