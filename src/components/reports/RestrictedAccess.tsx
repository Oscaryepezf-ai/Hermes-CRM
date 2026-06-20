import { Lock } from "lucide-react"

export function RestrictedAccess() {
  return (
    <div className="bg-surface border border-line-subtle rounded-[12px] p-8 shadow-card flex flex-col items-center gap-2 text-center">
      <div className="w-10 h-10 rounded-full bg-inset flex items-center justify-center">
        <Lock className="w-4.5 h-4.5 text-ink-tertiary" />
      </div>
      <p className="text-[14px] font-semibold text-ink-primary">Acceso restringido</p>
      <p className="text-[12px] text-ink-tertiary max-w-xs">
        Solo el administrador de la clínica puede ver los reportes financieros.
      </p>
    </div>
  )
}
