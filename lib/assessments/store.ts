/**
 * Assessment persistence.
 *
 * Upstash Redis when it is configured, otherwise an in-process store seeded with
 * the demo cohort so the platform runs with zero setup. The in-process store is
 * per-instance and does not survive a restart — the UI says so rather than
 * pretending writes are durable.
 */

import { randomUUID } from "crypto";
import { redisConfigured, redisGet, redisSet } from "@/lib/redis";
import { RELATIONSHIPS, type Relationship } from "./framework";
import type { ModuleId } from "./instruments";
import { demoAssessments } from "./demo";
import type {
  Assessment,
  AssessmentSummary,
  CoachingNote,
  DevelopmentPlan,
  ModuleSubmission,
  Participant,
  Rater,
} from "./types";
import { buildReport } from "./scoring";

const INDEX_KEY = "assessments:index";
const itemKey = (id: string) => `assessments:item:${id}`;
const tokenKey = (token: string) => `assessments:token:${token}`;

/** Survives hot reloads in dev; per-instance in production. */
const globalStore = globalThis as unknown as { __assessmentStore?: Map<string, Assessment> };

function memory(): Map<string, Assessment> {
  if (!globalStore.__assessmentStore) {
    globalStore.__assessmentStore = new Map(demoAssessments().map((a) => [a.id, a]));
  }
  return globalStore.__assessmentStore;
}

export function storageMode(): "redis" | "memory" {
  return redisConfigured() ? "redis" : "memory";
}

export function isDemo(id: string): boolean {
  return id.startsWith("demo-");
}

async function readIndex(): Promise<string[]> {
  return (await redisGet<string[]>(INDEX_KEY)) ?? [];
}

async function writeIndex(ids: string[]): Promise<void> {
  await redisSet(INDEX_KEY, ids);
}

export async function getAssessment(id: string): Promise<Assessment | null> {
  if (!redisConfigured()) return memory().get(id) ?? null;
  try {
    const stored = await redisGet<Assessment>(itemKey(id));
    // Demo records stay available in Redis mode too — they are the worked examples.
    return stored ?? (isDemo(id) ? (memory().get(id) ?? null) : null);
  } catch {
    return memory().get(id) ?? null;
  }
}

async function put(assessment: Assessment): Promise<Assessment> {
  assessment.updatedAt = new Date().toISOString();
  if (!redisConfigured()) {
    memory().set(assessment.id, assessment);
    return assessment;
  }
  await redisSet(itemKey(assessment.id), assessment);
  const index = await readIndex();
  if (!index.includes(assessment.id)) await writeIndex([assessment.id, ...index]);
  for (const rater of assessment.raters) {
    await redisSet(tokenKey(rater.token), assessment.id);
  }
  return assessment;
}

