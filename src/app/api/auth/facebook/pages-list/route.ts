import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"

type StoredPage = {
  id:       string
  name:     string
  category: string
  picture:  string
  token:    string
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const pagesRaw = request.cookies.get("fb_pages")?.value
  if (!pagesRaw) {
    return NextResponse.json({ pages: [] })
  }

  try {
    const pages = JSON.parse(pagesRaw) as StoredPage[]
    // Return without the access token (client doesn't need it)
    return NextResponse.json({
      pages: pages.map(p => ({
        id:       p.id,
        name:     p.name,
        category: p.category,
        picture:  p.picture,
      })),
    })
  } catch {
    return NextResponse.json({ pages: [] })
  }
}
