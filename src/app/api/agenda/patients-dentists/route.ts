import { NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [patients, dentists] = await Promise.all([
    db.patient.findMany({
      where: { clinicId: session.user.clinicId },
      select: { id: true, fullName: true, phone: true },
      orderBy: { fullName: "asc" },
    }),
    db.user.findMany({
      where: {
        clinicId: session.user.clinicId,
        role: { in: ["ADMIN", "DOCTOR"] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return NextResponse.json({ patients, dentists })
}
