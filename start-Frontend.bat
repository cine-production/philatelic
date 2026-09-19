@echo off
echo ========================================
echo   Philatelic Curator - Démarrage Frontend
echo ========================================

echo Démarrage Frontend...
start "Frontend" cmd /k "cd /d C:\Users\ServeurStock\Documents\GitHub\philatelic\frontend && serve -s build -l 3000"
timeout /t 5 /nobreak

echo ========================================
echo   le services à démarré !
echo   Site: https://philatelic.servicetiers.fr
echo ========================================
timeout /t 3