"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus, X, Pause, Play } from "lucide-react"
import { createCampaign, toggleCampaignActive, logDailySpend } from "@/lib/actions/campaigns"
import { CHANNEL_LABELS } from "@/types/leads"
import { formatCurrency } from "@/lib/utils"
import type { MarketingChannel } from "@prisma/client"

type Campaign = {
  id: string
  name: string
  channel: MarketingChannel
  isActive: boolean
  leadsCount: number
  last30DaysSpend: number
}

const CHANNELS = Object.keys(CHANNEL_LABELS) as MarketingChannel[]

export function CampaignsManager({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [channel, setChannel] = useState<MarketingChannel>("INSTAGRAM")
  const [spendOpenFor, setSpendOpenFor] = useState<string | null>(null)
  const [spendDate, setSpendDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [spendAmount, setSpendAmount] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("El nombre de la campaña es obligatorio")
      return
    }
    setLoading(true)
    const res = await createCampaign({ name, channel })
    setLoading(false)
    if (res.success) {
      setCampaigns((prev) => [
        { id: res.data.id, name: res.data.name, channel: res.data.channel, isActive: true, leadsCount: 0, last30DaysSpend: 0 },
        ...prev,
      ])
      setName("")
      setCreating(false)
      toast.success("Campaña creada")
    } else {
      toast.error(res.error)
    }
  }

  const handleToggle = async (campaign: Campaign) => {
    const res = await toggleCampaignActive(campaign.id, !campaign.isActive)
    if (res.success) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, isActive: !c.isActive } : c))
      )
    } else {
      toast.error(res.error)
    }
  }

  const handleLogSpend = async (campaignId: string) => {
    const amount = Number(spendAmount)
    if (!spendAmount || isNaN(amount) || amount < 0) {
      toast.error("Ingresa un monto válido")
      return
    }
    setLoading(true)
    const res = await logDailySpend({ campaignId, date: spendDate, spendAmount: amount })
    setLoading(false)
    if (res.success) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, last30DaysSpend: c.last30DaysSpend + amount } : c))
      )
      setSpendOpenFor(null)
      setSpendAmount("")
      toast.success("Gasto registrado")
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl shadow-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line-subtle">
          <span className="text-sm font-semibold text-ink-primary">{campaigns.length} campaña{campaigns.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => setCreating((v) => !v)}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            {creating ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {creating ? "Cancelar" : "Nueva campaña"}
          </button>
        </div>

        {creating && (
          <div className="px-5 py-4 border-b border-line-subtle bg-inset/40 flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-ink-tertiary">Nombre</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. IG — Ortodoncia Octubre"
                className="h-9 px-3 text-sm border border-line-soft rounded-lg bg-surface w-56"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-ink-tertiary">Canal</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as MarketingChannel)}
                className="h-9 px-3 text-sm border border-line-soft rounded-lg bg-surface"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="h-9 px-4 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              Crear
            </button>
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="py-12 text-center text-ink-tertiary text-sm">
            Aún no hay campañas. Crea la primera para empezar a registrar inversión.
          </div>
        ) : (
          <div className="divide-y divide-line-subtle">
            {campaigns.map((c) => (
              <div key={c.id} className="px-5 py-3.5">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-primary truncate">{c.name}</p>
                    <p className="text-[11px] text-ink-tertiary">
                      {CHANNEL_LABELS[c.channel]} · {c.leadsCount} leads atribuidos · {formatCurrency(c.last30DaysSpend)} (últimos 30 días)
                    </p>
                  </div>
                  {!c.isActive && (
                    <span className="text-[10px] font-medium text-ink-tertiary bg-inset px-1.5 py-0.5 rounded">Pausada</span>
                  )}
                  <button
                    onClick={() => setSpendOpenFor(spendOpenFor === c.id ? null : c.id)}
                    className="text-[12px] font-medium text-brand-600 hover:underline flex-shrink-0"
                  >
                    Registrar gasto
                  </button>
                  <button
                    onClick={() => handleToggle(c)}
                    title={c.isActive ? "Pausar" : "Activar"}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-tertiary hover:bg-inset transition-colors flex-shrink-0"
                  >
                    {c.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {spendOpenFor === c.id && (
                  <div className="mt-3 flex items-end gap-2 flex-wrap bg-inset/40 rounded-lg p-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-ink-tertiary">Fecha</label>
                      <input
                        type="date"
                        value={spendDate}
                        onChange={(e) => setSpendDate(e.target.value)}
                        className="h-8 px-2 text-[12px] border border-line-soft rounded-md bg-surface"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-ink-tertiary">Monto (USD)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={spendAmount}
                        onChange={(e) => setSpendAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-8 px-2 text-[12px] border border-line-soft rounded-md bg-surface w-28"
                      />
                    </div>
                    <button
                      onClick={() => handleLogSpend(c.id)}
                      disabled={loading}
                      className="h-8 px-3 text-[12px] font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-md transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
