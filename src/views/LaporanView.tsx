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
  kasirRole?: string
  filterKasir?: string
  setFilterKasir?: (v: string) => void
  filterTanggal: string
  setFilterTanggal: (v: string) => void
  saldoReal: number
  onEdit: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => void
}

const LaporanView: React.FC<LaporanViewProps> = (props) => {

  return (
    <div className={cn("page-view hide-scrollbar bg-gray-50/50", props.active && "active")}>
      <div className="px-1.5 pt-5 pb-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-b-[2rem] shadow-lg shadow-emerald-500/20 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg tracking-wide">Laporan Keuangan</h2>
            <p className="text-emerald-100 text-[11px] mt-1 opacity-90">Rekapitulasi transaksi & laba</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
            <i className="fa-solid fa-chart-line text-white"></i>
          </div>
        </div>
        {props.kasirRole === 'owner' && props.setFilterKasir && (
          <div className="mt-3 bg-white/10 p-2 rounded-xl border border-white/20 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider"><i className="fa-solid fa-user-tie mr-1"></i> Mode Pantau Kasir:</span>
            <div className="relative">
              <select 
                value={props.filterKasir || 'Semua'}
                onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                className="bg-white bg-none text-emerald-700 text-[10px] font-black rounded-lg pl-2 pr-6 py-1 outline-none border-none appearance-none cursor-pointer"
              >
                <option value="Semua">Semua Kasir</option>
                {/* Dynamically render options if kasirList is available in App.tsx passes it, 
                    but for now sticking to the existing hardcoded ones if that's what was there or improving it.
                    Actually, I should check if props.kasirList exists here. 
                */}
                <option value="kasir1">Kasir 1</option>
                <option value="kasir2">Kasir 2</option>
              </select>
              <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[7px] text-emerald-400 pointer-events-none"></i>
            </div>
          </div>
        )}

        <div className="mt-3 bg-white/10 p-2 rounded-xl border border-white/20 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider flex-shrink-0"><i className="fa-solid fa-calendar-day mr-1"></i> Tanggal Laporan:</span>
          <div className="flex items-center gap-2 flex-grow">
            <input 
              type="date"
              defaultValue={props.filterTanggal}
              id="input-tanggal-laporan"
              className="bg-white text-emerald-700 text-[10px] font-black rounded-lg px-2 py-1 outline-none border-none flex-grow"
            />
            <button 
              onClick={() => {
                const el = document.getElementById('input-tanggal-laporan') as HTMLInputElement;
                if (el) props.setFilterTanggal(el.value);
              }}
              className="bg-emerald-800 text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all uppercase tracking-widest"
            >
              Cek
            </button>
          </div>
        </div>
      </div>

      <div className="px-1.5 pb-5 space-y-2.5">
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
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="py-2.5 font-bold uppercase text-[11px] tracking-wider">Kategori</th>
                  <th className="py-2.5 font-bold uppercase text-[11px] tracking-wider">Qty</th>
                  <th className="py-2.5 font-bold uppercase text-[11px] tracking-wider">Nominal</th>
                  <th className="py-2.5 font-bold uppercase text-[11px] tracking-wider">Laba</th>
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
                        <span className={cn("px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap", catColor)}>
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

        <div className="space-y-4">
          {/* KAS MASUK */}
          <div>
            <h4 className="text-[13px] font-extrabold text-emerald-600 mb-1.5 tracking-widest uppercase flex items-center gap-1.5">
              <i className="fa-solid fa-arrow-down-long"></i> KAS MASUK
            </h4>
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-emerald-100 space-y-1">
              <div className="flex justify-between items-center bg-gray-50/50 px-3 py-1.5 rounded-xl border border-gray-100/50">
                <span className="text-[14px] font-bold text-gray-700 flex items-center gap-2"><i className="fa-solid fa-vault text-[13px]"></i> Modal Tunai Kasir</span>
                <span className="font-black text-[15px] text-gray-800">{formatRupiah(props.kasModal)}</span>
              </div>
              <div className="flex justify-between items-center bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50">
                <span className="text-[14px] font-bold text-blue-700 flex items-center gap-2"><i className="fa-solid fa-globe text-[13px]"></i> Penjualan Digital</span>
                <span className="font-black text-[15px] text-blue-600">{formatRupiah(props.penjualanDigital)}</span>
              </div>
              <div className="flex justify-between items-center bg-fuchsia-50/50 px-3 py-1.5 rounded-xl border border-fuchsia-100/50">
                <span className="text-[14px] font-bold text-fuchsia-700 flex items-center gap-2"><i className="fa-solid fa-headphones text-[13px]"></i> Penjualan Aksesoris</span>
                <span className="font-black text-[15px] text-fuchsia-600">{formatRupiah(props.totalAksesoris)}</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50/50 px-3 py-1.5 rounded-xl border border-emerald-100/50">
                <span className="text-[14px] font-bold text-emerald-700 flex items-center gap-2"><i className="fa-solid fa-piggy-bank text-[13px]"></i> Total Admin Fee</span>
                <span className="font-black text-[15px] text-emerald-600">{formatRupiah(props.totalAdmin)}</span>
              </div>
            </div>
          </div>

          {/* KAS KELUAR */}
          <div>
            <h4 className="text-[13px] font-extrabold text-rose-600 mb-1.5 tracking-widest uppercase flex items-center gap-1.5">
              <i className="fa-solid fa-arrow-up-long"></i> KAS KELUAR
            </h4>
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-rose-100 space-y-1">
              <div className="flex justify-between items-center bg-rose-50/50 px-3 py-1.5 rounded-xl border border-rose-100/50">
                <span className="text-[14px] font-bold text-rose-700 flex items-center gap-2"><i className="fa-solid fa-money-bill-transfer text-[13px]"></i> Tarik Tunai Nasabah</span>
                <span className="font-black text-[15px] text-rose-600">-{formatRupiah(props.totalTarik)}</span>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <div className="bg-[#051c5f] px-3 py-2.5 rounded-xl flex justify-between items-center shadow-lg">
              <span className="font-bold text-[13px] text-blue-100 tracking-wider uppercase">Total Saldo Laci Kasir</span>
              <span className="font-black text-[19px] text-green-400">{formatRupiah(props.totalSaldoKas)}</span>
            </div>
          </div>

          {/* JURNAL PENYESUAIAN SALDO */}
          <div className="bg-white border-2 border-indigo-100 rounded-3xl p-4 shadow-xl shadow-indigo-500/10">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[14px] font-black text-indigo-800 tracking-widest uppercase flex items-center gap-2">
                <i className="fa-solid fa-scale-balanced text-indigo-500"></i> JURNAL PENYESUAIAN SALDO
              </h4>
              <span className="text-[11px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black uppercase">Otomatis</span>
            </div>
            
            <div className="space-y-2">
              {/* 1. MODAL SALDO BANK */}
              <div className="flex justify-between items-center p-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                <div>
                  <p className="text-[12px] font-bold text-indigo-700 uppercase tracking-tight">1. Modal Saldo Bank (Isi)</p>
                  <p className="text-[11px] text-indigo-400 font-medium italic -mt-0.5">Total pengisian/setoran saldo hari ini</p>
                </div>
                <span className="font-black text-[14px] text-indigo-900">
                  {formatRupiah(props.transactions.filter(t => t.kategori === 'Isi Saldo Bank').reduce((s, t) => s + t.nominal, 0))}
                </span>
              </div>

              {/* 2. PENJUALAN DIGITAL */}
              <div className="flex justify-between items-center p-2 bg-orange-50/50 rounded-xl border border-orange-100/50">
                <div>
                  <p className="text-[12px] font-bold text-orange-700 uppercase tracking-tight">2. Penjualan Digital</p>
                  <p className="text-[11px] text-orange-400 font-medium italic -mt-0.5">Saldo yang sudah terpakai transaksi</p>
                </div>
                <span className="font-black text-[14px] text-orange-900">-{formatRupiah(props.penjualanDigital)}</span>
              </div>

              {/* 3. SISA SALDO (CATATAN BUKU) */}
              {(() => {
                const modalBank = props.transactions.filter(t => t.kategori === 'Isi Saldo Bank').reduce((s, t) => s + t.nominal, 0);
                const sisaBuku = modalBank - props.penjualanDigital;
                return (
                  <div className="flex justify-between items-center p-2 bg-blue-50/80 rounded-xl border-2 border-blue-100">
                    <div>
                      <p className="text-[12px] font-bold text-blue-700 uppercase tracking-tight">3. Sisa Saldo (Catatan Buku)</p>
                      <p className="text-[11px] text-blue-400 font-medium italic -mt-0.5">Uang yang seharusnya ada di bank</p>
                    </div>
                    <span className="font-black text-[14px] text-blue-900">{formatRupiah(sisaBuku)}</span>
                  </div>
                );
              })()}

              {/* 4. SALDO REAL APLIKASI (OTOMATIS) */}
              <div className="flex justify-between items-center p-2 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                <div>
                  <p className="text-[12px] font-bold text-emerald-700 uppercase tracking-tight">4. Saldo Real Aplikasi (HP)</p>
                  <p className="text-[11px] text-emerald-400 font-medium italic -mt-0.5 whitespace-nowrap">Input melalui menu 'Isi Saldo'</p>
                </div>
                <span className="font-black text-[14px] text-emerald-900">{formatRupiah(props.saldoReal)}</span>
              </div>

              {/* STATUS KLOP / SELISIH */}
              {(() => {
                const modalBank = props.transactions.filter(t => t.kategori === 'Isi Saldo Bank').reduce((s, t) => s + t.nominal, 0);
                const sisaBuku = modalBank - props.penjualanDigital;
                const selisih = props.saldoReal - sisaBuku;
                
                return (
                  <div className={cn(
                    "mt-3 p-4 rounded-2xl flex justify-between items-center border-2",
                    selisih === 0 ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/30" : 
                    selisih > 0 ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30" : "bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-500/30"
                  )}>
                    <div>
                      <p className="text-[13px] font-black uppercase tracking-widest flex items-center gap-2">
                        {selisih === 0 ? <><i className="fa-solid fa-circle-check"></i> STATUS: KLOP</> : 
                         selisih > 0 ? <><i className="fa-solid fa-circle-exclamation"></i> STATUS: SURPLUS</> : 
                         <><i className="fa-solid fa-circle-xmark"></i> STATUS: SELISIH</>}
                      </p>
                      <p className="text-[11px] opacity-90 font-bold italic mt-0.5">
                        {selisih === 0 ? 'Sisa saldo di HP cocok dengan catatan buku' : 
                         selisih > 0 ? 'Saldo di HP lebih besar dari catatan' : 'Saldo di HP lebih kecil (Uang kurang)'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-[17px] block">{selisih === 0 ? '✓ MATCH' : formatRupiah(selisih)}</span>
                      {selisih !== 0 && <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">Periksa Kembali</span>}
                    </div>
                  </div>
                );
              })()
            }
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}

export default LaporanView
