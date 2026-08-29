"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { heatColor, ScoreBar } from "./Charts";
import { BandPill, Card, EmptyState, Spinner, StatTile, relativeDate } from "./ui";
import type { CohortAnalytics } from "@/lib/assessments/analytics";
import type { AssessmentSummary } from "@/lib/assessments/types";

interface Payload {
  assessments: AssessmentSummary[];
  analytics: CohortAnalytics;
  storage: "redis" | "memory";
}

const LEVEL_LABELS: Record<string, string> = {
  emerging: "Emerging",
  manager: "Manager",
  senior: "Senior",
  executive: "Executive",
};

/** Module completion dots, in programme order. */
const MODULE_DOTS = [
  { id: "competency", label: "1. Leadership Competencies" },
  { id: "behavioral", label: "2. Behavioral Assessment" },
  { id: "feedback", label: "3. 360-Degree Feedback" },
  { id: "cognitive", label: "4. Cognitive Assessment" },
  { id: "alignment", label: "5. Organizational Alignment" },
] as const;

const BOXES = [
  ["1-3", "2-3", "3-3"],
  ["1-2", "2-2", "3-2"],
  ["1-1", "2-1", "3-1"],
];

export function CohortDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/assessments")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not load assessments.");
        return body as Payload;
      })
      .then((body) => !cancelled && setData(body))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <EmptyState title="Could not load the cohort" body={error} />;
  }
  if (!data) return <Spinner label="Scoring the cohort…" />;

  const { assessments, analytics } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Leadership Assessment</h1>
          <p className="text-sm text-slate-500 mt-1">
            {analytics.participants === 0
              ? "Competencies, behaviour, cognition and 360-degree feedback in one programme."
              : `Competencies, behaviour, cognition and 360 feedback across ${analytics.participants} ${
                  analytics.participants === 1 ? "leader" : "leaders"
                }.`}
          </p>
        </div>
        <Link
          href="/assessments/new"
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New assessment
        </Link>
      </div>

      {data.storage === "memory" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong className="font-semibold">No database configured.</strong> Assessments are held in memory and are
          lost when the server restarts. Set <code className="font-mono text-xs">UPSTASH_REDIS_REST_URL</code> and{" "}
          <code className="font-mono text-xs">UPSTASH_REDIS_REST_TOKEN</code> to store them for real.
        </p>
      )}

      {analytics.participants === 0 ? (
        <EmptyState
          title="No assessments yet"
          body="Add the first leader to the programme. Once they complete the competency module their report, benchmarks and development plan become available, and the cohort views appear here as more leaders are added."
          action={
            <Link
              href="/assessments/new"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Add the first leader
            </Link>
          }
        />
      ) : (
        <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Participants" value={String(analytics.participants)} hint={`${analytics.reports} scored`} />
        <StatTile
          label="Average readiness"
          value={analytics.averageReadiness === null ? "—" : analytics.averageReadiness.toFixed(0)}
          hint="Composite across all modules"
          tone="indigo"
        />
        <StatTile
          label="360 response rate"
          value={analytics.feedbackResponseRate === null ? "—" : `${analytics.feedbackResponseRate}%`}
          hint="Raters submitted / invited"
          tone={
            analytics.feedbackResponseRate !== null && analytics.feedbackResponseRate >= 70 ? "emerald" : "amber"
          }
        />
        <StatTile
          label="Cohort strength"
          value={analytics.strongest?.name ?? "—"}
          hint={
            analytics.weakest ? `Weakest: ${analytics.weakest.name}` : "Complete a module to see cohort patterns"
          }
        />
      </div>

      <Card
        title="Competency heatmap"
        subtitle="Combined self and observer score per leader, coloured against the reporting bands."
      >
        {analytics.competencies[0]?.cells.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-4 sticky left-0 bg-white">
                    Competency
                  </th>
                  {analytics.competencies[0].cells.map((cell) => (
                    <th key={cell.assessmentId} className="pb-2 px-1 min-w-[92px]">
                      <Link
                        href={`/assessments/${cell.assessmentId}/report`}
                        className="block text-[11px] font-medium text-slate-600 hover:text-indigo-600 leading-tight"
                      >
                        {cell.name}
                      </Link>
                    </th>
                  ))}
                  <th className="pb-2 pl-3 text-[11px] font-medium text-slate-400">Avg</th>
                  <th className="pb-2 pl-3 text-[11px] font-medium text-slate-400">vs norm</th>
                </tr>
              </thead>
              <tbody>
                {analytics.competencies.map((row) => (
                  <tr key={row.competencyId}>
                    <td className="py-1 pr-4 text-slate-700 whitespace-nowrap sticky left-0 bg-white">{row.name}</td>
                    {row.cells.map((cell) => (
                      <td key={cell.assessmentId} className="py-1 px-1">
                        <div
                          className="rounded-md py-1.5 text-center text-xs font-semibold text-slate-800"
                          style={{ background: heatColor(cell.score) }}
                        >
                          {cell.score === null ? "—" : cell.score.toFixed(0)}
                        </div>
                      </td>
                    ))}
                    <td className="py-1 pl-3 text-xs font-semibold text-slate-700 tabular-nums">
                      {row.average === null ? "—" : row.average.toFixed(0)}
                    </td>
                    <td
                      className={`py-1 pl-3 text-xs font-semibold tabular-nums ${
                        (row.vsNorm ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {row.vsNorm === null ? "—" : `${row.vsNorm > 0 ? "+" : ""}${row.vsNorm.toFixed(0)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No scored assessments yet.</p>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card
          title="Talent grid"
          subtitle="Demonstrated capability against potential (learning agility and reasoning)."
        >
          <div className="grid grid-cols-3 gap-1.5">
            {BOXES.flat().map((box) => {
              const entries = analytics.nineBox.filter((e) => e.box === box);
              const [perf, pot] = box.split("-").map(Number);
              const strong = perf === 3 && pot === 3;
              return (
                <div
                  key={box}
                  className={`rounded-lg border p-2.5 min-h-[86px] ${
                    strong ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 leading-tight">
                    {entries[0]?.boxLabel ??
                      { "1-1": "Under-performer", "2-1": "Effective", "3-1": "Trusted professional", "1-2": "Inconsistent potential", "2-2": "Core talent", "3-2": "High performer", "1-3": "Rough diamond", "2-3": "Emerging talent", "3-3": "Future leader" }[box]}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {entries.map((e) => (
                      <Link
                        key={e.assessmentId}
                        href={`/assessments/${e.assessmentId}/report`}
                        className="block text-[11px] font-medium text-slate-700 hover:text-indigo-600 truncate"
                        title={`${e.name} — capability ${e.performance.toFixed(0)}, potential ${e.potential.toFixed(0)}`}
                      >
                        {e.name}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2">
            <span>← lower capability</span>
            <span>higher capability →</span>
          </div>
        </Card>

        <Card title="Organisational alignment" subtitle="How strongly the cohort's behaviour carries each value.">
          <div className="space-y-4">
            {analytics.values.map((v) => (
              <div key={v.valueId}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-700">{v.name}</span>
                  <span className="text-slate-500 tabular-nums">
                    {v.score === null ? "—" : v.score.toFixed(0)}
                  </span>
                </div>
                <ScoreBar value={v.score} color="#6366f1" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Participants" subtitle="Every leader in the programme and where their assessment stands.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-400 border-b border-slate-100">
                <th className="pb-2 pr-4">Leader</th>
                <th className="pb-2 pr-4">Level</th>
                <th className="pb-2 pr-4">Modules</th>
                <th className="pb-2 pr-4">360</th>
                <th className="pb-2 pr-4 w-40">Readiness</th>
                <th className="pb-2 pr-4">Updated</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {assessments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/70">
                  <td className="py-3 pr-4">
                    <Link href={`/assessments/${a.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {a.participant.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {a.participant.role} · {a.participant.department}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-slate-600 text-xs">{LEVEL_LABELS[a.participant.level]}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-1">
                      {MODULE_DOTS.map(({ id, label }) => (
                        <span
                          key={id}
                          title={label}
                          className={`w-2 h-2 rounded-full ${
                            (id === "feedback" ? a.ratersSubmitted > 0 : a.modulesComplete.includes(id))
                              ? "bg-emerald-500"
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-600 tabular-nums">
                    {a.ratersSubmitted}/{a.ratersInvited}
                  </td>
                  <td className="py-3 pr-4">
                    {a.readiness === null ? (
                      <span className="text-xs text-slate-400">Not started</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ScoreBar value={a.readiness} height={6} />
                        <span className="text-xs font-semibold text-slate-700 tabular-nums w-8">
                          {a.readiness.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-500">{relativeDate(a.updatedAt)}</td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/assessments/${a.id}/report`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Report →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
        </>
      )}

      <Card title="Norm reference" subtitle="What the benchmark percentiles compare against.">
        <div className="flex flex-wrap gap-3">
          {["below", "developing", "at", "above", "distinctive"].map((id) => (
            <BandPill key={id} band={{ id, label: { below: "Below norm", developing: "Developing", at: "At norm", above: "Above norm", distinctive: "Distinctive" }[id] as string }} />
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
          Percentiles are calculated against a cross-industry leadership norm group, banded by leadership level, and are
          a documented reference set shipped with this platform. Replace the tables in{" "}
          <code className="font-mono">lib/assessments/benchmarks.ts</code> with your own validated norms before using
          percentiles in a selection decision.
        </p>
      </Card>
    </div>
  );
}
