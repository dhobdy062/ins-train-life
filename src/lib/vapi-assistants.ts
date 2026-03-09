import { isDifficultyLevel, type DifficultyLevel } from "@/lib/training-profile";

type EnvRecord = Record<string, string | undefined>;

const ASSISTANT_ENV_KEYS: Record<DifficultyLevel, readonly string[]> = {
  D1: ["VAPI_ASSISTANT_D1_LIFE_ID"],
  D2: ["VAPI_ASSISTANT_D2_LIFE_ID"],
  D3: ["VAPI_ASSISTANT_D3_LIFE_ID"],
  D4: ["VAPI_ASSISTANT_D4_LIFE_ID", "VAPI_ASSSISTANT_D4_LIFE_ID"],
  D5: ["VAPI_ASSISTANT_D5_LIFE_ID"],
};

export function resolveLifeAssistantId(difficulty: string, env: EnvRecord = process.env) {
  if (!isDifficultyLevel(difficulty)) {
    throw new Error(`Unsupported difficulty level: ${difficulty}`);
  }

  for (const key of ASSISTANT_ENV_KEYS[difficulty]) {
    const value = env[key]?.trim();
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing assistant ID for ${difficulty}`);
}

