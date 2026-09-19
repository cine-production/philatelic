@echo off
echo ========================================
echo   Philatelic Curator - Démarrage
echo ========================================

echo [1/5] Démarrage MongoDB...
start "MongoDB" cmd /k "cd /d "C:\Program Files\MongoDB\Server\7.0\bin" && mongod.exe --dbpath D:\DataBase\Mongo\data\db"
timeout /t 5 /nobreak

echo [2/5] Démarrage Ollama (IA)...
start "Ollama" cmd /k "ollama serve"
timeout /t 3 /nobreak

echo [3/5] Démarrage Backend API...
start "Backend" cmd /k "cd /d C:\Users\ServeurStock\Documents\GitHub\philatelic\backend && .\venv\Scripts\activate && uvicorn server:app --host 0.0.0.0 --port 8001"
timeout /t 3 /nobreak

echo [4/5] Démarrage Frontend...
start "Frontend" cmd /k "cd /d C:\Users\ServeurStock\Documents\GitHub\philatelic\frontend && serve -s build -l 3000"
timeout /t 3 /nobreak

echo [5/5] Démarrage Cloudflare Tunnel...
start "Tunnel" cmd /k "cloudflared tunnel run philatelic"

echo ========================================
echo   Tous les services sont démarrés !
echo   Site: https://philatelic.servicetiers.fr
echo ========================================
pause