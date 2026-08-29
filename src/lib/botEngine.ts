// ─────────────────────────────────────────────────────────────────────────────
// src/lib/botEngine.ts — Bot Alpha Engine (Enhanced Offline Edition)
// ─────────────────────────────────────────────────────────────────────────────

// ── View Map ──────────────────────────────────────────────────────────────────
export const VIEW_MAP: Record<string, { view: string; label: string; keywords: string[] }> = {
  beranda:       { view: 'view-beranda',      label: 'Beranda',                  keywords: ['beranda', 'dashboard', 'home', 'utama', 'depan'] },
  transaksi:     { view: 'view-transaksi',    label: 'Riwayat Transaksi',        keywords: ['transaksi', 'riwayat', 'history', 'histori'] },
  laporan:       { view: 'view-laporan',      label: 'Laporan',                  keywords: ['laporan', 'report', 'rekap', 'omset', 'keuntungan'] },
  akun:          { view: 'view-akun',         label: 'Akun & Manajemen Kasir',   keywords: ['akun', 'profil', 'profile', 'pengaturan', 'setting', 'manajemen kasir', 'kelola kasir', 'data kasir', 'karyawan', 'manajemen karyawan'] },
  isisaldo:      { view: 'view-isi-saldo',    label: 'Isi Saldo',                keywords: ['isi saldo', 'topup', 'top up', 'tambah saldo', 'deposit'] },
  kasbon:        { view: 'view-kasbon',       label: 'Kasbon',                   keywords: ['kasbon', 'bon', 'utang', 'piutang', 'hutang'] },
  kontak:        { view: 'view-kontak',       label: 'Kontak',                   keywords: ['kontak', 'contact', 'pelanggan', 'customer'] },
  voucher:       { view: 'view-stok-voucher', label: 'Stok Voucher',             keywords: ['voucher', 'stok', 'kuota', 'paket', 'pulsa', 'produk', 'atur stok', 'daftar voucher', 'stok voucher'] },
  kalender:      { view: 'view-kalender',     label: 'Kalender & Shift',         keywords: ['kalender', 'calendar', 'jadwal', 'shift'] },
  nota:          { view: 'view-nota',         label: 'Nota',                     keywords: ['nota', 'struk', 'kwitansi', 'invoice', 'print nota', 'cetak nota'] },
  otomatis:      { view: 'view-otomatis',     label: 'Otomatis',                 keywords: ['otomatis', 'preset', 'auto', 'template'] },
  // Owner specific
  owner_absen:   { view: 'view-owner-absen',   label: 'Monitor Absensi Karyawan', keywords: ['absen owner', 'monitor absensi', 'absen karyawan', 'daftar absen', 'kehadiran'] },
  owner_laporan: { view: 'view-owner-laporan', label: 'Laporan Finansial Owner',   keywords: ['laporan owner', 'rekap owner', 'laporan keuangan', 'keuangan owner'] },
  owner_grafik:  { view: 'view-owner-grafik',  label: 'Grafik & Analisa',         keywords: ['grafik', 'analitik', 'analisa', 'chart', 'visualisasi'] },
  owner_gaji:    { view: 'view-owner-gaji',    label: 'Penggajian Kasir',         keywords: ['gaji kasir', 'penggajian', 'slip gaji', 'bayar gaji'] },
  owner_performa:{ view: 'view-owner-performa',label: 'Performa Kasir',           keywords: ['performa kasir', 'kinerja kasir', 'performa karyawan'] },
  owner_saldo:   { view: 'view-owner-saldo',   label: 'Monitor Keuangan & Saldo', keywords: ['saldo toko', 'kas toko', 'monitor keuangan', 'dompet toko'] },
  owner_backup:  { view: 'view-owner-backup',  label: 'Backup & Restore Data',    keywords: ['backup', 'restore', 'cadangan', 'simpan data cloud'] },
  owner_izin:    { view: 'view-owner-izin',    label: 'Persetujuan Izin Karyawan',keywords: ['izin kasir', 'izin karyawan', 'persetujuan cuti', 'persetujuan izin'] }
}

// ── App Intent ────────────────────────────────────────────────────────────────
export type AppIntent =
  | { type: 'navigate'; view: string; label: string; tab?: string }
  | { type: 'edit_stok'; query: string }
  | { type: 'tanya_stok'; query: string }
  | { type: 'set_alarm'; minutes: number; message: string }
  | { type: 'ambiguous'; message: string; suggestions: string[] }
  | { type: 'none' }

