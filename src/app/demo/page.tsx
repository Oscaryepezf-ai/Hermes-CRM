"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Stethoscope, Loader2 } from "lucide-react";

export default function DemoPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    signIn("credentials", {
      email: "dr.garcia@sonrisas.co",
      password: "dentflow2024",
      callbackUrl: "/dashboard",
    }).catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
          <Stethoscope className="w-7 h-7 text-white" />
        </div>

        {status === "loading" ? (
          <>
            <div className="flex items-center gap-2 text-gray-600 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Entrando al demo...</span>
            </div>
            <p className="text-xs text-gray-400">Cargando Clínica Dental Sonrisas</p>
          </>
        ) : (
          <>
            <p className="text-sm text-red-600">Error al cargar el demo</p>
            <a href="/login" className="text-xs text-indigo-600 underline">
              Ir al login
            </a>
          </>
        )}
      </div>
    </div>
  );
}
