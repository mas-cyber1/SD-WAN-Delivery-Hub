import { FormEvent, useState } from 'react'

type Client = { id: number; name: string; client_code: string }
type Project = { id: number; client_id: number; name: string; project_code: string }
type Site = { id: number; project_id: number; name: string; site_code: string; region: string | null; status: string; priority: string; address: string | null; description: string | null }
type Device = { id: number; site_id: number; hostname: string; role: string; vendor: string | null; model: string | null; management_ip: string | null; status: string }
type Circuit = { id: number; site_id: number; name: string; provider: string; circuit_type: string; role: string; bandwidth_mbps: number | null; public_ip: string | null; status: string }
type Network = { id: number; site_id: number; name: string; cidr: string; gateway: string | null; network_type: string; status: string }
type Vlan = { id: number; site_id: number; vlan_id: number; name: string; subnet: string | null; gateway: string | null; status: string }
type NetworkInterface = { id: number; site_id: number; device_id: number; name: string; interface_role: string; ip_address: string | null; connected_to: string | null; status: string }
type Topology = { id: number; project_id: number; topology_type: string; status: string; notes: string | null }
type SecureEdge = { id: number; project_id: number; site_id: number; edge_name: string; edge_type: string; transport: string; status: string; notes: string | null }
type SiteRouting = { id: number; site_id: number; protocol: string; local_asn: number | null; remote_asn: number | null; ospf_area: string | null; next_hop: string | null; status: string; notes: string | null }
type AdvertisedNetwork = { id: number; site_id: number; routing_id: number | null; name: string; cidr: string; status: string; notes: string | null }

type Props = {
  token: string
  clients: Client[]
  projects: Project[]
  sites: Site[]
  devices: Device[]
  circuits: Circuit[]
  networks: Network[]
  vlans: Vlan[]
  interfaces: NetworkInterface[]
  topologies: Topology[]
  secureEdges: SecureEdge[]
  siteRouting: SiteRouting[]
  advertisedNetworks: AdvertisedNetwork[]
  onChanged: () => Promise<void>
}

async function postJson(token: string, path: string, body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  if (response.ok) return null
  const payload = (await response.json().catch(() => ({ detail: 'Request failed' }))) as { detail?: string }
  return payload.detail ?? 'Request failed'
}

async function patchJson(token: string, path: string, id: number, body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch(`/api/${path}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  if (response.ok) return null
  const payload = (await response.json().catch(() => ({ detail: 'Request failed' }))) as { detail?: string }
  return payload.detail ?? 'Request failed'
}

async function deleteJson(token: string, path: string, id: number): Promise<boolean> {
  const response = await fetch(`/api/${path}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  return response.ok || response.status === 204
}

const siteStatusOptions = ['planned', 'test_turn_up_only', 'lan_migrated', 'in_progress', 'ready', 'blocked']

function SitesWorkspace({ token, clients, projects, sites, devices, circuits, networks, vlans, interfaces, topologies, secureEdges, siteRouting, advertisedNetworks, onChanged }: Props) {
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null)
  const [addSiteProjectId, setAddSiteProjectId] = useState<number | null>(null)

  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null
  const selectedProject = selectedSite ? projects.find((project) => project.id === selectedSite.project_id) ?? null : null
  const selectedClient = selectedProject ? clients.find((client) => client.id === selectedProject.client_id) ?? null : null

  return <div className="workspace-grid">
    <section className="panel">
      <div className="panel-heading"><div><h3>Sites</h3><p className="muted">Select a site to manage everything tied to it: details, inventory, routing, and overlay.</p></div></div>
      {clients.length === 0 ? <div className="empty-state compact"><span>No clients available</span></div> : <div className="hierarchy-stack">
        {clients.map((client) => <div key={client.id} className="hierarchy-card">
          <div className="hierarchy-header"><div><strong>{client.name}</strong><span>{client.client_code}</span></div></div>
          {projects.filter((project) => project.client_id === client.id).map((project) => <div key={project.id} className="nested-project">
            <div className="hierarchy-header"><div><strong>{project.name}</strong><span>{project.project_code}</span></div><button type="button" className="filter-button" onClick={() => setAddSiteProjectId(addSiteProjectId === project.id ? null : project.id)}>{addSiteProjectId === project.id ? 'Close' : '+ Add site'}</button></div>
            {addSiteProjectId === project.id && <AddSiteForm token={token} projectId={project.id} onChanged={onChanged} onDone={() => setAddSiteProjectId(null)} />}
            <div className="site-picker-list">
              {sites.filter((site) => site.project_id === project.id).length === 0 ? <p className="muted">No sites yet.</p> : sites.filter((site) => site.project_id === project.id).map((site) => <button key={site.id} type="button" className={`site-picker-item ${selectedSiteId === site.id ? 'selected' : ''}`} onClick={() => setSelectedSiteId(site.id)}>
                <span>{site.name}</span><span className="muted-tag">{site.site_code}</span>
              </button>)}
            </div>
          </div>)}
        </div>)}
      </div>}
    </section>
    <section className="panel workflow-register">
      {!selectedSite ? <div className="empty-state compact"><span>Select a site on the left, or add one to a project.</span></div> : <div>
        <div className="panel-heading"><div><p className="eyebrow">{selectedClient?.name ?? 'Unknown client'} / {selectedProject?.name ?? 'Unknown project'}</p><h3>{selectedSite.name}</h3><p className="muted">{selectedSite.site_code}</p></div></div>
        <SiteDetailSection token={token} site={selectedSite} onChanged={onChanged} />
        {selectedProject && <TopologySection token={token} project={selectedProject} topology={topologies.find((topology) => topology.project_id === selectedProject.id) ?? null} onChanged={onChanged} />}
        <DeviceSection token={token} site={selectedSite} devices={devices.filter((device) => device.site_id === selectedSite.id)} interfaces={interfaces} onChanged={onChanged} />
        <CircuitSection token={token} site={selectedSite} circuits={circuits.filter((circuit) => circuit.site_id === selectedSite.id)} onChanged={onChanged} />
        <NetworkSection token={token} site={selectedSite} networks={networks.filter((network) => network.site_id === selectedSite.id)} onChanged={onChanged} />
        <VlanSection token={token} site={selectedSite} vlans={vlans.filter((vlan) => vlan.site_id === selectedSite.id)} onChanged={onChanged} />
        <RoutingSection token={token} site={selectedSite} entries={siteRouting.filter((entry) => entry.site_id === selectedSite.id)} onChanged={onChanged} />
        <AdvertisedSection token={token} site={selectedSite} routingEntries={siteRouting.filter((entry) => entry.site_id === selectedSite.id)} networks={advertisedNetworks.filter((network) => network.site_id === selectedSite.id)} onChanged={onChanged} />
        {selectedProject && <SecureEdgeSection token={token} site={selectedSite} projectId={selectedProject.id} edges={secureEdges.filter((edge) => edge.site_id === selectedSite.id)} onChanged={onChanged} />}
      </div>}
    </section>
  </div>
}

