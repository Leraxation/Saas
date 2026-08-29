"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumb, Card, EmptyState, Spinner, relativeDate } from "./ui";
import { FeedbackResultsSection } from "./sections";
import { useReport } from "./useReport";

const RELATIONSHIPS = [
  { id: "manager", label: "Manager" },
  { id: "peer", label: "Peer" },
  { id: "direct-report", label: "Direct report" },
  { id: "stakeholder", label: "Stakeholder" },
];

/** Module 3: rater administration plus the aggregated observer results. */
export function FeedbackView({ assessmentId }: { assessmentId: string }) {
  const { data, error, reload } = useReport(assessmentId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("peer");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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
      await reload();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Could not add the rater.");
    } finally {
      setInviting(false);
    }
  }

  async function removeRater(raterId: string) {
    const res = await fetch(`/api/assessments/${assessmentId}/raters?raterId=${raterId}`, { method: "DELETE" });
    if (res.ok) await reload();
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
      setInviteError("Could not copy — open the link and copy it from the address bar instead.");
    }
  }

  if (error) return <EmptyState title="Could not load the feedback module" body={error} />;
  if (!data) return <Spinner />;

  const { assessment, report } = data;
  const submitted = assessment.raters.filter((r) => r.submittedAt).length;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Leadership Assessment", href: "/assessments" },
          { label: assessment.participant.name, href: `/assessments/${assessmentId}` },
          { label: "360-Degree Feedback" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">360-Degree Feedback</h1>
        <p className="text-sm text-slate-500 mt-1">
          Observer ratings on the same competency items {assessment.participant.name.split(" ")[0]} answered, so self and
          observer views compare item by item.
        </p>
      </div>

      <Card
        title="Raters"
        subtitle={`${submitted} of ${assessment.raters.length} have responded. Each rater gets their own private link.`}
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
              A feedback link is the rater&apos;s credential — send each one only to that person. It can be used once and
              cannot be reopened after submission.
            </p>
          </div>
        )}
      </Card>

      <FeedbackResultsSection report={report} assessmentId={assessmentId} />
    </div>
  );
}
