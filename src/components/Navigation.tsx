import React, { useState } from 'react'
import { Home, Receipt, Plus, BarChart2, User, ChevronDown, ChevronUp } from 'lucide-react'
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
      <button 
        onClick={() => setIsVisible(!isVisible)}
        className={cn(
          "fixed right-10 z-[160] w-8 h-8 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-blue-600 transition-all duration-300 active:scale-90",
          isVisible ? "bottom-[48px]" : "bottom-6"
        )}
      >
        {isVisible ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      <nav className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-1.5 z-[150] transition-all duration-500 transform shadow-[0_-4px_20px_rgba(0,0,0,0.03)]",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}>
        <ul className="flex justify-around items-end max-w-lg mx-auto h-[54px] pb-1">
          {items.map((item) => {
            const isActive = activeView === item.id

            if (item.isFloating) {
              return (
                <li 
                  key={item.id} 
                  className="flex-[1.2] flex justify-center h-full relative"
                  onClick={() => setActiveView(item.id)}
                >
                  <div className="absolute -top-6 flex flex-col items-center cursor-pointer group">
                    <div className="relative">
                      <div className={cn(
                        "absolute inset-0 rounded-full blur-md translate-y-1 transition-all duration-500",
                        isActive ? "bg-blue-600 opacity-60 animate-pulse" : "bg-blue-500 opacity-40"
                      )}></div>
                      <div className={cn(
                        "w-[52px] h-[52px] rounded-full flex items-center justify-center text-white border-[3px] border-white relative z-10 transition-all duration-500",
                        isActive 
                          ? "bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-110" 
                          : "bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm active:scale-95 group-hover:scale-105"
                      )}>
                        <item.Icon className={cn(
                          "w-7 h-7 stroke-[2.5px] transition-transform duration-500",
                          isActive ? "scale-110" : "scale-100"
                        )} />
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-black tracking-tight mt-1 transition-colors duration-300",
                      isActive ? "text-blue-700" : "text-slate-800"
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
                className="flex-1"
                onClick={() => setActiveView(item.id)}
              >
                <div className="flex flex-col items-center cursor-pointer group">
                  <div className={cn(
                    "transition-all duration-300 mb-0.5 flex items-center justify-center rounded-full w-8 h-8",
                    isActive ? "text-white bg-blue-600 shadow-md shadow-blue-500/40" : "text-slate-400 group-hover:text-slate-600"
                  )}>
                    <item.Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-black tracking-tight transition-colors duration-300",
                    isActive ? "text-blue-600" : "text-slate-500"
                  )}>
                    {item.label}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

export default Navigation
