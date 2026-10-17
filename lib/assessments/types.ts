import type { LeadershipLevel, Relationship } from "./framework";
import type { ModuleId } from "./instruments";

export interface Participant {
  name: string;
  email: string;
  role: string;
  department: string;
  level: LeadershipLevel;
}

/** A completed self-module. Cognitive responses map item id -> chosen option id. */
export interface ModuleSubmission {
  responses: Record<string, number | string>;
  completedAt: string;
  /** Cognitive only: seconds spent on the battery. */
  durationSeconds?: number;
}

export interface Rater {
  id: string;
  token: string;
  name: string;
  email: string;
  relationship: Relationship;
  invitedAt: string;
  submittedAt: string | null;
  responses: Record<string, number>;
  comments: {
    strengths: string;
    development: string;
  };
}

export interface DevelopmentAction {
  id: string;
  competencyId: string;
  /** 70-20-10: experience, exposure (coaching/feedback), education. */
  type: "experience" | "exposure" | "education";
  action: string;
  measure: string;
  horizon: "30 days" | "90 days" | "6 months";
}

export interface DevelopmentPlan {
  focusCompetencies: string[];
  leverageCompetencies: string[];
  actions: DevelopmentAction[];
  /** Narrative section — rule-generated, optionally rewritten by the AI endpoint. */
  narrative: string;
  source: "generated" | "ai";
  updatedAt: string;
}

export interface CoachingNote {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Assessment {
  id: string;
  participant: Participant;
  createdAt: string;
  updatedAt: string;
  modules: Partial<Record<ModuleId, ModuleSubmission>>;
  raters: Rater[];
  plan: DevelopmentPlan | null;
  coachingNotes: CoachingNote[];
}

export interface AssessmentSummary {
  id: string;
  participant: Participant;
  createdAt: string;
  updatedAt: string;
  modulesComplete: ModuleId[];
  ratersInvited: number;
  ratersSubmitted: number;
  /** Null until the competency module is complete. */
  readiness: number | null;
  overall: number | null;
}
