import React, { useState } from 'react'
import { formatRupiah, cn } from '../lib/utils'
import TransactionForm from '../components/TransactionForm'
import SummaryCards from '../components/SummaryCards'
import type { Transaction } from '../types'

interface BerandaViewProps {
  active: boolean
  setIsSidePanelOpen: (v: boolean) => void
  setActiveView: (v: string) => void
  saldoBank: number
  totalPenjualan: number
  lastTx?: Transaction
  formKategori: string
  setFormKategori: (v: string) => void
  formNominal: string
  setFormNominal: (v: string) => void
  formAdmin: string
  setFormAdmin: (v: string) => void
  formKeterangan: string
  setFormKeterangan: (v: string) => void
  handleSimpanTransaksi: () => void
  transactions: Transaction[]
  totalAdmin: number
  totalVolume: number
  totalAksesoris: number
  totalTarik: number
  totalSaldoKas: number
  penjualanDigital: number
  kasModal: number
  isSaving?: boolean
}
const BerandaView: React.FC<BerandaViewProps> = (props) => {
  const [showRincian, setShowRincian] = useState(false)
  const totalPendapatanBersih = props.totalSaldoKas
  const penjualanDigital = props.penjualanDigital
  const kasModal = props.kasModal

  return (
    <div className={cn("page-view hide-scrollbar", props.active && "active")}>
      <div className="px-5 pt-6 pb-2 flex justify-between items-center">
        <button onClick={() => props.setIsSidePanelOpen(true)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-900">
          <i className="fa-solid fa-ellipsis-vertical text-xs"></i>
        </button>
        <div className="flex-1 ml-3">
          <p className="text-gray-900 text-[10px] font-bold uppercase tracking-tight">Selamat datang,</p>
          <h1 className="text-lg font-black text-black leading-tight">
            ALPHA
            <span className="bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full ml-1 font-black">AGEN</span>
          </h1>
        </div>
      </div>

      <div className="mx-5 bg-gradient-to-br from-blue-700 to-blue-800 rounded-2xl p-4 text-white shadow-lg mb-3">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[9px] text-blue-50 font-black uppercase tracking-widest opacity-90">SALDO BANK</p>
            <h2 className="text-base font-black tracking-tight">{formatRupiah(props.saldoBank)}</h2>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-blue-50 font-black uppercase tracking-widest opacity-90">SALDO LACI KASIR</p>
            <h2 className="text-base font-black tracking-tight text-emerald-300">{formatRupiah(totalPendapatanBersih)}</h2>
          </div>
        </div>
        <button onClick={() => setShowRincian(true)} className="bg-white/20 hover:bg-white/30 transition text-white text-[9px] px-4 py-1.5 rounded-xl font-black backdrop-blur-md border border-white/20 w-full mt-1 uppercase tracking-widest">
          Detail rincian <i className="fa-solid fa-chevron-right ml-1 text-[7px]"></i>
        </button>
      </div>

      {showRincian && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-blue-600 p-5 text-white flex justify-between items-start">
              <div>
                <h3 className="font-black text-lg tracking-tight uppercase leading-none">RINCIAN KEUANGAN</h3>
                <p className="text-[10px] text-blue-100 opacity-90 mt-1.5">Rekapitulasi Arus Kas Hari Ini</p>
              </div>
              <button onClick={() => setShowRincian(false)} className="w-8 h-8 rounded-full bg-blue-700/50 flex items-center justify-center hover:bg-blue-800 transition-all shadow-inner">
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            
            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto hide-scrollbar">
              {/* KAS MASUK */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-green-700 flex items-center justify-center text-white text-[9px]">
                    <i className="fa-solid fa-arrow-down"></i>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-green-800 uppercase leading-none">KAS MASUK</h4>
                    <p className="text-[9px] text-gray-400 font-medium mt-0.5 opacity-80">Uang/cash masuk ke laci kasir</p>
                  </div>
                </div>

                <div className="space-y-3 pl-1.5">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-green-700 mt-1.5 opacity-60"></div>
                      <div>
                        <p className="text-xs font-black text-gray-800">Modal Tunai Kasir</p>
                        <p className="text-[9px] text-gray-400">Uang modal yang dimasukkan</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-green-700">Rp {Number(kasModal).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-green-700 mt-1.5 opacity-60"></div>
                      <div>
                        <p className="text-xs font-black text-gray-800">Penjualan Digital</p>
                        <p className="text-[9px] text-gray-400">Transfer, ewallet, pulsa, token, dll</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-green-700">Rp {penjualanDigital.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-green-700 mt-1.5 opacity-60"></div>
                      <div>
                        <p className="text-xs font-black text-gray-800">Penjualan Aksesoris</p>
                        <p className="text-[9px] text-gray-400">Aksesoris & barang</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-green-700">Rp {props.totalAksesoris.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-green-700 mt-1.5 opacity-60"></div>
                      <div>
                        <p className="text-xs font-black text-gray-800">Total Admin Fee</p>
                        <p className="text-[9px] text-gray-400">Total fee/komisi transaksi</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-green-700">Rp {props.totalAdmin.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-50"></div>

              {/* KAS KELUAR */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[9px]">
                    <i className="fa-solid fa-arrow-up"></i>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-red-700 uppercase leading-none">KAS KELUAR</h4>
                    <p className="text-[9px] text-gray-400 font-medium mt-0.5 opacity-80">Uang/cash keluar dari laci kasir</p>
                  </div>
                </div>

                <div className="space-y-3 pl-1.5">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-red-600 mt-1.5 opacity-60"></div>
                      <div>
                        <p className="text-xs font-black text-gray-800">Tarik Tunai Nasabah</p>
                        <p className="text-[9px] text-gray-400">Penarikan uang nasabah</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-red-600">-Rp {props.totalTarik.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Total Saldo Laci Kasir Box - Updated Layout */}
              <div className="bg-[#051c5f] p-4 rounded-3xl text-white mt-1 shadow-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black uppercase tracking-tight text-blue-100">TOTAL SALDO LACI KASIR</span>
                  <h2 className="text-lg font-black text-green-400 tracking-tighter">
                    {formatRupiah(totalPendapatanBersih)}
                  </h2>
                </div>
                <p className="text-[7px] font-bold text-blue-200 uppercase tracking-widest opacity-60">
                  RUMUS : Saldo laci kasir (kas masuk - kas keluar)
                </p>
              </div>
            </div>
            
            <div className="px-5 pb-5 pt-1">
              <button 
                onClick={() => { setShowRincian(false); props.setActiveView('view-laporan'); }}
                className="w-full bg-[#0028b8] text-white py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-wider shadow-lg active:scale-95 transition-all"
              >
                <i className="fa-solid fa-chart-simple text-xs"></i> LIHAT DETAIL & LAPORAN
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 mb-4 grid grid-cols-5 gap-2 text-center">
        {[
          { id: 'view-kasbon', label: 'KASBON', icon: 'fa-file-invoice', color: 'bg-blue-500' },
          { id: 'view-kontak', label: 'KONTAK', icon: 'fa-address-book', color: 'bg-emerald-500' },
          { id: 'view-stok-voucher', label: 'VOUCHER', icon: 'fa-ticket', color: 'bg-orange-500' },
          { id: 'view-kalender', label: 'KALENDER', icon: 'fa-calendar-days', color: 'bg-red-500' },
          { id: 'view-nota', label: 'NOTA', icon: 'fa-receipt', color: 'bg-purple-500' },
        ].map((item) => (
          <div key={item.id} onClick={() => props.setActiveView(item.id)} className="cursor-pointer group">
            <div className={cn("w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-white shadow-md", item.color)}>
              <i className={cn("fa-solid text-lg", item.icon)}></i>
            </div>
            <p className="text-[10px] font-semibold text-gray-500 mt-1.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="px-5 mb-4">
        <TransactionForm 
          kategori={props.formKategori}
          setKategori={props.setFormKategori}
          nominal={props.formNominal}
          setNominal={props.setFormNominal}
          admin={props.formAdmin}
          setAdmin={props.setFormAdmin}
          keterangan={props.formKeterangan}
          setKeterangan={props.setFormKeterangan}
          onSave={props.handleSimpanTransaksi}
        />
      </div>

      <div className="px-5 mb-3">
        <div className="bg-white border border-gray-300 rounded-xl p-2 shadow-sm mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <i className="fa-solid fa-bolt text-[9px]"></i>
            </div>
            <div>
              <p className="text-[8px] text-black font-black uppercase tracking-tighter">TERAKHIR</p>
              <p className="text-[10px] font-black text-black leading-none mt-0.5">
                {props.lastTx ? `${props.lastTx.kategori} • ${formatRupiah(props.lastTx.nominal)}` : 'Belum ada'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-1.5 px-0.5">
          <h3 className="font-black text-black text-[10px] uppercase tracking-tighter">RINGKASAN HARI INI</h3>
          <button onClick={() => props.setActiveView('view-transaksi')} className="text-[9px] text-blue-700 font-black uppercase tracking-tighter border-b border-blue-700 leading-none">LIHAT SEMUA</button>
        </div>
        
        <SummaryCards 
          totalTransactions={props.transactions.filter(t => !t.kategori.startsWith('Isi')).length}
          totalVolume={props.totalVolume}
          totalAdmin={props.totalAdmin}
        />
      </div>
    </div>
  )
}

export default BerandaView
