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
        "fixed bottom-1.5 left-4 right-4 z-[150] transition-all duration-500 transform pb-safe max-w-[400px] mx-auto",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-[150%] opacity-0"
      )}>
        <div className="relative w-full h-[60px] drop-shadow-[0_12px_28px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_12px_28px_rgba(0,0,0,0.4)]">
          
          <div className="absolute inset-0 w-full h-full flex justify-center pointer-events-none">
            <div className="flex-1 bg-white dark:bg-slate-900 h-full rounded-l-[2rem]"></div>
            
            {/* 
              Mathematically precise Notch using Circular Arc (A command).
              Notch Radius: 36px. Center at X=70, Y=-4.
              This guarantees a flawless uniform gap around the circular button.
            */}
            <svg 
              width="140" 
              height="60" 
              viewBox="0 0 140 60" 
              className="fill-white dark:fill-slate-900" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M 0 0 H 24 C 34 0, 37 8, 40 16 A 36 36 0 0 0 100 16 C 103 8, 106 0, 116 0 H 140 V 60 H 0 Z" />
            </svg>
            
            <div className="flex-1 bg-white dark:bg-slate-900 h-full rounded-r-[2rem]"></div>
          </div>

          {/* Tombol Sembunyikan (>) di dalam navbar paling kanan */}
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all z-20"
            title="Sembunyikan Menu"
          >
            <ChevronRight size={18} />
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
                        className="absolute -top-[32px] flex flex-col items-center cursor-pointer group"
                      >
                        <div className="relative">
                          {/* Inner shadow/pulse effect */}
                          <div className={cn(
                            "absolute inset-0 rounded-full blur-md translate-y-2 transition-all duration-500",
                            isActive ? "bg-blue-600/40 dark:bg-blue-500/30 animate-pulse" : "bg-black/10"
                          )}></div>
                          
                          {/* 
                            Button Radius = 28px (width 56px).
                            Button Center Y = -32 + 28 = -4px.
                            Matches Notch Center perfectly! Gap = 36 - 28 = 8px.
                          */}
                          <div className={cn(
                            "w-[56px] h-[56px] rounded-full flex items-center justify-center text-white relative z-10 transition-all duration-500",
                            isActive 
                              ? "bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_4px_20px_rgba(59,130,246,0.6)] scale-110 ring-[3px] ring-blue-50 dark:ring-slate-800" 
                              : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_8px_20px_rgba(59,130,246,0.4)] active:scale-95 group-hover:scale-105"
                          )}>
                            <item.Icon className={cn(
                              "w-7 h-7 transition-transform duration-500",
                              isActive ? "scale-110 stroke-[2.5px]" : "stroke-[2.5px]"
                            )} />
                          </div>
                        </div>
                        {/* 
                          Text perfectly centered in the 28px solid space below the notch.
                        */}
                        <span className={cn(
                          "absolute -bottom-[20px] text-[10px] tracking-tight transition-colors duration-300 w-max",
                          isActive ? "font-bold text-blue-700 dark:text-white" : "font-bold text-slate-500 dark:text-slate-400"
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
                    <div className="flex flex-col items-center cursor-pointer group">
                      {/* 
                        Circular background for the active state of normal buttons 
                      */}
                      <div className={cn(
                        "transition-all duration-300 mb-0.5 flex items-center justify-center rounded-full w-9 h-9",
                        isActive ? "bg-blue-600 text-white shadow-md shadow-blue-500/40" : "text-slate-400 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/30 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                      )}>
                        <item.Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
                      </div>
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
