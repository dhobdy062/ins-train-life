import crypto from "crypto";
import { NextResponse } from "next/server";
import { logEmailEvent } from "@/lib/convex";
import { createToken } from "@/lib/token";
import { getAppUrl, getEmailClient, getFromAddress } from "@/lib/email";

function hashEmail(email: string) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function POST(request: Request) {
  let emailForLogging: string | undefined;

  try {
    const body = await request.json();
    const { name, agency, email, policyType } = body as {
      name?: string;
      agency?: string;
      email?: string;
      policyType?: string;
    };

    emailForLogging = email;

    if (!name || !agency || !email || !policyType) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const secret = process.env.VERIFY_HMAC_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Missing VERIFY_HMAC_SECRET." }, { status: 500 });
    }

    const token = createToken({ name, agency, email, policyType }, secret);
    const verifyUrl = `${getAppUrl()}/api/verify?token=${encodeURIComponent(token)}`;

    const resend = getEmailClient();
    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: "Verify your Cream No Sugar demo",
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for requesting the 2-minute simulated prospect demo.</p>
        <p><a href="${verifyUrl}">Click here to verify your email and start the demo</a>.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });

    try {
      await logEmailEvent({
        provider: "resend",
        eventType: "lead_verify_email",
        status: "sent",
        recipient: email,
        recipientHash: hashEmail(email),
        metadata: {
          source: "api/lead",
          policyType,
          agency,
        },
      });
    } catch {
      // Ignore secondary logging failures.
    }

    return NextResponse.json({ ok: true });
  } catch {
    if (emailForLogging) {
      try {
        await logEmailEvent({
          provider: "resend",
          eventType: "lead_verify_email",
          status: "failed",
          recipient: emailForLogging,
          recipientHash: hashEmail(emailForLogging),
          error: "Unable to send verification email.",
          metadata: {
            source: "api/lead",
          },
        });
      } catch {
        // Ignore secondary logging failures.
      }
    }
    return NextResponse.json({ error: "Unable to send verification email." }, { status: 500 });
  }
}
