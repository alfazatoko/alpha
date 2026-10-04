@echo off
color 0b
echo ========================================================
echo   PROGRAM UPLOAD KODE KE GITHUB (ALFAZA TOKO / ALPHA)
echo ========================================================
echo.
echo Sedang menyiapkan Git...
set PATH=%PATH%;C:\Program Files\Git\cmd
cd /d "%~dp0"

echo.
echo Akan memproses Upload... 
echo JIKA MUNCUL POPUP GITHUB LAGI:
echo 1. Jangan pilih "Sign in with Browser".
echo 2. Coba klik pilihan "Sign in with a code" atau "Device Code" (jika ada).
echo.
set GCM_BROWSER=None
set GCM_GUI_PROMPT=0
git push -u origin main --force

echo.
echo ========================================================
echo PROSES SELESAI. Jika ada kode yang muncul di atas, copy
echo kode tersebut, lalu buka: https://github.com/login/device 
echo dan paste kodenya di browser.
echo ========================================================
pause
