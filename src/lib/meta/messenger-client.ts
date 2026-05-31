const GRAPH_BASE = 'https://graph.facebook.com/v18.0'

export async function sendMessengerMessage(
  recipientPsid:   string,
  text:            string,
  pageAccessToken: string
): Promise<{ messageId: string } | null> {
  try {
    const res = await fetch(`${GRAPH_BASE}/me/messages`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${pageAccessToken}`,
      },
      body: JSON.stringify({
        recipient:      { id: recipientPsid },
        message:        { text },
        messaging_type: 'RESPONSE',
      }),
    })

    if (!res.ok) {
      console.error('[messenger] send error:', await res.json())
      return null
    }

    const data = await res.json()
    return { messageId: data.message_id as string }
  } catch (err) {
    console.error('[messenger] client error:', err)
    return null
  }
}

export async function getMessengerUserProfile(
  psid:            string,
  pageAccessToken: string
): Promise<{
  name: string; firstName: string; lastName: string
  profilePic: string; locale: string; timezone: number
} | null> {
  try {
    const fields = 'first_name,last_name,profile_pic,locale,timezone'
    const res = await fetch(
      `${GRAPH_BASE}/${psid}?fields=${fields}&access_token=${pageAccessToken}`
    )
    if (!res.ok) return null

    const d = await res.json()
    return {
      name:       `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim(),
      firstName:  d.first_name ?? '',
      lastName:   d.last_name ?? '',
      profilePic: d.profile_pic ?? '',
      locale:     d.locale ?? 'es_CO',
      timezone:   d.timezone ?? -5,
    }
  } catch {
    return null
  }
}

export async function markMessengerMessageSeen(
  recipientPsid:   string,
  pageAccessToken: string
): Promise<void> {
  await fetch(`${GRAPH_BASE}/me/messages`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pageAccessToken}` },
    body: JSON.stringify({ recipient: { id: recipientPsid }, sender_action: 'mark_seen' }),
  }).catch(() => {})
}

export async function showMessengerTyping(
  recipientPsid:   string,
  pageAccessToken: string
): Promise<void> {
  await fetch(`${GRAPH_BASE}/me/messages`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pageAccessToken}` },
    body: JSON.stringify({ recipient: { id: recipientPsid }, sender_action: 'typing_on' }),
  }).catch(() => {})
}

export async function getLongLivedPageToken(shortLivedToken: string): Promise<string | null> {
  try {
    const url =
      `${GRAPH_BASE}/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${process.env.META_APP_ID}` +
      `&client_secret=${process.env.META_APP_SECRET}` +
      `&fb_exchange_token=${shortLivedToken}`

    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return (data.access_token as string) ?? null
  } catch {
    return null
  }
}
