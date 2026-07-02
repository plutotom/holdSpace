"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { formatConvexError } from "@/lib/convex-error";
import type { Id } from "@/convex/_generated/dataModel";

const DURATION_OPTIONS = [50, 60, 90];

interface BookingSheetProps {
  open: boolean;
  onClose: () => void;
  roomId: Id<"rooms">;
  roomName: string;
  organizationId: Id<"organizations">;
  defaultDuration: number;
}

export function BookingSheet({
  open,
  onClose,
  roomId,
  roomName,
  organizationId,
  defaultDuration,
}: BookingSheetProps) {
  const { user } = useUser();
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(defaultDuration);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const convexUser = useQuery(
    api.routes.users.getByClerkId,
    user ? { clerkUserId: user.id, organizationId } : "skip"
  );

  const createReservation = useMutation(api.routes.reservations.create);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!convexUser) return;
    setLoading(true);
    setError(null);

    const startTime = new Date(`${date}T${time}`).getTime();
    const endTime = startTime + duration * 60 * 1000;

    try {
      await createReservation({
        organizationId,
        roomId,
        userId: convexUser._id,
        startTime,
        endTime,
        isAdHoc: false,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (e) {
      setError(formatConvexError(e));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-6 animate-slide-in-from-bottom-4 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">Book {roomName}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <p className="text-green-600 dark:text-green-400 font-medium">Booked!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date</label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Duration</label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2 rounded-md text-sm border transition-colors ${
                      duration === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || !convexUser}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Booking..." : "Confirm booking"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
