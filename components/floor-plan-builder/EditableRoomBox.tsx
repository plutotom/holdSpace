"use client";

import { cn } from "@/lib/utils";
import type { PercentRect } from "@/lib/floor-plan/geometry";
import type { Id } from "@/convex/_generated/dataModel";

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export interface BuilderRoom {
  _id: Id<"rooms">;
  name: string;
  type: string;
  isBookable: boolean;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}

interface EditableRoomBoxProps {
  room: BuilderRoom;
  isSelected: boolean;
  hasOverlap: boolean;
  onSelect: () => void;
  onPointerDownMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (
    handle: ResizeHandle,
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
}

const HANDLE_POSITION: Record<ResizeHandle, string> = {
  nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
};

export function EditableRoomBox({
  room,
  isSelected,
  hasOverlap,
  onSelect,
  onPointerDownMove,
  onResizePointerDown,
}: EditableRoomBoxProps) {
  return (
    <div
      className={cn(
        "absolute border-2 rounded-md flex flex-col justify-between p-1.5 text-left overflow-hidden transition-shadow",
        room.isBookable
          ? "bg-primary/10 border-primary/50"
          : "bg-muted border-border",
        isSelected && "ring-2 ring-primary ring-offset-1 z-20",
        hasOverlap && "border-amber-500 bg-amber-50/80 dark:bg-amber-950/40"
      )}
      style={{
        left: `${room.xPercent}%`,
        top: `${room.yPercent}%`,
        width: `${room.widthPercent}%`,
        height: `${room.heightPercent}%`,
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
        onPointerDownMove(event);
      }}
    >
      <span className="text-[11px] font-medium text-foreground leading-tight line-clamp-2 pointer-events-none">
        {room.name}
      </span>
      <span className="text-[10px] text-muted-foreground capitalize pointer-events-none">
        {room.type}
      </span>

      {isSelected &&
        (Object.keys(HANDLE_POSITION) as ResizeHandle[]).map((handle) => (
          <div
            key={handle}
            className={cn(
              "absolute h-2.5 w-2.5 rounded-full bg-primary border border-background z-30",
              HANDLE_POSITION[handle]
            )}
            onPointerDown={(event) => {
              event.stopPropagation();
              onResizePointerDown(handle, event);
            }}
          />
        ))}
    </div>
  );
}

export function DraftRoomBox({ rect }: { rect: PercentRect }) {
  return (
    <div
      className="absolute border-2 border-dashed border-primary bg-primary/10 rounded-md pointer-events-none z-10"
      style={{
        left: `${rect.xPercent}%`,
        top: `${rect.yPercent}%`,
        width: `${rect.widthPercent}%`,
        height: `${rect.heightPercent}%`,
      }}
    />
  );
}
