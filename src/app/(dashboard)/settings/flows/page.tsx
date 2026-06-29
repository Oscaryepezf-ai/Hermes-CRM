import { redirect } from "next/navigation"
import { auth } from "../../../../../auth"
import { Workflow } from "lucide-react"
import { getFlows } from "@/lib/actions/flows"
import { FlowListView } from "@/components/flows/FlowListView"

export const dynamic = 'force-dynamic'

export default async function FlowsPage() {
  const session = await auth()
  if (!session?.user?.clinicId) redirect("/login")

  const result = await getFlows()
  if (!result.success) redirect("/login")

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-brand-50 flex items-center justify-center flex-shrink-0">
          <Workflow className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-ink-primary leading-tight">Flujos</h2>
          <p className="text-[12px] text-ink-tertiary mt-0.5">
            Árboles de botones de WhatsApp sin código — activa uno en Captador IA cuando esté listo
          </p>
        </div>
      </div>

      <FlowListView initialFlows={result.data} />
    </div>
  )
}
