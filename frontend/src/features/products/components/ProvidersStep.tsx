import { useTranslation } from '../../../shared/i18n'
import type { useAddProductProvidersStep } from '../hooks/useAddProductProvidersStep'

type ProvidersStepProps = {
  providersStep: ReturnType<typeof useAddProductProvidersStep>
}

export function ProvidersStep({ providersStep }: ProvidersStepProps) {
  const { t } = useTranslation()
  const {
    providers,
    providersLoading,
    providersError,
    retryProviders,
    rows,
    addRow,
    removeRow,
    updateRowProvider,
    updateRowSsn,
    availableProvidersForRow,
  } = providersStep

  if (providersLoading) {
    return <p className="text-sm text-slate-400">{t('products.addProduct.providersLoading')}</p>
  }

  if (providersError) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
        <p>{providersError}</p>
        <button type="button" onClick={retryProviders} className="mt-2 text-xs font-medium underline">
          {t('products.addProduct.providersRetry')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const availableProviders = availableProvidersForRow(row.id)

        return (
          <div key={row.id} className="flex items-start gap-2">
            <div className="flex-1">
              <label htmlFor={`provider-select-${row.id}`} className="text-xs font-medium text-slate-400">
                {t('products.addProduct.providerLabel')}
              </label>
              <select
                id={`provider-select-${row.id}`}
                value={row.providerId ?? ''}
                onChange={(event) => updateRowProvider(row.id, Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500/50"
              >
                <option value="" disabled>
                  {t('products.addProduct.providerPlaceholder')}
                </option>
                {availableProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor={`provider-ssn-${row.id}`} className="text-xs font-medium text-slate-400">
                {t('products.addProduct.ssnLabel')}
              </label>
              <input
                id={`provider-ssn-${row.id}`}
                type="text"
                value={row.ssn}
                onChange={(event) => updateRowSsn(row.id, event.target.value)}
                placeholder={t('products.addProduct.ssnPlaceholder')}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
              />
            </div>

            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                aria-label={t('products.addProduct.removeProvider')}
                className="mt-6 rounded-xl border border-white/10 px-2 py-2 text-sm text-slate-400 transition hover:bg-white/5"
              >
                ×
              </button>
            ) : null}
          </div>
        )
      })}

      <button
        type="button"
        onClick={addRow}
        disabled={rows.length >= providers.length}
        className="w-full rounded-xl border border-dashed border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('products.addProduct.addProvider')}
      </button>
    </div>
  )
}
