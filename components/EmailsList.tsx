"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/components/DashboardProvider";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Skeleton() {
  return (
    <div className="animate-pulse divide-y divide-gray-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

const AVATAR_COLORS = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-pink-500"];

export function EmailsList() {
  const { emails, loading, error, refresh, markEmailRead, readOnly } = useDashboard();
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const unreadCount = emails.filter((e) => !e.isRead).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return emails.filter((e) => {
      if (unreadOnly && e.isRead) return false;
      if (!q) return true;
      const sender = e.from?.emailAddress?.name ?? "";
      const address = e.from?.emailAddress?.address ?? "";
      return (
        (e.subject ?? "").toLowerCase().includes(q) ||
        sender.toLowerCase().includes(q) ||
        address.toLowerCase().includes(q) ||
        (e.bodyPreview ?? "").toLowerCase().includes(q)
      );
    });
  }, [emails, query, unreadOnly]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Inbox</h2>
            {!loading && (
              <p className="text-xs text-gray-400">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <div className="relative flex-1 max-w-56">
            <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emails…"
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors flex-shrink-0 ${
              unreadOnly
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            Unread
          </button>
          <button
            onClick={refresh}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="px-5 py-10 text-center text-sm text-red-500">{error}</div>
      ) : visible.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">
          {emails.length === 0
            ? "Your inbox is empty."
            : unreadOnly && !query
            ? "No unread emails — nice work!"
            : "No emails match your search."}
        </div>
      ) : (
        <div className="divide-y divide-gray-50 overflow-y-auto max-h-[560px]">
          {visible.map((email) => {
            const senderName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Unknown";
            const senderAddress = email.from?.emailAddress?.address ?? "";
            const initials = senderName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            const color = AVATAR_COLORS[senderName.charCodeAt(0) % AVATAR_COLORS.length];
            const expanded = expandedId === email.id;

            return (
              <div key={email.id}>
                <button
                  onClick={() => {
                    setExpandedId(expanded ? null : email.id);
                    // Opening an unread email marks it read in Outlook (live mode)
                    if (!expanded && !email.isRead && !readOnly) markEmailRead(email.id);
                  }}
                  className={`w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors ${
                    !email.isRead ? "bg-blue-50/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${!email.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                          {senderName}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(email.receivedDateTime)}</span>
                      </div>
                      <p className={`text-sm truncate mt-0.5 ${!email.isRead ? "font-medium text-gray-800" : "text-gray-600"}`}>
                        {email.subject || "(no subject)"}
                      </p>
                      {!expanded && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{email.bodyPreview}</p>
                      )}
                    </div>
                    {!email.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
                  </div>
                </button>
                {expanded && (
                  <div className="px-5 pb-4 pl-[68px]">
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-2">
                        {senderAddress} · {fullDate(email.receivedDateTime)}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {email.bodyPreview || "(no preview available)"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
