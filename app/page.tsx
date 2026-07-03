"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignInPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Outlook Dashboard</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Connect your Microsoft account to view your inbox, upcoming calendar events, and tasks — all in one place.
        </p>

        <button
          onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
            <rect x="1" y="1" width="10" height="10" fill="#f25022" />
            <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
            <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
            <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
          </svg>
          Sign in with Microsoft
        </button>

        <p className="mt-6 text-xs text-gray-400">
          We request read access to your mail and calendar, and read/write access to your tasks to help you manage them.
        </p>
      </div>
    </div>
  );
}
