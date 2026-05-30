"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getClinicalHistory } from "@/lib/actions/clinical";
import { ClinicalForm } from "@/components/dr-clinic/ClinicalForm";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClinicalHistoryWithLead } from "@/types/clinical";

interface DictationDialogProps {
  leadId:   string;
  leadName: string;
  onClose:  () => void;
}

export function DictationDialog({ leadId, leadName, onClose }: DictationDialogProps) {
  const [history, setHistory]     = useState<ClinicalHistoryWithLead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    getClinicalHistory(leadId).then((res) => {
      if (res.success) {
        setHistory(res.data);
      } else {
        setError(res.error ?? "Error al cargar la historia clínica");
      }
      setIsLoading(false);
    });
  }, [leadId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Diagnóstico dictado</h2>
            <p className="text-sm text-gray-500 mt-0.5">{leadName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-24 w-full rounded-xl" />
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 text-sm text-indigo-600 hover:underline"
              >
                Cerrar
              </button>
            </div>
          ) : history ? (
            <ClinicalForm history={history} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
