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
}

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, setIsOpen, theme, setTheme, screenSize, setScreenSize, jamAbsen, kasirName }) => {
  return (
    <>
      <div className={cn("overlay", isOpen && "show")} onClick={() => setIsOpen(false)}></div>
      <div className={cn("side-panel", isOpen && "open")}>
        <div className="p-5 border-b">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-blue-600">ALPHA LINK</h3>
              <p className="text-xs text-gray-500 uppercase tracking-widest">ALFAZA CELL</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
          <div className="space-y-2 text-[10px] font-black uppercase tracking-tighter">
            <div className="flex justify-between items-center bg-blue-50 p-2.5 rounded-xl border border-blue-100">
              <span className="text-blue-600">Jam Sekarang</span>
              <span className="text-blue-900 font-black">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <div className="flex justify-between items-center bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
              <span className="text-indigo-600">Hari, Tanggal</span>
              <span className="text-indigo-900 font-black">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>

            <div className="flex justify-between items-center bg-amber-50 p-2.5 rounded-xl border border-amber-100">
              <span className="text-amber-600">Nama Kasir</span>
              <span className="text-amber-900 font-black">{kasirName || '---'}</span>
            </div>
            
            {/* Highlighted Jam Absen */}
            <div className="relative group my-4">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-amber-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex justify-between items-center bg-gradient-to-r from-orange-500 to-amber-500 p-3.5 rounded-2xl border border-orange-400 shadow-xl shadow-orange-200">
                <div className="flex flex-col">
                  <span className="text-white/80 text-[8px] font-black tracking-widest leading-none mb-1">DATA ABSENSI</span>
                  <span className="text-white text-[11px] font-black tracking-widest leading-none">JAM ABSEN</span>
                </div>
                <div className="text-right">
                  <span className="text-white text-lg font-black leading-none drop-shadow-md">{jamAbsen || '--:--:--'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-emerald-600">Status Aplikasi</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-900 font-black">AKTIF</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-b">
          <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Tema Aplikasi</h4>
          <div className="flex items-center gap-4">
            {[
              { id: 'light', color: 'bg-white', ring: 'border-gray-200' },
              { id: 'gray', color: 'bg-gray-400', ring: 'border-gray-500' },
              { id: 'neon', color: 'bg-green-400', ring: 'border-green-600' }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setTheme(t.id)} 
                className={cn("w-10 h-10 rounded-full border-2 shadow flex items-center justify-center transition hover:scale-110", 
                  t.color,
                  theme === t.id ? "border-blue-500 ring-2 ring-blue-500/20" : t.ring
                )}
              >
                <span className={cn("w-6 h-6 rounded-full opacity-50", t.id === 'light' ? 'bg-blue-100' : 'bg-white')}></span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Ukuran Layar (Simulasi)</h4>
          <div className="flex flex-wrap gap-2">
            {['auto', 'hp', 'tablet', 'pc'].map(size => (
              <button 
                key={size}
                onClick={() => setScreenSize(size)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-semibold transition-all uppercase",
                  screenSize === size ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {size}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">* Mode Auto menyesuaikan layar secara otomatis.</p>
        </div>
      </div>
    </>
  )
}

export default SidePanel
