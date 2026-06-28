import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const listByFloor = query({
  args: { floorId: v.id("floors") },
  handler: async (ctx, { floorId }) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_floor", (q) => q.eq("floorId", floorId))
      .collect();
  },
});

export const getRoomsWithStatus = query({
  args: {
    floorId: v.id("floors"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { floorId, organizationId }) => {
    const now = Date.now();
    const soonThreshold = now + 30 * 60 * 1000;

    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_floor", (q) => q.eq("floorId", floorId))
      .collect();

    return await Promise.all(
      rooms.map(async (room) => {
        if (!room.isBookable) {
          return { ...room, status: "not_bookable" as const, activeReservation: null };
        }

        const allRes = await ctx.db
          .query("reservations")
          .withIndex("by_room_and_time", (q) => q.eq("roomId", room._id))
          .collect();

        const activeRes = allRes.find(
          (r) =>
            r.startTime <= now &&
            r.endTime >= now &&
            r.status !== "canceled" &&
            r.status !== "auto_released"
        );

        if (activeRes) {
          const user = await ctx.db.get(activeRes.userId);
          return {
            ...room,
            status: "in_use" as const,
            activeReservation: {
              ...activeRes,
              userName: user?.name ?? "Unknown",
            },
          };
        }

        const soonRes = allRes.find(
          (r) =>
            r.startTime > now &&
            r.startTime <= soonThreshold &&
            r.status !== "canceled" &&
            r.status !== "auto_released"
        );

        if (soonRes) {
          return { ...room, status: "reserved_soon" as const, activeReservation: null };
        }

        return { ...room, status: "available" as const, activeReservation: null };
      })
    );
  },
});

export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    return await ctx.db.get(roomId);
  },
});

const roomTypeValidator = v.union(
  v.literal("individual"),
  v.literal("group"),
  v.literal("consultation"),
  v.literal("shared")
);

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    floorId: v.id("floors"),
    name: v.string(),
    type: roomTypeValidator,
    isBookable: v.boolean(),
    xPercent: v.number(),
    yPercent: v.number(),
    widthPercent: v.number(),
    heightPercent: v.number(),
    sortOrder: v.optional(v.number()),
    defaultDuration: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("rooms", args);
  },
});

export const update = mutation({
  args: {
    roomId: v.id("rooms"),
    name: v.optional(v.string()),
    type: v.optional(roomTypeValidator),
    isBookable: v.optional(v.boolean()),
    xPercent: v.optional(v.number()),
    yPercent: v.optional(v.number()),
    widthPercent: v.optional(v.number()),
    heightPercent: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
    defaultDuration: v.optional(v.number()),
    adHocReleaseMinutes: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { roomId, ...updates }) => {
    await ctx.db.patch(roomId, updates);
  },
});

export const remove = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    await ctx.db.delete(roomId);
  },
});
