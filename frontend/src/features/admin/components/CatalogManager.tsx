import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../../../shared/api/client'
import { useTranslation } from '../../../shared/i18n'

type CatalogType = 'brands' | 'categories' | 'unit_measures'
type CatalogItem = { id: number; name: string }

export function CatalogManager({ catalog, title }: { catalog: CatalogType; title: string }) {
  const { t } = useTranslation()
  const [items, setItems] = useState<CatalogItem[]>([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const response = await apiClient.get(`/${catalog}`)
      setItems(response.data)
    } catch {
      setError(t('products.enrichment.loadError'))
    }
  }

  useEffect(() => {
    let active = true
    apiClient.get(`/${catalog}`).then((response) => {
      if (active) setItems(response.data)
    }).catch(() => {
      if (active) setError(t('products.enrichment.loadError'))
    })
    return () => { active = false }
  }, [catalog, t])

  const change = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      setName('')
      setEditing(null)
      await load()
    } catch (error: unknown) {
      const response = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number; data?: { error?: string; errors?: string[] } } }).response
        : undefined
      setError(response?.data?.error === 'in_use'
        ? t('products.enrichment.inUse')
        : response?.data?.error === 'duplicate_name'
          ? t('products.enrichment.duplicateName')
        : response?.data?.errors?.join(', ') || t('products.enrichment.saveError'))
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void change(() => editing === null
      ? apiClient.post(`/${catalog}`, { name })
      : apiClient.patch(`/${catalog}/${editing}`, { name }))
  }

  return <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
    <h3 className="text-xl font-semibold">{title}</h3>
    <form onSubmit={submit} className="mt-4 flex flex-wrap gap-2">
      <input aria-label={title} required value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
      <button disabled={busy} className="rounded-lg bg-cyan-500 px-3 py-2 text-slate-950">{t('products.enrichment.save')}</button>
      {editing !== null ? <button type="button" onClick={() => { setEditing(null); setName('') }} className="rounded-lg border border-white/10 px-3 py-2">{t('admin.cancel')}</button> : null}
    </form>
    {error ? <p role="alert" className="mt-3 text-rose-300">{error}</p> : null}
    <ul className="mt-4 space-y-2">
      {items.map((item) => <li key={item.id} className="flex items-center justify-between gap-3">
        <span>{item.name}</span>
        <span className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => { setEditing(item.id); setName(item.name) }} className="rounded-lg border border-white/10 px-2 py-1">{t('admin.editProduct')}</button>
          <button type="button" disabled={busy} onClick={() => {
            if (window.confirm(t('admin.catalogDeleteConfirm'))) void change(() => apiClient.delete(`/${catalog}/${item.id}`))
          }} className="rounded-lg border border-white/10 px-2 py-1">{t('products.enrichment.delete')}</button>
        </span>
      </li>)}
    </ul>
  </section>
}
