/**
 * Item banks for the three self-completed modules plus the 360 rater form.
 *
 * Competency items are shared between the self-assessment and the 360 form so
 * self and observer ratings are directly comparable item by item — that
 * comparability is what makes the gap analysis meaningful.
 */

import { COMPETENCIES, TRAITS } from "./framework";

export type ModuleId = "competency" | "behavioral" | "cognitive";

export interface LikertItem {
  id: string;
  /** Competency or trait this item loads onto. */
  scale: string;
  /** Wording used when the participant rates themselves. */
  self: string;
  /** Wording used when a 360 rater rates the participant. */
  observer: string;
  /** True when agreement indicates *less* of the scale (scored 6 - raw). */
  reverse?: boolean;
}

export const LIKERT_MIN = 1;
export const LIKERT_MAX = 5;

export const LIKERT_LABELS = [
  "Rarely",
  "Sometimes",
  "Often",
  "Usually",
  "Consistently",
];

export const BEHAVIORAL_LABELS = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
];

/** Four items per competency: 32 items across the model. */
export const COMPETENCY_ITEMS: LikertItem[] = [
  // Strategic Thinking
  { id: "st1", scale: "strategic-thinking", self: "I set direction against a multi-year view rather than the current quarter.", observer: "Sets direction against a multi-year view rather than the current quarter." },
  { id: "st2", scale: "strategic-thinking", self: "I connect market, customer and internal signals into one coherent picture.", observer: "Connects market, customer and internal signals into one coherent picture." },
  { id: "st3", scale: "strategic-thinking", self: "I stop work that no longer supports the strategy.", observer: "Stops work that no longer supports the strategy." },
  { id: "st4", scale: "strategic-thinking", self: "I get pulled into operational detail at the expense of the bigger picture.", observer: "Gets pulled into operational detail at the expense of the bigger picture.", reverse: true },
  // Decision Making
  { id: "dm1", scale: "decision-making", self: "I make timely calls even when the information is incomplete.", observer: "Makes timely calls even when the information is incomplete." },
  { id: "dm2", scale: "decision-making", self: "I name the trade-off I am accepting, not just the option I chose.", observer: "Names the trade-off being accepted, not just the option chosen." },
  { id: "dm3", scale: "decision-making", self: "I revisit a decision on new evidence without destabilising the team.", observer: "Revisits a decision on new evidence without destabilising the team." },
  { id: "dm4", scale: "decision-making", self: "I defer decisions upward that I am empowered to make myself.", observer: "Defers decisions upward that they are empowered to make themselves.", reverse: true },
  // Communication & Influence
  { id: "ci1", scale: "communication", self: "I tailor my message to what the audience actually needs to hear.", observer: "Tailors the message to what the audience actually needs to hear." },
  { id: "ci2", scale: "communication", self: "I build support ahead of a decision rather than announcing it after.", observer: "Builds support ahead of a decision rather than announcing it after." },
  { id: "ci3", scale: "communication", self: "I raise difficult messages early and plainly.", observer: "Raises difficult messages early and plainly." },
  { id: "ci4", scale: "communication", self: "People leave my updates unclear about what happens next.", observer: "People leave their updates unclear about what happens next.", reverse: true },
  // Emotional Intelligence
  { id: "ei1", scale: "emotional-intelligence", self: "I stay measured when the situation around me is not.", observer: "Stays measured when the situation around them is not." },
  { id: "ei2", scale: "emotional-intelligence", self: "I notice what someone is not saying and follow it up.", observer: "Notices what someone is not saying and follows it up." },
  { id: "ei3", scale: "emotional-intelligence", self: "I adjust my approach on feedback rather than defending my intent.", observer: "Adjusts their approach on feedback rather than defending their intent." },
  { id: "ei4", scale: "emotional-intelligence", self: "My mood under pressure is visible to the people around me.", observer: "Their mood under pressure is visible to the people around them.", reverse: true },
  // Developing Others
  { id: "do1", scale: "developing-others", self: "I give specific developmental feedback close to the event.", observer: "Gives specific developmental feedback close to the event." },
  { id: "do2", scale: "developing-others", self: "I delegate work that stretches people, not only work that offloads.", observer: "Delegates work that stretches people, not only work that offloads." },
  { id: "do3", scale: "developing-others", self: "I know who could succeed my key roles and am closing their gaps.", observer: "Knows who could succeed their key roles and is actively closing those gaps." },
  { id: "do4", scale: "developing-others", self: "I take back complex work rather than coaching someone through it.", observer: "Takes back complex work rather than coaching someone through it.", reverse: true },
  // Driving Change
  { id: "dc1", scale: "driving-change", self: "I make the case for change in terms the affected team recognises.", observer: "Makes the case for change in terms the affected team recognises." },
  { id: "dc2", scale: "driving-change", self: "I surface resistance early instead of routing around it.", observer: "Surfaces resistance early instead of routing around it." },
  { id: "dc3", scale: "driving-change", self: "I stay with a change past go-live until the new way is the normal way.", observer: "Stays with a change past go-live until the new way is the normal way." },
  { id: "dc4", scale: "driving-change", self: "I move on to the next initiative before the last one has embedded.", observer: "Moves on to the next initiative before the last one has embedded.", reverse: true },
  // Execution & Accountability
  { id: "ex1", scale: "execution", self: "I set commitments with measures, owners and dates attached.", observer: "Sets commitments with measures, owners and dates attached." },
  { id: "ex2", scale: "execution", self: "I escalate slippage early with a recovery plan attached.", observer: "Escalates slippage early with a recovery plan attached." },
  { id: "ex3", scale: "execution", self: "I own a miss without spreading it across the team.", observer: "Owns a miss without spreading it across the team." },
  { id: "ex4", scale: "execution", self: "Commitments I make slip without anyone being told in time.", observer: "Commitments they make slip without anyone being told in time.", reverse: true },
  // Collaboration
  { id: "co1", scale: "collaboration", self: "I trade a local win for the better enterprise outcome.", observer: "Trades a local win for the better enterprise outcome." },
  { id: "co2", scale: "collaboration", self: "I bring other functions in before my plan is fixed.", observer: "Brings other functions in before their plan is fixed." },
  { id: "co3", scale: "collaboration", self: "I resolve friction with other teams directly rather than by escalation.", observer: "Resolves friction with other teams directly rather than by escalation." },
  { id: "co4", scale: "collaboration", self: "My team's priorities come first even when another team carries the cost.", observer: "Their team's priorities come first even when another team carries the cost.", reverse: true },
];

