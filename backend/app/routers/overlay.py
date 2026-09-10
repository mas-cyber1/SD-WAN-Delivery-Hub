from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import NetworkDevice, Project, SecureEdgeConnection, SdwanHub, SdwanTopology, SdwanTunnel, Site, User
from app.schemas import SecureEdgeConnectionCreate, SecureEdgeConnectionResponse, SdwanHubCreate, SdwanHubResponse, SdwanTopologyCreate, SdwanTopologyResponse, SdwanTunnelCreate, SdwanTunnelResponse

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


@router.get("/topology/{project_id}", response_model=SdwanTopologyResponse | None)
def get_topology(project_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> SdwanTopology | None:
    get_project(project_id, user, db)
    return db.scalar(select(SdwanTopology).where(SdwanTopology.project_id == project_id, SdwanTopology.tenant_id == user.tenant_id))


@router.post("/topology", response_model=SdwanTopologyResponse, status_code=status.HTTP_201_CREATED)
def save_topology(payload: SdwanTopologyCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> SdwanTopology:
    get_project(payload.project_id, user, db)
    topology = db.scalar(select(SdwanTopology).where(SdwanTopology.project_id == payload.project_id, SdwanTopology.tenant_id == user.tenant_id))
    if topology is None:
        topology = SdwanTopology(tenant_id=user.tenant_id, **payload.model_dump())
        db.add(topology)
    else:
        for field, value in payload.model_dump(exclude={"project_id"}).items():
            setattr(topology, field, value)
    db.commit()
    db.refresh(topology)
    return topology


@router.get("/secure-edges", response_model=list[SecureEdgeConnectionResponse])
def list_secure_edges(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[SecureEdgeConnection]:
    return db.scalars(select(SecureEdgeConnection).where(SecureEdgeConnection.tenant_id == user.tenant_id)).all()


@router.post("/secure-edges", response_model=SecureEdgeConnectionResponse, status_code=status.HTTP_201_CREATED)
def create_secure_edge(payload: SecureEdgeConnectionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> SecureEdgeConnection:
    get_project(payload.project_id, user, db)
    get_site_for_project(payload.site_id, payload.project_id, user, db)
    edge = SecureEdgeConnection(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return edge
