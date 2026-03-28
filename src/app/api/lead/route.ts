import crypto from "crypto";
import { NextResponse } from "next/server";
import { logEmailEvent, upsertDemoProspect } from "@/lib/convex";
import { getEmailClient, getFromAddress } from "@/lib/email";
import { provisionDemoProspectIdentity } from "@/lib/clerk-demo-prospects";

function hashEmail(email: string) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function POST(request: Request) {
  let emailForLogging: string | undefined;

  try {
    const body = await request.json();
    const { name, agency, organization, email } = body as {
      name?: string;
      agency?: string;
      organization?: string;
      email?: string;
    };

    emailForLogging = email;
    const organizationName = organization?.trim() || agency?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!name || !organizationName || !normalizedEmail) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const identity = await provisionDemoProspectIdentity({
      email: normalizedEmail,
      name,
      organizationName,
    });

    await upsertDemoProspect({
      clerkUserId: identity.clerkUserId,
      orgId: identity.clerkOrgId,
      email: identity.normalizedEmail,
      name,
      organizationName: identity.organizationName,
    });

    const resend = getEmailClient();
    const sendResult = await resend.emails.send({
      from: getFromAddress(),
      to: normalizedEmail,
      subject: "Access your Cream No Sugar demo",
      html: `
        <p>Hi ${name},</p>
        <p>Your authenticated demo workspace is ready.</p>
        <p><a href="${identity.signInUrl}">Click here to sign in and start your demo</a>.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });

    try {
      await logEmailEvent({
        provider: "resend",
        eventType: "authenticated_demo_access",
        status: sendResult.error ? "failed" : "sent",
        orgId: identity.clerkOrgId,
        recipient: normalizedEmail,
        recipientHash: hashEmail(normalizedEmail),
        providerMessageId: sendResult.data?.id ?? undefined,
        error: sendResult.error?.message,
        metadata: {
          source: "api/lead",
          organizationName: identity.organizationName,
          clerkUserId: identity.clerkUserId,
          clerkOrgId: identity.clerkOrgId,
          clerkMembershipId: identity.clerkMembershipId,
        },
      });
    } catch {
      // Ignore secondary logging failures.
    }

    if (sendResult.error) {
      return NextResponse.json(
        { error: "Authenticated demo signup succeeded, but email delivery failed." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    if (emailForLogging) {
      try {
        await logEmailEvent({
          provider: "resend",
          eventType: "authenticated_demo_access",
          status: "failed",
          recipient: emailForLogging,
          recipientHash: hashEmail(emailForLogging),
          error: "Unable to provision authenticated demo access.",
          metadata: {
            source: "api/lead",
          },
        });
      } catch {
        // Ignore secondary logging failures.
      }
    }
    return NextResponse.json({ error: "Unable to provision authenticated demo access." }, { status: 500 });
  }
}
