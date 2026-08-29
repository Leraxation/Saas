"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb, Card } from "./ui";

const LEVELS = [
  { id: "emerging", name: "Emerging Leader", description: "First-line leader or high-potential individual contributor." },
  { id: "manager", name: "Manager of People", description: "Leads a team directly; delivers through others." },
  { id: "senior", name: "Senior Leader", description: "Leads managers or a function; owns strategy in a domain." },
  { id: "executive", name: "Executive", description: "Enterprise leader; owns direction, culture and cross-functional outcomes." },
];

export function NewAssessmentForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", role: "", department: "", level: "manager" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not create the assessment.");
      router.push(`/assessments/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the assessment.");
      setBusy(false);
    }
  }

  const field = "w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <div className="max-w-2xl">
      <Breadcrumb items={[{ label: "Leadership Assessment", href: "/assessments" }, { label: "New assessment" }]} />
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">New assessment</h1>
      <p className="text-sm text-slate-500 mb-6">
        Set up a leader for assessment. The leadership level determines which norm group their scores are benchmarked
        against.
      </p>

      <Card>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Full name</span>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                maxLength={80}
                className={`${field} mt-1.5`}
                placeholder="Full name"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Work email</span>
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                type="email"
                required
                maxLength={160}
                className={`${field} mt-1.5`}
                placeholder="name@company.com"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <input
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                required
                maxLength={80}
                className={`${field} mt-1.5`}
                placeholder="e.g. Head of Operations"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Function or department</span>
              <input
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                required
                maxLength={80}
                className={`${field} mt-1.5`}
                placeholder="e.g. Commercial"
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700 mb-2">Leadership level</legend>
            <div className="space-y-2">
              {LEVELS.map((level) => (
                <label
                  key={level.id}
                  className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
                    form.level === level.id ? "border-indigo-500 bg-indigo-50/60" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="level"
                    value={level.id}
                    checked={form.level === level.id}
                    onChange={(e) => set("level", e.target.value)}
                    className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">{level.name}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{level.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push("/assessments")}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create assessment"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
