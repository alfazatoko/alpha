# ALPHA PRO - ALFAZA CELL

Sistem manajemen toko dan kasir modern berbasis React, Vite, dan Supabase.

## Fitur Utama
- **Dashboard Owner**: Pantau volume transaksi dan estimasi profit secara real-time.
- **Filter Kasir**: Pantau performa per kasir langsung dari halaman depan dengan opsi yang bisa diatur di pengaturan.
- **Manajemen Transaksi**: Pencatatan transaksi digital (DANA, Transfer, Kuota) dan fisik dengan antarmuka yang sangat padat (*compact*).
- **Otomatisasi Deployment**: Integrasi GitHub Actions untuk update website dan build APK Android secara otomatis setiap kali melakukan push kode.
- **PWA & Native**: Dapat diakses melalui browser sebagai PWA atau diinstal sebagai aplikasi Android native menggunakan Capacitor.

## Teknologi
- **Frontend**: React 19, TypeScript, Vite.
- **Styling**: Tailwind CSS dengan desain premium dan responsif.
- **Backend/Database**: Supabase.
- **Native Bridge**: Capacitor 6.
- **Hosting**: Firebase Hosting.

## Panduan Pengembangan Lokal

1. Clone repositori ini ke komputer Anda.
2. Jalankan `npm install` untuk menginstal semua dependensi.
3. Pastikan file `.env` sudah terisi dengan URL dan API Key Supabase Anda.
4. Jalankan `npm run dev` untuk menjalankan aplikasi di browser.

## Deployment & Build APK

### 1. Update Website
Cukup jalankan file `deploy.bat`. Script ini akan mengirimkan kode Anda ke GitHub, lalu GitHub akan otomatis memperbarui website `alfalia.web.app`.

### 2. Build APK Android
Setiap kali Anda melakukan push kode, GitHub akan membuatkan APK versi **Release** terbaru.
- Buka repositori di GitHub.
- Pergi ke tab **Actions**.
- Pilih workflow terbaru dan unduh file di bagian **Artifacts**.

*Catatan: Pastikan GitHub Secrets sudah dikonfigurasi sesuai panduan di `README_KEYSTORE.md` agar build berjalan lancar.*

---
© 2026 ALFAZA CELL - Premium Store Management System
