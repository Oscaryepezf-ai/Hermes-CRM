"use client"

import { useState } from "react"
import { StepBusinessInfo } from "./StepBusinessInfo"
import { StepRole } from "./StepRole"
import { StepCurrentTools } from "./StepCurrentTools"
import { PreparingAccount } from "./PreparingAccount"

export function WizardFlow({ initialStep }: { initialStep: number }) {
  const [step, setStep] = useState(Math.min(initialStep, 4))

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {step === 0 && <StepBusinessInfo onNext={() => setStep(1)} />}
        {step === 1 && <StepRole onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <StepCurrentTools onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step >= 3 && <PreparingAccount />}
      </div>
    </div>
  )
}
