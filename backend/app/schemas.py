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


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    project_code: str | None = Field(default=None, min_length=2, max_length=60)
    status: str | None = None
    health: str | None = None
    completion_percentage: int | None = Field(default=None, ge=0, le=100)
    description: str | None = None
    start_date: datetime | None = None
    target_completion_date: datetime | None = None



class SiteCreate(BaseModel):
    project_id: int
    name: str = Field(min_length=2, max_length=200)
    site_code: str = Field(min_length=2, max_length=60)
    region: str | None = None
    status: str = "planned"
    priority: str = "normal"
    address: str | None = None
    description: str | None = None


class SiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    project_id: int
    name: str
    site_code: str
    region: str | None
    status: str
    priority: str
    address: str | None
    description: str | None
    created_at: datetime | None = None


class SiteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    site_code: str | None = Field(default=None, min_length=2, max_length=60)
    region: str | None = None
    status: str | None = None
    priority: str | None = None
    address: str | None = None
    description: str | None = None


class RaidItemCreate(BaseModel):
    project_id: int
    item_type: str = "risk"
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    status: str = "open"
    priority: str = "medium"
    owner: str | None = None
    due_date: datetime | None = None


class RaidItemUpdate(BaseModel):
    item_type: str | None = None
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    owner: str | None = None
    due_date: datetime | None = None


class RaidItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    project_id: int
    item_type: str
    title: str
    description: str | None
    status: str
    priority: str
    owner: str | None
    due_date: datetime | None
    created_at: datetime | None = None


class MilestoneCreate(BaseModel):
    project_id: int
    name: str = Field(min_length=2, max_length=200)
    description: str | None = None
    status: str = "planned"
    owner: str | None = None
    due_date: datetime | None = None


class MilestoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    status: str | None = None
    owner: str | None = None
    due_date: datetime | None = None


class MilestoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    project_id: int
    name: str
    description: str | None
    status: str
    owner: str | None
    due_date: datetime | None
    completed_date: datetime | None
    created_at: datetime | None = None


class ProjectActionCreate(BaseModel):
    project_id: int
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    status: str = "open"
    owner: str | None = None
    due_date: datetime | None = None


class ProjectActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    project_id: int
    title: str
    description: str | None
    status: str
    owner: str | None
    due_date: datetime | None
    created_at: datetime | None = None


class ProjectActionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    status: str | None = None
    owner: str | None = None
    due_date: datetime | None = None


class ProjectDecisionCreate(BaseModel):
    project_id: int
    title: str = Field(min_length=2, max_length=200)
    decision: str = Field(min_length=2, max_length=2000)
    decided_by: str | None = None
    decision_date: datetime | None = None


class ProjectDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    project_id: int
    title: str
    decision: str
    decided_by: str | None
    decision_date: datetime | None
    created_at: datetime | None = None


class NetworkDeviceCreate(BaseModel):
    site_id: int
    hostname: str = Field(min_length=2, max_length=160)
    role: str = "sdwan_edge"
    vendor: str | None = None
    model: str | None = None
    management_ip: str | None = None
    status: str = "planned"
    description: str | None = None


class NetworkDeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    site_id: int
    hostname: str
    role: str
    vendor: str | None
    model: str | None
    management_ip: str | None
    status: str
    description: str | None
    created_at: datetime | None = None


class NetworkDeviceUpdate(BaseModel):
    hostname: str | None = Field(default=None, min_length=2, max_length=160)
    role: str | None = None
    vendor: str | None = None
    model: str | None = None
    management_ip: str | None = None
    status: str | None = None
    description: str | None = None


class WanCircuitCreate(BaseModel):
    site_id: int
    name: str = Field(min_length=2, max_length=160)
    provider: str = Field(min_length=2, max_length=120)
    circuit_type: str = "internet"
    role: str = "primary"
    bandwidth_mbps: int | None = Field(default=None, ge=0)
    public_ip: str | None = None
    status: str = "planned"
    description: str | None = None


class WanCircuitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    site_id: int
    name: str
    provider: str
    circuit_type: str
    role: str
    bandwidth_mbps: int | None
    public_ip: str | None
    status: str
    description: str | None
    created_at: datetime | None = None


class WanCircuitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    provider: str | None = Field(default=None, min_length=2, max_length=120)
    circuit_type: str | None = None
    role: str | None = None
    bandwidth_mbps: int | None = Field(default=None, ge=0)
    public_ip: str | None = None
    status: str | None = None
    description: str | None = None


class IpNetworkCreate(BaseModel):
    site_id: int
    name: str = Field(min_length=2, max_length=160)
    cidr: str = Field(min_length=3, max_length=64)
    gateway: str | None = None
    network_type: str = "lan"
    status: str = "planned"
    description: str | None = None


class IpNetworkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    site_id: int
    name: str
    cidr: str
    gateway: str | None
    network_type: str
    status: str
    description: str | None
    created_at: datetime | None = None


class IpNetworkUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    cidr: str | None = Field(default=None, min_length=3, max_length=64)
    gateway: str | None = None
    network_type: str | None = None
    status: str | None = None
    description: str | None = None


