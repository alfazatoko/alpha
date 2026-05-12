import React from 'react'
import { formatRupiah, cn } from '../lib/utils'
import type { Transaction } from '../types'

interface LaporanViewProps {
  active: boolean
  saldoBank: number
  totalPenjualan: number
  transactions: Transaction[]
  totalTarik: number
  totalAdmin: number
  totalAksesoris: number
  totalVolume: number
  totalSaldoKas: number
  penjualanDigital: number
  kasModal: number
}

const LaporanView: React.FC<LaporanViewProps> = (props) => {
  return (
    <div className={cn("page-view hide-scrollbar bg-gray-50/50", props.active && "active")}>
      <div className="px-5 pt-5 pb-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-b-[2rem] shadow-lg shadow-emerald-500/20 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg tracking-wide">Laporan Keuangan</h2>
            <p className="text-emerald-100 text-[11px] mt-1 opacity-90">Rekapitulasi transaksi & laba</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
            <i className="fa-solid fa-chart-line text-white"></i>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-2.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-3xl shadow-lg shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest flex items-center gap-1.5"><i className="fa-solid fa-building-columns"></i> Saldo Bank</p>
            <p className="text-base font-black text-white mt-2 drop-shadow-sm">{formatRupiah(props.saldoBank)}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-4 rounded-3xl shadow-lg shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            <p className="text-[10px] text-emerald-50 font-bold uppercase tracking-widest flex items-center gap-1.5"><i className="fa-solid fa-cash-register"></i> Saldo Laci Kasir</p>
            <p className="text-base font-black text-white mt-2 drop-shadow-sm">{formatRupiah(props.totalSaldoKas)}</p>
          </div>
        </div>
        
        <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm">
          <h3 className="font-extrabold text-[10px] text-gray-800 mb-1.5 tracking-widest uppercase flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-indigo-500"></i> Rekap per Kategori
          </h3>
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="py-2.5 font-bold uppercase text-[9px] tracking-wider">Kategori</th>
                  <th className="py-2.5 font-bold uppercase text-[9px] tracking-wider">Qty</th>
                  <th className="py-2.5 font-bold uppercase text-[9px] tracking-wider">Nominal</th>
                  <th className="py-2.5 font-bold uppercase text-[9px] tracking-wider">Laba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota', 'Tarik Tunai', 'Aksesoris'].map(cat => {
                  const filtered = props.transactions.filter(t => t.kategori === cat)
                  if (filtered.length === 0) return null
                  
                  // Warna dinamis berdasarkan kategori
                  let catColor = "bg-gray-100 text-gray-600";
                  if (cat === 'Transfer Bank') catColor = "bg-blue-100 text-blue-700";
                  if (cat === 'DANA') catColor = "bg-cyan-100 text-cyan-700";
                  if (cat === 'FLIP') catColor = "bg-orange-100 text-orange-700";
                  if (cat === 'Order Kuota') catColor = "bg-emerald-100 text-emerald-700";
                  if (cat === 'Tarik Tunai') catColor = "bg-rose-100 text-rose-700";
                  if (cat === 'Aksesoris') catColor = "bg-fuchsia-100 text-fuchsia-700";

                  return (
                    <tr key={cat} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-2 pr-2">
                        <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap", catColor)}>
                          {cat === 'Tarik Tunai' ? 'Tarik Tunai Nasabah' : 
                           cat === 'Aksesoris' ? 'Penjualan Aksesoris' : cat}
                        </span>
                      </td>
                      <td className="font-medium text-gray-600">{filtered.length}</td>
                      <td className="font-semibold text-gray-800">{formatRupiah(filtered.reduce((s,t) => s+t.nominal, 0))}</td>
                      <td className="font-bold text-emerald-600">{formatRupiah(filtered.reduce((s,t) => s+t.adminFee, 0))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 space-y-1">
          <div className="flex justify-between items-center bg-gray-50/50 px-3 py-1.5 rounded-xl border border-gray-100/50">
            <span className="text-[11px] font-bold text-gray-700 flex items-center gap-2"><i className="fa-solid fa-vault text-[10px]"></i> Modal Tunai Kasir</span>
            <span className="font-black text-xs text-gray-800">{formatRupiah(props.kasModal)}</span>
          </div>
          <div className="flex justify-between items-center bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50">
            <span className="text-[11px] font-bold text-blue-700 flex items-center gap-2"><i className="fa-solid fa-globe text-[10px]"></i> Penjualan Digital</span>
            <span className="font-black text-xs text-blue-600">{formatRupiah(props.penjualanDigital)}</span>
          </div>
          <div className="flex justify-between items-center bg-fuchsia-50/50 px-3 py-1.5 rounded-xl border border-fuchsia-100/50">
            <span className="text-[11px] font-bold text-fuchsia-700 flex items-center gap-2"><i className="fa-solid fa-headphones text-[10px]"></i> Penjualan Aksesoris</span>
            <span className="font-black text-xs text-fuchsia-600">{formatRupiah(props.totalAksesoris)}</span>
          </div>
          <div className="flex justify-between items-center bg-emerald-50/50 px-3 py-1.5 rounded-xl border border-emerald-100/50">
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-2"><i className="fa-solid fa-piggy-bank text-[10px]"></i> Total Admin Fee</span>
            <span className="font-black text-xs text-emerald-600">{formatRupiah(props.totalAdmin)}</span>
          </div>
          <div className="flex justify-between items-center bg-rose-50/50 px-3 py-1.5 rounded-xl border border-rose-100/50">
            <span className="text-[11px] font-bold text-rose-700 flex items-center gap-2"><i className="fa-solid fa-money-bill-transfer text-[10px]"></i> Tarik Tunai Nasabah</span>
            <span className="font-black text-xs text-rose-600">-{formatRupiah(props.totalTarik)}</span>
          </div>
          
          <div className="pt-0.5">
            <div className="bg-[#051c5f] px-3 py-2.5 rounded-xl flex justify-between items-center shadow-lg">
              <span className="font-bold text-[10px] text-blue-100 tracking-wider uppercase">Total Saldo Laci Kasir</span>
              <span className="font-black text-base text-green-400">{formatRupiah(props.totalSaldoKas)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LaporanView
