import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const getByClerkOrgId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, { clerkOrgId }) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
      .first();
  },
});

export const createOrganization = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, { clerkOrgId, name, slug }) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("organizations", {
      clerkOrgId,
      name,
      slug,
      defaultSessionDurations: [50, 60, 90],
      adHocReleaseMinutes: 10,
    });
  },
});

export const updateSettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    defaultSessionDurations: v.optional(v.array(v.number())),
    adHocReleaseMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, ...updates }) => {
    await ctx.db.patch(organizationId, updates);
  },
});
