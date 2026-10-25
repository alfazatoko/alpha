import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PhotoEditorModalProps {
  isOpen: boolean
  imageUrl: string | null
  storeName?: string
  onClose: () => void
  onSendToChat?: (base64Data: string, caption: string) => void
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  isOpen,
  imageUrl,
  storeName = 'ALFAZA CELL',
  onClose,
  onSendToChat
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null)

  // Editor states
  const [overlayText, setOverlayText] = useState('PROMO SPESIAL KUOTA')
  const [textColor, setTextColor] = useState('#ffffff')
  const [textBgColor, setTextBgColor] = useState('rgba(0, 0, 0, 0.65)')
  const [textSize, setTextSize] = useState<number>(32)
  const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('bottom')
  const [filter, setFilter] = useState<'normal' | 'vivid' | 'warm' | 'cool' | 'vintage' | 'bw'>('normal')
  const [rotation, setRotation] = useState<number>(0)
  const [showWatermark, setShowWatermark] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Load image when modal opens or imageUrl changes
  useEffect(() => {
    if (!imageUrl || !isOpen) return
    setIsProcessing(true)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => {
      setLoadedImage(img)
      setIsProcessing(false)
    }
    img.onerror = () => {
      fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob)
          const fallbackImg = new Image()
          fallbackImg.src = blobUrl
          fallbackImg.onload = () => {
            setLoadedImage(fallbackImg)
            setIsProcessing(false)
          }
        })
        .catch(() => {
          setIsProcessing(false)
        })
    }
  }, [imageUrl, isOpen])

  // Redraw canvas whenever editor states change
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !loadedImage) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Base dimensions from loaded image
    const isRotated90or270 = rotation === 90 || rotation === 270
    const w = isRotated90or270 ? loadedImage.naturalHeight : loadedImage.naturalWidth
    const h = isRotated90or270 ? loadedImage.naturalWidth : loadedImage.naturalHeight

    canvas.width = Math.max(w, 600)
    canvas.height = Math.max(h, 600)

    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Handle Rotation
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    const drawW = isRotated90or270 ? canvas.height : canvas.width
    const drawH = isRotated90or270 ? canvas.width : canvas.height

    // Handle Filters
    if (filter === 'vivid') {
      ctx.filter = 'contrast(125%) saturate(140%) brightness(105%)'
    } else if (filter === 'warm') {
      ctx.filter = 'sepia(25%) saturate(120%) brightness(105%)'
    } else if (filter === 'cool') {
      ctx.filter = 'hue-rotate(180deg) saturate(90%)'
    } else if (filter === 'vintage') {
      ctx.filter = 'sepia(50%) contrast(110%)'
    } else if (filter === 'bw') {
      ctx.filter = 'grayscale(100%) contrast(120%)'
    } else {
      ctx.filter = 'none'
    }

    ctx.drawImage(loadedImage, -drawW / 2, -drawH / 2, drawW, drawH)
    ctx.restore()

    // Draw Overlay Text
    if (overlayText.trim()) {
      ctx.save()
      ctx.font = `900 ${textSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const lines = overlayText.split('\n')
      const lineHeight = textSize * 1.3
      const totalTextH = lines.length * lineHeight

      let startY = canvas.height - totalTextH / 2 - 40
      if (textPosition === 'top') {
        startY = 40 + totalTextH / 2
      } else if (textPosition === 'center') {
        startY = canvas.height / 2
      }

      // Draw background bar if selected
      if (textBgColor !== 'transparent') {
        ctx.fillStyle = textBgColor
        const padY = 16
        ctx.fillRect(0, startY - totalTextH / 2 - padY, canvas.width, totalTextH + padY * 2)
      }

      // Draw text with shadow
      ctx.fillStyle = textColor
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2

      lines.forEach((line, idx) => {
        const y = startY - (totalTextH / 2) + (idx * lineHeight) + (lineHeight / 2)
        ctx.fillText(line.toUpperCase(), canvas.width / 2, y)
      })
      ctx.restore()
    }

    // Draw Watermark
    if (showWatermark && storeName) {
      ctx.save()
      ctx.font = '700 16px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 4
      ctx.fillText(`📍 ${storeName}`, canvas.width - 20, canvas.height - 20)
      ctx.restore()
    }
  }, [loadedImage, overlayText, textColor, textBgColor, textSize, textPosition, filter, rotation, showWatermark, storeName])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  // Download Handler
  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `alpha-foto-${Date.now()}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.92)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Send to Chat Handler
  const handleSendToChat = () => {
    const canvas = canvasRef.current
    if (!canvas || !onSendToChat) return
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    const base64Data = dataUrl.split(',')[1]
    onSendToChat(base64Data, overlayText || 'Foto hasil edit')
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-700 to-violet-800 border-b border-white/10 text-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎨</span>
              <div>
                <h3 className="text-sm font-black tracking-wide">Studio Edit & Simpan Foto</h3>
                <p className="text-[10px] text-indigo-200">Tambahkan teks promo, filter warna, dan download instan</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-sm font-bold transition-all"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-4 items-center justify-center">
            {/* Canvas Preview Area */}
            <div className="flex-1 w-full flex items-center justify-center bg-black/50 rounded-2xl p-2 border border-white/10 min-h-[280px] overflow-hidden">
              {isProcessing && !loadedImage ? (
                <div className="text-center text-indigo-300 animate-pulse text-xs">
                  ⏳ Sedang memuat foto...
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-lg border border-white/5"
                />
              )}
            </div>

            {/* Editing Controls */}
            <div className="w-full md:w-80 space-y-3 shrink-0 text-white text-xs">
              {/* Teks Promo */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-2">
                <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                  📝 Teks Promo / Banner
                </label>
                <input
                  type="text"
                  value={overlayText}
                  onChange={e => setOverlayText(e.target.value)}
                  placeholder="Contoh: PROMO SPESIAL KUOTA"
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                />

                {/* Ukuran & Posisi */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[9px] text-slate-400 block mb-1">Posisi Teks:</span>
                    <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10">
                      {(['top', 'center', 'bottom'] as const).map(pos => (
                        <button
                          key={pos}
                          onClick={() => setTextPosition(pos)}
                          className={`flex-1 py-1 text-[9px] font-bold rounded-md capitalize transition-all ${textPosition === pos ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          {pos === 'top' ? 'Atas' : pos === 'center' ? 'Tengah' : 'Bawah'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 block mb-1">Ukuran Huruf:</span>
                    <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10">
                      {[24, 32, 42].map(size => (
                        <button
                          key={size}
                          onClick={() => setTextSize(size)}
                          className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${textSize === size ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          {size === 24 ? 'S' : size === 32 ? 'M' : 'L'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Warna Teks & Latar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-400">Warna:</span>
                    {['#ffffff', '#facc15', '#ef4444', '#38bdf8'].map(c => (
                      <button
                        key={c}
                        onClick={() => setTextColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-4 h-4 rounded-full border transition-all ${textColor === c ? 'scale-125 border-white ring-2 ring-indigo-400' : 'border-black/30'}`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-400">Bar:</span>
                    {[
                      { bg: 'rgba(0, 0, 0, 0.65)', label: 'Hitam' },
                      { bg: 'rgba(220, 38, 38, 0.85)', label: 'Merah' },
                      { bg: 'rgba(37, 99, 235, 0.85)', label: 'Biru' },
                      { bg: 'transparent', label: 'Polos' }
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => setTextBgColor(item.bg)}
                        title={item.label}
                        className={`px-1.5 py-0.5 text-[8.5px] rounded border transition-all ${textBgColor === item.bg ? 'bg-indigo-500 border-white text-white' : 'bg-white/10 border-white/10 text-slate-300'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Preset */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-1.5">
                <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                  ✨ Efek & Filter Warna
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'normal', label: 'Normal' },
                    { id: 'vivid', label: 'Cerah' },
                    { id: 'warm', label: 'Hangat' },
                    { id: 'cool', label: 'Dingin' },
                    { id: 'vintage', label: 'Vintage' },
                    { id: 'bw', label: 'B&W' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id as any)}
                      className={`py-1 rounded-lg text-[9.5px] font-bold border transition-all ${filter === f.id ? 'bg-gradient-to-r from-violet-600 to-indigo-600 border-white text-white shadow' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rotasi & Watermark */}
              <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-2xl border border-white/10">
                <button
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold transition-all"
                >
                  <span>🔄</span> Putar 90°
                </button>

                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={e => setShowWatermark(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                  Watermark Toko
                </label>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-t border-white/10 shrink-0 gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
            >
              ✕ Batal
            </button>

            <div className="flex items-center gap-2">
              {onSendToChat && (
                <button
                  onClick={handleSendToChat}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-600/30 transition-all active:scale-95"
                >
                  <span>📤</span> Kirim ke Chat
                </button>
              )}

              <button
                onClick={handleDownload}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
              >
                <span>📥</span> Simpan Foto (Download)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default PhotoEditorModal;
