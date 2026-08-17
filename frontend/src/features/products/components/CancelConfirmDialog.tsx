import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useTranslation } from '../../../shared/i18n'

type CancelConfirmDialogProps = {
  open: boolean
  onKeepGoing: () => void
  onDiscard: () => void
}

export function CancelConfirmDialog({ open, onKeepGoing, onDiscard }: CancelConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog.Root open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-xl shadow-slate-950/40">
          <AlertDialog.Title className="text-lg font-semibold text-slate-100">
            {t('products.addProduct.cancelConfirmTitle')}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-slate-400">
            {t('products.addProduct.cancelConfirmBody')}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                onClick={onKeepGoing}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
              >
                {t('products.addProduct.cancelConfirmKeepGoing')}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={onDiscard}
                className="rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500"
              >
                {t('products.addProduct.cancelConfirmDiscard')}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
