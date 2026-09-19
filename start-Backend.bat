@echo off
echo ========================================
echo   Philatelic Curator - Démarrage Backend
echo ========================================

echo Démarrage Backend...
start "Backend" cmd /k "cd /d C:\Users\ServeurStock\Documents\GitHub\philatelic\backend && .\venv\Scripts\activate && uvicorn server:app --host 0.0.0.0 --port 8001"
timeout /t 5 /nobreak

echo ========================================
echo   le services à démarré !
echo   Site: https://philatelic.servicetiers.fr
echo ========================================
timeout /t 3