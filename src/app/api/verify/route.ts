import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/token";

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

  const payload = verifyToken(token, secret);
  if (!payload) {
    return NextResponse.redirect(new URL("/demo", request.url));
  }

  const response = NextResponse.redirect(new URL("/demo", request.url));
  response.cookies.set("demo_verified", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
