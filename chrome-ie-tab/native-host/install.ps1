#Requires -Version 5.1
<#
.SYNOPSIS
  Compila e registra o host nativo do Chrome IE Tab no Windows (HKCU).

.PARAMETER ExtensionId
  ID da extensão mostrado em chrome://extensions (obrigatório).

.PARAMETER Uninstall
  Remove o registro do Native Messaging e arquivos instalados no perfil do usuário.

.EXAMPLE
  .\install.ps1 -ExtensionId abcd1234efgh5678
#>
param(
  [Parameter(Mandatory = $false)]
  [string]$ExtensionId,

  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$HostName = 'com.nilleylima.chrome_ie_tab'
$InstallDir = Join-Path $env:LOCALAPPDATA 'ChromeIETab'
$ExeName = 'ChromeIETabHost.exe'
$ExePath = Join-Path $InstallDir $ExeName
$ManifestPath = Join-Path $InstallDir "$HostName.json"
$RegPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
$RegPathChromium = "HKCU:\Software\Chromium\NativeMessagingHosts\$HostName"
$RegPathEdge = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"

function Write-Info($msg) { Write-Host "[Chrome IE Tab] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[Chrome IE Tab] $msg" -ForegroundColor Green }
function Write-Err($msg) { Write-Host "[Chrome IE Tab] $msg" -ForegroundColor Red }

if ($Uninstall) {
  Write-Info 'Removendo registro e arquivos...'
  foreach ($p in @($RegPath, $RegPathChromium, $RegPathEdge)) {
    if (Test-Path $p) { Remove-Item $p -Force }
  }
  if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
  Write-Ok 'Host nativo removido.'
  exit 0
}

if (-not $ExtensionId) {
  Write-Err 'Informe o ID da extensão: .\install.ps1 -ExtensionId SEU_ID'
  Write-Host 'Abra chrome://extensions, ative o Modo do desenvolvedor e copie o ID.'
  exit 1
}

if ($ExtensionId -notmatch '^[a-p]{32}$') {
  Write-Err "ExtensionId parece inválido: $ExtensionId (esperado 32 chars a-p)"
  exit 1
}

$IsWindows = $env:OS -eq 'Windows_NT'
if (-not $IsWindows) {
  Write-Err 'Este instalador só funciona no Windows (o motor IE/Trident é exclusivo do Windows).'
  exit 1
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$src = Join-Path $PSScriptRoot 'src\ChromeIETabHost.cs'
if (-not (Test-Path $src)) {
  Write-Err "Código-fonte não encontrado: $src"
  exit 1
}

# Prefer .NET Framework csc (WinForms + System.Web.Extensions available).
$cscCandidates = @(
  "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
  "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
$csc = $cscCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $csc) {
  Write-Err 'csc.exe do .NET Framework 4.x não encontrado. Instale o .NET Framework 4.8 Developer Pack / Targeting Pack.'
  exit 1
}

$outExe = Join-Path $InstallDir $ExeName
Write-Info "Compilando com $csc ..."
& $csc /nologo /target:winexe /optimize+ /platform:anycpu `
  /r:System.dll `
  /r:System.Drawing.dll `
  /r:System.Windows.Forms.dll `
  /r:System.Web.Extensions.dll `
  /out:"$outExe" `
  "$src"

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $outExe)) {
  Write-Err 'Falha na compilação do host nativo.'
  exit 1
}

$exePathJson = $outExe.Replace('\', '\\')
$manifest = @"
{
  "name": "$HostName",
  "description": "Chrome IE Tab native host (Trident / Internet Explorer WebBrowser)",
  "path": "$exePathJson",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$ExtensionId/"
  ]
}
"@

Set-Content -Path $ManifestPath -Value $manifest -Encoding UTF8
Write-Info "Manifesto escrito em $ManifestPath"

foreach ($p in @($RegPath, $RegPathChromium, $RegPathEdge)) {
  New-Item -Path $p -Force | Out-Null
  Set-ItemProperty -Path $p -Name '(default)' -Value $ManifestPath
}

Write-Ok 'Host nativo instalado com sucesso.'
Write-Host ''
Write-Host 'Próximos passos:'
Write-Host '  1. Reinicie o Google Chrome completamente.'
Write-Host '  2. Abra uma página http(s) e clique no ícone Chrome IE Tab.'
Write-Host '  3. Em Opções, use "Testar conexão com o host".'
Write-Host ''
Write-Host "Exe:      $outExe"
Write-Host "Manifest: $ManifestPath"
Write-Host "Ext ID:   $ExtensionId"
