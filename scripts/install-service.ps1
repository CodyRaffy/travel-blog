<#
    One-time setup of the 'travel-blog' Windows service. Run ELEVATED:

        powershell -ExecutionPolicy Bypass -File C:\Code\travel-blog\scripts\install-service.ps1

    - Downloads WinSW (a small, well-known service wrapper for non-service
      executables) to C:\websites\_services\travel-blog\travel-blog.exe
    - Writes travel-blog.xml next to it: runs `node server.js` from the deploy
      folder with PORT, data paths and photo library settings as environment
    - Installs and starts the service (Automatic start, restart on failure)

    Idempotent: re-running rewrites the XML and restarts the service, which is
    also how you change an environment variable (e.g. after setting up
    Cloudflare Access: CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD below).
#>
[CmdletBinding()]
param(
    [string]$ServiceName = 'travel-blog',
    [string]$AppDir = 'C:\websites\travel-blog',
    [string]$DataDir = 'C:\websites\_data\travel-blog',
    [string]$ServiceDir = 'C:\websites\_services\travel-blog',
    [int]$Port = 2323,
    [string]$PhotoLibraryDir = 'C:\Dropbox',
    [string]$Exiftool = 'C:\Program Files\exiftool-13.45_64\exiftool.exe',
    # Cloudflare Access (optional). Team domain is the part before .cloudflareaccess.com;
    # AUD is the Application Audience tag shown on the Access application.
    [string]$CfAccessTeamDomain = '',
    [string]$CfAccessAud = '',
    # Optional comma-separated list of emails allowed into the admin (extra check on top of the Access policy).
    [string]$CfAccessEmails = '',
    # Account allowed to start/stop the service without elevation (for `npm run deploy`).
    # Defaults to whoever runs this script.
    [string]$DeployUser = "$env:USERDOMAIN\$env:USERNAME",
    [string]$WinSWUrl = 'https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe'
)

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Run this from an elevated (Run as administrator) PowerShell prompt." }

$node = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-Path (Join-Path $AppDir 'server.js'))) {
    throw "No server.js in $AppDir - run 'npm run deploy' in C:\Code\travel-blog first."
}
if (-not (Test-Path $Exiftool)) { Write-Warning "exiftool not found at $Exiftool - photo scanning/thumbnails of HEIC will fail." }

New-Item -ItemType Directory -Force -Path $ServiceDir, $DataDir, (Join-Path $DataDir 'media'), (Join-Path $DataDir 'cache') | Out-Null

# First install: seed the server database from the dev copy so existing stops carry over.
$prodDb = Join-Path $DataDir 'travel-blog.db'
$devDb = Join-Path 'C:\Code' 'travel-blog\data\travel-blog.db'
if (-not (Test-Path $prodDb) -and (Test-Path $devDb)) {
    Write-Host "Seeding $prodDb from the dev database..." -ForegroundColor Cyan
    foreach ($suffix in '', '-wal', '-shm') {
        if (Test-Path "$devDb$suffix") { Copy-Item "$devDb$suffix" "$prodDb$suffix" }
    }
}

$exe = Join-Path $ServiceDir "$ServiceName.exe"
if (-not (Test-Path $exe)) {
    Write-Host "Downloading WinSW..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $WinSWUrl -OutFile $exe -UseBasicParsing
}

$accessEnv = ''
if ($CfAccessTeamDomain) {
    $accessEnv = "  <env name=`"CF_ACCESS_TEAM_DOMAIN`" value=`"$CfAccessTeamDomain`"/>`n"
    if ($CfAccessAud)    { $accessEnv += "  <env name=`"CF_ACCESS_AUD`" value=`"$CfAccessAud`"/>`n" }
    if ($CfAccessEmails) { $accessEnv += "  <env name=`"CF_ACCESS_EMAILS`" value=`"$CfAccessEmails`"/>`n" }
}

$xml = @"
<service>
  <id>$ServiceName</id>
  <name>Travel Blog (Raffy's on the Road)</name>
  <description>Next.js server for travel.raffensperger.net on http://localhost:$Port. Source: C:\Code\travel-blog. Deploy: npm run deploy.</description>
  <executable>$node</executable>
  <arguments>server.js</arguments>
  <workingdirectory>$AppDir</workingdirectory>
  <startmode>Automatic</startmode>
  <onfailure action="restart" delay="5 sec"/>
  <onfailure action="restart" delay="30 sec"/>
  <resetfailure>1 hour</resetfailure>
  <stoptimeout>20 sec</stoptimeout>
  <log mode="roll-by-size">
    <sizeThreshold>10240</sizeThreshold>
    <keepFiles>5</keepFiles>
  </log>
  <env name="NODE_ENV" value="production"/>
  <env name="PORT" value="$Port"/>
  <env name="DATABASE_PATH" value="$DataDir\travel-blog.db"/>
  <env name="MEDIA_DIR" value="$DataDir\media"/>
  <env name="CACHE_DIR" value="$DataDir\cache"/>
  <env name="PHOTO_LIBRARY_DIR" value="$PhotoLibraryDir"/>
  <env name="EXIFTOOL" value="$Exiftool"/>
$accessEnv</service>
"@
Set-Content -Path (Join-Path $ServiceDir "$ServiceName.xml") -Value $xml -Encoding UTF8

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Service exists - restarting with updated config..." -ForegroundColor Cyan
    & $exe stop | Out-Null
    & $exe refresh | Out-Null
} else {
    Write-Host "Installing service..." -ForegroundColor Cyan
    & $exe install
}
& $exe start

# Let the (non-elevated) deploying user start/stop this one service, so
# `npm run deploy` doesn't need an admin prompt. Adds an ACE for the current
# user (the account running this elevated script) to the service's DACL.
if ($DeployUser) {
    $sid = (New-Object System.Security.Principal.NTAccount($DeployUser)).Translate([System.Security.Principal.SecurityIdentifier]).Value
    $sddl = (& sc.exe sdshow $ServiceName | Where-Object { $_ -match '^D:' }).Trim()
    $ace = "(A;;CCLCSWRPWPDTLOCRRC;;;$sid)"   # query, start, stop, pause, interrogate
    if ($sddl -notlike "*$sid*") {
        $dacl, $sacl = $sddl -split '(?=S:)', 2
        $newSddl = "$dacl$ace$sacl"
        & sc.exe sdset $ServiceName $newSddl | Out-Null
        Write-Host "Granted $DeployUser start/stop rights on $ServiceName." -ForegroundColor Cyan
    }
}

Start-Sleep -Seconds 3
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 20
    Write-Host "`n$ServiceName is running: http://localhost:$Port/  ($($resp.StatusCode))" -ForegroundColor Green
    Write-Host "Logs: $ServiceDir\$ServiceName.out.log / .err.log" -ForegroundColor Green
    if (-not $accessEnv) {
        Write-Host "`nAdmin is reachable only from this machine (http://localhost:$Port/admin)." -ForegroundColor Yellow
        Write-Host "To use it remotely, create a Cloudflare Access application for travel.raffensperger.net/admin" -ForegroundColor Yellow
        Write-Host "and re-run this script with -CfAccessTeamDomain <team> (optionally -CfAccessAud <aud> -CfAccessEmails a@b.com,c@d.com)." -ForegroundColor Yellow
    }
} catch {
    Write-Host "`nService installed but http://localhost:$Port/ is not answering yet: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "See $ServiceDir\$ServiceName.err.log" -ForegroundColor Red
    exit 1
}