export function parseAppIntent(text: string): AppIntent {
  const c = text.toLowerCase().trim()
  
  // 0. Deteksi Ambigu / Butuh Klarifikasi
  const ambiguousKeywords = [
    {
      match: ['riwayat', 'buka riwayat', 'ke riwayat', 'halaman riwayat', 'pindah ke riwayat', 'lihat riwayat'],
      message: 'Ada beberapa halaman riwayat. Silakan pilih riwayat mana yang ingin dibuka:',
      suggestions: ['Riwayat Transaksi Utama', 'Riwayat Voucher']
    },
    {
      match: ['laporan', 'buka laporan', 'ke laporan', 'halaman laporan', 'pindah ke laporan', 'lihat laporan'],
      message: 'Ada beberapa jenis laporan. Laporan mana yang ingin dibuka?',
      suggestions: ['Laporan Utama', 'Laporan Voucher']
    }
  ]

  for (const amb of ambiguousKeywords) {
    if (amb.match.includes(c)) {
      return { type: 'ambiguous', message: amb.message, suggestions: amb.suggestions }
    }
  }
  
  // 1. Cek Navigasi Langsung (Prioritas Tinggi)
  const directNavKeywords = [
    // Voucher specific tabs (sub-halaman)
    { view: 'view-stok-voucher', tab: 'stok', keywords: ['atur stok', 'stok voucher', 'stok vcr', 'stok kuota', 'stok paket', 'stok produk', 'tabel stok', 'edit stok', 'tambah voucher'] },
    { view: 'view-stok-voucher', tab: 'riwayat', keywords: ['riwayat voucher', 'riwayat serah terima', 'serah terima voucher', 'arsip audit', 'audit voucher'] },
    { view: 'view-stok-voucher', tab: 'produk', keywords: ['katalog voucher', 'daftar voucher', 'lihat voucher', 'produk voucher'] },
    { view: 'view-stok-voucher', tab: 'laporan', keywords: ['laporan voucher', 'keuntungan voucher', 'omset voucher', 'rekap voucher'] },
    { view: 'view-stok-voucher', tab: 'notif', keywords: ['log aktivitas voucher', 'notifikasi voucher', 'pemberitahuan voucher', 'log voucher'] },
    { view: 'view-stok-voucher', tab: 'beranda', keywords: ['dashboard voucher', 'menu voucher', 'voucher app', 'halaman voucher'] },
    
    // Normal views
    { view: 'view-owner-gaji', keywords: ['gaji kasir', 'penggajian', 'bayar gaji', 'gaji karyawan', 'slip gaji'] },
    { view: 'view-owner-absen', keywords: ['absen karyawan', 'monitor absensi', 'kehadiran kasir', 'kehadiran karyawan', 'log absen'] },
    { view: 'view-owner-izin', keywords: ['izin kasir', 'izin karyawan', 'persetujuan izin', 'cuti karyawan', 'cuti kasir'] },
    { view: 'view-owner-saldo', keywords: ['saldo toko', 'kas toko', 'uang toko', 'keuangan toko'] },
    { view: 'view-owner-laporan', keywords: ['laporan owner', 'rekap keuangan owner', 'keuangan owner'] },
    { view: 'view-owner-grafik', keywords: ['grafik', 'analitik', 'analisa penjualan', 'chart'] },
    { view: 'view-owner-backup', keywords: ['backup', 'restore', 'cadangkan data'] },
    { view: 'view-beranda', keywords: ['beranda', 'dashboard', 'home', 'halaman utama', 'depan'] },
    { view: 'view-transaksi', keywords: ['transaksi', 'riwayat transaksi', 'riwayat transaksi utama', 'history', 'histori'] },
    { view: 'view-laporan', keywords: ['laporan', 'report', 'rekap', 'omset', 'keuntungan', 'laporan utama'] },
    { view: 'view-akun', keywords: ['akun', 'profil', 'profile', 'pengaturan', 'setting', 'manajemen kasir', 'management kasir', 'kelola kasir', 'data kasir', 'karyawan', 'akun kasir'] },
    { view: 'view-isi-saldo', keywords: ['isi saldo', 'topup', 'top up', 'tambah saldo', 'deposit'] },
    { view: 'view-kasbon', keywords: ['kasbon', 'bon', 'utang', 'piutang', 'hutang'] },
    { view: 'view-kontak', keywords: ['kontak', 'contact', 'pelanggan', 'customer'] },
    { view: 'view-stok-voucher', keywords: ['voucher', 'stok kuota', 'stok paket'] },
    { view: 'view-kalender', keywords: ['kalender', 'calendar', 'jadwal', 'shift'] },
    { view: 'view-nota', keywords: ['nota', 'struk', 'kwitansi', 'invoice', 'print nota', 'cetak nota'] },
    { view: 'view-otomatis', keywords: ['otomatis', 'preset', 'auto', 'template'] }
  ]

  for (const item of directNavKeywords) {
    for (const kw of item.keywords) {
      if (
        c === kw || 
        c === `buka ${kw}` || 
        c === `ke ${kw}` || 
        c === `halaman ${kw}` || 
        c === `buka halaman ${kw}` || 
        c === `pindah ke ${kw}` || 
        c === `pindah halaman ${kw}` ||
        (c.startsWith(`buka ${kw}`) && c.length < `buka ${kw}`.length + 5) ||
        (c.startsWith(`ke ${kw}`) && c.length < `ke ${kw}`.length + 5)
      ) {
        const label = VIEW_MAP[Object.keys(VIEW_MAP).find(k => VIEW_MAP[k].view === item.view) || '']?.label || kw
        return { type: 'navigate', view: item.view, label, tab: item.tab }
      }
    }
  }

  // 2. Edit/Ubah Stok (Kembalikan nama produk agar manual edit dibuka)
  for (const p of [
    /edit\s+stok\s+(.+?)\s+(?:menjadi|ke|jadi|=)\s+(\d+)/,
    /ubah\s+stok\s+(.+?)\s+(?:menjadi|ke|jadi|=)\s+(\d+)/,
    /set\s+stok\s+(.+?)\s+(?:menjadi|ke|jadi|=)\s+(\d+)/
  ]) {
    const m = c.match(p)
    if (m?.[1]) return { type: 'edit_stok', query: m[1].trim() }
  }

  for (const p of [/edit\s+stok\s+(.+)/, /cari\s+voucher\s+(.+)/, /pindah.*edit\s+stok\s+(.+)/, /buka.*stok\s+(.+)/, /filter\s+stok\s+(.+)/, /cari\s+stok\s+(.+)/]) {
    const m = c.match(p); if (m?.[1]) return { type: 'edit_stok', query: m[1].trim() }
  }

  // 3. Tanya Stok
  for (const p of [
    /(?:tanya|cek|berapa|lihat)\s+stok\s+(.+)/, 
    /stok\s+(.+?)\s+(?:berapa|ada|sisa|tersisa|masih)/, 
    /stok\s+(.+?)\?/
  ]) {
    const m = c.match(p); if (m?.[1]) return { type: 'tanya_stok', query: m[1].replace(/[?!.,]$/, '').trim() }
  }

  // Deteksi pencarian stok umum
  if (c.includes('stok')) {
    let q = c.replace('stok', '').replace('tanya', '').replace('cek', '').replace('berapa', '').replace('sisa', '').replace('ada', '').replace(/\?/g, '').trim()
    if (q.length > 1 && !c.includes('halaman') && !c.includes('buka') && !c.includes('pindah') && !c.includes('atur')) {
      return { type: 'tanya_stok', query: q }
    }
  }

  // 4. Alarm / Pengingat
  let alarmMatch = c.match(/(?:ingatkan|alarm).*?(\d+)\s*(menit|jam|detik)\s*(?:lagi\s+)?(?:buat|untuk\s+)?(.*)/i);
  if (!alarmMatch) alarmMatch = c.match(/(?:ingatkan|alarm).*?(?:buat|untuk\s+)?(.*?)\s+(?:dalam|setelah\s+)?(\d+)\s*(menit|jam|detik)/i);
  
  if (alarmMatch) {
    let numStr, unit, msg;
    if (isNaN(Number(alarmMatch[1]))) {
      msg = alarmMatch[1];
      numStr = alarmMatch[2];
      unit = alarmMatch[3];
    } else {
      numStr = alarmMatch[1];
      unit = alarmMatch[2];
      msg = alarmMatch[3];
    }
    const val = parseInt(numStr, 10);
    let minutes = unit.startsWith('jam') ? val * 60 : unit.startsWith('detik') ? val / 60 : val;
    if (minutes > 0) {
      return { type: 'set_alarm', minutes, message: msg.replace(/^[!?.,\s]+|[!?.,\s]+$/g, '') || 'Pengingat' };
    }
  }

  // 5. Navigasi Umum (dengan pembersihan prefiks)
  let nav = c
  for (const t of ['ke halaman', 'pindah ke', 'pindah halaman', 'buka halaman', 'tampilkan', 'buka', 'ke ']) {
    if (nav.startsWith(t)) { nav = nav.slice(t.length).trim(); break }
  }
  for (const info of Object.values(VIEW_MAP)) {
    for (const kw of info.keywords) {
      if (nav === kw || (nav.startsWith(kw) && nav.length < kw.length + 5)) {
        return { type: 'navigate', view: info.view, label: info.label }
      }
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
    answer: () => { const h=new Date().getHours(); const s=h<11?'Selamat pagi ☀️':h<15?'Selamat siang 🌤️':h<18?'Selamat sore 🌇':'Selamat malam 🌙'; return `${s}! 👋 Aku **Bot Alpha**, asisten toko kamu.\n\nAku bisa bantu:\n• Navigasi aplikasi (misal: *"atur stok"*, *"gaji kasir"*)\n• Cek & panduan edit stok\n• Rekap kasbon, kontak, absen, & penjualan\n• Kalkulator bisnis & info operator\n• Tanya umum (butuh Groq key)\n\nKetik *bantuan* untuk panduan lengkap.` }
  },
  // Identitas
  {
    test: c => c.includes('siapa kamu')||c.includes('kamu siapa')||c.includes('tentang bot')||c.includes('bot ini'),
    answer: 'Aku **Bot Alpha** 🤖 — asisten AI bawaan aplikasi ALPHA untuk toko pulsa & konter.\n\nMode offline: Knowledge Base lokal\nMode online: Groq AI (Llama 3) — gratis!\n\nDibuat tanpa API berbayar. 🎉'
  },
  // Bantuan
  {
    test: c => c==='bantuan'||c==='help'||c.includes('bisa apa')||c.includes('kamu bisa')||c.includes('fitur bot'),
    answer: '🛠️ **Panduan Bot Alpha:**\n\n**📱 Navigasi & Halaman:**\n• *"buka atur stok"* — Ke Stok Voucher\n• *"buka kasbon"* — Ke Buku Kasbon\n• *"buka gaji kasir"* — Ke Owner Gaji\n\n**📊 Laporan & Transaksi Voucher:**\n• *"rekap voucher hari ini"* — Omzet & detail penjualan\n• *"cari transaksi axis"* — Filter per produk\n• *"transaksi non tunai"* — Filter per metode bayar\n• *"stok menipis"* — Cek produk hampir habis\n\n**💰 Kalkulator & Pengingat:**\n• *"bayar 50rb voucher 5rb kembalian"*\n• *"modal 13000 jual 15000"*\n• *"ingatkan saya 30 menit untuk setor kas"*\n\n**📦 Data Toko Offline:**\n• *"daftar kasbon"*, *"cari kontak budi"*\n• *"rekap hari ini"* — Transaksi utama\n• *"absen hari ini"*\n\n**📡 Info Operator:**\n• *"cara cek saldo telkomsel"*\n• *"nomor cs indosat"*\n\n**💬 Umum (Gemini):**\n• Tanya apa saja jika Gemini key sudah diset'
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
    answer: '📡 **Cara Cek — Telkomsel:**\n• Saldo pulsa: `*888#`\n• Kuota internet: `*888#` → pilih Info Kuota\n• Via MyTelkomsel app\n• CS: **188** (gratis dari Telkomsel)'
  },
  // Info operator — Indosat
  {
    test: c => (c.includes('indosat')||c.includes('im3')||c.includes('ooredoo'))&&(c.includes('cek')||c.includes('cara')||c.includes('saldo')||c.includes('kuota')),
    answer: '📡 **Cara Cek — Indosat/IM3:**\n• Saldo pulsa: `*388#`\n• Kuota internet: `*123*7#`\n• Via myIM3 app\n• CS: **185** (gratis dari Indosat)'
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
  // CS Operator
  {
    test: c => (c.includes('nomor cs')||c.includes('customer service')||c.includes('hubungi')||c.includes('kontak operator'))&&(c.includes('telkomsel')||c.includes('indosat')||c.includes('axis')||c.includes('xl')||c.includes('operator')),
    answer: '📞 **Nomor CS Operator:**\n• Telkomsel: **188**\n• Indosat/IM3: **185**\n• Axis: **838**\n• XL: **817**\n• Smartfren: **0881-9000-111**\n• Tri (3): **132**\n\n_(Semua gratis dari nomor masing-masing)_'
  },
  // Tri
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
  // Kalkulator Kembalian — "bayar 50rb voucher 5rb kembaliannya berapa"
  {
    test: c => (c.includes('kembalian') || c.includes('kembalian') || c.includes('kembali')) &&
               (c.includes('bayar') || c.includes('bayar')) &&
               /\d/.test(c),
    answer: c => {
      const nums = [...c.matchAll(/(\d[\d.,]*)(?:\s*(?:rb|ribu|k))?/g)]
        .map(m => {
          const raw = m[1].replace(/\./g, '')
          const full = m[0].toLowerCase()
          const mult = full.endsWith('rb') || full.endsWith('ribu') || full.endsWith('k') ? 1000 : 1
          return parseFloat(raw) * mult
        }).filter(n => n > 0)
      // Angka besar = bayar, angka kecil = harga
      if (nums.length < 2) return '💡 Contoh: *"bayar 50rb voucher 5rb kembaliannya berapa"*'
      const sorted = [...nums].sort((a,b) => b - a)
      const bayar = sorted[0], harga = sorted[sorted.length - 1]
      const kembalian = bayar - harga
      if (kembalian < 0) return `⚠️ Uang tidak cukup! Kurang **Rp ${Math.abs(kembalian).toLocaleString('id-ID')}**.`
      return `💰 **Kalkulator Kembalian:**\n• Bayar: Rp ${bayar.toLocaleString('id-ID')}\n• Harga: Rp ${harga.toLocaleString('id-ID')}\n• **Kembalian: Rp ${kembalian.toLocaleString('id-ID')}** ✅`
    }
  },
]

// ── Knowledge Base Lookup (With Database Contexts) ───────────────────────────────────
export function answerFromKB(
  text: string, 
  storeId: string, 
  username: string,
  kasirList: Record<string, any> = {},
  transactions: any[] = [],
  absensiList: any[] = [],
  voucherTransactions: any[] = [],
  voucherProducts: any[] = []
): string | null {
  const c = text.toLowerCase().trim()

  // ── 0c. EXECUTIVE BRIEFING OWNER (GOAL 4) ─────────────────────────────
  if (c.includes('briefing owner') || c.includes('executive briefing') || c.includes('ringkasan eksekutif') || c.includes('laporan pagi owner') || c.includes('briefing pagi') || c === 'briefing') {
    return generateExecutiveBriefing(storeId, username, kasirList, transactions, absensiList, voucherTransactions, voucherProducts)
  }

  // ── 0d. PREDIKSI KEHABISAN STOK & REKOMENDASI RESTOK (GOAL 3) ────────────
  if (c.includes('prediksi stok') || c.includes('kapan stok habis') || c.includes('estimasi sisa stok') || c.includes('rekomendasi belanja') || c.includes('rekomendasi restok') || c.includes('sisa stok')) {
    let prods: any[] = voucherProducts.length > 0 ? voucherProducts : []
    if (prods.length === 0) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || ''
          if (k.startsWith(`v_${storeId}`) && k.endsWith('_products')) {
            const raw = localStorage.getItem(k)
            if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) prods = [...prods, ...p] }
          }
        }
        const seen = new Set()
        prods = prods.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
      } catch {}
    }

    if (prods.length === 0) return "📦 Belum ada data produk/voucher untuk dihitung prediksi stoknya."

    const salesCountMap: Record<string, number> = {}
    const nowDays = 30
    voucherTransactions.forEach(vt => {
      const pid = vt.productId || vt.product_id
      if (pid) {
        salesCountMap[pid] = (salesCountMap[pid] || 0) + (vt.quantity || 1)
      }
    })

    const kritisList: any[] = []
    const waspadaList: any[] = []
    const amanList: any[] = []
    let totalRekomendasiBiaya = 0

    prods.forEach(p => {
      const current = p.currentStock ?? p.stock ?? 0
      const totalTerjual = salesCountMap[p.id] || 0
      const dailyVelocity = totalTerjual > 0 ? (totalTerjual / nowDays) : 0.2
      const sisaHari = dailyVelocity > 0 ? Math.floor(current / dailyVelocity) : 99
      const targetBuffer14Hari = Math.ceil(dailyVelocity * 14)
      const saranBeli = Math.max(0, targetBuffer14Hari - current)
      const buyPrice = p.buyPrice || p.hargaBeli || 0
      const estimasiBiaya = saranBeli * buyPrice

      const itemInfo = {
        name: p.name,
        current,
        dailyVelocity: dailyVelocity.toFixed(1),
        sisaHari: sisaHari > 90 ? '90+' : sisaHari,
        saranBeli,
        estimasiBiaya
      }

      if (current <= (p.minStockLevel ?? 3) || (typeof sisaHari === 'number' && sisaHari <= 3)) {
        kritisList.push(itemInfo)
        totalRekomendasiBiaya += estimasiBiaya
      } else if (typeof sisaHari === 'number' && sisaHari <= 7) {
        waspadaList.push(itemInfo)
        totalRekomendasiBiaya += estimasiBiaya
      } else {
        amanList.push(itemInfo)
      }
    })

    let res = `🔮 **Prediksi Kehabisan Stok & Rekomendasi Restok (Velocity Forecast):**\n\n`

    if (kritisList.length > 0) {
      res += `🚨 **STOK KRITIS (Habis dalam ≤ 3 Hari):**\n`
      kritisList.forEach((item, idx) => {
        res += `${idx + 1}. **${item.name}**\n   • Sisa Stok: **${item.current} pcs** (Est. Habis: **${item.sisaHari} hari lagi**)\n   • Laju Penjualan: ~${item.dailyVelocity} pcs/hari\n   • 💡 *Saran Restok*: **+${item.saranBeli} pcs** ${item.estimasiBiaya > 0 ? `(Est. Rp ${item.estimasiBiaya.toLocaleString('id-ID')})` : ''}\n\n`
      })
    }

    if (waspadaList.length > 0) {
      res += `⚠️ **STOK WASPADA (Habis dalam 4-7 Hari):**\n`
      waspadaList.forEach((item, idx) => {
        res += `${idx + 1}. **${item.name}** — Sisa ${item.current} pcs (Habis ~${item.sisaHari} hari) | Restok: +${item.saranBeli} pcs\n`
      })
      res += `\n`
    }

    if (kritisList.length === 0 && waspadaList.length === 0) {
      res += `✅ **Semua Stok Aman!** Tidak ada produk yang diprediksi habis dalam 7 hari ke depan.\n\n`
    }

    if (totalRekomendasiBiaya > 0) {
      res += `💰 **Estimasi Total Anggaran Restok (14 Hari Buffer):** **Rp ${totalRekomendasiBiaya.toLocaleString('id-ID')}**`
    }

    return res
  }

  // ── 0e. PROYEKSI OMSET & SALES FORECASTING (GOAL 3) ─────────────────────
  if (c.includes('proyeksi omset') || c.includes('prediksi penjualan') || c.includes('target omset') || c.includes('forecasting penjualan') || c.includes('perkiraan omset')) {
    const now = new Date()
    const currentDay = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const remainingDays = daysInMonth - currentDay

    const thisMonthStr = now.toISOString().substring(0, 7)
    let omsetBulanIni = 0
    let adminBulanIni = 0
    let countBulanIni = 0

    transactions.forEach(t => {
      if (t.kategori === 'Isi Saldo Bank' || t.kategori === 'Isi Saldo Real Aplikasi') return
      if ((t.timestamp || '').startsWith(thisMonthStr)) {
        omsetBulanIni += (t.nominal || 0)
        adminBulanIni += (t.adminFee || 0)
        countBulanIni++
      }
    })

    voucherTransactions.forEach(vt => {
      const ts = vt.timestamp || vt.date || ''
      if (ts.startsWith(thisMonthStr)) {
        omsetBulanIni += (vt.totalSalesAmount || ((vt.sellingPrice || 0) * (vt.quantity || 1)) || 0)
        adminBulanIni += (vt.admin || ((vt.sellingPrice || 0) - (vt.buyPrice || 0)) || 0)
      }
    })

    const avgDailyOmset = currentDay > 0 ? (omsetBulanIni / currentDay) : 0
    const avgDailyAdmin = currentDay > 0 ? (adminBulanIni / currentDay) : 0
    const projectedMonthlyOmset = avgDailyOmset * daysInMonth
    const projectedMonthlyAdmin = avgDailyAdmin * daysInMonth

    let res = `📈 **Proyeksi Omset & Sales Forecasting (End-of-Month):**\n\n`
    res += `• Omset Berjalan (${currentDay} Hari): **Rp ${omsetBulanIni.toLocaleString('id-ID')}** (${countBulanIni} trx)\n`
    res += `• Rata-rata Omset per Hari: Rp ${Math.round(avgDailyOmset).toLocaleString('id-ID')}/hari\n`
    res += `• Sisa Hari Bulan Ini: ${remainingDays} Hari lagi\n\n`

    res += `🎯 **PROYEKSI AKHIR BULAN (ESTIMASI):**\n`
    res += `• Projected Total Omset: **Rp ${Math.round(projectedMonthlyOmset).toLocaleString('id-ID')}**\n`
    res += `• Projected Fee Admin Profit: **Rp ${Math.round(projectedMonthlyAdmin).toLocaleString('id-ID')}**\n\n`

    res += `💡 *Target Rekomendasi*: Jaga minimal omset harian kasir di angka **Rp ${Math.round(avgDailyOmset).toLocaleString('id-ID')}** untuk mencapai proyeksi tersebut.`
    return res
  }

  // ── 0f. DYNAMIC FAQ TRAINER & LOOKUP (GOAL 5) ───────────────────────────
  // a. Command Input FAQ baru ("ajari bot wifi | 123456" atau "tambah faq wifi | 123456")
  if ((c.startsWith('tambah faq') || c.startsWith('catat faq') || c.startsWith('tambah jawaban') || c.startsWith('ajari bot')) && text.includes('|')) {
    let clean = text.replace(/^(tambah faq|catat faq|tambah jawaban|ajari bot)\s*/i, '').trim()
    const parts = clean.split('|')
    if (parts.length >= 2) {
      const tanya = parts[0].trim()
      const jawab = parts.slice(1).join('|').trim()
      if (tanya && jawab) {
        return `💡 **Konfirmasi FAQ Baru Toko:**\n\nIngin mengajarkan bot jawaban kustom untuk pertanyaan ini?\n• Pertanyaan: **"${tanya}"**\n• Jawaban: **"${jawab}"**\n\n[ACTION:custom_faq|${tanya}|${jawab}]`
      }
    }
  }

  // b. Command Lihat Daftar FAQ Kustom Toko
  if (c === 'daftar faq' || c === 'faq toko' || c === 'jawaban kustom' || c === 'apa yang bot tahu' || c.includes('lihat faq')) {
    let customFaqList: any[] = []
    try {
      const saved = localStorage.getItem(`alphaPro_${storeId}_custom_faq`)
      if (saved) customFaqList = JSON.parse(saved)
    } catch {}

    if (!Array.isArray(customFaqList) || customFaqList.length === 0) {
      return `📚 **Daftar FAQ Kustom Toko Masih Kosong.**\n\nOwner dapat mengajari bot jawaban khusus toko dengan mengetik:\n*"ajari bot [pertanyaan] | [jawaban]"*\nContoh: *"ajari bot wifi toko | Wifi12345"*`
    }

    let res = `📚 **Daftar FAQ Kustom Toko (${customFaqList.length} Jawaban Tersimpan):**\n\n`
    customFaqList.forEach((item, idx) => {
      res += `${idx + 1}. ❓ **${item.question}**\n   💬 ${item.answer}\n\n`
    })
    res += `💡 *Petunjuk*: Ajari bot FAQ baru kapan saja dengan format: *"ajari bot [pertanyaan] | [jawaban]"*`
    return res
  }

  // c. Lookup Custom FAQ Kustom saat user bertanya
  try {
    const saved = localStorage.getItem(`alphaPro_${storeId}_custom_faq`)
    if (saved) {
      const customFaqList: any[] = JSON.parse(saved)
      if (Array.isArray(customFaqList)) {
        const matched = customFaqList.find(f => {
          const q = (f.question || '').toLowerCase()
          return q && (c.includes(q) || q.includes(c))
        })
        if (matched) {
          return `💡 **Info Toko (${matched.question}):**\n\n${matched.answer}`
        }
      }
    }
  } catch {}

  // ── 0g. DEEP SYSTEM ANOMALY DETECTOR & AUDIT GUARD (GOAL 6) ─────────────
  if (c.includes('deteksi anomali') || c.includes('cek kejanggalan') || c.includes('audit otomatis') || c.includes('cek kecurangan') || c.includes('anomali') || c.includes('skor kesehatan') || c.includes('audit guard')) {
    let healthScore = 100
    const anomalyFlags: string[] = []

    // 1. Cek Selisih Shift Kasir (Audit Discrepancies)
    let handovers: any[] = []
    try {
      const saved = localStorage.getItem(`alphaPro_${storeId}_handover_records`)
      if (saved) handovers = JSON.parse(saved)
    } catch {}

    const minusHandovers = handovers.filter((h: any) => {
      const kasPhysical = h.cashPhysical ?? h.kasPhysical ?? 0
      const kasExpected = h.cashExpected ?? h.kasExpected ?? 0
      const diff = h.cashDifference ?? (kasPhysical - kasExpected)
      return diff < 0
    })

    if (minusHandovers.length > 0) {
      healthScore -= (minusHandovers.length * 15)
      const totalMinus = minusHandovers.reduce((s, h) => {
        const diff = Math.abs(h.cashDifference ?? ((h.cashPhysical ?? 0) - (h.cashExpected ?? 0)))
        return s + diff
      }, 0)
      anomalyFlags.push(`🚨 **Selisih Kasir Minus (${minusHandovers.length} Shift):** Terdeteksi selisih uang kurang sebesar Rp ${totalMinus.toLocaleString('id-ID')}. Kasir: ${[...new Set(minusHandovers.map(h => h.cashierFromName || h.kasirFrom))].join(', ')}.`)
    }

    // 2. Cek Kasbon Over-Limit (>30 Hari / Exceeding Limit)
    let kasbonList: any[] = []
    try {
      const saved = localStorage.getItem(`alphaPro_${storeId}_kasbon_list`)
      if (saved) kasbonList = JSON.parse(saved)
    } catch {}

    const kasbonAktif = kasbonList.filter(h => !h.lunas)
    const totalKasbonAktif = kasbonAktif.reduce((s, h) => s + (h.nominal || 0), 0)
    if (totalKasbonAktif > 1000000) {
      healthScore -= 15
      anomalyFlags.push(`⚠️ **Kasbon Aktif Tinggi:** Total piutang kasbon belum lunas mencapai **Rp ${totalKasbonAktif.toLocaleString('id-ID')}** (${kasbonAktif.length} transaksi). Berisiko mengganggu *cash flow* toko.`)
    }

    // 3. Cek Penurunan Omset (Omset Drop Anomaly)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    let omsetToday = 0
    transactions.forEach(t => {
      if (t.kategori === 'Isi Saldo Bank' || t.kategori === 'Isi Saldo Real Aplikasi') return
      if ((t.timestamp || '').startsWith(todayStr)) omsetToday += (t.nominal || 0)
    })
    voucherTransactions.forEach(vt => {
      const ts = vt.timestamp || vt.date || ''
      if (ts.startsWith(todayStr)) omsetToday += (vt.totalSalesAmount || ((vt.sellingPrice || 0) * (vt.quantity || 1)) || 0)
    })

    const currentDay = now.getDate()
    const thisMonthStr = now.toISOString().substring(0, 7)
    let monthlyOmset = 0
    transactions.forEach(t => {
      if (t.kategori === 'Isi Saldo Bank' || t.kategori === 'Isi Saldo Real Aplikasi') return
      if ((t.timestamp || '').startsWith(thisMonthStr)) monthlyOmset += (t.nominal || 0)
    })
    const avgOmset = currentDay > 1 ? (monthlyOmset / currentDay) : omsetToday
    if (currentDay > 1 && omsetToday < (avgOmset * 0.4)) {
      healthScore -= 10
      anomalyFlags.push(`📉 **Anomali Omset Harian:** Omset hari ini (Rp ${omsetToday.toLocaleString('id-ID')}) berada di bawah 40% dari rata-rata harian toko (Rp ${Math.round(avgOmset).toLocaleString('id-ID')}).`)
    }

    // 4. Cek Dead Stock Voucher
    let prods: any[] = voucherProducts.length > 0 ? voucherProducts : []
    if (prods.length === 0) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || ''
          if (k.startsWith(`v_${storeId}`) && k.endsWith('_products')) {
            const raw = localStorage.getItem(k)
            if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) prods = [...prods, ...p] }
          }
        }
      } catch {}
    }
    const soldIds = new Set(voucherTransactions.map(t => t.productId || t.product_id))
    const deadStock = prods.filter(p => !soldIds.has(p.id) && (p.currentStock ?? p.stock ?? 0) > 0)
    if (deadStock.length > 0) {
      healthScore -= 10
      anomalyFlags.push(`📦 **Dead Stock Voucher:** Terdapat ${deadStock.length} produk voucher bernilai modal yang tidak terjual dalam 30 hari terakhir.`)
    }

    healthScore = Math.max(10, healthScore)
    const scoreEmoji = healthScore >= 85 ? '🟢 PERFECT' : healthScore >= 70 ? '🟡 GOOD' : '🔴 NEEDS ATTENTION'

    let res = `🛡️ **REKAP AUDIT & DETEKSI ANOMALI OPERASIONAL (AUDIT GUARD):**\n\n`
    res += `📊 Skor Kesehatan Operasional Toko: **${healthScore}%** (${scoreEmoji})\n\n`

    if (anomalyFlags.length > 0) {
      res += `🚨 **TEMUAN ANOMALI & PERINGATAN KELAYAKAN (${anomalyFlags.length} Poin):**\n`
      anomalyFlags.forEach((flag, idx) => {
        res += `${idx + 1}. ${flag}\n`
      })
      res += `\n💡 **REKOMENDASI MITIGASI RESIKO:**\n`
      res += `1. Verifikasi fisik uang kasir sebelum menutup shift di Laporan Handover.\n`
      res += `2. Evaluasi kebijakan pemotongan gaji untuk kasbon yang tertunggak.\n`
      res += `3. Lakukan promosi diskon bundle untuk mencairkan *dead stock* voucher.`
    } else {
      res += `✅ **Toko Bebas Anomali!** Seluruh indikator keuangan, stok voucher, dan presensi kasir berada dalam kondisi sehat dan tidak ada indikasi kejanggalan.`
    }

    return res
  }

  // ── 0. OFFLINE COMMAND EXECUTION (ACTION DETECTOR) ──────────────────────
  // a. Action Kasbon (Offline Parsing)
  if ((c.startsWith('catat kasbon') || c.startsWith('tambah kasbon') || c.startsWith('buat kasbon') || c.startsWith('input kasbon') || c.startsWith('kasbon baru')) && (c.includes('nama') || c.match(/\d/))) {
    const numMatch = c.match(/(\d[\d.,]*)\s*(rb|ribu|k)?/i)
    let nominal = 0
    if (numMatch) {
      const raw = numMatch[1].replace(/\./g, '').replace(',', '.')
      const mult = numMatch[2] ? (numMatch[2].toLowerCase() === 'k' || numMatch[2].toLowerCase().startsWith('r') ? 1000 : 1) : 1
      nominal = Math.round(parseFloat(raw) * mult)
    }
    let nama = ''
    const namaMatch = c.match(/nama\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:ket|keterangan|alasan|nominal|rp|\d)|$)/i)
    if (namaMatch) {
      nama = namaMatch[1].trim()
    } else {
      const clean = c.replace(/catat|tambah|buat|input|kasbon|baru|rp|\d[\d.,]*\s*(rb|ribu|k)?/gi, '').trim()
      nama = clean.split(' ')[0] || 'Pelanggan'
    }
    let ket = ''
    const ketMatch = c.match(/(?:ket|keterangan|alasan)\s+(.+)$/i)
    if (ketMatch) ket = ketMatch[1].trim()

    if (nominal > 0 && nama) {
      return `Konfirmasi penambahan kasbon:\n\n• **Nama**: ${nama}\n• **Nominal**: Rp ${nominal.toLocaleString('id-ID')}\n• **Keterangan**: ${ket || '-'}\n\nApakah kamu yakin ingin mencatat data kasbon ini?\n\n[ACTION:kasbon|${nama}|${nominal}|${ket}]`
    }
  }

  // b. Action Kontak (Offline Parsing)
  if ((c.startsWith('simpan kontak') || c.startsWith('tambah kontak') || c.startsWith('catat kontak') || c.startsWith('input kontak')) && c.match(/\d{5,}/)) {
    const phoneMatch = c.match(/(\d{8,15})/)
    const nomor = phoneMatch ? phoneMatch[1] : ''
    let clean = c.replace(/simpan|tambah|catat|input|kontak|nomor|no|hp|\d{8,15}/gi, '').trim()
    let nama = clean.split(/\s+(?:ket|keterangan)/i)[0].trim() || 'Kontak Baru'
    let ket = ''
    const ketMatch = c.match(/(?:ket|keterangan)\s+(.+)$/i)
    if (ketMatch) ket = ketMatch[1].trim()

    if (nomor && nama) {
      return `Konfirmasi simpan kontak:\n\n• **Nama**: ${nama}\n• **No. HP**: ${nomor}\n• **Keterangan**: ${ket || '-'}\n\nSimpan kontak ini ke Buku Kontak?\n\n[ACTION:kontak|${nama}|${nomor}|${ket}]`
    }
  }

  // c. Action Izin (Offline Parsing)
  if (c.startsWith('catat izin') || c.startsWith('tambah izin') || c.startsWith('input izin')) {
    const today = new Date().toISOString().split('T')[0]
    let usernameMatch = c.match(/(?:kasir|karyawan|nama)?\s*([a-zA-Z0-9_]+)\s+(?:tanggal|tgl|alasan)/i)
    let usernameTarget = usernameMatch ? usernameMatch[1] : username
    let tglMatch = c.match(/(?:tanggal|tgl)\s+([0-9]{4}-[0-9]{2}-[0-9]{2})/i)
    let tgl = tglMatch ? tglMatch[1] : today
    let alasanMatch = c.match(/alasan\s+(.+)$/i)
    let alasan = alasanMatch ? alasanMatch[1].trim() : 'Izin kerja'

    return `Konfirmasi pencatatan izin:\n\n• **Kasir**: ${usernameTarget}\n• **Tanggal**: ${tgl}\n• **Alasan**: ${alasan}\n\nCatat data izin karyawan ini?\n\n[ACTION:izin|${usernameTarget}|${tgl}|${alasan}]`
  }

  // d. Action Catatan Owner (Offline Parsing)
  if (c.startsWith('buat catatan') || c.startsWith('catat owner') || c.startsWith('tambah catatan')) {
    let clean = c.replace(/buat|catat|tambah|catatan|owner/gi, '').trim()
    let judul = clean.split('\n')[0] || 'Catatan Penting Toko'
    let isi = clean || judul

    if (clean) {
      return `Konfirmasi simpan catatan owner:\n\n• **Judul**: ${judul}\n• **Isi**: ${isi}\n\nSimpan catatan ini ke Buku Catatan Owner?\n\n[ACTION:catatan|${judul}|${isi}]`
    }
  }

  // ── 0b. CROSS-TABLE ANALYTICS ───────────────────────────────────────────
  // A. Profit Bersih Konsolidasi (Cross Table: Transactions + Vouchers + Salaries + Kasbon)
  if (c.includes('profit bersih') || c.includes('laba bersih') || c.includes('keuntungan bersih') || c.includes('hitung profit bersih')) {
    let totalAdminStore = 0
    transactions.forEach(t => {
      if (t.kategori !== 'Isi Saldo Bank' && t.kategori !== 'Isi Saldo Real Aplikasi') {
        totalAdminStore += (t.adminFee || 0)
      }
    })

    let totalVoucherProfit = 0
    voucherTransactions.forEach(vt => {
      totalVoucherProfit += (vt.admin || ((vt.sellingPrice || 0) - (vt.buyPrice || 0)) || 0)
    })

    let totalGajiStaff = 0
    Object.values(kasirList).forEach(k => {
      if (k.role !== 'owner') {
        totalGajiStaff += (k.gajiPokok || 0)
      }
    })

    let kasbonList: any[] = []
    try {
      const saved = localStorage.getItem(`alphaPro_${storeId}_kasbon_list`)
      if (saved) kasbonList = JSON.parse(saved)
    } catch {}
    const totalKasbonAktif = kasbonList.filter(h => !h.lunas).reduce((s, h) => s + (h.nominal || 0), 0)

    const totalPendapatanKotor = totalAdminStore + totalVoucherProfit
    const totalEstimasiPengeluaran = totalGajiStaff
    const estimasiProfitBersih = totalPendapatanKotor - totalEstimasiPengeluaran

    let res = `📊 **Analisis Profit Bersih Konsolidasi (Cross-Table):**\n\n`
    res += `💵 **Pendapatan & Laba:**\n`
    res += `• Profit Fee Admin Transaksi: Rp ${totalAdminStore.toLocaleString('id-ID')}\n`
    res += `• Margin / Profit Voucher: Rp ${totalVoucherProfit.toLocaleString('id-ID')}\n`
    res += `👉 **Total Pendapatan Operasional**: **Rp ${totalPendapatanKotor.toLocaleString('id-ID')}**\n\n`

    res += `💼 **Estimasi Pengeluaran & Beban:**\n`
    res += `• Total Gaji Pokok Kasir (${Object.keys(kasirList).length} staf): Rp ${totalGajiStaff.toLocaleString('id-ID')}\n`
    res += `• Total Kasbon Belum Lunas: Rp ${totalKasbonAktif.toLocaleString('id-ID')}\n\n`

    res += `✨ **ESTIMASI PROFIT BERSIH TOKO**: **Rp ${estimasiProfitBersih.toLocaleString('id-ID')}**\n`
    if (estimasiProfitBersih > 0) {
      res += `\n✅ Toko dalam kondisi *SURPLUS / UNTUNG*.`
    } else {
      res += `\n⚠️ Beban operasional & gaji lebih besar dari pendapatan admin bulan ini.`
    }
    return res
  }

  // B. Korelasi Kehadiran & Produktivitas Shift (Cross Table: Absensi + Transactions)
  if (c.includes('kasir paling produktif') || c.includes('produktivitas shift') || c.includes('kinerja shift') || c.includes('kasir rajin jualan') || c.includes('produktivitas kasir')) {
    const statsPerKasir: Record<string, { hadir: number; totalNominal: number; totalTrx: number }> = {}

    absensiList.forEach(a => {
      const k = a.namaKasir || a.username || 'Kasir'
      if (!statsPerKasir[k]) statsPerKasir[k] = { hadir: 0, totalNominal: 0, totalTrx: 0 }
      if (a.status === 'Hadir' || a.status === 'Hadir Shift') statsPerKasir[k].hadir++
    })

    transactions.forEach(t => {
      if (t.kategori === 'Isi Saldo Bank' || t.kategori === 'Isi Saldo Real Aplikasi') return
      const k = t.kasirName || t.kasir_id || 'Kasir'
      if (!statsPerKasir[k]) statsPerKasir[k] = { hadir: 1, totalNominal: 0, totalTrx: 0 }
      statsPerKasir[k].totalNominal += (t.nominal || 0)
      statsPerKasir[k].totalTrx++
    })

    const list = Object.entries(statsPerKasir).map(([nama, d]) => {
      const rataRataHari = d.hadir > 0 ? (d.totalNominal / d.hadir) : d.totalNominal
      const rataRataTrx = d.hadir > 0 ? (d.totalTrx / d.hadir) : d.totalTrx
      return { nama, ...d, rataRataHari, rataRataTrx }
    }).sort((a, b) => b.rataRataHari - a.rataRataHari)

    if (list.length === 0) return "📊 Belum ada data korelasi absensi dan transaksi yang dapat dihitung."

    let res = `⚡ **Analisis Produktivitas & Efisiensi Kasir per Shift:**\n\n`
    list.forEach((item, idx) => {
      const icon = idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'
      res += `${icon} **${item.nama}**\n`
      res += `   • Presensi / Hadir: **${item.hadir} hari**\n`
      res += `   • Total Volume Trx: Rp ${item.totalNominal.toLocaleString('id-ID')} (${item.totalTrx} trx)\n`
      res += `   • **Rata-rata Omset per Hari Shift**: **Rp ${Math.round(item.rataRataHari).toLocaleString('id-ID')}** (${item.rataRataTrx.toFixed(1)} trx/hari)\n\n`
    })
    res += `💡 _Korelatif: Kasir dengan nilai omset per hari shift tertinggi adalah yang paling efektif saat bertugas._`
    return res
  }

  // C. Analisis Rasio Kasbon vs Estimasi Gaji (Cross Table: Kasbon + Kasir Base Salary)
  if (c.includes('rasio kasbon') || c.includes('kasbon vs gaji') || c.includes('kasbon melebihi gaji') || c.includes('analisa kasbon kasir') || c.includes('kasbon kasir vs gaji')) {
    let kasbonList: any[] = []
    try {
      const saved = localStorage.getItem(`alphaPro_${storeId}_kasbon_list`)
      if (saved) kasbonList = JSON.parse(saved)
    } catch {}

    const kasbonPerKasir: Record<string, number> = {}
    kasbonList.filter(h => !h.lunas).forEach(h => {
      const k = h.nama || 'Umum'
      kasbonPerKasir[k] = (kasbonPerKasir[k] || 0) + (h.nominal || 0)
    })

    if (Object.keys(kasbonPerKasir).length === 0) return "🎉 Tidak ada kasbon kasir/karyawan yang aktif saat ini."

    let res = `💳 **Analisis Rasio Kasbon vs Estimasi Gaji Karyawan:**\n\n`
    let warningCount = 0

    Object.entries(kasirList).forEach(([uname, data]) => {
      const nama = data.name || uname
      const totalKasbon = kasbonPerKasir[nama] || kasbonPerKasir[uname] || 0
      const gaji = data.gajiPokok || 0

      if (totalKasbon > 0) {
        const rasio = gaji > 0 ? (totalKasbon / gaji) * 100 : 100
        let status = '✅ Aman (<50%)'
        if (rasio > 100) { status = '🚨 SANGAT BAHAYA (>100% Gaji)'; warningCount++ }
        else if (rasio >= 50) { status = '⚠️ PERLU DIWASPADAI (≥50% Gaji)'; warningCount++ }

        res += `👤 **${nama}** (${data.role || 'kasir'})\n`
        res += `   • Total Kasbon Aktif: Rp ${totalKasbon.toLocaleString('id-ID')}\n`
        res += `   • Gaji Pokok Bulanan: Rp ${gaji.toLocaleString('id-ID')}\n`
        res += `   • **Rasio Pemotongan Gaji**: **${rasio.toFixed(1)}%** — Status: ${status}\n\n`
      }
    })

    if (warningCount > 0) {
      res += `⚠️ *Peringatan Owner:* Ada ${warningCount} karyawan yang akumulasi kasbonnya sudah melebihi 50% dari gaji bulanan.`
    }
    return res
  }

  // 1. KASBON SEARCH
  if (c.includes('kasbon') || c.includes('utang') || c.includes('piutang') || c.includes('bon') || c.includes('hutang')) {
    let kasbonList: any[] = []
    try {
      const saved = localStorage.getItem(`alphaPro_${storeId}_kasbon_list`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) kasbonList = parsed
      }
    } catch {}

    // Cek tukang kasbon / utang terlama
    if (c.includes('paling sering') || c.includes('paling banyak ngutang') || c.includes('tukang kasbon') || c.includes('utang paling lama') || c.includes('kasbon terlama') || c.includes('paling lama utang')) {
      const aktif = kasbonList.filter(h => !h.lunas)
      if (aktif.length === 0) return "🎉 **Bebas Kasbon!** Saat ini tidak ada pelanggan yang memiliki hutang/kasbon belum lunas."
      
      if (c.includes('lama') || c.includes('terlama')) {
        const sorted = aktif.sort((a,b) => (a.tanggal || '').localeCompare(b.tanggal || ''))
        let res = `⏳ **Daftar Utang Paling Lama (Belum Lunas):**\n\n`
        sorted.slice(0, 5).forEach((h, i) => {
          res += `${i+1}. **${h.nama}** — Rp ${h.nominal?.toLocaleString('id-ID')} _(Sejak: ${h.tanggal})_\n`
        })
        return res
      } else {
        const freq: Record<string, { count: number; nominal: number }> = {}
        aktif.forEach(h => {
          const name = (h.nama || '').toUpperCase()
          if (!freq[name]) freq[name] = { count: 0, nominal: 0 }
          freq[name].count++
          freq[name].nominal += (h.nominal || 0)
        })
        const sorted = Object.entries(freq).sort((a,b) => b[1].count - a[1].count)
        let res = `⚠️ **Pelanggan Paling Sering Kasbon (Belum Lunas):**\n\n`
        sorted.slice(0, 5).forEach(([name, d], i) => {
          res += `${i+1}. **${name}** — ${d.count} kali bon (Total: Rp ${d.nominal.toLocaleString('id-ID')})\n`
        })
        return res
      }
    }

    // Cek rekap kasbon
    if (c.includes('siapa') || c.includes('daftar') || c.includes('total') || c.includes('rekap') || c === 'kasbon' || c === 'utang' || c === 'piutang') {
      const aktif = kasbonList.filter(h => !h.lunas)
      if (aktif.length === 0) {
        return "🎉 **Bebas Kasbon!** Saat ini tidak ada pelanggan yang memiliki kasbon belum lunas di toko ini."
      }
      const total = aktif.reduce((sum, h) => sum + (h.nominal || 0), 0)
      let res = `💰 **Daftar Kasbon Aktif (Belum Lunas):**\n\n`
      aktif.slice(0, 15).forEach((h, idx) => {
        res += `${idx + 1}. **${h.nama}**: Rp ${h.nominal?.toLocaleString('id-ID')} _(${h.tanggal}${h.keterangan ? ' - ' + h.keterangan : ''})_\n`
      })
      if (aktif.length > 15) {
        res += `...dan ${aktif.length - 15} data kasbon lainnya.\n`
      }
      res += `\n*Total Piutang Toko:* **Rp ${total.toLocaleString('id-ID')}** (dari ${aktif.length} catatan)`
      return res
    }

    // Cari nama spesifik
    let query = c.replace(/kasbon|utang|piutang|bon|hutang/g, '').replace(/cari|cek|tampilkan|berapa/g, '').trim()
    if (query.length > 1) {
      const matches = kasbonList.filter(h => h.nama.toLowerCase().includes(query) || (h.keterangan && h.keterangan.toLowerCase().includes(query)))
      if (matches.length === 0) {
        return `❌ Data kasbon dengan pencarian **"${query}"** tidak ditemukan.`
      }
      let res = `📝 **Catatan Kasbon Ditemukan ("${query}"):**\n\n`
      matches.forEach((h, idx) => {
        const status = h.lunas ? `✅ *Lunas* (${h.tglLunas || ''})` : `⚠️ *Belum Lunas*`
        res += `${idx + 1}. **${h.nama}**: Rp ${h.nominal?.toLocaleString('id-ID')} - ${status}\n   _Tanggal: ${h.tanggal} | Ket: ${h.keterangan || '-'}_ \n`
      })
      return res
    }
  }

  // 2. KONTAK SEARCH
  if (c.includes('kontak') || c.includes('nomor') || c.includes('no hp') || c.includes('telepon') || c.includes('rekening') || c.includes('token') || c.includes('rekap kontak')) {
    let kontakList: any[] = []
    try {
      const saved = localStorage.getItem(`alphaPro_${storeId}_kontak_list`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) kontakList = parsed
      }
    } catch {}

    if (c.includes('siapa') || c.includes('daftar') || c.includes('semua') || c === 'kontak') {
      if (kontakList.length === 0) {
        return "📇 **Buku Kontak Kosong:** Belum ada kontak pelanggan yang terdaftar."
      }
      let res = `📇 **Daftar Kontak Terdaftar (Top 15):**\n\n`
      kontakList.slice(0, 15).forEach((k, idx) => {
        res += `${idx + 1}. **${k.nama}**: ${k.nomor || '-'} _(${k.keterangan || '-'})_\n`
      })
      if (kontakList.length > 15) {
        res += `...dan ${kontakList.length - 15} kontak lainnya.\n`
      }
      return res
    }

    let query = c.replace(/kontak|nomor|no hp|telepon|telp|rekening|token/g, '').replace(/cari|cek|tampilkan/g, '').trim()
    if (query.length > 1) {
      const matches = kontakList.filter(k => k.nama.toLowerCase().includes(query) || (k.keterangan && k.keterangan.toLowerCase().includes(query)) || (k.nomor && k.nomor.includes(query)))
      if (matches.length === 0) {
        return `❌ Kontak dengan pencarian **"${query}"** tidak ditemukan.`
      }
      let res = `📞 **Hasil Pencarian Kontak ("${query}"):**\n\n`
      matches.forEach((k, idx) => {
        res += `${idx + 1}. **${k.nama}**: **${k.nomor || '-'}**\n   _Keterangan: ${k.keterangan || '-'}_ \n`
      })
      return res
    }
  }

  // 3. KASIR / KARYAWAN SEARCH
  if (c.includes('kasir') || c.includes('karyawan') || c.includes('pegawai') || c.includes('gaji') || c.includes('awal kerja') || c.includes('catatan awal') || c.includes('join')) {
    const kasirKeys = Object.keys(kasirList)
    
    if (c.includes('siapa') || c.includes('daftar') || c.includes('semua') || c.includes('data')) {
      if (kasirKeys.length === 0) {
        return "👥 **Data Kasir Kosong:** Belum ada akun kasir terdaftar di toko ini."
      }
      let res = `👥 **Daftar Kasir Toko:**\n\n`
      kasirKeys.forEach((key, idx) => {
        const k = kasirList[key]
        res += `${idx + 1}. **${k.name}** (Username: \`${key}\`)\n   Role: ${k.role || 'kasir'} | Join: ${k.tanggalJoin || '-'}\n`
      })
      return res
    }

    let query = c.replace(/kasir|karyawan|pegawai|gaji|awal kerja|catatan awal|catatan|join/g, '').replace(/cari|cek|tampilkan|berapa/g, '').trim()
    if (query.length > 1) {
      const matchedKey = kasirKeys.find(key => key.toLowerCase().includes(query) || (kasirList[key].name && kasirList[key].name.toLowerCase().includes(query)))
      if (matchedKey) {
        const k = kasirList[matchedKey]
        return `👤 **Profil Kasir: ${k.name}**\n\n` +
               `• **Username**: \`${matchedKey}\`\n` +
               `• **Role**: ${k.role || 'kasir'}\n` +
               `• **Gaji Pokok**: Rp ${(k.gajiPokok || 0).toLocaleString('id-ID')}\n` +
               `• **Tanggal Join**: ${k.tanggalJoin || '-'}\n` +
               `• **Alamat**: ${k.alamat || '-'}\n` +
               `• **TTL**: ${k.tempatLahir || '-'}${k.tanggalLahir ? ', ' + k.tanggalLahir : ''}\n` +
               `• **Catatan Awal Kerja**: ${k.catatanAwalKerja || '-'}`
      } else {
        return `❌ Data kasir/karyawan **"${query}"** tidak ditemukan.`
      }
    }
  }

  // 4. TRANSAKSI/PENJUALAN SEARCH
  if (c.includes('transaksi') || c.includes('penjualan') || c.includes('omset') || c.includes('omzet') || c.includes('keuntungan') || c.includes('rekap') || c.includes('laporan') || c.includes('penjualan hari ini')) {
    if (transactions.length === 0) {
      return "📊 **Penjualan Hari Ini:** Belum ada transaksi penjualan yang tercatat hari ini di sistem."
    }
    
    const totalNominal = transactions.reduce((sum, t) => sum + (t.nominal || 0), 0)
    const totalAdmin = transactions.reduce((sum, t) => sum + (t.adminFee || 0), 0)
    
    const catMap: Record<string, { count: number, nominal: number, admin: number }> = {}
    transactions.forEach(t => {
      const cat = t.kategori || 'Lain-lain'
      if (!catMap[cat]) catMap[cat] = { count: 0, nominal: 0, admin: 0 }
      catMap[cat].count += 1
      catMap[cat].nominal += (t.nominal || 0)
      catMap[cat].admin += (t.adminFee || 0)
    })

    let res = `📊 **Rekap Transaksi Hari Ini:**\n\n` +
              `• **Total Transaksi**: ${transactions.length} trx\n` +
              `• **Total Nominal**: Rp ${totalNominal.toLocaleString('id-ID')}\n` +
              `• **Total Biaya Admin**: Rp ${totalAdmin.toLocaleString('id-ID')}\n\n` +
              `⚙️ **Rincian per Kategori:**\n`
    
    Object.entries(catMap).forEach(([cat, data]) => {
      res += `- **${cat}**: ${data.count} trx | Vol: Rp ${data.nominal.toLocaleString('id-ID')} | Admin: Rp ${data.admin.toLocaleString('id-ID')}\n`
    })
    
    return res
  }

  // 4b. ANALISA KASIR TERBAIK / PROFIT TERBANYAK
  if (c.includes('kasir siapa') || c.includes('kasir mana') || c.includes('kasir terbaik') || c.includes('paling banyak profit') || c.includes('jualan paling banyak') || c.includes('jualan terbanyak') || c.includes('profit terbanyak') || c.includes('paling besar profit')) {
    if (transactions.length === 0) return "📊 Belum ada data transaksi untuk dianalisa."
    const kasirMap: Record<string, { trx: number; nominal: number; admin: number }> = {}
    transactions.forEach(t => {
      if (t.kategori === 'Isi Saldo Bank' || t.kategori === 'Isi Saldo Real Aplikasi') return
      const k = t.kasirName || t.kasir_id || 'Tidak diketahui'
      if (!kasirMap[k]) kasirMap[k] = { trx: 0, nominal: 0, admin: 0 }
      kasirMap[k].trx++
      kasirMap[k].nominal += (t.nominal || 0)
      kasirMap[k].admin += (t.adminFee || 0)
    })
    const sorted = Object.entries(kasirMap).sort((a,b) => b[1].nominal - a[1].nominal)
    if (sorted.length === 0) return "📊 Tidak ada penjualan valid untuk dianalisa."
    let res = `🏆 **Analisa Kasir Penjualan Terbanyak (Bulan Ini):**\n\n`
    sorted.forEach(([k, d], i) => {
      const p = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹'
      res += `${p} **${k}**\n   • Omset: Rp ${d.nominal.toLocaleString('id-ID')}\n   • Profit/Admin: Rp ${d.admin.toLocaleString('id-ID')} (${d.trx} trx)\n`
    })
    return res
  }

  // 4c. ANALISA HARI RAMAI
  if (c.includes('hari apa yang ramai') || c.includes('hari apa jualan ramai') || c.includes('jualan ramai') || c.includes('hari paling ramai') || c.includes('hari ramai')) {
    if (transactions.length === 0) return "📊 Belum ada data transaksi untuk dianalisa."
    const dayMap: Record<string, { trx: number; nominal: number }> = {
      'Minggu': { trx: 0, nominal: 0 }, 'Senin': { trx: 0, nominal: 0 },
      'Selasa': { trx: 0, nominal: 0 }, 'Rabu': { trx: 0, nominal: 0 },
      'Kamis': { trx: 0, nominal: 0 }, 'Jumat': { trx: 0, nominal: 0 },
      'Sabtu': { trx: 0, nominal: 0 }
    }
    transactions.forEach(t => {
      if (t.kategori === 'Isi Saldo Bank' || t.kategori === 'Isi Saldo Real Aplikasi') return
      if (!t.timestamp) return
      const date = new Date(t.timestamp)
      if (isNaN(date.getTime())) return
      const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' })
      if (dayMap[dayName]) {
        dayMap[dayName].trx++
        dayMap[dayName].nominal += (t.nominal || 0)
      }
    })
    const sorted = Object.entries(dayMap).filter(a => a[1].trx > 0).sort((a,b) => b[1].nominal - a[1].nominal)
    if (sorted.length === 0) return "📊 Tidak cukup data harian untuk dianalisa."
    let res = `📈 **Analisa Hari Jualan Paling Ramai:**\n\n`
    sorted.forEach(([day, d], i) => {
      res += `${i === 0 ? '🔥' : '•'} **${day}** — Omset Rp ${d.nominal.toLocaleString('id-ID')} (${d.trx} trx)\n`
    })
    res += `\n💡 _Berdasarkan akumulasi data transaksi yang ada di sistem._`
    return res
  }

  // 4e. ANALISA JAM SIBUK / RUSH HOUR
  if (c.includes('jam ramai') || c.includes('jam sibuk') || c.includes('paling ramai jam') || c.includes('jam berapa ramai')) {
    if (transactions.length === 0) return "📊 Belum ada data transaksi untuk dianalisa."
    const hourMap: Record<string, { trx: number }> = {}
    transactions.forEach(t => {
      if (t.kategori === 'Isi Saldo Bank' || t.kategori === 'Isi Saldo Real Aplikasi') return
      if (!t.timestamp) return
      const date = new Date(t.timestamp)
      if (isNaN(date.getTime())) return
      const hourStr = date.toLocaleTimeString('id-ID', { hour: '2-digit' }) + ':00 - ' + 
                      new Date(date.getTime() + 60*60*1000).toLocaleTimeString('id-ID', { hour: '2-digit' }) + ':00'
      if (!hourMap[hourStr]) hourMap[hourStr] = { trx: 0 }
      hourMap[hourStr].trx++
    })
    const sorted = Object.entries(hourMap).sort((a,b) => b[1].trx - a[1].trx)
    if (sorted.length === 0) return "📊 Tidak cukup data waktu untuk dianalisa."
    let res = `⏰ **Analisa Jam Sibuk (Rush Hour):**\n\n`
    sorted.slice(0, 3).forEach(([hour, d], i) => {
      res += `${i === 0 ? '🔥' : '•'} **Jam ${hour}** — Intensitas tinggi (${d.trx} trx)\n`
    })
    res += `\n💡 _Tip: Owner bisa menambah jadwal shift kasir di jam sibuk agar pelayanan optimal._`
    return res
  }

  // 4f. PERBANDINGAN BULAN (FORECASTING)
  if (c.includes('bulan ini vs') || c.includes('dibanding bulan lalu') || c.includes('performa bulan ini') || c.includes('naik turun omset') || c.includes('bandingkan omset')) {
    const now = new Date()
    const thisMonth = now.toISOString().substring(0, 7)
    
    let lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = lastMonthDate.toISOString().substring(0, 7)
    
    let tThis = 0; let tLast = 0
    transactions.forEach(t => {
      if (t.kategori === 'Isi Saldo Bank' || t.kategori === 'Isi Saldo Real Aplikasi') return
      if ((t.timestamp||'').startsWith(thisMonth)) tThis += (t.nominal || 0)
      if ((t.timestamp||'').startsWith(lastMonth)) tLast += (t.nominal || 0)
    })
    
    const diff = tThis - tLast
    const perc = tLast > 0 ? (diff / tLast) * 100 : 100
    
    let res = `📈 **Perbandingan Omset Penjualan:**\n\n`
    res += `• Bulan Lalu (${lastMonthDate.toLocaleDateString('id-ID', {month:'long'})}): Rp ${tLast.toLocaleString('id-ID')}\n`
    res += `• Bulan Ini (${now.toLocaleDateString('id-ID', {month:'long'})}): Rp ${tThis.toLocaleString('id-ID')}\n\n`
    
    if (tLast === 0) res += `_Belum ada data bulan lalu untuk dibandingkan._`
    else if (diff > 0) res += `✅ **NAIK ${perc.toFixed(1)}%** (Untung Rp ${diff.toLocaleString('id-ID')})`
    else if (diff < 0) res += `🔻 **TURUN ${Math.abs(perc).toFixed(1)}%** (Selisih -Rp ${Math.abs(diff).toLocaleString('id-ID')})`
    else res += `➖ Omset sama persis dengan bulan lalu.`
    return res
  }

  // 4d. TAMBAH SALDO / ISI SALDO
  if (c.includes('tambah saldo') || c.includes('isi saldo') || c.includes('deposit kasir') || c.includes('saldo kasir')) {
    const tambahSaldoTxs = transactions.filter(t => t.kategori === 'Isi Saldo Bank' || t.kategori === 'Isi Saldo Real Aplikasi')
    if (tambahSaldoTxs.length === 0) return "💰 **Tambah Saldo:** Belum ada riwayat tambah saldo (Isi Saldo Bank / Real Aplikasi) yang tercatat."
    
    const todayStr = new Date().toISOString().split('T')[0]
    const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0]
    
    let filtered = tambahSaldoTxs
    let dateContext = ''
    
    if (c.includes('hari ini')) { filtered = filtered.filter(t => (t.timestamp||'').startsWith(todayStr)); dateContext = 'Hari Ini' }
    else if (c.includes('kemarin')) { filtered = filtered.filter(t => (t.timestamp||'').startsWith(yesterdayStr)); dateContext = 'Kemarin' }
    
    const kasirNames = Object.keys(kasirList).map(k => kasirList[k].name?.toLowerCase()).filter(Boolean)
    let matchedKasir = ''
    for (const name of kasirNames) {
      if (c.includes(name) || c.includes(name.split(' ')[0])) {
        matchedKasir = name
        filtered = filtered.filter(t => (t.kasirName || t.kasir_id || '').toLowerCase().includes(name) || (t.keterangan || '').toLowerCase().includes(name))
        break
      }
    }
    
    if (!matchedKasir) {
       const m = c.match(/kasir\s+([a-zA-Z0-9_]+)/)
       if (m) {
         matchedKasir = m[1]
         filtered = filtered.filter(t => (t.kasirName || t.kasir_id || '').toLowerCase().includes(matchedKasir) || (t.keterangan || '').toLowerCase().includes(matchedKasir))
       }
    }
    
    if (filtered.length === 0) {
      return `❌ Tidak ada data tambah saldo yang cocok dengan pencarianmu.`
    }
    
    const total = filtered.reduce((sum, t) => sum + (t.nominal || 0), 0)
    let res = `💰 **Rekap Tambah Saldo ${matchedKasir ? 'Kasir ' + matchedKasir.toUpperCase() : ''} ${dateContext}:**\n\n`
    res += `• Total Transaksi: **${filtered.length} kali**\n`
    res += `• Total Nominal: **Rp ${total.toLocaleString('id-ID')}**\n\n`
    res += `📝 **Rincian (Top 5):**\n`
    
    filtered.slice(0, 5).forEach((t, i) => {
      const time = t.timestamp ? new Date(t.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : ''
      const kname = t.kasirName || t.kasir_id || 'Kasir'
      res += `- ${time} | ${kname} | Rp ${(t.nominal || 0).toLocaleString('id-ID')} (${t.kategori === 'Isi Saldo Bank' ? 'Bank' : 'Real App'})\n`
    })
    if (filtered.length > 5) res += `...dan ${filtered.length - 5} data lainnya.`
    return res
  }

  // 5. ABSENSI SEARCH
  if (c.includes('absen') || c.includes('hadir') || c.includes('kehadiran') || c.includes('bolos') || c.includes('masuk kerja') || c.includes('telat') || c.includes('terlambat')) {
    if (absensiList.length === 0) {
      return "📅 **Data Absensi:** Belum ada log absensi terdaftar untuk hari ini."
    }
    
    const hadir = absensiList.filter(a => a.status === 'Hadir')
    const libur = absensiList.filter(a => a.status === 'Libur' || a.status === 'Izin')

    if (c.includes('paling rajin') || c.includes('total masuk') || c.includes('berapa hari masuk') || c.includes('kehadiran bulan ini')) {
      const thisMonth = new Date().toISOString().substring(0, 7)
      const thisMonthAbsen = absensiList.filter(a => (a.timestamp||'').startsWith(thisMonth) || (a.date||'').startsWith(thisMonth))
      
      const freq: Record<string, number> = {}
      thisMonthAbsen.forEach(a => {
        if (a.status === 'Hadir') {
          const name = (a.nama || a.username || '-').toUpperCase()
          if (!freq[name]) freq[name] = 0
          freq[name]++
        }
      })
      const sorted = Object.entries(freq).sort((a,b) => b[1] - a[1])
      
      let res = `👥 **Rekap Kehadiran Kasir (Bulan Ini):**\n\n`
      if (sorted.length === 0) return res + "_Belum ada data kehadiran bulan ini._"
      
      sorted.forEach(([name, count], i) => {
        res += `${i === 0 ? '🏆' : '•'} **${name}**: Masuk ${count} hari\n`
      })
      return res
    }

    if (c.includes('telat') || c.includes('terlambat')) {
      let targetHour = 7;
      let targetMin = 30;
      let timeFound = false;

      // 1. Cek format "setengah X" (contoh: "setengah 8" -> 07:30, "setengah 4" -> 03:30 / 15:30)
      const setengahMatch = c.match(/setengah\s*(\d{1,2})/i);
      if (setengahMatch) {
        const num = parseInt(setengahMatch[1], 10);
        targetHour = num - 1;
        targetMin = 30;
        timeFound = true;
        if (c.includes('siang') || c.includes('sore') || c.includes('malam') || c.includes('pm')) {
          if (targetHour < 12) targetHour += 12;
        }
      } else {
        // 2. Cek format jam dengan / tanpa menit + modifier AM/PM/pagi/siang/sore/malam
        // Contoh: "jam 7", "jam 15.00", "jam 3 siang", "jam 3 PM", "15.00", "7 pagi", "3 pm"
        const timeMatch = c.match(/(?:jam\s+)(\d{1,2})(?:[\.:](\d{2}))?\s*(pagi|siang|sore|malam|am|pm)?/i) ||
                          c.match(/(\d{1,2})[\.:](\d{2})\s*(pagi|siang|sore|malam|am|pm)?/i) ||
                          c.match(/(\d{1,2})\s*(pagi|siang|sore|malam|am|pm)/i);

        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          let m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const modifier = (timeMatch[3] || '').toLowerCase();
          
          // Cek penanda waktu sore/siang/malam/PM
          const isPM = modifier === 'pm' || modifier === 'siang' || modifier === 'sore' || modifier === 'malam' ||
                       c.includes('siang') || c.includes('sore') || c.includes('malam') || c.includes('pm');
          
          if (h < 12 && isPM) {
            h += 12; // 3 siang -> 15, 7 malam -> 19
          } else if (h === 12 && (c.includes('pagi') || c.includes('am') || modifier === 'am')) {
            h = 0; // 12 AM -> 00
          }

          targetHour = h;
          targetMin = m;
          timeFound = true;
        }
      }

      // Default jika pengguna hanya menulis "telat" tanpa menyebutkan jam:
      // Jika menyebut kata "siang", default jam 15.00. Jika sebut "pagi" atau default, jam 07.30.
      if (!timeFound) {
        if (c.includes('siang') || c.includes('sore')) {
          targetHour = 15;
          targetMin = 0;
        } else {
          targetHour = 7;
          targetMin = 30;
        }
      }

      const targetMinutes = targetHour * 60 + targetMin;
      const displayHour = targetHour.toString().padStart(2, '0');
      const displayMin = targetMin.toString().padStart(2, '0');
      const timeLabel = `${displayHour}:${displayMin}`;
      const shiftTypeLabel = targetHour >= 12 ? 'Shift Siang/Sore' : 'Shift Pagi';

      // Filter absensi list (jika pengguna menentukan hari ini / bulan ini)
      const thisMonth = new Date().toISOString().substring(0, 7);
      const todayStr = new Date().toISOString().split('T')[0];
      let logsToScan = absensiList;

      if (c.includes('hari ini')) {
        logsToScan = absensiList.filter(a => (a.tanggal || a.timestamp || '').startsWith(todayStr));
      } else if (c.includes('bulan ini')) {
        logsToScan = absensiList.filter(a => (a.tanggal || a.timestamp || '').startsWith(thisMonth));
      }

      // Filter nama kasir spesifik jika disebut dalam teks pencarian
      let filterKasirName = '';
      Object.values(kasirList).forEach((k: any) => {
        if (k.name && c.includes(k.name.toLowerCase())) {
          filterKasirName = k.name;
        }
      });

      // Akumulasi data telat per kasir
      const lateByKasir: Record<string, { count: number; details: Array<{ date: string; time: string; lateMinutes: number }> }> = {};

      logsToScan.forEach(a => {
        const kasirName = a.nama_kasir || a.nama || a.username || 'Kasir';
        if (filterKasirName && !kasirName.toLowerCase().includes(filterKasirName.toLowerCase()) && !(a.username && a.username.toLowerCase().includes(filterKasirName.toLowerCase()))) {
          return;
        }

        const jamMasukStr = a.jam_masuk || a.time || '';
        if (!jamMasukStr) return;

        // Parse hour & minute
        const parts = jamMasukStr.split(/[\.:]/);
        if (parts.length >= 2) {
          const h = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(h) && !isNaN(m)) {
            // Jika target shift pagi (targetHour < 12), evaluasi absen yang dilakukan antara jam 04.00 - 12.59
            // Jika target shift siang/sore (targetHour >= 12), evaluasi absen yang dilakukan dari jam 12.00 ke atas
            const isMorningTarget = targetHour < 12;
            const isMatchingShift = isMorningTarget ? (h >= 4 && h < 13) : (h >= 12 && h <= 23);

            if (isMatchingShift) {
              const entryMinutes = h * 60 + m;
              if (entryMinutes > targetMinutes) {
                const lateMins = entryMinutes - targetMinutes;
                if (!lateByKasir[kasirName]) {
                  lateByKasir[kasirName] = { count: 0, details: [] };
                }
                lateByKasir[kasirName].count++;
                lateByKasir[kasirName].details.push({
                  date: a.tanggal || (a.timestamp ? a.timestamp.split('T')[0] : 'Unknown'),
                  time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
                  lateMinutes: lateMins
                });
              }
            }
          }
        }
      });

      const kasirEntries = Object.entries(lateByKasir);
      if (kasirEntries.length === 0) {
        return `🎉 **Tidak Ada Kasir Telat!**\n\nBerdasarkan data absensi (${shiftTypeLabel}), tidak ada kasir yang absen telat lewat dari pukul **${timeLabel}**. Semua masuk tepat waktu! 👏`;
      }

      let res = `⏰ **Rekap Data Kasir Telat (Lewat Jam ${timeLabel} — ${shiftTypeLabel}):**\n\n`;
      kasirEntries.forEach(([nama, data]) => {
        res += `👤 **${nama}** — Total Telat: **${data.count} kali**\n`;
        data.details.slice(0, 5).forEach(d => {
          res += `   • Tgl ${d.date}: Masuk jam ${d.time} _(Telat ${d.lateMinutes} menit)_\n`;
        });
        if (data.details.length > 5) {
          res += `   • ...dan ${data.details.length - 5} kali telat lainnya.\n`;
        }
        res += `\n`;
      });

      res += `💡 _Disaring untuk ${shiftTypeLabel} dengan batas toleransi jam ${timeLabel}._`;
      return res;
    }
    
    let res = `📅 **Status Kehadiran Hari Ini:**\n\n` +
              `• **Hadir (${hadir.length} kasir)**:\n`
    if (hadir.length === 0) res += `  _Tidak ada yang hadir_\n`
    hadir.forEach(a => {
      res += `  - **${a.nama || a.username}** (Pukul ${a.jam_masuk || a.time || '--:--'})\n`
    })
    
    if (libur.length > 0) {
      res += `\n• **Libur/Izin (${libur.length} kasir)**:\n`
      libur.forEach(a => {
        res += `  - **${a.nama || a.username}** (${a.status})\n`
      })
    }
    return res
  }

  // 6. LAPORAN KILAT VOUCHER — rekap penjualan voucher hari ini
  const isVoucherReport = c.includes('rekap voucher') || c.includes('laporan voucher') ||
    c.includes('omzet voucher') || c.includes('omset voucher') ||
    (c.includes('voucher') && (c.includes('hari ini') || c.includes('rekap') || c.includes('penjualan'))) ||
    c === 'rekap voucher' || c === 'laporan voucher hari ini'

  if (isVoucherReport) {
    // Baca dari localStorage voucher app (storeId + cashier based keys)
    let vtxs: any[] = voucherTransactions
    if (vtxs.length === 0) {
      // Coba baca dari localStorage
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || ''
          if (k.startsWith(`v_${storeId}`) && k.endsWith('_transactions')) {
            const raw = localStorage.getItem(k)
            if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) { vtxs = [...vtxs, ...p] } }
          }
        }
      } catch {}
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const todayVtxs = vtxs.filter(t => {
      const ts = t.timestamp || t.date || t.tanggal || ''
      return ts.startsWith(todayStr) && t.type === 'PENJUALAN'
    })

    if (todayVtxs.length === 0) {
      return `📊 **Rekap Voucher Hari Ini:**\n\nBelum ada penjualan voucher yang tercatat hari ini. Semangat! 💪`
    }

    const totalAmt = todayVtxs.reduce((s, t) => s + (t.amount || t.total || t.sellingPrice || 0), 0)
    const tunai = todayVtxs.filter(t => (t.paymentMethod || t.metode || '') === 'TUNAI')
    const nonTunai = todayVtxs.filter(t => (t.paymentMethod || t.metode || '') !== 'TUNAI')
    const tunaiAmt = tunai.reduce((s, t) => s + (t.amount || t.total || 0), 0)
    const nonTunaiAmt = nonTunai.reduce((s, t) => s + (t.amount || t.total || 0), 0)

    // Produk terlaris
    const prodMap: Record<string, { count: number; amt: number }> = {}
    todayVtxs.forEach(t => {
      const name = t.productName || t.namaVoucher || t.product || 'Tidak diketahui'
      if (!prodMap[name]) prodMap[name] = { count: 0, amt: 0 }
      prodMap[name].count += (t.quantity || t.qty || 1)
      prodMap[name].amt += (t.amount || t.total || 0)
    })
    const sorted = Object.entries(prodMap).sort((a, b) => b[1].count - a[1].count)
    const terlaris = sorted[0]

    let res = `📊 **Rekap Voucher ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}:**\n\n`
    res += `• **Total Penjualan**: ${todayVtxs.length} transaksi\n`
    res += `• **Total Omzet**: **Rp ${totalAmt.toLocaleString('id-ID')}**\n`
    if (tunaiAmt > 0) res += `• **Tunai**: Rp ${tunaiAmt.toLocaleString('id-ID')} (${tunai.length} trx)\n`
    if (nonTunaiAmt > 0) res += `• **Non Tunai**: Rp ${nonTunaiAmt.toLocaleString('id-ID')} (${nonTunai.length} trx)\n`
    if (terlaris) res += `\n🏆 **Terlaris**: ${terlaris[0]} — ${terlaris[1].count} pcs (Rp ${terlaris[1].amt.toLocaleString('id-ID')})`
    if (sorted.length > 1) {
      res += `\n\n**Top 3 Produk:**\n`
      sorted.slice(0, 3).forEach((e, i) => {
        res += `${i + 1}. ${e[0]}: **${e[1].count} pcs** — Rp ${e[1].amt.toLocaleString('id-ID')}\n`
      })
    }
    return res
  }

  // 6b. ANALISA DEAD STOCK & PROVIDER LARIS
  if (c.includes('produk mati') || c.includes('tidak laku') || c.includes('jarang laku') || c.includes('provider laris') || c.includes('provider paling laris') || c.includes('paling laku')) {
    let allProducts: any[] = voucherProducts.length > 0 ? voucherProducts : []
    let vtxs: any[] = voucherTransactions
    try {
      if (allProducts.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || ''
          if (k.startsWith(`v_${storeId}`) && k.endsWith('_products')) {
            const raw = localStorage.getItem(k)
            if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) allProducts = [...allProducts, ...p] }
          }
        }
      }
      if (vtxs.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || ''
          if (k.startsWith(`v_${storeId}`) && k.endsWith('_transactions')) {
            const raw = localStorage.getItem(k)
            if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) vtxs = [...vtxs, ...p] }
          }
        }
      }
    } catch {}

    if (c.includes('tidak laku') || c.includes('jarang laku') || c.includes('produk mati')) {
      const soldIds = new Set(vtxs.filter(t => t.type === 'PENJUALAN').map(t => t.productId))
      const deadStock = allProducts.filter(p => !soldIds.has(p.id) && (p.currentStock ?? p.stock ?? 0) > 0)
      if (deadStock.length === 0) return "✅ **Kabar Baik!** Semua stok barang yang ada tercatat laku dan bergerak aktif."
      
      let res = `🧊 **Analisa Dead Stock (Produk Mengendap / Tidak Laku):**\n\n`
      deadStock.slice(0, 10).forEach((p, i) => {
        res += `${i+1}. **${p.name}** — Sisa ${p.currentStock ?? p.stock} pcs\n`
      })
      if (deadStock.length > 10) res += `...dan ${deadStock.length - 10} produk lainnya.`
      res += `\n💡 _Saran: Buat promo untuk produk di atas agar perputaran modal lancar._`
      return res
    } else {
      const freq: Record<string, { qty: number; nominal: number }> = {}
      vtxs.filter(t => t.type === 'PENJUALAN').forEach(t => {
        const name = (t.productName || t.namaVoucher || '').toLowerCase()
        let provider = 'Lainnya'
        if (name.includes('telkomsel') || name.includes('tsel')) provider = 'Telkomsel'
        else if (name.includes('indosat') || name.includes('im3')) provider = 'Indosat'
        else if (name.includes('axis')) provider = 'Axis'
        else if (name.includes('xl')) provider = 'XL'
        else if (name.includes('tri') || name.includes('three')) provider = 'Tri'
        else if (name.includes('smartfren')) provider = 'Smartfren'
        
        if (!freq[provider]) freq[provider] = { qty: 0, nominal: 0 }
        freq[provider].qty += (t.quantity || t.qty || 1)
        freq[provider].nominal += (t.amount || t.total || 0)
      })
      const sorted = Object.entries(freq).sort((a,b) => b[1].qty - a[1].qty)
      if (sorted.length === 0) return "📊 Belum ada data penjualan per provider."
      let res = `📈 **Analisa Penjualan Provider Terlaris:**\n\n`
      sorted.forEach(([prov, d], i) => {
        res += `${i === 0 ? '🏆' : '•'} **${prov}**: ${d.qty} pcs terjual (Omset Rp ${d.nominal.toLocaleString('id-ID')})\n`
      })
      return res
    }
  }

  // 6c. ESTIMASI MODAL RESTOCK
  if (c.includes('estimasi modal') || c.includes('butuh modal') || c.includes('modal restock')) {
    let allProducts: any[] = voucherProducts.length > 0 ? voucherProducts : []
    try {
      if (allProducts.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || ''
          if (k.startsWith(`v_${storeId}`) && k.endsWith('_products')) {
            const raw = localStorage.getItem(k)
            if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) allProducts = [...allProducts, ...p] }
          }
        }
      }
    } catch {}
    
    const menipis = allProducts.filter(p => (p.currentStock ?? p.stock ?? 0) <= (p.minStockLevel ?? 3))
    if (menipis.length === 0) return "✅ Tidak ada stok yang menipis. Belum butuh belanja restock saat ini."
    
    let estimasiPcs = 0
    menipis.forEach(p => { estimasiPcs += ((p.minStockLevel ?? 3) - (p.currentStock ?? p.stock ?? 0) + 10) })
    
    let res = `🛒 **Estimasi Kebutuhan Belanja Restock:**\n\n`
    res += `• Terdapat **${menipis.length} produk** yang stoknya sudah menipis/habis.\n`
    res += `• Estimasi jumlah barang yang perlu dibeli: **~${estimasiPcs} pcs** (untuk stok aman).\n\n`
    res += `💡 _Untuk modal uangnya, silakan kalikan estimasi pcs tersebut dengan harga rata-rata agen supplier Anda._\n`
    res += `Ketik *"cek stok menipis"* untuk melihat detail barangnya.`
    return res
  }

  // 7. CEK STOK MENIPIS
  const isStokWarning = c === 'stok menipis' || c === 'stok habis' || c === 'produk menipis' ||
    c.includes('stok menipis') || c.includes('hampir habis') || c.includes('mau habis') ||
    c.includes('stok kritis') || c.includes('warning stok')

  if (isStokWarning) {
    let allProducts: any[] = voucherProducts
    if (allProducts.length === 0) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || ''
          if (k.startsWith(`v_${storeId}`) && k.endsWith('_products')) {
            const raw = localStorage.getItem(k)
            if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) { allProducts = [...allProducts, ...p] } }
          }
        }
        // De-duplikasi berdasarkan id
        const seen = new Set()
        allProducts = allProducts.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
      } catch {}
    }

    const menipis = allProducts.filter(p => {
      const stok = p.currentStock ?? p.stock ?? 0
      const min = p.minStockLevel ?? 3
      return stok <= min
    }).sort((a, b) => (a.currentStock ?? a.stock ?? 0) - (b.currentStock ?? b.stock ?? 0))

    if (menipis.length === 0) {
      return `✅ **Stok Aman!** Semua produk voucher masih di atas batas minimum. 👍`
    }

    let res = `⚠️ **${menipis.length} Produk Stok Menipis:**\n\n`
    menipis.slice(0, 10).forEach((p, i) => {
      const stok = p.currentStock ?? p.stock ?? 0
      const min = p.minStockLevel ?? 3
      const icon = stok === 0 ? '🔴' : stok <= 1 ? '🟠' : '🟡'
      res += `${icon} **${p.name}**: ${stok} pcs _(min: ${min})_\n`
    })
    if (menipis.length > 10) res += `...dan ${menipis.length - 10} produk lainnya.`
    res += `\n\n💡 Ketik *"atur stok"* untuk update stok sekarang.`
    return res
  }

  // 8. CARI TRANSAKSI VOUCHER — filter berdasarkan nama produk / metode bayar
  const isCariTrx = (c.includes('cari transaksi') || c.includes('transaksi voucher') ||
    c.includes('penjualan voucher') || c.includes('cari penjualan') ||
    c.includes('transaksi non tunai') || c.includes('transaksi tunai') ||
    c.includes('penjualan tunai') || c.includes('penjualan non tunai') ||
    (c.includes('transaksi') && (c.includes('axis') || c.includes('xl') || c.includes('telkomsel') ||
     c.includes('indosat') || c.includes('tri') || c.includes('smartfren') || c.includes('kemarin') ||
     c.includes('hari ini') || c.includes('tadi'))))

  if (isCariTrx) {
    let vtxs: any[] = voucherTransactions
    if (vtxs.length === 0) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || ''
          if (k.startsWith(`v_${storeId}`) && k.endsWith('_transactions')) {
            const raw = localStorage.getItem(k)
            if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) vtxs = [...vtxs, ...p] }
          }
        }
      } catch {}
    }

    let filtered = vtxs.filter(t => t.type === 'PENJUALAN')

    // Filter tanggal
    const todayStr = new Date().toISOString().split('T')[0]
    const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0]
    if (c.includes('hari ini') || c.includes('tadi')) {
      filtered = filtered.filter(t => (t.timestamp || '').startsWith(todayStr))
    } else if (c.includes('kemarin')) {
      filtered = filtered.filter(t => (t.timestamp || '').startsWith(yesterdayStr))
    }

    // Filter metode bayar
    if (c.includes('non tunai') || c.includes('nontunai') || c.includes('qris') || c.includes('transfer')) {
      filtered = filtered.filter(t => (t.paymentMethod || '') !== 'TUNAI')
    } else if (c.includes('tunai') && !c.includes('non')) {
      filtered = filtered.filter(t => (t.paymentMethod || '') === 'TUNAI')
    }

    // Filter nama produk / operator
    const operatorKeywords = ['axis', 'xl', 'telkomsel', 'tsel', 'indosat', 'im3', 'tri', 'smartfren']
    for (const op of operatorKeywords) {
      if (c.includes(op)) {
        filtered = filtered.filter(t => {
          const name = (t.productName || t.namaVoucher || t.product || '').toLowerCase()
          return name.includes(op) || (op === 'tsel' && name.includes('telkomsel'))
        })
        break
      }
    }
    // Filter kata lain (bukan operator)
    const queryWords = c
      .replace(/cari|transaksi|penjualan|voucher|hari ini|kemarin|tadi|tunai|non|qris|transfer/g, '')
      .replace(new RegExp(operatorKeywords.join('|'), 'g'), '')
      .trim()
    if (queryWords.length > 2) {
      filtered = filtered.filter(t => {
        const name = (t.productName || t.namaVoucher || t.product || '').toLowerCase()
        return name.includes(queryWords)
      })
    }

    if (filtered.length === 0) {
      return `❌ Tidak ada transaksi voucher yang cocok dengan pencarian tersebut.\n\nCoba: *"cari transaksi axis"* atau *"transaksi non tunai hari ini"*`
    }

    const totalAmt = filtered.reduce((s, t) => s + (t.amount || t.total || 0), 0)
    let res = `🔍 **Hasil: ${filtered.length} Transaksi Voucher**\n`
    res += `_(Total: Rp ${totalAmt.toLocaleString('id-ID')})_\n\n`
    filtered.slice(0, 7).forEach((t, i) => {
      const nama = t.productName || t.namaVoucher || t.product || '-'
      const amt = (t.amount || t.total || 0).toLocaleString('id-ID')
      const metode = t.paymentMethod === 'TUNAI' ? '💵' : '📲'
      const tgl = t.timestamp ? new Date(t.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'
      const qty = t.quantity || t.qty || 1
      res += `${i + 1}. ${metode} **${nama}** ×${qty} — Rp ${amt} _(${tgl})_\n`
    })
    if (filtered.length > 7) res += `...dan ${filtered.length - 7} transaksi lainnya.`
    return res
  }

  // 9. LAPORAN SERAH TERIMA / SALDO AKHIR / KAS FISIK
  const isLaporanHandover =
    c.includes('saldo akhir') || c.includes('kas akhir') || c.includes('kas fisik') ||
    c.includes('kas harusnya') || c.includes('selisih kas') || c.includes('rekap shift') ||
    c.includes('laporan shift') || c.includes('serah terima') || c.includes('closing') ||
    c.includes('rekap laporan') || c.includes('laporan kasir') || c.includes('saldo closing') ||
    c.includes('total kas') || c.includes('laporan hari ini') || c.includes('rekap kasir') ||
    c.includes('saldo harian') || c.includes('cek laporan') || c.includes('ringkasan shift') ||
    c.includes('hasil shift') || c.includes('rekap serah terima')

  if (isLaporanHandover) {
    let handoverRecords: any[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || ''
        if (k.endsWith('_all_detailed_handovers') && k.startsWith(`v_${storeId}`)) {
          const raw = localStorage.getItem(k)
          if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) { handoverRecords = p; break } }
        }
      }
    } catch {}

    if (handoverRecords.length === 0) {
      return `📋 **Belum Ada Data Serah Terima:**\n\nRiwayat serah terima kasir belum tersedia. Data akan muncul setelah kasir menyelesaikan minimal 1 proses serah terima di halaman **Atur Stok**.`
    }

    if (c.includes('sering selisih') || c.includes('raja selisih') || c.includes('sering minus') || c.includes('selisih terbesar')) {
      const minus = handoverRecords.filter(r => (r.cashDifference ?? ((r.cashPhysical ?? 0) - (r.cashExpected ?? 0))) < 0)
      if (minus.length === 0) return "✅ **Toko Aman!** Tidak ada riwayat minus (kurang kas) pada serah terima kasir."
      
      if (c.includes('terbesar')) {
        const sorted = minus.sort((a,b) => (a.cashDifference ?? ((a.cashPhysical ?? 0) - (a.cashExpected ?? 0))) - (b.cashDifference ?? ((b.cashPhysical ?? 0) - (b.cashExpected ?? 0))))
        let res = `🚨 **Top 3 Selisih Minus Terbesar (Fraud/Error Detection):**\n\n`
        sorted.slice(0,3).forEach((r, i) => {
          const diff = r.cashDifference ?? ((r.cashPhysical ?? 0) - (r.cashExpected ?? 0))
          res += `${i+1}. **${r.cashierFromName || r.kasirFrom || 'Kasir'}** — Minus **Rp ${Math.abs(diff).toLocaleString('id-ID')}** _(${r.date || r.shiftName || '?'})_\n`
        })
        return res
      } else {
        const freq: Record<string, { count: number; totalMinus: number }> = {}
        minus.forEach(r => {
          const name = (r.cashierFromName || r.kasirFrom || 'Kasir').toUpperCase()
          if (!freq[name]) freq[name] = { count: 0, totalMinus: 0 }
          freq[name].count++
          freq[name].totalMinus += Math.abs(r.cashDifference ?? ((r.cashPhysical ?? 0) - (r.cashExpected ?? 0)))
        })
        const sorted = Object.entries(freq).sort((a,b) => b[1].count - a[1].count)
        let res = `⚠️ **Kasir Paling Sering Minus/Selisih:**\n\n`
        sorted.forEach(([name, d], i) => {
          res += `${i+1}. **${name}** — ${d.count} kali minus (Total kerugian: Rp ${d.totalMinus.toLocaleString('id-ID')})\n`
        })
        return res
      }
    }

    // Filter hari ini dulu
    const todayStr = new Date().toISOString().split('T')[0]
    const todayRecords = handoverRecords.filter(r =>
      r.date === todayStr || (r.timestamp || '').startsWith(todayStr)
    )
    const targetRecords = todayRecords.length > 0 ? todayRecords : handoverRecords.slice(0, 5)
    const isToday = todayRecords.length > 0

    let res = `📋 **Rekap ${isToday ? 'Hari Ini' : 'Shift Terakhir'} — ${isToday ? new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}**\n\n`

    targetRecords.forEach((r: any, i: number) => {
      const kasFrom = r.cashierFromName || r.kasirFrom || '-'
      const kasTo = r.cashierToName || r.kasirTo || '-'
      const kasPhysical = r.cashPhysical ?? 0
      const kasExpected = r.cashExpected ?? 0
      const kasDiff = r.cashDifference ?? (kasPhysical - kasExpected)
      const stokAkhir = r.totalFinalStock ?? 0
      const stokAwal = r.totalInitialStock ?? 0
      const terjual = r.totalSoldPcs ?? 0
      const omzet = r.totalSalesAmount ?? 0
      const qris = r.qrisAmount ?? 0

      res += `**${r.shiftName || `Shift ${i + 1}`}** _(${kasFrom} → ${kasTo})_\n`
      res += `• Stok: ${stokAwal} awal → ${stokAkhir} akhir (${terjual} terjual)\n`
      res += `• Omzet Voucher: **Rp ${omzet.toLocaleString('id-ID')}**\n`
      if (qris > 0) res += `• QRIS/Non-Tunai: Rp ${qris.toLocaleString('id-ID')}\n`
      res += `• 💰 Kas Fisik: **Rp ${kasPhysical.toLocaleString('id-ID')}**\n`
      res += `• Kas Harusnya: Rp ${kasExpected.toLocaleString('id-ID')}\n`
      res += `• Selisih: ${kasDiff < 0 ? '⚠️' : '✅'} **Rp ${Math.abs(kasDiff).toLocaleString('id-ID')} ${kasDiff < 0 ? 'Kurang' : kasDiff > 0 ? 'Lebih' : 'Pas'}**\n`
      if (r.note) res += `• Catatan: _${r.note}_\n`
      res += '\n'
    })

    if (isToday && targetRecords.length > 1) {
      const totalOmzet = targetRecords.reduce((s: number, r: any) => s + (r.totalSalesAmount ?? 0), 0)
      const totalKasFisik = targetRecords.reduce((s: number, r: any) => s + (r.cashPhysical ?? 0), 0)
      const totalQris = targetRecords.reduce((s: number, r: any) => s + (r.qrisAmount ?? 0), 0)
      res += `📊 **Total Hari Ini (${targetRecords.length} shift):**\n`
      res += `• Total Omzet: **Rp ${totalOmzet.toLocaleString('id-ID')}**\n`
      res += `• Total Kas Fisik: **Rp ${totalKasFisik.toLocaleString('id-ID')}**\n`
      if (totalQris > 0) res += `• Total QRIS: Rp ${totalQris.toLocaleString('id-ID')}\n`
    }

    return res.trim()
  }

  // Fallback ke KB bawaan
  for (const entry of KB) {
    if (entry.test(c)) {
      const a = typeof entry.answer === 'function' ? entry.answer(c) : entry.answer
      if (a !== null) return a as string
    }
  }
  return null
}

