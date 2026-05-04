import crypto from "crypto";
import { enqueueWebhookEvent, recordAlert } from "@/lib/convex";
import { notifyOps } from "@/lib/alerting";
import { buildVapiSessionEndWebhookFixture } from "@/test/fixtures/vapi-webhook";
import { POST } from "@/app/api/vapi/webhook/route";

jest.mock("@/lib/convex", () => ({
  enqueueWebhookEvent: jest.fn(),
  recordAlert: jest.fn(),
}));

jest.mock("@/lib/alerting", () => ({
  notifyOps: jest.fn(),
}));

const mockedEnqueueWebhookEvent = enqueueWebhookEvent as jest.MockedFunction<typeof enqueueWebhookEvent>;
const mockedRecordAlert = recordAlert as jest.MockedFunction<typeof recordAlert>;
const mockedNotifyOps = notifyOps as jest.MockedFunction<typeof notifyOps>;

function sign(rawBody: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

describe("POST /api/vapi/webhook", () => {
  const originalSecret = process.env.VAPI_WEBHOOK_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VAPI_WEBHOOK_SECRET = "unit-test-vapi-secret";
    mockedEnqueueWebhookEvent.mockResolvedValue({
      deduped: false,
      eventId: "event_1" as never,
      status: "queued",
    });
    mockedRecordAlert.mockResolvedValue(undefined);
    mockedNotifyOps.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env.VAPI_WEBHOOK_SECRET = originalSecret;
  });

  it("queues a valid signed Vapi webhook payload", async () => {
    const payload = buildVapiSessionEndWebhookFixture();
    const rawBody = JSON.stringify(payload);

    const response = await POST(
      new Request("https://example.test/api/vapi/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vapi-signature": sign(rawBody, "unit-test-vapi-secret"),
        },
        body: rawBody,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, queued: true });
    expect(mockedEnqueueWebhookEvent).toHaveBeenCalledWith({
      provider: "vapi",
      idempotencyKey: "vapi:evt_vapi_smoke_1",
      providerEventId: "evt_vapi_smoke_1",
      payload,
      headers: expect.objectContaining({
        "content-type": "application/json",
        "x-vapi-signature": expect.any(String),
      }),
      receivedAt: expect.any(Number),
    });
  });

  it("returns 400 when the Vapi signature header is missing", async () => {
    const response = await POST(
      new Request("https://example.test/api/vapi/webhook", {
        method: "POST",
        body: JSON.stringify(buildVapiSessionEndWebhookFixture()),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing VAPI webhook signature" });
    expect(mockedEnqueueWebhookEvent).not.toHaveBeenCalled();
  });

  it("returns 401 when the Vapi signature is invalid", async () => {
    const rawBody = JSON.stringify(buildVapiSessionEndWebhookFixture());

    const response = await POST(
      new Request("https://example.test/api/vapi/webhook", {
        method: "POST",
        headers: { "x-vapi-signature": "not-a-valid-signature" },
        body: rawBody,
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid signature" });
    expect(mockedEnqueueWebhookEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when the signed body is not valid JSON", async () => {
    const rawBody = "{";

    const response = await POST(
      new Request("https://example.test/api/vapi/webhook", {
        method: "POST",
        headers: { "x-vapi-signature": sign(rawBody, "unit-test-vapi-secret") },
        body: rawBody,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
    expect(mockedEnqueueWebhookEvent).not.toHaveBeenCalled();
  });

  it("records an alert and notifies ops when Convex enqueue fails", async () => {
    const payload = buildVapiSessionEndWebhookFixture();
    const rawBody = JSON.stringify(payload);
    mockedEnqueueWebhookEvent.mockRejectedValue(new Error("Convex unavailable"));

    const response = await POST(
      new Request("https://example.test/api/vapi/webhook", {
        method: "POST",
        headers: { "x-vapi-signature": sign(rawBody, "unit-test-vapi-secret") },
        body: rawBody,
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Unable to queue event" });
    expect(mockedRecordAlert).toHaveBeenCalledWith({
      source: "api/vapi/webhook",
      severity: "critical",
      message: "Convex unavailable",
    });
    expect(mockedNotifyOps).toHaveBeenCalledWith("VAPI webhook ingestion failed", {
      message: "Convex unavailable",
      providerEventId: "evt_vapi_smoke_1",
    });
  });
});
