import { webpush } from './vapid'
import { db } from '@/lib/db'
import type { PushPayload } from './notification-templates'

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId, isActive: true },
  })

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 86400 }
      )
      sent++
    } catch (error: unknown) {
      const e = error as { statusCode?: number }
      if (e.statusCode === 410 || e.statusCode === 404) {
        await db.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        })
      }
      failed++
    }
  }

  return { sent, failed }
}

export async function sendPushToClinicAdmins(
  clinicId: string,
  payload: PushPayload
): Promise<void> {
  const admins = await db.user.findMany({
    where: {
      clinicId,
      role: { in: ['ADMIN', 'DOCTOR'] },
      pushSubscriptions: { some: { isActive: true } },
    },
    select: { id: true },
  })

  await Promise.allSettled(admins.map((admin) => sendPushToUser(admin.id, payload)))
}
