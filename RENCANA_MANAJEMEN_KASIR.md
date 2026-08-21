# 📋 Rencana Pembangunan Modul Manajemen Kasir & Payroll (ALPHA)

Dokumen ini berisi cetak biru (blueprint) dan langkah-langkah bertahap untuk membangun sistem HRIS (Human Resource Information System) mini di dalam aplikasi ALPHA. Sistem ini akan memungkinkan Owner untuk melacak performa kasir, mengatur gaji, absensi (off), dan memberikan peringatan bonus otomatis (terutama bonus 6 bulanan).

---

## 🎯 Tujuan Utama
1. **Peringatan Bonus Otomatis (Ide A):** Banner notifikasi khusus di dashboard Owner jika ada kasir yang sudah bekerja kelipatan 6 bulan.
2. **Profil Kasir (Self-Service):** Kasir dapat mengunggah foto profil dan melengkapi biodata dasar dari perangkat mereka sendiri.
3. **Payroll & Kontrol Owner:** Owner dapat melihat riwayat pembayaran gaji, menyesuaikan gaji pokok & potongan (jumlah libur/off), serta mengesahkan pembayaran bonus.
4. **Hierarki Data Multi-Store:** Menampilkan daftar Kasir berdasarkan cabang Toko tempat mereka bekerja.

---

## 🛠️ Fase 1: Pembaruan Struktur Data (Database & Tipe Data)
*Langkah pertama adalah menyesuaikan fondasi data agar bisa menyimpan informasi profil yang lebih lengkap.*

### 1. Update Tipe Data (`types.ts`)
Kita perlu memperbarui *interface* `Cashier` (atau membuat `CashierProfile`) di `src/views/voucher-app/types.ts` dan di `App.tsx` utama:
```typescript
interface Cashier {
  id: string;
  name: string;
  role: 'Administrator' | 'Kasir Utama' | 'Kasir Shift';
  email: string;
  avatar: string; // URL / Base64 foto
  isOnline: boolean;
  pin: string;
  
  // -- FIELD BARU UNTUK PROFIL & PAYROLL --
  alamat?: string;
  tempatLahir?: string;
  tanggalLahir?: string; // Format: YYYY-MM-DD
  tanggalJoin?: string;  // Format: YYYY-MM-DD (Krusial untuk Bonus)
  gajiPokok?: number;
  totalOffBulanIni?: number;
}
```

### 2. Update Komponen Penyimpanan
Memastikan logika `localStorage` (seperti fungsi sinkronisasi cloud/Supabase dan `handleSaveCashierSelf`) menangkap *field* baru di atas agar biodata kasir tidak hilang saat direfresh atau ganti perangkat.

---

## 💻 Fase 2: Fitur Self-Service Kasir (Biodata & Upload Foto)
*Kasir harus bisa melengkapi data diri mereka secara mandiri tanpa harus direpotkan oleh Owner.*

1. **Modifikasi `AkunView.tsx` (Tab: Profil Kasir):**
   * Tambahkan area unggah (*upload*) **Foto Profil** yang menggunakan fungsi kompresi base64 (sudah ada di utils: `compressImage`).
   * Tambahkan form input untuk: **Nama Lengkap, Alamat, Tempat Lahir, dan Tanggal Lahir**.
   * *Kunci (Read-Only) untuk Kasir:* **Tanggal Join** dan **Gaji Pokok** (Bagian ini hanya muncul informasinya saja, atau disembunyikan sama sekali dari kasir).
2. **Testing:** Pastikan foto dan biodata tersimpan dengan aman di objek `kasirList` dan sukses dikirim/disimpan ke Cloud.

---

## 👑 Fase 3: Dashboard Owner (Modul "Manajemen Kasir")
*Membangun UI/UX eksklusif untuk Owner agar bisa memonitor dan menggaji kasirnya.*

1. **Membuat Tombol/Navigasi:**
   * Ubah/tambah tombol navigasi (misalnya di Sidebar `AkunView` atau tombol di Beranda) yang mengarah ke `view-manajemen-kasir`.
2. **UI Daftar Toko & Kasir (Hirarki):**
   * Buat tampilan daftar *Grid* untuk menampilkan Cabang Toko.
   * Saat satu Toko diklik, rentangkan (*expand*) daftar kasir yang terdaftar di toko tersebut (Tampilkan avatar, nama, dan indikator lama bekerja).
3. **Modal/Halaman Detail Profil Kasir (Khusus Owner):**
   * Menampilkan semua data biodata.
   * Memberikan akses edit khusus untuk **Tanggal Join** dan **Gaji Pokok**.
   * Menampilkan ringkasan **Jumlah Off (Libur)** di bulan berjalan (bisa diedit jika ada perubahan manual).

---

## 🎁 Fase 4: Sistem Pengingat Bonus (Ide A) & Payroll
*Core logic untuk menghitung waktu kerja kasir dan mencatat pembukuan gajinya.*

1. **Logika Pengecekan 6 Bulan (Background Check):**
   * Di file `BerandaView.tsx` (atau di fungsi `useEffect` global), buat fungsi penghitung selisih bulan antara `Hari Ini` dan `Tanggal Join` setiap kasir.
   * Jika modulo 6 == 0 (6, 12, 18 bln dst) DAN bulan ini belum ada rekam jejak "Bonus Dicairkan", maka berikan penanda *flag `isBonusDue = true`*.
2. **Banner Alert di Beranda Owner:**
   * Jika ada kasir dengan `isBonusDue = true`, munculkan sebuah **Banner Warna Emas/Merah** di puncak halaman Beranda.
   * *Teks:* "⚠️ Jatuh Tempo Bonus: Kasir [Nama] telah bekerja selama 6 bulan. Jangan lupa berikan bonus!"
3. **Tombol "Bayar Gaji / Cairkan Bonus":**
   * Di dalam profil kasir (Fase 3), sediakan tombol khusus untuk mengesahkan pembayaran gaji bulanan dan/atau bonus.
   * Ketika diklik:
     - Mereset status/pengingat bonus ke bulan depan.
     - Menyisipkan catatan transaksi *Pengeluaran* ke tabel transaksi utama (`type: 'Tarik Tunai' / 'Pengeluaran'`, `Kategori: Gaji Kasir`).
     - Menyimpan riwayat ke dalam objek/tabel `riwayat_gaji` agar bisa dilihat kapan saja.

---
**Dibuat pada:** 21 Agustus 2026
**Status:** Perencanaan (Siap Eksekusi Fase 1)
