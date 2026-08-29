import type { Metadata } from "next";
import { ReportView } from "@/components/assessments/ReportView";

export const metadata: Metadata = {
  title: "Full Assessment Report — Leadership Assessment",
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY);
  return <ReportView assessmentId={id} aiEnabled={aiEnabled} />;
}
