import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../../../shared/api/client'
import { useTranslation } from '../../../shared/i18n'

type CatalogItem = { id: number; name: string }
type Listing = { id: number; provider_id: string | number; provider_name: string | null; ssn: string | null; product_presentation_id: number }
type Presentation = { id: number; unit: { value: string } | null; unit_measure: { name: string } | null }
type Product = {
  id: string | number
  brand: CatalogItem | null
  category: CatalogItem | null
  presentations: Presentation[]
  providers_products?: Listing[]
}
type LegacyRecord = { id: number; provider_id: number; provider_name: string | null; providers_product_id: number | null; created_at: string; price?: string; currency?: string; status?: string }
const inputClass = 'rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-slate-100'

export function ProductEnrichment({ product, onChanged }: { product: Product; onChanged: () => void }) {
  const { t } = useTranslation()
  const [brands, setBrands] = useState<CatalogItem[]>([])
  const [categories, setCategories] = useState<CatalogItem[]>([])
  const [measures, setMeasures] = useState<CatalogItem[]>([])
  const [providers, setProviders] = useState<CatalogItem[]>([])
  const [brand, setBrand] = useState(String(product.brand?.id ?? ''))
  const [category, setCategory] = useState(String(product.category?.id ?? ''))
  const [presentationId, setPresentationId] = useState('')
  const [value, setValue] = useState('')
  const [measure, setMeasure] = useState('')
  const [provider, setProvider] = useState('')
  const [ssn, setSsn] = useState('')
  const [listingPresentation, setListingPresentation] = useState(String(product.presentations[0]?.id ?? ''))
  const [legacy, setLegacy] = useState<{ type: 'prices' | 'incidents'; record: LegacyRecord }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [brandResponse, categoryResponse, measureResponse, providerResponse, historyResponse, incidentResponse] = await Promise.all([
          apiClient.get('/brands'), apiClient.get('/categories'), apiClient.get('/unit_measures'),
          apiClient.get('/providers'), apiClient.get(`/products/${product.id}/price_history`),
          apiClient.get(`/products/${product.id}/incidents`, { params: { include_resolved: true } }),
        ])
        setBrands(brandResponse.data)
        setCategories(categoryResponse.data)
        setMeasures(measureResponse.data)
        setProviders(providerResponse.data.data)
        setLegacy([
          ...(historyResponse.data.price_history as LegacyRecord[]).filter((record) => record.providers_product_id === null).map((record) => ({ type: 'prices' as const, record })),
          ...(incidentResponse.data as LegacyRecord[]).filter((record) => record.providers_product_id === null).map((record) => ({ type: 'incidents' as const, record })),
        ])
      } catch {
        setError(t('products.enrichment.loadError'))
      }
    }
    void load()
  }, [product.id, t])

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    setBusy(true)
    try {
      await action()
      onChanged()
    } catch (error: unknown) {
      const response = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number; data?: { error?: string; errors?: string[] } } }).response
        : undefined
      setError(response?.data?.error === 'in_use'
        ? t('products.enrichment.inUse')
        : response?.data?.error === 'duplicate_ssn'
          ? t('products.enrichment.duplicateListing')
          : response?.data?.error === 'duplicate_presentation'
            ? t('products.enrichment.duplicatePresentation')
        : response?.data?.errors?.join(', ') || t('products.enrichment.saveError'))
    } finally {
      setBusy(false)
    }
  }

  const savePresentation = (event: FormEvent) => {
    event.preventDefault()
    const payload = { presentation: { value: value || null, unit_measure_id: measure || null } }
    const url = `/products/${product.id}/presentations`
    void run(() => presentationId ? apiClient.patch(`${url}/${presentationId}`, payload) : apiClient.post(url, payload))
  }

  const selectPresentation = (id: string) => {
    setPresentationId(id)
    const selected = product.presentations.find((item) => String(item.id) === id)
    setValue(selected?.unit?.value ?? '')
    setMeasure(String(measures.find((item) => item.name === selected?.unit_measure?.name)?.id ?? ''))
  }

  return (
    <div className="mt-6 space-y-6 border-t border-white/10 pt-5 text-sm">
      <h3 className="text-lg font-semibold">{t('products.enrichment.adminTitle')}</h3>
      {error ? <p role="alert" className="text-rose-300">{error}</p> : null}
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault()
        void run(() => apiClient.patch(`/products/${product.id}`, { product: { brand_id: brand || null, category_id: category || null } }))
      }}>
        <label>{t('products.enrichment.brand')}<select className={`ml-2 ${inputClass}`} value={brand} onChange={(event) => setBrand(event.target.value)}><option value="">—</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>{t('products.enrichment.category')}<select className={`ml-2 ${inputClass}`} value={category} onChange={(event) => setCategory(event.target.value)}><option value="">—</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <button disabled={busy} className={inputClass}>{t('products.enrichment.save')}</button>
      </form>

      <form className="flex flex-wrap items-end gap-3" onSubmit={savePresentation}>
        <label>{t('products.enrichment.presentation')}<select className={`ml-2 ${inputClass}`} value={presentationId} onChange={(event) => selectPresentation(event.target.value)}><option value="">{t('products.enrichment.newPresentation')}</option>{product.presentations.map((item) => <option key={item.id} value={item.id}>{item.unit && item.unit_measure ? `${item.unit.value} ${item.unit_measure.name}` : t('products.enrichment.unknown')}</option>)}</select></label>
        <label>{t('products.enrichment.quantity')}<input className={`ml-2 w-24 ${inputClass}`} type="number" min="0.0001" step="0.0001" value={value} onChange={(event) => setValue(event.target.value)} /></label>
        <label>{t('products.enrichment.measure')}<select className={`ml-2 ${inputClass}`} value={measure} onChange={(event) => setMeasure(event.target.value)}><option value="">—</option>{measures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <button disabled={busy} className={inputClass}>{t('products.enrichment.save')}</button>
        {presentationId ? <button type="button" disabled={busy} className={inputClass} onClick={() => {
          if (window.confirm(t('products.enrichment.deleteConfirm'))) void run(() => apiClient.delete(`/products/${product.id}/presentations/${presentationId}`))
        }}>{t('products.enrichment.delete')}</button> : null}
      </form>

      <p className="text-slate-400">{t('products.enrichment.reassignmentHint')}</p>
      {(product.providers_products ?? []).map((listing) => (
        <label key={listing.id} className="flex flex-wrap items-center gap-2">
          <span>{listing.provider_name}: {listing.ssn}</span>
          <select className={inputClass} value={listing.product_presentation_id} disabled={busy} onChange={(event) => {
            if (window.confirm(t('products.enrichment.reassignmentConfirm'))) {
              void run(() => apiClient.patch(`/products/${product.id}/provider_listings/${listing.id}`, { listing: { product_presentation_id: event.target.value } }))
            }
          }}>
            {product.presentations.map((item) => <option key={item.id} value={item.id}>{item.unit && item.unit_measure ? `${item.unit.value} ${item.unit_measure.name}` : t('products.enrichment.unknown')}</option>)}
          </select>
        </label>
      ))}
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault()
        void run(() => apiClient.post(`/products/${product.id}/provider_listings`, { listing: { provider_id: provider, ssn, product_presentation_id: listingPresentation } }))
      }}>
        <label>{t('products.detail.provider')}<select required className={`ml-2 ${inputClass}`} value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">—</option>{providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>SSN<input required className={`ml-2 ${inputClass}`} value={ssn} onChange={(event) => setSsn(event.target.value)} /></label>
        <label>{t('products.enrichment.presentation')}<select required className={`ml-2 ${inputClass}`} value={listingPresentation} onChange={(event) => setListingPresentation(event.target.value)}>{product.presentations.map((item) => <option key={item.id} value={item.id}>{item.unit && item.unit_measure ? `${item.unit.value} ${item.unit_measure.name}` : t('products.enrichment.unknown')}</option>)}</select></label>
        <button disabled={busy} className={inputClass}>{t('products.enrichment.addListing')}</button>
      </form>

      {legacy.length > 0 ? <div className="space-y-2">
        <h4 className="font-semibold">{t('products.enrichment.legacyTitle')}</h4>
        <p className="text-slate-400">{t('products.enrichment.legacyHint')}</p>
        {legacy.map(({ type, record }) => <label key={`${type}-${record.id}`} className="flex flex-wrap items-center gap-2">
          <span>{record.provider_name} · {new Date(record.created_at).toLocaleString()} · {type === 'prices' ? `${record.price} ${record.currency}` : record.status}</span>
          <select className={inputClass} defaultValue="" disabled={busy} onChange={(event) => {
            if (event.target.value) void run(() => apiClient.post(`/products/${product.id}/provider_listings/${event.target.value}/legacy/${type}/${record.id}`))
          }}>
            <option value="">{t('products.enrichment.selectListing')}</option>
            {(product.providers_products ?? []).filter((item) => String(item.provider_id) === String(record.provider_id)).map((item) => <option key={item.id} value={item.id}>{item.ssn}</option>)}
          </select>
        </label>)}
      </div> : null}
    </div>
  )
}
