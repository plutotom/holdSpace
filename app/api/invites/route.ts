import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isSuperuserClerkId } from "@/lib/superuser";

export async function POST(request: Request) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const superuser = isSuperuserClerkId(userId, process.env.SUPERUSER_CLERK_IDS);
  if (!superuser && orgRole !== "org:admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { emailAddress?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emailAddress = body.emailAddress?.trim();
  if (!emailAddress) {
    return NextResponse.json({ error: "emailAddress required" }, { status: 400 });
  }

  try {
    const invitation = await (await clerkClient()).organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress,
      role: "org:member",
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`,
    });

    return NextResponse.json({ invitationId: invitation.id, status: invitation.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invite failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
