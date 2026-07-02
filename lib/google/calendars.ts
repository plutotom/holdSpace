const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

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

export async function listCalendars(accessToken: string): Promise<Array<{ id: string; summary: string }>> {
  const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list calendars: ${text}`);
  }

  const data = (await res.json()) as { items?: Array<{ id: string; summary: string }> };
  return data.items ?? [];
}
