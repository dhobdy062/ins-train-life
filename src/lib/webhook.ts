import crypto from "crypto";

export function parseJsonSafe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function buildIdempotencyKey(provider: "stripe" | "vapi", providerEventId: string | undefined, rawBody: string) {
  if (providerEventId) {
    return `${provider}:${providerEventId}`;
  }

  const digest = crypto.createHash("sha256").update(rawBody).digest("hex");
  return `${provider}:sha256:${digest}`;
}

export function extractVapiSignature(headers: Headers) {
  return (
    headers.get("x-vapi-signature") ||
    headers.get("x-vapi-signature-256") ||
    headers.get("x-vapi-hmac-signature") ||
    headers.get("vapi-signature")
  );
}

export function verifyVapiSignature(rawBody: string, signature: string, secret: string) {
  const expectedHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const normalized = signature.replace(/^sha256=/i, "").trim();

  const provided = Buffer.from(normalized, "utf8");
  const expected = Buffer.from(expectedHex, "utf8");

  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expected);
}

export function toHeaderRecord(headers: Headers) {
  const record: Record<string, string> = {};

  for (const [key, value] of headers.entries()) {
    record[key] = value;
  }

  return record;
}
