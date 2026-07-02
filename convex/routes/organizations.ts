import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireOrgAdmin } from "../lib/auth";

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
    await requireOrgAdmin(ctx, organizationId);
    await ctx.db.patch(organizationId, updates);
  },
});

export const getGoogleStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org) return null;
    const calendarName = org.googleCalendarId ? `${org.name} — Room Calendar` : null;
    return {
      connected: org.googleCalendarConnected ?? false,
      email: org.googleConnectedEmail ?? null,
      calendarName,
      calendarProvisioned: !!org.googleCalendarId,
      watchActive: !!(
        org.googleWatchChannelId &&
        org.googleWatchExpiresAt &&
        org.googleWatchExpiresAt > Date.now()
      ),
    };
  },
});

export const setGoogleTokens = mutation({
  args: {
    organizationId: v.id("organizations"),
    encryptedRefreshToken: v.string(),
    googleTokenExpiresAt: v.number(),
    googleConnectedEmail: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId);
    await ctx.db.patch(args.organizationId, {
      googleCalendarConnected: true,
      googleRefreshToken: args.encryptedRefreshToken,
      googleTokenExpiresAt: args.googleTokenExpiresAt,
      googleConnectedEmail: args.googleConnectedEmail,
    });
  },
});

export const disconnectGoogle = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrgAdmin(ctx, organizationId);
    await ctx.db.patch(organizationId, {
      googleCalendarConnected: false,
      googleRefreshToken: undefined,
      googleTokenExpiresAt: undefined,
      googleConnectedEmail: undefined,
      googleCalendarId: undefined,
      googleWatchChannelId: undefined,
      googleWatchResourceId: undefined,
      googleWatchExpiresAt: undefined,
    });
  },
});
