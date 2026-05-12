import React from 'react'
import { Home, Clock, Wallet, BarChart2, User } from 'lucide-react'
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
  const items = [
    { id: 'view-beranda', label: 'Beranda', Icon: Home },
    { id: 'view-transaksi', label: 'Riwayat', Icon: Clock },
    { id: 'view-isi-saldo', label: 'Isi Saldo', Icon: Wallet },
    { id: 'view-laporan', label: 'Laporan', Icon: BarChart2 },
    { id: 'view-akun', label: 'Akun', Icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 pb-6 z-50">
      <ul className="flex justify-around items-center max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = activeView === item.id
          return (
            <li 
              key={item.id} 
              className="flex-1"
              onClick={() => setActiveView(item.id)}
            >
              <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-transparent text-gray-900 group-hover:bg-gray-50"
                )}>
                  <item.Icon className={cn("w-6 h-6", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
                </div>
                <span className={cn(
                  "text-[10px] font-bold tracking-tight transition-colors duration-300",
                  isActive ? "text-blue-600" : "text-gray-900"
                )}>
                  {item.label}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default Navigation
