import { getDataSource } from "@/lib/graph";
import { DashboardProvider } from "@/components/DashboardProvider";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { JarvisAssistant } from "@/components/JarvisAssistant";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const source = getDataSource();
  const readOnly = source !== "graph";
  const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <DashboardProvider readOnly={readOnly}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
      <JarvisAssistant enabled={aiEnabled} />
    </DashboardProvider>
  );
}
