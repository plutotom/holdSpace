import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ reservations: [], note: "stub" }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // TODO: validate body, resolve org from API key, call Convex reservation.create
  return NextResponse.json({ note: "stub", received: body }, { status: 501 });
}
