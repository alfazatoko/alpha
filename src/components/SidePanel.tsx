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
}

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, setIsOpen, theme, setTheme, screenSize, setScreenSize }) => {
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
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Jam</span><span className="font-semibold">{new Date().toLocaleTimeString('id-ID')}</span></div>
            <div className="flex justify-between"><span>Hari, Tanggal</span><span className="font-semibold">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
            <div className="flex justify-between"><span>Status</span><span className="font-semibold text-green-600">Aktif</span></div>
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
