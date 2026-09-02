from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import IpNetwork, NetworkDevice, NetworkInterface, Site, User, Vlan, WanCircuit
from app.schemas import (
    NetworkDeviceCreate,
    NetworkDeviceResponse,
    NetworkDeviceUpdate,
    NetworkInterfaceCreate,
    NetworkInterfaceResponse,
    NetworkInterfaceUpdate,
    IpNetworkCreate,
    IpNetworkResponse,
    IpNetworkUpdate,
    VlanCreate,
    VlanResponse,
    VlanUpdate,
    WanCircuitCreate,
    WanCircuitResponse,
    WanCircuitUpdate,
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


@router.patch("/devices/{device_id}", response_model=NetworkDeviceResponse)
def update_device(device_id: int, payload: NetworkDeviceUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> NetworkDevice:
    device = db.scalar(select(NetworkDevice).where(NetworkDevice.id == device_id, NetworkDevice.tenant_id == user.tenant_id))
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(device, field, value)
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


@router.patch("/circuits/{circuit_id}", response_model=WanCircuitResponse)
def update_circuit(circuit_id: int, payload: WanCircuitUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> WanCircuit:
    circuit = db.scalar(select(WanCircuit).where(WanCircuit.id == circuit_id, WanCircuit.tenant_id == user.tenant_id))
    if circuit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WAN circuit not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(circuit, field, value)
    db.commit()
    db.refresh(circuit)
    return circuit


@router.get("/networks", response_model=list[IpNetworkResponse])
def list_networks(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[IpNetwork]:
    return db.scalars(select(IpNetwork).where(IpNetwork.tenant_id == user.tenant_id)).all()


@router.post("/networks", response_model=IpNetworkResponse, status_code=status.HTTP_201_CREATED)
def create_network(payload: IpNetworkCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> IpNetwork:
    get_site(payload.site_id, user, db)
    network = IpNetwork(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(network)
    db.commit()
    db.refresh(network)
    return network


@router.patch("/networks/{network_id}", response_model=IpNetworkResponse)
def update_network(network_id: int, payload: IpNetworkUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> IpNetwork:
    network = db.scalar(select(IpNetwork).where(IpNetwork.id == network_id, IpNetwork.tenant_id == user.tenant_id))
    if network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP network not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(network, field, value)
    db.commit()
    db.refresh(network)
    return network


@router.get("/vlans", response_model=list[VlanResponse])
def list_vlans(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[Vlan]:
    return db.scalars(select(Vlan).where(Vlan.tenant_id == user.tenant_id)).all()


@router.post("/vlans", response_model=VlanResponse, status_code=status.HTTP_201_CREATED)
def create_vlan(payload: VlanCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Vlan:
    get_site(payload.site_id, user, db)
    vlan = Vlan(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(vlan)
    db.commit()
    db.refresh(vlan)
    return vlan


@router.patch("/vlans/{vlan_id}", response_model=VlanResponse)
def update_vlan(vlan_id: int, payload: VlanUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Vlan:
    vlan = db.scalar(select(Vlan).where(Vlan.id == vlan_id, Vlan.tenant_id == user.tenant_id))
    if vlan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VLAN not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(vlan, field, value)
    db.commit()
    db.refresh(vlan)
    return vlan


@router.get("/interfaces", response_model=list[NetworkInterfaceResponse])
def list_interfaces(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[NetworkInterface]:
    return db.scalars(select(NetworkInterface).where(NetworkInterface.tenant_id == user.tenant_id)).all()


@router.post("/interfaces", response_model=NetworkInterfaceResponse, status_code=status.HTTP_201_CREATED)
def create_interface(payload: NetworkInterfaceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> NetworkInterface:
    get_site(payload.site_id, user, db)
    device = db.scalar(select(NetworkDevice).where(NetworkDevice.id == payload.device_id, NetworkDevice.tenant_id == user.tenant_id, NetworkDevice.site_id == payload.site_id))
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found for this site")
    interface = NetworkInterface(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(interface)
    db.commit()
    db.refresh(interface)
    return interface


@router.patch("/interfaces/{interface_id}", response_model=NetworkInterfaceResponse)
def update_interface(interface_id: int, payload: NetworkInterfaceUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> NetworkInterface:
    interface = db.scalar(select(NetworkInterface).where(NetworkInterface.id == interface_id, NetworkInterface.tenant_id == user.tenant_id))
    if interface is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interface not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(interface, field, value)
    db.commit()
    db.refresh(interface)
    return interface
