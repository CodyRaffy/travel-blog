<#
    Back up the live site's data into Dropbox.

        npm run backup     (or scheduled nightly via scripts\install-backup-task.ps1)

    - Database: consistent online snapshot (VACUUM INTO), zipped, dated;
      the last 14 snapshots are kept.
    - Media (imported post photos/videos + curated web variants): mirrored with
      robocopy (only changed files copy; deletions propagate).
    - Service config (travel-blog.xml) copied alongside.
    The thumbnail cache is excluded - it regenerates on demand.
#>
[CmdletBinding()]
param(
    [string]$DataDir = 'C:\websites\_data\travel-blog',
    [string]$BackupDir = 'C:\Dropbox\Backups\travel-blog',
    [int]$KeepDbSnapshots = 14
)

$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format 'yyyy-MM-dd'
New-Item -ItemType Directory -Force -Path "$BackupDir\db", "$BackupDir\media" | Out-Null

# --- database snapshot -------------------------------------------------------
# VACUUM INTO makes a consistent copy even while the service is writing (WAL).
$tmpDb = Join-Path $env:TEMP "travel-blog-backup-$stamp.db"
Remove-Item $tmpDb -ErrorAction SilentlyContinue
$node = (Get-Command node -ErrorAction Stop).Source
Push-Location 'C:\Code\travel-blog'   # for node_modules\better-sqlite3
try { & $node (Join-Path 'C:\Code' 'travel-blog\scripts\db-snapshot.cjs') (Join-Path $DataDir 'travel-blog.db') $tmpDb } finally { Pop-Location }
if (-not (Test-Path $tmpDb)) { throw "Database snapshot was not created." }

$zip = "$BackupDir\db\travel-blog-$stamp.zip"
Remove-Item $zip -ErrorAction SilentlyContinue
Compress-Archive -Path $tmpDb -DestinationPath $zip
Remove-Item $tmpDb
$zipMb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "DB snapshot: $zip ($zipMb MB)"

# prune old snapshots
Get-ChildItem "$BackupDir\db\travel-blog-*.zip" |
    Sort-Object Name -Descending |
    Select-Object -Skip $KeepDbSnapshots |
    ForEach-Object { Write-Host "pruning $($_.Name)"; Remove-Item $_.FullName }

# --- media mirror ------------------------------------------------------------
# /MIR mirrors (copies changes, removes files deleted at the source).
robocopy "$DataDir\media" "$BackupDir\media" /MIR /R:2 /W:5 /NP /NFL /NDL | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }
$mediaCount = (Get-ChildItem "$BackupDir\media" -Recurse -File | Measure-Object).Count
Write-Host "Media mirrored: $mediaCount files (robocopy exit $LASTEXITCODE)"

# --- service config ----------------------------------------------------------
$svcXml = 'C:\websites\_services\travel-blog\travel-blog.xml'
if (Test-Path $svcXml) { Copy-Item $svcXml "$BackupDir\travel-blog.service.xml" -Force }

Write-Host "Backup complete: $BackupDir (Dropbox will sync it up)."
exit 0
