import { google } from "googleapis";
import { getAuthenticatedClient } from "./oauth";
import { db } from "@/lib/db";

export async function createCalendarEvent(
  dentistUserId: string,
  appointmentId: string,
  params: {
    title: string;
    description: string;
    startIso: string;
    endIso: string;
    patientEmail?: string;
    location?: string;
  }
): Promise<string | null> {
  const { oauth2Client, calendarId } = await getAuthenticatedClient(
    dentistUserId
  );
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const attendees = params.patientEmail
    ? [{ email: params.patientEmail }]
    : [];

  const event = await calendar.events.insert({
    calendarId,
    sendUpdates: "all",
    requestBody: {
      summary: params.title,
      description: params.description,
      start: { dateTime: params.startIso, timeZone: "America/Guayaquil" },
      end: { dateTime: params.endIso, timeZone: "America/Guayaquil" },
      attendees,
      location: params.location,
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: 30 }],
      },
      colorId: "9",
    },
  });

  const googleEventId = event.data.id ?? null;

  if (googleEventId) {
    await db.appointment.update({
      where: { id: appointmentId },
      data: { googleEventId },
    });
  }

  return googleEventId;
}

export async function cancelCalendarEvent(
  dentistUserId: string,
  googleEventId: string
): Promise<void> {
  const { oauth2Client, calendarId } = await getAuthenticatedClient(
    dentistUserId
  );
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.patch({
    calendarId,
    eventId: googleEventId,
    requestBody: { status: "cancelled" },
  });
}

export async function rescheduleCalendarEvent(
  dentistUserId: string,
  googleEventId: string,
  newStartIso: string,
  newEndIso: string
): Promise<void> {
  const { oauth2Client, calendarId } = await getAuthenticatedClient(
    dentistUserId
  );
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.patch({
    calendarId,
    eventId: googleEventId,
    requestBody: {
      start: { dateTime: newStartIso, timeZone: "America/Guayaquil" },
      end: { dateTime: newEndIso, timeZone: "America/Guayaquil" },
    },
  });
}
