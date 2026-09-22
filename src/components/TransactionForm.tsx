import React, { useRef, useState } from 'react'
import { formatInputRupiah, cn } from '../lib/utils'

interface TransactionFormProps {
  onSave: (data: { kategori: string, nominal: string, admin: string, keterangan: string }, options?: { activeTab: string, subTab: string, isAdminNonTunai: boolean, isSplit?: boolean, nonTunaiAmount?: number }) => void
  isSaving?: boolean
  presets?: any[]
  onOpenVoucherJualCepat?: () => void
  activeStoreId?: string
  adminRules?: Record<string, any>
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  onSave, isSaving, presets = [], onOpenVoucherJualCepat, activeStoreId, adminRules
}) => {
  const [kategori, setKategori] = useState('')
  const [nominal, setNominal] = useState('')
  const [admin, setAdmin] = useState('')
  const [keterangan, setKeterangan] = useState('')

  const [activeMode, setActiveMode] = useState<'DIGITAL' | 'TARIK' | 'AKSESORIS' | 'VOUCHER' | ''>('')
  const [subMode, setSubMode] = useState<'NORMAL' | 'KHUSUS' | 'NON_TUNAI'>('NORMAL')
  const [isAdminNonTunai, setIsAdminNonTunai] = useState(false)
  const [aksesorisPayMode, setAksesorisPayMode] = useState<'TUNAI' | 'QRIS'>('TUNAI')
  const [isKetAuto, setIsKetAuto] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selectedBank, setSelectedBank] = useState('BRI')
  const [selectedSumber, setSelectedSumber] = useState('QRIS')
  const [sumberAplikasi, setSumberAplikasi] = useState('BANK')
  const [tujuanMasuk, setTujuanMasuk] = useState('TUNAI LACI KASIR')
  const [nominalCashSplit, setNominalCashSplit] = useState('')
  const [nominalNonTunaiSplit, setNominalNonTunaiSplit] = useState('')
  const [isSumberModalOpen, setIsSumberModalOpen] = useState(false)
  const [isTujuanModalOpen, setIsTujuanModalOpen] = useState(false)
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false)
  const [activeTheme, setActiveTheme] = useState('TEMA_2')
  const [isTema3SheetOpen, setIsTema3SheetOpen] = useState(false)
  const [tema3Step, setTema3Step] = useState<'MAIN' | 'DIGITAL' | 'TARIK' | 'BANK_SELECTION'>('MAIN')
  // --- KALKULATOR STATE ---
  const [showCalc, setShowCalc] = useState(false)
  const [calcDisplay, setCalcDisplay] = useState('0')
  const [calcExpression, setCalcExpression] = useState('')
  const [calcPrev, setCalcPrev] = useState<number | null>(null)
  const [calcOperator, setCalcOperator] = useState<string | null>(null)
  const [calcNewInput, setCalcNewInput] = useState(true)

  // Effect untuk auto-focus saat ganti layar di Tema 3
  React.useEffect(() => {
    if (isTema3SheetOpen) {
      const timer = setTimeout(() => {
        const activeSlide = document.querySelector('#tema3-bottom-sheet .translate-x-0');
        if (activeSlide) {
           const focusBtn = activeSlide.querySelector('button[data-autofocus="true"]') as HTMLElement;
           if (focusBtn) focusBtn.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [tema3Step, isTema3SheetOpen]);

  const BANK_LIST = ['BRI','BNI','BCA','MANDIRI','LAINNYA']
  const SUMBER_LIST = ['BANK','GoPay','QRIS','DANA','ATM/EDC']
  const sumberToKategori: Record<string,string> = { 'BANK':'Transfer Bank','FLIP':'FLIP','ORDER KUOTA':'Order Kuota','DANA':'DANA' }

  // Global Keyboard Shortcuts (berlaku di mana saja di halaman beranda)
  React.useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (isSumberModalOpen || isTujuanModalOpen) return;
      
      const active = document.activeElement;
      const isTyping = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

      if (!isTyping && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key === 'Escape') {
          if (isTema3SheetOpen) setIsTema3SheetOpen(false);
        }
        if (e.key === 'q' || e.key === 'Q') { 
          e.preventDefault(); 
          if (activeTheme === 'TEMA_3') {
            if (isTema3SheetOpen) setIsTema3SheetOpen(false);
            else { setTema3Step('MAIN'); setIsTema3SheetOpen(true); }
          } else {
            setActiveMode('DIGITAL'); setKategori(sumberToKategori[sumberAplikasi] || 'Transfer Bank'); setIsAdminManuallyEdited(false);
          }
          return;
        }
        if (e.key === 'w' || e.key === 'W') { e.preventDefault(); setActiveMode('TARIK'); setKategori('Tarik Tunai'); setIsAdminManuallyEdited(false); return; }
        if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setActiveMode('AKSESORIS'); setKategori('Aksesoris'); setIsAdminManuallyEdited(false); return; }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); if (onOpenVoucherJualCepat) onOpenVoucherJualCepat(); return; }
        if (e.key === 'a' || e.key === 'A') { e.preventDefault(); setIsSumberModalOpen(true); return; }
        if (e.key === 's' || e.key === 'S') { e.preventDefault(); setIsTujuanModalOpen(true); return; }
        if (['1','2','3','4','5'].includes(e.key)) {
          const idx = parseInt(e.key) - 1;
          if (activeMode === 'DIGITAL' && sumberAplikasi === 'BANK') { setSelectedBank(BANK_LIST[idx] || 'BRI'); setIsAdminManuallyEdited(false); }
          else if (activeMode === 'TARIK') setSelectedSumber(SUMBER_LIST[idx] || 'QRIS');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [
    isSumberModalOpen, isTujuanModalOpen, isTema3SheetOpen, activeTheme, 
    activeMode, sumberAplikasi, onOpenVoucherJualCepat
  ]);

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
      if (sumberAplikasi === 'BANK') autoText = `Transfer Bank`
      else if (sumberAplikasi === 'FLIP') autoText = `Transfer FLIP`
      else if (sumberAplikasi === 'ORDER KUOTA') autoText = `Order Kuota${nominal && nominal !== '0' ? ` ${nominal}` : ''}`
      else autoText = `Transfer ${sumberAplikasi}`
    } else if (activeMode === 'TARIK') {
      autoText = `TARIK_TUNAI|${selectedSumber}`
    } else {
      autoText = `${kategori} `
      if (nominal && nominal !== '0' && kategori !== 'Order Kuota') autoText += nominal
    }
    setKeterangan(autoText.toUpperCase())
  }, [isKetAuto, kategori, nominal, activeMode, selectedBank, selectedSumber, sumberAplikasi, setKeterangan]);
  
  // Split Payment Logic
  const handleNominalCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    const numVal = parseInt(rawVal || '0', 10)
    setNominalCashSplit(formatInputRupiah(rawVal))
    const tot = parseInt(nominal.replace(/\D/g, '') || '0', 10)
    const remain = Math.max(0, tot - numVal)
    setNominalNonTunaiSplit(formatInputRupiah(remain.toString()))
  }
  const handleNominalNonTunaiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    const numVal = parseInt(rawVal || '0', 10)
    setNominalNonTunaiSplit(formatInputRupiah(rawVal))
    const tot = parseInt(nominal.replace(/\D/g, '') || '0', 10)
    const remain = Math.max(0, tot - numVal)
    setNominalCashSplit(formatInputRupiah(remain.toString()))
  }

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
  
  // --- KALKULATOR LOGIC ---
  const handleCalcBtn = (btn: string) => {
    if (btn === 'C') {
      setCalcDisplay('0'); setCalcExpression(''); setCalcPrev(null); setCalcOperator(null); setCalcNewInput(true); return;
    }
    if (btn === '⌫') {
      setCalcDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0'); return;
    }
    if (btn === '±') {
      setCalcDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev); return;
    }
    if (['+', '−', '×', '÷'].includes(btn)) {
      const opMap: Record<string,string> = {'−':'-','×':'*','÷':'/'}
      const op = opMap[btn] || btn
      const cur = parseFloat(calcDisplay.replace(/\./g,'').replace(',','.')) || 0
      if (calcPrev !== null && calcOperator && !calcNewInput) {
        const res = calcOperator === '+' ? calcPrev + cur : calcOperator === '-' ? calcPrev - cur : calcOperator === '*' ? calcPrev * cur : calcPrev / cur
        setCalcDisplay(res % 1 === 0 ? res.toLocaleString('id-ID') : res.toLocaleString('id-ID', {maximumFractionDigits: 2}))
        setCalcPrev(res)
      } else {
        setCalcPrev(cur)
      }
      setCalcOperator(op); setCalcNewInput(true)
      setCalcExpression(calcDisplay + ' ' + btn)
      return;
    }
    if (btn === '=') {
      if (calcPrev === null || calcOperator === null) return
      const cur = parseFloat(calcDisplay.replace(/\./g,'').replace(',','.')) || 0
      const res = calcOperator === '+' ? calcPrev + cur : calcOperator === '-' ? calcPrev - cur : calcOperator === '*' ? calcPrev * cur : calcOperator === '/' && cur !== 0 ? calcPrev / cur : 0
      const formatted = res % 1 === 0 ? res.toLocaleString('id-ID') : res.toLocaleString('id-ID', {maximumFractionDigits: 2})
      setCalcExpression(calcExpression + ' ' + calcDisplay + ' =')
      setCalcDisplay(formatted)
      setCalcPrev(null); setCalcOperator(null); setCalcNewInput(true)
      return;
    }
    if (btn === ',') {
      if (calcDisplay.includes(',')) return
      setCalcDisplay(prev => calcNewInput ? '0,' : prev + ',')
      setCalcNewInput(false); return;
    }
    // Angka
    const digit = btn
    if (calcNewInput) {
      setCalcDisplay(digit === '0' ? '0' : digit)
      setCalcNewInput(false)
    } else {
      const raw = calcDisplay.replace(/\./g, '') // hapus separator ribuan
      if (raw === '0') { setCalcDisplay(digit) }
      else {
        const newRaw = raw + digit
        const num = parseInt(newRaw)
        setCalcDisplay(num.toLocaleString('id-ID'))
      }
    }
  }

  const applyCalcToNominal = () => {
    const rawNum = calcDisplay.replace(/\./g, '').replace(',', '.')
    const num = parseFloat(rawNum)
    if (isNaN(num) || num <= 0) return
    const formatted = Math.floor(num).toLocaleString('id-ID')
    setNominal(formatted)
    setIsAdminManuallyEdited(false)
    setShowCalc(false)
    setTimeout(() => nominalRef.current?.focus(), 100)
  }

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
  const btnTema3MainRef = useRef<HTMLButtonElement>(null)

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
      const arr = ['TUNAI LACI KASIR', 'NON TUNAI', '2X BAYAR (TUNAI & NON TUNAI)'];
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

    // Arrow Keys Navigation
    if (e.key === 'ArrowRight') {
      if (active === nominalRef.current) adminRef.current?.focus()
      else if (activeTheme !== 'TEMA_3') {
        if (active === btnDigitalRef.current) btnTarikRef.current?.focus()
        else if (active === btnTarikRef.current) btnAksesorisRef.current?.focus()
        else if (active === btnAksesorisRef.current) btnVoucherRef.current?.focus()
      }
    } else if (e.key === 'ArrowLeft') {
      if (active === adminRef.current) nominalRef.current?.focus()
      else if (activeTheme !== 'TEMA_3') {
        if (active === btnTarikRef.current) btnDigitalRef.current?.focus()
        else if (active === btnAksesorisRef.current) btnTarikRef.current?.focus()
        else if (active === btnVoucherRef.current) btnAksesorisRef.current?.focus()
      }
    } else if (e.key === 'ArrowDown') {
      if (activeTheme === 'TEMA_3') {
         if (active === btnTema3MainRef.current) keteranganRef.current?.focus()
         else if (active === keteranganRef.current) nominalRef.current?.focus()
         else if (active === nominalRef.current || active === adminRef.current) btnSimpanRef.current?.focus()
      } else {
         if ([btnDigitalRef,btnTarikRef,btnAksesorisRef,btnVoucherRef].some(r=>active===r.current)) sumberRef.current?.focus()
         else if (active === sumberRef.current) optTunaiRef.current?.focus()
         else if (active === optTunaiRef.current) keteranganRef.current?.focus()
         else if (active === keteranganRef.current) nominalRef.current?.focus()
         else if (active === nominalRef.current || active === adminRef.current) btnSimpanRef.current?.focus()
      }
    } else if (e.key === 'ArrowUp') {
      if (activeTheme === 'TEMA_3') {
         if (active === btnSimpanRef.current) nominalRef.current?.focus()
         else if (active === nominalRef.current || active === adminRef.current) keteranganRef.current?.focus()
         else if (active === keteranganRef.current) btnTema3MainRef.current?.focus()
      } else {
         if (active === sumberRef.current) btnDigitalRef.current?.focus()
         else if (active === optTunaiRef.current) sumberRef.current?.focus()
         else if (active === keteranganRef.current) optTunaiRef.current?.focus()
         else if (active === nominalRef.current || active === adminRef.current) keteranganRef.current?.focus()
         else if (active === btnSimpanRef.current) nominalRef.current?.focus()
      }
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

  const handleSlideKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setIsTema3SheetOpen(false);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.key)) {
      e.stopPropagation(); // Mencegah bentrok dengan global handler
    } else {
      return;
    }

    const activeSlide = document.querySelector('#tema3-bottom-sheet .translate-x-0') as HTMLElement;
    if (!activeSlide) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const buttons = Array.from(activeSlide.querySelectorAll('button')) as HTMLElement[];
      let current = document.activeElement as HTMLElement;
      
      if (current && current.tagName !== 'BUTTON') {
         const closest = current.closest('button');
         if (closest) current = closest;
      }
      
      let index = buttons.indexOf(current);
      if (index === -1 && buttons.length > 0) {
        buttons[0].focus();
        return;
      }
      
      if (e.key === 'ArrowDown') {
        const next = index >= 0 && index < buttons.length - 1 ? buttons[index + 1] : buttons[0];
        if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        const prev = index > 0 ? buttons[index - 1] : buttons[buttons.length - 1];
        if (prev) prev.focus();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
      e.preventDefault();
      if (tema3Step === 'DIGITAL' || tema3Step === 'TARIK') setTema3Step('MAIN');
      else if (tema3Step === 'BANK_SELECTION') setTema3Step(activeMode === 'DIGITAL' ? 'DIGITAL' : 'TARIK');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const current = document.activeElement as HTMLElement;
      const btn = current.tagName === 'BUTTON' ? current : current.closest('button');
      if (btn) btn.click();
    }
  };


  const onSaveInternal = () => {
    setErrorMsg(null)

    if (activeMode === 'AKSESORIS') {
      const cleanNominal = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
      if (cleanNominal <= 0) {
        setErrorMsg('Harga wajib diisi!')
        return
      }
      // Set admin=0 for aksesoris, isAdminNonTunai based on pay mode
      setAdmin('0')
      const isNonTunai = aksesorisPayMode === 'QRIS'
      onSave({ kategori, nominal, admin: '0', keterangan }, { activeTab: 'BARU', subTab: 'KHUSUS', isAdminNonTunai: isNonTunai })
      setIsKetAuto(true)
      return
    }
    
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
          setErrorMsg(`Harga JUAL (${admin}) harus lebih besar dari MODAL (${nominal})!`)
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
    
    if (tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)') {
      const nonTunaiAmount = parseInt(nominalNonTunaiSplit.replace(/\D/g, '') || '0', 10)
      const tunaiAmount = parseInt(nominalCashSplit.replace(/\D/g, '') || '0', 10)
      const totNominal = parseInt(nominal.replace(/\D/g, '') || '0', 10)
      
      if (tunaiAmount + nonTunaiAmount !== totNominal) {
        setErrorMsg('Total Tunai + Non Tunai harus sama dengan Nominal!')
        return
      }
      
      const splitKeterangan = `${keterangan} [SPLIT: Tunai ${tunaiAmount.toLocaleString('id-ID')}, NonTunai ${nonTunaiAmount.toLocaleString('id-ID')}]`
      onSave({ kategori, nominal, admin, keterangan: splitKeterangan }, { activeTab, subTab: subMode === 'NORMAL' ? 'KHUSUS' : (subTab as any), isAdminNonTunai, isSplit: true, nonTunaiAmount })
    } else {
      onSave({ kategori, nominal, admin, keterangan }, { activeTab, subTab: subMode === 'NORMAL' ? 'KHUSUS' : (subTab as any), isAdminNonTunai })
    }
    setIsKetAuto(true)
  }

  const [prevSaving, setPrevSaving] = useState(isSaving)
  React.useEffect(() => {
    if (prevSaving && !isSaving) {
      setNominal('')
      setAdmin('')
      setKeterangan('')
      setNominalCashSplit('')
      setNominalNonTunaiSplit('')
    }
    setPrevSaving(isSaving)
  }, [isSaving, prevSaving])

  return (
    <div className="relative w-full pb-4 pt-3 outline-none font-sans border border-gray-400 rounded-3xl overflow-hidden" onKeyDown={handleGlobalKeyDown} tabIndex={0}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" style={{background: '#ffffff'}}>
      </div>
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3 px-3">
        <div className="flex flex-col">
          <h2 className="text-[22px] font-black text-[#1a1a1a] leading-none tracking-tight">Form Transaksi</h2>
          <p className="text-[12px] font-bold text-[#666666] leading-tight mt-0.5">Kategori Layanan</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white border border-gray-200 rounded-full shadow-sm">
          <button
            onClick={() => { setShowCalc(v => !v); setIsThemeMenuOpen(false); }}
            className="w-8 h-8 rounded-full bg-[#0066ff] text-white flex items-center justify-center shadow-sm hover:bg-blue-700 transition-all"
          >
            <i className="fa-solid fa-calculator text-[14px]"></i>
          </button>

          <div className="relative z-50">
            <button 
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="w-8 h-8 rounded-full bg-[#0066ff] text-white flex items-center justify-center shadow-sm hover:scale-105 transition-all"
            >
              <i className="fa-solid fa-palette text-[14px]"></i>
            </button>
          
            {isThemeMenuOpen && (
              <div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="px-3 pb-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">Pilih Tema</p>
                <button onClick={() => { setActiveTheme('TEMA_2'); setIsThemeMenuOpen(false); }} className={cn("w-full text-left px-3 py-2 text-[11px] font-bold transition-colors", activeTheme === 'TEMA_2' ? "text-blue-600 bg-blue-50" : "text-slate-700 hover:bg-blue-50 hover:text-blue-600")}>Tema 1 (Utama)</button>
                <button onClick={() => { setActiveTheme('TEMA_3'); setIsThemeMenuOpen(false); }} className={cn("w-full text-left px-3 py-2 text-[11px] font-bold transition-colors", activeTheme === 'TEMA_3' ? "text-blue-600 bg-blue-50" : "text-slate-700 hover:bg-blue-50 hover:text-blue-600")}>Tema 2 (Sidebar)</button>
                <button onClick={() => { setActiveTheme('TEMA_1'); setIsThemeMenuOpen(false); }} className={cn("w-full text-left px-3 py-2 text-[11px] font-bold transition-colors", activeTheme === 'TEMA_1' ? "text-blue-600 bg-blue-50" : "text-slate-700 hover:bg-blue-50 hover:text-blue-600")}>Tema 3 (Classic)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== PANEL KALKULATOR ===== */}
      {showCalc && (
        <div className="mb-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.4)] border border-slate-700">
            {/* Layar kalkulator */}
            <div className="bg-slate-950/80 rounded-xl px-4 py-3 mb-3 min-h-[68px] flex flex-col justify-end items-end border border-slate-700/50">
              <p className="text-slate-500 text-[10px] font-mono leading-none min-h-[14px] truncate w-full text-right">{calcExpression || '\u00a0'}</p>
              <p className="text-white text-2xl font-black font-mono leading-tight tracking-wider mt-1 truncate max-w-full">{calcDisplay}</p>
            </div>
            {/* Grid tombol */}
            {([
              ['C', '±', '⌫', '÷'],
              ['7', '8', '9', '×'],
              ['4', '5', '6', '−'],
              ['1', '2', '3', '+'],
              ['0', ',', '=', '='],
            ] as const).map((row, ri) => (
              <div key={ri} className="grid grid-cols-4 gap-1.5 mb-1.5">
                {row.map((btn, bi) => {
                  if (ri === 4 && bi === 2) return null
                  const isOp = ['+', '−', '×', '÷'].includes(btn)
                  const isEq = btn === '='
                  const isClear = btn === 'C'
                  const opToInternal: Record<string,string> = {'÷':'/','×':'*','−':'-','+':'+'}
                  const isActiveOp = calcOperator === (opToInternal[btn] || '') && calcNewInput
                  return (
                    <button
                      key={`${ri}-${bi}`}
                      onClick={() => handleCalcBtn(btn)}
                      className={cn(
                        'h-12 rounded-xl font-black text-[15px] transition-all active:scale-95 select-none',
                        ri === 4 && bi === 3 ? 'col-span-2' : '',
                        isClear ? 'bg-rose-500 text-white hover:bg-rose-400 shadow-sm'
                          : isEq ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm hover:from-amber-300'
                          : isOp ? cn('hover:bg-slate-600', isActiveOp ? 'bg-slate-500 text-amber-400' : 'bg-slate-700 text-amber-400')
                          : btn === '±' || btn === '⌫' ? 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      )}
                    >
                      {btn}
                    </button>
                  )
                })}
              </div>
            ))}
            {/* Tombol Pakai */}
            <button
              onClick={applyCalcToNominal}
              className="w-full mt-2 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:from-emerald-400 transition-all shadow-md active:scale-[0.98]"
            >
              <i className="fa-solid fa-check-double text-sm"></i>
              Pakai sebagai Nominal
            </button>
          </div>
        </div>
      )}

      {activeTheme === 'TEMA_1' ? (
      <>
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
              {['BANK','GoPay','QRIS','DANA','ATM/EDC'].map((src, idx) => (
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
              onFocus={handleInputFocus}
              rows={1} 
              placeholder="Tulis keterangan..." 
              value={activeMode === 'TARIK' && keterangan.startsWith('TARIK_TUNAI|') ? keterangan.substring(12) : keterangan}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                if (activeMode === 'TARIK') {
                  setKeterangan(`TARIK_TUNAI|${val}`);
                  setIsKetAuto(false);
                } else {
                  setKeterangan(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setTimeout(() => nominalRef.current?.focus(), 10);
                }
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

        {/* PAYMENT MODE TOGGLE FOR AKSESORIS */}
        {activeMode === 'AKSESORIS' && (
          <div className="flex gap-2 mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <button
              onClick={() => setAksesorisPayMode('TUNAI')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'TUNAI'
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'
              )}
            >
              <i className="fa-solid fa-cash-register text-[11px]"></i>
              <span>CASH / LACI</span>
              {aksesorisPayMode === 'TUNAI' && <i className="fa-solid fa-check text-[10px]"></i>}
            </button>
            <button
              onClick={() => setAksesorisPayMode('QRIS')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'QRIS'
                  ? 'bg-blue-500 border-blue-500 text-white shadow-[0_4px_12px_-4px_rgba(59,130,246,0.5)]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
              )}
            >
              <i className="fa-solid fa-qrcode text-[11px]"></i>
              <span>NON TUNAI / QRIS</span>
              {aksesorisPayMode === 'QRIS' && <i className="fa-solid fa-check text-[10px]"></i>}
            </button>
          </div>
        )}

        <div className="flex gap-3 flex-nowrap">
          <div className="relative group flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1.5 px-1">
              <label className="flex items-center text-[10px] font-black text-gray-700 uppercase tracking-widest gap-1.5 whitespace-nowrap">
                <i className="fa-solid fa-coins text-yellow-500"></i>
                {activeMode === 'AKSESORIS' ? 'Harga' : kategori === 'Order Kuota' ? 'MODAL' : 'Nominal'}
              </label>
              {kategori !== 'Order Kuota' && activeMode !== 'AKSESORIS' && (
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => {
                      if (activeMode === 'AKSESORIS') btnSimpanRef.current?.click();
                      else if (kategori === 'Order Kuota') btnSimpanRef.current?.click();
                      else adminRef.current?.focus();
                    }, 10);
                  }
                }}
                className="w-full text-[14px] font-black h-11 pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-50 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          {activeMode !== 'AKSESORIS' && (
          <div className="relative group flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <label className="flex items-center text-[10px] font-black text-gray-700 uppercase tracking-widest gap-1.5">
                <i className={cn("fa-solid text-[10px]", kategori === 'Order Kuota' ? "fa-tag text-emerald-500" : "fa-hand-holding-dollar text-purple-500")}></i>
                {kategori === 'Order Kuota' ? 'JUAL' : 'Admin'}
              </label>
              {kategori !== 'Order Kuota' && (
                <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap ml-auto">
                  <input
                    type="checkbox"
                    checked={isAdminNonTunai}
                    onChange={(e) => setIsAdminNonTunai(e.target.checked)}
                    className="w-3 h-3 accent-purple-600 align-middle"
                  />
                  <span className="text-[8px] font-black text-purple-700 uppercase tracking-widest whitespace-nowrap">NON TUNAI</span>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => btnSimpanRef.current?.click(), 10);
                  }
                }}
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
          )}
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
      </>
      ) : activeTheme === 'TEMA_2' ? (
      <>
        {/* 4 TOMBOL LAYANAN */}
        <div className="grid grid-cols-4 gap-2 mb-2 px-3">
          {([
            { id: 'DIGITAL',   label: 'TRANSFER',     icon: 'fa-paper-plane',        iconBg: '#0066ff' },
            { id: 'TARIK',     label: 'TARIK TUNAI',  icon: 'fa-money-bill-transfer', iconBg: '#10b981' },
            { id: 'AKSESORIS', label: 'AKSESORIS',    icon: 'fa-headset',             iconBg: '#7c3aed' },
            { id: 'VOUCHER',   label: 'VOUCHER',       icon: 'fa-ticket',              iconBg: '#f97316' },
          ] as const).map((mode) => {
            const isAct = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  if (mode.id === 'VOUCHER') { if (onOpenVoucherJualCepat) onOpenVoucherJualCepat(); return; }
                  setActiveMode(mode.id as any);
                  setIsAdminManuallyEdited(false);
                  if (mode.id === 'TARIK') setKategori('Tarik Tunai');
                  else if (mode.id === 'AKSESORIS') setKategori('Aksesoris');
                  else setKategori(sumberToKategori[sumberAplikasi] || 'Transfer Bank');
                }}
                className={cn(
                  "flex flex-col items-center justify-center py-3.5 px-1 rounded-[18px] border-2 bg-white transition-all duration-200 outline-none",
                  isAct 
                    ? "border-[#0066ff] bg-[#f0f7ff] shadow-md" 
                    : "border-transparent bg-white shadow-sm hover:border-blue-100"
                )}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                  style={{backgroundColor: mode.iconBg}}
                >
                  <i className={cn("fa-solid text-white text-[16px]", mode.icon)}></i>
                </div>
                <span className={cn("text-[9px] font-black uppercase tracking-tight text-center leading-tight", isAct ? "text-[#0040cc]" : "text-[#374151]")}>{mode.label}</span>
              </button>
            )
          })}
        </div>

        {/* KATEGORI ROW */}
        <div className="mx-3 flex items-center justify-between mb-2 bg-white rounded-2xl px-3 py-2.5 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all" onClick={() => setIsTujuanModalOpen(true)}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0066ff] text-white flex items-center justify-center shrink-0">
              <i className="fa-solid fa-border-all text-[14px]"></i>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-[#64748b] leading-none mb-0.5">Kategori</span>
              <span className="text-[13px] font-black text-[#0c1f44] uppercase leading-tight">{tujuanMasuk}</span>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#deeef9] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-chevron-down text-[10px] text-[#0066ff]"></i>
          </div>
        </div>

        {/* SUMBER / METODE */}
        {activeMode === 'DIGITAL' && (
          <div className="grid grid-cols-4 gap-1.5 mb-2 px-3">
            {['BANK', 'DANA', 'FLIP', 'ORDER KUOTA'].map((s) => {
               const isAct = sumberAplikasi === s;
               return (
                 <button 
                   key={s}
                   onClick={() => { setSumberAplikasi(s); setIsKetAuto(true); setIsAdminManuallyEdited(false); }}
                   className={cn(
                     "py-1.5 px-1 rounded-xl border text-[9px] font-black uppercase text-center transition-all",
                     isAct ? "border-[#0066ff] bg-[#0066ff] text-white shadow-sm" : "border-gray-150 bg-white text-[#1e293b] shadow-sm hover:border-blue-200"
                   )}
                 >
                   {s}
                 </button>
               )
            })}
          </div>
        )}
        {activeMode === 'TARIK' && (
          <div className="grid grid-cols-5 gap-1 mb-2 px-3">
            {['BANK','GoPay','QRIS','DANA','ATM/EDC'].map(s => {
              const isAct = selectedSumber === s;
              return (
                <button 
                  key={s}
                  onClick={() => { setSelectedSumber(s); setIsKetAuto(true); }}
                  className={cn(
                    "py-1.5 px-0.5 rounded-xl border text-[8px] font-black uppercase text-center transition-all",
                    isAct ? "border-[#0066ff] bg-[#0066ff] text-white shadow-sm" : "border-gray-150 bg-white text-[#1e293b] shadow-sm hover:border-blue-200"
                  )}
                >
                  {s}
                </button>
              )
            })}
          </div>
        )}

        {/* KETERANGAN */}
        <div className="mb-1 px-3">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[14px] font-black text-[#0c1f44]">Keterangan</label>
            <label className="flex items-center gap-1.5 cursor-pointer bg-[#0066ff] px-2.5 py-1 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
              <input type="checkbox" checked={isKetAuto} onChange={e => setIsKetAuto(e.target.checked)} className="w-3.5 h-3.5 accent-white rounded" />
              <span className="text-[11px] font-bold text-white">Otomatis</span>
            </label>
          </div>
          <div className="relative">
            <textarea 
              ref={keteranganRef}
              onFocus={handleInputFocus}
              rows={1}
              placeholder="Masukkan keterangan transaksi..."
              value={activeMode === 'TARIK' && keterangan.startsWith('TARIK_TUNAI|') ? keterangan.substring(12) : keterangan}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                if (activeMode === 'TARIK') {
                  setKeterangan(`TARIK_TUNAI|${val}`);
                  setIsKetAuto(false);
                } else {
                  setKeterangan(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setTimeout(() => nominalRef.current?.focus(), 10);
                }
              }}
              className="w-full resize-none text-[12px] font-bold py-2.5 pl-3 min-h-[40px] pr-3 rounded-xl bg-[#dcdcdc] border border-gray-400 shadow-sm placeholder:text-[#888888] placeholder:font-normal outline-none appearance-none transition-all text-[#111111] focus:border-[#0066ff] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.1)]"
            ></textarea>
          </div>

          {/* Autocomplete Suggestions */}
          {presets && presets.length > 0 && (activeMode === 'DIGITAL' || activeMode === 'TARIK') && (
            <div className="mt-2 flex flex-wrap gap-2">
              {(() => {
                const searchQuery = keterangan.toUpperCase().replace(kategori.toUpperCase(), '').replace(/=/g, '').trim().toLowerCase();
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
                      className="bg-[#faf5ff] hover:bg-purple-100 border border-purple-100 text-purple-700 text-[11px] font-black uppercase tracking-wide px-3 py-2 rounded-xl transition-all text-left shadow-sm"
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

        {/* AKSESORIS PAY MODE */}
        {activeMode === 'AKSESORIS' && (
          <div className="flex gap-2 mb-2 px-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <button
              onClick={() => setAksesorisPayMode('TUNAI')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'TUNAI'
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'
              )}
            >
              <i className="fa-solid fa-cash-register text-[10px]"></i>
              <span>CASH / LACI</span>
            </button>
            <button
              onClick={() => setAksesorisPayMode('QRIS')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'QRIS'
                  ? 'bg-[#0066ff] border-[#0066ff] text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
              )}
            >
              <i className="fa-solid fa-qrcode text-[10px]"></i>
              <span>NON TUNAI / QRIS</span>
            </button>
          </div>
        )}

        {/* NOMINAL & ADMIN */}
        <div className="flex gap-2 mb-2 px-3">
          {/* Nominal */}
          <div className={cn("bg-white rounded-2xl p-3 shadow-sm border border-gray-200 flex flex-col", activeMode === 'AKSESORIS' ? 'flex-1' : 'flex-1')}>
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-[13px] font-black text-[#0c1f44] flex items-center gap-1.5">
                <i className="fa-solid fa-coins text-[#0066ff] text-[12px]"></i>
                {activeMode === 'AKSESORIS' ? 'Harga' : kategori === 'Order Kuota' ? 'MODAL' : 'Nominal'}
              </label>
              {activeMode !== 'AKSESORIS' && (
                <label className="flex items-center gap-1 cursor-pointer">
                  <span className="text-[9px] font-black text-[#0066ff]">2x Pay</span>
                  <input type="checkbox" checked={tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)'} onChange={e => {
                    if (e.target.checked) setTujuanMasuk('2X BAYAR (TUNAI & NON TUNAI)')
                    else setTujuanMasuk('TUNAI LACI KASIR')
                  }} className="w-3.5 h-3.5 accent-[#0066ff]" />
                </label>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#555555] pointer-events-none select-none">Rp</span>
              <input 
                ref={nominalRef}
                onFocus={handleInputFocus}
                type="text" inputMode="numeric"
                placeholder="10.000.000"
                value={nominal}
                onChange={(e) => { setNominal(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => {
                      if (activeMode === 'AKSESORIS') btnSimpanRef.current?.click();
                      else if (kategori === 'Order Kuota') btnSimpanRef.current?.click();
                      else adminRef.current?.focus();
                    }, 10);
                  }
                }}
                className="w-full text-[14px] font-bold h-[42px] pl-8 pr-3 rounded-xl border border-gray-400 bg-[#dcdcdc] focus:border-[#0066ff] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.1)] outline-none appearance-none transition-all text-[#111111] placeholder:text-[#888888] placeholder:font-normal"
              />
            </div>
          </div>

          {/* Admin */}
          {activeMode !== 'AKSESORIS' && (
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-2.5">
              <label className={cn("text-[13px] font-black flex items-center gap-1.5", isAdminNonTunai ? "text-purple-700" : "text-[#0c1f44]")}>
                <i className="fa-solid fa-user text-[#0066ff] text-[12px]"></i>
                {kategori === 'Order Kuota' ? 'JUAL' : 'Admin'}
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <span className="text-[9px] font-black text-purple-700">Non Tunai</span>
                <input type="checkbox" checked={isAdminNonTunai} onChange={e => setIsAdminNonTunai(e.target.checked)} className="w-3.5 h-3.5 accent-purple-600" />
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#555555] pointer-events-none select-none">Rp</span>
              <input 
                ref={adminRef}
                onFocus={handleInputFocus}
                type="text" inputMode="numeric"
                placeholder="10.000"
                value={admin}
                onChange={(e) => { setAdmin(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => btnSimpanRef.current?.click(), 10);
                  }
                }}
                className={cn(
                  "w-full text-[14px] font-bold h-[42px] pl-8 pr-3 rounded-xl border outline-none appearance-none transition-all placeholder:font-normal",
                  kategori === 'Order Kuota' ? (() => {
                    if (isAdminNonTunai) return "border-purple-400 bg-purple-900 text-purple-200 placeholder:text-purple-400 focus:border-purple-400"
                    const m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
                    const j = parseInt(admin.replace(/[^0-9]/g, '')) || 0
                    return m > 0 && j > 0 && j <= m
                      ? "bg-red-900 text-red-200 border-red-500 placeholder:text-red-400"
                      : m > 0 && j > m
                        ? "bg-emerald-900 text-emerald-200 border-emerald-500 placeholder:text-emerald-400"
                        : "bg-[#dcdcdc] border-gray-400 text-[#111111] placeholder:text-[#888888] focus:border-[#0066ff] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.1)]"
                  })() : (isAdminNonTunai 
                    ? "border-purple-300 bg-purple-50 text-purple-800 placeholder:text-purple-300 focus:border-purple-400" 
                    : "bg-[#dcdcdc] border-gray-400 text-[#111111] placeholder:text-[#888888] focus:border-[#0066ff] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.1)]")
                )}
              />
            </div>
          </div>
          )}
        </div>

        {tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)' && (
          <div className="flex gap-2 w-full mb-3 px-3 animate-in fade-in slide-in-from-top-2">
            <div className="relative flex-1">
              <input 
                type="text" inputMode="numeric"
                placeholder="Tunai"
                value={nominalCashSplit}
                onChange={handleNominalCashChange}
                className="w-full text-[13px] font-black h-[38px] px-3 rounded-xl border border-emerald-200 bg-emerald-50 focus:border-emerald-500 outline-none appearance-none transition-all text-emerald-900 placeholder:text-emerald-300"
              />
            </div>
            <div className="relative flex-1">
              <input 
                type="text" inputMode="numeric"
                placeholder="Non Tunai"
                value={nominalNonTunaiSplit}
                onChange={handleNominalNonTunaiChange}
                className="w-full text-[13px] font-black h-[38px] px-3 rounded-xl border border-blue-200 bg-blue-50 focus:border-[#0066ff] outline-none appearance-none transition-all text-[#0066ff] placeholder:text-blue-300"
              />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-3 mx-3 bg-red-50 border border-red-200 p-2.5 rounded-xl">
            <p className="text-[11px] font-black text-red-600 uppercase text-center flex items-center justify-center gap-1.5">
              <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
            </p>
          </div>
        )}

        <div className="px-3">
          <button 
             ref={btnSimpanRef}
             onClick={onSaveInternal}
             disabled={isSaving || (activeMode === 'DIGITAL' && !kategori)}
             onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
             className="w-full text-white text-[14px] font-black py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-between px-5 tracking-wider disabled:opacity-50 disabled:shadow-none relative overflow-hidden"
             style={{background: 'linear-gradient(135deg, #1a7dff 0%, #0055dd 100%)', boxShadow: '0 8px 24px -6px rgba(0,100,255,0.55)'}}
          >
             <i className="fa-solid fa-paper-plane text-[15px] relative z-10"></i>
             <span className="flex-1 text-center relative z-10 font-black tracking-widest">{isSaving ? 'MEMPROSES...' : 'SIMPAN TRANSAKSI'}</span>
             {!isSaving && <i className="fa-solid fa-arrow-right text-[15px] relative z-10"></i>}
          </button>
        </div>
      </>
      ) : (
      <>
        {/* TEMA 3 LAYOUT (KOMPAK & SIDEBAR) */}
        <button 
          ref={btnTema3MainRef}
          onClick={() => { 
            setTema3Step('MAIN'); 
            setIsTema3SheetOpen(true); 
            setActiveMode('');
            setSumberAplikasi('');
            setSelectedSumber('');
            setKategori('');
            setKeterangan('');
          }}
          className="w-full bg-white border-2 border-gray-100 rounded-[24px] p-3 flex items-center justify-between mb-6 shadow-sm active:scale-[0.98] transition-all group hover:border-blue-300"
        >
           <div className="flex items-center gap-4">
             <div className="relative w-14 h-14 rounded-[18px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:shadow-lg group-hover:scale-105 transition-all">
               <i className="fa-solid fa-bars text-2xl"></i>
               <span className="absolute top-1.5 right-1.5 text-[9px] font-black text-white bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm">Q</span>
             </div>
             <div className="flex flex-col items-start gap-1">
               <span className="text-[10px] font-black text-[#64748b] tracking-widest uppercase">Mode Layanan Aktif</span>
               <span className="text-[15px] font-black text-[#1e293b] uppercase tracking-wider leading-none">
                 {activeMode === 'DIGITAL' && sumberAplikasi ? `TRANSFER - ${sumberAplikasi}` : 
                  activeMode === 'DIGITAL' ? 'BANK' :
                  activeMode === 'TARIK' && selectedSumber ? `TARIK TUNAI - ${selectedSumber}` : 
                  activeMode === 'TARIK' ? 'TARIK TUNAI' :
                  activeMode === 'AKSESORIS' ? 'AKSESORIS' : 
                  activeMode === 'VOUCHER' ? 'JUAL VOUCHER' : 'PILIH LAYANAN'}
               </span>
             </div>
           </div>
           <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-1">
             <i className="fa-solid fa-chevron-right text-[#64748b] text-[12px]"></i>
           </div>
        </button>

        {/* KETERANGAN ROW */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2 px-1">
            <label className="text-[10px] font-black text-[#334155] tracking-widest flex items-center gap-1.5">
              <i className="fa-solid fa-align-left text-gray-400"></i> KETERANGAN
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer bg-gray-50 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors shadow-sm">
              <input type="checkbox" checked={isKetAuto} onChange={e => setIsKetAuto(e.target.checked)} className="w-3.5 h-3.5 accent-[#3b82f6] rounded-sm" />
              <span className="text-[8px] font-black text-[#334155] tracking-widest uppercase">OTOMATIS</span>
            </label>
          </div>
          <div className="relative">
            <textarea 
              ref={keteranganRef}
              onFocus={handleInputFocus}
              rows={1}
              value={activeMode === 'TARIK' && keterangan.startsWith('TARIK_TUNAI|') ? keterangan.substring(12) : keterangan}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                if (activeMode === 'TARIK') {
                  setKeterangan(`TARIK_TUNAI|${val}`);
                  setIsKetAuto(false);
                } else {
                  setKeterangan(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setTimeout(() => nominalRef.current?.focus(), 10);
                }
              }}
              className="w-full resize-none text-[13px] font-bold py-2.5 px-3 rounded-lg border border-slate-200 bg-slate-100 placeholder:text-gray-400 placeholder:font-medium focus:border-[#0066ff] focus:ring-4 focus:ring-blue-50 outline-none transition-all text-slate-800"
            ></textarea>
          </div>
          {/* Autocomplete Suggestions */}
          {presets && presets.length > 0 && (activeMode === 'DIGITAL' || activeMode === 'TARIK') && (
            <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
              {(() => {
                const searchQuery = keterangan.toUpperCase().replace(kategori.toUpperCase(), '').replace(/=/g, '').trim().toLowerCase();
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
                      className="bg-[#faf5ff] hover:bg-purple-100 border border-purple-100 text-purple-700 text-[9px] font-black uppercase tracking-wide px-2.5 py-1.5 rounded-xl transition-all text-left shadow-sm"
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
          {/* PAYMENT MODE TOGGLE FOR AKSESORIS - TEMA 3 */}
        {activeMode === 'AKSESORIS' && (
          <div className="flex gap-2 mb-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <button
              onClick={() => setAksesorisPayMode('TUNAI')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'TUNAI'
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'
              )}
            >
              <i className="fa-solid fa-cash-register text-[11px]"></i>
              <span>CASH / LACI</span>
              {aksesorisPayMode === 'TUNAI' && <i className="fa-solid fa-check text-[10px]"></i>}
            </button>
            <button
              onClick={() => setAksesorisPayMode('QRIS')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'QRIS'
                  ? 'bg-blue-500 border-blue-500 text-white shadow-[0_4px_12px_-4px_rgba(59,130,246,0.5)]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
              )}
            >
              <i className="fa-solid fa-qrcode text-[11px]"></i>
              <span>NON TUNAI / QRIS</span>
              {aksesorisPayMode === 'QRIS' && <i className="fa-solid fa-check text-[10px]"></i>}
            </button>
          </div>
        )}

        {/* NOMINAL & ADMIN ROW */}
        <div className="flex gap-3 mb-5">
          <div className={activeMode === 'AKSESORIS' ? 'w-full' : 'flex-1'}>
            <div className="flex justify-between items-center mb-1.5 px-1">
              <label className="text-[10px] font-black text-[#334155] tracking-widest flex items-center gap-1.5">
                <i className="fa-solid fa-coins text-yellow-500"></i> {activeMode === 'AKSESORIS' ? 'Harga' : kategori === 'Order Kuota' ? 'MODAL' : 'Nominal'}
              </label>
              {activeMode !== 'AKSESORIS' && <span className="text-[8px] font-bold text-slate-400 italic">mis: 50.000</span>}
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0f172a] font-black text-[20px] pointer-events-none">Rp</div>
              <input 
                ref={nominalRef}
                onFocus={handleInputFocus}
                type="text" 
                inputMode="numeric"
                value={nominal}
                onChange={(e) => { setNominal(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => {
                      if (activeMode === 'AKSESORIS') btnSimpanRef.current?.click();
                      else if (kategori === 'Order Kuota') btnSimpanRef.current?.click();
                      else adminRef.current?.focus();
                    }, 10);
                  }
                }}
                className="w-full text-[20px] font-black h-[54px] pl-11 pr-4 rounded-lg border border-slate-200 bg-slate-100 focus:border-[#0066ff] focus:ring-4 focus:ring-blue-50 outline-none transition-all text-[#0f172a]"
              />
            </div>
          </div>
          {activeMode !== 'AKSESORIS' && (
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1.5 px-1">
              <label className="text-[10px] font-black text-[#334155] tracking-widest flex items-center gap-1.5">
                <i className="fa-solid fa-hand-holding-dollar text-purple-500"></i> {kategori === 'Order Kuota' ? 'JUAL' : 'Admin'}
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={isAdminNonTunai} onChange={e => setIsAdminNonTunai(e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 rounded-sm" />
                <span className="text-[8px] font-black text-purple-700 tracking-widest uppercase whitespace-nowrap">NON TUNAI</span>
              </label>
            </div>
            <div className="relative">
              <div className={cn("absolute left-4 top-1/2 -translate-y-1/2 font-black text-[20px] pointer-events-none transition-colors", isAdminNonTunai ? "text-purple-800" : "text-[#0f172a]")}>Rp</div>
              <input 
                ref={adminRef}
                onFocus={handleInputFocus}
                type="text"
                inputMode="numeric"
                value={admin}
                onChange={(e) => { setAdmin(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => btnSimpanRef.current?.click(), 10);
                  }
                }}
                className={cn(
                  "w-full text-[20px] font-black h-[54px] pl-11 pr-4 rounded-lg border focus:ring-4 outline-none transition-all",
                  kategori === 'Order Kuota' ? (() => {
                    if (isAdminNonTunai) return "border-purple-300 bg-purple-50 text-purple-800 focus:border-purple-500 focus:ring-purple-50"
                    const m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
                    const j = parseInt(admin.replace(/[^0-9]/g, '')) || 0
                    return m > 0 && j > 0 && j <= m
                      ? "bg-red-50 text-red-700 border-red-300 focus:border-red-400 focus:ring-red-100"
                      : m > 0 && j > m
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                        : "bg-slate-100 border-slate-200 text-[#0f172a] focus:border-[#0066ff] focus:ring-blue-50"
                  })() : (isAdminNonTunai 
                    ? "border-purple-300 bg-purple-50 text-purple-800 focus:border-purple-500 focus:ring-purple-50" 
                    : "border-slate-200 bg-slate-100 text-[#0f172a] focus:border-purple-400 focus:ring-purple-50")
                )}
              />
            </div>
          </div>
          )}
        </div>        </div>

        {/* ERROR MESSAGES & ALERTS */}
        {errorMsg && (
          <div className="mb-4 bg-red-50/80 border border-red-200 p-3 rounded-xl">
            <p className="text-[10px] font-black text-red-600 uppercase text-center tracking-widest flex items-center justify-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-base"></i> {errorMsg}
            </p>
          </div>
        )}

        <button 
           ref={btnSimpanRef}
           onClick={onSaveInternal}
           disabled={isSaving || (activeMode === 'DIGITAL' && !kategori)}
           onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
           className="w-full bg-slate-900 text-white text-[13px] font-black py-4 rounded-2xl shadow-[0_8px_20px_-6px_rgba(15,23,42,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 tracking-widest disabled:opacity-50 hover:bg-slate-800"
        >
           {isSaving ? (
             <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
           ) : (
             <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <i className="fa-solid fa-check text-[10px]"></i>
             </div>
           )}
           {isSaving ? 'MEMPROSES...' : 'SIMPAN TRANSAKSI'}
        </button>
      </>
      )}

      {/* Modal Sumber Aplikasi */}
      {isSumberModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsSumberModalOpen(false)}>
          <div className="bg-white w-[85%] max-w-[280px] rounded-[20px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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
                    "flex items-center justify-between p-3.5 text-left transition-colors hover:bg-gray-50",
                    idx !== arr.length - 1 && "border-b border-gray-100"
                  )}
                >
                  <span className="text-[15px] font-black text-slate-800">{s}</span>
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
          <div className="bg-white w-[85%] max-w-[280px] rounded-[20px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col">
              {['TUNAI LACI KASIR', 'NON TUNAI', '2X BAYAR (TUNAI & NON TUNAI)'].map((t, idx, arr) => (
                <button
                  key={t}
                  onClick={() => {
                    setTujuanMasuk(t);
                    setIsTujuanModalOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between p-3.5 text-left transition-colors hover:bg-gray-50",
                    idx !== arr.length - 1 && "border-b border-gray-100"
                  )}
                >
                  <span className="text-[15px] font-black text-slate-800">{t}</span>
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

      {/* Tema 3 Bottom Sheet / Drill-down Modal */}
      {isTema3SheetOpen && (
        <div id="tema3-bottom-sheet" className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsTema3SheetOpen(false)}>
          <div 
            className="bg-white w-full max-w-lg rounded-t-[32px] p-6 pb-10 shadow-2xl transform transition-transform animate-in slide-in-from-bottom-full duration-300 relative overflow-hidden flex flex-col" 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleSlideKeyDown}
            style={{ height: '480px' }}
          >
            {/* Header Handle */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 shrink-0"></div>
            
            <div className="relative flex-1 w-full h-full overflow-hidden">
              {/* LAYAR 1: MAIN MENU */}
              <div className={cn("absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out bg-white flex flex-col", 
                tema3Step === 'MAIN' ? "translate-x-0" : "-translate-x-full"
              )}>
                <h3 className="text-center text-[15px] font-black text-slate-800 mb-4 tracking-widest uppercase shrink-0 pt-2">Pilih Mode Utama</h3>
                <div className="flex flex-col gap-2 overflow-y-auto pb-4 px-2 -mx-2 pt-2">
                  {[
                    { id: 'DIGITAL', label: 'TRANSFER', subtext: 'Transfer, Ewallet dan PPOB', icon: 'fa-paper-plane', color: 'text-blue-500', bg: 'bg-blue-50' },
                    { id: 'TARIK', label: 'TARIK TUNAI', subtext: '', icon: 'fa-money-bill-transfer', color: 'text-red-500', bg: 'bg-red-50' },
                    { id: 'AKSESORIS', label: 'AKSESORIS', subtext: '', icon: 'fa-headset', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { id: 'VOUCHER', label: 'VOUCHER', subtext: '', icon: 'fa-ticket', color: 'text-orange-500', bg: 'bg-orange-50' },
                  ].map(m => {
                    const isSelected = activeMode === m.id;
                    return (
                    <button 
                      key={m.id}
                      data-autofocus={m.id === 'DIGITAL' ? "true" : "false"}
                      onClick={() => {
                        if (m.id === 'VOUCHER') { 
                          setActiveMode('VOUCHER');
                          if (onOpenVoucherJualCepat) onOpenVoucherJualCepat(); 
                          setIsTema3SheetOpen(false); 
                          return; 
                        }
                        if (m.id === 'AKSESORIS') {
                          setActiveMode('AKSESORIS');
                          setKategori('Aksesoris');
                          setIsAdminManuallyEdited(false);
                          setIsTema3SheetOpen(false);
                          return;
                        }
                        setActiveMode(m.id as any);
                        setTema3Step(m.id as any);
                      }}
                      className={cn(
                        "group px-5 py-4 rounded-[20px] border transition-all text-left flex items-center gap-4 shadow-sm outline-none focus:outline-none",
                        isSelected 
                          ? "bg-orange-500 border-orange-500 text-white active:scale-95" 
                          : "border-gray-100 bg-white hover:bg-orange-500 hover:border-orange-500 focus:bg-orange-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-200 active:scale-95"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", 
                        isSelected ? "bg-white/20 text-white" : `${m.bg} ${m.color} group-hover:bg-white/20 group-hover:text-white group-focus:bg-white/20 group-focus:text-white`
                      )}>
                        <i className={cn("fa-solid text-lg", m.icon)}></i>
                      </div>
                      <div className="flex flex-col items-start gap-0.5">
                        <span className={cn("text-[13px] font-black uppercase tracking-widest transition-colors", 
                          isSelected ? "text-white" : "text-slate-700 group-hover:text-white group-focus:text-white"
                        )}>{m.label}</span>
                        {m.subtext && (
                          <span className={cn("text-[10px] font-medium transition-colors", 
                            isSelected ? "text-white/80" : "text-slate-500 group-hover:text-white/80 group-focus:text-white/80"
                          )}>{m.subtext}</span>
                        )}
                      </div>
                    </button>
                  )})}
                </div>
              </div>

              {/* LAYAR 2: SUB MENU (TWO COLUMN) */}
              <div className={cn("absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out bg-white flex", 
                tema3Step !== 'MAIN' ? "translate-x-0" : "translate-x-full"
              )}>
                {/* Kolom Kiri: Header & Back Button */}
                <div className="w-[30%] bg-slate-50 border-r border-gray-100 flex flex-col items-center pt-8 px-2">
                  <button type="button" onClick={() => { setActiveMode(''); setTema3Step('MAIN'); }} className="mb-4 w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-600 hover:bg-gray-100 focus:outline-none cursor-pointer active:scale-90 transition-all shadow-sm">
                    <i className="fa-solid fa-chevron-left text-[13px]"></i>
                  </button>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    {tema3Step === 'DIGITAL' ? 'TRANSFER' : tema3Step === 'TARIK' ? 'TARIK TUNAI' : ''}
                  </span>
                </div>

                {/* Kolom Kanan: Pilihan Menu */}
                <div className="flex-1 flex flex-col overflow-y-auto pt-4 pb-4 px-4">
                  <div className="flex flex-col gap-2.5">
                    {tema3Step === 'DIGITAL' && ['BANK', 'DANA', 'FLIP', 'ORDER KUOTA'].map((s, idx) => {
                      const label = s === 'BANK' ? 'BANK' : s;
                      const icon = s === 'BANK' ? 'fa-building-columns' : s === 'DANA' ? 'fa-wallet' : s === 'FLIP' ? 'fa-bolt' : 'fa-wifi';
                      const isSelected = activeMode === 'DIGITAL' && sumberAplikasi === s;
                      return (
                        <button 
                          key={s}
                          data-autofocus={idx === 0 ? "true" : "false"}
                          onClick={() => {
                            setActiveMode('DIGITAL');
                            setSumberAplikasi(s);
                            setIsKetAuto(true);
                            setIsAdminManuallyEdited(false);
                            setIsTema3SheetOpen(false);
                          }}
                          className={cn(
                            "group px-4 py-3.5 rounded-[16px] border transition-all text-left flex items-center gap-3.5 shadow-sm active:scale-95 outline-none focus:outline-none",
                            isSelected 
                              ? "bg-orange-500 border-orange-500 text-white" 
                              : "border-gray-100 bg-white hover:bg-orange-500 hover:border-orange-500 focus:bg-orange-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-200"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", 
                            isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600 group-hover:bg-white/20 group-hover:text-white group-focus:bg-white/20 group-focus:text-white"
                          )}>
                            <i className={cn("fa-solid text-lg", icon)}></i>
                          </div>
                          <span className={cn("text-[12px] font-black uppercase tracking-widest transition-colors", 
                            isSelected ? "text-white" : "text-slate-700 group-hover:text-white group-focus:text-white"
                          )}>{label}</span>
                        </button>
                      )
                    })}

                    {tema3Step === 'TARIK' && ['QRIS','DANA','ATM','GOPAY','BANK'].map((s, idx) => {
                      const icon = s === 'QRIS' ? 'fa-qrcode' : s === 'ATM' ? 'fa-credit-card' : s === 'DANA' ? 'fa-wallet' : s === 'GOPAY' ? 'fa-wallet' : 'fa-building-columns';
                      const isSelected = activeMode === 'TARIK' && selectedSumber === s;
                      return (
                        <button 
                          key={s}
                          data-autofocus={idx === 0 ? "true" : "false"}
                          onClick={() => {
                            setActiveMode('TARIK');
                            setSelectedSumber(s);
                            setIsKetAuto(true);
                            setIsAdminManuallyEdited(false);
                            setIsTema3SheetOpen(false);
                          }}
                          className={cn(
                            "group px-4 py-3.5 rounded-[16px] border transition-all text-left flex items-center gap-3.5 shadow-sm active:scale-95 outline-none focus:outline-none",
                            isSelected 
                              ? "bg-orange-500 border-orange-500 text-white" 
                              : "border-gray-100 bg-white hover:bg-orange-500 hover:border-orange-500 focus:bg-orange-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-200"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", 
                            isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-600 group-hover:bg-white/20 group-hover:text-white group-focus:bg-white/20 group-focus:text-white"
                          )}>
                            <i className={cn("fa-solid text-lg", icon)}></i>
                          </div>
                          <span className={cn("text-[12px] font-black uppercase tracking-widest transition-colors", 
                            isSelected ? "text-white" : "text-slate-700 group-hover:text-white group-focus:text-white"
                          )}>{s}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      )}
    </div>

  )
}

export default TransactionForm
