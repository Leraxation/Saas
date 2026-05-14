"use client";

import { useEffect, useState, useCallback } from "react";

interface Email {
  id: string;
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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

export function EmailsList() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/outlook/emails");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEmails(data.value ?? []);
    } catch {
      setError("Could not load emails. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  const unreadCount = emails.filter((e) => !e.isRead).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-blue-600 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
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
        <button
          onClick={fetchEmails}
          disabled={loading}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="px-5 py-10 text-center text-sm text-red-500">{error}</div>
      ) : emails.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">Your inbox is empty.</div>
      ) : (
        <div className="divide-y divide-gray-50 overflow-y-auto max-h-[520px]">
          {emails.map((email) => {
            const senderName = email.from.emailAddress.name || email.from.emailAddress.address;
            const initials = senderName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            const colors = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-pink-500"];
            const color = colors[senderName.charCodeAt(0) % colors.length];

            return (
              <div
                key={email.id}
                className={`px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors ${!email.isRead ? "bg-blue-50/30" : ""}`}
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
                    <p className="text-xs text-gray-400 truncate mt-0.5">{email.bodyPreview}</p>
                  </div>
                  {!email.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
