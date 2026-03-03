import crypto from "crypto";

const DEFAULT_IP_HASH_SECRET = "dev-ip-hash-salt";

function getIpHashSecret() {
  return process.env.IP_HASH_SECRET || process.env.VERIFY_HMAC_SECRET || DEFAULT_IP_HASH_SECRET;
}

function toSha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function hashInviteToken(token: string) {
  return toSha256Hex(token.trim());
}

export function hashIpAddress(ipAddress: string) {
  const secret = getIpHashSecret();
  return crypto.createHmac("sha256", secret).update(ipAddress.trim()).digest("hex");
}

export function maskIpAddress(ipAddress: string) {
  const normalized = ipAddress.trim();
  if (!normalized) {
    return "";
  }

  if (normalized.includes(".")) {
    const octets = normalized.split(".");
    if (octets.length === 4) {
      return `${octets[0]}.${octets[1]}.${octets[2]}.x`;
    }
  }

  if (normalized.includes(":")) {
    const hextets = normalized.split(":").filter((part) => part.length > 0);
    if (hextets.length >= 2) {
      return `${hextets.slice(0, 2).join(":")}::`;
    }
  }

  return "redacted";
}

export function getRequestIpAddress(request: Request) {
  const candidates = [
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
    request.headers.get("cf-connecting-ip"),
    request.headers.get("fly-client-ip"),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const value = candidate
      .split(",")
      .map((segment) => segment.trim())
      .find((segment) => segment.length > 0);

    if (value) {
      return value;
    }
  }

  return null;
}
