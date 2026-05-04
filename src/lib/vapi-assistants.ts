import { isDifficultyLevel, type DifficultyLevel } from "@/lib/training-profile";
import {
  getTrainingProductConfig,
  isProductDifficultyAllowed,
  type TrainingProductType,
} from "@/lib/training-products";

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

const PRODUCT_ASSISTANT_ENV_KEYS: Record<TrainingProductType, Record<DifficultyLevel, readonly string[]>> = {
  life: ASSISTANT_ENV_KEYS,
  medicare_lead: {
    D1: ["VAPI_ASSISTANT_D1_MEDICARE_LEAD_ID"],
    D2: ["VAPI_ASSISTANT_D2_MEDICARE_LEAD_ID"],
    D3: ["VAPI_ASSISTANT_D3_MEDICARE_LEAD_ID"],
    D4: [],
    D5: [],
  },
  medicare_event: {
    D1: ["VAPI_ASSISTANT_D1_MEDICARE_EVENT_ID"],
    D2: ["VAPI_ASSISTANT_D2_MEDICARE_EVENT_ID"],
    D3: ["VAPI_ASSISTANT_D3_MEDICARE_EVENT_ID"],
    D4: [],
    D5: [],
  },
};

export function resolveTrainingAssistantId(
  productType: TrainingProductType,
  difficulty: string,
  env: EnvRecord = process.env,
) {
  if (!isDifficultyLevel(difficulty)) {
    throw new Error(`Unsupported difficulty level: ${difficulty}`);
  }

  if (!isProductDifficultyAllowed(productType, difficulty)) {
    throw new Error(`Unsupported difficulty ${difficulty} for ${getTrainingProductConfig(productType).productLabel}`);
  }

  for (const key of PRODUCT_ASSISTANT_ENV_KEYS[productType][difficulty]) {
    const value = env[key]?.trim();
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing assistant ID for ${getTrainingProductConfig(productType).productLabel} ${difficulty}`);
}

