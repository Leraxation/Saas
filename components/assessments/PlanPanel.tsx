"use client";

import { useState } from "react";
import { Card } from "./ui";
import type { DevelopmentPlan } from "@/lib/assessments/types";

const TYPE_META = {
  experience: { label: "70 · On the job", tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  exposure: { label: "20 · Through others", tone: "bg-sky-50 text-sky-700 border-sky-200" },
  education: { label: "10 · Formal learning", tone: "bg-slate-100 text-slate-600 border-slate-200" },
} as const;

/** Minimal markdown rendering: bold spans and paragraphs, which is all the narrative uses. */
function Narrative({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i}>
          {paragraph.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={j} className="font-semibold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
              return <em key={j}>{part.slice(1, -1)}</em>;
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      ))}
    </div>
  );
}

export function PlanPanel({
  assessmentId,
  plan,
  competencyNames,
  aiAvailable,
  canGenerate,
  onPlanChange,
}: {
  assessmentId: string;
  plan: DevelopmentPlan | null;
  competencyNames: Record<string, string>;
  aiAvailable: boolean;
  canGenerate: boolean;
  onPlanChange: (plan: DevelopmentPlan) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  async function generate(useAi: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/plan${useAi ? "?ai=1" : ""}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not generate the plan.");
      onPlanChange(body.plan as DevelopmentPlan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the plan.");
    } finally {
      setBusy(false);
    }
  }

  const byType = (type: keyof typeof TYPE_META) => plan?.actions.filter((a) => a.type === type) ?? [];

  return (
    <Card
      title="Development plan"
      subtitle="Generated from the scores above, weighted 70-20-10."
      action={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => generate(false)}
            disabled={busy || !canGenerate}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            {busy ? "Working…" : plan ? "Regenerate" : "Generate plan"}
          </button>
          {aiAvailable && (
            <button
              type="button"
              onClick={() => generate(true)}
              disabled={busy || !canGenerate}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              Write with AI
            </button>
          )}
        </div>
      }
    >
      {!canGenerate && (
        <p className="text-sm text-slate-500">
          Complete the competency module first — the plan is built from those scores.
        </p>
      )}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {!plan && canGenerate && (
        <p className="text-sm text-slate-500">
          No plan generated yet. Generating produces focus areas and 70-20-10 actions traced to the assessment scores.
          {aiAvailable
            ? " “Write with AI” keeps the same actions and rewrites the narrative."
            : " Add ANTHROPIC_API_KEY to also have the narrative written by Claude."}
        </p>
      )}

      {plan && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {plan.focusCompetencies.map((id) => (
              <span
                key={id}
                className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800"
              >
                Focus: {competencyNames[id] ?? id}
              </span>
            ))}
            {plan.leverageCompetencies.map((id) => (
              <span
                key={id}
                className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-800"
              >
                Build from: {competencyNames[id] ?? id}
              </span>
            ))}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
              {plan.source === "ai" ? "Narrative written by Claude" : "Generated from scores"}
            </span>
          </div>

          <Narrative text={plan.narrative} />

          <div className="space-y-5">
            {(Object.keys(TYPE_META) as (keyof typeof TYPE_META)[]).map((type) => {
              const actions = byType(type);
              if (!actions.length) return null;
              return (
                <div key={type}>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${TYPE_META[type].tone}`}
                  >
                    {TYPE_META[type].label}
                  </span>
                  <ul className="mt-3 space-y-2.5">
                    {actions.map((action) => (
                      <li key={action.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(done[action.id])}
                            onChange={(e) => setDone((prev) => ({ ...prev, [action.id]: e.target.checked }))}
                            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="flex-1">
                            <span
                              className={`block text-sm ${
                                done[action.id] ? "text-slate-400 line-through" : "text-slate-800"
                              }`}
                            >
                              {action.action}
                            </span>
                            <span className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="font-medium text-slate-600">{competencyNames[action.competencyId]}</span>
                              <span>Measure: {action.measure}</span>
                              <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5">
                                {action.horizon}
                              </span>
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400">
            Progress ticks are local to this browser — they are a working aid, not stored against the assessment.
          </p>
        </div>
      )}
    </Card>
  );
}
