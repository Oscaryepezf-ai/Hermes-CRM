import { redirect } from "next/navigation"
import { auth } from "../../../../../auth"
import { db } from "@/lib/db"
import { Radio } from "lucide-react"
import { ChannelsView } from "@/components/settings/ChannelsView"

export const dynamic = 'force-dynamic'

export default async function ChannelsPage() {
  const session = await auth()
  if (!session?.user?.clinicId) redirect("/login")

  const [channels, waPhoneId] = await Promise.all([
    db.clinicChannel.findMany({
      where:  { clinicId: session.user.clinicId },
      select: { id: true, channel: true, isActive: true, pageId: true, connectedAt: true, metadata: true },
    }),
    Promise.resolve(process.env.WHATSAPP_PHONE_ID ?? null),
  ])

  const waStatus = waPhoneId && waPhoneId !== "tu-numero-id"
    ? "configured" as const
    : "missing" as const

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-brand-50 flex items-center justify-center flex-shrink-0">
          <Radio className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-ink-primary leading-tight">Canales de comunicación</h2>
          <p className="text-[12px] text-ink-tertiary mt-0.5">
            Conecta las redes sociales de tu clínica para recibir prospectos en el pipeline
          </p>
        </div>
      </div>

      <ChannelsView
        channels={channels}
        waStatus={waStatus}
        waPhoneId={waPhoneId}
      />
    </div>
  )
}
