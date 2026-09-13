"use client";

import { useCallback, useEffect, useState } from "react";
import type { Report } from "@/lib/assessments/scoring";
import type { CoachingNote, DevelopmentPlan } from "@/lib/assessments/types";

export interface RaterView {
  id: string;
  name: string;
  email: string;
  relationship: string;
  invitedAt: string;
  submittedAt: string | null;
  link: string;
}

export interface AssessmentPayload {
  assessment: {
    id: string;
    participant: Report["participant"];
    createdAt: string;
    updatedAt: string;
    modules: Record<string, { completedAt: string; durationSeconds: number | null }>;
    raters: RaterView[];
    plan: DevelopmentPlan | null;
    coachingNotes: CoachingNote[];
  };
  report: Report;
  coachingPrompts: string[];
  storage: "redis" | "memory";
}

/**
 * Every participant-scoped page reads the same endpoint, so the report, the plan
 * and the rater list can never disagree between screens.
 */
export function useReport(assessmentId: string) {
  const [data, setData] = useState<AssessmentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load the assessment.");
      setData(body as AssessmentPayload);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the assessment.");
    }
  }, [assessmentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload, setData };
}
