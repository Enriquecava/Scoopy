import { useState } from 'react'
import { Loader2, Lock, Mail } from 'lucide-react'
import { useTranslation } from '../../../shared/i18n'

type LoginFormProps = {
  onSubmit: (email: string, password: string) => Promise<void>
  isSubmitting: boolean
  error: string | null
}

export function LoginForm({ onSubmit, isSubmitting, error }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { t } = useTranslation()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(email, password)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300" htmlFor="email">
          {t('auth.login.emailLabel')}
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-3">
          <Mail className="h-4 w-4 text-cyan-400" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('auth.login.emailPlaceholder')}
            className="w-full bg-transparent text-sm outline-none"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300" htmlFor="password">
          {t('auth.login.passwordLabel')}
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-3">
          <Lock className="h-4 w-4 text-cyan-400" />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('auth.login.passwordPlaceholder')}
            className="w-full bg-transparent text-sm outline-none"
            required
          />
        </div>
      </div>

      {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('auth.login.submitting')}
          </>
        ) : (
          t('auth.login.submit')
        )}
      </button>
    </form>
  )
}
