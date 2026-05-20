import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface SidePanelProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  theme: string
  setTheme: (theme: string) => void
  screenSize: string
  setScreenSize: (size: string) => void
  jamAbsen?: string
  kasirName?: string
  storeName?: string
  storeSubtext?: string
}

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, setIsOpen, theme, setTheme, screenSize, setScreenSize, jamAbsen, kasirName, storeName, storeSubtext }) => {
  return (
    <>
      <div className={cn("overlay", isOpen && "show")} onClick={() => setIsOpen(false)}></div>
      <div className={cn("side-panel", isOpen && "open")}>
        {/* Header Section */}
        <div className="p-6 border-b border-gray-300 bg-gray-50/50">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <img src="/logo_icon.png" className="w-10 h-10 rounded-xl shadow-md border border-white" alt="Logo" />
              <div>
                <h3 className="font-black text-xl text-blue-700 tracking-tighter leading-none">{storeName || 'ALFAZA CELL'}</h3>
                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-1">{storeSubtext || 'Pembukuan Agen brilink & Konter'}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-300 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="space-y-2.5">
            {[
              { label: 'Jam Sekarang', value: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), icon: 'fa-clock', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-gray-300' },
              { label: 'Hari, Tanggal', value: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }), icon: 'fa-calendar', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-gray-300' },
              { label: 'Nama Kasir', value: kasirName || '---', icon: 'fa-user-tie', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-gray-300' },
            ].map((item, i) => (
              <div key={i} className={cn("flex justify-between items-center p-3 rounded-2xl border shadow-sm", item.bg, item.border)}>
                <div className="flex items-center gap-2">
                  <i className={cn("fa-solid text-[10px]", item.icon, item.color)}></i>
                  <span className={cn("text-[9px] font-black uppercase tracking-wider", item.color)}>{item.label}</span>
                </div>
                <span className="text-[10px] font-black text-gray-800 uppercase">{item.value}</span>
              </div>
            ))}
            
            {/* Highlighted Jam Absen Card */}
            <div className="relative group mt-4">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-amber-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative flex justify-between items-center bg-gradient-to-br from-orange-500 to-amber-500 p-4 rounded-2xl border border-white/20 shadow-lg shadow-orange-100">
                <div className="flex flex-col">
                  <span className="text-white/70 text-[8px] font-black tracking-[0.2em] leading-none mb-1">DATA ABSENSI</span>
                  <span className="text-white text-[11px] font-black tracking-widest leading-none">JAM MASUK</span>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/30">
                  <span className="text-white text-lg font-black tabular-nums leading-none drop-shadow-md">{jamAbsen || '--:--:--'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-2xl border border-gray-300 mt-2 shadow-sm">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-[10px] text-emerald-600"></i>
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Status Aplikasi</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-700 text-[10px] font-black uppercase">AKTIF</span>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="p-6 border-b border-gray-300">
          <h4 className="text-[10px] font-black text-gray-700 mb-4 uppercase tracking-[0.2em]">Tema Aplikasi</h4>
          <div className="flex items-center gap-4">
            {[
              { id: 'light', color: 'bg-white', ring: 'border-gray-200' },
              { id: 'blue', color: 'bg-gradient-to-br from-gray-500 to-gray-800', ring: 'border-gray-500' },
              { id: 'neon', color: 'bg-gradient-to-br from-green-300 to-green-500', ring: 'border-green-600' }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setTheme(t.id)} 
                className={cn("w-12 h-12 rounded-2xl border-2 shadow-sm flex items-center justify-center transition-all hover:scale-110 active:scale-90", 
                  t.color,
                  theme === t.id ? "border-blue-500 ring-4 ring-blue-500/10" : "border-gray-300 bg-gray-200"
                )}
              >
                <div className={cn("w-6 h-6 rounded-lg shadow-inner", theme === t.id ? "bg-blue-500" : "bg-white/50")}></div>
              </button>
            ))}
          </div>
        </div>

        {/* Layout Settings */}
        <div className="p-6 pb-12">
          <h4 className="text-[10px] font-black text-gray-700 mb-4 uppercase tracking-[0.2em]">Mode Tampilan</h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'hp', label: 'Smartphone', icon: 'fa-mobile-screen' },
              { id: 'tablet', label: 'Tablet', icon: 'fa-tablet-screen-button' },
              { id: 'pc', label: 'Mode PC', icon: 'fa-desktop' }
            ].map(size => (
              <button 
                key={size.id}
                onClick={() => setScreenSize(size.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5",
                  screenSize === size.id ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white border-gray-200 text-gray-600 hover:border-blue-200 hover:text-blue-400"
                )}
              >
                <i className={cn("fa-solid text-base", size.icon)}></i>
                <span className="text-[8px] font-black uppercase tracking-tighter text-center leading-tight">{size.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
             <p className="text-[9px] text-blue-600 font-bold uppercase leading-relaxed text-center">
               <i className="fa-solid fa-circle-info mr-1"></i> Mode Otomatis direkomendasikan untuk pengalaman terbaik.
             </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default SidePanel
