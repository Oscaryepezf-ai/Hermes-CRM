import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { transcribeAudio, callAIJson } from "@/lib/ai/client";
import type { VisitDictationResult } from "@/types/clinical";

const MAX_BYTES = Number(process.env.MAX_AUDIO_SIZE_BYTES ?? 26_214_400);

const VISIT_PROMPT = `Actúas como asistente de transcripción clínica dental especializado en consultas odontológicas.
Tu función es estructurar el dictado libre de un odontólogo sobre lo ocurrido en una consulta.

Devuelve ÚNICAMENTE este JSON sin texto adicional:
{
  "procedures":   "...",
  "findings":     "...",
  "medications":  "...",
  "instructions": "...",
  "followUp":     "...",
  "notes":        ""
}

Definición de cada campo:
- procedures:   Procedimientos realizados durante esta consulta (extracciones, obturaciones, limpiezas, etc.)
- findings:     Hallazgos clínicos y diagnósticos observados
- medications:  Medicamentos prescritos, dosis e indicaciones farmacológicas
- instructions: Indicaciones dadas al paciente (cuidados, restricciones, higiene)
- followUp:     Próxima cita, controles necesarios, seguimiento sugerido
- notes:        Notas adicionales o internas que no encajan en los campos anteriores

REGLAS:
- Nunca inventes información que el doctor no mencionó
- Si no se menciona un campo, déjalo como string vacío ""
- Mantén términos técnicos odontológicos exactos`

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

    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { clinicId: true } });
    if (!lead || lead.clinicId !== clinicId) {
      return NextResponse.json({ success: false, error: "Lead no encontrado" }, { status: 403 });
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    const mimeType    = audio.type as 'audio/webm' | 'audio/mp3' | 'audio/wav' | 'audio/m4a';

    const transcription = await transcribeAudio({
      clinicId,
      audioBuffer,
      mimeType,
      language: "es",
      prompt:   "Consulta dental, procedimiento, extracción, obturación, medicamento, antibiótico, indicaciones",
    });

    if (!transcription.success) {
      return NextResponse.json({ success: false, error: transcription.error }, { status: 500 });
    }

    const structured = await callAIJson<VisitDictationResult>({
      agentKey:     "DR_CLINIC_STRUCTURER",
      clinicId,
      systemPrompt: VISIT_PROMPT,
      userPrompt:   `Dictado del odontólogo:\n\n"${transcription.data}"`,
    });

    if (!structured.success) {
      return NextResponse.json({ success: false, error: structured.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: structured.data });
  } catch (error) {
    console.error("[dictate-visit] error:", error);
    return NextResponse.json({ success: false, error: "Error inesperado al procesar el dictado" }, { status: 500 });
  }
}
