import { NextRequest, NextResponse } from "next/server";
import {
  ALIGNMENT_ITEMS,
  ALIGNMENT_LABELS,
  BEHAVIORAL_ITEMS,
  BEHAVIORAL_LABELS,
  COGNITIVE_ITEMS,
  COGNITIVE_TIME_LIMIT_SECONDS,
  COMPETENCY_ITEMS,
  LIKERT_LABELS,
  LIKERT_MAX,
  LIKERT_MIN,
  getModule,
  publicCognitiveItems,
  type SelfModuleId,
} from "@/lib/assessments/instruments";
import { COMPETENCIES, ORG_VALUES, TRAITS } from "@/lib/assessments/framework";
import { getAssessment, saveModule } from "@/lib/assessments/store";
import type { ModuleSubmission } from "@/lib/assessments/types";

export const dynamic = "force-dynamic";

/** A battery answered impossibly fast is not a valid administration. */
const MIN_COGNITIVE_SECONDS = 30;
const MAX_COGNITIVE_SECONDS = 4 * 60 * 60;

/** 360 feedback is collected from raters, so it has no self-administered runner. */
function isSelfModuleId(value: string): value is SelfModuleId {
  return value === "competency" || value === "behavioral" || value === "cognitive" || value === "alignment";
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; module: string }> }) {
  const { id, module: moduleParam } = await params;
  if (!isSelfModuleId(moduleParam) || !getModule(moduleParam)) {
    return NextResponse.json({ error: "Unknown module." }, { status: 404 });
  }
  const assessment = await getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  const definition = getModule(moduleParam)!;
  const completedAt = assessment.modules[moduleParam]?.completedAt ?? null;

  if (moduleParam === "competency") {
    return NextResponse.json({
      module: definition,
      completedAt,
      participant: assessment.participant,
      kind: "likert",
      labels: LIKERT_LABELS,
      min: LIKERT_MIN,
      max: LIKERT_MAX,
      // Grouped by competency so the runner can present one section per competency.
      sections: COMPETENCIES.map((c) => ({
        id: c.id,
        title: c.name,
        description: c.definition,
        items: COMPETENCY_ITEMS.filter((i) => i.scale === c.id).map((i) => ({ id: i.id, text: i.self })),
      })),
    });
  }

  if (moduleParam === "behavioral") {
    // Items are interleaved across scales so the response pattern is not obvious.
    const ordered = TRAITS.flatMap((t) => BEHAVIORAL_ITEMS.filter((i) => i.scale === t.id));
    const interleaved = ordered
      .map((item, index) => ({ item, sort: (index % TRAITS.length) * 100 + Math.floor(index / TRAITS.length) }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => ({ id: item.id, text: item.self }));
    return NextResponse.json({
      module: definition,
      completedAt,
      participant: assessment.participant,
      kind: "likert",
      labels: BEHAVIORAL_LABELS,
      min: LIKERT_MIN,
      max: LIKERT_MAX,
      sections: [
        {
          id: "behavioral",
          title: "Behavioural profile",
          description:
            "There are no right answers. Answer as you typically are at work, not as you would like to be.",
          items: interleaved,
        },
      ],
    });
  }

  if (moduleParam === "alignment") {
    return NextResponse.json({
      module: definition,
      completedAt,
      participant: assessment.participant,
      kind: "likert",
      labels: ALIGNMENT_LABELS,
      min: LIKERT_MIN,
      max: LIKERT_MAX,
      // One section per organisational value, so the value being rated is always in view.
      sections: ORG_VALUES.map((v) => ({
        id: v.id,
        title: v.name,
        description: v.statement,
        items: ALIGNMENT_ITEMS.filter((i) => i.scale === v.id).map((i) => ({ id: i.id, text: i.self })),
      })),
    });
  }

  return NextResponse.json({
    module: definition,
    completedAt,
    participant: assessment.participant,
    kind: "cognitive",
    timeLimitSeconds: COGNITIVE_TIME_LIMIT_SECONDS,
    items: publicCognitiveItems(),
  });
}

function parseLikertResponses(
  body: Record<string, unknown>,
  itemIds: Set<string>
): Record<string, number> | { error: string } {
  const raw = body.responses;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { error: "Responses must be an object of item id to rating." };
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length !== itemIds.size) {
    return { error: `Answer every item — ${entries.length} of ${itemIds.size} received.` };
  }
  const responses: Record<string, number> = {};
  for (const [key, value] of entries) {
    if (!itemIds.has(key)) return { error: `Unknown item "${key}".` };
    if (typeof value !== "number" || !Number.isInteger(value) || value < LIKERT_MIN || value > LIKERT_MAX) {
      return { error: `Rating for "${key}" must be an integer between ${LIKERT_MIN} and ${LIKERT_MAX}.` };
    }
    responses[key] = value;
  }
  return responses;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; module: string }> }) {
  const { id, module: moduleParam } = await params;
  if (!isSelfModuleId(moduleParam) || !getModule(moduleParam)) {
    return NextResponse.json({ error: "Unknown module." }, { status: 404 });
  }
  const assessment = await getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

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

  let submission: ModuleSubmission;

  if (moduleParam === "cognitive") {
    const raw = payload.responses;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return NextResponse.json({ error: "Responses must be an object of item id to option id." }, { status: 400 });
    }
    const responses: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const item = COGNITIVE_ITEMS.find((i) => i.id === key);
      if (!item) return NextResponse.json({ error: `Unknown item "${key}".` }, { status: 400 });
      if (typeof value !== "string" || !item.options.some((o) => o.id === value)) {
        return NextResponse.json({ error: `Invalid option for "${key}".` }, { status: 400 });
      }
      responses[key] = value;
    }
    // Unanswered items are allowed on a timed battery — they simply score as incorrect.
    const duration = payload.durationSeconds;
    if (
      typeof duration !== "number" ||
      !Number.isFinite(duration) ||
      duration < MIN_COGNITIVE_SECONDS ||
      duration > MAX_COGNITIVE_SECONDS
    ) {
      return NextResponse.json({ error: "Invalid battery duration." }, { status: 400 });
    }
    submission = {
      responses,
      completedAt: new Date().toISOString(),
      durationSeconds: Math.round(duration),
    };
  } else {
    const items =
      moduleParam === "competency"
        ? COMPETENCY_ITEMS
        : moduleParam === "alignment"
          ? ALIGNMENT_ITEMS
          : BEHAVIORAL_ITEMS;
    const parsed = parseLikertResponses(payload, new Set(items.map((i) => i.id)));
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    submission = { responses: parsed, completedAt: new Date().toISOString() };
  }

  const updated = await saveModule(id, moduleParam, submission);
  if (!updated) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, completedAt: submission.completedAt });
}
