"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Search, Filter, AlertCircle, Users, Mic, ExternalLink } from "lucide-react"
import { DictationDialog } from "./DictationDialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { LeadWithAssignee, LeadStatus, MarketingChannel } from "@/types/leads"
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  TREATMENT_LABELS,
  CHANNEL_LABELS,
  CHANNEL_ICONS,
} from "@/types/leads"

interface LeadsTableProps {
  leads: LeadWithAssignee[]
}

export function LeadsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function LeadsTableError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

export function LeadsTableEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <Users className="mb-4 h-12 w-12 opacity-30" />
      <p className="text-sm font-medium">No hay leads aún</p>
      <p className="text-xs">Crea tu primer lead con el botón "Nuevo Lead"</p>
    </div>
  )
}

const STATUS_OPTIONS: { value: LeadStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos los estados" },
  { value: "NUEVO", label: "Nuevo" },
  { value: "CONTACTADO", label: "Contactado" },
  { value: "CITA_AGENDADA", label: "Cita agendada" },
  { value: "PRESUPUESTO_ENVIADO", label: "Presupuesto enviado" },
  { value: "CONVERTIDO", label: "Convertido" },
  { value: "PERDIDO", label: "Perdido" },
]

const CHANNEL_OPTIONS: { value: MarketingChannel | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos los canales" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "GOOGLE", label: "Google" },
  { value: "REFERIDO", label: "Referido" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "OTRO", label: "Otro" },
]

export function LeadsTable({ leads }: LeadsTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">("ALL")
  const [channelFilter, setChannelFilter] = useState<MarketingChannel | "ALL">("ALL")
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [showDictation, setShowDictation] = useState(false)

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null

  const handleRowClick = (id: string) => {
    setSelectedLeadId((prev) => (prev === id ? null : id))
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return leads.filter((lead) => {
      const matchesSearch =
        !q ||
        lead.fullName.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        (lead.email?.toLowerCase().includes(q) ?? false)
      const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter
      const matchesChannel = channelFilter === "ALL" || lead.channel === channelFilter
      return matchesSearch && matchesStatus && matchesChannel
    })
  }, [leads, search, statusFilter, channelFilter])

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter((v ?? "ALL") as LeadStatus | "ALL")}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={channelFilter}
              onValueChange={(v) =>
                setChannelFilter((v ?? "ALL") as MarketingChannel | "ALL")
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count + selection action bar */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filtered.length} de {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </p>

          {selectedLead && (
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
              <span className="text-sm font-medium text-indigo-800 truncate max-w-[180px]">
                {selectedLead.fullName}
              </span>
              <button
                onClick={() => setShowDictation(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <Mic className="w-3.5 h-3.5" />
                Diagnóstico dictado
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Search className="mb-3 h-8 w-8 opacity-30" />
            <p className="text-sm">Sin resultados para tu búsqueda</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="hidden md:table-cell">Tratamiento</TableHead>
                  <TableHead className="hidden md:table-cell">Canal</TableHead>
                  <TableHead>Asignado</TableHead>
                  <TableHead>Último contacto</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => {
                  const ChannelIcon = CHANNEL_ICONS[lead.channel]
                  const initials = lead.fullName
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()

                  return (
                    <TableRow
                      key={lead.id}
                      onClick={() => handleRowClick(lead.id)}
                      className={
                        selectedLeadId === lead.id
                          ? "bg-indigo-50 border-l-2 border-indigo-400 cursor-pointer"
                          : "hover:bg-muted/50 cursor-pointer"
                      }
                    >
                      {/* Paciente */}
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.fullName}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone}</p>
                        </div>
                      </TableCell>

                      {/* Etapa */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LEAD_STATUS_COLORS[lead.status]}`}
                        >
                          {LEAD_STATUS_LABELS[lead.status]}
                        </span>
                      </TableCell>

                      {/* Tratamiento */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {TREATMENT_LABELS[lead.treatment]}
                        </span>
                      </TableCell>

                      {/* Canal */}
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <ChannelIcon className="h-3.5 w-3.5" />
                          {CHANNEL_LABELS[lead.channel]}
                        </div>
                      </TableCell>

                      {/* Asignado */}
                      <TableCell>
                        {lead.assignedTo ? (
                          <Tooltip>
                            <TooltipTrigger render={<span className="inline-flex cursor-default" />}>
                              <Avatar className="h-7 w-7">
                                {lead.assignedTo.avatarUrl && (
                                  <AvatarImage src={lead.assignedTo.avatarUrl} />
                                )}
                                <AvatarFallback className="text-xs">
                                  {lead.assignedTo.name
                                    .split(" ")
                                    .slice(0, 2)
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>{lead.assignedTo.name}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Último contacto */}
                      <TableCell>
                        {lead.lastContactAt ? (
                          <Tooltip>
                            <TooltipTrigger render={<span className="cursor-default text-sm text-muted-foreground" />}>
                              {formatDistanceToNow(new Date(lead.lastContactAt), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(lead.lastContactAt), "d MMM yyyy, HH:mm", {
                                locale: es,
                              })}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin contacto</span>
                        )}
                      </TableCell>

                      {/* Abrir ficha 360 */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Link
                                href={`/patients/${lead.id}`}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-muted transition-colors"
                              />
                            }
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>Abrir ficha 360</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dictation dialog */}
      {showDictation && selectedLead && (
        <DictationDialog
          leadId={selectedLead.id}
          leadName={selectedLead.fullName}
          onClose={() => setShowDictation(false)}
        />
      )}
    </TooltipProvider>
  )
}
