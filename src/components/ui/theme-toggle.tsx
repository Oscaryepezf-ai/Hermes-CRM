"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return <div className="w-7 h-7" />
  }

  const cycle = () => {
    if (theme === "light")  setTheme("dark")
    else if (theme === "dark") setTheme("system")
    else setTheme("light")
  }

  const Icon =
    theme === "dark"   ? Moon    :
    theme === "light"  ? Sun     :
    Monitor

  const label =
    theme === "dark"   ? "Modo oscuro"   :
    theme === "light"  ? "Modo claro"    :
    "Sistema"

  return (
    <button
      onClick={cycle}
      title={label}
      aria-label={`Cambiar tema — actual: ${label}`}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded-[7px] transition-ui",
        "bg-inset text-ink-tertiary hover:text-ink-secondary hover:bg-line-subtle"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}
