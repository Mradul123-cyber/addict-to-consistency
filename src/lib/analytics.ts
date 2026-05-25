import type { SessionLog } from "./store";
import { DEFAULT_DAILY_GOAL_MINUTES } from "./profile";

export const DAILY_THRESHOLD_MIN = DEFAULT_DAILY_GOAL_MINUTES;

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

export function consistencyQuotient(
  sessions: SessionLog[],
  now = new Date(),
  dailyGoalMinutes = DEFAULT_DAILY_GOAL_MINUTES,
): number {
  const byDay = minutesByDay(sessions);
  let hits = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = isoDay(d);
    if ((byDay[key] ?? 0) >= dailyGoalMinutes) hits++;
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

export function currentStreak(
  sessions: SessionLog[],
  now = new Date(),
  dailyGoalMinutes = DEFAULT_DAILY_GOAL_MINUTES,
): number {
  const byDay = minutesByDay(sessions);
  const todayKey = isoDay(now);
  const todayMins = byDay[todayKey] ?? 0;

  let streak = 0;
  let startOffset = 0;

  if (todayMins >= dailyGoalMinutes) {
    startOffset = 0;
  } else {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = isoDay(yesterday);
    const yesterdayMins = byDay[yesterdayKey] ?? 0;

    if (yesterdayMins >= dailyGoalMinutes) {
      startOffset = 1;
    } else {
      return 0;
    }
  }

  let offset = startOffset;
  while (true) {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    const key = isoDay(d);
    if ((byDay[key] ?? 0) >= dailyGoalMinutes) {
      streak++;
      offset++;
    } else {
      break;
    }
  }
  return streak;
}

function dayMeetsThreshold(
  byDay: Record<string, number>,
  key: string,
  dailyGoalMinutes = DEFAULT_DAILY_GOAL_MINUTES,
): boolean {
  return (byDay[key] ?? 0) >= dailyGoalMinutes;
}

export function bestStreak(
  sessions: SessionLog[],
  dailyGoalMinutes = DEFAULT_DAILY_GOAL_MINUTES,
): number {
  const byDay = minutesByDay(sessions);
  const qualifyingDays = Object.keys(byDay)
    .filter((key) => dayMeetsThreshold(byDay, key, dailyGoalMinutes))
    .sort();

  if (qualifyingDays.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < qualifyingDays.length; i++) {
    const prev = new Date(`${qualifyingDays[i - 1]}T00:00:00`);
    const curr = new Date(`${qualifyingDays[i]}T00:00:00`);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}
