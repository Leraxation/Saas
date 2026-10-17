"use client";

import Link from "next/link";
import { Breadcrumb, Card, EmptyState, Spinner, relativeDate } from "./ui";
import { useReport } from "./useReport";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** The five assessment modules, in the order the programme runs them. */
const MODULES = [
  {
    key: "competency",
    name: "Leadership Competencies",
    blurb: "32 items across the eight-competency model. About 10 minutes.",
    href: "/run/competency",
    cta: "Start module",
  },
  {
    key: "behavioral",
    name: "Behavioral Assessment",
    blurb: "30 psychometric items across six leadership-relevant traits. About 8 minutes.",
    href: "/run/behavioral",
    cta: "Start module",
  },
  {
    key: "feedback",
    name: "360-Degree Feedback",
    blurb: "Observer ratings on the same competency items, from managers, peers, reports and stakeholders.",
    href: "/feedback",
    cta: "Manage raters",
  },
  {
    key: "cognitive",
    name: "Cognitive Assessment",
    blurb: "12 timed reasoning items across four domains. 15-minute limit.",
    href: "/run/cognitive",
    cta: "Start module",
  },
  {
    key: "alignment",
    name: "Organizational Alignment Assessment",
    blurb: "20 items on how closely day-to-day behaviour tracks the organisation's values. About 7 minutes.",
    href: "/run/alignment",
    cta: "Start module",
  },
] as const;

const NEXT_STEPS = [
  { label: "Benchmarking", href: "/benchmarking", blurb: "Percentiles and bands against the norm group." },
  { label: "Development Plans", href: "/plan", blurb: "Focus areas and 70-20-10 actions from the scores." },
  { label: "Coaching & Support", href: "/coaching", blurb: "Evidence-grounded coaching and the session log." },
  { label: "Full Assessment Report", href: "/report", blurb: "Every section in one place." },
];

export function ParticipantHub({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const { data, error } = useReport(assessmentId);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteAssessment() {
    if (!confirm("Delete this assessment and all its responses? This cannot be undone.")) return;
    const res = await fetch(`/api/assessments/${assessmentId}`, { method: "DELETE" });
    if (res.ok) router.push("/assessments");
    else {
      const body = await res.json().catch(() => ({}));
      setDeleteError(body.error ?? "Could not delete the assessment.");
    }
  }

  if (error) return <EmptyState title="Could not load the participant" body={error} />;
  if (!data) return <Spinner />;

  const { assessment, report } = data;
  const submitted = assessment.raters.filter((r) => r.submittedAt).length;
  const done = MODULES.filter((m) => report.completeness[m.key]).length;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: "Leadership Assessment", href: "/assessments" }, { label: assessment.participant.name }]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{assessment.participant.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {assessment.participant.role} · {assessment.participant.department} · {assessment.participant.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/assessments/${assessmentId}/report`}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            View report
          </Link>
          <button
            type="button"
            onClick={deleteAssessment}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
          >
            Delete
          </button>
        </div>
      </div>
      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

      <Card
        title="Assessment modules"
        subtitle={`${done} of ${MODULES.length} complete. Modules can be completed in any order.`}
      >
        <ol className="space-y-3">
          {MODULES.map((m, index) => {
            const complete = report.completeness[m.key];
            const submission = assessment.modules[m.key];
            return (
              <li
                key={m.key}
                className={`rounded-lg border p-4 flex flex-wrap items-center gap-4 ${
                  complete ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                    complete ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {complete ? "✓" : index + 1}
                </span>
                <div className="flex-1 min-w-[260px]">
                  <h3 className="text-sm font-semibold text-slate-900">{m.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{m.blurb}</p>
                  {m.key === "feedback" ? (
                    <p className="text-xs text-slate-500 mt-1">
                      {submitted} of {assessment.raters.length} raters have responded.
                    </p>
                  ) : (
                    submission && (
                      <p className="text-xs text-slate-500 mt-1">
                        Submitted {relativeDate(submission.completedAt)}
                        {submission.durationSeconds
                          ? ` · ${Math.floor(submission.durationSeconds / 60)}m ${submission.durationSeconds % 60}s`
                          : ""}
                      </p>
                    )
                  )}
                </div>
                <Link
                  href={`/assessments/${assessmentId}${m.href}`}
                  className={`rounded-lg px-3.5 py-2 text-xs font-medium ${
                    complete
                      ? "border border-slate-200 text-slate-700 hover:bg-white"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {complete && m.key !== "feedback" ? "Review or retake" : m.cta}
                </Link>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card title="Outputs" subtitle="Available as soon as there are scores to work from.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {NEXT_STEPS.map((step) => (
            <Link
              key={step.href}
              href={`/assessments/${assessmentId}${step.href}`}
              className="rounded-lg border border-slate-200 p-4 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
            >
              <p className="text-sm font-medium text-slate-900">{step.label}</p>
              <p className="text-xs text-slate-500 mt-1">{step.blurb}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
