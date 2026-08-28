import React, { useState, useRef, useEffect, useCallback } from 'react'
import { parseAppIntent, findStokProduct, answerFromKB, callGeminiAPI, buildSystemPrompt, buildStoreContext, parseBotActions, VIEW_MAP, type ChatMessage, type BotAction } from '../lib/botEngine'
import { supabase } from '../lib/supabase'
import { motion } from 'motion/react'

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
  mode?: 'app' | 'kb' | 'gemini' | 'error'
  timestamp?: number
}

interface Props {
  activeView: string
  setActiveView: (v: string) => void
  setBotSearchQuery: (q: string | undefined) => void
  setBotActiveTab: (t: string | undefined) => void
  activeStoreId: string
  currentUsername: string
  kasirRole: string
  kasirName?: string
  geminiApiKey: string
  onSaveGeminiKey: (key: string) => Promise<void>
  onClearGeminiKey: () => Promise<void>
  kasirList?: Record<string, any>
  transactions?: any[]
  absensiList?: any[]
  voucherTransactions?: any[]
  voucherProducts?: any[]
  // Handlers untuk AI Action (No. 3)
  onActionKasbon?: (nama: string, nominal: number, keterangan: string) => void
  onActionKontak?: (nama: string, nomor: string, keterangan: string) => void
  onActionIzin?: (username: string, tanggal: string, alasan: string) => void
  onActionCatatan?: (judul: string, isi: string) => void
}

