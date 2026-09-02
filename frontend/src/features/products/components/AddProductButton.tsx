import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from '../../../shared/i18n'
import { featureFlags } from '../../../shared/config/featureFlags'
import { AddProductWizardModal } from './AddProductWizardModal'

type AddProductButtonProps = {
  onProductCreated?: () => void
}

export function AddProductButton({ onProductCreated }: AddProductButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (!featureFlags.addProductWizard) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
      >
        <Plus className="h-4 w-4" />
        {t('products.addProduct.button')}
      </button>

      <AddProductWizardModal open={open} onOpenChange={setOpen} onProductCreated={onProductCreated} />
    </>
  )
}