// ── Gemini API ────────────────────────────────────────────────────────────────
export interface ChatMessage { role: 'user' | 'model'; parts: [{ text: string }] }

const GEMINI_MODEL = 'gemini-3.5-flash-lite'

// ── Tipe data untuk konteks toko ──────────────────────────────────────────────
export interface StoreContext {
  role: 'owner' | 'kasir'
  storeName?: string
  kasirName?: string
  currentMonth?: string
  monthlyTransactions?: any[]
  allTransactions?: any[]
  kasbonList?: any[]
  auditHistory?: any[]
  kasirList?: Record<string, any>
  stokRendah?: { name: string; stock: number; minStock: number }[]
  // ── Data Laporan Voucher (Serah Terima & Saldo Akhir) ──
  handoverRecords?: any[]   // DetailedHandoverRecord[]
  voucherTxSummary?: {      // Ringkasan transaksi voucher hari ini
    totalPenjualan: number;
    totalOmzet: number;
    totalTunai: number;
    totalNonTunai: number;
    totalQris: number;
  } | null
  absensiList?: any[]
  voucherProducts?: any[]
  voucherTransactions?: any[]
}

// ── Pembangun Prompt Sistem Dinamis ───────────────────────────────────────────
export function buildSystemPrompt(ctx: StoreContext): string {
  const isOwner = ctx.role === 'owner'
  const storeName = ctx.storeName || 'ALFAZA CELL'
  const monthLabel = ctx.currentMonth || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  // ── Bangun "Buku Besar" dari data historis ──
  let bukuBesar = ''

  if (ctx.monthlyTransactions && ctx.monthlyTransactions.length > 0) {
    const txs = ctx.monthlyTransactions
    const totalNominal = txs.reduce((s: number, t: any) => s + (t.nominal || 0), 0)
    const totalAdmin = txs.reduce((s: number, t: any) => s + (t.adminFee || 0), 0)
    const totalCount = txs.length

    // Breakdown per kategori
    const catMap: Record<string, { count: number; nominal: number; admin: number }> = {}
    txs.forEach((t: any) => {
      const c = t.kategori || 'Lain-lain'
      if (!catMap[c]) catMap[c] = { count: 0, nominal: 0, admin: 0 }
      catMap[c].count++
      catMap[c].nominal += t.nominal || 0
      catMap[c].admin += t.adminFee || 0
    })
    const catBreakdown = Object.entries(catMap)
      .map(([cat, d]) => `  - ${cat}: ${d.count} trx, Omset Rp${d.nominal.toLocaleString('id-ID')}, Admin Rp${d.admin.toLocaleString('id-ID')}`)
      .join('\n')

    // Breakdown per kasir (owner only)
    let kasirBreakdown = ''
    if (isOwner && ctx.kasirList) {
      const kasirMap: Record<string, { count: number; nominal: number }> = {}
      txs.forEach((t: any) => {
        const k = t.kasir_id || t.kasirName || 'Tidak diketahui'
        if (!kasirMap[k]) kasirMap[k] = { count: 0, nominal: 0 }
        kasirMap[k].count++
        kasirMap[k].nominal += t.nominal || 0
      })
      kasirBreakdown = '\nPenjualan per Kasir:\n' + Object.entries(kasirMap)
        .map(([k, d]) => {
          const name = ctx.kasirList?.[k]?.name || k
          return `  - ${name}: ${d.count} trx, Rp${d.nominal.toLocaleString('id-ID')}`
        }).join('\n')
    }

    bukuBesar += `\n\n📊 DATA PENJUALAN BULAN INI (${monthLabel}):
Total Transaksi: ${totalCount} trx
Total Omset: Rp${totalNominal.toLocaleString('id-ID')}
Total Pendapatan Admin: Rp${totalAdmin.toLocaleString('id-ID')}
Breakdown Kategori:
${catBreakdown}${kasirBreakdown}`
  }

  // Kasbon (owner only)
  if (isOwner && ctx.kasbonList && ctx.kasbonList.length > 0) {
    const belumLunas = ctx.kasbonList.filter((k: any) => !k.lunas)
    const totalKasbon = belumLunas.reduce((s: number, k: any) => s + (k.nominal || 0), 0)
    bukuBesar += `\n\n💰 KASBON PELANGGAN BELUM LUNAS:
Jumlah: ${belumLunas.length} pelanggan
Total Piutang: Rp${totalKasbon.toLocaleString('id-ID')}
(Rincian disembunyikan. Berikan rincian nama hanya jika secara spesifik diminta.)`
  }

  // Stok rendah
  if (ctx.stokRendah && ctx.stokRendah.length > 0) {
    bukuBesar += `\n\n⚠️ STOK VOUCHER MENIPIS:
${ctx.stokRendah.map(p => `  - ${p.name}: ${p.stock} pcs (min alert: ${p.minStock})`).join('\n')}`
  }

  // ── Data Handover Voucher (Serah Terima & Saldo Akhir) ──
  if (ctx.handoverRecords && ctx.handoverRecords.length > 0) {
    const todayStr = new Date().toISOString().split('T')[0]
    const todayHandovers = ctx.handoverRecords.filter((r: any) => r.date === todayStr || (r.timestamp || '').startsWith(todayStr))
    const recentHandovers = ctx.handoverRecords.slice(0, 10) // max 10 terbaru

    let handoverSection = `\n\n📋 DATA SERAH TERIMA KASIR (${recentHandovers.length} shift terakhir):\n`
    recentHandovers.forEach((r: any, i: number) => {
      const tgl = r.date || (r.timestamp || '').split('T')[0]
      const kasFrom = r.cashierFromName || r.kasirFrom || '-'
      const kasTo = r.cashierToName || r.kasirTo || '-'
      const kasPhysical = r.cashPhysical ?? r.kasPhysical ?? 0
      const kasExpected = r.cashExpected ?? r.kasExpected ?? 0
      const kasDiff = r.cashDifference ?? (kasPhysical - kasExpected)
      const stokAkhir = r.totalFinalStock ?? r.stokAkhir ?? 0
      const stokAwal = r.totalInitialStock ?? r.stokAwal ?? 0
      const terjual = r.totalSoldPcs ?? r.stokTerjual ?? 0
      const omzet = r.totalSalesAmount ?? r.totalOmzet ?? 0
      const qris = r.qrisAmount ?? r.totalQris ?? 0

      handoverSection += `\n--- Shift ${i + 1} | ${tgl} | ${r.shiftName || 'Shift'} ---\n`
      handoverSection += `  Kasir: ${kasFrom} → ${kasTo}\n`
      handoverSection += `  Stok Awal: ${stokAwal} pcs | Stok Akhir: ${stokAkhir} pcs | Terjual: ${terjual} pcs\n`
      handoverSection += `  Omzet Voucher: Rp${omzet.toLocaleString('id-ID')}\n`
      if (qris > 0) handoverSection += `  QRIS/Non-Tunai: Rp${qris.toLocaleString('id-ID')}\n`
      handoverSection += `  Kas Fisik (dihitung kasir): Rp${kasPhysical.toLocaleString('id-ID')}\n`
      handoverSection += `  Kas Harusnya: Rp${kasExpected.toLocaleString('id-ID')}\n`
      handoverSection += `  Selisih Kas: Rp${kasDiff.toLocaleString('id-ID')} ${kasDiff < 0 ? '⚠️ Kurang' : kasDiff > 0 ? '✅ Lebih' : '✅ Pas'}\n`
      if (r.note) handoverSection += `  Catatan: ${r.note}\n`
    })

    if (todayHandovers.length > 0) {
      const totalOmzetToday = todayHandovers.reduce((s: number, r: any) => s + (r.totalSalesAmount ?? 0), 0)
      const totalKasFisikToday = todayHandovers.reduce((s: number, r: any) => s + (r.cashPhysical ?? 0), 0)
      const totalQrisToday = todayHandovers.reduce((s: number, r: any) => s + (r.qrisAmount ?? 0), 0)
      handoverSection += `\n📊 TOTAL HARI INI (${todayHandovers.length} shift):\n`
      handoverSection += `  Total Omzet: Rp${totalOmzetToday.toLocaleString('id-ID')}\n`
      handoverSection += `  Total Kas Fisik: Rp${totalKasFisikToday.toLocaleString('id-ID')}\n`
      handoverSection += `  Total QRIS: Rp${totalQrisToday.toLocaleString('id-ID')}\n`
    }

    bukuBesar += handoverSection
  }

  // ── Ringkasan Transaksi Voucher Hari Ini ──
  if (ctx.voucherTxSummary && ctx.voucherTxSummary.totalPenjualan > 0) {
    const s = ctx.voucherTxSummary
    bukuBesar += `\n\n💵 TRANSAKSI VOUCHER HARI INI:\n`
    bukuBesar += `  Jumlah Penjualan: ${s.totalPenjualan} trx\n`
    bukuBesar += `  Total Omzet: Rp${s.totalOmzet.toLocaleString('id-ID')}\n`
    bukuBesar += `  Tunai: Rp${s.totalTunai.toLocaleString('id-ID')}\n`
    bukuBesar += `  Non-Tunai/QRIS: Rp${(s.totalNonTunai + s.totalQris).toLocaleString('id-ID')}\n`
  }

  // Audit/selisih (owner only)
  if (isOwner && ctx.auditHistory && ctx.auditHistory.length > 0) {
    const bulanIni = new Date().toISOString().substring(0, 7)
    const auditBulanIni = ctx.auditHistory.filter((a: any) => (a.tanggalAsli || a.tanggal || '').startsWith(bulanIni))
    if (auditBulanIni.length > 0) {
      const totalMinus = auditBulanIni.filter((a: any) => a.selisih < 0).reduce((s: number, a: any) => s + Math.abs(a.selisih), 0)
      const totalPlus = auditBulanIni.filter((a: any) => a.selisih > 0).reduce((s: number, a: any) => s + a.selisih, 0)
      bukuBesar += `\n\n🔍 REKAP AUDIT KASIR BULAN INI:
Total Minus (selisih kurang): Rp${totalMinus.toLocaleString('id-ID')}
Total Plus (selisih lebih): Rp${totalPlus.toLocaleString('id-ID')}`
    }
  }

  // ── Analitik Cerdas untuk Gemini (Online Context) ──
  if (isOwner) {
    let analyticsStr = ''
    
    // 1. Dead Stock
    if (ctx.voucherProducts && ctx.voucherTransactions) {
      const soldIds = new Set(ctx.voucherTransactions.filter((t:any) => t.type === 'PENJUALAN').map((t:any) => t.productId))
      const deadStock = ctx.voucherProducts.filter((p:any) => !soldIds.has(p.id) && (p.currentStock ?? p.stock ?? 0) > 0)
      if (deadStock.length > 0) {
        analyticsStr += `- **Dead Stock (Voucher tidak laku):** Terdapat ${deadStock.length} produk mengendap. (Cth: ${deadStock.slice(0,3).map((p:any)=>p.name).join(', ')}).\n`
      }
    }
    
    // 2. Utang Paling Sering
    if (ctx.kasbonList && ctx.kasbonList.length > 0) {
      const aktif = ctx.kasbonList.filter((h:any) => !h.lunas)
      const freq: Record<string, number> = {}
      aktif.forEach((h:any) => { const n = (h.nama||'').toUpperCase(); freq[n] = (freq[n]||0) + 1 })
      const sortedUtang = Object.entries(freq).sort((a,b) => b[1] - a[1])
      if (sortedUtang.length > 0) {
        analyticsStr += `- **Pelanggan Sering Utang:** ${sortedUtang.slice(0,3).map(u => u[0] + ' (' + u[1] + 'x)').join(', ')}.\n`
      }
    }
    
    // 3. Selisih Kas (Fraud)
    if (ctx.handoverRecords && ctx.handoverRecords.length > 0) {
      const minus = ctx.handoverRecords.filter((r:any) => (r.cashDifference ?? ((r.cashPhysical ?? 0) - (r.cashExpected ?? 0))) < 0)
      if (minus.length > 0) {
        const freqM: Record<string, number> = {}
        minus.forEach((r:any) => { const n = (r.cashierFromName||r.kasirFrom||'Kasir').toUpperCase(); freqM[n] = (freqM[n]||0) + 1 })
        const sortedM = Object.entries(freqM).sort((a,b) => b[1] - a[1])
        analyticsStr += `- **Kasir Sering Minus Selisih:** ${sortedM.slice(0,2).map(u => u[0] + ' (' + u[1] + 'x minus)').join(', ')}.\n`
      }
    }
    
    // 4. Log Kehadiran & Jam Masuk Kasir
    if (ctx.absensiList && ctx.absensiList.length > 0) {
      const bulanIni = new Date().toISOString().substring(0, 7)
      const freqA: Record<string, number> = {}
      ctx.absensiList.filter((a:any) => a.status==='Hadir' && (a.timestamp||a.date||a.tanggal||'').startsWith(bulanIni)).forEach((a:any) => {
        const n = (a.nama_kasir||a.nama||a.username||'').toUpperCase(); freqA[n] = (freqA[n]||0) + 1
      })
      const sortedA = Object.entries(freqA).sort((a,b) => b[1] - a[1])
      if (sortedA.length > 0) {
        analyticsStr += `- **Kehadiran Kasir Terbaik (Bulan Ini):** ${sortedA.slice(0,3).map(u => u[0] + ' (' + u[1] + ' hari)').join(', ')}.\n`
      }

      // Format log jam masuk per kasir untuk Gemini AI
      const byKasir: Record<string, Array<string>> = {}
      ctx.absensiList.filter((a:any) => (a.tanggal||a.timestamp||a.date||'').startsWith(bulanIni)).forEach((a:any) => {
        const name = (a.nama_kasir || a.nama || a.username || 'Kasir').toUpperCase()
        if (!byKasir[name]) byKasir[name] = []
        const tgl = a.tanggal || (a.timestamp ? a.timestamp.split('T')[0] : '?')
        const jam = a.jam_masuk || a.time || '--:--'
        byKasir[name].push(`${tgl} (jam ${jam})`)
      })

      let logJamMasukStr = '\n\n📅 LOG ABSENSI & JAM MASUK KASIR BULAN INI:\n'
      Object.entries(byKasir).forEach(([kName, entries]) => {
        logJamMasukStr += `  • ${kName} (${entries.length} log): ${entries.slice(0, 15).join(', ')}\n`
      })
      bukuBesar += logJamMasukStr
    }

    if (analyticsStr) {
      bukuBesar += `\n\n🧠 ANALITIK KECERDASAN BISNIS:\n${analyticsStr} (Catatan: Ini adalah rangkuman dari data sistem terkini, manfaatkan informasi ini untuk menjawab pertanyaan owner jika ditanya seputar data-data ini)`
    }
  }

  // ── SISTEM PROMPT FINAL ──
  const basePrompt = `Kamu adalah Bot Alpha, asisten AI cerdas untuk toko ${storeName}.
Kamu berperan sebagai "Karyawan Analis Toko" yang memahami pembukuan, stok voucher, dan operasional toko konter pulsa.
Jawab dalam Bahasa Indonesia yang ringkas, cerdas, dan ramah. Gunakan emoji secukupnya.
Format jawaban: gunakan baris baru dan poin jika perlu, maksimal 200 kata kecuali diminta analisa detail.
Jika tidak tahu, katakan jujur. Jangan jawab hal berbahaya atau SARA.`

  const roleSection = isOwner
    ? `\n\nKAMU SEDANG BERBICARA DENGAN: OWNER (${ctx.kasirName || 'Pemilik Toko'})
Sebagai Owner, ia BOLEH mengetahui: modal, keuntungan, gaji kasir, total piutang kasbon, rekap audit, dan semua data finansial sensitif.
Kamu wajib menjawab pertanyaan tentang data sensitif tersebut secara transparan dan akurat.
FITUR AKSI (untuk aksi langsung ke sistem, gunakan format tag di akhir jawaban):
- Untuk catat kasbon: [ACTION:kasbon|nama|nominal|keterangan]
- Untuk simpan kontak pelanggan: [ACTION:kontak|nama|nomor_hp|keterangan]
- Untuk buat catatan owner: [ACTION:catatan|judul|isi_catatan]
- Untuk buka halaman tertentu: [ACTION:navigate|nama_view]
- Untuk set izin kasir: [ACTION:izin|username_kasir|tanggal|alasan]
TIPS NAVIGASI CERDAS: Jika user meminta buka riwayat/laporan spesifik (misal "tanggal 20 Agustus"), kamu bisa menanggapi dengan ramah dan tetap memberikan [ACTION:navigate|view-transaksi] atau [ACTION:navigate|view-owner-laporan]. Walaupun saat ini aksi hanya pindah halaman, kamu harus menjawab seolah mengerti konteks tanggalnya.`
    : `\n\nKAMU SEDANG BERBICARA DENGAN: KASIR (${ctx.kasirName || 'Kasir'})
ATURAN PRIVASI KETAT:
- DILARANG membocorkan: harga modal produk, total keuntungan toko, gaji kasir lain, rekap audit kasir lain, data finansial owner.
- Jika ditanya hal di atas, tolak dengan sopan: "Maaf, informasi tersebut hanya bisa diakses oleh Owner."
- Kamu BOLEH bantu kasir: cek stok produk sendiri, info produk, kalkulator, info operator, navigasi halaman.
FITUR AKSI (terbatas untuk kasir):
- Untuk catat kasbon pelanggan: [ACTION:kasbon|nama|nominal|keterangan]
- Untuk simpan kontak pelanggan: [ACTION:kontak|nama|nomor_hp|keterangan]
- Untuk buka halaman: [ACTION:navigate|nama_view]`

  return basePrompt + roleSection + (bukuBesar ? `\n\n--- DATA TOKO REAL-TIME ---${bukuBesar}` : '')
}

