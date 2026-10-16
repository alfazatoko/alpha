import React, { useState, useEffect } from 'react'

export interface PromoBannerSliderProps {
  banners?: string[]
  onGoToSettings?: () => void
  isOwner?: boolean
}

export const PromoBannerSlider: React.FC<PromoBannerSliderProps> = ({
  banners = [],
  onGoToSettings,
  isOwner = false,
}) => {
  const validBanners = (banners || []).filter(b => typeof b === 'string' && b.trim() !== '')
  const [activeIdx, setActiveIdx] = useState(0)

  // Auto slide setiap 4.5 detik jika ada lebih dari 1 foto
  useEffect(() => {
    if (validBanners.length <= 1) return
    const interval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % validBanners.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [validBanners.length])

  // Pastikan activeIdx valid saat foto dihapus/berkurang
  useEffect(() => {
    if (activeIdx >= validBanners.length && validBanners.length > 0) {
      setActiveIdx(0)
    }
  }, [validBanners.length, activeIdx])

  // Touch swipe gesture support untuk swipe banner di HP / tablet
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 40

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
      // Geser ke kiri -> Foto berikutnya
      setActiveIdx(prev => (prev + 1) % validBanners.length)
    } else if (distance < -minSwipeDistance) {
      // Geser ke kanan -> Foto sebelumnya
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

  return (
    <div className="w-full px-1.5 mb-3 mt-[-1.25rem] relative z-[40] select-none">
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative rounded-t-[1.5rem] rounded-b-[2rem] shadow-lg border-[2px] border-white dark:border-white/20 overflow-hidden w-full bg-slate-900 group transition-all duration-300 aspect-[2.4/1]"
        style={{ aspectRatio: '2.4 / 1' }}
      >
        {validBanners.length > 0 ? (
          <>
            {/* Foto Promosi Murni (Proporsional, Full Edge-to-Edge & Tidak Terpotong) */}
            <div className="w-full h-full relative overflow-hidden bg-slate-900 flex items-center justify-center">
              {validBanners.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    idx === activeIdx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {/* Foto Utama: Full sampai ke pinggir, proporsional dan utuh di mode HP & Tablet */}
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

            {/* Subtle Gradient Shadow di bawah untuk kontras titik indikator */}
            <div className="absolute inset-x-0 bottom-0 h-8 sm:h-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none z-10" />

            {/* Tombol Navigasi Manual Kiri / Kanan (Hover di Desktop/Tablet) */}
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
          /* Placeholder Bersih Tanpa Teks */
          <div className="w-full h-full bg-gradient-to-r from-[#004A8B] to-[#0069BA] text-white relative overflow-hidden flex items-center justify-center px-4 py-3">
            {/* Latar Geometris Tipis */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <circle cx="85%" cy="30%" r="70" fill="none" stroke="#fff" strokeWidth="1" />
                <circle cx="15%" cy="80%" r="50" fill="none" stroke="#fff" strokeWidth="1" />
                <circle cx="50%" cy="20%" r="6" fill="#fff" />
              </svg>
            </div>

            <div className="relative z-10 flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full border border-white/40 bg-white/10 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-images text-base text-white"></i>
              </div>
              {isOwner && onGoToSettings && (
                <button
                  onClick={onGoToSettings}
                  className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 text-[10px] sm:text-xs font-black rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                  <span>Upload Foto</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PromoBannerSlider
