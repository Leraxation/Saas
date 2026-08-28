/**
 * Development plan generation and the coaching action library.
 *
 * Plans are built deterministically from the report so every participant gets a
 * usable plan with no AI dependency. The /plan endpoint can then rewrite the
 * narrative with Claude when a key is configured — the actions stay as generated
 * so the plan remains traceable to the scores.
 */

import { getCompetency, getTrait } from "./framework";
import type { Report } from "./scoring";
import type { DevelopmentAction, DevelopmentPlan } from "./types";

interface ActionTemplate {
  type: DevelopmentAction["type"];
  action: string;
  measure: string;
  horizon: DevelopmentAction["horizon"];
}

/** 70-20-10 actions per competency: on-the-job, through others, formal. */
const LIBRARY: Record<string, ActionTemplate[]> = {
  "strategic-thinking": [
    {
      type: "experience",
      action: "Own one cross-functional strategic question end to end — frame it, gather evidence, and take a recommendation to the leadership team.",
      measure: "Recommendation presented and a decision taken on it.",
      horizon: "90 days",
    },
    {
      type: "exposure",
      action: "Sit with two leaders outside your function to map how their three-year plans depend on yours.",
      measure: "Written map of the three biggest cross-function dependencies.",
      horizon: "30 days",
    },
    {
      type: "education",
      action: "Work through a strategy toolkit (Porter's five forces, scenario planning) and apply one framework to your own area.",
      measure: "One completed scenario analysis for your function.",
      horizon: "6 months",
    },
  ],
  "decision-making": [
    {
      type: "experience",
      action: "Keep a decision log for every call above a set threshold: the options, the trade-off accepted, and the expected outcome.",
      measure: "Log reviewed at 90 days against what actually happened.",
      horizon: "90 days",
    },
    {
      type: "exposure",
      action: "Ask your manager to review three recent decisions with you — specifically on timing and altitude, not on outcome.",
      measure: "Feedback captured on whether each was decided at the right level.",
      horizon: "30 days",
    },
    {
      type: "education",
      action: "Study a decision-quality method (pre-mortems, expected value under uncertainty) and run one pre-mortem with your team.",
      measure: "Pre-mortem run and risks logged before the next major commitment.",
      horizon: "90 days",
    },
  ],
  communication: [
    {
      type: "experience",
      action: "Take the communications lead on one initiative that spans functions you do not control.",
      measure: "Stakeholder pulse shows the message landed with all affected teams.",
      horizon: "90 days",
    },
    {
      type: "exposure",
      action: "Before your next three significant decisions, pre-brief the two stakeholders most likely to object.",
      measure: "Both pre-briefs held ahead of the announcement each time.",
      horizon: "30 days",
    },
    {
      type: "education",
      action: "Take structured coaching on executive communication — message hierarchy and audience framing.",
      measure: "One rebuilt town-hall or board update using the structure.",
      horizon: "6 months",
    },
  ],
  "emotional-intelligence": [
    {
      type: "experience",
      action: "Run one difficult conversation you have been deferring, and debrief your own impact afterwards.",
      measure: "Conversation held; written note on what you would do differently.",
      horizon: "30 days",
    },
    {
      type: "exposure",
      action: "Ask two trusted colleagues for unfiltered feedback on how you come across under pressure.",
      measure: "Both conversations held and themes captured.",
      horizon: "30 days",
    },
    {
      type: "education",
      action: "Complete an emotional-intelligence programme with a practice component, not theory alone.",
      measure: "Programme completed and one habit adopted from it.",
      horizon: "6 months",
    },
  ],
  "developing-others": [
    {
      type: "experience",
      action: "Delegate one piece of work that genuinely stretches a team member, and coach rather than take it back.",
      measure: "Work delivered by them, with two coaching check-ins logged.",
      horizon: "90 days",
    },
    {
      type: "exposure",
      action: "Build a succession view for your two most critical roles, naming successors and their specific gaps.",
      measure: "Succession view reviewed with your manager and HR.",
      horizon: "90 days",
    },
    {
      type: "education",
      action: "Train in a coaching model (GROW or similar) and use it in your next four one-to-ones.",
      measure: "Four one-to-ones run in the coaching format.",
      horizon: "90 days",
    },
  ],
  "driving-change": [
    {
      type: "experience",
      action: "Take ownership of embedding one change past go-live, through to the point adoption is measured.",
      measure: "Adoption metric agreed up front and reported at 90 days.",
      horizon: "6 months",
    },
    {
      type: "exposure",
      action: "Interview five people most resistant to a current change and publish what you heard back to them.",
      measure: "Five interviews held; themes shared openly with the group.",
      horizon: "30 days",
    },
    {
      type: "education",
      action: "Work through a change-management method (ADKAR, Kotter) and apply its diagnostic to a live initiative.",
      measure: "Diagnostic completed and gaps added to the initiative plan.",
      horizon: "90 days",
    },
  ],
  execution: [
    {
      type: "experience",
      action: "Rebuild your team's commitments so every one has a measure, an owner and a date, reviewed on a fixed cadence.",
      measure: "Commitment tracker live and reviewed weekly for a full quarter.",
      horizon: "90 days",
    },
    {
      type: "exposure",
      action: "Agree an early-escalation standard with your manager — what gets raised, how far ahead, with what attached.",
      measure: "Standard agreed and used on the next slippage.",
      horizon: "30 days",
    },
    {
      type: "education",
      action: "Study an operating-rhythm model and redesign your team's reporting cycle around it.",
      measure: "New cycle running for one full quarter.",
      horizon: "6 months",
    },
  ],
  collaboration: [
    {
      type: "experience",
      action: "Co-own one objective with a peer in another function, sharing the measure rather than splitting it.",
      measure: "Shared objective agreed and reported jointly.",
      horizon: "90 days",
    },
    {
      type: "exposure",
      action: "Resolve one live cross-team friction point directly with your counterpart, without escalating.",
      measure: "Issue closed at your level, with the resolution documented.",
      horizon: "30 days",
    },
    {
      type: "education",
      action: "Train in interest-based negotiation and apply it to your next cross-function resource conflict.",
      measure: "One conflict resolved using the method.",
      horizon: "6 months",
    },
  ],
};

