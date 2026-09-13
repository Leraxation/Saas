import type { Metadata } from "next";
import { ParticipantHub } from "@/components/assessments/ParticipantHub";

export const metadata: Metadata = {
  title: "Participant — Leadership Assessment",
};

export default async function ParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ParticipantHub assessmentId={id} />;
}
