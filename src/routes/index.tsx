import { useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import {
  bestStreak,
  consistencyQuotient,
  currentStreak,
  isoDay,
  minutesByDay,
  todayMinutes,
  weeklyDigest,
  type WeeklyDigest,
} from "@/lib/analytics";
import { DEFAULT_DAILY_GOAL_MINUTES, daysUntilExam, formatExamDate } from "@/lib/profile";
import { useProfile } from "@/contexts/ProfileContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StudyCalendar } from "@/components/StudyCalendar";
import { TaskPanel } from "@/components/TaskPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import type { Track } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Matrix" },
      { name: "description", content: "Track your JEE countdown, daily consistency quotient, and a 28-day study history on a single dashboard." },
      { property: "og:title", content: "Matrix Dashboard" },
      { property: "og:description", content: "Track your JEE countdown, daily consistency quotient, and a 28-day study history on a single dashboard." },
      { property: "og:url", content: "https://addict-to-consistency.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://addict-to-consistency.lovable.app/" }],
  }),
  component: Dashboard,
});

// ─── Weekly Digest helpers ────────────────────────────────────────────────────

function digestHeadline(daysHit: number, totalMinutes: number): { text: string; emoji: string } {
  if (totalMinutes === 0) return { text: "Start logging to see your digest", emoji: "📋" };
  if (daysHit === 7) return { text: "Perfect week — flawless execution", emoji: "🏆" };
  if (daysHit >= 5) return { text: "Strong week — keep the momentum", emoji: "🔥" };
  if (daysHit >= 3) return { text: "Decent week — push harder next time", emoji: "⚡" };
  if (daysHit >= 1) return { text: "Rough week — bounce back stronger", emoji: "💪" };
  return { text: "No goal days this week — time to commit", emoji: "🎯" };
}

