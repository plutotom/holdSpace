"use node";

import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { decryptToken } from "../lib/encryption";
import {
  createCalendar,
  createCalendarEvent,
  deleteCalendarEvent,
  eventTimes,
  getCalendarEvent,
  listCalendarEvents,
  refreshAccessToken,
  setupWatchChannel,
  stopWatchChannel,
  type GoogleCalendarEvent,
} from "../lib/googleApi";

const WATCH_TTL_MS = 6 * 24 * 60 * 60 * 1000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function formatTherapistLabel(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Unknown";
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() ?? "";
  return `${firstName} ${lastInitial}.`;
}

function formatHoldspaceEventTitle(
  orgName: string,
  therapistName: string,
  roomName: string
): string {
  return `${orgName} - ${formatTherapistLabel(therapistName)} ${roomName}`;
}

function parseRoomNameFromEventTitle(title: string, orgName: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const orgPrefix = `${orgName} - `;
  const subject = trimmed.startsWith(orgPrefix) ? trimmed.slice(orgPrefix.length) : trimmed;

  const dotIndex = subject.lastIndexOf(". ");
  if (dotIndex === -1) return null;

  const roomName = subject.slice(dotIndex + 2).trim();
  return roomName || null;
}

function orgCalendarName(orgName: string): string {
  return `${orgName} — Room Calendar`;
}

async function getAccessToken(
  ctx: ActionCtx,
  organizationId: Id<"organizations">
): Promise<string> {
  const org = await ctx.runQuery(internal.routes.googleInternal.getOrgForSync, {
    organizationId,
  });
  if (!org?.googleCalendarConnected || !org.googleRefreshToken) {
    throw new Error("Google Calendar not connected for organization");
  }

  const encryptionKey = requireEnv("GOOGLE_TOKEN_ENCRYPTION_KEY");
  const refreshToken = await decryptToken(org.googleRefreshToken, encryptionKey);
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

  const tokens = await refreshAccessToken({ refreshToken, clientId, clientSecret });
  const expiresAt = Date.now() + tokens.expires_in * 1000;

  await ctx.runMutation(internal.routes.googleInternal.patchOrgTokens, {
    organizationId,
    googleTokenExpiresAt: expiresAt,
  });

  return tokens.access_token;
}

async function setupOrgWatch(
  ctx: ActionCtx,
  org: {
    _id: Id<"organizations">;
    googleCalendarId?: string;
    googleWatchChannelId?: string;
    googleWatchResourceId?: string;
  },
  accessToken: string
) {
  if (!org.googleCalendarId) return;

  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const webhookUrl = `${appUrl}/api/google/webhook`;

  // Google push notifications require a public HTTPS URL (no localhost).
  if (!webhookUrl.startsWith("https://")) {
    console.warn(
      `Skipping Google watch channel: webhook must be HTTPS (got ${webhookUrl}). ` +
        "HoldSpace → Google sync still works; use ngrok for Google → HoldSpace in dev."
    );
    return;
  }

  const expiresAt = Date.now() + WATCH_TTL_MS;
  const channelId = `holdspace-org-${org._id}-${Date.now()}`;

  if (org.googleWatchChannelId && org.googleWatchResourceId) {
    try {
      await stopWatchChannel({
        accessToken,
        channelId: org.googleWatchChannelId,
        resourceId: org.googleWatchResourceId,
      });
    } catch {
      // Best-effort stop of old channel
    }
  }

  const watch = await setupWatchChannel({
    accessToken,
    calendarId: org.googleCalendarId,
    channelId,
    webhookUrl,
    expirationMs: expiresAt,
  });

  await ctx.runMutation(internal.routes.googleInternal.patchOrgGoogle, {
    organizationId: org._id,
    googleWatchChannelId: channelId,
    googleWatchResourceId: watch.resourceId,
    googleWatchExpiresAt: parseInt(watch.expiration, 10),
  });
}

