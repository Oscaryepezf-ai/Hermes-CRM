import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { name: true, plan: true },
  });

  if (!clinic) redirect("/login");

  return (
    <DashboardShell
      clinicName={clinic.name}
      userName={session.user.name ?? "Usuario"}
      plan={clinic.plan}
      userRole={session.user.role}
    >
      {children}
    </DashboardShell>
  );
}
