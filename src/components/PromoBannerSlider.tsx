import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

export interface PromoBannerSliderProps {
  banners?: string[]
  onGoToSettings?: () => void
  isOwner?: boolean
  onSaveBanners?: (banners: string[]) => void | Promise<void>
  activeStoreId?: string
}

const MAX_BANNERS = 5
const FRAME_W = 336
const FRAME_H = 140
const CANVAS_W = 1600
const CANVAS_H = 667

export const PromoBannerSlider: React.FC<PromoBannerSliderProps> = ({
  banners = [],
  onGoToSettings,
  isOwner = false,
  onSaveBanners,
  activeStoreId
}) => {
  const validBanners = (banners || []).filter(b => typeof b === 'string' && b.trim() !== '')
  const [activeIdx, setActiveIdx] = useState(0)

  // State Quick Edit Modal
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'list' | 'crop'>('list')
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Crop Editor State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingTargetIdx = useRef<number | null>(null)
  const [cropSrc, setCropSrc] = useState('')
  const [targetSlotIdx, setTargetSlotIdx] = useState<number | null>(null)
  const [baseSize, setBaseSize] = useState({ w: FRAME_W, h: FRAME_H })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Auto slide setiap 4.5 detik jika ada lebih dari 1 foto (pause saat modal buka)
  useEffect(() => {
    if (validBanners.length <= 1 || showModal) return
    const interval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % validBanners.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [validBanners.length, showModal])

  // Pastikan activeIdx valid saat foto berkurang
  useEffect(() => {
    if (activeIdx >= validBanners.length && validBanners.length > 0) {
      setActiveIdx(0)
    }
  }, [validBanners.length, activeIdx])

  // Touch swipe support untuk HP
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const minSwipeDistance = 40

  // Kunci scroll halaman belakang saat modal edit banner terbuka
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showModal])


  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }
  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return
    const distance = touchStart - touchEnd
    if (distance > minSwipeDistance) {
      setActiveIdx(prev => (prev + 1) % validBanners.length)
    } else if (distance < -minSwipeDistance) {
      setActiveIdx(prev => (prev - 1 + validBanners.length) % validBanners.length)
    }
    setTouchStart(null)
    setTouchEnd(null)
  }

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setActiveIdx(prev => (prev - 1 + validBanners.length) % validBanners.length)
  }
  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setActiveIdx(prev => (prev + 1) % validBanners.length)
  }

  // ---------- Logika Upload & Simpan Banner ----------
  const handleOpenPicker = (targetIdx: number | null) => {
    setErrorMsg('')
    pendingTargetIdx.current = targetIdx
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Pilih file gambar yang valid (JPG, PNG, atau WebP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      if (dataUrl) {
        const img = new Image()
        img.onload = () => {
          const imgAspect = img.naturalWidth / img.naturalHeight
          const frameAspect = FRAME_W / FRAME_H
          const size = imgAspect >= frameAspect
            ? { w: FRAME_H * imgAspect, h: FRAME_H }
            : { w: FRAME_W, h: FRAME_W / imgAspect }
          setBaseSize(size)
          setCropSrc(dataUrl)
          setTargetSlotIdx(pendingTargetIdx.current)
          setZoom(1)
          setOffset({ x: 0, y: 0 })
          setModalMode('crop')
        }
        img.onerror = () => setErrorMsg('Gagal membaca gambar.')
        img.src = dataUrl
      }
    }
    reader.readAsDataURL(file)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setOffset({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y })
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }

  const commitBannersUpdate = async (newBanners: string[]) => {
    if (onSaveBanners) {
      await onSaveBanners(newBanners)
    } else {
      localStorage.setItem('alphaPro_promoBanners', JSON.stringify(newBanners))
      if (activeStoreId && activeStoreId !== 'all') {
        localStorage.setItem(`alphaPro_${activeStoreId}_promoBanners`, JSON.stringify(newBanners))
      }
      try {
        const sId = activeStoreId && activeStoreId !== 'all' ? activeStoreId : 'main'
        await supabase.from('store_settings').upsert({
          store_id: sId,
          promo_banners: newBanners,
          updated_at: new Date().toISOString()
        })
      } catch (err) {}
    }
  }

  const handleSaveCropped = async () => {
    if (!cropSrc || isBusy) return
    setIsBusy(true)
    setErrorMsg('')
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = cropSrc

      await new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) resolve()
        else {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Gagal memproses gambar.'))
        }
      })

      const canvas = document.createElement('canvas')
      canvas.width = CANVAS_W
      canvas.height = CANVAS_H
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas tidak tersedia')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      const ratio = CANVAS_W / FRAME_W
      const drawW = baseSize.w * zoom * ratio
      const drawH = baseSize.h * zoom * ratio
      const drawX = CANVAS_W / 2 - drawW / 2 + offset.x * ratio
      const drawY = CANVAS_H / 2 - drawH / 2 + offset.y * ratio

      ctx.fillStyle = '#020617'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.drawImage(img, drawX, drawY, drawW, drawH)

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else canvas.toBlob((j) => (j ? resolve(j) : reject(new Error('Gagal kompresi foto.'))), 'image/jpeg', 0.88)
        }, 'image/webp', 0.88)
      })

      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
      const storeId = activeStoreId && activeStoreId !== 'all' ? activeStoreId : 'main'
      const fileName = `banners/banner_${storeId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`

      let finalUrl = ''
      try {
        const { error: upErr } = await supabase.storage
          .from('pos-products')
          .upload(fileName, blob, { upsert: true, contentType: blob.type || 'image/webp', cacheControl: '31536000' })
        if (upErr) throw upErr

        const { data: { publicUrl } } = supabase.storage.from('pos-products').getPublicUrl(fileName)
        finalUrl = publicUrl || ''
      } catch (cloudErr) {
        // Fallback dataURL jika storage bermasalah
        finalUrl = canvas.toDataURL('image/jpeg', 0.85)
      }

      if (!finalUrl) throw new Error('Gagal menghasilkan URL banner.')

      let updated: string[] = []
      if (targetSlotIdx !== null && validBanners[targetSlotIdx]) {
        updated = [...validBanners]
        updated[targetSlotIdx] = finalUrl
      } else {
        updated = [...validBanners, finalUrl]
      }

      await commitBannersUpdate(updated)
      setModalMode('list')
      setShowModal(false)
    } catch (err: any) {
      console.error('Gagal simpan banner:', err)
      setErrorMsg(err?.message || 'Gagal menyimpan foto banner.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleDeleteBanner = async (idx: number) => {
    if (isBusy) return
    setIsBusy(true)
    setErrorMsg('')
    try {
      const updated = validBanners.filter((_, i) => i !== idx)
      await commitBannersUpdate(updated)
      setConfirmDeleteIdx(null)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghapus banner.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="w-full px-1.5 mb-3 mt-[-1.25rem] relative z-[20] select-none">
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative rounded-t-[1.5rem] rounded-b-[2rem] shadow-lg border-[2px] border-white dark:border-white/20 overflow-hidden w-full bg-slate-900 group transition-all duration-300 aspect-[2.4/1]"
        style={{ aspectRatio: '2.4 / 1' }}
      >
        {validBanners.length > 0 ? (
          <>
            {/* Foto Promosi Murni (Proporsional & Edge-to-Edge) */}
            <div className="w-full h-full relative overflow-hidden bg-slate-900 flex items-center justify-center">
              {validBanners.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    idx === activeIdx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Banner Promosi ${idx + 1}`}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            {/* Gradient Shadow bawah */}
            <div className="absolute inset-x-0 bottom-0 h-8 sm:h-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none z-10" />

            {/* TOMBOL EDIT BANNER (KHUSUS MODE OWNER - TERKUNCI / SELALU TAMPIL) */}
            {isOwner && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowModal(true)
                  setModalMode('list')
                }}
                className="absolute top-2.5 right-2.5 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 text-amber-400 hover:text-amber-300 border border-amber-500/40 shadow-xl backdrop-blur-md text-xs font-bold transition-all active:scale-95 cursor-pointer"
                title="Edit Banner Promosi (Mode Owner)"
              >
                <i className="fa-solid fa-pencil text-[11px]"></i>
                <span>Edit</span>
              </button>
            )}

            {/* Tombol Navigasi Kiri / Kanan */}
            {validBanners.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md active:scale-95 cursor-pointer"
                  title="Foto sebelumnya"
                >
                  <i className="fa-solid fa-chevron-left text-[11px] sm:text-xs"></i>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md active:scale-95 cursor-pointer"
                  title="Foto berikutnya"
                >
                  <i className="fa-solid fa-chevron-right text-[11px] sm:text-xs"></i>
                </button>
              </>
            )}

            {/* Indikator Titik (Dots) Slide */}
            {validBanners.length > 1 && (
              <div className="absolute bottom-2 sm:bottom-3 inset-x-0 flex justify-center items-center gap-1.5 sm:gap-2 z-20 pointer-events-auto">
                {validBanners.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveIdx(i)
                    }}
                    className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 shadow-sm cursor-pointer ${
                      i === activeIdx
                        ? 'w-5 sm:w-7 bg-white'
                        : 'w-1 sm:w-1.5 bg-white/50 hover:bg-white/80'
                    }`}
                    title={`Ke foto ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* Placeholder Bersih saat belum ada banner */
          <div className="w-full h-full bg-gradient-to-r from-[#004A8B] to-[#0069BA] text-white relative overflow-hidden flex items-center justify-center px-4 py-3">
            <div className="relative z-10 flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full border border-white/40 bg-white/10 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-images text-base text-white"></i>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowModal(true)
                    setModalMode('list')
                  }}
                  className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 text-[10px] sm:text-xs font-black rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                  <span>Upload Foto Banner</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input File Tersembunyi */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileChange} 
      />

      {/* ========================================================================= */}
      {/* MODAL QUICK EDIT BANNER (ALUR 3: KHUSUS OWNER)                           */}
      {/* ========================================================================= */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isBusy && setShowModal(false)}
        >
          <div
            className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 bg-white/95 backdrop-blur border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-pencil text-sm"></i>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-800 leading-tight">
                    {modalMode === 'crop' ? 'Sesuaikan Posisi Foto' : 'Edit Banner Promosi'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {modalMode === 'crop' ? 'Geser & zoom sesuai rasio banner' : `${validBanners.length} / ${MAX_BANNERS} Foto Aktif`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => (modalMode === 'crop' && !isBusy ? setModalMode('list') : !isBusy && setShowModal(false))}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title={modalMode === 'crop' ? 'Kembali' : 'Tutup'}
              >
                <i className={`fa-solid ${modalMode === 'crop' ? 'fa-arrow-left' : 'fa-xmark'} text-xs`}></i>
              </button>
            </div>

            <div className="p-4 space-y-3">
              {errorMsg && (
                <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-bold">
                  {errorMsg}
                </div>
              )}

              {/* MODE 1: DAFTAR BANNER & GANTI / TAMBAH */}
              {modalMode === 'list' && (
                <>
                  {validBanners.length === 0 && (
                    <div className="py-6 text-center text-slate-400">
                      <i className="fa-solid fa-images text-3xl mb-2 block"></i>
                      <p className="text-xs font-bold">Belum ada foto banner</p>
                    </div>
                  )}

                  {validBanners.map((url, idx) => (
                    <div
                      key={idx}
                      className={`rounded-2xl border overflow-hidden transition-all ${
                        idx === activeIdx ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'
                      }`}
                    >
                      <div className="relative bg-slate-900" style={{ aspectRatio: '2.4 / 1' }}>
                        <img 
                          src={url} 
                          alt={`Banner ${idx + 1}`} 
                          className="w-full h-full object-cover" 
                          draggable={false} 
                        />
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-black">
                          Slide #{idx + 1}
                        </span>
                      </div>

                      {confirmDeleteIdx === idx ? (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-rose-50">
                          <span className="text-[11px] font-black text-rose-600">Hapus foto ini?</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteIdx(null)}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-black cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeleteBanner(idx)}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black cursor-pointer"
                            >
                              {isBusy ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-white">
                          <button
                            type="button"
                            onClick={() => handleOpenPicker(idx)}
                            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                          >
                            <i className="fa-solid fa-rotate text-[10px]"></i> Ganti Foto Ini
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteIdx(idx)}
                            className="w-10 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                            title="Hapus foto"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {validBanners.length < MAX_BANNERS && (
                    <button
                      type="button"
                      onClick={() => handleOpenPicker(null)}
                      className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-500 hover:text-blue-600 text-xs font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <i className="fa-solid fa-plus"></i>
                      Tambah Foto Banner (Slot {validBanners.length + 1} dari {MAX_BANNERS})
                    </button>
                  )}

                  {/* KARTU INFORMASI PANDUAN UKURAN BANNER (LEBAR & TINGGI) */}
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50/90 via-sky-50/60 to-indigo-50/90 border border-blue-200/80 p-3.5 shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-blue-900">
                        <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px]">
                          <i className="fa-solid fa-ruler-combined"></i>
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-tight">Ukuran Rekomendasi Banner</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black tracking-wider shadow-xs">
                        Rasio 2.4 : 1
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-white/95 rounded-xl p-2 border border-blue-100 shadow-xs flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-arrows-left-right text-[10px]"></i>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Lebar Ideal</div>
                          <div className="text-[12px] font-black text-blue-700">1200 px</div>
                        </div>
                      </div>

                      <div className="bg-white/95 rounded-xl p-2 border border-blue-100 shadow-xs flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-arrows-up-down text-[10px]"></i>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Tinggi Ideal</div>
                          <div className="text-[12px] font-black text-indigo-700">500 px</div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      💡 Gunakan foto berorientasi <strong className="text-slate-700 font-bold">Landscape (Memanjang Horizontal)</strong> dengan ukuran ideal <strong className="text-blue-700 font-black">1200 × 500 px</strong> (atau <span className="font-semibold text-slate-600">1600 × 667 px</span>) agar pas sempurna dan tidak terpotong saat tampil di layar kasir.
                    </p>
                  </div>

                  <p className="text-[10px] text-slate-400 font-bold text-center leading-relaxed pt-1">
                    Foto yang disimpan langsung tampil di layar transaksi dan tersinkron ke semua perangkat kasir.
                  </p>
                </>
              )}

              {/* MODE 2: CROP & ZOOM FOTO */}
              {modalMode === 'crop' && (
                <>
                  {/* Badge Info Ukuran Banner saat Crop */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-crop-simple text-amber-600 text-xs"></i>
                      Frame Banner: <strong>Rasio 2.4 : 1 (Landscape)</strong>
                    </span>
                    <span className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md font-mono text-[9px] font-black">
                      1200 × 500 px
                    </span>
                  </div>

                  <div className="flex justify-center">
                    <div
                      className="relative overflow-hidden rounded-2xl border-2 border-amber-400 bg-slate-950 touch-none select-none cursor-grab active:cursor-grabbing"
                      style={{ width: FRAME_W, height: FRAME_H, maxWidth: '100%' }}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                    >
                      <img
                        src={cropSrc}
                        alt="Preview Editor"
                        draggable={false}
                        className="absolute max-w-none pointer-events-none"
                        style={{
                          width: baseSize.w * zoom,
                          height: baseSize.h * zoom,
                          left: FRAME_W / 2 - (baseSize.w * zoom) / 2 + offset.x,
                          top: FRAME_H / 2 - (baseSize.h * zoom) / 2 + offset.y,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <span>Perbesar / Perkecil (Zoom)</span>
                      <span>{Math.round(zoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setModalMode('list')}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleSaveCropped}
                      className="flex-[1.6] py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-500/30 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isBusy ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i> Mengunggah...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-check"></i> Simpan Foto
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default PromoBannerSlider
