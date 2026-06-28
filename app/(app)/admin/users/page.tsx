"use client";

import { useOrganization } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function UsersAdminPage() {
  const { organization } = useOrganization();

  const org = useQuery(
    api.routes.organizations.getByClerkOrgId,
    organization ? { clerkOrgId: organization.id } : "skip"
  );

  const users = useQuery(
    api.routes.users.listByOrg,
    org ? { organizationId: org._id } : "skip"
  );

  const setRole = useMutation(api.routes.users.setRole);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Admin
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold">Team</h1>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border">
        {users?.map((u) => (
          <div key={u._id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-sm">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
            <select
              value={u.role}
              onChange={(e) =>
                setRole({
                  userId: u._id,
                  role: e.target.value as "therapist" | "admin",
                })
              }
              className="text-xs border border-border rounded px-2 py-1 bg-background"
            >
              <option value="therapist">Therapist</option>
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