// ── Pembangun Konteks Toko dari localStorage ──────────────────────────────────
export function buildStoreContext(
  role: 'owner' | 'kasir',
  storeId: string,
  kasirName: string,
  kasirList: Record<string, any> = {},
  transactions: any[] = [],
  absensiList: any[] = [],
  voucherTransactions: any[] = [],
  voucherProducts: any[] = []
): StoreContext {
  // Ambil data kasbon dari localStorage
  let kasbonList: any[] = []
  try {
    const raw = localStorage.getItem(`alphaPro_${storeId}_kasbon_list`)
    if (raw) kasbonList = JSON.parse(raw)
  } catch {}

  // Ambil data audit dari localStorage
  let auditHistory: any[] = []
  try {
    const raw = localStorage.getItem(`alphaPro_${storeId}_audit_history`)
    if (raw) auditHistory = JSON.parse(raw)
  } catch {}

  // Ambil data stok voucher yang hampir habis
  let stokRendah: { name: string; stock: number; minStock: number }[] = []
  try {
    let allProducts: any[] = voucherProducts.length > 0 ? voucherProducts : []
    if (allProducts.length === 0) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || ''
        if (k.startsWith(`v_${storeId}`) && k.endsWith('_products')) {
          const raw = localStorage.getItem(k)
          if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) allProducts = [...allProducts, ...p] }
        }
      }
      // De-duplikasi
      const seen = new Set()
      allProducts = allProducts.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
    }
    stokRendah = allProducts
      .filter(p => (p.currentStock ?? p.stock ?? 0) <= (p.minStockLevel ?? 4))
      .map(p => ({ name: p.name, stock: p.currentStock ?? p.stock ?? 0, minStock: p.minStockLevel ?? 4 }))
  } catch {}

  // ── Ambil data serah terima (all_detailed_handovers — global per toko) ──
  let handoverRecords: any[] = []
  try {
    const globalKey = `v_${storeId}_all_detailed_handovers`
    const raw = localStorage.getItem(globalKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) handoverRecords = parsed
    }
  } catch {}

  // ── Ringkasan transaksi voucher hari ini dari localStorage ──
  let voucherTxSummary: StoreContext['voucherTxSummary'] = null
  try {
    let allVtxs: any[] = voucherTransactions.length > 0 ? voucherTransactions : []
    if (allVtxs.length === 0) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || ''
        if (k.startsWith(`v_${storeId}`) && k.endsWith('_transactions')) {
          const raw = localStorage.getItem(k)
          if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) allVtxs = [...allVtxs, ...p] }
        }
      }
    }
    const todayStr = new Date().toISOString().split('T')[0]
    const todayVtxs = allVtxs.filter(t => (t.timestamp || '').startsWith(todayStr) && t.type === 'PENJUALAN')
    if (todayVtxs.length > 0) {
      const tunai = todayVtxs.filter(t => (t.paymentMethod || '') === 'TUNAI')
      const qris = todayVtxs.filter(t => (t.paymentMethod || '') === 'QRIS')
      const nonTunai = todayVtxs.filter(t => (t.paymentMethod || '') !== 'TUNAI' && (t.paymentMethod || '') !== 'QRIS')
      voucherTxSummary = {
        totalPenjualan: todayVtxs.length,
        totalOmzet: todayVtxs.reduce((s, t) => s + (t.amount || 0), 0),
        totalTunai: tunai.reduce((s, t) => s + (t.amount || 0), 0),
        totalNonTunai: nonTunai.reduce((s, t) => s + (t.amount || 0), 0),
        totalQris: qris.reduce((s, t) => s + (t.amount || 0), 0),
      }
    }
  } catch {}

  // Filter transaksi bulan ini
  const bulanIni = new Date().toISOString().substring(0, 7)
  const monthlyTransactions = transactions.filter(t => (t.timestamp || '').startsWith(bulanIni))

  // Filter data kasir untuk peran kasir (whitelist - hanya lihat dirinya sendiri)
  let safeKasirList = kasirList;
  if (role === 'kasir') {
    safeKasirList = Object.fromEntries(
      Object.entries(kasirList).filter(([k, v]) => k === kasirName || v.name === kasirName)
    )
  }

  return {
    role,
    storeName: 'ALFAZA CELL',
    kasirName,
    currentMonth: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    monthlyTransactions,
    allTransactions: transactions,
    kasbonList,
    auditHistory,
    kasirList: safeKasirList,
    stokRendah,
    handoverRecords,
    voucherTxSummary,
    absensiList,
    voucherProducts,
    voucherTransactions
  }
}

