type RebuttalScoreArgs = {
  expectedRebuttalType: string;
  traineeResponse: string;
  toneHint?: string;
};

type RebuttalScoreResult = {
  score: number;
  grade: "Excellent" | "Good" | "Fair" | "Needs Work";
  toneAnalysis: string;
  feedback: string;
};

const EXPECTED_KEYWORDS: Record<string, string[]> = {
  busy: ["quick", "minute", "brief", "schedule", "time"],
  send_info: ["review", "custom", "info", "quick", "tailor"],
  spouse: ["spouse", "together", "both", "decision", "schedule"],
  timing: ["timing", "week", "later", "schedule", "calendar"],
  already_covered: ["review", "coverage", "policy", "update", "gaps"],
  not_interested: ["understand", "no pressure", "brief", "value", "review"],
  dont_remember: ["no problem", "request", "follow up", "life insurance", "review"],
};

const NEGATIVE_TONE_TERMS = ["whatever", "listen", "obviously", "you have to", "just do", "wrong", "dumb"];
const POSITIVE_TONE_TERMS = ["understand", "totally", "absolutely", "thanks", "appreciate", "quick", "help"];

function countMatches(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(keyword)).length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function scoreRebuttalResponse(args: RebuttalScoreArgs): RebuttalScoreResult {
  const normalized = args.traineeResponse.trim().toLowerCase();
  const expectedKeywords = EXPECTED_KEYWORDS[args.expectedRebuttalType] ?? [];
  const keywordMatches = countMatches(normalized, expectedKeywords);
  const keywordRatio = expectedKeywords.length > 0 ? keywordMatches / expectedKeywords.length : 0;
  const keywordScore = keywordRatio * 62;

  const positiveToneHits = countMatches(normalized, POSITIVE_TONE_TERMS);
  const negativeToneHits = countMatches(normalized, NEGATIVE_TONE_TERMS);
  const toneBase = clamp(18 + positiveToneHits * 4 - negativeToneHits * 6, 0, 24);

  const wordCount = normalized.split(/\s+/).filter((segment) => segment.length > 0).length;
  const completenessScore = clamp((wordCount / 28) * 14, 2, 14);

  let score = Math.round(clamp(keywordScore + toneBase + completenessScore, 0, 100));

  if (!normalized) {
    score = 0;
  }

  if (args.toneHint?.toLowerCase().includes("aggressive")) {
    score = clamp(score - 8, 0, 100);
  }

  const grade: RebuttalScoreResult["grade"] =
    score >= 90 ? "Excellent" : score >= 80 ? "Good" : score >= 65 ? "Fair" : "Needs Work";

  const toneAnalysis =
    negativeToneHits > positiveToneHits
      ? "Tone needs work. The response sounded more forceful than consultative."
      : "Tone is consultative and steady.";

  const feedback =
    score >= 90
      ? "Strong rebuttal. You validated concern, reframed value, and kept control of the next step."
      : score >= 80
        ? "Solid rebuttal. Add a clearer time-bound close to improve conversion."
        : score >= 65
          ? "Decent attempt. Acknowledge concern sooner and anchor the conversation to a short review."
          : "Rebuttal missed key framing. Lead with empathy, then suggest a specific next step.";

  return {
    score,
    grade,
    toneAnalysis,
    feedback,
  };
}
