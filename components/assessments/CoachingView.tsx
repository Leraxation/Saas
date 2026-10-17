"use client";

import { Breadcrumb, Card, EmptyState, Spinner } from "./ui";
import { CoachPanel } from "./CoachPanel";
import { useReport } from "./useReport";

export function CoachingView({ assessmentId, aiEnabled }: { assessmentId: string; aiEnabled: boolean }) {
  const { data, error } = useReport(assessmentId);

  if (error) return <EmptyState title="Could not load coaching" body={error} />;
  if (!data) return <Spinner />;

  const { assessment, report } = data;
  const plan = assessment.plan;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Leadership Assessment", href: "/assessments" },
          { label: assessment.participant.name, href: `/assessments/${assessmentId}` },
          { label: "Coaching & Support" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Coaching &amp; Support</h1>
        <p className="text-sm text-slate-500 mt-1">
          Everything here works only from this assessment&apos;s evidence — it will say so when something is not in the
          data rather than filling the gap.
        </p>
      </div>

      <Card title="What the coach is working from" subtitle="The evidence available for this participant.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Readiness</p>
            <p className="text-slate-800 mt-1">
              {report.readiness ? `${report.readiness.score.toFixed(0)} — ${report.readiness.label}` : "Not yet scored"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Focus areas</p>
            <p className="text-slate-800 mt-1">
              {report.focusAreas.length ? report.focusAreas.map((c) => c.name).join(", ") : "Not yet identified"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">360 coverage</p>
            <p className="text-slate-800 mt-1">
              {report.coverage.submitted} of {report.coverage.invited} raters
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Development plan</p>
            <p className="text-slate-800 mt-1">{plan ? `${plan.actions.length} actions agreed` : "Not generated yet"}</p>
          </div>
        </div>
      </Card>

      <CoachPanel
        assessmentId={assessmentId}
        prompts={data.coachingPrompts}
        aiEnabled={aiEnabled}
        initialNotes={assessment.coachingNotes}
      />
    </div>
  );
}
