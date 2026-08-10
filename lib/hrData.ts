import { redisConfigured, redisGet, redisSet } from "@/lib/redis";

export interface DepartmentData {
  headcountFilled: number;
  headcountOpen: number;
  openItems: string[];
  note: string;
  updatedAt: string | null;
}

/**
 * Starting figures — sourced from the approved HR Organization (Phase 1) chart, not invented.
 * headcountFilled/headcountOpen count the function lead plus each named team role;
 * openItems lists the actual vacant roles by title.
 */
const SEED: Record<string, DepartmentData> = {
  talent: {
    headcountFilled: 4,
    headcountOpen: 1,
    openItems: ["Vacant: L&D Manager"],
    note: "Team: Sami (Recruitment & Selection Manager), Marwa (Performance Management, TBC), Hiba (Succession Lead).",
    updatedAt: null,
  },
  strategy: {
    headcountFilled: 0,
    headcountOpen: 3,
    openItems: ["Vacant: Function Lead", "Vacant: Strategic Planning & PMO", "Vacant: HR Analytics & Metrics Lead"],
    note: "Entire function is currently unstaffed.",
    updatedAt: null,
  },
  "employee-relations": {
    headcountFilled: 7,
    headcountOpen: 0,
    openItems: [],
    note: "Team: Saqar (EE Manager), Nadiya (HRBP Manager), Abdulhamid, Munir, Matar (TBC), Samiha (HRBPs).",
    updatedAt: null,
  },
  rewards: {
    headcountFilled: 1,
    headcountOpen: 1,
    openItems: ["Vacant: C&B Manager"],
    note: "Saif leads as Head of Compensation & Benefits.",
    updatedAt: null,
  },
  comms: {
    headcountFilled: 0,
    headcountOpen: 2,
    openItems: ["Vacant: Head of Function", "Vacant: Change & Culture Lead"],
    note: "Entire function is currently unstaffed.",
    updatedAt: null,
  },
  operations: {
    headcountFilled: 4,
    headcountOpen: 0,
    openItems: [],
    note: "Khalid leads a team of 3 covering Audit, Planning, PMO and project delivery.",
    updatedAt: null,
  },
  health: {
    headcountFilled: 4,
    headcountOpen: 0,
    openItems: [],
    note: "Dr. Waleed leads 2 Medical Officers and an Occupational Health Specialist.",
    updatedAt: null,
  },
  facility: {
    headcountFilled: 6,
    headcountOpen: 0,
    openItems: [],
    note: "Jawhara leads the team, including Usama on facility operations.",
    updatedAt: null,
  },
};

function key(departmentId: string): string {
  return `people-os:dept-data:${departmentId}`;
}

export function seedFor(departmentId: string): DepartmentData | null {
  return SEED[departmentId] ?? null;
}

export async function getDepartmentData(departmentId: string): Promise<DepartmentData | null> {
  const seed = seedFor(departmentId);
  if (!seed) return null;
  if (!redisConfigured()) return seed;
  try {
    const stored = await redisGet<DepartmentData>(key(departmentId));
    return stored ?? seed;
  } catch {
    return seed;
  }
}

export interface DepartmentDataPatch {
  headcountFilled?: number;
  headcountOpen?: number;
  openItems?: string[];
  note?: string;
}

export async function setDepartmentData(
  departmentId: string,
  patch: DepartmentDataPatch
): Promise<DepartmentData | null> {
  if (!seedFor(departmentId)) return null;
  if (!redisConfigured()) return null;
  const current = (await getDepartmentData(departmentId)) as DepartmentData;
  const next: DepartmentData = {
    headcountFilled: patch.headcountFilled ?? current.headcountFilled,
    headcountOpen: patch.headcountOpen ?? current.headcountOpen,
    openItems: patch.openItems ?? current.openItems,
    note: patch.note ?? current.note,
    updatedAt: new Date().toISOString(),
  };
  await redisSet(key(departmentId), next);
  return next;
}
