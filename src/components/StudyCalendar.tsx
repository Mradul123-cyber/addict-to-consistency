import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Flame, Target, Plus, Trash2 } from "lucide-react";
import { isoDay, minutesByDay } from "@/lib/analytics";
import type { SessionLog, Track } from "@/lib/store";
import { addSession, deleteSession } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUBJECT_COLORS: Record<string, string> = {
  PHY: "#3b82f6",
  PCM: "#22c55e",
  ORG: "#f97316",
  ICM: "#8b5cf6",
  MTH: "#ef4444",
};
const SUBJECT_ORDER = ["PHY", "PCM", "ORG", "ICM", "MTH"] as const;
const SUBJECT_LABELS: Record<string, string> = {
  PHY: "Physics",
  PCM: "Physical Chemistry",
  ORG: "Organic Chemistry",
  ICM: "Inorganic Chemistry",
  MTH: "Mathematics",
};
const TRACK_TO_SUBJECT: Record<string, string> = {
  Physics: "PHY",
  "Physical Chemistry": "PCM",
  "Organic Chemistry": "ORG",
  "Inorganic Chemistry": "ICM",
  Mathematics: "MTH",
};

const TASK_COLORS = ["#3b82f6", "#ec4899", "#f97316", "#14b8a6", "#8b5cf6", "#eab308", "#ef4444", "#06b6d4"];

function taskColorIndex(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  }
  return ((h >>> 0) ^ (h >>> 13)) % TASK_COLORS.length;
}

function taskColor(text: string): string {
  return TASK_COLORS[taskColorIndex(text)];
}

function getSubject(s: SessionLog, tracks: Track[]): string {
  if (s.subject) return s.subject;
  if (s.chapterId) {
    for (const t of tracks) {
      if (t.chapters.some((c) => c.id === s.chapterId)) return TRACK_TO_SUBJECT[t.name] ?? "OTHER";
    }
  }
  return "OTHER";
}

function dayLabel(dateStr: string): string {
  const p = dateStr.split("-");
  return new Date(+p[0], +p[1] - 1, +p[2])
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
}

