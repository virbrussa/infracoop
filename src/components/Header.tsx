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

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
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

      </div>
    </header>
  )
}

