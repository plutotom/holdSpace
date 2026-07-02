import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { buildGoogleAuthUrl } from "@/lib/google/oauth";
import { isSuperuserClerkId } from "@/lib/superuser";

const STATE_COOKIE = "google_oauth_state";

export async function GET() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const superuser = isSuperuserClerkId(userId, process.env.SUPERUSER_CLERK_IDS);
  if (!superuser && orgRole !== "org:admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !appUrl) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
  }

  const nonce = randomBytes(16).toString("hex");
  const state = Buffer.from(JSON.stringify({ orgId, nonce })).toString("base64url");

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, JSON.stringify({ nonce, orgId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${appUrl}/api/google/oauth/callback`;
  const url = buildGoogleAuthUrl({ clientId, redirectUri, state });

  return NextResponse.redirect(url);
}