export function StudyCalendar({
  sessions,
  tracks,
  dailyGoalMinutes,
}: {
  sessions: SessionLog[];
  tracks: Track[];
  dailyGoalMinutes: number;
}) {
  const now = new Date();
  const todayISO = isoDay(now);
  const [viewDate, setViewDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logSubject, setLogSubject] = useState("PHY");
  const [logTopic, setLogTopic] = useState("");
  const [logMinutes, setLogMinutes] = useState(60);
  const [logRating, setLogRating] = useState(3);
  const [tasks, setTasks] = useState<Record<string, { text: string; done: boolean }[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem("calendar-tasks") ?? "{}");
    } catch { return {}; }
  });

  // Stay in sync when TaskPanel (or any other source) updates calendar tasks
  useEffect(() => {
    const handler = () => {
      try { setTasks(JSON.parse(localStorage.getItem("calendar-tasks") ?? "{}")); } catch { /* ignore */ }
    };
    window.addEventListener("tasks-updated", handler);
    return () => window.removeEventListener("tasks-updated", handler);
  }, []);

  // Deselect date when clicking outside the calendar
  const calendarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedDateISO) return;
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setSelectedDateISO(null);
        setTaskInput("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selectedDateISO]);
  const [taskInput, setTaskInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const byDay = useMemo(() => minutesByDay(sessions), [sessions]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, SessionLog[]> = {};
    for (const s of sessions) {
      if (!map[s.dateISO]) map[s.dateISO] = [];
      map[s.dateISO].push(s);
    }
    return map;
  }, [sessions]);

  const grid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDay = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const rows = Math.ceil((startDay + daysInMonth) / 7);
    const start = new Date(first);
    start.setDate(first.getDate() - startDay);
    return Array.from({ length: rows * 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewYear, viewMonth]);

  const cells = useMemo(() => {
    const todayStr = isoDay(new Date());
    return grid.map((d) => {
      const iso = isoDay(d);
      const inMonth = d.getMonth() === viewMonth;
      const daySessions = sessionsByDate[iso] ?? [];
      const subjectMinutes: Record<string, number> = {};
      let total = 0;
      for (const s of daySessions) {
        const subj = getSubject(s, tracks);
        subjectMinutes[subj] = (subjectMinutes[subj] ?? 0) + s.minutes;
        total += s.minutes;
      }
      return {
        day: d.getDate(),
        iso,
        inMonth,
        isToday: iso === todayStr,
        subjectMinutes,
        totalMinutes: total,
        dayTasks: tasks[iso] ?? [],
        date: d,
      };
    });
  }, [grid, viewMonth, sessionsByDate, tracks, tasks]);

  const goPrev = useCallback(() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)), []);
  const goNext = useCallback(() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)), []);
  const goToday = useCallback(() => {
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }, [now]);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const selectedSessions = selectedDateISO ? (sessionsByDate[selectedDateISO] ?? []) : [];
  const selectedTotalMinutes = selectedSessions.reduce((sum, s) => sum + s.minutes, 0);

  const handleSaveSession = useCallback(() => {
    if (!selectedDateISO || selectedDateISO > todayISO) return;
    setLogDialogOpen(false);
    setLogTopic("");
    setLogMinutes(60);
    setLogRating(3);
    addSession({
      chapterId: null,
      dateISO: selectedDateISO,
      minutes: logMinutes,
      focusRating: logRating as 1 | 2 | 3 | 4 | 5,
      source: "calendar",
      subject: logSubject,
    });
  }, [selectedDateISO, logMinutes, logSubject, logRating, todayISO]);

  const stats = useMemo(() => {
    const byDayM = minutesByDay(sessions);
    let streak = 0;
    for (let d = 1; d <= new Date(viewYear, viewMonth + 1, 0).getDate(); d++) {
      const date = new Date(viewYear, viewMonth, d);
      if (date > now) break;
      const key = isoDay(date);
      if ((byDayM[key] ?? 0) >= dailyGoalMinutes) streak++;
      else streak = 0;
    }
    let hits = 0, elapsed = 0;
    for (let d = 1; d <= new Date(viewYear, viewMonth + 1, 0).getDate(); d++) {
      const date = new Date(viewYear, viewMonth, d);
      if (date > now) break;
      elapsed++;
      if ((byDayM[isoDay(date)] ?? 0) >= dailyGoalMinutes) hits++;
    }
    return { streak, hits, elapsed };
  }, [viewYear, viewMonth, sessions, dailyGoalMinutes, now]);

  const selDate = selectedDateISO ? new Date(selectedDateISO + "T00:00:00") : new Date();
  const isFuture = selectedDateISO != null && selectedDateISO > todayISO;
  const isTodaySelected = selectedDateISO === todayISO;

  const saveTasks = useCallback((t: Record<string, { text: string; done: boolean }[]>) => {
    setTasks(t);
    localStorage.setItem("calendar-tasks", JSON.stringify(t));
    window.dispatchEvent(new CustomEvent("tasks-updated"));
  }, []);

  const dayTasks = selectedDateISO ? tasks[selectedDateISO] ?? [] : [];

  return (
    <>
    <div className="space-y-4" ref={calendarRef}>
      <div className="rounded-2xl ring-1 ring-border bg-card overflow-hidden shadow-sm">
        {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">
              {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
            <div className="flex gap-px rounded-md overflow-hidden ring-1 ring-border">
              <button onClick={goPrev} className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" aria-label="Previous month">‹</button>
              <button onClick={goNext} className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" aria-label="Next month">›</button>
            </div>
            {!isCurrentMonth && (
              <button onClick={goToday} className="text-xs font-semibold px-2.5 py-1 bg-muted/60 rounded-md hover:bg-muted transition-colors">
                Today
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {SUBJECT_ORDER.map((code) => (
              <div key={code} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SUBJECT_COLORS[code] }} />
                <span className="text-[11px] font-semibold text-muted-foreground tracking-tight">{code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/20">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((c, i) => {
            const subjectsHit = Object.entries(c.subjectMinutes).sort((a, b) => b[1] - a[1]);
            const maxMinutes = Math.max(...subjectsHit.map(([, m]) => m), 1);
            const isSelected = c.iso === selectedDateISO;
            const intensity = Math.min(c.totalMinutes / 240, 1);

            const showInlineInput = isSelected && c.inMonth && (c.isToday || c.date > now);
            const CellTag = showInlineInput ? "div" : "button";
            return (
              <CellTag
                key={i}
                {...(!showInlineInput ? { onClick: () => setSelectedDateISO(c.iso === selectedDateISO ? null : c.iso) } : { onClick: undefined })}
                className={[
                   showInlineInput ? "p-1.5 border-b border-r border-border text-left text-xs z-10 relative" : "aspect-square p-1.5 border-b border-r border-border text-left text-xs transition-all duration-300 ease-out relative",
                   c.inMonth && !showInlineInput
                     ? "hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:z-10 hover:!bg-amber-50 dark:hover:!bg-[#FFA000]/35"
                     : "text-muted-foreground/25",
                   isSelected ? "ring-2 ring-inset ring-foreground bg-muted/40" : "",
                 ].join(" ")}
                style={
                  c.inMonth && !isSelected
                    ? c.isToday
                      ? { backgroundColor: `color-mix(in oklab, #3b82f6 9%, transparent)` }
                      : c.date < now && c.totalMinutes > 0
                        ? { backgroundColor: `color-mix(in oklab, #3b82f6 ${Math.round(Math.min(c.totalMinutes / 240, 1) * 8)}%, transparent)` }
                        : intensity > 0
                          ? { backgroundColor: `color-mix(in oklab, hsl(var(--foreground)) ${Math.round(intensity * 6)}%, transparent)` }
                          : undefined
                    : undefined
                }
              >
                <div className="flex items-start justify-between">
                  <span className={`font-semibold leading-none ${c.isToday ? "text-foreground" : c.inMonth ? "text-foreground/70" : ""}`}>
                    {c.day}
                  </span>
                </div>
                {c.inMonth && c.totalMinutes > 0 && (
                  <div className="mt-1 flex flex-col gap-[3px]">
                    {subjectsHit.map(([subj, mins]) => (
                      <div
                        key={subj}
                        className="h-[4px] rounded-full"
                        style={{
                          backgroundColor: SUBJECT_COLORS[subj] ?? "#9ca3af",
                          width: `${(mins / Math.max(...subjectsHit.map(([, m]) => m), 1)) * 100}%`,
                        }}
                      />
                    ))}
                    <p className="font-mono text-[9px] text-muted-foreground pt-px leading-none">{c.totalMinutes}m</p>
                  </div>
                )}
                {c.inMonth && c.totalMinutes === 0 && c.dayTasks.length > 0 && (
                  <div className="mt-1 flex flex-col gap-px">
                    {c.dayTasks.map((t, ti) => {
                      const dotColor = TASK_COLORS[(taskColorIndex(t.text) + ti * 7) % TASK_COLORS.length];
                      return (
                        <div key={ti} className="flex items-center gap-1 min-w-0">
                          <span className="h-[6px] w-[6px] rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                          <span className={`truncate text-[9px] leading-tight ${t.done ? "line-through text-muted-foreground/40" : "text-foreground/70 font-medium"}`}>
                            {t.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline task input — only on selected today/future cell */}
                {showInlineInput && (
                  <div className="mt-1.5 flex gap-1">
                    <input
                      autoFocus
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      placeholder="Add task..."
                      className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-1 text-[10px] text-foreground outline-none focus:border-foreground/40"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && taskInput.trim()) {
                          const next = { ...tasks };
                          next[c.iso] = [...(next[c.iso] ?? []), { text: taskInput.trim(), done: false }];
                          saveTasks(next);
                          setTaskInput("");
                        }
                        if (e.key === "Escape") setSelectedDateISO(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </CellTag>
            );
          })}
        </div>

        {/* ─── Detail Panel ───────────────────────────────────────── */}
        {selectedDateISO && (
          <div className="border-t border-border bg-muted/20 px-5 py-4">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {isFuture ? "Plan" : isTodaySelected ? "Today" : "Sessions"} ·{" "}
                  {selDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </h4>
                {!isFuture && (
                  <p className="font-mono text-xs text-foreground mt-0.5 tabular-nums">
                    {selectedTotalMinutes}m total · {selectedSessions.length} session{selectedSessions.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              {!isFuture && (
                <button
                  onClick={() => setLogDialogOpen(true)}
                  className="text-xs font-semibold px-3 py-1.5 bg-foreground text-background rounded-md hover:opacity-90 transition-opacity flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Log session
                </button>
              )}
            </div>

            {/* Session list for non-future dates */}
            {!isFuture && (selectedSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No sessions logged</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {selectedSessions.map((s) => {
                  const subj = getSubject(s, tracks);
                  const color = SUBJECT_COLORS[subj] ?? "#9ca3af";
                  const track = s.chapterId ? tracks.find((t) => t.chapters.some((c) => c.id === s.chapterId)) : null;
                  const chapter = s.chapterId && track ? track.chapters.find((c) => c.id === s.chapterId) : null;
                  return (
                    <div key={s.id} className="bg-card rounded-xl ring-1 ring-border p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{SUBJECT_LABELS[s.subject] ?? track?.name ?? "Study"}</p>
                          {chapter && <p className="text-xs text-muted-foreground truncate">{chapter.name}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground">{s.minutes}m</span>
                        <button
                          onClick={() => setDeleteConfirm(s.id)}
                          className="text-muted-foreground/40 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

          </div>
        )}
      </div>

      {/* ─── Stats ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-2xl ring-1 ring-border bg-card px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Flame className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{stats.streak} day streak</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{stats.hits}/{stats.elapsed} days hit this month</span>
        </div>
      </div>
    </div>

  {logDialogOpen && (
    <div
      className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setLogDialogOpen(false)}
    >
      <div
        className="bg-card ring-1 ring-border/60 rounded-2xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Log session ·{" "}
            {selDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h3 className="text-lg font-bold tracking-tight text-foreground">Add a study block</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Subject</label>
            <div className="grid grid-cols-5 gap-1.5">
              {SUBJECT_ORDER.map((code) => (
                <button
                  key={code}
                  onClick={() => setLogSubject(code)}
                  className={`py-2 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${
                    logSubject === code ? "text-white" : "text-muted-foreground bg-muted/40 hover:bg-muted"
                  }`}
                  style={logSubject === code ? { backgroundColor: SUBJECT_COLORS[code] } : undefined}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Topic</label>
            <input
              value={logTopic}
              onChange={(e) => setLogTopic(e.target.value)}
              placeholder="e.g. Definite Integrals"
              className="w-full bg-muted/40 ring-1 ring-border/60 rounded-md px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/30 transition-all placeholder:text-muted-foreground/40"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Duration</label>
              <span className="font-mono text-sm font-semibold text-foreground tabular-nums">{logMinutes}m</span>
            </div>
            <input
              type="range"
              min={15}
              max={300}
              step={15}
              value={logMinutes}
              onChange={(e) => setLogMinutes(Number(e.target.value))}
              className="w-full accent-foreground"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>15m</span>
              <span>300m</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Focus Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
                    logRating === n
                      ? "bg-foreground text-background"
                      : "text-muted-foreground bg-muted/40 hover:bg-muted"
                  }`}
                  onClick={() => setLogRating(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setLogDialogOpen(false)}
            className="flex-1 py-2.5 rounded-md text-sm font-semibold bg-muted/40 hover:bg-muted transition-colors text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() => logTopic.trim() && handleSaveSession()}
            disabled={!logTopic.trim()}
            className="flex-1 py-2.5 rounded-md text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            Save session
          </button>
        </div>
      </div>
    </div>
  )}

  {deleteConfirm && (
    <div
      className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setDeleteConfirm(null)}
    >
      <div
        className="bg-card ring-1 ring-border/60 rounded-2xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-foreground font-semibold mb-4">Delete this session?</p>
        <div className="flex gap-2">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="flex-1 py-2.5 rounded-md text-sm font-semibold bg-muted/40 hover:bg-muted transition-colors text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (deleteConfirm) deleteSession(deleteConfirm);
              setDeleteConfirm(null);
            }}
            className="flex-1 py-2.5 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )}
    </>
  );
}