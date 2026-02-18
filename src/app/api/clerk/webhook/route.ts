import { NextResponse } from "next/server";
import { Webhook } from "svix";
import {
  markIdentityOrganizationDeleted,
  markIdentityOrganizationMembershipDeleted,
  markIdentityUserDeleted,
  recordAlert,
  upsertIdentityOrganization,
  upsertIdentityOrganizationMembership,
  upsertIdentityUser,
} from "@/lib/convex";

type ClerkWebhookEvent = {
  type?: string;
  data?: Record<string, unknown>;
};

type ClerkUserPayload = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  email_addresses?: Array<{ id?: string; email_address?: string | null }>;
  primary_email_address_id?: string | null;
  created_at?: number;
  updated_at?: number;
};

type ClerkOrganizationPayload = {
  id?: string;
  name?: string | null;
  slug?: string | null;
  image_url?: string | null;
  created_at?: number;
  updated_at?: number;
};

type ClerkMembershipPayload = {
  id?: string;
  role?: string | null;
  status?: string | null;
  user_id?: string | null;
  organization_id?: string | null;
  public_user_data?: { user_id?: string | null };
  organization?: { id?: string | null };
  created_at?: number;
  updated_at?: number;
};

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 10;

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function resolvePrimaryEmail(user: ClerkUserPayload) {
  const emails = Array.isArray(user.email_addresses) ? user.email_addresses : [];
  if (emails.length === 0) {
    return undefined;
  }

  const primary = emails.find((entry) => entry.id === user.primary_email_address_id)?.email_address;
  if (typeof primary === "string" && primary.length > 0) {
    return primary;
  }

  const first = emails[0]?.email_address;
  return typeof first === "string" && first.length > 0 ? first : undefined;
}

function buildFullName(firstName?: string, lastName?: string) {
  const values = [firstName, lastName].filter((value): value is string => Boolean(value && value.trim().length > 0));
  return values.length > 0 ? values.join(" ") : undefined;
}

async function handleUserEvent(type: string, user: ClerkUserPayload) {
  const clerkUserId = asString(user.id);
  if (!clerkUserId) {
    return;
  }

  if (type === "user.deleted") {
    await markIdentityUserDeleted({
      clerkUserId,
      updatedAt: asNumber(user.updated_at),
    });
    return;
  }

  const firstName = asString(user.first_name);
  const lastName = asString(user.last_name);

  await upsertIdentityUser({
    clerkUserId,
    primaryEmail: resolvePrimaryEmail(user),
    firstName,
    lastName,
    fullName: buildFullName(firstName, lastName),
    imageUrl: asString(user.image_url),
    status: "active",
    createdAt: asNumber(user.created_at),
    updatedAt: asNumber(user.updated_at),
  });
}

async function handleOrganizationEvent(type: string, organization: ClerkOrganizationPayload) {
  const clerkOrgId = asString(organization.id);
  if (!clerkOrgId) {
    return;
  }

  if (type === "organization.deleted") {
    await markIdentityOrganizationDeleted({
      clerkOrgId,
      updatedAt: asNumber(organization.updated_at),
    });
    return;
  }

  await upsertIdentityOrganization({
    clerkOrgId,
    name: asString(organization.name),
    slug: asString(organization.slug),
    imageUrl: asString(organization.image_url),
    status: "active",
    createdAt: asNumber(organization.created_at),
    updatedAt: asNumber(organization.updated_at),
  });
}

async function handleMembershipEvent(type: string, membership: ClerkMembershipPayload) {
  const clerkMembershipId = asString(membership.id);
  if (!clerkMembershipId) {
    return;
  }

  if (type === "organizationMembership.deleted") {
    await markIdentityOrganizationMembershipDeleted({
      clerkMembershipId,
      updatedAt: asNumber(membership.updated_at),
    });
    return;
  }

  const clerkOrgId = asString(membership.organization_id) || asString(membership.organization?.id);
  const clerkUserId = asString(membership.user_id) || asString(membership.public_user_data?.user_id);
  if (!clerkOrgId || !clerkUserId) {
    return;
  }

  await upsertIdentityOrganizationMembership({
    clerkMembershipId,
    clerkOrgId,
    clerkUserId,
    role: asString(membership.role),
    status: asString(membership.status) ?? "active",
    createdAt: asNumber(membership.created_at),
    updatedAt: asNumber(membership.updated_at),
  });
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing CLERK_WEBHOOK_SIGNING_SECRET" }, { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: ClerkWebhookEvent;
  try {
    const webhook = new Webhook(secret);
    event = webhook.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const type = asString(event.type);
  if (!type) {
    return NextResponse.json({ error: "Missing event type" }, { status: 400 });
  }

  try {
    if (type.startsWith("user.")) {
      await handleUserEvent(type, event.data as ClerkUserPayload);
      return NextResponse.json({ received: true, handled: true, type });
    }

    if (type.startsWith("organizationMembership.")) {
      await handleMembershipEvent(type, event.data as ClerkMembershipPayload);
      return NextResponse.json({ received: true, handled: true, type });
    }

    if (type.startsWith("organization.")) {
      await handleOrganizationEvent(type, event.data as ClerkOrganizationPayload);
      return NextResponse.json({ received: true, handled: true, type });
    }

    return NextResponse.json({ received: true, handled: false, type });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clerk webhook processing failed";

    try {
      await recordAlert({
        source: "api/clerk/webhook",
        severity: "critical",
        message,
        context: { type },
      });
    } catch {
      // Ignore secondary alerting failures.
    }

    return NextResponse.json({ error: "Unable to process webhook event" }, { status: 500 });
  }
}
