import React, { useState, useEffect, useRef } from 'react'
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
  
  // Edit Transaction State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editKategori, setEditKategori] = useState('')
  const [editNominal, setEditNominal] = useState('')
  const [editAdmin, setEditAdmin] = useState('')
  const [editKeterangan, setEditKeterangan] = useState('')
  
  // Loading & Notification State
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ show: boolean, message: string } | null>(null)

  const editNominalRef = useRef<HTMLInputElement>(null)
  const editAdminRef = useRef<HTMLInputElement>(null)
  const editKeteranganRef = useRef<HTMLTextAreaElement>(null)

  const handleEditKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>, isLast: boolean = false) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isLast) {
        handleSaveEdit()
      } else {
        nextRef?.current?.focus()
      }
    }
  }

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

  // Daily Reset Check
  useEffect(() => {
    const checkReset = () => {
      const today = new Date().toLocaleDateString('id-ID')
      const lastReset = localStorage.getItem('last_reset_date')

      if (lastReset && lastReset !== today) {
        // Day has changed! 
        // We no longer clear everything, just notify the user that 
        // the dashboard will now show data for the new day.
        alert(`Selamat datang di hari baru (${today}). Dashboard Anda sekarang menampilkan rekap harian yang baru. Data hari sebelumnya tersimpan aman di Riwayat.`)
      }
      
      localStorage.setItem('last_reset_date', today)
    }

    checkReset()
    // Check every minute in case the app stays open overnight
    const interval = setInterval(checkReset, 60000)
    return () => clearInterval(interval)
  }, [])

  // Handlers
  const showToast = (msg: string) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSimpanTransaksi = () => {
    if (isSaving) return
    const nominal = parseNominal(formNominal)
    const admin = parseNominal(formAdmin)
    
    if (!formKategori) return alert('Pilih kategori transaksi!')
    if (nominal <= 0) return alert('Masukkan nominal yang valid!')

    setIsSaving(true)
    
    // Simulasi proses simpan untuk menampilkan spinner
    setTimeout(() => {
      let newSaldoBank = saldoBank
      let newTotalPenjualan = totalPenjualan

      switch (formKategori) {
        case 'Transfer Bank':
        case 'DANA':
        case 'FLIP':
        case 'Order Kuota':
          newSaldoBank -= nominal
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
      
      setFormKategori('')
      setFormNominal('')
      setFormAdmin('')
      setFormKeterangan('')
      
      setIsSaving(false)
      showToast('Transaksi Berhasil Disimpan!')
    }, 800)
  }

  const handleSimpanIsiSaldo = () => {
    if (isSaving) return
    const nominal = parseNominal(isiNominal)
    if (!isiJenis) return alert('Pilih jenis saldo!')
    if (nominal <= 0) return alert('Nominal tidak valid!')

    setIsSaving(true)

    setTimeout(() => {
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
      
      setIsiJenis('')
      setIsiNominal('')
      setIsiKeterangan('')
      
      setIsSaving(false)
      showToast('Saldo Berhasil Diperbarui!')
      setActiveView('view-beranda')
    }, 800)
  }

  const handleStartEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setEditKategori(tx.kategori)
    setEditNominal(tx.nominal.toLocaleString('id-ID').replace(/,/g, '.'))
    setEditAdmin(tx.adminFee.toLocaleString('id-ID').replace(/,/g, '.'))
    setEditKeterangan(tx.keterangan)
  }

  const handleSaveEdit = () => {
    if (!editingTx || isSaving) return
    const newNominal = parseNominal(editNominal)
    const newAdmin = parseNominal(editAdmin)

    setIsSaving(true)

    setTimeout(() => {
      const updatedTransactions = transactions.map(t => {
        if (t.id === editingTx.id) {
          return {
            ...t,
            kategori: editKategori,
            nominal: newNominal,
            adminFee: newAdmin,
            keterangan: editKeterangan,
            isEdited: true,
            originalNominal: t.isEdited ? t.originalNominal : t.nominal,
            originalAdminFee: t.isEdited ? t.originalAdminFee : t.adminFee,
            originalKategori: t.isEdited ? t.originalKategori : t.kategori
          }
        }
        return t
      })

      let newSaldoBank = saldoBank
      if (['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(editingTx.kategori)) {
        newSaldoBank += editingTx.nominal
      }
      if (['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(editKategori)) {
        newSaldoBank -= newNominal
      }

      setTransactions(updatedTransactions)
      setSaldoBank(newSaldoBank)
      setEditingTx(null)
      setIsSaving(false)
      showToast('Transaksi Berhasil Diperbarui!')
    }, 800)
  }

  // Today's Date in Local Time (YYYY-MM-DD)
  const todayISO = new Date().toLocaleDateString('en-CA')
  
  // Filtered Transactions for Dashboard (Today Only)
  const todayTransactions = transactions.filter(t => t.timestamp.startsWith(todayISO))

  // Derived Calculations (Dashboard - Today Only)
  const totalTarik = todayTransactions.filter(t => t.kategori === 'Tarik Tunai').reduce((s, t) => s + t.nominal, 0)
  const totalAdmin = todayTransactions.reduce((s, t) => s + t.adminFee, 0)
  const totalAksesoris = todayTransactions.filter(t => t.kategori === 'Aksesoris').reduce((s, t) => s + t.nominal, 0)
  const totalVolume = todayTransactions.filter(t => !t.kategori.startsWith('Isi')).reduce((s, t) => s + t.nominal, 0)
  
  // Penjualan Digital: Transfer + DANA + FLIP + Kuota (Today Only)
  const penjualanDigital = todayTransactions
    .filter(t => ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori))
    .reduce((s, t) => s + t.nominal, 0)

  // Saldo Laci Kasir (Cumulative Calculation - usually doesn't reset to 0 in reality)
  // But if the user wants it to look like it resets, we could filter this too.
  // However, Saldo Bank and Kas Modal are cumulative.
  const totalSaldoKas = kasModal + penjualanDigital + totalAksesoris + totalAdmin - totalTarik

  return (
    <div className={cn("app-container", screenSize !== 'auto' && screenSize)}>
      
      <BerandaView 
        active={activeView === 'view-beranda'}
        setIsSidePanelOpen={setIsSidePanelOpen}
        setActiveView={setActiveView}
        saldoBank={saldoBank}
        totalPenjualan={totalPenjualan}
        lastTx={todayTransactions.find(t => !t.kategori.startsWith('Isi'))}
        formKategori={formKategori}
        setFormKategori={setFormKategori}
        formNominal={formNominal}
        setFormNominal={setFormNominal}
        formAdmin={formAdmin}
        setFormAdmin={setFormAdmin}
        formKeterangan={formKeterangan}
        setFormKeterangan={setFormKeterangan}
        handleSimpanTransaksi={handleSimpanTransaksi}
        transactions={todayTransactions}
        isSaving={isSaving}
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
        onEdit={handleStartEdit}
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
        isSaving={isSaving}
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

      {/* Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xs uppercase tracking-widest text-blue-800">
                <i className="fa-solid fa-pen-to-square mr-2"></i> Edit Transaksi
              </h3>
              <button onClick={() => setEditingTx(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block tracking-tighter">Kategori</label>
                <select 
                  value={editKategori} 
                  onChange={e => setEditKategori(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(e, editNominalRef)}
                  className="form-input-modern w-full"
                >
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="DANA">DANA</option>
                  <option value="FLIP">FLIP</option>
                  <option value="Order Kuota">Order Kuota</option>
                  <option value="Tarik Tunai">Tarik Tunai</option>
                  <option value="Aksesoris">Aksesoris</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block tracking-tighter">Nominal</label>
                  <input 
                    ref={editNominalRef}
                    value={editNominal} 
                    onChange={e => setEditNominal(formatInputRupiah(e.target.value))}
                    onKeyDown={(e) => handleEditKeyDown(e, editAdminRef)}
                    className="form-input-modern w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block tracking-tighter">Admin</label>
                  <input 
                    ref={editAdminRef}
                    value={editAdmin} 
                    onChange={e => setEditAdmin(formatInputRupiah(e.target.value))}
                    onKeyDown={(e) => handleEditKeyDown(e, editKeteranganRef)}
                    className="form-input-modern w-full text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block tracking-tighter">Keterangan</label>
                <textarea 
                  ref={editKeteranganRef}
                  value={editKeterangan} 
                  onChange={e => setEditKeterangan(e.target.value)}
                  rows={2}
                  onKeyDown={(e) => handleEditKeyDown(e, undefined, true)}
                  className="form-input-modern w-full resize-none"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="w-full bg-blue-700 text-white font-black py-4 rounded-2xl text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-70 disabled:scale-100"
            >
              {isSaving ? (
                <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
              ) : (
                <i className="fa-solid fa-check-circle"></i>
              )}
              {isSaving ? "SEDANG MENYIMPAN..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}

      {/* Floating Success Notification */}
      {toast && (
        <div className="fixed top-20 left-0 right-0 z-[200] flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white/20 backdrop-blur-md">
            <div className="w-5 h-5 bg-white text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
              <i className="fa-solid fa-check text-[10px] font-black"></i>
            </div>
            <span className="font-black text-[10px] uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}
    </div>

  )
}

export default App
