import React, { useState, useRef, useEffect, useCallback } from 'react'
import { parseAppIntent, findStokProduct, answerFromKB, callGroqAPI, VIEW_MAP, type ChatMessage } from '../lib/botEngine'
import { supabase } from '../lib/supabase'

export type CustomIntent = {
  question: string;
  type: 'navigate' | 'text';
  target: string;
};

// ── Bot SVG Icon ──────────────────────────────────────────────────────────────
const BotIcon: React.FC<{ size?: number; className?: string }> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="11" cy="7" r="2.5" fill="currentColor" opacity="0.85"/>
    <line x1="11" y1="9.5" x2="15" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="37" cy="7" r="2.5" fill="currentColor" opacity="0.85"/>
    <line x1="37" y1="9.5" x2="33" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 16C6 12.686 8.686 10 12 10H36C39.314 10 42 12.686 42 16V30C42 33.314 39.314 36 36 36H28L24 42L20 36H12C8.686 36 6 33.314 6 30V16Z" fill="currentColor"/>
    <rect x="4" y="19" width="4" height="8" rx="2" fill="currentColor" opacity="0.7"/>
    <rect x="40" y="19" width="4" height="8" rx="2" fill="currentColor" opacity="0.7"/>
    <path d="M17 22 Q18 20 19 22" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M29 22 Q30 20 31 22" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M18 27 Q24 32 30 27" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
  </svg>
)

// ── Types ─────────────────────────────────────────────────────────────────────
interface BotMessage {
  id: string
  from: 'user' | 'bot'
  text: string
  mode?: 'app' | 'kb' | 'groq' | 'error'
}

interface Props {
  activeView: string
  setActiveView: (v: string) => void
  setBotSearchQuery: (q: string | undefined) => void
  setBotActiveTab: (t: string | undefined) => void
  activeStoreId: string
  currentUsername: string
  kasirRole: string
  groqApiKey: string
  onSaveGroqKey: (key: string) => Promise<void>
  onClearGroqKey: () => Promise<void>
  kasirList?: Record<string, any>
  transactions?: any[]
  absensiList?: any[]
}