function AddSiteForm({ token, projectId, onChanged, onDone }: { token: string; projectId: number; onChanged: () => Promise<void>; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', site_code: '', region: '', status: 'planned', priority: 'normal', address: '', description: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postJson(token, 'sites', { ...form, project_id: projectId, region: form.region || null, address: form.address || null, description: form.description || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    onDone()
    await onChanged()
  }

  return <form className="form-grid compact-form" onSubmit={submit}>
    <label>Site name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
    <label>Site code<input value={form.site_code} onChange={(event) => setForm({ ...form, site_code: event.target.value })} required /></label>
    <label>Region<input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} /></label>
    <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{siteStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
    <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
    <label>Address<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
    <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} /></label>
    {error && <p className="form-error">{error}</p>}
    <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save site'}</button>
  </form>
}

function SiteDetailSection({ token, site, onChanged }: { token: string; site: Site; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: site.name, site_code: site.site_code, region: site.region ?? '', status: site.status, priority: site.priority, address: site.address ?? '', description: site.description ?? '' })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await patchJson(token, 'sites', site.id, { ...form, region: form.region || null, address: form.address || null, description: form.description || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditing(false)
    await onChanged()
  }

  return <div className="inventory-section">
    <div className="section-header"><h4>Site details</h4><button type="button" className="filter-button" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button></div>
    {editing ? <form className="form-grid compact-form" onSubmit={save}>
      <label>Site name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <label>Site code<input value={form.site_code} onChange={(event) => setForm({ ...form, site_code: event.target.value })} required /></label>
      <label>Region<input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} /></label>
      <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{siteStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
      <label>Address<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
      <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button>
    </form> : <div className="table-row"><div><strong>{site.region ?? 'No region set'}</strong><span>{site.address ?? 'No address set'}</span></div><span className={`status-badge ${site.status}`}>{site.status}</span></div>}
  </div>
}

function TopologySection({ token, project, topology, onChanged }: { token: string; project: Project; topology: Topology | null; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ topology_type: topology?.topology_type ?? 'site_to_hub', status: topology?.status ?? 'planned', notes: topology?.notes ?? '' })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const failure = await postJson(token, 'overlay/topology', { project_id: project.id, topology_type: form.topology_type, status: form.status, notes: form.notes || null })
    if (failure) { setError(failure); return }
    setEditing(false)
    await onChanged()
  }

  async function remove() {
    if (!window.confirm('Delete this project topology?')) return
    if (await deleteJson(token, 'overlay/topology', project.id)) await onChanged()
  }

  return <div className="inventory-section">
    <div className="section-header"><h4>Project topology</h4><button type="button" className="filter-button" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : topology ? 'Edit' : '+ Set topology'}</button></div>
    <p className="muted">Applies to every site in this project, not just this one.</p>
    {editing ? <form className="form-grid compact-form" onSubmit={save}>
      <label>Topology<select value={form.topology_type} onChange={(event) => setForm({ ...form, topology_type: event.target.value })}><option value="site_to_hub">Site to hub</option><option value="site_to_site">Site to site mesh</option></select></label>
      <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="design">Design</option><option value="active">Active</option><option value="retired">Retired</option></select></label>
      <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button">Save topology</button>
    </form> : topology ? <div className="table-row"><div><strong>{topology.topology_type === 'site_to_site' ? 'Site to site mesh' : 'Site to hub'}</strong><span>{topology.notes ?? 'No notes'}</span></div><div className="project-meta"><span className={`status-badge ${topology.status}`}>{topology.status}</span><button type="button" className="filter-button" onClick={() => void remove()}>Delete</button></div></div> : <p className="muted">No topology set for this project yet.</p>}
  </div>
}

