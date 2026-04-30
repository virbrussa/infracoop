import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
  requiredRole?: 'admin' | 'curadora'
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, perfil, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && perfil && perfil.rol !== requiredRole) return <Navigate to="/" replace />
  return <>{children}</>
}
