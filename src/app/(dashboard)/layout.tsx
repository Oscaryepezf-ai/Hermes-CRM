import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { Toaster } from "@/components/ui/sonner";

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
    <div className="min-h-screen bg-medical-bg">
      <Sidebar userRole={session.user.role} />
      <div className="pl-[220px]">
        <Header
          clinicName={clinic.name}
          userName={session.user.name ?? "Usuario"}
          plan={clinic.plan}
        />
        <main className="p-6">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
