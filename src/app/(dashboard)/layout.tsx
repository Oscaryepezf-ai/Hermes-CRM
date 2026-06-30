import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getAccessibleClinics } from "@/lib/actions/clinic-switch";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const [clinic, clinics] = await Promise.all([
    db.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true, plan: true },
    }),
    getAccessibleClinics(),
  ]);

  if (!clinic) redirect("/login");

  return (
    <DashboardShell
      clinicName={clinic.name}
      userName={session.user.name ?? "Usuario"}
      plan={clinic.plan}
      userRole={session.user.role}
      isSuperAdmin={(session.user as any).isSuperAdmin ?? false}
      clinics={clinics}
      activeClinicId={session.user.clinicId}
    >
      {children}
    </DashboardShell>
  );
}
