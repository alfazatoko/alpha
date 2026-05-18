import React, { useRef, useState, useEffect } from 'react'
import { formatInputRupiah, cn } from '../lib/utils'

interface IsiSaldoViewProps {
  active: boolean
  setActiveView: (v: string) => void
  isiJenis: string
  setIsiJenis: (v: string) => void
  isiNominal: string
  setIsiNominal: (v: string) => void
  isiKeterangan: string
  setIsiKeterangan: (v: string) => void
  handleSimpanIsiSaldo: () => void
  isSaving?: boolean
  showToast: (m: string) => void
  storeName?: string
  storeSubtext?: string
  storePhoto?: string
  kasirName?: string
  kasirRole?: string
  setIsSidePanelOpen?: (v: boolean) => void
}

const IsiSaldoView: React.FC<IsiSaldoViewProps> = (props) => {
  const nominalRef = useRef<HTMLInputElement>(null)
  const keteranganRef = useRef<HTMLTextAreaElement>(null)

  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' })
  const fullDate = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const clockStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>, isLast: boolean = false) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isLast) {
        props.handleSimpanIsiSaldo()
      } else {
        nextRef?.current?.focus()
      }
    }
  }

  return (
    <div className={cn("page-view hide-scrollbar bg-gray-50/50", props.active && "active")}>
      {/* HEADER TOKO IDENTIK BERANDA */}
      <div className="relative theme-header" style={{ paddingBottom: '2.5rem' }}>
        <div className="px-4 pt-12 pb-2 flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {props.storePhoto ? (
                <img src={props.storePhoto} alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white/50 shadow-md" />
              ) : (
                <img src="/logo_icon.png" alt="Logo" className="w-12 h-12 object-contain" />
              )}
              <div>
                <h1 className="text-[13px] font-black text-white leading-tight uppercase tracking-widest">{props.storeName || 'ALFAZA CELL'}</h1>
                <p className="text-blue-200 text-[8px] font-bold uppercase tracking-tighter opacity-80">{props.storeSubtext || 'Pembukuan Agen brilink & Konter'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-white text-[10px] font-black">{props.kasirName}</span>
                  <span className={cn("text-[7px] px-1.5 py-0.5 rounded-full font-black", props.kasirRole === 'owner' ? "bg-amber-400 text-amber-900" : "bg-white/25 text-white")}>
                    {props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-blue-200 text-[8px] font-bold uppercase tracking-widest leading-none mb-1">{dayName}</p>
              <p className="text-white text-[10px] font-black tracking-tight leading-none mb-1">{fullDate}</p>
              <p className="text-blue-100 text-xs font-black tabular-nums tracking-widest">{clockStr}</p>
            </div>
          </div>

          <button onClick={() => props.setIsSidePanelOpen?.(true)} className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-90 hover:bg-white/20 transition-all">
            <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
          </button>
        </div>
      </div>

      <div className="px-1.5 pt-6 pb-5 bg-gradient-to-r from-indigo-700 to-blue-600 text-white rounded-b-[2rem] shadow-lg shadow-blue-500/20 mb-6" style={{ marginTop: '-2.5rem', position: 'relative', zIndex: 10 }}>
        <div className="px-2 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-sm tracking-wide">Pengaturan Saldo</h2>
            <p className="text-blue-100 text-[10px] opacity-90">Atur modal & rekap harian</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
            <i className="fa-solid fa-vault text-xs"></i>
          </div>
        </div>
      </div>

      <div className="px-1.5 pb-8 space-y-5">
        <div className="p-4 shadow-sm border border-gray-200 rounded-xl bg-white space-y-3">
          <h3 className="font-black text-black text-[11px] mb-3 flex items-center gap-2 uppercase tracking-tighter">
            <i className="fa-solid fa-vault text-blue-700"></i> MANAJEMEN SALDO
          </h3>
          
          <div>
            <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">JENIS SALDO</label>
            <div className="relative">
              <select 
                value={props.isiJenis}
                onChange={(e) => props.setIsiJenis(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, nominalRef)}
                className="form-input-modern w-full appearance-none pr-8"
              >
                <option value="" disabled>Pilih jenis saldo</option>
                <option value="Saldo Bank">🏦 Saldo Bank (Plafon)</option>
                <option value="Saldo Real Aplikasi">📱 Saldo Real Aplikasi (HP)</option>
                <option value="Modal Tunai Kasir">💵 Modal Tunai Kasir</option>
              </select>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">NOMINAL TOP-UP</label>
            <input 
              ref={nominalRef}
              type="text" 
              inputMode="numeric" 
              placeholder="0" 
              value={props.isiNominal}
              onChange={(e) => props.setIsiNominal(formatInputRupiah(e.target.value))}
              onKeyDown={(e) => handleKeyDown(e, keteranganRef)}
              className="form-input-modern w-full"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">KETERANGAN</label>
            <textarea 
              ref={keteranganRef}
              rows={2} 
              placeholder="Contoh: Setoran tunai sore hari..." 
              value={props.isiKeterangan}
              onChange={(e) => props.setIsiKeterangan(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, undefined, true)}
              className="form-input-modern w-full resize-none"
            ></textarea>
          </div>

          <button 
            onClick={props.handleSimpanIsiSaldo} 
            disabled={props.isSaving}
            className="w-full bg-blue-700 text-white text-[10px] font-black py-3 rounded-lg hover:bg-blue-800 shadow-md transition-all active:scale-95 uppercase tracking-widest mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
          >
            {props.isSaving ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fa-solid fa-cloud-arrow-up"></i>
            )}
            {props.isSaving ? 'MEMPROSES...' : 'SIMPAN SALDO'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default IsiSaldoView
