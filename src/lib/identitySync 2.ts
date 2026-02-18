import {
  recordAlert,
  upsertIdentityOrganization,
  upsertIdentityOrganizationMembership,
  upsertIdentityUser,
} from "@/lib/convex";

type SyncIdentityOptions = {
  userId?: string | null;
  orgId?: string | null;
  source: string;
  failClosed: boolean;
};

type ClerkUser = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  email_addresses?: Array<{ id?: string; email_address?: string | null }>;
  primary_email_address_id?: string | null;
  created_at?: number;
  updated_at?: number;
};

type ClerkOrganization = {
  id?: string;
  name?: string | null;
  slug?: string | null;
  image_url?: string | null;
  created_at?: number;
  updated_at?: number;
};

type ClerkMembership = {
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

const CLERK_API_BASE = process.env.CLERK_API_URL ?? "https://api.clerk.com";

function requiredClerkSecret() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    throw new Error("Missing CLERK_SECRET_KEY for identity sync fallback");
  }
  return key;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function normalizeTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function fullName(firstName?: string, lastName?: string) {
  const parts = [firstName, lastName].filter((part): part is string => Boolean(part && part.trim().length > 0));
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function resolvePrimaryEmail(user: ClerkUser) {
  const emails = Array.isArray(user.email_addresses) ? user.email_addresses : [];
  if (emails.length === 0) {
    return undefined;
  }

  const byPrimary = emails.find((email) => email.id === user.primary_email_address_id)?.email_address;
  if (typeof byPrimary === "string" && byPrimary.length > 0) {
    return byPrimary;
  }

  const first = emails[0]?.email_address;
  return typeof first === "string" && first.length > 0 ? first : undefined;
}

async function clerkGet<T>(pathname: string, searchParams?: Record<string, string | number | undefined>) {
  const secretKey = requiredClerkSecret();
  const url = new URL(`/v1${pathname}`, CLERK_API_BASE);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Clerk API ${response.status} for ${pathname}: ${text.slice(0, 300)}`);
  }

  return response.json() as Promise<T>;
}

function extractArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }

  return [];
}

async function syncIdentityInner(options: SyncIdentityOptions) {
  const userId = options.userId ?? undefined;
  const orgId = options.orgId ?? undefined;
  if (!userId) {
    return;
  }

  const user = await clerkGet<ClerkUser>(`/users/${userId}`);
  await upsertIdentityUser({
    clerkUserId: userId,
    primaryEmail: resolvePrimaryEmail(user),
    firstName: asString(user.first_name),
    lastName: asString(user.last_name),
    fullName: fullName(asString(user.first_name), asString(user.last_name)),
    imageUrl: asString(user.image_url),
    status: "active",
    createdAt: normalizeTimestamp(user.created_at),
    updatedAt: normalizeTimestamp(user.updated_at),
  });

  if (!orgId) {
    return;
  }

  const organization = await clerkGet<ClerkOrganization>(`/organizations/${orgId}`);
  await upsertIdentityOrganization({
    clerkOrgId: orgId,
    name: asString(organization.name),
    slug: asString(organization.slug),
    imageUrl: asString(organization.image_url),
    status: "active",
    createdAt: normalizeTimestamp(organization.created_at),
    updatedAt: normalizeTimestamp(organization.updated_at),
  });

  const membershipsResponse = await clerkGet<unknown>(`/organizations/${orgId}/memberships`, {
    user_id: userId,
    limit: 1,
    offset: 0,
  });

  const membership = extractArray<ClerkMembership>(membershipsResponse)[0];
  const membershipId = asString(membership?.id);
  if (!membershipId) {
    return;
  }

  const membershipUserId =
    asString(membership?.user_id) || asString(membership?.public_user_data?.user_id) || userId;
  const membershipOrgId = asString(membership?.organization_id) || asString(membership?.organization?.id) || orgId;

  await upsertIdentityOrganizationMembership({
    clerkMembershipId: membershipId,
    clerkOrgId: membershipOrgId,
    clerkUserId: membershipUserId,
    role: asString(membership?.role),
    status: asString(membership?.status) ?? "active",
    createdAt: normalizeTimestamp(membership?.created_at),
    updatedAt: normalizeTimestamp(membership?.updated_at),
  });
}

export async function syncIdentityForRequest(options: SyncIdentityOptions) {
  try {
    await syncIdentityInner(options);
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown identity sync failure";

    try {
      await recordAlert({
        source: `${options.source}.identity-sync`,
        severity: options.failClosed ? "critical" : "warning",
        message,
        context: {
          userId: options.userId ?? null,
          orgId: options.orgId ?? null,
          failClosed: options.failClosed,
        },
      });
    } catch {
      // Ignore secondary alerting failure.
    }

    if (options.failClosed) {
      return { ok: false as const, message };
    }

    return { ok: true as const, skipped: true as const, message };
  }
}
