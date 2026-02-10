import { POST as stripeWebhookHandler } from "@/app/api/stripe/webhook/route";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

export async function POST(request: Request) {
  const response = await stripeWebhookHandler(request);
  response.headers.set("x-deprecated-endpoint", "/api/webhook is deprecated; use /api/stripe/webhook");
  return response;
}
