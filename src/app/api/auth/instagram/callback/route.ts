import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPageInstagramAccount } from '@/lib/meta/instagram-client'

const GRAPH = 'https://graph.facebook.com/v18.0'

type FacebookPage = {
  id:           string
  name:         string
  access_token: string
  category?:    string
  picture?:     { data: { url: string } }
}

type IgAccountEntry = {
  pageId:      string
  pageName:    string
  pageToken:   string
  igId:        string
  igName:      string
  igUsername:  string
  igPicture:   string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl     = process.env.NEXT_PUBLIC_APP_URL!
  const settingsUrl = `${baseUrl}/settings/channels`

  if (error) return NextResponse.redirect(`${settingsUrl}?ig_error=denied`)
  if (!code || !state) return NextResponse.redirect(`${settingsUrl}?ig_error=invalid`)

  // Decode clinicId from state (cookie CSRF check is best-effort)
  let clinicId: string
  try {
    clinicId = JSON.parse(Buffer.from(state, 'base64url').toString()).clinicId
    if (!clinicId) throw new Error()
  } catch {
    return NextResponse.redirect(`${settingsUrl}?ig_error=invalid`)
  }

  // Exchange code → short-lived token
  const tokenRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
    `client_id=${process.env.META_APP_ID}` +
    `&client_secret=${process.env.META_APP_SECRET}` +
    `&redirect_uri=${baseUrl}/api/auth/instagram/callback` +
    `&code=${code}`
  )
  if (!tokenRes.ok) return NextResponse.redirect(`${settingsUrl}?ig_error=token`)
  const { access_token: shortToken } = await tokenRes.json() as { access_token: string }

  // → long-lived user token (60 days)
  const llRes = await fetch(
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${process.env.META_APP_ID}` +
    `&client_secret=${process.env.META_APP_SECRET}` +
    `&fb_exchange_token=${shortToken}`
  )
  const { access_token: userToken } = llRes.ok
    ? await llRes.json() as { access_token: string }
    : { access_token: shortToken }

  // Fetch pages
  const pagesRes = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,category,picture&access_token=${userToken}`
  )
  if (!pagesRes.ok) return NextResponse.redirect(`${settingsUrl}?ig_error=pages`)
  const { data: pages } = await pagesRes.json() as { data: FacebookPage[] }
  if (!pages?.length) return NextResponse.redirect(`${settingsUrl}?ig_error=no_pages`)

  // For each page, check if it has a linked Instagram Business Account
  const igAccounts: IgAccountEntry[] = []
  for (const page of pages) {
    const ig = await getPageInstagramAccount(page.id, page.access_token)
    if (ig) {
      igAccounts.push({
        pageId:    page.id,
        pageName:  page.name,
        pageToken: page.access_token,
        igId:      ig.id,
        igName:    ig.name,
        igUsername:ig.username,
        igPicture: ig.profile_picture_url,
      })
    }
  }

  if (igAccounts.length === 0) {
    return NextResponse.redirect(`${settingsUrl}?ig_error=no_ig_account`)
  }

  // Auto-connect if single IG account
  if (igAccounts.length === 1) {
    await saveIgAccount(clinicId, igAccounts[0])
    const res = NextResponse.redirect(`${settingsUrl}?ig_connected=1`)
    clearCookies(res)
    return res
  }

  // Multiple accounts → picker
  const res = NextResponse.redirect(`${settingsUrl}?ig_select=1`)
  clearCookies(res)
  res.cookies.set('ig_accounts', JSON.stringify(igAccounts), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 600, path: '/',
  })
  res.cookies.set('ig_clinic_id', clinicId, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 600, path: '/',
  })
  return res
}

async function saveIgAccount(clinicId: string, acc: IgAccountEntry) {
  await db.$transaction([
    db.clinicChannel.upsert({
      where:  { clinicId_channel: { clinicId, channel: 'INSTAGRAM' } },
      create: {
        clinicId,
        channel:     'INSTAGRAM',
        isActive:    true,
        pageId:      acc.igId,          // IG Business Account ID
        accessToken: acc.pageToken,     // Page Access Token for sending DMs
        connectedAt: new Date(),
        metadata:    {
          igUsername:  acc.igUsername,
          igName:      acc.igName,
          pageName:    acc.pageName,
          facebookPageId: acc.pageId,
        },
      },
      update: {
        isActive:    true,
        pageId:      acc.igId,
        accessToken: acc.pageToken,
        connectedAt: new Date(),
        metadata:    {
          igUsername:  acc.igUsername,
          igName:      acc.igName,
          pageName:    acc.pageName,
          facebookPageId: acc.pageId,
        },
      },
    }),
    db.clinic.update({
      where: { id: clinicId },
      data:  { instagramActive: true },
    }),
  ])
}

function clearCookies(res: NextResponse) {
  res.cookies.set('ig_oauth_state', '', { maxAge: 0, path: '/' })
}
