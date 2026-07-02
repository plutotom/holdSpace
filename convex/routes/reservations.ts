import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireCanFreeReservation } from "../lib/auth";

export const getSchedule = query({
  args: {
    roomId: v.id("rooms"),
    date: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { roomId, date, organizationId }) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_room_and_time", (q) =>
        q.eq("roomId", roomId).gte("startTime", dayStart.getTime())
      )
      .filter((q) =>
        q.and(
          q.lte(q.field("startTime"), dayEnd.getTime()),
          q.neq(q.field("status"), "canceled"),
          q.neq(q.field("status"), "auto_released")
        )
      )
      .collect();

    return await Promise.all(
      reservations.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return { ...r, userName: user?.name ?? "Unknown" };
      })
    );
  },
});

export const getUserUpcoming = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    return await ctx.db
      .query("reservations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("endTime"), now),
          q.neq(q.field("status"), "canceled"),
          q.neq(q.field("status"), "auto_released")
        )
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    roomId: v.id("rooms"),
    userId: v.id("users"),
    startTime: v.number(),
    endTime: v.number(),
    isAdHoc: v.boolean(),
  },
  handler: async (ctx, args) => {
    const conflict = await ctx.db
      .query("reservations")
      .withIndex("by_room_and_time", (q) => q.eq("roomId", args.roomId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "canceled"),
          q.neq(q.field("status"), "auto_released"),
          q.lt(q.field("startTime"), args.endTime),
          q.gt(q.field("endTime"), args.startTime)
        )
      )
      .first();

    if (conflict) throw new Error("Room is already reserved during this time");

    const reservationId = await ctx.db.insert("reservations", {
      ...args,
      status: "confirmed",
      source: "holdspace",
    });

    await ctx.scheduler.runAfter(0, internal.routes.google.syncReservationToGoogle, {
      reservationId,
    });

    return reservationId;
  },
});

export const claimAdHoc = mutation({
  args: {
    organizationId: v.id("organizations"),
    roomId: v.id("rooms"),
    userId: v.id("users"),
    durationMinutes: v.number(),
  },
  handler: async (ctx, { organizationId, roomId, userId, durationMinutes }) => {
    const now = Date.now();
    const endTime = now + durationMinutes * 60 * 1000;

    const conflict = await ctx.db
      .query("reservations")
      .withIndex("by_room_and_time", (q) => q.eq("roomId", roomId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "canceled"),
          q.neq(q.field("status"), "auto_released"),
          q.lt(q.field("startTime"), endTime),
          q.gt(q.field("endTime"), now)
        )
      )
      .first();

    if (conflict) throw new Error("Room is already in use");

    const reservationId = await ctx.db.insert("reservations", {
      organizationId,
      roomId,
      userId,
      startTime: now,
      endTime,
      isAdHoc: true,
      status: "in_progress",
      source: "holdspace",
    });

    await ctx.scheduler.runAfter(0, internal.routes.google.syncReservationToGoogle, {
      reservationId,
    });

    return reservationId;
  },
});

export const cancel = mutation({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, { reservationId }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) throw new Error("Reservation not found");

    await ctx.db.patch(reservationId, { status: "canceled" });

    if (reservation.source !== "google") {
      await ctx.scheduler.runAfter(0, internal.routes.google.deleteReservationFromGoogle, {
        reservationId,
      });
    }
  },
});

export const freeRoom = mutation({
  args: {
    reservationId: v.id("reservations"),
    actingUserId: v.id("users"),
  },
  handler: async (ctx, { reservationId, actingUserId }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) throw new Error("Reservation not found");

    await requireCanFreeReservation(ctx, reservation, actingUserId);

    if (
      reservation.status !== "confirmed" &&
      reservation.status !== "in_progress"
    ) {
      throw new Error("Only active reservations can be freed");
    }

    await ctx.db.patch(reservationId, { status: "canceled" });

    if (reservation.source !== "google") {
      await ctx.scheduler.runAfter(0, internal.routes.google.deleteReservationFromGoogle, {
        reservationId,
      });
    }
  },
});

export const autoRelease = mutation({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, { reservationId }) => {
    await ctx.db.patch(reservationId, { status: "auto_released" });
  },
});
