# Panduan Keystore & Signing APK (GitHub Actions)

Dokumen ini berisi panduan untuk menyiapkan tanda tangan digital (Signing) agar Google Login dan fitur lainnya berjalan lancar di versi APK.

## 1. Membuat File Keystore Baru
Buka terminal (CMD/PowerShell/Terminal) di komputer Anda dan jalankan perintah berikut:

```bash
keytool -genkey -v -keystore release.keystore -alias alpha_key -keyalg RSA -keysize 2048 -validity 10000
```
*   **Keystore name**: `release.keystore`
*   **Alias**: `alpha_key` (Simpan nama ini untuk GitHub Secrets)
*   **Password**: Tentukan password Anda (Simpan untuk GitHub Secrets)

---

## 2. Mengubah Keystore menjadi Base64
Kita perlu mengubah file file `release.keystore` menjadi teks agar bisa disimpan di GitHub Secrets.

### Untuk Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) | Out-File -FilePath keystore_base64.txt
```

### Untuk Mac / Linux:
```bash
base64 -i release.keystore > keystore_base64.txt
```

Buka file `keystore_base64.txt`, salin seluruh isinya.

---

## 3. Konfigurasi GitHub Secrets
Buka repositori GitHub Anda, pergi ke **Settings > Secrets and variables > Actions**, lalu tambahkan **4 Secret** berikut:

| Nama Secret | Isi / Nilai |
| :--- | :--- |
| `KEYSTORE_BASE64` | Isi dari file `keystore_base64.txt` (teks panjang) |
| `KEYSTORE_PASSWORD` | Password yang Anda buat untuk keystore |
| `KEY_ALIAS` | Nama alias yang Anda buat (contoh: `alpha_key`) |
| `KEY_PASSWORD` | Password yang Anda buat untuk key (biasanya sama dengan keystore) |

---

## 4. Mendapatkan SHA-1 untuk Firebase
Setelah Anda push kode ini ke GitHub, workflow akan berjalan. 
1.  Buka tab **Actions** di GitHub.
2.  Klik pada job yang sedang berjalan.
3.  Buka bagian **"Run Signing Report (Untuk Ambil SHA-1)"**.
4.  Cari baris yang bertuliskan `SHA1` dan `SHA256` di bawah blok `Variant: release`.
5.  Salin kode tersebut dan masukkan ke **Firebase Console > Project Settings > Android App > SHA certificate fingerprints**.

---

## Mengapa ini perlu?
Google Login memerlukan verifikasi bahwa APK yang terpasang ditandatangani oleh kunci yang sama dengan yang terdaftar di Firebase. Dengan menggunakan GitHub Secrets, kita memastikan setiap APK yang dibuat GitHub selalu memiliki "tanda tangan" yang konsisten.
