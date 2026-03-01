from __future__ import annotations

from typing import Any, Optional

import httpx

from ..schemas import PriceSuggestion

SCRYFALL_NAMED_ENDPOINT = "https://api.scryfall.com/cards/named"
SCRYFALL_TIMEOUT_SECONDS = 5.0


def _to_cents(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(round(float(value) * 100))
    except (ValueError, TypeError):
        return None

def _build_note(card: dict[str, Any]) -> Optional[str]:
    if not card:
        return None
    rarity = card.get("rarity")
    released_at = card.get("released_at")
    pieces = [part for part in [rarity, released_at] if part]
    return "; ".join(pieces) if pieces else None


def fetch_price_suggestion(name: str, set_code: str | None = None) -> PriceSuggestion:
    params: dict[str, str] = {"fuzzy": name}
    if set_code:
        params["set"] = set_code.lower()
    try:
        response = httpx.get(SCRYFALL_NAMED_ENDPOINT, params=params, timeout=SCRYFALL_TIMEOUT_SECONDS)
        response.raise_for_status()
    except httpx.HTTPError:
        return PriceSuggestion(name=name, set_code=set_code)

    payload: dict[str, Any] = response.json()
    prices = payload.get("prices") or {}
    usd_price = _to_cents(prices.get("usd"))
    foil_price = _to_cents(prices.get("usd_foil"))

    # Use a conservative buy heuristic if no buylist data exists.
    if usd_price is not None:
        suggested_buy = int(round(usd_price * 0.55))
    else:
        suggested_buy = None

    return PriceSuggestion(
        name=payload.get("name", name),
        set_code=(payload.get("set") or set_code or "").upper() or None,
        msrp_cents=usd_price,
        acquisition_cost_cents=suggested_buy,
        source="scryfall",
        source_url=payload.get("scryfall_uri"),
        note=_build_note(payload),
    )
