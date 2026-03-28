import { clerkClient } from "@clerk/nextjs/server";

function splitName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts[0] ?? name.trim(),
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

function normalizeOrganizationName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function findMatchingOrganization(
  organizations: Array<{ id: string; name: string | null | undefined }>,
  organizationName: string,
) {
  const target = organizationName.toLowerCase();
  return organizations.find((organization) => organization.name?.trim().toLowerCase() === target);
}

export async function provisionDemoProspectIdentity(args: {
  email: string;
  name: string;
  organizationName: string;
}) {
  const client = await clerkClient();
  const normalizedEmail = args.email.trim().toLowerCase();
  const normalizedOrganizationName = normalizeOrganizationName(args.organizationName);

  const existingUsers = await client.users.getUserList({
    emailAddress: [normalizedEmail],
    limit: 1,
  });

  let clerkUser = existingUsers.data[0];
  let createdUser = false;

  if (!clerkUser) {
    const { firstName, lastName } = splitName(args.name);
    clerkUser = await client.users.createUser({
      emailAddress: [normalizedEmail],
      firstName,
      lastName,
      skipPasswordChecks: true,
      skipPasswordRequirement: true,
      skipLegalChecks: true,
    });
    createdUser = true;
  }

  const existingOrganizations = await client.organizations.getOrganizationList({
    query: normalizedOrganizationName,
    limit: 10,
  });

  let organization = findMatchingOrganization(existingOrganizations.data, normalizedOrganizationName);
  let createdOrganization = false;

  if (!organization) {
    organization = await client.organizations.createOrganization({
      name: normalizedOrganizationName,
      createdBy: clerkUser.id,
    });
    createdOrganization = true;
  }

  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: organization.id,
    userId: [clerkUser.id],
    limit: 1,
  });

  let membership = memberships.data[0];
  let createdMembership = false;

  if (!membership) {
    membership = await client.organizations.createOrganizationMembership({
      organizationId: organization.id,
      userId: clerkUser.id,
      role: "org:admin",
    });
    createdMembership = true;
  }

  const signInToken = await client.signInTokens.createSignInToken({
    userId: clerkUser.id,
    expiresInSeconds: 60 * 60 * 24,
  });

  return {
    clerkUserId: clerkUser.id,
    clerkOrgId: organization.id,
    clerkMembershipId: membership.id,
    organizationName: normalizedOrganizationName,
    normalizedEmail,
    signInUrl: signInToken.url,
    createdUser,
    createdOrganization,
    createdMembership,
  };
}
