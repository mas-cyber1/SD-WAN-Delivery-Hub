import { FormEvent, useState } from 'react'

type Client = { id: number; name: string; client_code: string }
type Project = { id: number; client_id: number; name: string; project_code: string }
type Site = { id: number; project_id: number; name: string; site_code: string }
type Device = { id: number; site_id: number; hostname: string; role: string; vendor: string | null; model: string | null; management_ip: string | null; status: string }
type Circuit = { id: number; site_id: number; name: string; provider: string; circuit_type: string; role: string; bandwidth_mbps: number | null; public_ip: string | null; status: string }
type Network = { id: number; site_id: number; name: string; cidr: string; gateway: string | null; network_type: string; status: string }
type Vlan = { id: number; site_id: number; vlan_id: number; name: string; subnet: string | null; gateway: string | null; status: string }
type NetworkInterface = { id: number; site_id: number; device_id: number; name: string; interface_role: string; ip_address: string | null; connected_to: string | null; status: string }
type Props = { token: string; clients: Client[]; projects: Project[]; sites: Site[]; devices: Device[]; circuits: Circuit[]; networks: Network[]; vlans: Vlan[]; interfaces: NetworkInterface[]; onInventoryChanged: () => Promise<void> }

async function postInventory(token: string, path: string, body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch(`/api/inventory/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  if (response.ok) return null
  const payload = (await response.json().catch(() => ({ detail: 'Request failed' }))) as { detail?: string }
  return payload.detail ?? 'Request failed'
}

async function patchInventory(token: string, path: string, id: number, body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch(`/api/inventory/${path}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  if (response.ok) return null
  const payload = (await response.json().catch(() => ({ detail: 'Request failed' }))) as { detail?: string }
  return payload.detail ?? 'Request failed'
}

function InventoryWorkspace({ token, clients, projects, sites, devices, circuits, networks, vlans, interfaces, onInventoryChanged }: Props) {
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null)
  const [expandedDeviceId, setExpandedDeviceId] = useState<number | null>(null)

  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null
  const selectedProject = selectedSite ? projects.find((project) => project.id === selectedSite.project_id) ?? null : null
  const selectedClient = selectedProject ? clients.find((client) => client.id === selectedProject.client_id) ?? null : null

  function selectSite(id: number) {
    setSelectedSiteId(id)
    setExpandedDeviceId(null)
  }

  return <div className="workspace-grid">
    <section className="panel">
      <div className="panel-heading"><div><h3>Sites</h3><p className="muted">Select a site, then manage its devices, circuits, networks, and VLANs in one place.</p></div></div>
      {clients.length === 0 ? <div className="empty-state compact"><span>No clients available</span></div> : <div className="hierarchy-stack">
        {clients.map((client) => <div key={client.id} className="hierarchy-card">
          <div className="hierarchy-header"><div><strong>{client.name}</strong><span>{client.client_code}</span></div></div>
          {projects.filter((project) => project.client_id === client.id).map((project) => <div key={project.id} className="nested-project">
            <div className="hierarchy-header"><div><strong>{project.name}</strong><span>{project.project_code}</span></div></div>
            <div className="site-picker-list">
              {sites.filter((site) => site.project_id === project.id).length === 0 ? <p className="muted">No sites yet.</p> : sites.filter((site) => site.project_id === project.id).map((site) => <button key={site.id} type="button" className={`site-picker-item ${selectedSiteId === site.id ? 'selected' : ''}`} onClick={() => selectSite(site.id)}>
                <span>{site.name}</span><span className="muted-tag">{site.site_code}</span>
              </button>)}
            </div>
          </div>)}
        </div>)}
      </div>}
    </section>
    <section className="panel workflow-register">
      {!selectedSite ? <div className="empty-state compact"><span>Select a site on the left to manage its inventory.</span></div> : <div>
        <div className="panel-heading"><div><p className="eyebrow">{selectedClient?.name ?? 'Unknown client'} / {selectedProject?.name ?? 'Unknown project'}</p><h3>{selectedSite.name}</h3><p className="muted">{selectedSite.site_code}</p></div></div>
        <DeviceSection
          token={token}
          site={selectedSite}
          devices={devices.filter((device) => device.site_id === selectedSite.id)}
          interfaces={interfaces}
          expandedDeviceId={expandedDeviceId}
          onExpandDevice={(id) => setExpandedDeviceId((current) => (current === id ? null : id))}
          onInventoryChanged={onInventoryChanged}
        />
        <CircuitSection token={token} site={selectedSite} circuits={circuits.filter((circuit) => circuit.site_id === selectedSite.id)} onInventoryChanged={onInventoryChanged} />
        <NetworkSection token={token} site={selectedSite} networks={networks.filter((network) => network.site_id === selectedSite.id)} onInventoryChanged={onInventoryChanged} />
        <VlanSection token={token} site={selectedSite} vlans={vlans.filter((vlan) => vlan.site_id === selectedSite.id)} onInventoryChanged={onInventoryChanged} />
      </div>}
    </section>
  </div>
}

