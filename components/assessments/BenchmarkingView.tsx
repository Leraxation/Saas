"use client";

import { Donut, ScoreBar } from "./Charts";
import { BandPill, Breadcrumb, Card, EmptyState, Spinner, StatTile } from "./ui";
import { useReport } from "./useReport";
import { LEVEL_LABELS } from "./sections";
import { BANDS, NORM_GROUP } from "@/lib/assessments/benchmarks";

/** Percentile view: how this leader compares with the norm group for their level. */
export function BenchmarkingView({ assessmentId }: { assessmentId: string }) {
  const { data, error } = useReport(assessmentId);

  if (error) return <EmptyState title="Could not load benchmarking" body={error} />;
  if (!data) return <Spinner />;

  const { assessment, report } = data;
  const scored = report.competencies.filter((c) => c.percentile !== null);

  if (!scored.length) {
    return (
      <div>
        <Breadcrumb
          items={[
            { label: "Leadership Assessment", href: "/assessments" },
            { label: assessment.participant.name, href: `/assessments/${assessmentId}` },
            { label: "Benchmarking" },
          ]}
        />
        <EmptyState
          title="Nothing to benchmark yet"
          body="Percentiles need competency scores. Complete the Leadership Competencies module, or collect 360 feedback, and this view fills in."
        />
      </div>
    );
  }

  const above = scored.filter((c) => (c.percentile ?? 0) >= 70).length;
  const below = scored.filter((c) => (c.percentile ?? 0) < 25).length;
  const median = [...scored].sort((a, b) => (a.percentile ?? 0) - (b.percentile ?? 0))[Math.floor(scored.length / 2)];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Leadership Assessment", href: "/assessments" },
          { label: assessment.participant.name, href: `/assessments/${assessmentId}` },
          { label: "Benchmarking" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Benchmarking</h1>
        <p className="text-sm text-slate-500 mt-1">
          {assessment.participant.name} against the {LEVEL_LABELS[report.level].toLowerCase()} norm group.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Median percentile"
          value={median?.percentile === null ? "—" : `${median?.percentile}`}
          hint="Across all scored competencies"
          tone="indigo"
        />
        <StatTile label="Above norm" value={`${above}`} hint="Competencies at the 70th percentile or higher" tone="emerald" />
        <StatTile label="Below norm" value={`${below}`} hint="Bottom quartile against the norm group" tone={below ? "amber" : "default"} />
        <StatTile
          label="Cognitive percentile"
          value={report.cognitive ? `${report.cognitive.percentile}` : "—"}
          hint={report.cognitive ? report.cognitive.band.label : "Cognitive assessment not completed"}
        />
      </div>

      <Card
        title="Competency percentiles"
        subtitle="Score against the norm mean for this level, with the percentile it lands on."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-400 border-b border-slate-100">
                <th className="pb-2 pr-3">Competency</th>
                <th className="pb-2 pr-3 w-40">Score vs norm</th>
                <th className="pb-2 pr-3 text-right">Score</th>
                <th className="pb-2 pr-3 text-right">Norm</th>
                <th className="pb-2 pr-3 text-right">Diff</th>
                <th className="pb-2 pr-3 text-right">Percentile</th>
                <th className="pb-2">Band</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {report.competencies.map((c) => {
                const diff = c.combined === null ? null : c.combined - c.norm;
                return (
                  <tr key={c.competencyId}>
                    <td className="py-2.5 pr-3 text-slate-700">{c.name}</td>
                    <td className="py-2.5 pr-3">
                      <ScoreBar value={c.combined} norm={c.norm} />
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700 font-medium">
                      {c.combined === null ? "—" : c.combined.toFixed(0)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500">{c.norm.toFixed(0)}</td>
                    <td
                      className={`py-2.5 pr-3 text-right tabular-nums font-medium ${
                        diff === null ? "text-slate-400" : diff >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(0)}`}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{c.percentile ?? "—"}</td>
                    <td className="py-2.5">
                      <BandPill band={c.band} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {report.cognitive && (
        <Card title="Cognitive benchmark" subtitle="Reasoning accuracy against the whole norm group, not banded by level.">
          <div className="flex flex-wrap items-center gap-8">
            <Donut
              value={report.cognitive.percentile}
              label={`${report.cognitive.percentile}`}
              sublabel="percentile"
              color="#0ea5e9"
            />
            <div className="space-y-2">
              <BandPill band={report.cognitive.band} />
              <p className="text-sm text-slate-600">
                {report.cognitive.correct} of {report.cognitive.total} correct ({report.cognitive.score.toFixed(0)}%).
              </p>
              <p className="text-xs text-slate-500 max-w-md">{report.cognitive.band.description}</p>
            </div>
          </div>
        </Card>
      )}

      <Card title="How to read these numbers" subtitle={`${NORM_GROUP.name} · updated ${NORM_GROUP.updated}`}>
        <div className="space-y-2.5">
          {BANDS.map((band) => (
            <div key={band.id} className="flex items-start gap-3">
              <span className="w-24 flex-shrink-0">
                <BandPill band={band} />
              </span>
              <span className="text-sm text-slate-600">
                <span className="text-slate-400 tabular-nums mr-2">{band.min}th+</span>
                {band.description}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-5 leading-relaxed">
          {NORM_GROUP.description} The shipped tables are a documented reference set, not a validated norm group —
          replace them in <code className="font-mono">lib/assessments/benchmarks.ts</code> with your own before using
          percentiles in a selection decision.
        </p>
      </Card>
    </div>
  );
}
