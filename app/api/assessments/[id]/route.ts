import { NextResponse } from "next/server";
import { buildReport } from "@/lib/assessments/scoring";
import { coachingPrompts } from "@/lib/assessments/development";
import { deleteAssessment, getAssessment, storageMode } from "@/lib/assessments/store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessment = await getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }
  const report = buildReport(assessment);
  return NextResponse.json({
    assessment: {
      id: assessment.id,
      participant: assessment.participant,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
      modules: Object.fromEntries(
        Object.entries(assessment.modules).map(([key, value]) => [
          key,
          { completedAt: value.completedAt, durationSeconds: value.durationSeconds ?? null },
        ])
      ),
      // The invitation link is a credential: it is returned for the administrator to send on,
      // and is the only way a rater reaches their form.
      raters: assessment.raters.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        relationship: r.relationship,
        invitedAt: r.invitedAt,
        submittedAt: r.submittedAt,
        link: `/feedback/${r.token}`,
      })),
      plan: assessment.plan,
      coachingNotes: assessment.coachingNotes,
    },
    report,
    coachingPrompts: coachingPrompts(report),
    storage: storageMode(),
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const removed = await deleteAssessment(id);
  if (!removed) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
