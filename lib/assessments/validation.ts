import { LEVELS } from "./framework";
import type { Participant } from "./types";

export const MAX_NAME = 80;
export const MAX_EMAIL = 160;
export const MAX_TEXT = 800;

export function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

export function optionalString(value: unknown, max: number): string | null {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > max ? null : trimmed;
}

/** Deliberately permissive — enough to catch a typo, not to police valid addresses. */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseParticipant(body: unknown): Participant | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const name = cleanString(b.name, MAX_NAME);
  const email = cleanString(b.email, MAX_EMAIL);
  const role = cleanString(b.role, MAX_NAME);
  const department = cleanString(b.department, MAX_NAME);
  const level = typeof b.level === "string" ? LEVELS.find((l) => l.id === b.level)?.id : undefined;
  if (!name || !email || !isEmail(email) || !role || !department || !level) return null;
  return { name, email, role, department, level };
}
