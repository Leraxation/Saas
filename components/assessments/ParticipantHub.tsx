"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb, Card, Spinner, EmptyState, relativeDate } from "./ui";
import type { Report } from "@/lib/assessments/scoring";

interface RaterView {
  id: string;
  name: string;
  email: string;
  relationship: string;
  invitedAt: string;
  submittedAt: string | null;
  link: string;
}

interface Payload {
  assessment: {
    id: string;
    participant: Report["participant"];
    createdAt: string;
    updatedAt: string;
    modules: Record<string, { completedAt: string; durationSeconds: number | null }>;
    raters: RaterView[];
    demo: boolean;
  };
  report: Report;
  storage: "redis" | "memory";
}

const MODULES = [
  {
    id: "competency",
    name: "Leadership Competencies",
    blurb: "32 items across the eight-competency model. About 10 minutes.",
  },
  {
    id: "behavioral",
    name: "Behavioural Profile",
    blurb: "30 psychometric items across six leadership-relevant traits. About 8 minutes.",
  },
  {
    id: "cognitive",
    name: "Cognitive Battery",
    blurb: "12 timed reasoning items across four domains. 15-minute limit.",
  },
] as const;

const RELATIONSHIPS = [
  { id: "manager", label: "Manager" },
  { id: "peer", label: "Peer" },
  { id: "direct-report", label: "Direct report" },
  { id: "stakeholder", label: "Stakeholder" },
];

export function ParticipantHub({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("peer");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load the assessment.");
      setData(body as Payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the assessment.");
    }
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/raters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raters: [{ name: name.trim(), email: email.trim(), relationship }] }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not add the rater.");
      setName("");
      setEmail("");
      await load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Could not add the rater.");
    } finally {
      setInviting(false);
    }
  }

  async function removeRater(raterId: string) {
    const res = await fetch(`/api/assessments/${assessmentId}/raters?raterId=${raterId}`, { method: "DELETE" });
    if (res.ok) await load();
    else {
      const body = await res.json().catch(() => ({}));
      setInviteError(body.error ?? "Could not remove the rater.");
    }
  }

  async function copyLink(link: string, raterId: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${link}`);
      setCopied(raterId);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setInviteError("Could not copy — copy the link from the address bar instead.");
    }
  }

  async function deleteAssessment() {
    if (!confirm("Delete this assessment and all its responses? This cannot be undone.")) return;
    const res = await fetch(`/api/assessments/${assessmentId}`, { method: "DELETE" });
    if (res.ok) router.push("/assessments");
    else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not delete the assessment.");
    }
  }

  if (error) return <EmptyState title="Could not load the participant" body={error} />;
  if (!data) return <Spinner />;

  const { assessment, report } = data;
  const submitted = assessment.raters.filter((r) => r.submittedAt).length;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Leadership Assessment", href: "/assessments" }, { label: assessment.participant.name }]} />

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
          {!assessment.demo && (
            <button
              type="button"
              onClick={deleteAssessment}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <Card title="Assessment modules" subtitle="Completed by the participant themselves.">
        <div className="grid md:grid-cols-3 gap-4">
          {MODULES.map((m) => {
            const completed = assessment.modules[m.id];
            return (
              <div
                key={m.id}
                className={`rounded-lg border p-5 flex flex-col ${
                  completed ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{m.name}</h3>
                  {completed && (
                    <span className="text-[11px] font-medium text-emerald-700 whitespace-nowrap">✓ Complete</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1.5 flex-1">{m.blurb}</p>
                <div className="mt-4">
                  {completed ? (
                    <p className="text-xs text-slate-500">
                      Submitted {relativeDate(completed.completedAt)}
                      {completed.durationSeconds
                        ? ` · ${Math.floor(completed.durationSeconds / 60)}m ${completed.durationSeconds % 60}s`
                        : ""}
                    </p>
                  ) : (
                    <Link
                      href={`/assessments/${assessmentId}/run/${m.id}`}
                      className="inline-block rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Start module
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {Object.keys(assessment.modules).length > 0 && (
          <p className="text-xs text-slate-400 mt-4">
            Retaking a module replaces the previous responses and clears any generated development plan, since the plan
            is derived from the scores.
          </p>
        )}
      </Card>

      <Card
        title="360-degree feedback"
        subtitle={`${submitted} of ${assessment.raters.length} raters have responded. Each rater gets a private link.`}
      >
        <form onSubmit={invite} className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 mb-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rater name"
            required
            maxLength={80}
            className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rater@company.com"
            type="email"
            required
            maxLength={160}
            className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {inviting ? "Adding…" : "Add rater"}
          </button>
        </form>
        {inviteError && <p className="text-sm text-red-600 mb-4">{inviteError}</p>}

        {assessment.raters.length === 0 ? (
          <p className="text-sm text-slate-500">
            No raters yet. A useful 360 needs the manager plus at least two peers and two direct reports — groups under{" "}
            {report.coverage.anonymityThreshold} responses are suppressed in the report to protect anonymity.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-400 border-b border-slate-100">
                  <th className="pb-2 pr-4">Rater</th>
                  <th className="pb-2 pr-4">Relationship</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {assessment.raters.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 text-xs capitalize">{r.relationship.replace("-", " ")}</td>
                    <td className="py-3 pr-4">
                      {r.submittedAt ? (
                        <span className="text-xs font-medium text-emerald-700">
                          Submitted {relativeDate(r.submittedAt)}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600">Invited {relativeDate(r.invitedAt)}</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyLink(r.link, r.id)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          {copied === r.id ? "Copied" : "Copy link"}
                        </button>
                        <Link
                          href={r.link}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </Link>
                        {!r.submittedAt && (
                          <button
                            type="button"
                            onClick={() => removeRater(r.id)}
                            className="text-xs text-slate-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-4">
              Feedback links are the rater&apos;s credential — send each one only to that person. A link can be used once
              and cannot be reopened after submission.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