/** Five items per trait: 30 items, mixed keying to reduce acquiescence bias. */
export const BEHAVIORAL_ITEMS: LikertItem[] = [
  { id: "dr1", scale: "drive", self: "I push for goals that are beyond what is comfortable.", observer: "" },
  { id: "dr2", scale: "drive", self: "I want visible responsibility for larger outcomes.", observer: "" },
  { id: "dr3", scale: "drive", self: "Competing to be best at something motivates me.", observer: "" },
  { id: "dr4", scale: "drive", self: "I am content to let others take the lead role.", observer: "", reverse: true },
  { id: "dr5", scale: "drive", self: "I keep pushing after most people would settle.", observer: "" },
  { id: "in1", scale: "influence", self: "I am energised by a room full of people I do not know.", observer: "" },
  { id: "in2", scale: "influence", self: "I enjoy persuading people towards a position.", observer: "" },
  { id: "in3", scale: "influence", self: "I would rather work through a problem alone than in a group.", observer: "", reverse: true },
  { id: "in4", scale: "influence", self: "I speak up early in unfamiliar groups.", observer: "" },
  { id: "in5", scale: "influence", self: "I find networking outside my team draining.", observer: "", reverse: true },
  { id: "re1", scale: "resilience", self: "Setbacks leave me unsettled for a while.", observer: "", reverse: true },
  { id: "re2", scale: "resilience", self: "I stay level when things go badly wrong.", observer: "" },
  { id: "re3", scale: "resilience", self: "Criticism of my work stays with me.", observer: "", reverse: true },
  { id: "re4", scale: "resilience", self: "I recover quickly from a bad week.", observer: "" },
  { id: "re5", scale: "resilience", self: "Sustained pressure changes how I treat people.", observer: "", reverse: true },
  { id: "pr1", scale: "prudence", self: "I plan work in detail before starting it.", observer: "" },
  { id: "pr2", scale: "prudence", self: "I keep to commitments even when circumstances change.", observer: "" },
  { id: "pr3", scale: "prudence", self: "I prefer to improvise rather than follow a process.", observer: "", reverse: true },
  { id: "pr4", scale: "prudence", self: "I check details others would consider minor.", observer: "" },
  { id: "pr5", scale: "prudence", self: "Deadlines I set for myself sometimes slip.", observer: "", reverse: true },
  { id: "la1", scale: "learning-agility", self: "I actively seek out how other organisations solve a problem.", observer: "" },
  { id: "la2", scale: "learning-agility", self: "I change my method when the evidence says it is not working.", observer: "" },
  { id: "la3", scale: "learning-agility", self: "I prefer proven approaches over untested ones.", observer: "", reverse: true },
  { id: "la4", scale: "learning-agility", self: "I take on work outside my area of expertise.", observer: "" },
  { id: "la5", scale: "learning-agility", self: "I review my own mistakes for what they teach.", observer: "" },
  { id: "se1", scale: "sensitivity", self: "I notice when someone in a meeting has disengaged.", observer: "" },
  { id: "se2", scale: "sensitivity", self: "I consider how a decision will land personally before announcing it.", observer: "" },
  { id: "se3", scale: "sensitivity", self: "I say what I think without softening it.", observer: "", reverse: true },
  { id: "se4", scale: "sensitivity", self: "People bring me personal difficulties.", observer: "" },
  { id: "se5", scale: "sensitivity", self: "I find others' emotional reactions hard to read.", observer: "", reverse: true },
];

