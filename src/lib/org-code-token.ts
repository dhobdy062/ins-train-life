import crypto from "crypto";

type OrgCodeTokenPayload = {
  orgId: string;
  exp: number;
};

function secret() {
  return process.env.ORG_CODE_TOKEN_SECRET || process.env.CLERK_SECRET_KEY || "dev-org-code-secret";
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createOrgCodeToken(orgId: string, ttlMs = 15 * 60 * 1000) {
  const payload = encode(JSON.stringify({ orgId, exp: Date.now() + ttlMs } satisfies OrgCodeTokenPayload));
  return `${payload}.${sign(payload)}`;
}

export function verifyOrgCodeToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OrgCodeTokenPayload;
    if (!parsed.orgId || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
