import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    defaultSessionDurations: v.array(v.number()),
    adHocReleaseMinutes: v.number(),
  })
    .index("by_clerk_org_id", ["clerkOrgId"])
    .index("by_slug", ["slug"]),

  floors: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    level: v.number(),
    order: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_and_level", ["organizationId", "level"]),

  rooms: defineTable({
    organizationId: v.id("organizations"),
    floorId: v.id("floors"),
    name: v.string(),
    type: v.union(
      v.literal("individual"),
      v.literal("group"),
      v.literal("consultation"),
      v.literal("shared")
    ),
    isBookable: v.boolean(),
    xPercent: v.number(),
    yPercent: v.number(),
    widthPercent: v.number(),
    heightPercent: v.number(),
    defaultDuration: v.optional(v.number()),
    adHocReleaseMinutes: v.optional(v.number()),
    description: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_floor", ["floorId"])
    .index("by_org_and_floor", ["organizationId", "floorId"]),

  reservations: defineTable({
    organizationId: v.id("organizations"),
    roomId: v.id("rooms"),
    userId: v.id("users"),
    startTime: v.number(),
    endTime: v.number(),
    isAdHoc: v.boolean(),
    status: v.union(
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("canceled"),
      v.literal("auto_released")
    ),
    googleCalendarEventId: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_room_and_time", ["roomId", "startTime"])
    .index("by_org_and_time", ["organizationId", "startTime"]),

  users: defineTable({
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("therapist"), v.literal("admin")),
    googleCalendarConnected: v.boolean(),
    googleRefreshToken: v.optional(v.string()),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_organization", ["organizationId"])
    .index("by_org_and_clerk", ["organizationId", "clerkUserId"]),

  webhooks: defineTable({
    organizationId: v.id("organizations"),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.string(),
    isActive: v.boolean(),
  }).index("by_organization", ["organizationId"]),

  apiKeys: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    keyHash: v.string(),
    lastUsed: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_key_hash", ["keyHash"]),
});
