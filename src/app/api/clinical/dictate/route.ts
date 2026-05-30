import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import type { DictationResult } from "@/types/clinical";

const MAX_BYTES = Number(process.env.MAX_AUDIO_SIZE_BYTES ?? 26_214_400);

function isKeyConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !!key && key !== "sk-placeholder" && key.startsWith("sk-");
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  // 2. Pre-flight: check API key is configured
  if (!isKeyConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "API key de OpenAI no configurada. Agrega OPENAI_API_KEY en el archivo .env y reinicia el servidor.",
      },
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const form   = await req.formData();
    const audio  = form.get("audio")  as File | null;
    const leadId = form.get("leadId") as string | null;

    if (!audio || !leadId) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos: audio, leadId" },
        { status: 400 }
      );
    }

    if (!audio.type.startsWith("audio/")) {
      return NextResponse.json(
        { success: false, error: "El archivo debe ser de tipo audio" },
        { status: 400 }
      );
    }

    if (audio.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: "El audio supera el límite de 25 MB" },
        { status: 413 }
      );
    }

    // 3. Verify lead belongs to clinic
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { clinicId: true },
    });
    if (!lead || lead.clinicId !== session.user.clinicId) {
      return NextResponse.json({ success: false, error: "Lead no encontrado" }, { status: 403 });
    }

    // 4. Transcribe with Whisper
    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    const audioFile   = new File([audioBuffer], "dictado.webm", { type: audio.type });

    let rawText: string;
    try {
      const transcription = await openai.audio.transcriptions.create({
        file:     audioFile,
        model:    "whisper-1",
        language: "es",
        prompt:   "Odontología, historia clínica dental, tratamiento, diagnóstico, alergias",
      });
      rawText = transcription.text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("401") || msg.includes("Incorrect API key") || msg.includes("authentication")) {
        return NextResponse.json(
          { success: false, error: "API key de OpenAI inválida. Verifica la clave en tu archivo .env" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { success: false, error: "Error al transcribir el audio. Intenta de nuevo." },
        { status: 500 }
      );
    }

    // 5. Structure with GPT-4o-mini
    let structured: DictationResult;
    try {
      const completion = await openai.chat.completions.create({
        model:           "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature:     0.1,
        max_tokens:      1500,
        messages: [
          {
            role: "system",
            content: `Actúas como un asistente médico de transcripción dental especializado.
Tu única función es tomar el dictado libre de un odontólogo y estructurarlo
en un objeto JSON con exactamente estos campos:

{
  "reasonForConsult":  "...",
  "medicalHistory":    "...",
  "dentalHistory":     "...",
  "odontogramNotes":   "...",
  "proposedTreatment": "...",
  "observations":      "..."
}

REGLAS ESTRICTAS:
- Nunca inventes información que el doctor no mencionó
- Si el doctor no menciona información para un campo, déjalo como string vacío ""
- Conserva términos técnicos odontológicos exactamente como los dijo el doctor
- El output debe ser SOLO el JSON, sin texto adicional, sin markdown`,
          },
          {
            role:    "user",
            content: `Dictado del odontólogo:\n\n"${rawText}"`,
          },
        ],
      });

      structured = JSON.parse(
        completion.choices[0].message.content ?? "{}"
      ) as DictationResult;
    } catch {
      return NextResponse.json(
        { success: false, error: "Error al estructurar el dictado. Intenta de nuevo." },
        { status: 500 }
      );
    }

    console.log(`[dictate] leadId=${leadId} clinicId=${session.user.clinicId} ts=${new Date().toISOString()}`);

    return NextResponse.json({ success: true, data: structured });
  } catch (error) {
    console.error("[dictate] unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Error inesperado al procesar el dictado" },
      { status: 500 }
    );
  }
}
