"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, ArrowRight, Gift, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { getMyActivationChecklist } from "@/lib/actions/activation"
import { RewardModal } from "./RewardModal"

type Checklist = Awaited<ReturnType<typeof getMyActivationChecklist>>

const STORAGE_KEY = "hermes_checklist_collapsed"
const DISMISSED_KEY = "hermes_checklist_dismissed"

export function ActivationChecklist() {
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showReward, setShowReward] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1")
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1")
    getMyActivationChecklist().then(setChecklist)
  }, [])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
  }

  function handleClaimed() {
    setShowReward(false)
    localStorage.setItem(DISMISSED_KEY, "1")
    setDismissed(true)
  }

  if (!checklist || !checklist.success) return null
  const { missions, completed, total, allDone, rewardAvailable, rewardClaimed } = checklist.data

  // Sin misiones (clínicas anteriores a la función o sin seed) no hay nada que mostrar
  if (dismissed || total === 0 || (allDone && rewardClaimed)) return null

  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="bg-surface rounded-2xl overflow-hidden mb-6 shadow-card">
      <div className="flex items-center justify-between px-5 py-3 border-b border-line-subtle">
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink-primary">
            ¡Cumple esta misión y canjea una recompensa!
          </p>
          <div className="h-1.5 bg-inset rounded-full mt-2 max-w-xs">
            <div
              className="h-1.5 bg-brand-gradient rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <button onClick={toggleCollapsed} className="p-1.5 hover:bg-inset rounded-lg ml-3">
          {collapsed ? <ChevronDown className="w-4 h-4 text-ink-tertiary" /> : <ChevronUp className="w-4 h-4 text-ink-tertiary" />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex items-stretch divide-x divide-line-subtle">
          {missions.map((m) => (
            <Link
              key={m.id}
              href={m.ctaLink || "#"}
              className={cn(
                "flex-1 flex items-center gap-2 px-4 py-3.5 text-xs transition-colors",
                m.ctaLink ? "hover:bg-inset" : "cursor-default"
              )}
            >
              {m.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-ink-disabled flex-shrink-0" />
              )}
              <span className={cn("font-medium", m.completed ? "text-ink-tertiary line-through" : "text-ink-secondary")}>
                {m.label}
              </span>
              {!m.completed && m.ctaLink && <ArrowRight className="w-3 h-3 text-gray-300 ml-auto flex-shrink-0" />}
            </Link>
          ))}

          <button
            onClick={() => rewardAvailable && setShowReward(true)}
            disabled={!rewardAvailable}
            className={cn(
              "w-14 flex items-center justify-center flex-shrink-0",
              rewardAvailable ? "bg-amber-50 hover:bg-amber-100" : "bg-inset"
            )}
            title={rewardAvailable ? "¡Reclama tu recompensa!" : "Completa las misiones"}
          >
            <Gift className={cn("w-5 h-5", rewardAvailable ? "text-amber-500" : "text-ink-disabled")} />
          </button>
        </div>
      )}

      {showReward && <RewardModal onClose={() => setShowReward(false)} onClaimed={handleClaimed} />}
    </div>
  )
}
