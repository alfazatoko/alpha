@echo off
title Alpha Dev Server Launcher
echo Menjalankan Server Lokal Alpha...

:: Set PATH agar mengenali Node.js dan npm
set PATH=C:\Users\axioo\node_local\node-v20.17.0-win-x64;%PATH%

:: Pindah ke direktori project
cd /d c:\Users\axioo\APLIKASI\alpha

:: Menjalankan server lokal (Vite) di command prompt baru
start "Server Lokal Alpha" cmd /k "npm run dev -- --port 5175"

:: Menunggu beberapa detik agar server siap
echo Menunggu server siap...
timeout /t 3 /nobreak >nul

:: Membuka browser ke alamat localhost
start http://localhost:5175
