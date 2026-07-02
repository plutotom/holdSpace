import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { isSuperuserClerkId } from "@/lib/superuser";
import { getAuthenticatedConvexClient } from "@/lib/convex-server";

export async function POST() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const superuser = isSuperuserClerkId(userId, process.env.SUPERUSER_CLERK_IDS);
  if (!superuser && orgRole !== "org:admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authClient = await getAuthenticatedConvexClient();
  if (!authClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await authClient.convex.query(api.routes.organizations.getByClerkOrgId, {
    clerkOrgId: orgId,
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  try {
    await authClient.convex.action(api.routes.googlePublic.provisionCalendars, {
      organizationId: org._id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Provision failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const authClient = await getAuthenticatedConvexClient();
  if (!authClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, orgId, orgRole } = await auth();
  const superuser = isSuperuserClerkId(userId, process.env.SUPERUSER_CLERK_IDS);
  if (!superuser && orgRole !== "org:admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await authClient.convex.query(api.routes.organizations.getByClerkOrgId, {
    clerkOrgId: orgId!,
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  await authClient.convex.mutation(api.routes.organizations.disconnectGoogle, {
    organizationId: org._id,
  });

  return NextResponse.json({ ok: true });
}
