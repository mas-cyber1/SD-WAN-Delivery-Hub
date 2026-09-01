from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Project, RaidItem, User
from app.schemas import RaidItemCreate, RaidItemResponse

router = APIRouter()


@router.get("", response_model=list[RaidItemResponse])
def list_raid_items(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[RaidItem]:
    return db.scalars(select(RaidItem).where(RaidItem.tenant_id == user.tenant_id)).all()


@router.post("", response_model=RaidItemResponse, status_code=status.HTTP_201_CREATED)
def create_raid_item(
    payload: RaidItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RaidItem:
    project = db.scalar(
        select(Project).where(
            Project.id == payload.project_id,
            Project.tenant_id == user.tenant_id,
        )
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    raid_item = RaidItem(
        tenant_id=user.tenant_id,
        project_id=payload.project_id,
        item_type=payload.item_type,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        owner=payload.owner,
        due_date=payload.due_date,
    )
    db.add(raid_item)
    db.commit()
    db.refresh(raid_item)
    return raid_item
