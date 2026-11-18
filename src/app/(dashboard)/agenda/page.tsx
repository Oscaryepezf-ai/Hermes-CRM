import { AgendaCalendar } from "@/components/agenda/AgendaCalendar"
import { PushPermissionBanner } from "@/components/notifications/PushPermissionBanner"

export default function AgendaPage() {
  return (
    <div className="flex flex-col h-full gap-5">
      <PushPermissionBanner />

      <div>
        <h1 className="text-2xl font-bold text-ink-primary tracking-tight">Agenda</h1>
        <p className="text-sm text-ink-tertiary mt-1">Calendario de citas de la clínica</p>
      </div>

      <div className="flex-1 bg-surface rounded-2xl shadow-card p-4 md:p-5">
        <AgendaCalendar />
      </div>
    </div>
  )
}
