"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchPatients } from "@/lib/actions/clinical";
import { Skeleton } from "@/components/ui/skeleton";

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-teal-500", "bg-amber-500", "bg-rose-500",
];

function avatarColor(name: string) {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

interface PatientSearchProps {
  onSelect: (leadId: string, leadName: string) => void;
}

type SearchResult = {
  id: string;
  fullName: string;
  phone: string;
  clinicalHistory: { id: string } | null;
};

export function PatientSearch({ onSelect }: PatientSearchProps) {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open,      setOpen]      = useState(false);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    const res = await searchPatients(q);
    setIsLoading(false);
    if (res.success) setResults(res.data as SearchResult[]);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    debounceRef.current && clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 300);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (id: string, name: string) => {
    setQuery(name);
    setOpen(false);
    onSelect(id, name);
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Buscar paciente por nombre o teléfono..."
          className="w-full bg-medical-card border border-medical-border rounded-xl pl-9 pr-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-medical-border rounded-xl shadow-xl overflow-hidden z-50 max-h-[280px] overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-1 py-2">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No se encontraron pacientes con ese nombre
            </p>
          ) : (
            results.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => handleSelect(lead.id, lead.fullName)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", avatarColor(lead.fullName))}>
                  <span className="text-white text-xs font-medium">{initials(lead.fullName)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{lead.fullName}</p>
                  <p className="text-xs text-gray-400">{lead.phone}</p>
                </div>
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                  lead.clinicalHistory
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                )}>
                  {lead.clinicalHistory ? "Con ficha" : "Sin ficha"}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Hint when empty */}
      {!showDropdown && !query && (
        <p className="text-xs text-gray-400 mt-2 px-1">Escribe al menos 2 caracteres para buscar</p>
      )}
    </div>
  );
}
