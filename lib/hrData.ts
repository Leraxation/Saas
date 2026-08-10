import { redisConfigured, redisGet, redisSet } from "@/lib/redis";

export interface DepartmentData {
  headcountFilled: number;
  headcountOpen: number;
  openItems: string[];
  note: string;
  updatedAt: string | null;
}

/** Starting figures — a real baseline to edit from, not invented per-request by the agent. */
const SEED: Record<string, DepartmentData> = {
  talent: {
    headcountFilled: 6,
    headcountOpen: 2,
    openItems: ["Cabin crew recruitment drive", "Q3 performance review cycle"],
    note: "Succession plan for Ops Manager role in progress.",
    updatedAt: null,
  },
  strategy: {
    headcountFilled: 0,
    headcountOpen: 3,
    openItems: ["Org design review", "Monthly HR dashboard build-out"],
    note: "Function lead role is vacant — reporting is manual for now.",
    updatedAt: null,
  },
  "employee-relations": {
    headcountFilled: 4,
    headcountOpen: 1,
    openItems: ["2 open grievance cases", "Policy handbook refresh"],
    note: "",
    updatedAt: null,
  },
  rewards: {
    headcountFilled: 3,
    headcountOpen: 0,
    openItems: ["Annual salary benchmarking against Gulf carriers"],
    note: "",
    updatedAt: null,
  },
  comms: {
    headcountFilled: 0,
    headcountOpen: 2,
    openItems: ["Employee engagement survey", "Intranet relaunch"],
    note: "Function lead role is vacant.",
    updatedAt: null,
  },
  operations: {
    headcountFilled: 8,
    headcountOpen: 1,
    openItems: ["Fleet management SOP update", "12 pending visa renewals"],
    note: "",
    updatedAt: null,
  },
  health: {
    headcountFilled: 5,
    headcountOpen: 0,
    openItems: ["Annual occupational health screening"],
    note: "",
    updatedAt: null,
  },
  facility: {
    headcountFilled: 3,
    headcountOpen: 0,
    openItems: ["HSE audit — Terminal 2 hangar"],
    note: "",
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
