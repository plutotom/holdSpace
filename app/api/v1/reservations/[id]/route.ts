import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ id, note: "stub" }, { status: 200 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // TODO: cancel reservation via Convex
  return NextResponse.json({ id, canceled: true, note: "stub" }, { status: 200 });
}
