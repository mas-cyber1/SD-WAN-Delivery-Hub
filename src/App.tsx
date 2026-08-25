import { useState } from 'react'
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

const modules: Module[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'See delivery health at a glance.', icon: Gauge },
  { id: 'clients', label: 'Clients', description: 'Manage client information.', icon: Users },
  { id: 'projects', label: 'Projects', description: 'Track delivery projects.', icon: FolderKanban },
  { id: 'sites', label: 'Sites', description: 'Maintain site and network data.', icon: Network },
  { id: 'raid', label: 'RAID Log', description: 'Track risks and dependencies.', icon: ClipboardList },
  { id: 'documents', label: 'Documents', description: 'Organise project documents.', icon: FileText },
]

function App() {
  const [activeModule, setActiveModule] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const active = modules.find((module) => module.id === activeModule) ?? modules[0]
  const ActiveIcon = active.icon

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
          <div className="topbar-meta"><span className="status-dot" /> <span>Local pilot</span><div className="avatar">MP</div></div>
        </header>
        <div className="content">
          <section className="welcome-row"><div><p className="eyebrow">SD-WAN project delivery</p><h2>{active.label}</h2><p className="muted">{active.description}</p></div><button className="primary-button"><BarChart3 size={17} /> View pilot overview</button></section>
          {activeModule === 'dashboard' ? <Dashboard /> : <ModulePlaceholder module={active} ActiveIcon={ActiveIcon} />}
        </div>
      </main>
    </div>
  )
}

function Dashboard() {
  return <>
    <section className="metric-grid">
      <Metric label="Active projects" value="0" detail="No projects added yet" />
      <Metric label="Sites in delivery" value="0" detail="Ready for project data" />
      <Metric label="Open RAID items" value="0" detail="No risks or issues logged" />
      <Metric label="Overall health" value="Ready" detail="Pilot workspace" accent />
    </section>
    <section className="dashboard-grid">
      <div className="panel panel-large"><div className="panel-heading"><div><h3>Project portfolio</h3><p className="muted">Your department delivery overview will appear here.</p></div><span className="panel-label">Phase 1</span></div><div className="empty-state"><FolderKanban size={34} /><strong>No projects yet</strong><span>Add your first project in the next phase.</span></div></div>
      <div className="panel"><div className="panel-heading"><div><h3>Upcoming work</h3><p className="muted">Milestones and due dates</p></div></div><div className="empty-state compact"><ClipboardList size={29} /><span>No milestones scheduled</span></div></div>
    </section>
  </>
}

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <div className="metric"><span className="metric-label">{label}</span><strong className={accent ? 'accent-text' : ''}>{value}</strong><span className="muted">{detail}</span></div>
}

function ModulePlaceholder({ module, ActiveIcon }: { module: Module; ActiveIcon: typeof Gauge }) {
  return <div className="panel module-placeholder"><ActiveIcon size={38} /><h3>{module.label} workspace</h3><p className="muted">This module is mapped in the pilot shell and will be connected to secure project data in a later phase.</p><span className="panel-label">Planned module</span></div>
}

export default App
