@echo off
echo ========================================
echo   Philatelic Curator - Démarrage Ollama
echo ========================================

echo Démarrage Ollama...
start "Ollama" cmd /k "ollama serve"
timeout /t 5 /nobreak

echo ========================================
echo   le services à démarré !
echo   Site: https://philatelic.servicetiers.fr
echo ========================================
timeout /t 3