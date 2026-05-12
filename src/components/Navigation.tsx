import React, { useState } from 'react'
import { Home, Clock, Wallet, BarChart2, User, ChevronDown, ChevronUp } from 'lucide-react'
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
    { id: 'view-transaksi', label: 'Riwayat', Icon: Clock },
    { id: 'view-isi-saldo', label: 'Isi Saldo', Icon: Wallet },
    { id: 'view-laporan', label: 'Laporan', Icon: BarChart2 },
    { id: 'view-akun', label: 'Akun', Icon: User },
  ]

  return (
    <>
      <button 
        onClick={() => setIsVisible(!isVisible)}
        className={cn(
          "fixed right-10 z-[60] w-8 h-8 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-blue-600 transition-all duration-300 active:scale-90",
          isVisible ? "bottom-[48px]" : "bottom-6"
        )}
      >
        {isVisible ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      <nav className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-1.5 z-50 transition-all duration-500 transform shadow-[0_-4px_20px_rgba(0,0,0,0.03)]",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}>
        <ul className="flex justify-around items-center max-w-lg mx-auto">
          {items.map((item) => {
            const isActive = activeView === item.id
            return (
              <li 
                key={item.id} 
                className="flex-1"
                onClick={() => setActiveView(item.id)}
              >
                <div className="flex flex-col items-center cursor-pointer group py-1">
                  <div className={cn(
                    "transition-all duration-300 mb-0.5",
                    isActive ? "text-blue-600 scale-110" : "text-gray-400 group-hover:text-gray-600"
                  )}>
                    <item.Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
                  </div>
                  <span className={cn(
                    "text-[9px] font-black tracking-tight transition-colors duration-300",
                    isActive ? "text-blue-600" : "text-gray-400"
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
