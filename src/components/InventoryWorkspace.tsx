import { FormEvent, useEffect, useState } from 'react'

type Client = { id: number; name: string; client_code: string }
type Project = { id: number; client_id: number; name: string; project_code: string }
type Site = { id: number; project_id: number; name: string; site_code: string }
type Device = { id: number; site_id: number; hostname: string; role: string; vendor: string | null; model: string | null; management_ip: string | null; status: string }
type Circuit = { id: number; site_id: number; name: string; provider: string; circuit_type: string; role: string; bandwidth_mbps: number | null; public_ip: string | null; status: string }
type Network = { id: number; site_id: number; name: string; cidr: string; gateway: string | null; network_type: string; status: string }
type Vlan = { id: number; site_id: number; vlan_id: number; name: string; subnet: string | null; gateway: string | null; status: string }
type NetworkInterface = { id: number; site_id: number; device_id: number; name: string; interface_role: string; ip_address: string | null; connected_to: string | null; status: string }
type Props = { token: string; clients: Client[]; projects: Project[]; sites: Site[]; devices: Device[]; circuits: Circuit[]; networks: Network[]; vlans: Vlan[]; interfaces: NetworkInterface[]; onInventoryChanged: () => Promise<void> }
type EditState = { type: 'device' | 'circuit' | 'network' | 'vlan' | 'interface'; id: number } | null
type EditableRecord = { id: number; status: string; [key: string]: unknown }

const endpointByType = { device: 'devices', circuit: 'circuits', network: 'networks', vlan: 'vlans', interface: 'interfaces' } as const

