from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import AdvertisedNetwork, Site, SiteRouting, User
from app.schemas import (
    AdvertisedNetworkCreate,
    AdvertisedNetworkResponse,
    AdvertisedNetworkUpdate,
    SiteRoutingCreate,
    SiteRoutingResponse,
    SiteRoutingUpdate,
)

router = APIRouter()


def get_site(site_id: int, user: User, db: Session) -> Site:
    site = db.scalar(select(Site).where(Site.id == site_id, Site.tenant_id == user.tenant_id))
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return site


@router.get("/site-routing", response_model=list[SiteRoutingResponse])
def list_site_routing(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[SiteRouting]:
    return db.scalars(select(SiteRouting).where(SiteRouting.tenant_id == user.tenant_id)).all()


@router.post("/site-routing", response_model=SiteRoutingResponse, status_code=status.HTTP_201_CREATED)
def create_site_routing(payload: SiteRoutingCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> SiteRouting:
    get_site(payload.site_id, user, db)
    routing = SiteRouting(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(routing)
    db.commit()
    db.refresh(routing)
    return routing


@router.patch("/site-routing/{routing_id}", response_model=SiteRoutingResponse)
def update_site_routing(routing_id: int, payload: SiteRoutingUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> SiteRouting:
    routing = db.scalar(select(SiteRouting).where(SiteRouting.id == routing_id, SiteRouting.tenant_id == user.tenant_id))
    if routing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site routing not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(routing, field, value)
    db.commit()
    db.refresh(routing)
    return routing


@router.delete("/site-routing/{routing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site_routing(routing_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    routing = db.scalar(select(SiteRouting).where(SiteRouting.id == routing_id, SiteRouting.tenant_id == user.tenant_id))
    if routing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site routing not found")
    db.delete(routing)
    db.commit()


@router.get("/advertised-networks", response_model=list[AdvertisedNetworkResponse])
def list_advertised_networks(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[AdvertisedNetwork]:
    return db.scalars(select(AdvertisedNetwork).where(AdvertisedNetwork.tenant_id == user.tenant_id)).all()


@router.post("/advertised-networks", response_model=AdvertisedNetworkResponse, status_code=status.HTTP_201_CREATED)
def create_advertised_network(payload: AdvertisedNetworkCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> AdvertisedNetwork:
    get_site(payload.site_id, user, db)
    if payload.routing_id is not None:
        routing = db.scalar(select(SiteRouting).where(SiteRouting.id == payload.routing_id, SiteRouting.site_id == payload.site_id, SiteRouting.tenant_id == user.tenant_id))
        if routing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site routing entry not found for this site")
    network = AdvertisedNetwork(tenant_id=user.tenant_id, **payload.model_dump())
    db.add(network)
    db.commit()
    db.refresh(network)
    return network


@router.patch("/advertised-networks/{network_id}", response_model=AdvertisedNetworkResponse)
def update_advertised_network(network_id: int, payload: AdvertisedNetworkUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> AdvertisedNetwork:
    network = db.scalar(select(AdvertisedNetwork).where(AdvertisedNetwork.id == network_id, AdvertisedNetwork.tenant_id == user.tenant_id))
    if network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Advertised network not found")
    if payload.routing_id is not None:
        routing = db.scalar(select(SiteRouting).where(SiteRouting.id == payload.routing_id, SiteRouting.site_id == network.site_id, SiteRouting.tenant_id == user.tenant_id))
        if routing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site routing entry not found for this site")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(network, field, value)
    db.commit()
    db.refresh(network)
    return network


@router.delete("/advertised-networks/{network_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_advertised_network(network_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    network = db.scalar(select(AdvertisedNetwork).where(AdvertisedNetwork.id == network_id, AdvertisedNetwork.tenant_id == user.tenant_id))
    if network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Advertised network not found")
    db.delete(network)
    db.commit()
