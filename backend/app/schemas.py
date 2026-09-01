from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, str]


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    tenant_id: int


class ClientCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    client_code: str = Field(min_length=2, max_length=50)
    industry: str | None = None
    status: str = "active"


class ClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    name: str
    client_code: str
    industry: str | None
    status: str
    created_at: datetime | None = None


class ProjectCreate(BaseModel):
    client_id: int
    name: str = Field(min_length=2, max_length=200)
    project_code: str = Field(min_length=2, max_length=60)
    status: str = "planning"
    health: str = "green"
    completion_percentage: int = Field(default=0, ge=0, le=100)
    description: str | None = None
    start_date: datetime | None = None
    target_completion_date: datetime | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    client_id: int
    name: str
    project_code: str
    status: str
    health: str
    completion_percentage: int
    description: str | None
    start_date: datetime | None = None
    target_completion_date: datetime | None = None
    created_at: datetime | None = None
