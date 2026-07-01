"use client"

import { useState, useRef, useTransition } from "react"
import { Upload, Loader2, Building2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { updateClinicInfo } from "@/lib/actions/clinic-info"

interface ClinicInfoFormProps {
  clinic: {
    name:    string
    logoUrl: string | null
    phone:   string | null
    address: string | null
    city:    string | null
  }
}

export function ClinicInfoForm({ clinic }: ClinicInfoFormProps) {
  const [isPending, startTransition] = useTransition()
  const [logoPreview, setLogoPreview] = useState<string | null>(clinic.logoUrl)
  const [logoFile,    setLogoFile]    = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [name,    setName]    = useState(clinic.name)
  const [phone,   setPhone]   = useState(clinic.phone ?? "")
  const [address, setAddress] = useState(clinic.address ?? "")
  const [city,    setCity]    = useState(clinic.city ?? "")

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("El logo no puede superar 5MB"); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const formData = new FormData()
      formData.set("name",    name)
      formData.set("phone",   phone)
      formData.set("address", address)
      formData.set("city",    city)
      if (logoFile) formData.set("logo", logoFile)

      const result = await updateClinicInfo(formData)
      if (result.success) toast.success("Información actualizada")
      else toast.error(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo */}
      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card">
        <h3 className="text-[14px] font-bold text-ink-primary mb-4">Logo de la clínica</h3>
        <p className="text-[12px] text-ink-tertiary mb-4">
          Se mostrará en los presupuestos y documentos generados. Formato PNG o JPG, máx. 5MB.
        </p>
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-line-subtle flex items-center justify-center overflow-hidden bg-inset flex-shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo clínica" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-10 h-10 text-ink-disabled" />
            )}
          </div>
          <div className="space-y-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" />
              {logoPreview ? "Cambiar logo" : "Subir logo"}
            </Button>
            {logoPreview && (
              <button
                type="button"
                onClick={() => { setLogoPreview(null); setLogoFile(null) }}
                className="block text-[11px] text-red-500 hover:text-red-700"
              >
                Quitar logo
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleLogoChange} />
        </div>
      </div>

      {/* Info fields */}
      <div className="bg-surface border border-line-subtle rounded-[12px] p-5 shadow-card space-y-4">
        <h3 className="text-[14px] font-bold text-ink-primary">Datos de la clínica</h3>
        <p className="text-[12px] text-ink-tertiary -mt-2">
          Aparecen en el encabezado de los presupuestos.
        </p>

        <div>
          <label className="text-[11px] font-medium text-ink-secondary block mb-1">Nombre de la clínica *</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-medium text-ink-secondary block mb-1">Teléfono</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              maxLength={30}
              placeholder="+593 99 000 0000"
              className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-secondary block mb-1">Ciudad</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              maxLength={80}
              placeholder="Guayaquil"
              className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-secondary block mb-1">Dirección</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            maxLength={200}
            placeholder="Av. Principal 123"
            className="w-full h-9 rounded-lg border border-line-subtle bg-transparent px-2.5 text-[13px] text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}
