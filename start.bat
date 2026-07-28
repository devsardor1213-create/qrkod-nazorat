@echo off
echo ==============================================
echo   QR KOD NAZORAT SERVER ISHGA TUSHIRISH
echo ==============================================

echo [*] Kutubxonalar ornatilmoqda...
pip install -r requirements.txt

echo [*] Server ishga tushmoqda...
uvicorn main:app --host 0.0.0.0 --port 8000
