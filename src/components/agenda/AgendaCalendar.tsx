"use client"

import { useCallback, useRef, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import type { DateSelectArg, EventClickArg, EventInput, EventContentArg } from "@fullcalendar/core"
import esLocale from "@fullcalendar/core/locales/es"
import { getCalendarEvents } from "@/lib/actions/agenda"
import type { CalendarEvent } from "@/lib/actions/agenda"
import { AppointmentModal } from "./AppointmentModal"

type ModalState =
  | { mode: "create"; start: string; end: string }
  | { mode: "view"; event: CalendarEvent }
  | null

export function AgendaCalendar() {
  const calendarRef = useRef<FullCalendar>(null)
  const [modal, setModal] = useState<ModalState>(null)

  const fetchEvents = useCallback(
    async (
      fetchInfo: { startStr: string; endStr: string },
      successCallback: (events: EventInput[]) => void,
      failureCallback: (error: Error) => void
    ) => {
      const result = await getCalendarEvents({
        start: fetchInfo.startStr,
        end: fetchInfo.endStr,
      })
      if (result.success && result.data) {
        successCallback(result.data as EventInput[])
      } else {
        failureCallback(new Error(result.error ?? "Error al cargar eventos"))
      }
    },
    []
  )

  const handleSelect = (selectInfo: DateSelectArg) => {
    setModal({ mode: "create", start: selectInfo.startStr, end: selectInfo.endStr })
  }

  const handleEventClick = (clickInfo: EventClickArg) => {
    const raw = clickInfo.event
    const event: CalendarEvent = {
      id: raw.id,
      title: raw.title,
      start: raw.startStr,
      end: raw.endStr,
      backgroundColor: raw.backgroundColor,
      borderColor: raw.borderColor,
      textColor: raw.textColor,
      extendedProps: raw.extendedProps as CalendarEvent["extendedProps"],
    }
    setModal({ mode: "view", event })
  }

  const handleModalClose = () => {
    setModal(null)
  }

  // Shows the just-created appointment immediately, without waiting on a
  // full refetchEvents() round-trip to the server.
  const handleAppointmentCreated = (event: CalendarEvent) => {
    calendarRef.current?.getApi().addEvent(event)
    setModal(null)
  }

  const handleStatusChanged = (id: string, status: string) => {
    calendarRef.current?.getApi().getEventById(id)?.setExtendedProp("status", status)
  }

  const eventClassNames = (arg: EventContentArg) => {
    const base = ["rounded-md", "text-xs", "font-medium", "cursor-pointer"]
    const status = arg.event.extendedProps.status as string
    if (status === "CANCELLED") return [...base, "opacity-50", "line-through"]
    if (status === "NO_SHOW") return [...base, "opacity-60"]
    return base
  }

  return (
    <>
      <div className="fc-wrapper h-full">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          locale={esLocale}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          allDaySlot={false}
          nowIndicator={true}
          weekends={true}
          editable={false}
          selectable={true}
          selectMirror={true}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5, 6],
            startTime: "08:00",
            endTime: "18:00",
          }}
          height="calc(100vh - 160px)"
          events={fetchEvents}
          select={handleSelect}
          eventClick={handleEventClick}
          eventClassNames={eventClassNames}
        />
      </div>

      {modal && (
        <AppointmentModal
          mode={modal.mode}
          start={modal.mode === "create" ? modal.start : undefined}
          end={modal.mode === "create" ? modal.end : undefined}
          event={modal.mode === "view" ? modal.event : undefined}
          onClose={handleModalClose}
          onCreated={handleAppointmentCreated}
          onStatusChanged={handleStatusChanged}
        />
      )}
    </>
  )
}
