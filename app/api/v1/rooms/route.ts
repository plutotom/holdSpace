import { NextRequest, NextResponse } from "next/server";

// REST API — EHR/MCP ready. Auth via X-API-Key header (resolved to org).
// Full implementation in v2 once API key management UI is wired up.

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized", hint: "Pass X-API-Key header" }, { status: 401 });
  }
  // TODO: validate apiKey against Convex apiKeys table, resolve organizationId
  return NextResponse.json(
    { error: "API key validation not yet implemented" },
    { status: 501 }
  );
}
