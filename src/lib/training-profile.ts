export type DifficultyLevel = "D1" | "D2" | "D3" | "D4" | "D5";

const DIFFICULTY_REBUTTAL_POOLS: Record<DifficultyLevel, string[]> = {
  D1: ["busy", "send_info", "busy"],
  D2: ["dont_remember", "not_interested", "not_interested"],
  D3: ["spouse", "timing", "timing"],
  D4: ["already_covered", "already_covered", "not_interested", "busy"],
  D5: ["dont_remember", "not_interested", "not_interested", "not_interested", "busy"],
};

export const DEFAULT_REBUTTAL_GUIDES: Record<string, string> = {
  busy: "I understand you are busy. This is a quick 15-minute policy review.",
  send_info: "I can send info, and a quick review helps tailor it to your current policy.",
  spouse: "That makes sense. We can schedule a time when your spouse can join.",
  timing: "No problem. We can pick a short time next week that works for you.",
  already_covered: "Great. This is exactly a review of what you already have.",
  not_interested: "Understood. This is a no-pressure policy review, not a sales pitch.",
  dont_remember: "No problem. I am following up on the earlier request for life insurance info.",
};

export function isDifficultyLevel(value: string): value is DifficultyLevel {
  return value === "D1" || value === "D2" || value === "D3" || value === "D4" || value === "D5";
}

export function buildExpectedRebuttals(difficulty: DifficultyLevel, numObjections: number) {
  const safeCount = Math.min(Math.max(numObjections, 1), 7);
  const pool = DIFFICULTY_REBUTTAL_POOLS[difficulty];

  if (safeCount <= pool.length) {
    return pool.slice(0, safeCount);
  }

  const expected: string[] = [...pool];
  for (let index = pool.length; index < safeCount; index += 1) {
    expected.push(pool[index % pool.length]);
  }

  return expected;
}
