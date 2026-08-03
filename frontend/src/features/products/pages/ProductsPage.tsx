import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoaderCircle, PackageOpen, Search, Sparkles } from 'lucide-react'
import { apiClient } from '../../../shared/api/client'
import { useAuth } from '../../../app/providers/AuthProvider'
import { useTranslation } from '../../../shared/i18n'

type Product = {
  id: string | number
  name: string
}

export function ProductsPage() {
  const SEARCH_DEBOUNCE_MS = 400
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  const productCount = useMemo(() => products.length, [products])
  const isTyping = searchTerm.trim() !== debouncedSearchTerm

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchTerm])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    const loadInitialProducts = async () => {
      setError(null)
      setLoading(true)

      try {
        const response = await apiClient.get('/products')
        const payload = response.data
        const normalizedProducts = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.products)
            ? payload.products
            : Array.isArray(payload?.data)
              ? payload.data
              : []

        const cleanedProducts = normalizedProducts.filter((item: unknown): item is Product => {
          if (!item || typeof item !== 'object') {
            return false
          }

          const candidate = item as Partial<Product>
          return (typeof candidate.id === 'string' || typeof candidate.id === 'number') && typeof candidate.name === 'string'
        })

        setProducts(cleanedProducts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos.')
      } finally {
        setLoading(false)
      }
    }

    void loadInitialProducts()
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    if (!debouncedSearchTerm) {
      setSearchResults([])
      setSearchError(null)
      setSearchLoading(false)
      return
    }

    const loadSearchResults = async () => {
      setSearchError(null)
      setSearchLoading(true)

      try {
        const response = await apiClient.get('/products', {
          params: { filter: debouncedSearchTerm },
        })
        const payload = response.data
        const normalizedProducts = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.products)
            ? payload.products
            : Array.isArray(payload?.data)
              ? payload.data
              : []

        const cleanedProducts = normalizedProducts.filter((item: unknown): item is Product => {
          if (!item || typeof item !== 'object') {
            return false
          }

          const candidate = item as Partial<Product>
          return (typeof candidate.id === 'string' || typeof candidate.id === 'number') && typeof candidate.name === 'string'
        })

        setSearchResults(cleanedProducts)
      } catch (err) {
        setSearchResults([])
        setSearchError(err instanceof Error ? err.message : 'No se pudieron buscar productos.')
      } finally {
        setSearchLoading(false)
      }
    }

    void loadSearchResults()
  }, [debouncedSearchTerm, isAuthenticated])

  const showDropdown = searchTerm.trim().length > 0 && !isTyping && !loading && !error

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">{t('products.sectionTitle')}</p>
          <h2 className="mt-2 text-2xl font-semibold">{t('products.title')}</h2>
          <p className="mt-2 text-sm text-slate-400">{t('products.subtitle')}</p>
        </div>

        <div className="relative w-full max-w-md">
          <label htmlFor="products-search" className="sr-only">
            {t('products.search.label')}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              id="products-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('products.search.placeholder')}
              className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
            {!isTyping && searchLoading ? <LoaderCircle className="h-4 w-4 animate-spin text-cyan-400" /> : null}
          </div>

          {showDropdown ? (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-xl shadow-slate-950/40">
              {searchLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300">
                  <LoaderCircle className="h-4 w-4 animate-spin text-cyan-400" />
                  <span>{t('products.search.loading')}</span>
                </div>
              ) : searchError ? (
                <p className="px-3 py-2 text-sm text-rose-300">{searchError}</p>
              ) : searchResults.length > 0 ? (
                <ul className="max-h-72 overflow-auto py-1">
                  {searchResults.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/products/${product.id}`)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-cyan-500/10 hover:text-cyan-200"
                      >
                        <PackageOpen className="h-4 w-4 text-cyan-400" />
                        <span className="truncate">{product.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-sm text-slate-400">{t('products.search.noResults')}</p>
              )}
            </div>
          ) : null}

          {!showDropdown ? (
            <p className="mt-2 text-right text-xs text-slate-500">{t('common.productsLoaded', { count: productCount })}</p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center text-slate-300">{t('common.loading')}</div>
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div> : null}

      {!loading && !error ? (
        products.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => navigate(`/products/${product.id}`)}
                className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-left shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-cyan-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400">
                    <PackageOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-slate-400">{t('common.activeProduct')}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/70 p-10 text-center text-slate-300">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">{t('common.noProductsTitle')}</h3>
            <p className="mt-2 text-sm text-slate-400">{t('common.noProductsDescription')}</p>
          </div>
        )
      ) : null}
    </div>
  )
}
