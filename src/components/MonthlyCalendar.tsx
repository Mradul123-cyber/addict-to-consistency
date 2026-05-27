import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Flame, Target } from "lucide-react";
import { isoDay, minutesByDay } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SessionLog, Track, CalendarTask } from "@/lib/store";
import { addCalendarTask, toggleCalendarTask, deleteCalendarTask } from "@/lib/store";

const SUBJECTS = ["Physics", "PChem", "OChem", "IChem", "Math", "General"] as const;
const SUBJECT_COLORS: Record<string, string> = {
  Physics: "bg-blue-500",
  PChem: "bg-purple-500",
  OChem: "bg-orange-500",
  IChem: "bg-teal-500",
  Math: "bg-green-500",
  General: "bg-gray-400",
};
const SUBJECT_DOT_COLORS: Record<string, string> = {
  Physics: "#3b82f6",
  PChem: "#a855f7",
  OChem: "#f97316",
  IChem: "#14b8a6",
  Math: "#22c55e",
  General: "#9ca3af",
};

function monthName(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function startDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function MonthlyCalendar({
  sessions,
  tracks,
  dailyGoalMinutes,
  calendarTasks: tasks,
}: {
  sessions: SessionLog[];
  tracks: Track[];
  dailyGoalMinutes: number;
  calendarTasks: CalendarTask[];
}) {
  const now = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const byDay = useMemo(() => minutesByDay(sessions), [sessions]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    for (const t of tasks) {
      if (!map[t.dateISO]) map[t.dateISO] = [];
      map[t.dateISO].push(t);
    }
    return map;
  }, [tasks]);

  // ─── Popover state ──────────────────────────────────────────────────────────
  const [popover, setPopover] = useState<{
    dateISO: string;
    x: number;
    y: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [selectedSubject, setSelectedSubject] = useState("General");
  const [taskText, setTaskText] = useState("");

  useEffect(() => {
    if (popover) {
      inputRef.current?.focus();
      setTaskText("");
      setSelectedSubject("General");
    }
  }, [popover]);

  useEffect(() => {
    if (!popover) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopover(null);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [popover]);

  const handlePopoverSubmit = useCallback(() => {
    if (!popover || !taskText.trim()) return;
    addCalendarTask(popover.dateISO, taskText.trim(), selectedSubject);
    setPopover(null);
  }, [popover, taskText, selectedSubject]);

  const handlePopoverKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handlePopoverSubmit();
      }
    },
    [handlePopoverSubmit],
  );

  // ─── Context menu state ─────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{
    taskId: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  // ─── Cells ──────────────────────────────────────────────────────────────────
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
      canAddTask: boolean;
      intensity: number;
    }> = [];

    for (let i = 0; i < startDay; i++) {
      result.push({ day: 0, iso: "", minutes: 0, isFuture: false, isToday: false, canAddTask: false, intensity: 0 });
    }

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const iso = isoDay(date);
      const mins = byDay[iso] ?? 0;
      const isFuture = date > today;
      const isTd = date.toDateString() === today.toDateString();
      const canAddTask = isCurrentMonth && (isTd || isFuture);
      const intensity = Math.min(1, mins / dailyGoalMinutes);

      result.push({ day: d, iso, minutes: mins, isFuture, isToday: isTd, canAddTask, intensity });
    }

    return result;
  }, [viewYear, viewMonth, byDay, dailyGoalMinutes, isCurrentMonth]);

  const goPrev = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byDayM = minutesByDay(sessions);
    let streak = 0;
    const today = new Date();
    for (let d = 1; d <= daysInMonth(viewYear, viewMonth); d++) {
      const date = new Date(viewYear, viewMonth, d);
      if (date > today) break;
      const key = isoDay(date);
      if ((byDayM[key] ?? 0) >= dailyGoalMinutes) {
        streak++;
      } else {
        streak = 0;
      }
    }
    let hits = 0;
    let elapsed = 0;
    const totalDays = daysInMonth(viewYear, viewMonth);
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(viewYear, viewMonth, d);
      if (date > today) break;
      elapsed++;
      const key = isoDay(date);
      if ((byDayM[key] ?? 0) >= dailyGoalMinutes) hits++;
    }
    return { streak, hits, elapsed };
  }, [viewYear, viewMonth, sessions, dailyGoalMinutes]);

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  // ─── Render helper for task pills ───────────────────────────────────────────
  const renderTaskPills = (iso: string) => {
    const dateTasks = tasksByDate[iso];
    if (!dateTasks || dateTasks.length === 0) return null;

    const visible = dateTasks.slice(0, 3);
    const remaining = dateTasks.length - 3;

    return (
      <div className="mt-0.5 space-y-[2px]">
        {visible.map((t) => (
          <div
            key={t.id}
            className={[
              "flex items-center gap-[3px] cursor-pointer rounded-sm px-1 py-[1px] hover:bg-muted/30 transition-colors",
              t.done ? "opacity-50" : "",
            ].join(" ")}
            onClick={(e) => {
              e.stopPropagation();
              toggleCalendarTask(t.id, !t.done);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ taskId: t.id, x: e.clientX, y: e.clientY });
            }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: SUBJECT_DOT_COLORS[t.subject] ?? "#9ca3af" }}
            />
            <span
              className={[
                "truncate text-[10px] leading-none text-foreground/80",
                t.done ? "line-through" : "",
              ].join(" ")}
            >
              {t.text}
            </span>
          </div>
        ))}
        {remaining > 0 && (
          <div className="px-1 text-[9px] font-medium text-muted-foreground/60">
            +{remaining} more
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border shadow-sm relative">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-tight">{monthName(viewDate)}</CardTitle>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="relative">
          <div className="grid grid-cols-7 gap-[3px]">
            {dayLabels.map((l) => (
              <div
                key={l}
                className="h-4 flex items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40"
              >
                {l}
              </div>
            ))}
            {cells.map((c, i) => {
              if (c.day === 0) {
                return <div key={i} />;
              }
              const dateTasks = tasksByDate[c.iso];
              const hasTasks = dateTasks && dateTasks.length > 0;
              const showStrip = !c.isFuture && c.minutes > 0;

              return (
                <div
                  key={i}
                  className={[
                    "relative min-h-[72px] rounded-xl border p-1.5 flex flex-col transition-colors",
                    c.isToday
                      ? "bg-primary/10 ring-1 ring-primary border-primary/20"
                      : "bg-card border-border/50",
                    c.canAddTask ? "cursor-pointer hover:border-primary/40" : "",
                  ].join(" ")}
                  onClick={(e) => {
                    if (!c.canAddTask) return;
                    setPopover({ dateISO: c.iso, x: e.clientX, y: e.clientY });
                  }}
                  data-cell-iso={c.iso}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-foreground/70">{c.day}</span>
                    {hasTasks && (
                      <span className="text-[9px] text-muted-foreground/50">{dateTasks!.length}</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    {renderTaskPills(c.iso)}
                  </div>
                  {showStrip && (
                    <div
                      className="absolute bottom-0 left-1 right-1 h-[3px] rounded-full"
                      style={{
                        backgroundColor: `color-mix(in oklch, var(--color-primary) ${Math.max(15, Math.round(c.intensity * 100))}%, transparent)`,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Popover */}
          {popover && (
            <div
              ref={popoverRef}
              className="fixed z-50 w-64 rounded-xl border bg-card p-3 shadow-xl"
              style={{ top: popover.y + 8, left: popover.x }}
            >
              <input
                ref={inputRef}
                type="text"
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                onKeyDown={handlePopoverKeyDown}
                placeholder="e.g. Physics 2h, Revise Thermo"
                className="w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
              <div className="mt-2 flex items-center gap-1.5">
                {SUBJECTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    title={s}
                    className={[
                      "h-4 w-4 rounded-full transition-all",
                      SUBJECT_COLORS[s],
                      selectedSubject === s ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "ring-1 ring-border",
                    ].join(" ")}
                    onClick={() => setSelectedSubject(s)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Context menu */}
          {contextMenu && (
            <div
              className="fixed z-50"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={() => {
                deleteCalendarTask(contextMenu.taskId);
                setContextMenu(null);
              }}
            >
              <div className="rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-destructive cursor-pointer hover:bg-destructive/10 shadow-lg">
                Remove
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            <span className="font-medium tabular-nums text-foreground">{stats.streak}</span>
            <span className="hidden sm:inline">{stats.streak === 1 ? "day streak" : "days streak"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            <span className="font-medium tabular-nums text-foreground">{stats.hits}/{stats.elapsed}</span>
            <span className="hidden sm:inline">days hit this month</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}