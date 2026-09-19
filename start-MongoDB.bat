@echo off
echo ========================================
echo   Philatelic Curator - Démarrage MongoDB
echo ========================================

echo Démarrage MongoDB...
start "MongoDB" cmd /k "cd /d "C:\Program Files\MongoDB\Server\7.0\bin" && mongod.exe --dbpath D:\DataBase\Mongo\data\db"
timeout /t 5 /nobreak

echo ========================================
echo   le services à démarré !
echo   Site: https://philatelic.servicetiers.fr
echo ========================================
timeout /t 3