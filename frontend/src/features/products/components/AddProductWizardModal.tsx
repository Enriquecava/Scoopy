import * as Dialog from '@radix-ui/react-dialog'
import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from '../../../shared/i18n'
import { useAddProductWizard } from '../hooks/useAddProductWizard'
import { useAddProductProvidersStep } from '../hooks/useAddProductProvidersStep'
import { useProductScreenshotsStep } from '../hooks/useProductScreenshotsStep'
import { CancelConfirmDialog } from './CancelConfirmDialog'
import { ProvidersStep } from './ProvidersStep'
import { ScreenshotsStep } from './ScreenshotsStep'
import { StepDots } from './StepDots'

type AddProductWizardModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddProductWizardModal({ open, onOpenChange }: AddProductWizardModalProps) {
  const { t } = useTranslation()
  const wizard = useAddProductWizard()
  const providersStep = useAddProductProvidersStep({ active: wizard.step === 2 })
  const screenshotsStep = useProductScreenshotsStep({
    active: wizard.step === 3,
    rows: providersStep.rows,
    providers: providersStep.providers,
  })

  const resetAll = () => {
    wizard.reset()
    providersStep.reset()
    screenshotsStep.reset()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true)
      return
    }

    wizard.requestCancel()
  }

  const handleDiscard = () => {
    wizard.dismissCancelConfirm()
    resetAll()
    onOpenChange(false)
  }

  const handleNext = () => {
    wizard.goNext()
  }

  const handleAddProduct = () => {
    // TODO: call the product creation endpoint once the backend contract (POST /products vs. a dedicated endpoint) is defined
    wizard.goNext()
  }

  const handleFinish = () => {
    resetAll()
    onOpenChange(false)
  }

  const handleExitConfirmCancel = () => {
    screenshotsStep.dismissExitConfirm()
    screenshotsStep.reset()
    providersStep.reset()
    wizard.goToStep(2)
  }

  const handleExitConfirmExit = () => {
    screenshotsStep.dismissExitConfirm()
    resetAll()
    onOpenChange(false)
  }

  const isNextDisabled = wizard.step === 1 ? !wizard.canGoNext : wizard.step === 2 ? !providersStep.isValid : false

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/70" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-40 max-h-[85vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-xl shadow-slate-950/40"
            onEscapeKeyDown={(event) => {
              event.preventDefault()
              wizard.requestCancel()
            }}
            onInteractOutside={(event) => {
              event.preventDefault()
              wizard.requestCancel()
            }}
          >
            <Dialog.Title className="text-lg font-semibold text-slate-100">{t('products.addProduct.title')}</Dialog.Title>
            <Dialog.Description className="sr-only">{t('products.addProduct.title')}</Dialog.Description>

            <div className="mt-4">
              <StepDots currentStep={wizard.step} totalSteps={wizard.totalSteps} />
            </div>

            <div className="mt-6">
              {wizard.step === 1 ? (
                <div>
                  <label htmlFor="add-product-name" className="text-sm font-medium text-slate-300">
                    {t('products.addProduct.nameLabel')}
                  </label>
                  <input
                    id="add-product-name"
                    type="text"
                    value={wizard.name}
                    onChange={(event) => wizard.updateName(event.target.value)}
                    placeholder={t('products.addProduct.namePlaceholder')}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
                  />
                  <p className="mt-2 text-xs text-slate-500">{t('products.addProduct.nameHint')}</p>
                </div>
              ) : wizard.step === 2 ? (
                <ProvidersStep providersStep={providersStep} />
              ) : wizard.step === 3 ? (
                <ScreenshotsStep screenshotsStep={screenshotsStep} />
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-200">{t('products.addProduct.confirmationTitle')}</h3>
                  <p className="text-sm text-slate-400">{t('products.addProduct.confirmationBody')}</p>
                </div>
              )}
            </div>

            {wizard.step < 4 ? (
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={wizard.requestCancel}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
                >
                  {t('products.addProduct.cancel')}
                </button>

                <div className="flex gap-3">
                  {wizard.canGoBack ? (
                    <button
                      type="button"
                      onClick={wizard.goBack}
                      className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
                    >
                      {t('products.addProduct.back')}
                    </button>
                  ) : null}
                  {wizard.step === 3 ? (
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      disabled={!screenshotsStep.isAllConfirmed}
                      className="rounded-xl bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/30 disabled:text-slate-500"
                    >
                      {t('products.addProduct.addProductButton')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={isNextDisabled}
                      className="rounded-xl bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/30 disabled:text-slate-500"
                    >
                      {t('products.addProduct.next')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="rounded-xl bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
                >
                  {t('products.addProduct.finish')}
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <CancelConfirmDialog open={wizard.isCancelConfirmOpen} onKeepGoing={wizard.dismissCancelConfirm} onDiscard={handleDiscard} />

      <CancelConfirmDialog
        open={screenshotsStep.exitConfirmOpen}
        onKeepGoing={handleExitConfirmCancel}
        onDiscard={handleExitConfirmExit}
        title={t('products.addProduct.exitConfirmTitle')}
        body={t('products.addProduct.exitConfirmBody')}
        keepGoingLabel={t('products.addProduct.exitConfirmCancel')}
        discardLabel={t('products.addProduct.exitConfirmExit')}
      />
    </>
  )
}

