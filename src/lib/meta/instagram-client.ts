const GRAPH = 'https://graph.facebook.com/v18.0'

type IgBusinessAccount = {
  id:                  string
  name:                string
  username:            string
  profile_picture_url: string
}

// ── Get Instagram Business Accounts linked to a Page ─────
// Each Facebook Page can have one linked Instagram Professional account
export async function getPageInstagramAccount(
  pageId:    string,
  pageToken: string
): Promise<IgBusinessAccount | null> {
  try {
    const res = await fetch(
      `${GRAPH}/${pageId}?fields=instagram_business_account{id,name,username,profile_picture_url}&access_token=${pageToken}`
    )
    if (!res.ok) return null
    const data = await res.json() as { instagram_business_account?: IgBusinessAccount }
    return data.instagram_business_account ?? null
  } catch {
    return null
  }
}

// ── Send Instagram DM ─────────────────────────────────────
// Uses the Page Access Token of the page linked to the IG account
export async function sendInstagramMessage(
  igBusinessAccountId: string,
  recipientIgsid:      string,
  text:                string,
  pageAccessToken:     string
): Promise<{ messageId: string } | null> {
  try {
    const res = await fetch(`${GRAPH}/${igBusinessAccountId}/messages`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${pageAccessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientIgsid },
        message:   { text },
      }),
    })
    if (!res.ok) {
      console.error('[instagram] send error:', await res.json())
      return null
    }
    const data = await res.json() as { message_id: string }
    return { messageId: data.message_id }
  } catch (err) {
    console.error('[instagram] client error:', err)
    return null
  }
}

// ── Get Instagram user profile by IGSID ──────────────────
export async function getInstagramUserProfile(
  igsid:           string,
  pageAccessToken: string
): Promise<{ name: string; username: string; profilePic: string } | null> {
  try {
    const res = await fetch(
      `${GRAPH}/${igsid}?fields=name,username,profile_pic&access_token=${pageAccessToken}`
    )
    if (!res.ok) return null
    const d = await res.json() as { name?: string; username?: string; profile_pic?: string }
    return {
      name:       d.name ?? d.username ?? `Usuario de Instagram`,
      username:   d.username ?? '',
      profilePic: d.profile_pic ?? '',
    }
  } catch {
    return null
  }
}

// ── Mark Instagram message as seen ───────────────────────
export async function markInstagramMessageSeen(
  recipientIgsid:      string,
  igBusinessAccountId: string,
  pageAccessToken:     string
): Promise<void> {
  await fetch(`${GRAPH}/${igBusinessAccountId}/messages`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pageAccessToken}` },
    body: JSON.stringify({ recipient: { id: recipientIgsid }, sender_action: 'mark_seen' }),
  }).catch(() => {})
}
