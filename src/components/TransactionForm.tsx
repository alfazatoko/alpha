import React, { useRef } from 'react'
import { formatInputRupiah } from '../lib/utils'

interface TransactionFormProps {
  kategori: string
  setKategori: (v: string) => void
  nominal: string
  setNominal: (v: string) => void
  admin: string
  setAdmin: (v: string) => void
  keterangan: string
  setKeterangan: (v: string) => void
  onSave: () => void
  isSaving?: boolean
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  kategori, setKategori, nominal, setNominal, admin, setAdmin, keterangan, setKeterangan, onSave, isSaving
}) => {
  const nominalRef = useRef<HTMLInputElement>(null)
  const adminRef = useRef<HTMLInputElement>(null)
  const keteranganRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>, isSubmit = false) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isSubmit) {
        onSave()
      } else if (nextRef && nextRef.current) {
        nextRef.current.focus()
      }
    }
  }

  return (
    <div className="form-transaksi-container p-4 shadow-sm border border-gray-200 rounded-xl">
      <h3 className="font-black text-black text-[13px] mb-3 flex items-center gap-2 uppercase tracking-tighter">
        <i className="fa-solid fa-cart-shopping text-blue-700"></i> TRANSAKSI BARU
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-black text-black mb-1 uppercase tracking-widest">KATEGORI</label>
          <select 
            value={kategori} 
            onChange={(e) => {
              setKategori(e.target.value)
              nominalRef.current?.focus()
            }}
            className="form-input-modern w-full text-[14px] font-black text-black"
          >
            <option value="" disabled className="text-black">Pilih kategori</option>
            <option value="Transfer Bank" className="text-black">Transfer Bank</option>
            <option value="DANA" className="text-black">DANA</option>
            <option value="FLIP" className="text-black">FLIP</option>
            <option value="Order Kuota" className="text-black">Order Kuota</option>
            <option value="Tarik Tunai" className="text-black">Tarik Tunai</option>
            <option value="Aksesoris" className="text-black">Aksesoris</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-black text-black mb-1 uppercase tracking-widest">NOMINAL</label>
            <input 
              ref={nominalRef}
              type="text" 
              inputMode="numeric" 
              placeholder="0" 
              value={nominal}
              onChange={(e) => setNominal(formatInputRupiah(e.target.value))}
              onKeyDown={(e) => handleKeyDown(e, adminRef)}
              className="form-input-modern w-full text-[14px]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-black mb-1 uppercase tracking-widest">ADMIN FEE</label>
            <input 
              ref={adminRef}
              type="text" 
              inputMode="numeric" 
              placeholder="0" 
              value={admin}
              onChange={(e) => setAdmin(formatInputRupiah(e.target.value))}
              onKeyDown={(e) => handleKeyDown(e, keteranganRef)}
              className="form-input-modern w-full text-[14px]"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-black text-black mb-1 uppercase tracking-widest">KETERANGAN</label>
          <textarea 
            ref={keteranganRef}
            rows={1} 
            placeholder="Keterangan..." 
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, undefined, true)}
            className="form-input-modern w-full resize-none text-[14px] font-black text-black"
          ></textarea>
        </div>
        <button 
          onClick={onSave} 
          disabled={isSaving}
          className="w-full bg-blue-700 text-white text-[13px] font-black py-3 rounded-lg hover:bg-blue-800 shadow-md transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
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
