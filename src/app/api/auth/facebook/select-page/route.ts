import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import { db } from "@/lib/db"

type StoredPage = {
  id:       string
  name:     string
  category: string
  picture:  string
  token:    string
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { pageId } = await request.json() as { pageId: string }
  if (!pageId) {
    return NextResponse.json({ error: "pageId requerido" }, { status: 400 })
  }

  // Read pages from cookie
  const pagesRaw   = request.cookies.get("fb_pages")?.value
  const clinicIdCk = request.cookies.get("fb_clinic_id")?.value

  if (!pagesRaw || !clinicIdCk) {
    return NextResponse.json({ error: "Sesión de conexión expirada. Inicia el proceso de nuevo." }, { status: 400 })
  }

  // Security: ensure cookie clinicId matches session clinicId
  if (clinicIdCk !== session.user.clinicId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  let pages: StoredPage[]
  try {
    pages = JSON.parse(pagesRaw)
  } catch {
    return NextResponse.json({ error: "Datos de páginas inválidos" }, { status: 400 })
  }

  const selected = pages.find(p => p.id === pageId)
  if (!selected) {
    return NextResponse.json({ error: "Página no encontrada" }, { status: 404 })
  }

  const clinicId = session.user.clinicId

  await db.$transaction([
    db.clinicChannel.upsert({
      where:  { clinicId_channel: { clinicId, channel: "FACEBOOK" } },
      create: {
        clinicId,
        channel:     "FACEBOOK",
        isActive:    true,
        pageId:      selected.id,
        accessToken: selected.token,
        connectedAt: new Date(),
        metadata:    { pageName: selected.name, category: selected.category },
      },
      update: {
        isActive:    true,
        pageId:      selected.id,
        accessToken: selected.token,
        connectedAt: new Date(),
        metadata:    { pageName: selected.name, category: selected.category },
      },
    }),
    db.clinic.update({
      where: { id: clinicId },
      data:  { facebookPageId: selected.id, messengerActive: true },
    }),
  ])

  // Clear cookies
  const res = NextResponse.json({ success: true })
  res.cookies.set("fb_pages",     "", { maxAge: 0, path: "/" })
  res.cookies.set("fb_clinic_id", "", { maxAge: 0, path: "/" })

  return res
}
