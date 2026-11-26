@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Pasar Pintar
echo ==========================================
echo   Pasar Pintar - menyalakan aplikasi
echo ==========================================

where py >nul 2>nul
if errorlevel 1 (
  echo Python belum terpasang. Pasang Python dari python.org lalu coba lagi.
  goto gagal
)

if not exist ".venv\Scripts\python.exe" (
  echo Membuat lingkungan Python .venv - hanya sekali, tunggu sebentar...
  py -3 -m venv .venv
  if errorlevel 1 goto gagal
)

echo Memeriksa paket Python...
".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto gagal

".venv\Scripts\python.exe" -m apps.api.siapkan_env
if errorlevel 1 goto gagal

echo.
echo Aplikasi berjalan di  http://127.0.0.1:8000
echo Browser akan terbuka otomatis. Untuk mematikan: tutup jendela ini atau tekan Ctrl+C.
echo.
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:8000"
".venv\Scripts\python.exe" -m uvicorn apps.api.main:create_app --factory --host 127.0.0.1 --port 8000
pause
exit /b 0

:gagal
echo.
echo Terjadi kesalahan. Kirim tangkapan layar jendela ini ke asisten.
pause
exit /b 1
