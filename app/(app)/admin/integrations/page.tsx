"use client";

import { useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function IntegrationsPage() {
  const { organization } = useOrganization();
  const searchParams = useSearchParams();
  const [provisioning, setProvisioning] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const org = useQuery(
    api.routes.organizations.getByClerkOrgId,
    organization ? { clerkOrgId: organization.id } : "skip"
  );

  const googleStatus = useQuery(
    api.routes.organizations.getGoogleStatus,
    org ? { organizationId: org._id } : "skip"
  );

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  if (!org || googleStatus === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  async function handleProvision() {
    setProvisioning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/google/provision", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to provision calendar");
      setMessage("Organization room calendar provisioned successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Provision failed");
    } finally {
      setProvisioning(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Calendar? Room sync will stop.")) return;
    setDisconnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/google/provision", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to disconnect");
      setMessage("Google Calendar disconnected.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Admin
        </Link>
        <h1 className="text-xl font-semibold mt-2">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect Google Calendar for two-way room sync.
        </p>
      </div>

      {connectedParam === "1" && (
        <div className="mb-4 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
          Google Calendar connected successfully.
        </div>
      )}

      {errorParam && (
        <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200">
          Connection failed: {errorParam}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 rounded-md bg-muted text-sm">{message}</div>
      )}

      <section className="border border-border rounded-lg p-6">
        <h2 className="font-medium mb-1">Google Calendar</h2>
        <p className="text-sm text-muted-foreground mb-4">
          One shared calendar for your organization. All room bookings appear as events
          on that calendar — book in HoldSpace or in Google and both stay in sync.
        </p>

        {googleStatus?.connected ? (
          <div className="space-y-4">
            <p className="text-sm">
              Connected as{" "}
              <span className="font-medium">{googleStatus.email ?? "unknown"}</span>
            </p>

            {googleStatus.calendarProvisioned ? (
              <div className="rounded-md border border-border p-4 space-y-2">
                <p className="text-sm font-medium">{googleStatus.calendarName}</p>
                <p className="text-xs text-muted-foreground">
                  {googleStatus.watchActive
                    ? "Webhook sync active"
                    : "Calendar created — re-provision to refresh webhook"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Rooms sync via event titles (e.g. &quot;{org.name} - Alex S. Room 3&quot;)
                  or extended properties when booked from HoldSpace.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Calendar not provisioned yet. Create the shared room calendar to start syncing.
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleProvision}
                disabled={provisioning}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {provisioning
                  ? "Provisioning…"
                  : googleStatus.calendarProvisioned
                    ? "Refresh calendar sync"
                    : "Provision room calendar"}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <a
            href="/api/google/oauth/start"
            className="inline-flex px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
          >
            Connect Google Calendar
          </a>
        )}
      </section>
    </div>
  );
}
