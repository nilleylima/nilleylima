@echo off
chcp 65001 >nul
setlocal

REM ============================================================
REM  Inspex — instalação no XAMPP SEM Node.js
REM  Copia a pasta pronta xampp-htdocs\inspex para htdocs
REM ============================================================

set "XAMPP_DIR=C:\xampp"
set "DEST=%XAMPP_DIR%\htdocs\inspex"
set "SRC=%~dp0xampp-htdocs\inspex"

echo.
echo Instalando Inspex no XAMPP...
echo Origem: %SRC%
echo Destino: %DEST%
echo.

if not exist "%SRC%\index.html" (
  echo [ERRO] Pasta pronta nao encontrada:
  echo   %SRC%
  echo Baixe a branch completa do GitHub e tente de novo.
  pause
  exit /b 1
)

if not exist "%XAMPP_DIR%\htdocs" (
  echo [ERRO] XAMPP nao encontrado em: %XAMPP_DIR%
  echo.
  echo Edite este arquivo instalar-xampp.bat e ajuste:
  echo   set "XAMPP_DIR=C:\xampp"
  echo para o caminho do seu XAMPP.
  pause
  exit /b 1
)

if exist "%DEST%" (
  echo Removendo instalacao anterior...
  rmdir /s /q "%DEST%"
)

mkdir "%DEST%"
xcopy /e /i /y "%SRC%\*" "%DEST%\" >nul
if errorlevel 1 (
  echo [ERRO] Falha ao copiar arquivos.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  Instalacao concluida!
echo.
echo  Agora:
echo  1) Abra o XAMPP Control Panel
echo  2) Start no Apache
echo  3) Abra no navegador: http://localhost/inspex/
echo.
echo  Camera: use localhost (nao o IP da rede)
echo  Sem camera: clique em "Demo com referencia"
echo ============================================================
echo.

start "" "http://localhost/inspex/"
pause
