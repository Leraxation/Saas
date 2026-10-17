"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Section navigation for the assessment platform. Everything below Dashboard is
 * scoped to one participant, so those items only become active once a participant
 * is selected — the nav shows them greyed rather than hiding them, so the shape of
 * the programme is visible from the start.
 */

interface NavChild {
  label: string;
  href: string;
  /** Key into the report's completeness map, used for the done tick. */
  moduleKey: string;
}

const MODULE_ITEMS: NavChild[] = [
  { label: "Leadership Competencies", href: "/run/competency", moduleKey: "competency" },
  { label: "Behavioral Assessment", href: "/run/behavioral", moduleKey: "behavioral" },
  { label: "360-Degree Feedback", href: "/feedback", moduleKey: "feedback" },
  { label: "Cognitive Assessment", href: "/run/cognitive", moduleKey: "cognitive" },
  { label: "Organizational Alignment Assessment", href: "/run/alignment", moduleKey: "alignment" },
];

const SECTION_ITEMS = [
  { label: "Benchmarking", href: "/benchmarking" },
  { label: "Development Plans", href: "/plan" },
  { label: "Coaching & Support", href: "/coaching" },
  { label: "Full Assessment Report", href: "/report" },
];

function participantIdFrom(pathname: string): string | null {
  const match = pathname.match(/^\/assessments\/([^/]+)/);
  if (!match || match[1] === "new") return null;
  return match[1];
}

export function AssessmentNav() {
  const pathname = usePathname();
  const id = participantIdFrom(pathname);

  const [participant, setParticipant] = useState<{ name: string; role: string } | null>(null);
  const [completeness, setCompleteness] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id) {
      setParticipant(null);
      setCompleteness({});
      return;
    }
    let cancelled = false;
    fetch(`/api/assessments/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled || !body) return;
        setParticipant(body.assessment.participant);
        setCompleteness(body.report.completeness);
      })
      .catch(() => {
        // The nav is a convenience; a failed load leaves the page itself to report the error.
      });
    return () => {
      cancelled = true;
    };
  }, [id, pathname]);

  const base = id ? `/assessments/${id}` : null;
  const isActive = (href: string) => pathname === href;

  const linkClass = (active: boolean) =>
    `block rounded-lg px-3 py-2 text-sm transition-colors ${
      active ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <nav className="w-64 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto p-4 hidden lg:block">
      <Link href="/assessments" className={linkClass(pathname === "/assessments")}>
        Dashboard
      </Link>

      <div className="mt-5">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Assessment modules</p>
        {participant ? (
          <Link
            href={base!}
            className={`mt-1.5 block rounded-lg px-3 py-2 ${
              isActive(base!) ? "bg-indigo-50" : "hover:bg-slate-100"
            }`}
          >
            <span className="block text-sm font-medium text-slate-900 truncate">{participant.name}</span>
            <span className="block text-[11px] text-slate-500 truncate">{participant.role}</span>
          </Link>
        ) : (
          <p className="mt-1.5 px-3 text-xs text-slate-400 leading-relaxed">
            Select a leader on the dashboard to work through their modules.
          </p>
        )}

        <ol className="mt-1 space-y-0.5">
          {MODULE_ITEMS.map((item, index) => {
            const href = base ? base + item.href : null;
            const done = completeness[item.moduleKey];
            return (
              <li key={item.href}>
                {href ? (
                  <Link href={href} className={`${linkClass(isActive(href))} flex items-start gap-2`}>
                    <span className="text-xs text-slate-400 mt-0.5 tabular-nums">{index + 1}.</span>
                    <span className="flex-1 leading-snug">{item.label}</span>
                    {done && <span className="text-emerald-600 text-xs mt-0.5">✓</span>}
                  </Link>
                ) : (
                  <span className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm text-slate-300">
                    <span className="text-xs mt-0.5 tabular-nums">{index + 1}.</span>
                    <span className="flex-1 leading-snug">{item.label}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-5 space-y-0.5 border-t border-slate-100 pt-4">
        {SECTION_ITEMS.map((item) => {
          const href = base ? base + item.href : null;
          return href ? (
            <Link key={item.href} href={href} className={linkClass(isActive(href))}>
              {item.label}
            </Link>
          ) : (
            <span key={item.href} className="block rounded-lg px-3 py-2 text-sm text-slate-300">
              {item.label}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
