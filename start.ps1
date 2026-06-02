# CheckoutDesignator startup script for Windows PowerShell
# Starts backend (FastAPI), frontend (Vite), and TimeTwister dev servers

Write-Host "Starting CheckoutDesignator..." -ForegroundColor Cyan
Write-Host ""

# Start backend in a new window
Write-Host "Starting backend server (http://localhost:8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$Host.UI.RawUI.WindowTitle='CCPOS Backend'; .\.venv\Scripts\Activate.ps1; uvicorn checkoutdesignator.app.main:app --host 0.0.0.0 --port 8000"

# Wait a moment for backend to initialize
Start-Sleep -Seconds 2

# Start TimeTwister in a new window
Write-Host "Starting TimeTwister server (http://localhost:8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$Host.UI.RawUI.WindowTitle='CCPOS TimeTwister'; .\.venv\Scripts\Activate.ps1; python TimeTwister/main.py"

# Wait a moment for TimeTwister to initialize
Start-Sleep -Seconds 1

# Start frontend in a new window
Write-Host "Starting frontend dev server (http://localhost:5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; `$Host.UI.RawUI.WindowTitle='CCPOS Frontend'; npm run dev -- --host 0.0.0.0 --port 5173"

# Wait for servers to be ready
Start-Sleep -Seconds 3

# Build day-aware launch list
$today = [System.DateTime]::Now.DayOfWeek.ToString()
$sitesToOpen = [System.Collections.Generic.List[string]]::new()

function Add-Site {
	param([string]$Url)
	if (-not $sitesToOpen.Contains($Url)) {
		$sitesToOpen.Add($Url)
	}
}

# Every day
Add-Site "https://www.southernhobby.com/"
Add-Site "https://manapool.com/"
Add-Site "https://www.tcgplayer.com/"

switch ($today) {
	"Monday" {
		Add-Site "https://eventlink.wizards.com/"
	}
	"Tuesday" {
		Add-Site "https://eventlink.wizards.com/"
		Add-Site "https://distributor.bandai-tcg-plus.com/#/my_event_list?default=true"
		Add-Site "https://play-tools.pokemon.com/league-details/27deeba1-e56e-57ba-39ab-83c5c1d04443/details"
	}
	"Wednesday" {
		Add-Site "https://gem.fabtcg.com/profile/player/"
		Add-Site "https://shp.cardgame-network.konami.net/mt/home/#/tournament"
		Add-Site "https://play-tools.pokemon.com/league-details/27deeba1-e56e-57ba-39ab-83c5c1d04443/details"
	}
	"Thursday" {
		Add-Site "https://eventlink.wizards.com/"
		Add-Site "https://distributor.bandai-tcg-plus.com/#/my_event_list?default=true"
		Add-Site "https://organizer.en.bushi-navi.com/#/my_event_list?default=true"
	}
	"Friday" {
		Add-Site "https://eventlink.wizards.com/"
	}
	"Saturday" {
		Add-Site "https://topdeck.gg/"
		Add-Site "https://organizer.en.bushi-navi.com/#/my_event_list?default=true"
		Add-Site "https://shp.cardgame-network.konami.net/mt/home/#/tournament"
		Add-Site "https://play-tools.pokemon.com/league-details/27deeba1-e56e-57ba-39ab-83c5c1d04443/details"
	}
	"Sunday" {
		Add-Site "https://topdeck.gg/"
		Add-Site "https://gem.fabtcg.com/profile/player/"
		Add-Site "https://shp.cardgame-network.konami.net/mt/home/#/tournament"
	}
}

$openTournamentOrganizer = @("Tuesday", "Wednesday", "Saturday") -contains $today

Write-Host ""
Write-Host "All servers started in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:     http://localhost:8000" -ForegroundColor Yellow
Write-Host "API Docs:    http://localhost:8000/api/docs" -ForegroundColor Yellow
Write-Host "TimeTwister: http://localhost:8001" -ForegroundColor Yellow
Write-Host "Frontend:    http://localhost:5173" -ForegroundColor Yellow
Write-Host ""

# Open browsers and day-specific links
Write-Host "Opening browsers and daily tools for $today..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"
Start-Process "http://localhost:8001"

foreach ($url in $sitesToOpen) {
	Start-Process $url
}

if ($openTournamentOrganizer) {
	$tournamentDir = "C:\Users\skgames\AppData\Local\Tournament Operations Manager\"
	$tournamentExe = "C:\Users\skgames\AppData\Local\Tournament Operations Manager\Tournament Operations Manager.exe"
	Write-Host "Opening Tournament Organizer resources..." -ForegroundColor Cyan

	if (Test-Path $tournamentExe) {
		Start-Process $tournamentExe
	}
	elseif (Test-Path $tournamentDir) {
		$candidateExecutables = @(
			"TournamentOrganizer.exe",
			"Tournament Operations.exe"
		)

		$launched = $false
		foreach ($candidate in $candidateExecutables) {
			$candidatePath = Join-Path $tournamentDir $candidate
			if (Test-Path $candidatePath) {
				Start-Process $candidatePath
				$launched = $true
				break
			}
		}

		if (-not $launched) {
			$firstExe = Get-ChildItem -Path $tournamentDir -Filter "*.exe" -File -ErrorAction SilentlyContinue | Select-Object -First 1
			if ($null -ne $firstExe) {
				Start-Process $firstExe.FullName
				$launched = $true
			}
		}

		if (-not $launched) {
			Start-Process $tournamentDir
			Write-Host "No executable was detected in Tournament Operations Manager directory; opened the folder instead." -ForegroundColor Yellow
		}
	}
	else {
		Write-Host "Tournament Operations Manager directory not found at: $tournamentDir" -ForegroundColor Yellow
	}
}

Write-Host ""
Write-Host "Close the server windows to stop the servers." -ForegroundColor Cyan
