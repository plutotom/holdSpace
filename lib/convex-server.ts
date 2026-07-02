import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

export async function getAuthenticatedConvexClient(): Promise<{
  convex: ConvexHttpClient;
  userId: string;
  orgId: string;
} | null> {
  const { userId, orgId, getToken } = await auth();
  if (!userId || !orgId) return null;

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const token = await getToken({ template: "convex" });
  if (token) convex.setAuth(token);

  return { convex, userId, orgId };
}
