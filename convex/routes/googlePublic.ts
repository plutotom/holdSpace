import { action, query, type ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

async function assertOrgAdmin(ctx: ActionCtx, organizationId: Id<"organizations">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const clerkUserId = identity.subject.startsWith("user_")
    ? identity.subject
    : identity.tokenIdentifier.split("|").pop()!;

  const user = await ctx.runQuery(internal.routes.googleInternal.getUserByClerkInOrg, {
    organizationId,
    clerkUserId,
  });
  if (!user || user.role !== "admin") throw new Error("Forbidden: admin required");
}

export const getOrgByWatchChannel = query({
  args: { channelId: v.string() },
  handler: async (ctx, { channelId }) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_google_watch_channel", (q) => q.eq("googleWatchChannelId", channelId))
      .first();
  },
});

export const reconcileFromWebhook = action({
  args: { channelId: v.string() },
  handler: async (ctx, { channelId }) => {
    const org = await ctx.runQuery(internal.routes.googleInternal.getOrgByWatchChannel, {
      channelId,
    });
    if (!org) return { ok: false };

    await ctx.runAction(internal.routes.google.reconcileGoogleEvent, {
      organizationId: org._id,
    });

    return { ok: true };
  },
});

export const provisionCalendars = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await assertOrgAdmin(ctx, organizationId);
    await ctx.runAction(internal.routes.google.provisionOrgCalendar, {
      organizationId,
    });
    return { ok: true };
  },
});
