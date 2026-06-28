# HoldSpace — Agent Instructions

## What This Is

Therapy room booking web app. Real-time floor map, room reservations, multi-tenant via Clerk orgs.

## Stack

- **Frontend**: Next.js 15 App Router
- **Backend/DB**: Convex (real-time subscriptions power live floor map)
- **Auth**: Clerk (multi-tenant orgs, role-based access)
- **Styling**: Tailwind CSS v3 + Radix UI primitives
- **Deployment**: Vercel

## Convex Conventions

- `convex/schema.ts` — schema root
- `convex/routes/<feature>.ts` — queries, mutations, actions grouped by domain
- Every table carries `organizationId` — enforce in every query, no cross-org leakage
- Generated files live in `convex/_generated/` (auto-created by `npx convex dev`, never edit)

## Key Domain Concepts

- **Room status** — computed real-time: `available` / `in_use` / `reserved_soon` / `not_bookable`
- **Ad-hoc claim** — one-tap "claim now" with auto-release after N minutes if no check-in
- **Planned booking** — select room → date → time → duration → confirm
- **Conflict detection** — enforced in Convex mutation before insert

## File Structure

```
app/
  (auth)/            sign-in, sign-up (Clerk hosted UI)
  (app)/             authenticated routes
    floor/           floor map — the main screen
    admin/           admin controls (floors, rooms, users)
  api/v1/            REST API (API key auth, EHR-ready stubs)
components/
  floor-map/         FloorMap, RoomCard, RoomDetailPanel, FloorTabs
  booking/           BookingSheet, AdHocClaimButton
  layout/            Header
convex/
  schema.ts
  routes/            one file per domain
  seed.ts            admin-triggered default layout seeder
lib/
  utils.ts           cn(), roomStatusConfig, formatters
```

## Local Setup

```bash
npm install
npx convex dev      # creates convex.json, generates _generated/
npm run dev
```

Set env vars from `.env.example`. In Clerk dashboard → JWT Templates → create Convex template (issuer = your Convex deployment URL).

After first login, go to `/admin` and click "Load default layout" to seed floors and rooms.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
