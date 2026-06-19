import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: "Agendada", color: "text-blue-700", bg: "bg-blue-50" },
  CONFIRMED: { label: "Confirmada", color: "text-indigo-700", bg: "bg-indigo-50" },
  COMPLETED: { label: "Completada", color: "text-emerald-700", bg: "bg-emerald-50" },
  CANCELLED: { label: "Cancelada", color: "text-red-700", bg: "bg-red-50" },
  NO_SHOW: { label: "No asistió", color: "text-orange-700", bg: "bg-orange-50" },
};

export default async function AppointmentsPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const appointments = await db.appointment.findMany({
    where: { clinicId: session.user.clinicId },
    include: {
      patient: { select: { id: true, fullName: true, phone: true } },
      dentist: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const upcoming = appointments.filter(
    (a) => new Date(a.scheduledAt) >= new Date() && a.status !== "CANCELLED"
  );
  const past = appointments.filter(
    (a) => new Date(a.scheduledAt) < new Date() || a.status === "CANCELLED"
  );

  const AppointmentCard = ({ appt }: { appt: (typeof appointments)[0] }) => {
    const status = statusConfig[appt.status] ?? statusConfig.SCHEDULED;
    return (
      <Card className="bg-white shadow-sm border-gray-100">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">
                  {appt.procedure}
                </p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color} ${status.bg}`}
                >
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  {appt.patient.fullName}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(appt.scheduledAt)}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  Dr. {appt.dentist.name}
                </span>
              </div>
            </div>
            {appt.value && (
              <p className="text-sm font-semibold text-gray-700 flex-shrink-0 ml-4">
                {formatCurrency(appt.value, "USD")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Agenda</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {upcoming.length} citas próximas · {past.length} citas pasadas
        </p>
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Próximas citas</h3>
          {upcoming.map((a) => (
            <AppointmentCard key={a.id} appt={a} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500">Citas anteriores</h3>
          {past.map((a) => (
            <AppointmentCard key={a.id} appt={a} />
          ))}
        </div>
      )}
    </div>
  );
}
