"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Donut, RadarChart, RadarLegend, ScoreBar, TraitStrip } from "./Charts";
import { BandPill, Breadcrumb, Card, EmptyState, GapPill, Spinner, StatTile } from "./ui";
import { PlanPanel } from "./PlanPanel";
import { CoachPanel } from "./CoachPanel";
import type { Report } from "@/lib/assessments/scoring";
import type { CoachingNote, DevelopmentPlan } from "@/lib/assessments/types";

interface Payload {
  assessment: {
    id: string;
    participant: Report["participant"];
    createdAt: string;
    updatedAt: string;
    plan: DevelopmentPlan | null;
    coachingNotes: CoachingNote[];
  };
  report: Report;
  coachingPrompts: string[];
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  manager: "Manager",
  peer: "Peers",
  "direct-report": "Direct reports",
  stakeholder: "Stakeholders",
};

const LEVEL_LABELS: Record<string, string> = {
  emerging: "Emerging Leader",
  manager: "Manager of People",
  senior: "Senior Leader",
  executive: "Executive",
};

export function ReportView({ assessmentId, aiEnabled }: { assessmentId: string; aiEnabled: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/assessments/${assessmentId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not load the report.");
        return body as Payload;
      })
      .then((body) => {
        if (cancelled) return;
        setData(body);
        setPlan(body.assessment.plan);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  if (error) return <EmptyState title="Could not load the report" body={error} />;
  if (!data) return <Spinner label="Scoring the assessment…" />;

  const { report } = data;
  const participant = report.participant;
  const competencyNames = Object.fromEntries(report.competencies.map((c) => [c.competencyId, c.name]));
  const scored = report.competencies.filter((c) => c.combined !== null);

  if (!report.completeness.competency && report.coverage.submitted === 0) {
    return (
      <div>
        <Breadcrumb
          items={[
            { label: "Leadership Assessment", href: "/assessments" },
            { label: participant.name, href: `/assessments/${assessmentId}` },
            { label: "Report" },
          ]}
        />
        <EmptyState
          title="Nothing to report yet"
          body={`${participant.name} has not completed any module and no 360 feedback has been received. The report becomes available as soon as the competency module is submitted.`}
          action={
            <Link
              href={`/assessments/${assessmentId}`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Back to the participant
            </Link>
          }
        />
      </div>
    );
  }

  const radarSeries = [
    {
      label: "Self",
      color: "#6366f1",
      values: report.competencies.map((c) => c.self),
      fill: true,
    },
    ...(report.coverage.submitted > 0
      ? [
          {
            label: `Observers (${report.coverage.submitted})`,
            color: "#10b981",
            values: report.competencies.map((c) => c.others),
            fill: true,
          },
        ]
      : []),
    {
      label: "Norm",
      color: "#94a3b8",
      values: report.competencies.map((c) => c.norm),
      dashed: true,
      fill: false,
    },
  ].filter((s) => s.values.every((v) => v !== null));

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Leadership Assessment", href: "/assessments" },
          { label: participant.name, href: `/assessments/${assessmentId}` },
          { label: "Report" },
        ]}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-wrap items-center gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{participant.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {participant.role} · {participant.department} · {LEVEL_LABELS[report.level]}
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            {(
              [
                ["Competencies", report.completeness.competency],
                ["Behavioural", report.completeness.behavioral],
                ["Cognitive", report.completeness.cognitive],
                ["360 feedback", report.completeness.feedback],
              ] as const
            ).map(([label, complete]) => (
              <span
                key={label}
                className={`rounded-full px-2.5 py-1 font-medium ${
                  complete ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                }`}
              >
                {complete ? "✓" : "○"} {label}
              </span>
            ))}
          </div>
        </div>
        {report.readiness && (
          <div className="flex items-center gap-5 ml-auto">
            <Donut
              value={report.readiness.score}
              label={report.readiness.score.toFixed(0)}
              sublabel="readiness"
              color="#4f46e5"
            />
            <div className="max-w-xs">
              <p className="text-sm font-semibold text-slate-900">{report.readiness.label}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{report.readiness.description}</p>
              <ul className="mt-2 space-y-0.5">
                {report.readiness.contributions.map((c) => (
                  <li key={c.label} className="text-[11px] text-slate-400">
                    {c.label} — {c.value.toFixed(0)} ({Math.round(c.weight * 100)}% weight)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card title="Competency profile" className="lg:col-span-2">
          <RadarChart axes={report.competencies.map((c) => c.name)} series={radarSeries} />
          <div className="mt-2">
            <RadarLegend series={radarSeries} />
          </div>
        </Card>

        <Card
          title="Competency detail"
          subtitle="Combined score weights observer ratings 2:1 over the self-rating."
          className="lg:col-span-3"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-400 border-b border-slate-100">
                  <th className="pb-2 pr-3">Competency</th>
                  <th className="pb-2 pr-3 w-32">Score vs norm</th>
                  <th className="pb-2 pr-3 text-right">Self</th>
                  <th className="pb-2 pr-3 text-right">Others</th>
                  <th className="pb-2 pr-3 text-right">Gap</th>
                  <th className="pb-2 pr-3 text-right">Pct</th>
                  <th className="pb-2">Band</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {report.competencies.map((c) => (
                  <tr key={c.competencyId}>
                    <td className="py-2.5 pr-3 text-slate-700">{c.name}</td>
                    <td className="py-2.5 pr-3">
                      <ScoreBar value={c.combined} norm={c.norm} />
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                      {c.self === null ? "—" : c.self.toFixed(0)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                      {c.others === null ? "—" : c.others.toFixed(0)}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <GapPill gap={c.gap} />
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                      {c.percentile === null ? "—" : c.percentile}
                    </td>
                    <td className="py-2.5">
                      <BandPill band={c.band} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Strengths" subtitle="Highest scoring, ahead of the norm group.">
          <ul className="space-y-3">
            {report.strengths.map((c) => (
              <li key={c.competencyId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <span className="tabular-nums text-slate-500">{c.combined?.toFixed(0)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.percentile}th percentile · {c.band?.label}
                </p>
              </li>
            ))}
            {!report.strengths.length && <li className="text-sm text-slate-400">Not enough data yet.</li>}
          </ul>
        </Card>

        <Card title="Focus areas" subtitle="Lowest scoring against the standard for this level.">
          <ul className="space-y-3">
            {report.focusAreas.map((c) => (
              <li key={c.competencyId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <span className="tabular-nums text-slate-500">{c.combined?.toFixed(0)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.percentile}th percentile · norm {c.norm.toFixed(0)}
                </p>
              </li>
            ))}
            {!report.focusAreas.length && <li className="text-sm text-slate-400">Not enough data yet.</li>}
          </ul>
        </Card>

        <Card title="Perception gaps" subtitle="Where the self view and the observer view diverge by 10+ points.">
          {report.coverage.submitted === 0 ? (
            <p className="text-sm text-slate-400">No 360 responses received yet.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Blind spots</p>
                {report.blindSpots.length ? (
                  <ul className="mt-1.5 space-y-1">
                    {report.blindSpots.map((c) => (
                      <li key={c.competencyId} className="text-sm text-slate-700 flex justify-between">
                        {c.name} <GapPill gap={c.gap} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">None — self and observer views are aligned.</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-sky-600">Hidden strengths</p>
                {report.hiddenStrengths.length ? (
                  <ul className="mt-1.5 space-y-1">
                    {report.hiddenStrengths.map((c) => (
                      <li key={c.competencyId} className="text-sm text-slate-700 flex justify-between">
                        {c.name} <GapPill gap={c.gap} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">None identified.</p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card
        title="360-degree feedback"
        subtitle={`${report.coverage.submitted} of ${report.coverage.invited} raters have responded.`}
      >
        {report.coverage.invited === 0 ? (
          <p className="text-sm text-slate-500">
            No raters invited yet.{" "}
            <Link href={`/assessments/${assessmentId}`} className="text-indigo-600 hover:text-indigo-800">
              Invite raters
            </Link>{" "}
            to add the observer view.
          </p>
        ) : (
          <>
            <div className="grid sm:grid-cols-4 gap-4">
              {Object.entries(report.coverage.byRelationship).map(([rel, counts]) => (
                <StatTile
                  key={rel}
                  label={RELATIONSHIP_LABELS[rel] ?? rel}
                  value={`${counts.submitted}/${counts.invited}`}
                  hint={
                    report.coverage.suppressed.includes(rel as never)
                      ? `Suppressed — under ${report.coverage.anonymityThreshold} responses`
                      : counts.submitted === 0
                        ? "Awaiting responses"
                        : "Included in the observer score"
                  }
                />
              ))}
            </div>

            {report.coverage.submitted > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-slate-400 border-b border-slate-100">
                      <th className="pb-2 pr-3">Competency</th>
                      <th className="pb-2 pr-3 text-right">Self</th>
                      {Object.keys(report.coverage.byRelationship).map((rel) => (
                        <th key={rel} className="pb-2 pr-3 text-right">
                          {RELATIONSHIP_LABELS[rel] ?? rel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {report.competencies.map((c) => (
                      <tr key={c.competencyId}>
                        <td className="py-2 pr-3 text-slate-700">{c.name}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                          {c.self === null ? "—" : c.self.toFixed(0)}
                        </td>
                        {Object.keys(report.coverage.byRelationship).map((rel) => {
                          const suppressed = report.coverage.suppressed.includes(rel as never);
                          const value = c.byRelationship[rel as keyof typeof c.byRelationship];
                          return (
                            <td key={rel} className="py-2 pr-3 text-right tabular-nums text-slate-700">
                              {suppressed ? (
                                <span className="text-slate-300" title="Suppressed to protect rater anonymity">
                                  •
                                </span>
                              ) : value === undefined ? (
                                "—"
                              ) : (
                                value.toFixed(0)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.coverage.suppressed.length > 0 && (
                  <p className="text-xs text-slate-400 mt-3">
                    Groups with fewer than {report.coverage.anonymityThreshold} responses are suppressed to protect rater
                    anonymity. Their ratings still count towards the pooled observer score.
                  </p>
                )}
              </div>
            )}

            {report.raterComments.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Written feedback</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {report.raterComments.map((c, i) => (
                    <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {RELATIONSHIP_LABELS[c.relationship] ?? c.relationship}
                      </span>
                      {c.strengths && (
                        <p className="mt-2 text-sm text-slate-700">
                          <span className="font-medium text-emerald-700">Strength: </span>
                          {c.strengths}
                        </p>
                      )}
                      {c.development && (
                        <p className="mt-2 text-sm text-slate-700">
                          <span className="font-medium text-amber-700">Development: </span>
                          {c.development}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  Comments are shown by relationship only — never attributed to an individual rater.
                </p>
              </div>
            )}
          </>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card
          title="Behavioural profile"
          subtitle="Psychometric scales on the 1-10 sten scale. There is no good or bad score — only fit and risk."
        >
          {report.traits ? (
            <div className="space-y-5">
              {report.traits.map((t) => (
                <div key={t.traitId}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-800">{t.name}</span>
                    <span className="text-xs text-slate-500 tabular-nums">sten {t.sten}</span>
                  </div>
                  <TraitStrip sten={t.sten} color={t.risk ? "#f59e0b" : "#6366f1"} />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>{t.lowLabel}</span>
                    <span>{t.highLabel}</span>
                  </div>
                  {t.risk && (
                    <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                      {t.riskKind === "overuse" ? "At the high extreme" : "At the low extreme"} — {t.risk}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              The behavioural module has not been completed.{" "}
              <Link href={`/assessments/${assessmentId}/run/behavioral`} className="text-indigo-600 hover:text-indigo-800">
                Start it
              </Link>
              .
            </p>
          )}
        </Card>

        <Card title="Cognitive battery" subtitle="Reasoning accuracy against the norm group, with a per-domain view.">
          {report.cognitive ? (
            <>
              <div className="flex items-center gap-6">
                <Donut
                  value={report.cognitive.score}
                  label={`${report.cognitive.correct}/${report.cognitive.total}`}
                  sublabel="correct"
                  color="#0ea5e9"
                  size={118}
                />
                <div className="space-y-1.5">
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">{report.cognitive.percentile}th percentile</span> against the norm
                    group
                  </p>
                  <BandPill band={report.cognitive.band} />
                  {report.cognitive.durationSeconds !== null && (
                    <p className="text-xs text-slate-500">
                      Completed in {Math.floor(report.cognitive.durationSeconds / 60)}m{" "}
                      {report.cognitive.durationSeconds % 60}s of the{" "}
                      {Math.round(report.cognitive.timeLimitSeconds / 60)}-minute limit
                      {report.cognitive.pace !== null && ` · ${report.cognitive.pace.toFixed(1)} items/min`}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {report.cognitive.domains.map((d) => (
                  <div key={d.domainId}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-700">{d.name}</span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {d.correct}/{d.total}
                      </span>
                    </div>
                    <ScoreBar value={d.score} color="#0ea5e9" height={6} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              The cognitive battery has not been completed.{" "}
              <Link href={`/assessments/${assessmentId}/run/cognitive`} className="text-indigo-600 hover:text-indigo-800">
                Start it
              </Link>
              .
            </p>
          )}
        </Card>
      </div>

      <Card
        title="Organisational alignment"
        subtitle="How strongly this leader's assessed behaviour carries each organisational value."
      >
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
          {report.values.map((v) => (
            <div key={v.valueId}>
              <div className="flex items-baseline justify-between text-sm mb-1">
                <span className="font-medium text-slate-800">{v.name}</span>
                <span className="tabular-nums text-slate-500">{v.score.toFixed(0)}</span>
              </div>
              <ScoreBar value={v.score} color="#8b5cf6" />
              <p className="text-xs text-slate-500 mt-1.5">{v.statement}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Carried by: {v.competencies.join(", ")}</p>
            </div>
          ))}
        </div>
      </Card>

      <PlanPanel
        assessmentId={assessmentId}
        plan={plan}
        competencyNames={competencyNames}
        aiAvailable={aiEnabled}
        canGenerate={scored.length > 0}
        onPlanChange={setPlan}
      />

      <CoachPanel
        assessmentId={assessmentId}
        prompts={data.coachingPrompts}
        aiEnabled={aiEnabled}
        initialNotes={data.assessment.coachingNotes}
      />

      <p className="text-xs text-slate-400 pb-4">
        Report generated {new Date(report.generatedAt).toLocaleString()}. Scores are computed from the raw responses on
        every load, so changing a norm table or an item key re-scores this report rather than leaving a stale result.
      </p>
    </div>
  );
}