function topSubjectFromWeek(weekSessions: WeeklyDigest["weekSessions"], tracks: Track[]): string | null {
  const subjectMinutes: Record<string, number> = {};
  for (const s of weekSessions) {
    let name = "Uncategorized";
    if (s.chapterId) {
      const t = tracks.find((t) => t.chapters.some((c) => c.id === s.chapterId));
      if (t) name = t.name;
    }
    subjectMinutes[name] = (subjectMinutes[name] ?? 0) + s.minutes;
  }
  const sorted = Object.entries(subjectMinutes).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

// ─── WeeklyDigestCard ─────────────────────────────────────────────────────────

interface WeeklyDigestCardProps {
  digest: WeeklyDigest;
  byDay: Record<string, number>;
  topSubject: string | null;
  dailyGoalMinutes: number;
  isOpen: boolean;
  onToggle: () => void;
}

function WeeklyDigestCard({
  digest,
  byDay,
  topSubject,
  dailyGoalMinutes,
  isOpen,
  onToggle,
}: WeeklyDigestCardProps) {
  const { totalMinutes, daysHit, daysMissed, avgRating } = digest;
  const { text, emoji } = digestHeadline(daysHit, totalMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hoursLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayStr = new Date().toDateString();
  const dayBars = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = isoDay(d);
      const dayMins = byDay[iso] ?? 0;
      const hit = dayMins >= dailyGoalMinutes;
      result.push({
        label: dayNames[i],
        hit,
        miss: !hit && i < todayIdx,
        left: !hit && i >= todayIdx,
        today: i === todayIdx,
      });
    }
    return result;
  }, [byDay, dailyGoalMinutes, todayStr]);

  const hitsCount = dayBars.filter((d) => d.hit).length;
  const missCount = dayBars.filter((d) => d.miss).length;
  const leftCount = dayBars.filter((d) => d.left).length;

  function plural(n: number, s: string) {
    return n === 1 ? `1 ${s}` : `${n} ${s}s`;
  }

  const goalLabel = `${plural(hitsCount, "Hit")} · ${plural(missCount, "Miss")} · ${plural(leftCount, "Left")}`;

  if (!isOpen) return null;

  return (
    <Card className="relative overflow-hidden border bg-gradient-to-br from-card via-card to-muted/20 shadow-md transition-all duration-300 hover:shadow-lg hover:border-border/80 p-6">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
        onClick={onToggle}
        aria-label="Hide digest"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      <div className="flex flex-col lg:flex-row gap-8 pr-8">
        <div className="flex-1 space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              Weekly Digest
            </span>
            <p className="text-xl font-bold text-foreground leading-snug">
              {emoji} {text}
            </p>
          </div>

          <div className="flex items-end gap-2 w-full max-w-md">
            {dayBars.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={[
                    "h-2 w-full rounded-full transition-all duration-200",
                    d.hit
                      ? "bg-foreground"
                      : d.miss
                      ? "bg-foreground/30 border border-foreground/10"
                      : "bg-transparent border border-border",
                    d.today ? "ring-1 ring-primary ring-offset-2 ring-offset-card" : "",
                  ].join(" ")}
                />
                <span
                  className={[
                    "text-xs font-medium leading-none",
                    d.today ? "text-primary font-bold" : "text-muted-foreground/75",
                  ].join(" ")}
                >
                  {d.label}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
              <img src="/icons/clock.png" alt="Focus Time" className="h-8 w-8 shrink-0" />
              <div className="min-w-0 leading-tight">
                <div className="text-base font-bold tabular-nums text-foreground">{hoursLabel}</div>
                <div className="text-xs text-muted-foreground">Focus Time</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
              <img src="/icons/goal.png" alt="Goal Days" className="h-8 w-8 shrink-0" />
              <div className="min-w-0 leading-tight">
                <div className="text-base font-bold text-foreground">{goalLabel}</div>
                <div className="text-xs text-muted-foreground">Goal Days</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
              <img src="/icons/star.png" alt="Avg Rating" className="h-8 w-8 shrink-0" />
              <div className="min-w-0 leading-tight">
                <div className="text-base font-bold tabular-nums text-foreground">
                  {avgRating != null ? avgRating.toFixed(1) : "—"}
                  {avgRating != null && <span className="text-xs font-normal text-muted-foreground">/5</span>}
                </div>
                <div className="text-xs text-muted-foreground">Avg Rating</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
              <img src="/icons/book.png" alt="Top Subject" className="h-8 w-8 shrink-0" />
              <div className="min-w-0 leading-tight">
                <div className="text-base font-bold text-foreground truncate">{topSubject ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Top Subject</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                className="stroke-muted"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                className="stroke-primary transition-all duration-500 ease-in-out"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={301.59}
                strokeDashoffset={301.59 - (Math.min(7, Math.max(0, hitsCount)) / 7) * 301.59}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-foreground tabular-nums leading-none">{hitsCount}/7</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">
                Days Hit
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [cqDialogOpen, setCqDialogOpen] = useState(false);
  const { sessions, tracks, calendarTasks } = useStore();
  const { profile, loading, targetDate } = useProfile();

  if (loading) return <DashboardSkeleton />;

  // Redirect general learning users away from dashboard
  if (profile?.mode === "professional") {
    navigate({ to: "/teach" });
    return null;
  }
  const days = targetDate ? daysUntilExam(targetDate) : 0;
  const examLabel = profile ? formatExamDate(profile.targetYear) : "";
  const dailyGoalMinutes = profile?.dailyGoalMinutes ?? DEFAULT_DAILY_GOAL_MINUTES;
  const cq = consistencyQuotient(sessions, new Date(), dailyGoalMinutes);
  const today = todayMinutes(sessions);
  const streak = currentStreak(sessions, new Date(), dailyGoalMinutes);
  const best = bestStreak(sessions, dailyGoalMinutes);

  const [digestOpen, setDigestOpen] = useState(false);
  const todayStr = new Date().toDateString();
  const digest = useMemo(
    () => weeklyDigest(sessions, new Date(), dailyGoalMinutes),
    [sessions, dailyGoalMinutes, todayStr],
  );
  const topSubject = useMemo(
    () => topSubjectFromWeek(digest.weekSessions, tracks),
    [digest.weekSessions, tracks],
  );

  // Subject-wise time breakdown (all-time)
  const SUBJECT_TO_TRACK: Record<string, string> = {
    PHY: "Physics", PCM: "Physical Chemistry", ORG: "Organic Chemistry",
    ICM: "Inorganic Chemistry", MTH: "Mathematics",
  };
  const breakdown: Record<string, number> = {};
  for (const t of tracks) {
    breakdown[t.name] = 0;
  }
  breakdown["Uncategorized"] = 0;

  for (const s of sessions) {
    let trackName = "Uncategorized";
    if (s.chapterId) {
      const foundTrack = tracks.find((t) =>
        t.chapters.some((c) => c.id === s.chapterId),
      );
      if (foundTrack) {
        trackName = foundTrack.name;
      }
    } else if (s.subject) {
      trackName = SUBJECT_TO_TRACK[s.subject] ?? "Uncategorized";
    }
    breakdown[trackName] = (breakdown[trackName] ?? 0) + s.minutes;
  }

  if (breakdown["Uncategorized"] === 0) {
    delete breakdown["Uncategorized"];
  }

  const totalMinutes = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Stay consistent. The exam doesn't move.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setDigestOpen((o) => !o)}
          >
            {digestOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {digestOpen ? "Hide digest" : "Weekly Digest"}
          </Button>
          <Button asChild className="transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg">
            <Link to="/focus" search={{ subject: "" }}>Start focus session</Link>
          </Button>
        </div>
      </div>

      {/* Weekly Digest card */}
      {digestOpen && (
        <WeeklyDigestCard
          digest={digest}
          byDay={minutesByDay(sessions)}
          topSubject={topSubject}
          dailyGoalMinutes={dailyGoalMinutes}
          isOpen={digestOpen}
          onToggle={() => setDigestOpen((o) => !o)}
        />
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:bg-amber-50 dark:hover:bg-[#FFA000]/35">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">JEE Countdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums">{days}</div>
            <div className="text-xs text-muted-foreground">days until {examLabel}</div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:bg-amber-50 dark:hover:bg-[#FFA000]/35">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums">
              {streak} {streak === 1 ? "day" : "days"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              consecutive ≥{dailyGoalMinutes} min days
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Best: {best} {best === 1 ? "day" : "days"}
            </div>
            {sessions.length === 0 && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-500 font-medium">
                Complete your first {dailyGoalMinutes}-min day to start your streak →
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:bg-amber-50 dark:hover:bg-[#FFA000]/35">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums">{today}</div>
            <Progress value={Math.min(100, (today / dailyGoalMinutes) * 100)} className="mt-2" />
            <div className="mt-1 text-xs text-muted-foreground">
              minutes logged today · goal {dailyGoalMinutes}m
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:bg-amber-50 dark:hover:bg-[#FFA000]/35">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Consistency Quotient
              <button
                type="button"
                onClick={() => setCqDialogOpen(true)}
                className="inline-flex items-center text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums">{cq != null ? `${cq}%` : "—"}</div>
            <Progress value={cq ?? 0} className="mt-2" />
            <div className="mt-1 text-xs text-muted-foreground">
              ≥{dailyGoalMinutes} min days, last 7
            </div>
            {cq == null && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-500 font-medium">
                Starts tracking after 3 days →
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <StudyCalendar sessions={sessions} tracks={tracks} dailyGoalMinutes={dailyGoalMinutes} />
        </div>

        <div className="space-y-6">
          <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Subject distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {Object.entries(breakdown).map(([subject, mins], idx) => {
                const isUncategorized = subject === "Uncategorized";
                const percent = totalMinutes > 0 ? (mins / totalMinutes) * 100 : 0;
                const subjectColorMap: Record<string, string> = {
                  physics: "hover:text-blue-500",
                  maths: "hover:text-yellow-500",
                  mathematics: "hover:text-yellow-500",
                  chemistry: "hover:text-green-500",
                  "physical chemistry": "hover:text-emerald-500",
                  "organic chemistry": "hover:text-orange-500",
                  "inorganic chemistry": "hover:text-red-500",
                };
                const fallbackColors = ["hover:text-violet-500", "hover:text-pink-500", "hover:text-cyan-500"];
                const hoverColor = subjectColorMap[subject.toLowerCase()] ?? fallbackColors[idx % fallbackColors.length];
                return (
                  <div key={subject} className="space-y-1">
                    <div
                      className={`flex justify-between text-xs ${isUncategorized ? "" : "cursor-pointer transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.01]"}`}
                      onClick={() => {
                        if (isUncategorized) return;
                        navigate({ to: "/focus", search: { subject } });
                      }}
                    >
                      <span className={`font-medium text-foreground transition-colors duration-200 ${!isUncategorized ? hoverColor : ""}`}>{subject}</span>
                      <span className="text-muted-foreground tabular-nums">{mins}m</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {totalMinutes === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No focus time logged yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <TaskPanel />
        </div>
      </div>
    </div>

      {/* CQ Info Dialog */}

      <Dialog open={cqDialogOpen} onOpenChange={setCqDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Consistency Quotient (CQ)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              CQ measures what percentage of the last <span className="font-semibold text-foreground">7 days</span> you hit your daily study goal of <span className="font-semibold text-foreground">{dailyGoalMinutes} minutes</span> of focused study.
            </p>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide">How it's calculated</p>
              <p>CQ = (Days you hit your goal in last 7 days ÷ 7) × 100</p>
              <p className="text-xs">Example: Hit goal 5 out of 7 days → CQ = <span className="font-semibold text-foreground">71%</span></p>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Score guide</p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <span className="text-green-600 dark:text-green-400 font-medium">100% — Perfect week</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">71–99% — Strong</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">43–70% — Building</span>
                <span className="text-red-600 dark:text-red-400 font-medium">0–42% — Needs work</span>
              </div>
            </div>
            <p className="text-xs">CQ starts tracking after your first 3 days of logged study.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
