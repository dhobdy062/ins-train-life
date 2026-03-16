import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/demo(.*)",
  "/workspace/dashboard(.*)",
  "/dashboard/admin(.*)",
  "/dashboard/trainee(.*)",
  "/dashboard/trainer(.*)",
  "/api/billing/portal(.*)",
  "/api/checkout(.*)",
  "/api/trainee/results(.*)",
  "/api/trainer(.*)",
  "/api/vapi/session/start(.*)",
  "/api/vapi/trainee/session/start(.*)",
  "/api/training/session(.*)",
  "/api/email/sequence(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
