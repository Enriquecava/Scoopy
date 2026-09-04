import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { apiClient } from '../../../shared/api/client'
import { useTranslation } from '../../../shared/i18n'

export function AdminPage() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (role !== 'admin') {
    navigate('/products', { replace: true })
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    setIsSubmitting(true)

    try {
      await apiClient.post('/users', {
        user: { email, password, password_confirmation: passwordConfirmation },
      })
      setEmail('')
      setPassword('')
      setPasswordConfirmation('')
      setFeedback({ type: 'success', message: t('admin.userCreated') })
    } catch (error: unknown) {
      const response = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number; data?: { errors?: string[] } } }).response
        : undefined
      const message = response?.status === 403
        ? t('auth.errors.forbidden')
        : response?.data?.errors?.[0] ?? t('admin.createError')
      setFeedback({ type: 'error', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button type="button" onClick={() => navigate('/products')} className="text-sm text-slate-400 transition hover:text-slate-100">
        {t('admin.backToProducts')}
      </button>
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
        <div className="flex items-center gap-3">
          <UserPlus className="h-6 w-6 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-semibold">{t('admin.title')}</h2>
            <p className="mt-1 text-sm text-slate-400">{t('admin.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-300">
            {t('admin.email')}
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500/50" />
          </label>
          <label className="block text-sm text-slate-300">
            {t('admin.password')}
            <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500/50" />
          </label>
          <label className="block text-sm text-slate-300">
            {t('admin.passwordConfirmation')}
            <input required minLength={6} type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500/50" />
          </label>
          {feedback ? <p className={feedback.type === 'success' ? 'rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300' : 'rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300'}>{feedback.message}</p> : null}
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? t('admin.creating') : t('admin.createUser')}
          </button>
        </form>
      </section>
    </div>
  )
}