export async function listAssessments(): Promise<Assessment[]> {
  if (!redisConfigured()) {
    return [...memory().values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  try {
    const index = await readIndex();
    const stored = await Promise.all(index.map((id) => redisGet<Assessment>(itemKey(id))));
    const live = stored.filter((a): a is Assessment => Boolean(a));
    const demos = demoAssessments().filter((d) => !live.some((a) => a.id === d.id));
    return [...live, ...demos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [...memory().values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function summarise(assessment: Assessment): AssessmentSummary {
  const report = buildReport(assessment);
  const scored = report.competencies.map((c) => c.combined).filter((n): n is number => n !== null);
  return {
    id: assessment.id,
    participant: assessment.participant,
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
    modulesComplete: (Object.keys(assessment.modules) as ModuleId[]).filter((m) => assessment.modules[m]),
    ratersInvited: assessment.raters.length,
    ratersSubmitted: assessment.raters.filter((r) => r.submittedAt).length,
    readiness: report.readiness?.score ?? null,
    overall: scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : null,
  };
}

export async function createAssessment(participant: Participant): Promise<Assessment> {
  const now = new Date().toISOString();
  const assessment: Assessment = {
    id: randomUUID(),
    participant,
    createdAt: now,
    updatedAt: now,
    modules: {},
    raters: [],
    plan: null,
    coachingNotes: [],
  };
  return put(assessment);
}

export async function deleteAssessment(id: string): Promise<boolean> {
  if (isDemo(id)) return false;
  if (!redisConfigured()) return memory().delete(id);
  const index = await readIndex();
  if (!index.includes(id)) return false;
  await writeIndex(index.filter((existing) => existing !== id));
  await redisSet(itemKey(id), null);
  return true;
}

export async function saveModule(
  id: string,
  moduleId: ModuleId,
  submission: ModuleSubmission
): Promise<Assessment | null> {
  const assessment = await getAssessment(id);
  if (!assessment) return null;
  assessment.modules[moduleId] = submission;
  // Scores changed, so any plan built on the old scores is stale.
  if (assessment.plan) assessment.plan = null;
  return put(assessment);
}

export interface RaterInvite {
  name: string;
  email: string;
  relationship: Relationship;
}

export async function addRaters(id: string, invites: RaterInvite[]): Promise<Assessment | null> {
  const assessment = await getAssessment(id);
  if (!assessment) return null;
  const now = new Date().toISOString();
  const added: Rater[] = invites.map((invite) => ({
    id: randomUUID(),
    token: randomUUID().replace(/-/g, "").slice(0, 24),
    name: invite.name,
    email: invite.email,
    relationship: invite.relationship,
    invitedAt: now,
    submittedAt: null,
    responses: {},
    comments: { strengths: "", development: "" },
  }));
  assessment.raters = [...assessment.raters, ...added];
  return put(assessment);
}

export async function removeRater(id: string, raterId: string): Promise<Assessment | null> {
  const assessment = await getAssessment(id);
  if (!assessment) return null;
  const rater = assessment.raters.find((r) => r.id === raterId);
  if (!rater || rater.submittedAt) return null;
  assessment.raters = assessment.raters.filter((r) => r.id !== raterId);
  return put(assessment);
}

export interface RaterContext {
  assessment: Assessment;
  rater: Rater;
}

/** Resolves a 360 invitation token to its assessment without exposing the assessment id. */
export async function findByToken(token: string): Promise<RaterContext | null> {
  const direct = memory();
  for (const assessment of direct.values()) {
    const rater = assessment.raters.find((r) => r.token === token);
    if (rater) return { assessment, rater };
  }
  if (!redisConfigured()) return null;
  try {
    const id = await redisGet<string>(tokenKey(token));
    if (!id) return null;
    const assessment = await getAssessment(id);
    if (!assessment) return null;
    const rater = assessment.raters.find((r) => r.token === token);
    return rater ? { assessment, rater } : null;
  } catch {
    return null;
  }
}

export async function submitRaterFeedback(
  token: string,
  responses: Record<string, number>,
  comments: { strengths: string; development: string }
): Promise<{ ok: true } | { ok: false; reason: "not-found" | "already-submitted" }> {
  const context = await findByToken(token);
  if (!context) return { ok: false, reason: "not-found" };
  if (context.rater.submittedAt) return { ok: false, reason: "already-submitted" };

  const { assessment, rater } = context;
  rater.responses = responses;
  rater.comments = comments;
  rater.submittedAt = new Date().toISOString();
  if (assessment.plan) assessment.plan = null;
  await put(assessment);
  return { ok: true };
}

export async function savePlan(id: string, plan: DevelopmentPlan): Promise<Assessment | null> {
  const assessment = await getAssessment(id);
  if (!assessment) return null;
  assessment.plan = plan;
  return put(assessment);
}

export async function addCoachingNote(id: string, note: Omit<CoachingNote, "id" | "createdAt">): Promise<Assessment | null> {
  const assessment = await getAssessment(id);
  if (!assessment) return null;
  assessment.coachingNotes = [
    { ...note, id: randomUUID(), createdAt: new Date().toISOString() },
    ...assessment.coachingNotes,
  ].slice(0, 100);
  return put(assessment);
}

export function isRelationship(value: unknown): value is Relationship {
  return typeof value === "string" && (RELATIONSHIPS as readonly string[]).includes(value);
}
