import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getClinicByPageId, getChannelAccessToken } from "@/lib/meta/lead-from-messenger"
import { upsertInboxConversation } from "@/lib/inbox/conversations"
import { createDefaultStages } from "@/lib/pipeline/stage-manager"

export const dynamic = "force-dynamic"

/**
 * Diagnostic endpoint — runs the full Facebook message processing pipeline
 * step by step and reports exactly where it succeeds or fails.
 * DELETE BEFORE SHIPPING TO REAL PRODUCTION.
 */
export async function GET() {
  const PAGE_ID  = "586633397864360"
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

    return NextResponse.json({
      success: true,
      message: "All steps passed — check /pipeline and /inbox for the test lead",
      leadId:  newLead.id,
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
