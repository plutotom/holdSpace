import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isSuperuserClerkId } from "@/lib/superuser";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/v1(.*)",
  "/api/google/webhook(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  const { userId, orgId } = await auth.protect();
  const superuser = isSuperuserClerkId(userId, process.env.SUPERUSER_CLERK_IDS);

  if (isOnboardingRoute(request)) {
    if (orgId) {
      return NextResponse.redirect(new URL("/floor", request.url));
    }
    return;
  }

  if (!orgId && !superuser) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (isAdminRoute(request) && !superuser) {
    await auth.protect((has) => has({ role: "org:admin" }));
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
