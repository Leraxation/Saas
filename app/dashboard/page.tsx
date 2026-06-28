import { getMe } from "@/lib/graph";
import { EmailsList } from "@/components/EmailsList";
import { CalendarWidget } from "@/components/CalendarWidget";
import { TasksList } from "@/components/TasksList";

export default async function DashboardPage() {
  const isDemo = !process.env.MICROSOFT_REFRESH_TOKEN;

  let firstName = "Alex";
  try {
    const me = await getMe();
    firstName = me.givenName ?? me.displayName?.split(" ")[0] ?? "there";
  } catch {}

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      {isDemo && (
        <div className="mb-5 flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>
            <strong>Preview mode</strong> — showing sample data.
            Add your Microsoft credentials to connect your real Outlook.
          </span>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here&apos;s what&apos;s happening in your Outlook today.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <EmailsList />
        </div>
        <div className="flex flex-col gap-6">
          <CalendarWidget />
          <TasksList isDemo={isDemo} />
        </div>
      </div>
    </div>
  );
}
