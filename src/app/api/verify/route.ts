import { NextResponse } from "next/server";
import { createToken, verifyToken } from "@/lib/token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const invalidRedirectUrl = new URL("/demo?state=invalid-link", request.url);

  if (!token) {
    return NextResponse.redirect(invalidRedirectUrl);
  }

  const secret = process.env.VERIFY_HMAC_SECRET;
  if (!secret) {
    return NextResponse.redirect(invalidRedirectUrl);
  }

  const payload = (() => {
    try {
      return verifyToken(token, secret);
    } catch {
      return null;
    }
  })();
  if (!payload) {
    return NextResponse.redirect(invalidRedirectUrl);
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const trialIdentityToken = createToken({ email: normalizedEmail }, secret);

  const response = NextResponse.redirect(new URL("/demo?state=verified", request.url));
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
