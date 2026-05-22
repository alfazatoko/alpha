import React, { useState, useEffect } from 'react'
import { cn, compressImage } from '../lib/utils'

interface AkunViewProps {
  active: boolean
  isPc?: boolean
  kasirName?: string
  kasirRole?: string
  onLogout?: () => void
  onRequestLogout?: () => void
  runningTexts?: string[]
  mainAnnouncement?: string
  onSaveRunningTexts?: (texts: string[]) => void
  onSaveMainAnnouncement?: (text: string) => void
  storeName?: string
  storeSubtext?: string
  storePhoto?: string
  onSaveStoreName?: (v: string) => void
  onSaveStoreSubtext?: (v: string) => void
  onSaveStorePhoto?: (v: string) => void
  setActiveView?: (v: string) => void
  setIsSidePanelOpen?: (v: boolean) => void
  googleEmail?: string
  googleUid?: string
  onUploadToCloud?: () => Promise<void>
  onDownloadFromCloud?: (silent?: boolean) => Promise<void>
  onConfirm?: (title: string, message: string, onConfirm: () => void) => void
  currentUsername?: string
  kasirList?: Record<string, any>
  onSaveCashierSelf?: (username: string, updatedAccount: { name: string, pin: string }) => Promise<void>
  activeStoreId?: string | 'all'
  transactions?: any[]
}

