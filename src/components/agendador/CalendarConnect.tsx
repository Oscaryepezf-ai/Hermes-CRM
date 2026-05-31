"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCalendarAuthUrl } from "@/lib/actions/agendador";

type Props = {
  initialConnected: boolean;
};

export function CalendarConnect({ initialConnected }: Props) {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(initialConnected);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "connected") {
      setConnected(true);
      setMessage({
        type: "success",
        text: "Google Calendar conectado correctamente.",
      });
    } else if (error === "access_denied") {
      setMessage({ type: "error", text: "Acceso denegado por Google." });
    } else if (error) {
      setMessage({
        type: "error",
        text: "Error al conectar el calendario. Inténtalo de nuevo.",
      });
    }
  }, [searchParams]);

  function handleConnect() {
    startTransition(async () => {
      const result = await getCalendarAuthUrl();
      if (result.url) {
        window.location.href = result.url;
      }
    });
  }

  async function handleDisconnect() {
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (res.ok) {
        setConnected(false);
        setMessage({
          type: "success",
          text: "Calendario desconectado correctamente.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Error al desconectar." });
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-6 transition-colors",
        connected
          ? "border-emerald-200 bg-emerald-50"
          : "border-medical-border bg-white"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            connected ? "bg-emerald-500" : "bg-slate-100"
          )}
        >
          <Calendar
            className={cn(
              "w-6 h-6",
              connected ? "text-white" : "text-slate-400"
            )}
          />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Google Calendar</h3>
          <p
            className={cn(
              "text-sm font-medium",
              connected ? "text-emerald-600" : "text-gray-400"
            )}
          >
            {connected ? "Conectado · Sincronizando citas" : "Sin conectar"}
          </p>
        </div>
        {connected && (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto flex-shrink-0" />
        )}
      </div>

      {/* Description */}
      {!connected && (
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          Conecta tu Google Calendar para que Hermes pueda ver tu disponibilidad
          real y sincronizar las citas automáticamente al agendar.
        </p>
      )}

      {/* Feedback message */}
      {message && (
        <div
          className={cn(
            "flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-4",
            message.type === "success"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-50 text-red-700"
          )}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* CTA */}
      {connected ? (
        <button
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {isDisconnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Unlink className="w-4 h-4" />
          )}
          Desconectar
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isPending}
          className="flex items-center gap-2 w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          Conectar Google Calendar
        </button>
      )}
    </div>
  );
}