export const syncReservationToGoogle = internalAction({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, { reservationId }) => {
    const data = await ctx.runQuery(internal.routes.googleInternal.getReservationForSync, {
      reservationId,
    });
    if (!data) return;

    const { reservation, room, user, org } = data;
    if (reservation.source === "google") return;
    if (!org?.googleCalendarConnected || !org.googleCalendarId) return;
    if (reservation.googleCalendarEventId) return;
    if (reservation.status === "canceled" || reservation.status === "auto_released") return;
    if (!room) return;

    const accessToken = await getAccessToken(ctx, reservation.organizationId);

    const summary = formatHoldspaceEventTitle(
      org.name,
      user?.name ?? "HoldSpace",
      room.name
    );

    const event = await createCalendarEvent({
      accessToken,
      calendarId: org.googleCalendarId,
      summary,
      description: reservation.isAdHoc ? "Ad-hoc claim via HoldSpace" : "Booked via HoldSpace",
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      extendedPropertiesPrivate: {
        holdspaceRoomId: String(room._id),
        holdspaceReservationId: String(reservationId),
        holdspaceSource: "holdspace",
      },
    });

    await ctx.runMutation(internal.routes.googleInternal.patchReservationSync, {
      reservationId,
      googleCalendarEventId: event.id,
      lastSyncedAt: Date.now(),
    });
  },
});

export const deleteReservationFromGoogle = internalAction({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, { reservationId }) => {
    const data = await ctx.runQuery(internal.routes.googleInternal.getReservationForSync, {
      reservationId,
    });
    if (!data) return;

    const { reservation, org } = data;
    if (!reservation.googleCalendarEventId || !org?.googleCalendarId) return;
    if (reservation.source === "google") return;
    if (!org.googleCalendarConnected) return;

    const accessToken = await getAccessToken(ctx, reservation.organizationId);

    await deleteCalendarEvent({
      accessToken,
      calendarId: org.googleCalendarId,
      eventId: reservation.googleCalendarEventId,
    });

    await ctx.runMutation(internal.routes.googleInternal.patchReservationSync, {
      reservationId,
      googleCalendarEventId: undefined,
      lastSyncedAt: Date.now(),
    });
  },
});

export const provisionOrgCalendar = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.runQuery(internal.routes.googleInternal.getOrgForSync, {
      organizationId,
    });
    if (!org?.googleCalendarConnected) {
      throw new Error("Connect Google Calendar first");
    }

    const accessToken = await getAccessToken(ctx, organizationId);

    let calendarId = org.googleCalendarId;
    if (!calendarId) {
      const calendar = await createCalendar({
        accessToken,
        summary: orgCalendarName(org.name),
      });
      calendarId = calendar.id;
      await ctx.runMutation(internal.routes.googleInternal.patchOrgGoogle, {
        organizationId,
        googleCalendarId: calendarId,
      });
    }

    await setupOrgWatch(
      ctx,
      { ...org, googleCalendarId: calendarId },
      accessToken
    );
  },
});

export const renewWatchChannels = internalAction({
  args: {},
  handler: async (ctx) => {
    const renewBefore = Date.now() + 24 * 60 * 60 * 1000;
    const orgs = await ctx.runQuery(internal.routes.googleInternal.listOrgsNeedingWatchRenewal, {
      expiresBefore: renewBefore,
    });

    for (const org of orgs) {
      await ctx.runAction(internal.routes.google.provisionOrgCalendar, {
        organizationId: org._id,
      });
    }
  },
});

