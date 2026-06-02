param(
    [string]$TaskName = "CCPOS-Daily-Shutdown-GitSync",
    [string]$Time
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "daily_shutdown_and_git_push.ps1"
if (-not (Test-Path $scriptPath)) {
    throw "Script not found: $scriptPath"
}

function Get-ScheduleTimeFromShutdownScript {
    param([string]$Path)

    $defaultTime = "08:00"
    $pattern = '^\s*#\s*CCPOS_SCHEDULE_TIME\s*=\s*([0-2][0-9]:[0-5][0-9])\s*$'
    $line = Get-Content -Path $Path | Where-Object { $_ -match $pattern } | Select-Object -First 1

    if ($line) {
        $matches = [regex]::Match($line, $pattern)
        $candidate = $matches.Groups[1].Value
        if ($candidate -match '^([01][0-9]|2[0-3]):[0-5][0-9]$') {
            return $candidate
        }
    }

    return $defaultTime
}

$timeSource = "-Time argument"
if ([string]::IsNullOrWhiteSpace($Time)) {
    $Time = Get-ScheduleTimeFromShutdownScript -Path $scriptPath
    $timeSource = "daily_shutdown_and_git_push.ps1 marker"
}

if ($Time -notmatch '^([01][0-9]|2[0-3]):[0-5][0-9]$') {
    throw "Invalid time '$Time'. Use 24-hour HH:mm format (example: 00:10 or 08:00)."
}

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Close CCPOS terminals + Chrome, then git commit/push at 8AM." -Force | Out-Null

$taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName

Write-Host "Scheduled task '$TaskName' created for $Time as $currentUser" -ForegroundColor Green
Write-Host "Time source: $timeSource" -ForegroundColor Green
Write-Host "Actual NextRunTime: $($taskInfo.NextRunTime)" -ForegroundColor Green
Write-Host "Run now for testing with:" -ForegroundColor Cyan
Write-Host "Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
Write-Host "To set the default time, edit '# CCPOS_SCHEDULE_TIME=HH:mm' in daily_shutdown_and_git_push.ps1 and run this script again." -ForegroundColor Cyan
