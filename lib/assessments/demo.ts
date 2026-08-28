/**
 * Demo cohort — used whenever no database is configured, so the platform is
 * explorable end to end without any setup. Responses are generated
 * deterministically from a seeded profile, not hand-written, so the scoring
 * engine is exercised for real rather than fed pre-computed results.
 */

import type { Relationship } from "./framework";
import { BEHAVIORAL_ITEMS, COGNITIVE_ITEMS, COMPETENCY_ITEMS } from "./instruments";
import type { Assessment, Participant, Rater } from "./types";

/** Deterministic 0-1 stream from a string seed (xorshift over an FNV-1a hash). */
function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

/** Target 0-100 for a scale → a 1-5 Likert answer, with the reverse key applied and noise added. */
function likertFor(target: number, reverse: boolean | undefined, next: () => number): number {
  const noisy = target + (next() - 0.5) * 26;
  const clamped = Math.min(100, Math.max(0, noisy));
  const scored = Math.round((clamped / 100) * 4) + 1;
  return reverse ? 6 - scored : scored;
}

interface DemoProfile {
  id: string;
  participant: Participant;
  /** Target 0-100 per competency as the participant sees themselves. */
  selfTargets: Record<string, number>;
  /** Offset applied to the self target to produce observer ratings (negative = raters rate lower). */
  observerOffset: Record<string, number>;
  traitTargets: Record<string, number>;
  /** Probability of answering a cognitive item correctly. */
  cognitiveAccuracy: number;
  cognitiveSeconds: number;
  raters: { name: string; email: string; relationship: Relationship; submitted: boolean; strengths: string; development: string }[];
  createdDaysAgo: number;
}

const COMPETENCY_IDS = [
  "strategic-thinking",
  "decision-making",
  "communication",
  "emotional-intelligence",
  "developing-others",
  "driving-change",
  "execution",
  "collaboration",
];

function targets(values: number[]): Record<string, number> {
  return Object.fromEntries(COMPETENCY_IDS.map((id, i) => [id, values[i]]));
}

