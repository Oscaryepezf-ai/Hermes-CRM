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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Leads y Pacientes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Seguimiento comercial del pipeline
          </p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <UserPlus className="w-4 h-4 mr-1.5" />
          Nuevo Lead
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
