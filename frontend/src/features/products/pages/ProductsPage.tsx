import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageOpen, Search, Sparkles } from 'lucide-react'
import { apiClient } from '../../../shared/api/client'
import { useAuth } from '../../../app/providers/AuthProvider'

type Product = {
  id: number
  name: string
}

export function ProductsPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const productCount = useMemo(() => products.length, [products])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    const loadProducts = async () => {
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
          return typeof candidate.id === 'number' && typeof candidate.name === 'string'
        })

        setProducts(cleanedProducts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos.')
      } finally {
        setLoading(false)
      }
    }

    void loadProducts()
  }, [isAuthenticated, navigate])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Productos</p>
          <h2 className="mt-2 text-2xl font-semibold">Listado de productos</h2>
          <p className="mt-2 text-sm text-slate-400">Aquí verás los productos disponibles desde la API.</p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-400">
          <Search className="h-4 w-4" />
          <span>{productCount} productos cargados</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center text-slate-300">Cargando productos...</div>
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div> : null}

      {!loading && !error ? (
        products.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-cyan-500/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400">
                    <PackageOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-slate-400">Producto activo</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/70 p-10 text-center text-slate-300">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">No hay productos disponibles</h3>
            <p className="mt-2 text-sm text-slate-400">La API respondió vacía, pero la pantalla ya está preparada para mostrar los datos cuando lleguen.</p>
          </div>
        )
      ) : null}
    </div>
  )
}
