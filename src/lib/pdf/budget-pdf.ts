// Generación de PDF client-side con jsPDF + jspdf-autotable.
// Solo importar desde componentes "use client" (dynamic import recomendado).

export type BudgetForPDF = {
  number:     number
  createdAt:  Date | string
  validUntil: Date | string | null
  status:     string
  notes:      string | null
  discountPct: number
  subtotal:   number
  total:      number
  doctor:     { name: string } | null
  items: {
    description: string
    quantity:    number
    unitPrice:   number
    discount:    number
    total:       number
  }[]
}

export type ClinicForPDF = {
  name:    string
  logoUrl: string | null
  phone:   string | null
  address: string | null
  city:    string | null
}

export type LeadForPDF = {
  fullName: string
  phone:    string
  email:    string | null
}

export async function generateBudgetPDF(
  budget:  BudgetForPDF,
  clinic:  ClinicForPDF,
  lead:    LeadForPDF
): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = margin

  const fmtCurrency = (v: number) =>
    v.toLocaleString("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 })

  const fmtDate = (d: Date | string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" })
  }

  // ── LOGO ─────────────────────────────────────────────────────
  if (clinic.logoUrl) {
    try {
      const res = await fetch(clinic.logoUrl)
      const blob = await res.blob()
      const reader = new FileReader()
      const b64: string = await new Promise((resolve, reject) => {
        reader.onload  = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      const fmt = b64.startsWith("data:image/png") ? "PNG" : "JPEG"
      doc.addImage(b64, fmt, margin, y, 30, 15, undefined, "FAST")
    } catch {
      // Si el logo no carga, continúa sin él
    }
  }

  // ── NOMBRE DE LA CLÍNICA ──────────────────────────────────────
  doc.setFontSize(18).setFont("helvetica", "bold")
  doc.setTextColor(30, 30, 30)
  doc.text(clinic.name, clinic.logoUrl ? margin + 34 : margin, y + 8)

  doc.setFontSize(9).setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  const clinicLines = [
    clinic.address && clinic.city ? `${clinic.address}, ${clinic.city}` : clinic.address ?? clinic.city,
    clinic.phone,
  ].filter(Boolean) as string[]
  clinicLines.forEach((line, i) => {
    doc.text(line, clinic.logoUrl ? margin + 34 : margin, y + 14 + i * 4)
  })
  y += 24

  // ── SEPARADOR ────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // ── ENCABEZADO PRESUPUESTO ───────────────────────────────────
  doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(30, 30, 30)
  doc.text(`PRESUPUESTO #${String(budget.number).padStart(3, "0")}`, margin, y)

  const statusColors: Record<string, [number, number, number]> = {
    BORRADOR:  [107, 114, 128],
    ENVIADO:   [59, 130, 246],
    ACEPTADO:  [16, 185, 129],
    RECHAZADO: [239, 68, 68],
    VENCIDO:   [245, 158, 11],
  }
  const [r, g, b] = statusColors[budget.status] ?? [107, 114, 128]
  doc.setFillColor(r, g, b)
  doc.roundedRect(pageW - margin - 28, y - 6, 28, 8, 2, 2, "F")
  doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(255, 255, 255)
  const statusLabel: Record<string, string> = { BORRADOR: "Borrador", ENVIADO: "Enviado", ACEPTADO: "Aceptado", RECHAZADO: "Rechazado", VENCIDO: "Vencido" }
  doc.text(statusLabel[budget.status] ?? budget.status, pageW - margin - 14, y - 1, { align: "center" })
  y += 10

  // ── DATOS ────────────────────────────────────────────────────
  doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(60, 60, 60)
  const col1 = margin
  const col2 = pageW / 2 + 5

  const infoLeft = [
    ["Paciente", lead.fullName],
    ["Teléfono", lead.phone],
    ...(lead.email ? [["Email", lead.email]] : []),
    ["Atendido por", budget.doctor?.name ?? "—"],
  ]
  const infoRight = [
    ["Fecha emisión", fmtDate(budget.createdAt)],
    ["Válido hasta", fmtDate(budget.validUntil)],
  ]

  infoLeft.forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold")
    doc.text(`${label}:`, col1, y + i * 5)
    doc.setFont("helvetica", "normal")
    doc.text(value, col1 + 28, y + i * 5)
  })
  infoRight.forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold")
    doc.text(`${label}:`, col2, y + i * 5)
    doc.setFont("helvetica", "normal")
    doc.text(value, col2 + 26, y + i * 5)
  })
  y += Math.max(infoLeft.length, infoRight.length) * 5 + 6

  // ── TABLA DE ÍTEMS ───────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head:   [["Descripción", "Cant.", "P. Unitario", "Dto. %", "Total"]],
    body:   budget.items.map(it => [
      it.description,
      String(it.quantity),
      fmtCurrency(it.unitPrice),
      it.discount > 0 ? `${it.discount}%` : "—",
      fmtCurrency(it.total),
    ]),
    styles:      { fontSize: 9, cellPadding: 3 },
    headStyles:  { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 28, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [248, 248, 255] },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // ── RESUMEN ───────────────────────────────────────────────────
  const summaryX = pageW - margin - 60
  doc.setFontSize(9).setTextColor(60, 60, 60)
  doc.setFont("helvetica", "normal")
  doc.text("Subtotal:", summaryX, y)
  doc.text(fmtCurrency(budget.subtotal), pageW - margin, y, { align: "right" })
  y += 5

  if (budget.discountPct > 0) {
    doc.text(`Descuento (${budget.discountPct}%):`, summaryX, y)
    doc.text(`- ${fmtCurrency(budget.subtotal * budget.discountPct / 100)}`, pageW - margin, y, { align: "right" })
    y += 5
  }

  doc.setDrawColor(200, 200, 200)
  doc.line(summaryX, y, pageW - margin, y)
  y += 4

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(30, 30, 30)
  doc.text("TOTAL:", summaryX, y)
  doc.text(fmtCurrency(budget.total), pageW - margin, y, { align: "right" })
  y += 10

  // ── NOTAS ─────────────────────────────────────────────────────
  if (budget.notes) {
    doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(60, 60, 60)
    doc.text("Notas:", margin, y)
    y += 4
    doc.setFont("helvetica", "normal")
    const noteLines = doc.splitTextToSize(budget.notes, pageW - margin * 2)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 4 + 4
  }

  // ── PIE ───────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(7).setFont("helvetica", "normal").setTextColor(150, 150, 150)
  doc.text(
    `Presupuesto válido hasta ${fmtDate(budget.validUntil)} · Generado por Hermes CRM`,
    pageW / 2, pageH - 8, { align: "center" }
  )

  doc.save(`Presupuesto-${String(budget.number).padStart(3, "0")}-${lead.fullName.replace(/\s+/g, "_")}.pdf`)
}

