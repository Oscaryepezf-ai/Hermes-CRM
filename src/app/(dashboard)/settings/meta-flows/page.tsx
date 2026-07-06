import { auth } from "../../../../../auth"
import { db } from "@/lib/db"
import { MetaFlowsClient } from "@/components/meta-flows/MetaFlowsClient"

export default async function MetaFlowsPage() {
  const session = await auth()
  if (!session?.user) return null

  const flows = await db.metaFlow.findMany({
    where:   { clinicId: session.user.clinicId },
    include: { _count: { select: { submissions: true } } },
    orderBy: { createdAt: "desc" },
  })

  const hasPrivateKey = !!process.env.WA_FLOWS_PRIVATE_KEY

  return <MetaFlowsClient initialFlows={flows} hasPrivateKey={hasPrivateKey} />
}
