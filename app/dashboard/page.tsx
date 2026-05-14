import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { EmailsList } from "@/components/EmailsList";
import { CalendarWidget } from "@/components/CalendarWidget";
import { TasksList } from "@/components/TasksList";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const firstName = session.user?.name?.split(" ")[0] ?? "there";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening in your Outlook today.</p>
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
    </div>
  );
}
