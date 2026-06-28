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

export const get = query({
  args: { floorId: v.id("floors") },
  handler: async (ctx, { floorId }) => {
    const floor = await ctx.db.get(floorId);
    if (!floor) return null;

    let backgroundUrl: string | null = null;
    if (floor.backgroundStorageId) {
      backgroundUrl = await ctx.storage.getUrl(floor.backgroundStorageId);
    }

    return { ...floor, backgroundUrl };
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
    return await ctx.db.insert("floors", {
      ...args,
      layoutMode: "visual",
      backgroundOpacity: 0.45,
      canvasAspectRatio: 1.5,
    });
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

export const updateLayout = mutation({
  args: {
    floorId: v.id("floors"),
    backgroundStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    backgroundOpacity: v.optional(v.number()),
    canvasAspectRatio: v.optional(v.number()),
    layoutMode: v.optional(v.union(v.literal("list"), v.literal("visual"))),
  },
  handler: async (ctx, { floorId, backgroundStorageId, ...updates }) => {
    if (backgroundStorageId === null) {
      const floor = await ctx.db.get(floorId);
      if (floor?.backgroundStorageId) {
        await ctx.storage.delete(floor.backgroundStorageId);
      }
      await ctx.db.patch(floorId, {
        ...updates,
        backgroundStorageId: undefined,
      });
      return;
    }

    if (backgroundStorageId !== undefined) {
      const floor = await ctx.db.get(floorId);
      if (
        floor?.backgroundStorageId &&
        floor.backgroundStorageId !== backgroundStorageId
      ) {
        await ctx.storage.delete(floor.backgroundStorageId);
      }
    }

    const patch: Record<string, unknown> = { ...updates };
    if (backgroundStorageId !== undefined) {
      patch.backgroundStorageId = backgroundStorageId;
    }
    await ctx.db.patch(floorId, patch);
  },
});

export const generateBackgroundUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const remove = mutation({
  args: { floorId: v.id("floors") },
  handler: async (ctx, { floorId }) => {
    const floor = await ctx.db.get(floorId);
    if (!floor) return;

    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_floor", (q) => q.eq("floorId", floorId))
      .collect();
    await Promise.all(rooms.map((r) => ctx.db.delete(r._id)));

    if (floor.backgroundStorageId) {
      await ctx.storage.delete(floor.backgroundStorageId);
    }

    await ctx.db.delete(floorId);
  },
});
