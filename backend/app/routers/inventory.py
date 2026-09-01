from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import NetworkDevice, Site, User, WanCircuit
from app.schemas import (
    NetworkDeviceCreate,
    NetworkDeviceResponse,
    WanCircuitCreate,
    WanCircuitResponse,
)

router = APIRouter()


def get_site(site_id: int, user: User, db: Session) -> Site:
    site = db.scalar(select(Site).where(Site.id == site_id, Site.tenant_id == user.tenant_id))
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return site


@router.get("/devices", response_model=list[NetworkDeviceResponse])
def list_devices(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[NetworkDevice]:
    return db.scalars(select(NetworkDevice).where(NetworkDevice.tenant_id == user.tenant_id)).all()


@router.post("/devices", response_model=NetworkDeviceResponse, status_code=status.HTTP_201_CREATED)
def create_device(
    payload: NetworkDeviceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> NetworkDevice:
    get_site(payload.site_id, user, db)
    device = NetworkDevice(
        tenant_id=user.tenant_id,
        site_id=payload.site_id,
        hostname=payload.hostname,
        role=payload.role,
        vendor=payload.vendor,
        model=payload.model,
        management_ip=payload.management_ip,
        status=payload.status,
        description=payload.description,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("/circuits", response_model=list[WanCircuitResponse])
def list_circuits(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[WanCircuit]:
    return db.scalars(select(WanCircuit).where(WanCircuit.tenant_id == user.tenant_id)).all()


@router.post("/circuits", response_model=WanCircuitResponse, status_code=status.HTTP_201_CREATED)
def create_circuit(
    payload: WanCircuitCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> WanCircuit:
    get_site(payload.site_id, user, db)
    circuit = WanCircuit(
        tenant_id=user.tenant_id,
        site_id=payload.site_id,
        name=payload.name,
        provider=payload.provider,
        circuit_type=payload.circuit_type,
        role=payload.role,
        bandwidth_mbps=payload.bandwidth_mbps,
        public_ip=payload.public_ip,
        status=payload.status,
        description=payload.description,
    )
    db.add(circuit)
    db.commit()
    db.refresh(circuit)
    return circuit
