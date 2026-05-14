import React, { useState } from 'react'
import { cn } from '../lib/utils'

interface AkunViewProps {
  active: boolean
  kasirName?: string
  kasirRole?: string
  onLogout?: () => void
  onRequestLogout?: () => void
  runningTexts?: string[]
  mainAnnouncement?: string
  onSaveRunningTexts?: (texts: string[]) => void
  onSaveMainAnnouncement?: (text: string) => void
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

              {/* Announcement Management */}
              <div className="mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Pengumuman & Teks Berjalan</p>
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-blue-600 uppercase tracking-tight ml-1 mb-1.5 block">Teks Utama (Highlight)</label>
                    <input 
                      type="text" 
                      value={props.mainAnnouncement || ''} 
                      onChange={(e) => props.onSaveMainAnnouncement?.(e.target.value)}
                      placeholder="Contoh: Promo Aksesoris 20%..."
                      className="w-full bg-gray-200 border border-gray-300 rounded-xl px-4 py-3 text-xs font-black text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Teks Tambahan (Max 15)</label>
                      <span className="text-[8px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Slide Otomatis</span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 hide-scrollbar">
                      {(props.runningTexts || Array(15).fill('')).map((text, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                          <span className="text-[8px] font-black text-gray-300 w-4">{idx + 1}</span>
                          <input 
                            type="text" 
                            value={text} 
                            onChange={(e) => {
                              const newTexts = [...(props.runningTexts || Array(15).fill(''))]
                              newTexts[idx] = e.target.value
                              props.onSaveRunningTexts?.(newTexts)
                            }}
                            placeholder={`Pesan ke-${idx + 1}...`}
                            className="flex-1 bg-gray-200 border border-gray-300 group-hover:border-gray-400 rounded-xl px-3 py-2 text-[11px] font-bold text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
