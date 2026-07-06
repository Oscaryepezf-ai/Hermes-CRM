// Flow Endpoint — Meta llama a este endpoint cuando el usuario navega entre
// pantallas de un WhatsApp Flow. Debe responder cifrado en <1 segundo.
// Ref: https://developers.facebook.com/docs/whatsapp/flows/guides/implementingyourflowendpoint

import { NextRequest, NextResponse } from "next/server"
import { decryptFlowRequest, encryptFlowResponse } from "@/lib/whatsapp/meta-flows-crypto"

export const maxDuration = 10

// Meta verifica el endpoint con GET (health check)
export async function GET() {
  return NextResponse.json({ data: { status: "active" } })
}

export async function POST(req: NextRequest) {
  const privateKey = process.env.WA_FLOWS_PRIVATE_KEY

  // Si no hay clave privada configurada, modo passthrough (solo health check)
  if (!privateKey) {
    return NextResponse.json({ data: { status: "active" } })
  }

  try {
    const body = await req.json()

    // Health check — Meta envía { action: "ping" }
    if (body.action === "ping") {
      return NextResponse.json({ data: { status: "active" } })
    }

    // Descifrar el payload
    const { data, aesKey, iv } = decryptFlowRequest(body, privateKey)

    // Lógica de pantallas — para flows estáticos solo respondemos con los datos
    // que ya tiene el cliente; para flows dinámicos aquí cargaríamos datos de BD
    let response: object

    if (data.action === "INIT") {
      // Primer render — devolver datos iniciales vacíos o dinámicos
      response = { screen: data.screen, data: {} }
    } else if (data.action === "data_exchange") {
      // El cliente pide datos para la siguiente pantalla
      response = { screen: data.screen, data: {} }
    } else {
      // Acción desconocida
      response = { screen: data.screen, data: {} }
    }

    const encrypted = encryptFlowResponse(response, aesKey, iv)
    return new NextResponse(encrypted, {
      status:  200,
      headers: { "Content-Type": "text/plain" },
    })
  } catch (err) {
    console.error("[FlowEndpoint] Error:", err)
    // Devolver health check aunque falle el descifrado (evita que Meta suspenda el flow)
    return NextResponse.json({ data: { status: "active" } })
  }
}
