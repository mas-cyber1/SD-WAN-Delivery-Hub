import { FormEvent, useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  ClipboardList,
  FileText,
  FolderKanban,
  Gauge,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Users,
  X,
} from 'lucide-react'
import InventoryWorkspace from './components/InventoryWorkspace'

type Module = {
  id: string
  label: string
  description: string
  icon: typeof Gauge
}

type ClientRecord = {
  id: number
  name: string
  client_code: string
  industry: string | null
  status: string
  created_at?: string | null
}

type ProjectRecord = {
  id: number
  client_id: number
  name: string
  project_code: string
  status: string
  health: string
  completion_percentage: number
  description: string | null
  start_date?: string | null
  target_completion_date?: string | null
  created_at?: string | null
}

type SiteRecord = {
  id: number
  project_id: number
  name: string
  site_code: string
  region: string | null
  status: string
  priority: string
  address: string | null
  description: string | null
  created_at?: string | null
}

type RaidItemRecord = {
  id: number
  project_id: number
  item_type: string
  title: string
  description: string | null
  status: string
  priority: string
  owner: string | null
  due_date: string | null
  created_at?: string | null
}

type MilestoneRecord = {
  id: number
  project_id: number
  name: string
  description: string | null
  status: string
  owner: string | null
  due_date: string | null
  completed_date: string | null
  created_at?: string | null
}

type ActionRecord = {
  id: number
  project_id: number
  title: string
  description: string | null
  status: string
  owner: string | null
  due_date: string | null
}

type DecisionRecord = {
  id: number
  project_id: number
  title: string
  decision: string
  decided_by: string | null
  decision_date: string | null
}

type DeviceRecord = {
  id: number
  site_id: number
  hostname: string
  role: string
  vendor: string | null
  model: string | null
  management_ip: string | null
  status: string
  description: string | null
}

type CircuitRecord = {
  id: number
  site_id: number
  name: string
  provider: string
  circuit_type: string
  role: string
  bandwidth_mbps: number | null
  public_ip: string | null
  status: string
  description: string | null
}

type NetworkRecord = { id: number; site_id: number; name: string; cidr: string; gateway: string | null; network_type: string; status: string }
type VlanRecord = { id: number; site_id: number; vlan_id: number; name: string; subnet: string | null; gateway: string | null; status: string }
type InterfaceRecord = { id: number; site_id: number; device_id: number; name: string; interface_role: string; ip_address: string | null; connected_to: string | null; status: string }

const modules: Module[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'See delivery health at a glance.', icon: Gauge },
  { id: 'clients', label: 'Clients', description: 'Manage client information.', icon: Users },
  { id: 'projects', label: 'Projects', description: 'Track delivery projects.', icon: FolderKanban },
  { id: 'sites', label: 'Sites', description: 'Maintain site and network data.', icon: Network },
  { id: 'raid', label: 'RAID Log', description: 'Track risks and dependencies.', icon: ClipboardList },
  { id: 'scheduler', label: 'Scheduler', description: 'Manage milestones and due dates.', icon: ClipboardList },
  { id: 'workflow', label: 'Actions & Decisions', description: 'Track commitments and decisions.', icon: ClipboardList },
  { id: 'inventory', label: 'Network Inventory', description: 'Manage devices and WAN circuits.', icon: Network },
  { id: 'documents', label: 'Documents', description: 'Organise project documents.', icon: FileText },
]

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('sdwan_access_token'))
  const [userName, setUserName] = useState('')

  useEffect(() => {
    if (!token) return
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error('Session expired')
        return response.json() as Promise<{ email: string }>
      })
      .then((user) => setUserName(user.email))
      .catch(() => {
        localStorage.removeItem('sdwan_access_token')
        setToken(null)
      })
  }, [token])

  if (!token) return <Login onLogin={(accessToken, email) => { localStorage.setItem('sdwan_access_token', accessToken); setUserName(email); setToken(accessToken) }} />

  return <AuthenticatedApp token={token} userName={userName} onLogout={() => { localStorage.removeItem('sdwan_access_token'); setToken(null) }} />
}