// ── Mode Badge ────────────────────────────────────────────────────────────────
const ModeBadge: React.FC<{ mode?: string }> = ({ mode }) => {
  if (!mode) return null
  const cfg: Record<string, { label: string; color: string }> = {
    app:    { label: '📱 Aplikasi',  color: 'bg-blue-500/30 text-blue-200' },
    kb:     { label: '📚 Offline',   color: 'bg-emerald-500/30 text-emerald-200' },
    gemini: { label: '✨ Gemini AI', color: 'bg-violet-500/30 text-violet-200' },
    error:  { label: '⚠️ Error',     color: 'bg-rose-500/30 text-rose-200' },
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

// ── GEMINI KEY STORAGE ────────────────────────────────────────────────────────
const GEMINI_KEY = 'alphaPro_gemini_api_key'

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
  kasirRole,
  kasirName,
  geminiApiKey, 
  onSaveGeminiKey, 
  onClearGeminiKey,
  kasirList = {},
  transactions = [],
  absensiList = [],
  voucherTransactions = [],
  voucherProducts = [],
  onActionKasbon,
  onActionKontak,
  onActionIzin,
  onActionCatatan
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // Custom Intent Learning States
  const [customIntents, setCustomIntents] = useState<CustomIntent[]>([])
  const [showTeachModal, setShowTeachModal] = useState(false)
  const [teachQuestion, setTeachQuestion] = useState('')
  const [teachType, setTeachType] = useState<'navigate' | 'text'>('text')
  const [teachTarget, setTeachTarget] = useState('')
  const [messages, setMessages] = useState<BotMessage[]>([])
  
  // Load riwayat obrolan khusus akun (owner/kasir) & toko
  useEffect(() => {
    const historyKey = `alphaPro_${activeStoreId}_bot_history_${currentUsername}`
    try {
      const saved = localStorage.getItem(historyKey)
      if (saved) {
        const parsed = JSON.parse(saved) as BotMessage[]
        const now = Date.now()
        // Tampilkan pesan 2 hari terakhir saja
        const recentMessages = parsed.filter(m => !m.timestamp || (now - m.timestamp < 2 * 24 * 60 * 60 * 1000))
        if (recentMessages.length > 0) {
          setMessages(recentMessages)
          return
        }
      }
    } catch(e) {}
    
    // Default welcome
    setMessages([{
      id: 'welcome', from: 'bot', mode: 'kb',
      text: '👋 Halo! Aku **Bot Alpha**.\n\nAku bisa bantu navigasi, cek stok, kalkulator bisnis, info operator, dan banyak lagi!\n\nKetik *bantuan* untuk panduan lengkap. 😊',
      timestamp: Date.now()
    }])
  }, [activeStoreId, currentUsername])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [geminiKeyInput, setGeminiKeyInput] = useState('')
  const [geminiStatus, setGeminiStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>(['bantuan', 'rekap voucher hari ini', 'stok menipis', 'ke laporan'])
  const [historyFilter, setHistoryFilter] = useState<'all' | 'today' | 'yesterday'>('all')
  const [showHistoryMenu, setShowHistoryMenu] = useState(false)
  const [pendingActions, setPendingActions] = useState<BotAction[] | null>(null)
  const [pendingActionSummary, setPendingActionSummary] = useState<string>('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const geminiHistory = useRef<ChatMessage[]>([])
  const systemPromptRef = useRef<string>('')

  // Drag to scroll logic for suggestions
  const [isDragging, setIsDragging] = useState(false)
  const [dragMoved, setDragMoved] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeftPos, setScrollLeftPos] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragMoved(false)
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0))
    setScrollLeftPos(scrollRef.current?.scrollLeft || 0)
  }
  const handleMouseLeave = () => setIsDragging(false)
  const handleMouseUp = () => setIsDragging(false)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5 // multiplier
    scrollRef.current.scrollLeft = scrollLeftPos - walk
    if (Math.abs(walk) > 5) setDragMoved(true)
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const savedScroll = localStorage.getItem('alphaPro_bot_scroll')
        if (savedScroll && chatContainerRef.current) {
          chatContainerRef.current.scrollTop = parseInt(savedScroll, 10)
        } else {
          endRef.current?.scrollIntoView({ behavior: 'auto' })
        }
      }, 80)
      if (!showSettings && !showTeachModal) setTimeout(() => inputRef.current?.focus(), 120)
      // Build dynamic system prompt setiap kali bot dibuka (data selalu fresh)
      const role = kasirRole === 'owner' ? 'owner' : 'kasir'
      const ctx = buildStoreContext(role, activeStoreId, kasirName || currentUsername, kasirList, transactions, absensiList, voucherTransactions, voucherProducts)
      systemPromptRef.current = buildSystemPrompt(ctx)

      // ── Auto Stok Warning saat bot pertama kali dibuka hari ini ──
      const warnKey = `alphaPro_${activeStoreId}_bot_stok_warn_${new Date().toISOString().split('T')[0]}`
      if (!localStorage.getItem(warnKey)) {
        // Cek produk menipis dari voucherProducts prop atau localStorage
        let allProds = voucherProducts.length > 0 ? voucherProducts : []
        if (allProds.length === 0) {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i) || ''
              if (k.startsWith(`v_${activeStoreId}`) && k.endsWith('_products')) {
                const raw = localStorage.getItem(k)
                if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) allProds = [...allProds, ...p] }
              }
            }
            const seen = new Set()
            allProds = allProds.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
          } catch {}
        }
        const menipis = allProds.filter(p => (p.currentStock ?? p.stock ?? 0) <= (p.minStockLevel ?? 3))
        if (menipis.length > 0) {
          setTimeout(() => {
            const names = menipis.slice(0, 3).map(p => p.name).join(', ')
            const extra = menipis.length > 3 ? ` +${menipis.length - 3} lainnya` : ''
            setMessages(prev => {
              const warn: BotMessage = {
                id: 'stok-warn-' + Date.now(),
                from: 'bot',
                mode: 'app',
                text: `⚠️ **Peringatan Stok Menipis!**\n\n${menipis.length} produk hampir habis: **${names}**${extra}.\n\nKetik *"stok menipis"* untuk detail lengkap.`,
                timestamp: Date.now()
              }
              return [...prev, warn]
            })
            localStorage.setItem(warnKey, '1')
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
          }, 800)
        }
      }
    }
  }, [isOpen, messages, showSettings, showTeachModal, kasirRole, activeStoreId, kasirName, currentUsername, kasirList, transactions, absensiList, voucherProducts])

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
    setMessages(prev => {
      const newMsg: BotMessage = { id: Date.now()+Math.random()+'', from, text, mode, timestamp: Date.now() }
      const newMsgs = [...prev, newMsg]
      const historyKey = `alphaPro_${activeStoreId}_bot_history_${currentUsername}`
      localStorage.setItem(historyKey, JSON.stringify(newMsgs))
      return newMsgs
    })
  }, [activeStoreId, currentUsername])

  const sendTimeoutRef = useRef<any>(null)

  const handleSend = useCallback((rawText?: string) => {
    const text = (rawText ?? input).trim()
    if (!text || isTyping) return
    setInput('')
    
    if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current)
    sendTimeoutRef.current = setTimeout(async () => {
      setHistoryFilter('all')
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

    // ⓪Cek apakah user secara spesifik memanggil Gemini (Bypass Offline DB)
    const isForceGemini = queryLower.startsWith('gemini') || queryLower.startsWith('hey gemini') || queryLower.startsWith('halo gemini') || queryLower.startsWith('tanya gemini')
    const activeKey = geminiApiKey || localStorage.getItem(GEMINI_KEY) || ''

    if (isForceGemini) {
      if (!activeKey) {
        setIsTyping(false)
        addMessage('bot', '⚠️ Kamu mencoba memanggil Gemini, tapi API Key Gemini belum dipasang.\n\nSilakan klik ikon gerigi (⚙️) di atas untuk memasukkan API Key terlebih dahulu.', 'error')
        setSuggestions(getDynamicSuggestions())
        return
      }
      
      try {
        // Hilangkan kata panggilannya agar prompt ke Gemini lebih bersih
        const cleanQuery = text.replace(/^(hey gemini|halo gemini|tanya gemini|gemini)[,\s]*/i, '').trim() || text
        const rawReply = await callGeminiAPI(cleanQuery, geminiHistory.current, activeKey, systemPromptRef.current || undefined)
        const { cleanText, actions } = parseBotActions(rawReply)
        geminiHistory.current = [
          ...geminiHistory.current,
          { role: 'user' as const, parts: [{ text: cleanQuery }] as [{text: string}] },
          { role: 'model' as const, parts: [{ text: cleanText }] as [{text: string}] }
        ].slice(-12)
        setIsTyping(false)
        addMessage('bot', cleanText, 'gemini')
        if (actions.length > 0) setTimeout(() => requestConfirmation(actions), 400)
      } catch (e: any) {
        setIsTyping(false)
        addMessage('bot', `⚠️ **Gemini Error:** ${e.message}`, 'error')
      }
      setSuggestions(getDynamicSuggestions())
      return
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

    if (intent.type === 'set_alarm') {
      setIsTyping(false)
      const ms = intent.minutes * 60 * 1000
      const displayTime = intent.minutes < 1 ? `${Math.round(intent.minutes * 60)} detik` : `${intent.minutes} menit`
      addMessage('bot', `⏰ **Alarm Diatur!**\n\nAku akan mengingatkanmu untuk: **"${intent.message}"** dalam waktu ${displayTime} dari sekarang.`, 'app')
      setSuggestions(getDynamicSuggestions())
      
      setTimeout(() => {
        setMessages(prev => [
          ...prev, 
          {
            id: 'alarm-' + Date.now(),
            from: 'bot',
            mode: 'app',
            text: `🔔 **PENGINGAT (ALARM) !**\n\nSaatnya untuk: **${intent.message}**`,
            timestamp: Date.now()
          }
        ])
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        
        // Coba mainkan notifikasi suara (bip)
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext
          if (AudioContext) {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gainNode = ctx.createGain()
            osc.connect(gainNode)
            gainNode.connect(ctx.destination)
            osc.type = 'triangle'
            osc.frequency.setValueAtTime(800, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1)
            gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.5)
          }
        } catch (e) {}
      }, ms)
      
      return
    }

    // ② Coba Knowledge Base lokal (offline database intelligence)
    await new Promise(r => setTimeout(r, 400))
    const kbAnswer = answerFromKB(text, activeStoreId, currentUsername, kasirList, transactions, absensiList, voucherTransactions, voucherProducts)
    if (kbAnswer) {
      setIsTyping(false)
      addMessage('bot', kbAnswer, 'kb')
      if (kbAnswer.includes('tidak ditemukan')) {
        setSuggestions(['Ajari Bot', ...getDynamicSuggestions()])
      } else {
        setSuggestions(getDynamicSuggestions())
      }
      return
    }

    // ③ Gemini API (jika ada key) — dengan System Prompt berisi Buku Besar & Role-Aware
    if (activeKey) {
      try {
        const reply = await callGeminiAPI(text, geminiHistory.current, activeKey, systemPromptRef.current || undefined)
        // Parse apakah ada AI Action di dalam respon
        const { cleanText, actions } = parseBotActions(reply)
        geminiHistory.current = [
          ...geminiHistory.current,
          { role: 'user' as const, parts: [{ text }] as [{text: string}] },
          { role: 'model' as const, parts: [{ text: cleanText }] as [{text: string}] }
        ].slice(-12)
        setIsTyping(false)
        addMessage('bot', cleanText, 'gemini')
        // Eksekusi AI Action jika ada
        if (actions.length > 0) {
          setTimeout(() => requestConfirmation(actions), 400)
        }
      } catch (e: any) {
        setIsTyping(false)
        addMessage('bot', `⚠️ **Gemini Error:** ${e.message}`, 'error')
      }
      setSuggestions(getDynamicSuggestions())
      return
    }

    // ④ Fallback
    setIsTyping(false)
    addMessage('bot', `🤔 Maaf, aku belum tahu jawaban itu.\n\nJika ini perintah baru, kamu bisa mengajariku dengan klik **Ajari Bot** di bawah ini.`, 'kb')
    setSuggestions(['Ajari Bot', ...getDynamicSuggestions()])
    }, 300)
  }, [input, isTyping, addMessage, setActiveView, setBotSearchQuery, setBotActiveTab, activeStoreId, currentUsername, geminiApiKey, kasirList, transactions, absensiList, customIntents, messages, onActionKasbon, onActionIzin, onActionCatatan, onActionKontak])

  // ── AI Action: Minta Konfirmasi Dulu ─────────────────────────────────────────
  const requestConfirmation = useCallback((actions: BotAction[]) => {
    // Bangun ringkasan aksi yang akan dilakukan untuk ditampilkan ke user
    const summaryLines = actions.map(action => {
      if (action.type === 'kasbon') {
        const nominal = parseInt(action.payload.nominal?.replace(/\D/g, '') || '0', 10)
        return `📝 Catat Kasbon Rp${nominal.toLocaleString('id-ID')} atas nama **${action.payload.nama}**${action.payload.keterangan ? ` (${action.payload.keterangan})` : ''}`
      } else if (action.type === 'kontak') {
        return `📞 Simpan Kontak **${action.payload.nama}** — No. HP: **${action.payload.nomor}**${action.payload.keterangan ? ` (${action.payload.keterangan})` : ''}`
      } else if (action.type === 'navigate') {
        const viewInfo = VIEW_MAP[action.payload.view]
        return `🔀 Pindah ke halaman **${viewInfo?.label || action.payload.view}**`
      } else if (action.type === 'izin') {
        return `📅 Izin kasir **${action.payload.username}** tanggal ${action.payload.tanggal}${action.payload.alasan ? ` — ${action.payload.alasan}` : ''}`
      } else if (action.type === 'catatan') {
        return `📝 Buat catatan baru dengan judul **${action.payload.judul}**`
      }
      return ''
    }).filter(Boolean).join('\n')

    setPendingActions(actions)
    setPendingActionSummary(summaryLines)
  }, [])

  // ── AI Action: Konfirmasi OK — Eksekusi Sekarang ──────────────────────────────
  const confirmExecuteActions = useCallback(() => {
    if (!pendingActions) return
    for (const action of pendingActions) {
      if (action.type === 'kasbon') {
        const nominal = parseInt(action.payload.nominal?.replace(/\D/g, '') || '0', 10)
        if (onActionKasbon && action.payload.nama && nominal > 0) {
          onActionKasbon(action.payload.nama, nominal, action.payload.keterangan || '')
          addMessage('bot', `✅ **Berhasil!** Kasbon Rp${nominal.toLocaleString('id-ID')} atas nama **${action.payload.nama}** sudah dicatat ke sistem.`, 'app')
        }
      } else if (action.type === 'kontak') {
        if (onActionKontak && action.payload.nama && action.payload.nomor) {
          onActionKontak(action.payload.nama, action.payload.nomor, action.payload.keterangan || '')
          addMessage('bot', `✅ **Berhasil!** Kontak **${action.payload.nama}** (${action.payload.nomor}) sudah disimpan ke Buku Kontak.`, 'app')
        }
      } else if (action.type === 'navigate') {
        const viewInfo = VIEW_MAP[action.payload.view]
        if (viewInfo) {
          setActiveView(viewInfo.view)
          addMessage('bot', `✅ **Berhasil!** Berpindah ke halaman **${viewInfo.label}**.`, 'app')
        }
      } else if (action.type === 'izin') {
        if (onActionIzin && action.payload.username && action.payload.tanggal) {
          onActionIzin(action.payload.username, action.payload.tanggal, action.payload.alasan || '')
          addMessage('bot', `✅ **Berhasil!** Izin kasir **${action.payload.username}** untuk ${action.payload.tanggal} sudah dicatat.`, 'app')
        }
      } else if (action.type === 'catatan') {
        if (onActionCatatan && action.payload.judul && action.payload.isi) {
          onActionCatatan(action.payload.judul, action.payload.isi)
          addMessage('bot', `✅ **Berhasil!** Catatan "**${action.payload.judul}**" sudah disimpan ke buku catatan Owner.`, 'app')
        }
      }
    }
    setPendingActions(null)
    setPendingActionSummary('')
  }, [pendingActions, onActionKasbon, onActionKontak, onActionIzin, onActionCatatan, setActiveView, addMessage])

  // ── AI Action: Konfirmasi Batal ───────────────────────────────────────────────
  const cancelActions = useCallback(() => {
    addMessage('bot', '🚫 **Dibatalkan.** Tidak ada perubahan yang dilakukan.', 'kb')
    setPendingActions(null)
    setPendingActionSummary('')
  }, [addMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key==='Enter') handleSend() }

  const handleSaveGeminiKey = async () => {
    const k = geminiKeyInput.trim()
    if (!k) { setGeminiStatus('error'); return }
    setIsSavingKey(true)
    await onSaveGeminiKey(k)
    setIsSavingKey(false)
    setGeminiStatus('saved')
    setTimeout(() => { setGeminiStatus('idle'); setGeminiKeyInput(''); setShowSettings(false) }, 1500)
  }
  const handleClearGeminiKey = async () => { await onClearGeminiKey(); setGeminiKeyInput(''); setGeminiStatus('idle') }

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

  const effectiveGeminiKey = geminiApiKey || localStorage.getItem(GEMINI_KEY) || ''
  const hasGeminiKey = !!effectiveGeminiKey

  return (
    <>
      {/* ── FAB Button ──────────────────────────────────────────────────────── */}
      <motion.button
        id="bot-fab-btn"
        drag
        dragMomentum={false}
        whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
        onClick={() => { setIsOpen(p=>!p); setShowSettings(false) }}
        title="Asisten Bot Alpha"
        style={{ backdropFilter:'blur(12px)' }}
        className={`fixed top-16 right-3 z-[998] w-10 rounded-2xl flex flex-col items-center justify-center gap-0.5 py-1 shadow-lg transition-all duration-300 active:scale-90 ${isOpen ? 'bg-indigo-700 shadow-indigo-600/50' : 'bg-gradient-to-br from-indigo-500 to-violet-600 hover:scale-110 shadow-indigo-500/40'}`}
      >
        {isOpen ? (
          <span className="text-sm font-black text-white leading-none">✕</span>
        ) : (
          <>
            <BotIcon size={18} className="text-white"/>
            <span className="text-white font-black leading-none select-none" style={{ fontSize: '6px', letterSpacing: '0.15em' }}>ALPHA</span>
          </>
        )}
        {!isOpen && <span className="absolute inset-0 rounded-2xl bg-indigo-400 opacity-30 animate-ping pointer-events-none"/>}
      </motion.button>

      {/* ── Chat Panel ──────────────────────────────────────────────────────── */}
      <div
        id="bot-chat-panel"
        style={{ background:'linear-gradient(160deg,#1a1050 0%,#0f0930 60%,#0d0726 100%)', maxHeight:'calc(100dvh - 80px)' }}
        className={`fixed top-[68px] right-3 z-[997] w-[min(320px,calc(100vw-24px))] rounded-3xl overflow-hidden shadow-2xl shadow-black/30 border border-white/10 flex flex-col transition-all duration-300 origin-top-right ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10 shrink-0" style={{ background:'linear-gradient(90deg,#4f46e5 0%,#7c3aed 100%)' }}>
          {/* Hamburger Menu Riwayat */}
          <div className="relative shrink-0">
            <button 
              onClick={() => setShowHistoryMenu(!showHistoryMenu)}
              className={`w-7 h-7 rounded-xl flex flex-col gap-1 items-center justify-center transition-all active:scale-90 ${showHistoryMenu ? 'bg-white/30 text-white' : 'bg-white/15 hover:bg-white/25 text-white/80'}`}
              title="Filter Riwayat"
            >
              <span className="w-3.5 h-0.5 bg-current rounded-full"></span>
              <span className="w-3.5 h-0.5 bg-current rounded-full"></span>
              <span className="w-3.5 h-0.5 bg-current rounded-full"></span>
            </button>
            {showHistoryMenu && (
              <div className="absolute top-full left-0 mt-2 w-32 bg-indigo-950 border border-indigo-500/30 rounded-xl shadow-2xl overflow-hidden z-20 flex flex-col py-1.5" style={{ backdropFilter:'blur(10px)' }}>
                <p className="px-3 py-1.5 text-[8.5px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-500/20 mb-1">Riwayat</p>
                <button onClick={() => { setHistoryFilter('all'); setShowHistoryMenu(false) }} className={`text-left px-3 py-2 text-[10px] font-bold transition-all ${historyFilter === 'all' ? 'text-white bg-indigo-600/60' : 'text-indigo-200 hover:bg-white/10'}`}>Semua</button>
                <button onClick={() => { setHistoryFilter('today'); setShowHistoryMenu(false) }} className={`text-left px-3 py-2 text-[10px] font-bold transition-all ${historyFilter === 'today' ? 'text-white bg-indigo-600/60' : 'text-indigo-200 hover:bg-white/10'}`}>Hari Ini</button>
                <button onClick={() => { setHistoryFilter('yesterday'); setShowHistoryMenu(false) }} className={`text-left px-3 py-2 text-[10px] font-bold transition-all ${historyFilter === 'yesterday' ? 'text-white bg-indigo-600/60' : 'text-indigo-200 hover:bg-white/10'}`}>Kemarin</button>
              </div>
            )}
          </div>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <BotIcon size={20} className="text-white"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white font-black text-[11px] uppercase tracking-widest leading-none">Bot Alpha</p>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasGeminiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} title={hasGeminiKey?'Gemini AI aktif':'Mode offline'}/>
            </div>
            <p className="text-indigo-200 text-[9px] font-bold mt-0.5">
              {hasGeminiKey ? '✨ Gemini AI + Offline KB' : '📚 Mode Offline — Set Gemini key di ⚙️'}
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
            <p className="text-white font-black text-[10px] uppercase tracking-widest">⚙️ Gemini API Key</p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <p className="text-indigo-200 text-[9px] leading-relaxed">
                Dapatkan key gratis di{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-300 underline font-bold">aistudio.google.com</a>
                {' '}→ Get API Key → Create API Key
              </p>
              {hasGeminiKey && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"/>
                  <span className="text-emerald-300 text-[9px] font-bold flex-1">Key aktif: {effectiveGeminiKey.slice(0,8)}•••</span>
                  <button onClick={handleClearGeminiKey} className="text-rose-400 text-[9px] font-black hover:text-rose-300 transition-colors">Hapus</button>
                </div>
              )}
              <input
                type="password"
                value={geminiKeyInput}
                onChange={e=>{ setGeminiKeyInput(e.target.value); setGeminiStatus('idle') }}
                placeholder={hasGeminiKey ? 'Masukkan key baru...' : 'Paste Gemini API key di sini...'}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-[10px] font-mono text-white placeholder:text-indigo-300/50 focus:outline-none focus:border-indigo-400/60 transition-all"
              />
              <button
                onClick={handleSaveGeminiKey}
                disabled={!geminiKeyInput.trim() || isSavingKey}
                className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 ${geminiStatus==='saved'?'bg-emerald-600 text-white':geminiStatus==='error'?'bg-rose-600 text-white':'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'}`}
              >
                {isSavingKey ? '⏳ Menyimpan & sync cloud...' : geminiStatus==='saved' ? '✓ Tersimpan & Disync!' : geminiStatus==='error' ? '✗ Key terlalu pendek / tidak valid' : '💾 Simpan & Sync ke Cloud'}
              </button>
            </div>
            <p className="text-indigo-300/60 text-[8.5px] text-center">✨ Gratis • Model: gemini-3.5-flash-lite • 🌐 Sync Supabase</p>
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
            {isTyping && (
              <div className="w-full h-[2px] bg-white/5 relative overflow-hidden shrink-0">
                <div className="absolute top-0 bottom-0 left-0 bg-indigo-400 w-1/3 rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
                <style>{`@keyframes progress { 0% { left: -30%; } 100% { left: 100%; } }`}</style>
              </div>
            )}
            <div 
              ref={chatContainerRef}
              onScroll={(e) => localStorage.setItem('alphaPro_bot_scroll', e.currentTarget.scrollTop.toString())}
              className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" 
              style={{ minHeight:'180px', maxHeight:'340px' }}
            >
              {messages.filter(msg => {
                if (historyFilter === 'all') return true
                const msgDate = msg.timestamp ? new Date(msg.timestamp) : new Date()
                const today = new Date()
                const yesterday = new Date(today)
                yesterday.setDate(yesterday.getDate() - 1)
                if (historyFilter === 'today') return msgDate.toDateString() === today.toDateString()
                if (historyFilter === 'yesterday') return msgDate.toDateString() === yesterday.toDateString()
                return true
              }).map((msg, idx, arr) => {
                const msgDate = msg.timestamp ? new Date(msg.timestamp) : new Date()
                const today = new Date()
                const yesterday = new Date(today)
                yesterday.setDate(yesterday.getDate() - 1)
                
                let dateLabel = ''
                if (msgDate.toDateString() === today.toDateString()) dateLabel = 'Hari Ini'
                else if (msgDate.toDateString() === yesterday.toDateString()) dateLabel = 'Kemarin'
                else dateLabel = msgDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                
                let showDivider = false
                if (idx === 0) showDivider = true
                else {
                  const prevMsg = arr[idx-1]
                  const prevDate = prevMsg.timestamp ? new Date(prevMsg.timestamp) : new Date()
                  if (msgDate.toDateString() !== prevDate.toDateString()) showDivider = true
                }
                
                const timeString = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : ''

                return (
                  <React.Fragment key={msg.id}>
                    {showDivider && (
                      <div className="flex justify-center my-3.5">
                        <span className="bg-black/30 border border-white/5 px-4 py-1 rounded-full text-[9px] font-black text-indigo-300 uppercase tracking-widest shadow-sm">
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${msg.from==='user'?'justify-end':'justify-start'}`}>
                      {msg.from==='bot' && (
                        <div className="w-6 h-6 rounded-lg bg-indigo-600/60 flex items-center justify-center shrink-0 mr-1.5 mt-0.5 shadow">
                          <BotIcon size={15} className="text-white"/>
                        </div>
                      )}
                      {msg.from==='user' && (
                        <button 
                          onClick={() => { if (!isTyping) handleSend(msg.text) }}
                          className="mr-2 mt-auto mb-1 text-white/30 hover:text-white/80 active:scale-90 transition-all flex items-center justify-center p-1"
                          title="Ulangi perintah ini"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        </button>
                      )}
                      <div className={`max-w-[82%] flex flex-col gap-0.5 ${msg.from==='user'?'items-end':''}`}>
                        <div className="flex items-center gap-1.5 px-1">
                          {msg.from==='bot' && <ModeBadge mode={msg.mode}/>}
                          {timeString && <span className="text-[8.5px] text-white/30 font-bold tracking-wider">{timeString}</span>}
                        </div>
                        <div className={`px-3 py-2 rounded-2xl text-[11px] font-medium leading-relaxed shadow ${msg.from==='user'?'bg-indigo-600 text-white rounded-tr-sm':'bg-white/10 text-slate-100 rounded-tl-sm border border-white/10'}`}>
                          {renderText(msg.text)}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}

              {/* ── Kartu Konfirmasi Aksi AI ───────────────────────────────── */}
              {pendingActions && pendingActions.length > 0 && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/70 flex items-center justify-center shrink-0 mr-1.5 mt-0.5 shadow shrink-0">
                    <span className="text-white text-[10px] font-black">⚡</span>
                  </div>
                  <div className="max-w-[88%] bg-amber-500/10 border border-amber-400/40 rounded-2xl rounded-tl-sm px-3 py-2.5 space-y-2.5 shadow">
                    <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest">⚡ Konfirmasi Aksi</p>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Bot akan melakukan hal berikut. Apakah sudah benar?
                    </p>
                    <div className="bg-black/20 rounded-xl px-2.5 py-2 space-y-1.5">
                      {pendingActions.map((action, i) => {
                        let icon = '⚡';
                        let colorClass = 'bg-gray-500/30 text-gray-200 border-gray-400/30';
                        let text = '';
                        
                        if (action.type === 'kasbon') {
                          const nominal = parseInt(action.payload.nominal?.replace(/\D/g, '') || '0', 10);
                          icon = '📝';
                          colorClass = 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30';
                          text = `Catat Kasbon Rp${nominal.toLocaleString('id-ID')} atas nama **${action.payload.nama}**${action.payload.keterangan ? ` (${action.payload.keterangan})` : ''}`;
                        } else if (action.type === 'kontak') {
                          icon = '📞';
                          colorClass = 'bg-sky-500/30 text-sky-200 border-sky-400/30';
                          text = `Simpan Kontak **${action.payload.nama}** — No. HP: **${action.payload.nomor}**${action.payload.keterangan ? ` (${action.payload.keterangan})` : ''}`;
                        } else if (action.type === 'navigate') {
                          icon = '🔀';
                          colorClass = 'bg-indigo-500/30 text-indigo-200 border-indigo-400/30';
                          const viewInfo = VIEW_MAP[action.payload.view];
                          text = `Pindah ke halaman **${viewInfo?.label || action.payload.view}**`;
                        } else if (action.type === 'izin') {
                          icon = '📅';
                          colorClass = 'bg-orange-500/30 text-orange-200 border-orange-400/30';
                          text = `Izin kasir **${action.payload.username}** tanggal ${action.payload.tanggal}${action.payload.alasan ? ` — ${action.payload.alasan}` : ''}`;
                        } else if (action.type === 'catatan') {
                          icon = '📌';
                          colorClass = 'bg-amber-500/30 text-amber-200 border-amber-400/30';
                          text = `Simpan Catatan Baru: **${action.payload.judul}**\n"${action.payload.isi}"`;
                        }
                        
                        return (
                          <div key={i} className={`flex items-start gap-1.5 p-1.5 rounded-lg border ${colorClass}`}>
                            <span className="text-[11px] shrink-0 pt-0.5">{icon}</span>
                            <p className="text-[10px] font-medium leading-snug">{renderText(text)}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-2 pt-0.5">
                      <button
                        onClick={cancelActions}
                        className="flex-1 py-1.5 rounded-xl text-[10px] font-black bg-white/10 hover:bg-white/20 text-white/70 transition-all active:scale-95"
                      >
                        🚫 Batalkan
                      </button>
                      <button
                        onClick={confirmExecuteActions}
                        className="flex-1 py-1.5 rounded-xl text-[10px] font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-500/30 transition-all active:scale-95"
                      >
                        ✅ Ya, Lanjutkan
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
            <div 
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className={`px-3 pb-1.5 flex gap-1.5 overflow-x-auto shrink-0 cursor-grab ${isDragging ? 'cursor-grabbing select-none' : ''}`} 
              style={{scrollbarWidth:'none'}}
            >
              {suggestions.map(s => (
                <button 
                  key={s} 
                  onClick={() => { if (!dragMoved) handleSend(s) }} 
                  className="shrink-0 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[9.5px] font-bold text-indigo-200 hover:bg-indigo-600/40 hover:text-white transition-all active:scale-90 whitespace-nowrap"
                >
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
                placeholder={hasGeminiKey ? 'Tanya apa saja...' : 'Ketik perintah atau pertanyaan...'}
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
