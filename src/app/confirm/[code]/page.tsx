import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function confirmar(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!code || !rateLimit(`confirm:${ip}`, 20, 60 * 60 * 1000)) redirect(`/confirm/${code}?estado=error`);

  const appt = await db.appointment.findFirst({ where: { confirmationCode: code } });
  if (!appt) redirect(`/confirm/${code}?estado=invalido`);
  if (appt.status === "CANCELLED") redirect(`/confirm/${code}?estado=cancelada`);

  await db.appointment.update({
    where: { id: appt.id },
    data: { patientConfirmed: true, reminderStatus: "CONFIRMED", status: "CONFIRMED" },
  });
  redirect(`/confirm/${code}?estado=ok`);
}

const MENSAJES: Record<string, string> = {
  ok: "¡Listo! Tu cita quedó confirmada. Te esperamos.",
  invalido: "Este enlace no es válido o ya expiró.",
  cancelada: "Esta cita fue cancelada. Contacta a la clínica para reagendar.",
  error: "Ocurrió un error. Inténtalo de nuevo en unos minutos.",
};

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ estado?: string }>;
}) {
  const { code } = await params;
  const { estado } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center space-y-5">
        <h1 className="text-xl font-bold text-gray-900">Confirmación de cita</h1>
        {estado && MENSAJES[estado] ? (
          <p className="text-gray-600">{MENSAJES[estado]}</p>
        ) : (
          <form action={confirmar} className="space-y-4">
            <p className="text-gray-600">Pulsa el botón para confirmar tu asistencia.</p>
            <input type="hidden" name="code" value={code} />
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl"
            >
              Confirmar mi cita
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