function SectionHeader({ title, count, showForm, onToggle }: { title: string; count: number; showForm: boolean; onToggle: () => void }) {
  return <div className="section-header"><h4>{title} ({count})</h4><button type="button" className="filter-button" onClick={onToggle}>{showForm ? 'Close' : '+ Add'}</button></div>
}

function DeviceSection({ token, site, devices, interfaces, expandedDeviceId, onExpandDevice, onInventoryChanged }: { token: string; site: Site; devices: Device[]; interfaces: NetworkInterface[]; expandedDeviceId: number | null; onExpandDevice: (id: number) => void; onInventoryChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ hostname: '', role: 'sdwan_edge', vendor: '', model: '', management_ip: '', status: 'planned' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postInventory(token, 'devices', { ...form, site_id: site.id, vendor: form.vendor || null, model: form.model || null, management_ip: form.management_ip || null })
    if (failure) { setError(failure); setSubmitting(false); return }
    setForm({ hostname: '', role: 'sdwan_edge', vendor: '', model: '', management_ip: '', status: 'planned' })
    setShowForm(false)
    setSubmitting(false)
    await onInventoryChanged()
  }

  return <div className="inventory-section">
    <SectionHeader title="Devices" count={devices.length} showForm={showForm} onToggle={() => setShowForm(!showForm)} />
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
      {devices.map((device) => <DeviceRow key={device.id} token={token} site={site} device={device} interfaces={interfaces.filter((item) => item.device_id === device.id)} expanded={expandedDeviceId === device.id} onExpand={() => onExpandDevice(device.id)} onInventoryChanged={onInventoryChanged} />)}
    </div>}
  </div>
}

function DeviceRow({ token, site, device, interfaces, expanded, onExpand, onInventoryChanged }: { token: string; site: Site; device: Device; interfaces: NetworkInterface[]; expanded: boolean; onExpand: () => void; onInventoryChanged: () => Promise<void> }) {
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
    const failure = await patchInventory(token, 'devices', device.id, { ...form, vendor: form.vendor || null, model: form.model || null, management_ip: form.management_ip || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditingDevice(false)
    await onInventoryChanged()
  }

  async function saveInterface(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInterfaceError('')
    setInterfaceSubmitting(true)
    const failure = await postInventory(token, 'interfaces', { ...interfaceForm, site_id: site.id, device_id: device.id, ip_address: interfaceForm.ip_address || null, connected_to: interfaceForm.connected_to || null })
    setInterfaceSubmitting(false)
    if (failure) { setInterfaceError(failure); return }
    setInterfaceForm({ name: '', interface_role: 'lan', ip_address: '', connected_to: '', status: 'planned' })
    setShowInterfaceForm(false)
    await onInventoryChanged()
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
        {interfaces.map((item) => <div key={item.id} className="table-row"><div><strong>{item.name}</strong><span>{item.interface_role}{item.ip_address ? ` - ${item.ip_address}` : ''}{item.connected_to ? ` - to ${item.connected_to}` : ''}</span></div><span className={`status-badge ${item.status}`}>{item.status}</span></div>)}
      </div>}
    </div>}
  </div>
}

