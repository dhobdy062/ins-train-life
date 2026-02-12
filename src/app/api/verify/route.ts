import { NextResponse } from "next/server";
import { createToken, verifyToken } from "@/lib/token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/demo", request.url));
  }

  const secret = process.env.VERIFY_HMAC_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/demo", request.url));
  }

  const payload = (() => {
    try {
      return verifyToken(token, secret);
    } catch {
      return null;
    }
  })();
  if (!payload) {
    return NextResponse.redirect(new URL("/demo", request.url));
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const trialIdentityToken = createToken({ email: normalizedEmail }, secret);

  const response = NextResponse.redirect(new URL("/training/start", request.url));
  response.cookies.set("demo_verified", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  });

  response.cookies.set("demo_trial_identity", trialIdentityToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
