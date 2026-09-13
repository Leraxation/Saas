"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LikertRunner, type LikertSection } from "./LikertRunner";
import { CognitiveRunner, type CognitiveItemView } from "./CognitiveRunner";
import { Breadcrumb, EmptyState, Spinner } from "./ui";

interface LikertPayload {
  kind: "likert";
  module: { id: string; name: string; blurb: string };
  completedAt: string | null;
  participant: { name: string };
  labels: string[];
  sections: LikertSection[];
}

interface CognitivePayload {
  kind: "cognitive";
  module: { id: string; name: string; blurb: string };
  completedAt: string | null;
  participant: { name: string };
  timeLimitSeconds: number;
  items: CognitiveItemView[];
}

type Payload = LikertPayload | CognitivePayload;

const INTROS: Record<string, string> = {
  competency:
    "Rate how consistently each statement describes how you actually lead today — not how you intend to lead. Your raters answer the same statements about you, which is what makes the comparison meaningful.",
  behavioral:
    "There are no right answers and no scores to optimise. Answer as you typically are at work; the profile reports tendencies and their risks, not a pass or a fail.",
  alignment:
    "Rate how far each statement describes your day-to-day behaviour, not how strongly you agree with the value itself. This measures alignment between how you lead and what the organisation says it stands for.",
};

export function ModuleRunner({ assessmentId, moduleId }: { assessmentId: string; moduleId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retake, setRetake] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/assessments/${assessmentId}/modules/${moduleId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not load the module.");
        return body as Payload;
      })
      .then((body) => !cancelled && setData(body))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [assessmentId, moduleId]);

  async function submit(payload: Record<string, unknown>) {
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/modules/${moduleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save your responses.");
      router.push(`/assessments/${assessmentId}/report`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not save your responses.");
      setBusy(false);
    }
  }

  if (error) return <EmptyState title="Could not load the module" body={error} />;
  if (!data) return <Spinner />;

  const crumbs = (
    <Breadcrumb
      items={[
        { label: "Leadership Assessment", href: "/assessments" },
        { label: data.participant.name, href: `/assessments/${assessmentId}` },
        { label: data.module.name },
      ]}
    />
  );

  if (data.completedAt && !retake) {
    return (
      <div>
        {crumbs}
        <EmptyState
          title={`${data.module.name} already completed`}
          body={`Submitted on ${new Date(data.completedAt).toLocaleString()}. Retaking replaces the previous responses and clears any generated development plan.`}
          action={
            <div className="flex justify-center gap-2">
              <Link
                href={`/assessments/${assessmentId}/report`}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                View report
              </Link>
              <button
                type="button"
                onClick={() => setRetake(true)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Retake module
              </button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {crumbs}
      <div className="max-w-3xl mx-auto mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{data.module.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{data.module.blurb}</p>
      </div>

      {data.kind === "cognitive" ? (
        <CognitiveRunner
          items={data.items}
          timeLimitSeconds={data.timeLimitSeconds}
          busy={busy}
          error={submitError}
          onSubmit={(responses, durationSeconds) => submit({ responses, durationSeconds })}
        />
      ) : (
        <LikertRunner
          sections={data.sections}
          labels={data.labels}
          busy={busy}
          error={submitError}
          submitLabel="Submit module"
          onSubmit={(responses) => submit({ responses })}
          intro={
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {INTROS[moduleId] ?? INTROS.behavioral}
            </div>
          }
        />
      )}
    </div>
  );
}
