import React from 'react'
import { formatRupiah } from '../lib/utils'

interface SummaryCardsProps {
  totalAdmin: number
  totalVolume: number
  totalTransactions: number
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ totalAdmin, totalVolume, totalTransactions }) => {
  return (
    <div className="grid grid-cols-3 gap-2 summary-cards-container">
      {/* Total Transaksi */}
      <div className="relative overflow-hidden group bg-white border border-gray-100 rounded-2xl shadow-sm p-3 flex flex-col items-center justify-center text-center transition-all">
        <div className="w-6 h-6 mb-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
          <i className="fa-solid fa-receipt text-[10px]"></i>
        </div>
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Transaksi</span>
        <p className="font-black text-[11px] text-gray-900 leading-none tabular-nums">{totalTransactions}</p>
      </div>

      {/* Total Volume */}
      <div className="relative overflow-hidden group bg-white border border-gray-100 rounded-2xl shadow-sm p-3 flex flex-col items-center justify-center text-center transition-all">
        <div className="w-6 h-6 mb-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-200">
          <i className="fa-solid fa-chart-line text-[10px]"></i>
        </div>
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Volume</span>
        <p className="font-black text-[11px] text-gray-900 leading-none tabular-nums truncate w-full" title={formatRupiah(totalVolume)}>{formatRupiah(totalVolume)}</p>
      </div>

      {/* Total Admin */}
      <div className="relative overflow-hidden group bg-white border border-gray-100 rounded-2xl shadow-sm p-3 flex flex-col items-center justify-center text-center transition-all">
        <div className="w-6 h-6 mb-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-200">
          <i className="fa-solid fa-wallet text-[10px]"></i>
        </div>
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Profit</span>
        <p className="font-black text-[11px] text-gray-900 leading-none tabular-nums truncate w-full" title={formatRupiah(totalAdmin)}>{formatRupiah(totalAdmin)}</p>
      </div>
    </div>
  )
}

export default SummaryCards
