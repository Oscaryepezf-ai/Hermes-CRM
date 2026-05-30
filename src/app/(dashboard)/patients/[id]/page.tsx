import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  COMPLETED: { label: "Completada", icon: CheckCircle, color: "text-emerald-600" },
  CANCELLED: { label: "Cancelada", icon: XCircle, color: "text-red-500" },
  SCHEDULED: { label: "Agendada", icon: Clock, color: "text-blue-500" },
  CONFIRMED: { label: "Confirmada", icon: CheckCircle, color: "text-indigo-600" },
  NO_SHOW: { label: "No asistió", icon: AlertCircle, color: "text-orange-500" },
};

export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        include: { dentist: { select: { id: true, name: true } } },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });

  if (!patient || patient.clinicId !== session.user.clinicId) notFound();

  const totalRevenue = patient.appointments
    .filter((a) => a.status === "COMPLETED")
    .reduce((sum, a) => sum + (a.value ?? 0), 0);

  const nextAppt = patient.appointments.find(
    (a) =>
      a.status === "SCHEDULED" || a.status === "CONFIRMED"
  );

  const initials = patient.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const age = patient.birthDate
    ? Math.floor(
        (Date.now() - new Date(patient.birthDate).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      )
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/patients"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver a pacientes
      </Link>

      {/* Header del paciente */}
      <Card className="bg-white shadow-sm border-gray-100">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-indigo-700">{initials}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">
                  {patient.fullName}
                </h1>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  Paciente activo
                </Badge>
              </div>

              {age && (
                <p className="text-sm text-gray-500 mt-0.5">{age} años</p>
              )}

              <div className="flex flex-wrap gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {patient.phone}
                </div>
                {patient.email && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {patient.email}
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {patient.address}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen financiero */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white shadow-sm border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-gray-500 font-medium">Total invertido</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(totalRevenue, "COP")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-xs text-gray-500 font-medium">Total citas</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {patient.appointments.length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-cyan-600" />
              <span className="text-xs text-gray-500 font-medium">Próxima cita</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {nextAppt ? formatDate(nextAppt.scheduledAt) : "Sin agendar"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline de citas */}
      <Card className="bg-white shadow-sm border-gray-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Historial de citas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patient.appointments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Sin citas registradas
              </p>
            ) : (
              patient.appointments.map((appt, idx) => {
                const status = statusConfig[appt.status] ?? statusConfig.SCHEDULED;
                const Icon = status.icon;
                return (
                  <div key={appt.id}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${status.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">
                            {appt.procedure}
                          </p>
                          {appt.value && (
                            <p className="text-sm font-semibold text-gray-700">
                              {formatCurrency(appt.value, "COP")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className={`text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(appt.scheduledAt)} · Dr. {appt.dentist.name}
                          </span>
                        </div>
                        {appt.notes && (
                          <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                            {appt.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info adicional */}
      {(patient.cedula || patient.birthDate) && (
        <Card className="bg-white shadow-sm border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Información personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {patient.cedula && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-gray-400 w-24 text-xs">Cédula:</span>
                {patient.cedula}
              </div>
            )}
            {patient.birthDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-gray-400 w-24 text-xs">Nacimiento:</span>
                {formatDate(patient.birthDate)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
