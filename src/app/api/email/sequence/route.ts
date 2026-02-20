import crypto from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { BRAND_NAME } from "@/lib/brand";
import { logEmailEvent } from "@/lib/convex";
import { getAppUrl, getEmailClient, getFromAddress } from "@/lib/email";
import { isEmailSequenceKey, renderEmailSequence } from "@/lib/email-sequences";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SequenceRequestPayload = {
  to?: string;
  sequence?: string;
  variables?: Record<string, string>;
};

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

function hashEmail(email: string) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SequenceRequestPayload = {};
  try {
    body = (await request.json()) as SequenceRequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.to || !EMAIL_PATTERN.test(body.to)) {
    return NextResponse.json({ error: "Valid recipient email is required." }, { status: 400 });
  }

  if (!body.sequence || !isEmailSequenceKey(body.sequence)) {
    return NextResponse.json({ error: "Valid sequence key is required." }, { status: 400 });
  }

  const rendered = renderEmailSequence({
    sequence: body.sequence,
    variables: {
      brandName: BRAND_NAME,
      appUrl: getAppUrl(),
      ...(body.variables ?? {}),
    },
  });

  if (!rendered.ok) {
    return NextResponse.json(
      {
        error: "Missing required sequence variables.",
        sequence: body.sequence,
        missingVariables: rendered.missingVariables,
      },
      { status: 400 },
    );
  }

  try {
    const resend = getEmailClient();
    const response = await resend.emails.send({
      from: getFromAddress(),
      to: body.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "X-Cream-Sequence": body.sequence,
      },
    });

    if (response.error) {
      try {
        await logEmailEvent({
          provider: "resend",
          eventType: "sequence_send",
          sequence: body.sequence,
          orgId: orgId ?? undefined,
          recipient: body.to,
          recipientHash: hashEmail(body.to),
          status: "failed",
          error: response.error.message,
          metadata: {
            source: "api/email/sequence",
          },
        });
      } catch {
        // Ignore secondary logging failures.
      }
      return NextResponse.json({ error: response.error.message }, { status: 502 });
    }

    try {
      await logEmailEvent({
        provider: "resend",
        eventType: "sequence_send",
        sequence: body.sequence,
        orgId: orgId ?? undefined,
        recipient: body.to,
        recipientHash: hashEmail(body.to),
        status: "sent",
        providerMessageId: response.data?.id ?? undefined,
        metadata: {
          source: "api/email/sequence",
        },
      });
    } catch {
      // Ignore secondary logging failures.
    }

    return NextResponse.json({
      ok: true,
      sequence: body.sequence,
      emailId: response.data?.id ?? null,
    });
  } catch {
    if (body.to && EMAIL_PATTERN.test(body.to)) {
      try {
        await logEmailEvent({
          provider: "resend",
          eventType: "sequence_send",
          sequence: body.sequence,
          orgId: orgId ?? undefined,
          recipient: body.to,
          recipientHash: hashEmail(body.to),
          status: "failed",
          error: "Unable to send sequence email.",
          metadata: {
            source: "api/email/sequence",
          },
        });
      } catch {
        // Ignore secondary logging failures.
      }
    }
    return NextResponse.json({ error: "Unable to send sequence email." }, { status: 500 });
  }
}
