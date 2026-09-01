from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Project, User
from app.schemas import ProjectCreate, ProjectResponse

router = APIRouter()


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[Project]:
    return db.scalars(select(Project).where(Project.tenant_id == user.tenant_id)).all()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Project:
    project = db.scalar(
        select(Project).where(
            Project.tenant_id == user.tenant_id,
            Project.project_code == payload.project_code,
        )
    )
    if project is not None:
        raise HTTPException(status_code=400, detail="Project code already exists in this tenant")

    project = Project(
        tenant_id=user.tenant_id,
        client_id=payload.client_id,
        name=payload.name,
        project_code=payload.project_code,
        status=payload.status,
        health=payload.health,
        completion_percentage=payload.completion_percentage,
        description=payload.description,
        start_date=payload.start_date,
        target_completion_date=payload.target_completion_date,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project
