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
        c.includes(`buka ${kw}`) ||
        c.includes(`ke ${kw}`) ||
        c.includes(`halaman ${kw}`) ||
        c.includes(`pindah ${kw}`) ||
        (kw.split(' ').length > 1 && c.includes(kw))
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

  // 4. Navigasi Umum (dengan pembersihan prefiks)
  let nav = c
  for (const t of ['ke halaman', 'pindah ke', 'pindah halaman', 'buka halaman', 'tampilkan', 'buka', 'ke ']) {
    if (nav.startsWith(t)) { nav = nav.slice(t.length).trim(); break }
  }
  for (const info of Object.values(VIEW_MAP)) {
    for (const kw of info.keywords) {
      if (nav === kw || nav.includes(kw) || c.includes(kw)) {
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
    answer: '🛠️ **Panduan Bot Alpha:**\n\n**📱 Navigasi & Halaman:**\n• *"buka atur stok"* — Ke Stok Voucher\n• *"buka kasbon"* — Ke Buku Kasbon\n• *"buka gaji kasir"* — Ke Owner Gaji\n\n**📊 Tanya Data Offline Toko:**\n• *"daftar kasbon"* — Cek kasbon belum lunas\n• *"cari kontak budi"* — Cari no hp pelanggan\n• *"gaji roni"* — Lihat detail gaji kasir\n• *"rekap hari ini"* — Total nominal & rincian penjualan\n• *"absen hari ini"* — Status kehadiran kasir\n\n**🧮 Kalkulator:**\n• *"berapa 5000 x 12"*\n• *"modal 13000 jual 15000"*\n• *"10% dari 500000"*\n\n**📡 Info Operator:**\n• *"cara cek saldo telkomsel"*\n• *"nomor cs indosat"*\n\n**💬 Umum (Groq):**\n• Tanya apa saja jika Groq key sudah diset'
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
]

// ── Knowledge Base Lookup (With Database Contexts) ───────────────────────────────────
export function answerFromKB(
  text: string, 
  storeId: string, 
  username: string,
  kasirList: Record<string, any> = {},
  transactions: any[] = [],
  absensiList: any[] = []
): string | null {
  const c = text.toLowerCase().trim()

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

  // 5. ABSENSI SEARCH
  if (c.includes('absen') || c.includes('hadir') || c.includes('kehadiran') || c.includes('bolos') || c.includes('masuk kerja')) {
    if (absensiList.length === 0) {
      return "📅 **Data Absensi:** Belum ada log absensi terdaftar untuk hari ini."
    }
    
    const hadir = absensiList.filter(a => a.status === 'Hadir')
    const libur = absensiList.filter(a => a.status === 'Libur' || a.status === 'Izin')
    
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

  // Fallback ke KB bawaan
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
