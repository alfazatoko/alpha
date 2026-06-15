import React, { useState, useEffect } from 'react'
import { formatRupiah, formatInputRupiah, cn, getLocalISOString, getLocalDateString, parseLocalISO } from '../lib/utils'
import { supabase } from '../lib/supabase'
import TransactionForm from '../components/TransactionForm'
import SummaryCards from '../components/SummaryCards'
import type { Transaction, Store } from '../types'
import { saveKasirAccounts, type KasirAccount } from '../components/LoginScreen'
interface BerandaViewProps {
  active: boolean
  activeView: string
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
  isSaving: boolean
  totalAdmin: number
  totalVolume: number
  totalAksesoris: number
  totalTarik: number
  totalSaldoKas: number
  penjualanDigital: number
  kasModal: number
  kasirName: string
  kasirRole: string
  filterKasir: string
  setFilterKasir: (v: string) => void
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
  username: string
  showToast: (m: string) => void
  onConfirm: (t: string, m: string, c: () => void) => void
  presets?: any[]
  activeStoreId?: string | 'all'
  pantauStoreId?: string | 'all'
  setPantauStoreId?: (id: string | 'all') => void
  stores?: Store[]
  isPc?: boolean
  userId: string
}

const CyclingText: React.FC<{ texts: { text: string, isMain: boolean }[] }> = ({ texts }) => {
  const [index, setIndex] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  
  useEffect(() => {
    if (texts.length <= 1) return
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % texts.length)
      setAnimKey(k => k + 1)
    }, 8000) 
    return () => clearInterval(interval)
  }, [texts.length])

  const current = texts[index]
  if (!current) return null

  return (
    <div key={animKey} className={cn(
      "animate-marquee-center font-black uppercase tracking-widest transition-all",
      current.isMain ? "text-red-600 text-[11px]" : "text-blue-900 text-[10px]"
    )}>
      {current.text}
    </div>
  )
}

