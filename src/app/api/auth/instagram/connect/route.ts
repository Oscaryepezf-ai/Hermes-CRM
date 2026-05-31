import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const nonce = randomBytes(16).toString('hex')
  const state = Buffer.from(
    JSON.stringify({ clinicId: session.user.clinicId, nonce, platform: 'instagram' })
  ).toString('base64url')

  const params = new URLSearchParams({
    client_id:     process.env.META_APP_ID!,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
    scope:         'instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging',
    response_type: 'code',
    state,
  })

  const res = NextResponse.redirect(
    `https://www.facebook.com/v18.0/dialog/oauth?${params}`
  )

  res.cookies.set('ig_oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600,
    path:     '/',
  })

  return res
}
