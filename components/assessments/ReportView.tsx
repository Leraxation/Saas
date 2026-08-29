"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumb, EmptyState, Spinner } from "./ui";
import {
  AlignmentSection,
  BehavioralSection,
  CognitiveSection,
  CompetencySection,
  FeedbackResultsSection,
  HighlightsSection,
  ParticipantHeader,
} from "./sections";
import { PlanPanel } from "./PlanPanel";
import { CoachPanel } from "./CoachPanel";
import { useReport } from "./useReport";
import type { DevelopmentPlan } from "@/lib/assessments/types";

/** Every section in one place — the same components the dedicated pages use. */
export function ReportView({ assessmentId, aiEnabled }: { assessmentId: string; aiEnabled: boolean }) {
  const { data, error } = useReport(assessmentId);
  const [generated, setGenerated] = useState<DevelopmentPlan | undefined>();

  if (error) return <EmptyState title="Could not load the report" body={error} />;
  if (!data) return <Spinner label="Scoring the assessment…" />;

  const { assessment, report } = data;
  const competencyNames = Object.fromEntries(report.competencies.map((c) => [c.competencyId, c.name]));
  const scored = report.competencies.filter((c) => c.combined !== null);

  const crumbs = (
    <Breadcrumb
      items={[
        { label: "Leadership Assessment", href: "/assessments" },
        { label: assessment.participant.name, href: `/assessments/${assessmentId}` },
        { label: "Full Assessment Report" },
      ]}
    />
  );

  if (!report.completeness.competency && report.coverage.submitted === 0) {
    return (
      <div>
        {crumbs}
        <EmptyState
          title="Nothing to report yet"
          body={`${assessment.participant.name} has not completed any module and no 360 feedback has been received. The report becomes available as soon as the competency module is submitted.`}
          action={
            <Link
              href={`/assessments/${assessmentId}`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Back to the modules
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {crumbs}
      <ParticipantHeader report={report} />
      <CompetencySection report={report} />
      <HighlightsSection report={report} />
      <FeedbackResultsSection report={report} assessmentId={assessmentId} />

      <div className="grid lg:grid-cols-2 gap-6">
        <BehavioralSection report={report} assessmentId={assessmentId} />
        <CognitiveSection report={report} assessmentId={assessmentId} />
      </div>

      <AlignmentSection report={report} assessmentId={assessmentId} />

      <PlanPanel
        assessmentId={assessmentId}
        plan={generated ?? assessment.plan}
        competencyNames={competencyNames}
        aiAvailable={aiEnabled}
        canGenerate={scored.length > 0}
        onPlanChange={setGenerated}
      />

      <CoachPanel
        assessmentId={assessmentId}
        prompts={data.coachingPrompts}
        aiEnabled={aiEnabled}
        initialNotes={assessment.coachingNotes}
      />

      <p className="text-xs text-slate-400 pb-4">
        Report generated {new Date(report.generatedAt).toLocaleString()}. Scores are computed from the raw responses on
        every load, so changing a norm table or an item key re-scores this report rather than leaving a stale result.
      </p>
    </div>
  );
}
