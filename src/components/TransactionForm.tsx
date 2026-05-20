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
      else if (active === optTunaiRef.current) {
        if (activeMode === 'DIGITAL' && catRefs.current[0]) catRefs.current[0]?.focus()
        else keteranganRef.current?.focus()
      }
      else if (catRefs.current.includes(active as any)) keteranganRef.current?.focus()
      else if (active === keteranganRef.current) nominalRef.current?.focus()
      else if (active === nominalRef.current || active === adminRef.current) btnSimpanRef.current?.focus()
    } else if (e.key === 'ArrowUp') {
      if (active === optTunaiRef.current) btnDigitalRef.current?.focus()
      else if (catRefs.current.includes(active as any)) optTunaiRef.current?.focus()
      else if (active === keteranganRef.current) {
        if (activeMode === 'DIGITAL' && catRefs.current[0]) catRefs.current[0]?.focus()
        else optTunaiRef.current?.focus()
      }
      else if (active === nominalRef.current || active === adminRef.current) keteranganRef.current?.focus()
      else if (active === btnSimpanRef.current) nominalRef.current?.focus()
    }

    // Enter Key Logic
    if (e.key === 'Enter') {
      if (active === keteranganRef.current) { e.preventDefault(); nominalRef.current?.focus(); }
      else if (active === nominalRef.current) { e.preventDefault(); adminRef.current?.focus(); }
      else if (active === adminRef.current) { e.preventDefault(); btnSimpanRef.current?.focus(); }
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
      className="relative p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 rounded-[2.5rem] bg-white/80 backdrop-blur-2xl outline-none"
      onKeyDown={handleGlobalKeyDown}
      tabIndex={0}
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl -z-10 pointer-events-none -translate-x-1/3 translate-y-1/3"></div>
      {/* Main Categories */}
      <div className="flex gap-1 mb-3">
        {[
          { id: 'DIGITAL', label: 'TRANSFER', icon: 'fa-paper-plane', ref: btnDigitalRef },
          { id: 'TARIK', label: 'TARIK TUNAI', icon: 'fa-money-bill-transfer', ref: btnTarikRef },
          { id: 'AKSESORIS', label: 'AKSESORIS', icon: 'fa-headset', ref: btnAksesorisRef }
        ].map((mode) => {
          let activeStyles = "";
          let hoverStyles = "";
          let iconColor = "";
          if (mode.id === 'DIGITAL') {
             activeStyles = "bg-gradient-to-br from-blue-500 to-blue-700 border-transparent text-white shadow-[0_8px_20px_-6px_rgba(59,130,246,0.6)] scale-[1.02] z-10";
             hoverStyles = "hover:bg-blue-50 hover:border-blue-200 text-gray-600";
             iconColor = activeMode === mode.id ? "text-white" : "text-blue-500";
          } else if (mode.id === 'TARIK') {
             activeStyles = "bg-gradient-to-br from-red-500 to-red-700 border-transparent text-white shadow-[0_8px_20px_-6px_rgba(239,68,68,0.6)] scale-[1.02] z-10";
             hoverStyles = "hover:bg-red-50 hover:border-red-200 text-gray-600";
             iconColor = activeMode === mode.id ? "text-white" : "text-red-500";
          } else {
             activeStyles = "bg-gradient-to-br from-emerald-500 to-emerald-700 border-transparent text-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.6)] scale-[1.02] z-10";
             hoverStyles = "hover:bg-emerald-50 hover:border-emerald-200 text-gray-600";
             iconColor = activeMode === mode.id ? "text-white" : "text-emerald-500";
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
                "relative flex-1 flex flex-col items-center justify-center p-3 rounded-[1.25rem] border-2 transition-all duration-300 gap-2 outline-none overflow-hidden",
                activeMode === mode.id 
                  ? activeStyles
                  : cn("bg-white border-gray-100", hoverStyles)
              )}
            >
              {activeMode === mode.id && <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity"></div>}
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300", activeMode === mode.id ? "bg-white/20 shadow-inner" : "bg-gray-50")}>
                <i className={cn("fa-solid", mode.icon, iconColor, "text-sm transition-transform duration-300", activeMode === mode.id && "scale-110")}></i>
              </div>
              <span className={cn("text-[10px] font-black uppercase tracking-widest text-center leading-none transition-all", activeMode === mode.id ? "text-white" : "text-gray-700")}>{mode.label}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {/* Category Label + Mode Dropdown Row */}
        <div className="flex justify-between items-center px-2 py-1 bg-gray-50/50 rounded-xl border border-gray-100 backdrop-blur-sm">
          <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
            {activeMode === 'DIGITAL' ? 'Kategori' : activeMode === 'TARIK' ? 'Tarik Tunai' : 'Aksesoris'}
          </label>
          <div className="relative">
            <select 
              ref={optTunaiRef}
              value={subMode}
              onChange={(e) => setSubMode(e.target.value as any)}
              className="bg-white text-[10px] font-black text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm outline-none appearance-none pr-7 cursor-pointer hover:bg-blue-50 transition-colors focus:ring-2 focus:ring-blue-200"
            >
              <option value="" disabled>-Tujuan Dana Masuk-</option>
              <option value="NORMAL">TUNAI (Laci kasir)</option>
              <option value="NON_TUNAI">NON TUNAI</option>
              <option value="KHUSUS">KHUSUS (Terpisah)</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center pointer-events-none">
              <i className="fa-solid fa-chevron-down text-[7px] text-blue-600"></i>
            </div>
          </div>
        </div>

        {/* Category Select for DIGITAL only */}
        {activeMode === 'DIGITAL' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 mb-5">
            <div className="grid grid-cols-4 gap-1.5">
              {['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].map((cat, idx) => {
                const isActive = kategori === cat;
                return (
                  <button 
                    key={cat}
                    ref={el => { catRefs.current[idx] = el }}
                    onClick={() => { setKategori(cat); setIsKetAuto(true); nominalRef.current?.focus(); }}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                    className={cn(
                      "group relative py-2 px-1 rounded-xl border text-[9px] font-black uppercase tracking-tighter transition-all duration-300 outline-none overflow-hidden",
                      isActive 
                        ? "bg-gradient-to-br from-orange-400 to-orange-500 border-transparent text-white shadow-[0_4px_12px_-4px_rgba(249,115,22,0.6)] scale-[1.05] z-10" 
                        : "bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50/50"
                    )}
                  >
                    {isActive && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      {cat === 'Transfer Bank' && <i className="fa-solid fa-building-columns text-[13px]"></i>}
                      {cat === 'DANA' && <i className="fa-solid fa-wallet text-[13px]"></i>}
                      {cat === 'FLIP' && <i className="fa-solid fa-bolt text-[13px]"></i>}
                      {cat === 'Order Kuota' && <i className="fa-solid fa-wifi text-[13px]"></i>}
                      <span className="text-center leading-tight text-[8px] px-0.5">{cat}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-3 relative group">
          <div className="flex justify-between items-center mb-1.5 px-1">
            <label className="block text-[10px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
              <i className="fa-solid fa-align-left text-gray-400"></i> Keterangan
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer bg-gray-50 px-2 py-1 rounded-md border border-gray-100 hover:bg-gray-100 transition-colors">
              <input 
                type="checkbox" 
                checked={isKetAuto}
                onChange={(e) => setIsKetAuto(e.target.checked)}
                className="w-3 h-3 accent-blue-600 rounded-sm"
              />
              <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">OTOMATIS</span>
            </label>
          </div>
          <div className="relative">
            <textarea 
              ref={keteranganRef}
              rows={1} 
              placeholder="Tulis keterangan..." 
              value={keterangan}
              onFocus={handleInputFocus}
              onChange={(e) => {
                setKeterangan(e.target.value);
                if (isKetAuto) setIsKetAuto(false);
              }}
              className="w-full resize-none text-[13px] font-black py-2.5 min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
            ></textarea>
          </div>

          {/* Autocomplete Suggestions */}
          {presets && presets.length > 0 && (activeMode === 'DIGITAL' || activeMode === 'TARIK') && (
            <div className="mt-1 flex flex-wrap gap-1">
              {(() => {
                const searchQuery = keterangan.toUpperCase().replace(kategori.toUpperCase(), '').replace(/=/g, '').trim().toLowerCase();
                
                // Only show if user has typed something and there's a match
                if (searchQuery.length === 0) return null;
                
                const filtered = presets.filter(p => {
                  const pCat = p.kategori || 'Order Kuota';
                  return pCat === kategori && p.keterangan.toLowerCase().includes(searchQuery);
                });
                
                if (filtered.length === 0) return null;
                
                return filtered.map(p => {
                  const pCat = p.kategori || 'Order Kuota';
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setKeterangan(`${kategori.toUpperCase()} = ${p.keterangan.toUpperCase()}`);
                        if (pCat === 'Order Kuota') {
                          setNominal(p.modal.toLocaleString('id-ID').replace(/,/g, '.'));
                          setAdmin(p.jual.toLocaleString('id-ID').replace(/,/g, '.'));
                          adminRef.current?.focus();
                        } else {
                          nominalRef.current?.focus();
                        }
                        setIsKetAuto(false);
                      }}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md transition-all text-left"
                    >
                      {pCat === 'Order Kuota' 
                        ? `${p.keterangan} (M:${p.modal / 1000}k J:${p.jual / 1000}k)` 
                        : p.keterangan}
                    </button>
                  );
                })
              })()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative group">
            <label className="block text-[10px] font-black text-gray-700 mb-1.5 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <i className="fa-solid fa-coins text-yellow-500"></i>
              {kategori === 'Order Kuota' ? 'Modal' : 'Nominal'}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">Rp</div>
              <input 
                ref={nominalRef}
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={nominal}
                onFocus={handleInputFocus}
                onChange={(e) => { setNominal(formatInputRupiah(e.target.value)); setErrorMsg(null); }}
                className="w-full text-[14px] font-black h-11 pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-50 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="relative group">
            <div className="flex justify-between items-center mb-1.5 px-1">
              <label className="block text-[10px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
                <i className="fa-solid fa-hand-holding-dollar text-purple-500"></i>
                {kategori === 'Order Kuota' ? 'Jual' : 'Admin'}
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer bg-purple-50 px-2 py-1 rounded-md border border-purple-100 hover:bg-purple-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={isAdminNonTunai}
                  onChange={(e) => setIsAdminNonTunai(e.target.checked)}
                  className="w-3 h-3 accent-purple-600 rounded-sm"
                />
                <span className="text-[8px] font-black text-purple-700 uppercase tracking-widest">DALAM</span>
              </label>
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">Rp</div>
              <input 
                ref={adminRef}
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={admin}
                onFocus={handleInputFocus}
                onChange={(e) => { setAdmin(formatInputRupiah(e.target.value)); setErrorMsg(null); }}
                className={cn(
                  "w-full text-[14px] font-black h-11 pl-9 pr-3 rounded-xl border outline-none transition-all shadow-sm focus:ring-4",
                  isAdminNonTunai 
                    ? "bg-purple-50/80 text-purple-700 border-purple-300 focus:border-purple-400 focus:ring-purple-100" 
                    : "bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:border-purple-400 focus:ring-purple-50"
                )}
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50/80 border border-red-200 p-2.5 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300 backdrop-blur-sm shadow-sm">
            <p className="text-[10px] font-black text-red-600 uppercase text-center tracking-widest flex items-center justify-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-lg"></i> {errorMsg}
            </p>
          </div>
        )}

        <button 
          ref={btnSimpanRef}
          onClick={onSaveInternal} 
          disabled={isSaving || (activeMode === 'DIGITAL' && !kategori)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
          className="group relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-[13px] font-black py-4 rounded-2xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] transition-all duration-300 hover:shadow-[0_12px_25px_-6px_rgba(79,70,229,0.6)] active:scale-[0.98] focus:ring-4 focus:ring-indigo-300 outline-none uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
          {isSaving ? (
            <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-paper-plane text-sm"></i>
            </div>
          )}
          {isSaving ? 'MEMPROSES...' : 'SIMPAN TRANSAKSI'}
        </button>
      </div>
    </div>
  )
}

export default TransactionForm
