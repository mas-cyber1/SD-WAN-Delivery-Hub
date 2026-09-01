from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Site, User
from app.schemas import SiteCreate, SiteResponse, SiteUpdate

router = APIRouter()


@router.get("", response_model=list[SiteResponse])
def list_sites(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[Site]:
    return db.scalars(select(Site).where(Site.tenant_id == user.tenant_id)).all()


@router.post("", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
def create_site(payload: SiteCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Site:
    site = db.scalar(
        select(Site).where(
            Site.tenant_id == user.tenant_id,
            Site.site_code == payload.site_code,
        )
    )
    if site is not None:
        raise HTTPException(status_code=400, detail="Site code already exists in this tenant")

    site = Site(
        tenant_id=user.tenant_id,
        project_id=payload.project_id,
        name=payload.name,
        site_code=payload.site_code,
        region=payload.region,
        status=payload.status,
        priority=payload.priority,
        address=payload.address,
        description=payload.description,
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.patch("/{site_id}", response_model=SiteResponse)
def update_site(
    site_id: int,
    payload: SiteUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Site:
    site = db.scalar(select(Site).where(Site.id == site_id, Site.tenant_id == user.tenant_id))
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(site, field, value)
    db.commit()
    db.refresh(site)
    return site
