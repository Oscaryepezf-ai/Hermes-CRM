import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { transcribeAudio, callAIJson } from "@/lib/ai/client";
import type { DictationResult } from "@/types/clinical";

const MAX_BYTES = Number(process.env.MAX_AUDIO_SIZE_BYTES ?? 26_214_400);

const STRUCTURER_PROMPT = `Actúas como un asistente médico de transcripción dental especializado.
Tu única función es tomar el dictado libre de un odontólogo y estructurarlo en JSON:

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
- Si no se menciona un campo, déjalo como string vacío ""
- Conserva términos técnicos odontológicos exactamente como los dijo el doctor
- El output debe ser SOLO el JSON, sin texto adicional, sin markdown`

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const clinicId = session.user.clinicId;

  try {
    const form   = await req.formData();
    const audio  = form.get("audio")  as File | null;
    const leadId = form.get("leadId") as string | null;

    if (!audio || !leadId) {
      return NextResponse.json({ success: false, error: "Faltan campos: audio, leadId" }, { status: 400 });
    }
    if (!audio.type.startsWith("audio/")) {
      return NextResponse.json({ success: false, error: "El archivo debe ser tipo audio" }, { status: 400 });
    }
    if (audio.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: "El audio supera el límite de 25 MB" }, { status: 413 });
    }

    // Verify lead belongs to this clinic
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { clinicId: true } });
    if (!lead || lead.clinicId !== clinicId) {
      return NextResponse.json({ success: false, error: "Lead no encontrado" }, { status: 403 });
    }

    // 1. Transcribe with Whisper via centralized client
    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    const mimeType    = audio.type as 'audio/webm' | 'audio/mp3' | 'audio/wav' | 'audio/m4a'

    const transcriptionResult = await transcribeAudio({
      clinicId,
      audioBuffer,
      mimeType,
      language: "es",
      prompt:   "Odontología, historia clínica dental, tratamiento, diagnóstico, alergias",
    })

    if (!transcriptionResult.success) {
      return NextResponse.json({ success: false, error: transcriptionResult.error }, { status: 500 });
    }

    const rawText = transcriptionResult.data;

    // 2. Structure with GPT-4o-mini via centralized client
    const structureResult = await callAIJson<DictationResult>({
      agentKey:     "DR_CLINIC_STRUCTURER",
      clinicId,
      systemPrompt: STRUCTURER_PROMPT,
      userPrompt:   `Dictado del odontólogo:\n\n"${rawText}"`,
    })

    if (!structureResult.success) {
      return NextResponse.json({ success: false, error: structureResult.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: structureResult.data });

  } catch (error) {
    console.error("[dictate] unexpected error:", error);
    return NextResponse.json({ success: false, error: "Error inesperado al procesar el dictado" }, { status: 500 });
  }
}