export function actionsFor(competencyId: string): ActionTemplate[] {
  return LIBRARY[competencyId] ?? [];
}

/** Coaching prompts a coach can open a session with, driven by the report. */
export function coachingPrompts(report: Report): string[] {
  const prompts: string[] = [];
  const focus = report.focusAreas[0];
  if (focus) {
    prompts.push(`What makes ${focus.name.toLowerCase()} harder for you than the competencies you scored well on?`);
  }
  const blindSpot = report.blindSpots[0];
  if (blindSpot) {
    prompts.push(
      `Your raters see ${blindSpot.name.toLowerCase()} differently to how you see it. What might they be seeing that you are not?`
    );
  }
  const hidden = report.hiddenStrengths[0];
  if (hidden) {
    prompts.push(`Others rate your ${hidden.name.toLowerCase()} above your own rating. Where is that showing up?`);
  }
  const risk = report.traits?.find((t) => t.risk);
  if (risk) {
    prompts.push(`Where has your ${risk.name.toLowerCase()} cost you something, rather than helped?`);
  }
  prompts.push("Which single change over the next 90 days would make the biggest difference to your team?");
  return prompts.slice(0, 4);
}

function describeBand(score: { name: string; combined: number | null; band: { label: string } | null }): string {
  if (score.combined === null || !score.band) return score.name;
  return `${score.name} (${score.combined.toFixed(0)}, ${score.band.label.toLowerCase()})`;
}

