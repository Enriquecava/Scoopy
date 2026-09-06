type StepDotsProps = {
  currentStep: number
  totalSteps: number
}

export function StepDots({ currentStep, totalSteps }: StepDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
      {Array.from({ length: totalSteps }, (_, index) => index + 1).map((step) => (
        <span
          key={step}
          className={`h-2.5 w-2.5 rounded-full transition ${
            step === currentStep ? 'bg-cyan-400' : step < currentStep ? 'bg-cyan-400/50' : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  )
}
