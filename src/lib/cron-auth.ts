import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"

/**
 * Verifica el header Authorization de un cron de Vercel.
 * Falla cerrado: si CRON_SECRET no está definido, rechaza todo.
 * Devuelve una respuesta 401/500 si no está autorizado, o null si todo OK.
 */
export function verifyCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[cron] CRON_SECRET no está configurado — petición rechazada")
    return NextResponse.json({ error: "Cron no configurado" }, { status: 500 })
  }
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get("authorization") ?? "")
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
