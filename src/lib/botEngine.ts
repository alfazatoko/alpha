// ─────────────────────────────────────────────────────────────────────────────
// src/lib/botEngine.ts — Bot Alpha Engine
// Opsi 1: Knowledge Base Lokal  |  Opsi 3: Groq API (Gratis)
// ─────────────────────────────────────────────────────────────────────────────

// ── View Map ──────────────────────────────────────────────────────────────────
export const VIEW_MAP: Record<string, { view: string; label: string; keywords: string[] }> = {
  beranda:   { view: 'view-beranda',      label: 'Beranda',            keywords: ['beranda', 'dashboard', 'home', 'utama', 'depan'] },
  transaksi: { view: 'view-transaksi',    label: 'Riwayat Transaksi',  keywords: ['transaksi', 'riwayat', 'history', 'histori'] },
  laporan:   { view: 'view-laporan',      label: 'Laporan',            keywords: ['laporan', 'report', 'rekap'] },
  akun:      { view: 'view-akun',         label: 'Akun',               keywords: ['akun', 'profil', 'profile', 'pengaturan', 'setting'] },
  isisaldo:  { view: 'view-isi-saldo',    label: 'Isi Saldo',          keywords: ['isi saldo', 'topup', 'top up', 'tambah saldo'] },
  kasbon:    { view: 'view-kasbon',       label: 'Kasbon',             keywords: ['kasbon', 'bon', 'utang', 'piutang'] },
  kontak:    { view: 'view-kontak',       label: 'Kontak',             keywords: ['kontak', 'contact', 'pelanggan', 'customer'] },
  voucher:   { view: 'view-stok-voucher', label: 'Stok Voucher',       keywords: ['voucher', 'stok', 'kuota', 'paket', 'pulsa', 'produk'] },
  kalender:  { view: 'view-kalender',     label: 'Kalender',           keywords: ['kalender', 'calendar', 'jadwal'] },
  nota:      { view: 'view-nota',         label: 'Nota',               keywords: ['nota', 'struk', 'kwitansi', 'invoice'] },
  otomatis:  { view: 'view-otomatis',     label: 'Otomatis',           keywords: ['otomatis', 'preset', 'auto', 'template'] },
}

// ── App Intent ────────────────────────────────────────────────────────────────
export type AppIntent =
  | { type: 'navigate'; view: string; label: string }
  | { type: 'edit_stok'; query: string }
  | { type: 'tanya_stok'; query: string }
  | { type: 'none' }

export function parseAppIntent(text: string): AppIntent {
  const c = text.toLowerCase().trim()
  // Edit stok
  for (const p of [/edit\s+stok\s+(.+)/, /cari\s+voucher\s+(.+)/, /pindah.*edit\s+stok\s+(.+)/, /buka.*stok\s+(.+)/, /filter\s+stok\s+(.+)/, /cari\s+stok\s+(.+)/]) {
    const m = c.match(p); if (m?.[1]) return { type: 'edit_stok', query: m[1].trim() }
  }
  // Tanya stok
  for (const p of [/(?:tanya|cek|berapa|lihat)\s+stok\s+(.+)/, /stok\s+(.+?)\s+(?:berapa|ada|sisa|tersisa|masih)/, /stok\s+(.+?)\?/]) {
    const m = c.match(p); if (m?.[1]) return { type: 'tanya_stok', query: m[1].replace(/[?!.,]$/, '').trim() }
  }
  if (c.includes('stok') && !c.includes('edit') && !c.includes('pindah') && !c.includes('halaman')) {
    const q = c.replace('stok', '').trim(); if (q.length > 1) return { type: 'tanya_stok', query: q }
  }
  // Navigasi
  let nav = c
  for (const t of ['ke halaman', 'pindah ke', 'pindah halaman', 'buka halaman', 'tampilkan', 'buka', 'ke ']) {
    if (nav.startsWith(t)) { nav = nav.slice(t.length).trim(); break }
  }
  for (const info of Object.values(VIEW_MAP)) {
    for (const kw of info.keywords) {
      if (nav.includes(kw) || c.includes(kw)) return { type: 'navigate', view: info.view, label: info.label }
    }
  }
  return { type: 'none' }
}

// ── Stok Finder ───────────────────────────────────────────────────────────────
export interface VoucherProduct { id: string; name: string; stock?: number; stok?: number }

