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
  presets?: any[]
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  kategori, setKategori, nominal, setNominal, admin, setAdmin, keterangan, setKeterangan, onSave, isSaving, presets = []
}) => {
  const [activeMode, setActiveMode] = useState<'DIGITAL' | 'TARIK' | 'AKSESORIS'>('DIGITAL')
  const [subMode, setSubMode] = useState<'NORMAL' | 'KHUSUS' | 'NON_TUNAI'>('NORMAL')
  const [isAdminNonTunai, setIsAdminNonTunai] = useState(false)
  const [isKetAuto, setIsKetAuto] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Auto Keterangan Logic
  React.useEffect(() => {
    if (isKetAuto) {
      let autoText = `${kategori} = `;
      if (nominal && nominal !== '0' && kategori !== 'Order Kuota') {
        autoText += `${nominal}`;
      }
      setKeterangan(autoText.toUpperCase());
    }
  }, [isKetAuto, kategori, nominal, setKeterangan]);
  
  // Refs for navigation
  const btnDigitalRef = useRef<HTMLButtonElement>(null)
  const btnTarikRef = useRef<HTMLButtonElement>(null)
  const btnAksesorisRef = useRef<HTMLButtonElement>(null)
  const catRefs = useRef<(HTMLButtonElement | null)[]>([])
  const nominalRef = useRef<HTMLInputElement>(null)
  const adminRef = useRef<HTMLInputElement>(null)
  const keteranganRef = useRef<HTMLTextAreaElement>(null)
  const optTunaiRef = useRef<HTMLSelectElement>(null)
  const btnSimpanRef = useRef<HTMLButtonElement>(null)

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    const active = document.activeElement
    
    // Arrow Keys Navigation Logic
    if (e.key === 'ArrowRight') {
      if (active === btnDigitalRef.current) btnTarikRef.current?.focus()
      else if (active === btnTarikRef.current) btnAksesorisRef.current?.focus()
      else if (active === nominalRef.current) adminRef.current?.focus()
      else {
        const catIdx = catRefs.current.indexOf(active as any)
        if (catIdx !== -1 && catIdx % 2 === 0) catRefs.current[catIdx + 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft') {
      if (active === btnTarikRef.current) btnDigitalRef.current?.focus()
      else if (active === btnAksesorisRef.current) btnTarikRef.current?.focus()
      else if (active === adminRef.current) nominalRef.current?.focus()
      else {
        const catIdx = catRefs.current.indexOf(active as any)
        if (catIdx !== -1 && catIdx % 2 === 1) catRefs.current[catIdx - 1]?.focus()
      }
    } else if (e.key === 'ArrowDown') {
      if (active === btnDigitalRef.current || active === btnTarikRef.current || active === btnAksesorisRef.current) optTunaiRef.current?.focus()
      else if (active === optTunaiRef.current) nominalRef.current?.focus()
      else if (active === nominalRef.current || active === adminRef.current) keteranganRef.current?.focus()
      else if (active === keteranganRef.current) btnSimpanRef.current?.focus()
    } else if (e.key === 'ArrowUp') {
      if (active === optTunaiRef.current) btnDigitalRef.current?.focus()
      else if (active === nominalRef.current) optTunaiRef.current?.focus()
      else if (active === adminRef.current) optTunaiRef.current?.focus()
      else if (active === keteranganRef.current) nominalRef.current?.focus()
      else if (active === btnSimpanRef.current) keteranganRef.current?.focus()
    }

    // Enter Key Logic
    if (e.key === 'Enter') {
      if (active === nominalRef.current) { e.preventDefault(); adminRef.current?.focus(); }
      else if (active === adminRef.current) { e.preventDefault(); keteranganRef.current?.focus(); }
      else if (active === keteranganRef.current) { e.preventDefault(); btnSimpanRef.current?.focus(); }
    }
  }

  const handleInputFocus = (e: React.FocusEvent<HTMLElement>) => {
    const target = e.target;
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

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
    setIsKetAuto(true)
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
        ].map((mode) => {
          let activeStyles = "";
          let hoverStyles = "";
          if (mode.id === 'DIGITAL') {
             activeStyles = "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 focus:ring-blue-100 focus:border-blue-400";
             hoverStyles = "hover:border-blue-300 hover:text-blue-600 focus:ring-blue-100";
          } else if (mode.id === 'TARIK') {
             activeStyles = "bg-red-500 border-red-500 text-white shadow-lg shadow-red-200 focus:ring-red-100 focus:border-red-400";
             hoverStyles = "hover:border-red-300 hover:text-red-600 focus:ring-red-100";
          } else {
             activeStyles = "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200 focus:ring-emerald-100 focus:border-emerald-400";
             hoverStyles = "hover:border-emerald-300 hover:text-emerald-600 focus:ring-emerald-100";
          }

          return (
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
                "flex-1 flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5 focus:ring-4 outline-none",
                activeMode === mode.id 
                  ? activeStyles
                  : cn("bg-gray-50 border-gray-100 text-gray-900", hoverStyles)
              )}
            >
              <i className={cn("fa-solid", mode.icon, "text-sm")}></i>
              <span className="text-[9px] font-black uppercase tracking-tighter text-center leading-none">{mode.label}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {/* Category Label + Mode Dropdown Row */}
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-black text-black uppercase tracking-widest">
            {activeMode === 'DIGITAL' ? 'Pilih Kategori' : activeMode === 'TARIK' ? 'Tarik Tunai' : 'Aksesoris'}
          </label>
          <div className="relative">
            <select 
              ref={optTunaiRef}
              value={subMode}
              onChange={(e) => setSubMode(e.target.value as any)}
              className="bg-gray-100 text-[10px] font-black text-black px-3 py-1 rounded-lg border-none outline-none appearance-none pr-7 cursor-pointer hover:bg-gray-200 transition-colors"
            >
              <option value="" disabled>-Tujuan Dana Masuk-</option>
              <option value="NORMAL">TUNAI (Laci kasir)</option>
              <option value="NON_TUNAI">NON TUNAI</option>
              <option value="KHUSUS">KHUSUS (Hitungan terpisah)</option>
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
                  ref={el => { catRefs.current[idx] = el }}
                  onClick={() => { setKategori(cat); setIsKetAuto(true); nominalRef.current?.focus(); }}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  className={cn(
                    "py-1.5 px-2 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all focus:ring-2 focus:ring-orange-200 outline-none",
                    kategori === cat ? "bg-orange-500 border-orange-500 text-white shadow-md" : "bg-white border-gray-200 text-black"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-3">
          <div className="flex justify-between items-center mb-0.5">
            <label className="block text-[9px] font-black text-black uppercase tracking-tighter ml-1">Keterangan Opsional</label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isKetAuto}
                onChange={(e) => setIsKetAuto(e.target.checked)}
                className="w-3 h-3 accent-blue-600"
              />
              <span className="text-[7px] font-black text-black uppercase tracking-tighter">KETERANGAN OTOMATIS</span>
            </label>
          </div>
          <textarea 
            ref={keteranganRef}
            rows={1} 
            placeholder="..." 
            value={keterangan}
            onFocus={handleInputFocus}
            onChange={(e) => {
              setKeterangan(e.target.value);
              if (isKetAuto) setIsKetAuto(false);
            }}
            className="form-input-modern w-full resize-none text-[13px] font-black py-2 h-9 px-3 outline-none"
          ></textarea>

          {/* Autocomplete Suggestions */}
          {presets && presets.length > 0 && activeMode === 'DIGITAL' && (
            <div className="mt-1 flex flex-wrap gap-1">
              {(() => {
                const searchQuery = keterangan.toUpperCase().replace(kategori.toUpperCase(), '').replace(/=/g, '').trim().toLowerCase();
                
                // Only show if user has typed something and there's a match
                if (searchQuery.length === 0) return null;
                
                const filtered = presets.filter(p => p.keterangan.toLowerCase().includes(searchQuery));
                if (filtered.length === 0) return null;
                
                return filtered.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setKeterangan(`${kategori.toUpperCase()} = ${p.keterangan.toUpperCase()}`);
                      setNominal(p.modal.toLocaleString('id-ID').replace(/,/g, '.'));
                      setAdmin(p.jual.toLocaleString('id-ID').replace(/,/g, '.'));
                      setIsKetAuto(false);
                      adminRef.current?.focus();
                    }}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md transition-all text-left"
                  >
                    {p.keterangan} (M:{p.modal / 1000}k J:{p.jual / 1000}k)
                  </button>
                ))
              })()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-black text-black mb-0.5 uppercase tracking-tighter ml-1">
              {kategori === 'Order Kuota' ? 'HARGA MODAL' : 'NOMINAL'}
            </label>
            <input 
              ref={nominalRef}
              type="text" 
              inputMode="numeric" 
              placeholder="0" 
              value={nominal}
              onFocus={handleInputFocus}
              onChange={(e) => { setNominal(formatInputRupiah(e.target.value)); setErrorMsg(null); }}
              className="form-input-modern w-full text-[13px] font-black h-9 px-3"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <label className="block text-[9px] font-black text-black uppercase tracking-tighter ml-1">
                {kategori === 'Order Kuota' ? 'HARGA JUAL' : 'ADMIN'}
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isAdminNonTunai}
                  onChange={(e) => setIsAdminNonTunai(e.target.checked)}
                  className="w-3 h-3 accent-purple-600"
                />
                <span className="text-[7px] font-black text-black uppercase tracking-tighter">DALAM</span>
              </label>
            </div>
            <input 
              ref={adminRef}
              type="text" 
              inputMode="numeric" 
              placeholder="0" 
              value={admin}
              onFocus={handleInputFocus}
              onChange={(e) => { setAdmin(formatInputRupiah(e.target.value)); setErrorMsg(null); }}
              className={cn(
                "form-input-modern w-full text-[13px] font-black h-9 px-3 transition-all outline-none",
                isAdminNonTunai ? "bg-purple-50 text-purple-700 border-purple-200" : ""
              )}
            />
          </div>
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
