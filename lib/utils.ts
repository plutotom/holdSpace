import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type RoomStatus = "available" | "in_use" | "reserved_soon" | "not_bookable";

export const roomStatusConfig: Record<
  RoomStatus,
  { label: string; bg: string; border: string; dot: string }
> = {
  available: {
    label: "Available",
    bg: "bg-green-50 dark:bg-green-950",
    border: "border-green-400 dark:border-green-600",
    dot: "bg-green-500",
  },
  in_use: {
    label: "In Use",
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-400 dark:border-red-600",
    dot: "bg-red-500",
  },
  reserved_soon: {
    label: "Reserved Soon",
    bg: "bg-yellow-50 dark:bg-yellow-950",
    border: "border-yellow-400 dark:border-yellow-600",
    dot: "bg-yellow-500",
  },
  not_bookable: {
    label: "Not Bookable",
    bg: "bg-zinc-100 dark:bg-zinc-900",
    border: "border-zinc-300 dark:border-zinc-700",
    dot: "bg-zinc-400",
  },
};

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
