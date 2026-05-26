import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Target, TrendingUp } from "lucide-react";
import { isoDay, minutesByDay } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SessionLog, Track } from "@/lib/store";

function monthName(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function startDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDuration(m: number): string {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h === 0) return `${mins}m`;
  if (mins === 0) return `${h}h`;
  return `${h}h ${mins}m`;
}

function topSubjectForDate(
  iso: string,
  sessions: SessionLog[],
  tracks: Track[],
): string | null {
  const daySessions = sessions.filter((s) => s.dateISO === iso);
  if (daySessions.length === 0) return null;
  const subjectMinutes: Record<string, number> = {};
  for (const s of daySessions) {
    let name = "Uncategorized";
    if (s.chapterId) {
      const t = tracks.find((t2) => t2.chapters.some((c) => c.id === s.chapterId));
      if (t) name = t.name;
    }
    subjectMinutes[name] = (subjectMinutes[name] ?? 0) + s.minutes;
  }
  const sorted = Object.entries(subjectMinutes).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

function monthStreak(
  year: number,
  month: number,
  sessions: SessionLog[],
  dailyGoalMinutes: number,
): number {
  const byDay = minutesByDay(sessions);
  let streak = 0;
  const today = new Date();
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const date = new Date(year, month, d);
    if (date > today) break;
    const key = isoDay(date);
    if ((byDay[key] ?? 0) >= dailyGoalMinutes) {
      streak++;
    } else {
      streak = 0;
    }
  }
  return streak;
}

function daysHitInMonth(
  year: number,
  month: number,
  sessions: SessionLog[],
  dailyGoalMinutes: number,
): { hits: number; elapsed: number } {
  const byDay = minutesByDay(sessions);
  const today = new Date();
  const totalDays = daysInMonth(year, month);
  let hits = 0;
  let elapsed = 0;
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    if (date > today) break;
    elapsed++;
    const key = isoDay(date);
    if ((byDay[key] ?? 0) >= dailyGoalMinutes) hits++;
  }
  return { hits, elapsed };
}

function bestDayInMonth(
  year: number,
  month: number,
  sessions: SessionLog[],
): number {
  const byDay = minutesByDay(sessions);
  let best = 0;
  const today = new Date();
  const totalDays = daysInMonth(year, month);
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    if (date > today) break;
    const key = isoDay(date);
    best = Math.max(best, byDay[key] ?? 0);
  }
  return best;
}

