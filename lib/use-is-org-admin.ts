"use client";

import { useAuth, useOrganization, useUser } from "@clerk/nextjs";
import { isSuperuserClerkId } from "@/lib/superuser";

/** True when user may access admin UI (Clerk org:admin or app superuser). */
export function useIsOrgAdmin() {
  const { user } = useUser();
  const { isLoaded: authLoaded, has } = useAuth();
  const { isLoaded: orgLoaded, membership } = useOrganization();

  const superuser = isSuperuserClerkId(
    user?.id,
    process.env.NEXT_PUBLIC_SUPERUSER_CLERK_IDS
  );

  const clerkAdmin =
    authLoaded &&
    orgLoaded &&
    (has?.({ role: "org:admin" }) === true || membership?.role === "org:admin");

  return {
    isLoaded: authLoaded && orgLoaded,
    isOrgAdmin: superuser || clerkAdmin,
    isSuperuser: superuser,
  };
}
