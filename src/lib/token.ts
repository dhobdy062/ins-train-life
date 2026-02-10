import crypto from "crypto";

type TokenPayload = {
  email: string;
  name?: string;
  agency?: string;
  policyType?: string;
  exp: number;
};

function base64UrlEncode(input: Buffer) {
  return input.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64");
}

export function createToken(payload: Omit<TokenPayload, "exp">, secret: string) {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24,
  };
  const encoded = base64UrlEncode(Buffer.from(JSON.stringify(fullPayload), "utf8"));
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest();

  return `${encoded}.${base64UrlEncode(signature)}`;
}

export function verifyToken(token: string, secret: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = crypto.createHmac("sha256", secret).update(encoded).digest();
  const expectedSignature = base64UrlEncode(expected);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encoded).toString("utf8")) as TokenPayload;
  if (!payload.exp || Date.now() > payload.exp) {
    return null;
  }

  return payload;
}
