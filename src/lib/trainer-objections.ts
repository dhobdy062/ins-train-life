import { buildExpectedRebuttals, type DifficultyLevel } from "@/lib/training-profile";
import { type TrainingProductType } from "@/lib/training-products";

export type ObjectionRow = {
  text: string;
  rebuttalType: string;
  frequency: string;
};

export type ObjectionLibrary = Record<DifficultyLevel, ObjectionRow[]>;

export const DEFAULT_OBJECTION_LIBRARY: ObjectionLibrary = {
  D1: [
    { text: "I'm slammed right now and do not have time for an appointment.", rebuttalType: "busy", frequency: "Very common" },
    { text: "Can you just send me something to look at later?", rebuttalType: "send_info", frequency: "Common" },
  ],
  D2: [
    { text: "How did you get my number?", rebuttalType: "dont_remember", frequency: "Common" },
    { text: "I get a lot of calls like this. I'm not interested.", rebuttalType: "not_interested", frequency: "Common" },
    { text: "Tell me what this is, but I am not setting an appointment.", rebuttalType: "not_interested", frequency: "Common" },
  ],
  D3: [
    { text: "I need to talk to my spouse first.", rebuttalType: "spouse", frequency: "Common" },
    { text: "Bad timing, I am handling family issues right now.", rebuttalType: "timing", frequency: "Common" },
    { text: "Can we revisit this in a few months?", rebuttalType: "timing", frequency: "Common" },
  ],
  D4: [
    { text: "I already have coverage.", rebuttalType: "already_covered", frequency: "Very common" },
    { text: "My job already gives me life insurance.", rebuttalType: "already_covered", frequency: "Common" },
    { text: "This sounds like a sales pitch.", rebuttalType: "not_interested", frequency: "Common" },
    { text: "I do not have time for this right now.", rebuttalType: "busy", frequency: "Common" },
  ],
  D5: [
    { text: "Who are you again? I do not remember filling anything out.", rebuttalType: "dont_remember", frequency: "Common" },
    { text: "I am not interested. Stop calling.", rebuttalType: "not_interested", frequency: "Common" },
    { text: "I do not like being pressured.", rebuttalType: "not_interested", frequency: "Common" },
    { text: "What happens to my personal information?", rebuttalType: "not_interested", frequency: "Common" },
    { text: "Do not contact me again.", rebuttalType: "busy", frequency: "Hard stop" },
  ],
};

export const DEFAULT_REBUTTAL_GUIDES: Record<string, string> = {
  busy: "Acknowledge the time pressure and offer one short, specific next step.",
  send_info: "Set context for why a short call gives better personalization than email alone.",
  spouse: "Respect the household decision process and offer to schedule a joint call.",
  timing: "Convert delay language into a concrete date and time commitment.",
  already_covered: "Confirm existing coverage and diagnose potential policy gaps.",
  not_interested: "Validate concern first, then reframe value around their goals.",
  dont_remember: "Give context on prior request and ask permission to continue.",
};

const EMPTY_MEDICARE_HIGH_DIFFICULTY: ObjectionRow[] = [];

export const DEFAULT_MEDICARE_LEAD_OBJECTION_LIBRARY: ObjectionLibrary = {
  D1: [
    { text: "I already have a Medicare plan and do not need another one.", rebuttalType: "medicare_plan_confusion", frequency: "Very common" },
    { text: "I am not sure this is about Medicare.", rebuttalType: "medicare_lead_context", frequency: "Common" },
  ],
  D2: [
    { text: "I do not want to change doctors or prescriptions.", rebuttalType: "medicare_provider_concern", frequency: "Common" },
    { text: "I need to talk to my family before discussing Medicare.", rebuttalType: "medicare_family_review", frequency: "Common" },
    { text: "I am worried this will cost me more.", rebuttalType: "medicare_cost_concern", frequency: "Common" },
  ],
  D3: [
    { text: "I get too many Medicare calls and do not trust this.", rebuttalType: "medicare_trust", frequency: "Common" },
    { text: "I missed the enrollment period, so this will not help.", rebuttalType: "medicare_enrollment_timing", frequency: "Common" },
    { text: "I do not want to give personal information over the phone.", rebuttalType: "medicare_privacy", frequency: "Common" },
  ],
  D4: EMPTY_MEDICARE_HIGH_DIFFICULTY,
  D5: EMPTY_MEDICARE_HIGH_DIFFICULTY,
};

