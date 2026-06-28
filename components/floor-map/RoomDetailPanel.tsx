"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BookingSheet } from "@/components/booking/BookingSheet";
import { AdHocClaimButton } from "@/components/booking/AdHocClaimButton";
import { formatTime, roomStatusConfig, type RoomStatus } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface ActiveReservation {
  startTime: number;
  endTime: number;
  userName: string;
}

interface Room {
  _id: Id<"rooms">;
  name: string;
  type: string;
  status: RoomStatus;
  isBookable: boolean;
  defaultDuration?: number;
  activeReservation: ActiveReservation | null;
}

interface RoomDetailPanelProps {
  room: Room;
  organizationId: Id<"organizations">;
  onClose: () => void;
}

export function RoomDetailPanel({ room, organizationId, onClose }: RoomDetailPanelProps) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const config = roomStatusConfig[room.status];
  const today = new Date().toISOString().split("T")[0];

  const schedule = useQuery(api.routes.reservations.getSchedule, {
    roomId: room._id,
    date: today,
    organizationId,
  });

  return (
    <>
      <div className="w-72 border-l border-border bg-background flex flex-col h-full flex-shrink-0 animate-slide-in-from-right-4">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">{room.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`h-2 w-2 rounded-full ${config.dot}`} />
              <span className="text-xs text-muted-foreground">{config.label}</span>
            </div>
            <span className="text-xs text-muted-foreground capitalize mt-0.5 block">
              {room.type}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Active reservation banner */}
        {room.activeReservation && (
          <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-xs font-medium text-red-700 dark:text-red-300">Currently in use</p>
            <p className="text-sm font-medium text-foreground mt-0.5">
              {room.activeReservation.userName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTime(room.activeReservation.startTime)}
              {" – "}
              {formatTime(room.activeReservation.endTime)}
            </p>
          </div>
        )}

        {/* Actions */}
        {room.isBookable && room.status === "available" && (
          <div className="p-4 flex flex-col gap-2">
            <AdHocClaimButton
              roomId={room._id}
              organizationId={organizationId}
              defaultDuration={room.defaultDuration ?? 50}
            />
            <button
              onClick={() => setBookingOpen(true)}
              className="w-full py-2 px-3 border border-border rounded-md text-sm hover:bg-accent transition-colors"
            >
              Schedule for later
            </button>
          </div>
        )}

        {room.isBookable && room.status === "in_use" && (
          <div className="p-4">
            <button
              onClick={() => setBookingOpen(true)}
              className="w-full py-2 px-3 border border-border rounded-md text-sm hover:bg-accent transition-colors"
            >
              Schedule for later
            </button>
          </div>
        )}

        {/* Today's schedule */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Today
          </h3>
          {!schedule ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : schedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reservations today</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {schedule
                .slice()
                .sort((a, b) => a.startTime - b.startTime)
                .map((res) => (
                  <div key={res._id} className="p-2.5 bg-muted rounded-md">
                    <p className="text-sm font-medium">{res.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(res.startTime)} – {formatTime(res.endTime)}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <BookingSheet
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        roomId={room._id}
        roomName={room.name}
        organizationId={organizationId}
        defaultDuration={room.defaultDuration ?? 50}
      />
    </>
  );
}
