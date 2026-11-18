import { requirePermission } from "@/lib/rbac/guards"
import { getCampaigns } from "@/lib/actions/campaigns"
import { RestrictedAccess } from "@/components/reports/RestrictedAccess"
import { CampaignsManager } from "@/components/growth/CampaignsManager"

export default async function CampanasPage() {
  const guard = await requirePermission("ad_spend", "view")
  if (!guard.authorized) return <RestrictedAccess />

  const result = await getCampaigns()
  const campaigns = result.success ? result.data : []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-ink-primary">Campañas e inversión publicitaria</h1>
        <p className="text-[12px] text-ink-tertiary">
          Registra el gasto diario de cada campaña para que el motor de CPL/CPA tenga datos reales.
        </p>
      </div>
      <CampaignsManager initialCampaigns={campaigns} />
    </div>
  )
}
