"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RoomCard } from "./RoomCard";
import { RoomDetailPanel } from "./RoomDetailPanel";
import { FloorMapCanvas } from "./FloorMapCanvas";
import { DEFAULT_ASPECT_RATIO, DEFAULT_BACKGROUND_OPACITY } from "@/lib/floor-plan/geometry";
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

  const floor = useQuery(api.routes.floors.get, { floorId });
  const rooms = useQuery(api.routes.rooms.getRoomsWithStatus, {
    floorId,
    organizationId,
  });

  const selectedRoom = rooms?.find((r) => r._id === selectedRoomId) ?? null;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 p-4 overflow-auto flex flex-col">
        <FloorMapCanvas
          aspectRatio={floor?.canvasAspectRatio ?? DEFAULT_ASPECT_RATIO}
          backgroundUrl={floor?.backgroundUrl}
          backgroundOpacity={floor?.backgroundOpacity ?? DEFAULT_BACKGROUND_OPACITY}
        >
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
        </FloorMapCanvas>

        <div className="flex items-center gap-5 mt-3">
          {LEGEND.map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${dot}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

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
