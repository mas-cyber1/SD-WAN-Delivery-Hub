from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import NetworkDevice, Project, SdwanHub, SdwanTunnel, Site, User
from app.schemas import SdwanHubCreate, SdwanHubResponse, SdwanTunnelCreate, SdwanTunnelResponse

router = APIRouter()


def get_project(project_id: int, user: User, db: Session) -> Project:
    project = db.scalar(select(Project).where(Project.id == project_id, Project.tenant_id == user.tenant_id))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def get_site_for_project(site_id: int, project_id: int, user: User, db: Session) -> Site:
    site = db.scalar(select(Site).where(Site.id == site_id, Site.project_id == project_id, Site.tenant_id == user.tenant_id))
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found in this project")
    return site


def get_device_for_site(device_id: int | None, site_id: int, user: User, db: Session) -> NetworkDevice | None:
    if device_id is None:
        return None
    device = db.scalar(select(NetworkDevice).where(NetworkDevice.id == device_id, NetworkDevice.site_id == site_id, NetworkDevice.tenant_id == user.tenant_id))
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found on this site")
    return device


@router.get("/hubs", response_model=list[SdwanHubResponse])
def list_hubs(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[SdwanHub]:
    return db.scalars(select(SdwanHub).where(SdwanHub.tenant_id == user.tenant_id)).all()


@router.post("/hubs", response_model=SdwanHubResponse, status_code=status.HTTP_201_CREATED)
def create_hub(payload: SdwanHubCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> SdwanHub:
    get_project(payload.project_id, user, db)
    get_site_for_project(payload.site_id, payload.project_id, user, db)
    get_device_for_site(payload.device_id, payload.site_id, user, db)
    hub = SdwanHub(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(hub)
    db.commit()
    db.refresh(hub)
    return hub


@router.get("/tunnels", response_model=list[SdwanTunnelResponse])
def list_tunnels(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[SdwanTunnel]:
    return db.scalars(select(SdwanTunnel).where(SdwanTunnel.tenant_id == user.tenant_id)).all()


@router.post("/tunnels", response_model=SdwanTunnelResponse, status_code=status.HTTP_201_CREATED)
def create_tunnel(payload: SdwanTunnelCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> SdwanTunnel:
    get_project(payload.project_id, user, db)
    get_site_for_project(payload.source_site_id, payload.project_id, user, db)
    get_site_for_project(payload.destination_site_id, payload.project_id, user, db)
    get_device_for_site(payload.source_device_id, payload.source_site_id, user, db)
    get_device_for_site(payload.destination_device_id, payload.destination_site_id, user, db)
    if payload.source_site_id == payload.destination_site_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tunnel endpoints must be different sites")
    tunnel = SdwanTunnel(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(tunnel)
    db.commit()
    db.refresh(tunnel)
    return tunnel
