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

  if (dismissed || (allDone && rewardClaimed)) return null

  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">
            ¡Cumple esta misión y canjea una recompensa!
          </p>
          <div className="h-1.5 bg-gray-100 rounded-full mt-2 max-w-xs">
            <div
              className="h-1.5 bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <button onClick={toggleCollapsed} className="p-1.5 hover:bg-gray-50 rounded-md ml-3">
          {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex items-stretch divide-x divide-gray-100">
          {missions.map((m) => (
            <Link
              key={m.id}
              href={m.ctaLink || "#"}
              className={cn(
                "flex-1 flex items-center gap-2 px-4 py-3.5 text-xs transition-colors",
                m.ctaLink ? "hover:bg-gray-50" : "cursor-default"
              )}
            >
              {m.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
              )}
              <span className={cn("font-medium", m.completed ? "text-gray-400 line-through" : "text-gray-700")}>
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
              rewardAvailable ? "bg-amber-50 hover:bg-amber-100" : "bg-gray-50"
            )}
            title={rewardAvailable ? "¡Reclama tu recompensa!" : "Completa las misiones"}
          >
            <Gift className={cn("w-5 h-5", rewardAvailable ? "text-amber-500" : "text-gray-300")} />
          </button>
        </div>
      )}

      {showReward && <RewardModal onClose={() => setShowReward(false)} onClaimed={handleClaimed} />}
    </div>
  )
}
