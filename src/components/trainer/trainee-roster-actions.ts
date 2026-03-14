type TraineeActionShape = {
  traineeId: string;
  name: string;
  email: string;
  difficultyLevel: string;
  numObjections: number;
  status: string;
};

export function getTraineeRosterActionRequest(trainee: TraineeActionShape) {
  if (trainee.status === "disabled") {
    return {
      method: "POST" as const,
      body: JSON.stringify({
        name: trainee.name,
        email: trainee.email,
        difficultyLevel: trainee.difficultyLevel,
        numObjections: trainee.numObjections,
      }),
      successMessage: `Restored access for ${trainee.name}.`,
      errorMessage: "Unable to restore trainee access.",
      idleLabel: "Restore access",
      pendingLabel: "Restoring...",
    };
  }

  return {
    method: "DELETE" as const,
    body: JSON.stringify({ traineeId: trainee.traineeId }),
    successMessage: `Removed access for ${trainee.name}.`,
    errorMessage: "Unable to remove trainee access.",
    idleLabel: "Remove access",
    pendingLabel: "Removing...",
  };
}
