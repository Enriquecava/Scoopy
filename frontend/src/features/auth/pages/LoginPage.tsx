import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider'
import { LoginForm } from '../components/LoginForm'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/products', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (email: string, password: string) => {
    try {
      await login(email, password)
      navigate('/products', { replace: true })
    } catch {
      // The auth provider already stores the error message.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_55%),linear-gradient(135deg,#020617,#0f172a)] px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-cyan-950/40 backdrop-blur">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-400">Scoopy</p>
          <h1 className="text-3xl font-semibold">Inicia sesión</h1>
          <p className="text-sm text-slate-400">Accede con tu correo y contraseña para ver tus productos.</p>
        </div>

        <LoginForm onSubmit={handleSubmit} isSubmitting={isLoading} error={error} />
      </div>
    </div>
  )
}
