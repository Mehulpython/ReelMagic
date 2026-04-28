import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
