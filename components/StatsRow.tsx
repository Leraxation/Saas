"use client";

import { useDashboard } from "@/components/DashboardProvider";

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function nextMeetingLabel(events: { start: { dateTime: string }; end: { dateTime: string }; subject: string }[]): {
  value: string;
  detail: string;
} {
  const now = Date.now();
  const ongoing = events.find(
    (e) => new Date(e.start.dateTime).getTime() <= now && new Date(e.end.dateTime).getTime() > now
  );
  if (ongoing) return { value: "Now", detail: ongoing.subject };

  const upcoming = events
    .filter((e) => new Date(e.start.dateTime).getTime() > now)
    .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())[0];
  if (!upcoming) return { value: "—", detail: "No upcoming meetings" };

  const mins = Math.round((new Date(upcoming.start.dateTime).getTime() - now) / 60_000);
  const value =
    mins < 60 ? `in ${mins}m` : mins < 24 * 60 ? `in ${Math.round(mins / 60)}h` : `in ${Math.round(mins / (24 * 60))}d`;
  return { value, detail: upcoming.subject };
}

export function StatsRow() {
  const { emails, events, tasks, loading, lastUpdated } = useDashboard();

  const unread = emails.filter((e) => !e.isRead).length;
  const meetingsToday = events.filter((e) => isToday(e.start.dateTime)).length;
  const now = new Date();
  const dueToday = tasks.filter((t) => t.dueDateTime && isToday(t.dueDateTime.dateTime)).length;
  const overdue = tasks.filter((t) => {
    if (!t.dueDateTime) return false;
    const d = new Date(t.dueDateTime.dateTime);
    return d < now && !isToday(t.dueDateTime.dateTime);
  }).length;
  const next = nextMeetingLabel(events);

  const stats = [
    {
      label: "Unread emails",
      value: loading ? "…" : String(unread),
      detail: unread === 0 ? "Inbox zero 🎉" : "waiting in your inbox",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      label: "Meetings today",
      value: loading ? "…" : String(meetingsToday),
      detail: meetingsToday === 0 ? "clear calendar" : "on your calendar",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      iconBg: "bg-purple-50 text-purple-600",
    },
    {
      label: "Tasks due today",
      value: loading ? "…" : String(dueToday),
      detail: overdue > 0 ? `${overdue} overdue` : "nothing overdue",
      detailAlert: overdue > 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Next meeting",
      value: loading ? "…" : next.value,
      detail: next.detail,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg grid place-items-center flex-shrink-0 ${s.iconBg}`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900 leading-tight truncate">{s.value}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
              <p className={`text-xs mt-0.5 truncate ${s.detailAlert ? "text-red-500 font-medium" : "text-gray-400"}`}>
                {s.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
      {lastUpdated && (
        <p className="text-xs text-gray-400 mt-2 text-right">
          Auto-refreshes every minute · Updated{" "}
          {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
