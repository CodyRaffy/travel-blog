<#
    One-time: schedule the nightly backup. Run ELEVATED:

        powershell -ExecutionPolicy Bypass -File C:\Code\travel-blog\scripts\install-backup-task.ps1

    Creates the Windows scheduled task "travel-blog-backup" running
    scripts\backup.ps1 daily at 03:15 as SYSTEM (works while logged out).
    Re-running replaces the task. Logs land in C:\websites\_services\travel-blog\backup.log.
#>
[CmdletBinding()]
param(
    [string]$TaskName = 'travel-blog-backup',
    [string]$At = '03:15'
)

$ErrorActionPreference = 'Stop'
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Run this from an elevated (Run as administrator) PowerShell prompt." }

$script = 'C:\Code\travel-blog\scripts\backup.ps1'
$log = 'C:\websites\_services\travel-blog\backup.log'
$action = "powershell -NoProfile -ExecutionPolicy Bypass -Command `"& '$script' *>> '$log'`""

schtasks /Create /F /TN $TaskName /SC DAILY /ST $At /RU SYSTEM /RL HIGHEST /TR $action | Out-Null
Write-Host "Scheduled task '$TaskName' runs daily at $At as SYSTEM."
Write-Host "Running it once now to verify..."
schtasks /Run /TN $TaskName | Out-Null
Start-Sleep -Seconds 45
if (Test-Path $log) { Get-Content $log -Tail 6 }
Write-Host "Check C:\Dropbox\Backups\travel-blog for the snapshot."
