import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
  onLogout
}) => {
  const menuItems = [
    { id: 'view-beranda', label: 'Transaksi', icon: 'fa-house' },
    { id: 'view-transaksi', label: 'Riwayat', icon: 'fa-clock' },
    { id: 'view-isi-saldo', label: 'Isi Saldo', icon: 'fa-wallet' },
    { id: 'view-laporan', label: 'Laporan', icon: 'fa-chart-simple' },
    { id: 'view-akun', label: 'Akun & Owner', icon: 'fa-user-tie' },
    { id: 'view-otomatis', label: 'Otomatis', icon: 'fa-wand-magic-sparkles' }
  ]

  return (
    <div className="sidebar-pc flex flex-col justify-between h-screen w-[240px] bg-slate-900 border-r border-slate-800 text-white shrink-0 z-50 select-none">
      {/* Header Section */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {storePhoto ? (
            <img 
              src={storePhoto} 
              className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-lg" 
              alt="Logo" 
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center border border-blue-500 shadow-lg shrink-0">
              <i className="fa-solid fa-store text-lg text-white"></i>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-xs text-blue-400 tracking-wider truncate leading-tight uppercase">
              {storeName || 'ALFAZA CELL'}
            </h3>
            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-0.5 truncate leading-none">
              {storeSubtext || 'Agen Brilink & Konter'}
            </p>
          </div>
        </div>
      </div>

      {/* Menu Navigation Section */}
      <div className="flex-1 py-4 overflow-y-auto hide-scrollbar space-y-1 px-3">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] px-3 mb-2 block">
          Navigasi Utama
        </span>
        {menuItems.map((item) => {
          const isActive = activeView === item.id || (item.id === 'view-beranda' && activeView.startsWith('view-owner-') && activeView !== 'view-owner-laporan' && activeView !== 'view-owner-monitor' && activeView !== 'view-owner-grafik' && activeView !== 'view-owner-performa' && activeView !== 'view-owner-absen' && activeView !== 'view-owner-izin' && activeView !== 'view-owner-gaji' && activeView !== 'view-owner-saldo' && activeView !== 'view-owner-backup' && activeView !== 'view-owner-audit')
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-left font-black text-[10px] uppercase tracking-wider transition-all duration-200 group active:scale-95",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50 hover:translate-x-1"
              )}
            >
              <i className={cn("fa-solid text-xs w-4 text-center transition-colors", 
                isActive ? "text-white" : "text-slate-500 group-hover:text-white"
              , item.icon)}></i>
              <span>{item.label}</span>
            </button>
          )
        })}

        <div className="pt-4 mt-4 border-t border-slate-800/60">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] px-3 mb-2 block">
            Fitur Tambahan
          </span>
          {[
            { id: 'view-kasbon', label: 'Kasbon', icon: 'fa-file-invoice' },
            { id: 'view-kontak', label: 'Kontak', icon: 'fa-address-book' },
            { id: 'view-stok-voucher', label: 'Voucher', icon: 'fa-ticket' },
            { id: 'view-kalender', label: 'Kalender', icon: 'fa-calendar-days' },
            { id: 'view-nota', label: 'Nota', icon: 'fa-receipt' },
          ].map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-black text-[10px] uppercase tracking-wider transition-all duration-200 active:scale-95",
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/30 hover:translate-x-1"
                )}
              >
                <i className={cn("fa-solid text-xs w-4 text-center", isActive ? "text-white" : "text-slate-500", item.icon)}></i>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {kasirRole === 'owner' && (
          <div className="pt-4 mt-4 border-t border-slate-800/60">
            <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] px-3 mb-2 block">
              Panel Owner
            </span>
            {[
              { id: 'view-owner-monitor', label: 'Monitor Kasir', icon: 'fa-users' },
              { id: 'view-owner-laporan', label: 'Laporan Owner', icon: 'fa-file-lines' },
              { id: 'view-owner-grafik', label: 'Grafik Penjualan', icon: 'fa-chart-simple' },
              { id: 'view-owner-performa', label: 'Performa Kasir', icon: 'fa-chart-line' },
              { id: 'view-owner-absen', label: 'Absensi Karyawan', icon: 'fa-fingerprint' },
              { id: 'view-owner-izin', label: 'Izin Karyawan', icon: 'fa-calendar-day' },
              { id: 'view-owner-gaji', label: 'Penggajian', icon: 'fa-dollar-sign' },
              { id: 'view-owner-saldo', label: 'Manajemen Saldo', icon: 'fa-wallet' },
              { id: 'view-owner-audit', label: 'Audit Laci', icon: 'fa-file-signature' },
              { id: 'view-owner-backup', label: 'Backup & Reset', icon: 'fa-database' },
            ].map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-black text-[10px] uppercase tracking-wider transition-all duration-300 group outline-none",
                    isActive
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_4px_15px_-3px_rgba(245,158,11,0.5)] scale-[1.02] relative overflow-hidden"
                      : "text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1"
                  )}
                >
                  {isActive && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>}
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 relative z-10", isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-amber-400")}>
                    <i className={cn("fa-solid text-[10px]", item.icon)}></i>
                  </div>
                  <span className="relative z-10">{item.label}</span>
                  {isActive && <i className="fa-solid fa-chevron-right text-[8px] ml-auto opacity-70 relative z-10"></i>}
                </button>
              )
            })}
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-slate-800/60">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] px-3 mb-2 block">
            Pengaturan & Alat
          </span>
          <button
            onClick={() => setIsSidePanelOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-left font-black text-[10px] uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-800/50 hover:translate-x-1 transition-all duration-200 active:scale-95"
          >
            <i className="fa-solid fa-sliders text-xs w-4 text-center text-slate-500"></i>
            <span>Mode & Tema</span>
          </button>
        </div>
      </div>

      {/* Cashier Info & Logout Section */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between gap-2 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800/50 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
              KASIR AKTIF
            </p>
            <p className="text-[9px] font-black text-white truncate leading-tight uppercase">
              {kasirName || '---'}
            </p>
          </div>
          <span className={cn(
            "text-[6px] px-1.5 py-0.5 rounded-md font-black shrink-0 tracking-widest uppercase",
            kasirRole === 'owner' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
          )}>
            {kasirRole === 'owner' ? 'OWNER' : 'KASIR'}
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
