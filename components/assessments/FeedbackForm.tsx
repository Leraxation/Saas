"use client";

import { useEffect, useState } from "react";
import { LikertRunner, type LikertSection } from "./LikertRunner";
import { EmptyState, Spinner } from "./ui";

interface Payload {
  participant: { name: string; role: string; department: string };
  rater: { name: string; relationship: string; relationshipLabel: string; submittedAt: string | null };
  labels: string[];
  sections: LikertSection[];
}

export function FeedbackForm({ token }: { token: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [strengths, setStrengths] = useState("");
  const [development, setDevelopment] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/feedback/${token}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "This feedback link is not valid.");
        return body as Payload;
      })
      .then((body) => !cancelled && setData(body))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(responses: Record<string, number>) {
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses, comments: { strengths, development } }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not submit your feedback.");
      setDone(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not submit your feedback.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <EmptyState
        title="This link is not valid"
        body="It may have expired or been mistyped. Ask whoever invited you to send a new link."
      />
    );
  }
  if (!data) return <Spinner label="Loading the feedback form…" />;

  if (done || data.rater.submittedAt) {
    return (
      <EmptyState
        title="Thank you — your feedback is in"
        body={`Your responses about ${data.participant.name} have been recorded. They are pooled with other raters' and reported by relationship group, never attributed to you individually.`}
      />
    );
  }

  const textarea =
    "w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none resize-none";

  return (
    <LikertRunner
      sections={data.sections}
      labels={data.labels}
      busy={busy}
      error={submitError}
      submitLabel="Submit feedback"
      onSubmit={submit}
      intro={
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-900">
            Feedback on {data.participant.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {data.participant.role} · {data.participant.department}
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>
              You are giving feedback as a <strong className="font-semibold">{data.rater.relationshipLabel.toLowerCase()}</strong>.
              Rate how consistently you have actually seen each behaviour — not how you would like it to be.
            </p>
            <p className="text-slate-500">
              Your individual answers are never shown. Scores are pooled with other raters in your group, and groups with
              fewer than two responses are suppressed entirely. Written comments are shown by relationship only.
            </p>
            <p className="text-slate-500">You can submit once, so complete the form in one sitting.</p>
          </div>
        </div>
      }
      extra={
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              What does {data.participant.name.split(" ")[0]} do especially well as a leader?
            </span>
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={3}
              maxLength={800}
              className={`${textarea} mt-1.5`}
              placeholder="Optional — a specific example is worth more than a general statement."
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              What is the one thing that would make the biggest difference if they changed it?
            </span>
            <textarea
              value={development}
              onChange={(e) => setDevelopment(e.target.value)}
              rows={3}
              maxLength={800}
              className={`${textarea} mt-1.5`}
              placeholder="Optional — be candid; this is reported without your name attached."
            />
          </label>
        </div>
      }
    />
  );
}