// ── Mode Badge ────────────────────────────────────────────────────────────────
const ModeBadge: React.FC<{ mode?: string }> = ({ mode }) => {
  if (!mode) return null
  const cfg: Record<string, { label: string; color: string }> = {
    app:   { label: '📱 Aplikasi', color: 'bg-blue-500/30 text-blue-200' },
    kb:    { label: '📚 Offline',  color: 'bg-emerald-500/30 text-emerald-200' },
    groq:  { label: '🌐 Groq AI', color: 'bg-violet-500/30 text-violet-200' },
    error: { label: '⚠️ Error',    color: 'bg-rose-500/30 text-rose-200' },
  }
  const c = cfg[mode]; if (!c) return null
  return <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ml-1 ${c.color}`}>{c.label}</span>
}

// ── Render Text (markdown-lite) ───────────────────────────────────────────────
function renderText(text: string) {
  return text.split('\n').map((line, li, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    const rendered = parts.map((p, pi) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={pi}>{p.slice(2,-2)}</strong>
      if (p.startsWith('*') && p.endsWith('*')) return <em key={pi} className="text-indigo-300 not-italic">{p.slice(1,-1)}</em>
      if (p.startsWith('`') && p.endsWith('`')) return <code key={pi} className="bg-white/10 px-1 rounded text-xs font-mono">{p.slice(1,-1)}</code>
      return <span key={pi}>{p}</span>
    })
    return <span key={li}>{rendered}{li < arr.length-1 && <br/>}</span>
  })
}

// ── GROQ KEY STORAGE ──────────────────────────────────────────────────────────
const GROQ_KEY = 'alphaPro_groq_api_key'

// Helper for dynamic suggestions based on user query history
const getDynamicSuggestions = () => {
  const histStr = localStorage.getItem('alphaPro_bot_query_history')
  let hist: Record<string, number> = {}
  try { if (histStr) hist = JSON.parse(histStr) } catch {}
  
  // Sort queries by frequency
  const sorted = Object.entries(hist)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .filter(q => q !== 'bantuan' && q !== 'help' && q.length > 2)
    .slice(0, 3) // Get top 3
  
  const defaults = ['bantuan', 'ke laporan', 'tanya stok axis', 'tips bisnis']
  // Merge and enforce maximum of 6 suggestion chips
  return Array.from(new Set([...sorted, ...defaults])).slice(0, 6)
}

// ── Main Component ────────────────────────────────────────────────────────────
const AssistantBot: React.FC<Props> = ({ 
  activeView, 
  setActiveView, 
  setBotSearchQuery, 
  setBotActiveTab, 
  activeStoreId, 
  currentUsername, 
  groqApiKey, 
  onSaveGroqKey, 
  onClearGroqKey,
  kasirList = {},
  transactions = [],
  absensiList = []
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // Custom Intent Learning States
  const [customIntents, setCustomIntents] = useState<CustomIntent[]>([])
  const [showTeachModal, setShowTeachModal] = useState(false)
  const [teachQuestion, setTeachQuestion] = useState('')
  const [teachType, setTeachType] = useState<'navigate' | 'text'>('text')
  const [teachTarget, setTeachTarget] = useState('')
  const [messages, setMessages] = useState<BotMessage[]>([{
    id: 'welcome', from: 'bot', mode: 'kb',
    text: '👋 Halo! Aku **Bot Alpha**.\n\nAku bisa bantu navigasi, cek stok, kalkulator bisnis, info operator, dan banyak lagi!\n\nKetik *bantuan* untuk panduan lengkap. 😊',
  }])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [groqKeyInput, setGroqKeyInput] = useState('')
  const [groqStatus, setGroqStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>(['bantuan', 'ke laporan', 'tanya stok axis', 'tips bisnis'])
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const groqHistory = useRef<ChatMessage[]>([])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
      if (!showSettings && !showTeachModal) setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [isOpen, messages, showSettings, showTeachModal])

  // Load Custom Intents
  useEffect(() => {
    if (!activeStoreId) return
    try {
      const loc = localStorage.getItem(`alphaPro_${activeStoreId}_bot_knowledge`)
      if (loc) setCustomIntents(JSON.parse(loc))
    } catch (e) {}
    
    supabase.from('store_settings').select('voucher_app_data').eq('store_id', activeStoreId).maybeSingle().then(({ data }) => {
      if (data?.voucher_app_data?.bot_knowledge) {
        setCustomIntents(data.voucher_app_data.bot_knowledge)
        localStorage.setItem(`alphaPro_${activeStoreId}_bot_knowledge`, JSON.stringify(data.voucher_app_data.bot_knowledge))
      }
    })
  }, [activeStoreId])

  // Load initial suggestions
  useEffect(() => {
    setSuggestions(getDynamicSuggestions())
  }, [isOpen])

  const addMessage = useCallback((from: 'user'|'bot', text: string, mode?: BotMessage['mode']) => {
    setMessages(prev => [...prev, { id: Date.now()+Math.random()+'', from, text, mode }])
  }, [])

  const handleSend = useCallback(async (rawText?: string) => {
    const text = (rawText ?? input).trim()
    if (!text || isTyping) return
    setInput('')
    
    if (text.toLowerCase() === 'ajari bot') {
      const lastUserMsg = [...messages].reverse().find(m => m.from === 'user' && m.text.toLowerCase() !== 'ajari bot')
      setTeachQuestion(lastUserMsg ? lastUserMsg.text : '')
      setShowTeachModal(true)
      return
    }

    addMessage('user', text)
    setIsTyping(true)

    // Save query to history for suggestions learning
    const queryLower = text.toLowerCase().trim()
    if (queryLower.length > 2) {
      try {
        const histStr = localStorage.getItem('alphaPro_bot_query_history')
        let hist: Record<string, number> = {}
        if (histStr) hist = JSON.parse(histStr)
        hist[queryLower] = (hist[queryLower] || 0) + 1
        localStorage.setItem('alphaPro_bot_query_history', JSON.stringify(hist))
      } catch (e) {}
    }

    // ⓪ Cek Custom Intent (Learned by Bot)
    const customMatch = customIntents.find(ci => queryLower.includes(ci.question.toLowerCase()))
    if (customMatch) {
      setIsTyping(false)
      if (customMatch.type === 'navigate') {
        const viewInfo = VIEW_MAP[customMatch.target]
        if (viewInfo) {
          setBotSearchQuery(undefined); setBotActiveTab(undefined)
          setActiveView(viewInfo.view)
          addMessage('bot', `✅ Sesuai yang diajarkan, pindah ke **${viewInfo.label}**.`, 'app')
        }
      } else {
        addMessage('bot', customMatch.target, 'app')
      }
      setSuggestions(getDynamicSuggestions())
      return
    }

    // ① Coba App Intent dulu
    const intent = parseAppIntent(text)
    if (intent.type === 'navigate') {
      setBotSearchQuery(undefined)
      setBotActiveTab(intent.tab)
      setActiveView(intent.view)
      setIsTyping(false)
      const tabLabels: Record<string, string> = {
        stok: 'Atur Stok',
        riwayat: 'Riwayat Serah Terima',
        produk: 'Daftar Voucher',
        laporan: 'Laporan Finansial',
        beranda: 'Menu Utama',
        notif: 'Log Aktivitas'
      }
      const tabName = intent.tab ? tabLabels[intent.tab] || intent.tab : ''
      const msg = intent.tab 
        ? `✅ Pindah ke halaman **${intent.label}** di bagian **${tabName}**.`
        : `✅ Pindah ke halaman **${intent.label}**.`
      addMessage('bot', msg, 'app')
      setSuggestions(getDynamicSuggestions())
      return
    }
    if (intent.type === 'ambiguous') {
      setIsTyping(false)
      addMessage('bot', intent.message, 'app')
      setSuggestions(intent.suggestions)
      return
    }
    if (intent.type === 'edit_stok') {
      setBotSearchQuery(intent.query); setBotActiveTab('stok')
      setActiveView('view-stok-voucher')
      setIsTyping(false)
      addMessage('bot', `🔍 Membuka **Stok Voucher** dengan filter *"${intent.query}"*.\n\nKlik tombol **Edit** pada produk yang muncul untuk ubah stok secara manual.`, 'app')
      setSuggestions(getDynamicSuggestions())
      return
    }
    if (intent.type === 'tanya_stok') {
      const r = findStokProduct(intent.query, activeStoreId, currentUsername)
      setIsTyping(false)
      if (r.found) addMessage('bot', `📦 Stok **${r.name}** tersisa **${r.stock} pcs**.`, 'app')
      else addMessage('bot', `❌ Voucher *"${intent.query}"* tidak ditemukan.\n\nBuka halaman Stok Voucher minimal sekali agar data tersimpan.`, 'app')
      setSuggestions(getDynamicSuggestions())
      return
    }

    // ② Coba Knowledge Base lokal (offline database intelligence)
    await new Promise(r => setTimeout(r, 400))
    const kbAnswer = answerFromKB(text, activeStoreId, currentUsername, kasirList, transactions, absensiList)
    if (kbAnswer) {
      setIsTyping(false)
      addMessage('bot', kbAnswer, 'kb')
      setSuggestions(getDynamicSuggestions())
      return
    }

    // ③ Groq API (jika ada key)
    const activeKey = groqApiKey || localStorage.getItem(GROQ_KEY) || ''
    if (activeKey) {
      try {
        const reply = await callGroqAPI(text, groqHistory.current, activeKey)
        groqHistory.current = [...groqHistory.current, { role: 'user' as const, content: text }, { role: 'assistant' as const, content: reply }].slice(-12)
        setIsTyping(false)
        addMessage('bot', reply, 'groq')
      } catch (e: any) {
        setIsTyping(false)
        addMessage('bot', `⚠️ **Groq Error:** ${e.message}`, 'error')
      }
      setSuggestions(getDynamicSuggestions())
      return
    }

    // ④ Fallback
    setIsTyping(false)
    addMessage('bot', `🤔 Maaf, aku belum tahu jawaban itu.\n\nJika ini perintah baru, kamu bisa mengajariku dengan klik **Ajari Bot** di bawah ini.`, 'kb')
    setSuggestions(['Ajari Bot', ...getDynamicSuggestions()])
  }, [input, isTyping, addMessage, setActiveView, setBotSearchQuery, setBotActiveTab, activeStoreId, currentUsername, groqApiKey, kasirList, transactions, absensiList, customIntents, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key==='Enter') handleSend() }

  const handleSaveGroqKey = async () => {
    const k = groqKeyInput.trim()
    if (!k.startsWith('gsk_')) { setGroqStatus('error'); return }
    setIsSavingKey(true)
    await onSaveGroqKey(k)
    setIsSavingKey(false)
    setGroqStatus('saved')
    setTimeout(() => { setGroqStatus('idle'); setGroqKeyInput(''); setShowSettings(false) }, 1500)
  }
  const handleClearGroqKey = async () => { await onClearGroqKey(); setGroqKeyInput(''); setGroqStatus('idle') }

  const handleSaveTeach = async () => {
    const newIntent: CustomIntent = { question: teachQuestion.trim(), type: teachType, target: teachTarget.trim() }
    const updated = [...customIntents, newIntent]
    setCustomIntents(updated)
    localStorage.setItem(`alphaPro_${activeStoreId}_bot_knowledge`, JSON.stringify(updated))
    setShowTeachModal(false)
    addMessage('bot', `✅ Mantap! Aku sudah belajar cara merespons **"${newIntent.question}"**.\nPengetahuan ini sudah tersimpan online untuk semua akun kasir toko ini!`, 'app')
    setTeachQuestion('')
    setTeachTarget('')
    
    // Background sync
    supabase.from('store_settings').select('voucher_app_data').eq('store_id', activeStoreId).maybeSingle().then(({ data }) => {
      const existingData = data?.voucher_app_data || {}
      const newData = { ...existingData, bot_knowledge: updated }
      supabase.from('store_settings').upsert({
        store_id: activeStoreId,
        voucher_app_data: newData
      }, { onConflict: 'store_id' }).then()
    })
  }

  const effectiveGroqKey = groqApiKey || localStorage.getItem(GROQ_KEY) || ''
  const hasGroqKey = !!effectiveGroqKey

  return (
    <>
      {/* ── FAB Button ──────────────────────────────────────────────────────── */}
      <button
        id="bot-fab-btn"
        onClick={() => { setIsOpen(p=>!p); setShowSettings(false) }}
        title="Asisten Bot Alpha"
        style={{ backdropFilter:'blur(12px)' }}
        className={`fixed top-16 right-3 z-[998] w-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 py-1.5 shadow-lg transition-all duration-300 active:scale-90 ${isOpen ? 'bg-indigo-700 shadow-indigo-600/50' : 'bg-gradient-to-br from-indigo-500 to-violet-600 hover:scale-110 shadow-indigo-500/40'}`}
      >
        {isOpen ? (
          <span className="text-base font-black text-white leading-none">✕</span>
        ) : (
          <>
            <BotIcon size={22} className="text-white"/>
            <span className="text-white font-black leading-none select-none" style={{ fontSize: '7px', letterSpacing: '0.15em' }}>ALPHA</span>
          </>
        )}
        {!isOpen && <span className="absolute inset-0 rounded-2xl bg-indigo-400 opacity-30 animate-ping pointer-events-none"/>}
      </button>

      {/* ── Chat Panel ──────────────────────────────────────────────────────── */}
      <div
        id="bot-chat-panel"
        style={{ background:'linear-gradient(160deg,#1a1050 0%,#0f0930 60%,#0d0726 100%)', maxHeight:'calc(100dvh - 80px)' }}
        className={`fixed top-[68px] right-3 z-[997] w-[min(320px,calc(100vw-24px))] rounded-3xl overflow-hidden shadow-2xl shadow-black/30 border border-white/10 flex flex-col transition-all duration-300 origin-top-right ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10 shrink-0" style={{ background:'linear-gradient(90deg,#4f46e5 0%,#7c3aed 100%)' }}>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <BotIcon size={20} className="text-white"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white font-black text-[11px] uppercase tracking-widest leading-none">Bot Alpha</p>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasGroqKey ? 'bg-emerald-400' : 'bg-amber-400'}`} title={hasGroqKey?'Groq AI aktif':'Mode offline'}/>
            </div>
            <p className="text-indigo-200 text-[9px] font-bold mt-0.5">
              {hasGroqKey ? '🌐 Groq AI + Offline KB' : '📚 Mode Offline — Set Groq key di ⚙️'}
            </p>
          </div>
          <button onClick={()=>{setShowSettings(p=>!p);setShowTeachModal(false)}} title="Settings" className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 active:scale-90 ${showSettings?'bg-white/30 text-white':'bg-white/15 hover:bg-white/25 text-white/70'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </button>
          <button onClick={()=>{setIsOpen(false);setShowSettings(false);setShowTeachModal(false)}} className="w-7 h-7 rounded-xl bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-all shrink-0 active:scale-90 ml-0.5">
            <span className="text-[11px] font-black">✕</span>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-4 py-3 border-b border-white/10 shrink-0 space-y-3" style={{ background:'rgba(255,255,255,0.04)' }}>
            <p className="text-white font-black text-[10px] uppercase tracking-widest">⚙️ Groq API Key</p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <p className="text-indigo-200 text-[9px] leading-relaxed">
                Dapatkan key gratis di{' '}
                <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-violet-300 underline font-bold">console.groq.com</a>
                {' '}→ API Keys → Create Key
              </p>
              {hasGroqKey && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"/>
                  <span className="text-emerald-300 text-[9px] font-bold flex-1">Key aktif: {effectiveGroqKey.slice(0,8)}•••</span>
                  <button onClick={handleClearGroqKey} className="text-rose-400 text-[9px] font-black hover:text-rose-300 transition-colors">Hapus</button>
                </div>
              )}
              <input
                type="password"
                value={groqKeyInput}
                onChange={e=>{ setGroqKeyInput(e.target.value); setGroqStatus('idle') }}
                placeholder={hasGroqKey ? 'Masukkan key baru...' : 'gsk_xxxxxxxxxxxxxxxxxx'}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-[10px] font-mono text-white placeholder:text-indigo-300/50 focus:outline-none focus:border-indigo-400/60 transition-all"
              />
              <button
                onClick={handleSaveGroqKey}
                disabled={!groqKeyInput.trim() || isSavingKey}
                className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 ${groqStatus==='saved'?'bg-emerald-600 text-white':groqStatus==='error'?'bg-rose-600 text-white':'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'}`}
              >
                {isSavingKey ? '⏳ Menyimpan & sync cloud...' : groqStatus==='saved' ? '✓ Tersimpan & Disync!' : groqStatus==='error' ? '✗ Key tidak valid (harus gsk_...)' : '💾 Simpan & Sync ke Cloud'}
              </button>
            </div>
            <p className="text-indigo-300/60 text-[8.5px] text-center">Free: 14.400 req/hari • Model: llama-3.1-8b • 🌐 Sync Supabase</p>
          </div>
        )}

        {/* Teach Bot Panel */}
        {showTeachModal && (
          <div className="px-4 py-3 border-b border-white/10 shrink-0 space-y-3" style={{ background:'rgba(255,255,255,0.04)' }}>
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1">🎓 Ajari Bot Alpha</h3>
            </div>
            
            <div className="text-[10px] text-slate-300">
              Ajari bot merespons perintah khusus. Tersimpan online.
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Jika ditanya:</label>
                <input 
                  value={teachQuestion} 
                  onChange={e => setTeachQuestion(e.target.value)}
                  placeholder="Misal: izin kasir"
                  className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-emerald-500/60 transition-all"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Tindakan Bot:</label>
                <select 
                  value={teachType} 
                  onChange={e => setTeachType(e.target.value as any)}
                  className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-emerald-500/60 transition-all appearance-none"
                >
                  <option value="text">Jawab dengan Teks</option>
                  <option value="navigate">Pindah ke Halaman</option>
                </select>
              </div>

              {teachType === 'navigate' ? (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Pilih Halaman:</label>
                  <select 
                    value={teachTarget} 
                    onChange={e => setTeachTarget(e.target.value)}
                    className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-emerald-500/60 transition-all appearance-none"
                  >
                    <option value="">-- Pilih Halaman --</option>
                    {Object.entries(VIEW_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Jawaban Bot:</label>
                  <textarea 
                    value={teachTarget} 
                    onChange={e => setTeachTarget(e.target.value)}
                    placeholder="Misal: Untuk izin, silakan WA Owner..."
                    className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-[10px] text-white resize-none h-14 outline-none focus:border-emerald-500/60 transition-all"
                  />
                </div>
              )}
              
              <button 
                onClick={handleSaveTeach} 
                disabled={!teachQuestion.trim() || !teachTarget.trim()} 
                className="mt-1 w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] uppercase tracking-widest font-black py-2.5 rounded-xl transition-all active:scale-95"
              >
                Simpan Pengetahuan
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {!showSettings && !showTeachModal && (
          <>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" style={{ minHeight:'180px', maxHeight:'340px' }}>
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.from==='user'?'justify-end':'justify-start'}`}>
                  {msg.from==='bot' && (
                    <div className="w-6 h-6 rounded-lg bg-indigo-600/60 flex items-center justify-center shrink-0 mr-1.5 mt-0.5 shadow">
                      <BotIcon size={15} className="text-white"/>
                    </div>
                  )}
                  <div className={`max-w-[82%] flex flex-col gap-0.5 ${msg.from==='user'?'items-end':''}`}>
                    {msg.from==='bot' && <ModeBadge mode={msg.mode}/>}
                    <div className={`px-3 py-2 rounded-2xl text-[11px] font-medium leading-relaxed shadow ${msg.from==='user'?'bg-indigo-600 text-white rounded-tr-sm':'bg-white/10 text-slate-100 rounded-tl-sm border border-white/10'}`}>
                      {renderText(msg.text)}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600/60 flex items-center justify-center shrink-0 shadow"><BotIcon size={15} className="text-white"/></div>
                  <div className="bg-white/10 px-3 py-2 rounded-2xl rounded-tl-sm border border-white/10 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay:'0ms'}}/>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay:'150ms'}}/>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay:'300ms'}}/>
                  </div>
                </div>
              )}
              <div ref={endRef}/>
            </div>

            {/* Dynamic Suggestions */}
            <div className="px-3 pb-1.5 flex gap-1.5 overflow-x-auto shrink-0" style={{scrollbarWidth:'none'}}>
              {suggestions.map(s => (
                <button key={s} onClick={()=>handleSend(s)} className="shrink-0 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[9.5px] font-bold text-indigo-200 hover:bg-indigo-600/40 hover:text-white transition-all active:scale-90 whitespace-nowrap">
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-1 shrink-0 flex gap-2 items-center">
              <input
                ref={inputRef}
                id="bot-chat-input"
                type="text"
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasGroqKey ? 'Tanya apa saja...' : 'Ketik perintah atau pertanyaan...'}
                className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-3 py-2.5 text-[11px] font-medium text-white placeholder:text-indigo-300/60 focus:outline-none focus:border-indigo-400/70 focus:bg-white/15 transition-all"
              />
              <button
                id="bot-send-btn"
                onClick={()=>handleSend()}
                disabled={!input.trim()||isTyping}
                className="w-9 h-9 rounded-2xl shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 active:scale-90 transition-all disabled:opacity-40 disabled:scale-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default AssistantBot
