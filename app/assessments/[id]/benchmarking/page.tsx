import type { Metadata } from "next";
import { BenchmarkingView } from "@/components/assessments/BenchmarkingView";

export const metadata: Metadata = {
  title: "Benchmarking — Leadership Assessment",
};

export default async function BenchmarkingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BenchmarkingView assessmentId={id} />;
}
