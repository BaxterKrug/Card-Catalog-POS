param(
    [string]$TaskName = "CCPOS-Daily-Shutdown-GitSync",
    [string]$Time = "08:00"
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "daily_shutdown_and_git_push.ps1"
if (-not (Test-Path $scriptPath)) {
    throw "Script not found: $scriptPath"
}

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Close CCPOS terminals + Chrome, then git commit/push at 8AM." -Force | Out-Null

Write-Host "Scheduled task '$TaskName' created for $Time as $currentUser" -ForegroundColor Green
Write-Host "Run now for testing with:" -ForegroundColor Cyan
Write-Host "Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
Write-Host "If you change -Time, run this script again to update the task." -ForegroundColor Cyan
