from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Project, ProjectAction, ProjectDecision, User
from app.schemas import (
    ProjectActionCreate,
    ProjectActionResponse,
    ProjectDecisionCreate,
    ProjectDecisionResponse,
)

router = APIRouter()


def get_project(project_id: int, user: User, db: Session) -> Project:
    project = db.scalar(select(Project).where(Project.id == project_id, Project.tenant_id == user.tenant_id))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("/actions", response_model=list[ProjectActionResponse])
def list_actions(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[ProjectAction]:
    return db.scalars(select(ProjectAction).where(ProjectAction.tenant_id == user.tenant_id)).all()


@router.post("/actions", response_model=ProjectActionResponse, status_code=status.HTTP_201_CREATED)
def create_action(
    payload: ProjectActionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectAction:
    get_project(payload.project_id, user, db)
    action = ProjectAction(
        tenant_id=user.tenant_id,
        project_id=payload.project_id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        owner=payload.owner,
        due_date=payload.due_date,
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


@router.get("/decisions", response_model=list[ProjectDecisionResponse])
def list_decisions(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[ProjectDecision]:
    return db.scalars(select(ProjectDecision).where(ProjectDecision.tenant_id == user.tenant_id)).all()


@router.post("/decisions", response_model=ProjectDecisionResponse, status_code=status.HTTP_201_CREATED)
def create_decision(
    payload: ProjectDecisionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectDecision:
    get_project(payload.project_id, user, db)
    decision = ProjectDecision(
        tenant_id=user.tenant_id,
        project_id=payload.project_id,
        title=payload.title,
        decision=payload.decision,
        decided_by=payload.decided_by,
        decision_date=payload.decision_date,
    )
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return decision
