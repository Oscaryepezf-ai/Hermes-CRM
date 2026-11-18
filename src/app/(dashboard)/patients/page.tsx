import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { getLeadsForTable } from "@/lib/actions/leads";
import { LeadsTable, LeadsTableEmpty, LeadsTableError } from "@/components/leads/LeadsTable";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default async function PatientsPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const result = await getLeadsForTable();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary tracking-tight">Leads y pacientes</h1>
          <p className="text-sm text-ink-tertiary mt-1">
            Seguimiento comercial del pipeline
          </p>
        </div>
        <Button className="bg-brand-gradient hover:opacity-95 text-white font-semibold h-9 px-4 rounded-full" style={{ boxShadow: "var(--shadow-brand)" }}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Nuevo lead
        </Button>
      </div>

      {!result.success ? (
        <LeadsTableError message={result.error ?? "Error al cargar los leads"} />
      ) : result.data.length === 0 ? (
        <LeadsTableEmpty />
      ) : (
        <LeadsTable leads={result.data} />
      )}
    </div>
  );
}
