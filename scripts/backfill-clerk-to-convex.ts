import { config as loadDotenv } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

loadDotenv({ path: ".env.local" });

type AdminConvexHttpClient = ConvexHttpClient & { setAdminAuth?: (token: string) => void };

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

const upsertUserRef = makeFunctionReference<"mutation">("identity.upsertUser");
const upsertOrganizationRef = makeFunctionReference<"mutation">("identity.upsertOrganization");
const upsertOrganizationMembershipRef = makeFunctionReference<"mutation">("identity.upsertOrganizationMembership");

const CLERK_API_BASE = process.env.CLERK_API_URL ?? "https://api.clerk.com";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function fullName(firstName?: string, lastName?: string) {
  const parts = [firstName, lastName].filter((part): part is string => Boolean(part && part.trim().length > 0));
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function extractPrimaryEmail(user: ClerkUser) {
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

async function clerkGet<T>(path: string, searchParams?: Record<string, string | number | undefined>) {
  const secretKey = getRequiredEnv("CLERK_SECRET_KEY");
  const url = new URL(`/v1${path}`, CLERK_API_BASE);

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
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Clerk API ${response.status} for ${path}: ${text.slice(0, 300)}`);
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

async function listAll<T>(path: string, limit = 100) {
  const output: T[] = [];
  let offset = 0;

  while (true) {
    const payload = await clerkGet<unknown>(path, { limit, offset });
    const batch = extractArray<T>(payload);
    output.push(...batch);

    if (batch.length < limit) {
      break;
    }

    offset += batch.length;
  }

  return output;
}

async function main() {
  const convexUrl = getRequiredEnv("CONVEX_URL");
  const convexAdminKey = getRequiredEnv("CONVEX_ADMIN_KEY");
  getRequiredEnv("CLERK_SECRET_KEY");

  const client = new ConvexHttpClient(convexUrl);
  const adminClient = client as AdminConvexHttpClient;
  if (typeof adminClient.setAdminAuth === "function") {
    adminClient.setAdminAuth(convexAdminKey);
  } else {
    client.setAuth(convexAdminKey);
  }

  const stats = {
    usersSeen: 0,
    usersUpserted: 0,
    orgsSeen: 0,
    orgsUpserted: 0,
    membershipsSeen: 0,
    membershipsUpserted: 0,
    failures: 0,
  };

  const users = await listAll<ClerkUser>("/users");
  for (const user of users) {
    const clerkUserId = asString(user.id);
    if (!clerkUserId) {
      continue;
    }

    stats.usersSeen += 1;
    try {
      const firstName = asString(user.first_name);
      const lastName = asString(user.last_name);

      await client.mutation(upsertUserRef, {
        clerkUserId,
        primaryEmail: extractPrimaryEmail(user),
        firstName,
        lastName,
        fullName: fullName(firstName, lastName),
        imageUrl: asString(user.image_url),
        status: "active",
        createdAt: asNumber(user.created_at),
        updatedAt: asNumber(user.updated_at),
      } as never);
      stats.usersUpserted += 1;
    } catch (error) {
      stats.failures += 1;
      console.error(`[backfill] user upsert failed for ${clerkUserId}`, error);
    }
  }

  const organizations = await listAll<ClerkOrganization>("/organizations");
  for (const organization of organizations) {
    const clerkOrgId = asString(organization.id);
    if (!clerkOrgId) {
      continue;
    }

    stats.orgsSeen += 1;
    try {
      await client.mutation(upsertOrganizationRef, {
        clerkOrgId,
        name: asString(organization.name),
        slug: asString(organization.slug),
        imageUrl: asString(organization.image_url),
        status: "active",
        createdAt: asNumber(organization.created_at),
        updatedAt: asNumber(organization.updated_at),
      } as never);
      stats.orgsUpserted += 1;
    } catch (error) {
      stats.failures += 1;
      console.error(`[backfill] organization upsert failed for ${clerkOrgId}`, error);
    }

    const memberships = await listAll<ClerkMembership>(`/organizations/${clerkOrgId}/memberships`);
    for (const membership of memberships) {
      const membershipId = asString(membership.id);
      if (!membershipId) {
        continue;
      }

      stats.membershipsSeen += 1;

      const membershipOrgId = asString(membership.organization_id) || asString(membership.organization?.id) || clerkOrgId;
      const membershipUserId = asString(membership.user_id) || asString(membership.public_user_data?.user_id);

      if (!membershipUserId) {
        continue;
      }

      try {
        await client.mutation(upsertOrganizationMembershipRef, {
          clerkMembershipId: membershipId,
          clerkOrgId: membershipOrgId,
          clerkUserId: membershipUserId,
          role: asString(membership.role),
          status: asString(membership.status) ?? "active",
          createdAt: asNumber(membership.created_at),
          updatedAt: asNumber(membership.updated_at),
        } as never);
        stats.membershipsUpserted += 1;
      } catch (error) {
        stats.failures += 1;
        console.error(`[backfill] membership upsert failed for ${membershipId}`, error);
      }
    }
  }

  console.log("[backfill] complete");
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((error) => {
  console.error("[backfill] fatal error", error);
  process.exitCode = 1;
});
