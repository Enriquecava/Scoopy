import { LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../../shared/i18n'
import { useAuth } from '../../../app/providers/AuthProvider'
import type { useProductScreenshotsStep } from '../hooks/useProductScreenshotsStep'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type ScreenshotImageProps = {
  screenshotUrl: string | null
  providerName: string
}

function ScreenshotImage({ screenshotUrl, providerName }: ScreenshotImageProps) {
  const { token } = useAuth()
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!screenshotUrl || !token) {
      setImageUrl(null)
      return
    }

    setLoadingImage(true)
    const loadImage = async () => {
      try {
        const fullUrl = `${API_BASE_URL}${screenshotUrl}`
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch screenshot: ${response.status}`)
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url
        setImageUrl(url)
      } catch (err) {
        console.error('Failed to load screenshot:', err)
        setImageUrl(null)
      } finally {
        setLoadingImage(false)
      }
    }

    void loadImage()

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [screenshotUrl, token])

  if (loadingImage) {
    return (
      <div className="flex items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!imageUrl) {
    return null
  }

  return <img src={imageUrl} alt={providerName} className="h-full w-full object-cover" />
}

type ScreenshotsStepProps = {
  screenshotsStep: ReturnType<typeof useProductScreenshotsStep>
}

export function ScreenshotsStep({ screenshotsStep }: ScreenshotsStepProps) {
  const { t } = useTranslation()
  const { items, loading, error, allFailed, toggleConfirm, requestRemove, retry } = screenshotsStep

  const singleFailedItem = items.length === 1 && items[0].error ? items[0] : null

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <LoaderCircle className="h-8 w-8 animate-spin text-cyan-400" />
        <p className="text-sm text-slate-400">{t('products.addProduct.screenshotsLoading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
        <p>{t(error)}</p>
        <button type="button" onClick={() => void retry()} className="mt-2 text-xs font-medium underline">
          {t('products.addProduct.screenshotsRetry')}
        </button>
      </div>
    )
  }

  if (singleFailedItem) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
        {singleFailedItem.error === 'duplicate_ssn' ? (
          <>
            <p className="text-sm text-rose-300">
              <span className="font-semibold">Product Already Exists:</span>{' '}
              {t('products.addProduct.productAlreadyExists', {
                provider: singleFailedItem.providerName,
              })}
            </p>
            <p className="mt-2 text-xs text-rose-200">
              This product is: <span className="font-semibold">"{singleFailedItem.productName}"</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-rose-300">
            {(singleFailedItem.error ?? '').toLowerCase().replaceAll('_', ' ') === 'verification failed'
              ? t('products.addProduct.productNotFound')
              : singleFailedItem.error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {allFailed && items.length === 0 ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-300">{t('products.addProduct.screenshotsAllFailed')}</p>
          <button type="button" onClick={() => void retry()} className="mt-2 text-xs font-medium text-rose-300 underline">
            {t('products.addProduct.screenshotsRetry')}
          </button>
        </div>
      ) : (
        items.map((item) => (
          <div key={item.providerId} className="flex items-start gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
            {!item.error && (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950/70">
                {item.screenshotUrl ? (
                  <ScreenshotImage screenshotUrl={item.screenshotUrl} providerName={item.providerName} />
                ) : (
                  <span className="px-2 text-center text-[10px] text-rose-300">{t('products.addProduct.screenshotItemError')}</span>
                )}
              </div>
            )}

            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">{item.providerName}</p>
              <p className="text-xs text-slate-400">{item.ssn}</p>
              {item.error ? (
                <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2">
                  {item.error === 'duplicate_ssn' ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-rose-300">⚠️ Product Already Exists</p>
                      <p className="text-xs text-rose-200">
                        This product is: <span className="font-semibold">"{item.productName || 'Unknown'}"</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-300">
                      {item.error.toLowerCase().replaceAll('_', ' ') === 'verification failed'
                        ? t('products.addProduct.productNotFound')
                        : item.error}
                    </p>
                  )}
                </div>
              ) : (
                <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={item.confirmed}
                    onChange={() => toggleConfirm(item.providerId)}
                    className="h-4 w-4 rounded border-white/20 bg-slate-950/70 accent-cyan-500"
                  />
                  {t('products.addProduct.confirmMatch')}
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={() => requestRemove(item.providerId)}
              aria-label={t('products.addProduct.removeProvider')}
              className="rounded-xl border border-white/10 px-2 py-2 text-sm text-slate-400 transition hover:bg-white/5"
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  )
}
