import type { Email, CalendarEvent } from "@/components/DashboardProvider";

// Heuristic intelligence — no API keys or external calls needed.

const AUTOMATED_ADDRESS = /(no-?reply|notifications?|mailer|newsletter|receipts?|donotreply|automated|updates|alerts?|calendar-notification|billing|support)@/i;
const AUTOMATED_DOMAINS = /@(github\.com|stripe\.com|vercel\.com|atlassian\.(com|net)|slack\.com|google\.com|microsoft\.com|linkedin\.com)$/i;

const ACTION_PATTERNS: { re: RegExp; label: string; weight: number }[] = [
  { re: /action required|action needed/i, label: "Action required", weight: 4 },
  { re: /urgent|asap|immediately|critical/i, label: "Urgent", weight: 4 },
  { re: /please (review|approve|confirm|sign|respond|reply)/i, label: "Needs your review", weight: 3 },
  { re: /\brsvp\b/i, label: "RSVP", weight: 3 },
  { re: /deadline|due (by|date|today|tomorrow)|overdue/i, label: "Deadline", weight: 3 },
  { re: /waiting (for|on) (you|your)/i, label: "Waiting on you", weight: 3 },
  { re: /reminder/i, label: "Reminder", weight: 2 },
  { re: /approval|approve\b/i, label: "Approval", weight: 2 },
  { re: /can you|could you|would you/i, label: "Request", weight: 2 },
];

export function isAutomated(email: Email): boolean {
  const address = email.from?.emailAddress?.address ?? "";
  return AUTOMATED_ADDRESS.test(address) || AUTOMATED_DOMAINS.test(address);
}

export interface PriorityEmail {
  email: Email;
  score: number;
  reasons: string[];
}

export function rankEmails(emails: Email[]): PriorityEmail[] {
  const now = Date.now();

  return emails
    .map((email) => {
      const text = `${email.subject ?? ""} ${email.bodyPreview ?? ""}`;
      const reasons: string[] = [];
      let score = 0;

      if (!email.isRead) score += 3;

      const automated = isAutomated(email);
      if (!automated) {
        score += 2;
        reasons.push("From a person");
      }

      for (const p of ACTION_PATTERNS) {
        if (p.re.test(text)) {
          score += p.weight;
          reasons.push(p.label);
          break; // strongest matching signal only, keeps chips readable
        }
      }

      const ageHrs = (now - new Date(email.receivedDateTime).getTime()) / 3_600_000;
      if (ageHrs < 3) {
        score += 2;
      } else if (!email.isRead && ageHrs > 24) {
        score += 2;
        reasons.push(`Unread ${Math.floor(ageHrs / 24)}d+`);
      }

      return { email, score, reasons };
    })
    .filter((p) => !p.email.isRead && p.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

export interface Conflict {
  a: CalendarEvent;
  b: CalendarEvent;
}

export function findConflicts(events: CalendarEvent[]): Conflict[] {
  const timed = events
    .filter((e) => !e.isAllDay)
    .sort((x, y) => new Date(x.start.dateTime).getTime() - new Date(y.start.dateTime).getTime());

  const conflicts: Conflict[] = [];
  for (let i = 0; i < timed.length - 1; i++) {
    const endA = new Date(timed[i].end.dateTime).getTime();
    const startB = new Date(timed[i + 1].start.dateTime).getTime();
    if (startB < endA) conflicts.push({ a: timed[i], b: timed[i + 1] });
  }
  return conflicts;
}

export function noiseSummary(emails: Email[]): { automated: number; total: number } {
  return {
    automated: emails.filter(isAutomated).length,
    total: emails.length,
  };
}

export interface FocusWindow {
  start: Date;
  end: Date;
  minutes: number;
}

const WORKDAY_START_HOUR = 8;
const WORKDAY_END_HOUR = 18;
const MIN_FOCUS_MINUTES = 45;

/** Find open gaps in today's calendar big enough for deep work. */
export function findFocusWindows(events: CalendarEvent[]): FocusWindow[] {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(WORKDAY_START_HOUR, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(WORKDAY_END_HOUR, 0, 0, 0);

  const windowStart = now > dayStart ? now : dayStart;
  if (windowStart >= dayEnd) return [];

  // Today's timed meetings as busy intervals, merged where they overlap
  const busy = events
    .filter((e) => !e.isAllDay)
    .map((e) => ({ start: new Date(e.start.dateTime), end: new Date(e.end.dateTime) }))
    .filter((b) => b.end > windowStart && b.start < dayEnd)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: { start: Date; end: Date }[] = [];
  for (const b of busy) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) {
      if (b.end > last.end) last.end = b.end;
    } else {
      merged.push({ ...b });
    }
  }

  const windows: FocusWindow[] = [];
  let cursor = windowStart;
  for (const b of merged) {
    if (b.start > cursor) {
      const minutes = Math.floor((b.start.getTime() - cursor.getTime()) / 60_000);
      if (minutes >= MIN_FOCUS_MINUTES) windows.push({ start: cursor, end: b.start, minutes });
    }
    if (b.end > cursor) cursor = b.end;
  }
  if (dayEnd > cursor) {
    const minutes = Math.floor((dayEnd.getTime() - cursor.getTime()) / 60_000);
    if (minutes >= MIN_FOCUS_MINUTES) windows.push({ start: cursor, end: dayEnd, minutes });
  }

  return windows.sort((a, b) => b.minutes - a.minutes).slice(0, 3);
}
