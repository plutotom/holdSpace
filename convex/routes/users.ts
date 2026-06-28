import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const getByClerkId = query({
  args: {
    clerkUserId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { clerkUserId, organizationId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_org_and_clerk", (q) =>
        q.eq("organizationId", organizationId).eq("clerkUserId", clerkUserId)
      )
      .first();
  },
});

export const listByOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("therapist"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_org_and_clerk", (q) =>
        q.eq("organizationId", args.organizationId).eq("clerkUserId", args.clerkUserId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { email: args.email, name: args.name });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      ...args,
      googleCalendarConnected: false,
    });
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("therapist"), v.literal("admin")),
  },
  handler: async (ctx, { userId, role }) => {
    await ctx.db.patch(userId, { role });
  },
});
