"use client"

import { useEffect, useState } from "react"
import { Brain, AlertTriangle, CheckCircle2 } from "lucide-react"
import { getProspectProfile } from "@/lib/actions/sales-agent"

type Profile = {
  stageLabel:     string
  progressPct:    number
  rapportScore:   number
  needs:          string[]
  objections:     { text: string; resolved: boolean }[]
  emotionalState: string | null
  handedOff:      boolean
}

export function ProspectProfileView({ leadId }: { leadId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loaded, setLoaded]   = useState(false)

  useEffect(() => {
    let active = true
    setLoaded(false)
    getProspectProfile(leadId).then((res) => {
      if (!active) return
      if (res.success) setProfile(res.data)
      setLoaded(true)
    })
    return () => { active = false }
  }, [leadId])

  if (!loaded || !profile) return null

  return (
    <div className="mx-3 mt-2 rounded-xl border border-line-subtle bg-inset/50 px-3.5 py-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Brain className="w-3.5 h-3.5 text-indigo-500" />
        <p className="text-[12px] font-semibold text-ink-primary">Perfil construido por el agente IA</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-ink-tertiary">
          <span>Etapa: {profile.stageLabel}</span>
          <span>{profile.progressPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-line-subtle overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${profile.progressPct}%` }} />
        </div>
      </div>

      {profile.needs.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-ink-secondary mb-1">Necesidades detectadas</p>
          <ul className="space-y-0.5">
            {profile.needs.map((n, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-ink-tertiary">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile.objections.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-ink-secondary mb-1">Objeciones</p>
          <ul className="space-y-0.5">
            {profile.objections.map((o, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px]">
                {o.resolved
                  ? <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />}
                <span className={o.resolved ? "text-ink-tertiary line-through" : "text-ink-secondary"}>{o.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 text-[11px] text-ink-tertiary pt-1 border-t border-line-subtle">
        {profile.emotionalState && <span>Estado: {profile.emotionalState}</span>}
        <span>Rapport: {profile.rapportScore}/100</span>
        {profile.handedOff && <span className="text-indigo-500 font-medium">Transferido a humano</span>}
      </div>
    </div>
  )
}
