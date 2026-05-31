import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";
import { isCalendarConnected } from "@/lib/google-calendar/oauth";
import { CalendarConnect } from "@/components/agendador/CalendarConnect";
import { Clock, Bell, Zap } from "lucide-react";
import { Suspense } from "react";

export default async function CalendarSettingsPage() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.clinicId) redirect("/login");

  const connected = await isCalendarConnected(session.user.id);

  return (
    <div className="max-w-xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hermes Agendador</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Conecta tu calendario y activa los recordatorios automáticos por
          WhatsApp.
        </p>
      </div>

      {/* Calendar connection card */}
      <Suspense>
        <CalendarConnect initialConnected={connected} />
      </Suspense>

      {/* Feature list */}
      <div className="space-y-3">
        {[
          {
            icon: Zap,
            color: "text-indigo-500 bg-indigo-50",
            title: "Sincronización automática",
            desc: "Cada cita que agendes desde el pipeline se crea automáticamente en tu Google Calendar.",
          },
          {
            icon: Bell,
            color: "text-teal-500 bg-teal-50",
            title: "Recordatorios 24h antes",
            desc: "Hermes envía un mensaje de WhatsApp al paciente con los detalles de la cita y un link de confirmación.",
          },
          {
            icon: Clock,
            color: "text-amber-500 bg-amber-50",
            title: "Slots en tiempo real",
            desc: "Al agendar una cita, el selector muestra solo los horarios libres de tu calendario real.",
          },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-4 bg-white rounded-xl border border-medical-border p-4"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Status note */}
      <p className="text-xs text-gray-300 text-center">
        Los recordatorios se envían automáticamente cada hora · Vercel Cron
      </p>
    </div>
  );
}
