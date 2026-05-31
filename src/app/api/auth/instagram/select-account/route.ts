import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { db } from '@/lib/db'

type StoredAccount = {
  pageId: string; pageName: string; igId: string
  igName: string; igUsername: string; igPicture: string; pageToken: string
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { igId } = await request.json() as { igId: string }
  if (!igId) return NextResponse.json({ error: 'igId requerido' }, { status: 400 })

  const accountsRaw = request.cookies.get('ig_accounts')?.value
  const clinicIdCk  = request.cookies.get('ig_clinic_id')?.value

  if (!accountsRaw || !clinicIdCk) {
    return NextResponse.json({ error: 'Sesión expirada. Inicia el proceso de nuevo.' }, { status: 400 })
  }
  if (clinicIdCk !== session.user.clinicId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  let accounts: StoredAccount[]
  try { accounts = JSON.parse(accountsRaw) } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const selected = accounts.find(a => a.igId === igId)
  if (!selected) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

  const clinicId = session.user.clinicId
  await db.$transaction([
    db.clinicChannel.upsert({
      where:  { clinicId_channel: { clinicId, channel: 'INSTAGRAM' } },
      create: {
        clinicId, channel: 'INSTAGRAM', isActive: true,
        pageId:      selected.igId,
        accessToken: selected.pageToken,
        connectedAt: new Date(),
        metadata:    { igUsername: selected.igUsername, igName: selected.igName, pageName: selected.pageName, facebookPageId: selected.pageId },
      },
      update: {
        isActive: true, pageId: selected.igId, accessToken: selected.pageToken,
        connectedAt: new Date(),
        metadata: { igUsername: selected.igUsername, igName: selected.igName, pageName: selected.pageName, facebookPageId: selected.pageId },
      },
    }),
    db.clinic.update({ where: { id: clinicId }, data: { instagramActive: true } }),
  ])

  const res = NextResponse.json({ success: true })
  res.cookies.set('ig_accounts',  '', { maxAge: 0, path: '/' })
  res.cookies.set('ig_clinic_id', '', { maxAge: 0, path: '/' })
  return res
}
