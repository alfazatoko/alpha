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

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-5">
          <div>
            <label className="text-[10px] font-extrabold text-indigo-600 mb-2 flex items-center gap-2 tracking-widest uppercase">
              <i className="fa-solid fa-wallet text-indigo-400"></i> Jenis Saldo
            </label>
            <select 
              value={props.isiJenis}
              onChange={(e) => props.setIsiJenis(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl py-3.5 px-4 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all outline-none appearance-none"
            >
              <option value="" disabled>Pilih jenis saldo</option>
              <option value="Saldo Bank">🏦 Saldo Bank</option>
              <option value="Modal Tunai Kasir">💵 Modal Tunai Kasir</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-emerald-600 mb-2 flex items-center gap-2 tracking-widest uppercase">
              <i className="fa-solid fa-coins text-emerald-400"></i> Nominal Top-Up
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-400 font-bold">Rp</span>
              <input 
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={props.isiNominal}
                onChange={(e) => props.setIsiNominal(formatInputRupiah(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-black text-gray-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-amber-600 mb-2 flex items-center gap-2 tracking-widest uppercase">
              <i className="fa-solid fa-note-sticky text-amber-400"></i> Keterangan Tambahan
            </label>
            <textarea 
              rows={2} 
              placeholder="Contoh: Setoran tunai sore hari..." 
              value={props.isiKeterangan}
              onChange={(e) => props.setIsiKeterangan(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl py-3.5 px-4 text-sm font-medium text-gray-700 resize-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 focus:bg-white transition-all outline-none"
            ></textarea>
          </div>
        </div>

        <button onClick={props.handleSimpanIsiSaldo} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold py-4 rounded-2xl hover:opacity-90 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 mt-2 flex items-center justify-center gap-2">
          <i className="fa-solid fa-check-circle"></i> KONFIRMASI TAMBAH SALDO
        </button>
      </div>
    </div>
  )
}

export default IsiSaldoView
