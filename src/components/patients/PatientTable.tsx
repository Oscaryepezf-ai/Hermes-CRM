"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, Phone, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Patient, Appointment } from "@/types";

type PatientWithInfo = Patient & {
  appointments: Appointment[];
  _count: { appointments: number };
};

interface PatientTableProps {
  patients: PatientWithInfo[];
}

export function PatientTable({ patients }: PatientTableProps) {
  const [search, setSearch] = useState("");

  const filtered = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      (p.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.cedula ?? "").includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por nombre, teléfono, email o cédula..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No se encontraron pacientes</p>
          </div>
        ) : (
          filtered.map((patient) => {
            const lastAppt = patient.appointments[0];
            return (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-indigo-700">
                        {patient.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {patient.fullName}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3" />
                          {patient.phone}
                        </span>
                        {patient.email && (
                          <span className="text-xs text-gray-400">
                            {patient.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {patient._count.appointments} cita
                        {patient._count.appointments !== 1 ? "s" : ""}
                      </Badge>
                      {lastAppt && (
                        <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(lastAppt.scheduledAt)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