function AuthenticatedApp({ token, userName, onLogout }: { token: string; userName: string; onLogout: () => void }) {
  const [activeModule, setActiveModule] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [sites, setSites] = useState<SiteRecord[]>([])
  const [raidItems, setRaidItems] = useState<RaidItemRecord[]>([])
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([])
  const [actions, setActions] = useState<ActionRecord[]>([])
  const [decisions, setDecisions] = useState<DecisionRecord[]>([])
  const [devices, setDevices] = useState<DeviceRecord[]>([])
  const [circuits, setCircuits] = useState<CircuitRecord[]>([])
  const [networks, setNetworks] = useState<NetworkRecord[]>([])
  const [vlans, setVlans] = useState<VlanRecord[]>([])
  const [interfaces, setInterfaces] = useState<InterfaceRecord[]>([])
  const active = modules.find((module) => module.id === activeModule) ?? modules[0]
  const ActiveIcon = active.icon

  const loadClients = async () => {
    const response = await fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) {
      const data = (await response.json()) as ClientRecord[]
      setClients(data)
    }
  }

  const loadProjects = async () => {
    const response = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) {
      const data = (await response.json()) as ProjectRecord[]
      setProjects(data)
    }
  }

  const loadSites = async () => {
    const response = await fetch('/api/sites', { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) {
      const data = (await response.json()) as SiteRecord[]
      setSites(data)
    }
  }

  const loadRaidItems = async () => {
    const response = await fetch('/api/raid', { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) {
      const data = (await response.json()) as RaidItemRecord[]
      setRaidItems(data)
    }
  }

  const loadMilestones = async () => {
    const response = await fetch('/api/milestones', { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) {
      const data = (await response.json()) as MilestoneRecord[]
      setMilestones(data)
    }
  }

  const loadWorkflow = async () => {
    const headers = { Authorization: `Bearer ${token}` }
    const [actionsResponse, decisionsResponse] = await Promise.all([fetch('/api/workflow/actions', { headers }), fetch('/api/workflow/decisions', { headers })])
    if (actionsResponse.ok) setActions((await actionsResponse.json()) as ActionRecord[])
    if (decisionsResponse.ok) setDecisions((await decisionsResponse.json()) as DecisionRecord[])
  }

  const loadInventory = async () => {
    const headers = { Authorization: `Bearer ${token}` }
    const [devicesResponse, circuitsResponse, networksResponse, vlansResponse, interfacesResponse] = await Promise.all([fetch('/api/inventory/devices', { headers }), fetch('/api/inventory/circuits', { headers }), fetch('/api/inventory/networks', { headers }), fetch('/api/inventory/vlans', { headers }), fetch('/api/inventory/interfaces', { headers })])
    if (devicesResponse.ok) setDevices((await devicesResponse.json()) as DeviceRecord[])
    if (circuitsResponse.ok) setCircuits((await circuitsResponse.json()) as CircuitRecord[])
    if (networksResponse.ok) setNetworks((await networksResponse.json()) as NetworkRecord[])
    if (vlansResponse.ok) setVlans((await vlansResponse.json()) as VlanRecord[])
    if (interfacesResponse.ok) setInterfaces((await interfacesResponse.json()) as InterfaceRecord[])
  }

  useEffect(() => {
    void loadClients()
    void loadProjects()
    void loadSites()
    void loadRaidItems()
    void loadMilestones()
    void loadWorkflow()
    void loadInventory()
  }, [token])

  return (
    <div className="app-shell">
      <button className="mobile-menu-button icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
        <Menu size={20} />
      </button>
      {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Activity size={19} /></div>
          {!sidebarCollapsed && <div><strong>SD-WAN Delivery Hub</strong><span>Internal pilot</span></div>}
          {mobileOpen && <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button>}
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {modules.map((module) => {
            const Icon = module.icon
            return <button key={module.id} className={`nav-item ${activeModule === module.id ? 'active' : ''}`} onClick={() => { setActiveModule(module.id); setMobileOpen(false) }} title={sidebarCollapsed ? module.label : undefined}>
              <Icon size={18} /><span>{!sidebarCollapsed && module.label}</span>
            </button>
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" title={sidebarCollapsed ? 'Settings' : undefined}><Settings size={18} />{!sidebarCollapsed && <span>Settings</span>}</button>
          <button className="collapse-button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />} {!sidebarCollapsed && 'Collapse navigation'}
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div><p className="eyebrow">Department workspace</p><h1>{active.label}</h1></div>
          <div className="topbar-meta"><span className="status-dot" /> <span>{userName || 'Signed in'}</span><button className="avatar" onClick={onLogout} title="Sign out">MP</button></div>
        </header>
        <div className="content">
          <section className="welcome-row"><div><p className="eyebrow">SD-WAN project delivery</p><h2>{active.label}</h2><p className="muted">{active.description}</p></div><button className="primary-button"><BarChart3 size={17} /> View pilot overview</button></section>
          {activeModule === 'dashboard' ? <Dashboard clients={clients} projects={projects} sites={sites} raidItems={raidItems} milestones={milestones} actions={actions} /> : activeModule === 'clients' ? <ClientWorkspace token={token} clients={clients} onClientsChanged={loadClients} /> : activeModule === 'projects' ? <ProjectWorkspace token={token} clients={clients} projects={projects} onProjectsChanged={loadProjects} /> : activeModule === 'sites' ? <SiteWorkspace token={token} projects={projects} sites={sites} onSitesChanged={loadSites} /> : activeModule === 'raid' ? <RaidWorkspace token={token} clients={clients} projects={projects} raidItems={raidItems} onRaidChanged={loadRaidItems} /> : activeModule === 'scheduler' ? <SchedulerWorkspace token={token} clients={clients} projects={projects} milestones={milestones} onMilestonesChanged={loadMilestones} /> : activeModule === 'workflow' ? <WorkflowWorkspace token={token} clients={clients} projects={projects} actions={actions} decisions={decisions} onWorkflowChanged={loadWorkflow} /> : activeModule === 'inventory' ? <InventoryWorkspace token={token} clients={clients} projects={projects} sites={sites} devices={devices} circuits={circuits} networks={networks} vlans={vlans} interfaces={interfaces} onInventoryChanged={loadInventory} /> : <ModulePlaceholder module={active} ActiveIcon={ActiveIcon} />}
        </div>
      </main>
    </div>
  )
}

function Login({ onLogin }: { onLogin: (token: string, email: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      if (!response.ok) throw new Error('Email or password is incorrect')
      const result = await response.json() as { access_token: string; user: { email: string } }
      onLogin(result.access_token, result.user.email)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in')
    } finally {
      setLoading(false)
    }
  }

  return <main className="login-page"><section className="login-panel"><div className="brand-mark"><Activity size={19} /></div><p className="eyebrow">Internal department workspace</p><h1>SD-WAN Delivery Hub</h1><p className="muted">Sign in to manage project delivery information.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="current-password" /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button login-button" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button></form></section></main>
}

function Dashboard({ clients, projects, sites, raidItems, milestones, actions }: { clients: ClientRecord[]; projects: ProjectRecord[]; sites: SiteRecord[]; raidItems: RaidItemRecord[]; milestones: MilestoneRecord[]; actions: ActionRecord[] }) {
  const clientPortfolio = clients.map((client) => ({
    client,
    projectsForClient: projects.filter((project) => project.client_id === client.id),
    siteCount: sites.filter((site) => projects.some((project) => project.id === site.project_id && project.client_id === client.id)).length,
  }))

  return <>
    <section className="metric-grid">
      <Metric label="Active clients" value={String(clients.length)} detail={clients.length === 1 ? 'Client tracked' : 'Clients tracked'} />
      <Metric label="Active projects" value={String(projects.length)} detail={projects.length === 1 ? 'Project in flight' : 'Projects in flight'} />
      <Metric label="Sites in scope" value={String(sites.length)} detail={sites.length === 1 ? 'Site recorded' : 'Sites recorded'} />
      <Metric label="Open actions" value={String(actions.filter((action) => action.status !== 'completed').length)} detail="Outstanding delivery actions" accent />
    </section>
    <section className="dashboard-grid">
      <div className="panel panel-large"><div className="panel-heading"><div><h3>Portfolio by client</h3><p className="muted">Projects grouped under each client account.</p></div><span className="panel-label">Hierarchy</span></div>
        {clientPortfolio.length === 0 ? <div className="empty-state"><FolderKanban size={34} /><strong>No client hierarchy yet</strong><span>Create a client and assign projects to it.</span></div> : <div className="hierarchy-stack">{clientPortfolio.map(({ client, projectsForClient, siteCount }) => <div key={client.id} className="hierarchy-card"><div className="hierarchy-header"><div><strong>{client.name}</strong><span>{client.client_code}</span></div><span className="muted-tag">{siteCount} sites</span></div>{projectsForClient.length === 0 ? <p className="muted">No projects linked to this client yet.</p> : <div className="nested-list">{projectsForClient.map((project) => <div key={project.id} className="nested-item"><div><strong>{project.name}</strong><span>{project.project_code}</span></div><span className={`status-badge ${project.status}`}>{project.status}</span></div>)}</div>}</div>)}</div>}
      </div>
      <div className="panel"><div className="panel-heading"><div><h3>Client coverage</h3><p className="muted">Key customers and accounts</p></div></div>
        {clients.length === 0 ? <div className="empty-state compact"><Users size={29} /><span>No clients entered yet</span></div> : <div className="list-stack compact">{clients.slice(0, 5).map((client) => <div key={client.id} className="list-item"><div><strong>{client.name}</strong><span>{client.client_code}</span></div><span className="muted-tag">{projects.filter((project) => project.client_id === client.id).length} projects</span></div>)}</div>}
      </div>
    </section>
  </>
}

function RaidWorkspace({ token, clients, projects, raidItems, onRaidChanged }: { token: string; clients: ClientRecord[]; projects: ProjectRecord[]; raidItems: RaidItemRecord[]; onRaidChanged: () => Promise<void> }) {
  const [form, setForm] = useState({ project_id: '', item_type: 'risk', title: '', description: '', status: 'open', priority: 'medium', owner: '', due_date: '' })
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ item_type: 'risk', title: '', description: '', status: 'open', priority: 'medium', owner: '', due_date: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/raid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, project_id: Number(form.project_id), description: form.description || null, owner: form.owner || null, due_date: form.due_date ? new Date(form.due_date).toISOString() : null }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ detail: 'Unable to create RAID item' }))) as { detail?: string }
        throw new Error(payload.detail ?? 'Unable to create RAID item')
      }
      setForm({ project_id: '', item_type: 'risk', title: '', description: '', status: 'open', priority: 'medium', owner: '', due_date: '' })
      await onRaidChanged()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create RAID item')
    } finally {
      setSubmitting(false)
    }
  }

  function beginEdit(item: RaidItemRecord) {
    setError('')
    setEditingId(item.id)
    setEditForm({ item_type: item.item_type, title: item.title, description: item.description ?? '', status: item.status, priority: item.priority, owner: item.owner ?? '', due_date: item.due_date ? item.due_date.slice(0, 10) : '' })
  }

  async function saveEdit(itemId: number) {
    setError('')
    try {
      const response = await fetch(`/api/raid/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...editForm, description: editForm.description || null, owner: editForm.owner || null, due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : null }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ detail: 'Unable to update RAID item' }))) as { detail?: string }
        throw new Error(payload.detail ?? 'Unable to update RAID item')
      }
      setEditingId(null)
      await onRaidChanged()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update RAID item')
    }
  }

  const visibleItems = filter === 'all' ? raidItems : raidItems.filter((item) => item.status === filter)
  const groupedItems = clients.map((client) => ({
    client,
    projectsForClient: projects.filter((project) => project.client_id === client.id).map((project) => ({
      project,
      items: visibleItems.filter((item) => item.project_id === project.id),
    })),
  }))

  return <div className="workspace-grid"><section className="panel"><div className="panel-heading"><div><h3>RAID register</h3><p className="muted">Risks, actions, issues and dependencies linked to projects.</p></div><span className="panel-label">{raidItems.length} total</span></div>
    <div className="filter-row"><button className={`filter-button ${filter === 'all' ? 'selected' : ''}`} onClick={() => setFilter('all')}>All</button><button className={`filter-button ${filter === 'open' ? 'selected' : ''}`} onClick={() => setFilter('open')}>Open</button><button className={`filter-button ${filter === 'in_progress' ? 'selected' : ''}`} onClick={() => setFilter('in_progress')}>In progress</button><button className={`filter-button ${filter === 'closed' ? 'selected' : ''}`} onClick={() => setFilter('closed')}>Closed</button></div>
    {visibleItems.length === 0 ? <div className="empty-state compact"><ClipboardList size={29} /><span>No RAID items match this view</span></div> : <div className="hierarchy-stack">{groupedItems.filter(({ projectsForClient }) => projectsForClient.some(({ items }) => items.length > 0)).map(({ client, projectsForClient }) => <div key={client.id} className="hierarchy-card"><div className="hierarchy-header"><div><strong>{client.name}</strong><span>{client.client_code}</span></div><span className="muted-tag">Client RAID log</span></div><div className="hierarchy-stack">{projectsForClient.filter(({ items }) => items.length > 0).map(({ project, items }) => <div key={project.id} className="nested-project"><div className="hierarchy-header"><div><strong>{project.name}</strong><span>{project.project_code}</span></div><span className="muted-tag">{items.length} items</span></div><div className="nested-list">{items.map((item) => editingId === item.id ? <div key={item.id} className="raid-edit-row"><div className="form-grid compact-form"><label>Title<input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} /></label><label>Type<select value={editForm.item_type} onChange={(event) => setEditForm({ ...editForm, item_type: event.target.value })}><option value="risk">Risk</option><option value="action">Action</option><option value="issue">Issue</option><option value="dependency">Dependency</option></select></label><label>Status<select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></label><label>Priority<select value={editForm.priority} onChange={(event) => setEditForm({ ...editForm, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Owner<input value={editForm.owner} onChange={(event) => setEditForm({ ...editForm, owner: event.target.value })} /></label><label>Due date<input type="date" value={editForm.due_date} onChange={(event) => setEditForm({ ...editForm, due_date: event.target.value })} /></label><label>Description<textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} rows={2} /></label></div><div className="edit-actions"><button className="primary-button" onClick={() => void saveEdit(item.id)}>Save changes</button><button className="filter-button" onClick={() => setEditingId(null)}>Cancel</button></div></div> : <div key={item.id} className="nested-item"><div><strong>{item.title}</strong><span>{item.item_type}{item.owner ? ` · ${item.owner}` : ''}{item.due_date ? ` · due ${new Date(item.due_date).toLocaleDateString()}` : ''}</span></div><div className="project-meta"><span className={`status-badge ${item.priority}`}>{item.priority}</span><span className={`status-badge ${item.status}`}>{item.status}</span><button className="filter-button" onClick={() => beginEdit(item)}>Edit</button></div></div>)}</div></div>)}</div></div>)}</div>}
  </section>
    <section className="panel"><div className="panel-heading"><div><h3>Add RAID item</h3><p className="muted">Capture an item before it becomes a delivery surprise.</p></div><span className="panel-label"><Plus size={14} /></span></div>
      <form className="form-grid" onSubmit={submit}><label>Project<select value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })} required><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={String(project.id)}>{project.name}</option>)}</select></label><label>Type<select value={form.item_type} onChange={(event) => setForm({ ...form, item_type: event.target.value })}><option value="risk">Risk</option><option value="assumption">Assumption</option><option value="issue">Issue</option><option value="dependency">Dependency</option></select></label><label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></label><label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Owner<input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></label><label>Due date<input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></label><label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save RAID item'}</button></form>
    </section>
  </div>
}

function SchedulerWorkspace({ token, clients, projects, milestones, onMilestonesChanged }: { token: string; clients: ClientRecord[]; projects: ProjectRecord[]; milestones: MilestoneRecord[]; onMilestonesChanged: () => Promise<void> }) {
  const [form, setForm] = useState({ project_id: '', name: '', description: '', status: 'planned', owner: '', due_date: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'planned', owner: '', due_date: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/milestones', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, project_id: Number(form.project_id), description: form.description || null, owner: form.owner || null, due_date: form.due_date ? new Date(form.due_date).toISOString() : null }) })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ detail: 'Unable to create milestone' }))) as { detail?: string }
        throw new Error(payload.detail ?? 'Unable to create milestone')
      }
      setForm({ project_id: '', name: '', description: '', status: 'planned', owner: '', due_date: '' })
      await onMilestonesChanged()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create milestone')
    } finally {
      setSubmitting(false)
    }
  }

  function beginMilestoneEdit(milestone: MilestoneRecord) {
    setError('')
    setEditingId(milestone.id)
    setEditForm({ name: milestone.name, description: milestone.description ?? '', status: milestone.status, owner: milestone.owner ?? '', due_date: milestone.due_date ? milestone.due_date.slice(0, 10) : '' })
  }

  async function saveMilestone(milestoneId: number) {
    setError('')
    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...editForm, description: editForm.description || null, owner: editForm.owner || null, due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : null }) })
      if (!response.ok) throw new Error('Unable to update milestone')
      setEditingId(null)
      await onMilestonesChanged()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update milestone')
    }
  }

  const projectDetails = projects.map((project) => ({
    project,
    client: clients.find((client) => client.id === project.client_id),
    milestonesForProject: milestones.filter((milestone) => milestone.project_id === project.id),
  }))

  return <div className="workspace-grid"><section className="panel"><div className="panel-heading"><div><h3>Delivery milestones</h3><p className="muted">Schedule checkpoints grouped by client and project.</p></div><span className="panel-label">{milestones.length} total</span></div>
    {projects.length === 0 ? <div className="empty-state compact"><FolderKanban size={29} /><span>No projects available</span></div> : <div className="hierarchy-stack">{projectDetails.map(({ project, client, milestonesForProject }) => <div key={project.id} className="hierarchy-card"><div className="hierarchy-header"><div><strong>{client?.name ?? 'Unknown client'}</strong><span>{project.name} · {project.project_code}</span></div><span className="muted-tag">{milestonesForProject.length} milestones</span></div>{milestonesForProject.length === 0 ? <p className="muted">No milestones linked to this project yet.</p> : <div className="nested-list">{milestonesForProject.map((milestone) => editingId === milestone.id ? <div key={milestone.id} className="raid-edit-row"><div className="form-grid compact-form"><label>Milestone<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label><label>Status<select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="delayed">Delayed</option></select></label><label>Owner<input value={editForm.owner} onChange={(event) => setEditForm({ ...editForm, owner: event.target.value })} /></label><label>Due date<input type="date" value={editForm.due_date} onChange={(event) => setEditForm({ ...editForm, due_date: event.target.value })} /></label><label>Description<textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} rows={2} /></label></div><div className="edit-actions"><button className="primary-button" onClick={() => void saveMilestone(milestone.id)}>Save changes</button><button className="filter-button" onClick={() => setEditingId(null)}>Cancel</button></div></div> : <div key={milestone.id} className="nested-item"><div><strong>{milestone.name}</strong><span>{milestone.owner ? `Owner: ${milestone.owner}` : 'No owner'}{milestone.due_date ? ` · due ${new Date(milestone.due_date).toLocaleDateString()}` : ''}</span></div><div className="project-meta"><span className={`status-badge ${milestone.status}`}>{milestone.status}</span><button className="filter-button" onClick={() => beginMilestoneEdit(milestone)}>Edit</button></div></div>)}</div>}</div>)}</div>}
  </section>
    <section className="panel"><div className="panel-heading"><div><h3>Add milestone</h3><p className="muted">Create a dated checkpoint for a project.</p></div><span className="panel-label"><Plus size={14} /></span></div>
      <form className="form-grid" onSubmit={submit}><label>Project<select value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })} required><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={String(project.id)}>{project.name}</option>)}</select></label><label>Milestone name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="delayed">Delayed</option></select></label><label>Owner<input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></label><label>Due date<input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></label><label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save milestone'}</button></form>
    </section>
  </div>
}

function WorkflowWorkspace({ token, clients, projects, actions, decisions, onWorkflowChanged }: { token: string; clients: ClientRecord[]; projects: ProjectRecord[]; actions: ActionRecord[]; decisions: DecisionRecord[]; onWorkflowChanged: () => Promise<void> }) {
  const [actionForm, setActionForm] = useState({ project_id: '', title: '', description: '', status: 'open', owner: '', due_date: '' })
  const [decisionForm, setDecisionForm] = useState({ project_id: '', title: '', decision: '', decided_by: '', decision_date: '' })
  const [editingActionId, setEditingActionId] = useState<number | null>(null)
  const [editAction, setEditAction] = useState({ title: '', description: '', status: 'open', owner: '', due_date: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const projectName = (projectId: number) => projects.find((project) => project.id === projectId)?.name ?? 'Unknown project'
  const clientName = (projectId: number) => { const project = projects.find((item) => item.id === projectId); return clients.find((client) => client.id === project?.client_id)?.name ?? 'Unknown client' }

  async function createAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSubmitting(true)
    try {
      const response = await fetch('/api/workflow/actions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...actionForm, project_id: Number(actionForm.project_id), description: actionForm.description || null, owner: actionForm.owner || null, due_date: actionForm.due_date ? new Date(actionForm.due_date).toISOString() : null }) })
      if (!response.ok) throw new Error('Unable to create action')
      setActionForm({ project_id: '', title: '', description: '', status: 'open', owner: '', due_date: '' }); await onWorkflowChanged()
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to create action') } finally { setSubmitting(false) }
  }

  async function createDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSubmitting(true)
    try {
      const response = await fetch('/api/workflow/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...decisionForm, project_id: Number(decisionForm.project_id), decided_by: decisionForm.decided_by || null, decision_date: decisionForm.decision_date ? new Date(decisionForm.decision_date).toISOString() : null }) })
      if (!response.ok) throw new Error('Unable to create decision')
      setDecisionForm({ project_id: '', title: '', decision: '', decided_by: '', decision_date: '' }); await onWorkflowChanged()
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to create decision') } finally { setSubmitting(false) }
  }

  function beginActionEdit(action: ActionRecord) {
    setEditingActionId(action.id)
    setEditAction({ title: action.title, description: action.description ?? '', status: action.status, owner: action.owner ?? '', due_date: action.due_date ? action.due_date.slice(0, 10) : '' })
  }

  async function saveAction(actionId: number) {
    setError('')
    try {
      const response = await fetch(`/api/workflow/actions/${actionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...editAction, description: editAction.description || null, owner: editAction.owner || null, due_date: editAction.due_date ? new Date(editAction.due_date).toISOString() : null }) })
      if (!response.ok) throw new Error('Unable to update action')
      setEditingActionId(null); await onWorkflowChanged()
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Unable to update action') }
  }

  const groupedWork = clients.map((client) => ({
    client,
    projects: projects.filter((project) => project.client_id === client.id).map((project) => ({ project, actions: actions.filter((action) => action.project_id === project.id), decisions: decisions.filter((decision) => decision.project_id === project.id) })).filter(({ actions: projectActions, decisions: projectDecisions }) => projectActions.length > 0 || projectDecisions.length > 0),
  })).filter(({ projects: clientProjects }) => clientProjects.length > 0)

  return <div className="workflow-layout"><section className="panel workflow-register"><div className="panel-heading"><div><h3>Actions and decisions by client</h3><p className="muted">Every item is shown under its client and project.</p></div><span className="panel-label">{actions.length + decisions.length} total</span></div>{groupedWork.length === 0 ? <div className="empty-state compact"><ClipboardList size={29} /><span>No actions or decisions recorded</span></div> : <div className="hierarchy-stack">{groupedWork.map(({ client, projects: clientProjects }) => <div key={client.id} className="hierarchy-card"><div className="hierarchy-header"><div><strong>{client.name}</strong><span>{client.client_code}</span></div><span className="muted-tag">Client workspace</span></div>{clientProjects.map(({ project, actions: projectActions, decisions: projectDecisions }) => <div key={project.id} className="nested-project"><div className="hierarchy-header"><div><strong>{project.name}</strong><span>{project.project_code}</span></div><span className="muted-tag">{projectActions.length} actions · {projectDecisions.length} decisions</span></div>{projectActions.length > 0 && <div className="nested-list">{projectActions.map((action) => editingActionId === action.id ? <div key={action.id} className="raid-edit-row"><div className="form-grid compact-form"><label>Title<input value={editAction.title} onChange={(event) => setEditAction({ ...editAction, title: event.target.value })} /></label><label>Status<select value={editAction.status} onChange={(event) => setEditAction({ ...editAction, status: event.target.value })}><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label><label>Owner<input value={editAction.owner} onChange={(event) => setEditAction({ ...editAction, owner: event.target.value })} /></label><label>Due date<input type="date" value={editAction.due_date} onChange={(event) => setEditAction({ ...editAction, due_date: event.target.value })} /></label><label>Description<textarea value={editAction.description} onChange={(event) => setEditAction({ ...editAction, description: event.target.value })} rows={2} /></label></div><div className="edit-actions"><button className="primary-button" onClick={() => void saveAction(action.id)}>Save changes</button><button className="filter-button" onClick={() => setEditingActionId(null)}>Cancel</button></div></div> : <div key={action.id} className="nested-item"><div><strong>{action.title}</strong><span>Action{action.owner ? ` · ${action.owner}` : ''}{action.due_date ? ` · due ${new Date(action.due_date).toLocaleDateString()}` : ''}</span></div><div className="project-meta"><span className={`status-badge ${action.status}`}>{action.status}</span><button className="filter-button" onClick={() => beginActionEdit(action)}>Edit</button></div></div>)}</div>}{projectDecisions.length > 0 && <div className="nested-list workflow-decisions">{projectDecisions.map((decision) => <div key={decision.id} className="nested-item"><div><strong>{decision.title}</strong><span>Decision{decision.decided_by ? ` · ${decision.decided_by}` : ''}{decision.decision_date ? ` · ${new Date(decision.decision_date).toLocaleDateString()}` : ''}</span><p className="workflow-detail">{decision.decision}</p></div></div>)}</div>}</div>)}</div>)}</div>}
  </section><section className="panel"><div className="panel-heading"><div><h3>Capture workflow item</h3><p className="muted">Add an action or decision to a project.</p></div></div>{error && <p className="form-error">{error}</p>}<form className="form-grid" onSubmit={createAction}><h4>New action</h4><label>Project<select value={actionForm.project_id} onChange={(event) => setActionForm({ ...actionForm, project_id: event.target.value })} required><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={String(project.id)}>{project.name}</option>)}</select></label><label>Title<input value={actionForm.title} onChange={(event) => setActionForm({ ...actionForm, title: event.target.value })} required /></label><label>Status<select value={actionForm.status} onChange={(event) => setActionForm({ ...actionForm, status: event.target.value })}><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label><label>Owner<input value={actionForm.owner} onChange={(event) => setActionForm({ ...actionForm, owner: event.target.value })} /></label><label>Due date<input type="date" value={actionForm.due_date} onChange={(event) => setActionForm({ ...actionForm, due_date: event.target.value })} /></label><label>Description<textarea value={actionForm.description} onChange={(event) => setActionForm({ ...actionForm, description: event.target.value })} rows={2} /></label><button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save action'}</button></form><form className="form-grid workflow-form-divider" onSubmit={createDecision}><h4>New decision</h4><label>Project<select value={decisionForm.project_id} onChange={(event) => setDecisionForm({ ...decisionForm, project_id: event.target.value })} required><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={String(project.id)}>{project.name}</option>)}</select></label><label>Title<input value={decisionForm.title} onChange={(event) => setDecisionForm({ ...decisionForm, title: event.target.value })} required /></label><label>Decided by<input value={decisionForm.decided_by} onChange={(event) => setDecisionForm({ ...decisionForm, decided_by: event.target.value })} /></label><label>Decision date<input type="date" value={decisionForm.decision_date} onChange={(event) => setDecisionForm({ ...decisionForm, decision_date: event.target.value })} /></label><label>Decision<textarea value={decisionForm.decision} onChange={(event) => setDecisionForm({ ...decisionForm, decision: event.target.value })} rows={3} required /></label><button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save decision'}</button></form></section></div>
}

