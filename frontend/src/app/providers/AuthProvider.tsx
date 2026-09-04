import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiClient } from '../../shared/api/client'
import { getInitialLocale, translate } from '../../shared/i18n/provider'

function normalizeToken(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed.replace(/^Bearer\s+/i, '') : null
}

type AuthContextValue = {
  token: string | null
  role: 'user' | 'admin' | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const STORAGE_KEY = 'scoopy:token'
const ROLE_STORAGE_KEY = 'scoopy:role'

function getAuthErrorMessage(error: unknown): string {
  const response =
    typeof error === 'object' && error !== null && 'response' in error
      ? (error as { response?: { status?: number; data?: { error?: string; message?: string } } }).response
      : undefined

  if (response?.status === 401) {
    return translate('auth.errors.invalidCredentials', getInitialLocale())
  }

  const backendMessage = response?.data?.error || response?.data?.message
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage
  }

  return translate('auth.errors.loginFailed', getInitialLocale())
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY))
  const [role, setRole] = useState<'user' | 'admin' | null>(() => {
    const storedRole = sessionStorage.getItem(ROLE_STORAGE_KEY)
    return storedRole === 'admin' || storedRole === 'user' ? storedRole : null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    if (token) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
      return
    }

    delete apiClient.defaults.headers.common.Authorization
  }, [token])

  useEffect(() => {
    const handleUnauthorized = () => {
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(ROLE_STORAGE_KEY)
      setToken(null)
      setRole(null)
      setError(translate('auth.errors.sessionExpired', getInitialLocale()))
    }

    window.addEventListener('scoopy:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('scoopy:unauthorized', handleUnauthorized)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const storedToken = sessionStorage.getItem(STORAGE_KEY)
    if (storedToken) {
      setToken(storedToken)
    }
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.post('/users/sign_in', {
        user: {
          email,
          password,
        },
      })

      const authorizationHeader =
        response.headers.authorization ||
        response.headers.Authorization ||
        response.data?.token ||
        response.data?.jwt ||
        response.data?.access_token ||
        response.data?.meta?.token ||
        response.data?.data?.token

      const normalizedToken = normalizeToken(
        authorizationHeader || response.data?.meta?.token || response.data?.data?.token,
      )

      if (!normalizedToken) {
        throw new Error('No se recibió un token válido desde la API.')
      }

      sessionStorage.setItem(STORAGE_KEY, normalizedToken)
      setToken(normalizedToken)
      const nextRole = response.data?.user?.role === 'admin' ? 'admin' : 'user'
      sessionStorage.setItem(ROLE_STORAGE_KEY, nextRole)
      setRole(nextRole)
    } catch (err) {
      const message = getAuthErrorMessage(err)
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(ROLE_STORAGE_KEY)
    setToken(null)
    setRole(null)
    setError(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role,
      isAuthenticated: Boolean(token),
      isLoading: isLoading || !hydrated,
      error,
      login,
      logout,
    }),
    [token, role, isLoading, error, hydrated],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }

  return context
}
