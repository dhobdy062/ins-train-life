import { BRAND_NAME, EMAIL_SEQUENCE_ORDER, type EmailSequenceStage } from "@/lib/brand";

type SequenceTemplate = {
  requiredVariables: readonly string[];
  subject: (variables: Record<string, string>) => string;
  html: (variables: Record<string, string>) => string;
  text: (variables: Record<string, string>) => string;
};

const SEQUENCE_TEMPLATES: Record<EmailSequenceStage, SequenceTemplate> = {
  trainer_welcome: {
    requiredVariables: ["trainerName", "orgName", "dashboardUrl"],
    subject: (variables) => `Welcome to ${BRAND_NAME}, ${variables.trainerName}`,
    html: (variables) => `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h1 style="margin-bottom: 8px;">${escapeHtml(BRAND_NAME)} Trainer Dashboard Is Ready</h1>
        <p>Hi ${escapeHtml(variables.trainerName)},</p>
        <p>You are set up for <strong>${escapeHtml(variables.orgName)}</strong>. Your dashboard is ready for team configuration and live training calls.</p>
        <p><a href="${escapeHtml(variables.dashboardUrl)}">Open Trainer Dashboard</a></p>
      </div>
    `,
    text: (variables) =>
      `Hi ${variables.trainerName},\n\n` +
      `Welcome to ${BRAND_NAME}. ${variables.orgName} is now configured.\n` +
      `Open your trainer dashboard: ${variables.dashboardUrl}\n`,
  },
  trainee_invitation: {
    requiredVariables: ["traineeName", "trainerName", "trainingUrl", "difficulty"],
    subject: (variables) => `${variables.trainerName} invited you to ${BRAND_NAME}`,
    html: (variables) => `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h1 style="margin-bottom: 8px;">${escapeHtml(BRAND_NAME)} Training Invite</h1>
        <p>Hi ${escapeHtml(variables.traineeName)},</p>
        <p><strong>${escapeHtml(variables.trainerName)}</strong> invited you to start your training program.</p>
        <p>Starting difficulty: <strong>${escapeHtml(variables.difficulty)}</strong></p>
        <p><a href="${escapeHtml(variables.trainingUrl)}">Open Trainee Dashboard</a></p>
      </div>
    `,
    text: (variables) =>
      `Hi ${variables.traineeName},\n\n` +
      `${variables.trainerName} invited you to ${BRAND_NAME}.\n` +
      `Starting difficulty: ${variables.difficulty}\n` +
      `Open your trainee dashboard: ${variables.trainingUrl}\n`,
  },
  session_summary: {
    requiredVariables: ["recipientName", "difficulty", "sessionKey", "summaryUrl", "nextStep"],
    subject: (variables) => `${BRAND_NAME} session summary • ${variables.difficulty}`,
    html: (variables) => `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h1 style="margin-bottom: 8px;">${escapeHtml(BRAND_NAME)} Session Summary</h1>
        <p>Hi ${escapeHtml(variables.recipientName)},</p>
        <p>Your practice call at <strong>${escapeHtml(variables.difficulty)}</strong> is complete.</p>
        <p>Session key: <code>${escapeHtml(variables.sessionKey)}</code></p>
        <p>Recommended next step: ${escapeHtml(variables.nextStep)}</p>
        <p><a href="${escapeHtml(variables.summaryUrl)}">Review Session Details</a></p>
      </div>
    `,
    text: (variables) =>
      `Hi ${variables.recipientName},\n\n` +
      `${BRAND_NAME} session summary:\n` +
      `Difficulty: ${variables.difficulty}\n` +
      `Session key: ${variables.sessionKey}\n` +
      `Next step: ${variables.nextStep}\n` +
      `Review details: ${variables.summaryUrl}\n`,
  },
};

export type EmailSequenceKey = EmailSequenceStage;

export function isEmailSequenceKey(value: string): value is EmailSequenceKey {
  return EMAIL_SEQUENCE_ORDER.includes(value as EmailSequenceKey);
}

export function getEmailSequenceRequirements(sequence: EmailSequenceKey) {
  return [...SEQUENCE_TEMPLATES[sequence].requiredVariables];
}

export function renderEmailSequence(args: {
  sequence: EmailSequenceKey;
  variables: Record<string, string>;
}) {
  const template = SEQUENCE_TEMPLATES[args.sequence];
  const missingVariables = template.requiredVariables.filter((name) => !hasValue(args.variables[name]));

  if (missingVariables.length > 0) {
    return {
      ok: false as const,
      missingVariables,
    };
  }

  return {
    ok: true as const,
    subject: template.subject(args.variables),
    html: template.html(args.variables),
    text: template.text(args.variables),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}
