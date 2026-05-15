@echo off
color 0b
echo ====================================================
echo       ALPHA PRO - GITHUB AUTO-DEPLOY
echo ====================================================
echo.

:: Step 1: Git Add
echo [1] Menyiapkan file untuk dikirim...
git add .

:: Step 2: Get Commit Message
set commit_msg=update fitur dan perbaikan bug
echo.
set /p user_msg="Masukkan pesan update (tekan Enter untuk default): "
if not "%user_msg%"=="" set commit_msg=%user_msg%

:: Step 3: Git Commit
echo.
echo [2] Mengunci perubahan (Commit)...
git commit -m "%commit_msg%"

:: Step 4: Git Push
echo.
echo [3] Mengirim ke GitHub (Otomatis Deploy & Build APK)...
git push

if %errorlevel% neq 0 (
    color 0c
    echo.
    echo [ERROR] Gagal mengirim ke GitHub! 
    echo Pastikan koneksi internet aktif dan Anda sudah login git.
    pause
    exit /b %errorlevel%
)

echo.
color 0a
echo ====================================================
echo   SELESAI! Kode telah terkirim ke GitHub.
echo.
echo   GitHub sedang memproses secara otomatis:
echo   1. Update Website: https://alfalia.web.app/
echo   2. Build APK: Cek menu "Actions" di GitHub.
echo ====================================================
echo.
pause
