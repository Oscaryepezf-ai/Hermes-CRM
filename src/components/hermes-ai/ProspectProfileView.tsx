"use client"

import { useEffect, useState } from "react"
import { Brain, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
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
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loaded, setLoaded]     = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let active = true
    setLoaded(false)
    setExpanded(false)
    getProspectProfile(leadId).then((res) => {
      if (!active) return
      if (res.success) setProfile(res.data)
      setLoaded(true)
    })
    return () => { active = false }
  }, [leadId])

  if (!loaded || !profile) return null

  const unresolvedObjections = profile.objections.filter(o => !o.resolved).length
  const hasDetails = profile.needs.length > 0 || profile.objections.length > 0

  return (
    <div className="mx-3 mt-2 rounded-lg border border-line-subtle bg-inset/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
      >
        <Brain className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
        <span className="text-[11px] font-medium text-ink-secondary truncate">{profile.stageLabel}</span>
        <div className="flex-1 h-1 rounded-full bg-line-subtle overflow-hidden max-w-[80px]">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${profile.progressPct}%` }} />
        </div>
        <span className="text-[10px] text-ink-tertiary flex-shrink-0">{profile.progressPct}%</span>
        <span className="text-[10px] text-ink-tertiary flex-shrink-0">Rapport {profile.rapportScore}</span>
        {unresolvedObjections > 0 && (
          <span className="text-[10px] text-amber-600 flex-shrink-0 flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3" />{unresolvedObjections}
          </span>
        )}
        {profile.handedOff && (
          <span className="text-[10px] text-indigo-500 font-medium flex-shrink-0">Transferido</span>
        )}
        {hasDetails && (
          <ChevronDown className={cn("w-3.5 h-3.5 text-ink-tertiary flex-shrink-0 transition-transform", expanded && "rotate-180")} />
        )}
      </button>

      {expanded && hasDetails && (
        <div className="px-3.5 pb-3 pt-1 space-y-2.5 border-t border-line-subtle">
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

          {profile.emotionalState && (
            <p className="text-[11px] text-ink-tertiary">Estado emocional: {profile.emotionalState}</p>
          )}
        </div>
      )}
    </div>
  )
}
