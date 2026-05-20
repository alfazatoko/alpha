import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Store } from '../types'

interface SelectorScreenProps {
  googleUid: string
  googleEmail?: string
  onSelectRole: (role: 'owner' | 'kasir', storeId: string | 'all', store?: Store) => void
  onLogoutGoogle: () => void
}

export const SelectorScreen: React.FC<SelectorScreenProps> = ({
  googleUid,
  googleEmail,
  onSelectRole,
  onLogoutGoogle,
}) => {
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingStore, setIsAddingStore] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')
  const [newStoreSubtext, setNewStoreSubtext] = useState('Pembukuan Agen brilink & Konter')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Owner PIN Gate state
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [showEditOwner, setShowEditOwner] = useState(false)
  const [editOwnerName, setEditOwnerName] = useState('')
  const [editOwnerPin, setEditOwnerPin] = useState('')
  const [showPin, setShowPin] = useState(false)

  // Load owner settings from localStorage
  const getOwnerPin = () => localStorage.getItem(`alphaPro_${googleUid}_ownerPin`) || '0000'
  const getOwnerName = () => localStorage.getItem(`alphaPro_${googleUid}_ownerName`) || 'Owner'

  // Fetch stores from Supabase
  const fetchStores = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', googleUid)
        .order('created_at', { ascending: true })

      if (error) throw error
      setStores(data || [])
    } catch (err: any) {
      console.error('Error fetching stores:', err)
      setError('Gagal mengambil daftar toko: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (googleUid) {
      fetchStores()
    }
  }, [googleUid])

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStoreName.trim()) {
      setError('Nama toko tidak boleh kosong')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')

      // 1. Insert store
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert({
          user_id: googleUid,
          name: newStoreName.trim(),
          subtext: newStoreSubtext.trim(),
        })
        .select()
        .single()

      if (storeError) throw storeError

      // 2. Insert default store settings
      // Default cashiers
      const defaultCashiers = {
        'owner': { pin: '0000', role: 'owner', name: 'Owner' },
        'kasir1': { pin: '1234', role: 'kasir', name: 'Kasir 1' },
        'kasir2': { pin: '5678', role: 'kasir', name: 'Kasir 2' },
      }

      const { error: settingsError } = await supabase
        .from('store_settings')
        .insert({
          store_id: storeData.id,
          cashiers: defaultCashiers,
          presets: [],
          running_texts: Array(15).fill(''),
          main_announcement: `Selamat Datang di ${storeData.name}`,
          is_pin_enabled: true,
        })

      if (settingsError) {
        console.error('Error creating store settings, continuing anyway:', settingsError)
      }

      setNewStoreName('')
      setNewStoreSubtext('Pembukuan Agen brilink & Konter')
      setIsAddingStore(false)
      await fetchStores()
    } catch (err: any) {
      console.error('Error creating store:', err)
      setError('Gagal membuat toko: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOwnerClick = () => {
    setPinInput('')
    setPinError('')
    setShowEditOwner(false)
    setShowPin(false)
    setShowPinModal(true)
  }

  const handlePinSubmit = () => {
    const correctPin = getOwnerPin()
    if (pinInput === correctPin) {
      setShowPinModal(false)
      setPinInput('')
      onSelectRole('owner', 'all')
    } else {
      setPinError('PIN salah! Coba lagi.')
      setPinInput('')
    }
  }

  const handleSaveOwnerSettings = () => {
    if (editOwnerPin.length < 4) {
      setPinError('PIN minimal 4 digit!')
      return
    }
    localStorage.setItem(`alphaPro_${googleUid}_ownerPin`, editOwnerPin)
    localStorage.setItem(`alphaPro_${googleUid}_ownerName`, editOwnerName.trim() || 'Owner')
    setPinError('')
    setShowEditOwner(false)
  }

  const handleOpenEditOwner = () => {
    setEditOwnerName(getOwnerName())
    setEditOwnerPin(getOwnerPin())
    setPinError('')
    setShowEditOwner(true)
  }

  return (
    <div className="login-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-slate-100 to-gray-200 min-h-screen w-screen overflow-y-auto">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-2xl relative z-10 flex flex-col my-8">
        
        {/* Top Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/logo_icon.png" alt="ALPHA Logo" className="w-10 h-10 object-contain drop-shadow-xl" />
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-none tracking-tight">
                ALPHA <span className="text-blue-600">Cloud</span>
              </h1>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Multi-Store Switcher</p>
            </div>
          </div>
          <button 
            onClick={onLogoutGoogle}
            className="bg-gray-100 hover:bg-red-50 border border-gray-200 hover:border-red-200 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-600 transition-all active:scale-95 shadow-sm"
          >
            Logout Google
          </button>
        </div>

        {/* User Info Card */}
        <div className="bg-blue-50 border border-blue-100/50 p-4 rounded-2xl mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center border border-blue-200">
              <i className="fa-solid fa-user-shield text-lg"></i>
            </div>
            <div>
              <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest">Signed In As Owner</p>
              <p className="text-xs font-bold text-gray-800">{googleEmail}</p>
            </div>
          </div>
          <span className="text-[8px] bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 px-2 py-1 rounded-full font-black uppercase tracking-wider">
            Connected
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wide flex items-center gap-2 mb-6 animate-shake">
            <i className="fa-solid fa-triangle-exclamation text-sm"></i>
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <i className="fa-solid fa-circle-notch fa-spin text-blue-500 text-3xl"></i>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Loading database stores...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Section 1: Owner Panel Access */}
            <div>
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Central Dashboard</h3>
              <button 
                onClick={handleOwnerClick}
                className="w-full relative group overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 p-6 rounded-3xl border border-blue-400/20 text-left transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 flex justify-between items-center"
              >
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-inner">
                    <i className="fa-solid fa-shield-halved text-2xl"></i>
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white uppercase tracking-wider mb-1 flex items-center gap-2" style={{ color: '#ffffff' }}>
                      👑 PANEL OWNER UTAMA
                    </h4>
                    <p className="text-[9px] text-blue-100 font-bold uppercase tracking-tight leading-relaxed">
                      Pantau semua toko, lihat laporan gabungan, kelola kasir, dan audit.
                    </p>
                    <p className="text-[8px] text-blue-200/70 font-bold uppercase tracking-tighter mt-1 flex items-center gap-1">
                      <i className="fa-solid fa-lock text-[7px]"></i> Dilindungi PIN
                    </p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-white/50 text-xs transition-transform group-hover:translate-x-1"></i>
              </button>
            </div>

            {/* Section 2: Store Access */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Pilih Toko ({stores.length})
                </h3>
                {!isAddingStore && (
                  <button 
                    onClick={() => setIsAddingStore(true)}
                    className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-plus-circle"></i> Tambah Toko
                  </button>
                )}
              </div>

              {isAddingStore && (
                <form onSubmit={handleAddStore} className="bg-gray-50 border border-gray-200 p-5 rounded-3xl mb-6 space-y-4 animate-in slide-in-from-top duration-300 shadow-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-2">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Toko Baru</h4>
                    <button 
                      type="button" 
                      onClick={() => { setIsAddingStore(false); setError(''); }}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Nama Toko</label>
                      <input 
                        type="text"
                        placeholder="Contoh: ALFAZA CELL 2"
                        value={newStoreName}
                        onChange={e => setNewStoreName(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-black outline-none focus:border-blue-500 font-bold placeholder-gray-400"
                        style={{ color: '#000000', backgroundColor: '#ffffff', WebkitTextFillColor: '#000000' }}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Deskripsi / Subtext</label>
                      <input 
                        type="text"
                        placeholder="Contoh: Agen brilink & Konter"
                        value={newStoreSubtext}
                        onChange={e => setNewStoreSubtext(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-black outline-none focus:border-blue-500 font-bold placeholder-gray-400"
                        style={{ color: '#000000', backgroundColor: '#ffffff', WebkitTextFillColor: '#000000' }}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                    style={{ color: '#ffffff' }}
                  >
                    {isSubmitting ? (
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-check"></i>
                    )}
                    {isSubmitting ? 'Memproses...' : 'Buat Toko & Settings'}
                  </button>
                </form>
              )}

              {stores.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                    <i className="fa-solid fa-store-slash text-xl"></i>
                  </div>
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                    Belum ada toko terdaftar. <br />Silakan tambahkan toko pertama Anda untuk memulai transaksi!
                  </p>
                  {!isAddingStore && (
                    <button 
                      onClick={() => setIsAddingStore(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-2.5 rounded-xl text-[9px] uppercase tracking-widest shadow-md transition-all active:scale-95"
                      style={{ color: '#ffffff' }}
                    >
                      Buat Toko Pertama
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stores.map(store => (
                    <button
                      key={store.id}
                      onClick={() => onSelectRole('kasir', store.id, store)}
                      className="group bg-gray-50 hover:bg-blue-50/50 border border-gray-200 hover:border-blue-200 p-5 rounded-3xl text-left transition-all duration-300 transform hover:-translate-y-0.5 flex justify-between items-center shadow-sm"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100">
                          <i className="fa-solid fa-shop text-lg"></i>
                        </div>
                        <div>
                          <h4 className="font-black text-xs uppercase tracking-wider leading-none mb-1.5 group-hover:text-blue-600 transition-colors" style={{ color: '#1e293b' }}>
                            {store.name}
                          </h4>
                          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter line-clamp-1">
                            {store.subtext || 'Pembukuan Toko'}
                          </p>
                        </div>
                      </div>
                      <i className="fa-solid fa-arrow-right text-gray-400 text-xs transition-transform group-hover:translate-x-1"></i>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] mt-12 pt-6 border-t border-gray-100">
          ALPHA Pro • Cloud Sync Multi-Tenant
        </p>
      </div>

      {/* ===== PIN MODAL OVERLAY ===== */}
      {showPinModal && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-[320px] shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300 border border-gray-100">
            
            {!showEditOwner ? (
              /* --- PIN Entry Mode --- */
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                  <i className="fa-solid fa-lock text-white text-xl"></i>
                </div>
                <h3 className="font-black text-[12px] uppercase tracking-widest text-gray-900 mb-1">Masuk Panel Owner</h3>
                <p className="text-[9px] font-bold text-gray-400 mb-5 uppercase tracking-tight">
                  Halo, {getOwnerName()}! Masukkan PIN Anda.
                </p>
                
                <div className="w-full mb-4">
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={8}
                      value={pinInput}
                      onChange={e => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') handlePinSubmit() }}
                      placeholder="••••"
                      autoFocus
                      className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl px-4 py-3.5 text-center text-xl font-black tracking-[0.5em] outline-none transition-all"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <i className={showPin ? "fa-solid fa-eye-slash text-xs" : "fa-solid fa-eye text-xs"}></i>
                    </button>
                  </div>
                  {pinError && (
                    <p className="text-[9px] font-black text-rose-500 mt-2 flex items-center justify-center gap-1 animate-shake">
                      <i className="fa-solid fa-circle-xmark"></i> {pinError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 w-full mb-3">
                  <button 
                    onClick={() => setShowPinModal(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border border-gray-200/50"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handlePinSubmit}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                    style={{ color: '#ffffff' }}
                  >
                    Masuk
                  </button>
                </div>

                <button
                  onClick={handleOpenEditOwner}
                  className="text-[8px] font-bold text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors flex items-center gap-1"
                >
                  <i className="fa-solid fa-gear text-[7px]"></i> Edit Nama / PIN Owner
                </button>
              </>
            ) : (
              /* --- Edit Owner Mode --- */
              <>
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3 shadow-inner border border-amber-100">
                  <i className="fa-solid fa-user-pen text-lg"></i>
                </div>
                <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-900 mb-1">Edit Owner</h3>
                <p className="text-[9px] font-bold text-gray-400 mb-4 uppercase tracking-tight">Ubah nama dan PIN panel owner</p>

                <div className="w-full space-y-3 mb-4">
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1 text-left ml-1">Nama Owner</label>
                    <input
                      type="text"
                      value={editOwnerName}
                      onChange={e => setEditOwnerName(e.target.value)}
                      placeholder="Contoh: Admin Utama"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1 text-left ml-1">PIN Baru (min 4 digit)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={editOwnerPin}
                      onChange={e => setEditOwnerPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="0000"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold tracking-widest text-center outline-none focus:border-blue-500 transition-all"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                    />
                  </div>
                  {pinError && (
                    <p className="text-[9px] font-black text-rose-500 flex items-center justify-center gap-1">
                      <i className="fa-solid fa-circle-xmark"></i> {pinError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => { setShowEditOwner(false); setPinError('') }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border border-gray-200/50"
                  >
                    Kembali
                  </button>
                  <button 
                    onClick={handleSaveOwnerSettings}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                    style={{ color: '#ffffff' }}
                  >
                    Simpan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
