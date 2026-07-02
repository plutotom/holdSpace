import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceState = request.headers.get("x-goog-resource-state");

  if (!channelId) {
    return new NextResponse(null, { status: 400 });
  }

  if (resourceState === "sync") {
    return new NextResponse(null, { status: 200 });
  }

  await convex.action(api.routes.googlePublic.reconcileFromWebhook, {
    channelId,
  });

  return new NextResponse(null, { status: 200 });
}
