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
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  kategori, setKategori, nominal, setNominal, admin, setAdmin, keterangan, setKeterangan, onSave, isSaving
}) => {
  const [activeTab, setActiveTab] = useState<'BARU' | 'LAIN'>('BARU')
  const [subTab, setSubTab] = useState<'KHUSUS' | 'NON_TUNAI'>('KHUSUS')
  const [isAdminNonTunai, setIsAdminNonTunai] = useState(false)
  const nominalRef = useRef<HTMLInputElement>(null)
  const adminRef = useRef<HTMLInputElement>(null)
  const keteranganRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>, isSubmit = false) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isSubmit) {
        onSave({ activeTab, subTab, isAdminNonTunai })
      } else if (nextRef && nextRef.current) {
        nextRef.current.focus()
      }
    }
  }

  return (
    <div className="form-transaksi-container p-4 shadow-sm border border-gray-200 rounded-xl">
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-full mb-4 border border-gray-200">
        <button 
          onClick={() => { setActiveTab('BARU'); setKategori(''); }}
          className={cn(
            "flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2",
            activeTab === 'BARU' 
              ? "bg-blue-700 text-white shadow-lg transform scale-[1.02]" 
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          <i className="fa-solid fa-cart-shopping"></i> Transaksi Baru
        </button>
        <button 
          onClick={() => { setActiveTab('LAIN'); setKategori(''); }}
          className={cn(
            "flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2",
            activeTab === 'LAIN' 
              ? "bg-blue-700 text-white shadow-lg transform scale-[1.02]" 
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          <i className="fa-solid fa-plus-circle"></i> Transaksi Lain
        </button>
      </div>

      {activeTab === 'LAIN' && (
        <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-end mb-2 px-1">
            <div>
              <label className="block text-[11px] font-black text-black uppercase tracking-widest">OPSI TRANSAKSI LAIN</label>
              <p className="text-[9px] font-bold text-gray-400 uppercase">Pilih Jenis transaksi tambahan</p>
            </div>
          </div>
          <div className="flex gap-2 bg-blue-50 p-1.5 rounded-full border border-blue-100">
            <button 
              onClick={() => { setSubTab('KHUSUS'); setKategori(''); }}
              className={cn(
                "flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-full transition-all",
                subTab === 'KHUSUS' ? "bg-emerald-600 text-white shadow-md" : "text-gray-400"
              )}
            >
              Transaksi Khusus
            </button>
            <button 
              onClick={() => { setSubTab('NON_TUNAI'); setKategori(''); }}
              className={cn(
                "flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-full transition-all",
                subTab === 'NON_TUNAI' ? "bg-emerald-600 text-white shadow-md" : "text-gray-400"
              )}
            >
              Transaksi Non Tunai
            </button>
          </div>
        </div>
      )}

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
            <label className="block text-[11px] font-black text-black mb-1 uppercase tracking-widest">
              NOMINAL
            </label>
            <input 
              ref={nominalRef}
              type="text" 
              inputMode="numeric" 
              placeholder="0" 
              value={nominal}
              onChange={(e) => setNominal(formatInputRupiah(e.target.value))}
              onKeyDown={(e) => handleKeyDown(e, adminRef)}
              className="form-input-modern w-full text-[14px] transition-all"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className={cn(
                "block text-[11px] font-black uppercase tracking-widest transition-colors",
                isAdminNonTunai ? "text-purple-600" : "text-black"
              )}>
                ADMIN FEE
              </label>
              <div 
                className="flex items-center gap-1.5 cursor-pointer bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                onClick={() => setIsAdminNonTunai(!isAdminNonTunai)}
              >
                <input 
                  type="checkbox" 
                  checked={isAdminNonTunai}
                  onChange={(e) => setIsAdminNonTunai(e.target.checked)}
                  className="w-2.5 h-2.5 accent-purple-600 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Dalam/Non</span>
              </div>
            </div>
            <input 
              ref={adminRef}
              type="text" 
              inputMode="numeric" 
              placeholder="0" 
              value={admin}
              onChange={(e) => setAdmin(formatInputRupiah(e.target.value))}
              onKeyDown={(e) => handleKeyDown(e, keteranganRef)}
              className={cn(
                "form-input-modern w-full text-[14px] transition-all",
                isAdminNonTunai ? "bg-purple-50 text-purple-700 border-purple-200 focus:border-purple-500 focus:ring-purple-200" : ""
              )}
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
          onClick={() => onSave({ activeTab, subTab, isAdminNonTunai })} 
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
