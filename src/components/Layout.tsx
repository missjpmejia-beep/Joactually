import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../lib/app'

const icons = {
  today: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
  ),
  patterns: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-6 4 3 6-8" /><path d="M4 20h16" /></svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16" /><circle cx="15" cy="8" r="2.2" /><circle cx="9" cy="16" r="2.2" /></svg>
  ),
}

const tabs = [
  { to: '/', label: 'Today', icon: icons.today, end: true },
  { to: '/patterns', label: 'Patterns', icon: icons.patterns },
  { to: '/history', label: 'History', icon: icons.history },
  { to: '/settings', label: 'Settings', icon: icons.settings },
]

export function Layout() {
  const { toast, hideToast } = useApp()
  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <div className="nav-brand">Jo, Actually.</div>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className="nav-link">
            {t.icon}
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="main">
        <Outlet />
      </main>
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span className="toast-text">{toast.text}</span>
          {toast.actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={'toast-btn' + (a.primary ? ' primary' : '')}
              onClick={() => {
                hideToast()
                a.onClick()
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