export const DEFAULT_MEDICARE_EVENT_OBJECTION_LIBRARY: ObjectionLibrary = {
  D1: [
    { text: "I do not know what this Medicare event is for.", rebuttalType: "medicare_event_context", frequency: "Very common" },
    { text: "I am not sure I can attend the event.", rebuttalType: "medicare_event_schedule", frequency: "Common" },
  ],
  D2: [
    { text: "Is this event just a sales presentation?", rebuttalType: "medicare_event_trust", frequency: "Common" },
    { text: "I already have an agent helping me.", rebuttalType: "medicare_existing_agent", frequency: "Common" },
    { text: "I need to know if my prescriptions will be covered before I attend.", rebuttalType: "medicare_prescription_concern", frequency: "Common" },
  ],
  D3: [
    { text: "I do not want to be pressured at a Medicare event.", rebuttalType: "medicare_event_pressure", frequency: "Common" },
    { text: "Transportation is difficult for me.", rebuttalType: "medicare_event_transportation", frequency: "Common" },
    { text: "I am skeptical because Medicare information is confusing.", rebuttalType: "medicare_event_confusion", frequency: "Common" },
  ],
  D4: EMPTY_MEDICARE_HIGH_DIFFICULTY,
  D5: EMPTY_MEDICARE_HIGH_DIFFICULTY,
};

export const DEFAULT_MEDICARE_REBUTTAL_GUIDES: Record<string, string> = {
  medicare_plan_confusion: "Clarify that the goal is to compare plan fit, not force a plan change.",
  medicare_lead_context: "Reconnect the call to their Medicare information request and ask permission to continue.",
  medicare_provider_concern: "Acknowledge doctor and prescription continuity as a key part of any plan review.",
  medicare_family_review: "Respect family involvement and offer a time when they can join the conversation.",
  medicare_cost_concern: "Position the review around checking premiums, benefits, and potential savings.",
  medicare_trust: "Validate call fatigue and explain the specific, permission-based purpose of the Medicare review.",
  medicare_enrollment_timing: "Clarify that timing depends on their situation and the review can identify options.",
  medicare_privacy: "Reassure them that sensitive details are only needed when they choose to proceed.",
  medicare_event_context: "Explain what the event covers and why attending can simplify Medicare choices.",
  medicare_event_schedule: "Offer concrete event times and a simple RSVP next step.",
  medicare_event_trust: "Frame the event as educational and explain what will and will not happen there.",
  medicare_existing_agent: "Respect the existing relationship and position the event as an informational checkup.",
  medicare_prescription_concern: "Acknowledge medication coverage as a primary question to bring to the event.",
  medicare_event_pressure: "Set expectations that the event is informative and they control any next step.",
  medicare_event_transportation: "Offer available event logistics and confirm whether attendance is realistic.",
  medicare_event_confusion: "Normalize confusion and position the event as a way to make options easier to compare.",
};

export function getDefaultObjectionLibraryForProduct(productType: TrainingProductType): ObjectionLibrary {
  if (productType === "medicare_lead") {
    return cloneObjectionLibrary(DEFAULT_MEDICARE_LEAD_OBJECTION_LIBRARY);
  }

  if (productType === "medicare_event") {
    return cloneObjectionLibrary(DEFAULT_MEDICARE_EVENT_OBJECTION_LIBRARY);
  }

  return cloneObjectionLibrary(DEFAULT_OBJECTION_LIBRARY);
}

