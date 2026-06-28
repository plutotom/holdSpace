"use client";

import { useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FloorMap } from "@/components/floor-map/FloorMap";
import { FloorTabs } from "@/components/floor-map/FloorTabs";
import type { Id } from "@/convex/_generated/dataModel";

export default function FloorPage() {
  const { organization } = useOrganization();
  const [selectedFloorId, setSelectedFloorId] = useState<Id<"floors"> | null>(null);

  const org = useQuery(
    api.routes.organizations.getByClerkOrgId,
    organization ? { clerkOrgId: organization.id } : "skip"
  );

  const floors = useQuery(
    api.routes.floors.list,
    org ? { organizationId: org._id } : "skip"
  );

  const sortedFloors = floors?.slice().sort((a, b) => a.order - b.order) ?? [];
  const activeFloor = selectedFloorId
    ? sortedFloors.find((f) => f._id === selectedFloorId)
    : sortedFloors[0];

  if (org === undefined || floors === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-sm">No organization found.</p>
        <p className="text-xs">Make sure you\'re signed in to an org via the switcher above.</p>
      </div>
    );
  }

  if (floors.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-sm">No floors configured yet.</p>
        <a href="/admin" className="text-sm underline hover:text-foreground">
          Set up your practice in Admin →
        </a>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <FloorTabs
        floors={sortedFloors}
        activeFloorId={activeFloor?._id ?? null}
        onSelect={setSelectedFloorId}
      />
      {activeFloor && (
        <FloorMap
          key={activeFloor._id}
          floorId={activeFloor._id}
          organizationId={org._id}
        />
      )}
    </div>
  );
}
