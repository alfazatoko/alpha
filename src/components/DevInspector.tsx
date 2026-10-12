import React, { useState, useEffect, useRef, useCallback } from 'react'

export interface SelectedElementInfo {
  tag: string
  id: string
  classes: string
  text: string
  placeholder?: string
  name?: string
  ariaLabel?: string
  selectorPath: string
  reactComponents: string[]
  activeView?: string
  timestamp: string
  userNotes?: string
}

interface DevInspectorProps {
  activeView?: string
}

export const DevInspector: React.FC<DevInspectorProps> = ({ activeView }) => {
  // Hanya aktif di environment localhost / development
  const isDevOrLocal = 
    typeof window !== 'undefined' && 
    (import.meta.env.DEV || 
     window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1')

  if (!isDevOrLocal) {
    return null
  }

  const [isActive, setIsActive] = useState<boolean>(false)
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null)
  const [hoverLabel, setHoverLabel] = useState<string>('')
  const [selectedInfo, setSelectedInfo] = useState<SelectedElementInfo | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [userNotes, setUserNotes] = useState<string>('')
  const [copied, setCopied] = useState<boolean>(false)

  const activeRef = useRef<boolean>(isActive)
  activeRef.current = isActive

  // Ambil nama React Component dari Fiber DOM
  const getReactComponents = useCallback((el: Element | null): string[] => {
    if (!el) return []
    const names: string[] = []
    try {
      const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'))
      if (!fiberKey) return []
      let fiber = (el as any)[fiberKey]
      while (fiber && names.length < 5) {
        if (typeof fiber.type === 'function') {
          const name = fiber.type.displayName || fiber.type.name
          if (name && !names.includes(name) && !['Anonymous', 'Fragment', 'DevInspector'].includes(name)) {
            names.push(name)
          }
        }
        fiber = fiber.return
      }
    } catch {
      // ignore
    }
    return names
  }, [])

  // Buat hierarki selector sederhana
  const getSelectorPath = useCallback((el: Element | null): string => {
    if (!el) return ''
    const parts: string[] = []
    let curr: Element | null = el
    while (curr && curr !== document.body && parts.length < 5) {
      let part = curr.tagName.toLowerCase()
      if (curr.id) {
        part += `#${curr.id}`
        parts.unshift(part)
        break
      } else {
        const classNames = typeof curr.className === 'string' ? curr.className.trim().split(/\s+/).filter(c => c && !c.startsWith('dev-inspector') && !c.includes(':')).slice(0, 2) : []
        if (classNames.length > 0) {
          part += `.${classNames.join('.')}`
        }
        parts.unshift(part)
      }
      curr = curr.parentElement
    }
    return parts.join(' > ')
  }, [])

  // Sinkronisasi data ke localStorage, window, dan file backend Vite
  const syncSelectedElement = useCallback((info: SelectedElementInfo) => {
    try {
      localStorage.setItem('__ALPHA_DEV_SELECTED_ELEMENT__', JSON.stringify(info))
      ;(window as any).__ALPHA_DEV_SELECTED_ELEMENT__ = info

      // Kirim ke backend Vite dev server untuk disimpan di .dev_selected_element.json
      fetch('/__dev_inspector_sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info, null, 2)
      }).catch(() => {})
    } catch {}
  }, [])

  // Handle hover & click inspeksi
  useEffect(() => {
    if (!isActive) {
      setHoverRect(null)
      setHoverLabel('')
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!activeRef.current) return
      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (!target || target.closest('[data-dev-inspector="true"]')) {
        setHoverRect(null)
        setHoverLabel('')
        return
      }

      const rect = target.getBoundingClientRect()
      setHoverRect(rect)

      const tag = target.tagName.toLowerCase()
      const compNames = getReactComponents(target)
      const compHint = compNames.length > 0 ? `[${compNames[0]}] ` : ''
      const classHint = target.id ? `#${target.id}` : (typeof target.className === 'string' ? `.${target.className.split(' ')[0]}` : '')
      setHoverLabel(`${compHint}<${tag}${classHint}>`)
    }

    const handleClick = (e: MouseEvent) => {
      if (!activeRef.current) return
      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (!target || target.closest('[data-dev-inspector="true"]')) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      const text = target.textContent?.trim().replace(/\s+/g, ' ').slice(0, 250) || ''
      const compNames = getReactComponents(target)
      const selector = getSelectorPath(target)

      const info: SelectedElementInfo = {
        tag: target.tagName.toLowerCase(),
        id: target.id || '',
        classes: typeof target.className === 'string' ? target.className : '',
        text,
        placeholder: target.getAttribute('placeholder') || undefined,
        name: target.getAttribute('name') || undefined,
        ariaLabel: target.getAttribute('aria-label') || undefined,
        selectorPath: selector,
        reactComponents: compNames,
        activeView: activeView || (typeof window !== 'undefined' && window.location.hash ? window.location.hash.replace(/^#\/?/, '') : 'global'),
        timestamp: new Date().toISOString()
      }

      setSelectedInfo(info)
      syncSelectedElement(info)
      setIsModalOpen(true)
      setIsActive(false)
      setHoverRect(null)
      setUserNotes('')
      setCopied(false)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsActive(false)
        setHoverRect(null)
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('click', handleClick, { capture: true })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick, { capture: true })
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive, activeView, getReactComponents, getSelectorPath, syncSelectedElement])

  const generatePromptText = () => {
    if (!selectedInfo) return ''
    const compText = selectedInfo.reactComponents.length > 0 
      ? selectedInfo.reactComponents.join(' -> ') 
      : 'Komponen umum'
    
    return [
      `Tolong edit bagian konten ini di aplikasi:`,
      `- Halaman/View: ${selectedInfo.activeView || 'Tidak spesifik'}`,
      `- Komponen React: ${compText}`,
      `- Elemen HTML: <${selectedInfo.tag}${selectedInfo.id ? ` id="${selectedInfo.id}"` : ''}>`,
      selectedInfo.text ? `- Teks/Konten saat ini: "${selectedInfo.text}"` : '',
      `- Path Selektor: ${selectedInfo.selectorPath}`,
      userNotes ? `\nCatatan Perubahan:\n${userNotes}` : `\nCatatan Perubahan: (Silakan beri instruksi perubahan yang Anda inginkan)`
    ].filter(Boolean).join('\n')
  }

  const handleCopyPrompt = () => {
    const text = generatePromptText()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <>
      {/* ── Floating Pencil Launcher Button ── */}
      <div 
        data-dev-inspector="true"
        className="fixed bottom-24 left-4 z-[99999] pointer-events-auto select-none"
      >
        <button
          onClick={() => setIsActive(!isActive)}
          title="Inspektor Pensil: Klik untuk memilih bagian layar yang ingin diedit (Khusus Localhost)"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full shadow-2xl backdrop-blur-md transition-all duration-300 font-bold text-xs border ${
            isActive
              ? 'bg-amber-500 text-white border-amber-300 shadow-amber-500/50 scale-105 ring-4 ring-amber-300/40 animate-pulse'
              : 'bg-slate-900/90 hover:bg-slate-900 text-amber-300 border-amber-500/40 hover:border-amber-400 hover:scale-105 shadow-black/40'
          }`}
        >
          {/* Pencil SVG Icon */}
          <span className={`w-5 h-5 flex items-center justify-center rounded-full ${isActive ? 'bg-white text-amber-600' : 'bg-amber-500/20 text-amber-300'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </span>
          <span className="tracking-wide">
            {isActive ? 'Mode Pilih Aktif' : 'Pilih Konten'}
          </span>
          {isActive && (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">
              ESC batal
            </span>
          )}
        </button>
      </div>

      {/* ── Hover Box Overlay (Saat Mode Inspeksi Aktif) ── */}
      {isActive && hoverRect && (
        <div 
          data-dev-inspector="true"
          style={{
            position: 'fixed',
            top: `${hoverRect.top}px`,
            left: `${hoverRect.left}px`,
            width: `${hoverRect.width}px`,
            height: `${hoverRect.height}px`,
            zIndex: 99998,
            pointerEvents: 'none',
          }}
          className="border-2 border-amber-500 bg-amber-500/15 rounded transition-all duration-75 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
        >
          {/* Tag Tooltip Badge */}
          <div 
            style={{
              position: 'absolute',
              top: hoverRect.top > 28 ? '-26px' : '4px',
              left: '0px',
            }}
            className="bg-amber-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap overflow-hidden max-w-[320px] text-ellipsis pointer-events-none"
          >
            {hoverLabel}
          </div>
        </div>
      )}

      {/* ── Modal Dialog Detail Seleksi Konten ── */}
      {isModalOpen && selectedInfo && (
        <div 
          data-dev-inspector="true"
          className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 text-slate-800 dark:text-slate-100 flex flex-col gap-4 relative animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    <path d="m15 5 4 4"/>
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                    Konten Terpilih untuk Diedit
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Info ini otomatis terhubung ke AI (Tersimpan di Dev Server)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Info Badges */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-750">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Halaman / View</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                  {selectedInfo.activeView || 'Global'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-750">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Komponen React</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate block" title={selectedInfo.reactComponents.join(' > ')}>
                  {selectedInfo.reactComponents[0] || 'Tag HTML'}
                </span>
              </div>
            </div>

            {/* Element Detail */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-750 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                <span>Tag: <strong className="text-amber-600 dark:text-amber-400">&lt;{selectedInfo.tag}&gt;</strong></span>
                {selectedInfo.id && <span>id: <strong>#{selectedInfo.id}</strong></span>}
              </div>
              {selectedInfo.text && (
                <div className="mt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Teks / Konten Saat Ini:</span>
                  <p className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 italic text-[11px] line-clamp-3">
                    "{selectedInfo.text}"
                  </p>
                </div>
              )}
              <div className="mt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Selektor:</span>
                <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {selectedInfo.selectorPath}
                </p>
              </div>
            </div>

            {/* Catatan User */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Tulis Perubahan yang Diinginkan (Opsional):
              </label>
              <textarea
                value={userNotes}
                onChange={e => setUserNotes(e.target.value)}
                placeholder="Contoh: Ubah warna tombol jadi biru, ganti teks 'Simpan' jadi 'Kirim', perlebar kolom ini..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none text-slate-900 dark:text-white"
              />
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyPrompt}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs shadow-lg transition-all ${
                  copied 
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30' 
                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30 hover:scale-[1.01]'
                }`}
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                    <span>Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                    <span>Salin Pesan untuk Chat AI</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setIsActive(true)
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                title="Pilih bagian lain di layar"
              >
                Pilih Lain
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-400">
              💡 Tip: Data elemen ini juga otomatis disinkronkan ke dev server. Anda cukup bilang ke AI: <em>"Ubah bagian yang baru saja saya klik"</em>.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default DevInspector
