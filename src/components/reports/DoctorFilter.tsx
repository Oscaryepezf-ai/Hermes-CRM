"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"

export function DoctorFilter({ doctors, value }: { doctors: { id: string; name: string }[]; value?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (doctorId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (doctorId) params.set("doctorId", doctorId)
    else params.delete("doctorId")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      className="h-8 px-2.5 text-[12px] border border-line-soft rounded-[6px] bg-surface text-ink-secondary"
    >
      <option value="">Todos los doctores</option>
      {doctors.map((d) => (
        <option key={d.id} value={d.id}>{d.name}</option>
      ))}
    </select>
  )
}
