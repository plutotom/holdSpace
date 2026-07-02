import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

const roleValidator = v.union(v.literal("member"), v.literal("admin"));

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

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
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

export const countByOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
    return users.length;
  },
});

export const upsert = mutation({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const orgUsers = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const isFirstUser = orgUsers.length === 0;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_org_and_clerk", (q) =>
        q.eq("organizationId", args.organizationId).eq("clerkUserId", args.clerkUserId)
      )
      .first();

    const role = !existing && isFirstUser ? "admin" : args.role;

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        role,
        googleCalendarConnected: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      organizationId: args.organizationId,
      clerkUserId: args.clerkUserId,
      email: args.email,
      name: args.name,
      role,
    });
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
  },
  handler: async (ctx, { userId, role }) => {
    await ctx.db.patch(userId, { role });
  },
});
