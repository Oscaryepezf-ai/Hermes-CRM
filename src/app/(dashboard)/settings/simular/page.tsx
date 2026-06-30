import { redirect } from "next/navigation"
import { auth } from "../../../../../auth"
import { SimulatorChat } from "@/components/simulate/SimulatorChat"

export const dynamic = "force-dynamic"

export default async function SimuladorPage() {
  const session = await auth()
  if (!session?.user?.clinicId) redirect("/login")
  if (!["ADMIN", "OWNER"].includes(session.user.role)) redirect("/dashboard")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-ink-primary">Simulador del Captador IA</h1>
        <p className="text-[13px] text-ink-tertiary mt-0.5">
          Prueba la conversación del agente como si fueras un prospecto — sin afectar tus datos reales. El lead de prueba se elimina al reiniciar.
        </p>
      </div>
      <SimulatorChat />
    </div>
  )
}
