import { redirect, notFound } from "next/navigation"
import { auth } from "../../../../../../auth"
import { getFlow } from "@/lib/actions/flows"
import { FlowBuilderCanvas } from "@/components/flows/FlowBuilderCanvas"

export const dynamic = 'force-dynamic'

export default async function FlowEditorPage({ params }: { params: Promise<{ flowId: string }> }) {
  const session = await auth()
  if (!session?.user?.clinicId) redirect("/login")

  const { flowId } = await params
  const result = await getFlow(flowId)
  if (!result.success) notFound()

  return (
    <FlowBuilderCanvas
      flowId={result.data.id}
      flowName={result.data.name}
      startNodeId={result.data.startNodeId}
      initialNodes={result.data.nodes}
    />
  )
}