function ClientWorkspace({ token, clients, onClientsChanged }: { token: string; clients: ClientRecord[]; onClientsChanged: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', client_code: '', industry: '', status: 'active' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, industry: form.industry || null }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ detail: 'Unable to create client' }))) as { detail?: string }
        throw new Error(payload.detail ?? 'Unable to create client')
      }
      setForm({ name: '', client_code: '', industry: '', status: 'active' })
      await onClientsChanged()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create client')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="workspace-grid"><section className="panel"><div className="panel-heading"><div><h3>Client list</h3><p className="muted">Current tenant clients and account status</p></div><span className="panel-label">{clients.length} total</span></div>
    {clients.length === 0 ? <div className="empty-state compact"><Users size={29} /><span>No clients available</span></div> : <div className="data-table">{clients.map((client) => <div key={client.id} className="table-row"><div><strong>{client.name}</strong><span>{client.client_code}</span></div><span className={`status-badge ${client.status}`}>{client.status}</span></div>)}</div>}
  </section>
    <section className="panel"><div className="panel-heading"><div><h3>Add client</h3><p className="muted">Create a new customer record</p></div><span className="panel-label"><Plus size={14} /></span></div>
      <form className="form-grid" onSubmit={submit}><label>Client name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Client code<input value={form.client_code} onChange={(event) => setForm({ ...form, client_code: event.target.value })} required /></label><label>Industry<input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Active</option><option value="prospect">Prospect</option><option value="paused">Paused</option></select></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save client'}</button></form>
    </section>
  </div>
}