function InventoryWorkspace({ token, clients, projects, sites, devices, circuits, networks, vlans, interfaces, onInventoryChanged }: Props) {
  const [editing, setEditing] = useState<EditState>(null)
  const [error, setError] = useState('')

  async function save(type: NonNullable<EditState>['type'], id: number, values: Record<string, unknown>) {
    setError('')
    const response = await fetch(`/api/inventory/${endpointByType[type]}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(values) })
    if (!response.ok) { setError(`Unable to update ${type}`); return }
    setEditing(null)
    await onInventoryChanged()
  }

  return <div className="workspace-grid">
    <section className="panel workflow-register">
      <div className="panel-heading"><div><h3>Inventory by site</h3><p className="muted">Client Project Site network inventory. Edit any existing record to correct its data.</p></div><span className="panel-label">{devices.length + circuits.length + networks.length + vlans.length + interfaces.length} total</span></div>
      {error && <p className="form-error">{error}</p>}
      {clients.length === 0 ? <div className="empty-state compact"><span>No clients available</span></div> : <div className="hierarchy-stack">
        {clients.map((client) => <div key={client.id} className="hierarchy-card">
          <div className="hierarchy-header"><div><strong>{client.name}</strong><span>{client.client_code}</span></div><span className="muted-tag">Client</span></div>
          {projects.filter((project) => project.client_id === client.id).map((project) => <div key={project.id} className="nested-project">
            <div className="hierarchy-header"><div><strong>{project.name}</strong><span>{project.project_code}</span></div><span className="muted-tag">Project</span></div>
            {sites.filter((site) => site.project_id === project.id).map((site) => <div key={site.id} className="inventory-site">
              <div className="hierarchy-header"><div><strong>{site.name}</strong><span>{site.site_code}</span></div><span className="muted-tag">Site</span></div>
              <div className="data-table">
                {devices.filter((item) => item.site_id === site.id).map((item) => <InventoryRow key={`device-${item.id}`} label={item.hostname} detail={`${item.role}${item.management_ip ? ` - ${item.management_ip}` : ''}`} status={item.status} onEdit={() => setEditing({ type: 'device', id: item.id })} />)}
                {circuits.filter((item) => item.site_id === site.id).map((item) => <InventoryRow key={`circuit-${item.id}`} label={item.name} detail={`${item.provider} - ${item.role}${item.bandwidth_mbps ? ` - ${item.bandwidth_mbps} Mbps` : ''}`} status={item.status} onEdit={() => setEditing({ type: 'circuit', id: item.id })} />)}
                {networks.filter((item) => item.site_id === site.id).map((item) => <InventoryRow key={`network-${item.id}`} label={item.name} detail={`${item.network_type} - ${item.cidr}`} status={item.status} onEdit={() => setEditing({ type: 'network', id: item.id })} />)}
                {vlans.filter((item) => item.site_id === site.id).map((item) => <InventoryRow key={`vlan-${item.id}`} label={`VLAN ${item.vlan_id} - ${item.name}`} detail={item.subnet ?? 'No subnet'} status={item.status} onEdit={() => setEditing({ type: 'vlan', id: item.id })} />)}
                {interfaces.filter((item) => item.site_id === site.id).map((item) => <InventoryRow key={`interface-${item.id}`} label={item.name} detail={`${item.interface_role}${item.ip_address ? ` - ${item.ip_address}` : ''}`} status={item.status} onEdit={() => setEditing({ type: 'interface', id: item.id })} />)}
              </div>
            </div>)}
          </div>)}
        </div>)}
      </div>}
    </section>
    <InventoryEditor editing={editing} devices={devices} circuits={circuits} networks={networks} vlans={vlans} interfaces={interfaces} onCancel={() => setEditing(null)} onSave={save} />
    <InventoryAddForms token={token} sites={sites} devices={devices} onInventoryChanged={onInventoryChanged} />
  </div>
}

function InventoryRow({ label, detail, status, onEdit }: { label: string; detail: string; status: string; onEdit: () => void }) {
  return <div className="table-row"><div><strong>{label}</strong><span>{detail}</span></div><div className="project-meta"><span className={`status-badge ${status}`}>{status}</span><button className="filter-button" onClick={onEdit}>Edit</button></div></div>
}

function InventoryEditor({ editing, devices, circuits, networks, vlans, interfaces, onCancel, onSave }: { editing: EditState; devices: Device[]; circuits: Circuit[]; networks: Network[]; vlans: Vlan[]; interfaces: NetworkInterface[]; onCancel: () => void; onSave: (type: NonNullable<EditState>['type'], id: number, values: Record<string, unknown>) => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!editing) { setValues({}); return }
    const records: Record<NonNullable<EditState>['type'], EditableRecord[]> = { device: devices, circuit: circuits, network: networks, vlan: vlans, interface: interfaces }
    const record = records[editing.type].find((item) => item.id === editing.id)
    if (!record) return
    const fields = editing.type === 'device' ? ['hostname', 'role', 'vendor', 'model', 'management_ip', 'status'] : editing.type === 'circuit' ? ['name', 'provider', 'circuit_type', 'role', 'bandwidth_mbps', 'public_ip', 'status'] : editing.type === 'network' ? ['name', 'cidr', 'gateway', 'network_type', 'status'] : editing.type === 'vlan' ? ['vlan_id', 'name', 'subnet', 'gateway', 'status'] : ['name', 'interface_role', 'ip_address', 'connected_to', 'status']
    setValues(Object.fromEntries(fields.map((field) => [field, record[field] == null ? '' : String(record[field])])))
  }, [editing, devices, circuits, networks, vlans, interfaces])
  if (!editing) return <section className="panel"><div className="panel-heading"><div><h3>Inventory editor</h3><p className="muted">Select Edit on any inventory record to correct its details.</p></div></div><div className="empty-state compact"><span>No record selected</span></div></section>
  const fields = Object.keys(values)
  return <section className="panel"><div className="panel-heading"><div><h3>Edit {editing.type}</h3><p className="muted">Update the record without changing its site relationship.</p></div></div><form className="form-grid" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const payload: Record<string, unknown> = { ...values }; if (editing.type === 'circuit' && values.bandwidth_mbps) payload.bandwidth_mbps = Number(values.bandwidth_mbps); if (editing.type === 'vlan') payload.vlan_id = Number(values.vlan_id); void onSave(editing.type, editing.id, payload) }}>{fields.map((field) => <label key={field}>{field.replaceAll('_', ' ')}<input value={values[field]} onChange={(event) => setValues({ ...values, [field]: event.target.value })} /></label>)}<div className="edit-actions"><button className="primary-button">Save changes</button><button type="button" className="filter-button" onClick={onCancel}>Cancel</button></div></form></section>
}

function InventoryAddForms({ token, sites, devices, onInventoryChanged }: { token: string; sites: Site[]; devices: Device[]; onInventoryChanged: () => Promise<void> }) {
  const [deviceForm, setDeviceForm] = useState({ site_id: '', hostname: '', role: 'sdwan_edge', vendor: '', model: '', management_ip: '', status: 'planned', description: '' })
  const [circuitForm, setCircuitForm] = useState({ site_id: '', name: '', provider: '', circuit_type: 'internet', role: 'primary', bandwidth_mbps: '', public_ip: '', status: 'planned', description: '' })
  const [networkForm, setNetworkForm] = useState({ site_id: '', name: '', cidr: '', gateway: '', network_type: 'lan', status: 'planned' })
  const [vlanForm, setVlanForm] = useState({ site_id: '', vlan_id: '', name: '', subnet: '', gateway: '', status: 'planned' })
  const [interfaceForm, setInterfaceForm] = useState({ site_id: '', device_id: '', name: '', interface_role: 'lan', ip_address: '', connected_to: '', status: 'planned' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function post(path: string, body: Record<string, unknown>, onSuccess: () => void, failMessage: string) {
    setError(''); setSubmitting(true)
    try {
      const response = await fetch(`/api/inventory/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      if (!response.ok) throw new Error(failMessage)
      onSuccess()
      await onInventoryChanged()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : failMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return <section className="panel"><div className="panel-heading"><div><h3>Add inventory</h3><p className="muted">Capture the facts used later for diagrams and LLDs.</p></div></div>
    {error && <p className="form-error">{error}</p>}
    <form className="form-grid" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void post('devices', { ...deviceForm, site_id: Number(deviceForm.site_id), vendor: deviceForm.vendor || null, model: deviceForm.model || null, management_ip: deviceForm.management_ip || null, description: deviceForm.description || null }, () => setDeviceForm({ site_id: '', hostname: '', role: 'sdwan_edge', vendor: '', model: '', management_ip: '', status: 'planned', description: '' }), 'Unable to create device') }}>
      <h4>New device</h4>
      <label>Site<select value={deviceForm.site_id} onChange={(event) => setDeviceForm({ ...deviceForm, site_id: event.target.value })} required><option value="">Select site</option>{sites.map((site) => <option key={site.id} value={String(site.id)}>{site.name}</option>)}</select></label>
      <label>Hostname<input value={deviceForm.hostname} onChange={(event) => setDeviceForm({ ...deviceForm, hostname: event.target.value })} required /></label>
      <label>Role<select value={deviceForm.role} onChange={(event) => setDeviceForm({ ...deviceForm, role: event.target.value })}><option value="sdwan_edge">SD-WAN edge</option><option value="firewall">Firewall</option><option value="core_switch">Core switch</option><option value="access_switch">Access switch</option><option value="controller">Controller</option></select></label>
      <label>Vendor<input value={deviceForm.vendor} onChange={(event) => setDeviceForm({ ...deviceForm, vendor: event.target.value })} /></label>
      <label>Model<input value={deviceForm.model} onChange={(event) => setDeviceForm({ ...deviceForm, model: event.target.value })} /></label>
      <label>Management IP<input value={deviceForm.management_ip} onChange={(event) => setDeviceForm({ ...deviceForm, management_ip: event.target.value })} /></label>
      <label>Status<select value={deviceForm.status} onChange={(event) => setDeviceForm({ ...deviceForm, status: event.target.value })}><option value="planned">Planned</option><option value="ordered">Ordered</option><option value="staged">Staged</option><option value="deployed">Deployed</option></select></label>
      <label>Description<textarea value={deviceForm.description} onChange={(event) => setDeviceForm({ ...deviceForm, description: event.target.value })} rows={2} /></label>
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save device'}</button>
    </form>
    <form className="form-grid workflow-form-divider" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void post('circuits', { ...circuitForm, site_id: Number(circuitForm.site_id), bandwidth_mbps: circuitForm.bandwidth_mbps ? Number(circuitForm.bandwidth_mbps) : null, public_ip: circuitForm.public_ip || null, description: circuitForm.description || null }, () => setCircuitForm({ site_id: '', name: '', provider: '', circuit_type: 'internet', role: 'primary', bandwidth_mbps: '', public_ip: '', status: 'planned', description: '' }), 'Unable to create WAN circuit') }}>
      <h4>New WAN circuit</h4>
      <label>Site<select value={circuitForm.site_id} onChange={(event) => setCircuitForm({ ...circuitForm, site_id: event.target.value })} required><option value="">Select site</option>{sites.map((site) => <option key={site.id} value={String(site.id)}>{site.name}</option>)}</select></label>
      <label>Circuit name<input value={circuitForm.name} onChange={(event) => setCircuitForm({ ...circuitForm, name: event.target.value })} required /></label>
      <label>Provider<input value={circuitForm.provider} onChange={(event) => setCircuitForm({ ...circuitForm, provider: event.target.value })} required /></label>
      <label>Type<select value={circuitForm.circuit_type} onChange={(event) => setCircuitForm({ ...circuitForm, circuit_type: event.target.value })}><option value="internet">Internet</option><option value="mpls">MPLS</option><option value="private_ethernet">Private Ethernet</option><option value="lte_5g">LTE / 5G</option></select></label>
      <label>Role<select value={circuitForm.role} onChange={(event) => setCircuitForm({ ...circuitForm, role: event.target.value })}><option value="primary">Primary</option><option value="backup">Backup</option><option value="tertiary">Tertiary</option></select></label>
      <label>Bandwidth (Mbps)<input type="number" min={0} value={circuitForm.bandwidth_mbps} onChange={(event) => setCircuitForm({ ...circuitForm, bandwidth_mbps: event.target.value })} /></label>
      <label>Public IP<input value={circuitForm.public_ip} onChange={(event) => setCircuitForm({ ...circuitForm, public_ip: event.target.value })} /></label>
      <label>Status<select value={circuitForm.status} onChange={(event) => setCircuitForm({ ...circuitForm, status: event.target.value })}><option value="planned">Planned</option><option value="ordered">Ordered</option><option value="provisioning">Provisioning</option><option value="live">Live</option></select></label>
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save circuit'}</button>
    </form>
    <form className="form-grid workflow-form-divider" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void post('networks', { ...networkForm, site_id: Number(networkForm.site_id), gateway: networkForm.gateway || null }, () => setNetworkForm({ site_id: '', name: '', cidr: '', gateway: '', network_type: 'lan', status: 'planned' }), 'Unable to create IP network') }}>
      <h4>New IP network</h4>
      <label>Site<select value={networkForm.site_id} onChange={(event) => setNetworkForm({ ...networkForm, site_id: event.target.value })} required><option value="">Select site</option>{sites.map((site) => <option key={site.id} value={String(site.id)}>{site.name}</option>)}</select></label>
      <label>Name<input value={networkForm.name} onChange={(event) => setNetworkForm({ ...networkForm, name: event.target.value })} required /></label>
      <label>CIDR<input placeholder="10.10.0.0/24" value={networkForm.cidr} onChange={(event) => setNetworkForm({ ...networkForm, cidr: event.target.value })} required /></label>
      <label>Gateway<input value={networkForm.gateway} onChange={(event) => setNetworkForm({ ...networkForm, gateway: event.target.value })} /></label>
      <label>Type<select value={networkForm.network_type} onChange={(event) => setNetworkForm({ ...networkForm, network_type: event.target.value })}><option value="lan">LAN</option><option value="wan">WAN</option><option value="management">Management</option><option value="loopback">Loopback</option></select></label>
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save network'}</button>
    </form>
    <form className="form-grid workflow-form-divider" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void post('vlans', { ...vlanForm, site_id: Number(vlanForm.site_id), vlan_id: Number(vlanForm.vlan_id), subnet: vlanForm.subnet || null, gateway: vlanForm.gateway || null }, () => setVlanForm({ site_id: '', vlan_id: '', name: '', subnet: '', gateway: '', status: 'planned' }), 'Unable to create VLAN') }}>
      <h4>New VLAN</h4>
      <label>Site<select value={vlanForm.site_id} onChange={(event) => setVlanForm({ ...vlanForm, site_id: event.target.value })} required><option value="">Select site</option>{sites.map((site) => <option key={site.id} value={String(site.id)}>{site.name}</option>)}</select></label>
      <label>VLAN ID<input type="number" min={1} max={4094} value={vlanForm.vlan_id} onChange={(event) => setVlanForm({ ...vlanForm, vlan_id: event.target.value })} required /></label>
      <label>Name<input value={vlanForm.name} onChange={(event) => setVlanForm({ ...vlanForm, name: event.target.value })} required /></label>
      <label>Subnet<input value={vlanForm.subnet} onChange={(event) => setVlanForm({ ...vlanForm, subnet: event.target.value })} /></label>
      <label>Gateway<input value={vlanForm.gateway} onChange={(event) => setVlanForm({ ...vlanForm, gateway: event.target.value })} /></label>
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save VLAN'}</button>
    </form>
    <form className="form-grid workflow-form-divider" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void post('interfaces', { ...interfaceForm, site_id: Number(interfaceForm.site_id), device_id: Number(interfaceForm.device_id), ip_address: interfaceForm.ip_address || null, connected_to: interfaceForm.connected_to || null }, () => setInterfaceForm({ site_id: '', device_id: '', name: '', interface_role: 'lan', ip_address: '', connected_to: '', status: 'planned' }), 'Unable to create interface') }}>
      <h4>New interface</h4>
      <label>Site<select value={interfaceForm.site_id} onChange={(event) => setInterfaceForm({ ...interfaceForm, site_id: event.target.value, device_id: '' })} required><option value="">Select site</option>{sites.map((site) => <option key={site.id} value={String(site.id)}>{site.name}</option>)}</select></label>
      <label>Device<select value={interfaceForm.device_id} onChange={(event) => setInterfaceForm({ ...interfaceForm, device_id: event.target.value })} required><option value="">Select device</option>{devices.filter((device) => device.site_id === Number(interfaceForm.site_id)).map((device) => <option key={device.id} value={String(device.id)}>{device.hostname}</option>)}</select></label>
      <label>Interface<input placeholder="ge-0/0/0" value={interfaceForm.name} onChange={(event) => setInterfaceForm({ ...interfaceForm, name: event.target.value })} required /></label>
      <label>Role<select value={interfaceForm.interface_role} onChange={(event) => setInterfaceForm({ ...interfaceForm, interface_role: event.target.value })}><option value="lan">LAN</option><option value="wan">WAN</option><option value="management">Management</option><option value="loopback">Loopback</option></select></label>
      <label>IP address<input value={interfaceForm.ip_address} onChange={(event) => setInterfaceForm({ ...interfaceForm, ip_address: event.target.value })} /></label>
      <label>Connected to<input value={interfaceForm.connected_to} onChange={(event) => setInterfaceForm({ ...interfaceForm, connected_to: event.target.value })} /></label>
      <button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save interface'}</button>
    </form>
  </section>
}

export default InventoryWorkspace
