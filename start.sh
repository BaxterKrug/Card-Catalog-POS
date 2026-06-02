#!/usr/bin/env bash
set -e

# CheckoutDesignator startup script
# Starts backend (FastAPI), frontend (Vite), and TimeTwister dev servers

cd "$(dirname "$0")"

echo "🚀 Starting CheckoutDesignator..."
echo ""

# Start backend
echo "📦 Starting backend server (http://0.0.0.0:8000)..."
.venv/bin/uvicorn checkoutdesignator.app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start TimeTwister
echo "⏱️  Starting TimeTwister server (http://0.0.0.0:8001)..."
.venv/bin/python TimeTwister/main.py &
TIMETWISTER_PID=$!

# Start frontend
echo "🎨 Starting frontend dev server (http://0.0.0.0:5173)..."
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
cd ..

# Wait for servers to be ready
sleep 3

DAY_OF_WEEK="$(date +%A)"
SITES_TO_OPEN=()

add_site() {
    local url="$1"
    local existing
    for existing in "${SITES_TO_OPEN[@]}"; do
        if [[ "$existing" == "$url" ]]; then
            return
        fi
    done
    SITES_TO_OPEN+=("$url")
}

# Every day
add_site "https://www.southernhobby.com/"
add_site "https://manapool.com/"
add_site "https://www.tcgplayer.com/"

case "$DAY_OF_WEEK" in
    Monday)
        add_site "https://eventlink.wizards.com/"
        ;;
    Tuesday)
        add_site "https://eventlink.wizards.com/"
        add_site "https://distributor.bandai-tcg-plus.com/#/my_event_list?default=true"
        add_site "https://play-tools.pokemon.com/league-details/27deeba1-e56e-57ba-39ab-83c5c1d04443/details"
        ;;
    Wednesday)
        add_site "https://gem.fabtcg.com/profile/player/"
        add_site "https://shp.cardgame-network.konami.net/mt/home/#/tournament"
        add_site "https://play-tools.pokemon.com/league-details/27deeba1-e56e-57ba-39ab-83c5c1d04443/details"
        ;;
    Thursday)
        add_site "https://eventlink.wizards.com/"
        add_site "https://distributor.bandai-tcg-plus.com/#/my_event_list?default=true"
        add_site "https://organizer.en.bushi-navi.com/#/my_event_list?default=true"
        ;;
    Friday)
        add_site "https://eventlink.wizards.com/"
        ;;
    Saturday)
        add_site "https://topdeck.gg/"
        add_site "https://organizer.en.bushi-navi.com/#/my_event_list?default=true"
        add_site "https://shp.cardgame-network.konami.net/mt/home/#/tournament"
        add_site "https://play-tools.pokemon.com/league-details/27deeba1-e56e-57ba-39ab-83c5c1d04443/details"
        ;;
    Sunday)
        add_site "https://topdeck.gg/"
        add_site "https://gem.fabtcg.com/profile/player/"
        add_site "https://shp.cardgame-network.konami.net/mt/home/#/tournament"
        ;;
esac

echo ""
echo "✅ All servers started!"
echo ""
echo "Backend:     http://localhost:8000"
echo "API Docs:    http://localhost:8000/api/docs"
echo "TimeTwister: http://localhost:8001"
echo "Frontend:    http://localhost:5173"
echo ""

# Open browsers (works on Linux and Mac)
echo "🌐 Opening browsers and daily tools for $DAY_OF_WEEK..."
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5173" 2>/dev/null &
    xdg-open "http://localhost:8001" 2>/dev/null &
    for url in "${SITES_TO_OPEN[@]}"; do
        xdg-open "$url" 2>/dev/null &
    done
elif command -v open &> /dev/null; then
    open "http://localhost:5173"
    open "http://localhost:8001"
    for url in "${SITES_TO_OPEN[@]}"; do
        open "$url"
    done
fi

echo ""
echo "Press Ctrl+C to stop all servers."
echo ""

# Wait for Ctrl+C and clean up
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $TIMETWISTER_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Keep script running
wait
