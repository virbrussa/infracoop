import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Landing } from './pages/Landing'
import { MonitorBrechas } from './pages/MonitorBrechas'
import { MonitorColectivo } from './pages/MonitorColectivo'
import { DatosQueremos } from './pages/DatosQueremos'
import { IngresoForm } from './pages/IngresoForm'
import { SearchIndexProvider } from './context/SearchIndexContext'
import { EmbedderProvider } from './context/EmbedderContext'
import { AuthProvider } from './context/AuthContext'
import { Login } from './pages/Login'
import { Revisar } from './pages/Revisar'
import { Diagnostico } from './pages/Diagnostico'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
    <SearchIndexProvider>
      <EmbedderProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/brechas" element={<MonitorBrechas />} />
          <Route path="/colectivo" element={<MonitorColectivo />} />
          <Route path="/datos" element={<DatosQueremos />} />
          <Route path="/login" element={<Login />} />
          <Route path="/ingresar" element={<IngresoForm />} />
          <Route path="/revisar" element={<ProtectedRoute requiredRole="admin"><Revisar /></ProtectedRoute>} />
          <Route path="/diagnostico" element={<Diagnostico />} />
        </Routes>
        <footer style={{
          borderTop: '1px solid var(--ink-faint)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          color: 'var(--ink-light)',
          maxWidth: 1000,
          margin: '0 auto',
        }}>
          <span>
            Diseño Data Cooperativas Latina, Desarrollo e Implementación{' '}
            <a
              href="https://diversa.studio/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'underline' }}
            >
              Diversa
            </a>
          </span>
          <span>DataCooperativas Latinas. BY-NC-SA</span>
        </footer>
      </BrowserRouter>
      </EmbedderProvider>
    </SearchIndexProvider>
    </AuthProvider>
  )
}
