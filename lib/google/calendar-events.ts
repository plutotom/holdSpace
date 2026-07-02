const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
}

export async function createCalendarEvent(params: {
  accessToken: string;
  calendarId: string;
  summary: string;
  description?: string;
  startTime: number;
  endTime: number;
  timeZone?: string;
}): Promise<GoogleCalendarEvent> {
  const tz = params.timeZone ?? "America/New_York";
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(params.calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: params.summary,
        description: params.description,
        start: { dateTime: new Date(params.startTime).toISOString(), timeZone: tz },
        end: { dateTime: new Date(params.endTime).toISOString(), timeZone: tz },
      }),
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

  const data = (await res.json()) as { resourceId: string; expiration: string };
  return data;
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