const GajiPanel: React.FC<{
  kasirList: Record<string, KasirAccount>
  absensiList?: any[]
  storeName?: string
  showToast: (m: string) => void
  activeStoreId: string
}> = ({ kasirList, absensiList, storeName, showToast, activeStoreId }) => {
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
  const [editIzin, setEditIzin] = useState(false)
  const [izinManual, setIzinManual] = useState("")
  const [catatan, setCatatan] = useState("")
  const slipRef = React.useRef<HTMLDivElement>(null)

  const [izinList, setIzinList] = useState<any[]>([])
  
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
  }, [kasirArr, selectedKasir])

  const selectedName = kasirList[selectedKasir]?.name || ''

  const absenCount = (absensiList || []).filter(a => a.username === selectedKasir && a.tanggal.startsWith(month)).length
  const izinCount = izinList.filter(iz => iz.nama === selectedName && iz.tanggal.startsWith(month)).length

  const hariKerja = editHariKerja ? (parseInt(hariKerjaManual) || 0) : absenCount
  const currentIzin = editIzin ? (parseInt(izinManual) || 0) : izinCount
  const parseNum = (str: string) => parseInt(str.replace(/\D/g, '')) || 0
  const formatNum = (str: string) => {
    const num = parseInt(str.replace(/\D/g, '')) || 0
    return num.toLocaleString('id-ID')
  }

  const ratePerHari = mode === "harian" ? parseNum(gajiPerHari) : Math.round(parseNum(gajiBulanan) / 30)
  const gajiPokok = mode === "harian" ? hariKerja * ratePerHari : parseNum(gajiBulanan)
  const potonganIzinVal = currentIzin * ratePerHari
  const totalGaji = gajiPokok + parseNum(bonus) - potonganIzinVal - parseNum(potonganLain)

  const [y, m] = month.split("-").map(Number)
  const monthDate = new Date(y, m - 1)
  const monthLabel = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  useEffect(() => {
    setHariKerjaManual(String(absenCount))
    setEditHariKerja(false)
    setIzinManual(String(izinCount))
    setEditIzin(false)
  }, [selectedKasir, month, absenCount, izinCount])

  const handleShareText = async () => {
    const lines = [
      `Slip Gaji - ${storeName || 'ALFAZA CELL'}`,
      `Periode: ${monthLabel.toUpperCase()}`,
      `Nama: ${selectedName}`,
      `Hari Kerja: ${hariKerja} hari`,
      `Izin: ${currentIzin} hari ${potonganIzinVal > 0 ? `(-${formatRupiah(potonganIzinVal)})` : ""}`,
      `Gaji Pokok: ${formatRupiah(gajiPokok)}`,
      `Bonus: ${formatRupiah(parseNum(bonus))}`,
      `Potongan Izin: -${formatRupiah(potonganIzinVal)}`,
      ...(parseNum(potonganLain) > 0 ? [`Potongan Lain: -${formatRupiah(parseNum(potonganLain))}${ketPotongan ? ` (${ketPotongan})` : ""}`] : []),
      `Total Gaji: ${formatRupiah(totalGaji)}`,
    ]
    if (catatan) lines.push(`Catatan: ${catatan}`)
    const text = lines.join("\n")
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        showToast("Teks disalin ke clipboard")
      }
    } catch {}
  }

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

  return (
    <div className="space-y-4 pb-10">
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

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex justify-between mb-1">
              HARI KERJA
              <span className="flex items-center gap-1 cursor-pointer" onClick={() => { setEditHariKerja(!editHariKerja); setHariKerjaManual(String(absenCount)) }}>
                <input type="checkbox" checked={editHariKerja} readOnly className="w-2.5 h-2.5" /> <span className="text-[8px] text-blue-600">EDIT</span>
              </span>
            </label>
            {editHariKerja ? (
              <input type="number" value={hariKerjaManual} onChange={e => setHariKerjaManual(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-blue-200 outline-none font-bold bg-blue-50 text-blue-700" />
            ) : (
              <div className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-100 font-bold text-gray-700">{absenCount} hari</div>
            )}
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex justify-between mb-1">
              IZIN / ALPHA
              <span className="flex items-center gap-1 cursor-pointer" onClick={() => { setEditIzin(!editIzin); setIzinManual(String(izinCount)) }}>
                <input type="checkbox" checked={editIzin} readOnly className="w-2.5 h-2.5" /> <span className="text-[8px] text-blue-600">EDIT</span>
              </span>
            </label>
            {editIzin ? (
              <input type="number" value={izinManual} onChange={e => setIzinManual(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-orange-200 outline-none font-bold bg-orange-50 text-orange-700" />
            ) : (
              <div className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-100 font-bold text-gray-700">{izinCount} hari</div>
            )}
          </div>
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

      <div ref={slipRef} className="bg-gradient-to-br from-green-700 to-emerald-500 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden">
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
              <span className="text-green-100 font-bold uppercase">Hari Kerja</span>
              <span className="font-black">{hariKerja} hari</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-green-100 font-bold uppercase">Izin / Alpha</span>
              <span className="font-black">{currentIzin} hari {potonganIzinVal > 0 && <span className="text-red-200">(-{formatRupiah(potonganIzinVal)})</span>}</span>
            </div>
            <div className="flex justify-between text-[11px] pt-1">
              <span className="text-green-100 font-bold uppercase">Gaji Pokok</span>
              <span className="font-black">{formatRupiah(gajiPokok)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-green-100 font-bold uppercase">Bonus</span>
              <span className="font-black text-green-200">{formatRupiah(parseNum(bonus))}</span>
            </div>
            {parseNum(potonganLain) > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-red-200 font-bold uppercase">Potongan {ketPotongan ? `(${ketPotongan})` : ""}</span>
                <span className="font-black text-red-200">-{formatRupiah(parseNum(potonganLain))}</span>
              </div>
            )}
            {catatan && (
              <div className="flex justify-between text-[10px] pt-1 border-t border-white/10 mt-1">
                <span className="text-green-100 font-bold uppercase w-1/3">Catatan</span>
                <span className="font-black text-right opacity-90">{catatan}</span>
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

      <div className="flex gap-3">
        <button
          onClick={handleShareText}
          className="flex-1 bg-gray-800 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-copy text-xs"></i> SALIN TEKS
        </button>
        <button
          onClick={handleSharePDF}
          className="flex-1 bg-green-600 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-share-nodes text-xs"></i> BAGIKAN PDF
        </button>
      </div>
    </div>
  )
}

const BackupPanel: React.FC<{ 
  transactions: Transaction[], 
  absensiList?: any[],
  storeName?: string,
  showToast: (m: string) => void,
  onConfirm: (t: string, m: string, c: () => void) => void,
  activeStoreId: string
}> = ({ transactions, absensiList, storeName, showToast, onConfirm, activeStoreId }) => {
  if (activeStoreId === 'all') {
    return (
      <div className="p-6 text-center bg-amber-50 border border-amber-100 rounded-2xl">
        <i className="fa-solid fa-store-slash text-amber-500 text-3xl mb-3"></i>
        <p className="text-xs font-black text-amber-800 uppercase tracking-widest">PILIH TOKO TERLEBIH DAHULU</p>
        <p className="text-[10px] text-amber-600/80 font-bold uppercase mt-1">Silakan pilih salah satu toko untuk melakukan backup.</p>
      </div>
    );
  }

  const [resetStep, setResetStep] = useState(0); // 0: init, 1: confirm, 2: processing

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
        
        // Convert to base64 for sharing
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
        // 1. Reset Transactions
        let txQuery = supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (activeStoreId !== 'all') {
          txQuery = txQuery.eq('store_id', activeStoreId);
        }
        const { error: txError } = await txQuery;
        
        // 2. Reset Attendance
        let absQuery = supabase.from('absensi').delete().neq('id', 0);
        if (activeStoreId !== 'all') {
          absQuery = absQuery.eq('store_id', activeStoreId);
        }
        const { error: absError } = await absQuery;
        
        // 3. Reset Local Data
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
      {/* Backup Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md border border-white/30">
            <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
          </div>
          <h3 className="font-black text-lg tracking-widest uppercase mb-1">BACKUP DATA</h3>
          <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest opacity-80 mb-6">Amankan seluruh transaksi & absensi</p>
          
          <button 
            onClick={handleBackup}
            className="w-full bg-white text-blue-700 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-file-export"></i> Ekspor ke JSON
          </button>
        </div>
      </div>

      {/* Reset Card */}
      <div className="bg-white border border-red-100 rounded-[2rem] p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-3">
            <i className="fa-solid fa-triangle-exclamation text-xl"></i>
          </div>
          <h3 className="font-black text-gray-800 text-[13px] tracking-widest uppercase mb-1">RESET SISTEM</h3>
          <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-6">Hapus seluruh data untuk periode baru</p>
          <button 
            onClick={handleReset}
            disabled={resetStep === 2}
            className={cn(
              "w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2",
              resetStep === 2 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-red-600 text-white shadow-red-100"
            )}
          >
            {resetStep === 2 ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i> Memproses...
              </>
            ) : (
              <>
                <i className="fa-solid fa-trash-can"></i> Hapus Seluruh Data
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
        <div className="flex gap-3">
          <i className="fa-solid fa-circle-info text-orange-400 mt-0.5"></i>
          <div>
            <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1">Tips Keamanan</p>
            <p className="text-[9px] font-bold text-orange-700/70 leading-relaxed uppercase">Selalu lakukan backup sebelum melakukan reset sistem untuk menghindari kehilangan data penting permanen.</p>
          </div>
        </div>
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
  
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [kategori, setKategori] = useState('Penting');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCatatanList(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  const saveToStorage = (data: Catatan[]) => {
    setCatatanList(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleSimpan = () => {
    if (!judul.trim() || !isi.trim()) {
      return showToast('Judul dan isi catatan harus diisi!');
    }
    const baru: Catatan = {
      id: Date.now().toString(),
      judul: judul.trim(),
      isi: isi.trim(),
      kategori,
      tanggal: new Date().toISOString(),
      selesai: false
    };
    saveToStorage([baru, ...catatanList]);
    setJudul('');
    setIsi('');
    setFormOpen(false);
    showToast('Catatan berhasil disimpan');
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
            onClick={() => setFormOpen(true)}
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
            <h3 className="font-black text-orange-600 text-[13px] tracking-widest uppercase">CATATAN BARU</h3>
            <button onClick={() => setFormOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90">
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

const BerandaView: React.FC<BerandaViewProps> = (props) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

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
  const [currentTime, setCurrentTime] = useState(new Date())

  // Kasir Management State (Form inputs remain local)
  const [kasirFormId, setKasirFormId] = useState('')
  const [kasirFormName, setKasirFormName] = useState('')
  const [kasirFormPin, setKasirFormPin] = useState('')

  // Izin State
  const [izinNamaKasir, setIzinNamaKasir] = useState('')
  const [izinTanggal, setIzinTanggal] = useState(getLocalDateString())
  const [izinAlasan, setIzinAlasan] = useState('')
  const currentTargetStoreId = props.activeStoreId === 'all' ? (props.pantauStoreId || 'all') : (props.activeStoreId || 'all');
  const [catatanIzin, setCatatanIzin] = useState<any[]>([])
  const STORAGE_KEY_IZIN = `alphaPro_${currentTargetStoreId}_catatanIzin`

  // Pantau State
  const [pantauTanggal, setPantauTanggal] = useState(getLocalDateString())

  // Absensi Modal State
  const [absenTab, setAbsenTab] = useState<'summary' | 'full'>('summary')

  // Grafik State
  const [grafikFilterKasir, setGrafikFilterKasir] = useState('Semua')
  const [grafikRange, setGrafikRange] = useState<'harian'|'mingguan'|'bulanan'>('harian')
  const [grafikType, setGrafikType] = useState<'bar'|'line'|'pie'>('bar')

  // Performa State
  const [performaRange, setPerformaRange] = useState<'harian'|'mingguan'|'bulanan'>('bulanan')

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any[]>([])
  const [analyticsRawData, setAnalyticsRawData] = useState<any[]>([])
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)

  const activeOwnerSubView = props.activeView?.startsWith('view-owner-') ? props.activeView.replace('view-owner-', '') : null
  const isOwnerSubView = !!activeOwnerSubView

  useEffect(() => {
    if (activeOwnerSubView === 'performa' || activeOwnerSubView === 'grafik') {
      const fetchAnalytics = async () => {
        setIsAnalyticsLoading(true)
        try {
          const now = new Date()
          let days = 30
          
          if (activeOwnerSubView === 'performa') {
            if (performaRange === 'harian') days = 0
            else if (performaRange === 'mingguan') days = 6
            else days = 29
          } else {
            if (grafikRange === 'harian') days = 7
            else if (grafikRange === 'mingguan') days = 30
            else days = 90
          }

          const cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)
          const fmt = (d: Date) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
          const startStr = fmt(cutoffDate)
          const endStr = fmt(now)
          const storeId = props.activeStoreId === 'all' ? (props.pantauStoreId || 'all') : (props.activeStoreId || 'all')

          let query = supabase
            .from('transactions')
            .select('kasir_id, nominal, admin_fee, timestamp, kategori')
            .eq('user_id', props.userId)
            .order('timestamp', { ascending: false })
            .limit(3000)

          if (storeId !== 'all') {
            query = query.eq('store_id', storeId)
          }

          const { data, error } = await query

          if (error) {
            console.error('Analytics Error:', error.message || error)
          } else if (data) {
            // Filter locally to avoid any Supabase Postgres date casting bugs
            // Filter locally using strict string comparison to bypass ALL timezone bugs
            const validData = data.filter(r => {
              if (!r.timestamp || !r.kategori || r.kategori.startsWith('Isi')) return false
              const txDay = typeof r.timestamp === 'string' ? r.timestamp.substring(0, 10) : ''
              return txDay >= startStr && txDay <= endStr
            })
            
            // Group data locally exactly like the RPC did
            const aggregated = validData.reduce((acc, row) => {
               const day = typeof row.timestamp === 'string' ? row.timestamp.substring(0, 10) : ''
               if (!day) return acc;
               
               const kId = row.kasir_id || 'Unknown'
               const key = `${day}_${kId}`
               if (!acc[key]) {
                 acc[key] = { kasir_id: kId, tanggal: day, total_omzet: 0, total_transaksi: 0, total_admin: 0 }
               }
               acc[key].total_omzet += Number(row.nominal || 0)
               acc[key].total_transaksi += 1
               acc[key].total_admin += Number(row.admin_fee || 0)
               return acc
            }, {} as Record<string, any>)

            const finalAnalyticsData = Object.values(aggregated)
            console.log('Analytics Berhasil ditarik & digrup:', finalAnalyticsData.length, 'baris grup dari', validData.length, 'transaksi')
            setAnalyticsData(finalAnalyticsData)
            setAnalyticsRawData(validData)
            
            // Temporary debug toast
            if (finalAnalyticsData.length === 0) {
              props.showToast(`Debug: Supabase=${data.length} txs, ValidDate=${validData.length} txs`)
            }
          }
        } finally {
          setIsAnalyticsLoading(false)
        }
      }
      fetchAnalytics()
    }
  }, [activeOwnerSubView, performaRange, grafikRange, props.activeStoreId, props.pantauStoreId])

  const [ownerSaldoKasirId, setOwnerSaldoKasirId] = useState('')
  const [ownerSaldoNominal, setOwnerSaldoNominal] = useState('')
  const [ownerSaldoKategori, setOwnerSaldoKategori] = useState('Isi Saldo Bank')

  // Audit State
  const [auditFisik, setAuditFisik] = useState('')
  const [auditHistory, setAuditHistory] = useState<any[]>([])
  const STORAGE_KEY_AUDIT = `alphaPro_${currentTargetStoreId}_auditHistory`

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AUDIT)
    if (saved) setAuditHistory(JSON.parse(saved))
    else setAuditHistory([])
  }, [STORAGE_KEY_AUDIT])

  const handleSimpanAudit = () => {
    const fisik = parseInt(auditFisik.replace(/[^0-9]/g, '')) || 0
    if (fisik <= 0) return props.showToast('Masukkan uang fisik di laci!')
    if (props.filterKasir === 'Semua') return props.showToast('Pilih salah satu kasir terlebih dahulu!')
    
    const kasirName = props.kasirList[props.filterKasir || '']?.name || props.filterKasir
    const selisih = fisik - ownerTotalLaci
    const baru = {
      tanggal: getLocalDateString(),
      jam: currentTime.toLocaleTimeString('id-ID'),
      kasirId: props.filterKasir,
      kasirName: kasirName,
      sistem: ownerTotalLaci,
      fisik: fisik,
      selisih: selisih
    }
    
    const updated = [baru, ...auditHistory].slice(0, 100) // Simpan 100 terakhir
    setAuditHistory(updated)
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(updated))
    setAuditFisik('')
    props.showToast(`Audit ${kasirName} disimpan!`)
  }

  const hapusAudit = (index: number) => {
    props.onConfirm('HAPUS RIWAYAT', 'Hapus riwayat audit ini?', () => {
      const updated = auditHistory.filter((_, i) => i !== index)
      setAuditHistory(updated)
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(updated))
      props.showToast("Berhasil Dihapus")
    })
  }


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
  
  const ownerTotalVolume = ownerTodayTxs.reduce((s, t) => s + t.nominal, 0)
  const ownerTotalAdmin = ownerTodayTxs.filter(t => 
    !(t.keterangan || '').includes('[ADMIN_DALAM]') && 
    !(t.keterangan || '').includes('[KHUSUS]') && 
    !(t.keterangan || '').includes('[NON_TUNAI]')
  ).reduce((s, t) => s + t.adminFee, 0)
  const ownerTotalTrx = ownerTodayTxs.length

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
  const ownerAdminDalam = ownerDisplayTxs.filter(t => t.timestamp.startsWith(todayISO) && (t.keterangan || '').includes('[ADMIN_DALAM]')).reduce((s, t) => s + t.adminFee, 0)
  const ownerNonTunai = ownerDisplayTxs.filter(t => t.timestamp.startsWith(todayISO) && (t.keterangan || '').includes('[NON_TUNAI]')).reduce((s, t) => s + t.nominal + t.adminFee, 0)
  const ownerKhusus = ownerDisplayTxs.filter(t => t.timestamp.startsWith(todayISO) && (t.keterangan || '').includes('[KHUSUS]')).reduce((s, t) => s + t.nominal + t.adminFee, 0)

  const ownerTotalLaci = ownerKasModal + ownerPenjualanDigital + ownerTotalAksesoris + ownerTotalAdmin - ownerTotalTarik
  
  // ownerSaldoBank calculation (Contribution to bank balance/plafon)
  const ownerTotalBankOut = ownerTodayTxs.filter(t => 
    ['Transfer Bank', 'DANA', 'FLIP', 'Order Kuota'].includes(t.kategori)
  ).reduce((s, t) => s + t.nominal, 0)
  
  const ownerIsiBank = ownerDisplayTxs.filter(t => t.timestamp.startsWith(todayISO) && t.kategori === 'Isi Saldo Bank').reduce((s, t) => s + t.nominal, 0)
  const ownerSaldoBank = ownerIsiBank - ownerTotalBankOut

  return (
    <div className={cn("page-view hide-scrollbar", props.active && "active")}>
      {!(props.isPc && isOwnerSubView) && (
        <>
          <div className="relative theme-header" style={{ paddingBottom: '2.5rem' }}>
        <div className="px-4 pt-12 pb-2 flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {props.storePhoto ? (
                <img src={props.storePhoto} alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white/50 shadow-md" />
              ) : (
                <img src="/logo_icon.png" alt="Logo" className="w-12 h-12 object-contain" />
              )}
              <div>
                <h1 className="text-[13px] font-black text-white leading-tight uppercase tracking-widest">{props.storeName || 'ALFAZA CELL'}</h1>
                <p className="text-blue-200 text-[8px] font-bold uppercase tracking-tighter opacity-80">{props.storeSubtext || 'Pembukuan Agen brilink & Konter'}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-white text-[10px] font-black">{props.kasirName}</span>
                  <span className={cn("text-[7px] px-1.5 py-0.5 rounded-full font-black", props.kasirRole === 'owner' ? "bg-amber-400 text-amber-900" : "bg-white/25 text-white")}>
                    {props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'}
                  </span>
                  <span className={cn(
                    "text-[7px] px-1.5 py-0.5 rounded-full font-black flex items-center gap-1",
                    isOnline 
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                      : "bg-red-500 text-white animate-pulse"
                  )}>
                    <span className={cn("w-1 h-1 rounded-full", isOnline ? "bg-emerald-400" : "bg-white")}></span>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-blue-200 text-[8px] font-bold uppercase tracking-widest leading-none mb-1">{dayName}</p>
              <p className="text-white text-[10px] font-black tracking-tight leading-none mb-1">{fullDate}</p>
              <p className="text-blue-100 text-xs font-black tabular-nums tracking-widest">{clockStr}</p>
            </div>
          </div>

          <button onClick={() => props.setIsSidePanelOpen(true)} className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-90 hover:bg-white/20 transition-all">
            <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
          </button>
        </div>
      </div>

      <div className="mx-1.5 bg-white rounded-2xl p-4 shadow-xl mb-3 relative z-10" style={{ marginTop: '-2.5rem' }}>
        {props.kasirRole === 'owner' && (
          <div className="mb-3 space-y-2">
            {/* Store Filter */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 rounded-xl border border-blue-100/50 flex items-center justify-between shadow-sm">
              <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-1.5">
                <i className="fa-solid fa-store text-blue-600"></i> Pantau Toko
              </span>
              <div className="relative">
                 <select 
                   value={props.pantauStoreId || 'all'}
                   onChange={(e) => props.setPantauStoreId && props.setPantauStoreId(e.target.value)}
                   className="bg-transparent text-blue-700 text-[10px] font-black outline-none border-none cursor-pointer text-right appearance-none pr-6 font-bold"
                 >
                   <option value="all">🌐 Semua Toko (Pusat)</option>
                   {(props.stores || []).map((store) => (
                     <option key={store.id} value={store.id}>🏬 {store.name}</option>
                   ))}
                 </select>
                 <i className="fa-solid fa-chevron-down absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-blue-500 pointer-events-none"></i>
              </div>
            </div>

            {/* Cashier Filter - Only displayed if monitoring a specific store */}
            {props.pantauStoreId !== 'all' && props.kasirList && Object.keys(props.kasirList).length > 0 && (
              <div className="bg-blue-50/30 px-3 py-1.5 rounded-xl border border-blue-100/30 flex items-center justify-between">
                <span className="text-[10px] font-black text-blue-800/80 uppercase tracking-widest flex items-center gap-1.5">
                  <i className="fa-solid fa-user-tie text-blue-500"></i> Mode Pantau Kasir
                </span>
                <div className="relative flex-1 flex justify-end">
                   <select 
                     value={props.filterKasir || 'Semua'}
                     onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                     className="bg-transparent text-blue-700/80 text-[10px] font-black outline-none border-none cursor-pointer text-right appearance-none pr-6 w-full relative z-50"
                   >
                     <option value="Semua">Semua Kasir</option>
                     {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                       <option key={id} value={id}>{acc.name}</option>
                     ))}
                   </select>
                   <i className="fa-solid fa-chevron-down absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-blue-500/50 pointer-events-none"></i>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[11px] text-gray-600 font-black uppercase tracking-widest">SALDO BANK</p>
            <h2 className="text-base font-black tracking-tight text-blue-800">{formatRupiah(props.saldoBank)}</h2>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-600 font-black uppercase tracking-widest">SALDO LACI KASIR</p>
            <h2 className="text-base font-black tracking-tight text-emerald-600">{formatRupiah(totalPendapatanBersih)}</h2>
          </div>
        </div>
        <button onClick={() => setShowRincian(true)} className="bg-blue-600 hover:bg-blue-700 transition text-white text-[9px] px-4 py-1.5 rounded-xl font-black w-full mt-1 uppercase tracking-widest">
          Detail rincian <i className="fa-solid fa-chevron-right ml-1 text-[7px]"></i>
        </button>
      </div>

      {/* Running Text Column — BELOW Saldo card */}
      {(props.mainAnnouncement || (props.runningTexts && props.runningTexts.some(t => t.trim() !== ''))) && (
        <div className="mx-1.5 bg-blue-50/50 rounded-xl py-2.5 px-4 shadow-sm mb-4 border border-blue-100/50 flex items-center overflow-hidden">
          <style>{`
            @keyframes marquee-center {
              0% { transform: translateX(100%); opacity: 0; }
              10% { opacity: 1; }
              40% { transform: translateX(0); }
              60% { transform: translateX(0); }
              90% { opacity: 1; }
              100% { transform: translateX(-100%); opacity: 0; }
            }
            .animate-marquee-center {
              animation: marquee-center 8s linear forwards;
              width: 100%;
              text-align: center;
              white-space: nowrap;
            }
          `}</style>
          <div className="w-full">
            {(() => {
              const activeTexts = [
                props.mainAnnouncement ? { text: props.mainAnnouncement, isMain: true } : null,
                ...(props.runningTexts || [])
                  .filter(t => t.trim() !== '')
                  .map(t => ({ text: t, isMain: false }))
              ].filter(Boolean) as { text: string, isMain: boolean }[];
              
              return <CyclingText texts={activeTexts} />
            })()}
          </div>
        </div>
      )}      {showRincian && (
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

              {/* KAS MASUK SECTION */}
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-emerald-50 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <i className="fa-solid fa-arrow-down text-xs"></i>
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-emerald-900 uppercase leading-none">KAS MASUK</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Uang masuk laci</p>
                  </div>
                </div>

                <div className="space-y-0">
                  {[
                    { label: 'Modal Tunai Kasir', val: kasModal },
                    { label: 'Penjualan Digital', val: penjualanDigital },
                    { label: 'Penjualan Aksesoris', val: props.totalAksesoris },
                    { label: 'Total Admin Fee', val: props.totalAdmin }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 px-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-[10px] font-black text-gray-800 uppercase leading-none">{item.label}</p>
                      </div>
                      <span className="text-[11px] font-black text-emerald-600 tabular-nums">{formatRupiah(item.val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* KAS LAINNYA SECTION */}
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-orange-50 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <i className="fa-solid fa-layer-group text-xs"></i>
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-orange-900 uppercase leading-none">KAS LAIN NYA</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Pemasukan tambahan</p>
                  </div>
                </div>

                <div className="space-y-0">
                  {[
                    { label: 'Transaksi Khusus', val: props.totalKhusus || 0 },
                    { label: 'Transaksi Non Tunai', val: props.totalNonTunai || 0 },
                    { label: 'Total Kas Lainnya', val: props.kasLainnya }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 px-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-[10px] font-black text-gray-800 uppercase leading-none">{item.label}</p>
                      </div>
                      <span className="text-[11px] font-black text-orange-600 tabular-nums">{formatRupiah(item.val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* KAS KELUAR SECTION */}
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-red-50 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                    <i className="fa-solid fa-arrow-up text-xs"></i>
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-red-900 uppercase leading-none">KAS KELUAR</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Uang keluar laci</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-2 rounded-xl bg-red-50/30 border border-red-100">
                  <div>
                    <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight leading-none">Tarik Tunai Nasabah</p>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">Penarikan Tunai</p>
                  </div>
                  <span className="text-[11px] font-black text-red-600 tabular-nums">-{formatRupiah(props.totalTarik)}</span>
                </div>
              </div>

              {/* TOTAL FINAL CARD */}
              <div className="bg-[#051c5f] p-4 rounded-2xl text-white shadow-lg relative overflow-hidden border border-blue-400/20">
                <div className="relative z-10 text-center">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-300">SALDO LACI KASIR</span>
                  <h2 className="text-2xl font-black text-green-400 tracking-tighter mt-0.5 mb-2 drop-shadow-md">
                    {formatRupiah(totalPendapatanBersih)}
                  </h2>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[7px] font-bold text-blue-200/60 uppercase tracking-tighter leading-none italic">
                      RUMUS: (MODAL + DIGITAL + AKSESORIS + ADMIN) - TARIK
                    </p>
                    <p className="text-[6px] text-blue-300/40 uppercase mt-1 tracking-widest font-bold">
                      *KAS LAINNYA TIDAK MEMPENGARUHI SALDO LACI
                    </p>
                  </div>
                </div>
              </div>

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

      <div className="px-1.5 mb-2 grid grid-cols-5 gap-2 text-center">
        {[
          { id: 'view-kasbon', label: 'KASBON', icon: 'fa-file-invoice', color: 'bg-blue-500' },
          { id: 'view-kontak', label: 'KONTAK', icon: 'fa-address-book', color: 'bg-emerald-500' },
          { id: 'view-stok-voucher', label: 'VOUCHER', icon: 'fa-ticket', color: 'bg-orange-500' },
          { id: 'view-kalender', label: 'KALENDER', icon: 'fa-calendar-days', color: 'bg-red-500' },
          { 
            id: showLainnya ? 'tutup-lainnya' : 'buka-lainnya', 
            label: showLainnya ? 'TUTUP' : 'LAINNYA', 
            icon: showLainnya ? 'fa-chevron-up' : 'fa-ellipsis', 
            color: showLainnya ? 'bg-gray-400' : 'bg-purple-600' 
          },
        ].map((item) => (
          <div 
            key={item.id} 
            onClick={() => {
              if (item.id === 'buka-lainnya') setShowLainnya(true);
              else if (item.id === 'tutup-lainnya') setShowLainnya(false);
              else props.setActiveView(item.id);
            }} 
            className="cursor-pointer group"
          >
            <div className={cn("w-11 h-11 mx-auto rounded-2xl flex items-center justify-center text-white shadow-md active:scale-90 transition-transform", item.color)}>
              <i className={cn("fa-solid text-lg", item.icon)}></i>
            </div>
            <p className="text-[9px] font-black text-black mt-1.5 tracking-tighter uppercase">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Expanded Menu - Flexible Wrap */}
      {showLainnya && (
        <div className="px-4 py-3 mb-6 bg-gray-50/50 rounded-3xl mx-1.5 border border-dashed border-gray-200 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-4 gap-4">
            {[
              { id: 'view-nota', label: 'NOTA', icon: 'fa-receipt', color: 'text-purple-600', bg: 'bg-purple-50' },
              { id: 'view-laporan', label: 'CLOSING', icon: 'fa-door-closed', color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { id: 'view-transaksi', label: 'NON TUNAI', icon: 'fa-credit-card', color: 'text-teal-600', bg: 'bg-teal-50' },
              { id: 'tutup-lainnya', label: 'TUTUP', icon: 'fa-chevron-up', color: 'text-gray-600', bg: 'bg-gray-100' },
            ].map((item) => (
              <div 
                key={item.id} 
                onClick={() => {
                  if (item.id === 'tutup-lainnya') setShowLainnya(false);
                  else props.setActiveView(item.id);
                }}
                className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", item.bg, item.color)}>
                  <i className={cn("fa-solid text-lg", item.icon)}></i>
                </div>
                <p className="text-[8px] font-black text-black uppercase tracking-widest">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {props.kasirRole === 'owner' && !props.isPc && (
        <div className="px-1.5 mb-8">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-[2rem] p-6 mb-6 shadow-lg shadow-orange-200/50 flex items-center gap-4 border-b-4 border-orange-600/20">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 shadow-inner">
              <i className="fa-solid fa-shield-halved text-2xl"></i>
            </div>
            <div>
              <h3 className="font-black text-white text-xl tracking-tight leading-none">Panel Owner</h3>
              <p className="text-white/80 text-[11px] font-bold mt-1.5 uppercase tracking-widest">Kelola semua data toko</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'view-owner-monitor', title: 'Kasir', desc: 'Kelola data kasir', icon: 'fa-users', color: 'bg-blue-600' },
              { id: 'view-owner-laporan', title: 'Ringkasan', desc: 'Ringkasan harian', icon: 'fa-file-lines', color: 'bg-indigo-600' },
              { id: 'view-owner-grafik', title: 'Grafik', desc: 'Grafik transaksi', icon: 'fa-chart-simple', color: 'bg-emerald-500' },
              { id: 'view-owner-performa', title: 'Performa', desc: 'Performa kasir', icon: 'fa-chart-line', color: 'bg-purple-600' },
              { id: 'view-owner-absen', title: 'Absen', desc: 'Kehadiran kasir', icon: 'fa-fingerprint', color: 'bg-teal-500' },
              { id: 'view-owner-izin', title: 'Izin', desc: 'Kelola izin', icon: 'fa-calendar-day', color: 'bg-orange-500' },
              { id: 'view-owner-gaji', title: 'Gajih', desc: 'Data gaji kasir', icon: 'fa-dollar-sign', color: 'bg-green-600' },
              { id: 'view-owner-saldo', title: 'Saldo', desc: 'Atur modal kasir', icon: 'fa-wallet', color: 'bg-emerald-600' },
              { id: 'view-owner-audit', title: 'Audit', desc: 'Audit uang laci', icon: 'fa-file-signature', color: 'bg-purple-600' },
              { id: 'view-owner-backup', title: 'Backup', desc: 'Backup & reset', icon: 'fa-database', color: 'bg-red-600' },
              { id: 'view-owner-catatan', title: 'Catatan', desc: 'Catatan & belanja', icon: 'fa-clipboard-list', color: 'bg-amber-500' },
              { id: 'view-akun', title: 'Setting', desc: 'Pengaturan app', icon: 'fa-gear', color: 'bg-slate-600' },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => props.setActiveView(item.id)}
                className="bg-white border border-gray-100 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 shadow-sm active:scale-95 transition-all hover:border-orange-200"
              >
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg", item.color)}>
                  <i className={`fa-solid ${item.icon} text-lg`}></i>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-black text-black leading-none mb-1">{item.title}</p>
                  <p className="text-[8px] font-bold text-gray-400 leading-tight">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
        </>
      )}

      {isOwnerSubView && (() => {
        const getSubViewDetails = () => {
          switch(activeOwnerSubView) {
            case 'monitor': return { title: 'KELOLA KASIR', color: 'from-blue-600 to-blue-800', icon: 'fa-users', desc: 'Pantau aktivitas dan kelola akun kasir Anda.' }
            case 'laporan': return { title: 'RINGKASAN HARIAN', color: 'from-indigo-600 to-indigo-800', icon: 'fa-file-lines', desc: 'Lihat ringkasan transaksi dan pergerakan saldo.' }
            case 'grafik': return { title: 'GRAFIK TRANSAKSI', color: 'from-emerald-500 to-emerald-700', icon: 'fa-chart-simple', desc: 'Visualisasi data transaksi harian dan bulanan.' }
            case 'performa': return { title: 'PERFORMA KASIR', color: 'from-purple-600 to-purple-800', icon: 'fa-chart-line', desc: 'Analisis kecepatan dan volume transaksi per kasir.' }
            case 'absen': return { title: 'ABSENSI KASIR', color: 'from-teal-500 to-teal-700', icon: 'fa-fingerprint', desc: 'Rekapitulasi kehadiran dan jam kerja kasir.' }
            case 'izin': return { title: 'IZIN KARYAWAN', color: 'from-orange-500 to-orange-700', icon: 'fa-calendar-day', desc: 'Kelola permohonan izin dan cuti karyawan.' }
            case 'gaji': return { title: 'DATA GAJI KASIR', color: 'from-green-600 to-green-800', icon: 'fa-dollar-sign', desc: 'Perhitungan dan riwayat penggajian kasir.' }
            case 'saldo': return { title: 'PENGATURAN SALDO', color: 'from-emerald-600 to-emerald-800', icon: 'fa-wallet', desc: 'Alokasi dan penambahan modal harian kasir.' }
            case 'audit': return { title: 'AUDIT KASIR', color: 'from-purple-600 to-purple-800', icon: 'fa-file-signature', desc: 'Pemeriksaan kesesuaian fisik uang di laci.' }
            case 'catatan': return { title: 'CATATAN OWNER', color: 'from-amber-500 to-orange-600', icon: 'fa-clipboard-list', desc: 'Catat pengingat penting dan daftar belanja.' }
            default: return { title: 'BACKUP & RESET', color: 'from-red-600 to-red-800', icon: 'fa-database', desc: 'Cadangkan data dan kembalikan ke pengaturan awal.' }
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
                       {storeLabel ? (
                         <div className="mt-1.5 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                           <i className="fa-solid fa-store text-[9px] text-white/80"></i>
                           <span className="text-[10px] font-black text-white/95 uppercase tracking-widest">{storeLabel}</span>
                         </div>
                       ) : (
                         <p className="text-[11px] text-white/90 mt-1.5 font-bold tracking-widest flex items-center gap-2">
                           <i className="fa-solid fa-circle-info text-white/60"></i> {desc}
                         </p>
                       )}
                    </div>
                  </div>
               ) : (
                 <>
                   <button onClick={() => props.setActiveView('view-beranda')} className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all border border-white/20 active:scale-90 relative z-10">
                     <i className="fa-solid fa-arrow-left"></i>
                   </button>
                   <div className="text-center relative z-10">
                      <h3 className="font-black text-sm tracking-widest uppercase leading-none">{title}</h3>
                      {storeLabel ? (
                        <div className="mt-1 inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
                          <i className="fa-solid fa-store text-[7px] text-white/80"></i>
                          <span className="text-[8px] font-black text-white/90 uppercase tracking-widest">{storeLabel}</span>
                        </div>
                      ) : (
                        <p className="text-[9px] text-white/70 mt-1 font-bold uppercase tracking-widest">Panel Kontrol Owner</p>
                      )}
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
                    {/* Add Kasir Form */}
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                      <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3">Tambah / Edit Kasir</h4>
                      <div className="space-y-2">
                        <input type="text" placeholder="ID Kasir (contoh: kasir3)" value={kasirFormId} onChange={e => setKasirFormId(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                        <input type="text" placeholder="Nama Kasir" value={kasirFormName} onChange={e => setKasirFormName(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                        <input type="text" placeholder="PIN (4-6 digit)" value={kasirFormPin} onChange={e => setKasirFormPin(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                        <button onClick={() => {
                          if(!kasirFormId.trim() || !kasirFormName.trim() || !kasirFormPin) return props.showToast('Lengkapi data kasir');
                          // Validasi: ID kasir tidak boleh sama dengan yang sudah ada
                          const existingIds = Object.keys(props.kasirList || {})
                          if (existingIds.includes(kasirFormId.trim())) {
                            return props.showToast(`ID "${kasirFormId}" sudah digunakan kasir lain!`);
                          }
                          if (kasirFormPin.length < 4) return props.showToast('PIN minimal 4 digit!');
                          const newKasirList = { ...props.kasirList, [kasirFormId.trim()]: { pin: kasirFormPin, role: 'kasir' as any, name: kasirFormName.trim() } };
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
                          setKasirFormId(''); setKasirFormName(''); setKasirFormPin('');
                          props.showToast("Data Kasir Disimpan!");
                        }} className="w-full bg-blue-600 text-white text-[10px] font-black py-2 rounded-lg uppercase">Simpan Kasir</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(props.kasirList || {}).filter(([id]) => id !== 'owner').map(([id, account]) => {
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

                    {/* PANTAU AKTIVITAS PER KASIR */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-1.5">
                          <i className="fa-solid fa-chart-bar"></i> Pantau Aktivitas
                        </h4>
                        <input 
                          type="date" 
                          value={pantauTanggal} 
                          onChange={e => setPantauTanggal(e.target.value)}
                          className="text-[10px] font-bold border border-gray-200 rounded-lg px-2 py-1 outline-none bg-white focus:border-blue-400"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        {Object.entries(props.kasirList || {}).filter(([id]) => id !== 'owner').map(([id, account]) => {
                          const kasirTxs = props.transactions.filter(t => 
                            t.kasir_id === id && 
                            t.timestamp.startsWith(pantauTanggal) && 
                            !t.kategori.startsWith('Isi')
                          )
                          const totalNom = kasirTxs.reduce((s, t) => s + t.nominal, 0)
                          const totalAdm = kasirTxs.reduce((s, t) => s + t.adminFee, 0)
                          const totalIsi = props.transactions.filter(t => 
                            t.kasir_id === id && 
                            t.timestamp.startsWith(pantauTanggal) && 
                            t.kategori === 'Isi Saldo Bank'
                          ).reduce((s, t) => s + t.nominal, 0)

                          return (
                            <div key={id} className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">
                                    {account.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-gray-800">{account.name}</p>
                                    <p className="text-[8px] text-gray-400 font-bold uppercase">{parseLocalISO(pantauTanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full font-black uppercase",
                                  kasirTxs.length > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                                )}>
                                  {kasirTxs.length > 0 ? `${kasirTxs.length} TRX` : 'KOSONG'}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                <div className="bg-white rounded-lg py-1.5 px-2 text-center border border-blue-100/50">
                                  <p className="text-[9px] font-black text-gray-400 uppercase">Nominal</p>
                                  <p className="text-[12px] font-black text-gray-800">{totalNom > 0 ? (totalNom / 1000).toFixed(0) + 'K' : '0'}</p>
                                </div>
                                <div className="bg-white rounded-lg py-1.5 px-2 text-center border border-emerald-100/50">
                                  <p className="text-[9px] font-black text-gray-400 uppercase">Admin</p>
                                  <p className="text-[12px] font-black text-emerald-600">{totalAdm > 0 ? (totalAdm / 1000).toFixed(0) + 'K' : '0'}</p>
                                </div>
                                <div className="bg-white rounded-lg py-1.5 px-2 text-center border border-indigo-100/50">
                                  <p className="text-[9px] font-black text-gray-400 uppercase">Isi Saldo</p>
                                  <p className="text-[12px] font-black text-indigo-600">{totalIsi > 0 ? (totalIsi / 1000).toFixed(0) + 'K' : '0'}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

              {activeOwnerSubView === 'laporan' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-2">Filter Data Kasir</p>
                    <div className="relative">
                      <select
                        value={props.filterKasir || 'Semua'}
                        onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                        className="bg-white border border-gray-200 text-blue-800 text-xs font-black py-1.5 pl-3 pr-8 rounded-lg outline-none cursor-pointer appearance-none"
                      >
                        <option value="Semua">Semua Kasir</option>
                        {Object.entries(props.kasirList).map(([id, acc]) => (
                          <option key={id} value={id}>{acc.name}</option>
                        ))}
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-blue-400 pointer-events-none"></i>
                    </div>
                  </div>

                  {/* SALDO BANK */}
                  <div className="space-y-2.5 mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px]">
                        <i className="fa-solid fa-building-columns"></i>
                      </div>
                      <h4 className="text-[13px] font-black text-blue-700 uppercase tracking-widest">SALDO BANK</h4>
                    </div>
                    <div className="space-y-2 pl-7">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Total Saldo Bank</p>
                        <span className="text-xs font-black text-blue-700">{formatRupiah(ownerSaldoBank)}</span>
                      </div>
                    </div>
                  </div>

                  {/* KAS MASUK */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px]">
                        <i className="fa-solid fa-arrow-down"></i>
                      </div>
                      <h4 className="text-[13px] font-black text-green-700 uppercase tracking-widest">KAS MASUK</h4>
                    </div>
                    <div className="space-y-2 pl-7">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Modal Tunai Kasir</p>
                        <span className="text-xs font-black text-gray-800">{formatRupiah(ownerKasModal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Penjualan Digital</p>
                        <span className="text-xs font-black text-gray-800">{formatRupiah(ownerPenjualanDigital)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Penjualan Aksesoris</p>
                        <span className="text-xs font-black text-gray-800">{formatRupiah(ownerTotalAksesoris)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Total Admin Fee</p>
                        <span className="text-xs font-black text-gray-800">{formatRupiah(ownerTotalAdmin)}</span>
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
                      <h4 className="text-[13px] font-black text-red-600 uppercase tracking-widest">KAS KELUAR</h4>
                    </div>
                    <div className="space-y-2 pl-7">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Tarik Tunai Nasabah</p>
                        <span className="text-xs font-black text-red-600">-{formatRupiah(ownerTotalTarik)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100"></div>

                  {/* KAS LAIN NYA */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-[10px]">
                        <i className="fa-solid fa-layer-group"></i>
                      </div>
                      <h4 className="text-[13px] font-black text-purple-600 uppercase tracking-widest">KAS LAIN NYA</h4>
                    </div>
                    <div className="space-y-2 pl-7">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Admin Dalam/Non Tunai</p>
                        <span className="text-xs font-black text-purple-600">{formatRupiah(ownerAdminDalam)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Transaksi Non Tunai</p>
                        <span className="text-xs font-black text-indigo-600">{formatRupiah(ownerNonTunai)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500">Transaksi Khusus</p>
                        <span className="text-xs font-black text-fuchsia-600">{formatRupiah(ownerKhusus)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Balance */}
                  <div className="mt-3 p-4 bg-gradient-to-r from-blue-700 to-blue-800 rounded-2xl shadow-inner text-white flex justify-between items-center">
                    <div>
                      <p className="text-[12px] font-black text-blue-100 uppercase tracking-widest">SALDO LACI KASIR</p>
                      <p className="text-[8px] text-blue-200 mt-0.5">Total uang fisik hari ini</p>
                    </div>
                    <span className="text-lg font-black text-green-300">{formatRupiah(ownerTotalLaci)}</span>
                  </div>

                  <button className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
                    <i className="fa-solid fa-file-excel text-xs"></i> EXPORT LAPORAN EXCEL
                  </button>
                </div>
              )}               {activeOwnerSubView === 'audit' && (
                <div className="space-y-4">
                  {/* Kasir Selector for Audit */}
                  <div className="flex justify-between items-center bg-purple-50 p-3 rounded-2xl border border-purple-100">
                    <div>
                      <p className="text-[10px] font-black text-purple-800 uppercase tracking-widest">Pilih Kasir / Shift</p>
                      <p className="text-[8px] text-purple-400 font-bold uppercase">Audit Perorangan</p>
                    </div>
                    <div className="relative">
                      <select
                        value={props.filterKasir || 'Semua'}
                        onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                        className="bg-white border border-purple-200 text-purple-800 text-xs font-black py-2 pl-3 pr-8 rounded-xl outline-none cursor-pointer appearance-none shadow-sm"
                      >
                        <option value="Semua">Semua Kasir</option>
                        {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                          <option key={id} value={id}>{acc.name}</option>
                        ))}
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-purple-400 pointer-events-none"></i>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-purple-100 uppercase tracking-widest text-center mb-4">Input Uang Fisik Di Laci</p>
                      <div className="relative mb-4">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-white/40">Rp</span>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          placeholder="0" 
                          value={auditFisik}
                          onChange={e => setAuditFisik(formatInputRupiah(e.target.value))}
                          className="w-full py-4 pl-12 pr-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl font-black text-xl text-white outline-none focus:ring-4 focus:ring-white/10 placeholder:text-white/20" 
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-black/10 p-3 rounded-2xl border border-white/5 text-center">
                          <p className="text-[8px] font-black text-purple-200 uppercase tracking-widest mb-1">Hitungan Sistem</p>
                          <p className="text-[11px] font-black text-white">{formatRupiah(ownerTotalLaci)}</p>
                        </div>
                        <div className="bg-black/10 p-3 rounded-2xl border border-white/5 text-center">
                          <p className="text-[8px] font-black text-purple-200 uppercase tracking-widest mb-1">Selisih Audit</p>
                          {(() => {
                            const val = (parseInt(auditFisik.replace(/[^0-9]/g, '')) || 0) - ownerTotalLaci
                            return <p className={cn("text-[11px] font-black", val >= 0 ? "text-green-300" : "text-red-300")}>{formatRupiah(val)}</p>
                          })()}
                        </div>
                      </div>

                      <button 
                        onClick={handleSimpanAudit}
                        className="w-full bg-white text-purple-700 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-save"></i> Simpan Hasil Audit
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Riwayat Audit Terakhir</h4>
                      <div className="w-8 h-px bg-gray-100 flex-grow mx-3"></div>
                    </div>
                    
                    {(() => {
                      const filteredHistory = props.filterKasir === 'Semua' 
                        ? auditHistory 
                        : auditHistory.filter(h => h.kasirId === props.filterKasir)

                      if (filteredHistory.length === 0) {
                        return (
                          <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                            <i className="fa-solid fa-clipboard-check text-2xl text-gray-200 mb-2"></i>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                              {props.filterKasir === 'Semua' ? 'Belum ada riwayat audit' : `Belum ada audit untuk ${props.kasirList[props.filterKasir || '']?.name}`}
                            </p>
                          </div>
                        )
                      }

                      return (
                        <div className="space-y-2">
                          {filteredHistory.map((item, index) => (
                            <div key={index} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center group">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex flex-col items-center justify-center",
                                  item.selisih >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                )}>
                                  <span className="text-[8px] font-black leading-none">{item.selisih >= 0 ? 'OK' : 'MISS'}</span>
                                  <i className={cn("fa-solid text-[10px] mt-0.5", item.selisih >= 0 ? "fa-check" : "fa-xmark")}></i>
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <p className="text-[10px] font-black text-gray-800 uppercase leading-none">
                                      {parseLocalISO(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {item.jam}
                                    </p>
                                    <span className="bg-purple-100 text-purple-600 text-[7px] font-black px-1.5 py-0.5 rounded uppercase">{item.kasirName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-bold text-gray-400 uppercase">Selisih:</span>
                                    <span className={cn("text-[10px] font-black", item.selisih >= 0 ? "text-green-600" : "text-red-600")}>
                                      {formatRupiah(item.selisih)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  // Hapus berdasarkan pencarian objek asli karena index sudah difilter
                                  const originalIndex = auditHistory.findIndex(h => h === item)
                                  if (originalIndex !== -1) hapusAudit(originalIndex)
                                }}
                                className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <i className="fa-solid fa-trash text-[9px]"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {activeOwnerSubView === 'absen' && (
                <div className="space-y-6">
                  {/* TABS RINGKASAN vs FULL */}
                  <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setAbsenTab('summary')} 
                      className={cn(
                        "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                        absenTab === 'summary' ? "bg-white text-teal-600 shadow-sm" : "text-gray-500"
                      )}
                    >
                      Ringkasan
                    </button>
                    <button 
                      onClick={() => setAbsenTab('full')} 
                      className={cn(
                        "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                        absenTab === 'full' ? "bg-white text-teal-600 shadow-sm" : "text-gray-500"
                      )}
                    >
                      Riwayat Full
                    </button>
                  </div>

                  {absenTab === 'summary' ? (() => {
                    const cashiers = Object.entries(props.kasirList).filter(([id]) => id !== 'owner')
                    const todayStr = new Date().toLocaleDateString('en-CA')
                    
                    return (
                      <div className="space-y-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Kehadiran Hari Ini ({new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })})</p>
                        
                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
                          {/* Header Summary */}
                          <div className="bg-teal-50/50 px-4 py-2.5 border-b border-gray-50 flex justify-between items-center">
                            <h4 className="text-[11px] font-black text-teal-900 uppercase tracking-widest">
                              Ringkasan Absen
                            </h4>
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                              <span className="text-[8px] font-black text-teal-600 uppercase tracking-tighter">Live Monitor</span>
                            </span>
                          </div>
                          
                          <div className="divide-y divide-gray-50">
                            {cashiers.map(([id, acc]) => {
                              const entry = props.absensiList?.find(a => a.username === id && a.tanggal === todayStr)
                              
                              let shiftLabel = 'BELUM ABSEN'
                              let shiftColor = 'text-gray-300'
                              
                              if (entry) {
                                const hour = parseInt(entry.jam_masuk.split(':')[0])
                                if (hour < 10) { shiftLabel = 'PAGI'; shiftColor = 'text-orange-500'; }
                                else if (hour < 15) { shiftLabel = 'NORMAL'; shiftColor = 'text-indigo-500'; }
                                else { shiftLabel = 'SIANG'; shiftColor = 'text-purple-600'; }
                              }

                              return (
                                <div key={id} className="px-4 py-3.5 flex justify-between items-center bg-white">
                                  <div className="w-1/3">
                                    <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight truncate">{acc.name}</p>
                                  </div>
                                  
                                  <div className="flex-1 text-center">
                                    <p className={cn("text-[8px] font-black uppercase tracking-widest", shiftColor)}>
                                      {shiftLabel}
                                    </p>
                                  </div>
                                  
                                  <div className="w-1/4 text-right">
                                    <p className="text-[7px] font-black text-gray-300 uppercase leading-none mb-0.5">MASUK</p>
                                    <p className={cn(
                                      "text-[10px] font-black tabular-nums leading-none",
                                      entry ? "text-blue-600" : "text-gray-200"
                                    )}>
                                      {entry ? entry.jam_masuk : '--:--'}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })() : (() => {
                    const cashiers = Object.entries(props.kasirList).filter(([id]) => id !== 'owner')
                    const last30Days = Array.from({length: 30}, (_, i) => {
                      const d = new Date()
                      d.setDate(d.getDate() - i)
                      return d
                    })

                    return (
                      <div className="space-y-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Riwayat 30 Hari Terakhir</p>
                        
                        {last30Days.map(date => {
                          const dateStr = date.toLocaleDateString('en-CA')
                          const dayAttendance = props.absensiList?.filter(a => a.tanggal === dateStr) || []
                          
                          // Only show if there's at least one attendance or if it's within a few days
                          if (dayAttendance.length === 0 && date > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) {
                             // Keep showing last 3 days even if empty as per user request to see "Belum Absen"
                          } else if (dayAttendance.length === 0) {
                            return null; // Don't show empty old dates
                          }

                          return (
                            <div key={dateStr} className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
                              {/* Date Header */}
                              <div className="bg-blue-50/50 px-4 py-2.5 border-b border-gray-50">
                                <h4 className="text-[11px] font-black text-blue-900">
                                  {date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h4>
                              </div>
                              
                              <div className="divide-y divide-gray-50">
                                {cashiers.map(([id, acc]) => {
                                  const entry = dayAttendance.find(a => a.username === id)
                                  
                                  // Determine Shift/Color based on time (matching photo aesthetics)
                                  let shiftLabel = 'BELUM ABSEN'
                                  let shiftColor = 'text-gray-300'
                                  
                                  if (entry) {
                                    const hour = parseInt(entry.jam_masuk.split(':')[0])
                                    if (hour < 10) { shiftLabel = 'PAGI'; shiftColor = 'text-orange-500'; }
                                    else if (hour < 15) { shiftLabel = 'NORMAL'; shiftColor = 'text-indigo-500'; }
                                    else { shiftLabel = 'SIANG'; shiftColor = 'text-purple-600'; }
                                  }

                                  return (
                                    <div key={id} className="px-4 py-3 flex justify-between items-center bg-white">
                                      <div className="w-1/3">
                                        <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight truncate">{acc.name}</p>
                                      </div>
                                      
                                      <div className="flex-1 text-center">
                                        <p className={cn("text-[8px] font-black uppercase tracking-widest", shiftColor)}>
                                          {shiftLabel}
                                        </p>
                                      </div>
                                      
                                      <div className="w-1/4 text-right">
                                        <p className="text-[7px] font-black text-gray-300 uppercase leading-none mb-0.5">MASUK</p>
                                        <p className={cn(
                                          "text-[10px] font-black tabular-nums leading-none",
                                          entry ? "text-blue-600" : "text-gray-200"
                                        )}>
                                          {entry ? entry.jam_masuk : '--:--'}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              )}

              {activeOwnerSubView === 'gaji' && (
                <GajiPanel 
                  kasirList={props.kasirList} 
                  absensiList={props.absensiList} 
                  storeName={props.storeName} 
                  showToast={props.showToast}
                  activeStoreId={props.activeStoreId === 'all' ? (props.pantauStoreId || 'all') : (props.activeStoreId || 'all')}
                />
              )}

              {activeOwnerSubView === 'backup' && (
                <div className="animate-in slide-in-from-right duration-300">
                  <BackupPanel 
                    transactions={props.transactions} 
                    absensiList={props.absensiList} 
                    storeName={props.storeName} 
                    showToast={props.showToast}
                    onConfirm={props.onConfirm}
                    activeStoreId={props.activeStoreId === 'all' ? (props.pantauStoreId || 'all') : (props.activeStoreId || 'all')}
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
                      {catatanIzin.map((item: any, index: number) => (
                        <div key={index} className="p-3 border border-gray-100 rounded-2xl bg-gray-50/50 flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-gray-800">{item.nama}</p>
                            <p className="text-[9px] text-orange-600 font-bold mt-0.5">
                              <i className="fa-regular fa-calendar-alt mr-1"></i>
                              {parseLocalISO(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-[10px] text-gray-600 mt-1 leading-snug">{item.alasan}</p>
                          </div>
                          <button 
                            onClick={() => hapusIzin(index)} 
                            className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 hover:bg-red-200 transition-all"
                          >
                            <i className="fa-solid fa-trash text-[10px]"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeOwnerSubView === 'grafik' && (() => {
                if (isAnalyticsLoading) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 bg-white/50 rounded-3xl border border-white border-dashed">
                       <i className="fa-solid fa-spinner fa-spin text-4xl text-purple-200 mb-3"></i>
                       <p className="text-center text-[11px] font-bold text-purple-400 uppercase tracking-widest">Memuat Grafik...</p>
                    </div>
                  )
                }

                const now = new Date()
                now.setHours(0,0,0,0)
                
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
                }

                // Filter analytics by selected Kasir
                let filteredAnalytics = analyticsData;
                let filterKasirName = grafikFilterKasir;
                
                if (grafikFilterKasir !== 'Semua') {
                  filterKasirName = props.kasirList[grafikFilterKasir]?.name || grafikFilterKasir;
                  // DB stores kasir_id as login username (grafikFilterKasir), so match against that
                  filteredAnalytics = filteredAnalytics.filter(r => 
                    (r.kasir_id || '').trim().toLowerCase() === grafikFilterKasir.trim().toLowerCase()
                  );
                }

                // Function to group by date string prefix
                const sumByPrefix = (prefix: string) => 
                  filteredAnalytics.filter(r => r.tanggal && r.tanggal.startsWith(prefix))
                                   .reduce((s, r) => s + Number(r.total_omzet), 0)

                let trendData: { label: string, value: number }[] = []
                
                if (grafikRange === 'harian') {
                  trendData = Array.from({length: 7}, (_, i) => {
                    const d = new Date(now)
                    d.setDate(d.getDate() - (6 - i))
                    const prefix = formatLocalISO(d)
                    return { label: d.toLocaleDateString('id-ID', { weekday: 'short' }), value: sumByPrefix(prefix) }
                  })
                } else if (grafikRange === 'mingguan') {
                  trendData = Array.from({length: 4}, (_, i) => {
                    const d = new Date(now)
                    d.setDate(d.getDate() - (21 - i * 7)) 
                    let weekSum = 0
                    for(let j=0; j<7; j++) {
                      const wd = new Date(d)
                      wd.setDate(wd.getDate() + j)
                      const prefix = formatLocalISO(wd)
                      weekSum += sumByPrefix(prefix)
                    }
                    return { label: `M${i+1}`, value: weekSum }
                  })
                } else {
                  trendData = Array.from({length: 6}, (_, i) => {
                    const d = new Date(now)
                    d.setMonth(d.getMonth() - (5 - i))
                    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                    return { label: d.toLocaleDateString('id-ID', { month: 'short' }), value: sumByPrefix(yearMonth) }
                  })
                }

                const maxTrendVal = Math.max(...trendData.map(d => d.value), 1)

                // KPI Metriks from Analytics Data
                const totalVolume = filteredAnalytics.reduce((sum, r) => sum + Number(r.total_omzet), 0)
                const totalItems = filteredAnalytics.reduce((sum, r) => sum + Number(r.total_transaksi), 0)
                const avgTransaction = totalItems > 0 ? Math.round(totalVolume / totalItems) : 0
                const totalAdminLaba = filteredAnalytics.reduce((sum, r) => sum + Number(r.total_admin || 0), 0)

                // Use analyticsRawData (which contains up to 6 months of raw txs) for Category and Time analysis
                const recentValidTxs = analyticsRawData.filter(t => t && t.kategori && !t.kategori.startsWith('Isi'))
                let filteredRecentTxs = recentValidTxs
                if (grafikFilterKasir !== 'Semua') {
                  filteredRecentTxs = filteredRecentTxs.filter(t => (t.kasir_id || '').trim().toLowerCase() === grafikFilterKasir.trim().toLowerCase())
                }

                // Kategori Terlaris (Tren Terbaru)
                const kategoriMap = new Map<string, number>()
                filteredRecentTxs.forEach(t => {
                  const cat = t.kategori || 'Lainnya'
                  kategoriMap.set(cat, (kategoriMap.get(cat) || 0) + (t.nominal || 0))
                })
                const categoryData = Array.from(kategoriMap.entries()).map(([k, v]) => ({ label: k, value: v })).sort((a,b) => b.value - a.value)

                // Jam Sibuk (Time Blocks Tren Terbaru)
                const hourMap = new Array(24).fill(0)
                filteredRecentTxs.forEach(t => {
                  if (!t.timestamp) return;
                  try {
                    let h = 0;
                    if (typeof t.timestamp === 'string' && t.timestamp.includes('T')) {
                      h = parseInt(t.timestamp.split('T')[1].substring(0, 2), 10);
                    } else {
                      const d = new Date(t.timestamp);
                      if (!isNaN(d.getTime())) h = d.getHours();
                    }
                    if (!isNaN(h) && h >= 0 && h < 24) hourMap[h]++;
                  } catch(e) {}
                })
                const timeBlocks = [
                  { label: 'Pagi', sub: '06-12', value: hourMap.slice(6, 12).reduce((a,b)=>a+b,0) },
                  { label: 'Siang', sub: '12-15', value: hourMap.slice(12, 15).reduce((a,b)=>a+b,0) },
                  { label: 'Sore', sub: '15-18', value: hourMap.slice(15, 18).reduce((a,b)=>a+b,0) },
                  { label: 'Malam', sub: '18-24', value: hourMap.slice(18, 24).reduce((a,b)=>a+b,0) + hourMap.slice(0, 6).reduce((a,b)=>a+b,0) }
                ]
                const maxTimeVal = Math.max(...timeBlocks.map(d => d.value), 1)

                return (
                  <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Controls */}
                    <div className="bg-white p-2 rounded-[1.25rem] border border-gray-100 shadow-sm flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <select
                          value={grafikFilterKasir}
                          onChange={(e) => setGrafikFilterKasir(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 text-gray-800 text-[10px] font-black py-2.5 pl-3 pr-8 rounded-xl outline-none cursor-pointer appearance-none transition-all hover:bg-gray-100"
                        >
                          <option value="Semua">Semua Kasir</option>
                          {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                            <option key={id} value={id}>{acc.name}</option>
                          ))}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>
                      </div>

                      <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                        {(['harian', 'mingguan', 'bulanan'] as const).map(range => (
                          <button 
                            key={range}
                            onClick={() => setGrafikRange(range)}
                            className={cn(
                              "text-[9px] font-black uppercase px-2.5 py-2 rounded-lg transition-all",
                              grafikRange === range ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                            )}
                          >
                            {range === 'harian' ? 'HARI' : range === 'mingguan' ? 'MINGGU' : 'BULAN'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3.5 rounded-[1.5rem] text-white shadow-lg shadow-emerald-200 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                        <p className="text-[8px] font-black text-emerald-100 uppercase tracking-widest relative z-10 mb-1">TOTAL OMZET</p>
                        <h2 className="text-sm font-black text-white relative z-10 truncate tabular-nums">Rp {totalVolume.toLocaleString('id-ID')}</h2>
                      </div>
                      
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3.5 rounded-[1.5rem] text-white shadow-lg shadow-blue-200 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                        <p className="text-[8px] font-black text-blue-100 uppercase tracking-widest relative z-10 mb-1">TRANSAKSI</p>
                        <h2 className="text-sm font-black text-white relative z-10 truncate tabular-nums">{totalItems.toLocaleString('id-ID')} <span className="text-[9px]">item</span></h2>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500 to-fuchsia-600 p-3.5 rounded-[1.5rem] text-white shadow-lg shadow-purple-200 relative overflow-hidden group">
                        <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                        <p className="text-[8px] font-black text-purple-100 uppercase tracking-widest relative z-10 mb-1">RATA-RATA</p>
                        <h2 className="text-sm font-black text-white relative z-10 truncate tabular-nums">Rp {avgTransaction.toLocaleString('id-ID')}</h2>
                      </div>
                    </div>

                    {/* KPI Card: Total Laba/Admin */}
                    <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 p-4 rounded-[1.5rem] text-white shadow-lg shadow-orange-200 relative overflow-hidden group">
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                      <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black text-amber-100 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <i className="fa-solid fa-sack-dollar"></i> TOTAL LABA / ADMIN FEE
                          </p>
                          <h2 className="text-xl font-black text-white tabular-nums">Rp {totalAdminLaba.toLocaleString('id-ID')}</h2>
                          <p className="text-[9px] text-amber-100 mt-0.5 font-bold">
                            {totalItems > 0 ? `Rata-rata Rp ${Math.round(totalAdminLaba / totalItems).toLocaleString('id-ID')} / transaksi` : 'Belum ada transaksi'}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-coins text-2xl text-white/80"></i>
                        </div>
                      </div>
                    </div>

                    {/* Chart 1: Tren Pendapatan */}
                    <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                        <div>
                          <h4 className="text-[13px] font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <i className="fa-solid fa-chart-line text-blue-500"></i> Tren Pendapatan
                          </h4>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {grafikRange === 'harian' ? '7 Hari Terakhir' : grafikRange === 'mingguan' ? '4 Minggu Terakhir' : '6 Bulan Terakhir'}
                          </p>
                        </div>
                        
                        {/* Toggle Bar vs Line */}
                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                          <button
                            onClick={() => setGrafikType('bar')}
                            className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5", grafikType === 'bar' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}
                          >
                            <i className="fa-solid fa-chart-column"></i> Bar
                          </button>
                          <button
                            onClick={() => setGrafikType('line')}
                            className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5", grafikType === 'line' ? "bg-white text-amber-500 shadow-sm" : "text-gray-400 hover:text-gray-600")}
                          >
                            <i className="fa-solid fa-bolt"></i> Petir
                          </button>
                        </div>
                      </div>

                      <style>{`
                        @keyframes growUp { from { transform: scaleY(0); } to { transform: scaleY(1); } }
                        .animate-grow { animation: growUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-origin: bottom; }
                        @keyframes dashLine { to { stroke-dashoffset: 0; } }
                      `}</style>

                      {grafikType === 'bar' ? (
                        <div className="h-44 flex items-end justify-between gap-1.5 relative mt-6">
                          {/* Background lines */}
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
                             {[...Array(4)].map((_, i) => (
                               <div key={i} className="w-full border-t border-dashed border-gray-100 flex-1"></div>
                             ))}
                          </div>

                          {trendData.map((d, i) => {
                            const heightPct = Math.max((d.value / maxTrendVal) * 100, 2);
                            return (
                              <div key={i} className="relative flex flex-col items-center flex-1 group/bar h-full justify-end pb-7 z-10">
                                <div className="absolute -top-8 bg-gray-800 text-white text-[9px] font-black px-2.5 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 group-active/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-lg transform -translate-y-2 group-hover/bar:-translate-y-4">
                                  Rp {d.value.toLocaleString('id-ID')}
                                  <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                                </div>
                                <div 
                                  className="w-full max-w-[32px] bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-xl shadow-sm animate-grow transition-all group-hover/bar:brightness-110 group-active/bar:brightness-110 cursor-pointer relative overflow-hidden"
                                  style={{ height: `${heightPct}%`, animationDelay: `${i * 50}ms` }}
                                >
                                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/bar:opacity-100 transition-opacity"></div>
                                </div>
                                <span className="absolute bottom-0 text-[9px] font-black text-gray-400 uppercase tracking-tighter truncate w-full text-center">
                                  {d.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="h-44 relative mt-6 pt-4">
                          {/* Background Grid Lines */}
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7 pt-4">
                             {[...Array(4)].map((_, i) => (
                               <div key={i} className="w-full border-t border-dashed border-gray-100 flex-1"></div>
                             ))}
                          </div>
                          
                          {/* SVG Line / Petir */}
                          <div className="absolute inset-0 pb-7 pt-4 w-full h-full">
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                              <defs>
                                <linearGradient id="petirGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                                </linearGradient>
                                <filter id="glowPetir">
                                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                  <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                  </feMerge>
                                </filter>
                              </defs>
                              
                              {(() => {
                                const pts = trendData.map((d, i) => {
                                  const x = (i / Math.max(trendData.length - 1, 1)) * 100;
                                  const y = 100 - (d.value / maxTrendVal) * 100;
                                  return `${x},${y}`;
                                }).join(' ');
                                
                                const areaPts = `0,100 ${pts} 100,100`;
                                
                                return (
                                  <>
                                    <polygon points={areaPts} fill="url(#petirGrad)" className="animate-in fade-in duration-1000" />
                                    <polyline 
                                      points={pts} 
                                      fill="none" 
                                      stroke="#f59e0b" 
                                      strokeWidth="3" 
                                      vectorEffect="non-scaling-stroke"
                                      strokeLinejoin="round" 
                                      strokeLinecap="round" 
                                      filter="url(#glowPetir)"
                                      className="animate-[dashLine_1.5s_ease-out_forwards]"
                                      strokeDasharray="1000"
                                      strokeDashoffset="1000"
                                    />
                                  </>
                                )
                              })()}
                            </svg>
                          </div>
                          
                          {/* Nodes & Tooltips */}
                          <div className="absolute inset-0 pb-7 pt-4 w-full h-full">
                            {trendData.map((d, i) => {
                              const leftPct = (i / Math.max(trendData.length - 1, 1)) * 100;
                              const bottomPct = (d.value / maxTrendVal) * 100;
                              return (
                                <div key={i} className="absolute group/node cursor-pointer z-10 w-6 h-6 -translate-x-1/2 translate-y-1/2" style={{ left: `${leftPct}%`, bottom: `calc(${bottomPct}% + 28px)` }}>
                                  <div className="absolute bottom-full mb-2 bg-amber-600 text-white text-[9px] font-black px-2.5 py-1.5 rounded-lg opacity-0 group-hover/node:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg transform -translate-x-1/2 left-1/2 pointer-events-none">
                                    Rp {d.value.toLocaleString('id-ID')}
                                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-600 rotate-45"></div>
                                  </div>
                                  <div className="w-3 h-3 rounded-full border-[3px] border-white bg-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-md transform transition-transform group-hover/node:scale-150"></div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Labels */}
                          <div className="absolute bottom-0 left-0 w-full flex justify-between px-1">
                            {trendData.map((d, i) => (
                              <div key={i} className="flex-1 flex justify-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter truncate text-center">
                                  {d.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {/* Chart 2: Kategori Terlaris (Donut) */}
                      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 flex flex-col">
                        <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-tight flex items-center gap-2 mb-1">
                          <i className="fa-solid fa-chart-pie text-orange-500"></i> Kategori
                        </h4>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-4">Omzet per jenis</p>
                        
                        {(() => {
                          const total = categoryData.reduce((s, d) => s + d.value, 0) || 1;
                          let currentOffset = 0;
                          const colors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
                          return (
                            <div className="flex-1 flex flex-col">
                              <div className="h-28 flex items-center justify-center relative mb-4">
                                <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible transform -rotate-90">
                                  {categoryData.map((d, i) => {
                                    if (d.value === 0) return null;
                                    const radius = 40;
                                    const circumference = 2 * Math.PI * radius;
                                    const percentage = d.value / total;
                                    const strokeLength = percentage * circumference;
                                    const dasharray = `${strokeLength} ${circumference}`;
                                    const dashoffset = -currentOffset;
                                    currentOffset += strokeLength;
                                    return (
                                      <circle
                                        key={i}
                                        cx="50"
                                        cy="50"
                                        r={radius}
                                        fill="transparent"
                                        stroke={colors[i % colors.length]}
                                        strokeWidth="16"
                                        strokeDasharray={dasharray}
                                        strokeDashoffset={dashoffset}
                                        strokeLinecap={percentage > 0.99 ? "round" : "butt"}
                                        className="animate-in zoom-in duration-1000 hover:stroke-[20] transition-all cursor-pointer"
                                        style={{ animationDelay: `${i * 100}ms` }}
                                      >
                                        <title>{d.label}: Rp {d.value.toLocaleString('id-ID')}</title>
                                      </circle>
                                    )
                                  })}
                                </svg>
                                {/* Center Label */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-4px]">
                                  <span className="text-[10px] font-black text-gray-800">{categoryData.length > 0 ? categoryData[0].label : '-'}</span>
                                  <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">Terlaris</span>
                                </div>
                              </div>
                              <div className="space-y-1.5 mt-auto">
                                {categoryData.slice(0, 3).map((d, i) => (
                                  <div key={i} className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }}></div>
                                      <span className="text-[9px] font-black text-gray-600 truncate">{d.label}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-gray-900 ml-2">{(d.value/total*100).toFixed(0)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      {/* Chart 3: Jam Sibuk */}
                      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 flex flex-col">
                        <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-tight flex items-center gap-2 mb-1">
                          <i className="fa-solid fa-clock text-indigo-500"></i> Jam Sibuk
                        </h4>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-4">Volume Transaksi</p>
                        
                        <div className="flex-1 flex items-end justify-between gap-1 relative mt-2">
                           <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-4">
                             {[...Array(3)].map((_, i) => (
                               <div key={i} className="w-full border-t border-dashed border-gray-100 flex-1"></div>
                             ))}
                           </div>
                           
                           {timeBlocks.map((d, i) => {
                             const heightPct = Math.max((d.value / maxTimeVal) * 100, 5);
                             return (
                               <div key={i} className="relative flex flex-col items-center flex-1 group/bar h-full justify-end pb-4 z-10">
                                 <div className="absolute -top-6 bg-gray-800 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-20">
                                   {d.value} trx
                                 </div>
                                 <div 
                                   className="w-full max-w-[24px] bg-indigo-100 rounded-t-lg animate-grow transition-all group-hover/bar:bg-indigo-400 relative overflow-hidden"
                                   style={{ height: `${heightPct}%`, animationDelay: `${i * 100 + 200}ms` }}
                                 >
                                   <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
                                 </div>
                                 <span className="absolute bottom-0 text-[8px] font-black text-gray-500 uppercase tracking-tighter truncate w-full text-center">
                                   {d.label}
                                 </span>
                               </div>
                             )
                           })}
                        </div>
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

                    const performaData = Object.keys(props.kasirList)
                      .filter(id => id !== 'owner')
                      .map(kId => {
                        const kasirName = props.kasirList[kId]?.name || kId;
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
                          name: props.kasirList[kId]?.name || kId,
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
                            <option value="Isi Saldo Bank">🏦 Saldo Bank (Plafon)</option>
                            <option value="Isi Modal Tunai Kasir">💵 Modal Tunai Kasir</option>
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
            </div>
            </div>
          </div>
        );
      })()}

      {props.kasirRole !== 'owner' && (
        <div className="px-1.5 mb-4">
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
            presets={props.presets}
          />
        </div>
      )}
      {props.kasirRole === 'owner' && !isOwnerSubView && (
        <div className="px-1.5 mb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-900 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-900/20 group">
            {/* Background Ornaments */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full -ml-16 -mb-16 blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center text-white border border-white/20 shadow-2xl shadow-black/20 group-hover:scale-105 transition-transform duration-500">
                    <i className="fa-solid fa-crown text-2xl text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Owner Control</h3>
                    <p className="text-[10px] text-blue-100/60 font-black uppercase tracking-[0.3em]">{props.storeName}</p>
                  </div>
                </div>

                {/* Filter Kasir Selector - Conditional */}
                {localStorage.getItem('alphaPro_showKasirFilter') !== 'false' && (
                  <div className="relative z-50">
                    <select 
                      value={props.filterKasir || 'Semua'}
                      onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                      className="appearance-none bg-white/10 backdrop-blur-md border border-white/20 text-white text-[9px] font-black py-2 pl-3 pr-8 rounded-xl outline-none cursor-pointer hover:bg-white/20 transition-all uppercase tracking-widest relative z-50 w-full"
                    >
                      <option value="Semua" className="text-gray-900">Semua</option>
                      {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                        <option key={id} value={id} className="text-gray-900">{acc.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50 text-[8px] z-10">
                      <i className="fa-solid fa-chevron-down"></i>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl hover:bg-white/15 transition-all cursor-default">
                  <p className="text-[8px] font-black text-blue-200/80 uppercase tracking-tighter mb-1">Volume</p>
                  <p className="text-[13px] font-black text-white tabular-nums">{formatRupiah(ownerTotalVolume)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl hover:bg-white/15 transition-all cursor-default">
                  <p className="text-[8px] font-black text-emerald-300 uppercase tracking-tighter mb-1">Profit</p>
                  <p className="text-[13px] font-black text-emerald-400 tabular-nums">{formatRupiah(ownerTotalAdmin)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl hover:bg-white/15 transition-all cursor-default">
                  <p className="text-[8px] font-black text-amber-300 uppercase tracking-tighter mb-1">Items</p>
                  <p className="text-[13px] font-black text-amber-400 tabular-nums">{ownerTotalTrx}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] font-black text-blue-100/60 uppercase tracking-widest">Sistem Online</span>
                </div>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-tighter">v1.1.0 Premium</span>
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
