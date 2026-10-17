import { NextRequest, NextResponse } from "next/server";
import { cohortAnalytics } from "@/lib/assessments/analytics";
import { createAssessment, listAssessments, storageMode, summarise } from "@/lib/assessments/store";
import { parseParticipant } from "@/lib/assessments/validation";

export const dynamic = "force-dynamic";

const MAX_ASSESSMENTS = 200;

export async function GET() {
  const assessments = await listAssessments();
  return NextResponse.json({
    assessments: assessments.map(summarise),
    analytics: cohortAnalytics(assessments),
    storage: storageMode(),
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const participant = parseParticipant(body);
  if (!participant) {
    return NextResponse.json(
      { error: "Name, work email, role, department and leadership level are all required." },
      { status: 400 }
    );
  }

  const existing = await listAssessments();
  if (existing.length >= MAX_ASSESSMENTS) {
    return NextResponse.json({ error: "Assessment limit reached for this workspace." }, { status: 409 });
  }

  const assessment = await createAssessment(participant);
  return NextResponse.json({ assessment: summarise(assessment), id: assessment.id }, { status: 201 });
}
