import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const raw = request.cookies.get('ig_accounts')?.value
  if (!raw) return NextResponse.json({ accounts: [] })

  try {
    const accounts = JSON.parse(raw) as {
      pageId: string; pageName: string; igId: string
      igName: string; igUsername: string; igPicture: string
      pageToken: string
    }[]

    // Never expose pageToken to the client
    return NextResponse.json({
      accounts: accounts.map(a => ({
        igId:       a.igId,
        igName:     a.igName,
        igUsername: a.igUsername,
        igPicture:  a.igPicture,
        pageName:   a.pageName,
      })),
    })
  } catch {
    return NextResponse.json({ accounts: [] })
  }
}
