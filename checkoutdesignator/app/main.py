from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .. import __version__
from ..config import get_settings
from ..database import init_db, session_scope
from ..routers import admin, backup, buylist, checklist, customers, health, inventory, orders, preorders, users
from ..services import users as user_service

settings = get_settings()
app = FastAPI(title=settings.app_name, version=__version__, description=settings.attribution)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


api_router = APIRouter(prefix="/api")


@app.on_event("startup")
def startup_event() -> None:
    init_db()
    with session_scope() as session:
        user_service.ensure_default_user(session)


api_router.include_router(health.router)
api_router.include_router(backup.router)
api_router.include_router(buylist.router)
api_router.include_router(checklist.router)
api_router.include_router(customers.router)
api_router.include_router(inventory.router)
api_router.include_router(orders.router)
api_router.include_router(preorders.router)
api_router.include_router(admin.router)
api_router.include_router(users.router)

app.include_router(api_router)