export function MonthlyCalendar({
  sessions,
  tracks,
  dailyGoalMinutes,
}: {
  sessions: SessionLog[];
  tracks: Track[];
  dailyGoalMinutes: number;
}) {
  const now = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const byDay = useMemo(() => minutesByDay(sessions), [sessions]);

  const cells = useMemo(() => {
    const totalDays = daysInMonth(viewYear, viewMonth);
    const startDay = startDayOfWeek(viewYear, viewMonth);
    const today = new Date();
    const result: Array<{
      day: number;
      iso: string;
      minutes: number;
      isFuture: boolean;
      isToday: boolean;
      status: "future" | "empty" | "miss" | "hit";
    }> = [];

    for (let i = 0; i < startDay; i++) {
      result.push({ day: 0, iso: "", minutes: 0, isFuture: false, isToday: false, status: "empty" });
    }

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const iso = isoDay(date);
      const mins = byDay[iso] ?? 0;
      const isFuture = date > today;
      const isTd = date.toDateString() === today.toDateString();

      let status: "future" | "empty" | "miss" | "hit";
      if (isFuture) {
        status = "future";
      } else if (mins >= dailyGoalMinutes) {
        status = "hit";
      } else if (mins >= 1) {
        status = "miss";
      } else {
        status = "empty";
      }

      result.push({ day: d, iso, minutes: mins, isFuture, isToday: isTd, status });
    }

    return result;
  }, [viewYear, viewMonth, byDay, dailyGoalMinutes]);

  const [hovered, setHovered] = useState<{ day: number; iso: string; minutes: number; x: number; y: number } | null>(null);

  const stats = useMemo(() => {
    const streak = monthStreak(viewYear, viewMonth, sessions, dailyGoalMinutes);
    const { hits, elapsed } = daysHitInMonth(viewYear, viewMonth, sessions, dailyGoalMinutes);
    const bestMins = bestDayInMonth(viewYear, viewMonth, sessions);
    return { streak, hits, elapsed, bestMins };
  }, [viewYear, viewMonth, sessions, dailyGoalMinutes]);

  const canGoPrev = true;
  const canGoNext = !isCurrentMonth;

  const goPrev = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () => {
    if (canGoNext) setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  const tooltipData = hovered
    ? (() => {
        const date = new Date(viewYear, viewMonth, hovered.day);
        const label = date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
        const subject = hovered.minutes > 0 ? topSubjectForDate(hovered.iso, sessions, tracks) : null;
        return { label, minutes: hovered.minutes, subject };
      })()
    : null;

  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-tight">{monthName(viewDate)}</CardTitle>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={goPrev} disabled={!canGoPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={goNext} disabled={!canGoNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <div className="relative">
          <div className="grid grid-cols-7 gap-[3px]">
            {dayLabels.map((l) => (
              <div key={l} className="h-5 flex items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {l}
              </div>
            ))}
            {cells.map((c, i) => (
              <div
                key={i}
                className={[
                  "h-8 rounded-[5px] flex items-center justify-center transition-colors duration-100",
                  c.day === 0 ? "pointer-events-none" : "cursor-default",
                  c.status === "hit" ? "bg-emerald-100 dark:bg-emerald-900/40" : "",
                  c.status === "miss" ? "bg-amber-100/60 dark:bg-amber-900/25" : "",
                  c.status === "empty" ? "bg-muted/20 dark:bg-muted/10" : "",
                  c.isFuture ? "opacity-0" : "",
                  c.isToday ? "ring-2 ring-primary/70 ring-offset-1 ring-offset-background" : "",
                ].join(" ")}
                onMouseEnter={(e) => {
                  if (c.day === 0 || c.isFuture) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const parent = e.currentTarget.closest(".relative") as HTMLElement;
                  const parentRect = parent?.getBoundingClientRect() ?? { left: 0, top: 0 };
                  setHovered({
                    day: c.day,
                    iso: c.iso,
                    minutes: c.minutes,
                    x: rect.left - parentRect.left + rect.width / 2,
                    y: rect.top - parentRect.top,
                  });
                }}
                onMouseLeave={() => setHovered(null)}
              >
                {c.status === "hit" && (
                  <svg viewBox="0 0 16 16" className="h-3 w-3 fill-emerald-500 dark:fill-emerald-400">
                    <circle cx="8" cy="8" r="6" />
                  </svg>
                )}
                {c.status === "miss" && (
                  <svg viewBox="0 0 16 16" className="h-3 w-3 stroke-amber-500 dark:stroke-amber-400" fill="none">
                    <circle cx="8" cy="8" r="5.5" strokeWidth="1.5" />
                  </svg>
                )}
              </div>
            ))}
          </div>

          {hovered && tooltipData && (
            <div
              className="absolute z-50 pointer-events-none"
              style={{
                left: hovered.x,
                top: hovered.y - 6,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-lg">
                <div className="font-semibold text-foreground">{tooltipData.label}</div>
                {tooltipData.minutes > 0 ? (
                  <>
                    <div className="text-muted-foreground mt-0.5">{tooltipData.minutes} min</div>
                    {tooltipData.subject && (
                      <div className="mt-1.5 inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {tooltipData.subject}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground mt-0.5">Rest day</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            <span className="font-medium tabular-nums text-foreground">{stats.streak}</span>
            <span>{stats.streak === 1 ? "day" : "days"} streak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            <span className="font-medium tabular-nums text-foreground">{stats.hits}/{stats.elapsed}</span>
            <span>days hit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="font-medium tabular-nums text-foreground">{formatDuration(stats.bestMins)}</span>
            <span>best</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-3 text-[10px] text-muted-foreground/50">
          <div className="flex items-center gap-1">
            <div className="flex h-3 w-3 items-center justify-center rounded-[3px] bg-muted/20 dark:bg-muted/10" />
            <span>Rest</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex h-3 w-3 items-center justify-center rounded-[3px] bg-amber-100/60 dark:bg-amber-900/25">
              <svg viewBox="0 0 16 16" className="h-2 w-2 stroke-amber-500 dark:stroke-amber-400" fill="none">
                <circle cx="8" cy="8" r="5.5" strokeWidth="2" />
              </svg>
            </div>
            <span>Miss</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex h-3 w-3 items-center justify-center rounded-[3px] bg-emerald-100 dark:bg-emerald-900/40">
              <svg viewBox="0 0 16 16" className="h-2 w-2 fill-emerald-500 dark:fill-emerald-400">
                <circle cx="8" cy="8" r="6" />
              </svg>
            </div>
            <span>Hit</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}