// Variante que devuelve el doc sin guardarlo (para enviar por WhatsApp)
export async function generateBudgetPDFDoc(
  budget:  BudgetForPDF,
  clinic:  ClinicForPDF,
  lead:    LeadForPDF
): Promise<import("jspdf").jsPDF> {
  const { jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = margin

  const fmtCurrency = (v: number) =>
    v.toLocaleString("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
  const fmtDate = (d: Date | string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" })
  }

  if (clinic.logoUrl) {
    try {
      const res = await fetch(clinic.logoUrl)
      const blob = await res.blob()
      const reader = new FileReader()
      const b64: string = await new Promise((resolve, reject) => {
        reader.onload  = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      const fmt = b64.startsWith("data:image/png") ? "PNG" : "JPEG"
      doc.addImage(b64, fmt, margin, y, 30, 15, undefined, "FAST")
    } catch { /* skip logo */ }
  }

  doc.setFontSize(18).setFont("helvetica", "bold").setTextColor(30, 30, 30)
  doc.text(clinic.name, clinic.logoUrl ? margin + 34 : margin, y + 8)
  doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(100, 100, 100)
  const clinicLines = [
    clinic.address && clinic.city ? `${clinic.address}, ${clinic.city}` : clinic.address ?? clinic.city,
    clinic.phone,
  ].filter(Boolean) as string[]
  clinicLines.forEach((line, i) => { doc.text(line, clinic.logoUrl ? margin + 34 : margin, y + 14 + i * 4) })
  y += 24

  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(30, 30, 30)
  doc.text(`PRESUPUESTO #${String(budget.number).padStart(3, "0")}`, margin, y)
  y += 10

  doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(60, 60, 60)
  const infoLeft = [
    ["Paciente", lead.fullName],
    ["Teléfono", lead.phone],
    ...(lead.email ? [["Email", lead.email]] : []),
    ["Atendido por", budget.doctor?.name ?? "—"],
  ]
  const infoRight = [["Fecha emisión", fmtDate(budget.createdAt)], ["Válido hasta", fmtDate(budget.validUntil)]]
  const col1 = margin, col2 = pageW / 2 + 5
  infoLeft.forEach(([label, value], i) => { doc.setFont("helvetica", "bold"); doc.text(`${label}:`, col1, y + i * 5); doc.setFont("helvetica", "normal"); doc.text(value, col1 + 28, y + i * 5) })
  infoRight.forEach(([label, value], i) => { doc.setFont("helvetica", "bold"); doc.text(`${label}:`, col2, y + i * 5); doc.setFont("helvetica", "normal"); doc.text(value, col2 + 26, y + i * 5) })
  y += Math.max(infoLeft.length, infoRight.length) * 5 + 6

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head:   [["Descripción", "Cant.", "P. Unitario", "Dto. %", "Total"]],
    body:   budget.items.map(it => [it.description, String(it.quantity), fmtCurrency(it.unitPrice), it.discount > 0 ? `${it.discount}%` : "—", fmtCurrency(it.total)]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 15, halign: "center" }, 2: { cellWidth: 28, halign: "right" }, 3: { cellWidth: 18, halign: "center" }, 4: { cellWidth: 28, halign: "right", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [248, 248, 255] },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  const summaryX = pageW - margin - 60
  doc.setFontSize(9).setTextColor(60, 60, 60).setFont("helvetica", "normal")
  doc.text("Subtotal:", summaryX, y); doc.text(fmtCurrency(budget.subtotal), pageW - margin, y, { align: "right" }); y += 5
  if (budget.discountPct > 0) { doc.text(`Descuento (${budget.discountPct}%):`, summaryX, y); doc.text(`- ${fmtCurrency(budget.subtotal * budget.discountPct / 100)}`, pageW - margin, y, { align: "right" }); y += 5 }
  doc.setDrawColor(200, 200, 200); doc.line(summaryX, y, pageW - margin, y); y += 4
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(30, 30, 30)
  doc.text("TOTAL:", summaryX, y); doc.text(fmtCurrency(budget.total), pageW - margin, y, { align: "right" }); y += 10

  if (budget.notes) {
    doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(60, 60, 60); doc.text("Notas:", margin, y); y += 4
    doc.setFont("helvetica", "normal")
    const noteLines = doc.splitTextToSize(budget.notes, pageW - margin * 2)
    doc.text(noteLines, margin, y)
  }

  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(7).setFont("helvetica", "normal").setTextColor(150, 150, 150)
  doc.text(`Presupuesto válido hasta ${fmtDate(budget.validUntil)} · Generado por Hermes CRM`, pageW / 2, pageH - 8, { align: "center" })

  return doc
}
