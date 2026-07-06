// Meta Conversions API (CAPI) — server-to-server event reporting.
// Sends business events directly to Meta so campaigns can optimize without
// relying on browser pixels (blocked by ad blockers, iOS privacy, etc.).
// Ref: https://developers.facebook.com/docs/marketing-api/conversions-api

import { createHash, randomUUID } from "crypto"

const GRAPH = "https://graph.facebook.com/v23.0"

// ─── PII hashing — Meta requires SHA-256 on all user data ────────────────────
// Normalize → lowercase → trim → sha256 hex
function hash(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

// ─── Event types supported ────────────────────────────────────────────────────
export type MetaEventName =
  | "Lead"                  // Nuevo lead creado desde WhatsApp
  | "Contact"               // Primera respuesta del agente IA
  | "CompleteRegistration"  // Lead calificado / handoff a humano
  | "Schedule"              // Cita agendada
  | "Purchase"              // Pago registrado

type EventPayload = {
  eventName:    MetaEventName
  eventTime?:   number          // Unix timestamp — defaults to now
  eventId?:     string          // For dedup between pixel + CAPI
  actionSource: "chat" | "system_generated" | "phone_call" | "website" | "other"
  // User data — all fields are hashed automatically
  phone?:       string
  email?:       string
  firstName?:   string
  lastName?:    string
  // Custom data for the event
  currency?:    string          // ISO 4217 — ej: "USD"
  value?:       number          // Revenue amount
  contentName?: string          // Ej: "Ortodoncia - Consulta inicial"
  contentCategory?: string      // Ej: "Dental"
  // Optional dedup / attribution
  fbp?:         string          // _fbp cookie value from browser
  fbc?:         string          // _fbc cookie value from browser (click ID)
}

type SendResult = { success: boolean; error?: string }

// ─── Core sender ──────────────────────────────────────────────────────────────

export async function sendConversionEvent(payload: EventPayload): Promise<SendResult> {
  const pixelId = process.env.META_PIXEL_ID
  const token   = process.env.META_CAPI_TOKEN

  // Silently skip if CAPI is not configured — non-blocking
  if (!pixelId || !token) return { success: false, error: "CAPI not configured" }

  const eventTime = payload.eventTime ?? Math.floor(Date.now() / 1000)
  const eventId   = payload.eventId   ?? randomUUID()

  const userData: Record<string, string | string[] | undefined> = {}
  const ph = hash(payload.phone?.replace(/\D/g, ""))  // digits only before hashing
  const em = hash(payload.email)
  const fn = hash(payload.firstName)
  const ln = hash(payload.lastName)
  if (ph) userData.ph = [ph]
  if (em) userData.em = [em]
  if (fn) userData.fn = [fn]
  if (ln) userData.ln = [ln]
  if (payload.fbp) userData.fbp = payload.fbp
  if (payload.fbc) userData.fbc = payload.fbc

  const customData: Record<string, unknown> = {}
  if (payload.currency)        customData.currency         = payload.currency
  if (payload.value != null)   customData.value            = payload.value
  if (payload.contentName)     customData.content_name     = payload.contentName
  if (payload.contentCategory) customData.content_category = payload.contentCategory

  const body = {
    data: [{
      event_name:    payload.eventName,
      event_time:    eventTime,
      event_id:      eventId,
      action_source: payload.actionSource,
      user_data:     userData,
      ...(Object.keys(customData).length > 0 && { custom_data: customData }),
    }],
    // test_event_code: process.env.META_CAPI_TEST_CODE,  // uncomment for testing
  }

  try {
    const res  = await fetch(`${GRAPH}/${pixelId}/events`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok || json.error) {
      console.error("[CAPI] error:", json.error?.message ?? json)
      return { success: false, error: json.error?.message }
    }
    console.log(`[CAPI] ${payload.eventName} sent — fbe: ${json.fbe_event_id ?? "n/a"}, events_received: ${json.events_received}`)
    return { success: true }
  } catch (err) {
    console.error("[CAPI] fetch error:", err)
    return { success: false, error: String(err) }
  }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

/** Lead creado desde WhatsApp */
export function capiFire_Lead(lead: { phone: string; fullName?: string; email?: string | null }) {
  const [firstName, ...rest] = (lead.fullName ?? "").split(" ")
  return sendConversionEvent({
    eventName:    "Lead",
    actionSource: "chat",
    phone:        lead.phone,
    email:        lead.email ?? undefined,
    firstName,
    lastName:     rest.join(" ") || undefined,
    contentName:  "WhatsApp Lead",
    contentCategory: "Dental",
  }).catch(console.error)
}

/** Primera respuesta del agente → contacto establecido */
export function capiFire_Contact(lead: { phone: string; email?: string | null }) {
  return sendConversionEvent({
    eventName:    "Contact",
    actionSource: "chat",
    phone:        lead.phone,
    email:        lead.email ?? undefined,
  }).catch(console.error)
}

/** Handoff — lead completamente calificado */
export function capiFire_CompleteRegistration(lead: {
  phone: string; email?: string | null; treatment?: string | null
}) {
  return sendConversionEvent({
    eventName:    "CompleteRegistration",
    actionSource: "system_generated",
    phone:        lead.phone,
    email:        lead.email ?? undefined,
    contentName:  lead.treatment ?? "Consulta dental",
    contentCategory: "Dental",
  }).catch(console.error)
}

/** Cita agendada */
export function capiFire_Schedule(lead: {
  phone: string; email?: string | null; treatment?: string | null
}) {
  return sendConversionEvent({
    eventName:    "Schedule",
    actionSource: "system_generated",
    phone:        lead.phone,
    email:        lead.email ?? undefined,
    contentName:  lead.treatment ?? "Consulta dental",
    contentCategory: "Dental",
  }).catch(console.error)
}

/** Pago registrado */
export function capiFire_Purchase(opts: {
  phone: string; email?: string | null; amount: number; currency?: string; description?: string
}) {
  return sendConversionEvent({
    eventName:    "Purchase",
    actionSource: "system_generated",
    phone:        opts.phone,
    email:        opts.email ?? undefined,
    value:        opts.amount,
    currency:     opts.currency ?? "USD",
    contentName:  opts.description ?? "Tratamiento dental",
    contentCategory: "Dental",
  }).catch(console.error)
}
