"use client";

import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface Floor {
  _id: Id<"floors">;
  name: string;
  level: number;
}

interface FloorTabsProps {
  floors: Floor[];
  activeFloorId: Id<"floors"> | null;
  onSelect: (id: Id<"floors">) => void;
}

export function FloorTabs({ floors, activeFloorId, onSelect }: FloorTabsProps) {
  return (
    <div className="flex items-center gap-1 px-4 h-10 border-b border-border bg-background flex-shrink-0">
      {floors.map((floor) => (
        <button
          key={floor._id}
          onClick={() => onSelect(floor._id)}
          className={cn(
            "px-4 py-1 text-sm rounded-md transition-colors",
            activeFloorId === floor._id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          {floor.name}
        </button>
      ))}
    </div>
  );
}
