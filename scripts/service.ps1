<#
.SYNOPSIS
  Registers dark-agi-frontend as a Windows Service, using WinSW as the service host.

.DESCRIPTION
  This is NOT run automatically by anything in this repository or by any agent
  working in it - it changes system state (the Service Control Manager, set to
  auto-start at boot) and must be invoked deliberately by an administrator.

  WinSW (https://github.com/winsw/winsw) is a separate, well-established tool
  this script does not bundle or download; get a release binary yourself and
  point -WinSwPath at it (default: tools\winsw.exe under this repository, the
  same convention dark-agi-backend's own service.ps1 uses).

  The registered service runs `next start` directly - the console has no
  database or second process to coordinate, unlike the API. Binds to
  127.0.0.1 by default; pass -BindHost 0.0.0.0 to accept connections from
  other machines (LAN only -- there is no TLS here, so only do this on a
  trusted network, and the backend's own HOST/CORS_ORIGINS need the same
  treatment, see dark-agi-backend\.env).

  Requires an elevated (Administrator) PowerShell and `npm run build` to have
  produced a .next build first (see dark-agi-web.ps1 setup). The API it talks
  to is whatever NEXT_PUBLIC_API_BASE_URL in .env.local resolves to - this
  script does not start or depend on the backend service; run its own
  dark-agi-backend\scripts\service.ps1 install separately if you want both.

.EXAMPLE
  .\scripts\service.ps1 install
  .\scripts\service.ps1 status
  .\scripts\service.ps1 uninstall
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet('install', 'uninstall', 'start', 'stop', 'status')]
  [string]$Command,
  [string]$WinSwPath,
  [string]$ServiceName = 'DarkAGI-Web',
  [string]$BindHost = '127.0.0.1'
)

$ErrorActionPreference = 'Stop'
$Frontend = Split-Path -Parent $PSScriptRoot
$ServiceDir = Join-Path $Frontend '.data\service'
$ServiceExe = Join-Path $ServiceDir "$ServiceName.exe"
$ServiceXml = Join-Path $ServiceDir "$ServiceName.xml"

function Assert-Administrator {
  $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script from an elevated (Administrator) PowerShell - registering a Windows Service requires it.'
  }
}

switch ($Command) {
  'install' {
    Assert-Administrator
    if (-not $WinSwPath) { $WinSwPath = Join-Path $Frontend 'tools\winsw.exe' }
    if (-not (Test-Path $WinSwPath)) { throw "WinSW executable not found at $WinSwPath. Download a release from https://github.com/winsw/winsw and pass -WinSwPath, or place it at tools\winsw.exe." }
    $Node = (Get-Command node -ErrorAction Stop).Source
    $nextBin = Join-Path $Frontend 'node_modules\next\dist\bin\next'
    if (-not (Test-Path (Join-Path $Frontend '.next'))) { throw "No production build found (.next missing). Run 'npm run build' first." }
    New-Item -ItemType Directory -Force $ServiceDir, (Join-Path $Frontend '.data\logs') | Out-Null
    Copy-Item $WinSwPath $ServiceExe -Force

    # WinSW config: see https://github.com/winsw/winsw/blob/master/docs/xml-config-file.md
    $xml = @"
<service>
  <id>$ServiceName</id>
  <name>DARK AGI Console</name>
  <description>Next.js production server for the DARK AGI operations console (dark-agi-frontend).</description>
  <executable>$Node</executable>
  <arguments>"$nextBin" start -p 7410 -H $BindHost</arguments>
  <workingdirectory>$Frontend</workingdirectory>
  <log mode="roll-by-size">
    <sizeThreshold>10240</sizeThreshold>
    <keepFiles>8</keepFiles>
  </log>
  <logpath>$(Join-Path $Frontend '.data\logs')</logpath>
  <onfailure action="restart" delay="10 sec"/>
  <onfailure action="restart" delay="30 sec"/>
  <stoptimeout>15 sec</stoptimeout>
  <startmode>Automatic</startmode>
</service>
"@
    Set-Content -Path $ServiceXml -Value $xml -Encoding UTF8
    & $ServiceExe install
    if ($LASTEXITCODE -ne 0) { throw "WinSW install failed (exit $LASTEXITCODE)" }
    Write-Host "Service '$ServiceName' installed. Start it with: .\scripts\service.ps1 start (or Services.msc)."
  }
  'uninstall' {
    Assert-Administrator
    if (-not (Test-Path $ServiceExe)) { throw "No service installation found at $ServiceExe." }
    & $ServiceExe uninstall
    if ($LASTEXITCODE -ne 0) { throw "WinSW uninstall failed (exit $LASTEXITCODE)" }
    Write-Host "Service '$ServiceName' uninstalled. $ServiceDir was left in place (logs/config) - remove it manually if you want it gone too."
  }
  'start' {
    Assert-Administrator
    & $ServiceExe start
  }
  'stop' {
    Assert-Administrator
    & $ServiceExe stop
  }
  'status' {
    if (-not (Test-Path $ServiceExe)) { Write-Host "Not installed ($ServiceExe not found)."; break }
    & $ServiceExe status
  }
}
