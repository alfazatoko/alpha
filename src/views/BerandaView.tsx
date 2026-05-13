import React, { useState, useEffect } from 'react'
import { formatRupiah, cn } from '../lib/utils'
import TransactionForm from '../components/TransactionForm'
import SummaryCards from '../components/SummaryCards'
import type { Transaction } from '../types'
import { getKasirAccounts, saveKasirAccounts, type KasirAccount } from '../components/LoginScreen'

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
  kasirName?: string
  kasirRole?: string
  filterKasir?: string
  setFilterKasir?: (v: string) => void
  onLogout?: () => void
}
const BerandaView: React.FC<BerandaViewProps> = (props) => {
  const [showRincian, setShowRincian] = useState(false)
  const [activeOwnerModal, setActiveOwnerModal] = useState<string | null>(null) // monitor, laporan, audit
  const [currentTime, setCurrentTime] = useState(new Date())

  // Kasir Management State
  const [kasirList, setKasirList] = useState<Record<string, KasirAccount>>({})
  const [kasirFormId, setKasirFormId] = useState('')
  const [kasirFormName, setKasirFormName] = useState('')
  const [kasirFormPin, setKasirFormPin] = useState('')

  useEffect(() => {
    if (activeOwnerModal) {
      setKasirList(getKasirAccounts())
    }
  }, [activeOwnerModal])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' })
  const fullDate = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const clockStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  
  const totalPendapatanBersih = props.totalSaldoKas
  const penjualanDigital = props.penjualanDigital
  const kasModal = props.kasModal

  return (
    <div className={cn("page-view hide-scrollbar", props.active && "active")}>
      <div className="px-5 pt-6 pb-2 flex justify-between items-center">
        <button onClick={() => props.setIsSidePanelOpen(true)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-900">
          <i className="fa-solid fa-ellipsis-vertical text-xs"></i>
        </button>
        <div className="flex-1 ml-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo-alpha.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
            <div>
              <p className="text-gray-900 text-[10px] font-bold uppercase tracking-tight">Selamat datang,</p>
              <h1 className="text-lg font-black text-black leading-tight">
                {props.kasirName || 'ALPHA'}
                <span className={cn(
                  "text-[9px] px-2 py-0.5 rounded-full ml-1 font-black",
                  props.kasirRole === 'owner' ? "bg-amber-500 text-white" : "bg-blue-600 text-white"
                )}>
                  {props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'}
                </span>
              </h1>
            </div>
          </div>

          <div className="text-right">
            <p className="text-gray-400 text-[8px] font-bold uppercase tracking-widest leading-none mb-1">
              {dayName}
            </p>
            <p className="text-gray-900 text-[10px] font-black tracking-tight leading-none mb-1">
              {fullDate}
            </p>
            <p className="text-blue-600 text-xs font-black tabular-nums tracking-widest">
              {clockStr}
            </p>
          </div>
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
              {/* SALDO BANK */}
              <div className="space-y-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center text-white text-[9px]">
                    <i className="fa-solid fa-building-columns"></i>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-blue-800 uppercase leading-none">SALDO BANK</h4>
                    <p className="text-[9px] text-gray-400 font-medium mt-0.5 opacity-80">Total uang di rekening/digital</p>
                  </div>
                </div>
                <div className="flex justify-between items-start pl-1.5">
                  <div className="flex gap-2.5">
                    <div className="w-1 h-1 rounded-full bg-blue-700 mt-1.5 opacity-60"></div>
                    <div>
                      <p className="text-xs font-black text-gray-800">Total Saldo Bank</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-blue-700">{formatRupiah(props.saldoBank)}</span>
                </div>
              </div>

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

      {props.kasirRole === 'owner' && (
        <div className="px-5 mb-8">
          {/* Header Panel Owner ala Image */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-[2rem] p-6 mb-6 shadow-lg shadow-orange-200/50 flex items-center gap-4 border-b-4 border-orange-600/20">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 shadow-inner">
              <i className="fa-solid fa-shield-halved text-2xl"></i>
            </div>
            <div>
              <h3 className="font-black text-white text-xl tracking-tight leading-none">Panel Owner</h3>
              <p className="text-white/80 text-[11px] font-bold mt-1.5 uppercase tracking-widest">Kelola semua data toko</p>
            </div>
          </div>

          {/* Grid Menu Owner ala Image */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'monitor', title: 'Kasir', desc: 'Kelola data kasir', icon: 'fa-users', color: 'bg-blue-600' },
              { id: 'laporan', title: 'Ringkasan', desc: 'Ringkasan harian', icon: 'fa-file-lines', color: 'bg-indigo-600' },
              { id: 'grafik', title: 'Grafik', desc: 'Grafik transaksi', icon: 'fa-chart-simple', color: 'bg-emerald-500' },
              { id: 'performa', title: 'Performa', desc: 'Performa kasir', icon: 'fa-chart-line', color: 'bg-purple-600' },
              { id: 'absen', title: 'Absen', desc: 'Kehadiran kasir', icon: 'fa-fingerprint', color: 'bg-teal-500' },
              { id: 'izin', title: 'Izin', desc: 'Kelola izin', icon: 'fa-calendar-day', color: 'bg-orange-500' },
              { id: 'gaji', title: 'Gajih', desc: 'Data gaji kasir', icon: 'fa-dollar-sign', color: 'bg-green-600' },
              { id: 'backup', title: 'Backup', desc: 'Backup & reset', icon: 'fa-database', color: 'bg-red-600' },
              { id: 'view-akun', title: 'Setting', desc: 'Pengaturan app', icon: 'fa-gear', color: 'bg-slate-600' },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => item.id === 'view-akun' ? props.setActiveView('view-akun') : setActiveOwnerModal(item.id)}
                className="bg-white border border-gray-100 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 shadow-sm active:scale-95 transition-all hover:border-orange-200"
              >
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg", item.color)}>
                  <i className={`fa-solid ${item.icon} text-lg`}></i>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-black text-gray-800 leading-none mb-1">{item.title}</p>
                  <p className="text-[8px] font-bold text-gray-400 leading-tight">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Owner Modals Container */}
      {activeOwnerModal && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md flex items-end justify-center sm:items-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className={cn(
              "p-5 text-white flex justify-between items-start",
              activeOwnerModal === 'monitor' ? "bg-blue-600" : 
              activeOwnerModal === 'laporan' ? "bg-emerald-600" : "bg-purple-600"
            )}>
              <div>
                <h3 className="font-black text-lg tracking-tight uppercase leading-none">
                  {activeOwnerModal === 'monitor' ? 'MONITORING KASIR' : 
                   activeOwnerModal === 'laporan' ? 'LAPORAN GLOBAL' : 'AUDIT LACI KAS'}
                </h3>
                <p className="text-[10px] text-white/80 mt-1.5 font-bold uppercase tracking-widest">
                  {activeOwnerModal === 'monitor' ? 'Pantau aktivitas kasir aktif' : 
                   activeOwnerModal === 'laporan' ? 'Rekapitulasi seluruh cabang' : 
                   activeOwnerModal === 'audit' ? 'Verifikasi uang fisik vs sistem' :
                   activeOwnerModal === 'absen' ? 'Data kehadiran seluruh kasir' :
                   activeOwnerModal === 'gaji' ? 'Manajemen insentif & payroll' : 
                   activeOwnerModal === 'grafik' ? 'Analitik penjualan toko' :
                   activeOwnerModal === 'performa' ? 'Evaluasi kerja kasir' :
                   activeOwnerModal === 'backup' ? 'Keamanan data & reset sistem' : 'Daftar permohonan izin'}
                </p>
              </div>
              <button onClick={() => setActiveOwnerModal(null)} className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/40 transition-all shadow-inner">
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 max-h-[60vh] overflow-y-auto hide-scrollbar">
              {activeOwnerModal === 'monitor' && (
                <div className="space-y-4">
                  {/* Add Kasir Form */}
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3">Tambah / Edit Kasir</h4>
                    <div className="space-y-2">
                      <input type="text" placeholder="ID Kasir (contoh: kasir3)" value={kasirFormId} onChange={e => setKasirFormId(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                      <input type="text" placeholder="Nama Kasir" value={kasirFormName} onChange={e => setKasirFormName(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                      <input type="text" placeholder="PIN (4-6 digit)" value={kasirFormPin} onChange={e => setKasirFormPin(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                      <button onClick={() => {
                        if(!kasirFormId || !kasirFormName || !kasirFormPin) return alert('Lengkapi data kasir');
                        const newKasirList = { ...kasirList, [kasirFormId]: { pin: kasirFormPin, role: 'kasir' as any, name: kasirFormName } };
                        saveKasirAccounts(newKasirList);
                        setKasirList(newKasirList);
                        setKasirFormId(''); setKasirFormName(''); setKasirFormPin('');
                      }} className="w-full bg-blue-600 text-white text-[10px] font-black py-2 rounded-lg uppercase">Simpan Kasir</button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(kasirList).filter(([id]) => id !== 'owner').map(([id, account]) => {
                      return (
                        <div key={id} className="p-3 border border-gray-100 rounded-2xl flex justify-between items-center bg-gray-50/50">
                          <div>
                            <p className="text-xs font-black text-gray-800">{account.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">ID: {id} | PIN: {account.pin}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setKasirFormId(id); setKasirFormName(account.name); setKasirFormPin(account.pin); }} className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                              <i className="fa-solid fa-pen text-[10px]"></i>
                            </button>
                            <button onClick={() => {
                              if(confirm(`Hapus ${account.name}?`)) {
                                const n = {...kasirList}; delete n[id];
                                saveKasirAccounts(n); setKasirList(n);
                              }
                            }} className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                              <i className="fa-solid fa-trash text-[10px]"></i>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeOwnerModal === 'laporan' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-2">Filter Data Kasir</p>
                    <select
                      value={props.filterKasir || 'Semua'}
                      onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                      className="bg-white border border-gray-200 text-blue-800 text-xs font-black py-1.5 px-3 rounded-lg outline-none cursor-pointer"
                    >
                      <option value="Semua">Semua Kasir</option>
                      <option value="kasir1">Kasir 1</option>
                      <option value="kasir2">Kasir 2</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>

                  {/* SALDO BANK */}
                  <div className="space-y-2.5 mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px]">
                        <i className="fa-solid fa-building-columns"></i>
                      </div>
                      <h4 className="text-[11px] font-black text-blue-700 uppercase tracking-widest">SALDO BANK</h4>
                    </div>
                    <div className="space-y-2 pl-7">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Total Saldo Bank</p>
                        <span className="text-xs font-black text-blue-700">{formatRupiah(props.saldoBank)}</span>
                      </div>
                    </div>
                  </div>

                  {/* KAS MASUK */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px]">
                        <i className="fa-solid fa-arrow-down"></i>
                      </div>
                      <h4 className="text-[11px] font-black text-green-700 uppercase tracking-widest">KAS MASUK</h4>
                    </div>
                    <div className="space-y-2 pl-7">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Modal Tunai Kasir</p>
                        <span className="text-xs font-black text-gray-800">Rp {Number(kasModal).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Penjualan Digital</p>
                        <span className="text-xs font-black text-gray-800">Rp {penjualanDigital.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Penjualan Aksesoris</p>
                        <span className="text-xs font-black text-gray-800">Rp {props.totalAksesoris.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Total Admin Fee</p>
                        <span className="text-xs font-black text-gray-800">Rp {props.totalAdmin.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100"></div>

                  {/* KAS KELUAR */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-[10px]">
                        <i className="fa-solid fa-arrow-up"></i>
                      </div>
                      <h4 className="text-[11px] font-black text-red-600 uppercase tracking-widest">KAS KELUAR</h4>
                    </div>
                    <div className="space-y-2 pl-7">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Tarik Tunai Nasabah</p>
                        <span className="text-xs font-black text-red-600">-Rp {props.totalTarik.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Balance */}
                  <div className="mt-3 p-4 bg-gradient-to-r from-blue-700 to-blue-800 rounded-2xl shadow-inner text-white flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">SALDO LACI KASIR</p>
                      <p className="text-[8px] text-blue-200 mt-0.5">Total uang fisik hari ini</p>
                    </div>
                    <span className="text-lg font-black text-green-300">Rp {totalPendapatanBersih.toLocaleString('id-ID')}</span>
                  </div>

                  <button className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
                    <i className="fa-solid fa-file-excel text-xs"></i> EXPORT LAPORAN EXCEL
                  </button>
                </div>
              )}

              {activeOwnerModal === 'audit' && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <p className="text-[10px] font-bold text-purple-800 text-center uppercase tracking-widest mb-3">Masukkan Uang Fisik Di Laci</p>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-sm font-black text-purple-400">Rp</span>
                      <input type="text" placeholder="0" className="w-full py-3 pl-10 pr-4 bg-white border border-purple-200 rounded-xl font-black text-purple-700 outline-none" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-bold text-gray-400">HITUNGAN SISTEM:</span>
                    <span className="text-xs font-black text-gray-800">Rp {totalPendapatanBersih.toLocaleString('id-ID')}</span>
                  </div>
                  <button className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    PROSES AUDIT
                  </button>
                </div>
              )}

              {activeOwnerModal === 'absen' && (
                <div className="space-y-3">
                  <div className="p-4 border border-orange-100 rounded-2xl bg-orange-50/30 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-gray-800">Kasir 1</p>
                      <p className="text-[9px] text-orange-600 font-bold uppercase">Masuk: 08:00</p>
                    </div>
                    <span className="text-[8px] px-2 py-1 bg-green-500 text-white rounded-md font-black">HADIR</span>
                  </div>
                  <div className="p-4 border border-orange-100 rounded-2xl bg-orange-50/30 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-gray-800">Kasir 2</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">Belum Absen</p>
                    </div>
                    <span className="text-[8px] px-2 py-1 bg-gray-400 text-white rounded-md font-black">OFF</span>
                  </div>
                </div>
              )}

              {activeOwnerModal === 'gaji' && (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                    <i className="fa-solid fa-sack-dollar text-2xl"></i>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modul Penggajian Sedang Disiapkan</p>
                </div>
              )}

              {activeOwnerModal === 'izin' && (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto text-cyan-600">
                    <i className="fa-solid fa-envelope-open-text text-2xl"></i>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tidak Ada Permohonan Izin Hari Ini</p>
                </div>
              )}

              {activeOwnerModal === 'grafik' && (() => {
                const todayISO = new Date().toLocaleDateString('en-CA');
                const volHarian = props.transactions.filter(t => t.timestamp.startsWith(todayISO)).reduce((s,t) => s + t.nominal, 0);
                const volBulanIni = props.transactions.reduce((s,t) => s + t.nominal, 0); // approx all data for now
                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Transaksi Harian</p>
                      <h2 className="text-2xl font-black text-emerald-600 mt-1">Rp {volHarian.toLocaleString('id-ID')}</h2>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                      <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Total Transaksi (Semua)</p>
                      <h2 className="text-2xl font-black text-blue-600 mt-1">Rp {volBulanIni.toLocaleString('id-ID')}</h2>
                    </div>
                    <div className="h-32 bg-gray-50 rounded-2xl border border-gray-100 flex items-end justify-between p-4 px-6">
                      {/* Fake simple bar chart */}
                      {[40, 70, 45, 90, 60, 80, 100].map((h, i) => (
                        <div key={i} className="w-4 bg-blue-400 rounded-t-sm" style={{ height: `${h}%` }}></div>
                      ))}
                    </div>
                    <p className="text-[9px] text-center font-bold text-gray-400 uppercase">Grafik 7 Hari Terakhir</p>
                  </div>
                )
              })()}

              {activeOwnerModal === 'performa' && (() => {
                const performa = Object.keys(kasirList).filter(k => k !== 'owner').map(kId => {
                  const txs = props.transactions.filter(t => t.kasir_id === kId);
                  return {
                    id: kId,
                    name: kasirList[kId]?.name || kId,
                    count: txs.length,
                    vol: txs.reduce((s,t)=>s+t.nominal, 0)
                  }
                }).sort((a,b) => b.vol - a.vol);

                return (
                  <div className="space-y-3">
                    {performa.map((p, index) => (
                      <div key={p.id} className="p-4 border border-purple-100 rounded-2xl bg-purple-50/30 flex justify-between items-center">
                        <div className="flex gap-3 items-center">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-white", index === 0 ? "bg-amber-400 shadow-md" : "bg-purple-300")}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-800">{p.name}</p>
                            <p className="text-[9px] text-purple-600 font-bold uppercase">{p.count} Transaksi</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-purple-800">Rp {p.vol.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    ))}
                    {performa.length === 0 && <p className="text-center text-xs font-bold text-gray-400">Belum ada data</p>}
                  </div>
                )
              })()}

              {activeOwnerModal === 'backup' && (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                    <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data Anda Aman Di Cloud</p>
                  <button className="bg-red-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Mulai Backup</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {props.kasirRole !== 'owner' && (
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
      )}

      {props.kasirRole === 'owner' && !activeOwnerModal && (
        <div className="px-5 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-center shadow-inner">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600 shadow-sm">
              <i className="fa-solid fa-chart-line text-2xl"></i>
            </div>
            <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Mode Pantau Aktif</h3>
            <p className="text-[10px] text-blue-400 font-bold mt-1">Anda masuk sebagai Owner. Fitur transaksi dinonaktifkan untuk keamanan data.</p>
          </div>
        </div>
      )}

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