export interface CognitiveOption {
  id: string;
  text: string;
}

export interface CognitiveItem {
  id: string;
  domain: string;
  stem: string;
  /** Optional data block shown above the question (table, passage). */
  context?: string;
  options: CognitiveOption[];
  /** Server-side only — never sent to the client before scoring. */
  answer: string;
  rationale: string;
}

/** Timed battery: 12 items across four domains. */
export const COGNITIVE_ITEMS: CognitiveItem[] = [
  {
    id: "n1",
    domain: "numerical",
    context: "A route carried 42,000 passengers last year at an average fare of 180. This year volume fell 15% while average fare rose 20%.",
    stem: "What happened to revenue on the route?",
    options: [
      { id: "a", text: "Fell by about 2%" },
      { id: "b", text: "Rose by about 2%" },
      { id: "c", text: "Rose by about 5%" },
      { id: "d", text: "Unchanged" },
    ],
    answer: "b",
    rationale: "0.85 × 1.20 = 1.02, so revenue rises about 2%.",
  },
  {
    id: "n2",
    domain: "numerical",
    context: "A division's cost base is 60% fixed. Volume increases 25% with no change to fixed cost and proportional variable cost.",
    stem: "By how much does total cost rise?",
    options: [
      { id: "a", text: "10%" },
      { id: "b", text: "15%" },
      { id: "c", text: "25%" },
      { id: "d", text: "40%" },
    ],
    answer: "a",
    rationale: "Only the 40% variable share scales: 0.40 × 25% = 10%.",
  },
  {
    id: "n3",
    domain: "numerical",
    context: "Attrition ran at 18% against a headcount of 500. A retention programme cuts it to 12%. Replacing one leaver costs 9,000.",
    stem: "What is the annual saving?",
    options: [
      { id: "a", text: "180,000" },
      { id: "b", text: "270,000" },
      { id: "c", text: "540,000" },
      { id: "d", text: "60,000" },
    ],
    answer: "b",
    rationale: "6% of 500 = 30 fewer leavers × 9,000 = 270,000.",
  },
  {
    id: "v1",
    domain: "verbal",
    context:
      "Internal review found that teams reporting the highest psychological safety also logged the most incidents. The review noted that these teams had recently completed reporting training.",
    stem: "Which conclusion does the passage best support?",
    options: [
      { id: "a", text: "Psychological safety causes more incidents to occur." },
      { id: "b", text: "Higher logged incidents may reflect reporting behaviour rather than incident frequency." },
      { id: "c", text: "The training programme increased operational risk." },
      { id: "d", text: "Teams with low safety have fewer incidents." },
    ],
    answer: "b",
    rationale: "The passage supports a measurement explanation, not a causal one.",
  },
  {
    id: "v2",
    domain: "verbal",
    context:
      "A proposal states: 'Every function that adopted the new planning cycle improved on-time delivery. Operations has not adopted it and its delivery is below target.'",
    stem: "Which statement is logically supported?",
    options: [
      { id: "a", text: "Adopting the cycle would fix Operations' delivery." },
      { id: "b", text: "Operations' delivery is below target because it did not adopt the cycle." },
      { id: "c", text: "Functions that adopted the cycle improved; nothing follows about why Operations is behind." },
      { id: "d", text: "The cycle is the only cause of delivery improvement." },
    ],
    answer: "c",
    rationale: "Affirming the consequent — the passage supports only the stated correlation.",
  },
  {
    id: "v3",
    domain: "verbal",
    context:
      "A supplier writes: 'We can commit to the revised timeline provided the specification is frozen by the 15th and a second review is not requested.'",
    stem: "What is the supplier actually committing to?",
    options: [
      { id: "a", text: "The revised timeline, unconditionally." },
      { id: "b", text: "The revised timeline only if both stated conditions hold." },
      { id: "c", text: "A frozen specification by the 15th." },
      { id: "d", text: "A single review cycle regardless of timing." },
    ],
    answer: "b",
    rationale: "The commitment is conditional on both clauses.",
  },
  {
    id: "a1",
    domain: "abstract",
    stem: "Sequence: 2, 6, 12, 20, 30, ?",
    options: [
      { id: "a", text: "38" },
      { id: "b", text: "40" },
      { id: "c", text: "42" },
      { id: "d", text: "46" },
    ],
    answer: "c",
    rationale: "Differences increase by 2: +4, +6, +8, +10, +12 → 42.",
  },
  {
    id: "a2",
    domain: "abstract",
    stem: "If all Ryn are Trel, and no Trel is Vok, which must be true?",
    options: [
      { id: "a", text: "Some Vok are Ryn" },
      { id: "b", text: "No Ryn is Vok" },
      { id: "c", text: "All Vok are Trel" },
      { id: "d", text: "Some Trel are Vok" },
    ],
    answer: "b",
    rationale: "Ryn ⊆ Trel and Trel ∩ Vok = ∅, so Ryn ∩ Vok = ∅.",
  },
  {
    id: "a3",
    domain: "abstract",
    stem: "Sequence: 1, 1, 2, 3, 5, 8, 13, ?",
    options: [
      { id: "a", text: "18" },
      { id: "b", text: "20" },
      { id: "c", text: "21" },
      { id: "d", text: "26" },
    ],
    answer: "c",
    rationale: "Each term is the sum of the previous two: 8 + 13 = 21.",
  },
  {
    id: "d1",
    domain: "adaptability",
    context:
      "Two weeks from launch, the regulator adds a certification step that takes six weeks. The launch date is externally announced and commercially committed.",
    stem: "Which first move is soundest?",
    options: [
      { id: "a", text: "Hold the date and launch pending certification, disclosing the risk internally." },
      { id: "b", text: "Identify which parts of scope can launch without certification, then reset external expectations with a dated plan." },
      { id: "c", text: "Escalate to the regulator to seek an exemption before informing stakeholders." },
      { id: "d", text: "Delay all communication until the certification timeline is confirmed." },
    ],
    answer: "b",
    rationale: "Re-scopes against the new constraint and re-commits with a dated plan rather than deferring or accepting a compliance breach.",
  },
  {
    id: "d2",
    domain: "adaptability",
    context:
      "A programme's business case rested on a 20% volume increase. Six months in, volume is flat but cost savings are running double the plan.",
    stem: "What is the strongest response?",
    options: [
      { id: "a", text: "Continue as planned; the programme is delivering overall." },
      { id: "b", text: "Stop the programme because the primary assumption failed." },
      { id: "c", text: "Re-base the case on the cost thesis, re-test the volume assumption, and take the revised case back for approval." },
      { id: "d", text: "Shift reporting to emphasise the cost savings." },
    ],
    answer: "c",
    rationale: "Re-bases on observed evidence and returns for a fresh decision rather than continuing on an invalid case.",
  },
  {
    id: "d3",
    domain: "adaptability",
    context:
      "A restructure you designed is halfway delivered when the two roles it depended on are frozen by a hiring pause.",
    stem: "Which approach best preserves the outcome?",
    options: [
      { id: "a", text: "Pause the restructure until the freeze lifts." },
      { id: "b", text: "Redistribute the two roles' critical accountabilities to named existing leaders, and re-sequence the rest behind the freeze." },
      { id: "c", text: "Backfill with contractors outside the freeze." },
      { id: "d", text: "Proceed unchanged and leave the roles vacant on the chart." },
    ],
    answer: "b",
    rationale: "Protects the accountabilities that matter now and re-sequences the remainder against the real constraint.",
  },
];

