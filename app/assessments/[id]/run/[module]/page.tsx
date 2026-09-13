import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModuleRunner } from "@/components/assessments/ModuleRunner";
import { getModule } from "@/lib/assessments/instruments";

export const metadata: Metadata = {
  title: "Assessment module — Leadership Assessment",
};

export default async function ModulePage({ params }: { params: Promise<{ id: string; module: string }> }) {
  const { id, module: moduleId } = await params;
  // 360 feedback is collected from raters and has its own page, not a runner.
  if (!getModule(moduleId) || moduleId === "feedback") notFound();
  return <ModuleRunner assessmentId={id} moduleId={moduleId} />;
}
