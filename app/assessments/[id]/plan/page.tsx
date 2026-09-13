import type { Metadata } from "next";
import { PlanView } from "@/components/assessments/PlanView";

export const metadata: Metadata = {
  title: "Development Plans — Leadership Assessment",
};

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanView assessmentId={id} aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
