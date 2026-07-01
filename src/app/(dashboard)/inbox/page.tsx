import { redirect } from "next/navigation"
import { auth } from "../../../../auth"
import { db } from "@/lib/db"
import { getInboxConversations, getInboxCounts, getClinicLabels } from "@/lib/inbox/conversations"
import { InboxClient } from "@/components/inbox/InboxClient"

export const dynamic = 'force-dynamic'

export default async function InboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ leadId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.clinicId) redirect("/login")

  const clinicId = session.user.clinicId
  const params   = await searchParams
  const leadId   = params?.leadId

  const [{ conversations }, counts, labels] = await Promise.all([
    getInboxConversations(clinicId, {}, 1, 30),
    getInboxCounts(clinicId),
    getClinicLabels(clinicId),
  ])

  // Si viene con ?leadId=xxx, buscar la conversación de WhatsApp de ese lead
  let initialOpenConversationId: string | null = null
  if (leadId) {
    const conv = await db.inboxConversation.findFirst({
      where:  { leadId, clinicId, channel: 'WHATSAPP' },
      select: { id: true },
    })
    initialOpenConversationId = conv?.id ?? null
  }

  return (
    <InboxClient
      initialConversations={conversations}
      initialCounts={counts}
      initialLabels={labels}
      initialOpenConversationId={initialOpenConversationId}
    />
  )
}
