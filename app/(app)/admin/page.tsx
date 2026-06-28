"use client";

import { useOrganization } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function AdminPage() {
  const { organization } = useOrganization();

  const org = useQuery(
    api.routes.organizations.getByClerkOrgId,
    organization ? { clerkOrgId: organization.id } : "skip"
  );

  const floors = useQuery(
    api.routes.floors.list,
    org ? { organizationId: org._id } : "skip"
  );

  const seedLayout = useMutation(api.seed.seedDefaultLayout);

  if (!org || floors === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const sortedFloors = floors.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <h1 className="text-xl font-semibold mb-6">Admin</h1>

      {floors.length === 0 ? (
        <div className="border border-border rounded-lg p-6 mb-6">
          <h2 className="font-medium mb-1">Set up your practice</h2>
          <p className="text-sm text-muted-foreground mb-4">
            No floors or rooms configured yet. Load the default layout to get started, then
            customize from the floor manager.
          </p>
          <button
            onClick={() => seedLayout({ organizationId: org._id })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Load default layout — 2 floors, 12 rooms
          </button>
        </div>
      ) : (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Floors
          </h2>
          <div className="border border-border rounded-lg divide-y divide-border">
            {sortedFloors.map((floor) => (
              <div key={floor._id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">{floor.name}</p>
                  <p className="text-xs text-muted-foreground">Level {floor.level}</p>
                </div>
                <Link
                  href={`/admin/floors/${floor._id}`}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Edit floor plan
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Team
        </h2>
        <Link
          href="/admin/users"
          className="block border border-border rounded-lg p-4 hover:bg-accent transition-colors"
        >
          <p className="text-sm font-medium">Manage therapists</p>
          <p className="text-xs text-muted-foreground mt-0.5">View roles, set admin access</p>
        </Link>
      </section>
    </div>
  );
}
