param(
	[switch]$CloseAllChrome = $true
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot "logs"
if (-not (Test-Path $logDir)) {
	New-Item -ItemType Directory -Path $logDir | Out-Null
}

$logFile = Join-Path $logDir "daily_shutdown_git.log"

function Write-Log {
	param([string]$Message)
	$line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
	$line | Tee-Object -FilePath $logFile -Append
}

function Close-ProcessWindows {
	param(
		[System.Diagnostics.Process[]]$Processes,
		[string]$Label
	)

	foreach ($proc in $Processes) {
		try {
			if ($proc.MainWindowHandle -ne 0) {
				[void]$proc.CloseMainWindow()
				if (-not $proc.WaitForExit(5000)) {
					Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
				}
				Write-Log ("Closed {0} process PID {1} ({2})" -f $Label, $proc.Id, $proc.MainWindowTitle)
			}
			else {
				Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
				Write-Log ("Stopped background {0} process PID {1}" -f $Label, $proc.Id)
			}
		}
		catch {
			Write-Log ("Failed to close {0} PID {1}: {2}" -f $Label, $proc.Id, $_.Exception.Message)
		}
	}
}

try {
	Write-Log "----- Daily shutdown + git sync started -----"

	$ccposShells = @(Get-Process -Name powershell, pwsh -ErrorAction SilentlyContinue |
		Where-Object { $_.Id -ne $PID -and $_.MainWindowTitle -like "CCPOS *" })

	if ($ccposShells.Count -gt 0) {
		Close-ProcessWindows -Processes $ccposShells -Label "PowerShell"
	}
	else {
		Write-Log "No tagged CCPOS PowerShell windows found to close."
	}

	if ($CloseAllChrome) {
		$chromeProcesses = @(Get-Process -Name chrome -ErrorAction SilentlyContinue)
		if ($chromeProcesses.Count -gt 0) {
			Close-ProcessWindows -Processes $chromeProcesses -Label "Chrome"
		}
		else {
			Write-Log "No Chrome processes found to close."
		}
	}
	else {
		Write-Log "Chrome close skipped by parameter."
	}

	Push-Location $repoRoot

	$currentBranch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
	if (-not $currentBranch) {
		throw "Could not determine current git branch."
	}

	Write-Log ("Working in branch '{0}'." -f $currentBranch)

	git add -A

	$statusLines = @(git status --porcelain)
	if ($statusLines.Count -gt 0) {
		$commitMessage = "Auto-save before 8AM shutdown ({0})" -f (Get-Date -Format "yyyy-MM-dd HH:mm")
		git commit -m $commitMessage | Out-Null
		Write-Log ("Created commit: {0}" -f $commitMessage)
	}
	else {
		Write-Log "No file changes detected; skipping commit."
	}

	$remotes = @(git remote)
	if ($remotes -contains "origin") {
		git push origin $currentBranch | Out-Null
		Write-Log ("Pushed branch '{0}' to origin." -f $currentBranch)
	}
	elseif ($remotes.Count -gt 0) {
		git push | Out-Null
		Write-Log "Pushed using default remote."
	}
	else {
		Write-Log "No git remote configured. Commit is local only."
	}

	Write-Log "Daily shutdown + git sync completed successfully."
}
catch {
	Write-Log ("ERROR: {0}" -f $_.Exception.Message)
	exit 1
}
finally {
	Pop-Location -ErrorAction SilentlyContinue
}