function DeviceSection({ token, site, devices, interfaces, onChanged }: { token: string; site: Site; devices: Device[]; interfaces: NetworkInterface[]; onChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ hostname: '', role: 'sdwan_edge', vendor: '', model: '', management_ip: '', status: 'planned' })
  const [expandedDeviceId, setExpandedDeviceId] = useState<number | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postJson(token, 'inventory/devices', { ...form, site_id: site.id, vendor: form.vendor || null, model: form.model || null, management_ip: form.management_ip || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setForm({ hostname: '', role: 'sdwan_edge', vendor: '', model: '', management_ip: '', status: 'planned' })
    setShowForm(false)
    await onChanged()
  }

  return <div className="inventory-section">
    <div className="section-header"><h4>Devices ({devices.length})</h4><button type="button" className="filter-button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : '+ Add'}</button></div>
    {showForm && <form className="form-grid compact-form" onSubmit={submit}>
      <label>Hostname<input value={form.hostname} onChange={(event) => setForm({ ...form, hostname: event.target.value })} required /></label>
      <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="sdwan_edge">SD-WAN edge</option><option value="firewall">Firewall</option><option value="core_switch">Core switch</option><option value="access_switch">Access switch</option><option value="controller">Controller</option></select></label>
      <label>Vendor<input value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} /></label>
      <label>Model<input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label>
      <label>Management IP<input value={form.management_ip} onChange={(event) => setForm({ ...form, management_ip: event.target.value })} /></label>
      <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="ordered">Ordered</option><option value="staged">Staged</option><option value="deployed">Deployed</option></select></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save device'}</button>
    </form>}
    {devices.length === 0 ? <p className="muted">No devices added to this site yet.</p> : <div className="data-table">
      {devices.map((device) => <DeviceRow key={device.id} token={token} site={site} device={device} interfaces={interfaces.filter((item) => item.device_id === device.id)} expanded={expandedDeviceId === device.id} onExpand={() => setExpandedDeviceId((current) => (current === device.id ? null : device.id))} onChanged={onChanged} />)}
    </div>}
  </div>
}

