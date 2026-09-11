/**
 * Oman Vision 2040 — Aviation Sector Briefing
 * Content & figures for the ministerial presentation, Muscat, 23 September 2026.
 *
 * ── HOW TO USE THIS FILE ────────────────────────────────────────────────────
 * Everything the audience reads lives here. Edit this file, not the components.
 *
 * Every number is a `Figure`. A Figure carries a `source` and a `verified`
 * flag. Figures with `verified: false` are surfaced in the PRE-FLIGHT CHECK
 * screen that runs before the presentation, and are flagged in Review Mode
 * (press V). Set `verified: true` only once the value has been confirmed
 * against the cited official source.
 *
 * Nothing in this file is an official statistic until someone sets that flag.
 * ────────────────────────────────────────────────────────────────────────────
 */

export type Figure = {
  /** The number itself, as a plain value so it can be counted up on scroll. */
  value: number;
  /** Rendered before the value, e.g. "OMR ". */
  prefix?: string;
  /** Rendered after the value, e.g. "M", "%", "×". */
  suffix?: string;
  /** Decimal places when displayed. */
  decimals?: number;
  /** The short label under the number. */
  label: string;
  /** One line of context shown beneath the label. */
  note?: string;
  /** Where this number comes from. Always fill this in. */
  source: string;
  /** Set true only after confirming the value against `source`. */
  verified: boolean;
};

export type Act = {
  id: string;
  /** Short name for the progress rail and presenter mode. */
  rail: string;
  /** Roman numeral shown in presenter mode. */
  numeral: string;
};

/* ─────────────────────────────────────────────────────────────────────────
   THE EVENT
   ───────────────────────────────────────────────────────────────────────── */

export const EVENT = {
  dateLine: "23 September 2026",
  dateLineAr: "٢٣ سبتمبر ٢٠٢٦",
  venue: "Muscat, Sultanate of Oman",
  venueAr: "مسقط، سلطنة عُمان",
  convening: "Aviation Sector Convening",
  hostLine: "Presented to the Chairman of Oman Air and the national aviation sector",
};

export const TITLES = {
  vision: "VISION 2040",
  visionAr: "رؤية عُمان ٢٠٤٠",
  standfirst: "Aviation as national infrastructure",
  deck:
    "How the Sultanate's aviation sector carries Oman Vision 2040 — connecting the " +
    "governorates, opening the economy, and moving a nation into its next century.",
};

/* ─────────────────────────────────────────────────────────────────────────
   ACTS — the scroll narrative. Order here is the order on screen.
   ───────────────────────────────────────────────────────────────────────── */

export const ACTS: Act[] = [
  { id: "overture", rail: "Overture", numeral: "I" },
  { id: "nation", rail: "The Nation", numeral: "II" },
  { id: "network", rail: "The Network", numeral: "III" },
  { id: "scale", rail: "The Scale", numeral: "IV" },
  { id: "pillars", rail: "The Pillars", numeral: "V" },
  { id: "roadmap", rail: "The Roadmap", numeral: "VI" },
  { id: "close", rail: "The Ask", numeral: "VII" },
];

/* ─────────────────────────────────────────────────────────────────────────
   ACT II — THE NATION
   ───────────────────────────────────────────────────────────────────────── */

