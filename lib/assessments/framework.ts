/**
 * Leadership assessment framework — the competency, behavioural, cognitive and
 * organisational model everything else in the platform scores against.
 *
 * Structure mirrors a standard consultancy leadership assessment: a competency
 * model rated by self and by 360 raters, a behavioural (psychometric) profile,
 * a cognitive battery, and a values/culture layer used for organisational
 * alignment.
 */

export type LeadershipLevel = "emerging" | "manager" | "senior" | "executive";

export interface LevelDefinition {
  id: LeadershipLevel;
  name: string;
  description: string;
}

export const LEVELS: LevelDefinition[] = [
  {
    id: "emerging",
    name: "Emerging Leader",
    description: "First-line leader or high-potential individual contributor stepping into leadership.",
  },
  {
    id: "manager",
    name: "Manager of People",
    description: "Leads a team directly; accountable for delivery through others.",
  },
  {
    id: "senior",
    name: "Senior Leader",
    description: "Leads managers or a function; accountable for strategy within a domain.",
  },
  {
    id: "executive",
    name: "Executive",
    description: "Enterprise leader; accountable for direction, culture and cross-functional outcomes.",
  },
];

export function getLevel(id: string): LevelDefinition | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** Competency clusters group the eight competencies into three reporting families. */
export type ClusterId = "thinking" | "leading" | "delivering";

export interface Cluster {
  id: ClusterId;
  name: string;
  accent: string;
}

export const CLUSTERS: Cluster[] = [
  { id: "thinking", name: "Thinking", accent: "#60a5fa" },
  { id: "leading", name: "Leading People", accent: "#818cf8" },
  { id: "delivering", name: "Delivering Results", accent: "#34d399" },
];

export interface Competency {
  id: string;
  name: string;
  cluster: ClusterId;
  definition: string;
  /** Observable behaviours — used verbatim as report evidence and as coaching anchors. */
  indicators: string[];
  /** Organisational values this competency most directly carries. */
  values: string[];
}

export const COMPETENCIES: Competency[] = [
  {
    id: "strategic-thinking",
    name: "Strategic Thinking",
    cluster: "thinking",
    definition:
      "Sees the wider landscape, anticipates how it will shift, and sets direction that holds beyond the current quarter.",
    indicators: [
      "Frames decisions against a three-to-five year view, not just this quarter",
      "Connects market, customer and internal signals into a coherent picture",
      "Kills work that no longer serves the strategy",
    ],
    values: ["Ambition", "Integrity"],
  },
  {
    id: "decision-making",
    name: "Decision Making",
    cluster: "thinking",
    definition:
      "Reaches sound, timely judgements under ambiguity and stands behind them once made.",
    indicators: [
      "Decides at the right altitude rather than escalating or hoarding",
      "Names the trade-off being accepted, not just the option chosen",
      "Revisits a decision on new evidence without churning the team",
    ],
    values: ["Integrity", "Accountability"],
  },
  {
    id: "communication",
    name: "Communication & Influence",
    cluster: "leading",
    definition:
      "Lands a message with clarity and moves people who do not report to them.",
    indicators: [
      "Tailors the message to what the audience actually needs to hear",
      "Builds coalitions ahead of the decision rather than after it",
      "Says the difficult thing early and plainly",
    ],
    values: ["Respect", "Integrity"],
  },
  {
    id: "emotional-intelligence",
    name: "Emotional Intelligence",
    cluster: "leading",
    definition:
      "Reads self and others accurately, and regulates their own impact under pressure.",
    indicators: [
      "Stays measured when the situation is not",
      "Notices what a person is not saying and follows it up",
      "Adjusts approach on feedback rather than defending intent",
    ],
    values: ["Respect", "Care"],
  },
  {
    id: "developing-others",
    name: "Developing Others",
    cluster: "leading",
    definition:
      "Grows capability deliberately — through stretch, feedback and succession, not only training.",
    indicators: [
      "Gives specific developmental feedback close to the event",
      "Delegates work that stretches rather than only work that offloads",
      "Has named successors and is actively closing their gaps",
    ],
    values: ["Care", "Ambition"],
  },
  {
    id: "driving-change",
    name: "Driving Change",
    cluster: "delivering",
    definition:
      "Mobilises people through change and sustains it past the launch.",
    indicators: [
      "Makes the case for change in terms the affected team recognises",
      "Surfaces resistance early instead of routing around it",
      "Follows through past go-live until the new way is the normal way",
    ],
    values: ["Ambition", "Accountability"],
  },
  {
    id: "execution",
    name: "Execution & Accountability",
    cluster: "delivering",
    definition:
      "Converts intent into delivered outcomes, and owns the result either way.",
    indicators: [
      "Sets measurable commitments with dates and owners",
      "Escalates slippage early with a recovery plan attached",
      "Owns misses without diffusing them across the team",
    ],
    values: ["Accountability", "Integrity"],
  },
  {
    id: "collaboration",
    name: "Collaboration",
    cluster: "delivering",
    definition:
      "Works across boundaries so the enterprise outcome beats the local one.",
    indicators: [
      "Trades local optimisation for the enterprise result",
      "Brings other functions in before the plan is fixed",
      "Resolves cross-team friction directly rather than by escalation",
    ],
    values: ["Respect", "Care"],
  },
];