function DeviceRow({ token, site, device, interfaces, expanded, onExpand, onChanged }: { token: string; site: Site; device: Device; interfaces: NetworkInterface[]; expanded: boolean; onExpand: () => void; onChanged: () => Promise<void> }) {
  const [editingDevice, setEditingDevice] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ hostname: device.hostname, role: device.role, vendor: device.vendor ?? '', model: device.model ?? '', management_ip: device.management_ip ?? '', status: device.status })
  const [showInterfaceForm, setShowInterfaceForm] = useState(false)
  const [interfaceError, setInterfaceError] = useState('')
  const [interfaceSubmitting, setInterfaceSubmitting] = useState(false)
  const [interfaceForm, setInterfaceForm] = useState({ name: '', interface_role: 'lan', ip_address: '', connected_to: '', status: 'planned' })

  async function saveDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await patchJson(token, 'inventory/devices', device.id, { ...form, vendor: form.vendor || null, model: form.model || null, management_ip: form.management_ip || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditingDevice(false)
    await onChanged()
  }

  async function saveInterface(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInterfaceError('')
    setInterfaceSubmitting(true)
    const failure = await postJson(token, 'inventory/interfaces', { ...interfaceForm, site_id: site.id, device_id: device.id, ip_address: interfaceForm.ip_address || null, connected_to: interfaceForm.connected_to || null })
    setInterfaceSubmitting(false)
    if (failure) { setInterfaceError(failure); return }
    setInterfaceForm({ name: '', interface_role: 'lan', ip_address: '', connected_to: '', status: 'planned' })
    setShowInterfaceForm(false)
    await onChanged()
  }

  return <div className="device-card">
    <div className="table-row">
      <div><strong>{device.hostname}</strong><span>{device.role}{device.management_ip ? ` - ${device.management_ip}` : ''}</span></div>
      <div className="project-meta"><span className={`status-badge ${device.status}`}>{device.status}</span><button type="button" className="filter-button" onClick={onExpand}>{expanded ? 'Collapse' : 'Manage'}</button></div>
    </div>
    {expanded && <div className="device-detail">
      <div className="device-detail-actions"><button type="button" className="filter-button" onClick={() => setEditingDevice(!editingDevice)}>{editingDevice ? 'Cancel edit' : 'Edit device details'}</button></div>
      {editingDevice && <form className="form-grid compact-form" onSubmit={saveDevice}>
        <label>Hostname<input value={form.hostname} onChange={(event) => setForm({ ...form, hostname: event.target.value })} required /></label>
        <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="sdwan_edge">SD-WAN edge</option><option value="firewall">Firewall</option><option value="core_switch">Core switch</option><option value="access_switch">Access switch</option><option value="controller">Controller</option></select></label>
        <label>Vendor<input value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} /></label>
        <label>Model<input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label>
        <label>Management IP<input value={form.management_ip} onChange={(event) => setForm({ ...form, management_ip: event.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="ordered">Ordered</option><option value="staged">Staged</option><option value="deployed">Deployed</option></select></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button>
      </form>}
      <div className="section-header compact"><h4>Interfaces ({interfaces.length})</h4><button type="button" className="filter-button" onClick={() => setShowInterfaceForm(!showInterfaceForm)}>{showInterfaceForm ? 'Close' : '+ Add interface'}</button></div>
      {showInterfaceForm && <form className="form-grid compact-form" onSubmit={saveInterface}>
        <label>Interface<input placeholder="ge-0/0/0" value={interfaceForm.name} onChange={(event) => setInterfaceForm({ ...interfaceForm, name: event.target.value })} required /></label>
        <label>Role<select value={interfaceForm.interface_role} onChange={(event) => setInterfaceForm({ ...interfaceForm, interface_role: event.target.value })}><option value="lan">LAN</option><option value="wan">WAN</option><option value="management">Management</option><option value="loopback">Loopback</option></select></label>
        <label>IP address<input value={interfaceForm.ip_address} onChange={(event) => setInterfaceForm({ ...interfaceForm, ip_address: event.target.value })} /></label>
        <label>Connected to<input value={interfaceForm.connected_to} onChange={(event) => setInterfaceForm({ ...interfaceForm, connected_to: event.target.value })} /></label>
        <label>Status<select value={interfaceForm.status} onChange={(event) => setInterfaceForm({ ...interfaceForm, status: event.target.value })}><option value="planned">Planned</option><option value="active">Active</option><option value="retired">Retired</option></select></label>
        {interfaceError && <p className="form-error">{interfaceError}</p>}
        <button className="primary-button" disabled={interfaceSubmitting}>{interfaceSubmitting ? 'Saving...' : 'Save interface'}</button>
      </form>}
      {interfaces.length === 0 ? <p className="muted">No interfaces recorded for this device yet.</p> : <div className="data-table">
        {interfaces.map((item) => <InterfaceRow key={item.id} token={token} interfaceItem={item} onChanged={onChanged} />)}
      </div>}
    </div>}
  </div>
}

function InterfaceRow({ token, interfaceItem, onChanged }: { token: string; interfaceItem: NetworkInterface; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: interfaceItem.name, interface_role: interfaceItem.interface_role, ip_address: interfaceItem.ip_address ?? '', connected_to: interfaceItem.connected_to ?? '', status: interfaceItem.status })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await patchJson(token, 'inventory/interfaces', interfaceItem.id, { ...form, ip_address: form.ip_address || null, connected_to: form.connected_to || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditing(false)
    await onChanged()
  }

  if (editing) return <form className="form-grid compact-form" onSubmit={save}>
    <label>Interface<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
    <label>Role<select value={form.interface_role} onChange={(event) => setForm({ ...form, interface_role: event.target.value })}><option value="lan">LAN</option><option value="wan">WAN</option><option value="management">Management</option><option value="loopback">Loopback</option></select></label>
    <label>IP address<input value={form.ip_address} onChange={(event) => setForm({ ...form, ip_address: event.target.value })} /></label>
    <label>Connected to<input value={form.connected_to} onChange={(event) => setForm({ ...form, connected_to: event.target.value })} /></label>
    <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="active">Active</option><option value="retired">Retired</option></select></label>
    {error && <p className="form-error">{error}</p>}
    <div className="edit-actions"><button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button><button type="button" className="filter-button" onClick={() => setEditing(false)}>Cancel</button></div>
  </form>

  return <div className="table-row"><div><strong>{interfaceItem.name}</strong><span>{interfaceItem.interface_role}{interfaceItem.ip_address ? ` - ${interfaceItem.ip_address}` : ''}{interfaceItem.connected_to ? ` - to ${interfaceItem.connected_to}` : ''}</span></div><div className="project-meta"><span className={`status-badge ${interfaceItem.status}`}>{interfaceItem.status}</span><button type="button" className="filter-button" onClick={() => setEditing(true)}>Edit</button></div></div>
}

function CircuitSection({ token, site, circuits, onChanged }: { token: string; site: Site; circuits: Circuit[]; onChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', provider: '', circuit_type: 'internet', role: 'primary', bandwidth_mbps: '', public_ip: '', status: 'planned' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postJson(token, 'inventory/circuits', { ...form, site_id: site.id, bandwidth_mbps: form.bandwidth_mbps ? Number(form.bandwidth_mbps) : null, public_ip: form.public_ip || null })
    if (failure) { setError(failure); setSubmitting(false); return }
    setForm({ name: '', provider: '', circuit_type: 'internet', role: 'primary', bandwidth_mbps: '', public_ip: '', status: 'planned' })
    setShowForm(false)
    setSubmitting(false)
    await onChanged()
  }

  return <div className="inventory-section">
    <div className="section-header"><h4>WAN circuits ({circuits.length})</h4><button type="button" className="filter-button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : '+ Add'}</button></div>
    {showForm && <form className="form-grid compact-form" onSubmit={submit}>
      <label>Circuit name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <label>Provider<input value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} required /></label>
      <label>Type<select value={form.circuit_type} onChange={(event) => setForm({ ...form, circuit_type: event.target.value })}><option value="internet">Internet</option><option value="mpls">MPLS</option><option value="private_ethernet">Private Ethernet</option><option value="lte_5g">LTE / 5G</option></select></label>
      <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="primary">Primary</option><option value="backup">Backup</option><option value="tertiary">Tertiary</option></select></label>
      <label>Bandwidth (Mbps)<input type="number" min={0} value={form.bandwidth_mbps} onChange={(event) => setForm({ ...form, bandwidth_mbps: event.target.value })} /></label>
      <label>Public IP<input value={form.public_ip} onChange={(event) => setForm({ ...form, public_ip: event.target.value })} /></label>
      <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="ordered">Ordered</option><option value="provisioning">Provisioning</option><option value="live">Live</option></select></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save circuit'}</button>
    </form>}
    {circuits.length === 0 ? <p className="muted">No WAN circuits added to this site yet.</p> : <div className="data-table">
      {circuits.map((circuit) => <CircuitRow key={circuit.id} token={token} circuit={circuit} onChanged={onChanged} />)}
    </div>}
  </div>
}

function CircuitRow({ token, circuit, onChanged }: { token: string; circuit: Circuit; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: circuit.name, provider: circuit.provider, circuit_type: circuit.circuit_type, role: circuit.role, bandwidth_mbps: circuit.bandwidth_mbps == null ? '' : String(circuit.bandwidth_mbps), public_ip: circuit.public_ip ?? '', status: circuit.status })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await patchJson(token, 'inventory/circuits', circuit.id, { ...form, bandwidth_mbps: form.bandwidth_mbps ? Number(form.bandwidth_mbps) : null, public_ip: form.public_ip || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditing(false)
    await onChanged()
  }

  if (editing) return <form className="form-grid compact-form" onSubmit={save}>
    <label>Circuit name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
    <label>Provider<input value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} required /></label>
    <label>Type<select value={form.circuit_type} onChange={(event) => setForm({ ...form, circuit_type: event.target.value })}><option value="internet">Internet</option><option value="mpls">MPLS</option><option value="private_ethernet">Private Ethernet</option><option value="lte_5g">LTE / 5G</option></select></label>
    <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="primary">Primary</option><option value="backup">Backup</option><option value="tertiary">Tertiary</option></select></label>
    <label>Bandwidth (Mbps)<input type="number" min={0} value={form.bandwidth_mbps} onChange={(event) => setForm({ ...form, bandwidth_mbps: event.target.value })} /></label>
    <label>Public IP<input value={form.public_ip} onChange={(event) => setForm({ ...form, public_ip: event.target.value })} /></label>
    <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="ordered">Ordered</option><option value="provisioning">Provisioning</option><option value="live">Live</option></select></label>
    {error && <p className="form-error">{error}</p>}
    <div className="edit-actions"><button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button><button type="button" className="filter-button" onClick={() => setEditing(false)}>Cancel</button></div>
  </form>

  return <div className="table-row"><div><strong>{circuit.name}</strong><span>{circuit.provider} - {circuit.role}{circuit.bandwidth_mbps ? ` - ${circuit.bandwidth_mbps} Mbps` : ''}</span></div><div className="project-meta"><span className={`status-badge ${circuit.status}`}>{circuit.status}</span><button type="button" className="filter-button" onClick={() => setEditing(true)}>Edit</button></div></div>
}

