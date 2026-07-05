import { CalendarWidget } from "@/components/CalendarWidget";
import { InsightsPanel } from "@/components/InsightsPanel";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">Your next 7 days, with conflicts and focus windows.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <CalendarWidget />
        <InsightsPanel />
      </div>
    </div>
  );
}
