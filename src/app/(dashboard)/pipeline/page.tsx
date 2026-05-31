import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { getLeadsForBoard } from "@/lib/actions/leads";
import { PipelineLayout } from "@/components/pipeline/PipelineLayout";

export default async function PipelinePage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const [result, clinic] = await Promise.all([
    getLeadsForBoard(),
    db.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true },
    }),
  ]);

  const leads = result.success ? result.data : [];
  const clinicName = clinic?.name ?? "Clínica";

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-medical-bg -m-6 overflow-hidden">
      <PipelineLayout initialLeads={leads} clinicName={clinicName} userRole={session.user.role} />
    </div>
  );
}
