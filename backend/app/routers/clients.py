from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Client, User
from app.schemas import ClientCreate, ClientResponse

router = APIRouter()


@router.get("", response_model=list[ClientResponse])
def list_clients(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Sequence[Client]:
    return db.scalars(select(Client).where(Client.tenant_id == user.tenant_id)).all()


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(payload: ClientCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Client:
    existing = db.scalar(select(Client).where(Client.tenant_id == user.tenant_id, Client.client_code == payload.client_code))
    if existing is not None:
        raise HTTPException(status_code=400, detail="Client code already exists in this tenant")

    client = Client(
        tenant_id=user.tenant_id,
        name=payload.name,
        client_code=payload.client_code,
        industry=payload.industry,
        status=payload.status,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client
