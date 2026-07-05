"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function Header() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="text-gray-400">Outlook</span>
        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">Dashboard</span>
      </div>

      <div className="flex items-center gap-3">
        {status === "loading" ? null : user ? (
          <>
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">{user.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
              {initials}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/dashboard" })}
              title="Sign out"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 23 23" fill="none">
              <rect x="1" y="1" width="10" height="10" fill="#f25022" />
              <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
              <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
              <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
            </svg>
            Connect Microsoft 365
          </button>
        )}
      </div>
    </header>
  );
}
