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
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  kategori, setKategori, nominal, setNominal, admin, setAdmin, keterangan, setKeterangan, onSave
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
    <div className="form-transaksi-container p-4 shadow-sm border border-gray-200 rounded-xl bg-white">
      <h3 className="font-black text-black text-[11px] mb-3 flex items-center gap-2 uppercase tracking-tighter">
        <i className="fa-solid fa-cart-shopping text-blue-700"></i> TRANSAKSI BARU
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">KATEGORI</label>
          <select 
            value={kategori} 
            onChange={(e) => {
              setKategori(e.target.value)
              nominalRef.current?.focus()
            }}
            className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-xs font-bold text-black focus:border-blue-600 outline-none transition-all"
          >
            <option value="" disabled>Pilih kategori</option>
            <option value="Transfer Bank">Transfer Bank</option>
            <option value="DANA">DANA</option>
            <option value="FLIP">FLIP</option>
            <option value="Order Kuota">Order Kuota</option>
            <option value="Tarik Tunai">Tarik Tunai</option>
            <option value="Aksesoris">Aksesoris</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">NOMINAL (RP)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-black text-[10px] font-black">Rp</span>
              <input 
                ref={nominalRef}
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={nominal}
                onChange={(e) => setNominal(formatInputRupiah(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, adminRef)}
                className="nominal-input w-full bg-white border border-gray-300 rounded-lg py-2 pl-8 pr-3 text-xs font-black text-black focus:border-blue-600 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">ADMIN FEE</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-black text-[10px] font-black">Rp</span>
              <input 
                ref={adminRef}
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={admin}
                onChange={(e) => setAdmin(formatInputRupiah(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, keteranganRef)}
                className="nominal-input w-full bg-white border border-gray-300 rounded-lg py-2 pl-8 pr-3 text-xs font-black text-black focus:border-blue-600 outline-none transition-all"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-[9px] font-black text-black mb-1 uppercase tracking-widest">KETERANGAN</label>
          <textarea 
            ref={keteranganRef}
            rows={1} 
            placeholder="Keterangan..." 
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, undefined, true)}
            className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-xs font-bold text-black resize-none focus:border-blue-600 outline-none transition-all"
          ></textarea>
        </div>
        <button onClick={onSave} className="w-full bg-blue-700 text-white text-[10px] font-black py-2.5 rounded-lg hover:bg-blue-800 shadow-md transition-all active:scale-95 uppercase tracking-widest">
          SIMPAN TRANSAKSI
        </button>
      </div>
    </div>
  )
}

export default TransactionForm