export function getCompetency(id: string): Competency | undefined {
  return COMPETENCIES.find((c) => c.id === id);
}

/**
 * Behavioural (psychometric) scales. Each scale has a constructive mid-to-high
 * range and a derailer risk when scores sit at an extreme — reported as
 * tendencies, never as pass/fail.
 */
export interface Trait {
  id: string;
  name: string;
  highLabel: string;
  lowLabel: string;
  description: string;
  /** Risk when the score is very high (>= 85) or very low (<= 15). */
  overuse: string;
  underuse: string;
  /** Competencies this trait most strongly enables. */
  enables: string[];
}

export const TRAITS: Trait[] = [
  {
    id: "drive",
    name: "Drive & Ambition",
    highLabel: "Striving",
    lowLabel: "Steady",
    description: "Appetite for stretch goals, advancement and competitive achievement.",
    overuse: "Can push past what the team can absorb and read as self-interested.",
    underuse: "May under-claim scope and let ambitious agendas pass by.",
    enables: ["execution", "driving-change"],
  },
  {
    id: "influence",
    name: "Influence & Sociability",
    highLabel: "Outgoing",
    lowLabel: "Reserved",
    description: "Comfort engaging, persuading and holding a room.",
    overuse: "Talks more than listens; presence can crowd out quieter contributors.",
    underuse: "Strong thinking may go unheard outside the immediate team.",
    enables: ["communication", "collaboration"],
  },
  {
    id: "resilience",
    name: "Resilience & Composure",
    highLabel: "Composed",
    lowLabel: "Reactive",
    description: "Emotional steadiness and recovery under sustained pressure.",
    overuse: "Calm can be read as detachment or low urgency.",
    underuse: "Pressure leaks into the team and destabilises decision quality.",
    enables: ["emotional-intelligence", "decision-making"],
  },
  {
    id: "prudence",
    name: "Prudence & Rigour",
    highLabel: "Structured",
    lowLabel: "Flexible",
    description: "Conscientiousness, planning discipline and attention to process.",
    overuse: "Over-controls detail and slows the team with process.",
    underuse: "Commitments slip because follow-through is inconsistent.",
    enables: ["execution", "decision-making"],
  },
  {
    id: "learning-agility",
    name: "Learning Agility",
    highLabel: "Exploratory",
    lowLabel: "Consolidating",
    description: "Curiosity, openness to new methods and speed of learning from experience.",
    overuse: "Chases novelty and leaves initiatives half-finished.",
    underuse: "Defaults to proven methods after they have stopped working.",
    enables: ["strategic-thinking", "driving-change"],
  },
  {
    id: "sensitivity",
    name: "Interpersonal Sensitivity",
    highLabel: "Considerate",
    lowLabel: "Direct",
    description: "Attentiveness to others' needs and to the impact of one's own behaviour.",
    overuse: "Avoids necessary hard conversations to preserve harmony.",
    underuse: "Directness lands as dismissiveness and erodes trust.",
    enables: ["emotional-intelligence", "developing-others"],
  },
];

export function getTrait(id: string): Trait | undefined {
  return TRAITS.find((t) => t.id === id);
}

/** Cognitive battery domains. */
export interface CognitiveDomain {
  id: string;
  name: string;
  description: string;
}

export const COGNITIVE_DOMAINS: CognitiveDomain[] = [
  {
    id: "numerical",
    name: "Numerical Reasoning",
    description: "Draws correct conclusions from quantitative business information.",
  },
  {
    id: "verbal",
    name: "Verbal & Critical Reasoning",
    description: "Separates what a text supports from what it merely implies.",
  },
  {
    id: "abstract",
    name: "Abstract Reasoning",
    description: "Infers rules from patterns — a proxy for handling novel problems.",
  },
  {
    id: "adaptability",
    name: "Adaptive Problem Solving",
    description: "Re-plans effectively when the constraints of a problem change.",
  },
];

/** Organisational values used for the alignment view. */
export interface OrgValue {
  id: string;
  name: string;
  statement: string;
}

export const ORG_VALUES: OrgValue[] = [
  { id: "Integrity", name: "Integrity", statement: "We do what we said, and say what is true." },
  { id: "Accountability", name: "Accountability", statement: "We own the outcome, not just the task." },
  { id: "Respect", name: "Respect", statement: "We treat every colleague as a professional." },
  { id: "Care", name: "Care", statement: "We look after our people and our customers." },
  { id: "Ambition", name: "Ambition", statement: "We set a standard above the industry, not level with it." },
];

export const RELATIONSHIPS = ["manager", "peer", "direct-report", "stakeholder"] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  manager: "Manager",
  peer: "Peer",
  "direct-report": "Direct Report",
  stakeholder: "Stakeholder",
};
