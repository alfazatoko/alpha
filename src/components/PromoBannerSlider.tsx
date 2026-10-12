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
    <div className="w-full px-3 mb-3 mt-[-1rem] relative z-[40] select-none">
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative rounded-2xl shadow-md border border-black/5 dark:border-white/10 overflow-hidden w-full bg-slate-900 group transition-all duration-300"
        style={{ aspectRatio: '1000 / 250' }}
      >
        {validBanners.length > 0 ? (
          <>
            {/* Foto Promosi Murni (Full Cover) */}
            <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
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
                    loading="lazy"
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            {/* Subtle Gradient Shadow di bawah untuk kontras titik indikator */}
            <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none z-10" />

            {/* Tombol Navigasi Manual Kiri / Kanan (Hover di Desktop/Tablet) */}
            {validBanners.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md active:scale-95"
                  title="Foto sebelumnya"
                >
                  <i className="fa-solid fa-chevron-left text-[10px]"></i>
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md active:scale-95"
                  title="Foto berikutnya"
                >
                  <i className="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
              </>
            )}

            {/* Indikator Titik (Dots) Slide ala DANA */}
            {validBanners.length > 1 && (
              <div className="absolute bottom-1.5 inset-x-0 flex justify-center items-center gap-1.5 z-20 pointer-events-auto">
                {validBanners.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveIdx(i)
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${
                      i === activeIdx
                        ? 'w-5 bg-white'
                        : 'w-1.5 bg-white/50 hover:bg-white/80'
                    }`}
                    title={`Ke foto ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* Placeholder Elegan jika Belum Ada Foto yang Diunggah */
          <div className="w-full h-full bg-gradient-to-br from-[#0000c6] via-blue-700 to-indigo-900 text-white relative overflow-hidden flex items-center justify-between px-3.5 sm:px-6 py-2 text-left">
            {/* Latar Geometris Tipis */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <circle cx="85%" cy="30%" r="60" fill="none" stroke="#fff" strokeWidth="1" />
                <circle cx="15%" cy="80%" r="45" fill="none" stroke="#fff" strokeWidth="1" />
                <circle cx="50%" cy="20%" r="5" fill="#fff" />
              </svg>
            </div>

            <div className="relative z-10 flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-md shrink-0">
                  <i className="fa-solid fa-images text-xs sm:text-sm text-white"></i>
                </div>
                <div className="min-w-0">
                  <h4 className="text-[10.5px] sm:text-xs font-black tracking-wide uppercase leading-tight truncate">
                    Banner Promosi Toko
                  </h4>
                  <p className="text-[8.5px] sm:text-[9.5px] text-blue-100/90 font-medium leading-tight mt-0.5 truncate">
                    Upload foto ukuran 1000 x 250 px
                  </p>
                </div>
              </div>
              {isOwner && onGoToSettings && (
                <button
                  onClick={onGoToSettings}
                  className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 text-[8.5px] sm:text-[9.5px] font-black rounded-full shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-[8.5px]"></i>
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