/** Battery time limit in seconds — surfaced in the report as a speed measure. */
export const COGNITIVE_TIME_LIMIT_SECONDS = 15 * 60;

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  blurb: string;
  itemCount: number;
  estimatedMinutes: number;
  scaleCount: number;
}

export const MODULES: ModuleDefinition[] = [
  {
    id: "competency",
    name: "Leadership Competencies",
    blurb: "Self-rating against the eight-competency leadership model.",
    itemCount: COMPETENCY_ITEMS.length,
    estimatedMinutes: 10,
    scaleCount: COMPETENCIES.length,
  },
  {
    id: "behavioral",
    name: "Behavioural Profile",
    blurb: "Psychometric scales covering personality traits that shape leadership impact.",
    itemCount: BEHAVIORAL_ITEMS.length,
    estimatedMinutes: 8,
    scaleCount: TRAITS.length,
  },
  {
    id: "cognitive",
    name: "Cognitive Battery",
    blurb: "Timed reasoning items — numerical, verbal, abstract and adaptive problem solving.",
    itemCount: COGNITIVE_ITEMS.length,
    estimatedMinutes: 15,
    scaleCount: 4,
  },
];

export function getModule(id: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.id === id);
}

/** Client-safe cognitive items — the correct answer and rationale are stripped. */
export function publicCognitiveItems() {
  return COGNITIVE_ITEMS.map(({ answer: _answer, rationale: _rationale, ...rest }) => rest);
}
