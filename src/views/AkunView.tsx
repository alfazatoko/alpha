import React, { useState } from 'react'
import { cn, compressImage } from '../lib/utils'

interface AkunViewProps {
  active: boolean
  kasirName?: string
  kasirRole?: string
  onLogout?: () => void
  onRequestLogout?: () => void
  runningTexts?: string[]
  mainAnnouncement?: string
  onSaveRunningTexts?: (texts: string[]) => void
  onSaveMainAnnouncement?: (text: string) => void
  storeName?: string
  storeSubtext?: string
  storePhoto?: string
  onSaveStoreName?: (v: string) => void
  onSaveStoreSubtext?: (v: string) => void
  onSaveStorePhoto?: (v: string) => void
  setActiveView?: (v: string) => void
}

const AkunView: React.FC<AkunViewProps> = (props) => {
  const safeName = String(props.kasirName || 'User')
  const initial = (safeName.charAt(0) || 'U').toUpperCase()
  const roleBadge = props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'
  const roleColor = props.kasirRole === 'owner' ? 'bg-amber-500 text-white shadow-sm' : 'bg-emerald-100 text-emerald-600'
  
  const safeRunningTexts = Array.isArray(props.runningTexts) ? props.runningTexts : Array(15).fill('')
  const [isPinEnabled, setIsPinEnabled] = useState(localStorage.getItem('alphaPro_isPinEnabled') !== 'false')
  const [openCategory, setOpenCategory] = useState<string | null>('profil')
  const [savedStatus, setSavedStatus] = useState(false)

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const compressedBase64 = await compressImage(file)
        props.onSaveStorePhoto?.(compressedBase64)
      } catch (err) {
        console.error("Compression failed", err)
        // Fallback to original if compression fails (though unlikely)
        const reader = new FileReader()
        reader.onloadend = () => {
          props.onSaveStorePhoto?.(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const togglePin = () => {
    const newValue = !isPinEnabled
    setIsPinEnabled(newValue)
    localStorage.setItem('alphaPro_isPinEnabled', newValue.toString())
  }

  const handleExportData = () => {
    const data = {
      transactions: props.kasirRole === 'owner' ? localStorage.getItem('alphaPro_transactions') : 'access_denied',
      settings: {
        storeName: props.storeName,
        storeSubtext: props.storeSubtext,
        runningTexts: props.runningTexts,
        mainAnnouncement: props.mainAnnouncement,
        isPinEnabled
      },
      exportDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ALPHA_BACKUP_${new Date().getTime()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleResetSystem = () => {
    if (confirm('PERINGATAN KRITIKAL!\n\nSemua data lokal (PIN, Nama Toko, Slogan) akan dikembalikan ke awal.\n\nLanjutkan reset?')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  return (
    <div className={cn("page-view hide-scrollbar bg-white", props.active && "active")}>
      <div className="px-4 pt-7 pb-4 border-b flex justify-between items-center bg-slate-900 text-white shadow-lg">
        <button 
          onClick={() => props.setActiveView?.('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="text-center">
          <h2 className="font-black text-xs uppercase tracking-widest leading-none">PENGATURAN</h2>
          <p className="text-[8px] text-white/50 mt-1 font-bold">ALFAZA CELL</p>
        </div>
        <button 
          onClick={() => props.setActiveView?.('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div className="px-1.5 py-6">
        <div className="flex items-center gap-4 p-5 border border-blue-100 rounded-3xl mb-6 bg-blue-50/30">
          <div className="relative group">
            {props.storePhoto ? (
              <img src={props.storePhoto} alt="Logo" className="w-16 h-16 rounded-full object-cover shadow-lg border-4 border-white" />
            ) : (
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg border-4 border-white">{initial}</div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px]">
              <i className="fa-solid fa-check"></i>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-800">{props.storeName || 'Admin ALPHA'}</h3>
            <p className="text-xs text-gray-500">{props.storeSubtext || 'Pembukuan Agen brilink & Konter'}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={cn("inline-block px-2 py-0.5 text-[9px] font-black rounded", roleColor)}>{roleBadge}</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{props.kasirName}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Owner Only Settings */}
          {props.kasirRole === 'owner' && (
            <div className="mb-6 space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Pengaturan Owner</p>
              
              {/* Kategori: Edit Profil Toko */}
              <div className="group">
                <button 
                  onClick={() => setOpenCategory(openCategory === 'profil' ? null : 'profil')}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                    openCategory === 'profil' ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100" : "bg-white text-gray-800 border-gray-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      openCategory === 'profil' ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"
                    )}>
                      <i className="fa-solid fa-user-pen text-xs"></i>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Edit Profil Toko</span>
                  </div>
                  <i className={cn(
                    "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                    openCategory === 'profil' && "rotate-180"
                  )}></i>
                </button>

                {openCategory === 'profil' && (
                  <div className="mt-2 p-5 bg-emerald-50/30 border border-emerald-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-5">
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center gap-3 pb-2">
                      <div className="relative group cursor-pointer" onClick={() => document.getElementById('photoInput')?.click()}>
                        {props.storePhoto ? (
                          <img src={props.storePhoto} alt="Store" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 border-4 border-white shadow-md">
                            <i className="fa-solid fa-camera text-2xl"></i>
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-600 text-white rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                          <i className="fa-solid fa-plus text-[10px]"></i>
                        </div>
                        <input id="photoInput" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                      </div>
                      <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Ganti Logo Toko</p>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-emerald-600 uppercase tracking-tight ml-1 mb-2 block">Nama Toko</label>
                      <input 
                        type="text" 
                        value={props.storeName || ''} 
                        onChange={(e) => props.onSaveStoreName?.(e.target.value)}
                        placeholder="Nama Toko Anda"
                        className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-xs font-black text-gray-900 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-emerald-600 uppercase tracking-tight ml-1 mb-2 block">Sub-Teks / Slogan</label>
                      <input 
                        type="text" 
                        value={props.storeSubtext || ''} 
                        onChange={(e) => props.onSaveStoreSubtext?.(e.target.value)}
                        placeholder="Contoh: Pembukuan Agen brilink & Konter"
                        className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-xs font-black text-gray-900 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Kategori: Keamanan & Akses */}
              <div className="group">
                <button 
                  onClick={() => setOpenCategory(openCategory === 'keamanan' ? null : 'keamanan')}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                    openCategory === 'keamanan' ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-white text-gray-800 border-gray-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      openCategory === 'keamanan' ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                    )}>
                      <i className="fa-solid fa-shield-halved text-xs"></i>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Keamanan & Akses</span>
                  </div>
                  <i className={cn(
                    "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                    openCategory === 'keamanan' && "rotate-180"
                  )}></i>
                </button>

                {openCategory === 'keamanan' && (
                  <div className="mt-2 p-5 bg-blue-50/50 border border-blue-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                          <i className="fa-solid fa-key text-xs"></i>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Gunakan PIN Masuk</p>
                          <p className="text-[9px] text-gray-500 font-medium">Wajibkan PIN saat login</p>
                        </div>
                      </div>
                      <button 
                        onClick={togglePin}
                        className={cn(
                          "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                          isPinEnabled ? "bg-blue-600" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                          isPinEnabled ? "translate-x-6" : "translate-x-0"
                        )}></div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Kategori: Tampilan & Promo */}
              <div className="group">
                <button 
                  onClick={() => setOpenCategory(openCategory === 'promo' ? null : 'promo')}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                    openCategory === 'promo' ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100" : "bg-white text-gray-800 border-gray-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      openCategory === 'promo' ? "bg-white/20 text-white" : "bg-orange-50 text-orange-500"
                    )}>
                      <i className="fa-solid fa-bullhorn text-xs"></i>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Tampilan & Promo</span>
                  </div>
                  <i className={cn(
                    "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                    openCategory === 'promo' && "rotate-180"
                  )}></i>
                </button>

                {openCategory === 'promo' && (
                  <div className="mt-2 p-5 bg-orange-50/30 border border-orange-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-5">
                    <div>
                      <label className="text-[9px] font-black text-orange-600 uppercase tracking-tight ml-1 mb-2 block">Teks Utama (Highlight)</label>
                      <input 
                        type="text" 
                        value={props.mainAnnouncement || ''} 
                        onChange={(e) => props.onSaveMainAnnouncement?.(e.target.value)}
                        placeholder="Contoh: Promo Aksesoris 20%..."
                        className="w-full bg-white border border-orange-100 rounded-xl px-4 py-3 text-xs font-black text-gray-900 placeholder:text-gray-400 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                      />
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Teks Tambahan (Max 15 Baris)</label>
                        <span className="text-[8px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Slide Berjalan</span>
                      </div>
                      <div className="relative group/textarea">
                        <textarea 
                          rows={8}
                          value={safeRunningTexts.filter(t => t.trim() !== '').join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n');
                            const newTexts = Array(15).fill('');
                            lines.slice(0, 15).forEach((line, i) => {
                              newTexts[i] = line;
                            });
                            props.onSaveRunningTexts?.(newTexts);
                          }}
                          placeholder="Tulis pesan per baris di sini...&#10;Baris 1: Promo Pulsa&#10;Baris 2: Promo Aksesoris&#10;..."
                          className="w-full bg-white border border-gray-100 group-hover/textarea:border-orange-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-gray-900 placeholder:text-gray-300 focus:bg-white focus:ring-4 focus:ring-orange-50 transition-all outline-none resize-none min-h-[200px]"
                        />
                        <div className="absolute bottom-3 right-4 text-[8px] font-black text-gray-300 pointer-events-none">
                          ENTER UNTUK BARIS BARU
                        </div>
                      </div>
                      <p className="text-[8px] text-gray-400 mt-2 ml-1 italic">* Setiap baris akan muncul bergantian di dashboard.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Kategori: Opsi Pantau Dashboard */}
              <div className="group">
                <button 
                  onClick={() => setOpenCategory(openCategory === 'pantau' ? null : 'pantau')}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                    openCategory === 'pantau' ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" : "bg-white text-gray-800 border-gray-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      openCategory === 'pantau' ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"
                    )}>
                      <i className="fa-solid fa-eye text-xs"></i>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Opsi Pantau Dashboard</span>
                  </div>
                  <i className={cn(
                    "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                    openCategory === 'pantau' && "rotate-180"
                  )}></i>
                </button>

                {openCategory === 'pantau' && (
                  <div className="mt-2 p-5 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                          <i className="fa-solid fa-filter text-[10px]"></i>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Filter Kasir di Beranda</p>
                          <p className="text-[9px] text-gray-500 font-medium">Tampilkan opsi cek per kasir</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const current = localStorage.getItem('alphaPro_showKasirFilter') !== 'false';
                          localStorage.setItem('alphaPro_showKasirFilter', (!current).toString());
                          window.dispatchEvent(new Event('storage')); // Trigger update if needed
                          setSavedStatus(true);
                          setTimeout(() => setSavedStatus(false), 2000);
                        }}
                        className={cn(
                          "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                          (localStorage.getItem('alphaPro_showKasirFilter') !== 'false') ? "bg-indigo-600" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                          (localStorage.getItem('alphaPro_showKasirFilter') !== 'false') ? "translate-x-6" : "translate-x-0"
                        )}></div>
                      </button>
                    </div>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter px-1 text-center">
                      Aktifkan untuk memantau performa kasir tertentu langsung dari kartu Owner Control.
                    </p>
                  </div>
                )}
              </div>

              {/* Kategori: Backup & Reset */}
              <div className="group">
                <button 
                  onClick={() => setOpenCategory(openCategory === 'backup' ? null : 'backup')}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                    openCategory === 'backup' ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-100" : "bg-white text-gray-800 border-gray-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      openCategory === 'backup' ? "bg-white/20 text-white" : "bg-red-50 text-red-600"
                    )}>
                      <i className="fa-solid fa-cloud-arrow-down text-xs"></i>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Backup & Keamanan</span>
                  </div>
                  <i className={cn(
                    "fa-solid fa-chevron-down text-[10px] transition-transform duration-300",
                    openCategory === 'backup' && "rotate-180"
                  )}></i>
                </button>

                {openCategory === 'backup' && (
                  <div className="mt-2 p-5 bg-red-50/30 border border-red-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-4">
                    <button 
                      onClick={handleExportData}
                      className="w-full flex items-center gap-4 p-4 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-download text-sm"></i>
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-gray-800 uppercase tracking-widest leading-none">BACKUP DATA</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">Unduh semua riwayat transaksi</p>
                      </div>
                    </button>

                    <button 
                      onClick={handleResetSystem}
                      className="w-full flex items-center gap-4 p-4 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-rotate text-sm"></i>
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-red-600 uppercase tracking-widest leading-none">RESET SISTEM</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">Kembalikan pengaturan ke awal</p>
                      </div>
                    </button>
                    
                    <p className="text-[8px] text-gray-400 font-bold text-center uppercase tracking-tighter px-4">
                      Selalu lakukan backup sebelum melakukan update besar atau pindah perangkat.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Menu Akun</p>
          
          <button className="w-full bg-white border border-gray-100 rounded-2xl font-semibold py-4 px-5 text-sm flex items-center justify-between shadow-sm hover:bg-gray-50 transition-all">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-circle-question text-blue-500"></i>
              <span>Bantuan & Support</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
          
          <button className="w-full bg-white border border-gray-100 rounded-2xl font-semibold py-4 px-5 text-sm flex items-center justify-between shadow-sm hover:bg-gray-50 transition-all">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-shield-halved text-emerald-500"></i>
              <span>Keamanan</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>

          {/* Tombol Simpan Perubahan (Visual Confirmation) */}
          <button 
            onClick={() => {
              setSavedStatus(true);
              setTimeout(() => setSavedStatus(false), 2000);
            }}
            className={cn(
              "w-full rounded-2xl font-black py-4 px-5 text-sm mt-8 shadow-lg transition-all flex items-center justify-center gap-3",
              savedStatus 
                ? "bg-emerald-600 text-white scale-[0.98]" 
                : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
            )}
          >
            {savedStatus ? (
              <>
                <i className="fa-solid fa-circle-check animate-bounce"></i>
                BERHASIL DISIMPAN!
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk text-slate-400"></i>
                SIMPAN PERUBAHAN
              </>
            )}
          </button>

          <button 
            onClick={() => {
              props.onRequestLogout?.();
            }}
            className="w-full bg-red-50 text-red-600 rounded-2xl font-bold py-4 px-5 text-sm mt-3 shadow-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            Keluar Aplikasi
          </button>
        </div>
        
        <p className="text-center text-[10px] text-gray-300 mt-10">Versi 1.2.0 (Production)</p>
      </div>
    </div>
  )
}

export default AkunView
