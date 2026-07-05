import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import { db } from "@/lib/db"
import { sendTemplateMessage, buildSendComponents } from "@/lib/whatsapp/wa-template-api"
import type { WaHeaderType } from "@prisma/client"
import type { TemplateButton } from "@/lib/actions/wa-templates"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const clinicId = session.user.clinicId
  const body     = await req.json()
  const { templateId, name, targetFilter, variableMap } = body

  if (!templateId || !name) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })
  }

  // Load template
  const template = await db.waTemplate.findFirst({
    where:   { id: templateId, clinicId },
    include: { clinic: { include: { channels: true } } },
  })
  if (!template) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
  if (template.status !== "APROBADA") {
    return NextResponse.json({ error: "La plantilla debe estar aprobada por Meta" }, { status: 400 })
  }

  const waChannel = template.clinic.channels.find(c => c.channel === "WHATSAPP")
  if (!waChannel?.accessToken || !waChannel?.pageId) {
    return NextResponse.json({ error: "Canal WhatsApp no configurado" }, { status: 400 })
  }

  // Build lead query
  const whereClause: any = { clinicId, phone: { not: null } }
  if (!targetFilter?.all && targetFilter?.stageIds?.length > 0) {
    whereClause.stageId = { in: targetFilter.stageIds }
  }

  const leads = await db.lead.findMany({
    where:  whereClause,
    select: { id: true, fullName: true, phone: true, email: true, interest: true },
    take:   500, // safety cap
  })

  if (leads.length === 0) {
    return NextResponse.json({ error: "No hay leads con número de teléfono en el filtro seleccionado" }, { status: 400 })
  }

  // Create campaign record
  const campaign = await db.waCampaign.create({
    data: {
      clinicId,
      templateId,
      name,
      status:       "ENVIANDO",
      targetFilter: targetFilter ?? {},
      variableMap:  variableMap  ?? {},
      totalCount:   leads.length,
    },
  })

  // Field resolver
  function resolveField(lead: any, field: string): string {
    if (field === "firstName") return lead.fullName?.split(" ")[0] ?? ""
    return String(lead[field] ?? "")
  }

  // Build body vars from variableMap
  function buildBodyVars(lead: any): string[] {
    const vm = variableMap as Record<string, string>
    const indices = Object.keys(vm).map(Number).sort((a, b) => a - b)
    return indices.map(i => resolveField(lead, vm[String(i)] ?? "fullName"))
  }

  // Send to each lead
  let sentCount = 0
  let failedCount = 0
  const sends: any[] = []

  for (const lead of leads) {
    const phone = (lead.phone ?? "").replace(/\D/g, "")
    if (!phone) { failedCount++; continue }

    const bodyVars = buildBodyVars(lead)
    const components = buildSendComponents({
      headerType:  template.headerType as WaHeaderType | null,
      bodyVars,
    })

    const result = await sendTemplateMessage({
      to:           phone,
      templateName: template.name,
      language:     template.language,
      components:   components.length > 0 ? components : undefined,
      phoneId:      waChannel.pageId!,
      token:        waChannel.accessToken!,
    })

    sends.push({
      campaignId: campaign.id,
      leadId:     lead.id,
      phone,
      status:     result.success ? "ENVIADO" : "FALLIDO",
      errorMsg:   result.error ?? null,
      sentAt:     result.success ? new Date() : null,
    })

    if (result.success) sentCount++
    else failedCount++

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100))
  }

  // Persist sends in batch
  await db.waCampaignSend.createMany({ data: sends })

  // Update campaign status
  await db.waCampaign.update({
    where: { id: campaign.id },
    data: {
      status:      "COMPLETADA",
      completedAt: new Date(),
      sentCount,
      failedCount,
    },
  })

  return NextResponse.json({ success: true, sent: sentCount, failed: failedCount })
}