function NetworkSection({ token, site, networks, onChanged }: { token: string; site: Site; networks: Network[]; onChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', cidr: '', gateway: '', network_type: 'lan', status: 'planned' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postJson(token, 'inventory/networks', { ...form, site_id: site.id, gateway: form.gateway || null })
    if (failure) { setError(failure); setSubmitting(false); return }
    setForm({ name: '', cidr: '', gateway: '', network_type: 'lan', status: 'planned' })
    setShowForm(false)
    setSubmitting(false)
    await onChanged()
  }

  return <div className="inventory-section">
    <div className="section-header"><h4>IP networks ({networks.length})</h4><button type="button" className="filter-button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : '+ Add'}</button></div>
    {showForm && <form className="form-grid compact-form" onSubmit={submit}>
      <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <label>CIDR<input placeholder="10.10.0.0/24" value={form.cidr} onChange={(event) => setForm({ ...form, cidr: event.target.value })} required /></label>
      <label>Gateway<input value={form.gateway} onChange={(event) => setForm({ ...form, gateway: event.target.value })} /></label>
      <label>Type<select value={form.network_type} onChange={(event) => setForm({ ...form, network_type: event.target.value })}><option value="lan">LAN</option><option value="wan">WAN</option><option value="management">Management</option><option value="loopback">Loopback</option></select></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save network'}</button>
    </form>}
    {networks.length === 0 ? <p className="muted">No IP networks added to this site yet.</p> : <div className="data-table">
      {networks.map((network) => <NetworkRow key={network.id} token={token} network={network} onChanged={onChanged} />)}
    </div>}
  </div>
}

function NetworkRow({ token, network, onChanged }: { token: string; network: Network; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: network.name, cidr: network.cidr, gateway: network.gateway ?? '', network_type: network.network_type, status: network.status })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await patchJson(token, 'inventory/networks', network.id, { ...form, gateway: form.gateway || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditing(false)
    await onChanged()
  }

  if (editing) return <form className="form-grid compact-form" onSubmit={save}>
    <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
    <label>CIDR<input value={form.cidr} onChange={(event) => setForm({ ...form, cidr: event.target.value })} required /></label>
    <label>Gateway<input value={form.gateway} onChange={(event) => setForm({ ...form, gateway: event.target.value })} /></label>
    <label>Type<select value={form.network_type} onChange={(event) => setForm({ ...form, network_type: event.target.value })}><option value="lan">LAN</option><option value="wan">WAN</option><option value="management">Management</option><option value="loopback">Loopback</option></select></label>
    <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="active">Active</option><option value="retired">Retired</option></select></label>
    {error && <p className="form-error">{error}</p>}
    <div className="edit-actions"><button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button><button type="button" className="filter-button" onClick={() => setEditing(false)}>Cancel</button></div>
  </form>

  return <div className="table-row"><div><strong>{network.name}</strong><span>{network.network_type} - {network.cidr}</span></div><div className="project-meta"><span className={`status-badge ${network.status}`}>{network.status}</span><button type="button" className="filter-button" onClick={() => setEditing(true)}>Edit</button></div></div>
}

