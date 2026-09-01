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

const modules: Module[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'See delivery health at a glance.', icon: Gauge },
  { id: 'clients', label: 'Clients', description: 'Manage client information.', icon: Users },
  { id: 'projects', label: 'Projects', description: 'Track delivery projects.', icon: FolderKanban },
  { id: 'sites', label: 'Sites', description: 'Maintain site and network data.', icon: Network },
  { id: 'raid', label: 'RAID Log', description: 'Track risks and dependencies.', icon: ClipboardList },
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

  useEffect(() => {
    void loadClients()
    void loadProjects()
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
          {activeModule === 'dashboard' ? <Dashboard clients={clients} projects={projects} /> : activeModule === 'clients' ? <ClientWorkspace token={token} clients={clients} onClientsChanged={loadClients} /> : activeModule === 'projects' ? <ProjectWorkspace token={token} clients={clients} projects={projects} onProjectsChanged={loadProjects} /> : <ModulePlaceholder module={active} ActiveIcon={ActiveIcon} />}
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

function Dashboard({ clients, projects }: { clients: ClientRecord[]; projects: ProjectRecord[] }) {
  return <>
    <section className="metric-grid">
      <Metric label="Active clients" value={String(clients.length)} detail={clients.length === 1 ? 'Client tracked' : 'Clients tracked'} />
      <Metric label="Active projects" value={String(projects.length)} detail={projects.length === 1 ? 'Project in flight' : 'Projects in flight'} />
      <Metric label="Open RAID items" value="0" detail="No risks or issues logged" />
      <Metric label="Overall health" value={projects.length > 0 ? 'Live' : 'Ready'} detail={projects.length > 0 ? 'The portfolio is active' : 'Pilot workspace'} accent />
    </section>
    <section className="dashboard-grid">
      <div className="panel panel-large"><div className="panel-heading"><div><h3>Project portfolio</h3><p className="muted">Live delivery overview for the current tenant.</p></div><span className="panel-label">Phase 3</span></div>
        {projects.length === 0 ? <div className="empty-state"><FolderKanban size={34} /><strong>No projects yet</strong><span>Create your first project in the Projects workspace.</span></div> : <div className="list-stack">{projects.slice(0, 4).map((project) => <div key={project.id} className="list-item"><div><strong>{project.name}</strong><span>{project.project_code}</span></div><span className={`status-badge ${project.status}`}>{project.status}</span></div>)}</div>}
      </div>
      <div className="panel"><div className="panel-heading"><div><h3>Client coverage</h3><p className="muted">Key customers and accounts</p></div></div>
        {clients.length === 0 ? <div className="empty-state compact"><Users size={29} /><span>No clients entered yet</span></div> : <div className="list-stack compact">{clients.slice(0, 5).map((client) => <div key={client.id} className="list-item"><div><strong>{client.name}</strong><span>{client.client_code}</span></div><span className="muted-tag">{client.status}</span></div>)}</div>}
      </div>
    </section>
  </>
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

  return <div className="workspace-grid"><section className="panel"><div className="panel-heading"><div><h3>Project list</h3><p className="muted">Delivery portfolio and health status</p></div><span className="panel-label">{projects.length} total</span></div>
    {projects.length === 0 ? <div className="empty-state compact"><FolderKanban size={29} /><span>No projects available</span></div> : <div className="data-table">{projects.map((project) => <div key={project.id} className="table-row"><div><strong>{project.name}</strong><span>{project.project_code}</span></div><div className="project-meta"><span className={`status-badge ${project.status}`}>{project.status}</span><span className="muted-tag">{project.health}</span></div></div>)}</div>}
  </section>
    <section className="panel"><div className="panel-heading"><div><h3>Add project</h3><p className="muted">Track a new SD-WAN delivery engagement</p></div><span className="panel-label"><Plus size={14} /></span></div>
      <form className="form-grid" onSubmit={submit}><label>Client<select value={form.client_id} onChange={(event) => setForm({ ...form, client_id: event.target.value })} required>
        <option value="">Select client</option>
        {clients.map((client) => <option key={client.id} value={String(client.id)}>{client.name}</option>)}
      </select></label><label>Project name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Project code<input value={form.project_code} onChange={(event) => setForm({ ...form, project_code: event.target.value })} required /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planning">Planning</option><option value="active">Active</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select></label><label>Health<select value={form.health} onChange={(event) => setForm({ ...form, health: event.target.value })}><option value="green">Green</option><option value="amber">Amber</option><option value="red">Red</option></select></label><label>Completion %<input type="number" min={0} max={100} value={form.completion_percentage} onChange={(event) => setForm({ ...form, completion_percentage: Number(event.target.value) })} /></label><label>Start date<input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></label><label>Target completion<input type="date" value={form.target_completion_date} onChange={(event) => setForm({ ...form, target_completion_date: event.target.value })} /></label><label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={submitting}>{submitting ? 'Saving...' : 'Save project'}</button></form>
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
