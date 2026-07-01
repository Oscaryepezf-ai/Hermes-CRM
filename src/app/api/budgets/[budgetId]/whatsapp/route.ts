import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '../../../../../../auth'
import { db } from '@/lib/db'
import { getWhatsAppCredentials, sendWhatsAppDocumentMessage } from '@/lib/whatsapp/client'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { budgetId } = await params

  const budget = await db.budget.findUnique({
    where:   { id: budgetId },
    include: { lead: { select: { id: true, phone: true, fullName: true } } },
  })
  if (!budget || budget.clinicId !== session.user.clinicId) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
  }
  if (!budget.lead.phone || budget.lead.phone.startsWith('SIM-')) {
    return NextResponse.json({ error: 'Este lead no tiene número de WhatsApp real' }, { status: 400 })
  }

  // Receive the PDF blob from the client
  const formData = await req.formData()
  const pdfFile  = formData.get('pdf') as File | null
  if (!pdfFile || pdfFile.size === 0) {
    return NextResponse.json({ error: 'Falta el archivo PDF' }, { status: 400 })
  }

  // Upload to Vercel Blob (public URL required by WhatsApp API)
  const filename = `Presupuesto-${String(budget.number).padStart(3, '0')}-${budget.lead.fullName.replace(/\s+/g, '_')}.pdf`
  const blob = await put(
    `budgets/${budget.clinicId}/${budgetId}/${filename}`,
    pdfFile,
    { access: 'public', contentType: 'application/pdf' }
  )

  // Get WhatsApp credentials and send document
  const creds = await getWhatsAppCredentials(budget.clinicId)
  let delivered = false
  if (creds) {
    delivered = await sendWhatsAppDocumentMessage(
      budget.lead.phone,
      blob.url,
      filename,
      `Hola, te adjuntamos tu presupuesto dental. Cualquier consulta estamos a la orden.`,
      creds
    )
  }

  // Persist outbound message in DB
  await db.message.create({
    data: {
      leadId:      budget.leadId,
      direction:   'OUTBOUND',
      content:     `[PDF] ${filename}`,
      mediaUrl:    blob.url,
      channel:     'WHATSAPP',
      status:      delivered ? 'SENT' : 'FAILED',
      isAutomatic: false,
    },
  })

  // Update budget status to ENVIADO
  await db.budget.update({
    where: { id: budgetId },
    data:  { status: 'ENVIADO', sentAt: new Date() },
  })
  await db.lead.update({
    where: { id: budget.leadId },
    data:  { status: 'PRESUPUESTO_ENVIADO' },
  }).catch(() => {})

  // Find the InboxConversation for this lead (WhatsApp channel)
  const conversation = await db.inboxConversation.findFirst({
    where: { leadId: budget.leadId, clinicId: budget.clinicId, channel: 'WHATSAPP' },
    select: { id: true },
  })

  return NextResponse.json({
    success:        true,
    delivered,
    pdfUrl:         blob.url,
    leadId:         budget.leadId,
    conversationId: conversation?.id ?? null,
  })
}
