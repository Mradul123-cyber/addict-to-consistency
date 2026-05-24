export const JEE_TARGET_YEARS = [2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035] as const;

export type JeeTargetYear = (typeof JEE_TARGET_YEARS)[number];

export interface UserProfile {
  targetYear: JeeTargetYear;
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
