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
  { id: "operators", rail: "The Operators", numeral: "V" },
  { id: "board", rail: "The Board", numeral: "VI" },
  { id: "pillars", rail: "The Pillars", numeral: "VII" },
  { id: "roadmap", rail: "The Roadmap", numeral: "VIII" },
  { id: "outlook", rail: "Outlook", numeral: "IX" },
  { id: "close", rail: "The Ask", numeral: "X" },
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
    "Where the sector actually stands in September 2026, and what the National " +
    "Aviation Strategy 2040 — approved this January — asks of it. Both halves " +
    "matter: the target is only meaningful against the baseline.",
};

export const FIGURES: Figure[] = [
  {
    value: 14.94,
    suffix: "M",
    decimals: 2,
    label: "Passengers, 2025",
    note: "All Omani airports, full year — up 2.8% on 2024",
    source: "NCSI, via Muscat Daily, 14 Feb 2026 (14,939,209 vs 14,537,674).",
    verified: true,
  },
  {
    value: -9.3,
    suffix: "%",
    decimals: 1,
    label: "Traffic, H1 2026",
    note: "6.28M against 6.92M in H1 2025 — the trend the plan has to reverse",
    source: "NCSI, H1 2026 bulletin.",
    verified: true,
  },
  {
    value: 40,
    suffix: "M",
    label: "Passenger target, 2040",
    note: "National Aviation Strategy 2040, approved January 2026",
    source: "National Aviation Strategy 2040, CAA Oman; reported Oman Observer / Aviation Week.",
    verified: true,
  },
  {
    value: 1,
    suffix: "M t",
    label: "Air cargo target, 2040",
    note: "Roughly one million tonnes a year",
    source: "National Aviation Strategy 2040, CAA Oman.",
    verified: true,
  },
  {
    value: 3.5,
    suffix: "%",
    decimals: 1,
    label: "GDP contribution target",
    note: "Aviation's share of national GDP by 2040",
    source: "National Aviation Strategy 2040, CAA Oman.",
    verified: true,
  },
  {
    value: 1,
    prefix: "OMR ",
    suffix: "bn+",
    label: "Private investment sought",
    note: "Cumulative, to 2040 — about USD 2.6bn",
    source: "National Aviation Strategy 2040, CAA Oman.",
    verified: true,
  },
];

/**
 * Passenger trajectory.
 *
 * Two real anchors — 14.94M actual in 2025 and the 40M target for 2040 — and
 * the line between them is arithmetic, not a forecast: the 6.8% compound
 * annual growth the target implies. Labelled as such on the chart, because a
 * required trajectory and a prediction are different claims.
 */