export function findStokProduct(query: string, storeId: string, username: string): { found: boolean; name?: string; stock?: number } {
  let products: VoucherProduct[] = []
  const keys = [`v_${storeId}_${username}_products`, `v_${storeId}_products`, `alphaPro_${storeId}_stok_voucher_products`]
  for (const k of keys) { try { const p = JSON.parse(localStorage.getItem(k)||''); if (Array.isArray(p)&&p.length) { products=p; break } } catch{} }
  if (!products.length) { for (let i=0;i<localStorage.length;i++) { const k=localStorage.key(i)||''; if (k.includes('products')||k.includes('voucher')) { try { const p=JSON.parse(localStorage.getItem(k)||''); if (Array.isArray(p)) products=[...products,...p] } catch{} } } }
  if (!products.length) return { found: false }
  const kws = query.toLowerCase().split(/\s+/).filter(Boolean)
  let best: VoucherProduct|null=null, top=0
  for (const p of products) { const s=kws.reduce((acc,kw)=>acc+(p.name?.toLowerCase().includes(kw)?1:0),0); if (s>top){top=s;best=p} }
  if (!best||top===0) return { found: false }
  return { found: true, name: best.name, stock: best.stock??best.stok??0 }
}

// ── Safe Math ─────────────────────────────────────────────────────────────────
function safeMath(expr: string): number|null {
  const clean = expr.replace(/[x×]/g,'*').replace(/[÷]/g,'/').replace(/rb|ribu/gi,'000').replace(/jt|juta/gi,'000000').replace(/[^0-9+\-*/().\s%]/g,'').trim()
  if (!clean||clean.length>80) return null
  try { const r = new Function(`"use strict";return(${clean.replace(/(\d+(?:\.\d+)?)\s*%/g,'($1/100)')})`)(); return typeof r==='number'&&isFinite(r)?r:null } catch { return null }
}
const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 })

// ── Knowledge Base ─────────────────────────────────────────────────────────────
interface KBEntry { test: (c:string)=>boolean; answer: string|((c:string)=>string|null) }

