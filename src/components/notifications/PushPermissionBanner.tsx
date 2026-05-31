"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { toast } from "sonner"

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const arr = Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
  return arr.buffer as ArrayBuffer
}

async function subscribeToPush() {
  const registration = await navigator.serviceWorker.register("/sw.js")
  await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  })

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription,
      userAgent: navigator.userAgent,
    }),
  })
}

const DISMISSED_KEY = "push-banner-dismissed"

export function PushPermissionBanner() {
  const [visible, setVisible] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return
    if (Notification.permission !== "default") return
    if (localStorage.getItem(DISMISSED_KEY)) return
    setVisible(true)
  }, [])

  const handleActivate = async () => {
    setSubscribing(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        await subscribeToPush()
        toast.success("Notificaciones activadas")
      }
    } catch {
      toast.error("No se pudieron activar las notificaciones")
    } finally {
      setSubscribing(false)
      setVisible(false)
      localStorage.setItem(DISMISSED_KEY, "1")
    }
  }

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, "1")
  }

  if (!visible) return null

  return (
    <div className="mx-6 mt-4 flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
        <Bell className="w-4 h-4 text-indigo-600" />
      </div>
      <p className="flex-1 text-sm text-indigo-800">
        Activa las notificaciones para saber cuando se agenda una cita en tiempo real
      </p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDismiss}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
        >
          Ahora no
        </button>
        <button
          onClick={handleActivate}
          disabled={subscribing}
          className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          {subscribing ? "Activando…" : "Activar notificaciones"}
        </button>
        <button
          onClick={handleDismiss}
          className="w-6 h-6 flex items-center justify-center text-indigo-400 hover:text-indigo-600 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
