import React from 'react'
import { formatRupiah } from '../lib/utils'

interface SummaryCardsProps {
  totalAdmin: number
  totalVolume: number
  totalTransactions: number
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ totalAdmin, totalVolume, totalTransactions }) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between py-2 px-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-600">
            <i className="fa-solid fa-arrow-right-arrow-left text-[10px]"></i>
          </div>
          <span className="text-[12px] font-bold text-gray-900 uppercase">Total Transaksi</span>
        </div>
        <div className="text-right">
          <p className="font-black text-[14px] text-black">{totalTransactions}</p>
        </div>
      </div>
      <div className="flex items-center justify-between py-2 px-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center text-purple-600">
            <i className="fa-solid fa-chart-bar text-[10px]"></i>
          </div>
          <span className="text-[12px] font-bold text-gray-900 uppercase">Total Volume</span>
        </div>
        <div className="text-right">
          <p className="font-black text-[14px] text-black">{formatRupiah(totalVolume)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between py-2 px-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
            <i className="fa-solid fa-coins text-[10px]"></i>
          </div>
          <span className="text-[12px] font-bold text-gray-900 uppercase">Total Admin</span>
        </div>
        <div className="text-right">
          <p className="font-black text-[14px] text-black">{formatRupiah(totalAdmin)}</p>
        </div>
      </div>
    </div>
  )
}

export default SummaryCards
