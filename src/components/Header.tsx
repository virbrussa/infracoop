import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/',          label: '¿Qué es Infra.Coop?',  num: '01' },
  { to: '/brechas',   label: 'Monitor de Brechas',    num: '02' },
  { to: '/colectivo', label: 'Monitor Colectivo',     num: '03' },
  { to: '/datos',     label: '¿Qué datos queremos?',  num: '04' },
  { to: '/ingresar',  label: 'Ingresar datos',        num: '05' },
]

export function Header() {
  const { user, signOut } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  function closeDrawer() { setDrawerOpen(false) }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <NavLink to="/" className="site-logo" aria-label="Infra.Coop inicio">
          <div className="site-logo-text">
            <div className="site-logo-name">
              Infra<span style={{ color: 'var(--accent)' }}>.</span>Coop
            </div>
            <div className="site-logo-sub" aria-hidden="true">Motor de brechas · v0.4</div>
          </div>
        </NavLink>

        {/* Desktop nav */}
        <nav className="site-nav" aria-label="Navegación principal">
          {NAV_ITEMS.map(({ to, label, num }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}
            >
              <span className="nav-pill-num">{num}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop user block */}
        {user && (
          <div className="site-header-user">
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-light)' }}>
              {user.email}
            </span>
            <button
              onClick={signOut}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                padding: '2px 8px',
                border: '1px solid var(--ink-light)',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '3px',
                color: 'var(--ink)',
              }}
            >
              Salir
            </button>
          </div>
        )}

        {/* Hamburger button — mobile only */}
        <button
          className="nav-hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
        >
          ☰
        </button>
      </div>

      {/* Overlay */}
      <div
        className={`nav-drawer-overlay${drawerOpen ? ' open' : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer */}
      <nav
        className={`nav-drawer${drawerOpen ? ' open' : ''}`}
        aria-label="Menú móvil"
      >
        <div className="nav-drawer-header">
          <span className="nav-drawer-title">Menú</span>
          <button
            className="nav-drawer-close"
            onClick={closeDrawer}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <ul className="nav-drawer-list">
          {NAV_ITEMS.map(({ to, label, num }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-drawer-item${isActive ? ' active' : ''}`}
                onClick={closeDrawer}
              >
                <span className="nav-pill-num">{num}</span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {user && (
          <div className="nav-drawer-footer">
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-light)' }}>
              {user.email}
            </span>
            <button
              onClick={() => { signOut(); closeDrawer() }}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '12px',
                padding: '4px 12px',
                border: '1px solid var(--ink-light)',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '3px',
                color: 'var(--ink)',
              }}
            >
              Salir
            </button>
          </div>
        )}
      </nav>
    </header>
  )
}
