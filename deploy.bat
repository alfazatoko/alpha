@echo off
color 0b
echo ====================================================
echo       ALPHA PRO - DEPLOYMENT SCRIPT OTOMATIS
echo ====================================================
echo.
echo [1] Memulai proses Build...
call npm run build
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Build gagal! Silakan cek error di atas.
    pause
    exit /b %errorlevel%
)
echo [OK] Build berhasil!
echo.

echo [2] Menyimpan ke GitHub...
git add .
set commit_msg=update fitur dan perbaikan bug
set /p user_msg="Masukkan pesan update (tekan Enter untuk default): "
if not "%user_msg%"=="" set commit_msg=%user_msg%
git commit -m "%commit_msg%"
git push
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Gagal push ke GitHub! Cek koneksi internet.
    pause
    exit /b %errorlevel%
)
echo [OK] Berhasil simpan ke GitHub!
echo.

echo [3] Mengirim aplikasi ke Firebase (Live)...
call npx firebase deploy --only hosting
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Deploy Firebase gagal!
    pause
    exit /b %errorlevel%
)
echo.
color 0a
echo ====================================================
echo   SELESAI! APLIKASI SUDAH BERHASIL DI-UPDATE/LIVE!
echo   Buka link: https://alfalia.web.app/
echo ====================================================
pause
