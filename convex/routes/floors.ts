import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("floors")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    level: v.number(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("floors", args);
  },
});

export const update = mutation({
  args: {
    floorId: v.id("floors"),
    name: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { floorId, ...updates }) => {
    await ctx.db.patch(floorId, updates);
  },
});

export const remove = mutation({
  args: { floorId: v.id("floors") },
  handler: async (ctx, { floorId }) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_floor", (q) => q.eq("floorId", floorId))
      .collect();
    await Promise.all(rooms.map((r) => ctx.db.delete(r._id)));
    await ctx.db.delete(floorId);
  },
});
