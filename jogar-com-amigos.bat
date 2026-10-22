@echo off
chcp 65001 >nul
title Tumulto - jogar com amigos pela internet
cd /d "%~dp0"
where node >nul 2>nul || goto nonode

call :findcf
if not defined CF (
  echo Instalando o cloudflared, que cria o link publico gratuito...
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  call :findcf
)
if not defined CF goto nocf

start "Tumulto - servidor" cmd /k node server.js
timeout /t 2 >nul
start "" http://localhost:3000
echo.
echo ==================================================================
echo  Procure abaixo uma linha com um link assim:
echo      https://alguma-coisa.trycloudflare.com
echo  Mande ESSE link para seus amigos. Voce joga pelo localhost.
echo  Deixe esta janela e a do servidor abertas enquanto jogam.
echo ==================================================================
echo.
"%CF%" tunnel --url http://localhost:3000
pause
exit /b

:findcf
set "CF="
for /f "delims=" %%i in ('where cloudflared 2^>nul') do if not defined CF set "CF=%%i"
if not defined CF if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\cloudflared.exe" set "CF=%LOCALAPPDATA%\Microsoft\WinGet\Links\cloudflared.exe"
if not defined CF if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
if not defined CF if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles%\cloudflared\cloudflared.exe"
exit /b

:nonode
echo.
echo  Node.js nao foi encontrado neste PC.
echo  Instale a versao LTS em https://nodejs.org e rode este arquivo de novo.
start "" https://nodejs.org
pause
exit /b

:nocf
echo.
echo  Nao consegui instalar o cloudflared automaticamente.
echo  Feche esta janela e rode de novo. Se continuar, baixe em:
echo  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
pause
exit /b
