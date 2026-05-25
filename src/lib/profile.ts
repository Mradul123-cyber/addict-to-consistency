export const JEE_TARGET_YEARS = [2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035] as const;
export const DEFAULT_DAILY_GOAL_MINUTES = 150;
export const MIN_DAILY_GOAL_MINUTES = 90;
export const MAX_DAILY_GOAL_MINUTES = 1440;
export const DAILY_GOAL_CHANGE_INTERVAL_DAYS = 30;
export const DAILY_GOAL_OPTIONS = [90, 120, 150, 180, 210, 240, 270, 300] as const;

export type JeeTargetYear = (typeof JEE_TARGET_YEARS)[number];
export type DailyGoalMinutes = (typeof DAILY_GOAL_OPTIONS)[number];

export interface UserProfile {
  targetYear: JeeTargetYear;
  dailyGoalMinutes: number;
  dailyGoalChangedAt?: number | null;
}

export function normalizeDailyGoalMinutes(value: unknown): number {
  return typeof value === "number" &&
    value >= MIN_DAILY_GOAL_MINUTES &&
    value <= MAX_DAILY_GOAL_MINUTES
    ? Math.round(value)
    : DEFAULT_DAILY_GOAL_MINUTES;
}

export function isValidDailyGoalMinutes(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_DAILY_GOAL_MINUTES &&
    value <= MAX_DAILY_GOAL_MINUTES
  );
}

export function canChangeDailyGoal(
  changedAt: number | null | undefined,
  now = Date.now(),
): boolean {
  if (!changedAt) return true;
  return now - changedAt >= DAILY_GOAL_CHANGE_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
}

export function nextDailyGoalChangeDate(changedAt: number | null | undefined): Date | null {
  if (!changedAt) return null;
  return new Date(changedAt + DAILY_GOAL_CHANGE_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
}

export function targetDateFromYear(year: number): Date {
  return new Date(`${year}-01-20T00:00:00`);
}

export function daysUntilExam(targetDate: Date, now = new Date()): number {
  const ms = targetDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function formatExamDate(year: number): string {
  return targetDateFromYear(year).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
