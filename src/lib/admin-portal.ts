type UserEmailAddress = {
  id?: string | null;
  emailAddress?: string | null;
};

type UserWithEmails = {
  primaryEmailAddressId?: string | null;
  emailAddresses?: UserEmailAddress[] | null;
} | null;

const DEFAULT_ADMIN_EMAILS = ["cream@support.retrospxt.com"];

function normalizeEmail(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function getAdminEmailAllowlist() {
  const configured = process.env.ADMIN_PORTAL_EMAILS ?? process.env.ADMIN_EMAILS ?? "";
  const parsed = configured
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter((entry): entry is string => Boolean(entry));

  const combined = parsed.length > 0 ? parsed : DEFAULT_ADMIN_EMAILS;
  return new Set(combined);
}

export function getAdminNotificationEmails() {
  const configured =
    process.env.ADMIN_ALERT_EMAILS ?? process.env.OPS_ALERT_EMAILS ?? process.env.ADMIN_PORTAL_EMAILS ?? process.env.ADMIN_EMAILS ?? "";
  const parsed = configured
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter((entry): entry is string => Boolean(entry));

  return parsed.length > 0 ? parsed : DEFAULT_ADMIN_EMAILS;
}

export function getWeeklyAdminReportEmail() {
  const configured = normalizeEmail(process.env.ADMIN_WEEKLY_REPORT_EMAIL);
  if (configured) {
    return configured;
  }

  return getAdminNotificationEmails()[0] ?? DEFAULT_ADMIN_EMAILS[0];
}

export function resolvePrimaryEmailAddress(user: UserWithEmails) {
  if (!user) {
    return null;
  }

  const primaryId = user.primaryEmailAddressId ?? null;
  const emailAddresses = Array.isArray(user.emailAddresses) ? user.emailAddresses : [];
  const primaryMatch = primaryId ? emailAddresses.find((email) => email.id === primaryId) : null;
  const candidate = primaryMatch?.emailAddress ?? emailAddresses[0]?.emailAddress ?? null;

  return normalizeEmail(candidate);
}

export function isAdminPortalUser(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return false;
  }
  return getAdminEmailAllowlist().has(normalized);
}