function CircuitSection({ token, site, circuits, onInventoryChanged }: { token: string; site: Site; circuits: Circuit[]; onInventoryChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', provider: '', circuit_type: 'internet', role: 'primary', bandwidth_mbps: '', public_ip: '', status: 'planned' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postInventory(token, 'circuits', { ...form, site_id: site.id, bandwidth_mbps: form.bandwidth_mbps ? Number(form.bandwidth_mbps) : null, public_ip: form.public_ip || null })
    if (failure) { setError(failure); setSubmitting(false); return }
    setForm({ name: '', provider: '', circuit_type: 'internet', role: 'primary', bandwidth_mbps: '', public_ip: '', status: 'planned' })
    setShowForm(false)
    setSubmitting(false)
    await onInventoryChanged()
  }

  return <div className="inventory-section">
    <SectionHeader title="WAN circuits" count={circuits.length} showForm={showForm} onToggle={() => setShowForm(!showForm)} />
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
      {circuits.map((circuit) => <div key={circuit.id} className="table-row"><div><strong>{circuit.name}</strong><span>{circuit.provider} - {circuit.role}{circuit.bandwidth_mbps ? ` - ${circuit.bandwidth_mbps} Mbps` : ''}</span></div><span className={`status-badge ${circuit.status}`}>{circuit.status}</span></div>)}
    </div>}
  </div>
}

function NetworkSection({ token, site, networks, onInventoryChanged }: { token: string; site: Site; networks: Network[]; onInventoryChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', cidr: '', gateway: '', network_type: 'lan', status: 'planned' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postInventory(token, 'networks', { ...form, site_id: site.id, gateway: form.gateway || null })
    if (failure) { setError(failure); setSubmitting(false); return }
    setForm({ name: '', cidr: '', gateway: '', network_type: 'lan', status: 'planned' })
    setShowForm(false)
    setSubmitting(false)
    await onInventoryChanged()
  }

  return <div className="inventory-section">
    <SectionHeader title="IP networks" count={networks.length} showForm={showForm} onToggle={() => setShowForm(!showForm)} />
    {showForm && <form className="form-grid compact-form" onSubmit={submit}>
      <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <label>CIDR<input placeholder="10.10.0.0/24" value={form.cidr} onChange={(event) => setForm({ ...form, cidr: event.target.value })} required /></label>
      <label>Gateway<input value={form.gateway} onChange={(event) => setForm({ ...form, gateway: event.target.value })} /></label>
      <label>Type<select value={form.network_type} onChange={(event) => setForm({ ...form, network_type: event.target.value })}><option value="lan">LAN</option><option value="wan">WAN</option><option value="management">Management</option><option value="loopback">Loopback</option></select></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save network'}</button>
    </form>}
    {networks.length === 0 ? <p className="muted">No IP networks added to this site yet.</p> : <div className="data-table">
      {networks.map((network) => <div key={network.id} className="table-row"><div><strong>{network.name}</strong><span>{network.network_type} - {network.cidr}</span></div><span className={`status-badge ${network.status}`}>{network.status}</span></div>)}
    </div>}
  </div>
}

function VlanSection({ token, site, vlans, onInventoryChanged }: { token: string; site: Site; vlans: Vlan[]; onInventoryChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ vlan_id: '', name: '', subnet: '', gateway: '', status: 'planned' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postInventory(token, 'vlans', { ...form, site_id: site.id, vlan_id: Number(form.vlan_id), subnet: form.subnet || null, gateway: form.gateway || null })
    if (failure) { setError(failure); setSubmitting(false); return }
    setForm({ vlan_id: '', name: '', subnet: '', gateway: '', status: 'planned' })
    setShowForm(false)
    setSubmitting(false)
    await onInventoryChanged()
  }

  return <div className="inventory-section">
    <SectionHeader title="VLANs" count={vlans.length} showForm={showForm} onToggle={() => setShowForm(!showForm)} />
    {showForm && <form className="form-grid compact-form" onSubmit={submit}>
      <label>VLAN ID<input type="number" min={1} max={4094} value={form.vlan_id} onChange={(event) => setForm({ ...form, vlan_id: event.target.value })} required /></label>
      <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <label>Subnet<input value={form.subnet} onChange={(event) => setForm({ ...form, subnet: event.target.value })} /></label>
      <label>Gateway<input value={form.gateway} onChange={(event) => setForm({ ...form, gateway: event.target.value })} /></label>
      <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="active">Active</option><option value="retired">Retired</option></select></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save VLAN'}</button>
    </form>}
    {vlans.length === 0 ? <p className="muted">No VLANs added to this site yet.</p> : <div className="data-table">
      {vlans.map((vlan) => <div key={vlan.id} className="table-row"><div><strong>VLAN {vlan.vlan_id} - {vlan.name}</strong><span>{vlan.subnet ?? 'No subnet'}</span></div><span className={`status-badge ${vlan.status}`}>{vlan.status}</span></div>)}
    </div>}
  </div>
}

export default InventoryWorkspace
