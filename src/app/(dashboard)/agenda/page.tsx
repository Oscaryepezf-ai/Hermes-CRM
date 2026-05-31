import { Plus } from "lucide-react"
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar"
import { PushPermissionBanner } from "@/components/notifications/PushPermissionBanner"

export default function AgendaPage() {
  return (
    <div className="flex flex-col h-full">
      <PushPermissionBanner />

      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500">Calendario de citas de la clínica</p>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6">
        <AgendaCalendar />
      </div>
    </div>
  )
}
