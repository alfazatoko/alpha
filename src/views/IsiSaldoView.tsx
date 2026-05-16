import React, { useRef } from 'react'
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
}

const IsiSaldoView: React.FC<IsiSaldoViewProps> = (props) => {
  const nominalRef = useRef<HTMLInputElement>(null)
  const keteranganRef = useRef<HTMLTextAreaElement>(null)

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
      <div className="px-4 pt-7 pb-4 border-b flex justify-between items-center bg-indigo-600 text-white shadow-lg">
        <button 
          onClick={() => props.setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="text-center">
          <h2 className="font-black text-xs uppercase tracking-widest leading-none">MANAJEMEN SALDO</h2>
          <p className="text-[8px] text-white/50 mt-1 font-bold">ALFAZA CELL</p>
        </div>
        <button 
          onClick={() => props.setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="px-5 pt-6 pb-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-b-[2rem] shadow-lg mb-6">
        <div className="flex items-center justify-between">
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
            <select 
              value={props.isiJenis}
              onChange={(e) => props.setIsiJenis(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, nominalRef)}
              className="form-input-modern w-full"
            >
              <option value="" disabled>Pilih jenis saldo</option>
              <option value="Saldo Bank">🏦 Saldo Bank (Plafon)</option>
              <option value="Saldo Real Aplikasi">📱 Saldo Real Aplikasi (HP)</option>
              <option value="Modal Tunai Kasir">💵 Modal Tunai Kasir</option>
            </select>
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
