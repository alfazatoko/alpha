import React, { useState, useEffect } from 'react'
import { cn, formatInputRupiah, formatRupiah, parseNominal } from '../lib/utils'
import type { PresetOtomatis } from '../types'

interface OtomatisViewProps {
  active: boolean
  setActiveView: (v: string) => void
  showToast: (m: string) => void
  presets: PresetOtomatis[]
  setPresets: (p: PresetOtomatis[]) => void
  storeName?: string
  storeSubtext?: string
  storePhoto?: string
  kasirName?: string
  kasirRole?: string
  setIsSidePanelOpen?: (v: boolean) => void
}

const OtomatisView: React.FC<OtomatisViewProps> = (props) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [formKeterangan, setFormKeterangan] = useState('')
  const [formModal, setFormModal] = useState('')
  const [formJual, setFormJual] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' })
  const fullDate = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const clockStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const handleSimpan = () => {
    if (!formKeterangan) return props.showToast('Keterangan tidak boleh kosong!')
    const modalNum = parseNominal(formModal)
    const jualNum = parseNominal(formJual)
    if (modalNum <= 0) return props.showToast('Harga Modal tidak valid!')
    if (jualNum <= 0) return props.showToast('Harga Jual tidak valid!')

    let newPresets = [...props.presets]
    if (editingId) {
      newPresets = newPresets.map(p => p.id === editingId ? {
        id: editingId,
        keterangan: formKeterangan,
        modal: modalNum,
        jual: jualNum
      } : p)
      props.showToast('Preset Berhasil Diupdate!')
    } else {
      newPresets.push({
        id: Date.now().toString(),
        keterangan: formKeterangan,
        modal: modalNum,
        jual: jualNum
      })
      props.showToast('Preset Baru Disimpan!')
    }
    props.setPresets(newPresets)
    resetForm()
  }

  const handleEdit = (p: PresetOtomatis) => {
    setEditingId(p.id)
    setFormKeterangan(p.keterangan)
    setFormModal(p.modal.toLocaleString('id-ID').replace(/,/g, '.'))
    setFormJual(p.jual.toLocaleString('id-ID').replace(/,/g, '.'))
  }

  const handleDelete = (id: string) => {
    if (confirm('Hapus preset ini?')) {
      props.setPresets(props.presets.filter(p => p.id !== id))
      props.showToast('Preset dihapus!')
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormKeterangan('')
    setFormModal('')
    setFormJual('')
  }

  return (
    <div className={cn("page-view hide-scrollbar bg-gray-50/50", props.active && "active")}>
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

          <button onClick={() => props.setIsSidePanelOpen?.(true)} className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-90 hover:bg-white/20 transition-all">
            <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
          </button>
        </div>
      </div>

      <div className="px-1.5 pt-6 pb-5 bg-gradient-to-r from-indigo-700 to-blue-600 text-white rounded-b-[2rem] shadow-lg shadow-blue-500/20 mb-6" style={{ marginTop: '-2.5rem', position: 'relative', zIndex: 10 }}>
        <div className="px-2 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-sm tracking-wide">Teks Otomatis</h2>
            <p className="text-blue-100 text-[10px] opacity-90">Setting keterangan otomatis</p>
          </div>
          <button onClick={() => props.setActiveView('view-akun')} className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95">
            <i className="fa-solid fa-arrow-left text-xs"></i>
          </button>
        </div>
      </div>

      <div className="px-1.5 pb-8 space-y-5">
        <div className="p-4 shadow-sm border border-gray-200 rounded-xl bg-white space-y-3">
          <h3 className="font-black text-black text-[11px] mb-3 flex items-center gap-2 uppercase tracking-tighter">
            <i className="fa-solid fa-bolt text-purple-600"></i> {editingId ? 'EDIT PRESET' : 'TAMBAH PRESET BARU'}
          </h3>
          
          <div>
            <label className="block text-[9px] font-black text-gray-900 mb-0.5 uppercase tracking-widest ml-1">Keterangan / Nama Produk</label>
            <input 
              type="text" 
              placeholder="Contoh: Token Listrik" 
              value={formKeterangan}
              onChange={(e) => setFormKeterangan(e.target.value)}
              className="form-input-modern w-full text-[13px] font-black px-3 h-10"
            />
            <p className="text-[8px] font-bold text-gray-400 mt-1 ml-1 leading-tight">Saat Kasir mengetik ini di "Keterangan Opsional", pilihan otomatis akan muncul.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-black text-gray-900 mb-0.5 uppercase tracking-tighter ml-1">HARGA MODAL</label>
              <input 
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={formModal}
                onChange={(e) => setFormModal(formatInputRupiah(e.target.value))}
                className="form-input-modern w-full text-[13px] font-black h-10 px-3"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-900 mb-0.5 uppercase tracking-tighter ml-1">HARGA JUAL</label>
              <input 
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={formJual}
                onChange={(e) => setFormJual(formatInputRupiah(e.target.value))}
                className="form-input-modern w-full text-[13px] font-black h-10 px-3"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-2 pt-2">
            {editingId && (
              <button 
                onClick={resetForm}
                className="flex-1 bg-gray-100 text-gray-600 text-[10px] font-black py-3 rounded-lg hover:bg-gray-200 transition-all active:scale-95 uppercase tracking-widest"
              >
                BATAL
              </button>
            )}
            <button 
              onClick={handleSimpan} 
              className="flex-[2] bg-purple-600 text-white text-[10px] font-black py-3 rounded-lg hover:bg-purple-700 shadow-md transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-save"></i> SIMPAN PRESET
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-black text-gray-800 text-[11px] mb-2 flex items-center gap-2 uppercase tracking-tighter ml-1">
            <i className="fa-solid fa-list-ul text-blue-600"></i> DAFTAR PRESET OTOMATIS
          </h3>
          
          {props.presets.length === 0 ? (
            <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">
              <i className="fa-solid fa-box-open text-2xl text-gray-300 mb-2 block"></i>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Belum ada preset.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {props.presets.map(p => (
                <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex-1 overflow-hidden pr-2">
                    <h4 className="text-[12px] font-black text-gray-800 truncate mb-1">{p.keterangan}</h4>
                    <div className="flex items-center gap-2 text-[9px] font-bold tracking-widest uppercase">
                      <span className="text-blue-600">MODAL: {formatRupiah(p.modal).replace(',00', '')}</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-emerald-600">JUAL: {formatRupiah(p.jual).replace(',00', '')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(p)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all active:scale-95">
                      <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-all active:scale-95">
                      <i className="fa-solid fa-trash text-[10px]"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OtomatisView
