import { Resend } from "resend";

export function getEmailClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return new Resend(key);
}

export function getFromAddress() {
  return process.env.EMAIL_FROM || "training@insuretrain.ai";
}

export function getAppUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}