const KB: KBEntry[] = [
  // Greeting
  {
    test: c => /^(halo|hai|hay|hello|selamat pagi|selamat siang|selamat sore|selamat malam|permisi|assalamualaikum|waalaikumsalam|hei)(\s|$)|^(hi|p)$/.test(c),
    answer: () => { const h=new Date().getHours(); const s=h<11?'Selamat pagi ☀️':h<15?'Selamat siang 🌤️':h<18?'Selamat sore 🌇':'Selamat malam 🌙'; return `${s}! 👋 Aku **Bot Alpha**, asisten toko kamu.\n\nAku bisa bantu:\n• Navigasi aplikasi\n• Cek & panduan edit stok\n• Kalkulator bisnis\n• Info operator pulsa\n• Tanya umum (butuh Groq key)\n\nKetik *bantuan* untuk panduan lengkap.` }
  },
  // Identitas
  {
    test: c => c.includes('siapa kamu')||c.includes('kamu siapa')||c.includes('tentang bot')||c.includes('bot ini'),
    answer: 'Aku **Bot Alpha** 🤖 — asisten AI bawaan aplikasi ALPHA untuk toko pulsa & konter.\n\nMode offline: Knowledge Base lokal\nMode online: Groq AI (Llama 3) — gratis!\n\nDibuat tanpa API berbayar. 🎉'
  },
  // Bantuan
  {
    test: c => c==='bantuan'||c==='help'||c.includes('bisa apa')||c.includes('kamu bisa')||c.includes('fitur bot'),
    answer: '🛠️ **Panduan Bot Alpha:**\n\n**📱 Aplikasi:**\n• *"ke laporan"* — navigasi\n• *"tanya stok axis 4gb"* — cek stok\n• *"edit stok indosat 10k"* — panduan edit\n\n**🧮 Kalkulator:**\n• *"berapa 5000 x 12"*\n• *"modal 13000 jual 15000"*\n• *"10% dari 500000"*\n\n**📡 Info Operator:**\n• *"cara cek saldo telkomsel"*\n• *"nomor cs indosat"*\n\n**💬 Umum (Groq):**\n• Tanya apa saja jika Groq key sudah diset'
  },
  // Jam & Tanggal
  {
    test: c => (c.includes('jam')||c.includes('pukul')||c.includes('waktu'))&&(c.includes('berapa')||c.includes('sekarang')||c.includes('skrg')),
    answer: () => { const t=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); return `🕐 Sekarang pukul **${t}** WIB.` }
  },
  {
    test: c => (c.includes('tanggal')||c.includes('hari ini')||c.includes('hari apa'))&&(c.includes('berapa')||c.includes('apa')||c.includes('sekarang')),
    answer: () => { const d=new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); return `📅 Hari ini **${d}**.` }
  },
  // Kalkulator matematik
  {
    test: c => /(?:berapa|hitung|kalkulasi)\s.*\d|[\d,.]+\s*[+\-*/x×÷]\s*[\d,.]+/.test(c),
    answer: c => {
      const expr = c.replace(/berapa|hitung|kalkulasi|hasil/gi,'')
      const r = safeMath(expr)
      return r!==null ? `🧮 Hasil: **${fmt(r)}**` : null
    }
  },
  // Persen
  {
    test: c => /(\d[\d.,]*)\s*(?:%|persen)\s*(?:dari|of)?\s*(\d[\d.,]*)/.test(c),
    answer: c => {
      const m = c.match(/(\d[\d.,]*)\s*(?:%|persen)\s*(?:dari|of)?\s*(\d[\d.,]*)/)
      if (!m) return null
      const pct=parseFloat(m[1]), base=parseFloat(m[2].replace(/\./g,''))
      return `🧮 **${fmt(pct)}%** dari **Rp ${fmt(base)}** = **Rp ${fmt((pct/100)*base)}**`
    }
  },
  // Margin/Untung
  {
    test: c => (c.includes('margin')||c.includes('untung')||c.includes('profit')||c.includes('keuntungan'))&&(c.includes('modal')||c.includes('jual')||c.includes('beli')),
    answer: c => {
      const nums = [...c.matchAll(/(\d[\d.]*)/g)].map(m=>parseFloat(m[1].replace(/\./g,''))).filter(n=>n>0).sort((a,b)=>a-b)
      if (nums.length<2) return '💡 Contoh: *"modal 13000 jual 15000"*'
      const [a,b]=[nums[0],nums[nums.length-1]], selisih=b-a, pct=((selisih/a)*100).toFixed(1)
      return `💰 **Kalkulator Margin:**\n• Modal: Rp ${fmt(a)}\n• Harga Jual: Rp ${fmt(b)}\n• Untung: **Rp ${fmt(selisih)}**\n• Margin: **${pct}%**`
    }
  },
  // Break even
  {
    test: c => c.includes('bep')||c.includes('break even')||c.includes('balik modal'),
    answer: c => {
      const nums=[...c.matchAll(/(\d[\d.]*)/g)].map(m=>parseFloat(m[1].replace(/\./g,''))).filter(n=>n>0)
      if (nums.length>=2) { const [biaya,untungPerUnit]=[nums[0],nums[1]]; return `📊 **Break Even Point:**\n• Biaya Tetap: Rp ${fmt(biaya)}\n• Untung/Unit: Rp ${fmt(untungPerUnit)}\n• BEP: **${fmt(Math.ceil(biaya/untungPerUnit))} unit**` }
      return '💡 Contoh: *"BEP biaya tetap 500000 untung per unit 2000"*'
    }
  },
  // Info operator — Telkomsel
  {
    test: c => c.includes('telkomsel')&&(c.includes('cek saldo')||c.includes('cek kuota')||c.includes('cara cek')),
    answer: '📡 **Cara Cek — Telkomsel:**\n• Saldo pulsa: `*888#`\n• Kuota internet: `*888#` → pilih Info Kuota\n• Via SMS: ketik CEK ke 3636\n• Via MyTelkomsel app\n• CS: **188** (gratis dari Telkomsel)'
  },
  // Info operator — Indosat
  {
    test: c => (c.includes('indosat')||c.includes('im3')||c.includes('ooredoo'))&&(c.includes('cek')||c.includes('cara')||c.includes('saldo')||c.includes('kuota')),
    answer: '📡 **Cara Cek — Indosat/IM3:**\n• Saldo pulsa: `*388#`\n• Kuota internet: `*123*7#`\n• Via myIM3 app\n• CS: **185** (gratis dari Indosat)\n• WhatsApp CS: 0815-1000-185'
  },
  // Info operator — Axis
  {
    test: c => c.includes('axis')&&(c.includes('cek')||c.includes('cara')||c.includes('saldo')||c.includes('kuota')),
    answer: '📡 **Cara Cek — Axis:**\n• Saldo pulsa: `*888#`\n• Kuota internet: `*123*10*1#`\n• Via AXISnet app\n• CS: **838** (gratis dari Axis)'
  },
  // Info operator — XL
  {
    test: c => c.includes(' xl ')&&(c.includes('cek')||c.includes('cara')||c.includes('saldo')||c.includes('kuota')),
    answer: '📡 **Cara Cek — XL:**\n• Saldo pulsa: `*123#`\n• Kuota internet: `*123#` → Info\n• Via myXL app\n• CS: **817** (gratis dari XL)'
  },
  // Info operator — Smartfren
  {
    test: c => c.includes('smartfren')&&(c.includes('cek')||c.includes('cara')||c.includes('saldo')||c.includes('kuota')),
    answer: '📡 **Cara Cek — Smartfren:**\n• Saldo & kuota: `*999#`\n• Via MySmartfren app\n• CS: **0881-9000-111**'
  },
  // Nomor CS Operator
  {
    test: c => (c.includes('nomor cs')||c.includes('customer service')||c.includes('hubungi')||c.includes('kontak operator'))&&(c.includes('telkomsel')||c.includes('indosat')||c.includes('axis')||c.includes('xl')||c.includes('operator')),
    answer: '📞 **Nomor CS Operator:**\n• Telkomsel: **188**\n• Indosat/IM3: **185**\n• Axis: **838**\n• XL: **817**\n• Smartfren: **0881-9000-111**\n• Tri (3): **132**\n\n_(Semua gratis dari nomor masing-masing)_'
  },
  // Tri/3
  {
    test: c => (c.includes(' tri ')||c.includes(' 3 ')||c.includes(' three '))&&(c.includes('cek')||c.includes('saldo')||c.includes('kuota')),
    answer: '📡 **Cara Cek — Tri (3):**\n• Saldo & kuota: `*111*1#`\n• Via Bima+ app\n• CS: **132** (gratis dari Tri)'
  },
  // Tips bisnis
  {
    test: c => c.includes('tips') && (c.includes('bisnis')||c.includes('jualan')||c.includes('laris')||c.includes('toko')||c.includes('konter')||c.includes('pulsa')),
    answer: '💡 **Tips Bisnis Konter Pulsa:**\n\n**Produk:**\n• Jual paket yang sedang promo/trend\n• Sediakan semua operator (jangan pilih-pilih)\n• Tambah layanan: PPOB, top-up e-wallet\n\n**Pelayanan:**\n• Ramah & cepat = pelanggan balik lagi\n• Catat kontak pelanggan setia\n• Beri diskon/bonus ke pelanggan rutin\n\n**Stok:**\n• Monitor stok harian agar tidak kehabisan\n• Beli stok saat harga promo\n• Rekap laporan tiap hari'
  },
  // Tips pelayanan
  {
    test: c => c.includes('tips')&&(c.includes('pelayanan')||c.includes('customer')||c.includes('pelanggan')||c.includes('service')),
    answer: '🌟 **Tips Pelayanan Prima:**\n\n1. **Senyum & Sapa** — kesan pertama penting\n2. **Respon Cepat** — pelanggan tidak suka nunggu lama\n3. **Jujur** — kalau stok habis, bilang langsung\n4. **Ingat Nama** — pelanggan suka dikenal\n5. **Follow-up** — hubungi kalau ada promo\n6. **Keluhan = Kesempatan** — tanggapi dengan baik\n7. **Kebersihan Toko** — suasana nyaman = betah'
  },
  // Terima kasih
  {
    test: c => c.includes('terima kasih')||c.includes('makasih')||c.includes('thanks')||c.includes('thank you')||c==='ok'||c==='oke'||c==='oks',
    answer: 'Sama-sama! 😊 Kalau butuh bantuan lagi, aku siap di sini ya. Semangat berjualan! 🚀'
  },
  // Kenalan
  {
    test: c => c.includes('nama kamu')||c.includes('namamu')||c.includes('kamu namanya'),
    answer: 'Namaku **Bot Alpha** 🤖 — asisten virtual toko ALPHA. Senang berkenalan! 😊'
  },
]

