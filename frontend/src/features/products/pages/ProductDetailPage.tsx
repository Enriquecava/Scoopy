import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PackageOpen, TrendingUp } from 'lucide-react'
import { apiClient } from '../../../shared/api/client'
import { useAuth } from '../../../app/providers/AuthProvider'
import { useTranslation } from '../../../shared/i18n'

type ProviderProduct = {
  id: string | number
  provider_id: string | number
  ssn: string | null
  provider_name: string | null
}

type ProductDetail = {
  id: string | number
  name: string
  providers_products?: ProviderProduct[]
}

type PriceHistoryItem = {
  price: number | string
  currency: string | null
  created_at: string
  provider_name: string | null
}

type PriceHistoryPayload = {
  id: string | number
  name: string
  price_history: PriceHistoryItem[]
}

type ScraperIncident = {
  provider_id: string | number
  provider_name: string | null
  created_at: string
}

type ChartPoint = {
  x: number
  y: number
  value: number
  price: number | string
  currency: string
  provider: string
  date: string
  shortDate: string
}

type YAxisDomain = {
  min: number
  max: number
}

const CHART_WIDTH = 620
const CHART_HEIGHT = 220
const CHART_LEFT = 44
const CHART_RIGHT = 596
const CHART_TOP = 24
const CHART_BOTTOM = 196

function getNiceStep(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1
  }

  const exponent = Math.floor(Math.log10(value))
  const fraction = value / 10 ** exponent

  if (fraction <= 1) return 1 * 10 ** exponent
  if (fraction <= 2) return 2 * 10 ** exponent
  if (fraction <= 5) return 5 * 10 ** exponent
  return 10 * 10 ** exponent
}

function getYAxisDomain(values: number[]): YAxisDomain {
  if (values.length === 0) {
    return { min: 0, max: 1 }
  }

  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)

  if (dataMin === dataMax) {
    const padding = Math.max(1, dataMin * 0.1)
    return {
      min: Math.max(0, dataMin - padding),
      max: dataMax + padding,
    }
  }

  const range = dataMax - dataMin
  const rawMin = Math.max(0, dataMin - range * 0.2)
  const rawMax = dataMax + range * 0.25
  const majorStep = getNiceStep((rawMax - rawMin) / 4)
  const minorStep = Math.max(majorStep / 5, 0.01)
  const axisMin = Math.floor(rawMin / minorStep) * minorStep
  const axisMax = Math.ceil(rawMax / majorStep) * majorStep

  return {
    min: axisMin,
    max: axisMax > axisMin ? axisMax : axisMin + majorStep,
  }
}

function formatDate(value: string, locale: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)
}

