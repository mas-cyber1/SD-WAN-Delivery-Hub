from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_user
from app.models import User
from app.routers.auth import router as auth_router
from app.routers.clients import router as clients_router
from app.routers.projects import router as projects_router
from app.routers.sites import router as sites_router

app = FastAPI(title="SD-WAN Delivery Hub API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(clients_router, prefix="/api/clients", tags=["clients"])
app.include_router(projects_router, prefix="/api/projects", tags=["projects"])
app.include_router(sites_router, prefix="/api/sites", tags=["sites"])


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/auth/me")
def current_user(user: User = Depends(get_current_user)) -> dict[str, str]:
    return {"id": str(user.id), "email": user.email, "role": user.role, "tenant_id": str(user.tenant_id)}
