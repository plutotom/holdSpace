"use client";

import { useEffect, useRef } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Silently syncs Clerk org + user into Convex on mount / org change.
export function OrgSync() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const createOrg = useMutation(api.routes.organizations.createOrganization);
  const upsertUser = useMutation(api.routes.users.upsert);
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!organization || !user) return;
    const key = `${organization.id}:${user.id}`;
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
        name: user.fullName ?? user.username ?? "Therapist",
        role: "therapist",
      });
    })();
  }, [organization?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
