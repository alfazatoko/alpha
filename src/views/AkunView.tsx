import React, { useState, useEffect } from 'react'
import { cn } from '../lib/utils'

interface AkunViewProps {
  active: boolean
  kasirName?: string
  kasirRole?: string
  onLogout?: () => void
  onRequestLogout?: () => void
}

const AkunView: React.FC<AkunViewProps> = (props) => {
  const initial = (props.kasirName || 'A').charAt(0).toUpperCase()
  const roleBadge = props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'
  const roleColor = props.kasirRole === 'owner' ? 'bg-amber-500 text-white shadow-sm' : 'bg-emerald-100 text-emerald-600'
  
  const [isPinEnabled, setIsPinEnabled] = useState(localStorage.getItem('alphaPro_isPinEnabled') !== 'false')

  const togglePin = () => {
    const newValue = !isPinEnabled
    setIsPinEnabled(newValue)
    localStorage.setItem('alphaPro_isPinEnabled', newValue.toString())
  }

  return (
    <div className={cn("page-view hide-scrollbar bg-white", props.active && "active")}>
      <div className="px-5 pt-7 pb-4 border-b flex justify-between items-center">
        <h2 className="font-bold text-gray-800">Profil & Pengaturan</h2>
        <i className="fa-solid fa-gear text-gray-400"></i>
      </div>
      <div className="px-5 py-6">
        <div className="flex items-center gap-4 p-5 border border-blue-100 rounded-3xl mb-6 bg-blue-50/30">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg border-4 border-white">{initial}</div>
          <div>
            <h3 className="font-bold text-base text-gray-800">{props.kasirName || 'Admin ALPHA'}</h3>
            <p className="text-xs text-gray-500">Agen BRILink & Ponsel</p>
            <span className={cn("inline-block mt-1 px-2 py-0.5 text-[10px] font-black rounded", roleColor)}>{roleBadge}</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Owner Only Settings */}
          {props.kasirRole === 'owner' && (
            <div className="mb-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Pengaturan Sistem</p>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm">
                    <i className="fa-solid fa-key text-xs"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Gunakan PIN Masuk</p>
                    <p className="text-[9px] text-gray-500 font-medium">Wajibkan PIN saat login</p>
                  </div>
                </div>
                <button 
                  onClick={togglePin}
                  className={cn(
                    "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                    isPinEnabled ? "bg-blue-600" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                    isPinEnabled ? "translate-x-6" : "translate-x-0"
                  )}></div>
                </button>
              </div>
            </div>
          )}

          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Menu Akun</p>
          
          <button className="w-full bg-white border border-gray-100 rounded-2xl font-semibold py-4 px-5 text-sm flex items-center justify-between shadow-sm hover:bg-gray-50 transition-all">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-user-pen text-blue-500"></i>
              <span>Edit Profil</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
          
          <button className="w-full bg-white border border-gray-100 rounded-2xl font-semibold py-4 px-5 text-sm flex items-center justify-between shadow-sm hover:bg-gray-50 transition-all">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-shield-halved text-emerald-500"></i>
              <span>Keamanan</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>

          <button 
            onClick={() => {
              props.onRequestLogout?.();
            }}
            className="w-full bg-red-50 text-red-600 rounded-2xl font-bold py-4 px-5 text-sm mt-6 shadow-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            Keluar Aplikasi
          </button>
        </div>
        
        <p className="text-center text-[10px] text-gray-300 mt-10">Versi 1.2.0 (Production)</p>
      </div>
    </div>
  )
}

export default AkunView
