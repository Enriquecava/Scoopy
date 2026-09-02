import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '../../../shared/api/client'
import type { Provider, ProviderRow } from './useAddProductProvidersStep'

export type ScreenshotItem = {
  providerId: number
  providerName: string
  ssn: string
  screenshotUrl: string | null
  error: string | null
  productName?: string
  confirmed: boolean
}

type VerifyResponseItem = {
  provider_id: number
  ssn: string
  screenshot: string | null
  error: string | null
  product_name?: string
}

export function useProductScreenshotsStep({
  active,
  rows,
  providers,
}: {
  active: boolean
  rows: ProviderRow[]
  providers: Provider[]
}) {
  const [items, setItems] = useState<ScreenshotItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const lastFetchedKeyRef = useRef<string | null>(null)

  const providerName = useCallback(
    (providerId: number | null) => providers.find((provider) => provider.id === providerId)?.name ?? '',
    [providers],
  )

  const fetchScreenshots = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const response = await apiClient.post(
        '/products/verify',
        rows.map((row) => ({ provider_id: row.providerId, ssn: row.ssn })),
      )
      const payload = response.data
      const data: VerifyResponseItem[] = Array.isArray(payload?.data) ? payload.data : []

      setItems(
        data.map((entry) => ({
          providerId: entry.provider_id,
          providerName: providerName(entry.provider_id),
          ssn: entry.ssn,
          screenshotUrl: entry.screenshot,
          error: entry.error,
          productName: entry.product_name,
          confirmed: false,
        })),
      )
    } catch (err: unknown) {
      // Check if error is specific (duplicate SSN, etc)
      const errorResponse = (err as any)?.response?.data
      
      if (errorResponse?.data && Array.isArray(errorResponse.data)) {
        // API returned specific errors for items, show them
        setItems(
          errorResponse.data.map((entry: VerifyResponseItem) => ({
            providerId: entry.provider_id,
            providerName: providerName(entry.provider_id),
            ssn: entry.ssn,
            screenshotUrl: entry.screenshot,
            error: entry.error,
            productName: entry.product_name,
            confirmed: false,
          })),
        )
      } else {
        // Generic error
        setError('products.addProduct.screenshotsVerifyError')
        setItems([])
      }
    } finally {
      setLoading(false)
    }
  }, [rows, providerName])

  useEffect(() => {
    if (!active) {
      return
    }

    const key = JSON.stringify(rows.map((row) => ({ providerId: row.providerId, ssn: row.ssn })))
    if (lastFetchedKeyRef.current === key) {
      return
    }

    lastFetchedKeyRef.current = key
    void fetchScreenshots()
  }, [active, rows, fetchScreenshots])

  const toggleConfirm = useCallback((providerId: number) => {
    setItems((current) => current.map((item) => (item.providerId === providerId ? { ...item, confirmed: !item.confirmed } : item)))
  }, [])

  const requestRemove = useCallback(
    (providerId: number) => {
      if (items.length <= 1) {
        setExitConfirmOpen(true)
        return
      }
      setItems((current) => current.filter((item) => item.providerId !== providerId))
    },
    [items],
  )

  const dismissExitConfirm = useCallback(() => {
    setExitConfirmOpen(false)
  }, [])

  const isAllConfirmed = items.length > 0 && items.every((item) => item.confirmed)
  const allFailed = items.length > 0 && items.every((item) => item.error)

  const reset = useCallback(() => {
    setItems([])
    setError(null)
    setExitConfirmOpen(false)
    lastFetchedKeyRef.current = null
  }, [])

  return {
    items,
    loading,
    error,
    allFailed,
    isAllConfirmed,
    toggleConfirm,
    requestRemove,
    exitConfirmOpen,
    dismissExitConfirm,
    retry: fetchScreenshots,
    reset,
  }
}
