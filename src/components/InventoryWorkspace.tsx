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

  return <div className="workspace-grid"><section className="panel workflow-register"><div className="panel-heading"><div><h3>Inventory by site</h3><p className="muted">Client → Project → Site → network inventory. Edit any existing record to correct its data.</p></div><span className="panel-label">{devices.length + circuits.length + networks.length + vlans.length + interfaces.length} total</span></div>{error && <p className="form-error">{error}</p>}{clients.length === 0 ? <div className="empty-state compact"><span>No clients available</span></div> : <div className="hierarchy-stack">{clients.map((client) => <div key={client.id} className="hierarchy-card"><div className="hierarchy-header"><div><strong>{client.name}</strong><span>{client.client_code}</span></div><span className="muted-tag">Client</span></div>{projects.filter((project) => project.client_id === client.id).map((project) => <div key={project.id} className="nested-project"><div className="hierarchy-header"><div><strong>{project.name}</strong><span>{project.project_code}</span></div><span className="muted-tag">Project</span></div>{sites.filter((site) => site.project_id === project.id).map((site) => <div key={site.id} className="inventory-site"><div className="hierarchy-header"><div><strong>{site.name}</strong><span>{site.site_code}</span></div><span className="muted-tag">Site</span></div><div className="data-table">{devices.filter((item) => item.site_id === site.id).map((item) => <InventoryRow key={`device-${item.id}`} label={item.hostname} detail={`${item.role}${item.management_ip ? ` · ${item.management_ip}` : ''}`} status={item.status} onEdit={() => setEditing({ type: 'device', id: item.id })} />)}{circuits.filter((item) => item.site_id === site.id).map((item) => <InventoryRow key={`circuit-${item.id}`} label={item.name} detail={`${item.provider} · ${item.role}${item.bandwidth_mbps ? ` · ${item.bandwidth_mbps} Mbps` : ''}`} status={item.status} onEdit={() => setEditing({ type: 'circuit', id: item.id })} />)}{networks.filter((item) => item.site_id === site.id).map((item) => <InventoryRow key={`network-${item.id}`} label={item.name} detail={`${item.network_type} · ${item.cidr}`} status={item.status} onEdit={() => setEditing({ type: 'network', id: item.id })} />)}{vlans.filter((item) => item.site_id === site.id).map((item) => <InventoryRow key={`vlan-${item.id}`} label={`VLAN ${item.vlan_id} · ${item.name}`} detail={item.subnet ?? 'No subnet'} status={item.status} onEdit={() => setEditing({ type: 'vlan', id: item.id })} />)}{interfaces.filter((item) => item.site_id === site.id).map((item) => <InventoryRow key={`interface-${item.id}`} label={item.name} detail={`${item.interface_role}${item.ip_address ? ` · ${item.ip_address}` : ''}`} status={item.status} onEdit={() => setEditing({ type: 'interface', id: item.id })} />)}</div></div>)}</div>)}</div>)}</div>}</section><InventoryEditor editing={editing} devices={devices} circuits={circuits} networks={networks} vlans={vlans} interfaces={interfaces} onCancel={() => setEditing(null)} onSave={save} /></div>
}

function InventoryRow({ label, detail, status, onEdit }: { label: string; detail: string; status: string; onEdit: () => void }) { return <div className="table-row"><div><strong>{label}</strong><span>{detail}</span></div><div className="project-meta"><span className={`status-badge ${status}`}>{status}</span><button className="filter-button" onClick={onEdit}>Edit</button></div></div> }

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

export default InventoryWorkspace