// ── Parse AI Action dari respon Gemini ────────────────────────────────────────
export interface BotAction {
  type: 'kasbon' | 'navigate' | 'izin' | 'kontak' | 'catatan' | 'custom_faq'
  payload: Record<string, string>
}

export function parseBotActions(reply: string): { cleanText: string; actions: BotAction[] } {
  const actionRegex = /\[ACTION:([^\]]+)\]/g
  const actions: BotAction[] = []
  let match

  while ((match = actionRegex.exec(reply)) !== null) {
    const parts = match[1].split('|')
    const type = parts[0] as BotAction['type']
    if (type === 'kasbon' && parts.length >= 3) {
      actions.push({ type, payload: { nama: parts[1] || '', nominal: parts[2] || '0', keterangan: parts[3] || '' } })
    } else if (type === 'kontak' && parts.length >= 3) {
      actions.push({ type, payload: { nama: parts[1] || '', nomor: parts[2] || '', keterangan: parts[3] || '' } })
    } else if (type === 'navigate' && parts.length >= 2) {
      actions.push({ type, payload: { view: parts[1] || '' } })
    } else if (type === 'izin' && parts.length >= 3) {
      actions.push({ type, payload: { username: parts[1] || '', tanggal: parts[2] || '', alasan: parts[3] || '' } })
    } else if (type === 'catatan' && parts.length >= 3) {
      actions.push({ type, payload: { judul: parts[1] || '', isi: parts[2] || '' } })
    } else if (type === 'custom_faq' && parts.length >= 3) {
      actions.push({ type, payload: { tanya: parts[1] || '', jawab: parts[2] || '' } })
    }
  }

  const cleanText = reply.replace(actionRegex, '').trim()
  return { cleanText, actions }
}

