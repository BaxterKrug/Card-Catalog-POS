from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
