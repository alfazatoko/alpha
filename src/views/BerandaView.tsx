import React, { useState, useEffect } from 'react'
import { formatRupiah, cn, getLocalISOString } from '../lib/utils'
import TransactionForm from '../components/TransactionForm'
import SummaryCards from '../components/SummaryCards'
import type { Transaction } from '../types'
import { saveKasirAccounts, type KasirAccount } from '../components/LoginScreen'

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
  kasirList: Record<string, KasirAccount>
  refreshKasirList: () => void
  jamAbsen?: string
  absensiList?: any[]
  runningTexts?: string[]
  mainAnnouncement?: string
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
}> = ({ kasirList, absensiList }) => {
  const [selectedKasir, setSelectedKasir] = useState<string>('')
  const [month, setMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [mode, setMode] = useState<'harian' | 'bulanan'>('harian')
  const [gajiPerHari, setGajiPerHari] = useState(() => localStorage.getItem("alfaza_gaji_per_hari") || "50000")
  const [gajiBulanan, setGajiBulanan] = useState(() => localStorage.getItem("alfaza_gaji_bulanan") || "0")
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
    const saved = localStorage.getItem('alphaPro_catatanIzin')
    if (saved) {
      setIzinList(JSON.parse(saved))
    }
  }, [month])

  useEffect(() => {
    localStorage.setItem("alfaza_gaji_per_hari", gajiPerHari.replace(/\D/g, ''))
  }, [gajiPerHari])
  useEffect(() => {
    localStorage.setItem("alfaza_gaji_bulanan", gajiBulanan.replace(/\D/g, ''))
  }, [gajiBulanan])

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
      `Slip Gaji - ${monthLabel.toUpperCase()}`,
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
        alert("Teks disalin ke clipboard")
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
      pdf.text(`Dicetak pada: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`, pdfWidth / 2, imgHeight + 25, { align: "center" })

      const blob = pdf.output("blob")
      const filename = `slip-gaji-${selectedName.replace(/\s+/g, '-')}-${month}.pdf`
      const file = new File([blob], filename, { type: "application/pdf" })
      
      if (navigator.share) {
        await navigator.share({ title: `Slip Gaji ${selectedName}`, files: [file] }).catch(() => {})
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      alert("Gagal share PDF")
      console.error(e)
    }
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">PILIH KASIR</label>
            <select
              value={selectedKasir}
              onChange={e => setSelectedKasir(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-green-400"
            >
              {kasirArr.map(([id, k]) => <option key={id} value={id}>{k.name.toUpperCase()}</option>)}
            </select>
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
              <p className="text-[7px] font-bold text-green-200 uppercase tracking-widest">ALFAZA CELL</p>
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

const BerandaView: React.FC<BerandaViewProps> = (props) => {
  const [showRincian, setShowRincian] = useState(false)
  const [activeOwnerModal, setActiveOwnerModal] = useState<string | null>(null) // monitor, laporan, audit
  const [currentTime, setCurrentTime] = useState(new Date())

  // Kasir Management State (Form inputs remain local)
  const [kasirFormId, setKasirFormId] = useState('')
  const [kasirFormName, setKasirFormName] = useState('')
  const [kasirFormPin, setKasirFormPin] = useState('')

  // Izin State
  const [izinNamaKasir, setIzinNamaKasir] = useState('')
  const [izinTanggal, setIzinTanggal] = useState(new Date().toLocaleDateString('en-CA'))
  const [izinAlasan, setIzinAlasan] = useState('')
  const [catatanIzin, setCatatanIzin] = useState<any[]>([])
  const STORAGE_KEY_IZIN = 'alphaPro_catatanIzin'

  // Pantau State
  const [pantauTanggal, setPantauTanggal] = useState(new Date().toLocaleDateString('en-CA'))

  // Absensi Modal State
  const [absenTab, setAbsenTab] = useState<'summary' | 'full'>('summary')

  // Grafik State
  const [grafikFilterKasir, setGrafikFilterKasir] = useState('Semua')
  const [grafikRange, setGrafikRange] = useState<'harian'|'mingguan'|'bulanan'>('harian')

  useEffect(() => {
    if (activeOwnerModal === 'izin') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_IZIN)
        if (saved) setCatatanIzin(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load izin', e)
      }
    }
  }, [activeOwnerModal])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const simpanIzin = () => {
    if (!izinNamaKasir || !izinTanggal || !izinAlasan.trim()) return alert('Lengkapi semua data!')
    const baru = { nama: izinNamaKasir, tanggal: izinTanggal, alasan: izinAlasan.trim(), dicatatPada: getLocalISOString() }
    const updated = [baru, ...catatanIzin]
    setCatatanIzin(updated)
    localStorage.setItem(STORAGE_KEY_IZIN, JSON.stringify(updated))
    setIzinNamaKasir(''); setIzinAlasan('')
  }

  const hapusIzin = (index: number) => {
    if (!confirm('Hapus catatan izin ini?')) return
    const updated = catatanIzin.filter((_, i) => i !== index)
    setCatatanIzin(updated)
    localStorage.setItem(STORAGE_KEY_IZIN, JSON.stringify(updated))
  }

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' })
  const fullDate = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const clockStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  
  const totalPendapatanBersih = props.totalSaldoKas
  const penjualanDigital = props.penjualanDigital
  const kasModal = props.kasModal

  return (
    <div className={cn("page-view hide-scrollbar", props.active && "active")}>
      {/* Header with blue gradient background — flat top, curved bottom */}
      <div className="relative" style={{ background: '#0000c6', borderRadius: '0 0 2.5rem 2.5rem', paddingBottom: '3.5rem' }}>
        <div className="px-1.5 pt-6 pb-4 flex justify-between items-center">
          <button onClick={() => props.setIsSidePanelOpen(true)} className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
            <i className="fa-solid fa-ellipsis-vertical text-xs"></i>
          </button>
          <div className="flex-1 ml-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Metallic Gray/White Logo (Background removed via Invert+Screen trick) */}
              <img 
                src="/logo-alpha.png" 
                alt="Logo" 
                className="w-12 h-12 object-contain" 
                style={{ 
                  filter: 'invert(1) brightness(1.2)', 
                  mixBlendMode: 'screen' 
                }} 
              />
              <div>
                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-tight">Selamat datang,</p>
                <h1 className="text-lg font-black text-white leading-tight">
                  {props.kasirName || 'ALPHA'}
                  <span className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full ml-1 font-black",
                    props.kasirRole === 'owner' ? "bg-amber-400 text-amber-900" : "bg-white/25 text-white"
                  )}>
                    {props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'}
                  </span>
                </h1>
              </div>
            </div>

            <div className="text-right">
              <p className="text-blue-200 text-[8px] font-bold uppercase tracking-widest leading-none mb-1">
                {dayName}
              </p>
              <p className="text-white text-[10px] font-black tracking-tight leading-none mb-1">
                {fullDate}
              </p>
              <p className="text-blue-100 text-xs font-black tabular-nums tracking-widest">
                {clockStr}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Saldo card — overlaps the blue header */}
      <div className="mx-1.5 bg-white rounded-2xl p-4 shadow-xl mb-3 relative z-10" style={{ marginTop: '-2.5rem' }}>
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
      )}

      {showRincian && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-1.5 py-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-blue-600 px-3 py-5 text-white flex justify-between items-start">
              <div>
                <h3 className="font-black text-[19px] tracking-tight uppercase leading-none">RINCIAN KEUANGAN</h3>
                <p className="text-[12px] text-blue-100 opacity-90 mt-1.5">Rekapitulasi Arus Kas Hari Ini</p>
              </div>
              <button onClick={() => setShowRincian(false)} className="w-8 h-8 rounded-full bg-blue-700/50 flex items-center justify-center hover:bg-blue-800 transition-all shadow-inner">
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            
            <div className="px-2 py-5 space-y-5 max-h-[75vh] overflow-y-auto hide-scrollbar">
              {/* SALDO BANK */}
              <div className="space-y-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center text-white text-[9px]">
                    <i className="fa-solid fa-building-columns"></i>
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black text-blue-800 uppercase leading-none">SALDO BANK</h4>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5 opacity-80">Total uang di rekening/digital</p>
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
                    <h4 className="text-[13px] font-black text-green-800 uppercase leading-none">KAS MASUK</h4>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5 opacity-80">Uang/cash masuk ke laci kasir</p>
                  </div>
                </div>

                <div className="space-y-3 pl-1.5">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-green-700 mt-1.5 opacity-60"></div>
                      <div>
                        <p className="text-xs font-black text-gray-800">Modal Tunai Kasir</p>
                        <p className="text-[11px] text-gray-400">Uang modal yang dimasukkan</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-green-700">Rp {Number(kasModal).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-green-700 mt-1.5 opacity-60"></div>
                      <div>
                        <p className="text-xs font-black text-gray-800">Penjualan Digital</p>
                        <p className="text-[11px] text-gray-400">Transfer, ewallet, pulsa, token, dll</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-green-700">Rp {penjualanDigital.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-green-700 mt-1.5 opacity-60"></div>
                      <div>
                        <p className="text-xs font-black text-gray-800">Penjualan Aksesoris</p>
                        <p className="text-[11px] text-gray-400">Aksesoris & barang</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-green-700">Rp {props.totalAksesoris.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-green-700 mt-1.5 opacity-60"></div>
                      <div>
                        <p className="text-xs font-black text-gray-800">Total Admin Fee</p>
                        <p className="text-[11px] text-gray-400">Total fee/komisi transaksi</p>
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
                    <h4 className="text-[13px] font-black text-red-700 uppercase leading-none">KAS KELUAR</h4>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5 opacity-80">Uang/cash keluar dari laci kasir</p>
                  </div>
                </div>

                <div className="space-y-3 pl-1.5">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-red-600 mt-1.5 opacity-60"></div>
                      <div>
                        <p className="text-xs font-black text-gray-800">Tarik Tunai Nasabah</p>
                        <p className="text-[11px] text-gray-400">Penarikan uang nasabah</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-red-600">-Rp {props.totalTarik.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Total Saldo Laci Kasir Box - Updated Layout */}
              <div className="bg-[#051c5f] p-4 rounded-3xl text-white mt-1 shadow-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-blue-100">TOTAL SALDO LACI KASIR</span>
                  <h2 className="text-lg font-black text-green-400 tracking-tighter">
                    {formatRupiah(totalPendapatanBersih)}
                  </h2>
                </div>
                <p className="text-[7px] font-bold text-blue-200 uppercase tracking-widest opacity-60">
                  RUMUS : Saldo laci kasir (kas masuk - kas keluar)
                </p>
              </div>
            </div>
            
            <div className="px-2 pb-5 pt-1">
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

      <div className="px-1.5 mb-4 grid grid-cols-5 gap-2 text-center">
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
        <div className="px-1.5 mb-8">
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
              activeOwnerModal === 'laporan' ? "bg-indigo-600" :
              activeOwnerModal === 'grafik' ? "bg-emerald-600" :
              activeOwnerModal === 'performa' ? "bg-purple-600" :
              activeOwnerModal === 'absen' ? "bg-teal-600" :
              activeOwnerModal === 'izin' ? "bg-orange-600" :
              activeOwnerModal === 'gaji' ? "bg-green-600" :
              activeOwnerModal === 'backup' ? "bg-red-600" : "bg-purple-600"
            )}>
              <div>
                <h3 className="font-black text-lg tracking-tight uppercase leading-none">
                  {activeOwnerModal === 'monitor' ? 'KELOLA KASIR' : 
                   activeOwnerModal === 'laporan' ? 'RINGKASAN HARIAN' : 
                   activeOwnerModal === 'grafik' ? 'GRAFIK TRANSAKSI' :
                   activeOwnerModal === 'performa' ? 'PERFORMA KASIR' :
                   activeOwnerModal === 'absen' ? 'ABSENSI KASIR' :
                   activeOwnerModal === 'izin' ? 'CATATAN IZIN KASIR' :
                   activeOwnerModal === 'gaji' ? 'DATA GAJI' :
                   activeOwnerModal === 'backup' ? 'BACKUP DATA' : 'AUDIT LACI KAS'}
                </h3>
                <p className="text-[10px] text-white/80 mt-1.5 font-bold uppercase tracking-widest">
                  {activeOwnerModal === 'monitor' ? 'Tambah, edit, dan hapus kasir' : 
                   activeOwnerModal === 'laporan' ? 'Rekapitulasi seluruh cabang' : 
                   activeOwnerModal === 'audit' ? 'Verifikasi uang fisik vs sistem' :
                   activeOwnerModal === 'absen' ? 'Data kehadiran seluruh kasir' :
                   activeOwnerModal === 'gaji' ? 'Manajemen insentif & payroll' : 
                   activeOwnerModal === 'grafik' ? 'Analitik penjualan toko' :
                   activeOwnerModal === 'performa' ? 'Evaluasi kerja kasir' :
                   activeOwnerModal === 'backup' ? 'Keamanan data & reset sistem' : 'Pengingat untuk penggajian'}
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
                        const newKasirList = { ...props.kasirList, [kasirFormId]: { pin: kasirFormPin, role: 'kasir' as any, name: kasirFormName } };
                        saveKasirAccounts(newKasirList);
                        props.refreshKasirList();
                        setKasirFormId(''); setKasirFormName(''); setKasirFormPin('');
                      }} className="w-full bg-blue-600 text-white text-[10px] font-black py-2 rounded-lg uppercase">Simpan Kasir</button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, account]) => {
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
                                const n = {...props.kasirList}; delete n[id];
                                saveKasirAccounts(n); props.refreshKasirList();
                              }
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
                      {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, account]) => {
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
                                  <p className="text-[8px] text-gray-400 font-bold uppercase">{new Date(pantauTanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
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
                      {Object.entries(props.kasirList).map(([id, acc]) => (
                        <option key={id} value={id}>{acc.name}</option>
                      ))}
                    </select>
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
                      <h4 className="text-[13px] font-black text-green-700 uppercase tracking-widest">KAS MASUK</h4>
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
                      <h4 className="text-[13px] font-black text-red-600 uppercase tracking-widest">KAS KELUAR</h4>
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
                      <p className="text-[12px] font-black text-blue-100 uppercase tracking-widest">SALDO LACI KASIR</p>
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

              {activeOwnerModal === 'gaji' && (
                <GajiPanel kasirList={props.kasirList} absensiList={props.absensiList} />
              )}

              {activeOwnerModal === 'izin' && (
                <div className="space-y-4">
                  {/* Form Input Izin */}
                  <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <h4 className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-pen-to-square"></i> Catat Izin Baru
                    </h4>
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">NAMA KASIR</label>
                        <select 
                          value={izinNamaKasir} 
                          onChange={e => setIzinNamaKasir(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-orange-400"
                        >
                          <option value="" disabled>Pilih kasir</option>
                          {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                            <option key={id} value={acc.name}>{acc.name}</option>
                          ))}
                        </select>
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
                              {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
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

              {activeOwnerModal === 'grafik' && (() => {
                const now = new Date()
                now.setHours(0,0,0,0)
                
                // Helper to format Date or timestamp string to 'YYYY-MM-DD' in LOCAL timezone
                const formatLocalISO = (d: Date | string) => {
                  const dateObj = typeof d === 'string' ? new Date(d) : d;
                  const tzOffset = dateObj.getTimezoneOffset() * 60000;
                  return (new Date(dateObj.getTime() - tzOffset)).toISOString().split('T')[0];
                }

                // Filter transactions by selected Kasir and EXCLUDE non-sales (Isi Saldo, dsb)
                let filteredTxs = props.transactions.filter(t => !t.kategori.startsWith('Isi'))
                if (grafikFilterKasir !== 'Semua') {
                  filteredTxs = filteredTxs.filter(t => t.kasir_id === grafikFilterKasir)
                }

                // Function to group by date string prefix (comparing using Local ISO)
                const sumByPrefix = (prefix: string) => 
                  filteredTxs.filter(t => formatLocalISO(t.timestamp).startsWith(prefix)).reduce((s, t) => s + t.nominal, 0)

                let chartData: { label: string, value: number }[] = []
                
                if (grafikRange === 'harian') {
                  // Last 7 days
                  chartData = Array.from({length: 7}, (_, i) => {
                    const d = new Date(now)
                    d.setDate(d.getDate() - (6 - i))
                    const val = sumByPrefix(formatLocalISO(d))
                    return { label: d.toLocaleDateString('id-ID', { weekday: 'short' }), value: val }
                  })
                } else if (grafikRange === 'mingguan') {
                  // Last 4 weeks
                  chartData = Array.from({length: 4}, (_, i) => {
                    const d = new Date(now)
                    d.setDate(d.getDate() - (21 - i * 7)) // 3 weeks ago, 2 weeks, 1 week, this week
                    // To simplify, we'll just sum the 7 days of that week
                    let weekSum = 0
                    for(let j=0; j<7; j++) {
                      const wd = new Date(d)
                      wd.setDate(wd.getDate() + j)
                      weekSum += sumByPrefix(formatLocalISO(wd))
                    }
                    return { label: `M${i+1}`, value: weekSum }
                  })
                } else {
                  // Last 6 months
                  chartData = Array.from({length: 6}, (_, i) => {
                    const d = new Date(now)
                    d.setMonth(d.getMonth() - (5 - i))
                    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                    const val = sumByPrefix(yearMonth)
                    return { label: d.toLocaleDateString('id-ID', { month: 'short' }), value: val }
                  })
                }

                const maxVal = Math.max(...chartData.map(d => d.value), 1) // avoid div by 0

                const todayISO = formatLocalISO(now)
                const volHarian = sumByPrefix(todayISO)
                const volSemua = filteredTxs.reduce((s,t) => s + t.nominal, 0)

                return (
                  <div className="space-y-5">
                    {/* Controls */}
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <select
                        value={grafikFilterKasir}
                        onChange={(e) => setGrafikFilterKasir(e.target.value)}
                        className="bg-white border border-gray-200 text-emerald-800 text-[10px] font-black py-1.5 px-2 rounded-lg outline-none cursor-pointer flex-1 mr-2"
                      >
                        <option value="Semua">Semua Kasir</option>
                        {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                          <option key={id} value={id}>{acc.name}</option>
                        ))}
                      </select>

                      <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shrink-0">
                        {(['harian', 'mingguan', 'bulanan'] as const).map(range => (
                          <button 
                            key={range}
                            onClick={() => setGrafikRange(range)}
                            className={cn(
                              "text-[9px] font-black uppercase px-2 py-1.5 transition-colors",
                              grafikRange === range ? "bg-emerald-600 text-white" : "text-gray-500 hover:bg-gray-50"
                            )}
                          >
                            {range === 'harian' ? 'HARI' : range === 'mingguan' ? 'MINGGU' : 'BULAN'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[1.5rem] text-white shadow-lg shadow-emerald-200 text-center relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                        <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest relative z-10">Hari Ini</p>
                        <h2 className="text-[13px] font-black text-white mt-1 relative z-10">Rp {(volHarian/1000).toLocaleString('id-ID')}K</h2>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.5rem] text-white shadow-lg shadow-blue-200 text-center relative overflow-hidden">
                        <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                        <p className="text-[9px] font-black text-blue-100 uppercase tracking-widest relative z-10">Total ({grafikFilterKasir === 'Semua' ? 'All' : 'Kasir'})</p>
                        <h2 className="text-[13px] font-black text-white mt-1 relative z-10">Rp {(volSemua/1000).toLocaleString('id-ID')}K</h2>
                      </div>
                    </div>

                    {/* Chart Area */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 p-5 shadow-sm">
                      <div className="flex justify-between items-end mb-6">
                        <div>
                          <h4 className="text-[12px] font-black text-gray-800 uppercase tracking-tighter">Tren Penjualan</h4>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {grafikRange === 'harian' ? '7 Hari Terakhir' : grafikRange === 'mingguan' ? '4 Minggu Terakhir' : '6 Bulan Terakhir'}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                          <i className="fa-solid fa-chart-line text-sm"></i>
                        </div>
                      </div>

                      {/* Bar Chart Representation */}
                      <div className="h-40 flex items-end justify-between gap-1 pt-4 relative">
                        {/* Horizontal Grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                          <div className="w-full h-px bg-gray-100"></div>
                          <div className="w-full h-px bg-gray-100"></div>
                          <div className="w-full h-px bg-gray-100"></div>
                          <div className="w-full h-px bg-gray-200"></div>
                        </div>

                        {chartData.map((d, i) => {
                          const heightPct = Math.max((d.value / maxVal) * 100, 4); // min height 4% for visibility
                          return (
                            <div key={i} className="relative flex flex-col items-center flex-1 group h-full justify-end z-10 pb-6">
                              {/* Tooltip on hover/active */}
                              <div className="absolute -top-8 bg-gray-800 text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                Rp {(d.value/1000).toLocaleString('id-ID')}K
                              </div>
                              {/* Bar */}
                              <div 
                                className="w-full max-w-[28px] bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-[4px] transition-all duration-500 hover:from-emerald-400 hover:to-teal-300 shadow-sm"
                                style={{ height: `${heightPct}%` }}
                              ></div>
                              {/* Label */}
                              <span className="absolute bottom-0 text-[8px] font-black text-gray-500 uppercase tracking-tighter truncate w-full text-center">
                                {d.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}

                              {activeOwnerModal === 'performa' && (() => {
  const now = new Date();
  const startDay = new Date(now);
  startDay.setHours(0,0,0,0);
  const startWeek = new Date(startDay);
  startWeek.setDate(startDay.getDate() - 6); // last 7 days inclusive
  const startMonth = new Date(startDay);
  startMonth.setMonth(startDay.getMonth() - 1); // approx one month back

  const performa = Object.keys(props.kasirList)
    .filter(k => k !== 'owner')
    .map(kId => {
      const txs = props.transactions.filter(t => t.kasir_id === kId);
      const filter = (arr: Transaction[], from: Date) => arr.filter(t => {
        const d = new Date(t.timestamp);
        return d >= from && d <= now;
      });
      const dayTx = filter(txs, startDay);
      const weekTx = filter(txs, startWeek);
      const monthTx = filter(txs, startMonth);
      const sum = (arr: Transaction[]) => arr.reduce((s: number, t: Transaction) => s + t.nominal, 0);
      const sumAdmin = (arr: Transaction[]) => arr.reduce((s: number, t: Transaction) => s + t.adminFee, 0);
      return {
        id: kId,
        name: props.kasirList[kId]?.name || kId,
        day: { count: dayTx.length, vol: sum(dayTx), admin: sumAdmin(dayTx) },
        week: { count: weekTx.length, vol: sum(weekTx), admin: sumAdmin(weekTx) },
        month: { count: monthTx.length, vol: sum(monthTx), admin: sumAdmin(monthTx) },
        totalVol: sum(txs),
      };
    })
    .sort((a, b) => b.totalVol - a.totalVol);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black text-purple-800 uppercase tracking-widest mb-2">Performa Kasir</h3>
      {performa.map(p => (
        <div key={p.id} className="p-4 border border-purple-200 rounded-xl bg-purple-50/30 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-black text-white",
                p.id===performa[0].id ? "bg-amber-400 shadow-md" : "bg-purple-300"
              )}>
                {performa.indexOf(p)+1}
              </div>
              <div>
                <p className="text-sm font-black text-gray-800">{p.name}</p>
                <p className="text-[9px] text-purple-600 font-bold uppercase">{p.month.count} Transaksi (Bulan)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-purple-800">Rp {p.month.vol.toLocaleString('id-ID')}</p>
              <p className="text-[9px] text-gray-500">Admin: Rp {p.month.admin.toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[9px] text-gray-600">
            <div>
              <p className="font-bold">Hari Ini</p>
              <p>{p.day.count} trx</p>
              <p>Rp {p.day.vol.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="font-bold">Minggu Ini</p>
              <p>{p.week.count} trx</p>
              <p>Rp {p.week.vol.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="font-bold">Bulan Ini</p>
              <p>{p.month.count} trx</p>
              <p>Rp {p.month.vol.toLocaleString('id-ID')}</p>
            </div>
          </div>
          {/* Mini bar visualising month volume proportion */}
          <div className="w-full bg-purple-100 rounded h-2">
            <div className="bg-purple-600 h-full rounded" style={{ width: `${(p.month.vol/props.totalVolume*100).toFixed(1)}%` }} />
          </div>
        </div>
      ))}
      {performa.length===0 && <p className="text-center text-xs font-bold text-gray-400">Belum ada data</p>}
    </div>
  );
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
          />
        </div>
      )}

      {props.kasirRole === 'owner' && !activeOwnerModal && (
        <div className="px-1.5 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-center shadow-inner">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600 shadow-sm">
              <i className="fa-solid fa-chart-line text-2xl"></i>
            </div>
            <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Mode Pantau Aktif</h3>
            <p className="text-[10px] text-blue-400 font-bold mt-1">Anda masuk sebagai Owner. Fitur transaksi dinonaktifkan untuk keamanan data.</p>
          </div>
        </div>
      )}

      <div className="px-1.5 mb-3">
        <div className="bg-white border border-gray-300 rounded-xl p-2 shadow-sm mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <i className="fa-solid fa-bolt text-[9px]"></i>
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
          totalTransactions={props.transactions.filter(t => !t.kategori.startsWith('Isi')).length}
          totalVolume={props.totalVolume}
          totalAdmin={props.totalAdmin}
        />
      </div>
    </div>
  )
}

export default BerandaView
