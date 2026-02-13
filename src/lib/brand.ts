export const BRAND_NAME = "Cream No Sugar";
export const BRAND_SLUG = "cream_no_sugar";

export const TRAINER_DASHBOARD_PATH = "/dashboard/trainer";
export const TRAINEE_DASHBOARD_PATH = "/dashboard/trainee";

export const EMAIL_SEQUENCE_ORDER = ["trainer_welcome", "trainee_invitation", "session_summary"] as const;

export type EmailSequenceStage = (typeof EMAIL_SEQUENCE_ORDER)[number];
