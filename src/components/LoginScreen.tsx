import React, { useState, useEffect, useMemo } from 'react'
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
  const [selectedUser, setSelectedUser] = useState('')
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

    // 1. Fetch fresh store_settings from cloud (financial_settings & presets/promo_banners)
    supabase
      .from('store_settings')
      .select('financial_settings, presets')
      .eq('store_id', storeId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          if (data.financial_settings) {
            setLiveFinancialSettings(data.financial_settings)
            localStorage.setItem(`alphaPro_${storeId}_financial`, JSON.stringify(data.financial_settings))
          }
          let incomingBanners: string[] | null = null
          if ((data as any).promo_banners && Array.isArray((data as any).promo_banners)) {
            incomingBanners = (data as any).promo_banners
          } else if (data.presets && Array.isArray(data.presets)) {
            const bItem = data.presets.find((p: any) => p && p.id === '_PROMO_BANNERS_')
            if (bItem?.data && Array.isArray(bItem.data)) {
              incomingBanners = bItem.data
            }
          }
          if (incomingBanners && incomingBanners.length > 0) {
            try {
              localStorage.setItem(`alphaPro_${storeId}_promoBanners`, JSON.stringify(incomingBanners))
              localStorage.setItem('alphaPro_promoBanners', JSON.stringify(incomingBanners))
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

  // Check if PIN is enabled from localStorage
  useEffect(() => {
    const enabled = localStorage.getItem('alphaPro_isPinEnabled')
    if (enabled === 'false') {
      setIsPinEnabled(false)
    }
  }, [])

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
    <div className="login-screen !py-2 !px-3 sm:!py-4 sm:!px-4 min-h-[100dvh]">
      <div className={`login-card ${isShaking ? 'shake' : ''} !py-3.5 !px-4 sm:!py-4 sm:!px-6 !max-w-[390px] shadow-xl`}>
        {/* Logo Toko & Header */}
        <div className="login-header !mb-2">
          <div className="w-11 h-11 mx-auto mb-1 flex items-center justify-center">
            <img 
              src={effectiveStorePhoto || "/logo_icon.png"} 
              onError={(e) => { (e.currentTarget.src = '/logo_icon.png') }} 
              alt={storeName || "Logo Toko"} 
              className="w-11 h-11 rounded-xl object-cover shadow-sm border border-slate-100" 
            />
          </div>
          <h1 className="login-title !text-base sm:!text-lg !leading-tight font-black tracking-tight">
            {storeName ? storeName.toUpperCase() : 'ALPHA'} <span className="login-title-accent">{storeName ? '' : 'Pro'}</span>
          </h1>
          <p className="login-subtitle !text-[11px] !mt-0.5 text-slate-500 font-semibold leading-tight">
            {storeName ? 'Login Kasir' : 'Pembukuan Agen brilink & Konter'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form !gap-2 sm:!gap-2.5">
          {/* User Select */}
          <div className="login-field">
            <label className="login-label !text-[11px] !mb-1 font-bold text-slate-700">Pilih Pengguna</label>
            <div className="login-select-wrapper">
              <select
                value={selectedUser}
                onChange={(e) => { setSelectedUser(e.target.value); setError('') }}
                className="login-select !py-2 !px-3 !text-xs !rounded-xl !h-9"
              >
                <option value="" disabled>Pilih Pengguna</option>
                {Object.entries(kasirList)
                  .filter(([_id, acc]) => acc.role !== 'owner')
                  .map(([id, acc]) => (
                  <option key={id} value={id}>
                    {acc.name} (Kasir)
                  </option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down login-select-icon !text-xs !right-3"></i>
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
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, '')); setError('') }}
                  placeholder="MASUKKAN PIN"
                  maxLength={6}
                  className="login-input !py-2 !pl-8 !pr-9 !text-xs !rounded-xl !h-9 tracking-wider"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-1 flex items-center justify-center cursor-pointer"
                  title={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                >
                  <i className={`fa-solid ${showPin ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
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
            <div className="login-error !py-1.5 !px-2.5 !text-xs !rounded-xl !gap-1.5">
              <i className="fa-solid fa-circle-exclamation text-xs"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" className="login-btn !py-2 sm:!py-2.5 !text-xs !rounded-xl !mt-1 flex items-center justify-center gap-2">
            <i className="fa-solid fa-arrow-right-to-bracket text-xs"></i>
            MASUK
          </button>
        </form>

        {/* Footer */}
        <p className="login-footer !text-[10px] !mt-1.5 text-slate-400 font-medium">ALPHA Pro v{APP_VERSION}</p>
      </div>
    </div>
  )
}

export default LoginScreen
