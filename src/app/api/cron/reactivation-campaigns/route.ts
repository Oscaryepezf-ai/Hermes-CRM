import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runReactivationCycle } from '@/lib/reactivador/run-campaign'

export const dynamic     = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinics = await db.clinic.findMany({
    where:  { reactivadorActive: true },
    select: { id: true, name: true },
  })

  const results: Record<string, unknown>[] = []

  for (const clinic of clinics) {
    try {
      const result = await runReactivationCycle(clinic.id)
      results.push({ clinic: clinic.name, ...result })
      await new Promise(r => setTimeout(r, 3000))
    } catch (err) {
      console.error(`[reactivador-cron] clínica ${clinic.id}:`, err)
      results.push({ clinic: clinic.name, error: String(err) })
    }
  }

  const totalSent = results.reduce(
    (s, r) => s + ((r.messagesSent as number) ?? 0), 0
  )

  return NextResponse.json({
    success:   true,
    clinics:   clinics.length,
    totalSent,
    results,
    timestamp: new Date().toISOString(),
  })
}
