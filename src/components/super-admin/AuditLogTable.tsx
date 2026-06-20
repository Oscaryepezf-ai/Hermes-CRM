import { format } from "date-fns"
import { es } from "date-fns/locale"

const ACTION_LABELS: Record<string, string> = {
  CLINIC_CREATED: "creó la clínica",
  CLINIC_PLAN_CHANGED: "cambió el plan de",
  CLINIC_SUSPENDED: "suspendió",
  CLINIC_REACTIVATED: "reactivó",
  USER_ROLE_CHANGED: "cambió el rol de",
  USER_PASSWORD_RESET: "reseteó la contraseña de",
  USER_ACTIVATED: "activó a",
  USER_DEACTIVATED: "desactivó a",
}

type AuditLog = {
  id: string
  action: string
  targetType: string
  targetLabel: string
  createdAt: Date
  metadata: unknown
  adminUser: { name: string }
}

function describeMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const m = metadata as Record<string, unknown>
  if ("from" in m && "to" in m) return `${String(m.from)} → ${String(m.to)}`
  if ("reason" in m && m.reason) return `Motivo: ${String(m.reason)}`
  if ("plan" in m) return `Plan: ${String(m.plan)}`
  return null
}

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
      {logs.map((log, i) => {
        const detail = describeMetadata(log.metadata)
        return (
          <div
            key={log.id}
            className={`px-4 py-3 ${i < logs.length - 1 ? "border-b border-line-subtle" : ""}`}
          >
            <p className="text-[13px] text-ink-primary">
              <span className="font-[550]">{log.adminUser.name}</span>{" "}
              {ACTION_LABELS[log.action] ?? log.action}{" "}
              <span className="font-[550]">{log.targetLabel}</span>
            </p>
            <p className="text-[11px] text-ink-tertiary mt-0.5">
              {format(new Date(log.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
              {detail && <> · {detail}</>}
            </p>
          </div>
        )
      })}

      {logs.length === 0 && (
        <div className="px-4 py-8 text-center text-[13px] text-ink-tertiary">
          Sin acciones registradas todavía
        </div>
      )}
    </div>
  )
}
