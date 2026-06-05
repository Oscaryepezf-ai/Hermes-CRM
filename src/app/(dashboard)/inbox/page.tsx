import { redirect } from "next/navigation"
import { auth } from "../../../../auth"
import { getInboxConversations, getInboxCounts, getClinicLabels } from "@/lib/inbox/conversations"
import { InboxClient } from "@/components/inbox/InboxClient"

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const session = await auth()
  if (!session?.user?.clinicId) redirect("/login")

  const clinicId = session.user.clinicId

  const [{ conversations }, counts, labels] = await Promise.all([
    getInboxConversations(clinicId, {}, 1, 30),
    getInboxCounts(clinicId),
    getClinicLabels(clinicId),
  ])

  return (
    <InboxClient
      initialConversations={conversations}
      initialCounts={counts}
      initialLabels={labels}
    />
  )
}
