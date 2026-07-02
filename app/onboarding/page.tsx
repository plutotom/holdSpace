"use client";

import { useEffect, useRef, useState } from "react";
import { useOrganizationList, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { isLoaded, userMemberships, createOrganization, setActive } =
    useOrganizationList({
      userMemberships: { infinite: true },
    });

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activatedRef = useRef(false);

  // Invited user: one org membership → set active → floor
  useEffect(() => {
    if (!isLoaded || !userLoaded || activatedRef.current) return;

    const memberships = userMemberships.data ?? [];
    if (memberships.length === 1 && setActive) {
      activatedRef.current = true;
      void (async () => {
        await setActive({ organization: memberships[0].organization.id });
        router.replace("/floor");
      })();
    }
  }, [isLoaded, userLoaded, userMemberships.data, setActive, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !createOrganization || !setActive) return;

    setLoading(true);
    setError(null);

    try {
      const org = await createOrganization({ name: name.trim() });
      await setActive({ organization: org.id });
      router.push("/floor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create practice");
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded || !userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const memberships = userMemberships.data ?? [];
  if (memberships.length === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Joining your practice...
      </div>
    );
  }

  if (memberships.length > 1) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-3">
          <h1 className="text-xl font-semibold">Multiple practices found</h1>
          <p className="text-sm text-muted-foreground">
            Your account is linked to more than one practice. Contact support to
            choose the right one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <Link href="/" className="font-semibold text-lg tracking-tight">
            HoldSpace
          </Link>
          <h1 className="text-xl font-semibold mt-6">Set up your practice</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Create your organization to start managing rooms and bookings.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="practice-name" className="block text-sm font-medium mb-1.5">
              Practice name
            </label>
            <input
              id="practice-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordie's Practice"
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim() || !createOrganization}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create practice"}
          </button>
        </form>

        {user?.primaryEmailAddress && (
          <p className="text-xs text-muted-foreground text-center mt-6">
            Signed in as {user.primaryEmailAddress.emailAddress}
          </p>
        )}
      </div>
    </div>
  );
}
