import { google } from "googleapis";
import { db } from "@/lib/db";

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthorizationUrl(userId: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    state: userId,
  });
}

export async function exchangeCodeForTokens(
  code: string,
  userId: string
): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("No se obtuvieron tokens válidos de Google");
  }

  await db.googleCalendarToken.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600000),
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600000),
    },
  });
}

export async function getAuthenticatedClient(userId: string) {
  const tokenRecord = await db.googleCalendarToken.findUniqueOrThrow({
    where: { userId },
  });

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
    expiry_date: tokenRecord.expiresAt.getTime(),
  });

  // Auto-renew access token on expiry
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db.googleCalendarToken.update({
        where: { userId },
        data: {
          accessToken: tokens.access_token,
          expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600000),
        },
      });
    }
  });

  return { oauth2Client, calendarId: tokenRecord.calendarId };
}

export async function disconnectCalendar(userId: string): Promise<void> {
  await db.googleCalendarToken.deleteMany({ where: { userId } });
}

export async function isCalendarConnected(userId: string): Promise<boolean> {
  const token = await db.googleCalendarToken.findUnique({
    where: { userId },
  });
  return token !== null;
}
