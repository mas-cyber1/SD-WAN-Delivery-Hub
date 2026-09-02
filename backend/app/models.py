from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    users: Mapped[list["User"]] = relationship(back_populates="tenant")
    clients: Mapped[list["Client"]] = relationship(back_populates="tenant")
    projects: Mapped[list["Project"]] = relationship(back_populates="tenant")
    sites: Mapped[list["Site"]] = relationship(back_populates="tenant")
    raid_items: Mapped[list["RaidItem"]] = relationship(back_populates="tenant")
    milestones: Mapped[list["Milestone"]] = relationship(back_populates="tenant")
    actions: Mapped[list["ProjectAction"]] = relationship(back_populates="tenant")
    decisions: Mapped[list["ProjectDecision"]] = relationship(back_populates="tenant")
    devices: Mapped[list["NetworkDevice"]] = relationship(back_populates="tenant")
    circuits: Mapped[list["WanCircuit"]] = relationship(back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(40), default="read_only")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship(back_populates="users")


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    client_code: Mapped[str] = mapped_column(String(50), index=True)
    industry: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship(back_populates="clients")
    projects: Mapped[list["Project"]] = relationship(back_populates="client")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    project_code: Mapped[str] = mapped_column(String(60), index=True)
    status: Mapped[str] = mapped_column(String(40), default="planning")
    health: Mapped[str] = mapped_column(String(20), default="green")
    completion_percentage: Mapped[int] = mapped_column(default=0)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    target_completion_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship(back_populates="projects")
    client: Mapped[Client] = relationship(back_populates="projects")
    sites: Mapped[list["Site"]] = relationship(back_populates="project")
    raid_items: Mapped[list["RaidItem"]] = relationship(back_populates="project")
    milestones: Mapped[list["Milestone"]] = relationship(back_populates="project")
    actions: Mapped[list["ProjectAction"]] = relationship(back_populates="project")
    decisions: Mapped[list["ProjectDecision"]] = relationship(back_populates="project")


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    site_code: Mapped[str] = mapped_column(String(60), index=True)
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="planned")
    priority: Mapped[str] = mapped_column(String(40), default="normal")
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship(back_populates="sites")
    project: Mapped[Project] = relationship(back_populates="sites")
    devices: Mapped[list["NetworkDevice"]] = relationship(back_populates="site")
    circuits: Mapped[list["WanCircuit"]] = relationship(back_populates="site")
    ip_networks: Mapped[list["IpNetwork"]] = relationship(back_populates="site")
    vlans: Mapped[list["Vlan"]] = relationship(back_populates="site")
    interfaces: Mapped[list["NetworkInterface"]] = relationship(back_populates="site")


class RaidItem(Base):
    __tablename__ = "raid_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    item_type: Mapped[str] = mapped_column(String(30), default="risk")
    title: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="open")
    priority: Mapped[str] = mapped_column(String(30), default="medium")
    owner: Mapped[str | None] = mapped_column(String(120), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship(back_populates="raid_items")
    project: Mapped[Project] = relationship(back_populates="raid_items")


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="planned")
    owner: Mapped[str | None] = mapped_column(String(120), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship(back_populates="milestones")
    project: Mapped[Project] = relationship(back_populates="milestones")


class ProjectAction(Base):
    __tablename__ = "project_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="open")
    owner: Mapped[str | None] = mapped_column(String(120), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship(back_populates="actions")
    project: Mapped[Project] = relationship(back_populates="actions")


class ProjectDecision(Base):
    __tablename__ = "project_decisions"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    decision: Mapped[str] = mapped_column(String(2000))
    decided_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    decision_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship(back_populates="decisions")
    project: Mapped[Project] = relationship(back_populates="decisions")


class NetworkDevice(Base):
    __tablename__ = "network_devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), index=True)
    hostname: Mapped[str] = mapped_column(String(160), index=True)
    role: Mapped[str] = mapped_column(String(50), default="sdwan_edge")
    vendor: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    management_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="planned")
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship(back_populates="devices")
    site: Mapped[Site] = relationship(back_populates="devices")


class WanCircuit(Base):
    __tablename__ = "wan_circuits"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    provider: Mapped[str] = mapped_column(String(120))
    circuit_type: Mapped[str] = mapped_column(String(50), default="internet")
    role: Mapped[str] = mapped_column(String(30), default="primary")
    bandwidth_mbps: Mapped[int | None] = mapped_column(nullable=True)
    public_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="planned")
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship(back_populates="circuits")
    site: Mapped[Site] = relationship(back_populates="circuits")


class IpNetwork(Base):
    __tablename__ = "ip_networks"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    cidr: Mapped[str] = mapped_column(String(64))
    gateway: Mapped[str | None] = mapped_column(String(64), nullable=True)
    network_type: Mapped[str] = mapped_column(String(40), default="lan")
    status: Mapped[str] = mapped_column(String(30), default="planned")
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship()
    site: Mapped[Site] = relationship(back_populates="ip_networks")


class Vlan(Base):
    __tablename__ = "vlans"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), index=True)
    vlan_id: Mapped[int] = mapped_column()
    name: Mapped[str] = mapped_column(String(160), index=True)
    subnet: Mapped[str | None] = mapped_column(String(64), nullable=True)
    gateway: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="planned")
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship()
    site: Mapped[Site] = relationship(back_populates="vlans")


class NetworkInterface(Base):
    __tablename__ = "network_interfaces"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("network_devices.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    interface_role: Mapped[str] = mapped_column(String(40), default="lan")
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    connected_to: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="planned")
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    tenant: Mapped[Tenant] = relationship()
    site: Mapped[Site] = relationship(back_populates="interfaces")
    device: Mapped[NetworkDevice] = relationship()
