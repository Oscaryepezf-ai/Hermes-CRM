import { redirect, notFound } from "next/navigation";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { getClinicalHistory } from "@/lib/actions/clinical";
import { getOrthodonticHistory, getOrthodonticVisitsByLead } from "@/lib/actions/orthodontics";
import { getPrescriptionsByLead } from "@/lib/actions/prescriptions";
import { getPatientFiles } from "@/lib/actions/files";
import { Patient360View } from "@/components/patients/Patient360View";

export const dynamic = "force-dynamic";

export default async function Patient360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead || lead.clinicId !== session.user.clinicId) notFound();

  const canViewClinico = session.user.role === "ADMIN" || session.user.role === "DOCTOR";

  const [clinicalRes, orthoHistoryRes, orthoVisitsRes, prescriptionsRes, filesRes, clinic, patient] = await Promise.all([
    canViewClinico ? getClinicalHistory(id) : Promise.resolve(null),
    canViewClinico ? getOrthodonticHistory(id) : Promise.resolve(null),
    canViewClinico ? getOrthodonticVisitsByLead(id) : Promise.resolve(null),
    canViewClinico ? getPrescriptionsByLead(id) : Promise.resolve(null),
    getPatientFiles(id),
    db.clinic.findUnique({ where: { id: session.user.clinicId }, select: { name: true } }),
    lead.patientId
      ? db.patient.findUnique({
          where: { id: lead.patientId },
          include: {
            appointments: {
              include: { dentist: { select: { id: true, name: true } } },
              orderBy: { scheduledAt: "desc" },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  return (
    <Patient360View
      lead={{
        id: lead.id,
        fullName: lead.fullName,
        nickname: lead.nickname,
        phone: lead.phone,
        email: lead.email,
        journeyState: lead.journeyState,
        createdAt: lead.createdAt,
        birthDate: lead.birthDate,
        hcNumber: lead.hcNumber,
        documentType: lead.documentType ?? "CEDULA",
        documentNumber: lead.documentNumber,
        birthCountry: lead.birthCountry,
        landline: lead.landline,
        address: lead.address,
        channel: lead.channel,
        sex: lead.sex,
        insurer: lead.insurer,
        businessLine: lead.businessLine,
        patientGroup: lead.patientGroup,
        occupation: lead.occupation,
        additionalInfo: lead.additionalInfo,
      }}
      clinicalHistory={clinicalRes?.success ? clinicalRes.data : null}
      orthodonticHistory={orthoHistoryRes?.success ? orthoHistoryRes.data : null}
      orthodonticVisits={orthoVisitsRes?.success ? orthoVisitsRes.data : []}
      prescriptions={prescriptionsRes?.success ? prescriptionsRes.data : []}
      files={filesRes.success ? filesRes.data : []}
      clinicName={clinic?.name ?? ""}
      patient={patient}
      canViewClinico={canViewClinico}
    />
  );
}
