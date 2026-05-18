import { clerkClient } from "@clerk/nextjs/server";
import {
  upsertIdentityOrganization,
  upsertIdentityOrganizationMembership,
  upsertIdentityUser,
} from "@/lib/convex";

function fullName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function timestamp(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return undefined;
}

export async function getClerkUserProfile(userId: string) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  const name = fullName(user.firstName, user.lastName) || email || "Trainee";

  if (!email) {
    throw new Error("Your account needs an email address before joining an organization.");
  }

  return {
    clerkUserId: user.id,
    email: email.trim().toLowerCase(),
    name,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    imageUrl: user.imageUrl ?? undefined,
    createdAt: timestamp(user.createdAt),
    updatedAt: timestamp(user.updatedAt),
  };
}

export async function ensureClerkOrganizationMembership(args: {
  orgId: string;
  userId: string;
  role?: string;
}) {
  const client = await clerkClient();
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: args.orgId,
    userId: [args.userId],
    limit: 1,
  });

  let membership = memberships.data[0];
  if (!membership) {
    membership = await client.organizations.createOrganizationMembership({
      organizationId: args.orgId,
      userId: args.userId,
      role: args.role ?? "org:trainee",
    });
  }

  const [userProfile, organization] = await Promise.all([
    getClerkUserProfile(args.userId),
    client.organizations.getOrganization({ organizationId: args.orgId }),
  ]);

  await Promise.all([
    upsertIdentityUser({
      clerkUserId: userProfile.clerkUserId,
      primaryEmail: userProfile.email,
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      fullName: userProfile.name,
      imageUrl: userProfile.imageUrl,
      status: "active",
      createdAt: userProfile.createdAt,
      updatedAt: userProfile.updatedAt,
    }),
    upsertIdentityOrganization({
      clerkOrgId: organization.id,
      name: organization.name ?? undefined,
      slug: organization.slug ?? undefined,
      imageUrl: organization.imageUrl ?? undefined,
      status: "active",
      createdAt: timestamp(organization.createdAt),
      updatedAt: timestamp(organization.updatedAt),
    }),
    upsertIdentityOrganizationMembership({
      clerkMembershipId: membership.id,
      clerkOrgId: args.orgId,
      clerkUserId: args.userId,
      role: membership.role ?? args.role ?? "org:trainee",
      status: "active",
      createdAt: timestamp(membership.createdAt),
      updatedAt: timestamp(membership.updatedAt),
    }),
  ]);

  return {
    clerkMembershipId: membership.id,
    user: userProfile,
  };
}
