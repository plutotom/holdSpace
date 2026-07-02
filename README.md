# HoldSpace

Real-time therapy room booking. Visual floor map, one-tap room claiming, multi-tenant.

## HoldSpace MVP — Final Scope

HoldSpace MVP — Final Scope
Core pain point: therapists can't tell what rooms are actually available → double-booking, wasted time, hallway-walking.
Solution shape:

Two-way sync between HoldSpace app and Google Calendar — book in either place, stays in sync
Visual floor map + per-room schedule, works on any device (phone, browser)
Ad-hoc "claim this room now" — core feature, not stretch
Admin can set default reservation durations
Multi-org architecture from day 1 (Clerk orgs), even though only Jordie's practice uses it at launch

Explicitly deferred (not MVP):

Race condition handling on simultaneous booking attempts
No-show / auto-release timer
Full Workspace resource integration (Tier 2 from earlier doc) — stretch
SimplePractice / TherapyNotes / other EHR integrations — stretch
MCP server

Dropped/simplified from earlier convo:

No more "personal calendar sync only" as separate v1 tier — GCal sync now works for whoever connects it, Workspace-specific resource stuff pushed fully to stretch
No-show handling cut, was previously "MVP-critical," now deferred — keep flag on this, it's a real problem, just not day-1

This is leaner and sharper than before — good gut check. One thing worth a gut check back: cutting no-show handling means a claimed room can sit "reserved" and empty w/ no automatic recovery. Fine for MVP (admin can just... walk over, or you add manual "free this room" button for admin later), just flagging so it's not forgotten, not missed.

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Initialize Convex

```bash
npx convex dev
```

This creates `convex.json` and `convex/_generated/`. Keep this terminal running alongside `npm run dev`.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable                            | Where to get it             |
| ----------------------------------- | --------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`            | Printed by `npx convex dev` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys  |
| `CLERK_SECRET_KEY`                  | Clerk dashboard → API Keys  |

### 4. Wire up Clerk ↔ Convex JWT

In Clerk dashboard → **JWT Templates** → **New template** → choose **Convex**.
Copy the issuer URL. In Convex dashboard → Settings → Environment Variables:

```
CLERK_JWT_ISSUER_DOMAIN = <issuer URL from Clerk>
```

### 5. Run

```bash
pnpm dev          # Next.js on :4020
npx convex dev    # Convex (separate terminal)
```

### 6. Seed your practice

Sign in, create an org via the Clerk org switcher, then go to `/admin` and click **"Load default layout"**. This creates Floor 1 + Floor 2 with 12 rooms. Customize room names/types from there.

---

## Architecture

```
app/
  (auth)/        Clerk sign-in / sign-up
  (app)/
    floor/       Main floor map (default landing page)
    admin/       Manage floors, rooms, and users
  api/v1/        REST API stubs (EHR + MCP ready, full impl in v2)
convex/
  schema.ts      All table definitions
  routes/        Queries + mutations grouped by domain
  seed.ts        Default layout seeder
components/
  floor-map/     FloorMap, RoomCard, RoomDetailPanel, FloorTabs
  booking/       BookingSheet, AdHocClaimButton
  layout/        Header
```

## Room status

| Color  | Meaning                              |
| ------ | ------------------------------------ |
| Green  | Available                            |
| Red    | In use right now                     |
| Yellow | Reserved within 30 min               |
| Grey   | Not bookable (kitchen, waiting area) |

Status updates in real-time via Convex subscriptions — no page refresh needed.

## REST API

All endpoints live at `/api/v1/`. Auth via `X-API-Key` header. Stubs are in place; full implementation follows once API key management UI is complete.

```
GET    /api/v1/rooms
GET    /api/v1/rooms/:id/schedule
GET    /api/v1/reservations
POST   /api/v1/reservations
GET    /api/v1/reservations/:id
DELETE /api/v1/reservations/:id
```