export function getDefaultRebuttalGuidesForProduct(productType: TrainingProductType): Record<string, string> {
  if (productType === "medicare_lead" || productType === "medicare_event") {
    return {
      ...DEFAULT_REBUTTAL_GUIDES,
      ...DEFAULT_MEDICARE_REBUTTAL_GUIDES,
    };
  }

  return { ...DEFAULT_REBUTTAL_GUIDES };
}

const DIFFICULTIES: DifficultyLevel[] = ["D1", "D2", "D3", "D4", "D5"];

function asTrimmedString(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function cloneObjectionLibrary(source: ObjectionLibrary = DEFAULT_OBJECTION_LIBRARY): ObjectionLibrary {
  return {
    D1: source.D1.map((row) => ({ ...row })),
    D2: source.D2.map((row) => ({ ...row })),
    D3: source.D3.map((row) => ({ ...row })),
    D4: source.D4.map((row) => ({ ...row })),
    D5: source.D5.map((row) => ({ ...row })),
  };
}

export function normalizeObjectionLibrary(input: unknown): ObjectionLibrary {
  const fallback = cloneObjectionLibrary();

  if (!input || typeof input !== "object") {
    return fallback;
  }

  const source = input as Record<string, unknown>;
  const normalized: Partial<ObjectionLibrary> = {};

  for (const difficulty of DIFFICULTIES) {
    const fallbackRows = fallback[difficulty];
    const candidate = source[difficulty];
    if (!Array.isArray(candidate) || candidate.length === 0) {
      normalized[difficulty] = fallbackRows;
      continue;
    }

    const rows: ObjectionRow[] = candidate
      .map((row, index) => {
        const fallbackRow = fallbackRows[index % fallbackRows.length];
        if (!row || typeof row !== "object") {
          return fallbackRow;
        }
        const parsed = row as Record<string, unknown>;
        return {
          text: asTrimmedString(parsed.text, fallbackRow.text),
          rebuttalType: asTrimmedString(parsed.rebuttalType, fallbackRow.rebuttalType),
          frequency: asTrimmedString(parsed.frequency, fallbackRow.frequency),
        };
      })
      .slice(0, 25);

    normalized[difficulty] = rows.length > 0 ? rows : fallbackRows;
  }

  return normalized as ObjectionLibrary;
}

export function normalizeRebuttalGuides(input: unknown): Record<string, string> {
  const base = { ...DEFAULT_REBUTTAL_GUIDES };
  if (!input || typeof input !== "object") {
    return base;
  }

  const source = input as Record<string, unknown>;
  for (const [key, value] of Object.entries(source)) {
    if (typeof key !== "string") {
      continue;
    }
    const cleanedKey = key.trim();
    if (!cleanedKey) {
      continue;
    }
    base[cleanedKey] = asTrimmedString(value, base[cleanedKey] ?? "Acknowledge concern and guide to a short next step.");
  }

  return base;
}

export function buildExpectedRebuttalsFromLibrary(
  difficulty: DifficultyLevel,
  numObjections: number,
  library: ObjectionLibrary,
) {
  const safeCount = Math.min(Math.max(numObjections, 1), 7);
  const rows = library[difficulty] ?? [];
  const pool = rows.map((row) => row.rebuttalType).filter((value) => value.length > 0);

  if (pool.length === 0) {
    return buildExpectedRebuttals(difficulty, safeCount);
  }

  if (safeCount <= pool.length) {
    return pool.slice(0, safeCount);
  }

  const expected = [...pool];
  for (let index = pool.length; index < safeCount; index += 1) {
    expected.push(pool[index % pool.length]);
  }

  return expected;
}

export function buildGuideMapForExpected(expectedRebuttals: string[], guides: Record<string, string>) {
  const source = {
    ...DEFAULT_REBUTTAL_GUIDES,
    ...guides,
  };

  return expectedRebuttals.reduce<Record<string, string>>((acc, rebuttalType) => {
    acc[rebuttalType] = source[rebuttalType] ?? "Acknowledge concern and guide to a short next step.";
    return acc;
  }, {});
}
