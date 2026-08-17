import * as Dialog from '@radix-ui/react-dialog'
import { useTranslation } from '../../../shared/i18n'
import { useAddProductWizard } from '../hooks/useAddProductWizard'
import { CancelConfirmDialog } from './CancelConfirmDialog'
import { StepDots } from './StepDots'

type AddProductWizardModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddProductWizardModal({ open, onOpenChange }: AddProductWizardModalProps) {
  const { t } = useTranslation()
  const wizard = useAddProductWizard()

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true)
      return
    }

    wizard.requestCancel()
  }

  const handleDiscard = () => {
    wizard.dismissCancelConfirm()
    wizard.reset()
    onOpenChange(false)
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/70" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-40 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-xl shadow-slate-950/40"
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
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center">
                  <h3 className="text-sm font-semibold text-slate-200">{t('products.addProduct.stepPlaceholderTitle')}</h3>
                  <p className="mt-2 text-sm text-slate-400">{t('products.addProduct.stepPlaceholderBody')}</p>
                </div>
              )}
            </div>

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
                <button
                  type="button"
                  onClick={wizard.goNext}
                  disabled={!wizard.canGoNext}
                  className="rounded-xl bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/30 disabled:text-slate-500"
                >
                  {t('products.addProduct.next')}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <CancelConfirmDialog open={wizard.isCancelConfirmOpen} onKeepGoing={wizard.dismissCancelConfirm} onDiscard={handleDiscard} />
    </>
  )
}
