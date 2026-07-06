// Integración con Meta Graph API para plantillas de WhatsApp Business

import type { WaTemplate, WaHeaderType } from "@prisma/client"
import type { TemplateButton } from "@/lib/actions/wa-templates"

const GRAPH_URL = "https://graph.facebook.com/v23.0"

// ─── Submit template to Meta for approval ─────────────────────────────────────

export async function submitTemplateToMeta(
  tpl: WaTemplate & { buttons?: any; bodyExamples?: any },
  wabaId: string,    // WhatsApp Business Account ID (pageId del canal)
  token:  string,
): Promise<{ success: boolean; metaId?: string; error?: string }> {
  try {
    const components = buildComponents(tpl)

    const body = {
      name:             tpl.name,
      language:         tpl.language,
      category:         tpl.category,
      parameter_format: "positional",
      components,
    }

    const res = await fetch(`${GRAPH_URL}/${wabaId}/message_templates`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(body),
    })

    const json = await res.json()

    if (!res.ok || json.error) {
      const msg = json.error?.error_user_msg ?? json.error?.message ?? "Error desconocido de Meta"
      return { success: false, error: msg }
    }

    return { success: true, metaId: json.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Sync status from Meta ────────────────────────────────────────────────────

export async function syncTemplateStatusFromMeta(
  metaId: string,
  token:  string,
): Promise<{ success: boolean; metaStatus?: string; rejectionReason?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH_URL}/${metaId}?fields=status,rejected_reason`, {
      headers: { "Authorization": `Bearer ${token}` },
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      return { success: false, error: json.error?.message ?? "Error al consultar Meta" }
    }

    return {
      success:         true,
      metaStatus:      json.status,      // APPROVED / REJECTED / PENDING / DISABLED
      rejectionReason: json.rejected_reason ?? undefined,
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Send approved template message ───────────────────────────────────────────

export async function sendTemplateMessage(opts: {
  to:           string        // phone number with country code, no +
  templateName: string
  language:     string
  components?:  object[]
  phoneId:      string
  token:        string
}): Promise<{ success: boolean; msgId?: string; error?: string }> {
  try {
    const body: any = {
      messaging_product: "whatsapp",
      to:                opts.to,
      type:              "template",
      template: {
        name:     opts.templateName,
        language: { code: opts.language },
      },
    }
    if (opts.components?.length) {
      body.template.components = opts.components
    }

    const res = await fetch(`${GRAPH_URL}/${opts.phoneId}/messages`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${opts.token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      return { success: false, error: json.error?.message ?? "Error al enviar" }
    }

    return { success: true, msgId: json.messages?.[0]?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Build Meta API components array ─────────────────────────────────────────

function buildComponents(tpl: WaTemplate & { buttons?: any; bodyExamples?: any }): object[] {
  const components: object[] = []

  // HEADER
  if (tpl.headerType) {
    if (tpl.headerType === "TEXT" && tpl.headerText) {
      const comp: any = { type: "HEADER", format: "TEXT", text: tpl.headerText }
      if (tpl.headerExample) {
        comp.example = { header_text: [tpl.headerExample] }
      }
      components.push(comp)
    } else if (tpl.headerType !== "TEXT") {
      const formatMap: Record<WaHeaderType, string> = {
        TEXT:     "TEXT",
        IMAGE:    "IMAGE",
        VIDEO:    "VIDEO",
        DOCUMENT: "DOCUMENT",
      }
      components.push({ type: "HEADER", format: formatMap[tpl.headerType] })
    }
  }

  // BODY
  const bodyComp: any = { type: "BODY", text: tpl.body }
  const examples = Array.isArray(tpl.bodyExamples) ? tpl.bodyExamples as string[] : []
  if (examples.length > 0) {
    bodyComp.example = { body_text: [examples] }
  }
  components.push(bodyComp)

  // FOOTER
  if (tpl.footer) {
    components.push({ type: "FOOTER", text: tpl.footer })
  }

  // BUTTONS
  const buttons: TemplateButton[] = Array.isArray(tpl.buttons) ? tpl.buttons : []
  if (buttons.length > 0) {
    components.push({
      type:    "BUTTONS",
      buttons: buttons.map((b) => {
        if (b.type === "QUICK_REPLY") return { type: "QUICK_REPLY", text: b.text }
        if (b.type === "URL")          return { type: "URL", text: b.text, url: b.value ?? "" }
        if (b.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: b.text, phone_number: b.value ?? "" }
        return b
      }),
    })
  }

  return components
}

// ─── Build components for sending (with variable values) ─────────────────────

export function buildSendComponents(opts: {
  headerType?:  WaHeaderType | null
  headerValue?: string   // URL pública si IMAGE/VIDEO/DOCUMENT
  bodyVars?:    string[] // valores para {{1}}, {{2}}...
  buttons?:     TemplateButton[]
}): object[] {
  const components: object[] = []

  if (opts.headerType && opts.headerType !== "TEXT" && opts.headerValue) {
    const typeMap: Record<string, string> = { IMAGE: "image", VIDEO: "video", DOCUMENT: "document" }
    components.push({
      type: "header",
      parameters: [{ type: typeMap[opts.headerType], [typeMap[opts.headerType]]: { link: opts.headerValue } }],
    })
  }

  if (opts.bodyVars && opts.bodyVars.length > 0) {
    components.push({
      type: "body",
      parameters: opts.bodyVars.map(v => ({ type: "text", text: v })),
    })
  }

  return components
}
