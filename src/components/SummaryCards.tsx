import React from 'react'
import { formatRupiah } from '../lib/utils'

interface SummaryCardsProps {
  totalAdmin: number
  totalVolume: number
  totalTransactions: number
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ totalAdmin, totalVolume, totalTransactions }) => {
  return (
    <div className="grid grid-cols-1 gap-3 summary-cards-container">
      {/* Total Transaksi */}
      <div className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="flex items-center justify-between py-3.5 px-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <i className="fa-solid fa-receipt text-[14px]"></i>
            </div>
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">Transaksi</span>
              <p className="font-black text-[18px] text-gray-900 leading-none tabular-nums">{totalTransactions}</p>
            </div>
          </div>
          <div className="w-1.5 h-8 rounded-full bg-blue-100/50"></div>
        </div>
      </div>

      {/* Total Volume */}
      <div className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="flex items-center justify-between py-3.5 px-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <i className="fa-solid fa-chart-line text-[14px]"></i>
            </div>
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">Volume</span>
              <p className="font-black text-[18px] text-gray-900 leading-none tabular-nums">{formatRupiah(totalVolume)}</p>
            </div>
          </div>
          <div className="w-1.5 h-8 rounded-full bg-purple-100/50"></div>
        </div>
      </div>

      {/* Total Admin */}
      <div className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="flex items-center justify-between py-3.5 px-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <i className="fa-solid fa-wallet text-[14px]"></i>
            </div>
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">Profit Admin</span>
              <p className="font-black text-[18px] text-gray-900 leading-none tabular-nums">{formatRupiah(totalAdmin)}</p>
            </div>
          </div>
          <div className="w-1.5 h-8 rounded-full bg-emerald-100/50"></div>
        </div>
      </div>
    </div>
  )
}

export default SummaryCards
