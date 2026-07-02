import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeCodeForTokens,
  fetchGoogleUserEmail,
} from "@/lib/google/oauth";
import { encryptToken } from "@/lib/google/encryption";
import { getAuthenticatedConvexClient } from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4020";

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/admin/integrations?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/admin/integrations?error=missing_code`);
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!stateCookie) {
    return NextResponse.redirect(`${appUrl}/admin/integrations?error=invalid_state`);
  }

  let parsedState: { orgId: string; nonce: string };
  let parsedCookie: { orgId: string; nonce: string };
  try {
    parsedState = JSON.parse(Buffer.from(state, "base64url").toString());
    parsedCookie = JSON.parse(stateCookie);
  } catch {
    return NextResponse.redirect(`${appUrl}/admin/integrations?error=invalid_state`);
  }

  if (parsedState.nonce !== parsedCookie.nonce || parsedState.orgId !== parsedCookie.orgId) {
    return NextResponse.redirect(`${appUrl}/admin/integrations?error=invalid_state`);
  }

  const authClient = await getAuthenticatedConvexClient();
  if (!authClient || authClient.orgId !== parsedState.orgId) {
    return NextResponse.redirect(`${appUrl}/admin/integrations?error=unauthorized`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const encryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;

  if (!clientId || !clientSecret || !encryptionKey) {
    return NextResponse.redirect(`${appUrl}/admin/integrations?error=not_configured`);
  }

  try {
    const redirectUri = `${appUrl}/api/google/oauth/callback`;
    const tokens = await exchangeCodeForTokens({
      code,
      clientId,
      clientSecret,
      redirectUri,
    });

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${appUrl}/admin/integrations?error=no_refresh_token`
      );
    }

    const email = await fetchGoogleUserEmail(tokens.access_token);
    const encryptedRefreshToken = await encryptToken(tokens.refresh_token, encryptionKey);
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    const org = await authClient.convex.query(api.routes.organizations.getByClerkOrgId, {
      clerkOrgId: authClient.orgId,
    });
    if (!org) {
      return NextResponse.redirect(`${appUrl}/admin/integrations?error=org_not_found`);
    }

    await authClient.convex.mutation(api.routes.organizations.setGoogleTokens, {
      organizationId: org._id,
      encryptedRefreshToken,
      googleTokenExpiresAt: expiresAt,
      googleConnectedEmail: email,
    });

    return NextResponse.redirect(`${appUrl}/admin/integrations?connected=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(
      `${appUrl}/admin/integrations?error=${encodeURIComponent(message)}`
    );
  }
}
