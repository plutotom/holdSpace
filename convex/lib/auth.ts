import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { Doc } from "../_generated/dataModel";

type AuthCtx = QueryCtx | MutationCtx;
type MutationAuthCtx = MutationCtx;

function clerkUserIdFromIdentity(identity: { subject: string; tokenIdentifier: string }): string {
  if (identity.subject.startsWith("user_")) return identity.subject;
  const parts = identity.tokenIdentifier.split("|");
  return parts[parts.length - 1] ?? identity.subject;
}

export async function getAuthenticatedUser(
  ctx: AuthCtx,
  organizationId: Id<"organizations">
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const clerkUserId = clerkUserIdFromIdentity(identity);
  const user = await ctx.db
    .query("users")
    .withIndex("by_org_and_clerk", (q) =>
      q.eq("organizationId", organizationId).eq("clerkUserId", clerkUserId)
    )
    .first();

  if (!user) throw new Error("User not found in organization");
  return user;
}

export async function requireOrgAdmin(
  ctx: AuthCtx,
  organizationId: Id<"organizations">
): Promise<Doc<"users">> {
  const user = await getAuthenticatedUser(ctx, organizationId);
  if (user.role !== "admin") throw new Error("Forbidden: admin required");
  return user;
}

/** Prefer Convex JWT identity; fall back to actingUserId for dev without Clerk JWT on Convex. */
export async function resolveActor(
  ctx: MutationAuthCtx,
  organizationId: Id<"organizations">,
  actingUserId: Id<"users">
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    return await getAuthenticatedUser(ctx, organizationId);
  }

  const actor = await ctx.db.get(actingUserId);
  if (!actor || actor.organizationId !== organizationId) {
    throw new Error("Forbidden: not a member of this organization");
  }
  return actor;
}

export async function requireCanFreeReservation(
  ctx: MutationAuthCtx,
  reservation: Doc<"reservations">,
  actingUserId: Id<"users">
): Promise<Doc<"users">> {
  const actor = await resolveActor(ctx, reservation.organizationId, actingUserId);
  if (actor.role !== "admin" && actor._id !== reservation.userId) {
    throw new Error("Forbidden: you can only free your own reservations");
  }
  return actor;
}
