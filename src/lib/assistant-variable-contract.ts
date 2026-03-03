export type AssistantContractScope = "trainer" | "trainee" | "trial";

type ContractResult =
  | { ok: true; scope: AssistantContractScope; missingKeys: [] }
  | { ok: false; scope: AssistantContractScope; missingKeys: string[] };

const REQUIRED_KEYS_BY_SCOPE: Record<AssistantContractScope, string[]> = {
  trainer: ["difficulty", "objectionsRequired", "rebuttals", "session_key", "org_id", "trainer_id"],
  trainee: [
    "difficulty",
    "objectionsRequired",
    "rebuttals",
    "session_key",
    "org_id",
    "trainer_id",
    "trainee_id",
    "trainee_name",
    "expected_rebuttals",
  ],
  trial: ["difficulty", "objectionsRequired", "rebuttals", "session_key"],
};

function isJsonPayloadKey(key: string) {
  return key === "rebuttals" || key === "expected_rebuttals";
}

function isMissingValue(key: string, rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return true;
  }

  const value = rawValue.trim();
  if (value.length === 0) {
    return true;
  }

  if (!isJsonPayloadKey(key)) {
    return false;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.length === 0;
    }
    if (parsed && typeof parsed === "object") {
      return Object.keys(parsed as Record<string, unknown>).length === 0;
    }
    return true;
  } catch {
    return true;
  }
}

export function validateAssistantVariableContract(
  variableValues: Record<string, string>,
  scope: AssistantContractScope,
): ContractResult {
  const requiredKeys = REQUIRED_KEYS_BY_SCOPE[scope];
  const missingKeys = requiredKeys.filter((key) => isMissingValue(key, variableValues[key]));

  if (missingKeys.length === 0) {
    return {
      ok: true,
      scope,
      missingKeys: [],
    };
  }

  return {
    ok: false,
    scope,
    missingKeys,
  };
}
