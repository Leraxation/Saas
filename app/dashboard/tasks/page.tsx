import { TasksList } from "@/components/TasksList";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">Sorted by urgency — overdue first, then due today.</p>
      </div>
      <div className="max-w-2xl">
        <TasksList />
      </div>
    </div>
  );
}
