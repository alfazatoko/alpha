# Rencana Teknis Implementasi: Tampilan PC Modern (Sidebar)

Rancangan ini menjelaskan strategi integrasi tata letak **Versi PC Kecil** (Desktop Mode) dengan navigasi bilah samping (Sidebar) pada aplikasi **AlfazaCell**, tanpa mengubah fungsionalitas yang ada saat ini.

---

## 1. Konsep Perubahan Tata Letak

### A. Tampilan Mobile Aktif (Saat ini)
* Navigasi utama menggunakan bilah bawah (`Navigation.tsx` / Bottom bar).
* Header bertema (`BerandaHeader`, `LaporanHeader`) berada di bagian atas setiap halaman.
* Tampilan dibungkus dalam container halaman tunggal yang menggulung secara vertikal.

### B. Tampilan PC Aktif (Baru)
* **Tata Letak Grid Horizontal**:
  * **Kolom Kiri (240px)**: Sidebar permanen yang berisi logo toko, navigasi menu vertikal, dan informasi kasir aktif.
  * **Kolom Kanan (Sisa Layar)**: Kontainer halaman utama yang memuat area kerja aktif (`BerandaView`, `RiwayatView`, `LaporanView`, dll.) secara terintegrasi.
* **Penghilangan Bottom Bar**: Bottom bar disembunyikan secara otomatis ketika Mode PC aktif.
* **Transisi Halus**: Perubahan mode didesain responsif dengan animasi transisi yang mulus untuk menjaga keindahan visual premium.

---

## 2. Struktur Komponen & Perubahan Kode

### A. State Baru di `src/App.tsx`
Kita akan menambahkan state untuk mengontrol apakah mode PC sedang aktif:
```typescript
const [isPcMode, setIsPcMode] = useState<boolean>(() => {
  return localStorage.getItem('isPcMode') === 'true';
});
```

### B. Tombol Aktivasi di `src/components/SidePanel.tsx`
Menambahkan opsi baru "Desktop PC" di dalam bagian **Mode Tampilan**:
```tsx
{/* Menambahkan opsi PC di Grid Mode Tampilan */}
{[
  { id: 'hp', label: 'Smartphone', icon: 'fa-mobile-screen' },
  { id: 'tablet', label: 'Tablet', icon: 'fa-tablet-screen-button' },
  { id: 'pc', label: 'Desktop PC', icon: 'fa-desktop' } // Opsi Baru
]}
```

### C. Pembuatan Komponen `src/components/SidebarPC.tsx`
Komponen sidebar baru untuk versi desktop dengan gaya premium glassmorphism:
```tsx
import React from 'react';
import { cn } from '../utils'; // atau utility yang ada

interface SidebarPCProps {
  activeView: string;
  setActiveView: (view: string) => void;
  storeName?: string;
  storeSubtext?: string;
  kasirName?: string;
  kasirRole?: string;
  onLogout?: () => void;
}

const SidebarPC: React.FC<SidebarPCProps> = ({ ...props }) => {
  // Rencana UI:
  // - Top: Logo Toko + Nama Toko + Tagline
  // - Middle: Menu Item List (Beranda, Transaksi, Laporan, Presets, Akun)
  // - Bottom: Info Kasir Aktif & Tombol Logout
};
```

### D. Penyesuaian Layout Utama (`src/App.tsx`)
Membungkus halaman utama ke dalam layout flexbox ketika mode PC aktif:
```tsx
<div className={cn("min-h-screen w-full bg-gray-50 flex", isPcMode && "pc-layout-active")}>
  {isPcMode && (
    <SidebarPC 
      activeView={activeView} 
      setActiveView={setActiveView} 
      storeName={storeName}
      storeSubtext={storeSubtext}
      kasirName={account?.name}
      kasirRole={account?.role}
    />
  )}
  
  <div className={cn("flex-1 relative flex flex-col h-screen overflow-hidden", isPcMode ? "p-6" : "")}>
    {/* Konten Halaman Aktif */}
    ...
  </div>
</div>
```

---

## 3. Gaya Visual Premium (Tailwind / CSS)

### A. Tema Sidebar PC (Glassmorphism Gelap)
Menggunakan paduan warna biru tua premium, border semi-transparan, efek blur kaca, serta interaksi mikro-animasi:
* **Background**: `bg-slate-900/95 backdrop-blur-md`
* **Border Samping**: `border-r border-white/10`
* **Menu Aktif**: `bg-blue-600/90 text-white shadow-md shadow-blue-500/20`
* **Menu Non-Aktif**: `text-slate-400 hover:text-white hover:bg-white/5 transition-all`

### B. Animasi Menu Hover
Setiap menu di sidebar akan memiliki micro-animation:
* Sedikit bergeser ke kanan saat di-hover (`hover:translate-x-1 duration-200`).
* Efek transisi pudar untuk ikon dan teks.

---

## 4. Keuntungan Mode PC Modern
1. **Navigasi Jauh Lebih Cepat**: Pengguna PC tidak perlu menggeser menu samping untuk berpindah halaman utama.
2. **Kepadatan Informasi Tinggi**: Dashboard rekapitulasi dapat memanfaatkan lebar layar penuh sehingga tidak ada informasi yang tertumpuk atau terpotong.
3. **Estetika Kelas Atas**: Menyejajarkan sistem pembukuan ini setara dengan aplikasi SaaS kasir modern berkelas enterprise.