const PROFILES: DemoProfile[] = [
  {
    id: "demo-nadiya-al-balushi",
    participant: {
      name: "Nadiya Al Balushi",
      email: "nadiya@example.com",
      role: "Head of Business Partnering",
      department: "Employee Relations",
      level: "senior",
    },
    // Strong on people, thinner on strategy — and rates her own execution well above her raters.
    selfTargets: targets([58, 72, 78, 86, 84, 66, 82, 76]),
    observerOffset: targets([-2, -4, 4, 2, 6, -6, -14, 0]),
    traitTargets: { drive: 72, influence: 80, resilience: 74, prudence: 62, "learning-agility": 68, sensitivity: 88 },
    cognitiveAccuracy: 0.72,
    cognitiveSeconds: 640,
    createdDaysAgo: 26,
    raters: [
      { name: "Kumail Rashid", email: "kumail@example.com", relationship: "manager", submitted: true, strengths: "Reads a room better than anyone on the leadership team and will say the difficult thing when it matters.", development: "Commitments to other functions slip without an early heads-up — the recovery is always good, the warning is late." },
      { name: "Saqar Al Hinai", email: "saqar@example.com", relationship: "peer", submitted: true, strengths: "Genuinely collaborative — brings us in before her plan is fixed rather than after.", development: "Spends time on operational detail her team could carry, at the cost of the longer view." },
      { name: "Marwa Said", email: "marwa@example.com", relationship: "peer", submitted: true, strengths: "Sets a high standard for how people are treated and holds others to it.", development: "Change initiatives lose momentum after launch." },
      { name: "Abdulhamid Nasser", email: "abdulhamid@example.com", relationship: "direct-report", submitted: true, strengths: "Invests real time in developing us — feedback is specific and lands close to the event.", development: "Deadlines move more often than they should, which makes planning around her hard." },
      { name: "Samiha Khalfan", email: "samiha@example.com", relationship: "direct-report", submitted: true, strengths: "Backs her team publicly and coaches privately.", development: "Would like a clearer line of sight to where the function is going in two years." },
      { name: "Layla Harthy", email: "layla@example.com", relationship: "stakeholder", submitted: false, strengths: "", development: "" },
    ],
  },
  {
    id: "demo-khalid-al-rawahi",
    participant: {
      name: "Khalid Al Rawahi",
      email: "khalid@example.com",
      role: "Director, HR Operations",
      department: "Operations",
      level: "senior",
    },
    // Delivery-strong operator; the development edge is on people and influence.
    selfTargets: targets([70, 80, 62, 58, 54, 74, 92, 64]),
    observerOffset: targets([2, 0, -10, -12, -8, 2, 4, -6]),
    traitTargets: { drive: 86, influence: 46, resilience: 82, prudence: 90, "learning-agility": 58, sensitivity: 34 },
    cognitiveAccuracy: 0.86,
    cognitiveSeconds: 520,
    createdDaysAgo: 12,
    raters: [
      { name: "Kumail Rashid", email: "kumail@example.com", relationship: "manager", submitted: true, strengths: "If Khalid owns it, it lands. Best operating discipline in the function.", development: "Directness is efficient with people who know him and costly with people who don't." },
      { name: "Hisham Al Lawati", email: "hisham@example.com", relationship: "peer", submitted: true, strengths: "Rigorous, and will flag a risk long before it becomes one.", development: "Decides then informs. Bringing peers in earlier would cost him little and buy a lot." },
      { name: "Usama Bakr", email: "usama@example.com", relationship: "direct-report", submitted: true, strengths: "Absolutely clear about what is expected and by when.", development: "Takes complex work back rather than coaching us through it — we learn less than we could." },
      { name: "Jawhara Al Amri", email: "jawhara@example.com", relationship: "direct-report", submitted: true, strengths: "Protects the team from noise and is straight with us.", development: "Under pressure the tone gets sharp, and people go quiet rather than raising problems." },
      { name: "Saif Al Mamari", email: "saif@example.com", relationship: "stakeholder", submitted: true, strengths: "Reliable counterpart — his numbers hold up.", development: "Trades less easily when the enterprise answer is not the answer for his area." },
    ],
  },
  {
    id: "demo-hiba-mansour",
    participant: {
      name: "Hiba Mansour",
      email: "hiba@example.com",
      role: "Succession & Talent Lead",
      department: "Talent Management",
      level: "manager",
    },
    // Under-claims: raters see more than she does. 360 is only partly in.
    selfTargets: targets([54, 58, 60, 72, 68, 56, 66, 70]),
    observerOffset: targets([8, 12, 14, 6, 10, 8, 6, 10]),
    traitTargets: { drive: 54, influence: 44, resilience: 62, prudence: 74, "learning-agility": 78, sensitivity: 76 },
    cognitiveAccuracy: 0.78,
    cognitiveSeconds: 700,
    createdDaysAgo: 6,
    raters: [
      { name: "Hisham Al Lawati", email: "hisham@example.com", relationship: "manager", submitted: true, strengths: "Consistently better than she thinks she is. The succession work is the best-structured thing in the function.", development: "Needs to argue for her own work in forums where it counts." },
      { name: "Sami Al Habsi", email: "sami@example.com", relationship: "peer", submitted: true, strengths: "Learns fast and shares what she learns.", development: "Waits to be asked before contributing in senior meetings." },
      { name: "Munir Zayed", email: "munir@example.com", relationship: "peer", submitted: false, strengths: "", development: "" },
      { name: "Aisha Rahman", email: "aisha@example.com", relationship: "direct-report", submitted: false, strengths: "", development: "" },
    ],
  },
  {
    id: "demo-saif-al-mamari",
    participant: {
      name: "Saif Al Mamari",
      email: "saif@example.com",
      role: "Head of Compensation & Benefits",
      department: "Rewards",
      level: "manager",
    },
    // Self-assessment only so far: shows the report working from partial evidence.
    selfTargets: targets([66, 74, 68, 64, 60, 62, 78, 72]),
    observerOffset: targets([0, 0, 0, 0, 0, 0, 0, 0]),
    traitTargets: { drive: 68, influence: 64, resilience: 70, prudence: 84, "learning-agility": 62, sensitivity: 58 },
    cognitiveAccuracy: 0.8,
    cognitiveSeconds: 580,
    createdDaysAgo: 2,
    raters: [
      { name: "Kumail Rashid", email: "kumail@example.com", relationship: "manager", submitted: false, strengths: "", development: "" },
      { name: "Khalid Al Rawahi", email: "khalid@example.com", relationship: "peer", submitted: false, strengths: "", development: "" },
      { name: "Nadiya Al Balushi", email: "nadiya@example.com", relationship: "peer", submitted: false, strengths: "", development: "" },
    ],
  },
];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function buildAssessment(profile: DemoProfile): Assessment {
  const selfRandom = rng(`${profile.id}:self`);
  const competencyResponses: Record<string, number> = {};
  for (const item of COMPETENCY_ITEMS) {
    competencyResponses[item.id] = likertFor(profile.selfTargets[item.scale] ?? 65, item.reverse, selfRandom);
  }

  const traitRandom = rng(`${profile.id}:traits`);
  const behavioralResponses: Record<string, number> = {};
  for (const item of BEHAVIORAL_ITEMS) {
    behavioralResponses[item.id] = likertFor(profile.traitTargets[item.scale] ?? 60, item.reverse, traitRandom);
  }

  const cognitiveRandom = rng(`${profile.id}:cognitive`);
  const cognitiveResponses: Record<string, string> = {};
  for (const item of COGNITIVE_ITEMS) {
    const wrong = item.options.filter((o) => o.id !== item.answer);
    cognitiveResponses[item.id] =
      cognitiveRandom() < profile.cognitiveAccuracy
        ? item.answer
        : wrong[Math.floor(cognitiveRandom() * wrong.length)].id;
  }

  const raters: Rater[] = profile.raters.map((r, i) => {
    const raterRandom = rng(`${profile.id}:rater:${i}`);
    const responses: Record<string, number> = {};
    if (r.submitted) {
      for (const item of COMPETENCY_ITEMS) {
        const target =
          (profile.selfTargets[item.scale] ?? 65) + (profile.observerOffset[item.scale] ?? 0);
        responses[item.id] = likertFor(target, item.reverse, raterRandom);
      }
    }
    return {
      id: `${profile.id}-r${i}`,
      token: `demo-${profile.id.replace("demo-", "")}-${i}`,
      name: r.name,
      email: r.email,
      relationship: r.relationship,
      invitedAt: daysAgo(profile.createdDaysAgo - 1),
      submittedAt: r.submitted ? daysAgo(Math.max(1, profile.createdDaysAgo - 4 - i)) : null,
      responses,
      comments: { strengths: r.strengths, development: r.development },
    };
  });

  const complete = profile.id !== "demo-saif-al-mamari";

  return {
    id: profile.id,
    participant: profile.participant,
    createdAt: daysAgo(profile.createdDaysAgo),
    updatedAt: daysAgo(Math.max(0, profile.createdDaysAgo - 5)),
    modules: {
      competency: { responses: competencyResponses, completedAt: daysAgo(profile.createdDaysAgo - 1) },
      ...(complete
        ? {
            behavioral: { responses: behavioralResponses, completedAt: daysAgo(profile.createdDaysAgo - 2) },
            cognitive: {
              responses: cognitiveResponses,
              completedAt: daysAgo(profile.createdDaysAgo - 2),
              durationSeconds: profile.cognitiveSeconds,
            },
          }
        : {}),
    },
    raters,
    plan: null,
    coachingNotes: [],
  };
}

export function demoAssessments(): Assessment[] {
  return PROFILES.map(buildAssessment);
}
