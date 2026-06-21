import { redirect } from "next/navigation"
import { auth } from "../../../../../auth"
import { Bot } from "lucide-react"
import { getCaptadorSettings } from "@/lib/actions/captador"
import { getKnowledgeDocuments } from "@/lib/actions/knowledge-base"
import { AssistantSettingsView } from "@/components/settings/AssistantSettingsView"

export const dynamic = 'force-dynamic'

export default async function AssistantSettingsPage() {
  const session = await auth()
  if (!session?.user?.clinicId) redirect("/login")

  const result = await getCaptadorSettings()
  if (!result.success) redirect("/login")

  const knowledgeDocs = await getKnowledgeDocuments()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-brand-50 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-ink-primary leading-tight">Captador IA</h2>
          <p className="text-[12px] text-ink-tertiary mt-0.5">
            Responde automáticamente a nuevos prospectos en WhatsApp, Facebook e Instagram
          </p>
        </div>
      </div>

      <AssistantSettingsView
        plan={result.plan}
        initialActive={result.active}
        initialConfig={result.config}
        initialKnowledgeDocuments={knowledgeDocs.success ? knowledgeDocs.data : []}
      />
    </div>
  )
}
