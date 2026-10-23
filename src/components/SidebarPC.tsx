import React, { useState, useRef, useEffect } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Store } from '../types'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface SidebarPCProps {
  activeView: string
  setActiveView: (view: string) => void
  storeName?: string
  storeSubtext?: string
  storePhoto?: string
  kasirName?: string
  kasirRole?: string
  setIsSidePanelOpen: (open: boolean) => void
  onLogout: () => void
  stores?: Store[]
  currentStoreId?: string
  onSwitchStore?: (storeId: string, store?: Store) => void
  onExitStore?: () => void
  kasirList?: Record<string, any>
  filterKasir?: string
  setFilterKasir?: (v: string) => void
  onUpdateActiveCashier?: (username: string, account: any) => void
}

const SidebarPC: React.FC<SidebarPCProps> = ({
  activeView,
  setActiveView,
  storeName,
  storeSubtext,
  storePhoto,
  kasirName,
  kasirRole,
  setIsSidePanelOpen,
  onLogout,
  stores = [],
  currentStoreId,
  onSwitchStore,
  onExitStore,
  kasirList = {},
  filterKasir = 'Semua',
  setFilterKasir,
  onUpdateActiveCashier
}) => {
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false)
  const [isKasirDropdownOpen, setIsKasirDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isStoreDropdownOpen && !isKasirDropdownOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStoreDropdownOpen(false)
        setIsKasirDropdownOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsStoreDropdownOpen(false)
        setIsKasirDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isStoreDropdownOpen, isKasirDropdownOpen])

  const navigasiUtamaItems = [
    { id: 'view-beranda', label: 'Beranda', icon: 'fa-house' },
    { id: 'view-input-transaksi', label: 'Input Transaksi', icon: 'fa-cash-register' },
    { id: 'view-transaksi', label: 'Riwayat Transaksi', icon: 'fa-clock-rotate-left' },
    { id: 'view-isi-saldo', label: 'Isi Saldo Kas', icon: 'fa-wallet' },
    { id: 'view-laporan', label: 'Laporan Kasir', icon: 'fa-chart-pie' },
  ]

  const fiturTambahanItems = [
    { id: 'view-pos-kasir', label: 'POS Kasir', icon: 'fa-store' },
    { id: 'view-nota', label: 'Nota Kasir', icon: 'fa-receipt' },
    { id: 'view-stok-voucher', label: 'Voucher & Kartu', icon: 'fa-ticket' },
    { id: 'view-kasbon', label: 'Kasbon Pelanggan', icon: 'fa-file-invoice' },
    { id: 'view-kontak', label: 'Buku Kontak', icon: 'fa-address-book' },
    { id: 'view-kalender', label: 'Kalender Kerja', icon: 'fa-calendar-days' },
  ]

  const pengaturanAlatItems = [
    { id: 'view-akun', label: 'Pengaturan Akun', icon: 'fa-gear' },
    { id: 'view-otomatis', label: 'Preset Otomatis', icon: 'fa-wand-magic-sparkles' },
  ]

  const ownerMenuItems = [
    { id: 'view-owner-monitor', label: 'Monitor Kasir', icon: 'fa-users' },
    { id: 'view-owner-laporan', label: 'Profit & Laba', icon: 'fa-hand-holding-dollar' },
    { id: 'view-owner-grafik', label: 'Grafik Penjualan', icon: 'fa-chart-simple' },
    { id: 'view-owner-performa', label: 'Performa Kasir', icon: 'fa-chart-line' },
    { id: 'view-owner-absen', label: 'Absensi Karyawan', icon: 'fa-fingerprint' },
    { id: 'view-owner-izin', label: 'Izin Karyawan', icon: 'fa-calendar-day' },
    { id: 'view-owner-gaji', label: 'Penggajian', icon: 'fa-dollar-sign' },
    { id: 'view-owner-saldo', label: 'Manajemen Saldo', icon: 'fa-vault' },
    { id: 'view-owner-audit', label: 'Audit Laci', icon: 'fa-file-signature' },
    { id: 'view-owner-backup', label: 'Backup & Cloud', icon: 'fa-database' },
  ]

  const validCashiers = Object.entries(kasirList || {}).filter(
    ([id, acc]) => id.toLowerCase() !== 'owner' && (acc?.role || '').toLowerCase() !== 'owner'
  )

  const activeCashierLabel = filterKasir === 'Semua' || !filterKasir
    ? 'Semua Kasir'
    : (kasirList[filterKasir]?.name || filterKasir)

  const isOwner = (kasirRole || '').toLowerCase() === 'owner'

  return (
    <div className="sidebar-pc flex flex-col justify-between h-screen w-[240px] bg-slate-900 border-r border-slate-800 text-white shrink-0 z-50 select-none">
      {/* Header Section: Kasir Mode (Statis & Bersih) vs Owner Mode (Pilih Toko & Kasir) */}
      {!isOwner ? (
        <div className="p-3.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            {storePhoto ? (
              <img 
                src={storePhoto} 
                className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-md shrink-0" 
                alt="Logo Toko" 
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center border border-blue-500/50 shadow-md shrink-0">
                <i className="fa-solid fa-store text-lg text-white"></i>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h3 className="font-black text-xs text-blue-400 tracking-wider truncate leading-tight uppercase">
                {storeName || 'ALFAZA CELL'}
              </h3>
              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-[0.15em] truncate leading-none mt-1">
                {storeSubtext || 'Agen Brilink & Konter'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div ref={dropdownRef} className="p-3.5 border-b border-slate-800/80 relative transition-all">
        <div className="flex items-center gap-2.5">
          {storePhoto ? (
            <img 
              src={storePhoto} 
              className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-lg shrink-0 cursor-pointer hover:opacity-90 transition-opacity" 
              alt="Logo"
              onClick={() => {
                setIsStoreDropdownOpen(prev => !prev)
                setIsKasirDropdownOpen(false)
              }}
            />
          ) : (
            <div 
              onClick={() => {
                setIsStoreDropdownOpen(prev => !prev)
                setIsKasirDropdownOpen(false)
              }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center border border-blue-500/50 shadow-lg shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <i className="fa-solid fa-store text-lg text-white"></i>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <h3 
                className="font-black text-xs text-blue-400 tracking-wider truncate leading-tight uppercase cursor-pointer hover:text-blue-300 transition-colors"
                title={`${storeName || 'ALFAZA CELL'} - Klik untuk beralih toko`}
                onClick={() => {
                  setIsStoreDropdownOpen(prev => !prev)
                  setIsKasirDropdownOpen(false)
                }}
              >
                {storeName || 'ALFAZA CELL'}
              </h3>

              {/* TOMBOL SWIFT / GANTI TOKO */}
              <button
                type="button"
                onClick={() => {
                  setIsStoreDropdownOpen(prev => !prev)
                  setIsKasirDropdownOpen(false)
                }}
                className={cn(
                  "shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 border active:scale-90",
                  isStoreDropdownOpen
                    ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30 scale-105"
                    : "bg-slate-800/90 hover:bg-blue-600 text-blue-400 hover:text-white border-slate-700 hover:border-blue-500 shadow-sm"
                )}
                title="Ganti / Filter Toko (Switch Toko 1 ke Toko 2 atau lainnya)"
              >
                <i className={cn("fa-solid text-[9px] transition-transform duration-200", 
                  isStoreDropdownOpen ? "fa-xmark text-white" : "fa-arrow-right-arrow-left"
                )}></i>
              </button>
            </div>

            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-[0.15em] truncate leading-none mt-0.5">
              {storeSubtext || 'Agen Brilink & Konter'}
            </p>
          </div>
        </div>

        {/* TWIN SELECTOR PILLS (PERSIS MODEL MODE HP: PILIH TOKO & PILIH KASIR) */}
        <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2.5 border-t border-slate-800/60">
          {/* Tombol Pilih Toko */}
          <button
            type="button"
            onClick={() => {
              setIsStoreDropdownOpen(prev => !prev)
              setIsKasirDropdownOpen(false)
            }}
            className={cn(
              "flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all min-w-0 active:scale-95",
              isStoreDropdownOpen
                ? "bg-blue-600 text-white border-blue-400 shadow-sm shadow-blue-500/20"
                : "bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:border-slate-600"
            )}
            title="Pilih / Filter Cabang Toko"
          >
            <div className="flex items-center gap-1 min-w-0">
              <i className="fa-solid fa-store text-blue-400 text-[8px] shrink-0"></i>
              <span className="truncate">{storeName || 'Pilih Toko'}</span>
            </div>
            <i className={cn("fa-solid fa-chevron-down text-[6px] shrink-0 transition-transform duration-200 text-slate-400", isStoreDropdownOpen && "rotate-180 text-white")}></i>
          </button>

          {/* Tombol Pilih Kasir */}
          <button
            type="button"
            onClick={() => {
              setIsKasirDropdownOpen(prev => !prev)
              setIsStoreDropdownOpen(false)
            }}
            className={cn(
              "flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all min-w-0 active:scale-95",
              isKasirDropdownOpen
                ? "bg-indigo-600 text-white border-indigo-400 shadow-sm shadow-indigo-500/20"
                : filterKasir && filterKasir !== 'Semua'
                  ? "bg-indigo-950/60 text-indigo-300 border-indigo-700/60 hover:border-indigo-600"
                  : "bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:border-slate-600"
            )}
            title="Pilih / Filter Kasir"
          >
            <div className="flex items-center gap-1 min-w-0">
              <i className="fa-solid fa-user-tie text-indigo-400 text-[8px] shrink-0"></i>
              <span className="truncate">{activeCashierLabel}</span>
            </div>
            <i className={cn("fa-solid fa-chevron-down text-[6px] shrink-0 transition-transform duration-200 text-slate-400", isKasirDropdownOpen && "rotate-180 text-white")}></i>
          </button>
        </div>

        {/* DROPDOWN / ACCORDION FILTER GANTI TOKO */}
        {isStoreDropdownOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800/90 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <i className="fa-solid fa-shop text-blue-400 text-[9px]"></i>
                PILIH / FILTER TOKO
              </span>
              <span className="text-[7px] font-bold uppercase text-slate-500">
                {stores?.length || 0} Terdaftar
              </span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto hide-scrollbar pr-0.5">
              {/* Option: Semua Toko (Pusat Monitoring - jika owner) */}
              {kasirRole === 'owner' && (
                <button
                  type="button"
                  onClick={() => {
                    onSwitchStore?.('all')
                    setIsStoreDropdownOpen(false)
                  }}
                  className={cn(
                    "w-full p-2 rounded-xl text-left transition-all duration-150 border flex items-center gap-2.5 group active:scale-95",
                    currentStoreId === 'all'
                      ? "bg-blue-600/20 border-blue-500 text-white shadow-sm shadow-blue-500/20"
                      : "bg-slate-800/50 hover:bg-slate-800 border-slate-750 hover:border-slate-600 text-slate-300 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border",
                    currentStoreId === 'all' ? "bg-blue-600 border-blue-400 text-white" : "bg-slate-700/80 border-slate-600 text-slate-300 group-hover:text-white"
                  )}>
                    <i className="fa-solid fa-network-wired text-[10px]"></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-black truncate leading-tight uppercase">
                        SEMUA TOKO
                      </p>
                      {currentStoreId === 'all' && (
                        <span className="text-[7px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                          AKTIF
                        </span>
                      )}
                    </div>
                    <p className="text-[7px] text-slate-400 font-bold uppercase truncate mt-0.5">
                      Pusat Pemantauan Gabungan
                    </p>
                  </div>
                </button>
              )}

              {/* Daftar Toko */}
              {stores && stores.length > 0 ? (
                stores.map((s, idx) => {
                  const isCurrent = s.id === currentStoreId || (!currentStoreId && idx === 0)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSwitchStore?.(s.id, s)
                        setIsStoreDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full p-2 rounded-xl text-left transition-all duration-150 border flex items-center gap-2.5 group active:scale-95",
                        isCurrent
                          ? "bg-blue-600/20 border-blue-500 text-white shadow-sm shadow-blue-500/20"
                          : "bg-slate-800/50 hover:bg-slate-800 border-slate-750 hover:border-slate-600 text-slate-300 hover:text-white"
                      )}
                    >
                      {s.photo_url ? (
                        <img src={s.photo_url} className="w-7 h-7 rounded-lg object-cover border border-slate-700 shrink-0" alt="logo" />
                      ) : (
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border",
                          isCurrent ? "bg-blue-600 border-blue-400 text-white" : "bg-slate-700/80 border-slate-600 text-slate-300 group-hover:text-white"
                        )}>
                          {idx + 1}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] font-black truncate leading-tight uppercase">
                            {s.name}
                          </p>
                          {isCurrent ? (
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                              AKTIF
                            </span>
                          ) : (
                            <span className="text-[7px] font-bold uppercase text-slate-500 group-hover:text-blue-400 shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              Pilih <i className="fa-solid fa-arrow-right text-[6px]"></i>
                            </span>
                          )}
                        </div>
                        <p className="text-[7px] text-slate-400 font-bold uppercase truncate mt-0.5">
                          {s.subtext || `Toko Cabang ${idx + 1}`}
                        </p>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="p-3 text-center rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <p className="text-[9px] font-bold text-slate-400">Tidak ada data toko lain</p>
                </div>
              )}
            </div>

            {/* Tombol Pilih Toko dari Menu Awal */}
            {onExitStore && (
              <div className="pt-2 mt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setIsStoreDropdownOpen(false)
                    onExitStore()
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800/40 hover:bg-blue-950/40 hover:border-blue-800/60 border border-slate-700/50 text-slate-400 hover:text-blue-300 text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <i className="fa-solid fa-store text-[8px]"></i>
                  <span>Pilih Toko dari Menu Awal</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* DROPDOWN / ACCORDION FILTER GANTI KASIR */}
        {isKasirDropdownOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800/90 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <i className="fa-solid fa-user-tie text-indigo-400 text-[9px]"></i>
                PILIH / PANTAU KASIR
              </span>
              {filterKasir && filterKasir !== 'Semua' && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterKasir?.('Semua')
                    setIsKasirDropdownOpen(false)
                  }}
                  className="text-[7px] font-bold text-rose-400 hover:text-rose-300 uppercase hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto hide-scrollbar pr-0.5">
              {/* Option 1: Semua Kasir (Gabungan) */}
              <button
                type="button"
                onClick={() => {
                  setFilterKasir?.('Semua')
                  setIsKasirDropdownOpen(false)
                }}
                className={cn(
                  "w-full p-2 rounded-xl text-left transition-all duration-150 border flex items-center gap-2.5 group active:scale-95",
                  (!filterKasir || filterKasir === 'Semua')
                    ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/20"
                    : "bg-slate-800/50 hover:bg-slate-800 border-slate-750 hover:border-slate-600 text-slate-300 hover:text-white"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border",
                  (!filterKasir || filterKasir === 'Semua')
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-slate-700/80 border-slate-600 text-slate-300 group-hover:text-white"
                )}>
                  <i className="fa-solid fa-users text-xs"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] font-black truncate leading-tight uppercase">
                      SEMUA KASIR
                    </p>
                    {(!filterKasir || filterKasir === 'Semua') && (
                      <span className="text-[7px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shrink-0 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></span>
                        AKTIF
                      </span>
                    )}
                  </div>
                  <p className="text-[7px] text-slate-400 font-bold uppercase truncate mt-0.5">
                    Gabungan seluruh transaksi
                  </p>
                </div>
              </button>

              {/* Daftar Kasir dari kasirList */}
              {validCashiers.length > 0 ? (
                validCashiers.map(([kId, kAcc], idx) => {
                  const isCurrent = filterKasir === kId
                  const isLoggedAccount = kasirName === kAcc.name
                  return (
                    <button
                      key={kId}
                      type="button"
                      onClick={() => {
                        setFilterKasir?.(kId)
                        setIsKasirDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full p-2 rounded-xl text-left transition-all duration-150 border flex items-center gap-2.5 group active:scale-95",
                        isCurrent
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/20"
                          : "bg-slate-800/50 hover:bg-slate-800 border-slate-750 hover:border-slate-600 text-slate-300 hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border",
                        isCurrent
                          ? "bg-indigo-600 border-indigo-400 text-white"
                          : "bg-slate-700/80 border-slate-600 text-slate-300 group-hover:text-white"
                      )}>
                        {kAcc.name ? kAcc.name.charAt(0).toUpperCase() : (idx + 1)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] font-black truncate leading-tight uppercase">
                            {kAcc.name}
                          </p>
                          {isCurrent ? (
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shrink-0 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></span>
                              DIPILIH
                            </span>
                          ) : (
                            <span className="text-[7px] font-bold uppercase text-slate-500 group-hover:text-indigo-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              Pilih <i className="fa-solid fa-arrow-right text-[6px]"></i>
                            </span>
                          )}
                        </div>
                        <p className="text-[7px] text-slate-400 font-bold uppercase truncate mt-0.5">
                          {kAcc.role || 'Kasir'} {isLoggedAccount ? '• (Akun Sedang Login)' : ''}
                        </p>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="p-3 text-center rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <p className="text-[9px] font-bold text-slate-400">Belum ada kasir terdaftar di toko ini</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Menu Navigation Section */}
      <div className="flex-1 py-4 overflow-y-auto hide-scrollbar space-y-1 px-3">
        {/* 1. NAVIGASI UTAMA */}
        <div>
          <span className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-2 block">
            <i className="fa-solid fa-compass text-blue-400 text-[9px]"></i>
            Navigasi Utama
          </span>
          <div className="space-y-1">
            {navigasiUtamaItems.map((item) => {
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left font-black text-[10px] uppercase tracking-wider transition-all duration-200 group active:scale-95",
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60 hover:translate-x-1"
                  )}
                >
                  <i className={cn("fa-solid text-xs w-4 text-center transition-colors", 
                    isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400"
                  , item.icon)}></i>
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. FITUR TAMBAHAN */}
        <div className="pt-3.5 mt-3.5 border-t border-slate-800/60">
          <span className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-2 block">
            <i className="fa-solid fa-shapes text-emerald-400 text-[9px]"></i>
            Fitur Tambahan
          </span>
          <div className="space-y-1">
            {fiturTambahanItems.map((item) => {
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left font-black text-[10px] uppercase tracking-wider transition-all duration-200 group active:scale-95",
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60 hover:translate-x-1"
                  )}
                >
                  <i className={cn("fa-solid text-xs w-4 text-center transition-colors", 
                    isActive ? "text-white" : "text-slate-500 group-hover:text-emerald-400"
                  , item.icon)}></i>
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. PENGATURAN ALAT */}
        <div className="pt-3.5 mt-3.5 border-t border-slate-800/60">
          <span className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-2 block">
            <i className="fa-solid fa-sliders text-purple-400 text-[9px]"></i>
            Pengaturan Alat
          </span>
          <div className="space-y-1">
            {pengaturanAlatItems.map((item) => {
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left font-black text-[10px] uppercase tracking-wider transition-all duration-200 group active:scale-95",
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60 hover:translate-x-1"
                  )}
                >
                  <i className={cn("fa-solid text-xs w-4 text-center transition-colors", 
                    isActive ? "text-white" : "text-slate-500 group-hover:text-purple-400"
                  , item.icon)}></i>
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}

            {/* Tombol Mode & Tema */}
            <button
              onClick={() => setIsSidePanelOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left font-black text-[10px] uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-800/60 hover:translate-x-1 transition-all duration-200 group active:scale-95"
            >
              <i className="fa-solid fa-palette text-xs w-4 text-center text-slate-500 group-hover:text-pink-400"></i>
              <span className="truncate">Mode & Tema</span>
            </button>
          </div>
        </div>

        {/* 4. TOMBOL KHUSUS OWNER */}
        {isOwner && (
          <div className="pt-3.5 mt-3.5 border-t border-slate-800/60">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="flex items-center gap-1.5 text-[8px] font-black text-amber-400 uppercase tracking-[0.2em]">
                <i className="fa-solid fa-crown text-amber-400 text-[9px]"></i>
                Khusus Owner
              </span>
              <span className="text-[7px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase">
                Owner Only
              </span>
            </div>

            <div className="space-y-1">
              {ownerMenuItems.map((item) => {
                const isActive = activeView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-black text-[10px] uppercase tracking-wider transition-all duration-200 group outline-none active:scale-95",
                      isActive
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_4px_15px_-3px_rgba(245,158,11,0.5)] scale-[1.02] relative overflow-hidden"
                        : "text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1"
                    )}
                  >
                    {isActive && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>}
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 relative z-10 shrink-0", isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-amber-400")}>
                      <i className={cn("fa-solid text-[10px]", item.icon)}></i>
                    </div>
                    <span className="relative z-10 truncate">{item.label}</span>
                    {isActive && <i className="fa-solid fa-chevron-right text-[8px] ml-auto opacity-70 relative z-10"></i>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cashier Info & Logout Section */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between gap-2 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800/50 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
              {isOwner ? 'AKUN OWNER' : 'KASIR AKTIF'}
            </p>
            <p className="text-[9px] font-black text-white truncate leading-tight uppercase">
              {kasirName || '---'}
            </p>
            {isOwner && filterKasir && filterKasir !== 'Semua' && (
              <p className="text-[7px] text-indigo-400 font-black uppercase tracking-wider mt-1 truncate">
                <i className="fa-solid fa-eye mr-1"></i>Pantau: {kasirList[filterKasir]?.name || filterKasir}
              </p>
            )}
          </div>
          <span className={cn(
            "text-[6px] px-1.5 py-0.5 rounded-md font-black shrink-0 tracking-widest uppercase",
            isOwner ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
          )}>
            {isOwner ? 'OWNER' : 'KASIR'}
          </span>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-950/30 hover:bg-red-900/40 border border-red-900/30 hover:border-red-800/50 text-red-400 hover:text-red-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-200 active:scale-95"
        >
          <i className="fa-solid fa-power-off text-xs"></i>
          <span>KELUAR KASIR</span>
        </button>
      </div>
    </div>
  )
}

export default SidebarPC
