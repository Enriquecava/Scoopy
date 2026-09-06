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

type VerificationBatchResponse = {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  data?: VerifyResponseItem[]
  error?: string | null
}

const VERIFICATION_POLL_INTERVAL_MS = 1000
const VERIFICATION_MAX_POLLS = 180

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, milliseconds)
    const abort = () => {
      window.clearTimeout(timeoutId)
      reject(new DOMException('Verification polling was cancelled', 'AbortError'))
    }

    if (signal.aborted) {
      abort()
      return
    }

    signal.addEventListener('abort', abort, { once: true })
  })
}

async function waitForVerification(batchId: number, signal: AbortSignal): Promise<VerificationBatchResponse> {
  for (let attempt = 0; attempt < VERIFICATION_MAX_POLLS; attempt += 1) {
    const response = await apiClient.get(`/products/verification_batches/${batchId}`, { signal })
    const payload = response.data as VerificationBatchResponse

    if (payload.status === 'completed' || payload.status === 'failed') {
      return payload
    }

    await wait(VERIFICATION_POLL_INTERVAL_MS, signal)
  }

  throw new Error('Verification timed out')
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
  const verificationAbortControllerRef = useRef<AbortController | null>(null)

  const providerName = useCallback(
    (providerId: number | null) => providers.find((provider) => provider.id === providerId)?.name ?? '',
    [providers],
  )

  const fetchScreenshots = useCallback(async (signal: AbortSignal) => {
    setError(null)
    setLoading(true)

    try {
      const response = await apiClient.post(
        '/products/verify',
        rows.map((row) => ({ provider_id: row.providerId, ssn: row.ssn })),
        { signal },
      )
      const payload = await waitForVerification(response.data.id as number, signal)

      if (payload.status === 'failed') {
        setError('products.addProduct.screenshotsVerifyError')
        setItems([])
        return
      }

      const data: VerifyResponseItem[] = Array.isArray(payload.data) ? payload.data : []

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
      if (signal.aborted) {
        return
      }

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
        setError(errorResponse?.error === 'rate_limited'
          ? 'products.addProduct.screenshotsRateLimited'
          : 'products.addProduct.screenshotsVerifyError')
        setItems([])
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
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
    const controller = new AbortController()
    verificationAbortControllerRef.current?.abort()
    verificationAbortControllerRef.current = controller
    void fetchScreenshots(controller.signal)

    return () => {
      controller.abort()
      if (verificationAbortControllerRef.current === controller) {
        verificationAbortControllerRef.current = null
      }
    }
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
    verificationAbortControllerRef.current?.abort()
    verificationAbortControllerRef.current = null
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
    retry: () => {
      verificationAbortControllerRef.current?.abort()
      const controller = new AbortController()
      verificationAbortControllerRef.current = controller
      void fetchScreenshots(controller.signal)
    },
    reset,
  }
}
