import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getClinicByPageId, getChannelAccessToken, processMessengerMessage } from "@/lib/meta/lead-from-messenger"
import { upsertInboxConversation } from "@/lib/inbox/conversations"
import { createDefaultStages } from "@/lib/pipeline/stage-manager"

export const dynamic = "force-dynamic"
export const maxDuration = 30

/**
 * Diagnostic endpoint — runs the full Facebook message processing pipeline
 * step by step and reports exactly where it succeeds or fails.
 * DELETE BEFORE SHIPPING TO REAL PRODUCTION.
 */
export async function GET() {
  const PAGE_ID   = "586633397864360"
  const TEST_PSID = `dbg_${Date.now()}`
  const steps: Record<string, unknown> = {}

  try {
    // ── Step 1: Find clinic ──────────────────────────────────
    const clinic = await getClinicByPageId(PAGE_ID)
    steps.s1_clinic = clinic
      ? { ok: true, id: clinic.id, name: clinic.name }
      : { ok: false, error: "Clinic not found for pageId " + PAGE_ID }
    if (!clinic) throw new Error("s1_clinic failed")

    // ── Step 2: Access token ─────────────────────────────────
    const token = await getChannelAccessToken(clinic.id, "FACEBOOK")
    steps.s2_token = { ok: !!token, len: (token ?? "").length }

    // ── Step 3: Pipeline stages ──────────────────────────────
    await createDefaultStages(clinic.id)
    const firstStage = await db.pipelineStage.findFirst({
      where: { clinicId: clinic.id }, orderBy: { order: "asc" },
    })
    steps.s3_stage = firstStage
      ? { ok: true, id: firstStage.id, name: firstStage.name }
      : { ok: false, error: "No pipeline stages" }
    if (!firstStage) throw new Error("s3_stage failed")

    // ── Step 4: Create lead ──────────────────────────────────
    const newLead = await db.lead.create({
      data: {
        clinicId:      clinic.id,
        fullName:      "Test Debug Lead",
        phone:         "Facebook Messenger",
        source:        "FACEBOOK",
        channel:       "FACEBOOK",
        status:        "NUEVO",
        journeyState:  "PROSPECTO",
        stageId:       firstStage.id,
        lastContactAt: new Date(),
        lastActivityAt: new Date(),
      },
    })
    steps.s4_lead = { ok: true, id: newLead.id }

    // ── Step 5: Create social profile ────────────────────────
    await db.socialProfile.create({
      data: {
        leadId:      newLead.id,
        channel:     "FACEBOOK",
        externalId:  TEST_PSID,
        displayName: "Test Debug Lead",
      },
    })
    steps.s5_socialProfile = { ok: true }

    // ── Step 6: Create message ───────────────────────────────
    await db.message.create({
      data: {
        leadId:            newLead.id,
        direction:         "INBOUND",
        content:           "Hola, soy un lead de prueba desde el endpoint de diagnóstico",
        channel:           "FACEBOOK",
        externalMessageId: `dbg_mid_${Date.now()}`,
        status:            "READ",
        sentAt:            new Date(),
      },
    })
    steps.s6_message = { ok: true }

    // ── Step 7: Journey event ────────────────────────────────
    await db.journeyEvent.create({
      data: {
        leadId:      newLead.id,
        type:        "MESSAGE_RECEIVED",
        toState:     "PROSPECTO",
        isAutomatic: true,
        metadata:    { source: "debug_test", psid: TEST_PSID },
        note:        "Lead de prueba — endpoint /api/debug-process",
      },
    })
    steps.s7_journeyEvent = { ok: true }

    // ── Step 8: Upsert inbox conversation ────────────────────
    const convId = await upsertInboxConversation({
      clinicId:  clinic.id,
      leadId:    newLead.id,
      channel:   "FACEBOOK",
      preview:   "Hola, soy un lead de prueba desde el endpoint de diagnóstico",
      isInbound: true,
    })
    steps.s8_inboxConversation = { ok: true, id: convId }

    // ── Step 9: Full processMessengerMessage simulation ─────
    // Tests the actual webhook code path with a fake event
    const fakeEvent = {
      type:      "message" as const,
      pageId:    PAGE_ID,
      senderId:  `dbg_sim_${Date.now()}`,
      timestamp: Date.now(),
      message:   { mid: `dbg_sim_mid_${Date.now()}`, text: "Mensaje de simulación directa" },
      isEcho:    false,
      postback:  undefined,
    }
    const tokenForSim = await getChannelAccessToken(clinic.id, "FACEBOOK") ?? ""
    const { leadId: simLeadId, isNew: simIsNew } = await processMessengerMessage(
      fakeEvent, tokenForSim, clinic.id
    )
    steps.s9_simulated_webhook = { ok: true, leadId: simLeadId, isNew: simIsNew }

    // ── Step 10: Verify & re-subscribe page to Meta webhook ─
    const GRAPH  = "https://graph.facebook.com/v18.0"
    const PAGE_TOKEN = await getChannelAccessToken(clinic.id, "FACEBOOK") ?? ""

    // Check current subscriptions
    const checkRes = await fetch(`${GRAPH}/${PAGE_ID}/subscribed_apps?access_token=${PAGE_TOKEN}`)
    const checkData = await checkRes.json().catch(() => null)

    // Re-subscribe (idempotent — safe to call even if already subscribed)
    const subBody = new URLSearchParams({
      subscribed_fields: "messages,messaging_postbacks,message_deliveries,message_reads",
      access_token:      PAGE_TOKEN,
    })
    const subRes = await fetch(`${GRAPH}/${PAGE_ID}/subscribed_apps`, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    subBody.toString(),
    })
    const subData = await subRes.json().catch(() => null)
    steps.s10_page_subscription = {
      current:   checkData,
      resubscribe: subData,
    }

    return NextResponse.json({
      success: true,
      message: "All steps passed — check /pipeline and /inbox for the test leads",
      directLeadId:    newLead.id,
      simulatedLeadId: simLeadId,
      steps,
    })

  } catch (err) {
    return NextResponse.json({
      success: false,
      error:   err instanceof Error ? err.message : String(err),
      steps,
    }, { status: 500 })
  }
}