function VlanSection({ token, site, vlans, onChanged }: { token: string; site: Site; vlans: Vlan[]; onChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ vlan_id: '', name: '', subnet: '', gateway: '', status: 'planned' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postJson(token, 'inventory/vlans', { ...form, site_id: site.id, vlan_id: Number(form.vlan_id), subnet: form.subnet || null, gateway: form.gateway || null })
    if (failure) { setError(failure); setSubmitting(false); return }
    setForm({ vlan_id: '', name: '', subnet: '', gateway: '', status: 'planned' })
    setShowForm(false)
    setSubmitting(false)
    await onChanged()
  }

  return <div className="inventory-section">
    <div className="section-header"><h4>VLANs ({vlans.length})</h4><button type="button" className="filter-button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : '+ Add'}</button></div>
    {showForm && <form className="form-grid compact-form" onSubmit={submit}>
      <label>VLAN ID<input type="number" min={1} max={4094} value={form.vlan_id} onChange={(event) => setForm({ ...form, vlan_id: event.target.value })} required /></label>
      <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <label>Subnet<input value={form.subnet} onChange={(event) => setForm({ ...form, subnet: event.target.value })} /></label>
      <label>Gateway<input value={form.gateway} onChange={(event) => setForm({ ...form, gateway: event.target.value })} /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save VLAN'}</button>
    </form>}
    {vlans.length === 0 ? <p className="muted">No VLANs added to this site yet.</p> : <div className="data-table">
      {vlans.map((vlan) => <VlanRow key={vlan.id} token={token} vlan={vlan} onChanged={onChanged} />)}
    </div>}
  </div>
}

function VlanRow({ token, vlan, onChanged }: { token: string; vlan: Vlan; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ vlan_id: String(vlan.vlan_id), name: vlan.name, subnet: vlan.subnet ?? '', gateway: vlan.gateway ?? '', status: vlan.status })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await patchJson(token, 'inventory/vlans', vlan.id, { ...form, vlan_id: Number(form.vlan_id), subnet: form.subnet || null, gateway: form.gateway || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditing(false)
    await onChanged()
  }

  if (editing) return <form className="form-grid compact-form" onSubmit={save}>
    <label>VLAN ID<input type="number" min={1} max={4094} value={form.vlan_id} onChange={(event) => setForm({ ...form, vlan_id: event.target.value })} required /></label>
    <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
    <label>Subnet<input value={form.subnet} onChange={(event) => setForm({ ...form, subnet: event.target.value })} /></label>
    <label>Gateway<input value={form.gateway} onChange={(event) => setForm({ ...form, gateway: event.target.value })} /></label>
    <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="active">Active</option><option value="retired">Retired</option></select></label>
    {error && <p className="form-error">{error}</p>}
    <div className="edit-actions"><button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button><button type="button" className="filter-button" onClick={() => setEditing(false)}>Cancel</button></div>
  </form>

  return <div className="table-row"><div><strong>VLAN {vlan.vlan_id} - {vlan.name}</strong><span>{vlan.subnet ?? 'No subnet'}</span></div><div className="project-meta"><span className={`status-badge ${vlan.status}`}>{vlan.status}</span><button type="button" className="filter-button" onClick={() => setEditing(true)}>Edit</button></div></div>
}

