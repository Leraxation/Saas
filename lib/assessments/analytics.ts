/**
 * Cohort-level analytics: what the organisation sees across every participant,
 * as opposed to what an individual sees in their own report.
 */

import { COMPETENCIES, ORG_VALUES } from "./framework";
import { buildReport, type Report } from "./scoring";
import { competencyNorm } from "./benchmarks";
import type { Assessment } from "./types";

export interface CohortCell {
  assessmentId: string;
  name: string;
  score: number | null;
}

export interface CohortCompetency {
  competencyId: string;
  name: string;
  cluster: string;
  average: number | null;
  norm: number;
  /** average - norm, averaged per participant against their own level's norm. */
  vsNorm: number | null;
  cells: CohortCell[];
}

export interface NineBoxEntry {
  assessmentId: string;
  name: string;
  role: string;
  /** Current demonstrated capability, 0-100. */
  performance: number;
  /** Potential proxy: learning agility and reasoning. */
  potential: number;
  box: string;
  boxLabel: string;
}

export interface CohortAnalytics {
  participants: number;
  reports: number;
  competencies: CohortCompetency[];
  values: { valueId: string; name: string; score: number | null }[];
  nineBox: NineBoxEntry[];
  averageReadiness: number | null;
  feedbackResponseRate: number | null;
  strongest: CohortCompetency | null;
  weakest: CohortCompetency | null;
}

const BOX_LABELS: Record<string, string> = {
  "1-1": "Under-performer",
  "2-1": "Effective",
  "3-1": "Trusted professional",
  "1-2": "Inconsistent potential",
  "2-2": "Core talent",
  "3-2": "High performer",
  "1-3": "Rough diamond",
  "2-3": "Emerging talent",
  "3-3": "Future leader",
};

function band(value: number): 1 | 2 | 3 {
  return value >= 72 ? 3 : value >= 58 ? 2 : 1;
}

function averageOrNull(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function cohortAnalytics(assessments: Assessment[]): CohortAnalytics {
  const reports: { assessment: Assessment; report: Report }[] = assessments.map((assessment) => ({
    assessment,
    report: buildReport(assessment),
  }));

  const competencies: CohortCompetency[] = COMPETENCIES.map((c) => {
    const cells: CohortCell[] = reports.map(({ assessment, report }) => ({
      assessmentId: assessment.id,
      name: assessment.participant.name,
      score: report.competencies.find((s) => s.competencyId === c.id)?.combined ?? null,
    }));
    const scored = cells.map((cell) => cell.score).filter((n): n is number => n !== null);
    const normDeltas = reports
      .map(({ assessment, report }) => {
        const score = report.competencies.find((s) => s.competencyId === c.id)?.combined;
        if (score === undefined || score === null) return null;
        return score - competencyNorm(c.id, assessment.participant.level).mean;
      })
      .filter((n): n is number => n !== null);

    return {
      competencyId: c.id,
      name: c.name,
      cluster: c.cluster,
      average: averageOrNull(scored),
      // Cohort norm reference uses the most common level in the cohort for a single headline figure.
      norm: Math.round(competencyNorm(c.id, modalLevel(assessments)).mean * 10) / 10,
      vsNorm: averageOrNull(normDeltas),
      cells,
    };
  });

  const values = ORG_VALUES.map((v) => ({
    valueId: v.id,
    name: v.name,
    score: averageOrNull(
      reports.map(({ report }) => report.values.find((s) => s.valueId === v.id)?.score ?? 0).filter((n) => n > 0)
    ),
  }));

  const nineBox: NineBoxEntry[] = reports
    .map(({ assessment, report }) => {
      const scored = report.competencies.map((c) => c.combined).filter((n): n is number => n !== null);
      if (!scored.length) return null;
      const performance = scored.reduce((a, b) => a + b, 0) / scored.length;
      const agility = report.traits?.find((t) => t.traitId === "learning-agility")?.score;
      const reasoning = report.cognitive?.score;
      const potentialParts = [agility, reasoning].filter((n): n is number => typeof n === "number");
      // With neither signal available, potential falls back to the competencies that most carry it.
      const potential = potentialParts.length
        ? potentialParts.reduce((a, b) => a + b, 0) / potentialParts.length
        : (report.competencies
            .filter((c) => ["strategic-thinking", "driving-change"].includes(c.competencyId))
            .map((c) => c.combined ?? 0)
            .reduce((a, b) => a + b, 0)) / 2;
      const key = `${band(performance)}-${band(potential)}`;
      return {
        assessmentId: assessment.id,
        name: assessment.participant.name,
        role: assessment.participant.role,
        performance: Math.round(performance * 10) / 10,
        potential: Math.round(potential * 10) / 10,
        box: key,
        boxLabel: BOX_LABELS[key] ?? "",
      };
    })
    .filter((e): e is NineBoxEntry => e !== null);

  const invited = assessments.reduce((a, x) => a + x.raters.length, 0);
  const submitted = assessments.reduce((a, x) => a + x.raters.filter((r) => r.submittedAt).length, 0);

  const ranked = competencies.filter((c) => c.average !== null).sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

  return {
    participants: assessments.length,
    reports: reports.filter(({ report }) => report.completeness.competency).length,
    competencies,
    values,
    nineBox,
    averageReadiness: averageOrNull(
      reports.map(({ report }) => report.readiness?.score).filter((n): n is number => typeof n === "number")
    ),
    feedbackResponseRate: invited ? Math.round((submitted / invited) * 100) : null,
    strongest: ranked[0] ?? null,
    weakest: ranked[ranked.length - 1] ?? null,
  };
}

function modalLevel(assessments: Assessment[]) {
  const counts = new Map<string, number>();
  for (const a of assessments) {
    counts.set(a.participant.level, (counts.get(a.participant.level) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return (top?.[0] ?? "manager") as Assessment["participant"]["level"];
}

export { BOX_LABELS };