function formatShortDate(value: string, locale: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatCurrency(value: number, locale: string, currency = 'EUR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { t, locale } = useTranslation()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([])
  const [scraperIncidents, setScraperIncidents] = useState<ScraperIncident[]>([])
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    if (!id) {
      setError('Producto no encontrado.')
      setLoading(false)
      return
    }

    const loadProductDetail = async () => {
      try {
        const [productResponse, historyResponse] = await Promise.all([
          apiClient.get(`/products/${id}`),
          apiClient.get(`/products/${id}/price_history`),
        ])

        const productPayload = productResponse.data as ProductDetail
        const historyPayload = historyResponse.data as PriceHistoryPayload

        setProduct(productPayload)
        setPriceHistory(Array.isArray(historyPayload.price_history) ? historyPayload.price_history : [])

        try {
          const incidentsResponse = await apiClient.get(`/products/${id}/incidents`)
          setScraperIncidents(Array.isArray(incidentsResponse.data) ? incidentsResponse.data : [])
        } catch {
          setScraperIncidents([])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el producto.')
      } finally {
        setLoading(false)
      }
    }

    void loadProductDetail()
  }, [id, isAuthenticated, navigate])

  const lastFetchedAt = useMemo(() => {
    if (priceHistory.length === 0) {
      return null
    }

    const latestEntry = [...priceHistory].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]

    return latestEntry ? formatDate(latestEntry.created_at, locale) : null
  }, [locale, priceHistory])

  const latestPriceByProvider = useMemo(() => {
    const prices = new Map<string, PriceHistoryItem>()

    ;[...priceHistory]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .forEach((entry) => {
        const providerName = entry.provider_name ?? t('products.detail.provider')

        if (!prices.has(providerName)) {
          prices.set(providerName, entry)
        }
      })

    return prices
  }, [priceHistory, t])

  const chartPoints = useMemo(() => {
    const groupedEntries = new Map<string, { entry: PriceHistoryItem; numericPrice: number }>()

    const sortedHistory = [...priceHistory].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

    sortedHistory.forEach((entry) => {
      const numericPrice = Number.parseFloat(String(entry.price))
      if (!Number.isFinite(numericPrice)) {
        return
      }

      const dayKey = new Date(entry.created_at).toISOString().slice(0, 10)
      const current = groupedEntries.get(dayKey)

      if (!current || numericPrice < current.numericPrice) {
        groupedEntries.set(dayKey, { entry, numericPrice })
      }
    })

    const sortedEntries = Array.from(groupedEntries.entries())
      .map(([dayKey, { entry, numericPrice }]) => ({
        dayKey,
        price: entry.price,
        currency: entry.currency ?? 'EUR',
        provider: entry.provider_name ?? 'Proveedor',
        date: formatDate(entry.created_at, locale),
        shortDate: formatShortDate(entry.created_at, locale),
        y: numericPrice,
      }))
      .sort((a, b) => new Date(a.dayKey).getTime() - new Date(b.dayKey).getTime())

    if (sortedEntries.length === 0) {
      return [] as ChartPoint[]
    }

    const domain = getYAxisDomain(sortedEntries.map((item) => item.y))
    const range = domain.max - domain.min || 1
    const step =
      sortedEntries.length > 1 ? (CHART_RIGHT - CHART_LEFT) / (sortedEntries.length - 1) : 0

    return sortedEntries.map((entry, index) => {
      const x = sortedEntries.length > 1 ? CHART_LEFT + index * step : (CHART_LEFT + CHART_RIGHT) / 2
      const normalized = (entry.y - domain.min) / range
      const y = CHART_BOTTOM - normalized * (CHART_BOTTOM - CHART_TOP)

      return {
        x,
        y,
        value: entry.y,
        price: entry.price,
        currency: entry.currency,
        provider: entry.provider,
        date: entry.date,
        shortDate: entry.shortDate,
      } satisfies ChartPoint
    })
  }, [locale, priceHistory])

  const yDomain = useMemo(() => getYAxisDomain(chartPoints.map((point) => point.value)), [chartPoints])
  const valueRange = yDomain.max - yDomain.min || 1
  const yAxisTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4
    const value = yDomain.max - ratio * valueRange
    const y = CHART_TOP + ratio * (CHART_BOTTOM - CHART_TOP)
    const label = formatCurrency(value, locale, 'EUR')

    return { label, y }
  })

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/products')}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('products.detail.backToProducts')}
      </button>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center text-slate-300">{t('common.loading')}</div>
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div> : null}

      {!loading && !error && product ? (
        <>
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">{t('products.detail.productLabel')}</p>
                <h2 className="mt-2 text-2xl font-semibold">{product.name}</h2>
                <p className="mt-2 text-sm text-slate-400">{t('products.detail.refreshInfo')}</p>
              </div>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300">
                <div className="flex items-center gap-2">
                  <PackageOpen className="h-4 w-4" />
                  <span>{product.providers_products?.length ?? 0} {t('products.detail.providers')}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <h3 className="text-lg font-semibold">{t('products.detail.productInfo')}</h3>
                <dl className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                    <dt className="text-slate-400">{t('products.detail.name')}</dt>
                    <dd className="font-medium text-slate-100">{product.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                    <dt className="text-slate-400">{t('products.detail.identifier')}</dt>
                    <dd className="font-medium text-slate-100">{String(product.id)}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <h3 className="text-lg font-semibold">{t('products.detail.providers')}</h3>
                <div className="mt-4 space-y-3">
                  {(product.providers_products ?? []).length > 0 ? (
                    (product.providers_products ?? []).map((provider) => {
                      const providerName = provider.provider_name ?? t('products.detail.provider')
                      const incident = scraperIncidents.find(
                        (item) => String(item.provider_id) === String(provider.provider_id),
                      )
                      const latestPrice = latestPriceByProvider.get(providerName)
                      const numericPrice = latestPrice ? Number.parseFloat(String(latestPrice.price)) : Number.NaN
                      const isActive = !incident

                      return (
                        <article key={provider.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-100">{providerName}</p>
                              <p className="text-sm text-slate-400">SSN: {provider.ssn ?? 'N/A'}</p>
                            </div>
                            <span
                              className={`group relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                                isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              {isActive ? t('products.detail.active') : t('products.detail.inactive')}
                              {incident ? (
                                <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-max rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs font-normal text-slate-100 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                                  {t('products.detail.incidentSince')}: {formatDate(incident.created_at, locale)}
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-400">
                            {t('products.detail.latestPrice')}:{' '}
                            <span className="group relative inline-block font-medium text-slate-100">
                              {isActive && latestPrice && Number.isFinite(numericPrice)
                                ? formatCurrency(numericPrice, locale, latestPrice.currency ?? 'EUR')
                                : t('products.detail.noPrice')}
                              {isActive && latestPrice ? (
                                <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-max rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs font-normal text-slate-100 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                                  {t('products.detail.priceObtainedAt')}: {formatDate(latestPrice.created_at, locale)}
                                </span>
                              ) : null}
                            </span>
                          </p>
                        </article>
                      )
                    })
                  ) : (
                    <p className="text-sm text-slate-400">{t('products.detail.noProviders')}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              <h3 className="text-xl font-semibold">{t('products.detail.priceHistory')}</h3>
            </div>

            {chartPoints.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
                  <div>
                    <span className="font-medium text-slate-100">{t('products.detail.dailyMinimum')}</span>
                    <p className="mt-1 text-xs text-slate-400">{t('products.detail.refreshCadence')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-100">{t('products.detail.lastUpdated')}: {lastFetchedAt ?? '—'}</p>
                    <p className="text-xs text-slate-400">{t('products.detail.refreshInfo')}</p>
                  </div>
                </div>

                <div className="relative">
                  <svg viewBox="0 0 620 220" preserveAspectRatio="none" className="h-64 w-full">
                    <line x1={CHART_LEFT} y1={CHART_BOTTOM} x2={CHART_RIGHT} y2={CHART_BOTTOM} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
                    <line x1={CHART_LEFT} y1={CHART_TOP} x2={CHART_LEFT} y2={CHART_BOTTOM} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />

                    {yAxisTicks.map((tick) => (
                      <g key={tick.label}>
                        <line x1={CHART_LEFT} y1={tick.y} x2={CHART_RIGHT} y2={tick.y} stroke="rgba(148,163,184,0.16)" strokeDasharray="4 4" />
                        <text x="38" y={tick.y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">
                          {tick.label}
                        </text>
                      </g>
                    ))}

                    {chartPoints.map((point, index) => {
                      const nextPoint = chartPoints[index + 1]
                      if (!nextPoint) {
                        return null
                      }

                      return (
                        <line
                          key={`line-${point.date}-${point.provider}`}
                          x1={point.x}
                          y1={point.y}
                          x2={nextPoint.x}
                          y2={nextPoint.y}
                          stroke="#22d3ee"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      )
                    })}

                    {chartPoints.map((point) => (
                      <g key={`${point.date}-${point.provider}-${point.x}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="8"
                          fill="#f8fafc"
                          stroke="#22d3ee"
                          strokeWidth="3"
                          className="cursor-pointer"
                          onMouseEnter={() => setActivePoint(point)}
                          onMouseLeave={() => setActivePoint(null)}
                        />
                      </g>
                    ))}

                    {chartPoints.map((point) => (
                      <text
                        key={`x-label-${point.date}-${point.provider}`}
                        x={point.x}
                        y="214"
                        fill="#94a3b8"
                        fontSize="11"
                        textAnchor="middle"
                      >
                        {point.shortDate}
                      </text>
                    ))}
                  </svg>

                  {activePoint ? (
                    <div
                      className="pointer-events-none absolute z-10 max-w-56 rounded-lg border border-cyan-400/40 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-xl"
                      style={{
                        left: `${(activePoint.x / CHART_WIDTH) * 100}%`,
                        top: `calc(${(activePoint.y / CHART_HEIGHT) * 100}% - 8px)`,
                        transform:
                          activePoint.x >= CHART_WIDTH - 120
                            ? 'translate(calc(-100% - 12px), -50%)'
                            : 'translate(12px, -50%)',
                      }}
                    >
                      <p className="font-semibold">{formatCurrency(activePoint.value, locale, activePoint.currency || 'EUR')}</p>
                      <p>{activePoint.provider}</p>
                      <p className="text-slate-400">{activePoint.date}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">{t('products.detail.noHistory')}</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
