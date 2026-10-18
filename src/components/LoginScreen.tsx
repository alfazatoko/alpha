import React, { useState, useEffect, useMemo, useRef } from 'react'
import { getLocalDateString, getShiftInfo, getActiveShifts, checkShiftLateness, APP_VERSION, isVersionSupported } from '../lib/utils'
import { supabase } from '../lib/supabase'

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
}

const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  storeName, 
  storeId, 
  storePhoto,
  kasirListOverride, 
  financialSettings: propFinancialSettings 
}) => {
  const [selectedUser, setSelectedUser] = useState(() => {
    try {
      const saved = localStorage.getItem(storeId && storeId !== 'all' ? `alphaPro_${storeId}_last_selected_user` : 'alphaPro_last_selected_user')
      return saved || ''
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
  const [selectedShift, setSelectedShift] = useState<'PAGI' | 'SIANG' | 'MALAM'>('SIANG')
  const [alasanTelat, setAlasanTelat] = useState('')
  const [currentTimeStr, setCurrentTimeStr] = useState(() => 
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  )
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchCashier, setSearchCashier] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Check if cashier has already clocked in today for this store
  useEffect(() => {
    if (selectedUser && kasirList[selectedUser]?.role !== 'owner') {
      const today = getLocalDateString()
      const storeKey = storeId ? `alphaPro_${storeId}_absen_harian` : 'alphaPro_absen_harian'
      let alreadyAbsen = false
      try {
        const storeAbsens = JSON.parse(localStorage.getItem(storeKey) || '{}')
        const legacyAbsens = JSON.parse(localStorage.getItem('alphaPro_absen_harian') || '{}')
        if (storeAbsens[selectedUser]?.date === today || legacyAbsens[selectedUser]?.date === today) {
          alreadyAbsen = true
        }
      } catch (e) {}
      setHasAbsenToday(alreadyAbsen)
    } else {
      setHasAbsenToday(false)
    }
  }, [selectedUser, kasirList, storeId])

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
    if (selectedUser) {
      try {
        if (storeId && storeId !== 'all') {
          localStorage.setItem(`alphaPro_${storeId}_last_selected_user`, selectedUser)
        }
        localStorage.setItem('alphaPro_last_selected_user', selectedUser)
      } catch (e) {}
    }
  }, [selectedUser, storeId])

  // Close custom dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Check if PIN is enabled from localStorage
  useEffect(() => {
    const enabled = localStorage.getItem('alphaPro_isPinEnabled')
    if (enabled === 'false') {
      setIsPinEnabled(false)
    }
  }, [])

  // Check if specific cashier has already clocked in today
  const isCashierAbsenToday = (userId: string) => {
    const today = getLocalDateString()
    const storeKey = storeId ? `alphaPro_${storeId}_absen_harian` : 'alphaPro_absen_harian'
    try {
      const storeAbsens = JSON.parse(localStorage.getItem(storeKey) || '{}')
      const legacyAbsens = JSON.parse(localStorage.getItem('alphaPro_absen_harian') || '{}')
      return Boolean(storeAbsens[userId]?.date === today || legacyAbsens[userId]?.date === today)
    } catch {
      return false
    }
  }

  // Filter non-owner cashiers
  const cashierEntries = useMemo(() => {
    return Object.entries(kasirList).filter(([_id, acc]) => acc.role !== 'owner')
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
    kasirList[selectedUser]?.role !== 'owner' && 
    isAbsenFeatureActive && 
    !hasAbsenToday
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedUser) {
      setError('Silakan pilih pengguna.')
      triggerShake()
      return
    }

    const account = kasirList[selectedUser]
    if (!account) {
      setError('Akun tidak valid.')
      triggerShake()
      return
    }

    // Attendance validation (Only required on first login of the day when feature is active)
    if (account.role !== 'owner' && isAbsenFeatureActive && !hasAbsenToday) {
      if (!selectedShift) {
        setError('Harap pilih shift absen Anda.')
        triggerShake()
        return
      }

      if (shiftLateness.isLate && !alasanTelat.trim()) {
        setError('Anda terlambat absen. Harap isi keterangan alasan keterlambatan.')
        triggerShake()
        return
      }
    }

    // PIN validation
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

    // Success: Record attendance in local cache for today
    if (account.role !== 'owner' && isAbsenFeatureActive && !hasAbsenToday) {
      const today = getLocalDateString()
      const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      const storeKey = storeId ? `alphaPro_${storeId}_absen_harian` : 'alphaPro_absen_harian'
      
      try {
        const storeAbsens = JSON.parse(localStorage.getItem(storeKey) || '{}')
        storeAbsens[selectedUser] = { date: today, time, shift: selectedShift }
        localStorage.setItem(storeKey, JSON.stringify(storeAbsens))

        const legacyAbsens = JSON.parse(localStorage.getItem('alphaPro_absen_harian') || '{}')
        legacyAbsens[selectedUser] = { date: today, time, shift: selectedShift }
        localStorage.setItem('alphaPro_absen_harian', JSON.stringify(legacyAbsens))
      } catch (e) {}
    }

    onLogin(
      selectedUser, 
      account, 
      shiftLateness.isLate ? alasanTelat.trim() : undefined,
      selectedShift
    )
  }

  const triggerShake = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }

  const effectiveStorePhoto = storePhoto || (storeId && storeId !== 'all' ? localStorage.getItem(`alphaPro_${storeId}_store_photo`) : null) || localStorage.getItem('alphaPro_store_photo') || null

  return (
    <div className="login-screen !py-2 !px-3 sm:!py-4 sm:!px-4 min-h-[100dvh] flex items-center justify-center">
      <div 
        className={`login-card ${isShaking ? 'shake' : ''} shadow-xl transition-all duration-300 ease-in-out ${
          isAbsenShowing 
            ? '!py-3.5 !px-4 sm:!py-4 sm:!px-6 !max-w-[390px] !rounded-2xl' 
            : '!py-6 !px-6 sm:!py-7 sm:!px-8 !max-w-[425px] !rounded-3xl'
        }`}
      >
        {/* Logo Toko & Header */}
        <div className={`login-header transition-all duration-300 ${isAbsenShowing ? '!mb-2' : '!mb-4'}`}>
          <div className={`mx-auto mb-1.5 flex items-center justify-center transition-all duration-300 ${isAbsenShowing ? 'w-11 h-11' : 'w-14 h-14'}`}>
            <img 
              src={effectiveStorePhoto || "/logo_icon.png"} 
              onError={(e) => { (e.currentTarget.src = '/logo_icon.png') }} 
              alt={storeName || "Logo Toko"} 
              className={`object-cover shadow-sm border border-slate-100 transition-all duration-300 ${
                isAbsenShowing ? 'w-11 h-11 rounded-xl' : 'w-14 h-14 rounded-2xl shadow-md'
              }`} 
            />
          </div>
          <h1 className={`login-title font-black tracking-tight leading-tight transition-all duration-300 ${
            isAbsenShowing ? '!text-base sm:!text-lg' : '!text-xl sm:!text-2xl'
          }`}>
            {storeName ? storeName.toUpperCase() : 'ALPHA'} <span className="login-title-accent">{storeName ? '' : 'Pro'}</span>
          </h1>
          <p className={`login-subtitle text-slate-500 font-semibold leading-tight transition-all duration-300 ${
            isAbsenShowing ? '!text-[11px] !mt-0.5' : '!text-xs sm:!text-[13px] !mt-1'
          }`}>
            {storeName ? 'Login Kasir' : 'Pembukuan Agen brilink & Konter'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={`login-form transition-all duration-300 ${isAbsenShowing ? '!gap-2 sm:!gap-2.5' : '!gap-3.5 sm:!gap-4'}`}>
          {/* User Select (Custom Dropdown with borders and larger text) */}
          <div className="login-field relative" ref={dropdownRef}>
            <label className={`login-label font-bold text-slate-700 transition-all duration-300 ${
              isAbsenShowing ? '!text-[11px] !mb-1' : '!text-xs sm:!text-[13px] !mb-1.5'
            }`}>
              Pilih Pengguna
            </label>
            
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(prev => !prev)
                  setError('')
                }}
                className={`w-full flex items-center justify-between text-left transition-all duration-200 border bg-slate-50/70 hover:bg-white focus:bg-white outline-none cursor-pointer ${
                  isDropdownOpen ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-slate-200 hover:border-blue-300'
                } ${
                  isAbsenShowing 
                    ? '!h-9 !py-2 !px-3 !rounded-xl !text-xs' 
                    : '!h-14 !py-3 !px-4 !rounded-2xl !text-base sm:!text-lg font-bold border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`rounded-full flex items-center justify-center shrink-0 ${
                    selectedUser 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-slate-200 text-slate-400'
                  } ${isAbsenShowing ? 'w-5 h-5 text-[10px]' : 'w-8 h-8 text-xs sm:w-9 sm:h-9 sm:text-sm'}`}>
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <span className={`truncate ${
                    selectedUser && kasirList[selectedUser] ? 'text-slate-900 font-black' : 'text-slate-400 font-medium'
                  } ${isAbsenShowing ? 'text-xs' : 'text-sm sm:text-base'}`}>
                    {selectedUser && kasirList[selectedUser] ? kasirList[selectedUser].name : 'Pilih Pengguna'}
                  </span>
                  {selectedUser && kasirList[selectedUser] && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                      Kasir
                    </span>
                  )}
                </div>
                
                <i className={`fa-solid fa-chevron-down text-slate-400 text-xs shrink-0 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180 text-blue-600' : ''
                }`}></i>
              </button>

              {/* DROPDOWN MENU WITH DIVIDERS & LARGER CASHIER NAMES */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Search bar if there are more than 3 cashiers */}
                  {cashierEntries.length > 3 && (
                    <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
                      <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
                        <input
                          type="text"
                          value={searchCashier}
                          onChange={(e) => setSearchCashier(e.target.value)}
                          placeholder="Cari nama kasir..."
                          className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                          autoFocus
                        />
                      </div>
                    </div>
                  )}

                  {/* Cashiers List */}
                  <div className="max-h-56 sm:max-h-64 overflow-y-auto">
                    {filteredCashiers.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400 font-medium">
                        Tidak ada kasir yang cocok
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
                              setIsDropdownOpen(false)
                              setError('')
                            }}
                            className={`w-full text-left flex items-center justify-between transition-colors cursor-pointer border-b border-slate-200/90 last:border-b-0 ${
                              isAbsenShowing ? 'px-3 py-2' : 'px-4 py-3.5 sm:py-4'
                            } ${
                              isSelected ? 'bg-blue-50/90' : 'bg-white hover:bg-slate-50 active:bg-blue-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className={`rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm ${
                                isSelected 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 border border-blue-200/60'
                              } ${isAbsenShowing ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-xs sm:w-10 sm:h-10 sm:text-sm'}`}>
                                <i className="fa-solid fa-user"></i>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`block font-extrabold text-slate-900 truncate ${
                                    isAbsenShowing ? 'text-xs' : 'text-sm sm:text-base'
                                  }`}>
                                    {acc.name}
                                  </span>
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0 uppercase tracking-wide">
                                    Kasir
                                  </span>
                                </div>
                                {isAbsenFeatureActive && (
                                  <p className="text-[10px] mt-0.5 font-medium flex items-center gap-1">
                                    {alreadyAbsen ? (
                                      <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                                        <i className="fa-solid fa-circle-check text-[9px]"></i> Sudah Absen Hari Ini
                                      </span>
                                    ) : (
                                      <span className="text-amber-600 flex items-center gap-1 font-semibold">
                                        <i className="fa-solid fa-clock text-[9px]"></i> Belum Absen
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 ml-2">
                              {isSelected ? (
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-sm">
                                  <i className="fa-solid fa-check font-bold"></i>
                                </span>
                              ) : (
                                <i className="fa-solid fa-chevron-right text-slate-300 text-xs"></i>
                              )}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ABSEN KEHADIRAN CARD (Muncul hanya jika belum absen hari ini dan fitur aktif) */}
          {selectedUser && kasirList[selectedUser]?.role !== 'owner' && isAbsenFeatureActive && !hasAbsenToday && (
            <div className="bg-slate-50/80 border border-blue-100 rounded-xl p-2.5 shadow-sm space-y-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs shadow-sm shrink-0">
                  <i className="fa-solid fa-calendar-check"></i>
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide leading-none">ABSEN KEHADIRAN</h4>
                  <p className="text-[9px] text-slate-500 font-medium leading-none mt-0.5 truncate">Pilih jenis absen sesuai waktu Anda datang</p>
                </div>
              </div>

              {/* Grid Shift */}
              <div className={`grid gap-1.5 ${activeShifts.length === 1 ? 'grid-cols-1' : activeShifts.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {activeShifts.map((shift) => {
                  const isSelected = selectedShift === shift.id
                  
                  let bgClasses = ''
                  let iconElement = null
                  let labelColor = 'text-white'

                  if (shift.id === 'PAGI') {
                    // Pagi dgn latar matahari terbit / sunrise - warna bold, deep, tidak soft
                    bgClasses = isSelected
                      ? 'bg-gradient-to-br from-sky-600 via-blue-700 to-amber-700 ring-2 ring-amber-400 shadow-md scale-[1.02]'
                      : 'bg-gradient-to-br from-sky-700 via-blue-800 to-amber-800 hover:scale-[1.01] shadow-sm border-amber-300/30'
                    iconElement = <i className="fa-solid fa-cloud-sun text-amber-300 text-lg mb-0.5 filter drop-shadow"></i>
                    labelColor = 'text-amber-100'
                  } else if (shift.id === 'SIANG') {
                    // Siang dgn latar cerah royal blue to purple - pekat dan tajam
                    bgClasses = isSelected
                      ? 'bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-700 ring-2 ring-indigo-300 shadow-md scale-[1.02]'
                      : 'bg-gradient-to-br from-blue-800 via-indigo-800 to-purple-900 hover:scale-[1.01] shadow-sm border-indigo-300/30'
                    iconElement = <i className="fa-solid fa-sun text-yellow-300 text-lg mb-0.5 filter drop-shadow"></i>
                    labelColor = 'text-indigo-100'
                  } else {
                    // Malam dgn gaya gelap / bulan - kontras tinggi
                    bgClasses = isSelected
                      ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 ring-2 ring-purple-400 shadow-md scale-[1.02]'
                      : 'bg-gradient-to-br from-slate-900 via-gray-950 to-slate-950 hover:scale-[1.01] shadow-sm border-slate-700/50'
                    iconElement = <i className="fa-solid fa-moon text-indigo-200 text-lg mb-0.5 filter drop-shadow"></i>
                    labelColor = 'text-indigo-200'
                  }

                  return (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => { setSelectedShift(shift.id); setError(''); }}
                      className={`relative rounded-xl py-2 px-1 text-white transition-all flex flex-col items-center justify-center text-center cursor-pointer border select-none ${bgClasses}`}
                    >
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-white text-emerald-600 rounded-full flex items-center justify-center text-[8px] font-black shadow ring-1 ring-emerald-500">
                          <i className="fa-solid fa-check"></i>
                        </span>
                      )}
                      {iconElement}
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight">
                        {shift.name}
                      </span>
                      <span className={`text-[8.5px] sm:text-[9px] font-bold mt-0.5 tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] bg-black/40 px-1.5 py-0.5 rounded-full border border-white/10 ${labelColor} leading-none`}>
                        ({shift.label})
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Keterangan Terlambat Absen (muncul jika terlambat) */}
              {shiftLateness.isLate && (
                <div className="bg-purple-50/80 border border-purple-200/80 rounded-xl p-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black text-purple-900 flex items-center gap-1">
                      <i className="fa-solid fa-pen-to-square text-purple-600 text-[10px]"></i>
                      Keterangan Terlambat Absen
                    </label>
                    <span className="text-[8.5px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200 flex items-center gap-0.5">
                      <i className="fa-solid fa-clock text-[7px]"></i> Telat {shiftLateness.lateMins} Menit
                    </span>
                  </div>
                  <textarea
                    className="w-full text-xs p-1.5 rounded-lg border border-purple-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-200 bg-white placeholder-gray-400 text-gray-800 outline-none resize-none transition-all shadow-inner leading-tight h-10"
                    placeholder="Tulis alasan keterlambatan absen di sini..."
                    rows={1}
                    value={alasanTelat}
                    onChange={(e) => { setAlasanTelat(e.target.value); setError(''); }}
                  />
                </div>
              )}
            </div>
          )}

          {/* PIN Input (Hidden if PIN is disabled) */}
          {isPinEnabled && (
            <div className="login-field">
              <label className={`login-label font-bold text-slate-700 transition-all duration-300 ${
                isAbsenShowing ? '!text-[11px] !mb-1' : '!text-xs sm:!text-[13px] !mb-1.5'
              }`}>
                Masukkan PIN
              </label>
              <div className="relative">
                <i className={`fa-solid fa-lock absolute text-gray-400 pointer-events-none transition-all duration-300 ${
                  isAbsenShowing ? 'left-3 top-1/2 -translate-y-1/2 text-xs' : 'left-4 top-1/2 -translate-y-1/2 text-sm sm:text-base'
                }`}></i>
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, '')); setError('') }}
                  placeholder="MASUKKAN PIN"
                  maxLength={6}
                  className={`login-input tracking-wider transition-all duration-300 ${
                    isAbsenShowing 
                      ? '!py-2 !pl-8 !pr-9 !text-xs !rounded-xl !h-9' 
                      : '!py-3.5 !pl-11 !pr-11 !text-base sm:!text-lg !rounded-2xl !h-14 tracking-widest font-black border-slate-300 shadow-sm'
                  }`}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-1 flex items-center justify-center cursor-pointer ${
                    isAbsenShowing ? 'right-2.5' : 'right-3.5'
                  }`}
                  title={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                >
                  <i className={`fa-solid ${showPin ? 'fa-eye' : 'fa-eye-slash'} ${isAbsenShowing ? 'text-xs' : 'text-sm sm:text-base'}`}></i>
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
            <div className={`login-error transition-all duration-300 ${
              isAbsenShowing ? '!py-1.5 !px-2.5 !text-xs !rounded-xl !gap-1.5' : '!py-2.5 !px-3.5 !text-xs sm:!text-sm !rounded-2xl !gap-2 font-bold'
            }`}>
              <i className="fa-solid fa-circle-exclamation text-xs"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            className={`login-btn flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
              isAbsenShowing 
                ? '!py-2 sm:!py-2.5 !text-xs !rounded-xl !mt-1' 
                : '!py-3.5 sm:!py-4 !text-base sm:!text-lg !rounded-2xl !mt-3 font-black tracking-widest shadow-xl shadow-blue-500/30 active:scale-98'
            }`}
          >
            <i className={`fa-solid fa-arrow-right-to-bracket ${isAbsenShowing ? 'text-xs' : 'text-sm sm:text-base'}`}></i>
            MASUK
          </button>
        </form>

        {/* Footer */}
        <p className={`login-footer text-slate-400 font-medium transition-all duration-300 ${
          isAbsenShowing ? '!text-[10px] !mt-1.5' : '!text-xs !mt-3'
        }`}>
          ALPHA Pro v{APP_VERSION}
        </p>
      </div>
    </div>
  )
}

export default LoginScreen
