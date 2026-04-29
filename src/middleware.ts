import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { getMiddlewareCacheHeaders } from "@/lib/cdn";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/templates",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/templates(.*)",
  "/api/health",
  // Webhooks use signature-based auth (not Clerk session)
  "/api/webhooks/stripe(.*)",
  "/api/webhooks/clerk(.*)",
  // Public share pages (no auth required)
  "/watch/(.*)",
  "/api/share/(.*)",
  // Analytics events endpoint (anonymous tracking allowed)
  "/api/analytics/events(.*)",
]);

// Routes that benefit from CDN cache headers
const isCacheableRoute = createRouteMatcher([
  "/watch/(.*)",
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }

  // Inject CDN cache headers for share/watch pages
  if (isCacheableRoute(request)) {
    const response = NextResponse.next();
    const cacheHeaders = getMiddlewareCacheHeaders(300); // 5 min s-maxage
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
