// Integración con Meta Graph API para WhatsApp Flows
// Ref: https://developers.facebook.com/docs/whatsapp/flows/reference/flowsapi

const GRAPH = "https://graph.facebook.com/v23.0"

// ─── Crear flow en Meta ───────────────────────────────────────────────────────

export async function createMetaFlow(opts: {
  wabaId:    string
  name:      string
  category:  string   // LEAD_GENERATION | APPOINTMENT_BOOKING | CUSTOMER_SUPPORT | SURVEY | OTHER
  token:     string
}): Promise<{ success: boolean; flowId?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH}/${opts.wabaId}/flows`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${opts.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name:            opts.name,
        categories:      [opts.category],
        endpoint_uri:    `${process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""}/api/flows/endpoint`,
      }),
    })
    const json = await res.json()
    if (!res.ok || json.error) return { success: false, error: json.error?.message ?? "Error creando flow en Meta" }
    return { success: true, flowId: json.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Subir JSON de pantallas (asset) ─────────────────────────────────────────

export async function uploadFlowAsset(opts: {
  flowId:  string
  screens: object
  token:   string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const blob     = new Blob([JSON.stringify(opts.screens)], { type: "application/json" })
    const formData = new FormData()
    formData.append("file",          blob, "flow.json")
    formData.append("name",          "flow.json")
    formData.append("asset_type",    "FLOW_JSON")
    formData.append("messaging_product", "whatsapp")

    const res = await fetch(`${GRAPH}/${opts.flowId}/assets`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${opts.token}` },
      body:    formData,
    })
    const json = await res.json()
    if (!res.ok || json.error) return { success: false, error: json.error?.message ?? "Error subiendo asset" }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Publicar flow ────────────────────────────────────────────────────────────

export async function publishMetaFlow(opts: {
  flowId: string
  token:  string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${GRAPH}/${opts.flowId}/publish`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${opts.token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({}),
    })
    const json = await res.json()
    if (!res.ok || json.error) return { success: false, error: json.error?.message ?? "Error publicando flow" }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Obtener estado del flow ──────────────────────────────────────────────────

export async function getMetaFlowStatus(opts: {
  flowId: string
  token:  string
}): Promise<{ success: boolean; status?: string; validationErrors?: any[]; error?: string }> {
  try {
    const res = await fetch(`${GRAPH}/${opts.flowId}?fields=status,validation_errors`, {
      headers: { "Authorization": `Bearer ${opts.token}` },
    })
    const json = await res.json()
    if (!res.ok || json.error) return { success: false, error: json.error?.message ?? "Error obteniendo estado" }
    return { success: true, status: json.status, validationErrors: json.validation_errors }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Enviar flow a un contacto ────────────────────────────────────────────────

export async function sendFlowMessage(opts: {
  to:          string   // teléfono con código de país
  flowId:      string
  flowToken:   string   // token único por envío (para trazar la respuesta)
  headerText?: string
  bodyText:    string
  ctaText:     string   // texto del botón que abre el flow
  screenId?:   string   // pantalla inicial (default: primera pantalla)
  phoneId:     string
  token:       string
}): Promise<{ success: boolean; msgId?: string; error?: string }> {
  try {
    const payload: any = {
      messaging_product: "whatsapp",
      to:   opts.to,
      type: "interactive",
      interactive: {
        type: "flow",
        body: { text: opts.bodyText },
        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_token:  opts.flowToken,
            flow_id:     opts.flowId,
            flow_cta:    opts.ctaText,
            flow_action: "navigate",
            flow_action_payload: {
              screen: opts.screenId ?? "FIRST_SCREEN",
              data:   {},
            },
          },
        },
      },
    }

    if (opts.headerText) {
      payload.interactive.header = { type: "text", text: opts.headerText }
    }

    const res = await fetch(`${GRAPH}/${opts.phoneId}/messages`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${opts.token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok || json.error) return { success: false, error: json.error?.message ?? "Error enviando flow" }
    return { success: true, msgId: json.messages?.[0]?.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