function ProjectWorkspace({ token, clients, projects, onProjectsChanged }: { token: string; clients: ClientRecord[]; projects: ProjectRecord[]; onProjectsChanged: () => Promise<void> }) {
  const [form, setForm] = useState({ client_id: '', name: '', project_code: '', status: 'planning', health: 'green', completion_percentage: 0, description: '', start_date: '', target_completion_date: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          client_id: Number(form.client_id),
          completion_percentage: Number(form.completion_percentage),
          description: form.description || null,
          start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
          target_completion_date: form.target_completion_date ? new Date(form.target_completion_date).toISOString() : null,
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ detail: 'Unable to create project' }))) as { detail?: string }
        throw new Error(payload.detail ?? 'Unable to create project')
      }
      setForm({ client_id: '', name: '', project_code: '', status: 'planning', health: 'green', completion_percentage: 0, description: '', start_date: '', target_completion_date: '' })
      await onProjectsChanged()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create project')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="workspace-grid"><section className="panel"><div className="panel-heading"><div><h3>Projects by client</h3><p className="muted">Delivery portfolio grouped under the correct client.</p></div><span className="panel-label">{projects.length} total</span></div>
    {clients.length === 0 ? <div className="empty-state compact"><Users size={29} /><span>No clients available</span></div> : <div className="hierarchy-stack">{clients.map((client) => { const clientProjects = projects.filter((project) => project.client_id === client.id); return <div key={client.id} className="hierarchy-card"><div className="hierarchy-header"><div><strong>{client.name}</strong><span>{client.client_code}</span></div><span className="muted-tag">{clientProjects.length} projects</span></div>{clientProjects.length === 0 ? <p className="muted">No projects linked to this client yet.</p> : <div className="nested-list">{clientProjects.map((project) => <div key={project.id} className="nested-item"><div><strong>{project.name}</strong><span>{project.project_code}</span></div><span className={`status-badge ${project.status}`}>{project.status}</span></div>)}</div>}</div>})}</div>}
  </section>
    <section className="panel"><div className="panel-heading"><div><h3>Add project</h3><p className="muted">Track a new SD-WAN delivery engagement</p></div><span className="panel-label"><Plus size={14} /></span></div>
      <form className="form-grid" onSubmit={submit}><label>Client<select value={form.client_id} onChange={(event) => setForm({ ...form, client_id: event.target.value })} required>
        <option value="">Select client</option>
        {clients.map((client) => <option key={client.id} value={String(client.id)}>{client.name}</option>)}
      </select></label><label>Project name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Project code<input value={form.project_code} onChange={(event) => setForm({ ...form, project_code: event.target.value })} required /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planning">Planning</option><option value="active">Active</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select></label><label>Health<select value={form.health} onChange={(event) => setForm({ ...form, health: event.target.value })}><option value="green">Green</option><option value="amber">Amber</option><option value="red">Red</option></select></label><label>Completion %<input type="number" min={0} max={100} value={form.completion_percentage} onChange={(event) => setForm({ ...form, completion_percentage: Number(event.target.value) })} /></label><label>Start date<input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></label><label>Target completion<input type="date" value={form.target_completion_date} onChange={(event) => setForm({ ...form, target_completion_date: event.target.value })} /></label><label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save project'}</button></form>
    </section>
  </div>
}

