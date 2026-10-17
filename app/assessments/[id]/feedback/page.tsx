import type { Metadata } from "next";
import { FeedbackView } from "@/components/assessments/FeedbackView";

export const metadata: Metadata = {
  title: "360-Degree Feedback — Leadership Assessment",
};

export default async function FeedbackModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FeedbackView assessmentId={id} />;
}
