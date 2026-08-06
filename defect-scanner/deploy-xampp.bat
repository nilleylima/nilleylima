@echo off
chcp 65001 >nul
setlocal

REM ============================================================
REM  Inspex — gerar build e copiar para o XAMPP (Windows)
REM  Uso:
REM    1) Instale Node.js (https://nodejs.org)
REM    2) Clique duas vezes neste arquivo OU rode no Prompt:
REM         deploy-xampp.bat
REM    3) Se o XAMPP estiver em outro lugar, edite XAMPP_DIR abaixo
REM ============================================================

set "XAMPP_DIR=C:\xampp"
set "DEST=%XAMPP_DIR%\htdocs\inspex"
set "SCRIPT_DIR=%~dp0"

cd /d "%SCRIPT_DIR%"

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js / npm nao encontrado.
  echo Baixe em https://nodejs.org e instale, depois rode este arquivo de novo.
  pause
  exit /b 1
)

if not exist "%XAMPP_DIR%\htdocs" (
  echo [ERRO] Pasta do XAMPP nao encontrada: %XAMPP_DIR%\htdocs
  echo Edite a variavel XAMPP_DIR neste arquivo .bat com o caminho correto.
  pause
  exit /b 1
)

echo.
echo [1/3] Instalando dependencias...
call npm install
if errorlevel 1 (
  echo [ERRO] npm install falhou.
  pause
  exit /b 1
)

echo.
echo [2/3] Gerando build de producao...
call npm run build
if errorlevel 1 (
  echo [ERRO] npm run build falhou.
  pause
  exit /b 1
)

echo.
echo [3/3] Copiando para %DEST% ...
if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%"
xcopy /e /i /y "%SCRIPT_DIR%dist\*" "%DEST%\" >nul

echo.
echo ============================================================
echo  Pronto!
echo  1) Abra o XAMPP Control Panel e inicie o Apache
echo  2) No navegador abra:  http://localhost/inspex/
echo.
echo  IMPORTANTE: use localhost (nao o IP da rede) para a camera.
echo  Sem camera? Clique em "Demo com referencia".
echo ============================================================
echo.
pause