class VlanCreate(BaseModel):
    site_id: int
    vlan_id: int = Field(ge=1, le=4094)
    name: str = Field(min_length=2, max_length=160)
    subnet: str | None = None
    gateway: str | None = None
    status: str = "planned"
    description: str | None = None


class VlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    site_id: int
    vlan_id: int
    name: str
    subnet: str | None
    gateway: str | None
    status: str
    description: str | None
    created_at: datetime | None = None


class VlanUpdate(BaseModel):
    vlan_id: int | None = Field(default=None, ge=1, le=4094)
    name: str | None = Field(default=None, min_length=2, max_length=160)
    subnet: str | None = None
    gateway: str | None = None
    status: str | None = None
    description: str | None = None


class NetworkInterfaceCreate(BaseModel):
    site_id: int
    device_id: int
    name: str = Field(min_length=2, max_length=100)
    interface_role: str = "lan"
    ip_address: str | None = None
    connected_to: str | None = None
    status: str = "planned"
    description: str | None = None


class NetworkInterfaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    site_id: int
    device_id: int
    name: str
    interface_role: str
    ip_address: str | None
    connected_to: str | None
    status: str
    description: str | None
    created_at: datetime | None = None


class SdwanHubCreate(BaseModel):
    project_id: int
    site_id: int
    device_id: int | None = None
    name: str = Field(min_length=2, max_length=160)
    hub_type: str = "hub"
    controller_hostname: str | None = None
    region: str | None = None
    status: str = "planned"
    description: str | None = None


class SdwanHubResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    project_id: int
    site_id: int
    device_id: int | None
    name: str
    hub_type: str
    controller_hostname: str | None
    region: str | None
    status: str
    description: str | None
    created_at: datetime | None = None


class SdwanTunnelCreate(BaseModel):
    project_id: int
    source_site_id: int
    destination_site_id: int
    source_device_id: int | None = None
    destination_device_id: int | None = None
    name: str = Field(min_length=2, max_length=160)
    path_role: str = "primary"
    transport: str = "internet"
    local_tunnel_ip: str | None = None
    remote_tunnel_ip: str | None = None
    status: str = "planned"
    description: str | None = None


class SdwanTunnelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    project_id: int
    source_site_id: int
    destination_site_id: int
    source_device_id: int | None
    destination_device_id: int | None
    name: str
    path_role: str
    transport: str
    local_tunnel_ip: str | None
    remote_tunnel_ip: str | None
    status: str
    description: str | None
    created_at: datetime | None = None


class SdwanTopologyCreate(BaseModel):
    project_id: int
    topology_type: str = "site_to_hub"
    status: str = "planned"
    notes: str | None = None


class SdwanTopologyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    project_id: int
    topology_type: str
    status: str
    notes: str | None
    created_at: datetime | None = None


class SecureEdgeConnectionCreate(BaseModel):
    project_id: int
    site_id: int
    edge_name: str = Field(min_length=2, max_length=160)
    edge_type: str = "zscaler"
    transport: str = "internet"
    status: str = "planned"
    notes: str | None = None


class SecureEdgeConnectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    project_id: int
    site_id: int
    edge_name: str
    edge_type: str
    transport: str
    status: str
    notes: str | None
    created_at: datetime | None = None


class SecureEdgeConnectionUpdate(BaseModel):
    site_id: int | None = None
    edge_name: str | None = Field(default=None, min_length=2, max_length=160)
    edge_type: str | None = None
    transport: str | None = None
    status: str | None = None
    notes: str | None = None


class NetworkInterfaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    interface_role: str | None = None
    ip_address: str | None = None
    connected_to: str | None = None
    status: str | None = None
    description: str | None = None


class SiteRoutingCreate(BaseModel):
    site_id: int
    protocol: str = "static"
    local_asn: int | None = None
    remote_asn: int | None = None
    ospf_area: str | None = None
    next_hop: str | None = None
    status: str = "planned"
    notes: str | None = None


class SiteRoutingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    site_id: int
    protocol: str
    local_asn: int | None
    remote_asn: int | None
    ospf_area: str | None
    next_hop: str | None
    status: str
    notes: str | None
    created_at: datetime | None = None


class SiteRoutingUpdate(BaseModel):
    protocol: str | None = None
    local_asn: int | None = None
    remote_asn: int | None = None
    ospf_area: str | None = None
    next_hop: str | None = None
    status: str | None = None
    notes: str | None = None


class AdvertisedNetworkCreate(BaseModel):
    site_id: int
    routing_id: int | None = None
    name: str = Field(min_length=2, max_length=160)
    cidr: str = Field(min_length=3, max_length=64)
    status: str = "advertised"
    notes: str | None = None


class AdvertisedNetworkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    site_id: int
    routing_id: int | None
    name: str
    cidr: str
    status: str
    notes: str | None
    created_at: datetime | None = None


class AdvertisedNetworkUpdate(BaseModel):
    routing_id: int | None = None
    name: str | None = Field(default=None, min_length=2, max_length=160)
    cidr: str | None = Field(default=None, min_length=3, max_length=64)
    status: str | None = None
    notes: str | None = None
