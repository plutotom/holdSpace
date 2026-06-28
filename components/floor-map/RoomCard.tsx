"use client";

import { cn, roomStatusConfig, type RoomStatus } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface Room {
  _id: Id<"rooms">;
  name: string;
  type: string;
  isBookable: boolean;
  status: RoomStatus;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}

interface RoomCardProps {
  room: Room;
  isSelected: boolean;
  onClick: () => void;
}

export function RoomCard({ room, isSelected, onClick }: RoomCardProps) {
  const config = roomStatusConfig[room.status];

  return (
    <button
      onClick={onClick}
      disabled={!room.isBookable}
      className={cn(
        "room-card absolute border-2 rounded-md flex flex-col items-start justify-between p-1.5 text-left overflow-hidden",
        config.bg,
        config.border,
        isSelected && "ring-2 ring-primary ring-offset-1",
        room.isBookable
          ? "cursor-pointer hover:opacity-80 active:scale-[0.99]"
          : "cursor-default opacity-70"
      )}
      style={{
        left: `${room.xPercent}%`,
        top: `${room.yPercent}%`,
        width: `${room.widthPercent}%`,
        height: `${room.heightPercent}%`,
      }}
    >
      <span className="text-[11px] font-medium text-foreground leading-tight line-clamp-2">
        {room.name}
      </span>
      {room.isBookable && (
        <div className="flex items-center gap-1">
          <div className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", config.dot)} />
        </div>
      )}
    </button>
  );
}
