import { currentUser } from "@clerk/nextjs/server";
import {
  getIdentityMembershipByOrgAndUser,
  getTraineeByClerkUserId,
  getTraineeByOrgAndEmail,
  linkTraineeIdentity,
} from "@/lib/convex";
import { syncIdentityForRequest } from "@/lib/identitySync";
import { resolveAuthenticatedTrainee } from "@/lib/trainee-access";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/convex", () => ({
  getIdentityMembershipByOrgAndUser: jest.fn(),
  getTraineeByClerkUserId: jest.fn(),
  getTraineeByOrgAndEmail: jest.fn(),
  linkTraineeIdentity: jest.fn(),
}));

jest.mock("@/lib/identitySync", () => ({
  syncIdentityForRequest: jest.fn(),
}));

const mockedCurrentUser = currentUser as jest.MockedFunction<typeof currentUser>;
const mockedGetIdentityMembershipByOrgAndUser = getIdentityMembershipByOrgAndUser as jest.MockedFunction<
  typeof getIdentityMembershipByOrgAndUser
>;
const mockedGetTraineeByClerkUserId = getTraineeByClerkUserId as jest.MockedFunction<typeof getTraineeByClerkUserId>;
const mockedGetTraineeByOrgAndEmail = getTraineeByOrgAndEmail as jest.MockedFunction<typeof getTraineeByOrgAndEmail>;
const mockedLinkTraineeIdentity = linkTraineeIdentity as jest.MockedFunction<typeof linkTraineeIdentity>;
const mockedSyncIdentityForRequest = syncIdentityForRequest as jest.MockedFunction<typeof syncIdentityForRequest>;

const baseTrainee = {
  traineeId: "trainee_1",
  orgId: "org_1",
  trainerId: "trainer_1",
  clerkUserId: "user_1",
  clerkMembershipId: "membership_1",
  name: "Alex Agent",
  email: "alex@example.com",
  difficultyLevel: "D2",
  numObjections: 3,
  expectedRebuttals: ["busy", "send_info"],
  status: "active",
  lastActiveAt: 1234,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedSyncIdentityForRequest.mockResolvedValue({ ok: true });
  mockedGetIdentityMembershipByOrgAndUser.mockResolvedValue(null);
  mockedCurrentUser.mockResolvedValue(null);
  mockedGetTraineeByClerkUserId.mockResolvedValue(null);
  mockedGetTraineeByOrgAndEmail.mockResolvedValue(null);
  mockedLinkTraineeIdentity.mockResolvedValue({
    traineeId: "trainee_1",
    clerkUserId: "user_1",
    clerkMembershipId: "membership_1",
    status: "active",
    repairedSessionCount: 1,
    updatedAt: 9999,
  });
});

describe("resolveAuthenticatedTrainee", () => {
  it("returns a direct clerk match without fetching the current user", async () => {
    mockedGetTraineeByClerkUserId.mockResolvedValue(baseTrainee);

    const result = await resolveAuthenticatedTrainee({
      userId: "user_1",
      orgId: "org_1",
      source: "test",
    });

    expect(result).toEqual({
      trainee: baseTrainee,
      resolution: "direct_clerk_match",
      repaired: false,
    });
    expect(mockedCurrentUser).not.toHaveBeenCalled();
    expect(mockedSyncIdentityForRequest).toHaveBeenCalledWith({
      userId: "user_1",
      orgId: "org_1",
      source: "test",
      failClosed: false,
    });
  });

  it("returns missing_email when no direct match exists and the user has no email", async () => {
    const result = await resolveAuthenticatedTrainee({
      userId: "user_1",
      orgId: "org_1",
      source: "test",
    });

    expect(result).toEqual({
      trainee: null,
      resolution: "missing_email",
      repaired: false,
    });
    expect(mockedGetTraineeByOrgAndEmail).not.toHaveBeenCalled();
  });

  it("returns an email match without repair when the identity is already aligned", async () => {
    mockedCurrentUser.mockResolvedValue({
      primaryEmailAddressId: "email_1",
      emailAddresses: [{ id: "email_1", emailAddress: "alex@example.com" }],
    } as Awaited<ReturnType<typeof currentUser>>);
    mockedGetTraineeByOrgAndEmail.mockResolvedValue(baseTrainee);
    mockedGetIdentityMembershipByOrgAndUser.mockResolvedValue({
      _id: "membership_doc_1",
      clerkMembershipId: "membership_1",
      clerkOrgId: "org_1",
      clerkUserId: "user_1",
      status: "active",
      createdAt: 1,
      updatedAt: 2,
      lastSyncedAt: 3,
    });

    const result = await resolveAuthenticatedTrainee({
      userId: "user_1",
      orgId: "org_1",
      source: "test",
    });

    expect(result).toEqual({
      trainee: baseTrainee,
      resolution: "email_match",
      repaired: false,
    });
    expect(mockedLinkTraineeIdentity).not.toHaveBeenCalled();
  });

  it("repairs an email match when the trainee identity is stale", async () => {
    const staleTrainee = {
      ...baseTrainee,
      clerkUserId: null,
      clerkMembershipId: null,
    };
    const repairedTrainee = {
      ...baseTrainee,
      clerkUserId: "user_1",
      clerkMembershipId: "membership_1",
    };

    mockedCurrentUser.mockResolvedValue({
      primaryEmailAddressId: "email_1",
      emailAddresses: [{ id: "email_1", emailAddress: "alex@example.com" }],
    } as Awaited<ReturnType<typeof currentUser>>);
    mockedGetTraineeByClerkUserId.mockResolvedValueOnce(null).mockResolvedValueOnce(repairedTrainee);
    mockedGetTraineeByOrgAndEmail.mockResolvedValue(staleTrainee);
    mockedGetIdentityMembershipByOrgAndUser.mockResolvedValue({
      _id: "membership_doc_1",
      clerkMembershipId: "membership_1",
      clerkOrgId: "org_1",
      clerkUserId: "user_1",
      status: "active",
      createdAt: 1,
      updatedAt: 2,
      lastSyncedAt: 3,
    });

    const result = await resolveAuthenticatedTrainee({
      userId: "user_1",
      orgId: "org_1",
      source: "test",
    });

    expect(mockedLinkTraineeIdentity).toHaveBeenCalledWith({
      traineeId: "trainee_1",
      orgId: "org_1",
      clerkUserId: "user_1",
      clerkMembershipId: "membership_1",
    });
    expect(result).toEqual({
      trainee: repairedTrainee,
      resolution: "email_match_repaired",
      repaired: true,
    });
  });
});
