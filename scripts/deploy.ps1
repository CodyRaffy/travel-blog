<#
    Build and publish the travel blog to the home server.

        npm run deploy            (or: powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1)
        npm run deploy -- -SkipBuild

    What it does:
      1. next build  (standalone output)
      2. stops the 'travel-blog' Windows service if it is installed
      3. wipes C:\websites\travel-blog (keeping README.md) and copies in the
         standalone server, static assets, public/ and drizzle/ migrations
      4. starts the service and checks http://localhost:2323/

    Data (database, media, thumbnail cache) lives in C:\websites\_data\travel-blog
    and is never touched by a deploy. First time: run scripts\install-service.ps1
    from an elevated prompt to create the service, then deploy again.
#>
[CmdletBinding()]
param(
    [string]$Target = 'C:\websites\travel-blog',
    [string]$ServiceName = 'travel-blog',
    [int]$Port = 2323,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot

# --- 1. build ----------------------------------------------------------------
if (-not $SkipBuild) {
    Write-Host "Building..." -ForegroundColor Cyan
    Push-Location $repo
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "next build failed" }
    } finally { Pop-Location }
}
$standalone = Join-Path $repo '.next\standalone'
if (-not (Test-Path (Join-Path $standalone 'server.js'))) {
    throw "No standalone build at $standalone. Is output: 'standalone' set in next.config.js?"
}

# --- 2. stop service ---------------------------------------------------------
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -ne 'Stopped') {
    Write-Host "Stopping $ServiceName..." -ForegroundColor Cyan
    Stop-Service -Name $ServiceName -Force
    $svc.WaitForStatus('Stopped', '00:00:30')
}

# --- 3. publish --------------------------------------------------------------
Write-Host "Publishing to $Target..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $Target | Out-Null
Get-ChildItem -Path $Target -Force | Where-Object { $_.Name -ne 'README.md' } |
    Remove-Item -Recurse -Force

# Standalone output: server.js, .next/server, traced node_modules, package.json
Copy-Item -Path (Join-Path $standalone '*') -Destination $Target -Recurse -Force
# Client assets are not part of the standalone folder by design
New-Item -ItemType Directory -Force -Path (Join-Path $Target '.next\static') | Out-Null
Copy-Item -Path (Join-Path $repo '.next\static\*') -Destination (Join-Path $Target '.next\static') -Recurse -Force
Copy-Item -Path (Join-Path $repo 'public') -Destination $Target -Recurse -Force
# Migrations are applied at startup from <cwd>\drizzle
Copy-Item -Path (Join-Path $repo 'drizzle') -Destination $Target -Recurse -Force

if (-not (Test-Path (Join-Path $Target 'README.md'))) {
    @"
# travel-blog

Published output of C:\Code\travel-blog (Next.js standalone build). **Never edit here** -
``npm run deploy`` in the source repo wipes this folder and republishes.

Runs as the Windows service ``travel-blog`` on http://localhost:$Port (see C:\websites\_services\travel-blog).
Data lives in C:\websites\_data\travel-blog and survives deploys.
"@ | Set-Content -Path (Join-Path $Target 'README.md') -Encoding UTF8
}

# --- 4. start + verify -------------------------------------------------------
if (-not $svc) {
    Write-Host "`nPublished, but the '$ServiceName' service is not installed yet." -ForegroundColor Yellow
    Write-Host "Run this ONCE from an elevated PowerShell, then deploy again:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File $repo\scripts\install-service.ps1" -ForegroundColor Yellow
    exit 0
}

Write-Host "Starting $ServiceName..." -ForegroundColor Cyan
Start-Service -Name $ServiceName

$url = "http://localhost:$Port/"
$ok = $false
for ($i = 0; $i -lt 30 -and -not $ok; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($resp.StatusCode -eq 200) { $ok = $true }
    } catch { }
}
if ($ok) {
    $api = Invoke-WebRequest -Uri "http://localhost:$Port/api/stops" -UseBasicParsing -TimeoutSec 10
    $stops = ($api.Content | ConvertFrom-Json).Count
    Write-Host "`nLive: $url  ($stops stops)" -ForegroundColor Green
    Write-Host "Admin (local only): http://localhost:$Port/admin" -ForegroundColor Green
} else {
    Write-Host "`nService started but $url did not answer within 30s." -ForegroundColor Red
    Write-Host "Check C:\websites\_services\travel-blog\travel-blog.err.log" -ForegroundColor Red
    exit 1
}
