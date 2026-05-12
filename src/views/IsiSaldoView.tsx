import React from 'react'
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
}

const IsiSaldoView: React.FC<IsiSaldoViewProps> = (props) => {
  return (
    <div className={cn("page-view hide-scrollbar bg-gray-50/50", props.active && "active")}>
      <div className="px-5 pt-7 pb-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-b-[2rem] shadow-lg shadow-blue-500/20 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => props.setActiveView('view-beranda')} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-all">
            <i className="fa-solid fa-arrow-left text-sm text-white"></i>
          </button>
          <h2 className="font-bold text-lg tracking-wide text-white">Manajemen Saldo</h2>
        </div>
        <p className="text-blue-100 text-[11px] mt-2 opacity-90">Atur modal bank & rekap penjualan tunai</p>
      </div>

      <div className="px-5 pb-8 space-y-5">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100/50 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl"></div>
          <p className="text-xs text-blue-700 font-bold flex items-center gap-2">
            <i className="fa-solid fa-circle-info"></i> Panduan
          </p>
          <p className="text-[11px] text-blue-600/80 mt-1 leading-relaxed">Gunakan fitur ini untuk menambah modal bank atau mencatat hasil penjualan fisik ke sistem.</p>
        </div>

        <div className="p-4 shadow-sm border border-gray-200 rounded-xl bg-white space-y-3">
          <h3 className="font-black text-black text-[11px] mb-3 flex items-center gap-2 uppercase tracking-tighter">
            <i className="fa-solid fa-vault text-blue-700"></i> MANAJEMEN SALDO
          </h3>
          
          <div>
            <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">JENIS SALDO</label>
            <select 
              value={props.isiJenis}
              onChange={(e) => props.setIsiJenis(e.target.value)}
              className="form-input-modern w-full"
            >
              <option value="" disabled>Pilih jenis saldo</option>
              <option value="Saldo Bank">🏦 Saldo Bank</option>
              <option value="Modal Tunai Kasir">💵 Modal Tunai Kasir</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">NOMINAL TOP-UP (RP)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-black text-[10px] font-black">Rp</span>
              <input 
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={props.isiNominal}
                onChange={(e) => props.setIsiNominal(formatInputRupiah(e.target.value))}
                className="form-input-modern w-full pl-8"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">KETERANGAN</label>
            <textarea 
              rows={2} 
              placeholder="Contoh: Setoran tunai sore hari..." 
              value={props.isiKeterangan}
              onChange={(e) => props.setIsiKeterangan(e.target.value)}
              className="form-input-modern w-full resize-none"
            ></textarea>
          </div>

          <button onClick={props.handleSimpanIsiSaldo} className="w-full bg-blue-700 text-white text-[10px] font-black py-2.5 rounded-lg hover:bg-blue-800 shadow-md transition-all active:scale-95 uppercase tracking-widest">
            SIMPAN SALDO
          </button>
        </div>
      </div>
    </div>
  )
}

export default IsiSaldoView
