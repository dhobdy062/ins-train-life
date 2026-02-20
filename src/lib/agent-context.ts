import {
  BRAND_NAME,
  BRAND_SLUG,
  EMAIL_SEQUENCE_ORDER,
  TRAINEE_DASHBOARD_PATH,
  TRAINER_DASHBOARD_PATH,
  type EmailSequenceStage,
} from "@/lib/brand";
import { getAppUrl } from "@/lib/email";

export function buildAgentVariableValues(args: {
  difficulty: string;
  objectionsRequired: number;
  rebuttals: Record<string, string>;
  orgRole: string | undefined | null;
  activeSequence: EmailSequenceStage;
  extraVariables?: Record<string, string>;
}) {
  const appUrl = getAppUrl();
  const role = args.orgRole === "admin" ? "trainer" : "trainee";

  return {
    difficulty: args.difficulty,
    objectionsRequired: String(args.objectionsRequired),
    rebuttals: JSON.stringify(args.rebuttals),
    brand_name: BRAND_NAME,
    brand_slug: BRAND_SLUG,
    app_url: appUrl,
    trainer_dashboard_url: `${appUrl}${TRAINER_DASHBOARD_PATH}`,
    trainee_dashboard_url: `${appUrl}${TRAINEE_DASHBOARD_PATH}`,
    dashboard_role: role,
    email_sequence_stage: args.activeSequence,
    email_sequence_order: JSON.stringify(EMAIL_SEQUENCE_ORDER),
    ...(args.extraVariables ?? {}),
  };
}
