"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser, useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { formatDuration } from "@/lib/utils";
import { formatConvexError } from "@/lib/convex-error";
import type { Id } from "@/convex/_generated/dataModel";

interface AdHocClaimButtonProps {
  roomId: Id<"rooms">;
  organizationId: Id<"organizations">;
  defaultDuration: number;
}

export function AdHocClaimButton({
  roomId,
  organizationId,
  defaultDuration,
}: AdHocClaimButtonProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const convexUser = useQuery(
    api.routes.users.getByClerkId,
    user ? { clerkUserId: user.id, organizationId } : "skip"
  );

  const claimAdHoc = useMutation(api.routes.reservations.claimAdHoc);

  async function handleClaim() {
    if (!convexUser) return;
    setLoading(true);
    setError(null);
    try {
      await claimAdHoc({
        organizationId,
        roomId,
        userId: convexUser._id,
        durationMinutes: defaultDuration,
      });
      setClaimed(true);
    } catch (e) {
      setError(formatConvexError(e));
    } finally {
      setLoading(false);
    }
  }

  if (claimed) {
    return (
      <div className="w-full py-2 px-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-md text-sm text-center font-medium">
        Claimed for {formatDuration(defaultDuration)}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={loading || !convexUser}
        className="w-full py-2 px-3 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Claiming..." : `Claim now · ${formatDuration(defaultDuration)}`}
      </button>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}
