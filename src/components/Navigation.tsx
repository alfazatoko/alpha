import React, { useState } from 'react'
import { Home, Receipt, Plus, BarChart2, User, ChevronRight, ChevronLeft } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface NavigationProps {
  activeView: string
  setActiveView: (view: string) => void
}

const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView }) => {
  const [isVisible, setIsVisible] = useState(true)
  
  const items = [
    { id: 'view-beranda', label: 'Beranda', Icon: Home },
    { id: 'view-transaksi', label: 'Riwayat', Icon: Receipt },
    { id: 'view-input-transaksi', label: 'Transaksi', Icon: Plus, isFloating: true },
    { id: 'view-laporan', label: 'Laporan', Icon: BarChart2 },
    { id: 'view-akun', label: 'Akun', Icon: User },
  ]

  return (
    <>
      {/* 
        Tombol "Tarik" (<) di ujung kanan layar 
        Hanya muncul saat navbar disembunyikan
      */}
      <button 
        onClick={() => setIsVisible(true)}
        className={cn(
          "fixed right-0 z-[160] w-10 h-14 bg-blue-600 text-white rounded-l-2xl shadow-[-4px_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center transition-all duration-500 active:scale-95",
          isVisible ? "bottom-8 translate-x-full opacity-0 pointer-events-none" : "bottom-8 translate-x-0 opacity-100"
        )}
      >
        <ChevronLeft size={24} />
      </button>

      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-[150] transition-all duration-500 transform pb-safe max-w-[440px] mx-auto",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}>
        <div className="relative w-full h-[64px] filter drop-shadow-[0_-6px_20px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_-6px_20px_rgba(0,0,0,0.4)]">
          
          <div className="absolute inset-0 w-full h-full flex justify-center pointer-events-none">
            {/* Sayap Kiri: Ujung atas melengkung halus dengan gradasi & garis pembatas abu-abu */}
            <div className="flex-1 bg-gradient-to-b from-slate-100/90 via-white to-white dark:from-slate-800 dark:via-slate-900 dark:to-slate-900 h-full rounded-tl-[24px] rounded-tr-none rounded-b-none border-t border-slate-300 dark:border-slate-700 -mr-[1px]"></div>
            
            {/* 
              Lekukan Notch Tengah:
              Memiliki gradasi abu-abu tipis dan garis pembatas (stroke) melingkar yang jelas.
            */}
            <svg 
              width="140" 
              height="64" 
              viewBox="0 0 140 64" 
              className="shrink-0 relative z-0" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="navWhiteGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e2e8f0" />
                  <stop offset="25%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
                <linearGradient id="navDarkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="25%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>

              {/* Body Fill dengan gradasi abu-abu agar pembatas terlihat tegas */}
              <path 
                d="M 0 0 H 22 C 28 0, 33 3, 38 14 A 36 36 0 0 0 102 14 C 107 3, 112 0, 118 0 H 140 V 64 H 0 Z" 
                className="fill-[url(#navWhiteGrad)] dark:fill-[url(#navDarkGrad)]"
              />

              {/* Garis Pembatas Abu-abu (Stroke) Melingkari Lekukan dengan Jelas */}
              <path 
                d="M 0 0.5 H 22 C 28 0.5, 33 3.5, 38 14 A 36 36 0 0 0 102 14 C 107 3.5, 112 0.5, 118 0.5 H 140" 
                fill="none" 
                stroke="#cbd5e1" 
                strokeWidth="1.5" 
                className="stroke-slate-300 dark:stroke-slate-700" 
              />
            </svg>
            
            {/* Sayap Kanan: Ujung atas melengkung halus dengan gradasi & garis pembatas abu-abu */}
            <div className="flex-1 bg-gradient-to-b from-slate-100/90 via-white to-white dark:from-slate-800 dark:via-slate-900 dark:to-slate-900 h-full rounded-tr-[24px] rounded-tl-none rounded-b-none border-t border-slate-300 dark:border-slate-700 -ml-[1px]"></div>
          </div>

          {/* Tombol Sembunyikan (>) di pojok kanan atas navbar */}
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute -top-2.5 right-3 w-5 h-5 rounded-full bg-slate-200/90 dark:bg-slate-700/90 backdrop-blur text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center shadow-sm transition-all z-20 text-[10px]"
            title="Sembunyikan Menu"
          >
            <ChevronRight size={12} />
          </button>

          <nav className="relative h-full px-2">
            <ul className="flex justify-between items-center h-full w-full">
              {items.map((item) => {
                const isActive = activeView === item.id

                if (item.isFloating) {
                  return (
                    <li 
                      key={item.id} 
                      className="flex-[1.2] flex justify-center h-full relative"
                    >
                      <div 
                        onClick={() => setActiveView(item.id)}
                        className="absolute -top-[26px] flex flex-col items-center cursor-pointer group"
                      >
                        <div className="relative">
                          {/* Inner glow / shadow */}
                          <div className={cn(
                            "absolute inset-0 rounded-full blur-md translate-y-1.5 transition-all duration-500",
                            isActive ? "bg-blue-600/40 dark:bg-blue-500/30 animate-pulse" : "bg-black/15"
                          )}></div>
                          
                          {/* Tombol Lingkaran Tengah */}
                          <div className={cn(
                            "w-[56px] h-[56px] rounded-full flex items-center justify-center text-white relative z-10 transition-all duration-300 shadow-md",
                            isActive 
                              ? "bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-600/50 scale-105 ring-4 ring-white dark:ring-slate-900" 
                              : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30 active:scale-95 group-hover:scale-105"
                          )}>
                            <item.Icon className={cn(
                              "w-7 h-7 transition-transform duration-300",
                              isActive ? "scale-105 stroke-[2.5px]" : "stroke-[2.5px]"
                            )} />
                          </div>
                        </div>
                        {/* Label teks di bawah notch */}
                        <span className={cn(
                          "mt-1 text-[10px] tracking-tight transition-colors duration-300 w-max",
                          isActive ? "font-bold text-blue-600 dark:text-blue-400" : "font-medium text-slate-500 dark:text-slate-400"
                        )}>
                          {item.label}
                        </span>
                      </div>
                    </li>
                  )
                }

                return (
                  <li 
                    key={item.id} 
                    className="flex-1 flex justify-center h-full items-center"
                    onClick={() => setActiveView(item.id)}
                  >
                    <div className="flex flex-col items-center cursor-pointer group py-0.5">
                      {/* Kolom/Grid Bulat Berwarna untuk tombol yang dipilih (Active Tab) */}
                      <div className={cn(
                        "transition-all duration-300 mb-0.5 flex items-center justify-center rounded-full w-9 h-9",
                        isActive 
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/40 scale-105" 
                          : "text-slate-400 dark:text-slate-500 group-hover:bg-slate-100 dark:group-hover:bg-slate-800/40 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                      )}>
                        <item.Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
                      </div>
                      {/* Teks Label Berwarna */}
                      <span className={cn(
                        "text-[9.5px] tracking-tight transition-colors duration-300",
                        isActive ? "font-bold text-blue-600 dark:text-blue-400" : "font-medium text-slate-500 dark:text-slate-400"
                      )}>
                        {item.label}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}

export default Navigation
