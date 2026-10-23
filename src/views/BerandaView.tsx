import { KasSummary } from '../components/KasSummary';
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { GlobalHeader } from '../components/GlobalHeader';
import { formatRupiah, formatInputRupiah, cn, getLocalISOString, getLocalDateString, parseLocalISO, getShiftInfo, APP_VERSION, formatLocalISO } from '../lib/utils'
import { supabase } from '../lib/supabase'
import TransactionForm from '../components/TransactionForm'
import SummaryCards from '../components/SummaryCards'
import PosKasirView from './PosKasirView'
import type { Transaction, Store } from '../types'
import { saveKasirAccounts, type KasirAccount } from '../components/LoginScreen'
import ProfitOwnerView from './ProfitOwnerView'
import { printThermalReceipt, isAndroidBridgeAvailable } from '../lib/printerService'
import { AbsenSelfieGalleryModal } from '../components/AbsenSelfieGalleryModal'
interface BerandaViewProps {
  active: boolean
  activeView: string
  setIsSidePanelOpen: (v: boolean) => void
  setActiveView: (v: string) => void
  saldoBank: number
  totalPenjualan: number
  lastTx?: Transaction
  formKategori?: string
  setFormKategori?: (v: string) => void
  formNominal?: string
  setFormNominal?: (v: string) => void
  formAdmin?: string
  setFormAdmin?: (v: string) => void
  formKeterangan?: string
  setFormKeterangan?: (v: string) => void
  handleSimpanTransaksi: () => void
  handleSyncPast30Days?: () => void
  transactions: Transaction[]
  allTransactions?: Transaction[]
  isSaving: boolean
  totalAdmin: number
  totalVolume: number
  totalAksesoris: number
  totalTarik: number
  totalSaldoKas: number
  penjualanDigital: number
  kasModal: number
  penjualanVoucherTunai?: number
  kasirName: string
  kasirRole: string
  filterKasir: string
  setFilterKasir: (v: string) => void
  setFilterTanggal?: (v: string) => void
  onLogout: () => void
  kasirList: Record<string, KasirAccount>
  refreshKasirList: (newList?: Record<string, KasirAccount>) => void
  jamAbsen?: string
  absensiList: any[]
  runningTexts: string[]
  mainAnnouncement: string
  storeName: string
  storeSubtext: string
  storePhoto?: string
  handleOwnerTambahModal: (kId: string, nom: number, kategori: string) => void
  kasLainnya: number
  totalKhusus: number
  totalNonTunai: number
  totalAdminDalam?: number
  username: string
  showToast: (m: string) => void
  onConfirm: (t: string, m: string, c: () => void) => void
  presets?: any[]
  adminRules?: Record<string, any>
  activeStoreId?: string | 'all'
  pantauStoreId?: string | 'all'
  targetTrx?: number
  gajiBonusList?: any[]
  fetchGajiBonus?: () => void
  setPantauStoreId?: (id: string | 'all') => void
  stores?: Store[]
  isPc?: boolean
  userId: string
  onSaveCashierSelf?: (username: string, updatedAccount: { name: string, pin: string, [key: string]: any }) => Promise<void>
  onJurnalClick?: () => void
}

const BannerCarousel: React.FC<{ texts: { text: string, isMain: boolean }[] }> = ({ texts }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (texts.length <= 1) return;
    const interval = setInterval(() => {
      const el = document.getElementById('promo-carousel');
      if (el) {
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
          el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
        }
      }
    }, 4000); 
    return () => clearInterval(interval);
  }, [texts.length]);

  const gradients = [
    "from-[#004A8B] to-[#0069BA]", 
    "from-purple-700 to-fuchsia-600",
    "from-rose-700 to-pink-600",
    "from-emerald-700 to-teal-600",
    "from-orange-700 to-amber-600",
    "from-cyan-700 to-cyan-600",
    "from-indigo-700 to-blue-700",
    "from-red-700 to-rose-600",
    "from-slate-700 to-slate-600",
    "from-green-700 to-emerald-600"
  ];

  if (texts.length === 0) return null;

  return (
    <div className="relative mx-1.5 mb-1.5 mt-1 overflow-hidden shadow-sm border border-white/20 rounded-[1.25rem]">
      {/* Dots Indicator */}
      {texts.length > 1 && (
        <div className="absolute top-2 right-3 flex gap-1 z-20">
          {texts.map((_, i) => (
            <div 
              key={i} 
              className={cn("h-1 rounded-full transition-all", index === i ? "w-3 bg-white" : "w-1.5 bg-white/40")}
            />
          ))}
        </div>
      )}
      
      {/* Carousel Container */}
      <div 
        id="promo-carousel" 
        onScroll={(e) => { 
          const el = e.currentTarget; 
          setIndex(Math.round(el.scrollLeft / el.clientWidth)); 
        }} 
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar w-full"
        style={{ scrollBehavior: 'smooth' }}
      >
        {texts.map((t, i) => (
          <div key={i} className={cn("snap-center min-w-full px-5 pt-5 pb-3 flex items-center justify-center bg-gradient-to-r", gradients[i % gradients.length])}>
            <p className="text-white text-center font-bold text-[11px] leading-relaxed drop-shadow-md whitespace-pre-wrap">{t.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const GajiPanel: React.FC<{
  kasirList: Record<string, KasirAccount>
  absensiList?: any[]
  storeName?: string
  showToast: (m: string) => void
  activeStoreId: string
  transactions?: any[]
  gajiBonusList?: any[]
  fetchGajiBonus?: () => void
  onConfirm?: (t: string, m: string, c: () => void) => void
}> = ({ kasirList, absensiList, storeName, showToast, activeStoreId, transactions, gajiBonusList, fetchGajiBonus, onConfirm }) => {
  if (activeStoreId === 'all') {
    return (
      <div className="p-6 text-center bg-amber-50 border border-amber-100 rounded-2xl">
        <i className="fa-solid fa-store-slash text-amber-500 text-3xl mb-3"></i>
        <p className="text-xs font-black text-amber-800 uppercase tracking-widest">PILIH TOKO TERLEBIH DAHULU</p>
        <p className="text-[10px] text-amber-600/80 font-bold uppercase mt-1">Silakan pilih salah satu toko untuk mengelola data gajih.</p>
      </div>
    );
  }

  const [selectedKasir, setSelectedKasir] = useState<string>('')
  const [month, setMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [mode, setMode] = useState<'harian' | 'bulanan'>('harian')
  const [gajiPerHari, setGajiPerHari] = useState(() => localStorage.getItem(`alfaza_${activeStoreId}_gaji_per_hari`) || "50000")
  const [gajiBulanan, setGajiBulanan] = useState(() => localStorage.getItem(`alfaza_${activeStoreId}_gaji_bulanan`) || "0")
  const [bonus, setBonus] = useState("0")
  const [potonganLain, setPotonganLain] = useState("0")
  const [ketPotongan, setKetPotongan] = useState("")
  const [editHariKerja, setEditHariKerja] = useState(false)
  const [hariKerjaManual, setHariKerjaManual] = useState("")
  const [editLibur, setEditLibur] = useState(false)
  const [liburManual, setLiburManual] = useState("")
  const [editLemburHari, setEditLemburHari] = useState(false)
  const [lemburHariManual, setLemburHariManual] = useState("")
  const [editUangLembur, setEditUangLembur] = useState(false)
  const [uangLemburManual, setUangLemburManual] = useState("")
  const [editIzin, setEditIzin] = useState(false)
  const [izinManual, setIzinManual] = useState("")
  const [catatan, setCatatan] = useState("")
  const slipRef = React.useRef<HTMLDivElement>(null)

  const [izinList, setIzinList] = useState<any[]>([])

  // State untuk Tab Gaji Panel
  const [gajiTab, setGajiTab] = useState<'form-gaji' | 'riwayat-gaji' | 'bonus'>('form-gaji')
  const [expandedRiwayatGaji, setExpandedRiwayatGaji] = useState<string | null>(null)
  
  // Filter state for riwayat
  const [filterGajiKasir, setFilterGajiKasir] = useState<string>('semua')
  const [filterBonusKasir, setFilterBonusKasir] = useState<string>('semua')
  
  // State untuk Form Bonus
  const [bonusKasir, setBonusKasir] = useState<string>('')
  const [bonusPeriode, setBonusPeriode] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  })
  const [bonusNominal, setBonusNominal] = useState<string>('')
  const [bonusIsPaid, setBonusIsPaid] = useState<boolean>(true)

  // State untuk Edit Riwayat Bonus
  const [editingBonus, setEditingBonus] = useState<{
    id: any;
    kasir_id: string;
    periode: string;
    nominal: string;
    isPaid: boolean;
  } | null>(null);
  const [isSavingBonus, setIsSavingBonus] = useState(false);

  // State untuk Review & Print Struk Gaji
  const [reviewReceiptText, setReviewReceiptText] = useState<string | null>(null);
  const [reviewViewMode, setReviewViewMode] = useState<'visual' | 'raw'>('visual');
  const [autoPrintSetting, setAutoPrintSetting] = useState<boolean>(() => localStorage.getItem('auto_print_gaji') === 'true');
  useEffect(() => {
    const saved = localStorage.getItem(`alphaPro_${activeStoreId}_catatanIzin`)
    if (saved) {
      setIzinList(JSON.parse(saved))
    }
  }, [month, activeStoreId])

  useEffect(() => {
    localStorage.setItem(`alfaza_${activeStoreId}_gaji_per_hari`, gajiPerHari.replace(/\D/g, ''))
  }, [gajiPerHari, activeStoreId])
  useEffect(() => {
    localStorage.setItem(`alfaza_${activeStoreId}_gaji_bulanan`, gajiBulanan.replace(/\D/g, ''))
  }, [gajiBulanan, activeStoreId])

  const kasirArr = Object.entries(kasirList).filter(([id]) => id !== 'owner')
  useEffect(() => {
    if (!selectedKasir && kasirArr.length > 0) {
      setSelectedKasir(kasirArr[0][0])
    }
    if (!bonusKasir && kasirArr.length > 0) {
      setBonusKasir(kasirArr[0][0])
    }
  }, [kasirArr, selectedKasir, bonusKasir])

  const selectedName = kasirList[selectedKasir]?.name || ''

  // Sinkronisasi data absensi bulan ini untuk kasir terpilih
  const [yyyy, mm] = month.split("-").map(Number)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === yyyy && (today.getMonth() + 1) === mm
  const totalDaysInMonth = new Date(yyyy, mm, 0).getDate()
  
  let daysPassed = totalDaysInMonth
  if (isCurrentMonth) {
    daysPassed = today.getDate()
  } else if (new Date(yyyy, mm - 1) > today) {
    daysPassed = 0
  }

  const cashierMonthAbsensi = useMemo(() => {
    return (absensiList || []).filter(a => 
      (a.username === selectedKasir || a.nama_kasir === selectedName) && 
      a.tanggal && 
      a.tanggal.startsWith(month)
    )
  }, [absensiList, selectedKasir, selectedName, month])

  // 1. Hari Lembur: absensi dengan status 'Lembur'
  const autoLemburDays = useMemo(() => {
    const lemburEntries = cashierMonthAbsensi.filter(a => a.status === 'Lembur')
    return new Set(lemburEntries.map(a => a.tanggal)).size
  }, [cashierMonthAbsensi])

  // 2. Hari Hadir Reguler: absensi hadir (status !== 'Libur' && status !== 'Izin' && status !== 'Lembur')
  const autoHadirDays = useMemo(() => {
    const hadirEntries = cashierMonthAbsensi.filter(a => a.status === 'Hadir' || (a.status !== 'Libur' && a.status !== 'Izin' && a.status !== 'Lembur'))
    return new Set(hadirEntries.map(a => a.tanggal)).size
  }, [cashierMonthAbsensi])

  // 3. Hari Libur (Off):
  const autoLiburDays = useMemo(() => {
    const explicitLibur = new Set(cashierMonthAbsensi.filter(a => a.status === 'Libur').map(a => a.tanggal)).size
    const attendedDates = new Set(cashierMonthAbsensi.filter(a => a.status !== 'Libur' && a.status !== 'Izin').map(a => a.tanggal))
    
    const todayStr = getLocalDateString()
    const hasAttendedToday = attendedDates.has(todayStr)
    let effectiveDaysPassed = daysPassed
    if (isCurrentMonth && !hasAttendedToday) {
      effectiveDaysPassed = Math.max(0, today.getDate() - 1)
    }
    const unrecordedDays = Math.max(0, effectiveDaysPassed - attendedDates.size)
    return Math.max(explicitLibur, unrecordedDays)
  }, [cashierMonthAbsensi, daysPassed, isCurrentMonth])

  const izinCount = izinList.filter(iz => iz.nama === selectedName && iz.tanggal.startsWith(month)).length

  const hariKerja = editHariKerja ? (isNaN(parseInt(hariKerjaManual)) ? 0 : Math.max(0, parseInt(hariKerjaManual))) : autoHadirDays
  const hariLibur = editLibur ? (isNaN(parseInt(liburManual)) ? 0 : Math.max(0, parseInt(liburManual))) : autoLiburDays
  const hariLembur = editLemburHari ? (isNaN(parseInt(lemburHariManual)) ? 0 : Math.max(0, parseInt(lemburHariManual))) : autoLemburDays
  const currentIzin = editIzin ? (isNaN(parseInt(izinManual)) ? 0 : Math.max(0, parseInt(izinManual))) : izinCount

  const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    return parseInt(String(val || '').replace(/\D/g, '')) || 0;
  };
  const formatNum = (val: any) => {
    if (typeof val === 'number') return val.toLocaleString('id-ID');
    const num = parseInt(String(val || '').replace(/\D/g, '')) || 0;
    return num.toLocaleString('id-ID');
  };

  const ratePerHari = mode === "harian" ? parseNum(gajiPerHari) : Math.round(parseNum(gajiBulanan) / 30)
  const defaultUangLembur = hariLembur * (ratePerHari || 50000)
  const uangLemburVal = editUangLembur ? parseNum(uangLemburManual) : defaultUangLembur

  const gajiPokok = mode === "harian" ? hariKerja * ratePerHari : parseNum(gajiBulanan)
  const potonganIzinVal = currentIzin * ratePerHari
  const totalGaji = gajiPokok + uangLemburVal + parseNum(bonus) - potonganIzinVal - parseNum(potonganLain)

  const monthDate = new Date(yyyy, mm - 1)
  const monthLabel = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  // Reset mode edit saat ganti kasir atau periode bulan
  useEffect(() => {
    setEditHariKerja(false)
    setEditLibur(false)
    setEditLemburHari(false)
    setEditUangLembur(false)
    setEditIzin(false)
    setHariKerjaManual(String(autoHadirDays))
    setLiburManual(String(autoLiburDays))
    setLemburHariManual(String(autoLemburDays))
    setIzinManual(String(izinCount))
    const calcDefaultLembur = autoLemburDays * (ratePerHari || 50000)
    setUangLemburManual(calcDefaultLembur > 0 ? calcDefaultLembur.toLocaleString('id-ID') : "0")
  }, [selectedKasir, month])

  // Sinkronkan default manual jika belum diaktifkan edit manual
  useEffect(() => {
    if (!editHariKerja) setHariKerjaManual(String(autoHadirDays))
  }, [autoHadirDays, editHariKerja])

  useEffect(() => {
    if (!editLibur) setLiburManual(String(autoLiburDays))
  }, [autoLiburDays, editLibur])

  useEffect(() => {
    if (!editLemburHari) setLemburHariManual(String(autoLemburDays))
  }, [autoLemburDays, editLemburHari])

  useEffect(() => {
    if (!editIzin) setIzinManual(String(izinCount))
  }, [izinCount, editIzin])

  useEffect(() => {
    if (!editUangLembur) {
      const calcDefaultLembur = hariLembur * (ratePerHari || 50000)
      setUangLemburManual(calcDefaultLembur > 0 ? calcDefaultLembur.toLocaleString('id-ID') : "0")
    }
  }, [hariLembur, ratePerHari, editUangLembur])

  const generateSlipGajiReceiptText = () => {
    const w = 32;
    const center = (s: string) => {
      const txt = (s || '').trim().substring(0, w);
      return ' '.repeat(Math.max(0, Math.floor((w - txt.length) / 2))) + txt;
    };
    const right = (left: string, rightVal: string) => {
      const l = (left || '').trim();
      const r = (rightVal || '').trim();
      const space = w - l.length - r.length;
      return l + (space > 0 ? ' '.repeat(space) : ' ') + r;
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID');
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

    let t = '';
    t += center(storeName || 'ALFAZA CELL') + '\n';
    t += center('SLIP GAJI KARYAWAN') + '\n';
    t += '='.repeat(w) + '\n';
    t += right('Kasir', selectedName) + '\n';
    t += right('Periode', monthLabel.toUpperCase()) + '\n';
    t += right('Waktu Cetak', `${dateStr} ${timeStr}`) + '\n';
    t += '-'.repeat(w) + '\n';
    t += center('RINCIAN KEHADIRAN') + '\n';
    t += right('Hadir (Kerja)', `${hariKerja} hari`) + '\n';
    t += right('Libur (Off)', `${hariLibur} hari`) + '\n';
    if (hariLembur > 0) {
      t += right('Lembur', `${hariLembur} hri`) + '\n';
    }
    if (currentIzin > 0) {
      t += right('Izin / Alpha', `${currentIzin} hari`) + '\n';
    }
    t += '-'.repeat(w) + '\n';
    t += center('RINCIAN PENGGAJIAN') + '\n';
    t += right('Gaji Pokok', `Rp ${formatNum(gajiPokok)}`) + '\n';
    if (uangLemburVal > 0) {
      t += right('Uang Lembur', `+Rp ${formatNum(uangLemburVal)}`) + '\n';
    }
    if (parseNum(bonus) > 0) {
      t += right('Bonus', `+Rp ${formatNum(parseNum(bonus))}`) + '\n';
    }
    if (currentIzin > 0 && potonganIzinVal > 0) {
      t += right('Potongan Izin', `-Rp ${formatNum(potonganIzinVal)}`) + '\n';
    }
    if (parseNum(potonganLain) > 0) {
      const ket = ketPotongan ? ` (${ketPotongan})` : '';
      t += right(`Potongan${ket}`.substring(0, 15), `-Rp ${formatNum(parseNum(potonganLain))}`) + '\n';
    }
    t += '='.repeat(w) + '\n';
    t += right('TOTAL DITERIMA', `Rp ${formatNum(totalGaji)}`) + '\n';
    t += '='.repeat(w) + '\n';
    
    if (catatan) {
      t += `Catatan:\n${catatan}\n`;
      t += '-'.repeat(w) + '\n';
    }
    
    t += '\n';
    t += center('Tanda Tangan / Penerima') + '\n\n\n';
    t += center(`( ${selectedName} )`) + '\n';
    t += '\n\n\n';

    return t;
  };
  const executePrintReceipt = async (text: string) => {
    showToast('Mengirim ke printer...');
    const result = await printThermalReceipt(text);
    if (result.success) {
      showToast('Cetak struk gaji berhasil!');
      setReviewReceiptText(null);
    }
  };

  const handlePrintGajihClick = () => {
    try {
      const text = generateSlipGajiReceiptText();
      const isAutoPrint = localStorage.getItem('auto_print_gaji') === 'true';
      const btMac = localStorage.getItem('bluetooth_printer_mac');

      if (isAutoPrint && (btMac || isAndroidBridgeAvailable())) {
        executePrintReceipt(text);
      } else {
        setReviewReceiptText(text);
      }
    } catch (e: any) {
      console.error("Gagal memproses struk gaji:", e);
      showToast("Gagal memproses struk gaji: " + (e?.message || e));
    }
  };

  const handleCopyWAFromModal = async () => {
    if (!reviewReceiptText) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(reviewReceiptText);
        showToast("Teks struk berhasil disalin!");
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = reviewReceiptText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast("Teks struk berhasil disalin!");
      }
    } catch {
      showToast("Gagal menyalin teks.");
    }
  };

  const printHistorySlip = (tx: any) => {
    try {
      const w = 32;
      const center = (s: string) => {
        const txt = (s || '').trim().substring(0, w);
        return ' '.repeat(Math.max(0, Math.floor((w - txt.length) / 2))) + txt;
      };
      const right = (left: string, rightVal: string) => {
        const l = (left || '').trim();
        const r = (rightVal || '').trim();
        const space = w - l.length - r.length;
        return l + (space > 0 ? ' '.repeat(space) : ' ') + r;
      };

      const kasirName = kasirList[tx.kasir_id || '']?.name || 'Kasir';
      const txDate = new Date(tx.timestamp);
      const dateStr = txDate.toLocaleDateString('id-ID');
      const timeStr = txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

      let t = '';
      t += center(storeName || 'ALFAZA CELL') + '\n';
      t += center('SLIP GAJI KARYAWAN') + '\n';
      t += '='.repeat(w) + '\n';
      t += right('Kasir', kasirName) + '\n';
      t += right('Waktu Cetak', `${dateStr} ${timeStr}`) + '\n';
      t += '-'.repeat(w) + '\n';

      const details = tx.keterangan.replace('[GAJI] ', '').split(', ');
      details.forEach((item: string) => {
        const parts = item.split(': ');
        if (parts.length >= 2) {
          const lbl = parts[0].trim();
          const val = parts.slice(1).join(': ').trim();
          t += right(lbl.substring(0, 16), val) + '\n';
        }
      });

      t += '='.repeat(w) + '\n';
      t += right('TOTAL DITERIMA', `Rp ${formatNum(tx.nominal)}`) + '\n';
      t += '='.repeat(w) + '\n';
      t += '\n';
      t += center('Tanda Tangan / Penerima') + '\n\n\n';
      t += center(`( ${kasirName} )`) + '\n';
      t += '\n\n\n';

      const isAutoPrint = localStorage.getItem('auto_print_gaji') === 'true';
      const btMac = localStorage.getItem('bluetooth_printer_mac');
      if (isAutoPrint && (btMac || isAndroidBridgeAvailable())) {
        executePrintReceipt(t);
      } else {
        setReviewReceiptText(t);
      }
    } catch (e: any) {
      console.error("Gagal print struk riwayat:", e);
      showToast("Gagal memproses struk: " + (e?.message || e));
    }
  };

  const handleSharePDF = async () => {
    if (!slipRef.current) return
    try {
      const html2canvasModule = await import('html2canvas')
      const html2canvas = html2canvasModule.default
      const canvas = await html2canvas(slipRef.current, { scale: 2, useCORS: true, backgroundColor: null })
      const imgData = canvas.toDataURL("image/png")
      const { default: jsPDF } = await import("jspdf")
      
      const pdf = new jsPDF("p", "mm", "a5")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const imgWidth = pdfWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, "PNG", 10, 15, imgWidth, imgHeight)
      
      pdf.setFontSize(8)
      pdf.setFont("helvetica", "italic")
      pdf.setTextColor(150, 150, 150)
      pdf.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, pdfWidth / 2, imgHeight + 25, { align: "center" })

      const filename = `slip-gaji-${selectedName.replace(/\s+/g, '-')}-${month}.pdf`

      const { Capacitor } = await import('@capacitor/core')
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const { Share } = await import('@capacitor/share')
        
        const pdfBase64 = pdf.output("datauristring").split(',')[1]
        
        const result = await Filesystem.writeFile({
          path: filename,
          data: pdfBase64,
          directory: Directory.Cache
        })
        
        await Share.share({
          title: `Slip Gaji ${selectedName}`,
          url: result.uri
        })
      } else {
        const blob = pdf.output("blob")
        const file = new File([blob], filename, { type: "application/pdf" })
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: `Slip Gaji ${selectedName}`, files: [file] }).catch(() => {})
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = filename
          a.click()
          URL.revokeObjectURL(url)
        }
      }
    } catch (e: any) {
      showToast("Gagal share PDF: " + (e?.message || "Error unknown"))
      console.error(e)
    }
  }

  const handleSimpanGaji = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast("Gagal: Anda belum login!");
        return;
      }
      const newRecord = {
        user_id: user.id,
        store_id: activeStoreId,
        kasir_id: selectedKasir,
        jenis: 'Gaji',
        nominal: totalGaji,
        keterangan: `Periode: ${monthLabel}, Hadir: ${hariKerja} hari, Libur: ${hariLibur} hari, Lembur: ${hariLembur} hari, Uang Lembur: Rp ${formatRupiah(uangLemburVal)}, Pokok: Rp ${formatRupiah(gajiPokok)}, Bonus: Rp ${formatRupiah(parseNum(bonus))}, Potongan: Rp ${formatRupiah(potonganIzinVal + parseNum(potonganLain))}`,
        timestamp: new Date().toISOString()
      };
      const { error } = await supabase.from('gaji_bonus').insert([newRecord]);
      if (error) throw error;
      showToast("Berhasil menyimpan riwayat gaji ke server!");
      if (fetchGajiBonus) fetchGajiBonus();
    } catch (e: any) {
      showToast("Gagal simpan: " + e.message);
    }
  }

  const handleShareJPG = async () => {
    try {
      if (!slipRef.current) return;
      showToast("Memproses gambar...");
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      const canvas = await html2canvas(slipRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      
      const filename = `slip-gaji-${selectedName.replace(/\s+/g, '-')}-${month}.jpg`;
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        
        const base64Data = canvas.toDataURL("image/jpeg", 0.9).split(',')[1];
        
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        });
        
        await Share.share({
          title: `Slip Gaji ${selectedName}`,
          url: result.uri
        });
      } else {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Gambar berhasil diunduh.');
        }, 'image/jpeg', 0.9);
      }
    } catch (e: any) {
      showToast("Gagal share JPG: " + (e?.message || "Error unknown"));
      console.error(e);
    }
  }

  const shareHistoryData = async (tx: any, format: 'jpg' | 'pdf') => {
    try {
      showToast(`Memproses ${format.toUpperCase()}...`);
      const kasirName = kasirList[tx.kasir_id || '']?.name || 'Kasir';
      const dateStr = new Date(tx.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      
      const details = tx.keterangan.replace('[GAJI] ', '').split(', ');
      
      const el = document.createElement('div');
      el.style.width = "400px";
      el.style.background = "linear-gradient(to bottom right, #15803d, #10b981)";
      el.style.padding = "24px";
      el.style.color = "white";
      el.style.fontFamily = "system-ui, -apple-system, sans-serif";
      el.style.position = "absolute";
      el.style.left = "-9999px"; // hide offscreen
      
      el.innerHTML = `
        <div style="position:relative; z-index:10;">
          <h2 style="text-align:center; font-weight:900; font-size:18px; margin:0 0 2px 0; letter-spacing:2px;">SLIP GAJI</h2>
          <p style="text-align:center; color:#d1fae5; font-size:10px; font-weight:700; letter-spacing:2px; margin:0 0 16px 0;">TANGGAL ${dateStr}</p>
          <div style="background:rgba(0,0,0,0.1); padding:16px; border-radius:16px; border:1px solid rgba(255,255,255,0.1);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
              <span style="font-size:10px; font-weight:bold; color:#d1fae5;">NAMA</span>
              <span style="font-size:14px; font-weight:900; text-transform:uppercase;">${kasirName}</span>
            </div>
            ${details.map((item: string) => {
              const parts = item.split(': ');
              if(parts.length < 2) return '';
              const lbl = parts[0];
              const val = parts.slice(1).join(': ');
              return '<div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">' +
                '<span style="color:#d1fae5; font-weight:bold; text-transform:uppercase;">' + lbl + '</span>' +
                '<span style="font-weight:900; text-align:right; white-space:pre-wrap; max-width:60%;">' + val + '</span>' +
              '</div>';
            }).join('')}
          </div>
          <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
               <p style="font-size:9px; font-weight:bold; color:#a7f3d0; margin:0 0 2px 0;">TOTAL DITERIMA</p>
               <span style="font-weight:900; font-size:24px; margin:0;">Rp ${tx.nominal.toLocaleString('id-ID')}</span>
            </div>
            <div style="text-align:right;">
               <p style="font-size:7px; font-weight:bold; color:#a7f3d0; margin:0;">${storeName || 'ALFAZA CELL'}</p>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(el);
      
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(el);

      const filename = `riwayat-gaji-${kasirName.replace(/\s+/g, '-')}-${tx.id}.${format}`;
      const { Capacitor } = await import('@capacitor/core');
      
      if (format === 'jpg') {
        if (Capacitor.isNativePlatform()) {
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const { Share } = await import('@capacitor/share');
          const base64Data = canvas.toDataURL("image/jpeg", 0.9).split(',')[1];
          const result = await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Cache });
          await Share.share({ title: `Slip Gaji ${kasirName}`, url: result.uri });
        } else {
          canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Gambar berhasil diunduh.');
          }, 'image/jpeg', 0.9);
        }
      } else {
        const imgData = canvas.toDataURL("image/png");
        const { default: jsPDF } = await import("jspdf");
        const pdf = new jsPDF("p", "mm", "a5");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 10, 15, imgWidth, imgHeight);
        
        if (Capacitor.isNativePlatform()) {
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const { Share } = await import('@capacitor/share');
          const pdfBase64 = pdf.output("datauristring").split(',')[1];
          const result = await Filesystem.writeFile({ path: filename, data: pdfBase64, directory: Directory.Cache });
          await Share.share({ title: `Slip Gaji ${kasirName}`, url: result.uri });
        } else {
          const blob = pdf.output("blob");
          const file = new File([blob], filename, { type: "application/pdf" });
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: `Slip Gaji ${kasirName}`, files: [file] }).catch(() => {});
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
          }
        }
      }
    } catch (e: any) {
      showToast(`Gagal share ${format.toUpperCase()}: ` + (e?.message || "Error unknown"));
      console.error(e);
    }
  }

  const handleSimpanBonus = async () => {
    try {
      if (!bonusKasir || !bonusPeriode || !bonusNominal) {
         showToast("Harap lengkapi form bonus!"); return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast("Gagal: Anda belum login!");
        return;
      }
      const numBonus = parseNum(bonusNominal);
      const newRecord = {
        user_id: user.id,
        store_id: activeStoreId,
        kasir_id: bonusKasir,
        jenis: 'Bonus',
        nominal: bonusIsPaid ? numBonus : 0,
        keterangan: `Periode: ${bonusPeriode}, Nominal Target: Rp ${formatRupiah(numBonus)}, Status: ${bonusIsPaid ? 'Sudah Dibayar' : 'Belum Dibayar'}`,
        timestamp: new Date().toISOString()
      };
      const { error } = await supabase.from('gaji_bonus').insert([newRecord]);
      if (error) throw error;
      showToast("Berhasil menyimpan data bonus ke server!");
      setBonusPeriode(""); setBonusNominal("");
      if (fetchGajiBonus) fetchGajiBonus();
    } catch (e: any) {
      showToast("Gagal simpan bonus: " + e.message);
    }
  }

  const handleTandaiDibayar = async (tx: any) => {
    try {
       const match = tx.keterangan.match(/Nominal Target:\s*Rp\s*([\d\.,]+)/);
       let targetNominal = 0;
       if (match) {
         targetNominal = parseNum(match[1]);
       }
       const newKeterangan = tx.keterangan.replace('Belum Dibayar', 'Sudah Dibayar');
       
       const { error } = await supabase.from('gaji_bonus').update({
          nominal: targetNominal,
          keterangan: newKeterangan
       }).eq('id', tx.id);
       if (error) throw error;
       showToast("Bonus berhasil ditandai lunas!");
       if (fetchGajiBonus) fetchGajiBonus();
    } catch(e: any) {
       showToast("Gagal update bonus: " + e.message);
    }
  }

  const handleOpenEditBonus = (tx: any) => {
    const targetMatch = tx.keterangan.match(/Nominal Target:\s*Rp\s*([\d\.,]+)/);
    const nominalVal = targetMatch ? targetMatch[1].replace(/\D/g, '') : String(tx.nominal || 0);
    const periodeMatch = tx.keterangan.match(/Periode:\s*([^,]+)/);
    const periodeVal = periodeMatch ? periodeMatch[1].trim() : (tx.timestamp ? tx.timestamp.split('T')[0] : '');
    const isPaid = tx.keterangan.includes('Sudah Dibayar') || (tx.nominal && tx.nominal > 0);

    setEditingBonus({
      id: tx.id,
      kasir_id: tx.kasir_id || '',
      periode: periodeVal,
      nominal: parseInt(nominalVal || '0').toLocaleString('id-ID'),
      isPaid: !!isPaid
    });
  };

  const handleSaveEditBonus = async () => {
    if (!editingBonus) return;
    if (!editingBonus.kasir_id || !editingBonus.periode || !editingBonus.nominal) {
      showToast("Harap lengkapi semua data bonus!");
      return;
    }
    setIsSavingBonus(true);
    try {
      const numBonus = parseNum(editingBonus.nominal);
      const updatedKeterangan = `Periode: ${editingBonus.periode}, Nominal Target: Rp ${formatRupiah(numBonus)}, Status: ${editingBonus.isPaid ? 'Sudah Dibayar' : 'Belum Dibayar'}`;
      
      const { error } = await supabase.from('gaji_bonus').update({
        kasir_id: editingBonus.kasir_id,
        nominal: editingBonus.isPaid ? numBonus : 0,
        keterangan: updatedKeterangan
      }).eq('id', editingBonus.id);

      if (error) throw error;
      showToast("Riwayat bonus berhasil diperbarui!");
      setEditingBonus(null);
      if (fetchGajiBonus) fetchGajiBonus();
    } catch (e: any) {
      showToast("Gagal update bonus: " + e.message);
    } finally {
      setIsSavingBonus(false);
    }
  };

  const handleDeleteBonus = (tx: any) => {
    const kasirName = kasirList[tx.kasir_id || '']?.name || 'Kasir';
    const targetMatch = tx.keterangan.match(/Nominal Target:\s*Rp\s*([\d\.,]+)/);
    const nomStr = targetMatch ? targetMatch[1].replace(/^Rp\s*/i, '') : formatRupiah(tx.nominal).replace(/^Rp\s*/i, '');
    
    const executeDelete = async () => {
      try {
        const { error } = await supabase.from('gaji_bonus').delete().eq('id', tx.id);
        if (error) throw error;
        showToast("Riwayat bonus berhasil dihapus!");
        if (fetchGajiBonus) fetchGajiBonus();
      } catch (e: any) {
        showToast("Gagal menghapus bonus: " + e.message);
      }
    };

    if (onConfirm) {
      onConfirm(
        "Hapus Riwayat Bonus",
        `Yakin ingin menghapus data bonus kasir ${kasirName} sebesar Rp ${nomStr}? Tindakan ini tidak dapat dibatalkan.`,
        executeDelete
      );
    } else {
      if (window.confirm(`Yakin ingin menghapus data bonus kasir ${kasirName} sebesar Rp ${nomStr}?`)) {
        executeDelete();
      }
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* TABS (KOLOM BERWARNA BIRU) */}
      <div className="bg-gradient-to-br from-blue-600 to-sky-500 p-3 rounded-2xl mb-4 shadow-lg border border-blue-400/30">
        <h3 className="text-[10px] font-black text-white/90 uppercase tracking-widest text-center mb-3 drop-shadow-sm">
          Menu Pengelolaan Gaji & Bonus
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setGajiTab('form-gaji')}
            className={cn("flex-1 py-3 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all shadow-sm flex flex-col items-center justify-center gap-1", gajiTab === 'form-gaji' ? "bg-white text-blue-600 ring-2 ring-white/50 scale-105" : "bg-white/20 text-white hover:bg-white/30")}
          >
            <i className="fa-solid fa-file-invoice text-sm mb-1"></i>
            Form Gajih
          </button>
          <button 
            onClick={() => setGajiTab('riwayat-gaji')}
            className={cn("flex-1 py-3 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all shadow-sm flex flex-col items-center justify-center gap-1", gajiTab === 'riwayat-gaji' ? "bg-white text-blue-600 ring-2 ring-white/50 scale-105" : "bg-white/20 text-white hover:bg-white/30")}
          >
            <i className="fa-solid fa-clock-rotate-left text-sm mb-1"></i>
            Riwayat Gajih
          </button>
          <button 
            onClick={() => setGajiTab('bonus')}
            className={cn("flex-1 py-3 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all shadow-sm flex flex-col items-center justify-center gap-1", gajiTab === 'bonus' ? "bg-white text-blue-600 ring-2 ring-white/50 scale-105" : "bg-white/20 text-white hover:bg-white/30")}
          >
            <i className="fa-solid fa-gift text-sm mb-1"></i>
            Form Bonus
          </button>
        </div>
      </div>

      {gajiTab === 'form-gaji' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">PILIH KASIR</label>
            <div className="relative">
              <select
                value={selectedKasir}
                onChange={e => setSelectedKasir(e.target.value)}
                className="w-full text-xs p-2.5 pr-8 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-green-400 appearance-none cursor-pointer"
              >
                {kasirArr.map(([id, k]) => <option key={id} value={id}>{k.name.toUpperCase()}</option>)}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">PERIODE BULAN</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-green-400"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">MODE PENGHITUNGAN</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("harian")}
              className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === "harian" ? "bg-green-600 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200")}
            >
              {mode === "harian" && <i className="fa-solid fa-check mr-1"></i>} Gajih / Hari
            </button>
            <button
              onClick={() => setMode("bulanan")}
              className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === "bulanan" ? "bg-green-600 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200")}
            >
              {mode === "bulanan" && <i className="fa-solid fa-check mr-1"></i>} Gajih Full 1 Bulan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">
              {mode === "harian" ? "GAJI / HARI" : "GAJI FULL BULAN"}
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-xs font-bold text-gray-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={mode === "harian" ? gajiPerHari : gajiBulanan}
                onChange={e => mode === "harian" ? setGajiPerHari(formatNum(e.target.value)) : setGajiBulanan(formatNum(e.target.value))}
                className="w-full text-xs py-2.5 pl-8 pr-3 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-green-400"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">BONUS</label>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-xs font-bold text-gray-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={bonus}
                onChange={e => setBonus(formatNum(e.target.value))}
                className="w-full text-xs py-2.5 pl-8 pr-3 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-green-400"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">POTONGAN LAIN</label>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-xs font-bold text-red-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={potonganLain}
                onChange={e => setPotonganLain(formatNum(e.target.value))}
                className="w-full text-xs py-2.5 pl-8 pr-3 rounded-lg border border-red-200 outline-none font-bold bg-red-50 text-red-700 focus:border-red-400"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">KET POTONGAN</label>
            <input
              type="text"
              value={ketPotongan}
              onChange={e => setKetPotongan(e.target.value)}
              placeholder="Kasbon, dll"
              className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-green-400"
            />
          </div>
        </div>

        {/* ROW KEHADIRAN (HADIR & LIBUR) */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">HARI KERJA (HADIR)</span>
              <label className="flex items-center gap-1.5 cursor-pointer select-none py-0.5 px-1 rounded hover:bg-blue-50 transition-colors">
                <input
                  type="checkbox"
                  checked={editHariKerja}
                  onChange={e => {
                    const checked = e.target.checked
                    setEditHariKerja(checked)
                    if (checked && (!hariKerjaManual || hariKerjaManual === "0")) {
                      setHariKerjaManual(String(autoHadirDays))
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span className="text-[8px] text-blue-600 font-bold">EDIT</span>
              </label>
            </div>
            {editHariKerja ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={hariKerjaManual}
                  onChange={e => setHariKerjaManual(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-blue-300 outline-none font-bold bg-blue-50 text-blue-700 focus:border-blue-500 pr-14"
                  placeholder="0"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-500 bg-blue-100/80 px-1.5 py-0.5 rounded">hari</span>
              </div>
            ) : (
              <div className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-100 font-bold text-gray-700 flex justify-between items-center">
                <span>{hariKerja} hari</span>
                <span className="text-[9px] text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">Auto Absen</span>
              </div>
            )}
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">HARI LIBUR (OFF)</span>
              <label className="flex items-center gap-1.5 cursor-pointer select-none py-0.5 px-1 rounded hover:bg-rose-50 transition-colors">
                <input
                  type="checkbox"
                  checked={editLibur}
                  onChange={e => {
                    const checked = e.target.checked
                    setEditLibur(checked)
                    if (checked && (!liburManual || liburManual === "0")) {
                      setLiburManual(String(autoLiburDays))
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                />
                <span className="text-[8px] text-blue-600 font-bold">EDIT</span>
              </label>
            </div>
            {editLibur ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={liburManual}
                  onChange={e => setLiburManual(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-rose-300 outline-none font-bold bg-rose-50 text-rose-700 focus:border-rose-500 pr-14"
                  placeholder="0"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-500 bg-rose-100/80 px-1.5 py-0.5 rounded">hari</span>
              </div>
            ) : (
              <div className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-100 font-bold text-gray-700 flex justify-between items-center">
                <span>{hariLibur} hari</span>
                <span className="text-[9px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Auto Absen</span>
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KHUSUS LEMBUR DENGAN TEKS 'Lembur (X hri) = total Rp ...' */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 mb-3 shadow-xs">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-bolt text-amber-500 text-xs"></i>
              <span className="text-[10px] font-black text-amber-900 uppercase tracking-wide">
                Lembur ({hariLembur} hri) = total {formatRupiah(uangLemburVal)}
              </span>
            </div>
            <span className="text-[8px] font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
              Bisa Diedit
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[8px] font-black text-amber-800 uppercase tracking-wider block mb-1">
                JML HARI LEMBUR
              </label>
              <input
                type="number"
                min="0"
                value={editLemburHari ? lemburHariManual : String(hariLembur)}
                onChange={e => {
                  setEditLemburHari(true)
                  const h = e.target.value
                  setLemburHariManual(h)
                  if (!editUangLembur) {
                    const newNom = (parseInt(h) || 0) * (ratePerHari || 50000)
                    setUangLemburManual(newNom > 0 ? newNom.toLocaleString('id-ID') : "0")
                  }
                }}
                placeholder="0"
                className="w-full text-xs p-2 rounded-lg border border-amber-300 outline-none font-bold bg-white text-amber-900 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[8px] font-black text-amber-800 uppercase tracking-wider block mb-1">
                TOTAL UPAH LEMBUR (RP)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[11px] font-bold text-amber-600">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editUangLembur ? uangLemburManual : (uangLemburVal > 0 ? uangLemburVal.toLocaleString('id-ID') : "0")}
                  onChange={e => {
                    setEditUangLembur(true)
                    setUangLemburManual(formatNum(e.target.value))
                  }}
                  className="w-full text-xs py-2 pl-8 pr-2.5 rounded-lg border border-amber-300 outline-none font-bold bg-white text-amber-900 focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ROW IZIN / ALPHA JIKA ADA */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">IZIN / ALPHA</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none py-0.5 px-1 rounded hover:bg-orange-50 transition-colors">
              <input
                type="checkbox"
                checked={editIzin}
                onChange={e => {
                  const checked = e.target.checked
                  setEditIzin(checked)
                  if (checked && (!izinManual || izinManual === "0")) {
                    setIzinManual(String(izinCount))
                  }
                }}
                className="w-3.5 h-3.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600"
              />
              <span className="text-[8px] text-blue-600 font-bold">EDIT</span>
            </label>
          </div>
          {editIzin ? (
            <div className="relative">
              <input
                type="number"
                min="0"
                value={izinManual}
                onChange={e => setIzinManual(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-orange-300 outline-none font-bold bg-orange-50 text-orange-700 focus:border-orange-500 pr-14"
                placeholder="0"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-orange-500 bg-orange-100/80 px-1.5 py-0.5 rounded">hari</span>
            </div>
          ) : (
            <div className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-100 font-bold text-gray-700 flex justify-between items-center">
              <span>{currentIzin} hari</span>
              <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Auto Absen</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">CATATAN TAMBAHAN</label>
          <textarea
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            rows={2}
            placeholder="Pesan untuk karyawan..."
            className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none font-bold bg-white resize-none focus:border-green-400"
          ></textarea>
        </div>
      </div>

      <div ref={slipRef} className="bg-gradient-to-br from-green-700 to-emerald-500 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5 pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-center font-black text-lg tracking-widest uppercase mb-0.5 drop-shadow-sm">SLIP GAJI</h2>
          <p className="text-center text-green-100 text-[10px] font-bold uppercase tracking-widest mb-4">PERIODE {monthLabel}</p>

          <div className="space-y-2.5 bg-black/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
              <span className="text-[10px] font-bold text-green-100 uppercase tracking-widest">NAMA</span>
              <span className="font-black uppercase tracking-widest">{selectedName}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-green-100 font-bold uppercase">Hadir (Hari Kerja)</span>
              <span className="font-black">{hariKerja} hari</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-green-100 font-bold uppercase">Libur (Off)</span>
              <span className="font-black">{hariLibur} hari</span>
            </div>
            {hariLembur > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-green-100 font-bold uppercase">Lembur ({hariLembur} hri)</span>
                <span className="font-black text-amber-200">total {formatRupiah(uangLemburVal)}</span>
              </div>
            )}
            <div className="flex justify-between text-[11px] pt-1 border-t border-white/10">
              <span className="text-green-100 font-bold uppercase">Gaji Pokok</span>
              <span className="font-black">{formatRupiah(gajiPokok)}</span>
            </div>
            {uangLemburVal > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-green-100 font-bold uppercase">Uang Lembur</span>
                <span className="font-black text-amber-200">+{formatRupiah(uangLemburVal)}</span>
              </div>
            )}
            <div className="flex justify-between text-[11px]">
              <span className="text-green-100 font-bold uppercase">Bonus</span>
              <span className="font-black text-green-200">{formatRupiah(parseNum(bonus))}</span>
            </div>
            {currentIzin > 0 && potonganIzinVal > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-red-200 font-bold uppercase">Potongan Izin ({currentIzin} hari)</span>
                <span className="font-black text-red-200">-{formatRupiah(potonganIzinVal)}</span>
              </div>
            )}
            {parseNum(potonganLain) > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-red-200 font-bold uppercase">Potongan {ketPotongan ? `(${ketPotongan})` : ""}</span>
                <span className="font-black text-red-200">-{formatRupiah(parseNum(potonganLain))}</span>
              </div>
            )}
            {catatan && (
              <div className="flex flex-col text-[10px] pt-2 border-t border-white/10 mt-2">
                <span className="text-green-100 font-bold uppercase mb-1">Catatan Tambahan</span>
                <span className="font-bold opacity-90 whitespace-pre-wrap">{catatan}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-[9px] font-bold text-green-200 uppercase tracking-widest mb-0.5">TOTAL DITERIMA</p>
              <span className="font-black text-2xl tracking-tighter drop-shadow-md">{formatRupiah(totalGaji)}</span>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-bold text-green-200 uppercase tracking-widest">{storeName || 'ALFAZA CELL'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4 flex-wrap">
        <button
          onClick={handleSimpanGaji}
          className="flex-[1_1_45%] bg-blue-600 text-white py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <i className="fa-solid fa-cloud-arrow-up text-[10px]"></i> SIMPAN GAJIH
        </button>
        <button
          onClick={handleShareJPG}
          className="flex-[1_1_45%] bg-[#0066FF] text-white py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <i className="fa-solid fa-download text-[10px]"></i> UNDUH JPG
        </button>
        <button
          onClick={handlePrintGajihClick}
          className="flex-[1_1_45%] bg-slate-900 text-white py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <i className="fa-solid fa-print text-[10px]"></i> PRINT GAJIH
        </button>
        <button
          onClick={handleSharePDF}
          className="flex-[1_1_45%] bg-green-600 text-white py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <i className="fa-solid fa-file-pdf text-[10px]"></i> PDF
        </button>
      </div>
      </div>
      )}

      {gajiTab === 'riwayat-gaji' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center px-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daftar Riwayat Gajih</p>
            <select
              value={filterGajiKasir}
              onChange={e => setFilterGajiKasir(e.target.value)}
              className="text-[9px] p-1.5 rounded-lg border border-gray-200 outline-none font-bold bg-white text-gray-600 focus:border-green-400"
            >
              <option value="semua">SEMUA KASIR</option>
              {kasirArr.map(([id, k]) => <option key={id} value={id}>{k.name.toUpperCase()}</option>)}
            </select>
          </div>
          {(gajiBonusList || [])?.filter((t: any) => t.jenis === 'Gaji' && (filterGajiKasir === 'semua' || t.kasir_id === filterGajiKasir)).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((tx: any) => {
            const isExpanded = expandedRiwayatGaji === tx.id;
            const kasirName = kasirList[tx.kasir_id || '']?.name || 'Kasir Terhapus';
            const dateStr = new Date(tx.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            return (
              <div key={tx.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shadow-sm">
                 <div 
                   className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                   onClick={() => setExpandedRiwayatGaji(isExpanded ? null : tx.id)}
                 >
                   <div>
                     <p className="text-xs font-black text-gray-800 uppercase tracking-widest">{kasirName}</p>
                     <p className="text-[10px] text-gray-500 font-bold mt-0.5"><i className="fa-regular fa-calendar text-green-500 mr-1"></i> {dateStr}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[11px] font-black text-green-600 tabular-nums">{formatRupiah(tx.nominal)}</p>
                     <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px] text-gray-400 mt-1`}></i>
                   </div>
                 </div>
                 {isExpanded && (
                   <div className="p-4 bg-gray-50 border-t border-gray-100 text-[10px] font-bold text-gray-600 leading-relaxed space-y-1.5">
                     <p className="text-green-700 font-black text-[9px] uppercase tracking-widest mb-2 border-b border-green-200/50 pb-1">Rincian Slip Gaji:</p>
                     {tx.keterangan.replace('[GAJI] ', '').split(', ').map((item: string, idx: number) => {
                       const parts = item.split(': ');
                       if (parts.length < 2) return null;
                       const lbl = parts[0];
                       const val = parts.slice(1).join(': ');
                       return (
                         <div key={idx} className="flex justify-between items-center">
                           <span className="text-gray-500 uppercase text-[8px] font-bold tracking-widest">{lbl}</span>
                           <span className="font-black text-gray-800">{val}</span>
                         </div>
                       )
                     })}
                     <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                        <button onClick={() => shareHistoryData(tx, 'jpg')} className="flex-1 py-2 bg-[#0066FF] text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-1">
                          <i className="fa-solid fa-download"></i> UNDUH JPG
                        </button>
                        <button onClick={() => shareHistoryData(tx, 'pdf')} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-1">
                          <i className="fa-solid fa-file-pdf"></i> UNDUH PDF
                        </button>
                     </div>
                   </div>
                 )}
              </div>
            )
          })}
          {(!(gajiBonusList || []) || (gajiBonusList || []).filter((t: any) => t.jenis === 'Gaji').length === 0) && (
             <div className="text-center py-10 bg-white/50 rounded-3xl border border-white border-dashed">
               <i className="fa-solid fa-box-open text-3xl text-gray-200 mb-2"></i>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Belum ada riwayat gajih</p>
             </div>
          )}
        </div>
      )}

      {gajiTab === 'bonus' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <i className="fa-solid fa-gift"></i> Form Bonus Kasir
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">PILIH KASIR</label>
                <div className="relative">
                  <select
                    value={bonusKasir}
                    onChange={e => setBonusKasir(e.target.value)}
                    className="w-full text-xs p-2.5 pr-8 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-blue-400 appearance-none cursor-pointer"
                  >
                    <option value="">-- Pilih Kasir --</option>
                    {kasirArr.map(([id, k]) => <option key={id} value={id}>{k.name.toUpperCase()}</option>)}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>
                </div>
              </div>
              
              {(() => {
                const kData = kasirList[bonusKasir];
                if (!kData) return null;
                const tglJoin = kData.tanggalJoin;
                if (!tglJoin) {
                  return (
                    <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-2 mt-1">
                      <i className="fa-solid fa-circle-exclamation text-slate-400 text-sm"></i> 
                      <span>Tanggal join kasir belum diatur. Setel di menu <strong>Akun Karyawan</strong> agar pengingat jadwal bonus otomatis aktif.</span>
                    </div>
                  );
                }
                const joinDateObj = new Date(tglJoin);
                const joinDay = joinDateObj.getDate();
                const now = new Date();
                
                // Atur target bonus per 6 bulan
                let targetBonus = new Date(joinDateObj.getFullYear(), joinDateObj.getMonth() + 6, joinDay);
                
                // Terus tambah 6 bulan sampai target jadwalnya adalah masa depan atau belum lewat dari 15 hari yang lalu
                while (targetBonus.getTime() < now.getTime() - (15 * 1000 * 3600 * 24)) {
                   targetBonus.setMonth(targetBonus.getMonth() + 6);
                }

                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const targetDay = new Date(targetBonus.getFullYear(), targetBonus.getMonth(), targetBonus.getDate());
                const selisihHari = Math.floor((targetDay.getTime() - today.getTime()) / (1000 * 3600 * 24));
                
                let statusBonus = "";
                let statusColor = "";
                let icon = "";

                if (selisihHari === 0) {
                  statusBonus = "HARI INI JADWAL BONUS 6 BULANAN!";
                  statusColor = "text-emerald-800 bg-emerald-100 border-emerald-300";
                  icon = "fa-solid fa-party-horn animate-bounce text-emerald-600";
                } else if (selisihHari < 0 && selisihHari >= -15) {
                  statusBonus = `TERLEWAT ${Math.abs(selisihHari)} HARI DARI JADWAL (Tgl ${targetBonus.getDate()} ${targetBonus.toLocaleDateString('id-ID', {month: 'long'})})`;
                  statusColor = "text-rose-800 bg-rose-50 border-rose-200";
                  icon = "fa-solid fa-clock-rotate-left text-rose-500";
                } else if (selisihHari <= 14 && selisihHari > 0) {
                  statusBonus = `MENGHITUNG HARI: ${selisihHari} HARI LAGI (Tgl ${targetBonus.getDate()} ${targetBonus.toLocaleDateString('id-ID', {month: 'long'})})`;
                  statusColor = "text-amber-800 bg-amber-50 border-amber-200";
                  icon = "fa-solid fa-hourglass-half text-amber-500";
                } else {
                  const formatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                  statusBonus = `JADWAL BONUS BERIKUTNYA: ${formatter.format(targetDay)}`;
                  statusColor = "text-blue-800 bg-blue-50 border-blue-200/50";
                  icon = "fa-regular fa-calendar-check text-blue-500";
                }

                return (
                  <div className={`mt-2 p-3 rounded-xl border-2 ${statusColor} text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-sm`}>
                    <i className={`${icon} text-xl shrink-0`}></i>
                    <div className="flex flex-col gap-0.5 leading-tight">
                      <span className="opacity-70 text-[8px]">TGL BERGABUNG: {joinDateObj.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                      <span>{statusBonus}</span>
                    </div>
                  </div>
                );
              })()}
              
              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">TANGGAL BONUS</label>
                <input
                  type="date"
                  value={bonusPeriode}
                  onChange={e => setBonusPeriode(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">NOMINAL BONUS</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bonusNominal}
                    onChange={e => setBonusNominal(formatNum(e.target.value))}
                    className="w-full text-xs py-2.5 pl-8 pr-3 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-blue-400"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-gray-200">
                <input 
                  type="checkbox" 
                  checked={bonusIsPaid} 
                  onChange={e => setBonusIsPaid(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Sudah Dibayarkan Lunas</span>
              </label>
              
              <button
                onClick={handleSimpanBonus}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-cloud-arrow-up text-xs"></i> SIMPAN DATA BONUS
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daftar Riwayat Bonus</p>
              <select
                value={filterBonusKasir}
                onChange={e => setFilterBonusKasir(e.target.value)}
                className="text-[9px] p-1.5 rounded-lg border border-gray-200 outline-none font-bold bg-white text-gray-600 focus:border-blue-400"
              >
                <option value="semua">SEMUA KASIR</option>
                {kasirArr.map(([id, k]) => <option key={id} value={id}>{k.name.toUpperCase()}</option>)}
              </select>
            </div>
            {(gajiBonusList || [])?.filter((t: any) => t.jenis === 'Bonus' && (filterBonusKasir === 'semua' || t.kasir_id === filterBonusKasir)).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((tx: any) => {
              const kasirName = kasirList[tx.kasir_id || '']?.name || 'Kasir Terhapus';
              const dateStr = new Date(tx.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
              const isPaid = tx.keterangan.includes('Sudah Dibayar');
              const targetMatch = tx.keterangan.match(/Nominal Target:\s*Rp\s*([\d\.,]+)/);
              const targetNominal = targetMatch ? targetMatch[1] : formatRupiah(tx.nominal);
              const cleanNominal = targetNominal.replace(/^Rp\s*/i, '');
              const periodeMatch = tx.keterangan.match(/Periode:\s*([^,]+)/);
              const periode = periodeMatch ? periodeMatch[1] : "-";
              
              return (
                <div key={tx.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-3">
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1 flex-wrap">
                       <p className="text-xs font-black text-gray-800 uppercase tracking-widest">{kasirName}</p>
                       <span className={cn("px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest", isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                         {isPaid ? "LUNAS" : "BELUM DIBAYAR"}
                       </span>
                     </div>
                     <p className="text-[10px] text-gray-500 font-bold truncate"><i className="fa-regular fa-clock text-blue-500 mr-1"></i> Periode {periode}</p>
                     <p className="text-[9px] text-gray-400 font-bold mt-0.5">Tgl Input: {dateStr}</p>
                   </div>
                   <div className="text-right flex flex-col items-end shrink-0">
                     <p className="text-xs font-black text-blue-600 tabular-nums mb-2">Rp {cleanNominal}</p>
                     <div className="flex items-center gap-1.5 flex-wrap justify-end">
                       {!isPaid && (
                         <button
                           onClick={() => handleTandaiDibayar(tx)}
                           className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider active:scale-95 hover:bg-emerald-100 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                           title="Tandai Sudah Dibayar"
                         >
                           <i className="fa-solid fa-check text-[9px]"></i> Lunas
                         </button>
                       )}
                       <button
                         onClick={() => handleOpenEditBonus(tx)}
                         className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider active:scale-95 hover:bg-blue-100 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                         title="Edit Data Bonus"
                       >
                         <i className="fa-solid fa-pen-to-square text-[9px]"></i> Edit
                       </button>
                       <button
                         onClick={() => handleDeleteBonus(tx)}
                         className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider active:scale-95 hover:bg-rose-100 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                         title="Hapus Riwayat Bonus"
                       >
                         <i className="fa-solid fa-trash-can text-[9px]"></i> Hapus
                       </button>
                     </div>
                   </div>
                </div>
              )
            })}
            {(!(gajiBonusList || []) || (gajiBonusList || []).filter((t: any) => t.jenis === 'Bonus').length === 0) && (
               <div className="text-center py-10 bg-white/50 rounded-3xl border border-white border-dashed">
                 <i className="fa-solid fa-gift text-3xl text-gray-200 mb-2"></i>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Belum ada riwayat bonus</p>
               </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL EDIT RIWAYAT BONUS */}
      {editingBonus && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setEditingBonus(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm shadow-xs">
                  <i className="fa-solid fa-pen-to-square"></i>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm leading-tight">Edit Riwayat Bonus</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">Perbarui rincian bonus kasir</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBonus(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 text-left">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Pilih Kasir</label>
                <div className="relative">
                  <select
                    value={editingBonus.kasir_id}
                    onChange={e => setEditingBonus(prev => prev ? { ...prev, kasir_id: e.target.value } : null)}
                    className="w-full text-xs p-2.5 pr-8 rounded-xl border border-slate-200 font-bold bg-white outline-none focus:border-blue-400 appearance-none cursor-pointer"
                  >
                    {kasirArr.map(([id, k]) => <option key={id} value={id}>{k.name.toUpperCase()}</option>)}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Tanggal / Periode Bonus</label>
                <input
                  type="date"
                  value={editingBonus.periode}
                  onChange={e => setEditingBonus(prev => prev ? { ...prev, periode: e.target.value } : null)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-bold bg-white outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Nominal Bonus</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingBonus.nominal}
                    onChange={e => setEditingBonus(prev => prev ? { ...prev, nominal: formatNum(e.target.value) } : null)}
                    className="w-full text-xs py-2.5 pl-9 pr-3 rounded-xl border border-slate-200 font-bold bg-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">Status Pembayaran</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBonus(prev => prev ? { ...prev, isPaid: true } : null)}
                    className={cn(
                      "flex-1 py-2 px-2 rounded-xl text-center font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer border",
                      editingBonus.isPaid 
                        ? "bg-green-600 text-white border-green-600 shadow-sm" 
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    )}
                  >
                    <i className="fa-solid fa-check mr-1"></i> Lunas
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBonus(prev => prev ? { ...prev, isPaid: false } : null)}
                    className={cn(
                      "flex-1 py-2 px-2 rounded-xl text-center font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer border",
                      !editingBonus.isPaid 
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm" 
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    )}
                  >
                    <i className="fa-solid fa-clock mr-1"></i> Belum Bayar
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isSavingBonus}
                onClick={() => setEditingBonus(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingBonus}
                onClick={handleSaveEditBonus}
                className="px-4 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingBonus ? (
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                ) : (
                  <i className="fa-solid fa-check text-xs"></i>
                )}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REVIEW STRUK GAJI SEBELUM PRINT */}
      {reviewReceiptText && (
        <div 
          className="fixed inset-0 z-[250] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 pb-24 sm:pb-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setReviewReceiptText(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[82vh] mb-6 sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs shadow-xs">
                  <i className="fa-solid fa-receipt"></i>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-xs uppercase tracking-wide leading-tight">Review Struk Gaji</h3>
                  <p className="text-[9px] text-slate-400 font-bold">Thermal POS 58mm (Rata Kolom 32)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewReceiptText(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
              {/* Status Printer, Tab Switch & Salin ke WA */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${localStorage.getItem('bluetooth_printer_mac') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></div>
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">
                    {localStorage.getItem('bluetooth_printer_mac') ? 'Printer Siap' : 'Printer Offline'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-[8px] font-bold select-none">
                    <button
                      type="button"
                      onClick={() => setReviewViewMode('visual')}
                      className={cn("px-2 py-0.5 rounded-md transition-all cursor-pointer", reviewViewMode === 'visual' ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-500 hover:text-slate-800")}
                    >
                      Visual
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewViewMode('raw')}
                      className={cn("px-2 py-0.5 rounded-md transition-all cursor-pointer", reviewViewMode === 'raw' ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-500 hover:text-slate-800")}
                    >
                      Raw 32
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyWAFromModal}
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                    title="Salin teks struk untuk dikirim ke WhatsApp"
                  >
                    <i className="fa-brands fa-whatsapp text-emerald-600 text-xs"></i>
                    <span>Salin WA</span>
                  </button>
                </div>
              </div>

              {/* Thermal Paper Preview Container */}
              <div className="bg-slate-100/80 p-2.5 rounded-2xl border border-slate-200 flex justify-center">
                {reviewViewMode === 'visual' ? (
                  <div className="w-full max-w-[285px] bg-white rounded-xl shadow-md border border-slate-200/90 p-3.5 font-mono select-all text-left">
                    <div className="space-y-0.5">
                      {reviewReceiptText.split('\n').map((line, idx) => {
                        const trimmed = line.trim();
                        if (!trimmed) {
                          return <div key={idx} className="h-1.5" />;
                        }

                        // Separator lines
                        if (/^={4,}$/.test(trimmed)) {
                          return <div key={idx} className="border-b-2 border-slate-800 my-1" />;
                        }
                        if (/^-{4,}$/.test(trimmed)) {
                          return <div key={idx} className="border-b border-dashed border-slate-400 my-1" />;
                        }

                        // Centered items
                        const isSignature = trimmed.startsWith('(') && trimmed.endsWith(')');
                        const isSectionHeader = trimmed === 'RINCIAN KEHADIRAN' || trimmed === 'RINCIAN PENGGAJIAN' || trimmed === 'SLIP GAJI KARYAWAN' || trimmed === 'Tanda Tangan / Penerima' || trimmed === (storeName || 'ALFAZA CELL').toUpperCase();
                        const isCenter = isSignature || isSectionHeader || (line.startsWith('   ') && !line.includes('Rp ') && !line.trimEnd().endsWith('hari'));

                        if (isCenter) {
                          const isStoreOrTitle = trimmed === 'SLIP GAJI KARYAWAN' || trimmed === (storeName || 'ALFAZA CELL').toUpperCase();
                          return (
                            <div 
                              key={idx} 
                              className={cn(
                                "text-center uppercase tracking-wide",
                                isStoreOrTitle ? "font-black text-slate-900 text-[11px] leading-tight" : 
                                isSectionHeader ? "font-black text-slate-800 text-[10px] my-0.5" :
                                isSignature ? "font-black text-slate-900 text-[10px] mt-2.5" : "font-semibold text-slate-500 text-[9px]"
                              )}
                            >
                              {trimmed}
                            </div>
                          );
                        }

                        // Two-column Left - Right split
                        const parts = trimmed.split(/\s{2,}/);
                        if (parts.length >= 2) {
                          const left = parts[0].trim();
                          const right = parts.slice(1).join(' ').trim();
                          const isTotal = left.toUpperCase().includes('TOTAL');

                          return (
                            <div 
                              key={idx} 
                              className={cn(
                                "flex justify-between items-center text-[10.5px] leading-tight py-0.5",
                                isTotal ? "font-black text-slate-900 text-[11.5px] border-y border-slate-900 my-1 py-1" : "text-slate-800 font-semibold"
                              )}
                            >
                              <span className={cn("text-left shrink-0", isTotal ? "text-slate-900 font-black" : "text-slate-600 font-bold")}>
                                {left}
                              </span>
                              <span className={cn("text-right tabular-nums", isTotal ? "text-slate-900 font-black text-[12px]" : "font-black text-slate-900")}>
                                {right}
                              </span>
                            </div>
                          );
                        }

                        // Single line (e.g. Catatan)
                        return (
                          <div key={idx} className="text-left text-[9.5px] text-slate-700 font-medium leading-tight py-0.5">
                            {trimmed}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-white p-3 rounded-xl border border-dashed border-slate-300 shadow-inner overflow-x-auto text-left">
                    <pre className="font-mono text-[10px] leading-tight text-slate-800 whitespace-pre select-all">
                      {reviewReceiptText}
                    </pre>
                  </div>
                )}
              </div>

              {/* Checkbox Auto-Print Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={autoPrintSetting}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoPrintSetting(checked);
                    localStorage.setItem('auto_print_gaji', String(checked));
                  }}
                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
                <div className="text-left">
                  <span className="text-[9.5px] font-black text-slate-800 uppercase tracking-wide block leading-none">
                    Cetak Otomatis Selanjutnya
                  </span>
                  <span className="text-[8px] text-slate-400 font-medium block mt-0.5">
                    Langsung cetak ke printer bluetooth tanpa buka review struk
                  </span>
                </div>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setReviewReceiptText(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  executePrintReceipt(reviewReceiptText);
                  setReviewReceiptText(null);
                }}
                className="px-4 py-2 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-print text-xs"></i>
                <span>Cetak Struk Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const PengaturanPanel: React.FC<{ 
  transactions: Transaction[], 
  absensiList?: any[],
  storeName?: string,
  showToast: (m: string) => void,
  onConfirm: (t: string, m: string, c: () => void) => void,
  activeStoreId: string,
  onSaveCashierSelf?: (username: string, updatedAccount: { name: string, pin: string, [key: string]: any }) => Promise<void>,
  kasirList?: Record<string, KasirAccount>,
  userId?: string
}> = ({ transactions, absensiList, storeName, showToast, onConfirm, activeStoreId, onSaveCashierSelf, kasirList, userId }) => {
  if (activeStoreId === 'all') {
    return (
      <div className="p-6 text-center bg-amber-50 border border-amber-100 rounded-2xl">
        <i className="fa-solid fa-store-slash text-amber-500 text-3xl mb-3"></i>
        <p className="text-xs font-black text-amber-800 uppercase tracking-widest">PILIH TOKO TERLEBIH DAHULU</p>
        <p className="text-[10px] text-amber-600/80 font-bold uppercase mt-1">Silakan pilih salah satu toko untuk melihat pengaturan.</p>
      </div>
    );
  }

  const [resetStep, setResetStep] = useState(0); // 0: init, 1: confirm, 2: processing
  const ALL_TRANSFER_METHODS = ['BANK', 'DANA', 'FLIP', 'ORDER KUOTA'];
  const [activeMethods, setActiveMethods] = useState<string[]>([]);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isFinancialOpen, setIsFinancialOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  // Financial State
  const defaultFinancial: Record<string, string> = { startDate: '', rentPeriod: 'bulanan', rentAmount: '', rentDueDate: '', electricityBill: '', wifiBill: '' }
  const [financialSettings, setFinancialSettings] = useState<Record<string, string>>(defaultFinancial)

  useEffect(() => {
    try {
      const key = activeStoreId && activeStoreId !== 'all' ? `alphaPro_${activeStoreId}_financial` : 'alphaPro_financial'
      const saved = localStorage.getItem(key)
      if (saved) {
        setFinancialSettings({ ...defaultFinancial, ...JSON.parse(saved) })
      } else {
        setFinancialSettings(defaultFinancial)
      }
    } catch (e) {}
  }, [activeStoreId])

  const handleSaveFinancial = (key: string, value: string) => {
    const newSettings = { ...financialSettings, [key]: value }
    setFinancialSettings(newSettings)
    const storeKey = activeStoreId && activeStoreId !== 'all' ? `alphaPro_${activeStoreId}_financial` : 'alphaPro_financial'
    localStorage.setItem(storeKey, JSON.stringify(newSettings))
  }

  // Security State
  const storageKeyPin = activeStoreId && activeStoreId !== 'all' ? `alphaPro_${activeStoreId}_isPinEnabled` : 'alphaPro_isPinEnabled'
  const [isPinEnabled, setIsPinEnabled] = useState(localStorage.getItem(storageKeyPin) !== 'false')
  useEffect(() => { setIsPinEnabled(localStorage.getItem(storageKeyPin) !== 'false') }, [storageKeyPin])

  const togglePin = () => {
    const newValue = !isPinEnabled
    setIsPinEnabled(newValue)
    localStorage.setItem(storageKeyPin, newValue.toString())
  }

  const [ownerPinOld, setOwnerPinOld] = useState('')
  const [ownerPinNew, setOwnerPinNew] = useState('')
  const [ownerPinConfirm, setOwnerPinConfirm] = useState('')
  const [showOwnerPin, setShowOwnerPin] = useState(false)

  const handleSaveOwnerPin = async () => {
    if (!ownerPinNew || ownerPinNew.length < 4) return showToast('PIN baru minimal 4 digit!');
    if (ownerPinNew !== ownerPinConfirm) return showToast('Konfirmasi PIN tidak cocok!');
    
    // Verifikasi PIN lama: coba dari kasirList, fallback ke localStorage
    const ownerAcc = kasirList?.['owner'];
    const localPin = userId ? localStorage.getItem(`alphaPro_${userId}_ownerPin`) || '0000' : '0000'
    const correctOldPin = (ownerAcc?.pin) || localPin
    if (correctOldPin && correctOldPin !== ownerPinOld) return showToast('PIN lama tidak sesuai!');
    
    if (onSaveCashierSelf) {
      await onSaveCashierSelf('owner', { name: 'Owner', pin: ownerPinNew, role: 'owner' })
      setOwnerPinOld(''); setOwnerPinNew(''); setOwnerPinConfirm('');
      showToast('PIN Owner berhasil diubah!');
    } else {
      showToast('Gagal: Fungsi onSaveCashierSelf tidak tersedia');
    }
  }

  // Dashboard Filter State
  const storageKeyFilter = activeStoreId && activeStoreId !== 'all' ? `alphaPro_${activeStoreId}_showKasirFilter` : 'alphaPro_showKasirFilter'
  const [showKasirFilter, setShowKasirFilter] = useState(localStorage.getItem(storageKeyFilter) !== 'false')
  useEffect(() => { setShowKasirFilter(localStorage.getItem(storageKeyFilter) !== 'false') }, [storageKeyFilter])

  const toggleFilterKasir = () => {
    const newValue = !showKasirFilter
    setShowKasirFilter(newValue)
    localStorage.setItem(storageKeyFilter, newValue.toString())
    window.dispatchEvent(new Event('storage'))
  }
  
  const handleExportCSV = () => {
    const txs = transactions || [];
    if (txs.length === 0) return showToast("Belum ada data transaksi");

    const headers = ["ID Transaksi", "Tanggal", "Waktu", "Kasir", "Kategori", "Keterangan", "Nominal (Rp)", "Admin/Fee (Rp)", "Tipe"];
    const rows = txs.map((t: any) => {
      const date = new Date(t.timestamp);
      const tanggal = date.toLocaleDateString('id-ID');
      const waktu = date.toLocaleTimeString('id-ID');

      return [
        t.id,
        tanggal,
        waktu,
        t.kasir_id || '-',
        t.kategori,
        (t.keterangan || '').replace(/,/g, ' '),
        t.nominal,
        t.adminFee || 0,
        t.jenis || '-'
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ALPHA_TRANSAKSI_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`alphaPro_${activeStoreId}_transferMethods`);
      if (saved) {
        setActiveMethods(JSON.parse(saved));
      } else {
        setActiveMethods(ALL_TRANSFER_METHODS);
      }
    } catch (e) {
      setActiveMethods(ALL_TRANSFER_METHODS);
    }
  }, [activeStoreId]);

  const toggleMethod = (method: string) => {
    let newMethods = [...activeMethods];
    if (newMethods.includes(method)) {
      newMethods = newMethods.filter(m => m !== method);
    } else {
      newMethods.push(method);
    }
    setActiveMethods(newMethods);
    localStorage.setItem(`alphaPro_${activeStoreId}_transferMethods`, JSON.stringify(newMethods));
    showToast(`Pengaturan transfer diperbarui`);
    window.dispatchEvent(new Event('alphaSyncUpdate'));
  };

  const handleBackup = async () => {
    try {
      const backupData = {
        store: storeName || "ALFAZA CELL",
        timestamp: getLocalISOString(),
        data: {
          transactions,
          absensi: absensiList || [],
          catatanIzin: JSON.parse(localStorage.getItem(`alphaPro_${activeStoreId}_catatanIzin`) || '[]')
        }
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const filename = `ALPHA_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;

      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        
        const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
        
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        });
        
        await Share.share({
          title: "Backup Data ALPHA",
          url: result.uri
        });
      } else {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      showToast("Gagal backup: " + e.message);
    }
  };

  const handleReset = async () => {
    onConfirm("RESET SISTEM", "Apakah Anda yakin? Seluruh data transaksi dan absensi akan dihapus permanen dan tidak bisa dikembalikan!", async () => {
      setResetStep(2);
      try {
        let txQuery = supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (activeStoreId !== 'all') {
          txQuery = txQuery.eq('store_id', activeStoreId);
        }
        const { error: txError } = await txQuery;
        
        let absQuery = supabase.from('absensi').delete().neq('id', 0);
        if (activeStoreId !== 'all') {
          absQuery = absQuery.eq('store_id', activeStoreId);
        }
        const { error: absError } = await absQuery;
        
        localStorage.removeItem(`alphaPro_${activeStoreId}_catatanIzin`);
        
        if (txError || absError) throw new Error("Beberapa data gagal dihapus");
        
        showToast("Sistem berhasil direset!");
        setTimeout(() => window.location.reload(), 2000); 
      } catch (e: any) {
        showToast("Reset gagal: " + e.message);
        setResetStep(0);
      }
    });
  };

  return (
    <div className="space-y-4 pb-10">

      {/* Beban & Finansial Toko */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsFinancialOpen(!isFinancialOpen)}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors outline-none"
        >
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-wallet text-orange-500"></i>
            <h3 className="font-black text-gray-800 text-[11px] tracking-widest uppercase">BEBAN & FINANSIAL TOKO</h3>
          </div>
          <i className={cn("fa-solid text-[10px] text-slate-400 transition-transform duration-300", isFinancialOpen ? "fa-chevron-up" : "fa-chevron-down")}></i>
        </button>

        {isFinancialOpen && (
          <div className="p-4 border-t border-gray-100 bg-slate-50/50">
            <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-3">Sewa toko, listrik, WiFi (Otomatis Laba Bersih)</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1 mb-1 block">Tgl Mulai Sewa</label>
                <input type="date" value={financialSettings.startDate} onChange={e => handleSaveFinancial('startDate', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1 mb-1 block">Periode Sewa</label>
                <select value={financialSettings.rentPeriod} onChange={e => handleSaveFinancial('rentPeriod', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all">
                  <option value="bulanan">Bulanan</option>
                  <option value="tahunan">Tahunan</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1 mb-1 block">Nominal Sewa</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rp</span>
                <input type="text" value={financialSettings.rentAmount} onChange={e => handleSaveFinancial('rentAmount', e.target.value.replace(/\D/g, ''))} className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1 mb-1 block">Listrik /bln</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rp</span>
                  <input type="text" value={financialSettings.electricityBill} onChange={e => handleSaveFinancial('electricityBill', e.target.value.replace(/\D/g, ''))} className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1 mb-1 block">WiFi /bln</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rp</span>
                  <input type="text" value={financialSettings.wifiBill} onChange={e => handleSaveFinancial('wifiBill', e.target.value.replace(/\D/g, ''))} className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="0" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keamanan & Akses */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsSecurityOpen(!isSecurityOpen)}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors outline-none"
        >
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-emerald-500"></i>
            <h3 className="font-black text-gray-800 text-[11px] tracking-widest uppercase">KEAMANAN & AKSES</h3>
          </div>
          <i className={cn("fa-solid text-[10px] text-slate-400 transition-transform duration-300", isSecurityOpen ? "fa-chevron-up" : "fa-chevron-down")}></i>
        </button>

        {isSecurityOpen && (
          <div className="p-4 border-t border-gray-100 bg-slate-50/50">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-gray-800 text-xs tracking-widest uppercase">PIN Login Kasir</h4>
                  <p className="text-[9px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Gunakan PIN saat kasir login</p>
                </div>
                <button 
                  onClick={togglePin}
                  className={cn("w-12 h-6 rounded-full transition-colors relative", isPinEnabled ? "bg-emerald-500" : "bg-gray-200")}
                >
                  <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm", isPinEnabled ? "translate-x-6.5 left-0" : "translate-x-0.5 left-0")} style={{ transform: isPinEnabled ? 'translateX(26px)' : 'translateX(2px)' }}></div>
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <h4 className="font-black text-gray-800 text-xs tracking-widest uppercase mb-3">Ubah PIN Owner</h4>
              <div className="space-y-3">
                <div className="relative">
                  <input type={showOwnerPin ? 'text' : 'password'} value={ownerPinOld} onChange={e => setOwnerPinOld(e.target.value.replace(/\D/g, ''))} placeholder="PIN Lama" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all tracking-widest text-center" maxLength={6} />
                  <button onClick={() => setShowOwnerPin(!showOwnerPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><i className={showOwnerPin ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i></button>
                </div>
                <input type={showOwnerPin ? 'text' : 'password'} value={ownerPinNew} onChange={e => setOwnerPinNew(e.target.value.replace(/\D/g, ''))} placeholder="PIN Baru (Min 4 digit)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all tracking-widest text-center" maxLength={6} />
                <input type={showOwnerPin ? 'text' : 'password'} value={ownerPinConfirm} onChange={e => setOwnerPinConfirm(e.target.value.replace(/\D/g, ''))} placeholder="Konfirmasi PIN Baru" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all tracking-widest text-center" maxLength={6} />
                <button onClick={handleSaveOwnerPin} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-blue-500/20">Simpan PIN Baru</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pantau Dashboard */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsDashboardOpen(!isDashboardOpen)}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors outline-none"
        >
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-eye text-indigo-500"></i>
            <h3 className="font-black text-gray-800 text-[11px] tracking-widest uppercase">PANTAU DASHBOARD</h3>
          </div>
          <i className={cn("fa-solid text-[10px] text-slate-400 transition-transform duration-300", isDashboardOpen ? "fa-chevron-up" : "fa-chevron-down")}></i>
        </button>

        {isDashboardOpen && (
          <div className="p-4 border-t border-gray-100 bg-slate-50/50">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="font-black text-gray-800 text-xs tracking-widest uppercase">Filter Kasir di Beranda</h4>
                <p className="text-[9px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Tampilkan tombol filter kasir</p>
              </div>
              <button 
                onClick={toggleFilterKasir}
                className={cn("w-12 h-6 rounded-full transition-colors relative", showKasirFilter ? "bg-indigo-500" : "bg-gray-200")}
              >
                <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm")} style={{ transform: showKasirFilter ? 'translateX(26px)' : 'translateX(2px)' }}></div>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Pengaturan Transfer */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsTransferOpen(!isTransferOpen)}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors outline-none"
        >
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-money-bill-transfer text-blue-500"></i>
            <h3 className="font-black text-gray-800 text-[11px] tracking-widest uppercase">KATEGORI TRANSFER</h3>
          </div>
          <i className={cn("fa-solid text-[10px] text-slate-400 transition-transform duration-300", isTransferOpen ? "fa-chevron-up" : "fa-chevron-down")}></i>
        </button>

        {isTransferOpen && (
          <div className="p-4 border-t border-gray-100 bg-slate-50/50">
            <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-3">Pilih kategori layanan digital yang muncul di kasir</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_TRANSFER_METHODS.map(method => {
                const isActive = activeMethods.includes(method);
                return (
                  <label key={method} className={cn("flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all", isActive ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200 opacity-60 hover:opacity-100")}>
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isActive ? "text-blue-700" : "text-gray-500")}>{method}</span>
                    <input 
                      type="checkbox"
                      checked={isActive}
                      onChange={() => toggleMethod(method)}
                      className="w-3.5 h-3.5 accent-blue-600 rounded-sm cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Backup & Reset (Minimalist) */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsBackupOpen(!isBackupOpen)}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors outline-none"
        >
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-cloud-arrow-down text-slate-600"></i>
            <h3 className="font-black text-gray-800 text-[11px] tracking-widest uppercase">SISTEM & BACKUP</h3>
          </div>
          <i className={cn("fa-solid text-[10px] text-slate-400 transition-transform duration-300", isBackupOpen ? "fa-chevron-up" : "fa-chevron-down")}></i>
        </button>

        {isBackupOpen && (
          <div className="p-4 border-t border-gray-100 bg-slate-50/50 grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center">
              <h3 className="font-black text-gray-800 text-[10px] tracking-widest uppercase mb-1">BACKUP DATA</h3>
              <p className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mb-3">Ekspor ke JSON</p>
              <button 
                onClick={handleBackup}
                className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5 hover:bg-slate-200"
              >
                <i className="fa-solid fa-file-export"></i> Unduh File
              </button>
            </div>

            <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center">
              <h3 className="font-black text-red-600 text-[10px] tracking-widest uppercase mb-1">RESET SISTEM</h3>
              <p className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mb-3">Hapus Seluruh Data</p>
              <button 
                onClick={handleReset}
                disabled={resetStep === 2}
                className={cn(
                  "w-full py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5",
                  resetStep === 2 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-red-50 text-red-600 hover:bg-red-100"
                )}
              >
                {resetStep === 2 ? (
                  <><i className="fa-solid fa-circle-notch fa-spin"></i> Proses...</>
                ) : (
                  <><i className="fa-solid fa-trash-can"></i> Reset</>
                )}
              </button>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center col-span-2">
              <h3 className="font-black text-emerald-600 text-[10px] tracking-widest uppercase mb-1">EKSPOR CSV</h3>
              <p className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mb-3">Ekspor ke CSV/Excel</p>
              <button 
                onClick={handleExportCSV}
                className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-file-excel"></i> Unduh CSV
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

// Extra panels removed to resolve duplicate declaration error

interface Catatan {
  id: string;
  judul: string;
  isi: string;
  kategori: string;
  tanggal: string;
  selesai: boolean;
}

const CatatanPanel: React.FC<{
  showToast: (m: string) => void,
  onConfirm: (t: string, m: string, c: () => void) => void
}> = ({ showToast, onConfirm }) => {
  const STORAGE_KEY = 'alphaPro_global_catatanOwner';
  const [catatanList, setCatatanList] = useState<Catatan[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [kategori, setKategori] = useState('Penting');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const loadAllNotes = useCallback(() => {
    try {
      const map = new Map<string, Catatan>();
      const addNote = (item: any) => {
        if (!item || typeof item !== 'object' || !item.judul) return;
        const uKey = item.id || `${item.judul}-${item.tanggal}`;
        if (!map.has(uKey)) {
          map.set(uKey, {
            id: item.id || Date.now().toString() + Math.random(),
            judul: item.judul || '',
            isi: item.isi || '',
            kategori: item.kategori || 'Penting',
            tanggal: item.tanggal || new Date().toISOString(),
            selesai: !!item.selesai
          });
        }
      };

      // 1. Baca dari global key
      const globalRaw = localStorage.getItem(STORAGE_KEY);
      if (globalRaw) {
        try {
          const parsed = JSON.parse(globalRaw);
          if (Array.isArray(parsed)) parsed.forEach(addNote);
        } catch(e) {}
      }

      // 2. Scan semua kunci toko lokal
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || '';
        if (k.includes('catatan_owner') || k.includes('catatanOwner')) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) parsed.forEach(addNote);
            }
          } catch(e) {}
        }
      }

      const list = Array.from(map.values());
      list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      setCatatanList(list);
    } catch(e) {}
  }, []);

  useEffect(() => {
    loadAllNotes();
    const handleUpdate = () => loadAllNotes();
    window.addEventListener('alphaSyncUpdate', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('alphaSyncUpdate', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadAllNotes]);

  const saveToStorage = (data: Catatan[]) => {
    setCatatanList(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    try {
      const activeSid = localStorage.getItem('alphaPro_activeStoreId');
      if (activeSid && activeSid !== 'all') {
        localStorage.setItem(`alphaPro_${activeSid}_catatan_owner`, JSON.stringify(data));
        if (data.length > 0) {
          const mapped = data.map(c => ({
            id: c.id,
            store_id: activeSid,
            judul: c.judul,
            isi: c.isi,
            kategori: c.kategori || 'Penting',
            tanggal: c.tanggal,
            selesai: !!c.selesai,
            updated_at: new Date().toISOString()
          }));
          supabase.from('owner_notes').upsert(mapped).then();
        }
      }
    } catch(e) {}
    window.dispatchEvent(new Event('alphaSyncUpdate'));
  };

  const handleSimpan = () => {
    if (!judul.trim() || !isi.trim()) {
      return showToast('Judul dan isi catatan harus diisi!');
    }
    
    if (editId) {
      const updated = catatanList.map(c => 
        c.id === editId 
          ? { ...c, judul: judul.trim(), isi: isi.trim(), kategori }
          : c
      );
      saveToStorage(updated);
      showToast('Catatan berhasil diperbarui');
    } else {
      const baru: Catatan = {
        id: Date.now().toString(),
        judul: judul.trim(),
        isi: isi.trim(),
        kategori,
        tanggal: new Date().toISOString(),
        selesai: false
      };
      saveToStorage([baru, ...catatanList]);
      showToast('Catatan berhasil disimpan');
    }
    
    setJudul('');
    setIsi('');
    setEditId(null);
    setFormOpen(false);
  };

  const handleEdit = (c: Catatan) => {
    setJudul(c.judul);
    setIsi(c.isi);
    setKategori(c.kategori);
    setEditId(c.id);
    setFormOpen(true);
  };

  const hapusCatatan = (id: string) => {
    onConfirm('HAPUS CATATAN', 'Apakah Anda yakin ingin menghapus catatan ini?', () => {
      const updated = catatanList.filter(c => c.id !== id);
      saveToStorage(updated);
      showToast('Catatan dihapus');
    });
  };

  const toggleSelesai = (id: string) => {
    const updated = catatanList.map(c => c.id === id ? { ...c, selesai: !c.selesai } : c);
    saveToStorage(updated);
  };

  const copyCatatan = async (c: Catatan) => {
    const text = `*${c.judul}*\nKategori: ${c.kategori}\nTanggal: ${new Date(c.tanggal).toLocaleDateString('id-ID')}\n\n${c.isi}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showToast('Teks disalin ke clipboard');
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        showToast('Teks disalin ke clipboard');
      }
    } catch(err) {
      showToast('Gagal menyalin teks');
    }
  };

  const getCatIcon = (kat: string) => {
    if (kat === 'Belanja') return 'fa-cart-shopping text-blue-500 bg-blue-100';
    if (kat === 'Ide') return 'fa-lightbulb text-amber-500 bg-amber-100';
    return 'fa-circle-exclamation text-rose-500 bg-rose-100';
  };

  return (
    <div className="space-y-4 pb-10">
      {!formOpen ? (
        <>
          <button
            onClick={() => {
              setJudul('');
              setIsi('');
              setKategori('Penting');
              setEditId(null);
              setFormOpen(true);
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-orange-200/50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-plus"></i> Buat Catatan Baru
          </button>
          
          {catatanList.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 border border-gray-100 rounded-3xl mt-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-clipboard-list text-2xl text-gray-400"></i>
              </div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Belum Ada Catatan</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1">Catatan Anda akan tampil di sini.</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {catatanList.map(c => (
                <div key={c.id} className={cn("bg-white border rounded-2xl p-4 shadow-sm transition-all", c.selesai ? "border-gray-200 bg-gray-50/50" : "border-orange-100")}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn("w-10 h-10 shrink-0 rounded-xl flex items-center justify-center", getCatIcon(c.kategori), c.selesai && "opacity-50 grayscale")}>
                        <i className={`fa-solid ${getCatIcon(c.kategori).split(' ')[0]} text-lg`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", c.selesai ? "bg-gray-200 text-gray-500" : "bg-orange-100 text-orange-700")}>
                            {c.kategori}
                          </span>
                          <span className="text-[8px] font-bold text-gray-400">{new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <h4 className={cn("font-black text-sm text-gray-800 truncate", c.selesai && "line-through text-gray-400")}>{c.judul}</h4>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => toggleSelesai(c.id)} className={cn("w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-all", c.selesai ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500")}>
                        <i className="fa-solid fa-check"></i>
                      </button>
                      <button onClick={() => copyCatatan(c)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-500 active:scale-90 transition-all">
                        <i className="fa-regular fa-copy"></i>
                      </button>
                      <button onClick={() => handleEdit(c)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-500 active:scale-90 transition-all">
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button onClick={() => hapusCatatan(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-500 active:scale-90 transition-all">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    className={cn(
                      "mt-3 pt-3 border-t text-xs font-bold leading-relaxed cursor-pointer transition-all",
                      c.selesai ? "border-gray-200 text-gray-400 line-through decoration-gray-300" : "border-orange-50 text-gray-600",
                      expandedId === c.id ? "whitespace-pre-wrap" : "truncate"
                    )}
                    title="Klik untuk melihat catatan lengkap"
                  >
                    {c.isi}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white border border-orange-100 rounded-[2rem] p-5 shadow-sm animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-orange-600 text-[13px] tracking-widest uppercase">{editId ? 'EDIT CATATAN' : 'CATATAN BARU'}</h3>
            <button onClick={() => { setFormOpen(false); setEditId(null); setJudul(''); setIsi(''); setKategori('Penting'); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">JUDUL CATATAN</label>
              <input
                type="text"
                placeholder="Cth: Belanja Stok XL"
                value={judul}
                onChange={e => setJudul(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-gray-200 outline-none font-bold bg-gray-50 focus:border-orange-400 focus:bg-white transition-colors"
              />
            </div>
            
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">KATEGORI</label>
              <div className="grid grid-cols-3 gap-2">
                {['Penting', 'Belanja', 'Ide'].map(kat => (
                  <button
                    key={kat}
                    onClick={() => setKategori(kat)}
                    className={cn(
                      "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      kategori === kat 
                        ? "bg-orange-50 border-orange-400 text-orange-600 shadow-sm" 
                        : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                    )}
                  >
                    {kat}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">ISI CATATAN</label>
              <textarea
                placeholder="Ketik rincian di sini..."
                value={isi}
                onChange={e => setIsi(e.target.value)}
                rows={5}
                className="w-full text-xs p-3 rounded-xl border border-gray-200 outline-none font-bold bg-gray-50 resize-none focus:border-orange-400 focus:bg-white transition-colors"
              ></textarea>
            </div>
            
            <button
              onClick={handleSimpan}
              className="w-full bg-green-600 text-white py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-green-200 active:scale-95 transition-all mt-2"
            >
              SIMPAN CATATAN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export interface OwnerNotificationItem {
  id: string
  title: string
  message: string
  date: string
  type: 'bonus' | 'briefing' | 'audit' | 'anomaly' | 'system'
  isRead: boolean
  actionView?: string
  actionLabel?: string
}

const NotificationLogPanel: React.FC<{
  activeStoreId: string | 'all'
  showToast?: (msg: string) => void
  onConfirm?: (title: string, msg: string, onOk: () => void) => void
  bonusKasirList?: string[]
  ownerLateKasirs?: { date: string, name: string, lateMins: number, shift: string, time: string, alasan_telat?: string }[]
}> = ({ activeStoreId, showToast, onConfirm, bonusKasirList = [], ownerLateKasirs = [] }) => {
  const [filterType, setFilterType] = useState<string>('all')
  const [notifList, setNotifList] = useState<OwnerNotificationItem[]>([])

  const syncToCloud = (items: OwnerNotificationItem[] | null) => {
    const storeKey = activeStoreId || 'all'
    if (storeKey !== 'all') {
      if (items === null || items.length === 0) {
        supabase.from('owner_notifications').delete().eq('store_id', storeKey).then();
      } else {
        const sqlItems = items.map(n => ({
          id: n.id,
          store_id: storeKey,
          title: n.title,
          message: n.message,
          date: n.date,
          type: n.type,
          is_read: n.isRead,
          action_view: n.actionView || null,
          action_label: n.actionLabel || null
        }));
        supabase.from('owner_notifications').upsert(sqlItems).then();
      }
    }
  }

  useEffect(() => {
    const storeKey = activeStoreId || 'all'
    const raw = localStorage.getItem(`alphaPro_${storeKey}_notification_history`)
    let items: OwnerNotificationItem[] = []
    if (raw) {
      try { items = JSON.parse(raw) } catch(e) {}
    }

    // AUTO-PRUNING: Batasi maksimal 100 notifikasi terbaru agar tidak menyebabkan lag
    if (items.length > 100) {
      items = items.slice(0, 100);
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const nowISO = new Date().toISOString()
    let hasChanges = false

    // Bersihkan notifikasi briefing otomatis agar tidak muncul lagi
    if (items.some(i => i.type === 'briefing' || i.id.startsWith('briefing_'))) {
      items = items.filter(i => i.type !== 'briefing' && !i.id.startsWith('briefing_'))
      hasChanges = true
    }

    // 2. Bonus 6 Bulan Kasir
    if (bonusKasirList.length > 0) {
      bonusKasirList.forEach(name => {
        const bonusId = `bonus_${name}_6m_${todayStr.substring(0,7)}`
        if (!items.some(i => i.id === bonusId)) {
          items.unshift({
            id: bonusId,
            title: `🎉 Bonus 6 Bulan Kasir ${name}`,
            message: `Kasir ${name} telah mencapai kelipatan 6 bulan kerja! Berikan bonus apresiasi.`,
            date: nowISO,
            type: 'bonus',
            isRead: false
          })
          hasChanges = true
        }
      })
    }

    // 3. Late Kasirs (Absen Telat)
    if (ownerLateKasirs.length > 0) {
      ownerLateKasirs.forEach(late => {
        const lateId = `late_${late.name}_${late.date}`
        if (!items.some(i => i.id === lateId)) {
          // Buat date object tiruan untuk tanggal + waktu terlambat
          let notifDate = new Date().toISOString();
          if (late.date && late.time) {
            const safeTime = late.time.substring(0, 5).replace(/\./g, ':');
            const parsed = new Date(`${late.date}T${safeTime}:00`);
            if (!isNaN(parsed.getTime())) notifDate = parsed.toISOString();
          }
          
          items.unshift({
            id: lateId,
            title: `⏰ Kasir Telat: ${late.name}`,
            message: `${late.name} (Shift ${late.shift}) absen masuk pukul ${late.time} (Telat ${late.lateMins} menit).${late.alasan_telat ? `\n\nAlasan: ${late.alasan_telat}` : ''}`,
            date: notifDate,
            type: 'anomaly',
            isRead: false
          })
          hasChanges = true
        }
      })
    }

    if (hasChanges) {
      // Sort ulang berdasarkan date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      localStorage.setItem(`alphaPro_${storeKey}_notification_history`, JSON.stringify(items))
      syncToCloud(items)
    }
    setNotifList(items)
  }, [activeStoreId, bonusKasirList, ownerLateKasirs])

  const handleMarkAllRead = () => {
    const storeKey = activeStoreId || 'all'
    const updated = notifList.map(item => ({ ...item, isRead: true }))
    setNotifList(updated)
    localStorage.setItem(`alphaPro_${storeKey}_notification_history`, JSON.stringify(updated))
    syncToCloud(updated)
    if (showToast) showToast('Semua notifikasi ditandai sudah dibaca')
  }

  const handleClearHistory = () => {
    const storeKey = activeStoreId || 'all'
    if (onConfirm) {
      onConfirm('Hapus Riwayat', 'Apakah Anda yakin ingin menghapus seluruh riwayat notifikasi?', () => {
        setNotifList([])
        localStorage.removeItem(`alphaPro_${storeKey}_notification_history`)
        syncToCloud(null)
        if (showToast) showToast('Riwayat notifikasi berhasil dibersihkan')
      })
    } else {
      setNotifList([])
      localStorage.removeItem(`alphaPro_${storeKey}_notification_history`)
      syncToCloud(null)
      if (showToast) showToast('Riwayat notifikasi berhasil dibersihkan')
    }
  }

  const handleToggleRead = (id: string) => {
    const storeKey = activeStoreId || 'all'
    const updated = notifList.map(item => item.id === id ? { ...item, isRead: !item.isRead } : item)
    setNotifList(updated)
    localStorage.setItem(`alphaPro_${storeKey}_notification_history`, JSON.stringify(updated))
    syncToCloud(updated)
  }

  const filteredItems = useMemo(() => {
    if (filterType === 'unread') return notifList.filter(i => !i.isRead)
    if (filterType !== 'all') return notifList.filter(i => i.type === filterType)
    return notifList
  }, [notifList, filterType])

  const unreadCount = useMemo(() => notifList.filter(i => !i.isRead).length, [notifList])

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
      {/* Stat Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Total Catatan</p>
          <p className="text-lg font-black text-indigo-900">{notifList.length}</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
          <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Belum Dibaca</p>
          <p className="text-lg font-black text-rose-900">{unreadCount}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Status Sistem</p>
          <p className="text-lg font-black text-emerald-900">Aktif</p>
        </div>
      </div>

      {/* Control Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'unread', label: `Belum Dibaca (${unreadCount})` },
            { key: 'bonus', label: 'Bonus' },
            { key: 'anomaly', label: 'Absen/Telat' },
            { key: 'audit', label: 'Audit' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-[10px] font-black whitespace-nowrap transition-all cursor-pointer",
                filterType === f.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-check-double text-[8px]"></i> Tandai Dibaca
            </button>
          )}
          {notifList.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-[9px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-trash text-[8px]"></i> Hapus Riwayat
            </button>
          )}
        </div>
      </div>

      {/* Notification Timeline List */}
      <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
        {filteredItems.map(item => {
          const dateObj = new Date(item.date)
          const formattedDate = isNaN(dateObj.getTime())
            ? item.date
            : dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

          return (
            <div
              key={item.id}
              className={cn(
                "p-3.5 rounded-2xl border transition-all relative overflow-hidden flex items-start justify-between gap-3",
                !item.isRead
                  ? "bg-indigo-50/50 border-indigo-200 shadow-sm"
                  : "bg-slate-50/60 border-slate-200/70 opacity-80 hover:opacity-100"
              )}
            >
              {!item.isRead && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-bl-lg shadow-sm"></div>
              )}

              <div className="flex items-start gap-3 min-w-0">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-white font-bold text-sm",
                  item.type === 'bonus' ? "bg-emerald-600" :
                  item.type === 'audit' ? "bg-rose-600" : "bg-amber-500"
                )}>
                  <i className={cn("fa-solid",
                    item.type === 'bonus' ? "fa-gift" :
                    item.type === 'audit' ? "fa-triangle-exclamation" : "fa-bell"
                  )}></i>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-[11px] font-black text-slate-800 tracking-tight">{item.title}</p>
                    <span className="text-[8px] font-extrabold text-slate-400 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
                      {formattedDate}
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-600 leading-snug">{item.message}</p>
                </div>
              </div>

              <button
                onClick={() => handleToggleRead(item.id)}
                title={item.isRead ? "Tandai Belum Dibaca" : "Tandai Sudah Dibaca"}
                className={cn(
                  "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs transition-all active:scale-90 cursor-pointer border",
                  item.isRead
                    ? "bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 border-slate-200"
                    : "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 border-indigo-600"
                )}
              >
                <i className={cn("fa-solid", item.isRead ? "fa-envelope-open" : "fa-check")}></i>
              </button>
            </div>
          )
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <i className="fa-solid fa-bell-slash text-2xl text-slate-300 mb-2 block"></i>
            <p className="text-xs font-black text-slate-500">Belum ada riwayat notifikasi tersimpan.</p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Semua pesan notifikasi sistem dan audit akan dicatat otomatis di sini.</p>
          </div>
        )}
      </div>
    </div>
  )
}

const DEFAULT_OWNER_MENU = [
  { id: 'view-owner-monitor', title: 'Kasir', desc: 'Kelola data kasir', icon: 'fa-users', color: 'bg-blue-600' },
  { id: 'view-owner-profit', title: 'Notifikasi', desc: 'Riwayat notifikasi toko', icon: 'fa-bell', color: 'bg-indigo-600' },
  { id: 'view-owner-audit', title: 'Audit', desc: 'Audit uang laci', icon: 'fa-file-signature', color: 'bg-purple-600' },
  { id: 'view-owner-gaji', title: 'Gajih', desc: 'Data gaji kasir', icon: 'fa-dollar-sign', color: 'bg-green-600' },
  { id: 'view-owner-absen', title: 'Absen', desc: 'Kehadiran kasir', icon: 'fa-fingerprint', color: 'bg-teal-500' },
  { id: 'view-owner-izin', title: 'Izin', desc: 'Kelola izin', icon: 'fa-calendar-day', color: 'bg-orange-500' },
  { id: 'view-owner-performa', title: 'Performa', desc: 'Performa kasir', icon: 'fa-chart-line', color: 'bg-purple-600' },
  { id: 'view-owner-catatan', title: 'Catatan', desc: 'Catatan & belanja', icon: 'fa-clipboard-list', color: 'bg-amber-500' },
  { id: 'view-owner-saldo', title: 'Saldo', desc: 'Atur modal kasir', icon: 'fa-wallet', color: 'bg-emerald-600' },
  { id: 'view-owner-backup', title: 'Pengaturan', desc: 'Sistem & Backup', icon: 'fa-gear', color: 'bg-slate-600' },
  { id: 'view-owner-grafik', title: 'Grafik', desc: 'Grafik transaksi', icon: 'fa-chart-simple', color: 'bg-emerald-500' },
  { id: 'view-owner-laporan', title: 'Profit', desc: 'Laba admin fee', icon: 'fa-hand-holding-dollar', color: 'bg-emerald-600' },
];

function calculateTenure(joinDateStr: string) {
  if (!joinDateStr) return null;
  const joinDate = new Date(joinDateStr);
  const today = new Date();
  
  if (isNaN(joinDate.getTime())) return null;

  let months = (today.getFullYear() - joinDate.getFullYear()) * 12;
  months -= joinDate.getMonth();
  months += today.getMonth();

  let days = today.getDate() - joinDate.getDate();
  if (days < 0) {
    months--;
    const tempDate = new Date(today.getFullYear(), today.getMonth(), 0);
    days += tempDate.getDate();
  }

  return { months, days, totalMonths: months };
}


const BerandaView: React.FC<BerandaViewProps> = (props) => {
  const [posMode, setPosMode] = React.useState<'DIGITAL' | 'TARIK' | 'AKSESORIS' | 'VOUCHER'>('DIGITAL')
  const [blueCardIndex, setBlueCardIndex] = useState(0);
  const [whiteCardIndex, setWhiteCardIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const currentTargetStoreId = props.activeStoreId === 'all' ? (props.pantauStoreId || 'all') : (props.activeStoreId || 'all');
  const financialSettings = useMemo(() => {
    try {
      const key = currentTargetStoreId !== 'all' ? `alphaPro_${currentTargetStoreId}_financial` : 'alphaPro_financial';
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return {};
  }, [currentTargetStoreId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])


  const [showRincian, setShowRincian] = useState(false)
  const [showLainnya, setShowLainnya] = useState(false)
  const [showKasirNotif, setShowKasirNotif] = useState(false)
  const [dismissedLatePopup, setDismissedLatePopup] = useState(false)
  const [dismissedPesanPopup, setDismissedPesanPopup] = useState(() => {
    return sessionStorage.getItem('alphaPro_pesan_dismissed') === 'true'
  })

  const activePesanMendadak = useMemo(() => {
    if (!financialSettings.pesanMendadak) return null;
    if (financialSettings.pesanDurasi === 'selamanya') return financialSettings.pesanMendadak;
    if (!financialSettings.pesanStartDate) return financialSettings.pesanMendadak;
    
    const todayStr = getLocalDateString();
    const startStr = financialSettings.pesanStartDate;
    if (todayStr === startStr) return financialSettings.pesanMendadak;
    
    const today = new Date(todayStr);
    const start = new Date(startStr);
    const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return financialSettings.pesanMendadak; 
    const durasi = parseInt(financialSettings.pesanDurasi) || 1;
    if (diffDays >= durasi) return null; 
    
    return financialSettings.pesanMendadak;
  }, [financialSettings]);


  const [dismissedLateNotifs, setDismissedLateNotifs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`alphaPro_${props.username}_dismissed_lates`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleClearLateNotifs = () => {
    if (kasirLateHistory.length === 0) return;
    const dates = kasirLateHistory.map(l => l.tanggal);
    setDismissedLateNotifs(prev => {
      const newSet = Array.from(new Set([...prev, ...dates]));
      localStorage.setItem(`alphaPro_${props.username}_dismissed_lates`, JSON.stringify(newSet));
      return newSet;
    });
  };

  const kasirLateHistory = useMemo(() => {
    if (props.kasirRole === 'owner') return [];
    const entries = (props.absensiList || []).filter(a => a.username === props.username);
    const byDate: Record<string, any> = {};
    entries.forEach(e => {
      if (!byDate[e.tanggal] || e.jam_masuk < byDate[e.tanggal].jam_masuk) {
        byDate[e.tanggal] = e;
      }
    });

    const lates: any[] = [];
    Object.values(byDate).forEach(e => {
      const info = getShiftInfo(e.jam_masuk, financialSettings);
      if (info.isLate) {
        lates.push({
          tanggal: e.tanggal,
          jam: e.jam_masuk,
          lateMins: info.lateMins,
          shiftName: info.shiftName,
          alasan_telat: e.alasan_telat
        });
      }
    });
    return lates.sort((a, b) => b.tanggal.localeCompare(a.tanggal)).filter(l => !dismissedLateNotifs.includes(l.tanggal));
  }, [props.absensiList, props.username, props.kasirRole, financialSettings, dismissedLateNotifs]);

  const todayLateness = useMemo(() => {
    const todayStr = getLocalDateString();
    return kasirLateHistory.find(l => l.tanggal === todayStr) || null;
  }, [kasirLateHistory]);

  const ownerLateKasirs = useMemo(() => {
    if (props.kasirRole !== 'owner') return [];
    
    // Group attendance by date and cashier
    const lateEntries: { date: string, name: string, lateMins: number, shift: string, time: string, alasan_telat?: string }[] = [];
    const entries = props.absensiList || [];
    
    // Get unique dates per cashier (first login of the day)
    const firstLogins: Record<string, any> = {};
    entries.forEach(e => {
      const k = `${e.username}_${e.tanggal}`;
      if (!firstLogins[k] || e.jam_masuk < firstLogins[k].jam_masuk) {
        firstLogins[k] = e;
      }
    });

    Object.values(firstLogins).forEach(e => {
      const info = getShiftInfo(e.jam_masuk, financialSettings);
      if (info.isLate) {
        lateEntries.push({
          date: e.tanggal,
          name: props.kasirList?.[e.username]?.name || e.nama || e.username || 'Kasir',
          lateMins: info.lateMins,
          shift: info.shiftName,
          time: e.jam_masuk,
          alasan_telat: e.alasan_telat
        });
      }
    });
    
    return lateEntries.sort((a, b) => b.date.localeCompare(a.date));
  }, [props.absensiList, props.kasirRole, props.kasirList, financialSettings]);

  const bonusKasirList = useMemo(() => {
    if (props.kasirRole !== 'owner' || !props.kasirList) return []
    const list: string[] = []
    Object.entries(props.kasirList).forEach(([username, kData]) => {
      if (username === 'owner') return
      const tenure = kData.tanggalJoin ? calculateTenure(kData.tanggalJoin) : null
      if (tenure && tenure.totalMonths > 0 && tenure.totalMonths % 6 === 0) {
        list.push(kData.name)
      }
    })
    return list
  }, [props.kasirList, props.kasirRole])
  const [currentTime, setCurrentTime] = useState(new Date())

  // Controls for Owner Notification Banners (Minimize '_' & Dismiss 'X')
  const [isNotificationsHidden, setIsNotificationsHidden] = useState(() => {
    return localStorage.getItem('alphaPro_owner_notifications_hidden') === 'true'
  })
  const [showNotifModal, setShowNotifModal] = useState(false)

  const [isBonusMinimized, setIsBonusMinimized] = useState(() => {
    return localStorage.getItem('alphaPro_owner_bonus_minimized') === 'true'
  })
  const [isBonusDismissed, setIsBonusDismissed] = useState(() => {
    return localStorage.getItem('alphaPro_owner_bonus_dismissed') === 'true'
  })

  // Rent Reminder State
  const [rentReminder, setRentReminder] = useState<{ isDueSoon: boolean, amount: number, dueDateStr: string, diffDays: number } | null>(null)
  const [isRentMinimized, setIsRentMinimized] = useState(() => {
    return localStorage.getItem('alphaPro_owner_rent_minimized') === 'true'
  })
  const [isRentDismissed, setIsRentDismissed] = useState(() => {
    return localStorage.getItem('alphaPro_owner_rent_dismissed') === 'true'
  })

  const [localAbsensiOverrides, setLocalAbsensiOverrides] = useState<Record<string | number, string>>({})
  const [updatingLemburIds, setUpdatingLemburIds] = useState<Record<string | number, boolean>>({})
  const [absensiRefreshKey, setAbsensiRefreshKey] = useState(0)
  const [isSelfieGalleryOpen, setIsSelfieGalleryOpen] = useState(false)

  // State modal edit absensi untuk owner
  const [editingAbsen, setEditingAbsen] = useState<{
    entry?: any
    cashierId: string
    cashierName: string
    dateStr: string
    selectedCashierId: string
    status: 'Hadir' | 'Lembur' | 'Libur' | 'Izin'
    shift: 'PAGI' | 'SIANG' | 'MALAM'
    jamMasuk: string
    alasanTelat: string
  } | null>(null)
  const [isSavingAbsen, setIsSavingAbsen] = useState(false)

  // Sinkronisasi absensiList dengan perubahan status lokal secara instan (Zero Lag)
  const effectiveAbsensiList = useMemo(() => {
    const list = props.absensiList || [];
    if (Object.keys(localAbsensiOverrides).length === 0) return list;
    return list.map(a => {
      if (a.id && localAbsensiOverrides[a.id] !== undefined) {
        return { ...a, status: localAbsensiOverrides[a.id] };
      }
      return a;
    });
  }, [props.absensiList, localAbsensiOverrides, absensiRefreshKey]);

  const handleOpenEditAbsen = (cashierId: string, acc: KasirAccount, dateStr: string, entry?: any) => {
    let initialShift: 'PAGI' | 'SIANG' | 'MALAM' = 'PAGI';
    if (entry && entry.jam_masuk) {
      const info = getShiftInfo(entry.jam_masuk, financialSettings);
      initialShift = (info.shiftName as any) || 'PAGI';
    }
    setEditingAbsen({
      entry: entry || null,
      cashierId,
      cashierName: acc.name,
      dateStr,
      selectedCashierId: cashierId,
      status: (entry?.status as any) || 'Hadir',
      shift: initialShift,
      jamMasuk: entry?.jam_masuk || (entry ? '' : '07:30:00'),
      alasanTelat: entry?.alasan_telat || ''
    })
  }

  const handleSaveEditAbsen = async () => {
    if (!editingAbsen) return
    setIsSavingAbsen(true)
    
    const { entry, dateStr, selectedCashierId, status, shift, jamMasuk, alasanTelat } = editingAbsen
    const newAccount = props.kasirList[selectedCashierId]
    const newCashierName = newAccount?.name || selectedCashierId

    try {
      if (entry && entry.id) {
        // Update existing record (catatan: kolom 'shift' dihitung dari jam_masuk, tidak ada di skema absensi Supabase)
        const updatePayload: any = {
          username: selectedCashierId,
          nama: newCashierName,
          status,
          shift,
          jam_masuk: jamMasuk || (status === 'Libur' ? '-' : entry.jam_masuk || '07:30:00'),
          alasan_telat: alasanTelat.trim() || null
        }

        let { error } = await supabase
          .from('absensi')
          .update(updatePayload)
          .eq('id', entry.id)

        // Resilient fallback: jika ada kolom yang belum ada di schema cache Supabase pengguna
        if (error) {
          const match = (error.message || '').match(/Could not find the '([^']+)' column/i);
          if (match && match[1] && updatePayload[match[1]] !== undefined) {
            delete updatePayload[match[1]];
            const retry = await supabase.from('absensi').update(updatePayload).eq('id', entry.id);
            error = retry.error;
          }
        }

        if (error) throw error

        if (Array.isArray(props.absensiList)) {
          const target = props.absensiList.find(a => String(a.id) === String(entry.id))
          if (target) {
            Object.assign(target, updatePayload)
          }
        }
        setLocalAbsensiOverrides(prev => ({
          ...prev,
          [entry.id]: status
        }))
      } else {
        // Insert new record (misal: tandai Libur atau absensi manual oleh Owner)
        const activeSid = props.activeStoreId === 'all' ? (props.pantauStoreId === 'all' ? null : props.pantauStoreId) : props.activeStoreId
        const insertPayload: any = {
          user_id: props.userId,
          store_id: activeSid,
          username: selectedCashierId,
          nama: newCashierName,
          tanggal: dateStr,
          status,
          shift,
          jam_masuk: jamMasuk || (status === 'Libur' ? '-' : '07:30:00'),
          alasan_telat: alasanTelat.trim() || null
        }

        let { data, error } = await supabase
          .from('absensi')
          .insert(insertPayload)
          .select()
          .maybeSingle()

        // Resilient fallback: jika ada kolom yang belum ada di schema cache Supabase pengguna
        if (error) {
          const match = (error.message || '').match(/Could not find the '([^']+)' column/i);
          if (match && match[1] && insertPayload[match[1]] !== undefined) {
            delete insertPayload[match[1]];
            const retry = await supabase.from('absensi').insert(insertPayload).select().maybeSingle();
            data = retry.data;
            error = retry.error;
          }
        }

        if (error) throw error

        if (data && Array.isArray(props.absensiList)) {
          props.absensiList.unshift(data)
        }
      }

      setAbsensiRefreshKey(k => k + 1)
      if (props.showToast) props.showToast("Data absensi berhasil diperbarui!")
      setEditingAbsen(null)
    } catch (err: any) {
      console.error("Error saving absensi:", err)
      if (props.showToast) props.showToast("Gagal menyimpan absensi: " + (err.message || 'Error'))
    } finally {
      setIsSavingAbsen(false)
    }
  }

  const handleDeleteAbsen = async () => {
    if (!editingAbsen || !editingAbsen.entry?.id) return
    props.onConfirm(
      "Hapus Absensi",
      "Yakin ingin menghapus data absensi ini? Kasir akan kembali berstatus BELUM ABSEN pada tanggal tersebut.",
      async () => {
        setIsSavingAbsen(true)
        try {
          const { error } = await supabase
            .from('absensi')
            .delete()
            .eq('id', editingAbsen.entry.id)

          if (error) throw error

          if (Array.isArray(props.absensiList)) {
            const idx = props.absensiList.findIndex(a => String(a.id) === String(editingAbsen.entry.id))
            if (idx !== -1) {
              props.absensiList.splice(idx, 1)
            }
          }

          setLocalAbsensiOverrides(prev => {
            const copy = { ...prev }
            delete copy[editingAbsen.entry.id]
            return copy
          })

          setAbsensiRefreshKey(k => k + 1)
          if (props.showToast) props.showToast("Data absensi berhasil dihapus!")
          setEditingAbsen(null)
        } catch (err: any) {
          console.error("Error deleting absensi:", err)
          if (props.showToast) props.showToast("Gagal menghapus absensi: " + (err.message || 'Error'))
        } finally {
          setIsSavingAbsen(false)
        }
      }
    )
  }

  const handleToggleLembur = async (entryId: number | string, currentStatus: string) => {
    const newStatus = currentStatus === 'Lembur' ? 'Hadir' : 'Lembur';

    // 1. Instan Optimistic Update: Langsung ubah di UI tanpa menunggu respons server
    setLocalAbsensiOverrides(prev => ({ ...prev, [entryId]: newStatus }));
    setUpdatingLemburIds(prev => ({ ...prev, [entryId]: true }));

    // Update in-place ke referensi props.absensiList agar sinkron ke seluruh tab/komponen
    if (Array.isArray(props.absensiList)) {
      const target = props.absensiList.find(a => String(a.id) === String(entryId));
      if (target) target.status = newStatus;
    }

    try {
      const { error } = await supabase.from('absensi').update({ status: newStatus }).eq('id', entryId);
      if (error) throw error;
      if (props.showToast) props.showToast(`Status berhasil diubah menjadi ${newStatus}`);
    } catch (e: any) {
      // Rollback jika terjadi kesalahan server / jaringan
      setLocalAbsensiOverrides(prev => {
        const copy = { ...prev };
        delete copy[entryId];
        return copy;
      });
      if (Array.isArray(props.absensiList)) {
        const target = props.absensiList.find(a => String(a.id) === String(entryId));
        if (target) target.status = currentStatus;
      }
      if (props.showToast) props.showToast("Gagal mengubah status: " + e.message);
    } finally {
      setUpdatingLemburIds(prev => {
        const copy = { ...prev };
        delete copy[entryId];
        return copy;
      });
    }
  };

  useEffect(() => {
    if (props.kasirRole !== 'owner') return;
    try {
      const activeSid = props.activeStoreId === 'all' ? (props.pantauStoreId === 'all' ? null : props.pantauStoreId) : props.activeStoreId
      if (!activeSid) return;
      const key = `alphaPro_${activeSid}_financial`
      const saved = localStorage.getItem(key)
      if (saved) {
        const fin = JSON.parse(saved)
        if (fin.rentDueDate && fin.rentAmount) {
          const dueDay = parseInt(fin.rentDueDate)
          const today = new Date()
          const currentDay = today.getDate()
          const currentMonth = today.getMonth()
          const currentYear = today.getFullYear()
          
          let targetDate = new Date(currentYear, currentMonth, dueDay)
          
          if (fin.startDate && fin.rentPeriod !== 'bulanan') {
            let monthStep = 1;
            if (fin.rentPeriod === 'tahunan') monthStep = 12;
            else if (fin.rentPeriod === 'per6bulan') monthStep = 6;
            else if (fin.rentPeriod === 'per3bulan') monthStep = 3;
            else if (fin.rentPeriod === 'per2bulan') monthStep = 2;

            const startD = new Date(fin.startDate)
            let dueMonth = startD.getMonth()
            let dueYear = startD.getFullYear()
            
            targetDate = new Date(dueYear, dueMonth, dueDay)
            const todayReset = new Date(currentYear, currentMonth, currentDay).getTime()
            
            while (targetDate.getTime() < todayReset) {
              dueMonth += monthStep;
              targetDate = new Date(dueYear, dueMonth, dueDay);
            }
          } else {
            if (currentDay > dueDay) {
              targetDate = new Date(currentYear, currentMonth + 1, dueDay)
            }
          }

          const diffTime = targetDate.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          if (diffDays <= 7 && diffDays >= 0) {
            setRentReminder({
              isDueSoon: true,
              amount: parseInt(fin.rentAmount),
              dueDateStr: targetDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
              diffDays
            })
            // Reset dismiss status if it's a new month/year
            const savedDismissDate = localStorage.getItem('alphaPro_owner_rent_dismissed_date')
            if (savedDismissDate !== targetDate.toISOString()) {
              setIsRentDismissed(false)
              localStorage.setItem('alphaPro_owner_rent_dismissed', 'false')
              localStorage.setItem('alphaPro_owner_rent_dismissed_date', targetDate.toISOString())
            }
          } else {
            setRentReminder(null)
          }
        }
      }
    } catch (e) {}
  }, [props.kasirRole, props.activeStoreId, props.pantauStoreId])

  // Read status tracking for notifications (auto-disappears bell badge on click)
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('alphaPro_owner_read_notif_ids')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const markNotifAsRead = (id: string) => {
    setReadNotifIds(prev => {
      if (prev.includes(id)) return prev
      const updated = [...prev, id]
      localStorage.setItem('alphaPro_owner_read_notif_ids', JSON.stringify(updated))
      return updated
    })
  }

  const markAllNotifsAsRead = () => {
    const todayStr = new Date().toISOString().split('T')[0]
    const bonusIds = bonusKasirList.map(name => `bonus_${name}_6m_${todayStr.substring(0, 7)}`)
    const rentId = rentReminder ? `rent_${rentReminder.dueDateStr}` : ''
    const allIds = Array.from(new Set([...readNotifIds, ...bonusIds, rentId].filter(Boolean)))
    setReadNotifIds(allIds)
    localStorage.setItem('alphaPro_owner_read_notif_ids', JSON.stringify(allIds))
  }

  const currentTodayStr = new Date().toISOString().split('T')[0]
  const unreadBonusKasirList = bonusKasirList.filter(name => {
    const bonusId = `bonus_${name}_6m_${currentTodayStr.substring(0, 7)}`
    return !readNotifIds.includes(bonusId)
  })
  const currentRentId = `rent_${rentReminder?.dueDateStr}`
  const isRentUnread = rentReminder && !isRentDismissed && !readNotifIds.includes(currentRentId)
  const totalUnreadCount = unreadBonusKasirList.length + (isRentUnread ? 1 : 0)

  // STATE: Owner Menu Reordering
  const [isEditMenuMode, setIsEditMenuMode] = useState(false)
  const [menuOrder, setMenuOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('alphaPro_owner_menu_order')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Pastikan semua default items tetap ada walaupun ada update
          const validSaved = parsed.filter(id => DEFAULT_OWNER_MENU.find(m => m.id === id))
          const missing = DEFAULT_OWNER_MENU.filter(m => !validSaved.includes(m.id)).map(m => m.id)
          return [...validSaved, ...missing]
        }
      }
    } catch {}
    return DEFAULT_OWNER_MENU.map(m => m.id)
  })
  const [selectedForSwap, setSelectedForSwap] = useState<string | null>(null)

  const handleMenuClick = (id: string) => {
    if (isEditMenuMode) {
      if (!selectedForSwap) {
        setSelectedForSwap(id)
      } else if (selectedForSwap === id) {
        setSelectedForSwap(null) // Batal pilih
      } else {
        // Lakukan Swap
        const newOrder = [...menuOrder]
        const idx1 = newOrder.indexOf(selectedForSwap)
        const idx2 = newOrder.indexOf(id)
        if (idx1 !== -1 && idx2 !== -1) {
          const temp = newOrder[idx1]
          newOrder[idx1] = newOrder[idx2]
          newOrder[idx2] = temp
          setMenuOrder(newOrder)
          localStorage.setItem('alphaPro_owner_menu_order', JSON.stringify(newOrder))
        }
        setSelectedForSwap(null)
      }
    } else {
      props.setActiveView(id)
    }
  }

  // --- AUTO SYNC PERFORMA HARIAN ---
  useEffect(() => {
    // Only run this for kasir role when online to sync today's performance snapshot
    if (!props.userId || props.kasirRole === 'owner' || !isOnline || !props.transactions || props.transactions.length === 0) return;

    const timeout = setTimeout(async () => {
      try {
        const todayStr = getLocalDateString();
        // Calculate today's performance for this kasir
        let omset = 0, laba = 0, pengeluaran = 0, count = 0;
        
        props.transactions.forEach(t => {
          if (t.kasir_id === props.username && t.timestamp.startsWith(todayStr)) {
            const isKhusus = (t.keterangan || '').includes('[KHUSUS]');
            const isIsi = String(t.kategori).startsWith('Isi');
            
            if (!isIsi && !isKhusus) {
              count++;
              laba += Number(t.adminFee) || 0;
              if (t.kategori === 'Tarik Tunai') {
                pengeluaran += Number(t.nominal) || 0;
              } else {
                omset += Number(t.nominal) || 0;
              }
            }
          }
        });

        if (count === 0) return; // Nothing to sync

        // Check existing
        const { data: existing } = await supabase
          .from('performa_harian')
          .select('id')
          .eq('user_id', props.userId)
          .eq('kasir_id', props.username)
          .eq('tanggal', todayStr)
          .single();

        const payload = {
          user_id: props.userId,
          store_id: props.activeStoreId === 'all' ? null : props.activeStoreId,
          kasir_id: props.username,
          tanggal: todayStr,
          omset,
          laba,
          laba_admin: laba,
          pengeluaran,
          total_transaksi: count,
          timestamp: new Date().toISOString()
        };

        if (existing) {
          const { error: updErr } = await supabase.from('performa_harian').update(payload).eq('id', existing.id);
          if (updErr) console.error('Failed auto-sync update:', updErr);
        } else {
          const { error: insErr } = await supabase.from('performa_harian').insert([payload]);
          if (insErr) console.error('Failed auto-sync insert:', insErr);
        }
      } catch (e) {
        console.error('Auto-sync performa harian failed:', e)
      }
    }, 5000); // 5 seconds debounce

    return () => clearTimeout(timeout);
  }, [props.transactions, props.userId, props.username, isOnline]);
  // ---------------------------------

  // Kasir Management State (Form inputs remain local)
  const [kasirFormId, setKasirFormId] = useState('')
  const [kasirFormName, setKasirFormName] = useState('')
  const [kasirFormPin, setKasirFormPin] = useState('')
  const [kasirFormTargetTrx, setKasirFormTargetTrx] = useState('')
  const [editKasirId, setEditKasirId] = useState<string | null>(null)

  // Izin State
  const [izinNamaKasir, setIzinNamaKasir] = useState('')
  const [izinTanggal, setIzinTanggal] = useState(getLocalDateString())
  const [izinAlasan, setIzinAlasan] = useState('')
  const [catatanIzin, setCatatanIzin] = useState<any[]>([])
  const STORAGE_KEY_IZIN = `alphaPro_${currentTargetStoreId}_catatanIzin`
  const [expandedMonthIzin, setExpandedMonthIzin] = useState<string | null>(null)

  // Pantau State


  // Absensi Modal State
  const [absenTab, setAbsenTab] = useState<'summary' | 'full'>('summary')
  const [absenLateHistoryId, setAbsenLateHistoryId] = useState<string | null>(null)
  const [absenLiburHistoryId, setAbsenLiburHistoryId] = useState<string | null>(null)
  const [detailedSummaryKasirId, setDetailedSummaryKasirId] = useState<string | null>(null)
  const [detailedSummaryFilter, setDetailedSummaryFilter] = useState<'ringkasan' | 'telat' | 'lembur' | 'libur' | 'log'>('ringkasan')
  const [absenFilterMonth, setAbsenFilterMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // Grafik State
  const [grafikFilterKasir, setGrafikFilterKasir] = useState('Semua')
  const [grafikRange, setGrafikRange] = useState<'harian'|'mingguan'|'bulanan'>('harian')
  const [grafikType, setGrafikType] = useState<'bar'|'line'|'pie'>('bar')
  const [grafikRefreshKey, setGrafikRefreshKey] = useState(0)

  // Performa State
  const [performaRange, setPerformaRange] = useState<'harian'|'mingguan'|'bulanan'>('bulanan')

  // Helper filter transaksi penjualan riil (100% identik dengan ProfitOwnerView & PerformaKasirView)
  const isPureSalesTx = (t: any) => {
    if (!t) return false;
    const kat = (t.kategori || '').toLowerCase().trim();
    if (!kat) return false;
    if (
      kat.startsWith('isi') ||
      kat.includes('isi saldo') ||
      kat.includes('isi modal') ||
      kat.includes('setor modal') ||
      kat.includes('tambah saldo') ||
      kat.includes('topup saldo') ||
      kat.includes('real aplikasi')
    ) {
      return false;
    }
    const ket = (t.keterangan || '').toUpperCase();
    if (ket.includes('[KHUSUS]')) {
      return false;
    }
    return true;
  };

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any[]>([])
  const [analyticsRawData, setAnalyticsRawData] = useState<any[]>([])
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)

  const activeOwnerSubView = props.activeView?.startsWith('view-owner-') ? props.activeView.replace('view-owner-', '') : null
  const isOwnerSubView = !!activeOwnerSubView

  useEffect(() => {
    if (activeOwnerSubView === 'performa' || activeOwnerSubView === 'grafik') {
      let isSubscribed = true
      const fetchAnalytics = async () => {
        setIsAnalyticsLoading(true)
        try {
          const now = new Date()
          let days = 30
          
          if (activeOwnerSubView === 'performa') {
            if (performaRange === 'harian') days = 0
            else if (performaRange === 'mingguan') days = 7
            else days = 31
          } else {
            if (grafikRange === 'harian') days = 7
            else if (grafikRange === 'mingguan') days = 30
            else days = 366 // 1 Tahun penuh (365/366 hari)
          }

          const cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)
          const fmt = (d: Date) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
          const startStr = fmt(cutoffDate)
          const storeId = (props.pantauStoreId && props.pantauStoreId !== 'all') 
            ? props.pantauStoreId 
            : (props.activeStoreId && props.activeStoreId !== 'all' ? props.activeStoreId : 'all')

          // Helper to process and aggregate rows safely
          const processTransactions = (rows: any[]) => {
            const valid = rows.filter(r => {
              if (!isPureSalesTx(r)) return false
              if (storeId !== 'all' && r.store_id && r.store_id !== storeId) return false
              const txDay = typeof r.timestamp === 'string' ? r.timestamp.substring(0, 10) : ''
              return !startStr || txDay >= startStr
            })

            const aggregated = valid.reduce((acc, row) => {
              const day = typeof row.timestamp === 'string' ? row.timestamp.substring(0, 10) : ''
              if (!day) return acc
              const kId = row.kasir_id || 'Unknown'
              const key = `${day}_${kId}`
              if (!acc[key]) {
                acc[key] = { kasir_id: kId, tanggal: day, total_omzet: 0, total_transaksi: 0, total_admin: 0 }
              }
              acc[key].total_omzet += Number(row.nominal || 0)
              acc[key].total_transaksi += 1
              acc[key].total_admin += Number(row.admin_fee ?? row.adminFee ?? 0)
              return acc
            }, {} as Record<string, any>)

            return {
              grouped: Object.values(aggregated),
              raw: valid
            }
          }

          // 1. Process from local props.allTransactions / props.transactions first as immediate fallback
          const localPool = (props.allTransactions && props.allTransactions.length > 0)
            ? props.allTransactions
            : (props.transactions || [])
          
          const localResult = processTransactions(localPool)
          if (localResult.grouped.length > 0 && isSubscribed) {
            setAnalyticsData(localResult.grouped)
            setAnalyticsRawData(localResult.raw)
          }

          // 2. Muat langsung dari tabel rekap instan database (profit_harian)
          let loadedFromDatabase = false;
          let effectiveUid = props.userId;
          if (!effectiveUid) {
            try {
              const { data: authData } = await supabase.auth.getUser();
              effectiveUid = authData.user?.id || '';
            } catch (e) {
              // fallback
            }
          }

          try {
            // Prioritas 2A: Cek tabel profit_harian (tabel resmi Supabase)
            let phQuery = supabase
              .from('profit_harian')
              .select('*')
              .neq('kasir_id', 'Semua')
              .gte('tanggal', startStr)
              .order('tanggal', { ascending: false });

            if (storeId && storeId !== 'all') {
              phQuery = phQuery.eq('store_id', storeId);
            }

            const { data: phData, error: phError } = await phQuery;
            const distinctDates = new Set((phData || []).map((r: any) => typeof r.tanggal === 'string' ? r.tanggal.substring(0, 10) : String(r.tanggal))).size;
            const minDatesRequired = grafikRange === 'harian' ? 2 : grafikRange === 'mingguan' ? 5 : 10;

            if (!phError && phData && phData.length > 0 && distinctDates >= minDatesRequired) {
              loadedFromDatabase = true;
              const convertedGrouped = phData.map((r: any) => ({
                kasir_id: r.kasir_id,
                tanggal: typeof r.tanggal === 'string' ? r.tanggal.substring(0, 10) : String(r.tanggal),
                total_omzet: Number(r.total_omzet || 0),
                total_transaksi: Number(r.total_transaksi || 0),
                total_admin: Number(r.total_profit_admin || 0),
                omzet_penjualan: Number(r.total_omzet || 0),
                kategori_breakdown: {}
              }));

              // Gabungkan live data hari ini dari memory lokal jika ada
              const todayISO = formatLocalISO(now);
              const todayLocalTxs = localPool.filter((t: any) => {
                if (!t || !t.timestamp || !t.timestamp.startsWith(todayISO)) return false;
                if (!isPureSalesTx(t)) return false;
                if (storeId !== 'all' && t.store_id && t.store_id !== storeId) return false;
                return true;
              });

              if (todayLocalTxs.length > 0) {
                const todayAggregated: Record<string, any> = {};
                todayLocalTxs.forEach((t: any) => {
                  const kId = (t.kasir_id || 'Unknown').trim();
                  const key = `${todayISO}_${kId}`;
                  if (!todayAggregated[key]) {
                    todayAggregated[key] = {
                      kasir_id: kId,
                      tanggal: todayISO,
                      total_omzet: 0,
                      total_transaksi: 0,
                      total_admin: 0,
                      omzet_penjualan: 0,
                      kategori_breakdown: {}
                    };
                  }
                  todayAggregated[key].total_omzet += Number(t.nominal || 0);
                  todayAggregated[key].total_transaksi += 1;
                  todayAggregated[key].total_admin += Number(t.adminFee ?? t.admin_fee ?? 0);
                  if ((t.kategori || '').toLowerCase() !== 'tarik tunai') {
                    todayAggregated[key].omzet_penjualan += Number(t.nominal || 0);
                  }
                  const cat = t.kategori || 'Lainnya';
                  todayAggregated[key].kategori_breakdown[cat] = (todayAggregated[key].kategori_breakdown[cat] || 0) + Number(t.nominal || 0);
                });

                const withoutToday = convertedGrouped.filter((g: any) => g.tanggal !== todayISO);
                setAnalyticsData([...withoutToday, ...Object.values(todayAggregated)]);
              } else {
                setAnalyticsData(convertedGrouped);
              }
            }
          } catch (e) {
            console.warn('Gagal muat profit_harian:', e);
          }

          // Prioritas 2B: Cek tabel daily_analytics jika profit_harian belum ada/kosong
          if (!loadedFromDatabase) {
            try {
              let analyticsQuery = supabase
                .from('daily_analytics')
                .select('*')
                .gte('tanggal', startStr)
                .order('tanggal', { ascending: false });

              if (effectiveUid) analyticsQuery = analyticsQuery.eq('user_id', effectiveUid);
              if (storeId !== 'all') analyticsQuery = analyticsQuery.eq('store_id', storeId);

              const { data: summaryData, error: summaryError } = await analyticsQuery;
              const distinctDailyDates = new Set((summaryData || []).map((r: any) => typeof r.tanggal === 'string' ? r.tanggal.substring(0, 10) : String(r.tanggal))).size;
              const minDatesRequired = grafikRange === 'harian' ? 2 : grafikRange === 'mingguan' ? 5 : 10;

              if (!summaryError && summaryData && summaryData.length > 0 && distinctDailyDates >= minDatesRequired) {
                loadedFromDatabase = true;
                const convertedGrouped = summaryData.map((r: any) => ({
                  kasir_id: r.kasir_id,
                  tanggal: r.tanggal,
                  total_omzet: Number(r.total_omzet || 0),
                  total_transaksi: Number(r.total_transaksi || 0),
                  total_admin: Number(r.total_laba || 0),
                  omzet_penjualan: Number(r.omzet_penjualan || 0),
                  kategori_breakdown: r.kategori_breakdown || {}
                }));

                const todayISO = formatLocalISO(now);
                const todayLocalTxs = localPool.filter((t: any) => {
                  if (!t || !t.timestamp || !t.timestamp.startsWith(todayISO)) return false;
                  if (!isPureSalesTx(t)) return false;
                  if (storeId !== 'all' && t.store_id && t.store_id !== storeId) return false;
                  return true;
                });

                if (todayLocalTxs.length > 0) {
                  const todayAggregated: Record<string, any> = {};
                  todayLocalTxs.forEach((t: any) => {
                    const kId = (t.kasir_id || 'Unknown').trim();
                    const key = `${todayISO}_${kId}`;
                    if (!todayAggregated[key]) {
                      todayAggregated[key] = {
                        kasir_id: kId,
                        tanggal: todayISO,
                        total_omzet: 0,
                        total_transaksi: 0,
                        total_admin: 0,
                        omzet_penjualan: 0,
                        kategori_breakdown: {}
                      };
                    }
                    todayAggregated[key].total_omzet += Number(t.nominal || 0);
                    todayAggregated[key].total_transaksi += 1;
                    todayAggregated[key].total_admin += Number(t.adminFee ?? t.admin_fee ?? 0);
                    if ((t.kategori || '').toLowerCase() !== 'tarik tunai') {
                      todayAggregated[key].omzet_penjualan += Number(t.nominal || 0);
                    }
                    const cat = t.kategori || 'Lainnya';
                    todayAggregated[key].kategori_breakdown[cat] = (todayAggregated[key].kategori_breakdown[cat] || 0) + Number(t.nominal || 0);
                  });

                  const withoutToday = convertedGrouped.filter((g: any) => g.tanggal !== todayISO);
                  setAnalyticsData([...withoutToday, ...Object.values(todayAggregated)]);
                } else {
                  setAnalyticsData(convertedGrouped);
                }
              }
            } catch (e) {
              console.warn('Gagal muat daily_analytics:', e);
            }
          }

          // 3. Muat data transaksi mentah untuk melengkapi rincian kategori & jam sibuk (dan fallback jika SQL cache belum ada)
          try {
            const queryLimit = grafikRange === 'bulanan' ? 10000 : grafikRange === 'mingguan' ? 5000 : 2000;
            const pageSize = 1000;
            let from = 0;
            let hasMore = true;
            let allRemoteRows: any[] = [];

            while (hasMore && isSubscribed) {
              let query = supabase
                .from('transactions')
                .select('id, kasir_id, nominal, admin_fee, timestamp, kategori, store_id, keterangan')
                .gte('timestamp', `${startStr}T00:00:00`)
                .order('timestamp', { ascending: false })
                .range(from, from + pageSize - 1);

              if (effectiveUid) {
                query = query.eq('user_id', effectiveUid);
              }
              if (storeId !== 'all') {
                query = query.eq('store_id', storeId);
              }

              const { data, error } = await query;

              if (error) {
                console.warn('Analytics remote fetch warning:', error.message || error);
                hasMore = false;
              } else if (data && data.length > 0) {
                allRemoteRows.push(...data);
                if (data.length < pageSize || allRemoteRows.length >= queryLimit) {
                  hasMore = false;
                } else {
                  from += pageSize;
                }
              } else {
                hasMore = false;
              }
            }

            if (allRemoteRows.length > 0 && isSubscribed) {
              // Deduplicate remote + local by id
              const mapById = new Map<string, any>();
              allRemoteRows.forEach(r => { if (r.id) mapById.set(r.id, r); });
              localPool.forEach(r => {
                if (r.id && !mapById.has(r.id)) {
                  mapById.set(r.id, {
                    id: r.id,
                    kasir_id: r.kasir_id,
                    nominal: r.nominal,
                    admin_fee: r.adminFee ?? (r as any).admin_fee ?? 0,
                    timestamp: r.timestamp,
                    kategori: r.kategori,
                    store_id: r.store_id,
                    keterangan: r.keterangan
                  });
                }
              });
              const combinedList = Array.from(mapById.values());
              const remoteResult = processTransactions(combinedList.length > 0 ? combinedList : allRemoteRows);
              // Selalu perbarui analyticsData dengan hasil transaksi mentah agar semua hari terisi 100%
              if (remoteResult.grouped.length > 0) {
                setAnalyticsData(remoteResult.grouped);
              }
              setAnalyticsRawData(remoteResult.raw);
            }
          } catch (e) {
            console.warn('Raw fetch error:', e);
          }
        } catch (err) {
          console.error('Error fetching analytics:', err)
        } finally {
          if (isSubscribed) setIsAnalyticsLoading(false)
        }
      }
      fetchAnalytics()
      return () => { isSubscribed = false }
    }
  }, [activeOwnerSubView, performaRange, grafikRange, props.activeStoreId, props.pantauStoreId, props.userId, props.allTransactions, grafikRefreshKey])

  const [ownerSaldoKasirId, setOwnerSaldoKasirId] = useState('')
  const [ownerSaldoNominal, setOwnerSaldoNominal] = useState('')
  const [ownerSaldoKategori, setOwnerSaldoKategori] = useState('Isi Saldo Bank')

  const [auditFilterDate, setAuditFilterDate] = useState('')

  const auditHistory = useMemo(() => {
    if (!props.allTransactions) return []
    
    // Kelompokkan berdasarkan tanggal -> kasirId
    const groups: Record<string, Record<string, Transaction[]>> = {}
    
    props.allTransactions.forEach(t => {
      const dateStr = t.timestamp.split('T')[0]
      const kasir = t.kasir_id || 'Unknown'
      if (!groups[dateStr]) groups[dateStr] = {}
      if (!groups[dateStr][kasir]) groups[dateStr][kasir] = []
      groups[dateStr][kasir].push(t)
    })

    const results = []
    
    // Sort tanggal dari terbaru ke terlama
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))
    
    for (const dateStr of sortedDates) {
      for (const kasir of Object.keys(groups[dateStr])) {
        const txs = groups[dateStr][kasir]
        
        // Cari transaksi closing / Isi Saldo Real
        const saldoRealTxs = txs.filter(t => t.kategori === 'Isi Saldo Real Aplikasi')
        if (saldoRealTxs.length === 0) continue // Belum closing / tidak ada data
        
        // Asumsi saldo real diambil dari total, atau mungkin cuma 1 row saat closing
        const saldoReal = saldoRealTxs.reduce((s, t) => s + t.nominal, 0)
        
        // Hitung saldo sistem
        const isiBank = txs.filter(t => t.kategori === 'Isi Saldo Bank').reduce((s, t) => s + t.nominal, 0)
        const penjualanDigital = txs.filter(t => ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori) && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]')).reduce((s, t) => s + t.nominal, 0)
        
        const currentSaldoBank = isiBank - penjualanDigital
        const selisih = saldoReal - currentSaldoBank
        
        const kasirName = props.kasirList[kasir]?.name || kasir
        
        // Format tanggal (misal: "22 Agustus 2026")
        const dateObj = parseLocalISO(dateStr)
        const tglFormatted = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        
        // Tambahkan konteks "Hari Ini" atau "Kemarin"
        const today = new Date()
        const todayStr = getLocalDateString()
        const yesterdayDate = new Date(today)
        yesterdayDate.setDate(yesterdayDate.getDate() - 1)
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0]
        
        let dayContext = ''
        if (dateStr === todayStr) dayContext = 'Hari Ini'
        else if (dateStr === yesterdayStr) dayContext = 'Kemarin'
        else dayContext = dateObj.toLocaleDateString('id-ID', { weekday: 'long' })
        
        results.push({
          tanggal: tglFormatted,
          tanggalAsli: dateStr,
          dayContext,
          kasirId: kasir,
          kasirName: kasirName,
          selisih: selisih
        })
      }
    }
    
    return results
  }, [props.allTransactions, props.kasirList])


  // Auto-close sub-panels when navigating away to any other view
  useEffect(() => {
    setShowRincian(false)
    setShowLainnya(false)
  }, [props.activeView])

  useEffect(() => {
    if (activeOwnerSubView === 'izin') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_IZIN)
        if (saved) setCatatanIzin(JSON.parse(saved))
        else setCatatanIzin([])
      } catch (e) {
        console.error('Failed to load izin', e)
      }
    }
  }, [activeOwnerSubView, STORAGE_KEY_IZIN])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])


  const simpanIzin = () => {
    if (!izinNamaKasir || !izinTanggal || !izinAlasan.trim()) return props.showToast('Lengkapi semua data!')
    const baru = { nama: izinNamaKasir, tanggal: izinTanggal, alasan: izinAlasan.trim(), dicatatPada: getLocalISOString() }
    const updated = [baru, ...catatanIzin]
    setCatatanIzin(updated)
    localStorage.setItem(STORAGE_KEY_IZIN, JSON.stringify(updated))
    setIzinNamaKasir(''); setIzinAlasan('')
  }

  const hapusIzin = (index: number) => {
    props.onConfirm('HAPUS IZIN', 'Hapus catatan izin ini?', () => {
      const updated = catatanIzin.filter((_, i) => i !== index)
      setCatatanIzin(updated)
      localStorage.setItem(STORAGE_KEY_IZIN, JSON.stringify(updated))
      props.showToast("Berhasil Dihapus")
    })
  }

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' })
  const fullDate = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const clockStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  
  const totalPendapatanBersih = props.totalSaldoKas
  const penjualanDigital = props.penjualanDigital
  const kasModal = props.kasModal


  // Recalculate Owner Control stats to match RiwayatView behavior
  const todayISO = getLocalDateString()
  const ownerDisplayTxs = props.kasirRole === 'owner' 
    ? (props.filterKasir && props.filterKasir !== 'Semua' ? props.transactions.filter(t => t.kasir_id === props.filterKasir) : props.transactions)
    : props.transactions.filter(t => t.kasir_id === props.username);
  
  const ownerTodayTxs = ownerDisplayTxs.filter(t => t.timestamp.startsWith(todayISO) && !t.kategori.startsWith('Isi'))
  
  const currentMonthISO = todayISO.substring(0, 7);
  const ownerMonthTxs = ownerDisplayTxs.filter(t => t.timestamp.startsWith(currentMonthISO) && !t.kategori.startsWith('Isi'));
  
  const ownerMonthSalesTxs = ownerDisplayTxs.filter(t => {
    if (!t.timestamp.startsWith(currentMonthISO)) return false;
    const c = (t.kategori || '').toLowerCase();
    const k = (t.keterangan || '').toUpperCase();
    if (k.includes('[KHUSUS]') || k.includes('[NON_TUNAI]') || k.includes('[ADMIN_DALAM]')) return false;
    if (c.includes('isi saldo bank') || c.includes('isi modal') || c.includes('setor modal') || c.includes('tambah saldo') || c.includes('topup saldo') || c.includes('tarik tunai')) return false;
    return true;
  });

  const ownerMonthTotalAdmin = ownerMonthSalesTxs.reduce((s, t) => s + t.adminFee, 0);
  const ownerMonthTotalTrx = ownerMonthSalesTxs.length;

  const ownerMonthTotalUangMasuk = ownerMonthSalesTxs.reduce((s, t) => s + t.nominal, 0);

  const ownerTotalUangMasuk = ownerTodayTxs
    .filter(t => t.kategori !== 'Tarik Tunai' && !(t.keterangan || '').includes('[KHUSUS]') && !(t.keterangan || '').includes('[NON_TUNAI]'))
    .reduce((s, t) => s + t.nominal, 0);
  const ownerTotalAdmin = ownerTodayTxs.filter(t => 
    !(t.keterangan || '').includes('[KHUSUS]') && 
    !(t.keterangan || '').includes('[NON_TUNAI]')
  ).reduce((s, t) => s + t.adminFee, 0)
  
  const ownerTotalTrx = ownerTodayTxs.length
  const ownerTotalVolume = ownerTodayTxs.reduce((s, t) => s + t.nominal, 0)

  // Recalculate other stats for the 'Ringkasan Harian' modal consistency
  const ownerTotalAksesoris = ownerTodayTxs.filter(t => 
    t.kategori === 'Aksesoris' && 
    !(t.keterangan || '').includes('[KHUSUS]') && 
    !(t.keterangan || '').includes('[NON_TUNAI]')
  ).reduce((s, t) => s + t.nominal, 0)
  
  const ownerTotalTarik = ownerTodayTxs.filter(t => 
    t.kategori === 'Tarik Tunai' && 
    !(t.keterangan || '').includes('[KHUSUS]') && 
    !(t.keterangan || '').includes('[NON_TUNAI]')
  ).reduce((s, t) => s + t.nominal, 0)
  
  const ownerPenjualanDigital = ownerTodayTxs.filter(t => 
    ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori) && 
    !(t.keterangan || '').includes('[KHUSUS]') && 
    !(t.keterangan || '').includes('[NON_TUNAI]')
  ).reduce((s, t) => s + t.nominal, 0)
  
  const ownerKasModal = ownerDisplayTxs.filter(t => t.timestamp.startsWith(todayISO) && t.kategori === 'Isi Modal Tunai Kasir').reduce((s, t) => s + t.nominal, 0)
  
  // Kas Lain Nya Calculations (Matching LaporanView logic)
  const ownerAdminDalam = ownerDisplayTxs.filter(t => t.timestamp.startsWith(todayISO) && (t.keterangan || '').includes('[ADMIN_DALAM]')).reduce((s, t) => s + (t.adminFee || (t as any).admin || 0), 0)
  const ownerNonTunai = ownerDisplayTxs.filter(t => t.timestamp.startsWith(todayISO) && (t.keterangan || '').includes('[NON_TUNAI]')).reduce((s, t) => s + (t.nominal || 0) + (t.adminFee || (t as any).admin || 0), 0)
  const ownerKhusus = ownerDisplayTxs.filter(t => t.timestamp.startsWith(todayISO) && (t.keterangan || '').includes('[KHUSUS]')).reduce((s, t) => s + (t.nominal || 0) + (t.adminFee || (t as any).admin || 0), 0)

  const kasirAdminDalam = props.totalAdminDalam !== undefined
    ? props.totalAdminDalam
    : (props.transactions || [])
        .filter(t => (t.keterangan || '').includes('[ADMIN_DALAM]'))
        .reduce((s, t) => s + (t.adminFee || (t as any).admin || 0), 0)

  const ownerTotalLaci = ownerKasModal + ownerPenjualanDigital + ownerTotalAksesoris + ownerTotalAdmin - ownerTotalTarik
  
  // ownerSaldoBank calculation (Contribution to bank balance/plafon)
  const ownerTotalBankOut = ownerTodayTxs.filter(t => 
    ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori)
  ).reduce((s, t) => s + t.nominal, 0)
  
  const ownerIsiBank = ownerDisplayTxs.filter(t => t.timestamp.startsWith(todayISO) && t.kategori === 'Isi Saldo Bank').reduce((s, t) => s + t.nominal, 0)
  const ownerSaldoBank = ownerIsiBank - ownerTotalBankOut

  if (props.isPc && !isOwnerSubView) {
    if (!props.active) return null;

    const targetTrx = (props.kasirRole !== 'owner')
      ? (props.kasirList[props.username]?.targetTrx || (financialSettings?.defaultTargetTrx ? parseInt(financialSettings.defaultTargetTrx) : 0))
      : 0;
    const targetPct = targetTrx > 0 ? Math.min(Math.round((ownerTotalTrx / targetTrx) * 100), 100) : 0;
    const isTargetDone = targetPct >= 100;

    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 p-6 overflow-y-auto hide-scrollbar gap-6 animate-in fade-in duration-200">
        {/* TOP BAR / HEADER BERANDA PC */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            {props.storePhoto ? (
              <img src={props.storePhoto} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md" alt="Store Logo" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-2xl shadow-md">
                <i className="fa-solid fa-store"></i>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{props.storeName || 'ALFAZA CELL'}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse"></span>
                  SISTEM AKTIF
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{props.storeSubtext || 'Agen Brilink & Konter Pulsa'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Toko & Filter Kasir (Model Persis Mode HP) */}
            {props.kasirRole === 'owner' && (
              <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3 py-1.5 shadow-sm gap-2">
                {/* Select Toko */}
                <div className="relative flex items-center gap-1.5">
                  <i className="fa-solid fa-store text-blue-600 dark:text-blue-400 text-xs"></i>
                  <select
                    value={props.pantauStoreId || 'all'}
                    onChange={(e) => props.setPantauStoreId && props.setPantauStoreId(e.target.value)}
                    className="bg-transparent text-slate-800 dark:text-white text-xs font-black outline-none border-none cursor-pointer appearance-none pr-5 uppercase tracking-wider font-sans py-1 max-w-[130px] truncate"
                  >
                    <option value="all" className="text-slate-800 dark:text-slate-900">SEMUA TOKO</option>
                    {(props.stores || []).map((store) => (
                      <option key={store.id} value={store.id} className="text-slate-800 dark:text-slate-900">{store.name}</option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-0 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 pointer-events-none"></i>
                </div>

                <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 shrink-0"></div>

                {/* Select Kasir */}
                <div className="relative flex items-center gap-1.5">
                  <i className="fa-solid fa-user-tie text-indigo-600 dark:text-indigo-400 text-xs"></i>
                  <select
                    value={props.filterKasir || 'Semua'}
                    onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                    disabled={props.pantauStoreId === 'all'}
                    className={cn(
                      "bg-transparent text-xs font-black outline-none border-none cursor-pointer appearance-none pr-5 uppercase tracking-wider font-sans py-1 max-w-[130px] truncate",
                      props.pantauStoreId === 'all' ? "text-slate-400 cursor-not-allowed" : "text-slate-800 dark:text-white"
                    )}
                  >
                    <option value="Semua" className="text-slate-800 dark:text-slate-900">SEMUA KASIR</option>
                    {props.kasirList && Object.entries(props.kasirList)
                      .filter(([id, acc]) => id.toLowerCase() !== 'owner' && (acc?.role || '').toLowerCase() !== 'owner')
                      .map(([id, acc]) => (
                        <option key={id} value={id} className="text-slate-800 dark:text-slate-900">{acc.name}</option>
                      ))}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-0 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 pointer-events-none"></i>
                </div>
              </div>
            )}

            {/* Jam & Tanggal Digital */}
            <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-right">
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 tabular-nums">{dayName}, {fullDate}</p>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tabular-nums uppercase tracking-widest mt-0.5"><i className="fa-regular fa-clock mr-1"></i> {clockStr}</p>
            </div>

            {/* Tombol Lonceng Notifikasi */}
            <div className="relative">
              <button
                onClick={() => {
                  if (props.kasirRole === 'owner') {
                    setShowNotifModal(true);
                  } else {
                    setShowKasirNotif(!showKasirNotif);
                  }
                }}
                className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center transition-all relative active:scale-95 border",
                  (props.kasirRole === 'owner' ? totalUnreadCount > 0 : (kasirLateHistory.length > 0 || activePesanMendadak))
                    ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 animate-pulse"
                    : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-white"
                )}
                title="Pemberitahuan & Notifikasi"
              >
                <i className="fa-solid fa-bell text-sm"></i>
                {(props.kasirRole === 'owner' ? totalUnreadCount > 0 : (kasirLateHistory.length > 0 || activePesanMendadak)) && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-md">
                    {props.kasirRole === 'owner' ? totalUnreadCount : (kasirLateHistory.length + (activePesanMendadak ? 1 : 0))}
                  </span>
                )}
              </button>
            </div>

            {/* Tombol Jurnal Shift / Tutup Shift */}
            {props.onJurnalClick && (
              <button
                onClick={props.onJurnalClick}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-indigo-500/20"
                title="Buka / Tutup Shift & Setoran Kasir"
              >
                <i className="fa-solid fa-scale-balanced text-xs"></i>
                <span>Jurnal Kasir</span>
              </button>
            )}

            {/* Tombol Langsung ke Mesin Kasir / Input Transaksi */}
            <button
              onClick={() => props.setActiveView('view-input-transaksi')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-500/20"
            >
              <i className="fa-solid fa-cash-register text-xs"></i>
              <span>Input Transaksi</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: 4 KARTU ASET LIKUID & FISIK (LEGA & INFORMATIF) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          {/* Card 1: Saldo Bank */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-sm text-white relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-3 bottom-2 text-white/10 text-6xl font-bold"><i className="fa-solid fa-building-columns"></i></div>
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-100 flex items-center gap-2">
                <i className="fa-solid fa-building-columns text-blue-200"></i> Saldo Bank (Plafon)
              </span>
              <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">DIGITAL</span>
            </div>
            <div className="my-4 z-10">
              <p className="text-2xl font-black tracking-tight drop-shadow-sm">{formatRupiah(props.saldoBank)}</p>
              <p className="text-[9px] text-blue-100/90 font-medium mt-1">Plafon modal bank terdaftar</p>
            </div>
            <div className="pt-2 border-t border-white/20 flex justify-between items-center text-[9px] font-bold text-blue-100 z-10">
              <span>Mutasi Keluar Hari Ini</span>
              <span>{ownerTotalBankOut > 0 ? `-${formatRupiah(ownerTotalBankOut)}` : 'Stabil'}</span>
            </div>
          </div>

          {/* Card 2: Saldo Laci Kasir */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-3xl shadow-sm text-white relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-3 bottom-2 text-white/10 text-6xl font-bold"><i className="fa-solid fa-cash-register"></i></div>
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100 flex items-center gap-2">
                <i className="fa-solid fa-cash-register text-emerald-200"></i> Laci Kasir (Fisik)
              </span>
              <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">TUNAI</span>
            </div>
            <div className="my-4 z-10">
              <p className="text-2xl font-black tracking-tight drop-shadow-sm">{formatRupiah(ownerTotalLaci)}</p>
              <p className="text-[9px] text-emerald-100/90 font-medium mt-1">Uang cash fisik di laci kasir</p>
            </div>
            <div className="pt-2 border-t border-white/20 flex justify-between items-center text-[9px] font-bold text-emerald-100 z-10">
              <span>Modal Awal Kasir</span>
              <span>{formatRupiah(props.kasModal)}</span>
            </div>
          </div>

          {/* Card 3: Total Aset Likuid */}
          <div className="bg-gradient-to-br from-purple-600 to-violet-700 p-6 rounded-3xl shadow-sm text-white relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-3 bottom-2 text-white/10 text-6xl font-bold"><i className="fa-solid fa-vault"></i></div>
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-100 flex items-center gap-2">
                <i className="fa-solid fa-vault text-purple-200"></i> Total Aset Likuid
              </span>
              <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">TOTAL</span>
            </div>
            <div className="my-4 z-10">
              <p className="text-2xl font-black tracking-tight drop-shadow-sm">{formatRupiah(props.saldoBank + ownerTotalLaci)}</p>
              <p className="text-[9px] text-purple-100/90 font-medium mt-1">Total uang kasir (Bank + Tunai Laci)</p>
            </div>
            <div className="pt-2 border-t border-white/20 flex justify-between items-center text-[9px] font-bold text-purple-100 z-10">
              <span>Keamanan Saldo</span>
              <span className="text-emerald-300">Tercatat</span>
            </div>
          </div>

          {/* Card 4: Total Aset Masuk / Laba */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-3xl shadow-sm text-white relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-3 bottom-2 text-white/10 text-6xl font-bold"><i className="fa-solid fa-hand-holding-dollar"></i></div>
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-100 flex items-center gap-2">
                <i className="fa-solid fa-hand-holding-dollar text-amber-200"></i> Admin & Omset Masuk
              </span>
              <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">LABA</span>
            </div>
            <div className="my-4 z-10">
              <p className="text-2xl font-black tracking-tight drop-shadow-sm">{formatRupiah(ownerTotalAdmin)}</p>
              <p className="text-[9px] text-amber-100/90 font-medium mt-1">Total Admin Fee ({ownerTotalTrx} Transaksi)</p>
            </div>
            <div className="pt-2 border-t border-white/20 flex justify-between items-center text-[9px] font-bold text-amber-100 z-10">
              <span>Total Volume</span>
              <span>{formatRupiah(ownerTotalVolume).replace(',00', '')}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: GRID TENGAH (Kiri 7 Kolom: Pengumuman & Target & 5 Kategori; Kanan 5 Kolom: KasSummary & Akses Cepat) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* KOLOM KIRI (7 Kolom) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Pengumuman & Running Text */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-bullhorn text-blue-600"></i> Pengumuman Toko
                </span>
                <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full uppercase">Update</span>
              </div>
              
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                  {props.mainAnnouncement || 'Selamat datang di Sistem Kasir Alfaza Pro. Pastikan selalu cek fisik laci kasir dan sisa saldo m-banking sebelum pergantian shift.'}
                </p>
              </div>

              {(() => {
                const cleanTexts = (props.runningTexts || []).map(t => typeof t === 'string' ? t.trim() : '').filter(Boolean);
                if (cleanTexts.length === 0) return null;

                const unit = cleanTexts.join('   •••   ') + '   •••   ';
                let fullTrack = unit;
                while (fullTrack.length < 250) {
                  fullTrack += unit;
                }

                return (
                  <div 
                    className="overflow-hidden bg-slate-50 dark:bg-slate-900/50 py-2 px-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 relative group cursor-default select-none"
                    title="Arahkan kursor ke sini untuk menjeda teks"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="shrink-0 text-amber-500 dark:text-amber-400 text-xs flex items-center gap-1.5 pr-2.5 border-r border-slate-200 dark:border-slate-700 font-black uppercase text-[10px] tracking-wider">
                        <i className="fa-solid fa-sparkles text-amber-500 animate-pulse"></i> Motivasi
                      </span>
                      <div className="overflow-hidden relative flex-1 mask-fade-edges">
                        <div className="inline-flex shrink-0 animate-marquee items-center group-hover:[animation-play-state:paused]">
                          <span>{fullTrack}&nbsp;</span>
                          <span>{fullTrack}&nbsp;</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Target Transaksi Kasir Hari Ini */}
            {targetTrx > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
                      <i className="fa-solid fa-bullseye"></i>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Target Transaksi Hari Ini</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Performa kasir: {props.kasirName || 'Kasir'}</p>
                    </div>
                  </div>
                  {isTargetDone ? (
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                      <i className="fa-solid fa-circle-check"></i> Target Tercapai!
                    </span>
                  ) : (
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 tabular-nums bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      {ownerTotalTrx} / {targetTrx} TRX ({targetPct}%)
                    </span>
                  )}
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      isTargetDone ? "bg-gradient-to-r from-emerald-500 to-teal-400" : targetPct >= 70 ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-blue-500 to-indigo-600"
                    )}
                    style={{ width: `${targetPct}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* 5 Kategori Transaksi Hari Ini */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-indigo-600"></i> Rincian Transaksi 5 Kategori
                </h4>
                <button
                  onClick={() => props.setActiveView('view-transaksi')}
                  className="text-[10px] font-black text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-wider"
                >
                  Lihat Riwayat
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Transfer Bank', color: 'border-blue-200 bg-blue-50/50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30', icon: 'fa-building-columns' },
                  { label: 'DANA', color: 'border-cyan-200 bg-cyan-50/50 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30', icon: 'fa-wallet' },
                  { label: 'FLIP', color: 'border-orange-200 bg-orange-50/50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30', icon: 'fa-arrow-right-arrow-left' },
                  { label: 'Order Kuota', color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30', icon: 'fa-mobile-screen' },
                  { label: 'Tarik Tunai', color: 'border-rose-200 bg-rose-50/50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30', icon: 'fa-money-bill-wave' },
                  { label: 'Aksesoris', color: 'border-fuchsia-200 bg-fuchsia-50/50 text-fuchsia-700 dark:bg-fuchsia-950/20 dark:text-fuchsia-400 dark:border-fuchsia-900/30', icon: 'fa-headphones' },
                ].map(cat => {
                  const txs = ownerTodayTxs.filter(t => t.kategori === cat.label);
                  const vol = txs.reduce((s, t) => s + t.nominal, 0);
                  const adm = txs.reduce((s, t) => s + t.adminFee, 0);
                  return (
                    <div key={cat.label} className={cn("p-3.5 rounded-2xl border flex flex-col justify-between transition-all hover:scale-[1.02]", cat.color)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider truncate">{cat.label}</span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 shadow-xs tabular-nums">{txs.length} Trx</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white tabular-nums truncate">{formatRupiah(vol)}</p>
                        <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Admin: +{formatRupiah(adm)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* KOLOM KANAN (5 Kolom: Kas Laci & Akses Cepat) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Rincian Kas Laci (KasSummary Kasir) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-cash-register text-emerald-600"></i> Rincian Kas Laci Hari Ini
                </h4>
                <span className="text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-2 py-0.5 rounded-full uppercase">Fisik</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><i className="fa-solid fa-vault text-[11px] text-slate-400"></i> Modal Awal Kasir</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white">{formatRupiah(props.kasModal)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2"><i className="fa-solid fa-globe text-[11px]"></i> Penjualan Digital</span>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">+{formatRupiah(penjualanDigital)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-2xl bg-fuchsia-50/50 dark:bg-fuchsia-950/20 border border-fuchsia-100 dark:border-fuchsia-900/30">
                  <span className="text-xs font-bold text-fuchsia-700 dark:text-fuchsia-400 flex items-center gap-2"><i className="fa-solid fa-headphones text-[11px]"></i> Aksesoris</span>
                  <span className="text-xs font-black text-fuchsia-600 dark:text-fuchsia-400">+{formatRupiah(props.totalAksesoris)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2"><i className="fa-solid fa-piggy-bank text-[11px]"></i> Admin Fee Terkumpul</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">+{formatRupiah(ownerTotalAdmin)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2"><i className="fa-solid fa-money-bill-transfer text-[11px]"></i> Tarik Tunai Pembeli</span>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">-{formatRupiah(props.totalTarik)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Total Kas Laci Fisik:</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatRupiah(ownerTotalLaci)}</span>
              </div>
            </div>

            {/* Akses Cepat Fitur Tambahan */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="fa-solid fa-bolt text-purple-600"></i> Akses Cepat Fitur
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'view-kasbon', label: 'Kasbon', icon: 'fa-file-invoice', color: 'bg-blue-600 hover:bg-blue-700' },
                  { id: 'view-kontak', label: 'Kontak', icon: 'fa-address-book', color: 'bg-emerald-600 hover:bg-emerald-700' },
                  { id: 'view-stok-voucher', label: 'Voucher', icon: 'fa-ticket', color: 'bg-orange-500 hover:bg-orange-600' },
                  { id: 'view-kalender', label: 'Kalender', icon: 'fa-calendar-days', color: 'bg-rose-600 hover:bg-rose-700' },
                  { id: 'view-nota', label: 'Cetak Nota', icon: 'fa-receipt', color: 'bg-purple-600 hover:bg-purple-700' },
                  { id: 'view-otomatis', label: 'Preset Teks', icon: 'fa-wand-magic-sparkles', color: 'bg-indigo-600 hover:bg-indigo-700' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => props.setActiveView(item.id)}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group"
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105", item.color)}>
                      <i className={cn("fa-solid text-sm", item.icon)}></i>
                    </div>
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: TABEL TRANSAKSI TERAKHIR HARI INI (LIVE FEED KASIR) */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-blue-600"></i> Transaksi Terkini Hari Ini
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Pantauan transaksi yang baru saja diinput kasir</p>
            </div>
            <button
              onClick={() => props.setActiveView('view-transaksi')}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
            >
              <span>Lihat Seluruh Riwayat</span>
              <i className="fa-solid fa-chevron-right text-[9px]"></i>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Kasir</th>
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Keterangan</th>
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Nominal</th>
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                {ownerTodayTxs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                      Belum ada transaksi hari ini
                    </td>
                  </tr>
                ) : (
                  ownerTodayTxs.slice(0, 8).map(tx => {
                    const timeStr = tx.timestamp ? tx.timestamp.split('T')[1]?.substring(0, 5) || tx.timestamp : '-';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-4 text-xs font-bold text-slate-500 tabular-nums">{timeStr}</td>
                        <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{tx.kasir_id || '-'}</td>
                        <td className="py-3 px-4">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30">
                            {tx.kategori}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[300px] truncate">{tx.keterangan || '-'}</td>
                        <td className="py-3 px-4 text-xs font-black text-slate-800 dark:text-white text-right tabular-nums">{formatRupiah(tx.nominal)}</td>
                        <td className="py-3 px-4 text-xs font-black text-emerald-600 dark:text-emerald-400 text-right tabular-nums">+{formatRupiah(tx.adminFee)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* POPUP NOTIFIKASI KASIR PC (LONCENG) */}
        {props.kasirRole !== 'owner' && showKasirNotif && (
          <div className="fixed inset-0 z-[9999] flex justify-end items-start p-6 pointer-events-none">
            <div className="fixed inset-0 bg-black/25 backdrop-blur-[1px] pointer-events-auto animate-in fade-in duration-200" onClick={() => setShowKasirNotif(false)} />
            <div className="relative w-96 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-10 pointer-events-auto animate-in slide-in-from-top-3 fade-in duration-200">
              <div className="px-5 py-4 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border-b border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-bell text-xs"></i> PEMBERITAHUAN KASIR
                </h4>
                <div className="flex items-center gap-2">
                  {kasirLateHistory.length > 0 && (
                    <button onClick={handleClearLateNotifs} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-rose-600 text-[9px] font-black rounded-lg border border-rose-200 dark:border-rose-800">HAPUS</button>
                  )}
                  <button onClick={() => setShowKasirNotif(false)} className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center text-xs font-bold">✕</button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                {activePesanMendadak && (
                  <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-rose-200 shadow-sm">
                    <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Pesan Owner:</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{activePesanMendadak}</p>
                  </div>
                )}
                {kasirLateHistory.length === 0 && !activePesanMendadak ? (
                  <div className="py-8 text-center text-slate-400 font-bold text-xs uppercase">Belum ada notifikasi</div>
                ) : (
                  kasirLateHistory.map((late, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-rose-100 shadow-sm flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800 dark:text-white">{late.tanggal} • {late.jam}</span>
                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Telat {late.lateMins}m</span>
                      </div>
                      {late.alasan_telat && <p className="text-[10px] text-slate-500 mt-1">Alasan: {late.alasan_telat}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL NOTIFIKASI OWNER PC (LONCENG) */}
        {showNotifModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    <i className="fa-solid fa-bell"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Notifikasi Owner</h3>
                    <p className="text-[10px] font-bold text-slate-400">Peringatan dan info penting toko</p>
                  </div>
                </div>
                <button onClick={() => setShowNotifModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center">✕</button>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {bonusKasirList.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">🎉 Bonus Kasir 6 Bulan Tercapai</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">{bonusKasirList.join(', ')}</p>
                  </div>
                )}
                {ownerLateKasirs.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                    <p className="text-xs font-black text-rose-800 dark:text-rose-300">⏰ Kasir Terlambat Masuk Shift</p>
                    {ownerLateKasirs.map((late, i) => (
                      <p key={i} className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{late.name} (Shift {late.shift}) - Telat {late.lateMins} menit ({late.time})</p>
                    ))}
                  </div>
                )}
                {bonusKasirList.length === 0 && ownerLateKasirs.length === 0 && (
                  <div className="py-12 text-center text-slate-400 font-bold text-xs uppercase">Tidak ada notifikasi baru</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("page-view hide-scrollbar", props.active && "active")}>

      {/* ── POS KASIR OVERLAY ── */}
      {props.activeView === 'view-pos-kasir' && (
        <div className="absolute inset-0 z-[100] overflow-y-auto overflow-x-hidden w-full max-w-full bg-[#F7F7F7] pb-24 flex flex-col animate-in slide-in-from-right duration-300">
          <PosKasirView
            kasirName={props.kasirName}
            kasirRole={props.kasirRole}
            storeName={props.storeName}
            storeSubtext={props.storeSubtext}
            storePhoto={props.storePhoto}
            dayName={dayName}
            storeId={props.activeStoreId && props.activeStoreId !== 'all' ? props.activeStoreId : 'default'}
            clockStr={clockStr}
            fullDate={fullDate}
            onBack={() => props.setActiveView('view-beranda')}
          />
        </div>
      )}


      {!(props.isPc && isOwnerSubView) && (
        <>
          <GlobalHeader 
          storePhoto={props.storePhoto}
          storeName={props.storeName}
          storeSubtext={props.storeSubtext}
          kasirName={props.kasirName}
          kasirRole={props.kasirRole}
          dayName={dayName}
          fullDate={fullDate}
          clockStr={clockStr}
          onMenuClick={() => props.setIsSidePanelOpen(true)}
          onShowBannerClick={
            props.kasirRole === 'owner' && isBonusDismissed
              ? () => {
                  setIsBonusDismissed(false);
                  localStorage.removeItem('alphaPro_owner_bonus_dismissed');
                }
              : undefined
          }
          showNotifBadge={
            props.kasirRole === 'owner' 
              ? totalUnreadCount > 0 
              : (kasirLateHistory.length > 0 || activePesanMendadak)
          }
          notifBadgeCount={
            props.kasirRole === 'owner' 
              ? totalUnreadCount 
              : (kasirLateHistory.length + (activePesanMendadak ? 1 : 0))
          }
          onNotifClick={() => {
            if (props.kasirRole === 'owner') {
              setShowNotifModal(true);
            } else {
              setShowKasirNotif(!showKasirNotif);
            }
          }}
          notifPopupContent={undefined}
        />

        {/* POPUP NOTIFIKASI KASIR (LONCENG) - DI ATAS KOLOM KASIR/TANGGAL & SALDO */}
        {props.kasirRole !== 'owner' && showKasirNotif && (
          <div className="fixed inset-0 z-[9999] flex justify-end items-start p-3 pt-14 pointer-events-none">
            {/* Backdrop transparan untuk klik luar menutup popup */}
            <div 
              className="fixed inset-0 bg-black/25 backdrop-blur-[1px] pointer-events-auto animate-in fade-in duration-200"
              onClick={() => setShowKasirNotif(false)}
            />
            
            {/* Floating popup content */}
            <div className="relative w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.35)] border border-slate-100 overflow-hidden z-10 pointer-events-auto animate-in slide-in-from-top-3 fade-in duration-200">
              <div className="px-4 py-3 bg-gradient-to-r from-rose-50 to-red-50 border-b border-rose-100 flex items-center justify-between">
                <h4 className="text-[11px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-rose-200/50 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-bell text-[10px]"></i>
                  </div>
                  PEMBERITAHUAN
                </h4>
                <div className="flex items-center gap-1.5">
                  {kasirLateHistory.length > 0 && (
                    <button 
                      onClick={handleClearLateNotifs}
                      className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-600 text-[9px] font-black rounded-full shadow-xs border border-rose-200 transition-all cursor-pointer active:scale-95"
                    >
                      HAPUS
                    </button>
                  )}
                  <button 
                    onClick={() => setShowKasirNotif(false)}
                    className="w-6 h-6 rounded-full bg-rose-100/70 hover:bg-rose-200 text-rose-600 flex items-center justify-center transition-colors cursor-pointer text-[10px] font-black active:scale-90"
                    title="Tutup"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-3 space-y-3 bg-slate-50/50 hide-scrollbar">
                
                {/* Show Pesan Mendadak if exists */}
                {activePesanMendadak && (
                  <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-sm flex items-start gap-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                    <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                      <i className="fa-solid fa-bullhorn text-[11px]"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Pesan Owner</p>
                      <p className="text-[11px] font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">{activePesanMendadak}</p>
                    </div>
                  </div>
                )}

                {kasirLateHistory.length === 0 && !activePesanMendadak ? (
                  <div className="py-8 flex flex-col items-center justify-center opacity-50">
                    <i className="fa-regular fa-bell-slash text-2xl text-slate-300 mb-2"></i>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Belum ada notifikasi</p>
                  </div>
                ) : (
                  kasirLateHistory.map((late, i) => (
                    <div key={i} className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-sm flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{late.tanggal}</p>
                          <span className="text-sm font-black text-slate-800">{late.jam}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">Telat {late.lateMins}m</span>
                          <p className="text-[8px] font-bold text-slate-400 mt-1.5 uppercase">{late.shiftName}</p>
                        </div>
                      </div>
                      {late.alasan_telat && (
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 mt-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">ALASAN:</p>
                          <p className="text-[10px] font-bold text-slate-700 leading-relaxed">{late.alasan_telat}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      <div className="mx-1.5 mb-3 mt-[-1.25rem] relative z-[40]">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-500 rounded-t-[1.5rem] rounded-b-[2rem] shadow-lg border-[2px] border-white overflow-hidden relative">
          
          <div className="absolute top-3 w-full flex justify-center gap-1.5 z-20">
            <div onClick={() => document.getElementById('blue-carousel')?.scrollTo({left:0, behavior:'smooth'})} className={cn("h-1 rounded-full cursor-pointer transition-all", blueCardIndex === 0 ? "w-3.5 bg-white" : "w-1.5 bg-white/40")}></div>
            <div onClick={() => document.getElementById('blue-carousel')?.scrollTo({left: 9999, behavior:'smooth'})} className={cn("h-1 rounded-full cursor-pointer transition-all", blueCardIndex === 1 ? "w-3.5 bg-white" : "w-1.5 bg-white/40")}></div>
          </div>

          <div id="blue-carousel" onScroll={(e) => { const el = e.currentTarget; setBlueCardIndex(Math.round(el.scrollLeft / el.clientWidth)); }} className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar w-full h-full pb-4 pt-6 px-4 gap-4" style={{ scrollBehavior: 'smooth' }}>
            {/* Slide 1: Aset Bank & Laci Kasir */}
            <div className="snap-center min-w-full flex justify-between gap-3">
              <div className="flex-1 flex flex-col justify-center gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full border border-white/40 bg-white/10 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-building-columns text-[12px] text-white"></i>
                  </div>
                  <p className="text-[11px] font-bold text-white truncate">Aset Bank</p>
                </div>
                <p className="text-lg font-black text-white leading-none truncate">{formatRupiah(props.saldoBank)}</p>
              </div>
              
              <div className="w-[1px] h-12 bg-white/20 shrink-0 rounded-full"></div>
              
              <div className="flex-1 flex flex-col justify-center gap-1.5 pl-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full border border-white/40 bg-white/10 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-cash-register text-[12px] text-white"></i>
                  </div>
                  <p className="text-[11px] font-bold text-white truncate">Laci Kasir</p>
                </div>
                <p className="text-lg font-black text-white leading-none truncate">{formatRupiah(ownerTotalLaci)}</p>
              </div>
            </div>
            {/* Slide 2: Total Aset Likuid & Total Aset Masuk */}
            <div className="snap-center min-w-full flex justify-between gap-3">
              <div className="flex-1 flex flex-col justify-center gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full border border-white/40 bg-white/10 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-vault text-[12px] text-white"></i>
                  </div>
                  <p className="text-[11px] font-bold text-white truncate">Total Aset Likuid</p>
                </div>
                <p className="text-lg font-black text-white leading-none truncate">{formatRupiah(props.saldoBank + ownerTotalLaci)}</p>
              </div>
              
              <div className="w-[1px] h-12 bg-white/20 shrink-0 rounded-full"></div>
              
              <div className="flex-1 flex flex-col justify-center gap-1.5 pl-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full border border-white/40 bg-white/10 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-hand-holding-dollar text-[12px] text-white"></i>
                  </div>
                  <p className="text-[11px] font-bold text-white truncate">Total Aset Masuk</p>
                </div>
                <p className="text-lg font-black text-white leading-none truncate">{formatRupiah(ownerKasModal + ownerPenjualanDigital + ownerTotalAksesoris + ownerTotalAdmin)}</p>
              </div>
            </div>
          </div>
          
          <div className="mx-4 mb-4 h-[1px] bg-white/10 rounded-full"></div>
          
          {/* TRANSAKSI 5 KATEGORI SEJEJER (FREE HORIZONTAL SCROLL) */}
          <div className="px-3 mb-2.5 relative z-20">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 py-2.5 px-1 shadow-inner">
              <div 
                className="flex items-center overflow-x-auto hide-scrollbar w-full touch-pan-x select-none cursor-grab active:cursor-grabbing"
                style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
                onMouseDown={(e) => {
                  const el = e.currentTarget;
                  const startX = e.pageX - el.offsetLeft;
                  const scrollLeft = el.scrollLeft;
                  const onMouseMove = (ev: MouseEvent) => {
                    const x = ev.pageX - el.offsetLeft;
                    el.scrollLeft = scrollLeft - (x - startX);
                  };
                  const onMouseUp = () => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                  };
                  window.addEventListener('mousemove', onMouseMove);
                  window.addEventListener('mouseup', onMouseUp);
                }}
              >
                {/* 1. TRX HARI INI */}
                <div className="min-w-[95px] flex-1 px-2.5 flex flex-col items-center justify-center text-center shrink-0">
                  <p className="text-[9px] font-black text-sky-200 uppercase tracking-wider mb-0.5 whitespace-nowrap">TRX HARI INI</p>
                  <p className="text-xs font-black text-white tabular-nums leading-tight mb-0.5 whitespace-nowrap">{ownerTotalTrx}</p>
                  <p className="text-[9px] font-medium text-blue-100/75 leading-none whitespace-nowrap">Jml Trx</p>
                </div>

                <div className="w-[1px] h-7 bg-white/20 shrink-0 rounded-full"></div>

                {/* 2. ADMIN / LABA */}
                <div className="min-w-[105px] flex-1 px-2.5 flex flex-col items-center justify-center text-center shrink-0">
                  <p className="text-[9px] font-black text-emerald-300 uppercase tracking-wider mb-0.5 whitespace-nowrap">ADMIN / LABA</p>
                  <p className="text-xs font-black text-emerald-200 tabular-nums leading-tight mb-0.5 whitespace-nowrap">{formatRupiah(ownerTotalAdmin)}</p>
                  <p className="text-[9px] font-medium text-blue-100/75 leading-none whitespace-nowrap">Fee & Laba</p>
                </div>

                <div className="w-[1px] h-7 bg-white/20 shrink-0 rounded-full"></div>

                {/* 3. UANG MASUK */}
                <div className="min-w-[105px] flex-1 px-2.5 flex flex-col items-center justify-center text-center shrink-0">
                  <p className="text-[9px] font-black text-indigo-200 uppercase tracking-wider mb-0.5 whitespace-nowrap">UANG MASUK</p>
                  <p className="text-xs font-black text-white tabular-nums leading-tight mb-0.5 whitespace-nowrap">{formatRupiah(ownerTotalUangMasuk)}</p>
                  <p className="text-[9px] font-medium text-blue-100/75 leading-none whitespace-nowrap">Penjualan</p>
                </div>

                <div className="w-[1px] h-7 bg-white/20 shrink-0 rounded-full"></div>

                {/* 4. TARIK TUNAI */}
                <div className="min-w-[105px] flex-1 px-2.5 flex flex-col items-center justify-center text-center shrink-0">
                  <p className="text-[9px] font-black text-rose-300 uppercase tracking-wider mb-0.5 whitespace-nowrap">TARIK TUNAI</p>
                  <p className="text-xs font-black text-rose-200 tabular-nums leading-tight mb-0.5 whitespace-nowrap">{formatRupiah(ownerTotalTarik)}</p>
                  <p className="text-[9px] font-medium text-blue-100/75 leading-none whitespace-nowrap">Laci Keluar</p>
                </div>

                <div className="w-[1px] h-7 bg-white/20 shrink-0 rounded-full"></div>

                {/* 5. DEPOSIT SALDO */}
                <div className="min-w-[105px] flex-1 px-2.5 flex flex-col items-center justify-center text-center shrink-0">
                  <p className="text-[9px] font-black text-amber-300 uppercase tracking-wider mb-0.5 whitespace-nowrap">DEPOSIT SALDO</p>
                  <p className="text-xs font-black text-amber-200 tabular-nums leading-tight mb-0.5 whitespace-nowrap">{formatRupiah(ownerIsiBank)}</p>
                  <p className="text-[9px] font-medium text-blue-100/75 leading-none whitespace-nowrap">Isi Bank</p>
                </div>

              </div>
            </div>
          </div>
          
          <div className="px-4 pb-4 flex flex-col gap-3 relative z-10">
             <div className="flex gap-3">
               <button onClick={() => props.setActiveView('view-isi-saldo')} className="flex-1 border border-white/30 bg-white/10 text-white rounded-xl py-2 px-3 flex items-center justify-between gap-1.5 font-bold text-[10px] shadow-sm active:scale-95 transition">
                 <div className="flex items-center gap-2"><i className="fa-solid fa-coins text-[11px] text-white/80"></i> Kelola Aset</div>
                 <i className="fa-solid fa-arrow-right text-[9px] text-white/80"></i>
               </button>
               <button onClick={() => setShowRincian(true)} className="flex-1 border border-white/30 bg-white/10 text-white rounded-xl py-2 px-3 flex items-center justify-between gap-1.5 font-bold text-[10px] shadow-sm active:scale-95 transition">
                 <div className="flex items-center gap-2"><i className="fa-solid fa-box-archive text-[11px] text-white/80"></i> Rincian Laci</div>
                 <i className="fa-solid fa-arrow-right text-[9px] text-white/80"></i>
               </button>
             </div>


          </div>
        </div>
        
        {/* WHITE CAROUSEL HAS BEEN MOVED INTO BLUE CARD */}
      </div>

      <div className="mx-1.5 mb-0.5 relative z-50 space-y-2">
        
        {/* Pesan Mendadak Popup (Di Atas Kolom Kasir/Tanggal & Saldo) */}
        {props.kasirRole !== 'owner' && activePesanMendadak && !dismissedPesanPopup && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-16 pointer-events-none animate-in fade-in duration-300">
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] pointer-events-auto"
              onClick={() => {
                setDismissedPesanPopup(true)
                sessionStorage.setItem('alphaPro_pesan_dismissed', 'true')
              }}
            />
            <div className="relative w-80 max-w-[92vw] bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] border border-gray-100 overflow-hidden z-10 pointer-events-auto animate-in slide-in-from-top-4 duration-300">
              <div className="p-3.5 bg-red-50/80 border-b border-red-100/50 flex items-center justify-between">
                <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1.5">
                  <i className="fa-solid fa-bell"></i> Riwayat Pemberitahuan
                </h4>
                <button onClick={() => {
                  setDismissedPesanPopup(true)
                  sessionStorage.setItem('alphaPro_pesan_dismissed', 'true')
                }} className="w-6 h-6 rounded-full bg-red-100/80 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors shadow-sm cursor-pointer">
                  <i className="fa-solid fa-xmark text-[10px]"></i>
                </button>
              </div>
              <div className="p-2.5 bg-gray-50/50">
                <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-sm flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0 mt-0.5">
                    <i className="fa-solid fa-bullhorn text-[11px]"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1.5">Pesan Owner</p>
                    <p className="text-[12px] font-bold text-gray-900 whitespace-pre-wrap leading-relaxed">{activePesanMendadak}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lateness Popup */}
        {props.kasirRole !== 'owner' && todayLateness && !dismissedLatePopup && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-xl animate-in fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-inner">
                  <i className="fa-solid fa-triangle-exclamation text-lg"></i>
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-red-700 uppercase tracking-widest">Peringatan Terlambat!</h4>
                  <p className="text-[9px] text-red-600 font-bold mt-0.5 leading-snug">Absen Anda tercatat jam {todayLateness.jam} (Telat {todayLateness.lateMins} menit) pada sesi {todayLateness.shiftName}.</p>
                </div>
              </div>
              <button onClick={() => setDismissedLatePopup(true)} className="w-6 h-6 rounded-full bg-red-100/50 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors shrink-0">
                <i className="fa-solid fa-xmark text-[10px]"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mx-1.5 mb-0.5 relative z-[60] space-y-2">
        {props.kasirRole === 'owner' && (
          <div className="mb-3 space-y-2">
            {/* Unified Minimalist Control Bar: [1 Kolom 2 Isi Pilihan (Pantau Toko & Mode Kasir)] + [1 Icon Lonceng Button] */}
            {/* Dropdowns moved to Blue Card */}

            {/* Notification Banners (Minimal & Sleek) */}
            {!isNotificationsHidden && (
              <div className="space-y-2 animate-in fade-in duration-300">
                {/* 1. Bonus Notification Banner */}
                {bonusKasirList.length > 0 && !isBonusDismissed && (
                  <div 
                    onClick={() => bonusKasirList.forEach(name => markNotifAsRead(`bonus_${name}_6m_${currentTodayStr.substring(0, 7)}`))}
                    className="p-2.5 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl shadow-xs text-white flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 shrink-0 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xs border border-white/30">
                        <i className="fa-solid fa-gift text-xs"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-green-100 uppercase tracking-widest leading-none mb-0.5">🎉 Bonus 6 Bulan</p>
                        {!isBonusMinimized ? (
                          <p className="text-[10px] font-bold leading-tight text-white opacity-95">
                            Kasir <span className="font-black text-yellow-200">{bonusKasirList.join(', ')}</span> mencapai kelipatan 6 bulan kerja! Berikan bonus apresiasi.
                          </p>
                        ) : (
                          <p className="text-[9px] font-bold text-yellow-200 opacity-90 truncate">
                            Kasir: {bonusKasirList.join(', ')} (Diminimize)
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const next = !isBonusMinimized
                          setIsBonusMinimized(next)
                          localStorage.setItem('alphaPro_owner_bonus_minimized', String(next))
                        }}
                        title={isBonusMinimized ? "Perbesar" : "Minimize"}
                        className="w-5 h-5 rounded-md bg-black/20 hover:bg-black/40 text-white font-black text-[10px] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                      >
                        {isBonusMinimized ? '➕' : '➖'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          bonusKasirList.forEach(name => markNotifAsRead(`bonus_${name}_6m_${currentTodayStr.substring(0, 7)}`))
                          setIsBonusDismissed(true)
                          localStorage.setItem('alphaPro_owner_bonus_dismissed', 'true')
                        }}
                        title="Tutup Notifikasi"
                        className="w-5 h-5 rounded-md bg-black/20 hover:bg-rose-600 text-white font-black text-[10px] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}



                {/* 3. Rent Warning Banner */}
                {rentReminder && !isRentDismissed && (
                  <div 
                    onClick={() => markNotifAsRead(`rent_${rentReminder.dueDateStr}`)}
                    className="p-2.5 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl shadow-xs text-white flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 shrink-0 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xs border border-white/30">
                        <i className="fa-solid fa-file-invoice-dollar text-xs"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-rose-100 uppercase tracking-widest leading-none mb-0.5">⚠️ Jatuh Tempo Sewa</p>
                        {!isRentMinimized ? (
                          <p className="text-[10px] font-bold leading-tight text-white opacity-95">
                            Sewa Toko senilai <span className="font-black text-yellow-200">Rp {rentReminder.amount.toLocaleString('id-ID')}</span> jatuh tempo {rentReminder.diffDays === 0 ? 'HARI INI' : `dalam ${rentReminder.diffDays} hari`} ({rentReminder.dueDateStr}).
                          </p>
                        ) : (
                          <p className="text-[9px] font-bold text-yellow-200 opacity-90 truncate">
                            Jatuh tempo: {rentReminder.diffDays === 0 ? 'Hari Ini' : `H-${rentReminder.diffDays}`} (Diminimize)
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const next = !isRentMinimized
                          setIsRentMinimized(next)
                          localStorage.setItem('alphaPro_owner_rent_minimized', String(next))
                        }}
                        title={isRentMinimized ? "Perbesar" : "Minimize"}
                        className="w-5 h-5 rounded-md bg-black/20 hover:bg-black/40 text-white font-black text-[10px] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                      >
                        {isRentMinimized ? '➕' : '➖'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markNotifAsRead(`rent_${rentReminder.dueDateStr}`)
                          setIsRentDismissed(true)
                          localStorage.setItem('alphaPro_owner_rent_dismissed', 'true')
                        }}
                        title="Tutup Notifikasi"
                        className="w-5 h-5 rounded-md bg-black/20 hover:bg-rose-900 text-white font-black text-[10px] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}


          </div>
        )}

        {/* QUICK NOTIFICATION MODAL (LONCENG POPUP) */}
        {showNotifModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    <i className="fa-solid fa-bell"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Notifikasi Terbaru Owner</h3>
                    <p className="text-[10px] font-bold text-slate-400">Peringatan & informasi penting toko Anda</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {totalUnreadCount > 0 && (
                    <button
                      onClick={markAllNotifsAsRead}
                      className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 cursor-pointer active:scale-95 transition-all"
                    >
                      <i className="fa-solid fa-check-double mr-1 text-[8px]"></i> Tandai Dibaca
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifModal(false)}
                    className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Quick Notification List */}
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {bonusKasirList.length > 0 && (
                  <div 
                    onClick={() => bonusKasirList.forEach(name => markNotifAsRead(`bonus_${name}_6m_${currentTodayStr.substring(0, 7)}`))}
                    className={cn(
                      "p-3 rounded-2xl flex items-start gap-3 transition-all cursor-pointer border",
                      unreadBonusKasirList.length > 0
                        ? "bg-emerald-50 border-emerald-300 shadow-xs"
                        : "bg-slate-50 border-slate-200 opacity-75"
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-gift text-xs"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] font-black text-emerald-900">🎉 Bonus 6 Bulan Kasir</p>
                        {unreadBonusKasirList.length > 0 ? (
                          <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">BARU</span>
                        ) : (
                          <span className="text-slate-400 text-[8px] font-bold">DIBACA</span>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                        Kasir <span className="font-black">{bonusKasirList.join(', ')}</span> mencapai kelipatan 6 bulan kerja!
                      </p>
                    </div>
                  </div>
                )}


              </div>

              {/* Toggle Text Banners Option */}
              <div className="p-2.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                <span className="text-[10px] font-bold text-slate-600">Text Banner Beranda</span>
                <button
                  onClick={() => {
                    const next = !isNotificationsHidden
                    setIsNotificationsHidden(next)
                    localStorage.setItem('alphaPro_owner_notifications_hidden', String(next))
                  }}
                  className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <i className={cn("fa-solid text-[9px]", isNotificationsHidden ? "fa-eye" : "fa-eye-slash")}></i>
                  {isNotificationsHidden ? "Tampilkan Text" : "Sembunyikan Text"}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setShowNotifModal(false)
                    props.setActiveView('view-owner-profit')
                  }}
                  className="w-full bg-slate-900 hover:bg-black text-white font-black text-xs py-2.5 rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                  <span>Lihat Riwayat Lengkap</span>
                </button>
              </div>
            </div>
          </div>
        )}


      </div>

      {/* Banner Carousel Column */}
      {(props.mainAnnouncement || (props.runningTexts && props.runningTexts.some(t => t.trim() !== ''))) && (
        (() => {
          const activeTexts = [
            props.mainAnnouncement ? { text: props.mainAnnouncement, isMain: true } : null,
            ...(props.runningTexts || [])
              .filter(t => t.trim() !== '')
              .map(t => ({ text: t, isMain: false }))
          ].filter(Boolean) as { text: string, isMain: boolean }[];
          
          return <BannerCarousel texts={activeTexts} />;
        })()
      )}
      
      {showRincian && (
        <div className="absolute inset-0 z-[110] bg-white flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 pt-6 pb-6 px-6 text-white shadow-lg relative shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowRincian(false)} 
                className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
              >
                <i className="fa-solid fa-arrow-left text-base"></i>
              </button>
              <div>
                <h3 className="font-black text-xl tracking-tight uppercase leading-none">RINCIAN KEUANGAN</h3>
                <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest mt-1 opacity-70">Arus Kas Hari Ini</p>
              </div>
            </div>
          </div>

          {/* Scrollable Content Section */}
          <div className="flex-1 overflow-y-auto bg-gray-50/50 pb-28">
            <div className="p-2.5 space-y-2">
              
              {/* SALDO BANK CARD */}
              <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-blue-50 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <i className="fa-solid fa-building-columns text-xs"></i>
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-blue-900 uppercase leading-none">SALDO BANK</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Aset Digital</p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2.5 rounded-xl border border-blue-400 relative overflow-hidden">
                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-[9px] font-black text-blue-50 uppercase tracking-widest">Total Saldo Bank</span>
                    <span className="text-base font-black text-white tabular-nums">{formatRupiah(props.saldoBank)}</span>
                  </div>
                </div>
              </div>

              <KasSummary 
                kasModal={kasModal}
                penjualanDigital={penjualanDigital}
                penjualanAksesoris={props.totalAksesoris}
                totalAdminFee={props.totalAdmin}
                penjualanVoucherTunai={props.penjualanVoucherTunai}
                tarikTunaiNasabah={props.totalTarik}
                adminDalamNonTunai={kasirAdminDalam}
                transaksiKhusus={props.totalKhusus || 0}
                transaksiNonTunai={props.totalNonTunai || 0}
              />
              {/* ACTION BUTTON */}
              <button 
                onClick={() => {
                  setShowRincian(false);
                  props.setActiveView('view-laporan');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] mt-0"
              >
                <i className="fa-solid fa-chart-simple text-xs"></i>
                Laporan Lengkap
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MENU KATEGORI LAYANAN */}
      <div className="mx-1.5 mb-6 rounded-[24px] overflow-hidden shadow-sm border border-gray-100 bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0047A5] to-[#00A1FF] px-2.5 py-1.5 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <i className="fa-solid fa-wand-magic-sparkles text-white text-[11px]"></i>
            </div>
            <div className="flex flex-col">
              <p className="text-white/90 text-[7px] font-bold tracking-widest uppercase leading-none mb-0.5">Kategori Layanan</p>
              <h3 className="text-white font-black text-[9px] leading-none relative pb-1">
                Mudah, Cepat & Ringkas
                <div className="absolute bottom-0 left-0 w-6 h-[1.5px] bg-green-400 rounded-full"></div>
              </h3>
            </div>
          </div>

          {props.kasirRole === 'owner' && (
            <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
              {/* Owner Selectors (Clearer & Larger) */}
              <div className="flex items-center bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-2 py-1 shadow-sm gap-2 w-full max-w-[220px] transition-colors">
                
                <div className="flex-1 min-w-0 relative">
                  <select
                    value={props.pantauStoreId || 'all'}
                    onChange={(e) => props.setPantauStoreId && props.setPantauStoreId(e.target.value)}
                    className="w-full bg-transparent text-white text-[9px] sm:text-[10px] font-black outline-none border-none cursor-pointer appearance-none pr-4 truncate font-sans py-0.5"
                  >
                    <option value="all" className="text-slate-800">SEMUA TOKO</option>
                    {(props.stores || []).map((store) => (
                      <option key={store.id} value={store.id} className="text-slate-800">{store.name}</option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-0 top-1/2 -translate-y-1/2 text-[8px] text-white/70 pointer-events-none"></i>
                </div>

                <div className="w-[1px] h-4 bg-white/30 shrink-0"></div>

                <div className="flex-1 min-w-0 relative">
                  <select
                    value={props.filterKasir || 'Semua'}
                    onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                    disabled={props.pantauStoreId === 'all'}
                    className={cn(
                      "w-full bg-transparent text-[9px] sm:text-[10px] font-black outline-none border-none cursor-pointer appearance-none pr-4 truncate font-sans py-0.5",
                      props.pantauStoreId === 'all' ? "text-white/50 cursor-not-allowed" : "text-white"
                    )}
                  >
                    <option value="Semua" className="text-slate-800">SEMUA KASIR</option>
                    {props.kasirList && Object.entries(props.kasirList).filter(([id, acc]) => id.toLowerCase() !== 'owner' && (acc.role || '').toLowerCase() !== 'owner').map(([id, acc]) => (
                      <option key={id} value={id} className="text-slate-800">{acc.name}</option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-0 top-1/2 -translate-y-1/2 text-[8px] text-white/70 pointer-events-none"></i>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Grid Menu */}
        <div className="p-5 grid grid-cols-4 gap-y-6 gap-x-2 text-center bg-[#F9FBFF]">
          {[
            { id: 'view-isi-saldo', label: 'Deposit', icon: 'fa-wallet', color: 'bg-[#007AFF]', shadow: 'shadow-blue-500/40' },
            { id: 'view-jurnal', label: 'Jurnal', icon: 'fa-book-open', color: 'bg-[#A03EFA]', shadow: 'shadow-purple-500/40', isJurnal: true },
            { id: 'view-nota', label: 'Print', icon: 'fa-print', color: 'bg-[#00C875]', shadow: 'shadow-green-500/40' },
            { id: 'view-kalender', label: 'Kalender', icon: 'fa-calendar-days', color: 'bg-[#6F42C1]', shadow: 'shadow-purple-700/40' },
            { id: 'view-kontak', label: 'Kontak', icon: 'fa-user', color: 'bg-[#00B4D8]', shadow: 'shadow-cyan-500/40' },
            { id: 'view-kasbon', label: 'Kasbon', icon: 'fa-wallet', color: 'bg-[#FD7E14]', shadow: 'shadow-orange-500/40' },
            { id: 'view-stok-voucher', label: 'Voucher', icon: 'fa-ticket-simple', color: 'bg-[#F50057]', shadow: 'shadow-pink-500/40' },
            { id: 'view-pos-kasir', label: 'Pos Kasir', icon: 'fa-store', color: 'bg-[#0056B3]', shadow: 'shadow-blue-800/40' },
          ].map((item) => (
            <div 
              key={item.id} 
              onClick={() => {
                if ((item as any).isJurnal && props.onJurnalClick) {
                  props.setActiveView('view-laporan')
                  props.onJurnalClick()
                } else {
                  props.setActiveView(item.id)
                }
              }}
              className="cursor-pointer group flex flex-col items-center"
            >
              <div className={cn("w-[50px] h-[50px] rounded-[18px] flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform mb-2", item.color, item.shadow)}>
                <i className={cn("fa-solid text-xl", item.icon)}></i>
              </div>
              <p className="text-[10px] font-bold text-gray-800 tracking-tight">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {props.kasirRole === 'owner' && (
        <div className="px-1.5 mb-4">
          {/* NOTIFIKASI SELISIH AUDIT (HARI INI) */}
          {(() => {
            const todayStr = getLocalDateString();
            const badAudits = auditHistory.filter(h => h.tanggalAsli === todayStr && Math.abs(h.selisih) > 100000);
            if (badAudits.length === 0) return null;
            
            return (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-r-2xl p-4 shadow-sm animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-500 shrink-0">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[11px] font-black text-red-800 uppercase tracking-widest">Peringatan Audit Laci</h4>
                    <p className="text-[9px] text-red-600 font-bold mt-0.5">
                      Hari ini terdapat selisih fisik &gt; Rp100.000:
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {badAudits.map((a, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] font-black">
                          <span className="text-red-700">- {a.kasirName}</span>
                          <span className={a.selisih < 0 ? "text-red-600" : "text-green-600"}>
                            {a.selisih < 0 ? "KURANG" : "LEBIH"} {formatRupiah(Math.abs(a.selisih))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {props.kasirRole === 'owner' && !props.isPc && (() => {
        // Menu Section 1: Pengaturan Owner (HR - berlaku untuk semua toko, dengan filter toko di atas)
        const OWNER_HR_IDS = ['view-owner-absen', 'view-owner-gaji', 'view-owner-izin', 'view-owner-catatan'];
        const OWNER_HR_MENU = [
          { id: 'view-owner-absen',   title: 'Absen',   desc: 'Kehadiran kasir',  icon: 'fa-fingerprint',    color: 'bg-teal-500' },
          { id: 'view-owner-gaji',    title: 'Gajih',   desc: 'Data gaji kasir',  icon: 'fa-dollar-sign',    color: 'bg-green-600' },
          { id: 'view-owner-izin',    title: 'Izin',    desc: 'Kelola izin',      icon: 'fa-calendar-day',   color: 'bg-orange-500' },
          { id: 'view-owner-catatan', title: 'Catatan', desc: 'Catatan & belanja', icon: 'fa-clipboard-list', color: 'bg-amber-500' },
        ];
        // Menu Section 2: Pengaturan Toko (semua menu selain HR di atas)
        const TOKO_MENU_IDS = menuOrder.filter(id => !OWNER_HR_IDS.includes(id));

        return (
          <div className="px-1.5 mb-8 space-y-4">

            {/* ── SECTION 1: PENGATURAN OWNER ── */}
            <div>
              {/* Header Section 1 */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-teal-500 rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-users text-white text-xs"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Pengaturan Owner</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">SDM & Karyawan</p>
                  </div>
                </div>
                {/* Filter Toko untuk section Owner */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <i className="fa-solid fa-store text-teal-500 text-[9px] shrink-0"></i>
                  <div className="relative">
                    <select
                      value={props.pantauStoreId || 'all'}
                      onChange={(e) => props.setPantauStoreId && props.setPantauStoreId(e.target.value)}
                      className="bg-transparent text-slate-700 text-[9px] font-black outline-none border-none cursor-pointer appearance-none pr-3 font-sans max-w-[90px]"
                    >
                      <option value="all">Semua Toko</option>
                      {(props.stores || []).map((store) => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-0 top-1/2 -translate-y-1/2 text-[7px] text-slate-400 pointer-events-none"></i>
                  </div>
                </div>
              </div>

              {/* Grid Menu Pengaturan Owner */}
              <div className="grid grid-cols-4 gap-y-6 gap-x-2 text-center py-2">
                {OWNER_HR_MENU.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => props.setActiveView(item.id)}
                    className="cursor-pointer group flex flex-col items-center"
                  >
                    <div className={cn("w-[50px] h-[50px] rounded-[18px] flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform mb-2", item.color)}>
                      <i className={`fa-solid ${item.icon} text-xl`}></i>
                    </div>
                    <p className="text-[10px] font-bold text-gray-800 tracking-tight">{item.title}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── DIVIDER ── */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-100"></div>
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Panel Toko</span>
              <div className="flex-1 h-px bg-slate-100"></div>
            </div>

            {/* ── SECTION 2: PENGATURAN TOKO ── */}
            <div>
              {/* Header Section 2 */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-500 rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-shield-halved text-white text-xs"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Pengaturan Toko</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Operasional & Data</p>
                  </div>
                </div>
                {/* Tombol Edit Susunan */}
                <button
                  onClick={() => {
                    setIsEditMenuMode(!isEditMenuMode)
                    setSelectedForSwap(null)
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-black transition-all",
                    isEditMenuMode
                      ? "bg-amber-500 border-amber-400 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600 active:scale-95"
                  )}
                >
                  <i className={cn("fa-solid text-[9px]", isEditMenuMode ? "fa-check" : "fa-pen")}></i>
                  {isEditMenuMode ? "Selesai" : "Susun"}
                </button>
              </div>

              {isEditMenuMode && (
                <div className="mb-3 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-center animate-in fade-in slide-in-from-top-2">
                  <p className="text-[9px] font-black text-amber-800 uppercase">Mode Edit Aktif — Ketuk 2 menu untuk tukar posisi</p>
                </div>
              )}

              {/* Grid Menu Pengaturan Toko */}
              <div className="grid grid-cols-4 gap-y-6 gap-x-2 text-center py-2">
                {TOKO_MENU_IDS.map((id) => {
                  const item = DEFAULT_OWNER_MENU.find(m => m.id === id)
                  if (!item) return null
                  const isSelected = selectedForSwap === item.id
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleMenuClick(item.id)}
                      className={cn(
                        "cursor-pointer group flex flex-col items-center relative",
                        isEditMenuMode ? "animate-pulse-slow" : "",
                        isSelected ? "scale-105" : ""
                      )}
                    >
                      {isEditMenuMode && (
                        <div className={cn(
                          "absolute top-0 right-1 rounded-full w-4 h-4 flex items-center justify-center transition-colors z-10",
                          isSelected ? "bg-amber-500" : "bg-black/10"
                        )}>
                          <i className={cn("fa-solid fa-up-down-left-right text-[7px]", isSelected ? "text-white" : "text-gray-400")}></i>
                        </div>
                      )}
                      <div className={cn(
                        "w-[50px] h-[50px] rounded-[18px] flex items-center justify-center text-white shadow-lg transition-transform mb-2",
                        item.color,
                        isSelected ? "ring-2 ring-amber-500 ring-offset-2" : "",
                        isEditMenuMode && !isSelected ? "opacity-80 scale-90" : "active:scale-90 scale-100"
                      )}>
                        <i className={`fa-solid ${item.icon} text-xl`}></i>
                      </div>
                      <p className="text-[10px] font-bold text-gray-800 tracking-tight truncate">{item.title}</p>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )
      })()}
        </>
      )}

      {isOwnerSubView && (() => {
        const getSubViewDetails = () => {
          switch(activeOwnerSubView) {
            case 'monitor': return { title: 'KELOLA KASIR', color: 'from-blue-600 to-blue-800', icon: 'fa-users', desc: 'Pantau aktivitas dan kelola akun kasir Anda.' }
            case 'laporan': return { title: 'PROFIT & LABA ADMIN', color: 'from-emerald-700 to-teal-900', icon: 'fa-hand-holding-dollar', desc: 'Laba admin fee riwayat transaksi harian & tahunan.' }
            case 'grafik': return { title: 'GRAFIK TRANSAKSI', color: 'from-emerald-500 to-emerald-700', icon: 'fa-chart-simple', desc: 'Visualisasi data transaksi harian dan bulanan.' }
            case 'performa': return { title: 'PERFORMA KASIR', color: 'from-purple-600 to-purple-800', icon: 'fa-chart-line', desc: 'Analisis kecepatan dan volume transaksi per kasir.' }
            case 'absen': return { title: 'ABSENSI KASIR', color: 'from-teal-500 to-teal-700', icon: 'fa-fingerprint', desc: 'Rekapitulasi kehadiran dan jam kerja kasir.' }
            case 'izin': return { title: 'IZIN KARYAWAN', color: 'from-orange-500 to-orange-700', icon: 'fa-calendar-day', desc: 'Kelola permohonan izin dan cuti karyawan.' }
            case 'gaji': return { title: 'DATA GAJI KASIR', color: 'from-green-600 to-green-800', icon: 'fa-dollar-sign', desc: 'Perhitungan dan riwayat penggajian kasir.' }
            case 'saldo': return { title: 'PENGATURAN SALDO', color: 'from-emerald-600 to-emerald-800', icon: 'fa-wallet', desc: 'Alokasi dan penambahan modal harian kasir.' }
            case 'audit': return { title: 'AUDIT KASIR', color: 'from-purple-600 to-purple-800', icon: 'fa-file-signature', desc: 'Pemeriksaan kesesuaian fisik uang di laci.' }
            case 'catatan': return { title: 'CATATAN OWNER', color: 'from-amber-500 to-orange-600', icon: 'fa-clipboard-list', desc: 'Catat pengingat penting dan daftar belanja.' }
            case 'profit': return { title: 'RIWAYAT NOTIFIKASI TOKO', color: 'from-indigo-600 to-blue-800', icon: 'fa-bell', desc: 'Riwayat lengkap notifikasi sistem, bonus kasir, dan audit toko.' }
            default: return { title: 'PENGATURAN', color: 'from-slate-600 to-slate-800', icon: 'fa-gear', desc: 'Pengaturan toko, transfer, dan backup data.' }
          }
        };
        const { title, color, icon, desc } = getSubViewDetails();
        // Nama toko aktif untuk ditampilkan di header
        const activePantauStore = (props.stores || []).find(s => s.id === props.pantauStoreId)
        const storeLabel = activePantauStore?.name || (props.pantauStoreId && props.pantauStoreId !== 'all' ? props.pantauStoreId : null)

        return (
          <div className={cn(
            "bg-white flex flex-col animate-in fade-in duration-300",
            props.isPc ? "h-full rounded-[2rem] overflow-hidden" : "absolute inset-0 z-[100] slide-in-from-right"
          )}>
            {/* Header */}
            <div className={cn(
              "text-white flex justify-between items-center relative overflow-hidden",
              props.isPc ? "p-8 shadow-md" : "p-4 shadow-lg",
              `bg-gradient-to-r ${color}`
            )}>
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
               
               {props.isPc ? (
                 <div className="flex items-center gap-5 relative z-10">
                   <div className="w-14 h-14 rounded-[1.25rem] bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                     <i className={`fa-solid ${icon} text-2xl drop-shadow-md`}></i>
                   </div>
                   <div>
                       <h3 className="font-black text-2xl tracking-tight uppercase leading-none drop-shadow-md">{title}</h3>
                       <div className="mt-1.5 inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full relative transition-colors cursor-pointer">
                         <i className="fa-solid fa-store text-[9px] text-white/80"></i>
                         <select
                           value={props.pantauStoreId || 'all'}
                           onChange={(e) => props.setPantauStoreId && props.setPantauStoreId(e.target.value)}
                           className="bg-transparent text-white/95 text-[10px] font-black outline-none border-none cursor-pointer appearance-none pr-4 uppercase tracking-widest font-sans text-center"
                         >
                           <option value="all" className="text-black">SEMUA TOKO</option>
                           {(props.stores || []).map((store) => (
                             <option key={store.id} value={store.id} className="text-black">{store.name}</option>
                           ))}
                         </select>
                         <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-white/70 pointer-events-none"></i>
                       </div>
                    </div>
                  </div>
               ) : (
                 <>
                   <button onClick={() => props.setActiveView('view-beranda')} className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all border border-white/20 active:scale-90 relative z-10">
                     <i className="fa-solid fa-arrow-left"></i>
                   </button>
                   <div className="text-center relative z-10">
                      <h3 className="font-black text-sm tracking-widest uppercase leading-none">{title}</h3>
                      <div className="mt-1 inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-2.5 py-0.5 rounded-full relative transition-colors cursor-pointer">
                        <i className="fa-solid fa-store text-[7px] text-white/80"></i>
                        <select
                          value={props.pantauStoreId || 'all'}
                          onChange={(e) => props.setPantauStoreId && props.setPantauStoreId(e.target.value)}
                          className="bg-transparent text-white/90 text-[8px] font-black outline-none border-none cursor-pointer appearance-none pr-3 uppercase tracking-widest font-sans text-center"
                        >
                          <option value="all" className="text-black">SEMUA TOKO</option>
                          {(props.stores || []).map((store) => (
                            <option key={store.id} value={store.id} className="text-black">{store.name}</option>
                          ))}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[6px] text-white/70 pointer-events-none"></i>
                      </div>
                    </div>
                 </>
               )}
               
               <button onClick={() => props.setActiveView('view-beranda')} className={cn(
                 "rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all border border-white/20 active:scale-90 relative z-10",
                 props.isPc ? "w-12 h-12" : "w-10 h-10"
               )}>
                 <i className="fa-solid fa-xmark text-lg"></i>
               </button>
            </div>

            {/* Sub-View Content */}
            <div className={cn("flex-1 overflow-y-auto custom-scrollbar bg-slate-50", props.isPc ? "p-8 flex flex-col items-center" : "p-5 pb-24")}>
              <div className={cn("w-full", props.isPc && "max-w-4xl")}>
            {activeOwnerSubView === 'monitor' && (
              <div className="space-y-4">
                {(!props.pantauStoreId || props.pantauStoreId === 'all') ? (
                  <div className="p-6 text-center bg-amber-50 border border-amber-100 rounded-2xl">
                    <i className="fa-solid fa-store-slash text-amber-500 text-3xl mb-3"></i>
                    <p className="text-xs font-black text-amber-800 uppercase tracking-widest">PILIH TOKO TERLEBIH DAHULU</p>
                    <p className="text-[10px] text-amber-600/80 font-bold uppercase mt-1">Silakan pilih salah satu toko dari dropdown di Beranda Utama untuk mengelola kasir.</p>
                  </div>
                ) : (
                  <>
                    {/* Shortcut to HR & Payroll */}
                    <button 
                      onClick={() => props.setActiveView('view-akun-karyawan')}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl flex items-center justify-between shadow-sm active:scale-95 transition-all mb-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <i className="fa-solid fa-users-gear text-sm"></i>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black uppercase tracking-widest">Manajemen SDM & Gaji Lengkap</p>
                          <p className="text-[9px] font-bold text-indigo-200 mt-1">Bonus, Riwayat Pembayaran & Foto Profil</p>
                        </div>
                      </div>
                      <i className="fa-solid fa-chevron-right text-xs"></i>
                    </button>

                    {/* Add Kasir Form */}
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                      <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3">Tambah / Edit Kasir</h4>
                      <div className="space-y-2">
                        <input type="text" placeholder="ID Kasir (contoh: kasir3)" value={kasirFormId} onChange={e => setKasirFormId(e.target.value)} disabled={!!editKasirId} className="w-full text-xs p-2 rounded-lg border outline-none font-bold disabled:bg-gray-100 disabled:text-gray-500" />
                        <input type="text" placeholder="Nama Kasir" value={kasirFormName} onChange={e => setKasirFormName(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                        <input type="text" placeholder="PIN (4-6 digit)" value={kasirFormPin} onChange={e => setKasirFormPin(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                        <input type="number" placeholder="Target TRX Harian (Opsional)" value={kasirFormTargetTrx} onChange={e => setKasirFormTargetTrx(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                        
                        {editKasirId && (
                          <button onClick={() => { setKasirFormId(''); setKasirFormName(''); setKasirFormPin(''); setKasirFormTargetTrx(''); setEditKasirId(null); }} className="text-[10px] text-rose-500 font-bold underline mb-1">Batal Edit</button>
                        )}

                        <button onClick={() => {
                          if(!kasirFormId.trim() || !kasirFormName.trim() || !kasirFormPin) return props.showToast('Lengkapi data kasir');
                          // Validasi: ID kasir tidak boleh sama dengan yang sudah ada, KECUALI jika sedang diedit
                          const existingIds = Object.keys(props.kasirList || {})
                          if (!editKasirId && existingIds.includes(kasirFormId.trim())) {
                            return props.showToast(`ID "${kasirFormId}" sudah digunakan kasir lain!`);
                          }
                          if (kasirFormPin.length < 4) return props.showToast('PIN minimal 4 digit!');
                          const newKasirList = { ...props.kasirList, [kasirFormId.trim()]: { pin: kasirFormPin, role: 'kasir' as any, name: kasirFormName.trim(), targetTrx: parseInt(kasirFormTargetTrx) || 0 } };
                          const targetStoreId = props.pantauStoreId;
                          if (targetStoreId && targetStoreId !== 'all') {
                            localStorage.setItem(`alphaPro_${targetStoreId}_kasir_list`, JSON.stringify(newKasirList));
                            supabase.from('store_settings').upsert({
                              store_id: targetStoreId,
                              cashiers: newKasirList,
                              updated_at: new Date().toISOString()
                            }).then(({ error }) => {
                              if (error) console.error("Gagal update cashiers ke DB:", error.message);
                            });
                          } else {
                            saveKasirAccounts(newKasirList);
                          }
                          props.refreshKasirList(newKasirList);
                          setKasirFormId(''); setKasirFormName(''); setKasirFormPin(''); setKasirFormTargetTrx(''); setEditKasirId(null);
                          props.showToast("Data Kasir Disimpan!");
                        }} className="w-full bg-blue-600 text-white text-[10px] font-black py-2 rounded-lg uppercase">{editKasirId ? 'Update Kasir' : 'Simpan Kasir'}</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(props.kasirList || {}).filter(([id]) => id !== 'owner').map(([id, account]) => {
                        return (
                          <div key={id} className="p-3 border border-gray-100 rounded-2xl flex justify-between items-center bg-gray-50/50">
                            <div>
                              <p className="text-xs font-black text-gray-800">{account.name}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase">ID: {id} | PIN: {account.pin} {account.targetTrx ? `| TARGET: ${account.targetTrx} TRX` : ''}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => { setKasirFormId(id); setKasirFormName(account.name); setKasirFormPin(account.pin); setKasirFormTargetTrx(account.targetTrx ? account.targetTrx.toString() : ''); setEditKasirId(id); }} className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <i className="fa-solid fa-pen text-[10px]"></i>
                              </button>
                              <button onClick={() => {
                                props.onConfirm('HAPUS KASIR', `Hapus ${account.name}?`, () => {
                                  const n = {...props.kasirList}; delete n[id];
                                  const targetStoreId = props.pantauStoreId;
                                  if (targetStoreId && targetStoreId !== 'all') {
                                    localStorage.setItem(`alphaPro_${targetStoreId}_kasir_list`, JSON.stringify(n));
                                    supabase.from('store_settings').upsert({
                                      store_id: targetStoreId,
                                      cashiers: n,
                                      updated_at: new Date().toISOString()
                                    }).then(({ error }) => {
                                      if (error) console.error("Gagal update cashiers ke DB:", error.message);
                                    });
                                  } else {
                                    saveKasirAccounts(n);
                                  }
                                  props.refreshKasirList(n);
                                  props.showToast("Berhasil Dihapus");
                                })
                              }} className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                <i className="fa-solid fa-trash text-[10px]"></i>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeOwnerSubView === 'laporan' && (
              <ProfitOwnerView
                transactions={props.transactions}
                allTransactions={props.allTransactions}
                kasirList={props.kasirList}
                filterKasir={props.filterKasir}
                setFilterKasir={props.setFilterKasir}
                activeStoreId={props.activeStoreId}
                pantauStoreId={props.pantauStoreId}
                userId={props.userId}
                showToast={props.showToast}
                isPc={props.isPc}
              />
            )}
               {activeOwnerSubView === 'audit' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-2xl border border-indigo-100">
                    <div>
                      <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Riwayat Audit (Otomatis)</p>
                      <p className="text-[8px] text-indigo-400 font-bold uppercase">Hasil rekap laporan kasir</p>
                    </div>
                    <div className="relative">
                      <select
                        value={props.filterKasir || 'Semua'}
                        onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                        className="bg-white border border-indigo-200 text-indigo-800 text-[10px] font-black py-2 pl-3 pr-8 rounded-xl outline-none cursor-pointer appearance-none shadow-sm"
                      >
                        <option value="Semua">Semua Kasir</option>
                        {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                          <option key={id} value={id}>{acc.name}</option>
                        ))}
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-indigo-400 pointer-events-none"></i>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Ringkasan Performa Seluruh Kasir */}
                    {(() => {
                      const perf: Record<string, { name: string, minus: number, plus: number }> = {};
                      
                      // Inisialisasi semua kasir
                      Object.entries(props.kasirList)
                        .filter(([id]) => id !== 'owner')
                        .forEach(([id, acc]) => {
                          perf[id] = { name: acc.name, minus: 0, plus: 0 };
                        });

                      auditHistory.forEach(h => {
                        if (!perf[h.kasirId]) perf[h.kasirId] = { name: h.kasirName, minus: 0, plus: 0 };
                        if (h.selisih < 0) perf[h.kasirId].minus += Math.abs(h.selisih);
                        else if (h.selisih > 0) perf[h.kasirId].plus += h.selisih;
                      });
                      
                      let perfList = Object.entries(perf).map(([id, p]) => ({ id, ...p }));
                      if (props.filterKasir !== 'Semua') {
                        perfList = perfList.filter(p => p.id === props.filterKasir);
                      }
                      
                      if (perfList.length === 0) return null; // Jika belum ada kasir sama sekali

                      return (
                        <div className="mb-4">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2">Akumulasi Bulan Ini</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {perfList.map((p, idx) => {
                              const total = p.plus - p.minus;
                              const isMinus = total < 0;
                              return (
                                <div key={idx} className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm">
                                  <div className="flex justify-between items-center border-b border-gray-50 pb-2 mb-2">
                                    <p className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">{p.name}</p>
                                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest", isMinus ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>
                                      {isMinus ? "Minus" : "Plus"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <div className="flex-1 bg-red-50/50 rounded-xl p-2">
                                      <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-0.5">Total Kurang</p>
                                      <p className="text-[10px] font-black text-red-600">{formatRupiah(p.minus)}</p>
                                    </div>
                                    <div className="flex-1 bg-emerald-50/50 rounded-xl p-2">
                                      <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Total Lebih</p>
                                      <p className="text-[10px] font-black text-emerald-600">{formatRupiah(p.plus)}</p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}

                    <div className="flex justify-between items-center px-1">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:block">Detail Per Hari</h4>
                        <div className="w-8 h-px bg-gray-100 flex-grow mx-3 hidden sm:block"></div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                          <button 
                            onClick={() => {
                              if (props.handleSyncPast30Days) {
                                props.handleSyncPast30Days();
                                props.showToast("Menyinkronkan riwayat 30 hari terakhir...");
                              }
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 active:scale-95 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <i className="fa-solid fa-cloud-arrow-down text-[10px]"></i>
                            Sinkron Data
                          </button>
                          <input 
                            type="date" 
                            value={auditFilterDate} 
                            onChange={(e) => setAuditFilterDate(e.target.value)} 
                            className="text-[9px] font-black uppercase text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-300"
                          />
                        </div>
                      </div>
                    
                    {(() => {
                      let filteredHistory = props.filterKasir === 'Semua' 
                        ? auditHistory 
                        : auditHistory.filter(h => h.kasirId === props.filterKasir)

                      if (auditFilterDate) {
                        filteredHistory = filteredHistory.filter(h => h.tanggalAsli === auditFilterDate)
                      }

                      const totalSelisih = filteredHistory.reduce((acc, curr) => acc + curr.selisih, 0);

                      if (filteredHistory.length === 0) {
                        return (
                          <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                            <i className="fa-solid fa-clipboard-check text-2xl text-gray-200 mb-2"></i>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                              Belum ada riwayat audit/closing
                            </p>
                          </div>
                        )
                      }

                      // Grouping for UI rendering
                      const groupedByDate: Record<string, typeof auditHistory> = {};
                      filteredHistory.forEach(item => {
                        if (!groupedByDate[item.tanggal]) groupedByDate[item.tanggal] = [];
                        groupedByDate[item.tanggal].push(item);
                      });

                      return (
                        <div className="space-y-4">
                          {/* Akumulasi Selisih */}
                          <div className={cn(
                            "p-3 rounded-2xl flex justify-between items-center border shadow-sm",
                            totalSelisih < -50000 ? "bg-red-50 border-red-100" : (totalSelisih > -5000 && totalSelisih < 5000 ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100")
                          )}>
                            <div className="flex items-center gap-2">
                              <i className="fa-solid fa-calculator text-gray-400"></i>
                              <div>
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Total Akumulasi</p>
                                <p className="text-[10px] font-bold text-gray-400">Untuk data yang ditampilkan</p>
                              </div>
                            </div>
                            <span className={cn(
                              "text-sm font-black",
                              totalSelisih < 0 ? "text-red-600" : "text-green-600"
                            )}>
                              {totalSelisih < 0 ? "KURANG " : "LEBIH "} {formatRupiah(Math.abs(totalSelisih))}
                            </span>
                          </div>

                          <div className="space-y-4">
                            {Object.entries(groupedByDate).map(([tanggal, items]) => (
                              <div key={tanggal} className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                  <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{items[0].dayContext}</span>
                                  <span className="text-[9px] font-bold text-slate-400">{tanggal}</span>
                                </div>
                                <div className="space-y-2">
                                  {items.map((item, index) => {
                                    const absSelisih = Math.abs(item.selisih);
                                    let colorBox = "bg-green-50 text-green-600 border border-green-100";
                                    let colorText = "text-green-600";
                                    let icon = "fa-check";
                                    let statusLabel = "WAJAR";

                                    if (absSelisih > 50000) {
                                      colorBox = "bg-red-50 text-red-600 border border-red-100";
                                      colorText = "text-red-600";
                                      icon = "fa-triangle-exclamation";
                                      statusLabel = "FATAL";
                                    } else if (absSelisih > 5000) {
                                      colorBox = "bg-amber-50 text-amber-600 border border-amber-100";
                                      colorText = "text-amber-600";
                                      icon = "fa-exclamation";
                                      statusLabel = "CEK";
                                    }

                                    return (
                                      <div 
                                        key={index} 
                                        onClick={() => {
                                          if (props.setFilterTanggal) props.setFilterTanggal(item.tanggalAsli);
                                          if (props.setFilterKasir) props.setFilterKasir(item.kasirId);
                                          // Navigate to LaporanView
                                          props.setActiveView(props.isPc ? 'view-owner-laporan' : 'view-laporan');
                                        }}
                                        className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center group cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden"
                                        title="Lihat rincian laporan shift ini"
                                      >
                                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-indigo-50/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <i className="fa-solid fa-chevron-right text-indigo-400 text-[10px]"></i>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className={cn("w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0", colorBox)}>
                                            <span className="text-[8px] font-black leading-none">{statusLabel}</span>
                                            <i className={cn("fa-solid text-[10px] mt-0.5", icon)}></i>
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <p className="text-[11px] font-black text-gray-800 uppercase leading-none group-hover:text-indigo-600 transition-colors">
                                                {item.kasirName}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className={cn("text-[9px] font-black uppercase", colorText)}>
                                                {item.selisih === 0 ? 'Klop' : item.selisih < 0 ? 'Kurang' : 'Lebih'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="pr-4 sm:pr-6">
                                          <span className={cn("text-xs font-black", colorText)}>
                                            {formatRupiah(Math.abs(item.selisih))}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {activeOwnerSubView === 'absen' && (
                <div className="relative">
                  {/* FILTER BULAN DAN TABS - STICKY MINIMALIS */}
                  <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md pt-1 pb-3 -mx-4 px-4 flex items-end justify-between gap-2 border-b border-gray-100/50 mb-4">
                    <div className="flex-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 ml-0.5">Periode Kehadiran</label>
                      <input 
                        type="month"
                        value={absenFilterMonth}
                        onChange={(e) => setAbsenFilterMonth(e.target.value)}
                        className="w-full max-w-[130px] text-[10px] py-1.5 px-2.5 rounded-lg border border-gray-200 outline-none font-bold bg-gray-50 focus:border-teal-400 focus:bg-white transition-all shadow-inner"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex bg-gray-100 p-0.5 rounded-[10px]">
                        <button 
                          onClick={() => setAbsenTab('summary')} 
                          className={cn(
                            "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[8px] transition-all",
                            absenTab === 'summary' ? "bg-white text-teal-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          Ringkasan
                        </button>
                        <button 
                          onClick={() => setAbsenTab('full')} 
                          className={cn(
                            "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[8px] transition-all",
                            absenTab === 'full' ? "bg-white text-teal-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          Riwayat
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsSelfieGalleryOpen(true)}
                        className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-[10px] bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        title="Buka Galeri Album Foto Selfie Absensi Kasir"
                      >
                        <i className="fa-solid fa-camera-retro text-[10px]"></i>
                        <span className="hidden sm:inline">Album</span> Selfie
                      </button>
                    </div>
                  </div>

                  {absenTab === 'summary' ? (() => {
                    const cashiers = Object.entries(props.kasirList).filter(([id]) => id !== 'owner')
                    const today = new Date()
                    
                    // Filter untuk bulan yang dipilih
                    const [yyyy, mm] = absenFilterMonth.split('-').map(Number);
                    const selectedMonthDate = new Date(yyyy, mm - 1);
                    const isCurrentMonth = today.getFullYear() === yyyy && (today.getMonth() + 1) === mm;
                    
                    let daysPassed = 0;
                    if (isCurrentMonth) {
                      daysPassed = today.getDate();
                    } else if (selectedMonthDate < today) {
                      daysPassed = new Date(yyyy, mm, 0).getDate(); // Total hari dalam bulan tersebut
                    }
                    
                    return (
                      <div className="space-y-6">
                        {/* REKAPITULASI BULAN INI */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              Rekap {selectedMonthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </p>
                            <span className="text-[8px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {isCurrentMonth ? `s/d Tgl ${today.getDate()}` : 'Sebulan Penuh'}
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                            {cashiers.map(([id, acc]) => {
                              // Data absensi bulan ini untuk kasir ini
                              const monthData = effectiveAbsensiList.filter(a => 
                                (a.username === id || a.nama_kasir === acc.name) && a.tanggal && a.tanggal.startsWith(absenFilterMonth)
                              )
                              
                              // Hadir berdasarkan tanggal unik
                              const uniqueAttendedDates = new Set(monthData.filter(a => a.status !== 'Libur' && a.status !== 'Izin').map(a => a.tanggal))
                              const totalHadir = uniqueAttendedDates.size

                              // Evaluasi hari berlalu efektif (jika hari ini belum absen, hari ini tidak dihitung sebagai libur)
                              const todayStr = getLocalDateString()
                              const hasAttendedToday = uniqueAttendedDates.has(todayStr)
                              let effectiveDaysPassed = daysPassed
                              if (isCurrentMonth && !hasAttendedToday) {
                                effectiveDaysPassed = Math.max(0, today.getDate() - 1)
                              }
                              
                              const totalLibur = Math.max(0, effectiveDaysPassed - totalHadir)
                              
                              let pagi = 0
                              let siang = 0
                              const latePagiDates: {tanggal: string, jam: string, alasan_telat?: string}[] = []
                              
                              // Hitung shift pagi vs siang dari setiap tanggal unik (ambil entri pertama tiap hari)
                              const dailyFirstEntries = new Map<string, any>()
                              monthData.forEach(entry => {
                                if (!dailyFirstEntries.has(entry.tanggal)) {
                                  dailyFirstEntries.set(entry.tanggal, entry)
                                }
                              })

                              dailyFirstEntries.forEach(entry => {
                                const info = getShiftInfo(entry.jam_masuk, financialSettings);
                                if (info.isPagi) {
                                  pagi++
                                  if (info.isLate) {
                                    latePagiDates.push({tanggal: entry.tanggal, jam: `${entry.jam_masuk} (-${info.lateMins}m)`, alasan_telat: entry.alasan_telat})
                                  }
                                }
                                else siang++
                              })
                              
                              // Urutkan riwayat telat dari yang terbaru
                              latePagiDates.sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                              
                              const liburDates: string[] = []
                              for (let i = 1; i <= effectiveDaysPassed; i++) {
                                const dStr = `${absenFilterMonth}-${String(i).padStart(2, '0')}`
                                if (!uniqueAttendedDates.has(dStr)) {
                                  liburDates.push(dStr)
                                }
                              }
                              liburDates.sort((a,b) => b.localeCompare(a))
                              const totalLembur = monthData.filter(e => e.status === 'Lembur').length
                              
                              return (
                                <div key={`rekap-${id}`} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden group">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                                  <div className="flex items-center justify-between mb-3 pl-1 gap-2">
                                    <h4 className="text-[11px] sm:text-[12px] font-black text-gray-800 uppercase tracking-widest truncate min-w-0" title={acc.name}>
                                      {acc.name}
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDetailedSummaryKasirId(id);
                                        setDetailedSummaryFilter('ringkasan');
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/90 text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider transition-all shadow-2xs active:scale-95 shrink-0 cursor-pointer"
                                      title="Rincian ringkasan versi lengkap"
                                    >
                                      <i className="fa-solid fa-file-lines text-[9px] text-teal-600"></i>
                                      <span>Rincian Versi Lengkap</span>
                                      <i className="fa-solid fa-chevron-right text-[7px] text-teal-500"></i>
                                    </button>
                                  </div>
                                  
                                  <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="bg-teal-50/50 rounded-xl p-2 border border-teal-50">
                                      <p className="text-[8px] font-bold text-teal-600 uppercase mb-1">Hadir</p>
                                      <p className="text-[12px] font-black text-teal-700">{totalHadir}</p>
                                    </div>
                                    <div 
                                      className={cn("bg-orange-50/50 rounded-xl p-2 border transition-all", latePagiDates.length > 0 ? "border-orange-300 cursor-pointer active:scale-95 shadow-sm" : "border-orange-50")}
                                      onClick={() => latePagiDates.length > 0 ? setAbsenLateHistoryId(absenLateHistoryId === id ? null : id) : undefined}
                                    >
                                      <div className="flex items-center justify-center gap-1 mb-1">
                                        <p className="text-[8px] font-bold text-orange-600 uppercase">Pagi</p>
                                        {latePagiDates.length > 0 && <i className="fa-solid fa-circle-exclamation text-[8px] text-red-500 animate-pulse" title="Ada riwayat telat"></i>}
                                      </div>
                                      <p className="text-[12px] font-black text-orange-700">{pagi}</p>
                                    </div>
                                    <div className="bg-indigo-50/50 rounded-xl p-2 border border-indigo-50">
                                      <p className="text-[8px] font-bold text-indigo-600 uppercase mb-1">Siang</p>
                                      <p className="text-[12px] font-black text-indigo-700">{siang}</p>
                                    </div>
                                    <div 
                                      className={cn("bg-rose-50/50 rounded-xl p-2 border transition-all", liburDates.length > 0 ? "border-rose-300 cursor-pointer active:scale-95 shadow-sm" : "border-rose-50")}
                                      onClick={() => liburDates.length > 0 ? setAbsenLiburHistoryId(absenLiburHistoryId === id ? null : id) : undefined}
                                    >
                                      <div className="flex items-center justify-center gap-1 mb-1">
                                        <p className="text-[8px] font-bold text-rose-600 uppercase">Libur</p>
                                        {liburDates.length > 0 && <i className="fa-solid fa-calendar-xmark text-[8px] text-rose-500"></i>}
                                      </div>
                                      <p className="text-[12px] font-black text-rose-700">{totalLibur}</p>
                                    </div>
                                  </div>
                                  
                                  {(() => {
                                    const totalLembur = monthData.filter(e => e.status === 'Lembur').length;
                                    if (totalLembur > 0) {
                                      return (
                                        <div className="mt-2 text-center bg-emerald-50/70 border border-emerald-100 rounded-lg p-1.5">
                                          <p className="text-[10px] font-black text-emerald-600 tracking-wide uppercase">
                                            <i className="fa-solid fa-medal text-emerald-500 mr-1"></i> {totalLembur} Hari Lembur Sah
                                          </p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {absenLateHistoryId === id && latePagiDates.length > 0 && (
                                    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                                      <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative animate-in slide-in-from-top-4">
                                        <button onClick={() => setAbsenLateHistoryId(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                                          <i className="fa-solid fa-xmark"></i>
                                        </button>
                                        <h3 className="text-[14px] font-black text-gray-800 uppercase tracking-widest mb-1 flex items-center gap-2">
                                          <i className="fa-solid fa-clock-rotate-left text-red-500"></i> Riwayat Telat
                                        </h3>
                                        <p className="text-[10px] text-gray-500 font-bold mb-4">Kasir: <span className="text-gray-800">{acc.name}</span></p>
                                        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                                          {latePagiDates.map((late, idx) => {
                                            const [y, m, d] = late.tanggal.split('-');
                                            const dateObj = new Date(Number(y), Number(m)-1, Number(d));
                                            const dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                            return (
                                              <div key={idx} className="flex flex-col gap-1 text-[11px] bg-red-50/50 px-3 py-2.5 rounded-xl border border-red-100 shadow-sm">
                                                <div className="flex justify-between items-center">
                                                  <span className="font-bold text-gray-700">{dateStr}</span>
                                                  <span className="font-black text-red-600 bg-white px-2 py-1 rounded shadow-sm border border-red-100">{late.jam}</span>
                                                </div>
                                                {late.alasan_telat ? (
                                                  <p className="text-[9px] text-gray-600 font-medium bg-white/50 p-1.5 rounded border border-red-50 mt-0.5">
                                                    <span className="font-bold text-gray-800">Alasan:</span> {late.alasan_telat}
                                                  </p>
                                                ) : (
                                                  <p className="text-[9px] text-gray-400 font-medium bg-white/50 p-1.5 rounded border border-red-50 mt-0.5 italic">
                                                    Tidak ada keterangan
                                                  </p>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {absenLiburHistoryId === id && liburDates.length > 0 && (
                                    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                                      <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative animate-in slide-in-from-top-4">
                                        <button onClick={() => setAbsenLiburHistoryId(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                                          <i className="fa-solid fa-xmark"></i>
                                        </button>
                                        <h3 className="text-[14px] font-black text-gray-800 uppercase tracking-widest mb-1 flex items-center gap-2">
                                          <i className="fa-solid fa-calendar-xmark text-rose-500"></i> Riwayat Libur
                                        </h3>
                                        <p className="text-[10px] text-gray-500 font-bold mb-4">Kasir: <span className="text-gray-800">{acc.name}</span></p>
                                        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                                          {liburDates.map((ldate, idx) => {
                                            const [y, m, d] = ldate.split('-');
                                            const dateObj = new Date(Number(y), Number(m)-1, Number(d));
                                            const dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                            return (
                                              <div key={idx} className="flex justify-between items-center text-[11px] bg-rose-50/50 px-3 py-2.5 rounded-xl border border-rose-100 shadow-sm">
                                                <span className="font-bold text-gray-700">{dateStr}</span>
                                                <span className="font-black text-rose-600 bg-white px-2 py-1 rounded shadow-sm border border-rose-100">LIBUR</span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* MODAL RINCIAN RINGKASAN VERSI LENGKAP PER KASIR */}
                                    {detailedSummaryKasirId === id && (
                                      <div 
                                        className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-6 bg-slate-900/65 backdrop-blur-sm animate-in fade-in"
                                        onClick={() => setDetailedSummaryKasirId(null)}
                                      >
                                        <div 
                                          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[78vh] sm:max-h-[85vh] mb-12 sm:mb-0 border border-slate-100 animate-in zoom-in-95 text-left"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {/* Header Modal */}
                                          <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 px-5 py-4 text-white flex items-center justify-between shrink-0">
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs">
                                                  <i className="fa-solid fa-file-lines"></i>
                                                </span>
                                                <h3 className="text-sm sm:text-base font-black tracking-tight uppercase">Rincian Ringkasan Lengkap</h3>
                                              </div>
                                              <p className="text-[11px] text-teal-100 font-bold mt-1">
                                                Kasir: <span className="text-white font-black">{acc.name}</span> • Periode: <span className="text-white font-black">{selectedMonthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                                              </p>
                                            </div>
                                            <button 
                                              type="button"
                                              onClick={() => setDetailedSummaryKasirId(null)}
                                              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
                                              title="Tutup"
                                            >
                                              <i className="fa-solid fa-xmark text-sm"></i>
                                            </button>
                                          </div>

                                          {/* Sub-tab Navigation */}
                                          <div className="flex border-b border-slate-100 bg-slate-50/80 px-4 pt-2 gap-1.5 overflow-x-auto shrink-0 custom-scrollbar">
                                            {[
                                              { id: 'ringkasan', label: 'Ringkasan', icon: 'fa-chart-pie' },
                                              { id: 'telat', label: `Telat (${latePagiDates.length})`, icon: 'fa-clock-rotate-left', badgeColor: latePagiDates.length > 0 ? 'text-red-600' : 'text-slate-500' },
                                              { id: 'lembur', label: `Lembur (${totalLembur})`, icon: 'fa-bolt', badgeColor: totalLembur > 0 ? 'text-emerald-600' : 'text-slate-500' },
                                              { id: 'libur', label: `Libur (${totalLibur})`, icon: 'fa-mug-hot', badgeColor: 'text-amber-600' },
                                              { id: 'log', label: `Semua Log (${monthData.length})`, icon: 'fa-calendar-days' },
                                            ].map(tab => (
                                              <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setDetailedSummaryFilter(tab.id as any)}
                                                className={cn(
                                                  "px-3 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                                                  detailedSummaryFilter === tab.id
                                                    ? "bg-white text-teal-700 border-t-2 border-teal-600 shadow-xs"
                                                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                                                )}
                                              >
                                                <i className={cn("fa-solid text-[10px]", tab.icon, tab.badgeColor)}></i>
                                                <span>{tab.label}</span>
                                              </button>
                                            ))}
                                          </div>

                                          {/* Body Modal */}
                                          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
                                            {detailedSummaryFilter === 'ringkasan' && (
                                              <div className="space-y-4">
                                                {/* 6 Grid Metrik Utama */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                  {/* 1. Hadir */}
                                                  <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-[9px] font-black uppercase tracking-wider text-teal-600">Total Hadir</span>
                                                      <div className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center text-[10px]">
                                                        <i className="fa-solid fa-check"></i>
                                                      </div>
                                                    </div>
                                                    <div className="mt-2">
                                                      <span className="text-xl sm:text-2xl font-black text-teal-800">{totalHadir}</span>
                                                      <span className="text-[10px] font-bold text-teal-600 ml-1">Hari</span>
                                                    </div>
                                                  </div>

                                                  {/* 2. Telat */}
                                                  <div className={cn(
                                                    "rounded-2xl p-3 flex flex-col justify-between shadow-2xs border transition-colors",
                                                    latePagiDates.length > 0 ? "bg-red-50/80 border-red-200/80" : "bg-slate-50 border-slate-200"
                                                  )}>
                                                    <div className="flex items-center justify-between">
                                                      <span className={cn("text-[9px] font-black uppercase tracking-wider", latePagiDates.length > 0 ? "text-red-600" : "text-slate-500")}>
                                                        Total Telat
                                                      </span>
                                                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px]", latePagiDates.length > 0 ? "bg-red-500 text-white" : "bg-slate-300 text-slate-600")}>
                                                        <i className="fa-solid fa-clock-rotate-left"></i>
                                                      </div>
                                                    </div>
                                                    <div className="mt-2">
                                                      <span className={cn("text-xl sm:text-2xl font-black", latePagiDates.length > 0 ? "text-red-700" : "text-slate-600")}>{latePagiDates.length}</span>
                                                      <span className={cn("text-[10px] font-bold ml-1", latePagiDates.length > 0 ? "text-red-600" : "text-slate-500")}>Kali</span>
                                                    </div>
                                                  </div>

                                                  {/* 3. Shift Pagi */}
                                                  <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-[9px] font-black uppercase tracking-wider text-orange-600">Shift Pagi</span>
                                                      <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center text-[10px]">
                                                        <i className="fa-solid fa-sun"></i>
                                                      </div>
                                                    </div>
                                                    <div className="mt-2">
                                                      <span className="text-xl sm:text-2xl font-black text-orange-800">{pagi}</span>
                                                      <span className="text-[10px] font-bold text-orange-600 ml-1">Hari</span>
                                                    </div>
                                                  </div>

                                                  {/* 4. Shift Siang */}
                                                  <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">Shift Siang</span>
                                                      <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[10px]">
                                                        <i className="fa-solid fa-cloud-sun"></i>
                                                      </div>
                                                    </div>
                                                    <div className="mt-2">
                                                      <span className="text-xl sm:text-2xl font-black text-indigo-800">{siang}</span>
                                                      <span className="text-[10px] font-bold text-indigo-600 ml-1">Hari</span>
                                                    </div>
                                                  </div>

                                                  {/* 5. Lembur */}
                                                  <div className={cn(
                                                    "rounded-2xl p-3 flex flex-col justify-between shadow-2xs border transition-colors",
                                                    totalLembur > 0 ? "bg-emerald-50/80 border-emerald-200/80" : "bg-slate-50 border-slate-200"
                                                  )}>
                                                    <div className="flex items-center justify-between">
                                                      <span className={cn("text-[9px] font-black uppercase tracking-wider", totalLembur > 0 ? "text-emerald-600" : "text-slate-500")}>
                                                        Total Lembur
                                                      </span>
                                                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px]", totalLembur > 0 ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-600")}>
                                                        <i className="fa-solid fa-bolt"></i>
                                                      </div>
                                                    </div>
                                                    <div className="mt-2">
                                                      <span className={cn("text-xl sm:text-2xl font-black", totalLembur > 0 ? "text-emerald-700" : "text-slate-600")}>{totalLembur}</span>
                                                      <span className={cn("text-[10px] font-bold ml-1", totalLembur > 0 ? "text-emerald-600" : "text-slate-500")}>Hari</span>
                                                    </div>
                                                  </div>

                                                  {/* 6. Libur */}
                                                  <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-[9px] font-black uppercase tracking-wider text-rose-600">Total Libur</span>
                                                      <div className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center text-[10px]">
                                                        <i className="fa-solid fa-mug-hot"></i>
                                                      </div>
                                                    </div>
                                                    <div className="mt-2">
                                                      <span className="text-xl sm:text-2xl font-black text-rose-800">{totalLibur}</span>
                                                      <span className="text-[10px] font-bold text-rose-600 ml-1">Hari</span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Persentase Kehadiran */}
                                                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex flex-col gap-2">
                                                  <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-slate-600">Tingkat Kehadiran:</span>
                                                    <span className="font-black text-teal-700">
                                                      {effectiveDaysPassed > 0 ? Math.round((totalHadir / effectiveDaysPassed) * 100) : 0}% ({totalHadir} dari {effectiveDaysPassed} hari)
                                                    </span>
                                                  </div>
                                                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                                    <div 
                                                      className="bg-teal-500 h-full rounded-full transition-all duration-500"
                                                      style={{ width: `${effectiveDaysPassed > 0 ? Math.min(100, Math.round((totalHadir / effectiveDaysPassed) * 100)) : 0}%` }}
                                                    ></div>
                                                  </div>
                                                </div>

                                                {/* Highlight Telat / Disiplin */}
                                                {latePagiDates.length > 0 ? (
                                                  <div className="bg-red-50/80 border border-red-200 rounded-2xl p-3.5">
                                                    <div className="flex items-center justify-between mb-2">
                                                      <span className="text-[11px] font-black text-red-700 uppercase tracking-wide flex items-center gap-1.5">
                                                        <i className="fa-solid fa-triangle-exclamation text-red-500"></i> {latePagiDates.length} Kali Terlambat di Shift Pagi
                                                      </span>
                                                      <button 
                                                        type="button"
                                                        onClick={() => setDetailedSummaryFilter('telat')}
                                                        className="text-[9px] font-black text-red-600 hover:underline uppercase cursor-pointer"
                                                      >
                                                        Lihat Rincian &rarr;
                                                      </button>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                      {latePagiDates.slice(0, 2).map((late, lidx) => (
                                                        <div key={lidx} className="flex items-center justify-between text-[10px] bg-white/80 px-2.5 py-1.5 rounded-lg border border-red-100">
                                                          <span className="font-bold text-slate-700">{late.tanggal}</span>
                                                          <span className="font-black text-red-600">{late.jam}</span>
                                                        </div>
                                                      ))}
                                                      {latePagiDates.length > 2 && (
                                                        <p className="text-[9px] text-center text-red-500 font-bold pt-1">
                                                          +{latePagiDates.length - 2} catatan telat lainnya (buka tab Telat untuk melihat semua)
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm shrink-0">
                                                      <i className="fa-solid fa-shield-halved"></i>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-black text-emerald-800 uppercase tracking-wide">Sangat Disiplin</p>
                                                      <p className="text-[10px] text-emerald-600 font-medium">Kasir ini tidak memiliki catatan terlambat di shift pagi bulan ini.</p>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {detailedSummaryFilter === 'telat' && (
                                              <div className="space-y-2">
                                                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-2">
                                                  <i className="fa-solid fa-clock-rotate-left text-red-500"></i> Daftar Tanggal Terlambat ({latePagiDates.length})
                                                </h4>
                                                {latePagiDates.length === 0 ? (
                                                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <i className="fa-solid fa-circle-check text-emerald-500 text-3xl mb-2"></i>
                                                    <p className="text-xs font-black text-slate-700">Tidak Ada Keterlambatan</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Kasir selalu tepat waktu saat masuk kerja.</p>
                                                  </div>
                                                ) : (
                                                  latePagiDates.map((late, lidx) => {
                                                    const [y, m, d] = late.tanggal.split('-');
                                                    const dObj = new Date(Number(y), Number(m)-1, Number(d));
                                                    const dStr = dObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                                    return (
                                                      <div key={lidx} className="bg-red-50/50 rounded-xl p-3 border border-red-100 flex flex-col gap-1.5 shadow-2xs">
                                                        <div className="flex justify-between items-center">
                                                          <span className="text-xs font-bold text-slate-800">{dStr}</span>
                                                          <span className="text-[10px] font-black text-red-600 bg-white px-2 py-0.5 rounded border border-red-200 shadow-2xs">
                                                            {late.jam}
                                                          </span>
                                                        </div>
                                                        {late.alasan_telat ? (
                                                          <p className="text-[10px] text-slate-600 bg-white/70 px-2 py-1 rounded border border-red-100/70">
                                                            <span className="font-bold text-slate-800">Alasan:</span> "{late.alasan_telat}"
                                                          </p>
                                                        ) : (
                                                          <p className="text-[9px] text-slate-400 italic">Tidak ada alasan telat tercatat</p>
                                                        )}
                                                      </div>
                                                    );
                                                  })
                                                )}
                                              </div>
                                            )}

                                            {detailedSummaryFilter === 'lembur' && (
                                              <div className="space-y-2">
                                                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-2">
                                                  <i className="fa-solid fa-bolt text-emerald-500"></i> Daftar Hari Lembur Sah ({totalLembur})
                                                </h4>
                                                {(() => {
                                                  const lemburs = monthData.filter(e => e.status === 'Lembur').sort((a,b) => b.tanggal.localeCompare(a.tanggal));
                                                  if (lemburs.length === 0) {
                                                    return (
                                                      <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <i className="fa-solid fa-mug-saucer text-slate-300 text-3xl mb-2"></i>
                                                        <p className="text-xs font-black text-slate-700">Belum Ada Lembur</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">Tidak ada status lembur tercatat bulan ini.</p>
                                                      </div>
                                                    );
                                                  }
                                                  return lemburs.map((lemb, lidx) => {
                                                    const [y, m, d] = lemb.tanggal.split('-');
                                                    const dObj = new Date(Number(y), Number(m)-1, Number(d));
                                                    const dStr = dObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                                    return (
                                                      <div key={lidx} className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 flex items-center justify-between shadow-2xs">
                                                        <div>
                                                          <p className="text-xs font-bold text-slate-800">{dStr}</p>
                                                          <p className="text-[10px] text-slate-500 font-medium">Jam Masuk: <span className="font-bold text-slate-700">{lemb.jam_masuk || '-'}</span></p>
                                                        </div>
                                                        <span className="text-[9px] font-black text-white bg-emerald-500 px-2.5 py-1 rounded-md shadow-xs uppercase tracking-wide flex items-center gap-1">
                                                          <i className="fa-solid fa-bolt text-yellow-300 text-[8px]"></i> Lembur Sah
                                                        </span>
                                                      </div>
                                                    );
                                                  });
                                                })()}
                                              </div>
                                            )}

                                            {detailedSummaryFilter === 'libur' && (
                                              <div className="space-y-2">
                                                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-2">
                                                  <i className="fa-solid fa-mug-hot text-amber-500"></i> Daftar Tanggal Libur ({totalLibur})
                                                </h4>
                                                {liburDates.length === 0 ? (
                                                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <i className="fa-solid fa-calendar-check text-teal-500 text-3xl mb-2"></i>
                                                    <p className="text-xs font-black text-slate-700">Masuk Setiap Hari</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Kasir hadir di setiap hari yang telah berjalan.</p>
                                                  </div>
                                                ) : (
                                                  liburDates.map((ldate, lidx) => {
                                                    const [y, m, d] = ldate.split('-');
                                                    const dObj = new Date(Number(y), Number(m)-1, Number(d));
                                                    const dStr = dObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                                    return (
                                                      <div key={lidx} className="bg-rose-50/50 rounded-xl p-3 border border-rose-100 flex items-center justify-between shadow-2xs">
                                                        <span className="text-xs font-bold text-slate-800">{dStr}</span>
                                                        <span className="text-[9px] font-black text-white bg-amber-500 px-2.5 py-1 rounded-md shadow-xs uppercase tracking-wide flex items-center gap-1">
                                                          <i className="fa-solid fa-mug-hot text-white text-[8px]"></i> Libur / Off
                                                        </span>
                                                      </div>
                                                    );
                                                  })
                                                )}
                                              </div>
                                            )}

                                            {detailedSummaryFilter === 'log' && (
                                              <div className="space-y-2">
                                                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-2">
                                                  <i className="fa-solid fa-calendar-days text-teal-600"></i> Semua Catatan Log Absensi ({monthData.length})
                                                </h4>
                                                {monthData.length === 0 ? (
                                                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-xs font-black text-slate-500">Belum ada riwayat absensi bulan ini</p>
                                                  </div>
                                                ) : (
                                                  [...monthData]
                                                    .sort((a,b) => (b.tanggal + (b.jam_masuk || '')).localeCompare(a.tanggal + (a.jam_masuk || '')))
                                                    .map((entry, eidx) => {
                                                      const [y, m, d] = (entry.tanggal || '').split('-');
                                                      const dObj = y && m && d ? new Date(Number(y), Number(m)-1, Number(d)) : null;
                                                      const dStr = dObj ? dObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : entry.tanggal;
                                                      const shiftInf = getShiftInfo(entry.jam_masuk, financialSettings);
                                                      return (
                                                        <div key={eidx} className="bg-white rounded-xl p-3 border border-slate-100 flex items-center justify-between shadow-2xs hover:bg-slate-50/80 transition-colors">
                                                          <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-800">{dStr}</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                              <span className="text-[10px] text-slate-500 font-bold">Masuk: {entry.jam_masuk || '-'}</span>
                                                              {entry.alasan_telat && (
                                                                <span className="text-[9px] text-red-500 font-bold truncate max-w-[150px]">("{entry.alasan_telat}")</span>
                                                              )}
                                                            </div>
                                                          </div>
                                                          <div className="flex items-center gap-1.5">
                                                            <span className={cn(
                                                              "text-[8.5px] font-black uppercase px-2 py-0.5 rounded shadow-2xs",
                                                              shiftInf.isPagi ? "bg-orange-100 text-orange-700" : "bg-indigo-100 text-indigo-700"
                                                            )}>
                                                              {shiftInf.isPagi ? 'Pagi' : 'Siang'}
                                                            </span>
                                                            {entry.status === 'Lembur' && (
                                                              <span className="text-[8.5px] font-black text-white bg-emerald-500 px-2 py-0.5 rounded shadow-2xs uppercase">
                                                                Lembur
                                                              </span>
                                                            )}
                                                            {entry.status === 'Libur' && (
                                                              <span className="text-[8.5px] font-black text-white bg-amber-500 px-2 py-0.5 rounded shadow-2xs uppercase">
                                                                Libur
                                                              </span>
                                                            )}
                                                          </div>
                                                        </div>
                                                      );
                                                    })
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {/* Footer Modal */}
                                          <div className="bg-slate-50 px-5 py-3.5 sm:py-3 border-t border-slate-100 flex items-center justify-between shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                                            <span className="text-[10px] text-slate-500 font-bold">
                                              {acc.name} • {selectedMonthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setDetailedSummaryKasirId(null)}
                                              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                                            >
                                              Tutup
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* KEHADIRAN HARI INI */}
                        {isCurrentMonth && (
                        <div className="space-y-3">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">
                            Kehadiran Hari Ini ({today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })})
                          </p>
                          
                          <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
                            {/* Header Summary */}
                            <div className="bg-teal-50/70 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                              <h4 className="text-[11px] font-black text-teal-900 uppercase tracking-widest">
                                Status Shift
                              </h4>
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                                <span className="text-[8px] font-black text-teal-600 uppercase tracking-tighter">Live Monitor</span>
                              </span>
                            </div>
                            
                            {/* Sub-Header Kolom Buku Tulis (Garis Horizontal Bersih) */}
                            <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200/80 text-[8px] font-black text-slate-400 uppercase tracking-wider select-none px-3.5 py-1.5">
                              <div className="flex-1 pr-3 flex items-center">
                                <span className="w-[48%] text-left">Kasir</span>
                                <span className="flex-1 text-center">Shift & Status</span>
                              </div>
                              <div className="shrink-0 text-right min-w-[70px]">Jam Masuk</div>
                            </div>

                            <div>
                              {cashiers.map(([id, acc]) => {
                                const todayStr = today.toLocaleDateString('en-CA')
                                const entry = effectiveAbsensiList.find(a => a.username === id && a.tanggal === todayStr)
                                
                                let shiftLabel = 'BELUM ABSEN'
                                let shiftColor = 'text-slate-400 bg-slate-50 border border-slate-200'
                                
                                if (entry) {
                                  const info = getShiftInfo(entry.jam_masuk, financialSettings, entry.shift);
                                  shiftLabel = info.shiftName;
                                  if (info.shiftName === 'PAGI') shiftColor = 'text-amber-700 bg-amber-50 border border-amber-200';
                                  else if (info.shiftName === 'MALAM') shiftColor = 'text-indigo-700 bg-indigo-50 border border-indigo-200';
                                  else shiftColor = 'text-purple-700 bg-purple-50 border border-purple-200';
                                  
                                  if (info.isLate) {
                                     shiftLabel += ` (TELAT ${info.lateMins}M)`;
                                     shiftColor = 'text-rose-700 bg-rose-50 border border-rose-200';
                                  }
                                }

                                return (
                                  <div 
                                    key={`today-${id}`} 
                                    className="flex items-center justify-between py-2.5 px-3.5 border-b border-slate-100 last:border-b-0 bg-white hover:bg-slate-50/70 transition-colors"
                                  >
                                    {/* Area Kiri & Tengah: Kasir, Shift, dan Keterangan Telat (Lebar Penuh Tanpa Garis Berdiri) */}
                                    <div className="flex-1 min-w-0 pr-3 flex flex-col justify-center">
                                      {/* Baris 1: Nama Kasir (Kiri) & Shift / Status (Tengah) */}
                                      <div className="flex items-center">
                                        <div className="w-[48%] min-w-0 pr-2 flex items-center gap-1.5 flex-wrap">
                                          <p className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-tight truncate leading-tight" title={acc.name}>
                                            {acc.name}
                                          </p>
                                          {entry?.status === 'Lembur' && (
                                            <span className="inline-flex items-center gap-1 text-[7.5px] font-black text-white bg-emerald-500 px-1.5 py-0.2 rounded shadow-xs uppercase tracking-wide shrink-0">
                                              <i className="fa-solid fa-bolt text-[7px] text-yellow-300"></i> Lembur
                                            </span>
                                          )}
                                          {entry?.status === 'Libur' && (
                                            <span className="inline-flex items-center gap-1 text-[7.5px] font-black text-white bg-amber-500 px-1.5 py-0.2 rounded shadow-xs uppercase tracking-wide shrink-0">
                                              <i className="fa-solid fa-mug-hot text-[7px] text-white"></i> Libur
                                            </span>
                                          )}
                                          {entry?.status === 'Izin' && (
                                            <span className="inline-flex items-center gap-1 text-[7.5px] font-black text-white bg-blue-500 px-1.5 py-0.2 rounded shadow-xs uppercase tracking-wide shrink-0">
                                              <i className="fa-solid fa-envelope-open-text text-[7px] text-white"></i> Izin
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex-1 text-center shrink-0">
                                          {entry?.status === 'Libur' ? (
                                            <span className="inline-block px-2 py-0.5 rounded text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                                              LIBUR / OFF
                                            </span>
                                          ) : entry?.status === 'Izin' ? (
                                            <span className="inline-block px-2 py-0.5 rounded text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                                              IZIN / SAKIT
                                            </span>
                                          ) : (
                                            <span className={cn("px-2 py-0.5 rounded text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider inline-block", shiftColor)}>
                                              {shiftLabel}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Baris 2: Keterangan Telat (1 Baris Saja, Melebar dari Bawah Kasir sampai Bawah Shift) */}
                                      {entry?.alasan_telat && (
                                        <div className="mt-1 flex items-center gap-1.5 min-w-0">
                                          <i className="fa-regular fa-comment-dots text-[8px] text-red-500 shrink-0"></i>
                                          <p 
                                            className="text-[8px] sm:text-[8.5px] text-red-600 font-bold truncate whitespace-nowrap leading-tight bg-red-50/90 px-2 py-0.5 rounded border border-red-200/70 flex-1 min-w-0" 
                                            title={entry.alasan_telat}
                                          >
                                            "{entry.alasan_telat}"
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Area Kanan: Jam Masuk & Tombol Edit */}
                                    <div className="shrink-0 text-right pl-2 flex flex-col items-end justify-center relative min-w-[70px]">
                                      {props.kasirRole === 'owner' && (
                                        <button 
                                          type="button"
                                          onClick={(e) => { 
                                            e.stopPropagation(); 
                                            handleOpenEditAbsen(id, acc, todayStr, entry);
                                          }}
                                          className="w-6 h-6 -mr-1 -mt-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-all cursor-pointer"
                                          title="Edit Absensi Kasir"
                                        >
                                          <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                                        </button>
                                      )}
                                      <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">MASUK</p>
                                      <p className={cn(
                                        "text-[10px] sm:text-[11px] font-black tabular-nums leading-none tracking-tight",
                                        entry && entry.jam_masuk && entry.jam_masuk !== '-' ? "text-teal-600" : "text-slate-300"
                                      )}>
                                        {entry && entry.jam_masuk ? entry.jam_masuk : '--:--'}
                                      </p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                        )}
                      </div>
                    )
                  })() : (() => {
                    const cashiers = Object.entries(props.kasirList).filter(([id]) => id !== 'owner')
                    
                    const [yyyy, mm] = absenFilterMonth.split('-').map(Number);
                    const totalDaysInMonth = new Date(yyyy, mm, 0).getDate();
                    const now = new Date();
                    const isCurrentMonth = now.getFullYear() === yyyy && (now.getMonth() + 1) === mm;
                    const isFutureMonth = (yyyy > now.getFullYear()) || (yyyy === now.getFullYear() && mm > (now.getMonth() + 1));
                    
                    // Sembunyikan tanggal yang belum sampai harinya.
                    // - Jika bulan sekarang: batas maksimal hari adalah hari ini (now.getDate()).
                    // - Jika bulan masa lalu: batas maksimal adalah seluruh hari dalam bulan tersebut.
                    // - Jika bulan masa depan: 0 hari (kosongkan/sembunyikan).
                    let maxDay = totalDaysInMonth;
                    if (isCurrentMonth) {
                      maxDay = now.getDate();
                    } else if (isFutureMonth) {
                      maxDay = 0;
                    }

                    // Hanya munculkan tanggal kolom hari ini dan hari-hari sebelumnya dari tanggal 1
                    const daysInSelectedMonth = maxDay > 0
                      ? Array.from({ length: maxDay }, (_, i) => new Date(yyyy, mm - 1, maxDay - i)) // descending order: dari hari ini mundur ke tgl 1
                      : [];

                    return (
                      <div className="space-y-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">
                          Riwayat Bulan {new Date(yyyy, mm - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        </p>
                        
                        {daysInSelectedMonth.length === 0 ? (
                          <div className="bg-white rounded-[1.5rem] p-8 text-center border border-gray-100 shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3 text-gray-300">
                              <i className="fa-regular fa-calendar-xmark text-xl"></i>
                            </div>
                            <p className="text-[11px] font-black text-gray-600">Belum Ada Riwayat</p>
                            <p className="text-[9px] font-bold text-gray-400 mt-0.5">Periode bulan yang dipilih belum berjalan.</p>
                          </div>
                        ) : (
                          daysInSelectedMonth.map(date => {
                            const dateStr = date.toLocaleDateString('en-CA')
                            const dayAttendance = effectiveAbsensiList.filter(a => a.tanggal === dateStr)

                            return (
                              <div key={dateStr} className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
                                {/* Date Header */}
                                <div className="bg-blue-50/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                                  <h4 className="text-[11px] font-black text-blue-900">
                                    {date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                  </h4>
                                  {dateStr === now.toLocaleDateString('en-CA') && (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[8px] font-black uppercase tracking-wider">
                                      Hari Ini
                                    </span>
                                  )}
                                </div>
                                
                                {/* Sub-Header Kolom Buku Tulis (Garis Horizontal Bersih) */}
                                <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200/80 text-[8px] font-black text-slate-400 uppercase tracking-wider select-none px-3.5 py-1.5">
                                  <div className="flex-1 pr-3 flex items-center">
                                    <span className="w-[48%] text-left">Kasir</span>
                                    <span className="flex-1 text-center">Shift & Status</span>
                                  </div>
                                  <div className="shrink-0 text-right min-w-[70px]">Jam Masuk</div>
                                </div>

                                <div>
                                  {cashiers.map(([id, acc]) => {
                                    const entry = dayAttendance.find(a => a.username === id)
                                    
                                    let shiftLabel = 'BELUM ABSEN'
                                    let shiftColor = 'text-slate-400'
                                    
                                    if (entry) {
                                      const info = getShiftInfo(entry.jam_masuk, financialSettings, entry.shift);
                                      shiftLabel = info.shiftName;
                                      if (info.isPagi) shiftColor = 'text-orange-600 font-black';
                                      else shiftColor = 'text-purple-600 font-black';
                                      
                                      if (info.isLate) {
                                         shiftLabel += ` (TELAT ${info.lateMins}M)`;
                                         shiftColor = 'text-red-600 font-black';
                                      }
                                    }

                                    return (
                                      <div 
                                        key={id} 
                                        className="flex items-center justify-between py-2.5 px-3.5 border-b border-slate-100 last:border-b-0 bg-white hover:bg-slate-50/70 transition-colors"
                                      >
                                        {/* Area Kiri & Tengah: Kasir, Shift, dan Keterangan Telat (Lebar Penuh Tanpa Garis Berdiri) */}
                                        <div className="flex-1 min-w-0 pr-3 flex flex-col justify-center">
                                          {/* Baris 1: Nama Kasir (Kiri) & Shift / Status (Tengah) */}
                                          <div className="flex items-center">
                                            <div className="w-[48%] min-w-0 pr-2 flex items-center gap-1.5 flex-wrap">
                                              <p className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-tight truncate leading-tight" title={acc.name}>
                                                {acc.name}
                                              </p>
                                              {entry?.status === 'Lembur' && (
                                                <span className="inline-flex items-center gap-1 text-[7.5px] font-black text-white bg-emerald-500 px-1.5 py-0.2 rounded shadow-xs uppercase tracking-wide shrink-0">
                                                  <i className="fa-solid fa-bolt text-[7px] text-yellow-300"></i> Lembur
                                                </span>
                                              )}
                                              {entry?.status === 'Libur' && (
                                                <span className="inline-flex items-center gap-1 text-[7.5px] font-black text-white bg-amber-500 px-1.5 py-0.2 rounded shadow-xs uppercase tracking-wide shrink-0">
                                                  <i className="fa-solid fa-mug-hot text-[7px] text-white"></i> Libur
                                                </span>
                                              )}
                                              {entry?.status === 'Izin' && (
                                                <span className="inline-flex items-center gap-1 text-[7.5px] font-black text-white bg-blue-500 px-1.5 py-0.2 rounded shadow-xs uppercase tracking-wide shrink-0">
                                                  <i className="fa-solid fa-envelope-open-text text-[7px] text-white"></i> Izin
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex-1 text-center shrink-0">
                                              {entry?.status === 'Libur' ? (
                                                <span className="inline-block px-2 py-0.5 rounded text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                                                  LIBUR / OFF
                                                </span>
                                              ) : entry?.status === 'Izin' ? (
                                                <span className="inline-block px-2 py-0.5 rounded text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                                                  IZIN / SAKIT
                                                </span>
                                              ) : (
                                                <p className={cn("text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider", shiftColor)}>
                                                  {shiftLabel}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          {/* Baris 2: Keterangan Telat (1 Baris Saja, Melebar dari Bawah Kasir sampai Bawah Shift) */}
                                          {entry?.alasan_telat && (
                                            <div className="mt-1 flex items-center gap-1.5 min-w-0">
                                              <i className="fa-regular fa-comment-dots text-[8px] text-red-500 shrink-0"></i>
                                              <p 
                                                className="text-[8px] sm:text-[8.5px] text-red-600 font-bold truncate whitespace-nowrap leading-tight bg-red-50 px-1.5 py-0.5 rounded border border-red-200/70 flex-1 min-w-0" 
                                                title={entry.alasan_telat}
                                              >
                                                "{entry.alasan_telat}"
                                              </p>
                                            </div>
                                          )}
                                        </div>

                                        {/* Area Kanan: Jam Masuk & Tombol Edit */}
                                        <div className="shrink-0 text-right pl-2 flex flex-col items-end justify-center relative min-w-[70px]">
                                          {props.kasirRole === 'owner' && (
                                            <button 
                                              type="button"
                                              onClick={(e) => { 
                                                e.stopPropagation(); 
                                                handleOpenEditAbsen(id, acc, dateStr, entry);
                                              }}
                                              className="w-6 h-6 -mr-1 -mt-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-all cursor-pointer"
                                              title="Edit Absensi Kasir"
                                            >
                                              <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                                            </button>
                                          )}
                                          <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">MASUK</p>
                                          <p className={cn(
                                            "text-[10px] sm:text-[11px] font-black tabular-nums leading-none tracking-tight",
                                            entry && entry.jam_masuk && entry.jam_masuk !== '-' ? "text-blue-600" : "text-slate-300"
                                          )}>
                                            {entry && entry.jam_masuk ? entry.jam_masuk : '--:--'}
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )
                  })()}
                  {/* MODAL POPUP EDIT ABSENSI KASIR (UNTUK OWNER) */}
                  {editingAbsen && (
                    <div 
                      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200"
                      onClick={() => setEditingAbsen(null)}
                    >
                      <div 
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Modal Header */}
                        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm shadow-xs">
                              <i className="fa-solid fa-pen-to-square"></i>
                            </div>
                            <div>
                              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">Edit Absensi Kasir</h3>
                              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                                {new Date(editingAbsen.dateStr + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingAbsen(null)}
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-xmark text-sm"></i>
                          </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 overflow-y-auto space-y-3.5 flex-1 custom-scrollbar text-left">
                          {/* 1. Koreksi Akun Kasir (Jika Salah Masuk Akun) */}
                          <div>
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                              Akun Kasir <span className="text-slate-400 font-medium lowercase">(ganti jika kasir salah login)</span>
                            </label>
                            <select
                              value={editingAbsen.selectedCashierId}
                              onChange={(e) => setEditingAbsen(prev => prev ? { ...prev, selectedCashierId: e.target.value } : null)}
                              className="w-full text-xs font-black p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                            >
                              {Object.entries(props.kasirList).filter(([kId]) => kId !== 'owner').map(([kId, kAcc]) => (
                                <option key={kId} value={kId}>
                                  {kAcc.name} ({kId})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 2. Status Kehadiran (Hadir / Lembur / Libur / Izin) */}
                          <div>
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                              Status Kehadiran
                            </label>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                              {[
                                { id: 'Hadir', label: 'Hadir', icon: 'fa-user-check' },
                                { id: 'Lembur', label: 'Lembur', icon: 'fa-bolt' },
                                { id: 'Libur', label: 'Libur/Off', icon: 'fa-mug-hot' },
                                { id: 'Izin', label: 'Izin/Sakit', icon: 'fa-envelope-open-text' },
                              ].map((st) => {
                                const isSelected = editingAbsen.status === st.id;
                                return (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => setEditingAbsen(prev => prev ? { ...prev, status: st.id as any } : null)}
                                    className={cn(
                                      "py-2 px-1.5 rounded-xl text-center border font-black text-[10px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
                                      isSelected
                                        ? st.id === 'Lembur'
                                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                          : st.id === 'Libur'
                                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                          : st.id === 'Izin'
                                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                                          : "bg-blue-600 text-white border-blue-600 shadow-sm"
                                        : "bg-slate-50/80 hover:bg-slate-100 text-slate-600 border-slate-200"
                                    )}
                                  >
                                    <i className={`fa-solid ${st.icon} text-xs`}></i>
                                    <span>{st.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 3. Shift & Jam Masuk (Hanya relevan jika status bukan Libur) */}
                          {editingAbsen.status !== 'Libur' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                                  Shift
                                </label>
                                <select
                                  value={editingAbsen.shift}
                                  onChange={(e) => {
                                    const s = e.target.value as 'PAGI' | 'SIANG' | 'MALAM';
                                    let jam = editingAbsen.jamMasuk;
                                    if (s === 'PAGI' && (!jam || jam >= '13:00')) jam = '07:30:00';
                                    if (s === 'SIANG' && (!jam || jam < '13:00' || jam >= '18:00')) jam = '14:00:00';
                                    if (s === 'MALAM' && (!jam || jam < '18:00')) jam = '19:00:00';
                                    setEditingAbsen(prev => prev ? { ...prev, shift: s, jamMasuk: jam } : null);
                                  }}
                                  className="w-full text-xs font-black p-2 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="PAGI">Shift Pagi</option>
                                  <option value="SIANG">Shift Siang</option>
                                  <option value="MALAM">Shift Malam</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                                  Jam Masuk
                                </label>
                                <input
                                  type="text"
                                  value={editingAbsen.jamMasuk}
                                  onChange={(e) => setEditingAbsen(prev => prev ? { ...prev, jamMasuk: e.target.value } : null)}
                                  placeholder="07:00:00"
                                  className="w-full text-xs font-black p-2 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {/* 4. Edit Keterangan Terlambat */}
                          <div>
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                              Keterangan Terlambat Absen <span className="text-slate-400 font-medium lowercase">(opsional)</span>
                            </label>
                            <textarea
                              value={editingAbsen.alasanTelat}
                              onChange={(e) => setEditingAbsen(prev => prev ? { ...prev, alasanTelat: e.target.value } : null)}
                              placeholder="Tulis atau edit keterangan keterlambatan..."
                              rows={2}
                              className="w-full text-xs p-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white resize-none font-medium text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                          <div>
                            {editingAbsen.entry?.id && (
                              <button
                                type="button"
                                disabled={isSavingAbsen}
                                onClick={handleDeleteAbsen}
                                className="text-[11px] font-black text-rose-600 hover:text-rose-700 hover:underline p-1 cursor-pointer flex items-center gap-1"
                              >
                                <i className="fa-solid fa-trash-can text-[10px]"></i> Hapus Absen
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isSavingAbsen}
                              onClick={() => setEditingAbsen(null)}
                              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={isSavingAbsen}
                              onClick={handleSaveEditAbsen}
                              className="px-4 py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isSavingAbsen ? (
                                <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                              ) : (
                                <i className="fa-solid fa-check text-xs"></i>
                              )}
                              <span>Simpan</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODAL POPUP ALBUM SELFIE ABSENSI (GALLERY FOLDER PER-KASIR) */}
                  <AbsenSelfieGalleryModal
                    isOpen={isSelfieGalleryOpen}
                    onClose={() => setIsSelfieGalleryOpen(false)}
                    storeId={props.activeStoreId && props.activeStoreId !== 'all' ? props.activeStoreId : 'default'}
                    storeName={props.storeName || 'ALFAZA CELL'}
                    kasirList={props.kasirList || {}}
                    showToast={props.showToast}
                  />
                </div>
              )}

              {activeOwnerSubView === 'gaji' && (
                <GajiPanel 
                  kasirList={props.kasirList} 
                  absensiList={effectiveAbsensiList || props.absensiList} 
                  storeName={props.storeName} 
                  showToast={props.showToast}
                  activeStoreId={props.activeStoreId === 'all' ? (props.pantauStoreId || 'all') : (props.activeStoreId || 'all')}
                  transactions={props.transactions}
                  gajiBonusList={props.gajiBonusList}
                  fetchGajiBonus={props.fetchGajiBonus}
                  onConfirm={props.onConfirm}
                />
              )}

              {activeOwnerSubView === 'backup' && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <PengaturanPanel 
                    transactions={props.transactions} 
                    absensiList={props.absensiList} 
                    storeName={props.storeName} 
                    showToast={props.showToast}
                    onConfirm={props.onConfirm}
                    activeStoreId={props.activeStoreId === 'all' ? (props.pantauStoreId || 'all') : (props.activeStoreId || 'all')}
                    onSaveCashierSelf={props.onSaveCashierSelf}
                    kasirList={props.kasirList}
                    userId={props.userId}
                  />
                </div>
              )}

              {activeOwnerSubView === 'izin' && (
                <div className="space-y-4">
                  {/* Form Input Izin */}
                  <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <h4 className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-pen-to-square"></i> Catat Izin Baru
                    </h4>
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">NAMA KASIR</label>
                        <div className="relative">
                          <input 
                            list="kasir-list-izin"
                            value={izinNamaKasir} 
                            onChange={e => setIzinNamaKasir(e.target.value)}
                            placeholder="Pilih atau ketik nama kasir"
                            className="w-full text-xs p-2.5 pr-8 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-orange-400"
                          />
                          <datalist id="kasir-list-izin">
                            {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                              <option key={id} value={acc.name} />
                            ))}
                          </datalist>
                          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-orange-400 pointer-events-none"></i>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">TANGGAL IZIN</label>
                        <input 
                          type="date" 
                          value={izinTanggal} 
                          onChange={e => setIzinTanggal(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-orange-400" 
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">ALASAN</label>
                        <textarea 
                          value={izinAlasan} 
                          onChange={e => setIzinAlasan(e.target.value)}
                          placeholder="Tulis alasan izin..." 
                          rows={2}
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none font-bold bg-white resize-none focus:border-orange-400"
                        ></textarea>
                      </div>
                      <button 
                        onClick={simpanIzin}
                        className="w-full bg-orange-600 text-white text-[10px] font-black py-2.5 rounded-lg uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-save"></i> Simpan Catatan
                      </button>
                    </div>
                  </div>

                  {/* Daftar Catatan Izin */}
                  {catatanIzin.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <i className="fa-solid fa-clipboard-list text-2xl text-gray-300"></i>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Belum ada catatan izin</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Riwayat Izin ({catatanIzin.length})</p>
                      {(() => {
                        const izinWithIndex = catatanIzin.map((item, originalIndex) => ({ ...item, originalIndex }));
                        const groupedIzin: Record<string, typeof izinWithIndex> = {};
                        izinWithIndex.forEach(item => {
                          const dateObj = parseLocalISO(item.tanggal);
                          const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                          if (!groupedIzin[monthKey]) groupedIzin[monthKey] = [];
                          groupedIzin[monthKey].push(item);
                        });
                        
                        const sortedMonths = Object.keys(groupedIzin).sort((a,b) => b.localeCompare(a));
                        
                        return sortedMonths.map(monthKey => {
                          const [y, m] = monthKey.split('-');
                          const date = new Date(parseInt(y), parseInt(m) - 1, 1);
                          const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                          const isExpanded = expandedMonthIzin === monthKey;
                          const items = groupedIzin[monthKey];
                          
                          return (
                            <div key={monthKey} className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                              <div 
                                onClick={() => setExpandedMonthIzin(isExpanded ? null : monthKey)}
                                className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <i className={`fa-solid ${isExpanded ? 'fa-folder-open text-orange-500' : 'fa-folder text-orange-400'} text-lg`}></i>
                                  <div>
                                    <p className="text-xs font-black text-gray-800">{monthName}</p>
                                    <p className="text-[9px] text-gray-500 font-bold">{items.length} catatan</p>
                                  </div>
                                </div>
                                <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400 text-[10px]`}></i>
                              </div>
                              
                              {isExpanded && (
                                <div className="p-2 space-y-2 bg-white/50 border-t border-gray-100">
                                  {items.map((item: any) => (
                                    <div key={item.originalIndex} className="p-3 border border-gray-100 rounded-xl bg-white flex justify-between items-start gap-2 shadow-sm">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-gray-800">{item.nama}</p>
                                        <p className="text-[9px] text-orange-600 font-bold mt-0.5">
                                          <i className="fa-regular fa-calendar-alt mr-1"></i>
                                          {parseLocalISO(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        <p className="text-[10px] text-gray-600 mt-1 leading-snug">{item.alasan}</p>
                                      </div>
                                      <button 
                                        onClick={() => hapusIzin(item.originalIndex)} 
                                        className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 hover:bg-red-200 transition-all"
                                      >
                                        <i className="fa-solid fa-trash text-[10px]"></i>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}

              {activeOwnerSubView === 'grafik' && (() => {
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                // Helper to format Date string to 'YYYY-MM-DD' safely
                const formatLocalISO = (d: Date | string) => {
                  if (!d) return '';
                  if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}/)) {
                    return d.substring(0, 10);
                  }
                  try {
                    const dateObj = typeof d === 'string' ? new Date(d) : d;
                    if (isNaN(dateObj.getTime())) return '';
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  } catch (e) {
                    return '';
                  }
                };

                // Daftar Kasir yang tersedia untuk filter (dari props.kasirList + transaksi riil)
                const kasirFilterOptions = (() => {
                  const options = [{ id: 'Semua', name: 'Semua Kasir' }];
                  const seen = new Set<string>(['semua', 'owner']);
                  
                  // Kasir dari master list
                  Object.entries(props.kasirList || {}).forEach(([id, acc]) => {
                    const cleanId = id.trim().toLowerCase();
                    if (!seen.has(cleanId)) {
                      seen.add(cleanId);
                      options.push({ id, name: acc.name || id });
                    }
                  });

                  // Kasir yang ada di raw data transaksi
                  analyticsRawData.forEach(r => {
                    const kId = (r.kasir_id || '').trim();
                    if (kId && !seen.has(kId.toLowerCase())) {
                      seen.add(kId.toLowerCase());
                      const matchedName = props.kasirList?.[kId]?.name || kId;
                      options.push({ id: kId, name: matchedName });
                    }
                  });

                  return options;
                })();

                // Filter analytics by selected Kasir
                let filteredAnalytics = analyticsData;
                let filteredRawTxs = analyticsRawData;

                if (grafikFilterKasir !== 'Semua') {
                  const targetKasir = grafikFilterKasir.trim().toLowerCase();
                  filteredAnalytics = filteredAnalytics.filter(r => 
                    (r.kasir_id || '').trim().toLowerCase() === targetKasir
                  );
                  filteredRawTxs = filteredRawTxs.filter(r => 
                    (r.kasir_id || '').trim().toLowerCase() === targetKasir
                  );
                }

                // Helper aggregation functions by date string prefix (mendukung data agregat database & fallback transaksi mentah seperti Halaman Profit)
                const countByPrefix = (prefix: string) => {
                  const fromGrouped = filteredAnalytics.filter(r => r.tanggal && r.tanggal.startsWith(prefix))
                                                       .reduce((s, r) => s + Number(r.total_transaksi || 0), 0);
                  if (fromGrouped > 0) return fromGrouped;
                  return filteredRawTxs.filter(t => isPureSalesTx(t) && t.timestamp && t.timestamp.startsWith(prefix)).length;
                };

                const sumByPrefix = (prefix: string) => {
                  const fromGrouped = filteredAnalytics.filter(r => r.tanggal && r.tanggal.startsWith(prefix))
                                                       .reduce((s, r) => s + Number(r.total_omzet || 0), 0);
                  if (fromGrouped > 0) return fromGrouped;
                  return filteredRawTxs.filter(t => isPureSalesTx(t) && t.timestamp && t.timestamp.startsWith(prefix))
                                       .reduce((s, t) => s + Number(t.nominal || 0), 0);
                };

                const adminByPrefix = (prefix: string) => {
                  const fromGrouped = filteredAnalytics.filter(r => r.tanggal && r.tanggal.startsWith(prefix))
                                                       .reduce((s, r) => s + Number(r.total_admin || 0), 0);
                  if (fromGrouped > 0) return fromGrouped;
                  return filteredRawTxs.filter(t => isPureSalesTx(t) && t.timestamp && t.timestamp.startsWith(prefix))
                                       .reduce((s, t) => s + Number(t.adminFee ?? (t as any).admin_fee ?? 0), 0);
                };

                // Trend Data generation based on range
                let trendData: {
                  label: string;
                  shortLabel: string;
                  subLabel: string;
                  dateKey: string;
                  value: number;
                  count: number;
                  admin: number;
                }[] = [];

                if (grafikRange === 'harian') {
                  // 7 Hari Terakhir: Rincian 7 Baris Hari
                  trendData = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(now);
                    d.setDate(d.getDate() - (6 - i));
                    const prefix = formatLocalISO(d);
                    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
                    const dateNum = d.getDate();
                    const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
                    return {
                      label: `${dayName}, ${dateNum} ${monthName}`,
                      shortLabel: `${dayName} ${dateNum}`,
                      subLabel: `${dateNum}/${d.getMonth() + 1}`,
                      dateKey: prefix,
                      value: sumByPrefix(prefix),
                      count: countByPrefix(prefix),
                      admin: adminByPrefix(prefix)
                    };
                  });
                } else if (grafikRange === 'mingguan') {
                  // 30 Hari Terakhir: Rincian 30 Baris Hari
                  trendData = Array.from({ length: 30 }, (_, i) => {
                    const d = new Date(now);
                    d.setDate(d.getDate() - (29 - i));
                    const prefix = formatLocalISO(d);
                    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
                    const dateNum = d.getDate();
                    const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
                    return {
                      label: `${dayName}, ${dateNum} ${monthName}`,
                      shortLabel: `${dateNum}`,
                      subLabel: monthName,
                      dateKey: prefix,
                      value: sumByPrefix(prefix),
                      count: countByPrefix(prefix),
                      admin: adminByPrefix(prefix)
                    };
                  });
                } else {
                  // 1 Tahun: Rincian 12 Baris Bulan
                  trendData = Array.from({ length: 12 }, (_, i) => {
                    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
                    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const monthShort = d.toLocaleDateString('id-ID', { month: 'short' });
                    const monthLong = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                    return {
                      label: monthLong,
                      shortLabel: monthShort,
                      subLabel: String(d.getFullYear()),
                      dateKey: yearMonth,
                      value: sumByPrefix(yearMonth),
                      count: countByPrefix(yearMonth),
                      admin: adminByPrefix(yearMonth)
                    };
                  });
                }

                // Global KPI totals - Dihitung murni dari data periode terpilih (100% klop dengan grafik & tabel)
                const totalVolume = trendData.reduce((sum, d) => sum + d.value, 0);
                const totalItems = trendData.reduce((sum, d) => sum + d.count, 0);
                const avgTransaction = totalItems > 0 ? Math.round(totalVolume / totalItems) : 0;
                const totalAdminLaba = trendData.reduce((sum, d) => sum + d.admin, 0);
                const maxTrendVal = Math.max(...trendData.map(d => d.value), 1);
                const peakTrendItem = trendData.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), trendData[0] || { value: 0, label: '-' });

                // Set tanggal aktif untuk membatasi kategori, jam sibuk, dan leaderboard sesuai filter periode
                const activeDateKeys = new Set(trendData.map(d => d.dateKey));
                const isDateInActiveRange = (dateStr: string) => {
                  if (!dateStr) return false;
                  if (grafikRange === 'bulanan') {
                    const monthKey = dateStr.substring(0, 7);
                    return activeDateKeys.has(monthKey);
                  }
                  const dayKey = dateStr.substring(0, 10);
                  return activeDateKeys.has(dayKey);
                };

                // Breakdown Kategori Penjualan (Hanya transaksi riil pada rentang terpilih)
                const kategoriMap = new Map<string, { nominal: number; count: number }>();
                if (filteredRawTxs && filteredRawTxs.length > 0) {
                  filteredRawTxs.forEach(t => {
                    if (!isPureSalesTx(t)) return;
                    if (!isDateInActiveRange(t.timestamp)) return;
                    const cat = t.kategori || 'Lainnya';
                    const prev = kategoriMap.get(cat) || { nominal: 0, count: 0 };
                    kategoriMap.set(cat, {
                      nominal: prev.nominal + (Number(t.nominal) || 0),
                      count: prev.count + 1
                    });
                  });
                } else {
                  filteredAnalytics.forEach(r => {
                    if (!isDateInActiveRange(r.tanggal)) return;
                    if (r.kategori_breakdown && typeof r.kategori_breakdown === 'object') {
                      Object.entries(r.kategori_breakdown).forEach(([cat, val]) => {
                        const prev = kategoriMap.get(cat) || { nominal: 0, count: 0 };
                        kategoriMap.set(cat, {
                          nominal: prev.nominal + Number(val || 0),
                          count: prev.count + 1
                        });
                      });
                    }
                  });
                }
                const categoryData = Array.from(kategoriMap.entries())
                  .map(([k, v]) => ({ label: k, value: v.nominal, count: v.count }))
                  .sort((a, b) => b.value - a.value);
                const totalCatNominal = categoryData.reduce((s, d) => s + d.value, 0) || 1;

                // Distribusi Waktu (Jam Sibuk - Hanya transaksi riil pada rentang terpilih)
                const hourMap = new Array(24).fill(0);
                filteredRawTxs.forEach(t => {
                  if (!isPureSalesTx(t)) return;
                  if (!isDateInActiveRange(t.timestamp)) return;
                  try {
                    let h = 0;
                    if (typeof t.timestamp === 'string' && t.timestamp.includes('T')) {
                      h = parseInt(t.timestamp.split('T')[1].substring(0, 2), 10);
                    } else {
                      const d = new Date(t.timestamp);
                      if (!isNaN(d.getTime())) h = d.getHours();
                    }
                    if (!isNaN(h) && h >= 0 && h < 24) hourMap[h]++;
                  } catch (e) {}
                });

                const timeBlocks = [
                  { label: 'Pagi', hours: '06:00 - 12:00', icon: 'fa-sun', color: 'from-amber-400 to-amber-500', barColor: 'bg-amber-400', value: hourMap.slice(6, 12).reduce((a, b) => a + b, 0) },
                  { label: 'Siang', hours: '12:00 - 15:00', icon: 'fa-cloud-sun', color: 'from-orange-500 to-amber-600', barColor: 'bg-orange-500', value: hourMap.slice(12, 15).reduce((a, b) => a + b, 0) },
                  { label: 'Sore', hours: '15:00 - 18:00', icon: 'fa-cloud-sun-rain', color: 'from-blue-500 to-indigo-600', barColor: 'bg-blue-500', value: hourMap.slice(15, 18).reduce((a, b) => a + b, 0) },
                  { label: 'Malam', hours: '18:00 - 24:00', icon: 'fa-moon', color: 'from-indigo-600 to-purple-800', barColor: 'bg-indigo-600', value: hourMap.slice(18, 24).reduce((a, b) => a + b, 0) + hourMap.slice(0, 6).reduce((a, b) => a + b, 0) }
                ];
                const maxTimeVal = Math.max(...timeBlocks.map(d => d.value), 1);
                const busiestBlock = timeBlocks.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), timeBlocks[0]);

                // Leaderboard Kasir (Hanya transaksi riil pada rentang terpilih)
                const kasirLeaderboard = (() => {
                  if (grafikFilterKasir !== 'Semua') return [];
                  const map = new Map<string, { omzet: number; count: number }>();
                  if (filteredRawTxs && filteredRawTxs.length > 0) {
                    filteredRawTxs.forEach(t => {
                      if (!isPureSalesTx(t)) return;
                      if (!isDateInActiveRange(t.timestamp)) return;
                      const kId = (t.kasir_id || 'Unknown').trim();
                      const prev = map.get(kId) || { omzet: 0, count: 0 };
                      map.set(kId, {
                        omzet: prev.omzet + (Number(t.nominal) || 0),
                        count: prev.count + 1
                      });
                    });
                  } else {
                    filteredAnalytics.forEach(r => {
                      if (!isDateInActiveRange(r.tanggal)) return;
                      const kId = (r.kasir_id || 'Unknown').trim();
                      const prev = map.get(kId) || { omzet: 0, count: 0 };
                      map.set(kId, {
                        omzet: prev.omzet + (Number(r.total_omzet) || 0),
                        count: prev.count + (Number(r.total_transaksi) || 0)
                      });
                    });
                  }
                  return Array.from(map.entries())
                    .map(([id, stats]) => {
                      const name = props.kasirList?.[id]?.name || id;
                      const pct = totalVolume > 0 ? (stats.omzet / totalVolume) * 100 : 0;
                      return { id, name, omzet: stats.omzet, count: stats.count, pct };
                    })
                    .sort((a, b) => b.omzet - a.omzet);
                })();

                const categoryColors = [
                  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b'
                ];

                return (
                  <div className="space-y-6 pb-8 animate-in fade-in duration-300">
                    {/* Header Controls */}
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Kasir Selector */}
                        <div className="relative flex-1 max-w-xs">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
                            <i className="fa-solid fa-user-tag"></i>
                          </div>
                          <select
                            value={grafikFilterKasir}
                            onChange={(e) => setGrafikFilterKasir(e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 text-[11px] font-black py-2.5 pl-8 pr-8 rounded-xl outline-none cursor-pointer appearance-none transition-all"
                          >
                            {kasirFilterOptions.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                          </select>
                          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                        </div>

                        {/* Quick Refresh Button */}
                        <button
                          onClick={() => setGrafikRefreshKey(k => k + 1)}
                          title="Segarkan Data Grafik"
                          className={cn(
                            "w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-95 shrink-0",
                            isAnalyticsLoading && "animate-spin text-emerald-600"
                          )}
                        >
                          <i className="fa-solid fa-arrows-rotate text-xs"></i>
                        </button>
                      </div>

                      {/* Time Range Filter & Type Switcher */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Range Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          {(['harian', 'mingguan', 'bulanan'] as const).map(range => (
                            <button
                              key={range}
                              onClick={() => setGrafikRange(range)}
                              className={cn(
                                "text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all",
                                grafikRange === range ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                              )}
                            >
                              {range === 'harian' ? '7 Hari' : range === 'mingguan' ? '30 Hari' : '1 Tahun'}
                            </button>
                          ))}
                        </div>

                        {/* Chart Type Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button
                            onClick={() => setGrafikType('bar')}
                            title="Tampilan Diagram Batang"
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5",
                              grafikType === 'bar' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                          >
                            <i className="fa-solid fa-chart-column"></i>
                            <span className="hidden sm:inline">Batang</span>
                          </button>
                          <button
                            onClick={() => setGrafikType('line')}
                            title="Tampilan Grafik Garis Halus"
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5",
                              grafikType === 'line' ? "bg-white text-amber-500 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                          >
                            <i className="fa-solid fa-wave-square"></i>
                            <span className="hidden sm:inline">Kurva</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* KPI Ringkasan Cards (4 Grid) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Total Omzet */}
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-4 rounded-2xl text-white shadow-md shadow-emerald-500/10 relative overflow-hidden group">
                        <div className="absolute -right-3 -top-3 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest">Total Omzet</p>
                          <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-money-bill-trend-up"></i>
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white truncate tabular-nums">
                          Rp {totalVolume.toLocaleString('id-ID')}
                        </h3>
                        <p className="text-[9px] text-emerald-100 mt-1 font-bold">
                          {trendData.length > 0 ? `Rata-rata Rp ${Math.round(totalVolume / trendData.length).toLocaleString('id-ID')} / ${grafikRange === 'bulanan' ? 'bln' : 'hari'}` : '-'}
                        </p>
                      </div>

                      {/* Total Laba / Admin Fee */}
                      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-4 rounded-2xl text-white shadow-md shadow-orange-500/10 relative overflow-hidden group">
                        <div className="absolute -right-3 -top-3 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-black text-amber-100 uppercase tracking-widest">Laba / Admin Fee</p>
                          <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-coins"></i>
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white truncate tabular-nums">
                          Rp {totalAdminLaba.toLocaleString('id-ID')}
                        </h3>
                        <p className="text-[9px] text-amber-100 mt-1 font-bold">
                          {totalItems > 0 ? `Rata-rata Rp ${Math.round(totalAdminLaba / totalItems).toLocaleString('id-ID')} / trx` : '-'}
                        </p>
                      </div>

                      {/* Total Transaksi */}
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-700 p-4 rounded-2xl text-white shadow-md shadow-blue-500/10 relative overflow-hidden group">
                        <div className="absolute -right-3 -top-3 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-black text-blue-100 uppercase tracking-widest">Volume Transaksi</p>
                          <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-receipt"></i>
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white truncate tabular-nums">
                          {totalItems.toLocaleString('id-ID')} <span className="text-xs font-normal">Trx</span>
                        </h3>
                        <p className="text-[9px] text-blue-100 mt-1 font-bold">
                          {trendData.length > 0 ? `${(totalItems / trendData.length).toFixed(1)} trx / ${grafikRange === 'bulanan' ? 'bln' : 'hari'}` : '-'}
                        </p>
                      </div>

                      {/* Rata-rata Nilai Trx (Basket Size) */}
                      <div className="bg-gradient-to-br from-purple-500 to-fuchsia-700 p-4 rounded-2xl text-white shadow-md shadow-purple-500/10 relative overflow-hidden group">
                        <div className="absolute -right-3 -top-3 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-black text-purple-100 uppercase tracking-widest">Rata-rata Nilai Trx</p>
                          <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-calculator"></i>
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white truncate tabular-nums">
                          Rp {avgTransaction.toLocaleString('id-ID')}
                        </h3>
                        <p className="text-[9px] text-purple-100 mt-1 font-bold">
                          {peakTrendItem && peakTrendItem.value > 0 ? `Puncak: ${peakTrendItem.shortLabel}` : 'Stabil'}
                        </p>
                      </div>
                    </div>

                    {/* Chart Card Utama */}
                    <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                              Grafik Tren Pendapatan Penjualan
                            </h4>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            Periode: {grafikRange === 'harian' ? '7 Hari Terakhir' : grafikRange === 'mingguan' ? '30 Hari Terakhir' : '1 Tahun Terakhir (12 Bulan)'} • Filter: {grafikFilterKasir === 'Semua' ? 'Semua Kasir' : (props.kasirList?.[grafikFilterKasir]?.name || grafikFilterKasir)}
                          </p>
                        </div>

                        {peakTrendItem && peakTrendItem.value > 0 && (
                          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-3 py-1 rounded-xl border border-amber-200/70 text-[10px] font-black">
                            <i className="fa-solid fa-trophy text-amber-500"></i>
                            <span>Tertinggi: {peakTrendItem.shortLabel} (Rp {peakTrendItem.value.toLocaleString('id-ID')})</span>
                          </div>
                        )}
                      </div>

                      {/* Canvas Chart Area */}
                      {totalVolume === 0 && !isAnalyticsLoading ? (
                        <div className="py-16 text-center flex flex-col items-center justify-center">
                          <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center text-3xl mb-3">
                            <i className="fa-solid fa-chart-line"></i>
                          </div>
                          <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Belum Ada Transaksi Pada Periode Ini</p>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                            Tidak ditemukan data transaksi untuk {grafikFilterKasir !== 'Semua' ? `kasir "${grafikFilterKasir}"` : 'toko ini'} dalam rentang {grafikRange === 'harian' ? '7 Hari' : grafikRange === 'mingguan' ? '30 Hari' : '1 Tahun'}.
                          </p>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => setGrafikRange('bulanan')}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase transition-all"
                            >
                              Lihat 1 Tahun
                            </button>
                            {grafikFilterKasir !== 'Semua' && (
                              <button
                                onClick={() => setGrafikFilterKasir('Semua')}
                                className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase transition-all"
                              >
                                Pilih Semua Kasir
                              </button>
                            )}
                          </div>
                        </div>
                      ) : grafikType === 'bar' ? (
                        /* Modern Bar Chart */
                        <div className="pt-6 overflow-x-auto scrollbar-thin">
                          <div className={cn(
                            "h-56 flex items-end justify-between relative pb-8",
                            trendData.length > 20 ? "min-w-[620px] sm:min-w-full gap-1" :
                            trendData.length > 10 ? "min-w-[480px] sm:min-w-full gap-1.5 sm:gap-2.5" :
                            "gap-2 sm:gap-4"
                          )}>
                            {/* Horizontal guide lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                              {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => (
                                <div key={idx} className="w-full border-t border-dashed border-slate-100 flex items-center justify-end">
                                  <span className="text-[8px] font-bold text-slate-300 -mt-3.5 bg-white px-1">
                                    Rp {Math.round(maxTrendVal * ratio).toLocaleString('id-ID')}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Bar Columns */}
                            {trendData.map((d, i) => {
                              const heightPct = Math.max((d.value / maxTrendVal) * 100, d.value > 0 ? 6 : 2);
                              const isPeak = d.value === maxTrendVal && d.value > 0;
                              return (
                                <div key={i} className="relative flex flex-col items-center flex-1 h-full justify-end z-10 group/col">
                                  {/* Floating Tooltip */}
                                  <div className="absolute -top-12 opacity-0 group-hover/col:opacity-100 group-active/col:opacity-100 transition-all duration-200 pointer-events-none z-30 transform -translate-y-2 group-hover/col:-translate-y-3">
                                    <div className="bg-slate-900 text-white p-2 rounded-xl shadow-xl whitespace-nowrap text-center">
                                      <p className="text-[8px] font-bold text-slate-400">{d.label}</p>
                                      <p className="text-[11px] font-black text-emerald-400 tabular-nums">Rp {d.value.toLocaleString('id-ID')}</p>
                                      <div className="flex items-center justify-center gap-2 text-[8px] text-slate-300 mt-0.5">
                                        <span>{d.count} trx</span>
                                        <span>•</span>
                                        <span className="text-amber-300">Laba Rp {d.admin.toLocaleString('id-ID')}</span>
                                      </div>
                                      <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mb-1"></div>
                                    </div>
                                  </div>

                                  {/* Bar Body */}
                                  <div className="w-full flex justify-center items-end h-full">
                                    <div
                                      style={{ height: `${heightPct}%` }}
                                      className={cn(
                                        "w-full max-w-[36px] rounded-t-xl transition-all duration-500 cursor-pointer relative group-hover/col:scale-105",
                                        isPeak 
                                          ? "bg-gradient-to-t from-emerald-600 via-teal-500 to-cyan-400 shadow-md shadow-emerald-500/30" 
                                          : d.value > 0 
                                            ? "bg-gradient-to-t from-slate-400 via-blue-500 to-cyan-400 group-hover/col:from-blue-600 group-hover/col:to-cyan-300 shadow-sm" 
                                            : "bg-slate-100"
                                      )}
                                    >
                                      {isPeak && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-amber-500 text-[10px]">
                                          <i className="fa-solid fa-crown"></i>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Bottom Label */}
                                  <div className="absolute -bottom-1 left-0 right-0 text-center">
                                    <p className={cn("text-[9px] font-black uppercase truncate", isPeak ? "text-emerald-600 font-extrabold" : "text-slate-600")}>
                                      {d.shortLabel}
                                    </p>
                                    <p className="text-[7px] text-slate-400 font-bold -mt-0.5">{d.subLabel}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* Smooth Spline Curve Chart (Petir) */
                        <div className="pt-6 overflow-x-auto scrollbar-thin">
                          <div className={cn(
                            "h-56 relative pb-8",
                            trendData.length > 20 ? "min-w-[620px] sm:min-w-full" : "w-full"
                          )}>
                            {/* Horizontal guide lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                              {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => (
                                <div key={idx} className="w-full border-t border-dashed border-slate-100 flex items-center justify-end">
                                  <span className="text-[8px] font-bold text-slate-300 -mt-3.5 bg-white px-1">
                                    Rp {Math.round(maxTrendVal * ratio).toLocaleString('id-ID')}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Responsive SVG Area & Line */}
                            <div className="absolute inset-0 pb-8 w-full h-full">
                              <svg viewBox="0 0 1000 240" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                <defs>
                                  <linearGradient id="chartSplineGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                  </linearGradient>
                                  <linearGradient id="chartStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="50%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#f59e0b" />
                                  </linearGradient>
                                </defs>

                                {(() => {
                                  const n = trendData.length;
                                  if (n < 2) return null;
                                  const pts = trendData.map((d, i) => {
                                    const x = 30 + (i / (n - 1)) * 940;
                                    const y = 20 + (1 - (d.value / maxTrendVal)) * 190;
                                    return { x, y, data: d };
                                  });

                                  // Simple smooth path generation
                                  let pathD = `M ${pts[0].x} ${pts[0].y}`;
                                  for (let i = 0; i < pts.length - 1; i++) {
                                    const p0 = pts[i];
                                    const p1 = pts[i + 1];
                                    const cpX = (p0.x + p1.x) / 2;
                                    pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
                                  }

                                  const areaD = `${pathD} L ${pts[pts.length - 1].x} 230 L ${pts[0].x} 230 Z`;

                                  return (
                                    <>
                                      <path d={areaD} fill="url(#chartSplineGrad)" />
                                      <path
                                        d={pathD}
                                        fill="none"
                                        stroke="url(#chartStrokeGrad)"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </>
                                  );
                                })()}
                              </svg>
                            </div>

                            {/* Node Markers & Tooltips */}
                            <div className="absolute inset-0 pb-8 w-full h-full pointer-events-none">
                              {trendData.map((d, i) => {
                                const leftPct = (i / Math.max(trendData.length - 1, 1)) * 100;
                                const bottomPct = Math.min(Math.max((d.value / maxTrendVal) * 100, 4), 96);
                                const isPeak = d.value === maxTrendVal && d.value > 0;
                                return (
                                  <div
                                    key={i}
                                    className="absolute group/node pointer-events-auto"
                                    style={{ left: `${leftPct}%`, bottom: `${bottomPct}%`, transform: 'translate(-50%, 50%)' }}
                                  >
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/node:opacity-100 transition-opacity z-30 pointer-events-none">
                                      <div className="bg-slate-900 text-white p-2 rounded-xl shadow-xl whitespace-nowrap text-center">
                                        <p className="text-[8px] font-bold text-slate-400">{d.label}</p>
                                        <p className="text-[11px] font-black text-amber-400 tabular-nums">Rp {d.value.toLocaleString('id-ID')}</p>
                                        <p className="text-[8px] text-slate-300">{d.count} transaksi • Laba Rp {d.admin.toLocaleString('id-ID')}</p>
                                        <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mb-1"></div>
                                      </div>
                                    </div>

                                    {/* Circle Marker */}
                                    <div className={cn(
                                      "w-3.5 h-3.5 rounded-full border-2 border-white shadow-md cursor-pointer transition-transform group-hover/node:scale-150",
                                      isPeak ? "bg-amber-500 ring-2 ring-amber-300" : "bg-emerald-500"
                                    )}></div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Bottom Labels */}
                            <div className="absolute -bottom-1 left-0 right-0 flex justify-between px-1">
                              {trendData.map((d, i) => (
                                <div key={i} className="flex-1 text-center">
                                  <p className="text-[9px] font-black text-slate-600 uppercase truncate">{d.shortLabel}</p>
                                  <p className="text-[7px] text-slate-400 font-bold -mt-0.5">{d.subLabel}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Breakdown 2 Kolom: Kategori Terlaris & Jam Sibuk */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Kartu 1: Kategori Terlaris */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                              <i className="fa-solid fa-chart-pie text-emerald-500"></i> Kategori Terlaris
                            </h4>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Kontribusi omzet per kategori</p>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                            {categoryData.length} Jenis
                          </span>
                        </div>

                        {categoryData.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-400">
                            <i className="fa-solid fa-tags text-2xl mb-2 text-slate-300"></i>
                            <p className="text-[10px] font-bold">Belum ada kategori penjualan</p>
                          </div>
                        ) : (
                          <div className="space-y-3 flex-1 flex flex-col justify-center">
                            {categoryData.slice(0, 5).map((cat, idx) => {
                              const pct = ((cat.value / totalCatNominal) * 100);
                              const color = categoryColors[idx % categoryColors.length];
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                                      <span className="font-black text-slate-700 truncate">{cat.label}</span>
                                      <span className="text-[9px] font-bold text-slate-400">({cat.count} trx)</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-black text-slate-900 tabular-nums">Rp {cat.value.toLocaleString('id-ID')}</span>
                                      <span className="text-[9px] font-black text-emerald-600 ml-1.5">({pct.toFixed(1)}%)</span>
                                    </div>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-700"
                                      style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Kartu 2: Jam Sibuk Operasional */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                              <i className="fa-solid fa-clock text-blue-500"></i> Jam Sibuk Pelanggan
                            </h4>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Distribusi waktu transaksi harian</p>
                          </div>
                          {busiestBlock && busiestBlock.value > 0 && (
                            <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-xl">
                              Puncak: {busiestBlock.label}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 flex-1 items-center">
                          {timeBlocks.map((blk, idx) => {
                            const isBusiest = blk.value === maxTimeVal && blk.value > 0;
                            const pct = totalItems > 0 ? ((blk.value / totalItems) * 100) : 0;
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "p-3 rounded-2xl border transition-all",
                                  isBusiest 
                                    ? "bg-gradient-to-br from-blue-50 to-indigo-50/50 border-blue-200 shadow-sm" 
                                    : "bg-slate-50/70 border-slate-100"
                                )}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                      "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white bg-gradient-to-br",
                                      blk.color
                                    )}>
                                      <i className={`fa-solid ${blk.icon}`}></i>
                                    </span>
                                    <div>
                                      <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{blk.label}</p>
                                      <p className="text-[7px] font-bold text-slate-400 mt-0.5">{blk.hours}</p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-900 tabular-nums">{blk.value} <span className="text-[8px] font-normal text-slate-400">trx</span></span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden mt-2">
                                  <div
                                    className={cn("h-full rounded-full transition-all duration-700", blk.barColor)}
                                    style={{ width: `${Math.max(pct, blk.value > 0 ? 5 : 0)}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Leaderboard Kasir (Hanya tampil jika filter 'Semua Kasir' & ada lebih dari 1 kasir) */}
                    {kasirLeaderboard.length > 0 && (
                      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-3.5">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                            <i className="fa-solid fa-ranking-star text-amber-500"></i> Peringkat Penjualan Kasir
                          </h4>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-0.5 rounded-full">
                            Periode {grafikRange === 'harian' ? '7 Hari' : grafikRange === 'mingguan' ? '30 Hari' : '1 Tahun'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {kasirLeaderboard.map((k, idx) => {
                            const medalBadges = [
                              'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-amber-200/50',
                              'bg-gradient-to-r from-slate-300 to-slate-400 text-white shadow-slate-200/50',
                              'bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-orange-200/50'
                            ];
                            return (
                              <div
                                key={k.id}
                                onClick={() => setGrafikFilterKasir(k.id)}
                                className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.98] shadow-xs"
                              >
                                {/* 1. ATAS: Peringkat (#1) & Nama Kasir */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={cn(
                                      "w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs",
                                      idx < 3 ? medalBadges[idx] : "bg-slate-100 text-slate-600 border border-slate-200"
                                    )}>
                                      #{idx + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <h5 className="text-xs sm:text-[13px] font-black text-slate-900 uppercase tracking-tight truncate group-hover:text-emerald-700 transition-colors">
                                        {k.name}
                                      </h5>
                                      {k.id !== k.name && (
                                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block -mt-0.5 truncate">
                                          ID: {k.id}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className={cn(
                                    "text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 tabular-nums",
                                    idx === 0 ? "bg-amber-100 text-amber-800" :
                                    idx === 1 ? "bg-slate-100 text-slate-700" :
                                    idx === 2 ? "bg-orange-100 text-orange-800" :
                                    "bg-emerald-50 text-emerald-700"
                                  )}>
                                    {k.pct.toFixed(1)}%
                                  </span>
                                </div>

                                {/* 2. TENGAH: Jumlah Uang (Omzet) */}
                                <div className="my-1 py-2 px-3 bg-slate-50/90 rounded-xl border border-slate-100 flex items-center justify-between">
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Omzet
                                  </span>
                                  <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight tabular-nums">
                                    Rp {k.omzet.toLocaleString('id-ID')}
                                  </span>
                                </div>

                                {/* 3. BAWAH: Total Transaksi & Bar % */}
                                <div className="mt-2 space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-bold text-slate-500 flex items-center gap-1.5">
                                      <i className="fa-solid fa-receipt text-[9px] text-blue-500"></i>
                                      <strong className="text-slate-800 font-black">{k.count}</strong> Transaksi
                                    </span>
                                    <span className="text-slate-400 font-bold text-[9.5px]">
                                      Porsi: <strong className="text-emerald-700 font-black">{k.pct.toFixed(1)}%</strong>
                                    </span>
                                  </div>

                                  {/* Bar % Visual */}
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-2xs">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        idx === 0 ? "bg-gradient-to-r from-amber-400 to-yellow-500" :
                                        idx === 1 ? "bg-gradient-to-r from-slate-400 to-slate-500" :
                                        idx === 2 ? "bg-gradient-to-r from-amber-600 to-orange-600" :
                                        "bg-gradient-to-r from-emerald-500 to-teal-500"
                                      )}
                                      style={{ width: `${Math.min(Math.max(k.pct, 2), 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tabel Rangkuman Data Terperinci */}
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                          <i className="fa-solid fa-table-list text-slate-500"></i> Rangkuman Data Periode
                        </h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          {trendData.length} Baris Data
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-black text-[9px] uppercase tracking-wider">
                              <th className="py-2.5 px-3">Periode</th>
                              <th className="py-2.5 px-3 text-center">Transaksi</th>
                              <th className="py-2.5 px-3 text-right">Omzet</th>
                              <th className="py-2.5 px-3 text-right">Laba Admin</th>
                              <th className="py-2.5 px-3 text-right">Rata-rata</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {trendData.slice().reverse().map((row, i) => {
                              const isHighest = row.value === maxTrendVal && row.value > 0;
                              const rowAvg = row.count > 0 ? Math.round(row.value / row.count) : 0;
                              return (
                                <tr key={i} className={cn("hover:bg-slate-50/80 transition-colors", isHighest && "bg-emerald-50/40")}>
                                  <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-2">
                                    {isHighest && <i className="fa-solid fa-star text-amber-500 text-[9px]" title="Nilai Tertinggi"></i>}
                                    <span>{row.label}</span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-bold text-slate-600 tabular-nums">
                                    {row.count} trx
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-black text-slate-900 tabular-nums">
                                    Rp {row.value.toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-amber-600 tabular-nums">
                                    Rp {row.admin.toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-slate-500 tabular-nums">
                                    Rp {rowAvg.toLocaleString('id-ID')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-slate-100 bg-slate-50/60 font-black text-[11px] text-slate-900">
                              <td className="py-3 px-3 uppercase text-[10px] tracking-wider text-slate-600">Total Keseluruhan</td>
                              <td className="py-3 px-3 text-center text-blue-600 tabular-nums">{totalItems} trx</td>
                              <td className="py-3 px-3 text-right text-emerald-700 tabular-nums">Rp {totalVolume.toLocaleString('id-ID')}</td>
                              <td className="py-3 px-3 text-right text-amber-600 tabular-nums">Rp {totalAdminLaba.toLocaleString('id-ID')}</td>
                              <td className="py-3 px-3 text-right text-purple-700 tabular-nums">Rp {avgTransaction.toLocaleString('id-ID')}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {activeOwnerSubView === 'performa' && (
                <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-[2.5rem] border border-purple-100 animate-in fade-in zoom-in duration-500 shadow-xl shadow-purple-500/5">
                  
                  {/* Segmented Control Filter */}
                  <div className="bg-white/60 p-1.5 rounded-2xl mb-6 flex backdrop-blur-md border border-white">
                    {['harian', 'mingguan', 'bulanan'].map(r => (
                      <button
                        key={r}
                        onClick={() => setPerformaRange(r as any)}
                        className={cn(
                          "flex-1 text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300",
                          performaRange === r 
                            ? "bg-purple-600 text-white shadow-md shadow-purple-200" 
                            : "text-purple-400 hover:text-purple-600 hover:bg-white/50"
                        )}
                      >
                        {r === 'harian' ? 'HARI INI' : r === 'mingguan' ? 'MINGGU INI' : 'BULAN INI'}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    if (isAnalyticsLoading) {
                      return (
                        <div className="flex flex-col items-center justify-center py-10 bg-white/50 rounded-3xl border border-white border-dashed">
                           <i className="fa-solid fa-spinner fa-spin text-4xl text-purple-200 mb-3"></i>
                           <p className="text-center text-[11px] font-bold text-purple-400 uppercase tracking-widest">Menghitung Data...</p>
                        </div>
                      )
                    }

                    // Calculate totals from RPC data
                    const totalGlobalOmzet = analyticsData.reduce((s, row) => s + Number(row.total_omzet), 0)
                    const totalGlobalTxs = analyticsData.reduce((s, row) => s + Number(row.total_transaksi), 0)

                    const performaData = Object.keys(props.kasirList || {})
                      .filter(id => id !== 'owner')
                      .map(kId => {
                        const kasirName = props.kasirList?.[kId]?.name || kId;
                        // DB stores kasir_id as the login username (kId), NOT the display name
                        const rows = analyticsData.filter(r => 
                          (r.kasir_id || '').trim().toLowerCase() === kId.trim().toLowerCase()
                        )
                        const vol = rows.reduce((s, r) => s + Number(r.total_omzet), 0)
                        const count = rows.reduce((s, r) => s + Number(r.total_transaksi), 0)
                        const avg = count > 0 ? Math.round(vol / count) : 0
                        const contribution = totalGlobalOmzet > 0 ? ((vol / totalGlobalOmzet) * 100) : 0

                        return {
                          id: kId,
                          name: kasirName,
                          vol,
                          count,
                          avg,
                          contribution
                        }
                      }).sort((a, b) => b.vol - a.vol)

                    if (performaData.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-10 bg-white/50 rounded-3xl border border-white border-dashed">
                           <i className="fa-solid fa-ghost text-4xl text-purple-200 mb-3"></i>
                           <p className="text-center text-[11px] font-bold text-purple-400 uppercase tracking-widest">Data kasir tidak ditemukan</p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                        {/* Summary KPI Global */}
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div className="bg-white/60 backdrop-blur rounded-2xl p-3 border border-white">
                            <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-0.5">Total Transaksi</p>
                            <p className="text-sm font-black text-purple-900">{totalGlobalTxs} <span className="text-[9px] text-purple-500 font-bold">Item</span></p>
                          </div>
                          <div className="bg-white/60 backdrop-blur rounded-2xl p-3 border border-white">
                            <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-0.5">Total Omzet</p>
                            <p className="text-sm font-black text-purple-900 truncate">Rp {totalGlobalOmzet.toLocaleString('id-ID')}</p>
                          </div>
                        </div>

                        {/* Top 1 Highlight */}
                        {performaData.length > 0 && performaData[0].vol > 0 && (
                          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2rem] p-5 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden group mb-4">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3 relative z-10">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-inner text-xl">
                                  <i className="fa-solid fa-crown"></i>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-orange-100 uppercase tracking-widest leading-none mb-1">KASIR TERBAIK</p>
                                  <h3 className="text-lg font-black text-white leading-none">{performaData[0].name}</h3>
                                </div>
                              </div>
                              <div className="text-right relative z-10">
                                <p className="text-[2rem] font-black text-white leading-none drop-shadow-md">#1</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 relative z-10">
                              <div className="bg-black/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                                <p className="text-[8px] font-black text-orange-100 uppercase tracking-widest opacity-80 mb-0.5">Omzet Terkumpul</p>
                                <p className="text-sm font-black text-white">Rp {performaData[0].vol.toLocaleString('id-ID')}</p>
                              </div>
                              <div className="bg-black/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                                <p className="text-[8px] font-black text-orange-100 uppercase tracking-widest opacity-80 mb-0.5">Jumlah Layan</p>
                                <p className="text-sm font-black text-white">{performaData[0].count} <span className="text-[9px]">Item</span></p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Other Ranks List */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-purple-900 uppercase tracking-widest pl-1 mb-1">Rincian Performa Individu</p>
                          {performaData.map((p, idx) => {
                            if (idx === 0 && p.vol > 0) return null; // Skip top 1 if already highlighted
                            
                            const isZero = p.vol === 0;
                            return (
                              <div key={p.id} className={cn(
                                "p-4 bg-white rounded-2xl border shadow-sm transition-all group",
                                isZero ? "border-gray-100 opacity-60 grayscale" : "border-purple-100 hover:border-purple-300"
                              )}>
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner",
                                      isZero ? "bg-gray-100 text-gray-400" :
                                      idx === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                                      idx === 1 ? "bg-gradient-to-br from-gray-300 to-slate-400 text-white" :
                                      idx === 2 ? "bg-gradient-to-br from-amber-700 to-yellow-800 text-white" :
                                      "bg-purple-100 text-purple-700"
                                    )}>
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-gray-800 leading-none mb-1">{p.name}</p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{p.count} Trx</span>
                                        {!isZero && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Avg: Rp {(p.avg/1000).toFixed(0)}K</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={cn("text-sm font-black", isZero ? "text-gray-400" : "text-purple-700")}>
                                      Rp {p.vol.toLocaleString('id-ID')}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Progress Bar Contribution */}
                                {!isZero && (
                                  <div className="relative pt-1">
                                    <div className="flex mb-1 items-center justify-between">
                                      <span className="text-[8px] font-bold text-purple-400 uppercase tracking-widest">Kontribusi Omzet Toko</span>
                                      <span className="text-[9px] font-black text-purple-600">{p.contribution.toFixed(1)}%</span>
                                    </div>
                                    <div className="overflow-hidden h-1.5 flex rounded-full bg-purple-50">
                                      <div 
                                        style={{ width: `${p.contribution}%` }} 
                                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500 rounded-full"
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {activeOwnerSubView === 'saldo' && (
                <div className="space-y-6">
                  {/* Form Tambah Modal */}
                  <div className="bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100 shadow-sm">
                    <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <i className="fa-solid fa-plus-circle"></i> Tambah Saldo Kasir
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black text-emerald-600 uppercase mb-1 ml-1 block">Kategori Saldo</label>
                        <div className="relative">
                          <select 
                            value={ownerSaldoKategori}
                            onChange={e => setOwnerSaldoKategori(e.target.value)}
                            className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 pr-10 text-xs font-black text-gray-900 outline-none appearance-none cursor-pointer"
                          >
                            <option value="Isi Saldo Bank">Saldo Bank (Plafon)</option>
                            <option value="Isi Modal Tunai Kasir">Modal Tunai Kasir</option>
                          </select>
                          <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 pointer-events-none"></i>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-emerald-600 uppercase mb-1 ml-1 block">Pilih Kasir</label>
                        <div className="relative">
                          <select 
                            value={ownerSaldoKasirId}
                            onChange={e => setOwnerSaldoKasirId(e.target.value)}
                            className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 pr-10 text-xs font-black text-gray-900 outline-none appearance-none cursor-pointer"
                          >
                            <option value="">-- Pilih Kasir --</option>
                            {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                              <option key={id} value={id}>{acc.name} ({id})</option>
                            ))}
                          </select>
                          <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 pointer-events-none"></i>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-emerald-600 uppercase mb-1 ml-1 block">Nominal Saldo</label>
                        <input 
                          type="text"
                          inputMode="numeric"
                          placeholder="Contoh: 500.000"
                          value={ownerSaldoNominal}
                          onChange={e => setOwnerSaldoNominal(formatInputRupiah(e.target.value))}
                          className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-xs font-black text-gray-900 outline-none"
                        />
                      </div>

                      <button 
                        onClick={() => {
                          const nominal = (ownerSaldoNominal.replace(/\./g, ''));
                          if (!ownerSaldoKasirId || !nominal || parseInt(nominal) <= 0) return props.showToast('Pilih kasir dan masukkan nominal yang valid');
                          props.onConfirm("TAMBAH SALDO", `Tambah ${ownerSaldoKategori} ${formatRupiah(parseInt(nominal))} ke kasir ${ownerSaldoKasirId}?`, () => {
                            props.handleOwnerTambahModal?.(ownerSaldoKasirId, parseInt(nominal), ownerSaldoKategori);
                            setOwnerSaldoNominal('');
                            setOwnerSaldoKasirId('');
                            props.showToast("Saldo berhasil ditambahkan");
                          });
                        }}
                        className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                      >
                        Tambah Saldo Sekarang
                      </button>
                    </div>
                  </div>

                  {/* Ringkasan Modal Hari Ini */}
                  <div className="space-y-3 mt-8">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Riwayat Penambahan Saldo Hari Ini</h4>
                    {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => {
                      const today = getLocalDateString();
                      const modalHariIni = props.transactions
                        .filter(t => t.kasir_id === id && t.kategori.startsWith('Isi ') && t.timestamp.startsWith(today))
                        .reduce((sum, t) => sum + t.nominal, 0);

                      return (
                        <div key={id} className="bg-white border border-gray-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                          <div>
                            <p className="text-xs font-black text-gray-800">{acc.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">ID: {id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[13px] font-black text-emerald-600">{formatRupiah(modalHariIni)}</p>
                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Total Saldo Ditambahkan</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {activeOwnerSubView === 'catatan' && (
                <CatatanPanel showToast={props.showToast} onConfirm={props.onConfirm} />
              )}
              {activeOwnerSubView === 'profit' && (
                <NotificationLogPanel
                  activeStoreId={currentTargetStoreId}
                  showToast={props.showToast}
                  onConfirm={props.onConfirm}
                  bonusKasirList={bonusKasirList}
                  ownerLateKasirs={ownerLateKasirs}
                />
              )}
            </div>
            </div>
          </div>
        );
      })()}

      {props.kasirRole !== 'owner' && (
        <div className="px-0 mb-4">
          <TransactionForm 
            onSave={props.handleSimpanTransaksi}
            isSaving={props.isSaving}
            presets={props.presets}
            onOpenVoucherJualCepat={() => {
              props.setActiveView('view-stok-voucher');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('open-voucher-quick-sale'));
              }, 100);
            }}
            onOpenRiwayatDetail={(tx) => {
              props.setActiveView('view-transaksi');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('openRiwayatDetail', { detail: tx.id }));
              }, 300);
            }}
            activeStoreId={props.activeStoreId === 'all' ? undefined : props.activeStoreId}
            adminRules={props.adminRules}
          />
          {props.kasirRole === 'owner' && (
            <PengaturanPanel 
              transactions={props.transactions} 
              absensiList={props.absensiList} 
              storeName={props.storeName} 
              showToast={props.showToast}
              onConfirm={props.onConfirm}
              activeStoreId={props.activeStoreId === 'all' ? (props.pantauStoreId || 'all') : (props.activeStoreId || 'all')}
              onSaveCashierSelf={props.onSaveCashierSelf}
              kasirList={props.kasirList}
              userId={props.userId}
            />
          )}
        </div>
      )}
      {props.kasirRole === 'owner' && !isOwnerSubView && (
        <div className="px-1.5 mb-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-900 rounded-3xl p-4 shadow-lg shadow-blue-900/20 group">
            {/* Background Ornaments */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
                    <i className="fa-solid fa-crown text-lg text-amber-400 drop-shadow-md"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight leading-none">Owner Control</h3>
                    <p className="text-[8px] text-blue-100/70 font-black uppercase tracking-widest mt-1">{props.storeName}</p>
                  </div>
                </div>

                {/* Filter Kasir Selector - Conditional */}
                {localStorage.getItem('alphaPro_showKasirFilter') !== 'false' && (
                  <div className="relative z-50">
                    <select 
                      value={props.filterKasir || 'Semua'}
                      onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                      className="appearance-none bg-white/10 backdrop-blur-md border border-white/20 text-white text-[8px] font-black py-1.5 pl-2.5 pr-6 rounded-lg outline-none cursor-pointer hover:bg-white/20 transition-all uppercase tracking-widest relative z-50 max-w-[80px]"
                    >
                      <option value="Semua" className="text-gray-900">Semua</option>
                      {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                        <option key={id} value={id} className="text-gray-900">{acc.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/50 text-[7px] z-10">
                      <i className="fa-solid fa-chevron-down"></i>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-2.5 rounded-xl hover:bg-white/15 transition-all cursor-default">
                  <p className="text-[7px] font-black text-blue-200/80 uppercase tracking-widest mb-0.5">Volume</p>
                  <p className="text-[11px] font-black text-white tabular-nums leading-tight">{formatRupiah(ownerTotalVolume)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-2.5 rounded-xl hover:bg-white/15 transition-all cursor-default">
                  <p className="text-[7px] font-black text-emerald-300 uppercase tracking-widest mb-0.5">Profit</p>
                  <p className="text-[11px] font-black text-emerald-400 tabular-nums leading-tight">{formatRupiah(ownerTotalAdmin)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-2.5 rounded-xl hover:bg-white/15 transition-all cursor-default">
                  <p className="text-[7px] font-black text-amber-300 uppercase tracking-widest mb-0.5">Items</p>
                  <p className="text-[11px] font-black text-amber-400 tabular-nums leading-tight">{ownerTotalTrx}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[8px] font-black text-blue-100/60 uppercase tracking-widest">Sistem Online</span>
                </div>
                <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">v{APP_VERSION} Premium</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-1.5 mb-3">
        <div className="bg-white border border-gray-300 rounded-xl p-2 shadow-sm mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <i className="fa-solid fa-bolt text-[10px]"></i>
            </div>
            <div>
              <p className="text-[10px] text-black font-black uppercase tracking-tighter">TERAKHIR</p>
              <p className="text-[12px] font-black text-black leading-none mt-0.5">
                {props.lastTx ? `${props.lastTx.kategori} • ${formatRupiah(props.lastTx.nominal)}` : 'Belum ada'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-1.5 px-0.5">
          <h3 className="font-black text-black text-[12px] uppercase tracking-tighter">RINGKASAN HARI INI</h3>
          <button onClick={() => props.setActiveView('view-transaksi')} className="text-[11px] text-blue-700 font-black uppercase tracking-tighter border-b border-blue-700 leading-none">LIHAT SEMUA</button>
        </div>

        {/* PROGRESS BAR TARGET TRX UNTUK KASIR */}
        {props.kasirRole !== 'owner' && (() => {
          const target = props.kasirList[props.username]?.targetTrx || financialSettings?.defaultTargetTrx || 0;
          if (target > 0) {
            const pct = Math.min(Math.round((ownerTotalTrx / target) * 100), 100);
            const isCompleted = pct >= 100;
            return (
              <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm mb-3">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <i className="fa-solid fa-bullseye text-blue-500"></i> Target Hari Ini
                  </p>
                  {isCompleted ? (
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <i className="fa-solid fa-check-circle"></i> Tercapai!
                    </span>
                  ) : (
                    <p className="text-[10px] font-black text-slate-800 tabular-nums">{ownerTotalTrx} / {target} TRX</p>
                  )}
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      isCompleted ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-blue-500"
                    )}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          }
          return null;
        })()}
        
        <SummaryCards 
          totalTransactions={ownerTotalTrx}
          totalVolume={ownerTotalVolume}
          totalAdmin={ownerTotalAdmin}
        />
      </div>
    </div>
  )
}

export default BerandaView