function SiteWorkspace({ token, projects, sites, onSitesChanged }: { token: string; projects: ProjectRecord[]; sites: SiteRecord[]; onSitesChanged: () => Promise<void> }) {
  const [form, setForm] = useState({ project_id: '', name: '', site_code: '', region: '', status: 'planned', priority: 'normal', address: '', description: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', site_code: '', region: '', status: 'planned', priority: 'normal', address: '', description: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          project_id: Number(form.project_id),
          region: form.region || null,
          address: form.address || null,
          description: form.description || null,
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ detail: 'Unable to create site' }))) as { detail?: string }
        throw new Error(payload.detail ?? 'Unable to create site')
      }
      setForm({ project_id: '', name: '', site_code: '', region: '', status: 'planned', priority: 'normal', address: '', description: '' })
      await onSitesChanged()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create site')
    } finally {
      setSubmitting(false)
    }
  }

  function beginSiteEdit(site: SiteRecord) {
    setError('')
    setEditingId(site.id)
    setEditForm({ name: site.name, site_code: site.site_code, region: site.region ?? '', status: site.status, priority: site.priority, address: site.address ?? '', description: site.description ?? '' })
  }

  async function saveSite(siteId: number) {
    setError('')
    try {
      const response = await fetch(`/api/sites/${siteId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...editForm, region: editForm.region || null, address: editForm.address || null, description: editForm.description || null }) })
      if (!response.ok) throw new Error('Unable to update site')
      setEditingId(null)
      await onSitesChanged()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update site')
    }
  }

  const projectSites = projects.map((project) => ({
    project,
    sitesForProject: sites.filter((site) => site.project_id === project.id),
  }))

  return <div className="workspace-grid"><section className="panel"><div className="panel-heading"><div><h3>Sites by project</h3><p className="muted">Every site is linked to a specific project.</p></div><span className="panel-label">{sites.length} total</span></div>
    {projects.length === 0 ? <div className="empty-state compact"><FolderKanban size={29} /><span>No projects available to link sites</span></div> : <div className="hierarchy-stack">{projectSites.map(({ project, sitesForProject }) => <div key={project.id} className="hierarchy-card"><div className="hierarchy-header"><div><strong>{project.name}</strong><span>{project.project_code}</span></div><span className="muted-tag">{sitesForProject.length} sites</span></div>{sitesForProject.length === 0 ? <p className="muted">No sites linked to this project yet.</p> : <div className="nested-list">{sitesForProject.map((site) => editingId === site.id ? <div key={site.id} className="raid-edit-row"><div className="form-grid compact-form"><label>Site name<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label><label>Site code<input value={editForm.site_code} onChange={(event) => setEditForm({ ...editForm, site_code: event.target.value })} /></label><label>Status<select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}><option value="planned">Planned</option><option value="test_turn_up_only">Test and Turn up Only</option><option value="lan_migrated">LAN migrated</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="blocked">Blocked</option></select></label><label>Priority<select value={editForm.priority} onChange={(event) => setEditForm({ ...editForm, priority: event.target.value })}><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Region<input value={editForm.region} onChange={(event) => setEditForm({ ...editForm, region: event.target.value })} /></label><label>Address<input value={editForm.address} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} /></label><label>Description<textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} rows={2} /></label></div><div className="edit-actions"><button className="primary-button" onClick={() => void saveSite(site.id)}>Save changes</button><button className="filter-button" onClick={() => setEditingId(null)}>Cancel</button></div></div> : <div key={site.id} className="nested-item"><div><strong>{site.name}</strong><span>{site.site_code}</span></div><div className="project-meta"><span className={`status-badge ${site.status}`}>{site.status}</span><button className="filter-button" onClick={() => beginSiteEdit(site)}>Edit</button></div></div>)}</div>}</div>)}</div>}
  </section>
    <section className="panel"><div className="panel-heading"><div><h3>Add site</h3><p className="muted">Track a location and delivery scope</p></div><span className="panel-label"><Plus size={14} /></span></div>
      <form className="form-grid" onSubmit={submit}><label>Project<select value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })} required>
        <option value="">Select project</option>
        {projects.map((project) => <option key={project.id} value={String(project.id)}>{project.name}</option>)}
      </select></label><label>Site name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Site code<input value={form.site_code} onChange={(event) => setForm({ ...form, site_code: event.target.value })} required /></label><label>Region<input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="test_turn_up_only">Test and Turn up Only</option><option value="lan_migrated">LAN migrated</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="blocked">Blocked</option></select></label><label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Address<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save site'}</button></form>
    </section>
  </div>
}

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <div className="metric"><span className="metric-label">{label}</span><strong className={accent ? 'accent-text' : ''}>{value}</strong><span className="muted">{detail}</span></div>
}

function ModulePlaceholder({ module, ActiveIcon }: { module: Module; ActiveIcon: typeof Gauge }) {
  return <div className="panel module-placeholder"><ActiveIcon size={38} /><h3>{module.label} workspace</h3><p className="muted">This module is mapped in the pilot shell and will be connected to secure project data in a later phase.</p><span className="panel-label">Planned module</span></div>
}

export default App
