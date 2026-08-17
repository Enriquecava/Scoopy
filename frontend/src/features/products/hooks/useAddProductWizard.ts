import { useCallback, useState } from 'react'
import { isProductNameSubmittable, sanitizeProductNameInput } from '../utils/productName'

export const ADD_PRODUCT_WIZARD_TOTAL_STEPS = 4

export function useAddProductWizard() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)

  const reset = useCallback(() => {
    setStep(1)
    setName('')
    setIsCancelConfirmOpen(false)
  }, [])

  const updateName = useCallback((value: string) => {
    setName(sanitizeProductNameInput(value))
  }, [])

  const canGoNext = step === 1 ? isProductNameSubmittable(name) : false
  const canGoBack = step > 1

  const goNext = useCallback(() => {
    setStep((current) => Math.min(current + 1, ADD_PRODUCT_WIZARD_TOTAL_STEPS))
  }, [])

  const goBack = useCallback(() => {
    setStep((current) => Math.max(current - 1, 1))
  }, [])

  const requestCancel = useCallback(() => {
    setIsCancelConfirmOpen(true)
  }, [])

  const dismissCancelConfirm = useCallback(() => {
    setIsCancelConfirmOpen(false)
  }, [])

  return {
    step,
    totalSteps: ADD_PRODUCT_WIZARD_TOTAL_STEPS,
    name,
    updateName,
    canGoNext,
    canGoBack,
    goNext,
    goBack,
    isCancelConfirmOpen,
    requestCancel,
    dismissCancelConfirm,
    reset,
  }
}
