import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../providers/AuthProvider'
import { useTranslation } from '../../shared/i18n'
import type { ReactNode } from 'react'

type MainLayoutProps = {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { logout, role } = useAuth()
  const navigate = useNavigate()
  const { locale, setLocale, t } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/products" className="flex items-center gap-2 text-lg font-semibold">
            <img src="/logo.png" alt="Scoopy" className="h-6 w-6 rounded-md object-cover" />
            {t('common.brand')}
          </Link>

          <div className="flex items-center gap-2">
            {role === 'admin' ? (
              <Link to="/admin" className="rounded-full border border-cyan-500/30 px-3 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/10">
                {t('admin.title')}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
              className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
            >
              {t(`common.language.${locale}`)}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  )
}
