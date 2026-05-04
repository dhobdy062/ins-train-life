import { type DifficultyLevel, isDifficultyLevel } from "@/lib/training-profile";

export type TrainingProductType = "life" | "medicare_lead" | "medicare_event";

export type TrainingProductConfig = {
  productType: TrainingProductType;
  productLabel: string;
  scenarioType: "lead" | "event";
  scenarioLabel: string;
  allowedDifficulties: readonly DifficultyLevel[];
};

export const DEFAULT_TRAINING_PRODUCT_TYPE: TrainingProductType = "life";

export const TRAINING_PRODUCT_CONFIGS: Record<TrainingProductType, TrainingProductConfig> = {
  life: {
    productType: "life",
    productLabel: "Life Lead",
    scenarioType: "lead",
    scenarioLabel: "Life Lead",
    allowedDifficulties: ["D1", "D2", "D3", "D4", "D5"],
  },
  medicare_lead: {
    productType: "medicare_lead",
    productLabel: "Medicare Lead",
    scenarioType: "lead",
    scenarioLabel: "Medicare Lead",
    allowedDifficulties: ["D1", "D2", "D3"],
  },
  medicare_event: {
    productType: "medicare_event",
    productLabel: "Medicare Event",
    scenarioType: "event",
    scenarioLabel: "Medicare Event",
    allowedDifficulties: ["D1", "D2", "D3"],
  },
};

export const TRAINING_PRODUCT_OPTIONS = Object.values(TRAINING_PRODUCT_CONFIGS);

export function getDefaultProductType(): TrainingProductType {
  return DEFAULT_TRAINING_PRODUCT_TYPE;
}

export function isTrainingProductType(value: unknown): value is TrainingProductType {
  return value === "life" || value === "medicare_lead" || value === "medicare_event";
}

export function normalizeTrainingProductType(value: unknown): TrainingProductType {
  return isTrainingProductType(value) ? value : DEFAULT_TRAINING_PRODUCT_TYPE;
}

export function getTrainingProductConfig(productType: TrainingProductType) {
  return TRAINING_PRODUCT_CONFIGS[productType];
}

export function getProductLabels() {
  return {
    life: TRAINING_PRODUCT_CONFIGS.life.productLabel,
    medicare_lead: TRAINING_PRODUCT_CONFIGS.medicare_lead.productLabel,
    medicare_event: TRAINING_PRODUCT_CONFIGS.medicare_event.productLabel,
  } satisfies Record<TrainingProductType, string>;
}

export function getAllowedDifficultiesForProduct(productType: TrainingProductType) {
  return [...TRAINING_PRODUCT_CONFIGS[productType].allowedDifficulties];
}

export function isProductDifficultyAllowed(productType: TrainingProductType, difficulty: string) {
  return isDifficultyLevel(difficulty) && TRAINING_PRODUCT_CONFIGS[productType].allowedDifficulties.includes(difficulty);
}

export function normalizeDifficultyForProduct(productType: TrainingProductType, difficulty: string) {
  if (isProductDifficultyAllowed(productType, difficulty)) {
    return difficulty as DifficultyLevel;
  }

  return TRAINING_PRODUCT_CONFIGS[productType].allowedDifficulties[0];
}
