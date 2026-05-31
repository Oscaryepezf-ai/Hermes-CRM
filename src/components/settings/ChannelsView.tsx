"use client"

import { useState } from "react"
import {
  MessageCircle, Globe, Camera, CheckCircle2, XCircle,
  ChevronRight, ExternalLink, AlertCircle, Eye, EyeOff,
  Wifi, WifiOff, Loader2, Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { connectFacebook, disconnectChannel } from "@/lib/actions/channels"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelRecord = {
  id:          string
  channel:     string
  isActive:    boolean
  pageId:      string | null
  connectedAt: Date | null
}

type WhatsAppStatus = "configured" | "missing"

interface ChannelsViewProps {
  channels:      ChannelRecord[]
  waStatus:      WhatsAppStatus
  waPhoneId:     string | null
}

// ─── Channel config ───────────────────────────────────────────────────────────

const CHANNEL_META = {
  WHATSAPP: {
    name:        "WhatsApp Business",
    description: "Recibe y envía mensajes de WhatsApp desde el pipeline. Configurado via WhatsApp Cloud API.",
    icon:        MessageCircle,
    iconBg:      "bg-[#F0FDF4]",
    iconColor:   "text-[#128C4A]",
    dotColor:    "#25D366",
    docsUrl:     "https://developers.facebook.com/docs/whatsapp",
  },
  FACEBOOK: {
    name:        "Facebook Messenger",
    description: "Los mensajes que llegan a tu página de Facebook crean leads automáticamente en el pipeline.",
    icon:        Globe,
    iconBg:      "bg-[#EFF6FF]",
    iconColor:   "text-[#1877F2]",
    dotColor:    "#1877F2",
    docsUrl:     "https://developers.facebook.com/docs/messenger-platform",
  },
  INSTAGRAM: {
    name:        "Instagram DM",
    description: "Convierte mensajes directos de Instagram en leads del pipeline automáticamente.",
    icon:        Camera,
    iconBg:      "bg-[#FDF2F8]",
    iconColor:   "text-[#E1306C]",
    dotColor:    "#E1306C",
    docsUrl:     "https://developers.facebook.com/docs/instagram-api",
  },
} as const

// ─── Main component ───────────────────────────────────────────────────────────

export function ChannelsView({ channels, waStatus, waPhoneId }: ChannelsViewProps) {
  const facebookChannel = channels.find(c => c.channel === "FACEBOOK")

  return (
    <div className="max-w-3xl space-y-3">
      {/* WhatsApp */}
      <WhatsAppCard status={waStatus} phoneId={waPhoneId} />

      {/* Facebook Messenger */}
      <FacebookCard channel={facebookChannel ?? null} />

      {/* Instagram DM */}
      <ComingSoonCard
        channel="INSTAGRAM"
        meta={CHANNEL_META.INSTAGRAM}
        eta="Q3 2026"
      />

      {/* Info footer */}
      <div className="flex items-start gap-2.5 bg-brand-50 border border-brand-100 rounded-[10px] px-4 py-3 mt-2">
        <Info className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-brand-700 leading-relaxed">
          Todos los mensajes entrantes de cualquier canal se unifican en el panel de conversación
          del pipeline. El asesor siempre sabe desde dónde llegó cada prospecto.
        </p>
      </div>
    </div>
  )
}

// ─── WhatsApp Card ────────────────────────────────────────────────────────────

function WhatsAppCard({ status, phoneId }: { status: WhatsAppStatus; phoneId: string | null }) {
  const meta = CHANNEL_META.WHATSAPP
  const Icon = meta.icon
  const connected = status === "configured"

  return (
    <ChannelCard
      meta={meta}
      connected={connected}
      badge={connected ? "Activo" : "Sin configurar"}
    >
      {connected ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#15694A] flex-shrink-0" />
            <div>
              <p className="text-[12px] font-medium text-[#15694A]">WhatsApp Cloud API conectado</p>
              {phoneId && (
                <p className="text-[11px] text-[#166534] mt-0.5 font-mono">Phone ID: {phoneId.slice(0, 6)}••••••</p>
              )}
            </div>
          </div>
          <p className="text-[11px] text-ink-tertiary leading-relaxed">
            La configuración de WhatsApp se gestiona mediante variables de entorno (WHATSAPP_PHONE_ID,
            WHATSAPP_TOKEN). Para cambiarla, actualiza las variables en Vercel y redespliega.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 bg-[#FEF9EE] border border-[#FDF0D4] rounded-[8px] px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-[#8A5C0A] flex-shrink-0" />
            <div>
              <p className="text-[12px] font-medium text-[#8A5C0A]">WHATSAPP_PHONE_ID no configurado</p>
              <p className="text-[11px] text-[#92400E] mt-0.5">
                Agrega las variables de entorno en Vercel para activar este canal.
              </p>
            </div>
          </div>
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-brand-600 font-medium hover:underline"
          >
            Ver guía de configuración <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </ChannelCard>
  )
}

// ─── Facebook Card ────────────────────────────────────────────────────────────

function FacebookCard({ channel }: { channel: ChannelRecord | null }) {
  const meta      = CHANNEL_META.FACEBOOK
  const connected = channel?.isActive ?? false

  const [showForm, setShowForm]   = useState(false)
  const [pageId, setPageId]       = useState("")
  const [token, setToken]         = useState("")
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving]       = useState(false)

  const handleConnect = async () => {
    if (!pageId.trim() || !token.trim()) {
      toast.error("Completa todos los campos")
      return
    }
    setSaving(true)
    const res = await connectFacebook({ pageId: pageId.trim(), accessToken: token.trim() })
    if (res.success) {
      toast.success("Facebook Messenger conectado")
      setShowForm(false)
      setPageId("")
      setToken("")
    } else {
      toast.error(res.error)
    }
    setSaving(false)
  }

  const handleDisconnect = async () => {
    setSaving(true)
    const res = await disconnectChannel("FACEBOOK")
    if (res.success) toast.success("Facebook desconectado")
    else toast.error(res.error)
    setSaving(false)
  }

  return (
    <ChannelCard
      meta={meta}
      connected={connected}
      badge={connected ? "Activo" : "Desconectado"}
    >
      {connected ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#1D4ED8] flex-shrink-0" />
            <div>
              <p className="text-[12px] font-medium text-[#1D4ED8]">Messenger activo</p>
              {channel?.pageId && (
                <p className="text-[11px] text-[#1E40AF] mt-0.5 font-mono">
                  Page ID: {channel.pageId}
                </p>
              )}
              {channel?.connectedAt && (
                <p className="text-[11px] text-ink-tertiary mt-0.5">
                  Conectado el {new Date(channel.connectedAt).toLocaleDateString("es-CO")}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#F0F2F6] border border-line-soft rounded-[8px] px-3 py-2">
              <p className="text-[11px] text-ink-tertiary mb-0.5">Webhook URL configurado</p>
              <p className="text-[11px] font-mono text-ink-secondary truncate">
                {typeof window !== "undefined" ? window.location.origin : "https://dentflow-henna.vercel.app"}
                /api/webhooks/meta
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={saving}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <WifiOff className="w-3.5 h-3.5 mr-1.5" />}
            Desconectar Facebook
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {!showForm ? (
            <>
              <p className="text-[12px] text-ink-tertiary leading-relaxed">
                Para conectar, necesitas una App de Meta for Developers con el producto
                Messenger habilitado y un token de acceso de tu página.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowForm(true)}
                  className="bg-[#1877F2] hover:bg-[#1565D8] text-white text-xs h-8 px-3"
                >
                  <Wifi className="w-3.5 h-3.5 mr-1.5" />
                  Conectar Facebook
                </Button>
                <a
                  href="https://developers.facebook.com/docs/messenger-platform/get-started"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="text-xs h-8 px-3">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Ver guía
                  </Button>
                </a>
              </div>
            </>
          ) : (
            <ConnectForm
              title="Conectar Facebook Messenger"
              fields={[
                {
                  id:          "fb-page-id",
                  label:       "Facebook Page ID",
                  placeholder: "123456789012345",
                  value:       pageId,
                  onChange:    setPageId,
                  type:        "text",
                  hint:        "Encuéntralo en Configuración de tu Página → Info de la página",
                },
                {
                  id:          "fb-token",
                  label:       "Page Access Token",
                  placeholder: "EAABs...",
                  value:       token,
                  onChange:    setToken,
                  type:        showToken ? "text" : "password",
                  hint:        "Meta for Developers → Messenger → Tokens de acceso",
                  toggle:      { show: showToken, onToggle: () => setShowToken(!showToken) },
                },
              ]}
              onCancel={() => { setShowForm(false); setPageId(""); setToken("") }}
              onSubmit={handleConnect}
              saving={saving}
              submitLabel="Conectar"
              submitColor="bg-[#1877F2] hover:bg-[#1565D8]"
            />
          )}
        </div>
      )}
    </ChannelCard>
  )
}

// ─── Coming Soon Card ─────────────────────────────────────────────────────────

function ComingSoonCard({
  meta, eta,
}: {
  channel: keyof typeof CHANNEL_META
  meta:    typeof CHANNEL_META[keyof typeof CHANNEL_META]
  eta:     string
}) {
  const Icon = meta.icon
  return (
    <div className="bg-surface border border-line-subtle rounded-[12px] p-5 opacity-60">
      <div className="flex items-start justify-between">
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
            <p className="text-[12px] text-ink-tertiary mt-0.5 leading-relaxed max-w-lg">
              {meta.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared: Channel Card shell ───────────────────────────────────────────────

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
    <div
      className={cn(
        "bg-surface border rounded-[12px] p-5 transition-ui",
        connected ? "border-line-soft shadow-card" : "border-line-subtle"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0", meta.iconBg)}>
            <Icon className={cn("w-5 h-5", meta.iconColor)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-[550] text-ink-primary">{meta.name}</p>
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]",
                  connected
                    ? "bg-[#EDFAF4] text-[#15694A]"
                    : "bg-[#F0F2F6] text-[#4A5568]"
                )}
              >
                <span
                  className="w-[5px] h-[5px] rounded-full"
                  style={{ background: connected ? "#10B981" : "#94A3B8" }}
                />
                {badge}
              </span>
            </div>
            <p className="text-[12px] text-ink-tertiary mt-0.5 leading-relaxed max-w-lg">
              {meta.description}
            </p>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── Shared: Connect Form ─────────────────────────────────────────────────────

type FormField = {
  id:          string
  label:       string
  placeholder: string
  value:       string
  onChange:    (v: string) => void
  type:        string
  hint?:       string
  toggle?:     { show: boolean; onToggle: () => void }
}

function ConnectForm({
  title, fields, onCancel, onSubmit, saving, submitLabel, submitColor,
}: {
  title:       string
  fields:      FormField[]
  onCancel:    () => void
  onSubmit:    () => void
  saving:      boolean
  submitLabel: string
  submitColor: string
}) {
  return (
    <div className="bg-inset border border-line-subtle rounded-[10px] p-4 space-y-4">
      <p className="text-[12px] font-[550] text-ink-primary">{title}</p>

      {fields.map(f => (
        <div key={f.id} className="space-y-1.5">
          <Label htmlFor={f.id} className="text-[12px] font-medium text-ink-secondary">
            {f.label}
          </Label>
          <div className="relative">
            <Input
              id={f.id}
              type={f.type}
              placeholder={f.placeholder}
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              className="text-[12px] h-9 pr-8 font-mono"
            />
            {f.toggle && (
              <button
                type="button"
                onClick={f.toggle.onToggle}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-secondary"
              >
                {f.toggle.show
                  ? <EyeOff className="w-3.5 h-3.5" />
                  : <Eye className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>
          {f.hint && <p className="text-[11px] text-ink-tertiary">{f.hint}</p>}
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={saving}
          className={cn("text-white text-xs h-8 px-4", submitColor)}
        >
          {saving
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Verificando...</>
            : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />{submitLabel}</>
          }
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
          className="text-xs h-8"
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
