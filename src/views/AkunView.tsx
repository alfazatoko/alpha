import React from 'react'
import { cn } from '../lib/utils'

interface AkunViewProps {
  active: boolean
}

const AkunView: React.FC<AkunViewProps> = (props) => {
  return (
    <div className={cn("page-view hide-scrollbar bg-white", props.active && "active")}>
      <div className="px-5 pt-7 pb-4 border-b flex justify-between items-center">
        <h2 className="font-bold text-gray-800">Profil & Pengaturan</h2>
        <i className="fa-solid fa-gear text-gray-400"></i>
      </div>
      <div className="px-5 py-6">
        <div className="flex items-center gap-4 p-5 border border-blue-100 rounded-3xl mb-6 bg-blue-50/30">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg border-4 border-white">A</div>
          <div>
            <h3 className="font-bold text-base text-gray-800">Admin ALPHA</h3>
            <p className="text-xs text-gray-500">Agen Utama BRILink</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded">VERIFIED</span>
          </div>
        </div>
        
        <div className="space-y-3">
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
          <button className="w-full bg-red-50 text-red-600 rounded-2xl font-bold py-4 px-5 text-sm mt-6 shadow-sm hover:bg-red-100 transition-all">
            Keluar Aplikasi
          </button>
        </div>
        
        <p className="text-center text-[10px] text-gray-300 mt-10">Versi 1.0.0 (Production)</p>
      </div>
    </div>
  )
}

export default AkunView
