"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecorderStatus, DictationResult } from "@/types/clinical";

const MAX_SECONDS = 300; // 5 minutes

interface VoiceRecorderProps {
  leadId:    string;
  endpoint?: string;
  onResult:  (result: Record<string, string>) => void;
  onError:   (message: string) => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

export function VoiceRecorder({ leadId, endpoint = "/api/clinical/dictate", onResult, onError }: VoiceRecorderProps) {
  const [status,   setStatus]   = useState<RecorderStatus>("idle");
  const [seconds,  setSeconds]  = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopTimer = () => {
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await sendAudio(blob, mimeType);
      };

      recorder.start(250); // collect chunks every 250ms
      setStatus("recording");
      setSeconds(0);

      // Timer
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setStatus("error");
      setErrorMsg("No se pudo acceder al micrófono. Verifica los permisos del navegador.");
      onError("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = useCallback(() => {
    stopTimer();
    mediaRecorderRef.current?.stop();
    setStatus("processing");
  }, []);

  const sendAudio = async (blob: Blob, mimeType: string) => {
    try {
      const form = new FormData();
      form.append("audio",  new File([blob], "dictado.webm", { type: mimeType }));
      form.append("leadId", leadId);

      const res = await fetch(endpoint, { method: "POST", body: form });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error ?? "Error al procesar el dictado");
      }

      setStatus("done");
      onResult(json.data as DictationResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al enviar el audio";
      setStatus("error");
      setErrorMsg(msg);
      onError(msg);
    }
  };

  const reset = () => {
    setStatus("idle");
    setSeconds(0);
    setErrorMsg("");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Main button */}
      <div className="relative flex items-center justify-center">
        {/* Pulse ring when recording */}
        {status === "recording" && (
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
        )}

        {status === "idle" && (
          <button
            type="button"
            onClick={startRecording}
            aria-label="Iniciar dictado"
            className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors"
          >
            <Mic className="w-7 h-7" />
          </button>
        )}

        {status === "recording" && (
          <button
            type="button"
            onClick={stopRecording}
            aria-label="Detener dictado"
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors relative z-10"
          >
            <Square className="w-7 h-7 fill-white" />
          </button>
        )}

        {status === "processing" && (
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {status === "done" && (
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
        )}

        {status === "error" && (
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="text-center">
        {status === "idle" && (
          <p className="text-sm text-gray-500">Presiona para dictar</p>
        )}

        {status === "recording" && (
          <>
            <p className={cn("font-mono text-lg font-semibold", seconds >= MAX_SECONDS - 30 ? "text-red-600" : "text-red-500")}>
              {formatTime(seconds)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Dictando... habla con naturalidad</p>
          </>
        )}

        {status === "processing" && (
          <>
            <p className="text-sm font-medium text-indigo-600">Procesando con IA...</p>
            <div className="mt-2 w-40 h-1 bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full animate-pulse w-2/3" />
            </div>
          </>
        )}

        {status === "done" && (
          <>
            <p className="text-sm font-medium text-emerald-600">¡Formulario completado!</p>
            <p className="text-xs text-gray-400 mt-0.5">Revisa los campos antes de guardar</p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 text-xs text-indigo-600 hover:underline"
            >
              Dictar de nuevo
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <p className="text-sm text-red-600 max-w-[220px] text-center">{errorMsg}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 text-xs text-indigo-600 hover:underline"
            >
              Reintentar
            </button>
          </>
        )}
      </div>

      {/* Privacy note */}
      <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
        <Lock className="w-3 h-3" />
        El audio se procesa y elimina inmediatamente. No se almacena.
      </p>
    </div>
  );
}
