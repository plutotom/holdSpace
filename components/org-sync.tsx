"use client";

import { useEffect, useRef } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { clerkOrgRoleToAppRole } from "@/lib/roles";

// Syncs Clerk org + user into Convex on mount / org change.
export function OrgSync() {
  const { organization, membership } = useOrganization();
  const { user } = useUser();
  const createOrg = useMutation(api.routes.organizations.createOrganization);
  const upsertUser = useMutation(api.routes.users.upsert);
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!organization || !user) return;
    const key = `${organization.id}:${user.id}:${membership?.role ?? ""}`;
    if (syncedRef.current === key) return;
    syncedRef.current = key;

    (async () => {
      const orgId = await createOrg({
        clerkOrgId: organization.id,
        name: organization.name,
        slug: organization.slug ?? organization.id,
      });

      await upsertUser({
        organizationId: orgId,
        clerkUserId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? user.username ?? "Member",
        role: clerkOrgRoleToAppRole(membership?.role),
      });
    })();
  }, [organization?.id, user?.id, membership?.role, createOrg, upsertUser, organization, user, membership]);

  return null;
}
