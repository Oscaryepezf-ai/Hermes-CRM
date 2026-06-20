import { formatCurrency } from "@/lib/utils"

const METHOD_LABELS: Record<string, string> = { EFECTIVO: "Efectivo", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", OTRO: "Otro" }
const RECEIPT_LABELS: Record<string, string> = { RECIBO: "Recibo", FACTURA: "Factura" }

type CompletedRow = {
  id: string; paciente: string; medioDePago: string; comprobante: string
  servicio: string; totalPagado: number; descuento1: number; descuento2: number
  comision: number; comentario: string
}
type PendingRow = { id: string; paciente: string; servicio: string; totalPagado: number; pendiente: number }

export function CompletedServicesTable({
  completed, pending,
}: {
  completed: { rows: CompletedRow[]; totalRecaudado: number; totalComision: number; cantidad: number }
  pending: { rows: PendingRow[]; cantidad: number }
}) {
  return (
    <div className="space-y-6">
      <p className="text-[12px] text-ink-tertiary bg-inset rounded-[8px] px-3 py-2">
        Estos reportes se basan en los pagos y presupuestos registrados.
      </p>

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold text-ink-primary">Servicios terminados (cobrados)</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total recaudado" value={formatCurrency(completed.totalRecaudado)} />
          <Stat label="Comisión" value={formatCurrency(completed.totalComision)} />
          <Stat label="N° de servicios" value={String(completed.cantidad)} />
        </div>

        <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
          <div className="grid grid-cols-[1.4fr_0.9fr_0.9fr_1.2fr_0.9fr_0.7fr_0.7fr_0.8fr_1.2fr] px-4 py-2.5 border-b border-line-subtle bg-inset">
            {["Paciente", "Medio de pago", "Comprobante", "Servicio", "Total pagado", "Desc. 1", "Desc. 2", "Comisión", "Comentario"].map((h) => (
              <p key={h} className="text-[10.5px] font-medium text-ink-tertiary uppercase tracking-[0.03em] truncate">{h}</p>
            ))}
          </div>
          {completed.rows.length === 0 ? (
            <EmptyRow />
          ) : (
            completed.rows.map((r, i) => (
              <div key={r.id} className={`grid grid-cols-[1.4fr_0.9fr_0.9fr_1.2fr_0.9fr_0.7fr_0.7fr_0.8fr_1.2fr] px-4 py-2.5 items-center text-[12px] ${i < completed.rows.length - 1 ? "border-b border-line-subtle" : ""}`}>
                <span className="truncate text-ink-primary font-medium">{r.paciente}</span>
                <span className="text-ink-secondary">{METHOD_LABELS[r.medioDePago] ?? r.medioDePago}</span>
                <span className="text-ink-secondary">{RECEIPT_LABELS[r.comprobante] ?? r.comprobante}</span>
                <span className="truncate text-ink-secondary">{r.servicio}</span>
                <span className="font-medium text-ink-primary tabular-nums">{formatCurrency(r.totalPagado)}</span>
                <span className="text-ink-tertiary tabular-nums">{r.descuento1 ? formatCurrency(r.descuento1) : "—"}</span>
                <span className="text-ink-tertiary tabular-nums">{r.descuento2 ? formatCurrency(r.descuento2) : "—"}</span>
                <span className="text-ink-tertiary tabular-nums">{r.comision ? formatCurrency(r.comision) : "—"}</span>
                <span className="truncate text-ink-tertiary">{r.comentario || "—"}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold text-ink-primary">Servicios por terminar (pendientes de cobro)</h2>
        <div className="bg-surface border border-line-subtle rounded-[12px] overflow-hidden shadow-card">
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] px-4 py-2.5 border-b border-line-subtle bg-inset">
            {["Paciente", "Servicio", "Total pagado", "Pendiente"].map((h) => (
              <p key={h} className="text-[10.5px] font-medium text-ink-tertiary uppercase tracking-[0.03em]">{h}</p>
            ))}
          </div>
          {pending.rows.length === 0 ? (
            <EmptyRow />
          ) : (
            pending.rows.map((r, i) => (
              <div key={r.id} className={`grid grid-cols-[2fr_1.5fr_1fr_1fr] px-4 py-2.5 items-center text-[12px] ${i < pending.rows.length - 1 ? "border-b border-line-subtle" : ""}`}>
                <span className="truncate text-ink-primary font-medium">{r.paciente}</span>
                <span className="truncate text-ink-secondary">{r.servicio}</span>
                <span className="text-ink-secondary tabular-nums">{formatCurrency(r.totalPagado)}</span>
                <span className="font-medium text-amber-600 tabular-nums">{formatCurrency(r.pendiente)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-line-subtle rounded-[12px] p-4 shadow-card">
      <p className="text-[11px] text-ink-tertiary">{label}</p>
      <p className="text-[20px] font-bold text-ink-primary tabular-nums mt-1">{value}</p>
    </div>
  )
}

function EmptyRow() {
  return <div className="px-4 py-8 text-center text-[12px] text-ink-disabled">No se encontró ninguna información</div>
}
