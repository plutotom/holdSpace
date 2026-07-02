"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/** Current user's Convex record for an organization (null while loading / missing). */
export function useConvexUser(organizationId: Id<"organizations"> | undefined) {
  const { user, isLoaded: clerkLoaded } = useUser();

  const convexUser = useQuery(
    api.routes.users.getByClerkId,
    user && organizationId
      ? { clerkUserId: user.id, organizationId }
      : "skip"
  );

  return {
    convexUser,
    isLoaded: clerkLoaded && convexUser !== undefined,
  };
}
