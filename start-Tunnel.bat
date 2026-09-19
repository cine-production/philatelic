@echo off
echo ========================================
echo   Philatelic Curator - Démarrage Tunnel Cloudflare
echo ========================================

echo Démarrage Tunnel Cloudflare...
start "Tunnel" cmd /k "cloudflared tunnel run philatelic"
timeout /t 5 /nobreak

echo ========================================
echo   le services à démarré !
echo   Site: https://philatelic.servicetiers.fr
echo ========================================
timeout /t 3