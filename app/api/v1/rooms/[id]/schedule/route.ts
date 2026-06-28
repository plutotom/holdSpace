import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // TODO: fetch schedule from Convex for the given room + date query param
  return NextResponse.json({ roomId: id, schedule: [], note: "stub" }, { status: 200 });
}
