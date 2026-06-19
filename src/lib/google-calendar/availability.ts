import { google } from "googleapis";
import { getAuthenticatedClient } from "./oauth";
import { addDays, addMinutes, isBefore, isAfter, format } from "date-fns";
import { es } from "date-fns/locale";

// Ecuador = UTC-5, no DST
const ECUADOR_OFFSET_MS = -5 * 60 * 60 * 1000;

function toEcuadorDate(utc: Date): Date {
  return new Date(utc.getTime() - ECUADOR_OFFSET_MS);
}

function fromEcuadorHour(dayUtc: Date, hour: number, minute = 0): Date {
  // Build "day at hour:minute in Ecuador" as a UTC Date
  const col = toEcuadorDate(dayUtc);
  const local = new Date(
    Date.UTC(
      col.getUTCFullYear(),
      col.getUTCMonth(),
      col.getUTCDate(),
      hour,
      minute,
      0,
      0
    )
  );
  // Convert back to UTC
  return new Date(local.getTime() + ECUADOR_OFFSET_MS);
}

export type AvailableSlot = {
  start: Date;
  end: Date;
  label: string;
  isoStart: string;
  isoEnd: string;
};

type ClinicHours = {
  startHour: number;
  endHour: number;
  slotMinutes: number;
  workDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
};

const DEFAULT_HOURS: ClinicHours = {
  startHour: 8,
  endHour: 18,
  slotMinutes: 60,
  workDays: [1, 2, 3, 4, 5, 6], // Mon–Sat
};

export async function getAvailableSlots(
  dentistUserId: string,
  daysAhead = 7,
  hours: ClinicHours = DEFAULT_HOURS
): Promise<AvailableSlot[]> {
  const { oauth2Client, calendarId } = await getAuthenticatedClient(
    dentistUserId
  );
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = addDays(now, daysAhead).toISOString();

  const freeBusyResponse = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: "America/Guayaquil",
      items: [{ id: calendarId }],
    },
  });

  const busyPeriods =
    freeBusyResponse.data.calendars?.[calendarId]?.busy ?? [];

  const allSlots: AvailableSlot[] = [];

  for (let d = 0; d < daysAhead; d++) {
    const day = addDays(now, d);
    const dayOfWeek = toEcuadorDate(day).getUTCDay();

    if (!hours.workDays.includes(dayOfWeek)) continue;

    const slotsPerDay = Math.floor(
      ((hours.endHour - hours.startHour) * 60) / hours.slotMinutes
    );

    for (let i = 0; i < slotsPerDay; i++) {
      const totalMinutes = hours.startHour * 60 + i * hours.slotMinutes;
      const slotHour = Math.floor(totalMinutes / 60);
      const slotMinute = totalMinutes % 60;

      const slotStart = fromEcuadorHour(day, slotHour, slotMinute);
      const slotEnd = addMinutes(slotStart, hours.slotMinutes);

      if (isBefore(slotStart, now)) continue;

      const isBusy = busyPeriods.some((busy) => {
        const busyStart = new Date(busy.start!);
        const busyEnd = new Date(busy.end!);
        return isBefore(slotStart, busyEnd) && isAfter(slotEnd, busyStart);
      });

      if (!isBusy) {
        const colStart = toEcuadorDate(slotStart);
        allSlots.push({
          start: slotStart,
          end: slotEnd,
          label: format(colStart, "EEEE d 'de' MMMM '·' h:mm a", {
            locale: es,
          }),
          isoStart: slotStart.toISOString(),
          isoEnd: slotEnd.toISOString(),
        });
      }
    }
  }

  return allSlots;
}