async function resolveRoomForEvent(
  ctx: ActionCtx,
  org: Doc<"organizations">,
  evt: GoogleCalendarEvent
): Promise<Doc<"rooms"> | null> {
  const privateProps = evt.extendedProperties?.private;
  const roomIdFromProps = privateProps?.holdspaceRoomId;
  if (roomIdFromProps) {
    const rooms = await ctx.runQuery(internal.routes.googleInternal.listRoomsByOrg, {
      organizationId: org._id,
    });
    return rooms.find((r) => r._id === roomIdFromProps) ?? null;
  }

  const roomName = parseRoomNameFromEventTitle(evt.summary ?? "", org.name);
  if (!roomName) return null;

  return await ctx.runQuery(internal.routes.googleInternal.findRoomByNameInOrg, {
    organizationId: org._id,
    name: roomName,
  });
}

async function processGoogleEvent(
  ctx: ActionCtx,
  org: Doc<"organizations">,
  room: Doc<"rooms">,
  evt: GoogleCalendarEvent,
  adminUserId: Id<"users">
) {
  const privateProps = evt.extendedProperties?.private;
  const holdspaceReservationId = privateProps?.holdspaceReservationId as
    | Id<"reservations">
    | undefined;

  let existing = holdspaceReservationId
    ? (await ctx.runQuery(internal.routes.googleInternal.getReservationForSync, {
        reservationId: holdspaceReservationId,
      }))?.reservation ?? null
    : null;

  if (!existing) {
    existing = await ctx.runQuery(
      internal.routes.googleInternal.findReservationByGoogleEventInOrg,
      {
        organizationId: org._id,
        googleCalendarEventId: evt.id,
      }
    );
  }

  if (evt.status === "cancelled") {
    if (existing && existing.status !== "canceled" && existing.status !== "auto_released") {
      await ctx.runMutation(internal.routes.googleInternal.patchReservationSync, {
        reservationId: existing._id,
        status: "canceled",
        lastSyncedAt: Date.now(),
      });
    }
    return;
  }

  const times = eventTimes(evt);
  if (!times) return;

  if (existing) {
    await ctx.runMutation(internal.routes.googleInternal.patchReservationSync, {
      reservationId: existing._id,
      startTime: times.startTime,
      endTime: times.endTime,
      googleCalendarEventId: evt.id,
      lastSyncedAt: Date.now(),
    });
    return;
  }

  if (privateProps?.holdspaceSource === "holdspace") {
    return;
  }

  const now = Date.now();
  const status = times.startTime <= now && times.endTime >= now ? "in_progress" : "confirmed";

  await ctx.runMutation(internal.routes.googleInternal.insertGoogleReservation, {
    organizationId: org._id,
    roomId: room._id,
    userId: adminUserId,
    startTime: times.startTime,
    endTime: times.endTime,
    googleCalendarEventId: evt.id,
    isAdHoc: false,
    status,
  });
}

export const reconcileGoogleEvent = internalAction({
  args: {
    organizationId: v.id("organizations"),
    googleCalendarEventId: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, googleCalendarEventId }) => {
    const org = await ctx.runQuery(internal.routes.googleInternal.getOrgForSync, {
      organizationId,
    });
    if (!org?.googleCalendarConnected || !org.googleCalendarId) return;

    const adminUser = await ctx.runQuery(internal.routes.googleInternal.getOrgAdminUser, {
      organizationId,
    });
    if (!adminUser) return;

    const accessToken = await getAccessToken(ctx, organizationId);

    if (googleCalendarEventId) {
      const evt = await getCalendarEvent({
        accessToken,
        calendarId: org.googleCalendarId,
        eventId: googleCalendarEventId,
      });
      if (!evt) return;
      const room = await resolveRoomForEvent(ctx, org, evt);
      if (!room) return;
      await processGoogleEvent(ctx, org, room, evt, adminUser._id);
      return;
    }

    const updatedMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const events = await listCalendarEvents({
      accessToken,
      calendarId: org.googleCalendarId,
      updatedMin,
      showDeleted: true,
    });

    for (const evt of events) {
      const room = await resolveRoomForEvent(ctx, org, evt);
      if (!room) continue;
      await processGoogleEvent(ctx, org, room, evt, adminUser._id);
    }
  },
});
