import { NextResponse } from "next/server";
import { recordRebuttalScore } from "@/lib/convex";
import { scoreRebuttalResponse } from "@/lib/rebuttal-scoring";

type ScorePayload = {
  sessionKey?: string;
  traineeResponse?: string;
  expectedRebuttalType?: string;
  objectionId?: string;
  toneHint?: string;
};

export async function POST(request: Request) {
  let payload: ScorePayload = {};
  try {
    payload = (await request.json()) as ScorePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.sessionKey || !payload.traineeResponse || !payload.expectedRebuttalType) {
    return NextResponse.json(
      { error: "sessionKey, traineeResponse, and expectedRebuttalType are required." },
      { status: 400 },
    );
  }

  const scoring = scoreRebuttalResponse({
    expectedRebuttalType: payload.expectedRebuttalType,
    traineeResponse: payload.traineeResponse,
    toneHint: payload.toneHint,
  });

  await recordRebuttalScore({
    sessionKey: payload.sessionKey,
    objectionId: payload.objectionId,
    rebuttalTypeExpected: payload.expectedRebuttalType,
    agentResponse: payload.traineeResponse,
    toneAnalysis: scoring.toneAnalysis,
    score: scoring.score,
    grade: scoring.grade,
    feedback: scoring.feedback,
  });

  return NextResponse.json({
    score: scoring.score,
    grade: scoring.grade,
    toneAnalysis: scoring.toneAnalysis,
    feedback: scoring.feedback,
  });
}
