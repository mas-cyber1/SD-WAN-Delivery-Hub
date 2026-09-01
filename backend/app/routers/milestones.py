from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Milestone, Project, User
from app.schemas import MilestoneCreate, MilestoneResponse

router = APIRouter()


@router.get("", response_model=list[MilestoneResponse])
def list_milestones(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[Milestone]:
    return db.scalars(select(Milestone).where(Milestone.tenant_id == user.tenant_id)).all()


@router.post("", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
def create_milestone(
    payload: MilestoneCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Milestone:
    project = db.scalar(
        select(Project).where(
            Project.id == payload.project_id,
            Project.tenant_id == user.tenant_id,
        )
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    milestone = Milestone(
        tenant_id=user.tenant_id,
        project_id=payload.project_id,
        name=payload.name,
        description=payload.description,
        status=payload.status,
        owner=payload.owner,
        due_date=payload.due_date,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone
