const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed: ${text}`);
  }

  return res.json();
}

export async function createCalendar(params: {
  accessToken: string;
  summary: string;
  timeZone?: string;
}): Promise<{ id: string }> {
  const res = await fetch(`${CALENDAR_API}/calendars`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: params.summary,
      timeZone: params.timeZone ?? "America/New_York",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create calendar: ${text}`);
  }

  return res.json();
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export async function createCalendarEvent(params: {
  accessToken: string;
  calendarId: string;
  summary: string;
  description?: string;
  startTime: number;
  endTime: number;
  timeZone?: string;
  extendedPropertiesPrivate?: Record<string, string>;
}): Promise<GoogleCalendarEvent> {
  const tz = params.timeZone ?? "America/New_York";
  const body: Record<string, unknown> = {
    summary: params.summary,
    description: params.description,
    start: { dateTime: new Date(params.startTime).toISOString(), timeZone: tz },
    end: { dateTime: new Date(params.endTime).toISOString(), timeZone: tz },
  };
  if (params.extendedPropertiesPrivate) {
    body.extendedProperties = { private: params.extendedPropertiesPrivate };
  }

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(params.calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create calendar event: ${text}`);
  }

  return res.json();
}

export async function deleteCalendarEvent(params: {
  accessToken: string;
  calendarId: string;
  eventId: string;
}): Promise<void> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(params.calendarId)}/events/${encodeURIComponent(params.eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${params.accessToken}` },
    }
  );

  if (res.status === 404 || res.status === 410) return;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to delete calendar event: ${text}`);
  }
}

export async function getCalendarEvent(params: {
  accessToken: string;
  calendarId: string;
  eventId: string;
}): Promise<GoogleCalendarEvent | null> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(params.calendarId)}/events/${encodeURIComponent(params.eventId)}`,
    { headers: { Authorization: `Bearer ${params.accessToken}` } }
  );

  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get calendar event: ${text}`);
  }

  return res.json();
}

export async function listCalendarEvents(params: {
  accessToken: string;
  calendarId: string;
  updatedMin?: string;
  showDeleted?: boolean;
}): Promise<GoogleCalendarEvent[]> {
  const url = new URL(
    `${CALENDAR_API}/calendars/${encodeURIComponent(params.calendarId)}/events`
  );
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  if (params.updatedMin) url.searchParams.set("updatedMin", params.updatedMin);
  if (params.showDeleted) url.searchParams.set("showDeleted", "true");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list calendar events: ${text}`);
  }

  const data = (await res.json()) as { items?: GoogleCalendarEvent[] };
  return data.items ?? [];
}

export async function setupWatchChannel(params: {
  accessToken: string;
  calendarId: string;
  channelId: string;
  webhookUrl: string;
  expirationMs: number;
}): Promise<{ resourceId: string; expiration: string }> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(params.calendarId)}/events/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: params.channelId,
        type: "web_hook",
        address: params.webhookUrl,
        expiration: String(params.expirationMs),
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to setup watch channel: ${text}`);
  }

  return res.json();
}

export async function stopWatchChannel(params: {
  accessToken: string;
  channelId: string;
  resourceId: string;
}): Promise<void> {
  const res = await fetch(`${CALENDAR_API}/channels/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: params.channelId,
      resourceId: params.resourceId,
    }),
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Failed to stop watch channel: ${text}`);
  }
}

function parseEventTime(value?: { dateTime?: string; date?: string }): number | null {
  if (!value) return null;
  const raw = value.dateTime ?? value.date;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function eventTimes(event: GoogleCalendarEvent): { startTime: number; endTime: number } | null {
  const startTime = parseEventTime(event.start);
  const endTime = parseEventTime(event.end);
  if (startTime === null || endTime === null) return null;
  return { startTime, endTime };
}
