"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RoomCard } from "./RoomCard";
import { RoomDetailPanel } from "./RoomDetailPanel";
import type { Id } from "@/convex/_generated/dataModel";

interface FloorMapProps {
  floorId: Id<"floors">;
  organizationId: Id<"organizations">;
}

const LEGEND = [
  { dot: "bg-green-500", label: "Available" },
  { dot: "bg-red-500", label: "In Use" },
  { dot: "bg-yellow-500", label: "Reserved Soon" },
  { dot: "bg-zinc-400", label: "Not Bookable" },
];

export function FloorMap({ floorId, organizationId }: FloorMapProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<Id<"rooms"> | null>(null);

  const rooms = useQuery(api.routes.rooms.getRoomsWithStatus, {
    floorId,
    organizationId,
  });

  const selectedRoom = rooms?.find((r) => r._id === selectedRoomId) ?? null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Map canvas */}
      <div className="flex-1 p-4 overflow-auto flex flex-col">
        {/* 3:2 aspect ratio container */}
        <div className="relative w-full rounded-lg border border-border bg-muted/20" style={{ paddingTop: "66.67%" }}>
          <div className="absolute inset-0 p-1">
            {rooms?.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                isSelected={room._id === selectedRoomId}
                onClick={() =>
                  setSelectedRoomId(room._id === selectedRoomId ? null : room._id)
                }
              />
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-5 mt-3">
          {LEGEND.map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${dot}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selectedRoom && (
        <RoomDetailPanel
          room={selectedRoom}
          organizationId={organizationId}
          onClose={() => setSelectedRoomId(null)}
        />
      )}
    </div>
  );
}
