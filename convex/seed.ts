import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Admin-triggered mutation to seed a default 2-floor practice layout.
// Idempotent: skips if floors already exist.
export const seedDefaultLayout = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const existingFloors = await ctx.db
      .query("floors")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .first();

    if (existingFloors) return { skipped: true };

    const floor1Id = await ctx.db.insert("floors", {
      organizationId,
      name: "Floor 1",
      level: 1,
      order: 1,
    });

    const floor2Id = await ctx.db.insert("floors", {
      organizationId,
      name: "Floor 2",
      level: 2,
      order: 2,
    });

    // Floor 1: waiting area, kitchen, 3 individual rooms, 1 group room
    const floor1Rooms = [
      { name: "Waiting Area", type: "shared" as const, isBookable: false, xPercent: 2, yPercent: 2, widthPercent: 44, heightPercent: 22 },
      { name: "Kitchen", type: "shared" as const, isBookable: false, xPercent: 54, yPercent: 2, widthPercent: 44, heightPercent: 22 },
      { name: "Room 101", type: "individual" as const, isBookable: true, xPercent: 2, yPercent: 30, widthPercent: 28, heightPercent: 30, defaultDuration: 50 },
      { name: "Room 102", type: "individual" as const, isBookable: true, xPercent: 36, yPercent: 30, widthPercent: 28, heightPercent: 30, defaultDuration: 50 },
      { name: "Room 103", type: "individual" as const, isBookable: true, xPercent: 70, yPercent: 30, widthPercent: 28, heightPercent: 30, defaultDuration: 50 },
      { name: "Group Room A", type: "group" as const, isBookable: true, xPercent: 2, yPercent: 66, widthPercent: 62, heightPercent: 32, defaultDuration: 90 },
    ];

    for (const room of floor1Rooms) {
      await ctx.db.insert("rooms", { organizationId, floorId: floor1Id, ...room });
    }

    // Floor 2: 4 individual rooms, 1 consultation, 1 group room
    const floor2Rooms = [
      { name: "Room 201", type: "individual" as const, isBookable: true, xPercent: 2, yPercent: 2, widthPercent: 28, heightPercent: 30, defaultDuration: 50 },
      { name: "Room 202", type: "individual" as const, isBookable: true, xPercent: 36, yPercent: 2, widthPercent: 28, heightPercent: 30, defaultDuration: 50 },
      { name: "Room 203", type: "individual" as const, isBookable: true, xPercent: 70, yPercent: 2, widthPercent: 28, heightPercent: 30, defaultDuration: 50 },
      { name: "Room 204", type: "individual" as const, isBookable: true, xPercent: 2, yPercent: 38, widthPercent: 28, heightPercent: 30, defaultDuration: 50 },
      { name: "Consultation", type: "consultation" as const, isBookable: true, xPercent: 36, yPercent: 38, widthPercent: 28, heightPercent: 30, defaultDuration: 60 },
      { name: "Group Room B", type: "group" as const, isBookable: true, xPercent: 2, yPercent: 74, widthPercent: 62, heightPercent: 24, defaultDuration: 90 },
    ];

    for (const room of floor2Rooms) {
      await ctx.db.insert("rooms", { organizationId, floorId: floor2Id, ...room });
    }

    return { floor1Id, floor2Id, skipped: false };
  },
});
