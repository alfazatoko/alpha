import React, { useState, useEffect } from 'react'
import { parseNominal, cn } from './lib/utils'
import type { Transaction } from './types'

// Components
import Navigation from './components/Navigation'
import SidePanel from './components/SidePanel'
import InspectOverlay from './components/InspectOverlay'

// Views
import BerandaView from './views/BerandaView'
import RiwayatView from './views/RiwayatView'
import LaporanView from './views/LaporanView'
import AkunView from './views/AkunView'
import IsiSaldoView from './views/IsiSaldoView'
import KasbonView from './views/KasbonView'
import KontakView from './views/KontakView'
import VoucherView from './views/VoucherView'
import KalenderView from './views/KalenderView'
import NotaView from './views/NotaView'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ion-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { name?: string }, HTMLElement>;
    }
  }
}

const App: React.FC = () => {
  // Navigation State
  const [activeView, setActiveView] = useState('view-beranda')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [screenSize, setScreenSize] = useState(localStorage.getItem('screen') || 'auto')
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
  
  // App Data State (LocalStorage for persistence until Supabase is fully connected)
  const [saldoBank, setSaldoBank] = useState<number>(Number(localStorage.getItem('saldoBank')) || 1000000)
  const [totalPenjualan, setTotalPenjualan] = useState<number>(Number(localStorage.getItem('totalPenjualan')) || 0)
  const [transactions, setTransactions] = useState<Transaction[]>(JSON.parse(localStorage.getItem('transactions') || '[]'))
  const [kasModal, setKasModal] = useState<number>(Number(localStorage.getItem('kas_modal')) || 0)
  
  // Form State
  const [formKategori, setFormKategori] = useState('')
  const [formNominal, setFormNominal] = useState('')
  const [formAdmin, setFormAdmin] = useState('')
  const [formKeterangan, setFormKeterangan] = useState('')
  
  // Isi Saldo State
  const [isiJenis, setIsiJenis] = useState('')
  const [isiNominal, setIsiNominal] = useState('')
  const [isiKeterangan, setIsiKeterangan] = useState('')

  // Filter State
  const [filterTanggalMulai, setFilterTanggalMulai] = useState(new Date().toISOString().split('T')[0])
  const [filterTanggalAkhir, setFilterTanggalAkhir] = useState(new Date().toISOString().split('T')[0])
  const [filterPencarian, setFilterPencarian] = useState('')
  const [filterKategori, setFilterKategori] = useState('Semua')
  const [activeSaldoFilter, setActiveSaldoFilter] = useState('Semua')

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.body.className = `theme-${theme}`
  }, [theme])

  useEffect(() => {
    localStorage.setItem('screen', screenSize)
  }, [screenSize])

  useEffect(() => {
    localStorage.setItem('saldoBank', saldoBank.toString())
    localStorage.setItem('totalPenjualan', totalPenjualan.toString())
    localStorage.setItem('transactions', JSON.stringify(transactions))
    localStorage.setItem('kas_modal', kasModal.toString())
  }, [saldoBank, totalPenjualan, transactions, kasModal])

  // Handlers
  const handleSimpanTransaksi = () => {
    const nominal = parseNominal(formNominal)
    const admin = parseNominal(formAdmin)
    
    if (!formKategori) return alert('Pilih kategori transaksi!')
    if (nominal <= 0) return alert('Masukkan nominal yang valid!')

    let newSaldoBank = saldoBank
    let newTotalPenjualan = totalPenjualan

    switch (formKategori) {
      case 'Transfer Bank':
      case 'DANA':
      case 'FLIP':
      case 'Order Kuota':
        newSaldoBank -= nominal
        break
      case 'Tarik Tunai':
        // Saldo Bank tidak bertambah di aplikasi karena masuk ke rekening owner
        break
    }

    const newTx: Transaction = {
      id: Date.now().toString(),
      kategori: formKategori,
      nominal,
      adminFee: admin,
      keterangan: formKeterangan || '-',
      timestamp: new Date().toISOString()
    }

    setTransactions([newTx, ...transactions])
    setSaldoBank(newSaldoBank)
    setTotalPenjualan(newTotalPenjualan)
    
    // Reset Form
    setFormKategori('')
    setFormNominal('')
    setFormAdmin('')
    setFormKeterangan('')
    alert('Transaksi Berhasil Disimpan!')
  }

  const handleSimpanIsiSaldo = () => {
    const nominal = parseNominal(isiNominal)
    if (!isiJenis) return alert('Pilih jenis saldo!')
    if (nominal <= 0) return alert('Nominal tidak valid!')

    let newSaldoBank = saldoBank
    let newTotalPenjualan = totalPenjualan

    if (isiJenis === 'Saldo Bank') {
      newSaldoBank += nominal
    } else if (isiJenis === 'Modal Tunai Kasir') {
      const currentModal = Number(localStorage.getItem('kas_modal') || '0')
      localStorage.setItem('kas_modal', (currentModal + nominal).toString())
      setKasModal(currentModal + nominal)
    }

    const newTx: Transaction = {
      id: Date.now().toString(),
      kategori: 'Isi ' + isiJenis,
      nominal,
      adminFee: 0,
      keterangan: isiKeterangan || 'Setoran Saldo',
      timestamp: new Date().toISOString()
    }

    setTransactions([newTx, ...transactions])
    setSaldoBank(newSaldoBank)
    setTotalPenjualan(newTotalPenjualan)
    
    // Reset Form
    setIsiJenis('')
    setIsiNominal('')
    setIsiKeterangan('')
    alert('Saldo Berhasil Diperbarui!')
    setActiveView('view-beranda')
  }

  // Derived Calculations
  const totalTarik = transactions.filter(t => t.kategori === 'Tarik Tunai').reduce((s, t) => s + t.nominal, 0)
  const totalAdmin = transactions.reduce((s, t) => s + t.adminFee, 0)
  const totalAksesoris = transactions.filter(t => t.kategori === 'Aksesoris').reduce((s, t) => s + t.nominal, 0)
  const totalVolume = transactions.filter(t => !t.kategori.startsWith('Isi')).reduce((s, t) => s + t.nominal, 0)
  
  // Penjualan Digital: Transfer + DANA + FLIP + Kuota
  const penjualanDigital = transactions
    .filter(t => ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori))
    .reduce((s, t) => s + t.nominal, 0)

  // Saldo Laci Kasir = Modal (from localStorage) + Digital + Aksesoris + Admin - Tarik
  const totalSaldoKas = kasModal + penjualanDigital + totalAksesoris + totalAdmin - totalTarik

  return (
    <div className={cn("app-container", screenSize !== 'auto' && screenSize)}>
      
      <BerandaView 
        active={activeView === 'view-beranda'}
        setIsSidePanelOpen={setIsSidePanelOpen}
        setActiveView={setActiveView}
        saldoBank={saldoBank}
        totalPenjualan={totalPenjualan}
        lastTx={transactions.find(t => !t.kategori.startsWith('Isi'))}
        formKategori={formKategori}
        setFormKategori={setFormKategori}
        formNominal={formNominal}
        setFormNominal={setFormNominal}
        formAdmin={formAdmin}
        setFormAdmin={setFormAdmin}
        formKeterangan={formKeterangan}
        setFormKeterangan={setFormKeterangan}
        handleSimpanTransaksi={handleSimpanTransaksi}
        transactions={transactions}
        totalAdmin={totalAdmin}
        totalVolume={totalVolume}
        totalAksesoris={totalAksesoris}
        totalTarik={totalTarik}
        totalSaldoKas={totalSaldoKas}
        penjualanDigital={penjualanDigital}
        kasModal={kasModal}
      />

      <RiwayatView 
        active={activeView === 'view-transaksi'}
        transactions={transactions}
        filterTanggalMulai={filterTanggalMulai}
        setFilterTanggalMulai={setFilterTanggalMulai}
        filterTanggalAkhir={filterTanggalAkhir}
        setFilterTanggalAkhir={setFilterTanggalAkhir}
        filterPencarian={filterPencarian}
        setFilterPencarian={setFilterPencarian}
        filterKategori={filterKategori}
        setFilterKategori={setFilterKategori}
        activeSaldoFilter={activeSaldoFilter}
        setActiveSaldoFilter={setActiveSaldoFilter}
      />

      <LaporanView 
        active={activeView === 'view-laporan'}
        saldoBank={saldoBank}
        totalPenjualan={totalPenjualan}
        transactions={transactions}
        totalTarik={totalTarik}
        totalAdmin={totalAdmin}
        totalAksesoris={totalAksesoris}
        totalVolume={totalVolume}
        totalSaldoKas={totalSaldoKas}
        penjualanDigital={penjualanDigital}
        kasModal={kasModal}
      />

      <AkunView active={activeView === 'view-akun'} />

      <IsiSaldoView 
        active={activeView === 'view-isi-saldo'}
        setActiveView={setActiveView}
        isiJenis={isiJenis}
        setIsiJenis={setIsiJenis}
        isiNominal={isiNominal}
        setIsiNominal={setIsiNominal}
        isiKeterangan={isiKeterangan}
        setIsiKeterangan={setIsiKeterangan}
        handleSimpanIsiSaldo={handleSimpanIsiSaldo}
      />

      <KasbonView active={activeView === 'view-kasbon'} setActiveView={setActiveView} />
      <KontakView active={activeView === 'view-kontak'} setActiveView={setActiveView} />
      <VoucherView active={activeView === 'view-stok-voucher'} setActiveView={setActiveView} />
      <KalenderView active={activeView === 'view-kalender'} setActiveView={setActiveView} />
      <NotaView active={activeView === 'view-nota'} setActiveView={setActiveView} />

      <Navigation activeView={activeView} setActiveView={setActiveView} />

      <SidePanel 
        isOpen={isSidePanelOpen}
        setIsOpen={setIsSidePanelOpen}
        theme={theme}
        setTheme={setTheme}
        screenSize={screenSize}
        setScreenSize={setScreenSize}
      />

      <InspectOverlay />
    </div>
  )
}

export default App
