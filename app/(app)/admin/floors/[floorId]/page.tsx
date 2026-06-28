"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

const ROOM_TYPE_LABELS = {
  individual: "Individual",
  group: "Group",
  consultation: "Consultation",
  shared: "Shared",
};

interface Props {
  params: Promise<{ floorId: string }>;
}

export default function FloorAdminPage({ params }: Props) {
  const { floorId } = use(params);
  const { organization } = useOrganization();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const org = useConvexQuery(
    api.routes.organizations.getByClerkOrgId,
    organization ? { clerkOrgId: organization.id } : "skip"
  );

  const rooms = useQuery(api.routes.rooms.listByFloor, {
    floorId: floorId as Id<"floors">,
  });

  const removeRoom = useMutation(api.routes.rooms.remove);
  const updateRoom = useMutation(api.routes.rooms.update);

  if (!rooms) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Admin
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold">Rooms</h1>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border">
        {rooms.map((room) => (
          <div key={room._id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{room.name}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {ROOM_TYPE_LABELS[room.type]}
                  {room.defaultDuration ? ` · ${room.defaultDuration}m default` : ""}
                  {!room.isBookable ? " · not bookable" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    updateRoom({
                      roomId: room._id,
                      isBookable: !room.isBookable,
                    })
                  }
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  {room.isBookable ? "Disable" : "Enable"}
                </button>
                {confirmDelete === room._id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        removeRoom({ roomId: room._id });
                        setConfirmDelete(null);
                      }}
                      className="text-xs text-destructive font-medium"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(room._id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {rooms.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No rooms on this floor.</p>
        )}
      </div>
    </div>
  );
}
