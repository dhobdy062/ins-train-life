import { NextResponse } from "next/server";
import { createToken } from "@/lib/token";
import { getAppUrl, getEmailClient, getFromAddress } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, agency, email, policyType } = body as {
      name?: string;
      agency?: string;
      email?: string;
      policyType?: string;
    };
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
+0      html: `
        <p>Hi ${name},</p>
        <p>Thanks for requesting the 2-minute simulated prospect demo.</p>
        <p><a href="${verifyUrl}">Click here to verify your email and start the demo</a>.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to send verification email." }, { status: 500 });
  }
}
