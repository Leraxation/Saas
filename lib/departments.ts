/** Oman Air People Department — org structure (Approved HR Structure, June 2026). */
export interface Department {
  id: string;
  name: string;
  owner: string;
  purpose: string;
  responsibilities: string[];
  /** Angle in degrees around the center node, 0 = due north, clockwise. */
  angle: number;
  accent: string;
}

export const CENTER = {
  name: "People Department",
  subtitle: "CPO — Oman Air",
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
  },
  {
    id: "strategy",
    name: "Strategy & Planning",
    owner: "Vacant",
    purpose:
      "Enable data-driven decision making and planning: analytics, org design, reporting, and dashboards.",
    responsibilities: [
      "Organizational Design",
      "HR Analytics & Metrics",
      "Reporting",
      "HR Dashboard",
    ],
    angle: 45,
    accent: "#60a5fa",
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
      "Policies & Processes",
      "HR Business Partnering",
      "Grievances & Disciplinary",
      "Stakeholder Management",
    ],
    angle: 90,
    accent: "#38bdf8",
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
      "Staff Travel & Benefits",
      "Employee Records",
    ],
    angle: 135,
    accent: "#34d399",
  },
  {
    id: "comms",
    name: "Internal Comms & Culture",
    owner: "Vacant",
    purpose:
      "Drive people engagement, culture, and work environment, and lead change through effective internal communications and practices.",
    responsibilities: [
      "Internal Comms",
      "Employee Engagement",
      "Culture Programs",
      "Change Management",
      "Digital Transformation",
      "HR Projects",
    ],
    angle: 180,
    accent: "#fbbf24",
  },
  {
    id: "operations",
    name: "Operations & Services",
    owner: "Khalid",
    purpose:
      "Provide operational support and employee services that enable effective People Department operations.",
    responsibilities: [
      "HR Governance & Compliance",
      "Internal Audit",
      "Buildings & Offices",
      "Utilities & Maintenance",
      "Space Management",
      "Transportation, Reception & Hygiene",
      "Visa Processing",
      "Fleet Management",
    ],
    angle: 225,
    accent: "#fb923c",
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
  },
  {
    id: "facility",
    name: "Facility Management",
    owner: "Jawhara",
    purpose:
      "Provide safe, compliant, cost-effective facilities that enable operational continuity and enhance employee experience.",
    responsibilities: ["Health, Safety & Environment (HSE)"],
    angle: 315,
    accent: "#c084fc",
  },
];

export function getDepartment(id: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.id === id);
}
