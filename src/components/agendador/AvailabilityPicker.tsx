"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Calendar,
  Loader2,
  CheckCircle2,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAvailableSlots, createAppointmentWithSync } from "@/lib/actions/agendador";
import { TREATMENT_LABELS } from "@/types/leads";
import type { DentalTreatment } from "@prisma/client";

type Slot = {
  isoStart: string;
  isoEnd: string;
  label: string;
};

type Props = {
  leadId: string;
  patientId: string;
  patientName: string;
  treatment: DentalTreatment;
  dentistId: string;
  onClose: () => void;
  onSuccess: () => void;
};

function groupSlotsByDay(slots: Slot[]): { day: string; slots: Slot[] }[] {
  const map = new Map<string, Slot[]>();
  for (const slot of slots) {
    const day = new Date(slot.isoStart).toLocaleDateString("es-EC", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const capitalized = day.charAt(0).toUpperCase() + day.slice(1);
    if (!map.has(capitalized)) map.set(capitalized, []);
    map.get(capitalized)!.push(slot);
  }
  return Array.from(map.entries()).map(([day, slots]) => ({ day, slots }));
}

export function AvailabilityPicker({
  leadId,
  patientId,
  patientName,
  treatment,
  dentistId,
  onClose,
  onSuccess,
}: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingSlots(true);
    fetchAvailableSlots(dentistId, 7).then((result) => {
      if (result.success && result.data) {
        setSlots(result.data as Slot[]);
      } else {
        setSlotsError(result.error ?? "Error al cargar horarios");
      }
      setLoadingSlots(false);
    });
  }, [dentistId]);

  function handleConfirm() {
    if (!selectedSlot) return;
    setConfirmError(null);

    startTransition(async () => {
      const result = await createAppointmentWithSync({
        leadId,
        patientId,
        dentistId,
        procedure: treatment,
        startIso: selectedSlot.isoStart,
        endIso: selectedSlot.isoEnd,
      });

      if (result.success) {
        setConfirmed(true);
        setTimeout(onSuccess, 1500);
      } else {
        setConfirmError(result.error ?? "Error al agendar");
      }
    });
  }

  const grouped = groupSlotsByDay(slots);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-medical-border">
          <div>
            <h2 className="font-bold text-gray-900">Agendar cita</h2>
            <p className="text-sm text-gray-400">
              {patientName} · {TREATMENT_LABELS[treatment]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loadingSlots && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-gray-400">
                Consultando Google Calendar...
              </p>
            </div>
          )}

          {slotsError && !loadingSlots && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {slotsError}
            </div>
          )}

          {!loadingSlots && !slotsError && grouped.length === 0 && (
            <div className="text-center py-16">
              <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                No hay horarios disponibles en los próximos 7 días.
              </p>
            </div>
          )}

          {!loadingSlots && grouped.map(({ day, slots: daySlots }) => (
            <div key={day} className="mb-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                {day}
              </p>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => {
                  const time = new Date(slot.isoStart).toLocaleTimeString(
                    "es-EC",
                    { hour: "2-digit", minute: "2-digit", hour12: true }
                  );
                  const isSelected = selectedSlot?.isoStart === slot.isoStart;
                  return (
                    <button
                      key={slot.isoStart}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-gray-700 border-medical-border hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {confirmed && (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="font-semibold text-gray-900">¡Cita agendada!</p>
              <p className="text-sm text-gray-400 text-center">
                Google Calendar actualizado y confirmación enviada por WhatsApp.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!confirmed && (
          <div className="px-6 py-4 border-t border-medical-border space-y-2">
            {confirmError && (
              <p className="text-sm text-red-600">{confirmError}</p>
            )}
            {selectedSlot && (
              <p className="text-xs text-gray-400 text-center">
                {selectedSlot.label}
              </p>
            )}
            <button
              onClick={handleConfirm}
              disabled={!selectedSlot || isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Agendando y sincronizando...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Confirmar cita
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
