import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModuleRunner } from "@/components/assessments/ModuleRunner";
import { getModule } from "@/lib/assessments/instruments";

export const metadata: Metadata = {
  title: "Assessment module — Leadership Assessment",
};

export default async function ModulePage({ params }: { params: Promise<{ id: string; module: string }> }) {
  const { id, module: moduleId } = await params;
  if (!getModule(moduleId)) notFound();
  return <ModuleRunner assessmentId={id} moduleId={moduleId} />;
}
