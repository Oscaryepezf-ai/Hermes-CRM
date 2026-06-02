import { db } from '@/lib/db'
import { addDays } from 'date-fns'
import { generateReactivationMessage } from './campaign-generator'
import type { PatientToReactivate } from './segment-patients'

async function sendReactivationWhatsApp(
  phone:   string,
  message: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to:   phone.replace(/\D/g, ''),
          type: 'text',
          text: { body: message },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json()
      console.error('[reactivador] WhatsApp error:', err)
      return { success: false }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    console.error('[reactivador] send error:', error)
    return { success: false }
  }
}

export async function createCampaign(
  patient:     PatientToReactivate,
  clinicId:    string,
  daysBetween: number = 7,
  maxAttempts: number = 3
): Promise<string> {
  const campaign = await db.reactivationCampaign.create({
    data: {
      clinicId,
      leadId:            patient.leadId,
      segment:           patient.segment,
      treatmentFocus:    patient.lastTreatment,
      daysSinceLastAppt: patient.daysSinceLastAppt,
      status:            'PENDING',
      maxAttempts,
      nextAttemptAt:     new Date(),
    },
  })

  return campaign.id
}

export async function executeCampaignAttempt(params: {
  campaignId:  string
  clinicId:    string
  clinicName:  string
  patient:     PatientToReactivate
  incentive?:  string
  tone:        'amigable' | 'formal'
  daysBetween: number
}): Promise<{ success: boolean; attempted: boolean }> {
  const campaign = await db.reactivationCampaign.findUnique({
    where: { id: params.campaignId },
  })

  if (!campaign) return { success: false, attempted: false }

  if (campaign.attemptCount >= campaign.maxAttempts) {
    await db.reactivationCampaign.update({
      where: { id: params.campaignId },
      data:  { status: 'EXHAUSTED' },
    })
    return { success: false, attempted: false }
  }

  if (campaign.nextAttemptAt && campaign.nextAttemptAt > new Date()) {
    return { success: true, attempted: false }
  }

  const attemptNumber = campaign.attemptCount + 1

  const message = await generateReactivationMessage({
    patient:       params.patient,
    attemptNumber,
    clinicId:      params.clinicId,
    clinicName:    params.clinicName,
    incentive:     params.incentive,
    tone:          params.tone,
  })

  const sendResult = await sendReactivationWhatsApp(params.patient.phone, message)

  const now           = new Date()
  const isLastAttempt = attemptNumber >= campaign.maxAttempts
  const nextAttemptAt = addDays(now, params.daysBetween)

  await db.$transaction([
    db.reactivationCampaign.update({
      where: { id: params.campaignId },
      data: {
        status:        sendResult.success
          ? (isLastAttempt ? 'EXHAUSTED' : 'ACTIVE')
          : 'PENDING',
        attemptCount:  { increment: 1 },
        lastAttemptAt: now,
        nextAttemptAt: isLastAttempt ? null : nextAttemptAt,
      },
    }),

    db.campaignMessage.create({
      data: {
        campaignId:    params.campaignId,
        channel:       'WHATSAPP',
        content:       message,
        attemptNumber,
        externalMsgId: sendResult.messageId,
      },
    }),

    db.lead.update({
      where: { id: params.patient.leadId },
      data: {
        lastActivityAt:   now,
        totalTouchpoints: { increment: 1 },
      },
    }),

    db.journeyEvent.create({
      data: {
        leadId:      params.patient.leadId,
        type:        'AI_REENGAGED',
        isAutomatic: true,
        metadata: {
          agent:         'REACTIVADOR',
          attemptNumber,
          campaignId:    params.campaignId,
          channel:       'WHATSAPP',
          messageSent:   sendResult.success,
        },
        note: `Hermes Reactivador — intento ${attemptNumber} de ${campaign.maxAttempts}`,
      },
    }),
  ])

  return { success: sendResult.success, attempted: true }
}