// ── Gemini API Call (dengan dukungan system prompt override) ──────────────────
export async function callGeminiAPI(
  userMessage: string,
  history: ChatMessage[],
  apiKey: string,
  systemPromptOverride?: string,
  maxTokens: number = 2048
): Promise<string> {
  const contents: ChatMessage[] = [
    ...history.slice(-8),
    { role: 'user', parts: [{ text: userMessage }] }
  ]

  const systemInstruction = systemPromptOverride || `Kamu adalah Bot Alpha, asisten AI untuk toko pulsa dan konter.
Jawab dalam Bahasa Indonesia yang singkat, padat, dan ramah. Gunakan emoji secukupnya.
Jika tidak tahu, jujur saja. Jangan jawab hal berbahaya atau SARA.`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens,
      }
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const apiMsg = err?.error?.message || ''
    if (res.status === 400) throw new Error(`Request tidak valid: ${apiMsg || 'Cek format prompt atau API key.'}`)
    if (res.status === 403) throw new Error('API key tidak valid atau tidak punya akses ke model ini. Cek di Settings bot.')
    if (res.status === 404) throw new Error(`Model "${GEMINI_MODEL}" tidak ditemukan. Hubungi developer untuk update nama model.`)
    if (res.status === 429) throw new Error('Quota API habis. Coba lagi beberapa saat.')
    throw new Error(apiMsg || `Error HTTP ${res.status}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  const finishReason = data?.candidates?.[0]?.finishReason

  // Saat MAX_TOKENS: jangan throw error — kembalikan hasil parsial dengan marker
  // khusus agar caller bisa salvage data yang sudah berhasil diekstrak sebagian.
  if (finishReason === 'MAX_TOKENS') {
    return (text?.trim() || '') + '\n[SCAN_PARTIAL]'
  }
  if (!text && finishReason === 'SAFETY') {
    throw new Error('Respons diblokir filter keamanan Gemini. Coba ubah format teks input.')
  }
  return text?.trim() || 'Maaf, tidak ada respons dari Gemini.'
}

// ── Generator Briefing Eksekutif Owner (Goal 4) ───────────────────────────
export function generateExecutiveBriefing(
  storeId: string,
  kasirName: string,
  kasirList: Record<string, any> = {},
  transactions: any[] = [],
  absensiList: any[] = [],
  voucherTransactions: any[] = [],
  voucherProducts: any[] = []
): string {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const fullDate = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  let omsetToday = 0; let adminToday = 0; let countToday = 0
  let omsetYesterday = 0; let countYesterday = 0

  transactions.forEach(t => {
    if (t.kategori === 'Isi Saldo Bank' || t.kategori === 'Isi Saldo Real Aplikasi') return
    const ts = t.timestamp || ''
    if (ts.startsWith(todayStr)) {
      omsetToday += (t.nominal || 0)
      adminToday += (t.adminFee || 0)
      countToday++
    } else if (ts.startsWith(yesterdayStr)) {
      omsetYesterday += (t.nominal || 0)
      countYesterday++
    }
  })

  let voucherProfitToday = 0; let voucherOmsetToday = 0
  voucherTransactions.forEach(vt => {
    const ts = vt.timestamp || vt.date || ''
    if (ts.startsWith(todayStr)) {
      voucherOmsetToday += (vt.totalSalesAmount || ((vt.sellingPrice || 0) * (vt.quantity || 1)) || 0)
      voucherProfitToday += (vt.admin || ((vt.sellingPrice || 0) - (vt.buyPrice || 0)) || 0)
    }
  })

  let prods = voucherProducts.length > 0 ? voucherProducts : []
  if (prods.length === 0) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || ''
        if (k.startsWith(`v_${storeId}`) && k.endsWith('_products')) {
          const raw = localStorage.getItem(k)
          if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) prods = [...prods, ...p] }
        }
      }
    } catch {}
  }

  const stokKritis = prods.filter(p => (p.currentStock ?? p.stock ?? 0) <= (p.minStockLevel ?? 3))

  let kasbonList: any[] = []
  try {
    const saved = localStorage.getItem(`alphaPro_${storeId}_kasbon_list`)
    if (saved) kasbonList = JSON.parse(saved)
  } catch {}
  const totalKasbonAktif = kasbonList.filter(h => !h.lunas).reduce((s, h) => s + (h.nominal || 0), 0)

  const absensiToday = absensiList.filter(a => (a.tanggal || a.timestamp || '').startsWith(todayStr))
  const countHadir = absensiToday.filter(a => a.status === 'Hadir' || a.status === 'Hadir Shift').length

  let res = `🌅 **BRIEFING EKSEKUTIF OWNER (MORNING DIGEST)**\n`
  res += `📅 *${fullDate}* | Toko: **ALFAZA CELL**\n\n`

  res += `📊 **1. RINGKASAN PERFORMANCE (HARI INI & KEMARIN)**\n`
  res += `• Omset Utama Hari Ini: Rp ${omsetToday.toLocaleString('id-ID')} (${countToday} trx)\n`
  res += `• Fee Admin + Profit Voucher: **Rp ${(adminToday + voucherProfitToday).toLocaleString('id-ID')}**\n`
  res += `• Total Omset Kemarin: Rp ${omsetYesterday.toLocaleString('id-ID')} (${countYesterday} trx)\n`

  const diffOmset = omsetToday - omsetYesterday
  if (omsetYesterday > 0) {
    const perc = (diffOmset / omsetYesterday) * 100
    res += `• Perbandingan: ${diffOmset >= 0 ? `▲ +${perc.toFixed(1)}%` : `▼ ${perc.toFixed(1)}%`} dibanding kemarin.\n\n`
  } else {
    res += `\n`
  }

  res += `👥 **2. OPERASIONAL & TIM KASIR**\n`
  res += `• Presensi Kasir Hari Ini: **${countHadir} Orang Hadir**\n`
  res += `• Total Staf Kasir Terdaftar: ${Object.keys(kasirList).length} Akun\n\n`

  res += `📦 **3. STATUS LOGISTIK & RESTOK STOK**\n`
  if (stokKritis.length > 0) {
    res += `⚠️ **${stokKritis.length} produk dalam status KRITIS (<3 pcs)!**\n`
    stokKritis.slice(0, 3).forEach(p => {
      res += `  - **${p.name}**: sisa ${p.currentStock ?? p.stock} pcs\n`
    })
    res += `💡 _Ketik "rekomendasi belanja" untuk rincian restok._\n\n`
  } else {
    res += `✅ Stok voucher & fisik dalam batas aman.\n\n`
  }

  res += `💳 **4. FINANSIAL & PIUTANG KASBON**\n`
  res += `• Total Kasbon Aktif (Belum Lunas): **Rp ${totalKasbonAktif.toLocaleString('id-ID')}**\n\n`

  res += `💡 **REKOMENDASI AKSI OWNER HARI INI:**\n`
  if (stokKritis.length > 0) res += `1. Lakukan pemesanan ulang untuk ${stokKritis.length} produk voucher yang menipis.\n`
  else res += `1. Pantau tren saldo dan omset harian kasir.\n`
  if (totalKasbonAktif > 500000) res += `2. Ingatkan kasir untuk melakukan penagihan kasbon yang mendekati jatuh tempo.\n`
  else res += `2. Pertahankan koordinasi operasional shift kasir.\n`
  res += `3. Evaluasi performa penjualan di jam ramai (16:00 - 20:00).\n`

  return res
}
