import { Resend } from "resend";

export function getEmailClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return new Resend(key);
}

export function getFromAddress() {
  return process.env.EMAIL_FROM || "cream@support.retrospxt.com";
}

export function getAppUrl() {
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    return appUrl;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing APP_URL");
  }

  return "http://localhost:3000";
}
