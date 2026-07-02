import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { appRoleToClerkOrgRole, type AppRole } from "@/lib/roles";
import { isSuperuserClerkId } from "@/lib/superuser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: actorId, orgId, orgRole } = await auth();
  const { userId } = await params;

  if (!actorId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const superuser = isSuperuserClerkId(actorId, process.env.SUPERUSER_CLERK_IDS);
  if (!superuser && orgRole !== "org:admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { role?: AppRole };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.role !== "admin" && body.role !== "member") {
    return NextResponse.json({ error: "role must be admin or member" }, { status: 400 });
  }

  const convexUserId = userId as Id<"users">;
  const target = await convex.query(api.routes.users.getById, { userId: convexUserId });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const org = await convex.query(api.routes.organizations.getByClerkOrgId, {
    clerkOrgId: orgId,
  });
  if (!org || target.organizationId !== org._id) {
    return NextResponse.json({ error: "User not in this organization" }, { status: 404 });
  }

  try {
    const clerkRole = appRoleToClerkOrgRole(body.role);
    const client = await clerkClient();
    await client.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId: target.clerkUserId,
      role: clerkRole,
    });

    await convex.mutation(api.routes.users.setRole, {
      userId: convexUserId,
      role: body.role,
    });

    return NextResponse.json({ userId: convexUserId, role: body.role });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Role update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
