import { NextRequest, NextResponse } from "next/server";

// GET no modifica datos (los previsualizadores de enlaces de WhatsApp/email
// lo ejecutan solos). Redirige a la página /confirm/[code], donde el paciente
// confirma con un botón (POST vía Server Action).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  return NextResponse.redirect(new URL(`/confirm/${encodeURIComponent(code)}`, request.url));
}