/** Deterministic plan: two focus competencies, leverage strengths, 70-20-10 actions. */
export function generatePlan(report: Report): DevelopmentPlan {
  const focus = report.focusAreas.filter((c) => c.combined !== null).slice(0, 2);
  const leverage = report.strengths.filter((c) => c.combined !== null).slice(0, 2);

  const actions: DevelopmentAction[] = focus.flatMap((c) =>
    actionsFor(c.competencyId).map((t, i) => ({
      id: `${c.competencyId}-${i}`,
      competencyId: c.competencyId,
      type: t.type,
      action: t.action,
      measure: t.measure,
      horizon: t.horizon,
    }))
  );

  const lines: string[] = [];
  const name = report.participant.name.split(" ")[0];

  if (report.readiness) {
    lines.push(
      `**Readiness: ${report.readiness.label} (${report.readiness.score.toFixed(0)}/100).** ${report.readiness.description}`
    );
  }
  if (leverage.length) {
    lines.push(
      `**Build from:** ${leverage.map(describeBand).join(" and ")}. These are where ${name} is already ahead of the norm group — use them as the platform for the focus areas rather than treating development as separate work.`
    );
  }
  if (focus.length) {
    lines.push(
      `**Focus areas:** ${focus.map(describeBand).join(" and ")}. The actions below are weighted 70-20-10 — most of the shift comes from the work itself, not from training.`
    );
  }
  if (report.blindSpots.length) {
    lines.push(
      `**Perception gap:** raters score ${report.blindSpots
        .map((c) => c.name.toLowerCase())
        .join(", ")} below ${name}'s self-rating. Treat the observer view as the operating reality and test it directly in the next coaching session.`
    );
  }
  if (report.hiddenStrengths.length) {
    lines.push(
      `**Under-claimed:** others rate ${report.hiddenStrengths
        .map((c) => c.name.toLowerCase())
        .join(", ")} above the self-rating — confidence, not capability, is the constraint here.`
    );
  }
  const risks = (report.traits ?? []).filter((t) => t.risk);
  for (const t of risks) {
    const trait = getTrait(t.traitId);
    lines.push(`**Watch:** ${trait?.name ?? t.name} sits at an extreme (sten ${t.sten}). ${t.risk}`);
  }
  if (report.cognitive) {
    const weakest = [...report.cognitive.domains].sort((a, b) => a.score - b.score)[0];
    lines.push(
      `**Reasoning:** overall ${report.cognitive.score.toFixed(0)}% (${report.cognitive.band.label.toLowerCase()}, ${report.cognitive.percentile}th percentile). Weakest domain is ${weakest.name.toLowerCase()} — relevant where decisions rest on that kind of evidence.`
    );
  }
  const lowValue = [...report.values].sort((a, b) => a.score - b.score)[0];
  if (lowValue && lowValue.score > 0) {
    lines.push(
      `**Organisational alignment:** lowest alignment is with *${lowValue.name}* (${lowValue.score.toFixed(0)}/100) — "${lowValue.statement}"`
    );
  }
  if (!report.completeness.feedback) {
    lines.push(
      `**Note:** no 360 responses are in yet, so this plan rests on self-report alone. Re-generate once raters have submitted.`
    );
  }

  return {
    focusCompetencies: focus.map((c) => c.competencyId),
    leverageCompetencies: leverage.map((c) => c.competencyId),
    actions,
    narrative: lines.join("\n\n"),
    source: "generated",
    updatedAt: new Date().toISOString(),
  };
}

/** Compact report digest used as context for the AI narrative and the coaching agent. */
export function reportDigest(report: Report): string {
  const lines: string[] = [
    `Participant: ${report.participant.name} — ${report.participant.role}, ${report.participant.department} (level: ${report.level}).`,
  ];
  if (report.readiness) {
    lines.push(`Readiness: ${report.readiness.score.toFixed(0)}/100 — ${report.readiness.label}.`);
  }
  lines.push("Competencies (score / norm / percentile / self-vs-others gap):");
  for (const c of report.competencies) {
    const comp = getCompetency(c.competencyId);
    lines.push(
      `- ${c.name}: ${c.combined === null ? "not assessed" : c.combined.toFixed(0)} vs norm ${c.norm.toFixed(0)}` +
        (c.percentile !== null ? `, ${c.percentile}th pct (${c.band?.label})` : "") +
        (c.gap !== null ? `, self-others gap ${c.gap > 0 ? "+" : ""}${c.gap.toFixed(0)}` : "") +
        (comp ? ` — ${comp.definition}` : "")
    );
  }
  if (report.traits) {
    lines.push("Behavioural profile (0-100, sten):");
    for (const t of report.traits) {
      lines.push(`- ${t.name}: ${t.score.toFixed(0)} (sten ${t.sten})${t.risk ? ` — risk: ${t.risk}` : ""}`);
    }
  }
  if (report.cognitive) {
    lines.push(
      `Cognitive: ${report.cognitive.correct}/${report.cognitive.total} correct (${report.cognitive.percentile}th pct). ` +
        report.cognitive.domains.map((d) => `${d.name} ${d.correct}/${d.total}`).join("; ")
    );
  }
  lines.push(
    `360 coverage: ${report.coverage.submitted} of ${report.coverage.invited} raters submitted.` +
      (report.blindSpots.length ? ` Blind spots: ${report.blindSpots.map((c) => c.name).join(", ")}.` : "") +
      (report.hiddenStrengths.length
        ? ` Hidden strengths: ${report.hiddenStrengths.map((c) => c.name).join(", ")}.`
        : "")
  );
  if (report.raterComments.length) {
    lines.push("Rater comments (anonymised):");
    for (const c of report.raterComments) {
      if (c.strengths) lines.push(`- [${c.relationship}] strength: ${c.strengths}`);
      if (c.development) lines.push(`- [${c.relationship}] development: ${c.development}`);
    }
  }
  lines.push(
    `Values alignment: ${report.values.map((v) => `${v.name} ${v.score.toFixed(0)}`).join(", ")}.`
  );
  return lines.join("\n");
}
