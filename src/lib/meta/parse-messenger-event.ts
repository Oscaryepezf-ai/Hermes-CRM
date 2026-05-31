export type MessengerAttachment = {
  type:    'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker'
  payload: { url?: string; sticker_id?: number }
}

export type MessengerMessage = {
  mid:          string
  text?:        string
  attachments?: MessengerAttachment[]
  quick_reply?: { payload: string }
  is_echo?:     boolean
}

export type ParsedMessengerEvent = {
  type:      'message' | 'postback' | 'read' | 'delivery' | 'unknown'
  pageId:    string
  senderId:  string
  timestamp: number
  message?:  MessengerMessage
  postback?: { title: string; payload: string }
  isEcho:    boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMessengerWebhookPayload(body: any): ParsedMessengerEvent[] {
  const events: ParsedMessengerEvent[] = []

  if (body.object !== 'page') return events

  for (const entry of body.entry ?? []) {
    const pageId = entry.id as string

    for (const messaging of entry.messaging ?? []) {
      const senderId  = messaging.sender?.id as string
      const timestamp = messaging.timestamp as number
      const isEcho    = messaging.message?.is_echo ?? false

      if (isEcho) continue

      if (messaging.message) {
        events.push({ type: 'message', pageId, senderId, timestamp, message: messaging.message, isEcho })
        continue
      }

      if (messaging.postback) {
        events.push({ type: 'postback', pageId, senderId, timestamp, postback: messaging.postback, isEcho: false })
        continue
      }

      if (messaging.read || messaging.delivery) {
        events.push({ type: messaging.read ? 'read' : 'delivery', pageId, senderId, timestamp, isEcho: false })
      }
    }
  }

  return events
}
