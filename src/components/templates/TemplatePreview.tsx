"use client"

import { Image as ImageIcon, FileText, Video } from "lucide-react"
import type { WaHeaderType } from "@prisma/client"
import type { TemplateButton } from "@/lib/actions/wa-templates"

interface Props {
  headerType?:   WaHeaderType | null
  headerText?:   string
  body:          string
  bodyExamples?: string[]
  footer?:       string
  buttons?:      TemplateButton[]
}

// Reemplaza {{N}} con el ejemplo correspondiente
function renderBody(body: string, examples: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const val = examples[Number(n) - 1]
    return val ? `[${val}]` : `{{${n}}}`
  })
}

export function TemplatePreview({ headerType, headerText, body, bodyExamples = [], footer, buttons = [] }: Props) {
  const previewBody = renderBody(body, bodyExamples)

  return (
    <div className="flex flex-col items-center">
      {/* Phone frame */}
      <div
        className="w-[280px] rounded-[32px] border-4 border-gray-800 bg-gray-800 shadow-2xl overflow-hidden"
        style={{ minHeight: 480 }}
      >
        {/* Status bar */}
        <div className="bg-gray-800 flex items-center justify-between px-5 py-2">
          <span className="text-white text-[10px] font-medium">9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="w-3 h-1.5 rounded-sm bg-white opacity-80" />
            <div className="w-1 h-1 rounded-full bg-white opacity-80" />
          </div>
        </div>

        {/* WhatsApp header */}
        <div className="bg-[#128C7E] px-3 py-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/30" />
          <div>
            <p className="text-white text-[11px] font-semibold">Clínica Dental</p>
            <p className="text-white/70 text-[9px]">en línea</p>
          </div>
        </div>

        {/* Chat area */}
        <div
          className="flex-1 px-2 py-3 overflow-y-auto"
          style={{
            background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23DCF8C6' width='400' height='400'/%3E%3C/svg%3E\")",
            backgroundColor: "#ECE5DD",
            minHeight: 340,
          }}
        >
          {/* Message bubble */}
          <div className="max-w-[85%] ml-auto">
            <div className="bg-[#DCF8C6] rounded-[12px] rounded-tr-none overflow-hidden shadow-sm">

              {/* Header */}
              {headerType === "TEXT" && headerText && (
                <div className="px-2.5 pt-2 pb-0">
                  <p className="text-[11px] font-bold text-gray-800">{headerText}</p>
                </div>
              )}
              {headerType === "IMAGE" && (
                <div className="w-full h-24 bg-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
              {headerType === "VIDEO" && (
                <div className="w-full h-24 bg-gray-700 flex items-center justify-center">
                  <Video className="w-6 h-6 text-gray-300" />
                </div>
              )}
              {headerType === "DOCUMENT" && (
                <div className="w-full h-16 bg-gray-100 flex items-center gap-2 px-3">
                  <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <span className="text-[10px] text-gray-600">documento.pdf</span>
                </div>
              )}

              {/* Body */}
              <div className="px-2.5 py-2">
                {previewBody ? (
                  <p className="text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {previewBody}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">Escribe el cuerpo del mensaje…</p>
                )}
              </div>

              {/* Footer */}
              {footer && (
                <div className="px-2.5 pb-1.5">
                  <p className="text-[9px] text-gray-500">{footer}</p>
                </div>
              )}

              {/* Timestamp */}
              <div className="px-2.5 pb-1.5 flex justify-end">
                <span className="text-[9px] text-gray-400">9:41 ✓✓</span>
              </div>
            </div>

            {/* Buttons */}
            {buttons.length > 0 && (
              <div className="mt-1 space-y-1">
                {buttons.map((btn, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-[8px] shadow-sm text-center py-1.5 px-2"
                  >
                    <span className="text-[11px] font-medium text-[#128C7E]">
                      {btn.text || `Botón ${i + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-ink-disabled mt-3">Vista previa aproximada</p>
    </div>
  )
}
