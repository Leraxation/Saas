import { getMe, getDataSource, getLastSyncedAt } from "@/lib/graph";
import { DashboardProvider } from "@/components/DashboardProvider";
import { StatsRow } from "@/components/StatsRow";
import { EmailsList } from "@/components/EmailsList";
import { CalendarWidget } from "@/components/CalendarWidget";
import { TasksList } from "@/components/TasksList";

export const dynamic = "force-dynamic";

function syncedAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

export default async function DashboardPage() {
  const source = getDataSource();
  const isDemo = source === "demo";
  const isPowerAutomate = source === "redis";
  const readOnly = isDemo || isPowerAutomate;

  let firstName = "there";
  try {
    const me = await getMe();
    firstName = me.givenName ?? me.displayName?.split(" ")[0] ?? "there";
  } catch {}

  const lastSynced = isPowerAutomate ? await getLastSyncedAt() : null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <DashboardProvider readOnly={readOnly}>
      {isDemo && (
        <div className="mb-5 flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span><strong>Preview mode</strong> — showing sample data. Connect your Microsoft account to see real Outlook data.</span>
        </div>
      )}

      {isPowerAutomate && (
        <div className="mb-5 flex items-center gap-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-xl">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>
            <strong>Power Automate mode</strong> — data synced from your Outlook every 15 minutes.
            {lastSynced
              ? ` Last sync: ${syncedAgo(lastSynced)}.`
              : " Waiting for the first sync from your flows."}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {firstName}</h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening in your Outlook today.</p>
      </div>

      <div className="mb-6">
        <StatsRow />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <EmailsList />
        </div>
        <div className="flex flex-col gap-6">
          <CalendarWidget />
          <TasksList />
        </div>
      </div>
    </DashboardProvider>
  );
}
