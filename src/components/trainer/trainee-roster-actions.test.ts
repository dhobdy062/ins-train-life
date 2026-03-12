import { getTraineeRosterActionRequest } from "@/components/trainer/trainee-roster-actions";

describe("getTraineeRosterActionRequest", () => {
  it("builds a delete request for active trainees", () => {
    expect(
      getTraineeRosterActionRequest({
        traineeId: "trainee_1",
        name: "Alex Agent",
        email: "alex@example.com",
        difficultyLevel: "D2",
        numObjections: 3,
        status: "active",
      }),
    ).toEqual({
      method: "DELETE",
      body: JSON.stringify({ traineeId: "trainee_1" }),
      successMessage: "Removed access for Alex Agent.",
      errorMessage: "Unable to remove trainee access.",
      idleLabel: "Remove access",
      pendingLabel: "Removing...",
    });
  });

  it("builds a restore request for disabled trainees", () => {
    expect(
      getTraineeRosterActionRequest({
        traineeId: "trainee_2",
        name: "Taylor Agent",
        email: "taylor@example.com",
        difficultyLevel: "D3",
        numObjections: 4,
        status: "disabled",
      }),
    ).toEqual({
      method: "POST",
      body: JSON.stringify({
        name: "Taylor Agent",
        email: "taylor@example.com",
        difficultyLevel: "D3",
        numObjections: 4,
      }),
      successMessage: "Restored access for Taylor Agent.",
      errorMessage: "Unable to restore trainee access.",
      idleLabel: "Restore access",
      pendingLabel: "Restoring...",
    });
  });
});
