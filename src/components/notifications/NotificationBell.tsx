"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, CheckCheck, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

type LocalNotif = {
  id: string
  title: string
  body: string
  url: string
  receivedAt: number
}

const STORAGE_KEY = "hermes-notifications"
const READ_KEY = "hermes-notifications-read"

function getStoredNotifications(): LocalNotif[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function getReadIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) ?? "[]")
  } catch {
    return []
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<LocalNotif[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNotifs(getStoredNotifications())
    setReadIds(getReadIds())
  }, [])

  // Listen for new push notifications stored by the SW message channel
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_RECEIVED") {
        const updated = getStoredNotifications()
        setNotifs(updated)
      }
    }
    navigator.serviceWorker?.addEventListener("message", handleMessage)
    return () => navigator.serviceWorker?.removeEventListener("message", handleMessage)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const unreadCount = notifs.filter((n) => !readIds.includes(n.id)).length

  const markAllRead = () => {
    const allIds = notifs.map((n) => n.id)
    localStorage.setItem(READ_KEY, JSON.stringify(allIds))
    setReadIds(allIds)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium"
              >
                <CheckCheck className="w-3 h-3" />
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Sin notificaciones</p>
              </div>
            ) : (
              notifs
                .slice()
                .reverse()
                .slice(0, 10)
                .map((n) => {
                  const isRead = readIds.includes(n.id)
                  return (
                    <a
                      key={n.id}
                      href={n.url}
                      onClick={() => {
                        const updated = [...readIds, n.id]
                        localStorage.setItem(READ_KEY, JSON.stringify(updated))
                        setReadIds(updated)
                        setOpen(false)
                      }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!isRead ? "bg-indigo-50/40" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-tight ${isRead ? "text-gray-600" : "text-gray-800 font-semibold"}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{n.body}</p>
                        <p className="text-[10px] text-gray-300 mt-1">
                          {formatDistanceToNow(new Date(n.receivedAt), { locale: es, addSuffix: true })}
                        </p>
                      </div>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                      )}
                    </a>
                  )
                })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
