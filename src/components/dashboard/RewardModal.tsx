"use client"

import { useState } from "react"
import { Gift, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { claimMyReward } from "@/lib/actions/activation"
import { toast } from "sonner"

export function RewardModal({ onClose, onClaimed }: { onClose: () => void; onClaimed: () => void }) {
  const [loading, setLoading] = useState(false)

  async function handleClaim() {
    setLoading(true)
    const res = await claimMyReward()
    setLoading(false)
    if (res.success) {
      toast.success("¡Recompensa reclamada!")
      onClaimed()
    } else {
      toast.error(res.error ?? "No se pudo reclamar la recompensa")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Gift className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">¡Completaste la activación!</h2>
        <p className="text-sm text-gray-500 mb-5">
          Has dado los primeros pasos reales con Hermes CRM.
        </p>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm font-semibold text-amber-800">🎁 Activación completa desbloqueada</p>
        </div>
        <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleClaim} disabled={loading}>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Reclamar recompensa
        </Button>
      </div>
    </div>
  )
}
