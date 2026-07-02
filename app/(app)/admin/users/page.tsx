"use client";

import { useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import type { AppRole } from "@/lib/roles";

export default function UsersAdminPage() {
  const { organization } = useOrganization();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  const org = useQuery(
    api.routes.organizations.getByClerkOrgId,
    organization ? { clerkOrgId: organization.id } : "skip"
  );

  const users = useQuery(
    api.routes.users.listByOrg,
    org ? { organizationId: org._id } : "skip"
  );

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    setInviteMessage(null);

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAddress: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invite failed");
      setInviteMessage(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(userId: string, role: AppRole) {
    setRoleLoading(userId);
    try {
      const res = await fetch(`/api/team/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Role update failed");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Role update failed");
    } finally {
      setRoleLoading(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Admin
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold">Team</h1>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Invite therapist
        </h2>
        <form
          onSubmit={handleInvite}
          className="border border-border rounded-lg p-4 flex flex-col sm:flex-row gap-3"
        >
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="therapist@example.com"
            required
            className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
          />
          <button
            type="submit"
            disabled={inviteLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {inviteLoading ? "Sending..." : "Send invite"}
          </button>
        </form>
        {inviteMessage && (
          <p className="text-xs text-muted-foreground mt-2">{inviteMessage}</p>
        )}
      </section>

      <div className="border border-border rounded-lg divide-y divide-border">
        {users?.map((u) => (
          <div key={u._id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-sm">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
            <select
              value={u.role}
              disabled={roleLoading === u._id}
              onChange={(e) =>
                handleRoleChange(u._id, e.target.value as AppRole)
              }
              className="text-xs border border-border rounded px-2 py-1 bg-background"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        ))}
        {users?.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No users yet.</p>
        )}
      </div>
    </div>
  );
}