export const NATION = {
  kicker: "Act II — The Nation",
  heading: "A country shaped like a route map",
  body:
    "Oman runs three thousand kilometres of coastline from Musandam to Dhofar, " +
    "separated by mountain, desert and sea. No other mode of transport binds those " +
    "distances in a single hour. Aviation is not a sector of the Omani economy — it " +
    "is the connective tissue that makes one economy out of eleven governorates.",
  beats: [
    {
      heading: "Geography is the mandate",
      body:
        "Musandam to Salalah is further than London to Rome. Domestic aviation is the " +
        "only service that makes the Sultanate a single labour market, a single health " +
        "system, and a single tourism proposition.",
    },
    {
      heading: "Position is the opportunity",
      body:
        "Oman sits on the Indian Ocean side of the Gulf, outside the Strait of Hormuz, " +
        "on the natural line between Europe, East Africa and South and Southeast Asia. " +
        "That position is an asset that has to be flown to be realised.",
    },
    {
      heading: "The sector is the multiplier",
      body:
        "Every aviation decision compounds into tourism, logistics, manufacturing, " +
        "education and employment. The aviation plan is therefore a diversification " +
        "plan wearing a different name.",
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────
   ACT III — THE NETWORK
   ───────────────────────────────────────────────────────────────────────── */

export const NETWORK = {
  kicker: "Act III — The Network",
  heading: "Eleven governorates, one network",
  body:
    "The domestic constellation first: airports that turn a two-day drive into a " +
    "ninety-minute sector. Then the international reach that carries Omani exports, " +
    "Omani visitors and Omani talent outward.",
  /** Shown under the map. Keep this honest — it is a stylised diagram. */
  mapCaption:
    "Stylised network diagram. Outline is illustrative, not a cartographic boundary. " +
    "Route set is configured in lib/vision2040/geo.ts — confirm against the current published schedule.",
  domesticLabel: "Domestic airports",
  internationalLabel: "International reach",
};

/* ─────────────────────────────────────────────────────────────────────────
   ACT IV — THE SCALE
   Figures. Verify each one, then flip `verified` to true.
   ───────────────────────────────────────────────────────────────────────── */

export const SCALE = {
  kicker: "Act IV — The Scale",
  heading: "What the sector carries",
  body:
    "Capacity, reach and contribution. These are the numbers the sector is measured " +
    "on, and the numbers Vision 2040 asks it to move.",
};

export const FIGURES: Figure[] = [
  {
    value: 16.5,
    suffix: "M",
    decimals: 1,
    label: "Passengers handled",
    note: "Across all Omani airports, most recent full year",
    source: "ILLUSTRATIVE — replace with the published Oman Airports annual figure.",
    verified: false,
  },
  {
    value: 52,
    label: "Destinations served",
    note: "Scheduled points on the current network",
    source: "ILLUSTRATIVE — replace from the current published schedule.",
    verified: false,
  },
  {
    value: 38,
    label: "Aircraft in the national fleet",
    note: "In service at the date of this briefing",
    source: "ILLUSTRATIVE — replace with the current fleet count.",
    verified: false,
  },
  {
    value: 4.2,
    suffix: "%",
    decimals: 1,
    label: "Contribution to GDP",
    note: "Direct, indirect and induced",
    source: "ILLUSTRATIVE — replace from the official economic impact study.",
    verified: false,
  },
  {
    value: 96,
    suffix: "k",
    label: "Jobs supported",
    note: "Across the aviation value chain",
    source: "ILLUSTRATIVE — replace from the official employment study.",
    verified: false,
  },
  {
    value: 210,
    suffix: "k t",
    label: "Cargo throughput",
    note: "Freight and mail, most recent full year",
    source: "ILLUSTRATIVE — replace with the published cargo tonnage.",
    verified: false,
  },
];

/**
 * Growth series for the chart.
 * The shape below is ILLUSTRATIVE so the page reads correctly out of the box.
 * Replace with the official forecast series, then set `verified: true`.
 */
export const GROWTH = {
  title: "Passenger trajectory to 2040",
  unit: "million passengers",
  source: "ILLUSTRATIVE — replace with the official forecast series.",
  verified: false,
  series: [
    { year: 2026, value: 16.5 },
    { year: 2028, value: 19.2 },
    { year: 2030, value: 22.4 },
    { year: 2033, value: 27.6 },
    { year: 2036, value: 33.8 },
    { year: 2040, value: 42.0 },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────
   ACT V — THE PILLARS
   Oman Vision 2040 is organised around national priorities grouped into
   these axes. Confirm the exact official wording against the published
   Vision 2040 document before presenting.
   ───────────────────────────────────────────────────────────────────────── */

export const PILLARS = {
  kicker: "Act V — The Pillars",
  heading: "Where aviation carries the Vision",
  body:
    "Oman Vision 2040 is organised around national priorities grouped into three " +
    "axes. Aviation is one of the few sectors that touches all three at once.",
  source:
    "Axis names follow the published Oman Vision 2040 framework — confirm exact official wording.",
  verified: false,
  items: [
    {
      axis: "People and Society",
      axisAr: "الإنسان والمجتمع",
      claim: "Aviation moves people, not just passengers.",
      points: [
        "Domestic connectivity puts specialist healthcare within a single flight of every governorate.",
        "Omani pilots, engineers and controllers trained to international standard — a national skills asset.",
        "Cultural access: the Sultanate's heritage made reachable for Omanis and visitors alike.",
      ],
    },
    {
      axis: "Economy and Development",
      axisAr: "الاقتصاد والتنمية",
      claim: "Every route is an economic instrument.",
      points: [
        "Diversification: tourism, logistics and air cargo as non-hydrocarbon revenue.",
        "Governorate development: Duqm, Salalah and Sohar connected to global supply chains.",
        "Private sector and investment: aviation as the front door for foreign direct investment.",
      ],
    },
    {
      axis: "Governance and Institutional Performance",
      axisAr: "الحوكمة والأداء المؤسسي",
      claim: "A sector run to international standard.",
      points: [
        "Safety and regulatory oversight held at or above global benchmarks.",
        "Transparent performance reporting across the national aviation system.",
        "Coordinated planning between the regulator, the airports and the national carrier.",
      ],
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────
   ACT VI — THE ROADMAP
   ───────────────────────────────────────────────────────────────────────── */

export const ROADMAP = {
  kicker: "Act VI — The Roadmap",
  heading: "2026 to 2040, in four movements",
  body:
    "Fourteen years is three fleet cycles and one generation of Omani professionals. " +
    "The sequencing matters more than the ambition.",
  phases: [
    {
      span: "2026 — 2028",
      title: "Consolidate",
      lede: "Put the fundamentals beyond question.",
      items: [
        "Network discipline: profitability per sector as the governing metric.",
        "Operational reliability — on-time performance as a national reputation asset.",
        "Baseline the data. Every figure in this briefing, published and audited.",
      ],
    },
    {
      span: "2029 — 2032",
      title: "Connect",
      lede: "Make the map match the ambition.",
      items: [
        "Domestic frequency lifted to make same-day return travel routine.",
        "Strategic partnerships and interline reach in place of unsupported thin routes.",
        "Cargo corridors aligned to Duqm and Sohar industrial output.",
      ],
    },
    {
      span: "2033 — 2036",
      title: "Compete",
      lede: "Win traffic on merit, not on subsidy.",
      items: [
        "Fleet renewal on fuel-burn economics, not prestige.",
        "Muscat positioned as a genuine transfer proposition on its own geography.",
        "Omanisation of technical and command grades at scale.",
      ],
    },
    {
      span: "2037 — 2040",
      title: "Compound",
      lede: "Aviation as a permanent national advantage.",
      items: [
        "Sustainable aviation fuel capability aligned to national energy strategy.",
        "The sector self-funding its own growth.",
        "A network that makes the Sultanate unavoidable on the Indian Ocean rim.",
      ],
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────
   ACT VII — THE CLOSE
   ───────────────────────────────────────────────────────────────────────── */

export const CLOSE = {
  kicker: "Act VII — The Ask",
  heading: "One sector. One plan. One horizon.",
  body:
    "Vision 2040 does not ask aviation to grow. It asks aviation to carry — the " +
    "governorates, the diversification, and the generation that will run this sector " +
    "long after this meeting.",
  asks: [
    {
      title: "A single national aviation plan",
      body:
        "Regulator, airports and carrier planning against one set of targets, reviewed on one calendar.",
    },
    {
      title: "One published set of numbers",
      body:
        "A shared, audited data baseline so that every meeting after this one starts from the same page.",
    },
    {
      title: "A fourteen-year mandate",
      body:
        "Decisions sequenced to 2040, not to the next financial year. The routes that matter take longer than a budget cycle.",
    },
  ],
  signoff: "Oman Vision 2040 — Aviation",
  signoffAr: "رؤية عُمان ٢٠٤٠ — الطيران",
};

/* ─────────────────────────────────────────────────────────────────────────
   PRE-FLIGHT — collects everything that still needs verifying.
   ───────────────────────────────────────────────────────────────────────── */

export type PreflightItem = { label: string; source: string };

export function collectUnverified(): PreflightItem[] {
  const out: PreflightItem[] = [];
  for (const f of FIGURES) {
    if (!f.verified) out.push({ label: f.label, source: f.source });
  }
  if (!GROWTH.verified) out.push({ label: GROWTH.title, source: GROWTH.source });
  if (!PILLARS.verified) out.push({ label: "Vision 2040 axis wording", source: PILLARS.source });
  return out;
}