function RoutingSection({ token, site, entries, onChanged }: { token: string; site: Site; entries: SiteRouting[]; onChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ protocol: 'static', local_asn: '', remote_asn: '', ospf_area: '', next_hop: '', status: 'planned', notes: '' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postJson(token, 'routing/site-routing', { ...form, site_id: site.id, local_asn: form.local_asn ? Number(form.local_asn) : null, remote_asn: form.remote_asn ? Number(form.remote_asn) : null, ospf_area: form.ospf_area || null, next_hop: form.next_hop || null, notes: form.notes || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setForm({ protocol: 'static', local_asn: '', remote_asn: '', ospf_area: '', next_hop: '', status: 'planned', notes: '' })
    setShowForm(false)
    await onChanged()
  }

  return <div className="inventory-section">
    <div className="section-header"><h4>Underlay routing ({entries.length})</h4><button type="button" className="filter-button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : '+ Add'}</button></div>
    {showForm && <form className="form-grid compact-form" onSubmit={submit}>
      <label>Protocol<select value={form.protocol} onChange={(event) => setForm({ ...form, protocol: event.target.value })}><option value="static">Static</option><option value="bgp">BGP</option><option value="ospf">OSPF</option></select></label>
      <label>Local ASN<input value={form.local_asn} onChange={(event) => setForm({ ...form, local_asn: event.target.value })} /></label>
      <label>Remote ASN<input value={form.remote_asn} onChange={(event) => setForm({ ...form, remote_asn: event.target.value })} /></label>
      <label>OSPF area<input value={form.ospf_area} onChange={(event) => setForm({ ...form, ospf_area: event.target.value })} /></label>
      <label>Next hop<input value={form.next_hop} onChange={(event) => setForm({ ...form, next_hop: event.target.value })} /></label>
      <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="active">Active</option><option value="retired">Retired</option></select></label>
      <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save routing'}</button>
    </form>}
    {entries.length === 0 ? <p className="muted">No routing defined for this site yet.</p> : <div className="data-table">
      {entries.map((entry) => <RoutingRow key={entry.id} token={token} entry={entry} onChanged={onChanged} />)}
    </div>}
  </div>
}

function RoutingRow({ token, entry, onChanged }: { token: string; entry: SiteRouting; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ protocol: entry.protocol, local_asn: entry.local_asn == null ? '' : String(entry.local_asn), remote_asn: entry.remote_asn == null ? '' : String(entry.remote_asn), ospf_area: entry.ospf_area ?? '', next_hop: entry.next_hop ?? '', status: entry.status, notes: entry.notes ?? '' })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await patchJson(token, 'routing/site-routing', entry.id, { ...form, local_asn: form.local_asn ? Number(form.local_asn) : null, remote_asn: form.remote_asn ? Number(form.remote_asn) : null, ospf_area: form.ospf_area || null, next_hop: form.next_hop || null, notes: form.notes || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditing(false)
    await onChanged()
  }

  async function remove() {
    if (!window.confirm('Delete this routing entry?')) return
    if (await deleteJson(token, 'routing/site-routing', entry.id)) await onChanged()
  }

  if (editing) return <form className="form-grid compact-form" onSubmit={save}>
    <label>Protocol<select value={form.protocol} onChange={(event) => setForm({ ...form, protocol: event.target.value })}><option value="static">Static</option><option value="bgp">BGP</option><option value="ospf">OSPF</option></select></label>
    <label>Local ASN<input value={form.local_asn} onChange={(event) => setForm({ ...form, local_asn: event.target.value })} /></label>
    <label>Remote ASN<input value={form.remote_asn} onChange={(event) => setForm({ ...form, remote_asn: event.target.value })} /></label>
    <label>OSPF area<input value={form.ospf_area} onChange={(event) => setForm({ ...form, ospf_area: event.target.value })} /></label>
    <label>Next hop<input value={form.next_hop} onChange={(event) => setForm({ ...form, next_hop: event.target.value })} /></label>
    <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="active">Active</option><option value="retired">Retired</option></select></label>
    <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} /></label>
    {error && <p className="form-error">{error}</p>}
    <div className="edit-actions"><button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button><button type="button" className="filter-button" onClick={() => setEditing(false)}>Cancel</button></div>
  </form>

  const summary = entry.protocol === 'bgp' ? `AS ${entry.local_asn ?? '?'} to AS ${entry.remote_asn ?? '?'}` : entry.protocol === 'ospf' ? `Area ${entry.ospf_area ?? '0'}` : entry.next_hop ? `Next hop ${entry.next_hop}` : 'No next hop set'

  return <div className="table-row"><div><strong>{entry.protocol.toUpperCase()}</strong><span>{summary}</span></div><div className="project-meta"><span className={`status-badge ${entry.status}`}>{entry.status}</span><button type="button" className="filter-button" onClick={() => setEditing(true)}>Edit</button><button type="button" className="filter-button" onClick={() => void remove()}>Delete</button></div></div>
}

function AdvertisedSection({ token, site, routingEntries, networks, onChanged }: { token: string; site: Site; routingEntries: SiteRouting[]; networks: AdvertisedNetwork[]; onChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ routing_id: '', name: '', cidr: '', status: 'advertised', notes: '' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postJson(token, 'routing/advertised-networks', { ...form, site_id: site.id, routing_id: form.routing_id ? Number(form.routing_id) : null, notes: form.notes || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setForm({ routing_id: '', name: '', cidr: '', status: 'advertised', notes: '' })
    setShowForm(false)
    await onChanged()
  }

  return <div className="inventory-section">
    <div className="section-header"><h4>Advertised networks ({networks.length})</h4><button type="button" className="filter-button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : '+ Add'}</button></div>
    {showForm && <form className="form-grid compact-form" onSubmit={submit}>
      <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <label>CIDR<input placeholder="10.10.0.0/24" value={form.cidr} onChange={(event) => setForm({ ...form, cidr: event.target.value })} required /></label>
      <label>Advertised via<select value={form.routing_id} onChange={(event) => setForm({ ...form, routing_id: event.target.value })}><option value="">Not linked</option>{routingEntries.map((entry) => <option key={entry.id} value={String(entry.id)}>{entry.protocol.toUpperCase()}</option>)}</select></label>
      <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="advertised">Advertised</option><option value="withdrawn">Withdrawn</option></select></label>
      <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save network'}</button>
    </form>}
    {networks.length === 0 ? <p className="muted">No internal networks marked for advertisement yet.</p> : <div className="data-table">
      {networks.map((network) => <AdvertisedRow key={network.id} token={token} network={network} routingEntries={routingEntries} onChanged={onChanged} />)}
    </div>}
  </div>
}

function AdvertisedRow({ token, network, routingEntries, onChanged }: { token: string; network: AdvertisedNetwork; routingEntries: SiteRouting[]; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ routing_id: network.routing_id == null ? '' : String(network.routing_id), name: network.name, cidr: network.cidr, status: network.status, notes: network.notes ?? '' })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await patchJson(token, 'routing/advertised-networks', network.id, { ...form, routing_id: form.routing_id ? Number(form.routing_id) : null, notes: form.notes || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditing(false)
    await onChanged()
  }

  async function remove() {
    if (!window.confirm('Delete this advertised network?')) return
    if (await deleteJson(token, 'routing/advertised-networks', network.id)) await onChanged()
  }

  if (editing) return <form className="form-grid compact-form" onSubmit={save}>
    <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
    <label>CIDR<input value={form.cidr} onChange={(event) => setForm({ ...form, cidr: event.target.value })} required /></label>
    <label>Advertised via<select value={form.routing_id} onChange={(event) => setForm({ ...form, routing_id: event.target.value })}><option value="">Not linked</option>{routingEntries.map((entry) => <option key={entry.id} value={String(entry.id)}>{entry.protocol.toUpperCase()}</option>)}</select></label>
    <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="advertised">Advertised</option><option value="withdrawn">Withdrawn</option></select></label>
    <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} /></label>
    {error && <p className="form-error">{error}</p>}
    <div className="edit-actions"><button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button><button type="button" className="filter-button" onClick={() => setEditing(false)}>Cancel</button></div>
  </form>

  return <div className="table-row"><div><strong>{network.name}</strong><span>{network.cidr}</span></div><div className="project-meta"><span className={`status-badge ${network.status}`}>{network.status}</span><button type="button" className="filter-button" onClick={() => setEditing(true)}>Edit</button><button type="button" className="filter-button" onClick={() => void remove()}>Delete</button></div></div>
}

function SecureEdgeSection({ token, site, projectId, edges, onChanged }: { token: string; site: Site; projectId: number; edges: SecureEdge[]; onChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ edge_name: '', edge_type: 'zscaler', transport: 'internet', status: 'planned', notes: '' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postJson(token, 'overlay/secure-edges', { ...form, project_id: projectId, site_id: site.id, notes: form.notes || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setForm({ edge_name: '', edge_type: 'zscaler', transport: 'internet', status: 'planned', notes: '' })
    setShowForm(false)
    await onChanged()
  }

  return <div className="inventory-section">
    <div className="section-header"><h4>Secure-edge connections ({edges.length})</h4><button type="button" className="filter-button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : '+ Add'}</button></div>
    <p className="muted">Only record exceptions such as Zscaler or Netskope.</p>
    {showForm && <form className="form-grid compact-form" onSubmit={submit}>
      <label>Edge name<input placeholder="Zscaler Internet Access" value={form.edge_name} onChange={(event) => setForm({ ...form, edge_name: event.target.value })} required /></label>
      <label>Edge type<select value={form.edge_type} onChange={(event) => setForm({ ...form, edge_type: event.target.value })}><option value="zscaler">Zscaler</option><option value="netskope">Netskope</option><option value="other">Other</option></select></label>
      <label>Transport<select value={form.transport} onChange={(event) => setForm({ ...form, transport: event.target.value })}><option value="internet">Internet</option><option value="mpls">MPLS</option><option value="private">Private transport</option><option value="lte_5g">LTE / 5G</option></select></label>
      <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="provisioning">Provisioning</option><option value="active">Active</option><option value="down">Down</option></select></label>
      <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save secure edge'}</button>
    </form>}
    {edges.length === 0 ? <p className="muted">No secure-edge connections for this site yet.</p> : <div className="data-table">
      {edges.map((edge) => <SecureEdgeRow key={edge.id} token={token} edge={edge} onChanged={onChanged} />)}
    </div>}
  </div>
}

function SecureEdgeRow({ token, edge, onChanged }: { token: string; edge: SecureEdge; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ edge_name: edge.edge_name, edge_type: edge.edge_type, transport: edge.transport, status: edge.status, notes: edge.notes ?? '' })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await patchJson(token, 'overlay/secure-edges', edge.id, { ...form, notes: form.notes || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditing(false)
    await onChanged()
  }

  async function remove() {
    if (!window.confirm('Delete this secure-edge connection?')) return
    if (await deleteJson(token, 'overlay/secure-edges', edge.id)) await onChanged()
  }

  if (editing) return <form className="form-grid compact-form" onSubmit={save}>
    <label>Edge name<input value={form.edge_name} onChange={(event) => setForm({ ...form, edge_name: event.target.value })} required /></label>
    <label>Edge type<select value={form.edge_type} onChange={(event) => setForm({ ...form, edge_type: event.target.value })}><option value="zscaler">Zscaler</option><option value="netskope">Netskope</option><option value="other">Other</option></select></label>
    <label>Transport<select value={form.transport} onChange={(event) => setForm({ ...form, transport: event.target.value })}><option value="internet">Internet</option><option value="mpls">MPLS</option><option value="private">Private transport</option><option value="lte_5g">LTE / 5G</option></select></label>
    <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="provisioning">Provisioning</option><option value="active">Active</option><option value="down">Down</option></select></label>
    <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} /></label>
    {error && <p className="form-error">{error}</p>}
    <div className="edit-actions"><button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button><button type="button" className="filter-button" onClick={() => setEditing(false)}>Cancel</button></div>
  </form>

  return <div className="table-row"><div><strong>{edge.edge_name}</strong><span>{edge.edge_type} - {edge.transport}</span></div><div className="project-meta"><span className={`status-badge ${edge.status}`}>{edge.status}</span><button type="button" className="filter-button" onClick={() => setEditing(true)}>Edit</button><button type="button" className="filter-button" onClick={() => void remove()}>Delete</button></div></div>
}

export default SitesWorkspace
