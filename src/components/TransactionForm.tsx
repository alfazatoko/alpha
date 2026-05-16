import React, { useRef, useState } from 'react'
import { formatInputRupiah, cn } from '../lib/utils'

interface TransactionFormProps {
  kategori: string
  setKategori: (v: string) => void
  nominal: string
  setNominal: (v: string) => void
  admin: string
  setAdmin: (v: string) => void
  keterangan: string
  setKeterangan: (v: string) => void
  onSave: (options?: { activeTab: string, subTab: string, isAdminNonTunai: boolean }) => void
  isSaving?: boolean
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  kategori, setKategori, nominal, setNominal, admin, setAdmin, keterangan, setKeterangan, onSave, isSaving
}) => {
  const [activeMode, setActiveMode] = useState<'DIGITAL' | 'TARIK' | 'AKSESORIS'>('DIGITAL')
  const [subMode, setSubMode] = useState<'NORMAL' | 'KHUSUS' | 'NON_TUNAI'>('NORMAL')
  const [isAdminNonTunai, setIsAdminNonTunai] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Refs for navigation
  const btnDigitalRef = useRef<HTMLButtonElement>(null)
  const btnTarikRef = useRef<HTMLButtonElement>(null)
  const btnAksesorisRef = useRef<HTMLButtonElement>(null)
  const catRefs = useRef<(HTMLButtonElement | null)[]>([])
  const nominalRef = useRef<HTMLInputElement>(null)
  const adminRef = useRef<HTMLInputElement>(null)
  const keteranganRef = useRef<HTMLTextAreaElement>(null)
  const optTunaiRef = useRef<HTMLButtonElement>(null)
  const optKhususRef = useRef<HTMLButtonElement>(null)
  const optNonTunaiRef = useRef<HTMLButtonElement>(null)
  const btnSimpanRef = useRef<HTMLButtonElement>(null)

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    const active = document.activeElement
    
    // Arrow Keys Navigation Logic
    if (e.key === 'ArrowRight') {
      if (active === btnDigitalRef.current) btnTarikRef.current?.focus()
      else if (active === btnTarikRef.current) btnAksesorisRef.current?.focus()
      else if (active === optTunaiRef.current) optKhususRef.current?.focus()
      else if (active === optKhususRef.current) optNonTunaiRef.current?.focus()
      else if (active === nominalRef.current) adminRef.current?.focus()
      else {
        const catIdx = catRefs.current.indexOf(active as any)
        if (catIdx !== -1 && catIdx % 2 === 0) catRefs.current[catIdx + 1]?.focus()
      }
    }
    
    if (e.key === 'ArrowLeft') {
      if (active === btnTarikRef.current) btnDigitalRef.current?.focus()
      else if (active === btnAksesorisRef.current) btnTarikRef.current?.focus()
      else if (active === optKhususRef.current) optTunaiRef.current?.focus()
      else if (active === optNonTunaiRef.current) optKhususRef.current?.focus()
      else if (active === adminRef.current) nominalRef.current?.focus()
      else {
        const catIdx = catRefs.current.indexOf(active as any)
        if (catIdx !== -1 && catIdx % 2 === 1) catRefs.current[catIdx - 1]?.focus()
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (active === btnDigitalRef.current || active === btnTarikRef.current || active === btnAksesorisRef.current) {
        if (activeMode === 'DIGITAL') catRefs.current[0]?.focus()
        else nominalRef.current?.focus()
      }
      else if (catRefs.current.includes(active as any)) {
        const catIdx = catRefs.current.indexOf(active as any)
        if (catIdx < 2) catRefs.current[catIdx + 2]?.focus()
        else nominalRef.current?.focus()
      }
      else if (active === nominalRef.current || active === adminRef.current) keteranganRef.current?.focus()
      else if (active === keteranganRef.current) optTunaiRef.current?.focus()
      else if (active === optTunaiRef.current || active === optKhususRef.current || active === optNonTunaiRef.current) btnSimpanRef.current?.focus()
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (active === btnSimpanRef.current) optTunaiRef.current?.focus()
      else if (active === optTunaiRef.current || active === optKhususRef.current || active === optNonTunaiRef.current) keteranganRef.current?.focus()
      else if (active === keteranganRef.current) nominalRef.current?.focus()
      else if (active === nominalRef.current || active === adminRef.current) {
        if (activeMode === 'DIGITAL') catRefs.current[2]?.focus() || catRefs.current[0]?.focus()
        else btnDigitalRef.current?.focus()
      }
      else if (catRefs.current.includes(active as any)) {
        const catIdx = catRefs.current.indexOf(active as any)
        if (catIdx >= 2) catRefs.current[catIdx - 2]?.focus()
        else btnDigitalRef.current?.focus()
      }
    }

    // Enter Key Logic
    if (e.key === 'Enter') {
      if (active === nominalRef.current) { e.preventDefault(); adminRef.current?.focus(); }
      else if (active === adminRef.current) { e.preventDefault(); keteranganRef.current?.focus(); }
      else if (active === keteranganRef.current) { e.preventDefault(); btnSimpanRef.current?.focus(); }
    }
  }

  const onSaveInternal = () => {
    setErrorMsg(null)
    
    // Validasi Khusus Transfer & Tarik Tunai
    if (activeMode === 'DIGITAL' || activeMode === 'TARIK') {
      const cleanNominal = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
      const cleanAdmin = parseInt(admin.replace(/[^0-9]/g, '')) || 0
      
      if (cleanNominal <= 0 || cleanAdmin <= 0) {
        setErrorMsg('Nominal & Admin Wajib diisi!')
        return
      }
    }

    const activeTab = subMode === 'NORMAL' ? 'BARU' : 'LAIN'
    const subTab = subMode === 'NORMAL' ? 'KHUSUS' : subMode
    onSave({ activeTab, subTab: subMode === 'NORMAL' ? 'KHUSUS' : (subTab as any), isAdminNonTunai })
  }

  return (
    <div 
      className="form-transaksi-container p-4 shadow-sm border border-gray-200 rounded-[2rem] bg-white outline-none"
      onKeyDown={handleGlobalKeyDown}
      tabIndex={0}
    >
      {/* Main Categories */}
      <div className="flex gap-1 mb-3">
        {[
          { id: 'DIGITAL', label: 'TRANSFER', icon: 'fa-paper-plane', ref: btnDigitalRef },
          { id: 'TARIK', label: 'TARIK TUNAI', icon: 'fa-money-bill-transfer', ref: btnTarikRef },
          { id: 'AKSESORIS', label: 'AKSESORIS', icon: 'fa-headset', ref: btnAksesorisRef }
        ].map((mode) => (
          <button 
            key={mode.id}
            ref={mode.ref}
            onClick={() => {
              setActiveMode(mode.id as any)
              if (mode.id === 'TARIK') setKategori('Tarik Tunai')
              else if (mode.id === 'AKSESORIS') setKategori('Aksesoris')
              else setKategori('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            className={cn(
              "flex-1 flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none",
              activeMode === mode.id 
                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                : "bg-gray-50 border-gray-100 text-gray-900 hover:border-blue-200 hover:text-blue-500"
            )}
          >
            <i className={cn("fa-solid", mode.icon, "text-sm")}></i>
            <span className="text-[9px] font-black uppercase tracking-tighter text-center leading-none">{mode.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {/* Category Label + Mode Dropdown Row */}
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
            {activeMode === 'DIGITAL' ? 'Pilih Kategori' : activeMode === 'TARIK' ? 'Tarik Tunai' : 'Aksesoris'}
          </label>
          <div className="relative">
            <select 
              ref={optTunaiRef}
              value={subMode}
              onChange={(e) => setSubMode(e.target.value as any)}
              className="bg-gray-100 text-[10px] font-black text-gray-900 px-3 py-1 rounded-lg border-none outline-none appearance-none pr-7 cursor-pointer hover:bg-gray-200 transition-colors"
            >
              <option value="NORMAL">TUNAI</option>
              <option value="KHUSUS">KHUSUS</option>
              <option value="NON_TUNAI">NON-TUNAI</option>
            </select>
            <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-gray-400 pointer-events-none"></i>
          </div>
        </div>

        {/* Category Select for DIGITAL only */}
        {activeMode === 'DIGITAL' && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="grid grid-cols-2 gap-1">
              {['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].map((cat, idx) => (
                <button 
                  key={cat}
                  ref={el => catRefs.current[idx] = el}
                  onClick={() => { setKategori(cat); nominalRef.current?.focus(); }}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  className={cn(
                    "py-1.5 px-2 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all focus:ring-2 focus:ring-emerald-200 outline-none",
                    kategori === cat ? "bg-emerald-500 border-emerald-500 text-white shadow-md" : "bg-white border-gray-200 text-gray-900"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-black text-gray-900 mb-0.5 uppercase tracking-tighter ml-1">NOMINAL</label>
            <input 
              ref={nominalRef}
              type="text" 
              inputMode="numeric" 
              placeholder="0" 
              value={nominal}
              onChange={(e) => { setNominal(formatInputRupiah(e.target.value)); setErrorMsg(null); }}
              className="form-input-modern w-full text-[13px] font-black h-9 px-3"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <label className="block text-[9px] font-black text-gray-900 uppercase tracking-tighter ml-1">ADMIN</label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isAdminNonTunai}
                  onChange={(e) => setIsAdminNonTunai(e.target.checked)}
                  className="w-3 h-3 accent-purple-600"
                />
                <span className="text-[7px] font-black text-gray-900 uppercase tracking-tighter">DALAM</span>
              </label>
            </div>
            <input 
              ref={adminRef}
              type="text" 
              inputMode="numeric" 
              placeholder="0" 
              value={admin}
              onChange={(e) => { setAdmin(formatInputRupiah(e.target.value)); setErrorMsg(null); }}
              className={cn(
                "form-input-modern w-full text-[13px] font-black h-9 px-3 transition-all outline-none",
                isAdminNonTunai ? "bg-purple-50 text-purple-700 border-purple-200" : ""
              )}
            />
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-black text-gray-900 mb-0.5 uppercase tracking-tighter ml-1">Keterangan Opsional</label>
          <textarea 
            ref={keteranganRef}
            rows={1} 
            placeholder="..." 
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="form-input-modern w-full resize-none text-[13px] font-black py-2 h-9 px-3 outline-none"
          ></textarea>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-100 p-2 rounded-xl animate-bounce">
            <p className="text-[10px] font-black text-red-600 uppercase text-center tracking-widest flex items-center justify-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i> {errorMsg}
            </p>
          </div>
        )}

        <button 
          ref={btnSimpanRef}
          onClick={onSaveInternal} 
          disabled={isSaving || (activeMode === 'DIGITAL' && !kategori)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
          className="w-full bg-blue-700 text-white text-[12px] font-black py-4 rounded-2xl hover:bg-blue-800 shadow-xl shadow-blue-200 transition-all active:scale-95 focus:ring-4 focus:ring-blue-300 outline-none uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSaving ? (
            <i className="fa-solid fa-circle-notch fa-spin"></i>
          ) : (
            <i className="fa-solid fa-cloud-arrow-up"></i>
          )}
          {isSaving ? 'MEMPROSES...' : 'SIMPAN TRANSAKSI'}
        </button>
      </div>
    </div>
  )
}

export default TransactionForm
