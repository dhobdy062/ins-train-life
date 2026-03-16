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

export async function provisionTraineeClerkIdentity(args: {
  orgId: string;
  email: string;
  name: string;
}) {
  const client = await clerkClient();
  const normalizedEmail = args.email.trim().toLowerCase();
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

  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: args.orgId,
    userId: [clerkUser.id],
    limit: 1,
  });

  let membership = memberships.data[0];
  let createdMembership = false;

  if (!membership) {
    membership = await client.organizations.createOrganizationMembership({
      organizationId: args.orgId,
      userId: clerkUser.id,
      role: "org:trainee",
    });
    createdMembership = true;
  }

  return {
    clerkUserId: clerkUser.id,
    clerkMembershipId: membership.id,
    createdUser,
    createdMembership,
  };
}

