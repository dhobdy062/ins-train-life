export type AssignedObjectionInput = {
  text: string;
  rebuttalType: string;
};

export type AssignedObjection = AssignedObjectionInput & {
  order: number;
};

export function normalizeAssignedObjections(input: AssignedObjectionInput[]) {
  const cleaned = input
    .map((row) => ({
      text: row.text.trim(),
      rebuttalType: row.rebuttalType.trim(),
    }))
    .filter((row) => row.text.length > 0 && row.rebuttalType.length > 0)
    .slice(0, 7);

  return cleaned.map<AssignedObjection>((row, index) => ({
    ...row,
    order: index,
  }));
}

export function buildExpectedRebuttalsFromAssigned(objections: AssignedObjection[]) {
  return objections.map((row) => row.rebuttalType);
}

export function buildRebuttalGuideMapForAssigned(
  objections: AssignedObjection[],
  guides: Record<string, string>,
) {
  return objections.reduce<Record<string, string>>((acc, row) => {
    acc[row.rebuttalType] =
      guides[row.rebuttalType] ?? "Acknowledge concern and guide to a short next step.";
    return acc;
  }, {});
}

