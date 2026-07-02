import type { Id } from "@/convex/_generated/dataModel";

interface ReservationActor {
  _id: Id<"users">;
  role: "admin" | "member";
}

interface ActiveReservation {
  userId: Id<"users">;
  status: string;
}

export function canFreeRoom(
  actor: ReservationActor | null | undefined,
  reservation: ActiveReservation | null | undefined
): boolean {
  if (!actor || !reservation) return false;
  if (reservation.status !== "confirmed" && reservation.status !== "in_progress") {
    return false;
  }
  return actor.role === "admin" || actor._id === reservation.userId;
}
