"use client";

import { useState } from "react";
import { Breadcrumb, EmptyState, Spinner } from "./ui";
import { PlanPanel } from "./PlanPanel";
import { useReport } from "./useReport";
import type { DevelopmentPlan } from "@/lib/assessments/types";

export function PlanView({ assessmentId, aiEnabled }: { assessmentId: string; aiEnabled: boolean }) {
  const { data, error } = useReport(assessmentId);
  // Undefined until the plan is regenerated here; the stored plan shows until then.
  const [generated, setGenerated] = useState<DevelopmentPlan | undefined>();

  if (error) return <EmptyState title="Could not load the development plan" body={error} />;
  if (!data) return <Spinner />;

  const { assessment, report } = data;
  const plan = generated ?? assessment.plan;
  const competencyNames = Object.fromEntries(report.competencies.map((c) => [c.competencyId, c.name]));
  const scored = report.competencies.filter((c) => c.combined !== null);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Leadership Assessment", href: "/assessments" },
          { label: assessment.participant.name, href: `/assessments/${assessmentId}` },
          { label: "Development Plans" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Development Plans</h1>
        <p className="text-sm text-slate-500 mt-1">
          Built from {assessment.participant.name.split(" ")[0]}&apos;s scores — focus areas, strengths to build from,
          and actions weighted 70-20-10.
        </p>
      </div>

      <PlanPanel
        assessmentId={assessmentId}
        plan={plan}
        competencyNames={competencyNames}
        aiAvailable={aiEnabled}
        canGenerate={scored.length > 0}
        onPlanChange={setGenerated}
      />
    </div>
  );
}
