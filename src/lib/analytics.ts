import type { SessionLog } from "./store";

export const JEE_DATE = new Date("2027-01-20T00:00:00");
export const DAILY_THRESHOLD_MIN = 150;

export function daysUntilJEE(now = new Date()): number {
  const ms = JEE_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function minutesByDay(sessions: SessionLog[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of sessions) {
    map[s.dateISO] = (map[s.dateISO] ?? 0) + s.minutes;
  }
  return map;
}

export function consistencyQuotient(sessions: SessionLog[], now = new Date()): number {
  const byDay = minutesByDay(sessions);
  let hits = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = isoDay(d);
    if ((byDay[key] ?? 0) >= DAILY_THRESHOLD_MIN) hits++;
  }
  return Math.round((hits / 7) * 100);
}

export function dailyMinutes28(sessions: SessionLog[], now = new Date()) {
  const byDay = minutesByDay(sessions);
  const out: { date: string; minutes: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = isoDay(d);
    out.push({ date: key, minutes: byDay[key] ?? 0 });
  }
  return out;
}

export function todayMinutes(sessions: SessionLog[], now = new Date()): number {
  const key = isoDay(now);
  return minutesByDay(sessions)[key] ?? 0;
}
