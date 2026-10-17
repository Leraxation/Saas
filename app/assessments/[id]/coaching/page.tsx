import type { Metadata } from "next";
import { CoachingView } from "@/components/assessments/CoachingView";

export const metadata: Metadata = {
  title: "Coaching & Support — Leadership Assessment",
};

export default async function CoachingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CoachingView assessmentId={id} aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
