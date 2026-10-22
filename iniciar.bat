@echo off
chcp 65001 >nul
title Tumulto - servidor
cd /d "%~dp0"
where node >nul 2>nul || goto nonode
start "" /min cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node server.js
pause
exit /b

:nonode
echo.
echo  Node.js nao foi encontrado neste PC.
echo  Instale a versao LTS em https://nodejs.org e rode este arquivo de novo.
start "" https://nodejs.org
pause
exit /b