// ── Knowledge Base Lookup ──────────────────────────────────────────────────────
export function answerFromKB(text: string): string | null {
  const c = text.toLowerCase().trim()
  for (const entry of KB) {
    if (entry.test(c)) {
      const a = typeof entry.answer === 'function' ? entry.answer(c) : entry.answer
      if (a !== null) return a as string
    }
  }
  return null
}

// ── Groq API ──────────────────────────────────────────────────────────────────
export interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string }

const GROQ_SYSTEM = `Kamu adalah Bot Alpha, asisten AI untuk toko pulsa dan konter bernama ALFAZA CELL. 
Jawab dalam Bahasa Indonesia yang singkat, padat, dan ramah. Gunakan emoji secukupnya.
Spesialisasi: bisnis konter/pulsa, teknologi, matematika, info umum.
Jika tidak tahu, jujur saja. Jangan jawab hal berbahaya atau SARA.
Format jawaban: gunakan baris baru dan poin jika perlu, tapi tetap ringkas (maks 150 kata).`

export async function callGroqAPI(userMessage: string, history: ChatMessage[], apiKey: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: GROQ_SYSTEM },
    ...history.slice(-6), // max 6 pesan terakhir sebagai konteks
    { role: 'user', content: userMessage }
  ]
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages, temperature: 0.7, max_tokens: 512 })
  })
  if (!res.ok) {
    const err = await res.json().catch(()=>({}))
    if (res.status === 401) throw new Error('API key tidak valid. Cek kembali di Settings bot.')
    if (res.status === 429) throw new Error('Batas request tercapai. Coba lagi sebentar.')
    throw new Error(err?.error?.message || `Error ${res.status}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || 'Maaf, tidak ada respons.'
}
