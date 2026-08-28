/**
 * Scoring engine.
 *
 * Every reported number is derived here from raw responses — nothing is stored
 * pre-scored, so changing a norm table or an item key re-scores existing
 * assessments rather than leaving stale results behind.
 */

import {
  COMPETENCIES,
  COGNITIVE_DOMAINS,
  ORG_VALUES,
  RELATIONSHIPS,
  TRAITS,
  type LeadershipLevel,
  type Relationship,
} from "./framework";
import {
  BEHAVIORAL_ITEMS,
  COGNITIVE_ITEMS,
  COGNITIVE_TIME_LIMIT_SECONDS,
  COMPETENCY_ITEMS,
  LIKERT_MAX,
  LIKERT_MIN,
  type LikertItem,
} from "./instruments";
import {
  COGNITIVE_NORM,
  bandFor,
  competencyNorm,
  percentileOf,
  type BandDefinition,
} from "./benchmarks";
import type { Assessment, Rater } from "./types";

/** Likert 1-5 → 0-100, applying reverse keying. */
function itemScore(item: LikertItem, raw: number): number {
  const bounded = Math.min(LIKERT_MAX, Math.max(LIKERT_MIN, raw));
  const keyed = item.reverse ? LIKERT_MAX + LIKERT_MIN - bounded : bounded;
  return ((keyed - LIKERT_MIN) / (LIKERT_MAX - LIKERT_MIN)) * 100;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round(value: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** Scores one item set (self or a single rater) into per-scale 0-100 scores. */
function scaleScores(
  items: LikertItem[],
  responses: Record<string, number | string> | undefined
): Record<string, number> | null {
  if (!responses) return null;
  const buckets: Record<string, number[]> = {};
  for (const item of items) {
    const raw = responses[item.id];
    if (typeof raw !== "number") continue;
    (buckets[item.scale] ??= []).push(itemScore(item, raw));
  }
  const out: Record<string, number> = {};
  for (const [scale, values] of Object.entries(buckets)) {
    if (values.length) out[scale] = round(mean(values), 1);
  }
  return Object.keys(out).length ? out : null;
}

export interface CompetencyScore {
  competencyId: string;
  name: string;
  cluster: string;
  self: number | null;
  /** Mean across every submitted rater, all relationships pooled. */
  others: number | null;
  byRelationship: Partial<Record<Relationship, number>>;
  /** self - others. Positive = rates self higher than observers do. */
  gap: number | null;
  /** Blend used for benchmarking and readiness: others weighted 2:1 over self when available. */
  combined: number | null;
  percentile: number | null;
  band: BandDefinition | null;
  norm: number;
}

export type GapFlag = "blind-spot" | "hidden-strength" | "aligned";

export function gapFlag(gap: number | null): GapFlag {
  if (gap === null) return "aligned";
  if (gap >= 10) return "blind-spot";
  if (gap <= -10) return "hidden-strength";
  return "aligned";
}

export function scoreCompetencies(assessment: Assessment): CompetencyScore[] {
  const self = scaleScores(COMPETENCY_ITEMS, assessment.modules.competency?.responses);
  const submitted = assessment.raters.filter((r) => r.submittedAt);

  const raterScores = submitted
    .map((r) => ({ relationship: r.relationship, scores: scaleScores(COMPETENCY_ITEMS, r.responses) }))
    .filter((r): r is { relationship: Relationship; scores: Record<string, number> } => r.scores !== null);

  return COMPETENCIES.map((c) => {
    const selfScore = self?.[c.id] ?? null;
    const allOthers = raterScores.map((r) => r.scores[c.id]).filter((v): v is number => typeof v === "number");
    const others = allOthers.length ? round(mean(allOthers), 1) : null;

    const byRelationship: Partial<Record<Relationship, number>> = {};
    for (const rel of RELATIONSHIPS) {
      const values = raterScores
        .filter((r) => r.relationship === rel)
        .map((r) => r.scores[c.id])
        .filter((v): v is number => typeof v === "number");
      if (values.length) byRelationship[rel] = round(mean(values), 1);
    }

    let combined: number | null = null;
    if (selfScore !== null && others !== null) combined = round((selfScore + others * 2) / 3, 1);
    else if (others !== null) combined = others;
    else if (selfScore !== null) combined = selfScore;

    const norm = competencyNorm(c.id, assessment.participant.level);
    const percentile = combined === null ? null : percentileOf(combined, norm);

    return {
      competencyId: c.id,
      name: c.name,
      cluster: c.cluster,
      self: selfScore,
      others,
      byRelationship,
      gap: selfScore !== null && others !== null ? round(selfScore - others, 1) : null,
      combined,
      percentile,
      band: percentile === null ? null : bandFor(percentile),
      norm: round(norm.mean, 1),
    };
  });
}

export interface TraitScore {
  traitId: string;
  name: string;
  score: number;
  /** Sten-style 1-10 band, the conventional psychometric reporting scale. */
  sten: number;
  highLabel: string;
  lowLabel: string;
  /** Populated only at an extreme, where the risk is worth naming. */
  risk: string | null;
  riskKind: "overuse" | "underuse" | null;
}

export function scoreTraits(assessment: Assessment): TraitScore[] | null {
  const scores = scaleScores(BEHAVIORAL_ITEMS, assessment.modules.behavioral?.responses);
  if (!scores) return null;
  return TRAITS.map((t) => {
    const score = scores[t.id] ?? 0;
    const overused = score >= 85;
    const underused = score <= 15;
    return {
      traitId: t.id,
      name: t.name,
      score: round(score, 1),
      sten: Math.min(10, Math.max(1, Math.round((score / 100) * 9) + 1)),
      highLabel: t.highLabel,
      lowLabel: t.lowLabel,
      risk: overused ? t.overuse : underused ? t.underuse : null,
      riskKind: overused ? "overuse" : underused ? "underuse" : null,
    };
  });
}

export interface CognitiveScore {
  domains: { domainId: string; name: string; correct: number; total: number; score: number }[];
  correct: number;
  total: number;
  score: number;
  percentile: number;
  band: BandDefinition;
  durationSeconds: number | null;
  timeLimitSeconds: number;
  /** Items answered per minute — reported alongside accuracy, never instead of it. */
  pace: number | null;
  review: { itemId: string; domainId: string; correct: boolean; chosen: string | null; answer: string; rationale: string }[];
}

export function scoreCognitive(assessment: Assessment): CognitiveScore | null {
  const submission = assessment.modules.cognitive;
  if (!submission) return null;
  const responses = submission.responses;

  const review = COGNITIVE_ITEMS.map((item) => {
    const chosen = responses[item.id];
    const chosenId = typeof chosen === "string" ? chosen : null;
    return {
      itemId: item.id,
      domainId: item.domain,
      correct: chosenId === item.answer,
      chosen: chosenId,
      answer: item.answer,
      rationale: item.rationale,
    };
  });

  const domains = COGNITIVE_DOMAINS.map((d) => {
    const items = review.filter((r) => r.domainId === d.id);
    const correct = items.filter((r) => r.correct).length;
    return {
      domainId: d.id,
      name: d.name,
      correct,
      total: items.length,
      score: items.length ? round((correct / items.length) * 100, 1) : 0,
    };
  });

  const correct = review.filter((r) => r.correct).length;
  const score = round((correct / COGNITIVE_ITEMS.length) * 100, 1);
  const percentile = percentileOf(score, COGNITIVE_NORM);
  const duration = submission.durationSeconds ?? null;

  return {
    domains,
    correct,
    total: COGNITIVE_ITEMS.length,
    score,
    percentile,
    band: bandFor(percentile),
    durationSeconds: duration,
    timeLimitSeconds: COGNITIVE_TIME_LIMIT_SECONDS,
    pace: duration && duration > 0 ? round((COGNITIVE_ITEMS.length / duration) * 60, 2) : null,
    review,
  };
}

export interface ValueAlignment {
  valueId: string;
  name: string;
  statement: string;
  score: number;
  competencies: string[];
}

/** Organisational alignment: competency scores rolled up through the values each competency carries. */
export function scoreValueAlignment(competencyScores: CompetencyScore[]): ValueAlignment[] {
  const byId = new Map(competencyScores.map((c) => [c.competencyId, c]));
  return ORG_VALUES.map((v) => {
    const carriers = COMPETENCIES.filter((c) => c.values.includes(v.id));
    const values = carriers
      .map((c) => byId.get(c.id)?.combined)
      .filter((n): n is number => typeof n === "number");
    return {
      valueId: v.id,
      name: v.name,
      statement: v.statement,
      score: round(mean(values), 1),
      competencies: carriers.map((c) => c.name),
    };
  });
}

export interface Readiness {
  score: number;
  label: string;
  description: string;
  contributions: { label: string; weight: number; value: number }[];
}

/**
 * Readiness blends competency (the core signal), cognitive reasoning and the
 * behavioural scales' contribution to leadership effectiveness. Missing modules
 * drop out and the remaining weights are renormalised, so a partial assessment
 * still reports honestly rather than being penalised for what is not done yet.
 */
export function scoreReadiness(
  competencyScores: CompetencyScore[],
  traits: TraitScore[] | null,
  cognitive: CognitiveScore | null
): Readiness | null {
  const competencyValues = competencyScores
    .map((c) => c.combined)
    .filter((n): n is number => typeof n === "number");
  if (!competencyValues.length) return null;

  const contributions: { label: string; weight: number; value: number }[] = [
    { label: "Leadership competencies", weight: 0.55, value: round(mean(competencyValues), 1) },
  ];

  if (cognitive) {
    contributions.push({ label: "Cognitive reasoning", weight: 0.2, value: cognitive.score });
  }
  if (traits) {
    // Constructive range: distance from an extreme is what predicts effectiveness,
    // so a trait at 50-75 contributes more than one at 95.
    const constructive = traits.map((t) => 100 - Math.abs(t.score - 65) * 1.4);
    contributions.push({
      label: "Behavioural fit",
      weight: 0.25,
      value: round(Math.min(100, Math.max(0, mean(constructive))), 1),
    });
  }

  const totalWeight = contributions.reduce((a, c) => a + c.weight, 0);
  const score = round(
    contributions.reduce((a, c) => a + c.value * (c.weight / totalWeight), 0),
    1
  );

  const label =
    score >= 80 ? "Ready now" : score >= 68 ? "Ready with development" : score >= 55 ? "Developing" : "Early";
  const description =
    score >= 80
      ? "Performs at or above the standard for the next level on the evidence gathered."
      : score >= 68
        ? "Capable of the next level once the named focus areas are closed."
        : score >= 55
          ? "Solid in role; next-level readiness needs deliberate development over the coming year."
          : "Focus on consolidating the current role before a step up.";

  return { score, label, description, contributions };
}

export interface RaterCoverage {
  invited: number;
  submitted: number;
  byRelationship: Record<Relationship, { invited: number; submitted: number }>;
  /** 360 reporting convention: aggregate a group only when it has enough responses to protect anonymity. */
  anonymityThreshold: number;
  suppressed: Relationship[];
}

export const ANONYMITY_THRESHOLD = 2;

export function raterCoverage(raters: Rater[]): RaterCoverage {
  const byRelationship = Object.fromEntries(
    RELATIONSHIPS.map((rel) => {
      const group = raters.filter((r) => r.relationship === rel);
      return [rel, { invited: group.length, submitted: group.filter((r) => r.submittedAt).length }];
    })
  ) as Record<Relationship, { invited: number; submitted: number }>;

  return {
    invited: raters.length,
    submitted: raters.filter((r) => r.submittedAt).length,
    byRelationship,
    anonymityThreshold: ANONYMITY_THRESHOLD,
    // A manager group of one is expected and shown; peer/report groups are suppressed below threshold.
    suppressed: RELATIONSHIPS.filter(
      (rel) => rel !== "manager" && byRelationship[rel].submitted > 0 && byRelationship[rel].submitted < ANONYMITY_THRESHOLD
    ),
  };
}

export interface Report {
  assessmentId: string;
  participant: Assessment["participant"];
  level: LeadershipLevel;
  generatedAt: string;
  competencies: CompetencyScore[];
  traits: TraitScore[] | null;
  cognitive: CognitiveScore | null;
  values: ValueAlignment[];
  readiness: Readiness | null;
  coverage: RaterCoverage;
  strengths: CompetencyScore[];
  focusAreas: CompetencyScore[];
  blindSpots: CompetencyScore[];
  hiddenStrengths: CompetencyScore[];
  raterComments: { relationship: Relationship; strengths: string; development: string }[];
  completeness: { competency: boolean; behavioral: boolean; cognitive: boolean; feedback: boolean };
}

export function buildReport(assessment: Assessment): Report {
  const competencies = scoreCompetencies(assessment);
  const traits = scoreTraits(assessment);
  const cognitive = scoreCognitive(assessment);
  const coverage = raterCoverage(assessment.raters);

  const ranked = competencies
    .filter((c) => c.combined !== null)
    .sort((a, b) => (b.combined ?? 0) - (a.combined ?? 0));

  const submittedRaters = assessment.raters.filter((r) => r.submittedAt);

  return {
    assessmentId: assessment.id,
    participant: assessment.participant,
    level: assessment.participant.level,
    generatedAt: new Date().toISOString(),
    competencies,
    traits,
    cognitive,
    values: scoreValueAlignment(competencies),
    readiness: scoreReadiness(competencies, traits, cognitive),
    coverage,
    strengths: ranked.slice(0, 3),
    focusAreas: ranked.slice(-3).reverse(),
    blindSpots: competencies.filter((c) => gapFlag(c.gap) === "blind-spot"),
    hiddenStrengths: competencies.filter((c) => gapFlag(c.gap) === "hidden-strength"),
    // Comments carry the relationship but never the rater's identity.
    raterComments: submittedRaters
      .filter((r) => r.comments.strengths || r.comments.development)
      .map((r) => ({
        relationship: r.relationship,
        strengths: r.comments.strengths,
        development: r.comments.development,
      })),
    completeness: {
      competency: Boolean(assessment.modules.competency),
      behavioral: Boolean(assessment.modules.behavioral),
      cognitive: Boolean(assessment.modules.cognitive),
      feedback: coverage.submitted > 0,
    },
  };
}
