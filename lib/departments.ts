/** Oman Air People Department — org structure (People Department Functional Charter / HR Organization, Phase 1). */
export interface Department {
  id: string;
  name: string;
  owner: string;
  purpose: string;
  responsibilities: string[];
  /** Angle in degrees around the center node, 0 = due north, clockwise. */
  angle: number;
  accent: string;
  /** Ready-to-click starter prompts shown before the first message. */
  quickPrompts: string[];
}

export const CENTER = {
  name: "People Department",
  subtitle: "Kumail, CPO — Oman Air",
};

export const DEPARTMENTS: Department[] = [
  {
    id: "talent",
    name: "Talent Management & Development",
    owner: "Hisham",
    purpose:
      "Attract, onboard, develop, assess and retain talent across the employee lifecycle.",
    responsibilities: [
      "Recruitment & Selection",
      "Workforce Planning",
      "Learning & Development",
      "Performance Management",
      "Succession Planning",
    ],
    angle: 0,
    accent: "#818cf8",
    quickPrompts: [
      "Draft a 30-60-90 day onboarding plan for a new hire",
      "What should a succession plan for a critical role include?",
      "Outline a structured performance review conversation",
    ],
  },
  {
    id: "strategy",
    name: "Workforce Strategy & Planning",
    owner: "Vacant",
    purpose:
      "Enable strategic workforce decision-making through planning, analytics, and organizational design.",
    responsibilities: [
      "Strategic Workforce Planning",
      "Organizational Design",
      "Strategic Planning & PMO",
      "HR Analytics & Metrics",
      "HR Dashboard",
    ],
    angle: 45,
    accent: "#60a5fa",
    quickPrompts: [
      "What headcount metrics should a monthly HR dashboard track?",
      "How would you structure an org design review?",
      "Draft an outline for a quarterly HR analytics report",
    ],
  },
  {
    id: "employee-relations",
    name: "Employee Relations",
    owner: "Anwar",
    purpose:
      "Strengthen employee experience and provide effective people policies, processes, and support across the business.",
    responsibilities: [
      "Employee Relations",
      "Employee Experience",
      "Policies & Procedures",
      "HR Business Partnering",
      "Grievances & Disciplinary",
      "MoL Stakeholder Management",
      "HR Governance",
    ],
    angle: 90,
    accent: "#38bdf8",
    quickPrompts: [
      "Walk me through handling a grievance escalation",
      "Draft a fair, compliant disciplinary process outline",
      "What should an HR business partnering check-in cover?",
    ],
  },
  {
    id: "rewards",
    name: "Compensation & Benefits",
    owner: "Saif",
    purpose: "Design and manage competitive, equitable and sustainable reward programs.",
    responsibilities: [
      "Job Evaluation",
      "Salary Structures",
      "Market Benchmarking",
      "Rewards & Recognition",
      "Staff Benefits",
      "Employee Records",
    ],
    angle: 135,
    accent: "#34d399",
    quickPrompts: [
      "How would you benchmark salaries against the regional market?",
      "Draft a rewards & recognition program outline",
      "What factors go into a fair job evaluation?",
    ],
  },
  {
    id: "comms",
    name: "Internal Comms & Culture",
    owner: "Vacant",
    purpose:
      "Drive people engagement, culture, and work environment, and lead change through effective internal communications and practices.",
    responsibilities: [
      "Internal Communications",
      "Employee Engagement",
      "Culture Programs",
      "Change Management",
      "Leadership Communications",
    ],
    angle: 180,
    accent: "#fbbf24",
    quickPrompts: [
      "Draft an internal announcement for a policy change",
      "How would you run an employee engagement survey?",
      "Outline a change management plan for a new system rollout",
    ],
  },
  {
    id: "operations",
    name: "Operations & Services",
    owner: "Khalid",
    purpose:
      "Provide governance, operational support, and project delivery that enable effective People Department operations.",
    responsibilities: ["Audit & Compliance", "Planning", "PMO", "Project Delivery"],
    angle: 225,
    accent: "#fb923c",
    quickPrompts: [
      "What should an internal HR audit checklist include?",
      "How would you structure a PMO intake process for HR projects?",
      "Draft a project delivery status update template",
    ],
  },
  {
    id: "health",
    name: "Health Services",
    owner: "Dr. Waleed",
    purpose:
      "Provide occupational health and medical services that support employee wellbeing and regulatory compliance.",
    responsibilities: [
      "Medical Services",
      "Occupational Health",
      "Medical Center Operations",
      "Employee Health Programs",
      "Medical Compliance",
    ],
    angle: 270,
    accent: "#f87171",
    quickPrompts: [
      "What should an occupational health screening program include?",
      "Draft an employee wellbeing initiative outline",
      "What does medical compliance tracking typically involve?",
    ],
  },
  {
    id: "facility",
    name: "Facility Management",
    owner: "Jawhara",
    purpose:
      "Provide safe, compliant, cost-effective facilities that enable operational continuity and enhance employee experience.",
    responsibilities: [
      "Buildings & Offices",
      "Utilities & Maintenance",
      "Space Management",
      "Transportation, Reception & Hygiene",
      "Visa Processing",
      "Facilities Maintenance",
      "Workplace & Admin",
      "Vendor & Contracts",
      "Assets Management",
      "Compliance & Governance",
    ],
    angle: 315,
    accent: "#c084fc",
    quickPrompts: [
      "Draft a visa renewal process checklist",
      "How would you structure vendor and contract management?",
      "What should a facility safety audit checklist include?",
    ],
  },
];

export function getDepartment(id: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.id === id);
}
