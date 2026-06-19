"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { finalizeOnboarding } from "@/lib/actions/onboarding-wizard"
import { WizardProgress } from "./WizardProgress"

export function PreparingAccount() {
  const router = useRouter()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const start = Date.now()
    finalizeOnboarding().then(() => {
      const elapsed = Date.now() - start
      const wait = Math.max(0, 1500 - elapsed)
      setTimeout(() => router.push("/dashboard"), wait)
    })
  }, [router])

  return (
    <div className="text-center py-6">
      <WizardProgress step={4} />
      <h1 className="text-xl font-bold text-gray-900 mb-2">¡Estamos preparando tu cuenta Hermes CRM!</h1>
      <p className="text-sm text-gray-500 mb-8">Danos unos segundos</p>
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
    </div>
  )
}
