"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  MessageCircle, Globe, Camera, CheckCircle2,
  ExternalLink, AlertCircle, WifiOff, Loader2,
  Info, ChevronRight, Building2, Eye, EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { disconnectChannel, connectWhatsApp } from "@/lib/actions/channels"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelRecord = {
  id:          string
  channel:     string
  isActive:    boolean
  pageId:      string | null
  connectedAt: Date | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?:   any
}

type StoredPage = {
  id:       string
  name:     string
  category: string
  picture:  string
}

interface ChannelsViewProps {
  channels: ChannelRecord[]
}

// ─── Channel visual config ────────────────────────────────────────────────────

const CHANNEL_META = {
  WHATSAPP: {
    name:        "WhatsApp Business",
    description: "Recibe y envía mensajes de WhatsApp desde el pipeline. Vía WhatsApp Cloud API.",
    icon:        MessageCircle,
    iconBg:      "bg-[#F0FDF4]",
    iconColor:   "text-[#128C4A]",
    dotActive:   "#10B981",
    brandColor:  "#25D366",
  },
  FACEBOOK: {
    name:        "Facebook Messenger",
    description: "Los mensajes a tu Página de Facebook crean leads automáticamente en el pipeline.",
    icon:        Globe,
    iconBg:      "bg-[#EFF6FF]",
    iconColor:   "text-[#1877F2]",
    dotActive:   "#1877F2",
    brandColor:  "#1877F2",
  },
  INSTAGRAM: {
    name:        "Instagram DM",
    description: "Convierte mensajes directos de Instagram en leads automáticamente.",
    icon:        Camera,
    iconBg:      "bg-[#FDF2F8]",
    iconColor:   "text-[#E1306C]",
    dotActive:   "#E1306C",
    brandColor:  "#E1306C",
  },
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ChannelsView({ channels }: ChannelsViewProps) {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const fbConnected = searchParams.get("fb_connected") === "1"
  const fbSelect    = searchParams.get("fb_select")    === "1"
  const fbError     = searchParams.get("fb_error")
  const igConnected = searchParams.get("ig_connected") === "1"
  const igSelect    = searchParams.get("ig_select")    === "1"
  const igError     = searchParams.get("ig_error")

  useEffect(() => {
    if (fbConnected) {
      toast.success("¡Facebook Messenger conectado correctamente!")
      // Hard navigation ensures the server component re-fetches fresh DB data
      window.location.replace("/settings/channels")
      return
    }
    if (fbError) {
      const msgs: Record<string, string> = {
        denied:   "Cancelaste la conexión con Facebook.",
        csrf:     "Error de seguridad. Intenta de nuevo.",
        token:    "No se pudo obtener el token de acceso. Verifica META_APP_ID y META_APP_SECRET.",
        pages:    "No se pudo obtener la lista de páginas de Facebook.",
        no_pages: "Tu cuenta de Facebook no administra ninguna Página.",
        invalid:  "Respuesta inválida de Facebook. Intenta de nuevo.",
      }
      toast.error(msgs[fbError] ?? `Error al conectar con Facebook (${fbError})`, { duration: 8000 })
      router.replace("/settings/channels")
    }
    if (igConnected) {
      toast.success("¡Instagram DM conectado correctamente!")
      window.location.replace("/settings/channels")
      return
    }
    if (igError) {
      const msgs: Record<string, string> = {
        denied:         "Cancelaste la conexión con Instagram.",
        csrf:           "Error de seguridad. Intenta de nuevo.",
        token:          "No se pudo obtener el token. Intenta de nuevo.",
        pages:          "No se pudo obtener la lista de páginas.",
        no_pages:       "Tu cuenta no administra ninguna Página de Facebook.",
        no_ig_account:  "Ninguna de tus páginas tiene una cuenta de Instagram Profesional vinculada.",
        invalid:        "Respuesta inválida. Intenta de nuevo.",
      }
      toast.error(msgs[igError] ?? "Error al conectar con Instagram")
      router.replace("/settings/channels")
    }
  }, [fbConnected, fbError, igConnected, igError, router])

  const whatsappChannel  = channels.find(c => c.channel === "WHATSAPP" && c.isActive)
  const facebookChannel  = channels.find(c => c.channel === "FACEBOOK")
  const instagramChannel = channels.find(c => c.channel === "INSTAGRAM")

  return (
    <div className="space-y-3">
      <WhatsAppCard channel={whatsappChannel ?? null} />

      <FacebookCard
        channel={facebookChannel ?? null}
        showPagePicker={fbSelect}
      />

      <InstagramCard
        channel={instagramChannel ?? null}
        showAccountPicker={igSelect}
      />

      <div className="flex items-start gap-2.5 bg-brand-50 border border-brand-100 rounded-[10px] px-4 py-3">
        <Info className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-brand-700 leading-relaxed">
          Todos los canales se unifican en el panel de conversación del pipeline.
          El asesor siempre sabe desde dónde llegó cada prospecto.
        </p>
      </div>
    </div>
  )
}

// ─── WhatsApp Card ────────────────────────────────────────────────────────────

function WhatsAppCard({ channel }: { channel: ChannelRecord | null }) {
  const meta      = CHANNEL_META.WHATSAPP
  const connected = channel?.isActive ?? false
  const waMeta    = channel?.metadata as { phoneNumber?: string; displayName?: string } | null

  const [showForm,    setShowForm]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [showToken,   setShowToken]   = useState(false)
  const [phoneNumId,  setPhoneNumId]  = useState("")
  const [token,       setToken]       = useState("")

  const handleConnect = async () => {
    if (!phoneNumId.trim() || !token.trim()) {
      toast.error("Completa ambos campos")
      return
    }
    setSaving(true)
    const res = await connectWhatsApp({ phoneNumberId: phoneNumId.trim(), accessToken: token.trim() })
    setSaving(false)
    if (res.success) {
      toast.success("¡WhatsApp Business conectado correctamente!")
      window.location.replace("/settings/channels")
    } else {
      toast.error(res.error ?? "Error al conectar WhatsApp")
    }
  }

  const handleDisconnect = async () => {
    setSaving(true)
    await disconnectChannel("WHATSAPP")
    setSaving(false)
    window.location.replace("/settings/channels")
  }

  return (
    <ChannelCard meta={meta} connected={connected} badge={connected ? "Activo" : "Sin configurar"}>
      {connected ? (
        <div className="mt-4 space-y-3">
          <StatusBanner
            type="success"
            title={waMeta?.displayName ?? "WhatsApp Business conectado"}
            detail={waMeta?.phoneNumber ? `Número: ${waMeta.phoneNumber}` : channel?.pageId ? `Phone ID: ${channel.pageId.slice(0, 8)}••••` : undefined}
          />
          <p className="text-[11px] text-ink-tertiary">
            Webhook URL: <code className="font-mono bg-inset px-1 rounded">/api/webhooks/whatsapp</code>
          </p>
          <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={saving} className="text-red-500 border-red-200 hover:bg-red-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <WifiOff className="w-3.5 h-3.5 mr-1.5" />}
            Desconectar
          </Button>
        </div>
      ) : showForm ? (
        <div className="mt-4 space-y-3">
          <p className="text-[11px] text-ink-tertiary leading-relaxed">
            Ingresa las credenciales de tu app en{" "}
            <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Meta for Developers</a>
            {" "}→ WhatsApp → API Setup.
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-medium text-ink-secondary block mb-1">Phone Number ID</label>
              <input
                value={phoneNumId}
                onChange={e => setPhoneNumId(e.target.value)}
                placeholder="123456789012345"
                className="w-full text-xs px-3 py-2 rounded-lg border border-line-soft bg-inset text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-ink-secondary block mb-1">Access Token</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="EAAxxxxxxx..."
                  className="w-full text-xs px-3 py-2 pr-8 rounded-lg border border-line-soft bg-inset text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-brand-400"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-secondary"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConnect} disabled={saving} className="bg-[#25D366] hover:bg-[#1da851] text-white border-0">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
              Conectar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
          <div className="bg-inset rounded-lg p-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wide">Configurar webhook en Meta</p>
            <p className="text-[11px] text-ink-secondary">URL: <code className="font-mono bg-surface px-1 rounded">/api/webhooks/whatsapp</code></p>
            <p className="text-[11px] text-ink-secondary">Token: el valor de <code className="font-mono bg-surface px-1 rounded">META_VERIFY_TOKEN</code> en Vercel</p>
            <p className="text-[11px] text-ink-secondary">Campo: <code className="font-mono bg-surface px-1 rounded">messages</code></p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <StatusBanner
            type="warning"
            title="WhatsApp no configurado"
            detail="Conecta tu número de WhatsApp Business para recibir mensajes en el pipeline."
          />
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-[#25D366] hover:bg-[#1da851] text-white border-0">
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            Conectar WhatsApp
          </Button>
        </div>
      )}
    </ChannelCard>
  )
}

// ─── Facebook Card ────────────────────────────────────────────────────────────

function FacebookCard({
  channel,
  showPagePicker,
}: {
  channel:        ChannelRecord | null
  showPagePicker: boolean
}) {
  const meta      = CHANNEL_META.FACEBOOK
  const connected = channel?.isActive ?? false
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const pageName = (channel?.metadata as { pageName?: string } | null)?.pageName

  const handleDisconnect = async () => {
    setSaving(true)
    const res = await disconnectChannel("FACEBOOK")
    if (res.success) {
      toast.success("Facebook desconectado")
      router.refresh()
    } else {
      toast.error(res.error)
    }
    setSaving(false)
  }

  return (
    <ChannelCard
      meta={meta}
      connected={connected}
      badge={connected ? "Activo" : "Desconectado"}
    >
      {/* Page picker — shown after OAuth when user has multiple pages */}
      {showPagePicker && !connected && (
        <PagePickerBanner onSuccess={() => router.replace("/settings/channels?fb_connected=1")} />
      )}

      {connected ? (
        <div className="mt-4 space-y-3">
          <StatusBanner
            type="success"
            title={pageName ? `Página: ${pageName}` : "Messenger activo"}
            detail={channel?.pageId ? `Page ID: ${channel.pageId}` : undefined}
            extra={channel?.connectedAt
              ? `Conectado el ${new Date(channel.connectedAt).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}`
              : undefined
            }
          />

          {/* Webhook URL */}
          <div className="bg-inset border border-line-subtle rounded-[8px] px-3 py-2.5">
            <p className="text-[11px] text-ink-tertiary mb-1">URL del Webhook (pega en Meta for Developers)</p>
            <p className="text-[11px] font-mono text-ink-secondary break-all">
              {typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}
              /api/webhooks/meta
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={saving}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-[12px] h-8"
          >
            {saving
              ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              : <WifiOff className="w-3.5 h-3.5 mr-1.5" />
            }
            Desconectar página
          </Button>
        </div>
      ) : !showPagePicker ? (
        <div className="mt-4 space-y-3">
          <p className="text-[12px] text-ink-tertiary leading-relaxed">
            Conecta tu Página de Facebook en un solo clic. Seleccionarás la página
            que quieres vincular con el CRM.
          </p>

          <div className="flex gap-2 flex-wrap">
            {/* Main OAuth button */}
            <a href="/api/auth/facebook/connect">
              <Button
                size="sm"
                className="text-white text-[12px] h-8 px-4 gap-2"
                style={{ background: "#1877F2" }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Conectar con Facebook
              </Button>
            </a>

            <a
              href="https://developers.facebook.com/docs/messenger-platform/get-started"
              target="_blank" rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="text-[12px] h-8 px-3">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Guía
              </Button>
            </a>
          </div>

          {/* Permissions hint */}
          <div className="flex items-start gap-2 bg-inset rounded-[8px] px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-ink-tertiary flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-ink-tertiary leading-relaxed">
              Hermes solicitará acceso a: <strong>Ver tus páginas · Enviar mensajes · Gestionar webhooks</strong>
            </p>
          </div>
        </div>
      ) : null}
    </ChannelCard>
  )
}

// ─── Page Picker Banner ───────────────────────────────────────────────────────

function PagePickerBanner({ onSuccess }: { onSuccess: () => void }) {
  const [pages, setPages]   = useState<StoredPage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Fetch pages from our own API (reads cookie)
    fetch("/api/auth/facebook/pages-list")
      .then(r => r.json())
      .then((d: { pages?: StoredPage[] }) => { if (d.pages) setPages(d.pages) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selectPage = async (pageId: string) => {
    setSaving(pageId)
    const res = await fetch("/api/auth/facebook/select-page", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ pageId }),
    })
    const data = await res.json() as { success?: boolean; error?: string }
    if (data.success) {
      onSuccess()
      router.refresh()
    } else {
      toast.error(data.error ?? "Error al conectar la página")
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="mt-4 flex items-center gap-2 text-[12px] text-ink-tertiary">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando tus páginas...
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[12px] font-[550] text-ink-primary">
        Selecciona la Página de Facebook que quieres conectar
      </p>
      <div className="space-y-2">
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => selectPage(page.id)}
            disabled={!!saving}
            className="w-full flex items-center gap-3 bg-surface border border-line-subtle hover:border-brand-200 hover:bg-brand-50 rounded-[10px] px-4 py-3 text-left transition-ui group"
          >
            {page.picture ? (
              <img src={page.picture} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-[#1877F2]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-[550] text-ink-primary truncate">{page.name}</p>
              {page.category && (
                <p className="text-[11px] text-ink-tertiary">{page.category}</p>
              )}
            </div>
            {saving === page.id
              ? <Loader2 className="w-4 h-4 animate-spin text-brand-500 flex-shrink-0" />
              : <ChevronRight className="w-4 h-4 text-ink-disabled group-hover:text-brand-400 flex-shrink-0" />
            }
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ink-tertiary">
        Page ID: {pages[0]?.id ?? "—"} · Solo se conectará una página a la vez.
      </p>
    </div>
  )
}

// ─── Instagram Card ───────────────────────────────────────────────────────────

function InstagramCard({
  channel,
  showAccountPicker,
}: {
  channel:            ChannelRecord | null
  showAccountPicker:  boolean
}) {
  const meta      = CHANNEL_META.INSTAGRAM
  const connected = channel?.isActive ?? false
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const igUsername = (channel?.metadata as { igUsername?: string } | null)?.igUsername
  const igName     = (channel?.metadata as { igName?: string } | null)?.igName

  const handleDisconnect = async () => {
    setSaving(true)
    const res = await disconnectChannel("INSTAGRAM")
    if (res.success) { toast.success("Instagram desconectado"); router.refresh() }
    else toast.error(res.error)
    setSaving(false)
  }

  return (
    <ChannelCard meta={meta} connected={connected} badge={connected ? "Activo" : "Desconectado"}>
      {showAccountPicker && !connected && (
        <InstagramAccountPicker
          onSuccess={() => router.replace("/settings/channels?ig_connected=1")}
        />
      )}

      {connected ? (
        <div className="mt-4 space-y-3">
          <StatusBanner
            type="success"
            title={igName ?? igUsername ?? "Instagram conectado"}
            detail={igUsername ? `@${igUsername}` : undefined}
            extra={channel?.connectedAt
              ? `Conectado el ${new Date(channel.connectedAt).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}`
              : undefined}
          />
          <div className="bg-inset border border-line-subtle rounded-[8px] px-3 py-2.5">
            <p className="text-[11px] text-ink-tertiary mb-1">URL del Webhook</p>
            <p className="text-[11px] font-mono text-ink-secondary break-all">
              {typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}
              /api/webhooks/meta
            </p>
          </div>
          <Button
            variant="outline" size="sm" onClick={handleDisconnect} disabled={saving}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-[12px] h-8"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <WifiOff className="w-3.5 h-3.5 mr-1.5" />}
            Desconectar Instagram
          </Button>
        </div>
      ) : !showAccountPicker ? (
        <div className="mt-4 space-y-3">
          <p className="text-[12px] text-ink-tertiary leading-relaxed">
            Necesitas una cuenta de Instagram Profesional (Business o Creator) vinculada
            a una Página de Facebook que administres.
          </p>
          <div className="flex gap-2 flex-wrap">
            <a href="/api/auth/instagram/connect">
              <Button
                size="sm"
                className="text-white text-[12px] h-8 px-4 gap-2"
                style={{ background: "linear-gradient(135deg, #f58529 0%, #dd2a7b 50%, #8134af 100%)" }}
              >
                <Camera className="w-3.5 h-3.5" />
                Conectar con Instagram
              </Button>
            </a>
            <a
              href="https://developers.facebook.com/docs/instagram-api/getting-started"
              target="_blank" rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="text-[12px] h-8 px-3">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Guía
              </Button>
            </a>
          </div>
          <div className="flex items-start gap-2 bg-inset rounded-[8px] px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-ink-tertiary flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-ink-tertiary leading-relaxed">
              Hermes solicitará acceso a: <strong>Cuenta básica de Instagram · Gestionar mensajes directos</strong>
            </p>
          </div>
        </div>
      ) : null}
    </ChannelCard>
  )
}

// ─── Instagram Account Picker ─────────────────────────────────────────────────

type IgAccount = { igId: string; igName: string; igUsername: string; igPicture: string; pageName: string }

function InstagramAccountPicker({ onSuccess }: { onSuccess: () => void }) {
  const [accounts, setAccounts] = useState<IgAccount[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/auth/instagram/accounts-list")
      .then(r => r.json())
      .then((d: { accounts?: IgAccount[] }) => { if (d.accounts) setAccounts(d.accounts) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selectAccount = async (igId: string) => {
    setSaving(igId)
    const res = await fetch("/api/auth/instagram/select-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ igId }),
    })
    const data = await res.json() as { success?: boolean; error?: string }
    if (data.success) { onSuccess(); router.refresh() }
    else { toast.error(data.error ?? "Error al conectar"); setSaving(null) }
  }

  if (loading) return (
    <div className="mt-4 flex items-center gap-2 text-[12px] text-ink-tertiary">
      <Loader2 className="w-4 h-4 animate-spin" /> Cargando tus cuentas de Instagram...
    </div>
  )

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[12px] font-[550] text-ink-primary">
        Selecciona la cuenta de Instagram que quieres conectar
      </p>
      <div className="space-y-2">
        {accounts.map(acc => (
          <button
            key={acc.igId}
            onClick={() => selectAccount(acc.igId)}
            disabled={!!saving}
            className="w-full flex items-center gap-3 bg-surface border border-line-subtle hover:border-[#E1306C]/30 hover:bg-pink-50/50 rounded-[10px] px-4 py-3 text-left transition-ui group"
          >
            {acc.igPicture ? (
              <img src={acc.igPicture} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#FDF2F8] flex items-center justify-center flex-shrink-0">
                <Camera className="w-4 h-4 text-[#E1306C]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-[550] text-ink-primary truncate">{acc.igName}</p>
              <p className="text-[11px] text-ink-tertiary">@{acc.igUsername} · {acc.pageName}</p>
            </div>
            {saving === acc.igId
              ? <Loader2 className="w-4 h-4 animate-spin text-[#E1306C] flex-shrink-0" />
              : <ChevronRight className="w-4 h-4 text-ink-disabled group-hover:text-[#E1306C]/60 flex-shrink-0" />
            }
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── (legacy placeholder — not used anymore) ──────────────────────────────────

function ComingSoonCard({ channel, eta }: { channel: keyof typeof CHANNEL_META; eta: string }) {
  const meta = CHANNEL_META[channel]
  const Icon = meta.icon
  return (
    <div className="bg-surface border border-line-subtle rounded-[12px] p-5 opacity-55">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-[10px] flex items-center justify-center", meta.iconBg)}>
          <Icon className={cn("w-5 h-5", meta.iconColor)} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-[550] text-ink-primary">{meta.name}</p>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] bg-amber-50 text-amber-700">
              Próximamente · {eta}
            </span>
          </div>
          <p className="text-[12px] text-ink-tertiary mt-0.5 leading-relaxed">{meta.description}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Shared: ChannelCard ──────────────────────────────────────────────────────

function ChannelCard({
  meta, connected, badge, children,
}: {
  meta:      typeof CHANNEL_META[keyof typeof CHANNEL_META]
  connected: boolean
  badge:     string
  children:  React.ReactNode
}) {
  const Icon = meta.icon
  return (
    <div className={cn(
      "bg-surface border rounded-[12px] p-5 transition-ui",
      connected ? "border-line-soft shadow-card" : "border-line-subtle"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0", meta.iconBg)}>
          <Icon className={cn("w-5 h-5", meta.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-[550] text-ink-primary">{meta.name}</p>
            <span className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]",
              connected ? "bg-[#EDFAF4] text-[#15694A]" : "bg-[#F0F2F6] text-[#4A5568]"
            )}>
              <span
                className="w-[5px] h-[5px] rounded-full"
                style={{ background: connected ? meta.dotActive : "#94A3B8" }}
              />
              {badge}
            </span>
          </div>
          <p className="text-[12px] text-ink-tertiary mt-0.5 leading-relaxed">{meta.description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── Shared: StatusBanner ─────────────────────────────────────────────────────

function StatusBanner({
  type, title, detail, extra,
}: {
  type:    "success" | "warning" | "error"
  title:   string
  detail?: string
  extra?:  string
}) {
  const styles = {
    success: { bg: "#EDFAF4", border: "#BBF7D0", iconColor: "#15694A", icon: CheckCircle2 },
    warning: { bg: "#FEF9EE", border: "#FDF0D4", iconColor: "#8A5C0A", icon: AlertCircle  },
    error:   { bg: "#FEF2F4", border: "#FDE2E7", iconColor: "#9B2335", icon: AlertCircle  },
  }[type]
  const SIcon = styles.icon
  return (
    <div
      className="flex items-start gap-2.5 rounded-[8px] px-3 py-2.5 border"
      style={{ background: styles.bg, borderColor: styles.border }}
    >
      <SIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: styles.iconColor }} />
      <div>
        <p className="text-[12px] font-medium" style={{ color: styles.iconColor }}>{title}</p>
        {detail && <p className="text-[11px] mt-0.5 font-mono" style={{ color: styles.iconColor }}>{detail}</p>}
        {extra  && <p className="text-[11px] mt-0.5 text-ink-tertiary">{extra}</p>}
      </div>
    </div>
  )
}
