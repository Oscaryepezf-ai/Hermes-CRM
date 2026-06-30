import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { db } from '@/lib/db'

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { sessionId } = await req.json() as { sessionId: string }
  if (!sessionId) return NextResponse.json({ error: 'Falta sessionId' }, { status: 400 })

  const simPhone = `SIM-${sessionId}`
  const lead = await db.lead.findFirst({
    where: { phone: simPhone, clinicId: session.user.clinicId },
  })

  if (lead) {
    await db.agentConversation.deleteMany({ where: { leadId: lead.id } })
    await db.message.deleteMany({ where: { leadId: lead.id } })
    await db.leadHistory.deleteMany({ where: { leadId: lead.id } })
    await db.journeyEvent.deleteMany({ where: { leadId: lead.id } })
    await db.lead.delete({ where: { id: lead.id } })
  }

  return NextResponse.json({ success: true })
}
