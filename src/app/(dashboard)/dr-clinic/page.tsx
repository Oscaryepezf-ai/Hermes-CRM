"use client";

import { useState } from "react";
import { Stethoscope, FileText } from "lucide-react";
import { PatientSearch } from "@/components/dr-clinic/PatientSearch";
import { ClinicalForm } from "@/components/dr-clinic/ClinicalForm";
import { getClinicalHistory } from "@/lib/actions/clinical";
import type { ClinicalHistoryWithLead } from "@/types/clinical";

export default function DrClinicPage() {
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [selectedName,    setSelectedName]    = useState<string | null>(null);
  const [history,         setHistory]         = useState<ClinicalHistoryWithLead | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);

  const handlePatientSelect = async (leadId: string, leadName: string) => {
    setSelectedId(leadId);
    setSelectedName(leadName);
    setHistory(null);
    setIsLoadingRecord(true);

    const res = await getClinicalHistory(leadId);
    setIsLoadingRecord(false);

    if (res.success) {
      setHistory(res.data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dr. Clinic</h1>
          <p className="text-sm text-gray-500">Historia clínica y dictado por voz</p>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-6 items-start">
        {/* Left panel — patient search */}
        <div className="w-[320px] flex-shrink-0 space-y-4">
          <div className="bg-medical-card rounded-2xl border border-medical-border shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Seleccionar paciente</h2>
            <PatientSearch onSelect={handlePatientSelect} />
          </div>

          {/* Selected patient card */}
          {selectedName && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
              <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide">Paciente activo</p>
              <p className="text-sm font-semibold text-indigo-900 mt-0.5">{selectedName}</p>
            </div>
          )}
        </div>

        {/* Right panel — clinical form */}
        <div className="flex-1 min-w-0">
          {isLoadingRecord ? (
            <div className="bg-medical-card rounded-2xl border border-medical-border shadow-sm p-6">
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Cargando historia clínica...</p>
              </div>
            </div>
          ) : history ? (
            <ClinicalForm history={history} />
          ) : (
            <div className="bg-medical-card rounded-2xl border border-medical-border shadow-sm p-6">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">
                  Selecciona un paciente para ver o crear su historia clínica
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
