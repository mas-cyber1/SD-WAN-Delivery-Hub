import { FormEvent, useState } from 'react'

type Client = { id: number; name: string; client_code: string }
type Project = { id: number; client_id: number; name: string; project_code: string }
type Site = { id: number; project_id: number; name: string; site_code: string }
type SiteRouting = { id: number; site_id: number; protocol: string; local_asn: number | null; remote_asn: number | null; ospf_area: string | null; next_hop: string | null; status: string; notes: string | null }
type AdvertisedNetwork = { id: number; site_id: number; routing_id: number | null; name: string; cidr: string; status: string; notes: string | null }
type Props = { token: string; clients: Client[]; projects: Project[]; sites: Site[]; siteRouting: SiteRouting[]; advertisedNetworks: AdvertisedNetwork[]; onRoutingChanged: () => Promise<void> }

async function postJson(token: string, path: string, body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch(`/api/routing/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  if (response.ok) return null
  const payload = (await response.json().catch(() => ({ detail: 'Request failed' }))) as { detail?: string }
  return payload.detail ?? 'Request failed'
}

async function patchJson(token: string, path: string, id: number, body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch(`/api/routing/${path}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  if (response.ok) return null
  const payload = (await response.json().catch(() => ({ detail: 'Request failed' }))) as { detail?: string }
  return payload.detail ?? 'Request failed'
}

async function deleteJson(token: string, path: string, id: number): Promise<boolean> {
  const response = await fetch(`/api/routing/${path}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  return response.ok || response.status === 204
}

function RoutingWorkspace({ token, clients, projects, sites, siteRouting, advertisedNetworks, onRoutingChanged }: Props) {
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null)
  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null
  const selectedProject = selectedSite ? projects.find((project) => project.id === selectedSite.project_id) ?? null : null
  const selectedClient = selectedProject ? clients.find((client) => client.id === selectedProject.client_id) ?? null : null

  return <div className="workspace-grid">
    <section className="panel">
      <div className="panel-heading"><div><h3>Sites</h3><p className="muted">Select a site to define its underlay routing and advertised internal networks.</p></div></div>
      {clients.length === 0 ? <div className="empty-state compact"><span>No clients available</span></div> : <div className="hierarchy-stack">
        {clients.map((client) => <div key={client.id} className="hierarchy-card">
          <div className="hierarchy-header"><div><strong>{client.name}</strong><span>{client.client_code}</span></div></div>
          {projects.filter((project) => project.client_id === client.id).map((project) => <div key={project.id} className="nested-project">
            <div className="hierarchy-header"><div><strong>{project.name}</strong><span>{project.project_code}</span></div></div>
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
      {!selectedSite ? <div className="empty-state compact"><span>Select a site on the left to manage its routing.</span></div> : <div>
        <div className="panel-heading"><div><p className="eyebrow">{selectedClient?.name ?? 'Unknown client'} / {selectedProject?.name ?? 'Unknown project'}</p><h3>{selectedSite.name}</h3><p className="muted">{selectedSite.site_code}</p></div></div>
        <RoutingSection token={token} site={selectedSite} entries={siteRouting.filter((entry) => entry.site_id === selectedSite.id)} onRoutingChanged={onRoutingChanged} />
        <AdvertisedSection token={token} site={selectedSite} routingEntries={siteRouting.filter((entry) => entry.site_id === selectedSite.id)} networks={advertisedNetworks.filter((network) => network.site_id === selectedSite.id)} onRoutingChanged={onRoutingChanged} />
      </div>}
    </section>
  </div>
}

function RoutingSection({ token, site, entries, onRoutingChanged }: { token: string; site: Site; entries: SiteRouting[]; onRoutingChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ protocol: 'static', local_asn: '', remote_asn: '', ospf_area: '', next_hop: '', status: 'planned', notes: '' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postJson(token, 'site-routing', { ...form, site_id: site.id, local_asn: form.local_asn ? Number(form.local_asn) : null, remote_asn: form.remote_asn ? Number(form.remote_asn) : null, ospf_area: form.ospf_area || null, next_hop: form.next_hop || null, notes: form.notes || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setForm({ protocol: 'static', local_asn: '', remote_asn: '', ospf_area: '', next_hop: '', status: 'planned', notes: '' })
    setShowForm(false)
    await onRoutingChanged()
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
      {entries.map((entry) => <RoutingRow key={entry.id} token={token} entry={entry} onRoutingChanged={onRoutingChanged} />)}
    </div>}
  </div>
}

function RoutingRow({ token, entry, onRoutingChanged }: { token: string; entry: SiteRouting; onRoutingChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ protocol: entry.protocol, local_asn: entry.local_asn == null ? '' : String(entry.local_asn), remote_asn: entry.remote_asn == null ? '' : String(entry.remote_asn), ospf_area: entry.ospf_area ?? '', next_hop: entry.next_hop ?? '', status: entry.status, notes: entry.notes ?? '' })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await patchJson(token, 'site-routing', entry.id, { ...form, local_asn: form.local_asn ? Number(form.local_asn) : null, remote_asn: form.remote_asn ? Number(form.remote_asn) : null, ospf_area: form.ospf_area || null, next_hop: form.next_hop || null, notes: form.notes || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditing(false)
    await onRoutingChanged()
  }

  async function remove() {
    if (!window.confirm('Delete this routing entry?')) return
    if (await deleteJson(token, 'site-routing', entry.id)) await onRoutingChanged()
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

function AdvertisedSection({ token, site, routingEntries, networks, onRoutingChanged }: { token: string; site: Site; routingEntries: SiteRouting[]; networks: AdvertisedNetwork[]; onRoutingChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ routing_id: '', name: '', cidr: '', status: 'advertised', notes: '' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await postJson(token, 'advertised-networks', { ...form, site_id: site.id, routing_id: form.routing_id ? Number(form.routing_id) : null, notes: form.notes || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setForm({ routing_id: '', name: '', cidr: '', status: 'advertised', notes: '' })
    setShowForm(false)
    await onRoutingChanged()
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
      {networks.map((network) => <AdvertisedRow key={network.id} token={token} network={network} routingEntries={routingEntries} onRoutingChanged={onRoutingChanged} />)}
    </div>}
  </div>
}

function AdvertisedRow({ token, network, routingEntries, onRoutingChanged }: { token: string; network: AdvertisedNetwork; routingEntries: SiteRouting[]; onRoutingChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ routing_id: network.routing_id == null ? '' : String(network.routing_id), name: network.name, cidr: network.cidr, status: network.status, notes: network.notes ?? '' })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const failure = await patchJson(token, 'advertised-networks', network.id, { ...form, routing_id: form.routing_id ? Number(form.routing_id) : null, notes: form.notes || null })
    setSubmitting(false)
    if (failure) { setError(failure); return }
    setEditing(false)
    await onRoutingChanged()
  }

  async function remove() {
    if (!window.confirm('Delete this advertised network?')) return
    if (await deleteJson(token, 'advertised-networks', network.id)) await onRoutingChanged()
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

export default RoutingWorkspace
