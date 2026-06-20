"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { createClinicManually } from "@/lib/actions/super-admin"

const PLAN_OPTIONS = [
  { value: "STARTER", label: "Starter · $49/mes" },
  { value: "PROFESIONAL", label: "Profesional · $129/mes" },
  { value: "CLINICA", label: "Élite · $500/mes" },
] as const

export function CreateClinicForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<{ clinicId: string; tempPassword: string; email: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    clinicName: "",
    country: "EC",
    plan: "STARTER" as "STARTER" | "PROFESIONAL" | "CLINICA",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clinicName || !form.adminName || !form.adminEmail) {
      toast.error("Completa los campos obligatorios")
      return
    }
    setLoading(true)
    const result = await createClinicManually({
      clinicName: form.clinicName,
      country: form.country,
      plan: form.plan,
      adminName: form.adminName,
      adminEmail: form.adminEmail,
      adminPhone: form.adminPhone || undefined,
    })
    setLoading(false)

    if (result.success) {
      setCreated({ clinicId: result.clinicId, tempPassword: result.tempPassword, email: form.adminEmail })
    } else {
      toast.error(result.error ?? "Error al crear la clínica")
    }
  }

  const handleCopy = () => {
    if (!created) return
    navigator.clipboard.writeText(
      `Email: ${created.email}\nContraseña temporal: ${created.tempPassword}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (created) {
    return (
      <div className="max-w-md mx-auto bg-surface border border-line-subtle rounded-[16px] p-6 shadow-card space-y-4">
        <h2 className="text-[16px] font-bold text-ink-primary">Clínica creada</h2>
        <p className="text-[13px] text-ink-tertiary">
          Comparte estas credenciales con el cliente — la contraseña no se mostrará de nuevo.
        </p>
        <div className="bg-inset rounded-[10px] p-3 space-y-1 font-mono text-[13px]">
          <p><span className="text-ink-tertiary">Email:</span> {created.email}</p>
          <p><span className="text-ink-tertiary">Contraseña:</span> {created.tempPassword}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 h-9 flex items-center justify-center gap-1.5 text-[13px] font-medium border border-line-soft rounded-[8px] hover:bg-inset transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado" : "Copiar credenciales"}
          </button>
          <button
            onClick={() => router.push(`/super-admin/clinics/${created.clinicId}`)}
            className="flex-1 h-9 text-[13px] font-semibold text-white bg-brand-600 rounded-[8px] hover:bg-brand-700 transition-colors"
          >
            Ver clínica
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Link
        href="/super-admin/clinics"
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-tertiary hover:text-ink-secondary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver a Clínicas
      </Link>

      <form onSubmit={handleSubmit} className="bg-surface border border-line-subtle rounded-[16px] p-6 shadow-card space-y-4">
        <h1 className="text-[18px] font-bold text-ink-primary">Crear nueva clínica</h1>

        <div className="space-y-1">
          <label className="text-[12px] font-medium text-ink-tertiary">Nombre de la clínica *</label>
          <input
            className="w-full h-9 px-3 text-[13px] border border-line-soft rounded-[8px] bg-surface focus:outline-none focus:border-brand-400"
            value={form.clinicName}
            onChange={(e) => setForm((f) => ({ ...f, clinicName: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-ink-tertiary">País</label>
            <input
              className="w-full h-9 px-3 text-[13px] border border-line-soft rounded-[8px] bg-surface focus:outline-none focus:border-brand-400"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-ink-tertiary">Plan</label>
            <select
              className="w-full h-9 px-3 text-[13px] border border-line-soft rounded-[8px] bg-surface focus:outline-none focus:border-brand-400"
              value={form.plan}
              onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as typeof f.plan }))}
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-line-subtle space-y-3">
          <p className="text-[11px] font-medium text-ink-tertiary uppercase tracking-[0.04em]">Administrador de la cuenta</p>

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-ink-tertiary">Nombre *</label>
            <input
              className="w-full h-9 px-3 text-[13px] border border-line-soft rounded-[8px] bg-surface focus:outline-none focus:border-brand-400"
              value={form.adminName}
              onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-ink-tertiary">Email * (será su usuario de acceso)</label>
            <input
              type="email"
              className="w-full h-9 px-3 text-[13px] border border-line-soft rounded-[8px] bg-surface focus:outline-none focus:border-brand-400"
              value={form.adminEmail}
              onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-ink-tertiary">WhatsApp (opcional)</label>
            <input
              placeholder="+593..."
              className="w-full h-9 px-3 text-[13px] border border-line-soft rounded-[8px] bg-surface focus:outline-none focus:border-brand-400"
              value={form.adminPhone}
              onChange={(e) => setForm((f) => ({ ...f, adminPhone: e.target.value }))}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 text-[14px] font-semibold text-white bg-brand-600 rounded-[8px] hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creando…" : "Crear clínica →"}
        </button>
      </form>
    </div>
  )
}
