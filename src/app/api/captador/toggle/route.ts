import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { active, config } = await request.json() as {
    active?: boolean
    config?: Record<string, unknown>
  }

  const clinic = await db.clinic.update({
    where: { id: session.user.clinicId },
    data: {
      ...(active !== undefined && { captadorActive: active }),
      ...(config  !== undefined && { captadorConfig: JSON.parse(JSON.stringify(config)) }),
    },
    select: { captadorActive: true, captadorConfig: true },
  })

  return NextResponse.json({ success: true, data: clinic })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const clinic = await db.clinic.findUnique({
    where:  { id: session.user.clinicId },
    select: { captadorActive: true, captadorConfig: true },
  })

  // Also get stats
  const stats = await db.agentConversation.aggregate({
    where:   { lead: { clinicId: session.user.clinicId }, agentType: 'CAPTADOR' },
    _count:  { id: true },
  })

  const handedOff = await db.agentConversation.count({
    where: { lead: { clinicId: session.user.clinicId }, status: { in: ['HANDED_OFF', 'COMPLETED'] } },
  })

  return NextResponse.json({
    success:       true,
    active:        clinic?.captadorActive ?? false,
    config:        clinic?.captadorConfig ?? null,
    totalLeads:    stats._count.id,
    handedOff,
  })
}