export const GROWTH = {
  title: "What 40 million by 2040 requires",
  unit: "million passengers · required trajectory at 6.8% CAGR",
  source:
    "Anchors: NCSI 2025 actual (14.94M) and National Aviation Strategy 2040 target (40M). " +
    "Intermediate years are the implied compound path, not a forecast.",
  verified: true,
  series: [
    { year: 2025, value: 14.9 },
    { year: 2027, value: 17.0 },
    { year: 2029, value: 19.4 },
    { year: 2031, value: 22.2 },
    { year: 2033, value: 25.3 },
    { year: 2035, value: 28.8 },
    { year: 2037, value: 32.8 },
    { year: 2040, value: 40.0 },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────
   THE OPERATORS — the sector, entity by entity.
   Every figure here carries its source. Confirm against each company's own
   published statements before the meeting; press reporting lags filings.
   ───────────────────────────────────────────────────────────────────────── */

export type Entity = {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  /** One line: what this entity is for. */
  claim: string;
  body: string;
  stats: { label: string; value: string; source: string }[];
};

export const OPERATORS = {
  kicker: "Act V — The Operators",
  heading: "One sector, four mandates",
  body:
    "Vision 2040 is delivered by named institutions, not by a sector in the " +
    "abstract. Each has a distinct job, and the plan only works if the four " +
    "are sequenced against one calendar.",
  items: [
    {
      id: "omanair",
      name: "Oman Air",
      nameAr: "الطيران العُماني",
      role: "The national carrier",
      claim: "The country's reach, and its reputation in the air.",
      body:
        "Restructured hard: the A330s retired, the network trimmed, thin routes " +
        "cut. It joined oneworld on 30 June 2025 as the alliance's fifteenth " +
        "member — which buys Oman reach it could never fly on its own metal.",
      stats: [
        { label: "Fleet", value: "22 B737 · 11 B787", source: "Press reporting, 2025; three 787s leased out." },
        { label: "Network", value: "~42 points, 22 countries", source: "Oman Air / oneworld, 2025." },
        { label: "Alliance", value: "oneworld, 15th member", source: "Joined 30 June 2025." },
        { label: "London Heathrow", value: "to 14x weekly", source: "Announced for summer 2026." },
      ],
    },
    {
      id: "omanairports",
      name: "Oman Airports",
      nameAr: "المطارات العُمانية",
      role: "The infrastructure",
      claim: "Every passenger in the country passes through their estate.",
      body:
        "Muscat, Salalah, Sohar, Duqm and the regional fields. Its numbers are " +
        "the sector's numbers: 14.94 million passengers in 2025, and the 9.3% " +
        "fall in the first half of 2026 that the strategy now has to answer.",
      stats: [
        { label: "Passengers 2025", value: "14.94M", source: "NCSI (14,939,209), +2.8% on 2024." },
        { label: "Muscat 2025", value: "11.84M intl · 1.32M dom", source: "NCSI; domestic up 12%." },
        { label: "Salalah 2025", value: "0.68M intl · 1.02M dom", source: "NCSI; domestic up 17.7%." },
        { label: "Flights 2025", value: "104,510", source: "NCSI, −2.8% on 2024." },
      ],
    },
    {
      id: "transom",
      name: "TRANSOM",
      nameAr: "ترانسُم",
      role: "Ground handling",
      claim: "The half-hour that decides whether the schedule holds.",
      body:
        "The national ground handler, and an Oman Airports subsidiary since the " +
        "2021 reorganisation that dissolved Oman Aviation Group. Turnaround " +
        "time is where on-time performance is won or lost, and where a 40-million " +
        "passenger airport system either scales or seizes.",
      stats: [
        { label: "Scope", value: "Passenger · freight · general aviation", source: "TRANSOM Handling." },
        { label: "Coverage", value: "All Omani airports served", source: "TRANSOM Handling." },
        { label: "Ownership", value: "Oman Airports subsidiary", source: "Since the 2021 OAG dissolution." },
      ],
    },
    {
      id: "salamair",
      name: "SalamAir",
      nameAr: "طيران السلام",
      role: "Low cost",
      claim: "The volume engine, and the domestic network's backbone.",
      body:
        "Founded in 2016 and now the fastest-growing part of the system. It " +
        "carried 3.4 million passengers in 2025 across more than 22,000 flights, " +
        "and its domestic services are much of why internal traffic grew while " +
        "international traffic did not.",
      stats: [
        { label: "Passengers 2025", value: "3.4M", source: "SalamAir, 2025; 22,000+ flights." },
        { label: "Fleet", value: "15 A320/A321neo", source: "SalamAir, 2025." },
        { label: "Network", value: "40+ points, 15+ countries", source: "SalamAir; includes four domestic routes." },
        { label: "Fleet plan", value: "25 aircraft by 2028", source: "Announced leasing programme." },
      ],
    },
  ] as Entity[],
};

/* ─────────────────────────────────────────────────────────────────────────
   THE SECTOR BOARD — everything on one screen.
   ───────────────────────────────────────────────────────────────────────── */

export const BOARD = {
  kicker: "Act VI — The Sector Board",
  heading: "The whole system, on one screen",
  body:
    "Four institutions, one set of numbers. This is the shared baseline the " +
    "briefing asks for — published once, read the same way by everyone in the room.",
  asOf: "Latest published figures as at September 2026",
  columns: ["Entity", "Mandate", "Scale", "2040 exposure"],
  rows: [
    {
      entity: "Oman Air",
      mandate: "National carrier",
      scale: "33 aircraft · ~42 points",
      exposure: "Carries the connectivity target; oneworld reach is the lever",
      tone: "gold",
    },
    {
      entity: "Oman Airports",
      mandate: "Airports & terminals",
      scale: "14.94M pax · 104,510 flights",
      exposure: "Owns the 40M capacity question outright",
      tone: "cyan",
    },
    {
      entity: "TRANSOM",
      mandate: "Ground handling",
      scale: "All Omani airports",
      exposure: "Turnaround is the constraint no terminal expansion fixes",
      tone: "cyan",
    },
    {
      entity: "SalamAir",
      mandate: "Low-cost & domestic",
      scale: "3.4M pax · 15 aircraft → 25 by 2028",
      exposure: "The only operator currently growing domestic volume",
      tone: "gold",
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────
   OUTLOOK — analysis, explicitly labelled as such.
   ───────────────────────────────────────────────────────────────────────── */

export const OUTLOOK = {
  kicker: "Act IX — Outlook",
  heading: "What the numbers imply",
  body:
    "The following is analysis, not published policy, and it is labelled that " +
    "way on screen. It is derived from the figures in this briefing and from " +
    "the strategy's own targets.",
  disclaimer: "Analysis — derived from the cited figures, not official forecast",
  insights: [
    {
      head: "The gap is 6.8% a year, every year, for fifteen years",
      body:
        "14.94M in 2025 to 40M in 2040 is a 2.7× increase, which compounds to " +
        "6.8% annually. No Omani year on record has sustained that. The target " +
        "is therefore a capacity and demand-creation programme, not a growth forecast.",
      metric: "6.8%",
      metricLabel: "required CAGR",
    },
    {
      head: "The first year of the plan is running backwards",
      body:
        "The strategy was approved in January 2026. Traffic in the first half of " +
        "that year fell 9.3%, and international flights fell 10.7%. The gap to the " +
        "required path widens every month this continues — the compounding works " +
        "against the target as readily as for it.",
      metric: "−9.3%",
      metricLabel: "H1 2026 vs H1 2025",
    },
    {
      head: "Domestic is the only line growing",
      body:
        "In 2025 domestic passengers rose 12% at Muscat and 17.7% at Salalah while " +
        "international was broadly flat. The growth in the system is internal " +
        "connectivity — which is SalamAir's network, and which is also the part " +
        "Vision 2040 values for reasons beyond revenue.",
      metric: "+17.7%",
      metricLabel: "Salalah domestic, 2025",
    },
    {
      head: "One million tonnes of cargo is the harder target",
      body:
        "Passenger growth follows tourism and diaspora demand. Cargo follows " +
        "industrial output — Duqm, Sohar, and the logistics strategy's own 2040 " +
        "ambitions. Air cargo at that scale is won on belly capacity and " +
        "freighter economics, both of which are fleet decisions taken years ahead.",
      metric: "1M t",
      metricLabel: "2040 cargo target",
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────
   ACT V — THE PILLARS
   Oman Vision 2040 is organised around national priorities grouped into
   these axes. Confirm the exact official wording against the published
   Vision 2040 document before presenting.
   ───────────────────────────────────────────────────────────────────────── */

export const PILLARS = {
  kicker: "Act VII — The Pillars",
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
  kicker: "Act VIII — The Roadmap",
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
  kicker: "Act X — The Ask",
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