const AkunView: React.FC<AkunViewProps> = (props) => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' })
  const fullDate = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const clockStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const [activeTab, setActiveTab] = useState(props.kasirRole === 'owner' ? 'profil' : 'kasirSelf')

  useEffect(() => {
    setActiveTab(props.kasirRole === 'owner' ? 'profil' : 'kasirSelf')
  }, [props.kasirRole])

  const getTabColorClasses = (color: string, isActive: boolean) => {
    if (isActive) return "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md"
    switch (color) {
      case 'emerald': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
      case 'blue': return 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
      case 'orange': return 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400'
      case 'indigo': return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
      case 'red': return 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
      case 'purple': return 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400'
      default: return 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400'
    }
  }

  const storageKeyPin = props.activeStoreId && props.activeStoreId !== 'all' ? `alphaPro_${props.activeStoreId}_isPinEnabled` : 'alphaPro_isPinEnabled'
  const storageKeyFilter = props.activeStoreId && props.activeStoreId !== 'all' ? `alphaPro_${props.activeStoreId}_showKasirFilter` : 'alphaPro_showKasirFilter'

  const [isPinEnabled, setIsPinEnabled] = useState(localStorage.getItem(storageKeyPin) !== 'false')

  useEffect(() => {
    setIsPinEnabled(localStorage.getItem(storageKeyPin) !== 'false')
  }, [storageKeyPin])

  const [openCategory, setOpenCategory] = useState<string | null>('profil')
  const [savedStatus, setSavedStatus] = useState(false)
  const [isCloudLoading, setIsCloudLoading] = useState(false)

  // State for cashier self-edit
  const [editKasirName, setEditKasirName] = useState('')
  const [editKasirPin, setEditKasirPin] = useState('')
  const [showKasirPin, setShowKasirPin] = useState(false)

  // State untuk edit PIN Owner
  const [ownerPinOld, setOwnerPinOld] = useState('')
  const [ownerPinNew, setOwnerPinNew] = useState('')
  const [ownerPinConfirm, setOwnerPinConfirm] = useState('')
  const [showOwnerPin, setShowOwnerPin] = useState(false)

  useEffect(() => {
    if (props.currentUsername && props.kasirList && props.kasirList[props.currentUsername]) {
      setEditKasirName(props.kasirList[props.currentUsername].name || '')
      setEditKasirPin(props.kasirList[props.currentUsername].pin || '')
    }
  }, [props.currentUsername, props.kasirList])

  // State for local smooth typing in Store Profile
  const [localStoreName, setLocalStoreName] = useState(props.storeName || '')
  const [localStoreSubtext, setLocalStoreSubtext] = useState(props.storeSubtext || '')

  useEffect(() => {
    setLocalStoreName(props.storeName || '')
  }, [props.storeName])

  useEffect(() => {
    setLocalStoreSubtext(props.storeSubtext || '')
  }, [props.storeSubtext])

  // State for local smooth typing in Promo Settings
  const [localMainAnnouncement, setLocalMainAnnouncement] = useState(props.mainAnnouncement || '')
  const [localRunningTextsText, setLocalRunningTextsText] = useState(() => {
    const texts = Array.isArray(props.runningTexts) ? props.runningTexts : Array(15).fill('')
    return texts.filter(t => t.trim() !== '').join('\n')
  })

  useEffect(() => {
    setLocalMainAnnouncement(props.mainAnnouncement || '')
  }, [props.mainAnnouncement])

  useEffect(() => {
    const texts = Array.isArray(props.runningTexts) ? props.runningTexts : Array(15).fill('')
    setLocalRunningTextsText(texts.filter(t => t.trim() !== '').join('\n'))
  }, [props.runningTexts])

  const handleUploadToCloud = async () => {
    if (!props.onUploadToCloud) return
    setIsCloudLoading(true)
    await props.onUploadToCloud()
    setIsCloudLoading(false)
  }

  const handleDownloadFromCloud = async () => {
    if (!props.onDownloadFromCloud) return

    if (props.onConfirm) {
      props.onConfirm(
        "DOWNLOAD DARI CLOUD",
        "Pengaturan lokal HP ini (Kasir, PIN, dll) akan DITIMPA oleh data dari Cloud. Lanjutkan?",
        async () => {
          setIsCloudLoading(true)
          await props.onDownloadFromCloud?.(false)
          setIsCloudLoading(false)
        }
      )
    } else {
      if (!confirm('PERINGATAN!\nPengaturan lokal HP ini (Kasir, PIN, dll) akan DITIMPA oleh data dari Cloud. Lanjutkan?')) return
      setIsCloudLoading(true)
      await props.onDownloadFromCloud(false)
      setIsCloudLoading(false)
    }
  }

  const handleSyncAll = async () => {
    if (!props.onUploadToCloud || !props.onDownloadFromCloud) return
    setIsCloudLoading(true)
    await props.onUploadToCloud()
    await props.onDownloadFromCloud(true)
    setIsCloudLoading(false)
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const compressedBase64 = await compressImage(file)
        props.onSaveStorePhoto?.(compressedBase64)
      } catch (err) {
        console.error("Compression failed", err)
        // Fallback to original if compression fails (though unlikely)
        const reader = new FileReader()
        reader.onloadend = () => {
          props.onSaveStorePhoto?.(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const togglePin = () => {
    const newValue = !isPinEnabled
    setIsPinEnabled(newValue)
    localStorage.setItem(storageKeyPin, newValue.toString())
  }

  const handleExportData = () => {
    const data = {
      transactions: props.kasirRole === 'owner' ? props.transactions : 'access_denied',
      settings: {
        storeName: props.storeName,
        storeSubtext: props.storeSubtext,
        runningTexts: props.runningTexts,
        mainAnnouncement: props.mainAnnouncement,
        isPinEnabled
      },
      exportDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ALPHA_BACKUP_${new Date().getTime()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    if (props.kasirRole !== 'owner') return alert("Akses ditolak");

    const txs = props.transactions || [];
    if (txs.length === 0) return alert("Belum ada data transaksi");

    // Create CSV header
    const headers = ["ID Transaksi", "Tanggal", "Waktu", "Kasir", "Kategori", "Keterangan", "Nominal (Rp)", "Admin/Fee (Rp)", "Tipe"];

    // Format rows
    const rows = txs.map((t: any) => {
      const date = new Date(t.timestamp);
      const tanggal = date.toLocaleDateString('id-ID');
      const waktu = date.toLocaleTimeString('id-ID');

      return [
        t.id,
        tanggal,
        waktu,
        t.kasirName || t.kasir_id || '-',
        t.kategori || '-',
        (t.keterangan || '-').replace(/,/g, ' '),
        t.nominal || 0,
        t.adminFee || 0,
        t.type || '-'
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ALFAZA_TRANSAKSI_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleResetSystem = () => {
    if (props.onConfirm) {
      props.onConfirm(
        "RESET SISTEM",
        "Semua data lokal (PIN, Nama Toko, Slogan) akan dikembalikan ke awal. Anda yakin ingin melanjutkan reset?",
        () => {
          localStorage.clear()
          window.location.reload()
        }
      )
    } else {
      if (confirm('PERINGATAN KRITIKAL!\n\nSemua data lokal (PIN, Nama Toko, Slogan) akan dikembalikan ke awal.\n\nLanjutkan reset?')) {
        localStorage.clear()
        window.location.reload()
      }
    }
  }

  if (props.isPc) {
    const tabs = props.kasirRole === 'owner' ? [
      { id: 'profil', label: 'Profil Toko', icon: 'fa-user-pen', color: 'emerald' },
      { id: 'keamanan', label: 'Keamanan & Akses', icon: 'fa-shield-halved', color: 'blue' },
      { id: 'promo', label: 'Tampilan & Promo', icon: 'fa-bullhorn', color: 'orange' },
      { id: 'pantau', label: 'Pantau Dashboard', icon: 'fa-eye', color: 'indigo' },
      { id: 'backup', label: 'Backup & Reset', icon: 'fa-cloud-arrow-down', color: 'red' },
      { id: 'cloud', label: 'Sinkronisasi Cloud', icon: 'fa-cloud', color: 'purple' },
    ] : [
      { id: 'kasirSelf', label: 'PIN & Nama Kasir', icon: 'fa-user-lock', color: 'indigo' },
      { id: 'cloud', label: 'Sinkronisasi Cloud', icon: 'fa-cloud', color: 'purple' },
    ]

    return (
      <div className={cn("flex-1 h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden", props.active ? "flex" : "hidden")}>
        {/* Top Header/Breadcrumb */}
        <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">Pengaturan Akun</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Kelola profil, keamanan, promosi, dan sinkronisasi data cloud</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSavedStatus(true);
                setTimeout(() => setSavedStatus(false), 2000);
              }}
              className={cn(
                "px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-md",
                savedStatus
                  ? "bg-emerald-600 text-white scale-[0.98]"
                  : "bg-slate-950 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 active:scale-95"
              )}
              style={{ color: '#ffffff' }}
            >
              {savedStatus ? (
                <>
                  <i className="fa-solid fa-circle-check animate-bounce"></i>
                  Berhasil Disimpan
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk text-slate-400"></i>
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dual Pane Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tabs Sidebar */}
          <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 flex flex-col p-5 gap-2 overflow-y-auto shrink-0">
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 mb-1">Kategori Pengaturan</p>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-wider text-left border",
                    isActive
                      ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-950 dark:border-white shadow-lg"
                      : "bg-white text-slate-700 border-slate-100 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0",
                      getTabColorClasses(tab.color, isActive)
                    )}>
                      <i className={cn("fa-solid text-xs", tab.icon)}></i>
                    </div>
                    <span>{tab.label}</span>
                  </div>
                  <i className="fa-solid fa-chevron-right text-[10px] opacity-30"></i>
                </button>
              )
            })}

            <div className="h-px bg-slate-100 dark:bg-slate-700 my-4" />

            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 mb-1">Akses Tambahan</p>

            {/* Teks Otomatis */}
            <button
              onClick={() => props.setActiveView?.('view-otomatis')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700/50 transition-all font-black text-xs uppercase tracking-wider text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 shrink-0">
                  <i className="fa-solid fa-bolt text-xs"></i>
                </div>
                <span>Teks Otomatis</span>
              </div>
              <i className="fa-solid fa-chevron-right text-[10px] opacity-30"></i>
            </button>

            {/* Keluar Aplikasi */}
            <button
              onClick={() => props.onRequestLogout?.()}
              className="w-full mt-auto flex items-center gap-3 p-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-all font-black text-xs uppercase tracking-wider text-left"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
                <i className="fa-solid fa-right-from-bracket"></i>
              </div>
              <span>Keluar Aplikasi</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 scrollbar-thin flex flex-col items-center">
            <div className="w-full max-w-4xl flex flex-col gap-6">
              {activeTab === 'profil' && props.kasirRole === 'owner' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {props.activeStoreId === 'all' && (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-xs font-bold text-center uppercase tracking-widest">
                      <i className="fa-solid fa-circle-info mr-2"></i> Mode Pusat Monitoring. Pilih toko spesifik untuk mengedit profil toko.
                    </div>
                  )}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Identitas Konter / Agen</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-6 font-bold uppercase">Sesuaikan logo, nama toko, dan slogan utama yang tampil pada dashboard kasir dan nota cetak</p>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                      {/* Logo Toko */}
                      <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="relative group cursor-pointer" onClick={() => document.getElementById('photoInputPC')?.click()}>
                          {props.storePhoto ? (
                            <img src={props.storePhoto} alt="Store" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-md transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border-4 border-white dark:border-slate-800 shadow-md">
                              <i className="fa-solid fa-camera text-3xl"></i>
                            </div>
                          )}
                          <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-600 text-white rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-lg">
                            <i className="fa-solid fa-plus text-xs"></i>
                          </div>
                          <input id="photoInputPC" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        </div>
                        <div className="text-center">
                          <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Logo Toko</h4>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">Format JPG/PNG, Max 2MB</p>
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="lg:col-span-2 space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Nama Toko / Bisnis</label>
                          <input
                            type="text"
                            value={localStoreName}
                            onChange={(e) => setLocalStoreName(e.target.value)}
                            onBlur={() => {
                              if (localStoreName !== props.storeName) {
                                props.onSaveStoreName?.(localStoreName)
                              }
                            }}
                            placeholder="Contoh: ALFAZA CELL"
                            disabled={props.activeStoreId === 'all'}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Sub-Teks / Slogan Pembukuan</label>
                          <input
                            type="text"
                            value={localStoreSubtext}
                            onChange={(e) => setLocalStoreSubtext(e.target.value)}
                            onBlur={() => {
                              if (localStoreSubtext !== props.storeSubtext) {
                                props.onSaveStoreSubtext?.(localStoreSubtext)
                              }
                            }}
                            placeholder="Contoh: Pembukuan Agen Brilink & Konter"
                            disabled={props.activeStoreId === 'all'}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Account details info */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <i className="fa-brands fa-google text-lg"></i>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Akun Cloud Terhubung</h4>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{props.googleEmail || 'Tidak terhubung'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'keamanan' && props.kasirRole === 'owner' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {props.activeStoreId === 'all' && (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-xs font-bold text-center uppercase tracking-widest">
                      <i className="fa-solid fa-circle-info mr-2"></i> Pilih toko spesifik untuk mengedit keamanan toko.
                    </div>
                  )}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Keamanan Aplikasi</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-6 font-bold uppercase">Kelola tingkat keamanan akses masuk kasir & owner</p>

                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-700">
                          <i className="fa-solid fa-key text-sm"></i>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Gunakan PIN Keamanan Masuk</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Wajibkan Kasir & Owner memasukkan PIN saat membuka aplikasi</p>
                        </div>
                      </div>
                      <button
                        onClick={() => props.activeStoreId !== 'all' && togglePin()}
                        className={cn(
                          "w-14 h-8 rounded-full p-1 transition-all duration-300 relative",
                          isPinEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
                          isPinEnabled ? "translate-x-6" : "translate-x-0"
                        )}></div>
                      </button>
                    </div>

                    <div className="mt-6 p-5 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-950/30 rounded-2xl text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-semibold">
                      <i className="fa-solid fa-circle-info mr-2"></i>
                      Apabila PIN diaktifkan, pastikan setiap akun kasir telah dikonfigurasi dengan PIN masing-masing di tab Kasir atau menu absensi. PIN bawaan default untuk kasir baru adalah <strong className="text-blue-900 dark:text-blue-200">1234</strong>.
                    </div>
                  </div>

                  {/* Card Edit PIN Owner */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <i className="fa-solid fa-user-shield text-sm"></i>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Ganti PIN Owner</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Ubah PIN masuk khusus akun Owner</p>
                      </div>
                    </div>

                    <div className="space-y-4 mt-6">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">PIN Lama</label>
                        <div className="relative">
                          <input
                            type={showOwnerPin ? 'text' : 'password'}
                            inputMode="numeric"
                            maxLength={8}
                            value={ownerPinOld}
                            onChange={e => setOwnerPinOld(e.target.value.replace(/\D/g, ''))}
                            placeholder="Masukkan PIN lama"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 tracking-widest"
                          />
                          <button type="button" onClick={() => setShowOwnerPin(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                            <i className={showOwnerPin ? 'fa-solid fa-eye-slash text-sm' : 'fa-solid fa-eye text-sm'}></i>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">PIN Baru (min. 4 digit)</label>
                        <input
                          type={showOwnerPin ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={8}
                          value={ownerPinNew}
                          onChange={e => setOwnerPinNew(e.target.value.replace(/\D/g, ''))}
                          placeholder="Masukkan PIN baru"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 tracking-widest"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Konfirmasi PIN Baru</label>
                        <input
                          type={showOwnerPin ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={8}
                          value={ownerPinConfirm}
                          onChange={e => setOwnerPinConfirm(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ulangi PIN baru"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 tracking-widest"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!ownerPinNew || ownerPinNew.length < 4) return alert('PIN baru minimal 4 digit!');
                          if (ownerPinNew !== ownerPinConfirm) return alert('Konfirmasi PIN tidak cocok!');
                          // Verifikasi PIN lama dari kasirList
                          const ownerAcc = props.kasirList?.['owner']
                          if (ownerAcc && ownerAcc.pin && ownerAcc.pin !== ownerPinOld) return alert('PIN lama tidak sesuai!');
                          // Simpan PIN baru
                          if (props.onSaveCashierSelf) {
                            props.onSaveCashierSelf('owner', { name: 'Owner', pin: ownerPinNew })
                              .then(() => {
                                setSavedStatus(true);
                                setTimeout(() => setSavedStatus(false), 2000);
                                setOwnerPinOld(''); setOwnerPinNew(''); setOwnerPinConfirm('');
                              })
                              .catch((err: any) => alert(err.message || 'Gagal menyimpan PIN'));
                          }
                        }}
                        disabled={props.activeStoreId === 'all'}
                        className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 mt-2"
                        style={{ color: '#ffffff' }}
                      >
                        <i className="fa-solid fa-shield-halved"></i>
                        Simpan PIN Owner Baru
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'promo' && props.kasirRole === 'owner' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {props.activeStoreId === 'all' && (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-xs font-bold text-center uppercase tracking-widest">
                      <i className="fa-solid fa-circle-info mr-2"></i> Pilih toko spesifik untuk mengedit teks berjalan.
                    </div>
                  )}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Teks Berjalan & Pengumuman</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-6 font-bold uppercase">Atur pesan promosi atau instruksi kerja yang akan tampil di halaman utama</p>

                    <div className="space-y-6">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Teks Pengumuman Utama (Highlight Card)</label>
                        <input
                          type="text"
                          value={localMainAnnouncement}
                          onChange={(e) => setLocalMainAnnouncement(e.target.value)}
                          onBlur={() => {
                            if (localMainAnnouncement !== props.mainAnnouncement) {
                              props.onSaveMainAnnouncement?.(localMainAnnouncement)
                            }
                          }}
                          placeholder="Contoh: INFO: Dapatkan cashback aksesoris s/d 20% hari ini!"
                          disabled={props.activeStoreId === 'all'}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2 px-1">
                          <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Teks Slide Berjalan (Maksimal 15 Baris)</label>
                          <span className="text-[8px] font-black text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400 px-2.5 py-1 rounded-full uppercase tracking-wider">Animasi Teks Berjalan</span>
                        </div>
                        <div className="relative">
                          <textarea
                            rows={8}
                            value={localRunningTextsText}
                            onChange={(e) => setLocalRunningTextsText(e.target.value)}
                            onBlur={() => {
                              const lines = localRunningTextsText.split('\n');
                              const newTexts = Array(15).fill('');
                              lines.slice(0, 15).forEach((line, i) => {
                                newTexts[i] = line;
                              });
                              props.onSaveRunningTexts?.(newTexts);
                            }}
                            placeholder="Tulis pesan promosi Anda di sini (satu baris = satu pesan)...&#10;Contoh:&#10;Promo Transfer Bank admin cuma 3rb!&#10;Sedia voucher kuota internet terlengkap!&#10;Bayar listrik & BPJS cepat tanpa antre."
                            disabled={props.activeStoreId === 'all'}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all resize-none min-h-[180px]"
                          />
                          <div className="absolute bottom-3 right-4 text-[8px] font-black text-slate-400 dark:text-slate-500 pointer-events-none uppercase tracking-widest">
                            Tekan Enter untuk baris baru
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-2 ml-1 italic">* Teks akan berganti secara otomatis setiap beberapa detik pada dashboard mobile kasir.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pantau' && props.kasirRole === 'owner' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Opsi Pemantauan</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-6 font-bold uppercase">Sesuaikan visualisasi dan kontrol kasir di halaman utama</p>

                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-700">
                          <i className="fa-solid fa-filter text-sm"></i>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Filter Kasir di Beranda</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Tampilkan opsi cek per kasir di Dashboard</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const current = localStorage.getItem(storageKeyFilter) !== 'false';
                          localStorage.setItem(storageKeyFilter, (!current).toString());
                          window.dispatchEvent(new Event('storage'));
                          setSavedStatus(true);
                          setTimeout(() => setSavedStatus(false), 2000);
                        }}
                        className={cn(
                          "w-14 h-8 rounded-full p-1 transition-all duration-300 relative",
                          (localStorage.getItem(storageKeyFilter) !== 'false') ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
                          (localStorage.getItem(storageKeyFilter) !== 'false') ? "translate-x-6" : "translate-x-0"
                        )}></div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'backup' && props.kasirRole === 'owner' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Backup Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                          <i className="fa-solid fa-file-export text-lg"></i>
                        </div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Ekspor Data Lokal</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-4">Unduh salinan cadangan lengkap seluruh riwayat pembukuan kasir</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                          Data akan diunduh dalam format berkas JSON terenkripsi. Berkas ini dapat digunakan untuk restore data pada perangkat kasir baru atau ketika memindahkan aplikasi.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-8">
                        <button
                          onClick={handleExportData}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex flex-col items-center justify-center gap-1"
                          style={{ color: '#ffffff' }}
                        >
                          <i className="fa-solid fa-file-code text-lg mb-1"></i>
                          JSON Backup
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex flex-col items-center justify-center gap-1"
                          style={{ color: '#ffffff' }}
                        >
                          <i className="fa-solid fa-file-excel text-lg mb-1"></i>
                          Excel / CSV
                        </button>
                      </div>
                    </div>

                    {/* Reset Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-6">
                          <i className="fa-solid fa-triangle-exclamation text-lg"></i>
                        </div>
                        <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest mb-1">Reset Sistem Aplikasi</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-4">Kembalikan pengaturan & bersihkan cache lokal aplikasi</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                          <strong className="text-rose-600">PERINGATAN!</strong> Tindakan ini akan menghapus semua kredensial login kasir, nama toko, subteks, serta data sementara di perangkat ini. Pastikan Anda telah melakukan sinkronisasi cloud terlebih dahulu.
                        </p>
                      </div>
                      <button
                        onClick={handleResetSystem}
                        className="mt-8 w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                        style={{ color: '#ffffff' }}
                      >
                        <i className="fa-solid fa-rotate-left"></i>
                        Reset Sistem
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cloud' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex flex-col items-center text-center max-w-xl mx-auto py-6">
                      <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6 border border-purple-100 dark:border-purple-900/50 shadow-inner">
                        <i className={cn("fa-solid text-2xl", isCloudLoading ? "fa-circle-notch fa-spin" : "fa-cloud")}></i>
                      </div>

                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Sinkronisasi Supabase Cloud</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-6">Backup global dan sinkronisasi data antar kasir realtime</p>

                      <button
                        onClick={handleSyncAll}
                        disabled={isCloudLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 px-6 rounded-2xl font-black text-xs shadow-lg shadow-purple-200 dark:shadow-none uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 mb-6"
                        style={{ color: '#ffffff' }}
                      >
                        <i className={isCloudLoading ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-arrows-rotate"}></i>
                        {isCloudLoading ? 'Membaca dan Menyinkronkan...' : 'MULAI UPDATE SYNC'}
                      </button>

                      <div className="grid grid-cols-2 gap-4 w-full">
                        <button
                          onClick={handleUploadToCloud}
                          disabled={isCloudLoading}
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-cloud-arrow-up text-purple-600"></i>
                          Upload Data
                        </button>
                        <button
                          onClick={handleDownloadFromCloud}
                          disabled={isCloudLoading}
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-cloud-arrow-down text-purple-600"></i>
                          Download Data
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter mt-8 leading-relaxed">
                        * Update Sync akan mengunggah data lokal Anda ke server cloud terlebih dahulu, lalu mengunduh versi komprehensif terbaru untuk disamakan pada semua perangkat kasir.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'kasirSelf' && props.kasirRole === 'kasir' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm max-w-xl">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Pengaturan Profil Kasir</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-6 font-bold uppercase">Edit nama panggilan operasional Anda dan kode PIN pengaman kasir</p>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Nama Kasir / Petugas</label>
                        <input
                          type="text"
                          value={editKasirName}
                          onChange={e => setEditKasirName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800"
                          style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">PIN Keamanan Kasir (Minimal 4 Angka)</label>
                        <div className="relative">
                          <input
                            type={showKasirPin ? "text" : "password"}
                            inputMode="numeric"
                            maxLength={8}
                            value={editKasirPin}
                            onChange={e => setEditKasirPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 tracking-widest"
                            style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowKasirPin(!showKasirPin)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          >
                            <i className={showKasirPin ? "fa-solid fa-eye-slash text-sm" : "fa-solid fa-eye text-sm"}></i>
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          if (!editKasirName.trim()) {
                            alert("Nama kasir tidak boleh kosong!");
                            return;
                          }
                          if (editKasirPin.length < 4) {
                            alert("PIN minimal harus 4 digit angka!");
                            return;
                          }
                          try {
                            if (props.onSaveCashierSelf && props.currentUsername) {
                              await props.onSaveCashierSelf(props.currentUsername, {
                                name: editKasirName.trim(),
                                pin: editKasirPin
                              });
                              setSavedStatus(true);
                              setTimeout(() => setSavedStatus(false), 2000);
                            }
                          } catch (err: any) {
                            alert(err.message || "Gagal menyimpan perubahan kasir");
                          }
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 mt-4"
                        style={{ color: '#ffffff' }}
                      >
                        <i className="fa-solid fa-circle-check"></i>
                        Simpan PIN & Nama Kasir
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("page-view hide-scrollbar bg-white", props.active && "active")}>
      {/* HEADER TOKO IDENTIK BERANDA */}
      <div className="relative theme-header" style={{ paddingBottom: '2.5rem' }}>
        <div className="px-4 pt-12 pb-2 flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {props.storePhoto ? (
                <img src={props.storePhoto} alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white/50 shadow-md" />
              ) : (
                <img src="/logo_icon.png" alt="Logo" className="w-12 h-12 object-contain" />
              )}
              <div>
                <h1 className="text-[13px] font-black text-white leading-tight uppercase tracking-widest">{props.storeName || 'ALFAZA CELL'}</h1>
                <p className="text-blue-200 text-[8px] font-bold uppercase tracking-tighter opacity-80">{props.storeSubtext || 'Pembukuan Agen brilink & Konter'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-white text-[10px] font-black">{props.kasirName}</span>
                  <span className={cn("text-[7px] px-1.5 py-0.5 rounded-full font-black", props.kasirRole === 'owner' ? "bg-amber-400 text-amber-900" : "bg-white/25 text-white")}>
                    {props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-blue-200 text-[8px] font-bold uppercase tracking-widest leading-none mb-1">{dayName}</p>
              <p className="text-white text-[10px] font-black tracking-tight leading-none mb-1">{fullDate}</p>
              <p className="text-blue-100 text-xs font-black tabular-nums tracking-widest">{clockStr}</p>
            </div>
          </div>

          <button onClick={() => props.setIsSidePanelOpen?.(true)} className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-90 hover:bg-white/20 transition-all">
            <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
          </button>
        </div>
      </div>

      <div className="px-1.5 pt-6 pb-5 bg-gradient-to-r from-indigo-700 to-blue-600 text-white rounded-b-[2rem] shadow-lg shadow-blue-500/20 mb-6" style={{ marginTop: '-2.5rem', position: 'relative', zIndex: 10 }}>
        <div className="px-2 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-sm tracking-wide">Pengaturan Akun</h2>
            <p className="text-blue-100 text-[10px] opacity-90">Kelola profil dan keamanan</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
            <i className="fa-solid fa-user-gear text-white text-xs"></i>
          </div>
        </div>
      </div>

      <div className="px-1.5 pb-6">

        <div className="space-y-3">
          {/* Owner Only Settings */}
          {props.kasirRole === 'owner' && (
            <div className="mb-6 space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Pengaturan Owner</p>

              <div className="bg-white border border-gray-100 p-3.5 rounded-2xl shadow-sm mb-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <i className="fa-brands fa-google text-xs"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">AKUN GOOGLE TERTAUT</p>
                  <p className="text-[11px] font-black text-gray-800 truncate">{props.googleEmail || 'Tidak diketahui'}</p>
                </div>
              </div>

              {/* Kategori: Edit Profil Toko */}
              <div className="group">
                <button
                  onClick={() => setOpenCategory(openCategory === 'profil' ? null : 'profil')}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                    openCategory === 'profil' ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100" : "bg-white text-gray-800 border-gray-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      openCategory === 'profil' ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"
                    )}>
                      <i className="fa-solid fa-user-pen text-xs"></i>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Edit Profil Toko</span>
                  </div>
                  <i className={cn(
                    "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                    openCategory === 'profil' && "rotate-180"
                  )}></i>
                </button>

                {openCategory === 'profil' && (
                  <div className="mt-2 p-5 bg-emerald-50/30 border border-emerald-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-5">
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center gap-3 pb-2">
                      <div className="relative group cursor-pointer" onClick={() => document.getElementById('photoInput')?.click()}>
                        {props.storePhoto ? (
                          <img src={props.storePhoto} alt="Store" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 border-4 border-white shadow-md">
                            <i className="fa-solid fa-camera text-2xl"></i>
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-600 text-white rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                          <i className="fa-solid fa-plus text-[10px]"></i>
                        </div>
                        <input id="photoInput" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                      </div>
                      <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Ganti Logo Toko</p>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-emerald-600 uppercase tracking-tight ml-1 mb-2 block">Nama Toko</label>
                      <input
                        type="text"
                        value={localStoreName}
                        onChange={(e) => setLocalStoreName(e.target.value)}
                        onBlur={() => {
                          if (localStoreName !== props.storeName) {
                            props.onSaveStoreName?.(localStoreName)
                          }
                        }}
                        placeholder="Nama Toko Anda"
                        className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-xs font-black text-gray-900 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                        style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-emerald-600 uppercase tracking-tight ml-1 mb-2 block">Sub-Teks / Slogan</label>
                      <input
                        type="text"
                        value={localStoreSubtext}
                        onChange={(e) => setLocalStoreSubtext(e.target.value)}
                        onBlur={() => {
                          if (localStoreSubtext !== props.storeSubtext) {
                            props.onSaveStoreSubtext?.(localStoreSubtext)
                          }
                        }}
                        placeholder="Contoh: Pembukuan Agen brilink & Konter"
                        className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-xs font-black text-gray-900 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                        style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                      />
                    </div>
                  </div>
                )}
              </div>


              {/* Kategori: Keamanan & Akses */}
              <div className="group">
                <button
                  onClick={() => setOpenCategory(openCategory === 'keamanan' ? null : 'keamanan')}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                    openCategory === 'keamanan' ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-white text-gray-800 border-gray-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      openCategory === 'keamanan' ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                    )}>
                      <i className="fa-solid fa-shield-halved text-xs"></i>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Keamanan & Akses</span>
                  </div>
                  <i className={cn(
                    "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                    openCategory === 'keamanan' && "rotate-180"
                  )}></i>
                </button>

                {openCategory === 'keamanan' && (
                  <div className="mt-2 p-5 bg-blue-50/50 border border-blue-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 overflow-hidden space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                          <i className="fa-solid fa-key text-xs"></i>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Gunakan PIN Masuk</p>
                          <p className="text-[9px] text-gray-500 font-medium">Wajibkan PIN saat login</p>
                        </div>
                      </div>
                      <button
                        onClick={togglePin}
                        className={cn(
                          "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                          isPinEnabled ? "bg-blue-600" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                          isPinEnabled ? "translate-x-6" : "translate-x-0"
                        )}></div>
                      </button>
                    </div>

                    {/* Ganti PIN Owner */}
                    {props.kasirRole === 'owner' && (
                      <div className="border-t border-blue-100 pt-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <i className="fa-solid fa-user-shield text-xs"></i>
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-800">Ganti PIN Owner</p>
                            <p className="text-[9px] text-gray-500 font-medium">Ubah PIN masuk akun Owner</p>
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type={showOwnerPin ? 'text' : 'password'}
                            inputMode="numeric"
                            maxLength={8}
                            value={ownerPinOld}
                            onChange={e => setOwnerPinOld(e.target.value.replace(/\D/g, ''))}
                            placeholder="PIN Lama"
                            className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-50 tracking-widest"
                          />
                          <button type="button" onClick={() => setShowOwnerPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <i className={showOwnerPin ? 'fa-solid fa-eye-slash text-xs' : 'fa-solid fa-eye text-xs'}></i>
                          </button>
                        </div>
                        <input
                          type={showOwnerPin ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={8}
                          value={ownerPinNew}
                          onChange={e => setOwnerPinNew(e.target.value.replace(/\D/g, ''))}
                          placeholder="PIN Baru (min. 4 digit)"
                          className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-50 tracking-widest"
                        />
                        <input
                          type={showOwnerPin ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={8}
                          value={ownerPinConfirm}
                          onChange={e => setOwnerPinConfirm(e.target.value.replace(/\D/g, ''))}
                          placeholder="Konfirmasi PIN Baru"
                          className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-50 tracking-widest"
                        />
                        <button
                          onClick={() => {
                            if (!ownerPinNew || ownerPinNew.length < 4) return alert('PIN baru minimal 4 digit!');
                            if (ownerPinNew !== ownerPinConfirm) return alert('Konfirmasi PIN tidak cocok!');
                            const ownerAcc = props.kasirList?.['owner'];
                            if (ownerAcc && ownerAcc.pin && ownerAcc.pin !== ownerPinOld) return alert('PIN lama tidak sesuai!');
                            if (props.onSaveCashierSelf) {
                              props.onSaveCashierSelf('owner', { name: 'Owner', pin: ownerPinNew })
                                .then(() => {
                                  setOwnerPinOld(''); setOwnerPinNew(''); setOwnerPinConfirm('');
                                  alert('PIN Owner berhasil diubah!');
                                })
                                .catch((err: any) => alert(err.message || 'Gagal menyimpan PIN'));
                            }
                          }}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                          style={{ color: '#ffffff' }}
                        >
                          <i className="fa-solid fa-shield-halved"></i>
                          Simpan PIN Owner
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Kategori: Tampilan & Promo */}
              <div className="group">
                <button
                  onClick={() => setOpenCategory(openCategory === 'promo' ? null : 'promo')}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                    openCategory === 'promo' ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100" : "bg-white text-gray-800 border-gray-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      openCategory === 'promo' ? "bg-white/20 text-white" : "bg-orange-50 text-orange-500"
                    )}>
                      <i className="fa-solid fa-bullhorn text-xs"></i>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Tampilan & Promo</span>
                  </div>
                  <i className={cn(
                    "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                    openCategory === 'promo' && "rotate-180"
                  )}></i>
                </button>

                {openCategory === 'promo' && (
                  <div className="mt-2 p-5 bg-orange-50/30 border border-orange-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-5">
                    <div>
                      <label className="text-[9px] font-black text-orange-600 uppercase tracking-tight ml-1 mb-2 block">Teks Utama (Highlight)</label>
                      <input
                        type="text"
                        value={localMainAnnouncement}
                        onChange={(e) => setLocalMainAnnouncement(e.target.value)}
                        onBlur={() => {
                          if (localMainAnnouncement !== props.mainAnnouncement) {
                            props.onSaveMainAnnouncement?.(localMainAnnouncement)
                          }
                        }}
                        placeholder="Contoh: Promo Aksesoris 20%..."
                        className="w-full bg-white border border-orange-100 rounded-xl px-4 py-3 text-xs font-black text-gray-900 placeholder:text-gray-400 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                      />
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Teks Tambahan (Max 15 Baris)</label>
                        <span className="text-[8px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Slide Berjalan</span>
                      </div>
                      <div className="relative group/textarea">
                        <textarea
                          rows={8}
                          value={localRunningTextsText}
                          onChange={(e) => setLocalRunningTextsText(e.target.value)}
                          onBlur={() => {
                            const lines = localRunningTextsText.split('\n');
                            const newTexts = Array(15).fill('');
                            lines.slice(0, 15).forEach((line, i) => {
                              newTexts[i] = line;
                            });
                            props.onSaveRunningTexts?.(newTexts);
                          }}
                          placeholder="Tulis pesan per baris di sini...&#10;Baris 1: Promo Pulsa&#10;Baris 2: Promo Aksesoris&#10;..."
                          className="w-full bg-white border border-gray-100 group-hover/textarea:border-orange-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-gray-900 placeholder:text-gray-300 focus:bg-white focus:ring-4 focus:ring-orange-50 transition-all outline-none resize-none min-h-[200px]"
                        />
                        <div className="absolute bottom-3 right-4 text-[8px] font-black text-gray-300 pointer-events-none">
                          ENTER UNTUK BARIS BARU
                        </div>
                      </div>
                      <p className="text-[8px] text-gray-400 mt-2 ml-1 italic">* Setiap baris akan muncul bergantian di dashboard.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Kategori: Opsi Pantau Dashboard */}
              <div className="group">
                <button
                  onClick={() => setOpenCategory(openCategory === 'pantau' ? null : 'pantau')}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                    openCategory === 'pantau' ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" : "bg-white text-gray-800 border-gray-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      openCategory === 'pantau' ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"
                    )}>
                      <i className="fa-solid fa-eye text-xs"></i>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Opsi Pantau Dashboard</span>
                  </div>
                  <i className={cn(
                    "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                    openCategory === 'pantau' && "rotate-180"
                  )}></i>
                </button>

                {openCategory === 'pantau' && (
                  <div className="mt-2 p-5 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                          <i className="fa-solid fa-filter text-[10px]"></i>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Filter Kasir di Beranda</p>
                          <p className="text-[9px] text-gray-500 font-medium">Tampilkan opsi cek per kasir</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const current = localStorage.getItem(storageKeyFilter) !== 'false';
                          localStorage.setItem(storageKeyFilter, (!current).toString());
                          window.dispatchEvent(new Event('storage')); // Trigger update if needed
                          setSavedStatus(true);
                          setTimeout(() => setSavedStatus(false), 2000);
                        }}
                        className={cn(
                          "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                          (localStorage.getItem(storageKeyFilter) !== 'false') ? "bg-indigo-600" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                          (localStorage.getItem(storageKeyFilter) !== 'false') ? "translate-x-6" : "translate-x-0"
                        )}></div>
                      </button>
                    </div>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter px-1 text-center">
                      Aktifkan untuk memantau performa kasir tertentu langsung dari kartu Owner Control.
                    </p>
                  </div>
                )}
              </div>

              {/* Kategori: Backup & Reset */}
              <div className="group">
                <button
                  onClick={() => setOpenCategory(openCategory === 'backup' ? null : 'backup')}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                    openCategory === 'backup' ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-100" : "bg-white text-gray-800 border-gray-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      openCategory === 'backup' ? "bg-white/20 text-white" : "bg-red-50 text-red-600"
                    )}>
                      <i className="fa-solid fa-cloud-arrow-down text-xs"></i>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Backup & Keamanan</span>
                  </div>
                  <i className={cn(
                    "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                    openCategory === 'backup' && "rotate-180"
                  )}></i>
                </button>

                {openCategory === 'backup' && (
                  <div className="mt-2 p-5 bg-red-50/30 border border-red-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-4">
                    <button
                      onClick={handleExportData}
                      className="w-full flex items-center gap-4 p-4 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-file-code text-sm"></i>
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-gray-800 uppercase tracking-widest leading-none">BACKUP (JSON)</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">Format raw data aplikasi</p>
                      </div>
                    </button>

                    <button
                      onClick={handleExportCSV}
                      className="w-full flex items-center gap-4 p-4 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-file-excel text-sm"></i>
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-gray-800 uppercase tracking-widest leading-none">BACKUP EXCEL (CSV)</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">Dapat dibuka di Excel & app lain</p>
                      </div>
                    </button>

                    <button
                      onClick={handleResetSystem}
                      className="w-full flex items-center gap-4 p-4 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-rotate text-sm"></i>
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-red-600 uppercase tracking-widest leading-none">RESET SISTEM</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">Kembalikan pengaturan ke awal</p>
                      </div>
                    </button>

                    <p className="text-[8px] text-gray-400 font-bold text-center uppercase tracking-tighter px-4">
                      Selalu lakukan backup sebelum melakukan update besar atau pindah perangkat.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kategori: Sinkronisasi Cloud (Semua role: Owner & Kasir) */}
          <div className="group">
            <button
              onClick={() => setOpenCategory(openCategory === 'cloud' ? null : 'cloud')}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                openCategory === 'cloud' ? "bg-purple-600 text-white border-purple-600 shadow-lg" : "bg-white text-gray-800 border-gray-100 shadow-sm"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  openCategory === 'cloud' ? "bg-white/20 text-white" : "bg-purple-50 text-purple-600"
                )}>
                  <i className="fa-solid fa-cloud text-xs"></i>
                </div>
                <div className="text-left">
                  <span className="text-[11px] font-black uppercase tracking-widest block">Sinkronisasi Cloud</span>
                  <span className="text-[8px] font-bold opacity-80 block">Backup data & samakan setelan dengan perangkat lain</span>
                </div>
              </div>
              <i className={cn(
                "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                openCategory === 'cloud' && "rotate-180"
              )}></i>
            </button>

            {openCategory === 'cloud' && (
              <div className="mt-2 p-5 bg-purple-50/50 border border-purple-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-3">
                {/* Tombol Update Sync (Upload + Download sekali klik) */}
                <button
                  onClick={handleSyncAll}
                  disabled={isCloudLoading}
                  className="w-full bg-purple-600 border border-purple-600 text-white py-3.5 rounded-xl font-black text-[10px] shadow-lg shadow-purple-200 uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-purple-700 disabled:opacity-50"
                  style={{ color: '#ffffff' }}
                >
                  <i className={isCloudLoading ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-arrows-rotate"}></i>
                  {isCloudLoading ? 'Sinkronisasi...' : 'Update Sync'}
                </button>

                <div className="flex gap-2">
                  <button onClick={handleUploadToCloud} disabled={isCloudLoading} className="flex-1 bg-white border border-purple-200 text-purple-700 py-2.5 rounded-xl font-black text-[9px] shadow-sm uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all hover:bg-purple-50 disabled:opacity-50">
                    <i className={isCloudLoading ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-cloud-arrow-up"}></i>
                    Upload
                  </button>
                  <button onClick={handleDownloadFromCloud} disabled={isCloudLoading} className="flex-1 bg-white border border-purple-200 text-purple-700 py-2.5 rounded-xl font-black text-[9px] shadow-sm uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all hover:bg-purple-50 disabled:opacity-50">
                    <i className={isCloudLoading ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-cloud-arrow-down"}></i>
                    Download
                  </button>
                </div>

                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter px-1 text-center mt-1">Update Sync = Upload lokal ke cloud, lalu download terbaru dari cloud. Gunakan untuk menyamakan data antar perangkat.</p>
              </div>
            )}
          </div>

          {/* Kategori: Teks Otomatis (Setting Keterangan) */}
          <div className="group">
            <button
              onClick={() => props.setActiveView?.('view-otomatis')}
              className="w-full flex items-center justify-between p-4 rounded-2xl transition-all border bg-white text-gray-800 border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-purple-50 text-purple-600">
                  <i className="fa-solid fa-bolt text-xs"></i>
                </div>
                <div className="text-left">
                  <span className="text-[11px] font-black uppercase tracking-widest block text-black">TEKS OTOMATIS</span>
                  <span className="text-[8px] font-bold text-gray-400">Setting keterangan otomatis</span>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
            </button>
          </div>

          {/* Kategori: Pengaturan PIN & Nama Kasir Mandiri */}
          {props.kasirRole === 'kasir' && (
            <div className="group">
              <button
                onClick={() => setOpenCategory(openCategory === 'kasirSelf' ? null : 'kasirSelf')}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                  openCategory === 'kasirSelf' ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" : "bg-white text-gray-800 border-gray-100 shadow-sm"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    openCategory === 'kasirSelf' ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"
                  )}>
                    <i className="fa-solid fa-user-lock text-xs"></i>
                  </div>
                  <div className="text-left">
                    <span className="text-[11px] font-black uppercase tracking-widest block">PIN & NAMA KASIR</span>
                    <span className="text-[8px] font-bold opacity-80">Edit nama dan PIN kasir Anda</span>
                  </div>
                </div>
                <i className={cn(
                  "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                  openCategory === 'kasirSelf' && "rotate-180"
                )}></i>
              </button>

              {openCategory === 'kasirSelf' && (
                <div className="mt-2 p-5 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-indigo-900 uppercase tracking-widest block mb-1">Nama Kasir</label>
                    <input
                      type="text"
                      value={editKasirName}
                      onChange={e => setEditKasirName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-black outline-none focus:border-indigo-500 font-bold"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-indigo-900 uppercase tracking-widest block mb-1">PIN Kasir (Minimal 4 angka)</label>
                    <div className="relative">
                      <input
                        type={showKasirPin ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={8}
                        value={editKasirPin}
                        onChange={e => setEditKasirPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-black outline-none focus:border-indigo-500 font-bold tracking-widest"
                        style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKasirPin(!showKasirPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <i className={showKasirPin ? "fa-solid fa-eye-slash text-xs" : "fa-solid fa-eye text-xs"}></i>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!editKasirName.trim()) {
                        alert("Nama kasir tidak boleh kosong!");
                        return;
                      }
                      if (editKasirPin.length < 4) {
                        alert("PIN minimal harus 4 digit angka!");
                        return;
                      }
                      try {
                        if (props.onSaveCashierSelf && props.currentUsername) {
                          await props.onSaveCashierSelf(props.currentUsername, {
                            name: editKasirName.trim(),
                            pin: editKasirPin
                          });
                          setSavedStatus(true);
                          setTimeout(() => setSavedStatus(false), 2000);
                        }
                      } catch (err: any) {
                        alert(err.message || "Gagal menyimpan perubahan kasir");
                      }
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                    style={{ color: '#ffffff' }}
                  >
                    <i className="fa-solid fa-circle-check"></i>
                    Simpan PIN & Nama
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Menu Akun</p>

          <button className="w-full bg-white border border-gray-100 rounded-2xl font-semibold py-4 px-5 text-sm flex items-center justify-between shadow-sm hover:bg-gray-50 transition-all">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-circle-question text-blue-500"></i>
              <span>Bantuan & Support</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>

          <button className="w-full bg-white border border-gray-100 rounded-2xl font-semibold py-4 px-5 text-sm flex items-center justify-between shadow-sm hover:bg-gray-50 transition-all">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-shield-halved text-emerald-500"></i>
              <span>Keamanan</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>

          {/* Tombol Simpan Perubahan (Visual Confirmation) */}
          <button
            onClick={() => {
              setSavedStatus(true);
              setTimeout(() => setSavedStatus(false), 2000);
            }}
            className={cn(
              "w-full rounded-2xl font-black py-4 px-5 text-sm mt-8 shadow-lg transition-all flex items-center justify-center gap-3",
              savedStatus
                ? "bg-emerald-600 text-white scale-[0.98]"
                : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
            )}
          >
            {savedStatus ? (
              <>
                <i className="fa-solid fa-circle-check animate-bounce"></i>
                BERHASIL DISIMPAN!
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk text-slate-400"></i>
                SIMPAN PERUBAHAN
              </>
            )}
          </button>

          <button
            onClick={() => {
              props.onRequestLogout?.();
            }}
            className="w-full bg-red-50 text-red-600 rounded-2xl font-bold py-4 px-5 text-sm mt-3 shadow-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            Keluar Aplikasi
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-300 mt-10">Versi 1.2.0 (Production)</p>
      </div>
    </div>
  )
}

export default AkunView
