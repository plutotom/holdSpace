/** Clerk user IDs for app builders — comma-separated in env. */
export function parseSuperuserIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((id) => id.trim()).filter(Boolean);
}

export function isSuperuserClerkId(
  clerkUserId: string | null | undefined,
  rawIds: string | undefined
): boolean {
  if (!clerkUserId) return false;
  return parseSuperuserIds(rawIds).includes(clerkUserId);
}
