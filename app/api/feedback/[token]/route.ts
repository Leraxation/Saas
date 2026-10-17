import { NextRequest, NextResponse } from "next/server";
import { RELATIONSHIP_LABELS } from "@/lib/assessments/framework";
import { COMPETENCIES } from "@/lib/assessments/framework";
import { COMPETENCY_ITEMS, LIKERT_LABELS, LIKERT_MAX, LIKERT_MIN } from "@/lib/assessments/instruments";
import { findByToken, submitRaterFeedback } from "@/lib/assessments/store";
import { optionalString, MAX_TEXT } from "@/lib/assessments/validation";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const context = await findByToken(token);
  if (!context) {
    return NextResponse.json({ error: "This feedback link is not valid." }, { status: 404 });
  }
  const { assessment, rater } = context;

  return NextResponse.json({
    // A rater sees who they are rating and in what capacity — and nothing else about the assessment.
    participant: {
      name: assessment.participant.name,
      role: assessment.participant.role,
      department: assessment.participant.department,
    },
    rater: {
      name: rater.name,
      relationship: rater.relationship,
      relationshipLabel: RELATIONSHIP_LABELS[rater.relationship],
      submittedAt: rater.submittedAt,
    },
    labels: LIKERT_LABELS,
    min: LIKERT_MIN,
    max: LIKERT_MAX,
    sections: COMPETENCIES.map((c) => ({
      id: c.id,
      title: c.name,
      description: c.definition,
      items: COMPETENCY_ITEMS.filter((i) => i.scale === c.id).map((i) => ({ id: i.id, text: i.observer })),
    })),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;

  const raw = payload.responses;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return NextResponse.json({ error: "Responses must be an object of item id to rating." }, { status: 400 });
  }
  const itemIds = new Set(COMPETENCY_ITEMS.map((i) => i.id));
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length !== itemIds.size) {
    return NextResponse.json(
      { error: `Answer every item — ${entries.length} of ${itemIds.size} received.` },
      { status: 400 }
    );
  }
  const responses: Record<string, number> = {};
  for (const [key, value] of entries) {
    if (!itemIds.has(key)) {
      return NextResponse.json({ error: `Unknown item "${key}".` }, { status: 400 });
    }
    if (typeof value !== "number" || !Number.isInteger(value) || value < LIKERT_MIN || value > LIKERT_MAX) {
      return NextResponse.json({ error: `Rating for "${key}" is out of range.` }, { status: 400 });
    }
    responses[key] = value;
  }

  const strengths = optionalString((payload.comments as Record<string, unknown>)?.strengths, MAX_TEXT);
  const development = optionalString((payload.comments as Record<string, unknown>)?.development, MAX_TEXT);
  if (strengths === null || development === null) {
    return NextResponse.json({ error: `Comments must each be under ${MAX_TEXT} characters.` }, { status: 400 });
  }

  const result = await submitRaterFeedback(token, responses, { strengths, development });
  if (!result.ok) {
    return result.reason === "already-submitted"
      ? NextResponse.json({ error: "You have already submitted feedback for this person." }, { status: 409 })
      : NextResponse.json({ error: "This feedback link is not valid." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
