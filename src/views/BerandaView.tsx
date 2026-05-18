import React, { useState, useEffect } from 'react'
import { formatRupiah, formatInputRupiah, cn, getLocalISOString, getLocalDateString, parseLocalISO } from '../lib/utils'
import { supabase } from '../lib/supabase'
import TransactionForm from '../components/TransactionForm'
import SummaryCards from '../components/SummaryCards'
import type { Transaction } from '../types'
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
  refreshKasirList: () => void
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
}> = ({ kasirList, absensiList, storeName, showToast }) => {
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
  onConfirm: (t: string, m: string, c: () => void) => void
}> = ({ transactions, absensiList, storeName, showToast, onConfirm }) => {
  const [resetStep, setResetStep] = useState(0); // 0: init, 1: confirm, 2: processing

  const handleBackup = async () => {
    try {
      const backupData = {
        store: storeName || "ALFAZA CELL",
        timestamp: getLocalISOString(),
        data: {
          transactions,
          absensi: absensiList || [],
          catatanIzin: JSON.parse(localStorage.getItem('alphaPro_catatanIzin') || '[]')
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
        const { error: txError } = await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
        // 2. Reset Attendance
        const { error: absError } = await supabase.from('absensi').delete().neq('id', 0);
        // 3. Reset Local Data
        localStorage.removeItem('alphaPro_catatanIzin');
        
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

const BerandaView: React.FC<BerandaViewProps> = (props) => {
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
  const [catatanIzin, setCatatanIzin] = useState<any[]>([])
  const STORAGE_KEY_IZIN = 'alphaPro_catatanIzin'

  // Pantau State
  const [pantauTanggal, setPantauTanggal] = useState(getLocalDateString())

  // Absensi Modal State
  const [absenTab, setAbsenTab] = useState<'summary' | 'full'>('summary')

  // Grafik State
  const [grafikFilterKasir, setGrafikFilterKasir] = useState('Semua')
  const [grafikRange, setGrafikRange] = useState<'harian'|'mingguan'|'bulanan'>('harian')

  const [ownerSaldoKasirId, setOwnerSaldoKasirId] = useState('')
  const [ownerSaldoNominal, setOwnerSaldoNominal] = useState('')
  const [ownerSaldoKategori, setOwnerSaldoKategori] = useState('Isi Saldo Bank')

  // Audit State
  const [auditFisik, setAuditFisik] = useState('')
  const [auditHistory, setAuditHistory] = useState<any[]>([])
  const STORAGE_KEY_AUDIT = 'alphaPro_auditHistory'

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AUDIT)
    if (saved) setAuditHistory(JSON.parse(saved))
  }, [])

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

  const activeOwnerSubView = props.activeView?.startsWith('view-owner-') ? props.activeView.replace('view-owner-', '') : null
  const isOwnerSubView = !!activeOwnerSubView

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
      } catch (e) {
        console.error('Failed to load izin', e)
      }
    }
  }, [activeOwnerSubView])

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
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-white text-[10px] font-black">{props.kasirName}</span>
                  <span className={cn("text-[7px] px-1.5 py-0.5 rounded-full font-black", props.kasirRole === 'owner' ? "bg-amber-400 text-amber-900" : "bg-white/25 text-white")}>
                    {props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'}
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
        {props.kasirRole === 'owner' && props.kasirList && (
          <div className="mb-3 bg-blue-50/50 px-3 py-2 rounded-xl border border-blue-100/50 flex items-center justify-between">
            <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-1.5">
              <i className="fa-solid fa-user-tie text-blue-600"></i> Mode Pantau Kasir
            </span>
            <div className="relative">
               <select 
                 value={props.filterKasir || 'Semua'}
                 onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                 className="bg-transparent text-blue-700 text-[10px] font-black outline-none border-none cursor-pointer text-right appearance-none pr-6"
               >
                 <option value="Semua">Semua Kasir</option>
                 {Object.entries(props.kasirList).map(([id, acc]) => (
                   <option key={id} value={id}>{acc.name}</option>
                 ))}
               </select>
               <i className="fa-solid fa-chevron-down absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-blue-500 pointer-events-none"></i>
            </div>
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

      {props.kasirRole === 'owner' && (
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

      {isOwnerSubView && (
        <div className="absolute inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-right duration-300">
          <div className={cn(
            "p-4 text-white flex justify-between items-center shadow-lg",
            activeOwnerSubView === 'monitor' ? "bg-blue-600" : 
            activeOwnerSubView === 'laporan' ? "bg-indigo-600" :
            activeOwnerSubView === 'grafik' ? "bg-emerald-500" :
            activeOwnerSubView === 'performa' ? "bg-purple-600" :
            activeOwnerSubView === 'absen' ? "bg-teal-500" :
            activeOwnerSubView === 'izin' ? "bg-orange-500" :
            activeOwnerSubView === 'gaji' ? "bg-green-600" :
            activeOwnerSubView === 'saldo' ? "bg-emerald-600" :
            "bg-red-600"
          )}>
            <button 
              onClick={() => props.setActiveView('view-beranda')}
              className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all border border-white/20 active:scale-90"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>

            <div className="text-center">
              <h3 className="font-black text-sm tracking-widest uppercase leading-none">
                {activeOwnerSubView === 'monitor' ? 'KELOLA KASIR' : 
                 activeOwnerSubView === 'laporan' ? 'RINGKASAN HARIAN' : 
                 activeOwnerSubView === 'grafik' ? 'GRAFIK TRANSAKSI' :
                 activeOwnerSubView === 'performa' ? 'PERFORMA KASIR' :
                 activeOwnerSubView === 'absen' ? 'ABSENSI KASIR' :
                 activeOwnerSubView === 'izin' ? 'IZIN KARYAWAN' :
                 activeOwnerSubView === 'gaji' ? 'DATA GAJI KASIR' :
                 activeOwnerSubView === 'saldo' ? 'PENGATURAN SALDO' :
                 activeOwnerSubView === 'audit' ? 'AUDIT KASIR' :
                 'BACKUP & RESET'}
              </h3>
              <p className="text-[9px] text-white/70 mt-1 font-bold uppercase tracking-widest">Panel Kontrol Owner</p>
            </div>

            <button 
              onClick={() => props.setActiveView('view-beranda')}
              className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all border border-white/20 active:scale-90"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Sub-View Content */}
          <div className="flex-1 overflow-y-auto hide-scrollbar p-5 pb-24">
            {activeOwnerSubView === 'monitor' && (
                <div className="space-y-4">
                  {/* Add Kasir Form */}
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3">Tambah / Edit Kasir</h4>
                    <div className="space-y-2">
                      <input type="text" placeholder="ID Kasir (contoh: kasir3)" value={kasirFormId} onChange={e => setKasirFormId(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                      <input type="text" placeholder="Nama Kasir" value={kasirFormName} onChange={e => setKasirFormName(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                      <input type="text" placeholder="PIN (4-6 digit)" value={kasirFormPin} onChange={e => setKasirFormPin(e.target.value)} className="w-full text-xs p-2 rounded-lg border outline-none font-bold" />
                      <button onClick={() => {
                        if(!kasirFormId || !kasirFormName || !kasirFormPin) return props.showToast('Lengkapi data kasir');
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
                              props.onConfirm('HAPUS KASIR', `Hapus ${account.name}?`, () => {
                                const n = {...props.kasirList}; delete n[id];
                                saveKasirAccounts(n); props.refreshKasirList();
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
                          <select 
                            value={izinNamaKasir} 
                            onChange={e => setIzinNamaKasir(e.target.value)}
                            className="w-full text-xs p-2.5 pr-8 rounded-lg border border-gray-200 outline-none font-bold bg-white focus:border-orange-400 appearance-none cursor-pointer"
                          >
                            <option value="" disabled>Pilih kasir</option>
                            {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                              <option key={id} value={acc.name}>{acc.name}</option>
                            ))}
                          </select>
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
                      <div className="relative flex-1 mr-2">
                        <select
                          value={grafikFilterKasir}
                          onChange={(e) => setGrafikFilterKasir(e.target.value)}
                          className="w-full bg-white border border-gray-200 text-emerald-800 text-[10px] font-black py-1.5 pl-2 pr-7 rounded-lg outline-none cursor-pointer appearance-none"
                        >
                          <option value="Semua">Semua Kasir</option>
                          {Object.entries(props.kasirList).filter(([id]) => id !== 'owner').map(([id, acc]) => (
                            <option key={id} value={id}>{acc.name}</option>
                          ))}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-emerald-400 pointer-events-none"></i>
                      </div>

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
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-[14px] font-black text-gray-900 uppercase tracking-tighter">Performa Transaksi</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {grafikRange === 'harian' ? '7 Hari Terakhir' : grafikRange === 'mingguan' ? '4 Minggu Terakhir' : '6 Bulan Terakhir'}
                        </p>
                      </div>
                      <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">Statistik</div>
                    </div>

                    <div className="bg-white rounded-[2rem] p-5 shadow-xl shadow-blue-500/5 border border-blue-50 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                      <div className="h-40 flex items-end justify-between gap-1 pt-4 relative z-10">
                        {chartData.map((d, i) => {
                          const heightPct = Math.max((d.value / maxVal) * 100, 4);
                          return (
                            <div key={i} className="relative flex flex-col items-center flex-1 group h-full justify-end pb-6">
                              <div className="absolute -top-8 bg-gray-800 text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                Rp {(d.value/1000).toLocaleString('id-ID')}K
                              </div>
                              <div 
                                className="w-full max-w-[28px] bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-[4px] transition-all duration-500 hover:from-emerald-400 hover:to-teal-300 shadow-sm"
                                style={{ height: `${heightPct}%` }}
                              ></div>
                              <span className="absolute bottom-0 text-[8px] font-black text-gray-500 uppercase tracking-tighter truncate w-full text-center">
                                {d.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {activeOwnerSubView === 'performa' && (
                <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-[2.5rem] border border-purple-100 animate-in fade-in zoom-in duration-500 shadow-xl shadow-purple-500/5">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-[14px] font-black text-purple-950 uppercase tracking-tighter">Ranking Kasir</h4>
                        <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">Bulan Ini</p>
                      </div>
                      <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
                        <i className="fa-solid fa-trophy"></i>
                      </div>
                    </div>
                    {(() => {
                      const sum = (txs: any[]) => txs.reduce((s, t) => s + t.nominal, 0)
                      const now = new Date()
                      const monthAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toLocaleDateString('en-CA')

                      const performaData = Object.keys(props.kasirList)
                        .filter(id => id !== 'owner')
                        .map(kId => {
                          const txs = props.transactions.filter(t => t.kasir_id === kId)
                          const monthTx = txs.filter(t => t.timestamp.startsWith(monthAgo.slice(0, 7)) || t.timestamp >= monthAgo)
                          return {
                            id: kId,
                            name: props.kasirList[kId]?.name || kId,
                            monthCount: monthTx.length,
                            monthVol: sum(monthTx)
                          }
                        }).sort((a, b) => b.monthVol - a.monthVol)

                      if (performaData.length === 0) return <p className="text-center text-xs font-bold text-gray-400 py-6 italic">Belum ada data transaksi bulan ini</p>

                      return performaData.map((p, idx) => (
                        <div key={p.id} className="p-4 bg-white rounded-2xl border border-purple-100 shadow-sm flex justify-between items-center group hover:border-purple-300 transition-all active:scale-[0.98]">
                          <div className="flex items-center gap-4">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-md", idx === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-purple-200")}>
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-800 leading-none mb-1">{p.name}</p>
                              <p className="text-[10px] text-purple-500 font-bold uppercase tracking-tight">{p.monthCount} Transaksi</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-purple-700">{p.monthVol.toLocaleString('id-ID')}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Volume 30H</p>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
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
                            <option value="Isi Saldo Real Aplikasi">📱 Saldo Real Aplikasi (HP)</option>
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
                  <div className="relative">
                    <select 
                      value={props.filterKasir || 'Semua'}
                      onChange={(e) => props.setFilterKasir && props.setFilterKasir(e.target.value)}
                      className="appearance-none bg-white/10 backdrop-blur-md border border-white/20 text-white text-[9px] font-black py-2 pl-3 pr-8 rounded-xl outline-none cursor-pointer hover:bg-white/20 transition-all uppercase tracking-widest"
                    >
                      <option value="Semua" className="text-gray-900">Semua</option>
                      {Object.entries(props.kasirList).map(([id, acc]) => (
                        <option key={id} value={id} className="text-gray-900">{acc.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50 text-[8px]">
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
