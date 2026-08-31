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
  onOpenVoucherJualCepat?: () => void
  activeStoreId?: string
  adminRules?: Record<string, any>
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  kategori, setKategori, nominal, setNominal, admin, setAdmin, keterangan, setKeterangan, onSave, isSaving, presets = [], onOpenVoucherJualCepat, activeStoreId, adminRules
}) => {
  const [activeMode, setActiveMode] = useState<'DIGITAL' | 'TARIK' | 'AKSESORIS' | 'VOUCHER'>('DIGITAL')
  const [subMode, setSubMode] = useState<'NORMAL' | 'KHUSUS' | 'NON_TUNAI'>('NORMAL')
  const [isAdminNonTunai, setIsAdminNonTunai] = useState(false)
  const [isKetAuto, setIsKetAuto] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selectedBank, setSelectedBank] = useState('BRI')
  const [selectedSumber, setSelectedSumber] = useState('QRIS')
  const [sumberAplikasi, setSumberAplikasi] = useState('BANK')
  const [tujuanMasuk, setTujuanMasuk] = useState('TUNAI LACI KASIR')
  const [isSumberModalOpen, setIsSumberModalOpen] = useState(false)
  const [isTujuanModalOpen, setIsTujuanModalOpen] = useState(false)

  const BANK_LIST = ['BRI','BNI','BCA','MANDIRI','LAINNYA']
  const SUMBER_LIST = ['QRIS','ATM','DANA','GOPAY','BANK']
  const sumberToKategori: Record<string,string> = { 'BANK':'Transfer Bank','FLIP':'FLIP','ORDER KUOTA':'Order Kuota','DANA':'DANA' }

  // Sync sumberAplikasi → kategori
  React.useEffect(() => {
    if (activeMode === 'DIGITAL') setKategori(sumberToKategori[sumberAplikasi] || 'Transfer Bank')
  }, [sumberAplikasi, activeMode])

  // Sync tujuanMasuk → subMode
  React.useEffect(() => {
    setSubMode(tujuanMasuk === 'NON TUNAI' ? 'NON_TUNAI' : 'NORMAL')
  }, [tujuanMasuk])
  
  // Auto Keterangan Logic
  React.useEffect(() => {
    if (!isKetAuto) return
    let autoText = ''
    if (activeMode === 'DIGITAL') {
      if (sumberAplikasi === 'BANK') autoText = `Transfer Bank ${selectedBank}`
      else if (sumberAplikasi === 'FLIP') autoText = `Transfer FLIP`
      else if (sumberAplikasi === 'ORDER KUOTA') autoText = `Order Kuota${nominal && nominal !== '0' ? ` = ${nominal}` : ''}`
      else autoText = `Transfer ${sumberAplikasi}`
    } else if (activeMode === 'TARIK') {
      autoText = `Tarik Tunai Saldo Masuk ke = ${selectedSumber}`
    } else {
      autoText = `${kategori} = `
      if (nominal && nominal !== '0' && kategori !== 'Order Kuota') autoText += nominal
    }
    setKeterangan(autoText.toUpperCase())
  }, [isKetAuto, kategori, nominal, activeMode, selectedBank, selectedSumber, sumberAplikasi, setKeterangan]);
  
  // Auto Admin Logic
  const [isAdminManuallyEdited, setIsAdminManuallyEdited] = useState(false);

  React.useEffect(() => {
    if (kategori === 'Order Kuota' || !kategori || !activeStoreId) return;
    if (isAdminManuallyEdited) return; // Prevent overwriting if user typed manually
    
    try {
      if (adminRules) {
        const catRules = adminRules[kategori] || [];
        const numNominal = parseInt(nominal.replace(/[^0-9]/g, '')) || 0;
        
        let foundAdmin = 0;
        for (const rule of catRules) {
          if (numNominal <= rule.max) {
            foundAdmin = rule.admin;
            break;
          }
        }
        
        if (foundAdmin > 0) {
          setAdmin(formatInputRupiah(foundAdmin.toString()));
        } else if (numNominal > 0 && catRules.length > 0) {
           // If it exceeds all max, use the last rule's admin
           const lastRule = catRules[catRules.length - 1];
           if (numNominal > lastRule.max) {
             setAdmin(formatInputRupiah(lastRule.admin.toString()));
           }
        }
      }
    } catch (e) {
      console.error('Failed to parse admin rules', e);
    }
  }, [nominal, kategori, activeStoreId, isAdminManuallyEdited, setAdmin, adminRules]);
  
  // Refs for navigation
  const btnDigitalRef = useRef<HTMLButtonElement>(null)
  const btnTarikRef = useRef<HTMLButtonElement>(null)
  const btnAksesorisRef = useRef<HTMLButtonElement>(null)
  const btnVoucherRef = useRef<HTMLButtonElement>(null)
  const catRefs = useRef<(HTMLButtonElement | null)[]>([])
  const nominalRef = useRef<HTMLInputElement>(null)
  const adminRef = useRef<HTMLInputElement>(null)
  const keteranganRef = useRef<HTMLTextAreaElement>(null)
  const optTunaiRef = useRef<HTMLSelectElement>(null)
  const sumberRef = useRef<HTMLSelectElement>(null)
  const btnSimpanRef = useRef<HTMLButtonElement>(null)

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    // Intercept when modals are open
    if (isSumberModalOpen) {
      const arr = ['BANK', 'DANA', 'FLIP', 'ORDER KUOTA'];
      const idx = arr.indexOf(sumberAplikasi);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (idx < arr.length - 1) setSumberAplikasi(arr[idx + 1]); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) setSumberAplikasi(arr[idx - 1]); }
      else if (e.key === 'Enter') { 
        e.preventDefault(); 
        setIsKetAuto(true); setIsAdminManuallyEdited(false); setIsSumberModalOpen(false); 
        optTunaiRef.current?.focus();
      }
      else if (e.key === 'Escape') { e.preventDefault(); setIsSumberModalOpen(false); }
      return;
    }

    if (isTujuanModalOpen) {
      const arr = ['TUNAI LACI KASIR', 'NON TUNAI'];
      const idx = arr.indexOf(tujuanMasuk);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (idx < arr.length - 1) setTujuanMasuk(arr[idx + 1]); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) setTujuanMasuk(arr[idx - 1]); }
      else if (e.key === 'Enter') { 
        e.preventDefault(); setIsTujuanModalOpen(false); keteranganRef.current?.focus();
      }
      else if (e.key === 'Escape') { e.preventDefault(); setIsTujuanModalOpen(false); }
      return;
    }

    const active = document.activeElement
    const isTyping = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement

    // Letter/Number Shortcuts (only when not typing)
    if (!isTyping && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); setActiveMode('DIGITAL'); setKategori(sumberToKategori[sumberAplikasi] || 'Transfer Bank'); setIsAdminManuallyEdited(false); return }
      if (e.key === 'w' || e.key === 'W') { e.preventDefault(); setActiveMode('TARIK'); setKategori('Tarik Tunai'); setIsAdminManuallyEdited(false); return }
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setActiveMode('AKSESORIS'); setKategori('Aksesoris'); setIsAdminManuallyEdited(false); return }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); if (onOpenVoucherJualCepat) onOpenVoucherJualCepat(); return }
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); setIsSumberModalOpen(true); return }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); setIsTujuanModalOpen(true); return }
      if (['1','2','3','4','5'].includes(e.key)) {
        const idx = parseInt(e.key) - 1
        if (activeMode === 'DIGITAL' && sumberAplikasi === 'BANK') { setSelectedBank(BANK_LIST[idx] || 'BRI'); setIsAdminManuallyEdited(false) }
        else if (activeMode === 'TARIK') setSelectedSumber(SUMBER_LIST[idx] || 'QRIS')
        return
      }
    }

    // Arrow Keys Navigation
    if (e.key === 'ArrowRight') {
      if (active === btnDigitalRef.current) btnTarikRef.current?.focus()
      else if (active === btnTarikRef.current) btnAksesorisRef.current?.focus()
      else if (active === btnAksesorisRef.current) btnVoucherRef.current?.focus()
      else if (active === nominalRef.current) adminRef.current?.focus()
    } else if (e.key === 'ArrowLeft') {
      if (active === btnTarikRef.current) btnDigitalRef.current?.focus()
      else if (active === btnAksesorisRef.current) btnTarikRef.current?.focus()
      else if (active === btnVoucherRef.current) btnAksesorisRef.current?.focus()
      else if (active === adminRef.current) nominalRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      if ([btnDigitalRef,btnTarikRef,btnAksesorisRef,btnVoucherRef].some(r=>active===r.current)) sumberRef.current?.focus()
      else if (active === sumberRef.current) optTunaiRef.current?.focus()
      else if (active === optTunaiRef.current) keteranganRef.current?.focus()
      else if (active === keteranganRef.current) nominalRef.current?.focus()
      else if (active === nominalRef.current || active === adminRef.current) btnSimpanRef.current?.focus()
    } else if (e.key === 'ArrowUp') {
      if (active === sumberRef.current) btnDigitalRef.current?.focus()
      else if (active === optTunaiRef.current) sumberRef.current?.focus()
      else if (active === keteranganRef.current) optTunaiRef.current?.focus()
      else if (active === nominalRef.current || active === adminRef.current) keteranganRef.current?.focus()
      else if (active === btnSimpanRef.current) nominalRef.current?.focus()
    }

    if (e.key === 'Enter') {
      if (active === keteranganRef.current) { e.preventDefault(); nominalRef.current?.focus() }
      else if (active === nominalRef.current) { e.preventDefault(); adminRef.current?.focus() }
      else if (active === adminRef.current) { e.preventDefault(); btnSimpanRef.current?.focus() }
      else if (active === btnSimpanRef.current) { e.preventDefault(); onSaveInternal() }
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

      // Validasi khusus Order Kuota: Jual HARUS lebih besar dari Modal
      if (kategori === 'Order Kuota') {
        if (cleanAdmin <= cleanNominal) {
          setErrorMsg('⚠️ Harga JUAL harus lebih besar dari Harga MODAL! Cek kembali inputan Anda.')
          adminRef.current?.focus()
          return
        }
      } else {
        // Untuk kategori lain: Admin harus lebih kecil dari Nominal (reminder saja, tidak block)
        if (cleanAdmin >= cleanNominal) {
          setErrorMsg('⚠️ Perhatian: ADMIN biasanya lebih kecil dari NOMINAL. Pastikan tidak terbalik!')
          return
        }
      }
    }

    const activeTab = subMode === 'NORMAL' ? 'BARU' : 'LAIN'
    const subTab = subMode === 'NORMAL' ? 'KHUSUS' : subMode
    onSave({ activeTab, subTab: subMode === 'NORMAL' ? 'KHUSUS' : (subTab as any), isAdminNonTunai })
    setIsKetAuto(true)
  }

  return (
    <div className="relative p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 rounded-[2.5rem] bg-white/80 backdrop-blur-2xl outline-none" onKeyDown={handleGlobalKeyDown} tabIndex={0}>
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl -z-10 pointer-events-none -translate-x-1/3 translate-y-1/3"></div>
      {/* KATEGORI LAYANAN */}
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">Kategori Layanan</p>
      <div className="grid grid-cols-4 gap-1.5 mb-2.5">
        {([
          { id: 'DIGITAL', label: 'Transfer', icon: 'fa-paper-plane', key: 'Q', ref: btnDigitalRef, active: 'from-blue-500 to-blue-700 shadow-blue-500/40', ic: 'text-blue-500', hov: 'hover:bg-blue-50 hover:border-blue-200' },
          { id: 'TARIK', label: 'Tarik Tunai', icon: 'fa-money-bill-transfer', key: 'W', ref: btnTarikRef, active: 'from-red-500 to-red-700 shadow-red-500/40', ic: 'text-red-500', hov: 'hover:bg-red-50 hover:border-red-200' },
          { id: 'AKSESORIS', label: 'Aksesoris', icon: 'fa-headset', key: 'E', ref: btnAksesorisRef, active: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40', ic: 'text-emerald-500', hov: 'hover:bg-emerald-50 hover:border-emerald-200' },
          { id: 'VOUCHER', label: 'Voucher', icon: 'fa-ticket', key: 'R', ref: btnVoucherRef, active: 'from-orange-500 to-orange-700 shadow-orange-500/40', ic: 'text-orange-500', hov: 'hover:bg-orange-50 hover:border-orange-200' },
        ] as const).map((mode) => {
          const isAct = activeMode === mode.id
          return (
            <button
              key={mode.id}
              ref={mode.ref as any}
              onClick={() => {
                if (mode.id === 'VOUCHER') { if (onOpenVoucherJualCepat) onOpenVoucherJualCepat(); return }
                setActiveMode(mode.id as any); setIsAdminManuallyEdited(false)
                if (mode.id === 'TARIK') setKategori('Tarik Tunai')
                else if (mode.id === 'AKSESORIS') setKategori('Aksesoris')
                else setKategori(sumberToKategori[sumberAplikasi] || 'Transfer Bank')
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
              className={cn(
                'relative flex flex-col items-center justify-center pt-3 pb-2 px-1 rounded-[1.25rem] border-2 transition-all duration-300 gap-1 outline-none overflow-hidden min-w-0',
                isAct ? `bg-gradient-to-br ${mode.active} border-transparent text-white shadow-[0_8px_20px_-6px] scale-[1.02] z-10` : cn('bg-white border-gray-100 text-gray-600', mode.hov)
              )}
            >
              {/* Shortcut Badge */}
              <span className={cn('absolute top-1 left-1.5 text-[8px] font-black leading-none px-1 py-0.5 rounded', isAct ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-400')}>{mode.key}</span>
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', isAct ? 'bg-white/20 shadow-inner' : 'bg-gray-50')}>
                <i className={cn('fa-solid', mode.icon, 'text-sm', isAct ? 'text-white' : mode.ic)}></i>
              </div>
              <span className={cn('text-[9px] font-black uppercase tracking-tight text-center leading-none', isAct ? 'text-white' : 'text-gray-700')}>{mode.label}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        {/* Sumber Aplikasi + Tujuan Masuk */}
        <div className="grid grid-cols-2 gap-2">
          {/* Sumber Aplikasi */}
          {activeMode === 'DIGITAL' ? (
            <div>
              <div className="flex items-center gap-1 mb-1 px-1">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Sumber Aplikasi</p>
                <span className="ml-auto text-[8px] font-black bg-blue-100 text-blue-600 px-1 rounded">A</span>
              </div>
              <div className="relative">
                <button
                  ref={sumberRef as any}
                  onClick={() => setIsSumberModalOpen(true)}
                  className="w-full bg-white text-[12px] font-black text-gray-800 px-3 py-2.5 rounded-xl border-2 border-gray-200 outline-none text-left pr-8 hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all flex items-center justify-between"
                >
                  <span>{sumberAplikasi}</span>
                  <i className="fa-solid fa-chevron-down text-[8px] text-gray-400"></i>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 px-1">Metode Tarik</p>
              <div className="bg-gray-50 rounded-xl border-2 border-gray-200 px-3 py-2.5">
                <p className="text-[12px] font-black text-gray-700">{activeMode === 'TARIK' ? 'Tarik Tunai' : activeMode === 'AKSESORIS' ? 'Aksesoris' : 'Voucher'}</p>
              </div>
            </div>
          )}
          {/* Tujuan Masuk */}
          <div>
            <div className="flex items-center gap-1 mb-1 px-1">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tujuan Masuk</p>
              <span className="ml-auto text-[8px] font-black bg-blue-100 text-blue-600 px-1 rounded">S</span>
            </div>
            <div className="relative">
                <button
                  ref={optTunaiRef as any}
                  onClick={() => setIsTujuanModalOpen(true)}
                  className="w-full bg-white text-[12px] font-black text-gray-800 px-3 py-2.5 rounded-xl border-2 border-gray-200 outline-none text-left pr-8 hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all flex items-center justify-between"
                >
                  <span>{tujuanMasuk}</span>
                  <i className="fa-solid fa-chevron-down text-[8px] text-gray-400"></i>
                </button>
            </div>
          </div>
        </div>

        {/* Quick Picker - Bank (Transfer + BANK) */}
        {activeMode === 'DIGITAL' && sumberAplikasi === 'BANK' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-gray-50/80 rounded-2xl border border-gray-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1"><i className="fa-solid fa-building-columns text-blue-500"></i> Pilih Bank Transfer:</p>
              <p className="text-[9px] font-black text-blue-600">Pilih Cepat Klik (1-5)</p>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {['BRI','BNI','BCA','MANDIRI','LAINNYA'].map((bank, idx) => (
                <button
                  key={bank}
                  onClick={() => { setSelectedBank(bank); setIsKetAuto(true) }}
                  className={cn(
                    'flex flex-col items-center justify-center py-2 px-1 rounded-xl border-2 transition-all duration-200 outline-none',
                    selectedBank === bank
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700 border-transparent text-white shadow-[0_4px_12px_-4px_rgba(59,130,246,0.6)] scale-[1.03]'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                  )}
                >
                  <span className={cn('text-[8px] font-black leading-none mb-0.5', selectedBank === bank ? 'text-white/70' : 'text-gray-400')}>{idx+1}</span>
                  <span className="text-[9px] font-black leading-none">{bank}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Picker - Sumber (Tarik Tunai) */}
        {activeMode === 'TARIK' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-gray-50/80 rounded-2xl border border-gray-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1"><i className="fa-solid fa-credit-card text-emerald-500"></i> Pilih Sumber Tujuan:</p>
              <p className="text-[9px] font-black text-emerald-600">Pilih Cepat Klik (1-5)</p>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {['QRIS','ATM','DANA','GOPAY','BANK'].map((src, idx) => (
                <button
                  key={src}
                  onClick={() => { setSelectedSumber(src); setIsKetAuto(true) }}
                  className={cn(
                    'flex flex-col items-center justify-center py-2 px-1 rounded-xl border-2 transition-all duration-200 outline-none',
                    selectedSumber === src
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-transparent text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.6)] scale-[1.03]'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'
                  )}
                >
                  <span className={cn('text-[8px] font-black leading-none mb-0.5', selectedSumber === src ? 'text-white/70' : 'text-gray-400')}>{idx+1}</span>
                  <span className="text-[9px] font-black leading-none">{src}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative group">
          <div className="flex justify-between items-center mb-1 px-1">
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
              className="w-full resize-none text-[11px] font-black py-1.5 min-h-[36px] px-3 rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
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

        <div className="flex gap-3 flex-nowrap">
          <div className="relative group flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1.5 px-1">
              <label className="flex items-center text-[10px] font-black text-gray-700 uppercase tracking-widest gap-1.5 whitespace-nowrap">
                <i className="fa-solid fa-coins text-yellow-500"></i>
                {kategori === 'Order Kuota' ? 'Harga Modal' : 'Nominal'}
              </label>
              {kategori !== 'Order Kuota' && (
                <span className="text-[8px] font-bold text-slate-400 italic">mis: 50.000</span>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">Rp</div>
              <input 
                ref={nominalRef}
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={nominal}
                onFocus={handleInputFocus}
                onChange={(e) => { setNominal(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(false); }}
                className="w-full text-[14px] font-black h-11 pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-50 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="relative group flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <label className="flex items-center text-[10px] font-black text-gray-700 uppercase tracking-widest gap-1.5">
                <i className={cn("fa-solid text-[10px]", kategori === 'Order Kuota' ? "fa-tag text-emerald-500" : "fa-hand-holding-dollar text-purple-500")}></i>
                {kategori === 'Order Kuota' ? 'Harga Jual' : 'Admin'}
              </label>
              {kategori !== 'Order Kuota' && (
                <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap ml-auto">
                  <input
                    type="checkbox"
                    checked={isAdminNonTunai}
                    onChange={(e) => setIsAdminNonTunai(e.target.checked)}
                    className="w-3 h-3 accent-purple-600 align-middle"
                  />
                  <span className="text-[8px] font-black text-purple-700 uppercase tracking-widest">DALAM</span>
                </label>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">Rp</div>
              <input 
                ref={adminRef}
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={admin}
                onFocus={(e) => {
                  handleInputFocus(e);
                  e.target.select();
                }}
                onChange={(e) => { setAdmin(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(true); }}
                className={cn(
                  "w-full text-[14px] font-black h-11 pl-9 pr-3 rounded-xl border outline-none transition-all shadow-sm focus:ring-4",
                  kategori === 'Order Kuota' && (() => {
                    const m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
                    const j = parseInt(admin.replace(/[^0-9]/g, '')) || 0
                    return m > 0 && j > 0 && j <= m
                      ? "bg-red-50 text-red-700 border-red-300 focus:border-red-400 focus:ring-red-100"
                      : m > 0 && j > m
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                        : "bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:border-emerald-400 focus:ring-emerald-50"
                  })() || (isAdminNonTunai 
                    ? "bg-purple-50/80 text-purple-700 border-purple-300 focus:border-purple-400 focus:ring-purple-100" 
                    : "bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:border-purple-400 focus:ring-purple-50")
                )}
              />
              {/* Indikator real-time untuk Order Kuota */}
              {kategori === 'Order Kuota' && (() => {
                const m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
                const j = parseInt(admin.replace(/[^0-9]/g, '')) || 0
                if (m > 0 && j > 0) {
                  if (j > m) {
                    return (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                        <i className="fa-solid fa-check text-white text-[10px]"></i>
                      </div>
                    )
                  } else {
                    return (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow animate-pulse">
                        <i className="fa-solid fa-xmark text-white text-[10px]"></i>
                      </div>
                    )
                  }
                }
                return null
              })()}
            </div>
          </div>
        </div>
        {/* Peringatan real-time Order Kuota: Jual < Modal */}
        {kategori === 'Order Kuota' && (() => {
          const m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
          const j = parseInt(admin.replace(/[^0-9]/g, '')) || 0
          if (m > 0 && j > 0 && j <= m) {
            return (
              <div className="-mt-1 bg-red-50 border border-red-200 px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <i className="fa-solid fa-triangle-exclamation text-red-500 text-sm shrink-0"></i>
                <p className="text-[10px] font-black text-red-700 uppercase tracking-wide leading-tight">
                  Harga JUAL ({j.toLocaleString('id-ID')}) harus lebih besar dari MODAL ({m.toLocaleString('id-ID')})!
                </p>
              </div>
            )
          }
          if (m > 0 && j > m) {
            return (
              <div className="-mt-1 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                <i className="fa-solid fa-circle-check text-emerald-500 text-sm shrink-0"></i>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">
                  Laba: Rp {(j - m).toLocaleString('id-ID')} ✓
                </p>
              </div>
            )
          }
          return null
        })()}
        {/* Reminder untuk kategori BUKAN Order Kuota */}
        {kategori !== 'Order Kuota' && activeMode === 'DIGITAL' && (() => {
          const n = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
          const a = parseInt(admin.replace(/[^0-9]/g, '')) || 0
          if (n > 0 && a >= n) {
            return (
              <div className="-mt-1 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <i className="fa-solid fa-triangle-exclamation text-amber-500 text-sm shrink-0"></i>
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-wide leading-tight">
                  Admin ({a.toLocaleString('id-ID')}) harusnya lebih kecil dari Nominal ({n.toLocaleString('id-ID')}). Cek kembali!
                </p>
              </div>
            )
          }
          return null
        })()}

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
          {isSaving ? 'MEMPROSES...' : `SIMPAN TRANSAKSI${(() => { const n = parseInt(nominal.replace(/[^0-9]/g,'')) || 0; return n > 0 ? ` (Rp ${n.toLocaleString('id-ID')})` : '' })()}`}
        </button>
      </div>

      {/* Modal Sumber Aplikasi */}
      {isSumberModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsSumberModalOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col">
              {['BANK', 'DANA', 'FLIP', 'ORDER KUOTA'].map((s, idx, arr) => (
                <button
                  key={s}
                  onClick={() => {
                    setSumberAplikasi(s);
                    setIsKetAuto(true);
                    setIsAdminManuallyEdited(false);
                    setIsSumberModalOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50",
                    idx !== arr.length - 1 && "border-b-2 border-gray-100"
                  )}
                >
                  <span className="text-[17px] font-black text-slate-800">{s}</span>
                  {sumberAplikasi === s ? (
                    <div className="flex items-center justify-center w-[22px] h-[22px] rounded-full border-[3px] border-[#293659]">
                      <div className="w-[10px] h-[10px] rounded-full bg-[#293659]"></div>
                    </div>
                  ) : (
                    <div className="w-[22px] h-[22px] rounded-full border-2 border-gray-400"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tujuan Masuk */}
      {isTujuanModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsTujuanModalOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col">
              {['TUNAI LACI KASIR', 'NON TUNAI'].map((t, idx, arr) => (
                <button
                  key={t}
                  onClick={() => {
                    setTujuanMasuk(t);
                    setIsTujuanModalOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50",
                    idx !== arr.length - 1 && "border-b-2 border-gray-100"
                  )}
                >
                  <span className="text-[17px] font-black text-slate-800">{t}</span>
                  {tujuanMasuk === t ? (
                    <div className="flex items-center justify-center w-[22px] h-[22px] rounded-full border-[3px] border-[#293659]">
                      <div className="w-[10px] h-[10px] rounded-full bg-[#293659]"></div>
                    </div>
                  ) : (
                    <div className="w-[22px] h-[22px] rounded-full border-2 border-gray-400"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>

  )
}

export default TransactionForm
