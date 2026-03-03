import crypto from "crypto";
import type { NextResponse } from "next/server";

export const TRAINEE_SESSION_COOKIE_NAME = "trainee_session";
const DEFAULT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days
const DEV_SECRET = "dev-trainee-session-secret-change-me";

export type TraineeSessionCookiePayload = {
  traineeId: string;
  orgId: string;
  trainerId: string;
  issuedAt: number;
  exp: number;
};

export type CreateTraineeSessionCookieArgs = {
  traineeId: string;
  orgId: string;
  trainerId: string;
  maxAgeSeconds?: number;
};

function base64UrlEncode(input: Buffer) {
  return input.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64");
}

function getCookieSecret() {
  const secret = process.env.TRAINEE_SESSION_SECRET ?? process.env.VERIFY_HMAC_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_SECRET;
  }

  throw new Error("Missing TRAINEE_SESSION_SECRET or VERIFY_HMAC_SECRET");
}

function signPayload(encodedPayload: string) {
  return crypto.createHmac("sha256", getCookieSecret()).update(encodedPayload).digest();
}

export function createTraineeSessionCookie(args: CreateTraineeSessionCookieArgs) {
  const now = Date.now();
  const maxAgeSeconds = Math.max(60, args.maxAgeSeconds ?? DEFAULT_COOKIE_MAX_AGE_SECONDS);
  const payload: TraineeSessionCookiePayload = {
    traineeId: args.traineeId,
    orgId: args.orgId,
    trainerId: args.trainerId,
    issuedAt: now,
    exp: now + maxAgeSeconds * 1000,
  };

  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const signature = base64UrlEncode(signPayload(encodedPayload));
  return `${encodedPayload}.${signature}`;
}

export function verifyTraineeSessionCookie(token: string | null | undefined): TraineeSessionCookiePayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  let providedSignature: Buffer;
  try {
    providedSignature = base64UrlDecode(encodedSignature);
  } catch {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  if (providedSignature.length !== expectedSignature.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(providedSignature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as TraineeSessionCookiePayload;
    if (
      !payload ||
      typeof payload.traineeId !== "string" ||
      typeof payload.orgId !== "string" ||
      typeof payload.trainerId !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function setTraineeSessionCookie(
  response: NextResponse,
  args: CreateTraineeSessionCookieArgs,
  maxAgeSeconds?: number,
) {
  const token = createTraineeSessionCookie({ ...args, maxAgeSeconds });
  response.cookies.set(TRAINEE_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds ?? DEFAULT_COOKIE_MAX_AGE_SECONDS,
  });
}
