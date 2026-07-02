import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const getOrgForSync = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db.get(organizationId);
  },
});

export const getOrgByWatchChannel = internalQuery({
  args: { channelId: v.string() },
  handler: async (ctx, { channelId }) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_google_watch_channel", (q) => q.eq("googleWatchChannelId", channelId))
      .first();
  },
});

export const getReservationForSync = internalQuery({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, { reservationId }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) return null;
    const room = await ctx.db.get(reservation.roomId);
    const user = await ctx.db.get(reservation.userId);
    const org = await ctx.db.get(reservation.organizationId);
    return { reservation, room, user, org };
  },
});

export const listRoomsByOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

export const findRoomByNameInOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
  },
  handler: async (ctx, { organizationId, name }) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
    return rooms.find((r) => r.name === name) ?? null;
  },
});

export const listOrgsNeedingWatchRenewal = internalQuery({
  args: { expiresBefore: v.number() },
  handler: async (ctx, { expiresBefore }) => {
    const orgs = await ctx.db.query("organizations").collect();
    return orgs.filter(
      (o) =>
        o.googleCalendarConnected &&
        o.googleCalendarId &&
        o.googleWatchChannelId &&
        o.googleWatchResourceId &&
        (o.googleWatchExpiresAt ?? 0) < expiresBefore
    );
  },
});

export const getOrgAdminUser = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
    return users.find((u) => u.role === "admin") ?? users[0] ?? null;
  },
});

export const getUserByClerkInOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
  },
  handler: async (ctx, { organizationId, clerkUserId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_org_and_clerk", (q) =>
        q.eq("organizationId", organizationId).eq("clerkUserId", clerkUserId)
      )
      .first();
  },
});

export const findReservationByGoogleEventInOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    googleCalendarEventId: v.string(),
  },
  handler: async (ctx, { organizationId, googleCalendarEventId }) => {
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
    return (
      reservations.find((r) => r.googleCalendarEventId === googleCalendarEventId) ?? null
    );
  },
});

export const patchOrgTokens = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    googleTokenExpiresAt: v.optional(v.number()),
    googleRefreshToken: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, ...updates }) => {
    await ctx.db.patch(organizationId, updates);
  },
});

export const patchOrgGoogle = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    googleCalendarId: v.optional(v.string()),
    googleWatchChannelId: v.optional(v.string()),
    googleWatchResourceId: v.optional(v.string()),
    googleWatchExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, ...updates }) => {
    await ctx.db.patch(organizationId, updates);
  },
});

export const patchReservationSync = internalMutation({
  args: {
    reservationId: v.id("reservations"),
    googleCalendarEventId: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("canceled"),
        v.literal("auto_released")
      )
    ),
  },
  handler: async (ctx, { reservationId, ...updates }) => {
    await ctx.db.patch(reservationId, updates);
  },
});

export const insertGoogleReservation = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    roomId: v.id("rooms"),
    userId: v.id("users"),
    startTime: v.number(),
    endTime: v.number(),
    googleCalendarEventId: v.string(),
    isAdHoc: v.boolean(),
    status: v.union(
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("canceled"),
      v.literal("auto_released")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reservations", {
      ...args,
      source: "google",
      lastSyncedAt: Date.now(),
    });
  },
});
