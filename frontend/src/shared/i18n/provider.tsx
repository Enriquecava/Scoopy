import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translations } from './translations'

export const supportedLocales = ['es', 'en'] as const
export type Locale = (typeof supportedLocales)[number]

const STORAGE_KEY = 'scoopy:locale'

type TranslationDictionary = Record<string, unknown>

type TranslationContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, values?: Record<string, string | number>) => string
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined)

function getNestedValue(dictionary: TranslationDictionary, key: string) {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (typeof current === 'object' && current !== null && segment in current) {
      return (current as Record<string, unknown>)[segment]
    }

    return undefined
  }, dictionary) as string | undefined
}

function normalizeLocale(value: string | null): Locale {
  if (!value) {
    return 'es'
  }

  return supportedLocales.includes(value as Locale) ? (value as Locale) : 'es'
}

export function getInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'es'
  }

  const storedLocale = window.localStorage.getItem(STORAGE_KEY)
  if (storedLocale) {
    return normalizeLocale(storedLocale)
  }

  const browserLocale = window.navigator.language.slice(0, 2)
  return normalizeLocale(browserLocale)
}

export function translate(key: string, locale: Locale = getInitialLocale()) {
  const dictionary = translations[locale] ?? translations.es
  const value = getNestedValue(dictionary, key)
  return typeof value === 'string' ? value : key
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, locale)
    }
  }, [locale])

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale)
  }

  const t = (key: string, values?: Record<string, string | number>) => {
    const template = translate(key, locale)

    if (!values) {
      return template
    }

    return Object.entries(values).reduce((acc, [name, value]) => acc.replace(`{${name}}`, String(value)), template)
  }

  const value = useMemo<TranslationContextValue>(() => ({ locale, setLocale, t }), [locale])

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>
}

export function useTranslation() {
  const context = useContext(TranslationContext)

  if (!context) {
    throw new Error('useTranslation must be used inside a LanguageProvider')
  }

  return context
}
