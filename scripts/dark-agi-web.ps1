<#
.SYNOPSIS
  Development launcher for dark-agi-frontend: the operations console.

.DESCRIPTION
  Self-contained: works from this repository alone. The API it talks to is set by
  NEXT_PUBLIC_API_BASE_URL in .env.local (default http://127.0.0.1:7411) and is
  started from the dark-agi-backend repository. Process IDs are stored in .data\run.

.EXAMPLE
  .\scripts\dark-agi-web.ps1 setup    # npm install, create .env.local, build
  .\scripts\dark-agi-web.ps1 start    # console on 127.0.0.1:7410, opens browser
  .\scripts\dark-agi-web.ps1 status
  .\scripts\dark-agi-web.ps1 stop
  .\scripts\dark-agi-web.ps1 check    # typecheck + lint + tests
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet('setup', 'start', 'stop', 'status', 'check')]
  [string]$Command,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$Frontend = Split-Path -Parent $PSScriptRoot
$RunDir = Join-Path $Frontend '.data\run'
$LogDir = Join-Path $Frontend '.data\logs'
$PidFile = Join-Path $RunDir 'frontend.pid'
$Node = (Get-Command node -ErrorAction Stop).Source
$FrontendUrl = 'http://127.0.0.1:7410'

function Invoke-Npm([string[]]$NpmArgs) {
  Push-Location $Frontend
  try {
    & npm @NpmArgs
    if ($LASTEXITCODE -ne 0) { throw "npm $($NpmArgs -join ' ') failed (exit $LASTEXITCODE)" }
  } finally { Pop-Location }
}

function Get-TrackedProcess {
  if (-not (Test-Path $PidFile)) { return $null }
  $id = [int](Get-Content $PidFile -Raw).Trim()
  return Get-Process -Id $id -ErrorAction SilentlyContinue
}

function Get-ApiBaseUrl {
  $envFile = Join-Path $Frontend '.env.local'
  if (Test-Path $envFile) {
    $line = Get-Content $envFile | Where-Object { $_ -match '^\s*NEXT_PUBLIC_API_BASE_URL\s*=' } | Select-Object -First 1
    if ($line) { return ($line -split '=', 2)[1].Trim() }
  }
  return 'http://127.0.0.1:7411'
}

function Test-Http([string]$Url) {
  try { Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null; return $true } catch { return $false }
}

function Wait-Http([string]$Url, [int]$Seconds) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) { if (Test-Http $Url) { return $true }; Start-Sleep -Milliseconds 500 }
  return $false
}

switch ($Command) {
  'setup' {
    Invoke-Npm @('install')
    if (-not (Test-Path (Join-Path $Frontend '.env.local'))) { Copy-Item (Join-Path $Frontend '.env.example') (Join-Path $Frontend '.env.local') }
    Invoke-Npm @('run', 'build')
    Write-Host 'Setup complete. Run: .\scripts\dark-agi-web.ps1 start'
  }
  'start' {
    if (Get-TrackedProcess) { Write-Host 'frontend already running.' }
    else {
      New-Item -ItemType Directory -Force $RunDir, $LogDir | Out-Null
      Remove-Item $PidFile -ErrorAction SilentlyContinue
      # Created through WMI so the server does not inherit this script's console/pipe handles.
      $nodeArgs = @((Join-Path $PSScriptRoot 'spawn-detached.mjs'), $Frontend, (Join-Path $LogDir 'frontend.out.log'), (Join-Path $LogDir 'frontend.err.log'), $PidFile, '--',
        'node_modules/next/dist/bin/next', 'start', '-p', '7410', '-H', '127.0.0.1')
      foreach ($a in $nodeArgs) { if ($a.Contains('"')) { throw "Argument contains a quote character: $a" } }
      $commandLine = '"' + $Node + '" ' + (($nodeArgs | ForEach-Object { '"' + $_ + '"' }) -join ' ')
      $result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $commandLine; CurrentDirectory = $Frontend }
      if ($result.ReturnValue -ne 0) { throw "Win32_Process.Create failed ($($result.ReturnValue)): $commandLine" }
      $deadline = (Get-Date).AddSeconds(30)
      while (-not (Test-Path $PidFile) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 300 }
      if (-not (Test-Path $PidFile)) { throw "Failed to start frontend; see $LogDir\frontend.err.log" }
      Write-Host "frontend started (PID $((Get-Content $PidFile -Raw).Trim()))."
    }
    if (-not (Wait-Http $FrontendUrl 60)) { throw "Frontend did not become ready; see $LogDir\frontend.err.log" }
    Write-Host "DARK AGI console is running: $FrontendUrl"
    $api = Get-ApiBaseUrl
    if (-not (Test-Http "$api/api/v1/health/live")) {
      Write-Host "Warning: API not reachable at $api. Start it from the dark-agi-backend repository (scripts\dark-agi-api.ps1 start)." -ForegroundColor Yellow
    }
    if (-not $NoBrowser) { Start-Process $FrontendUrl }
  }
  'stop' {
    $proc = Get-TrackedProcess
    if ($proc) {
      & "$env:SystemRoot\System32\taskkill.exe" /PID $proc.Id /T /F | Out-Null
      Write-Host 'frontend stopped.'
    } else { Write-Host 'frontend not running.' }
    Remove-Item $PidFile -ErrorAction SilentlyContinue
  }
  'status' {
    $p = Get-TrackedProcess
    Write-Host ("{0,-9} {1}" -f 'frontend', $(if ($p) { "running (PID $($p.Id))" } else { 'stopped' }))
    $api = Get-ApiBaseUrl
    Write-Host ("{0,-9} {1}" -f 'api', $(if (Test-Http "$api/api/v1/health/live") { "reachable ($api)" } else { "not reachable ($api)" }))
  }
  'check' { Invoke-Npm @('run', 'check') }
}
