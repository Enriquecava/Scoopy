import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '../../../shared/api/client'

export type Provider = {
  id: number
  name: string
}

export type ProviderRow = {
  id: string
  providerId: number | null
  ssn: string
}

function createEmptyRow(): ProviderRow {
  return { id: crypto.randomUUID(), providerId: null, ssn: '' }
}

export function useAddProductProvidersStep({ active }: { active: boolean }) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [providersLoading, setProvidersLoading] = useState(false)
  const [providersError, setProvidersError] = useState<string | null>(null)
  const [rows, setRows] = useState<ProviderRow[]>([createEmptyRow()])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)

  const loadProviders = useCallback(async () => {
    setProvidersError(null)
    setProvidersLoading(true)

    try {
      const response = await apiClient.get('/providers')
      const payload = response.data
      setProviders(Array.isArray(payload?.data) ? payload.data : [])
    } catch (err) {
      setProvidersError(err instanceof Error ? err.message : 'No se pudieron cargar los proveedores.')
    } finally {
      setProvidersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!active || hasFetchedRef.current) {
      return
    }

    hasFetchedRef.current = true
    void loadProviders()
  }, [active, loadProviders])

  const addRow = useCallback(() => {
    setRows((current) => [...current, createEmptyRow()])
  }, [])

  const removeRow = useCallback((id: string) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current))
  }, [])

  const updateRowProvider = useCallback((id: string, providerId: number) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, providerId } : row)))
  }, [])

  const updateRowSsn = useCallback((id: string, ssn: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ssn } : row)))
  }, [])

  const availableProvidersForRow = useCallback(
    (id: string) => {
      const selectedElsewhere = new Set(
        rows.filter((row) => row.id !== id && row.providerId !== null).map((row) => row.providerId),
      )
      return providers.filter((provider) => !selectedElsewhere.has(provider.id))
    },
    [providers, rows],
  )

  const isValid =
    rows.length > 0 &&
    rows.every((row) => row.providerId !== null && row.ssn.trim().length > 0) &&
    new Set(rows.map((row) => row.providerId)).size === rows.length

  const submit = useCallback(async () => {
    setSubmitError(null)
    setSubmitting(true)

    try {
      // TODO: backend endpoint for this request is not implemented yet
      await apiClient.post(
        '',
        rows.map((row) => ({ provider_id: row.providerId, ssn: row.ssn })),
      )
      return true
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar la información de proveedores.')
      return false
    } finally {
      setSubmitting(false)
    }
  }, [rows])

  const reset = useCallback(() => {
    setRows([createEmptyRow()])
    setSubmitError(null)
    setSubmitting(false)
  }, [])

  return {
    providers,
    providersLoading,
    providersError,
    retryProviders: loadProviders,
    rows,
    addRow,
    removeRow,
    updateRowProvider,
    updateRowSsn,
    availableProvidersForRow,
    isValid,
    submitting,
    submitError,
    submit,
    reset,
  }
}
