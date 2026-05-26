import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import {
  bestStreak,
  consistencyQuotient,
  currentStreak,
  dailyMinutes28,
  isoDay,
  todayMinutes,
  weeklyDigest,
  type WeeklyDigest,
} from "@/lib/analytics";
import { DEFAULT_DAILY_GOAL_MINUTES, daysUntilExam, formatExamDate } from "@/lib/profile";
import { useProfile } from "@/contexts/ProfileContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { HistoryChart } from "@/components/HistoryChart";
import {
  ChevronDown,
  ChevronUp,
  CalendarCheck,
  Star,
  BookOpen,
  Sparkles,
  Timer,
  Target,
} from "lucide-react";
import type { Track } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — JEE Console" },
      { name: "description", content: "Track your JEE countdown, daily consistency quotient, and a 28-day study history on a single dashboard." },
      { property: "og:title", content: "JEE Console Dashboard" },
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
  topSubject: string | null;
  dailyGoalMinutes: number;
  isOpen: boolean;
  onToggle: () => void;
}

function WeeklyDigestCard({
  digest,
  topSubject,
  dailyGoalMinutes,
  isOpen,
  onToggle,
}: WeeklyDigestCardProps) {
  const { totalMinutes, daysHit, daysMissed, avgRating, sessionCount } = digest;
  const { text, emoji } = digestHeadline(daysHit, totalMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hoursLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const now = new Date();
  const dayBars = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = isoDay(d);
      const dayMins = digest.weekSessions
        .filter((s) => s.dateISO === iso)
        .reduce((sum, s) => sum + s.minutes, 0);
      result.push({
        label: d.toLocaleDateString("en-IN", { weekday: "narrow" }),
        hit: dayMins >= dailyGoalMinutes,
        partial: dayMins > 0 && dayMins < dailyGoalMinutes,
        today: i === 0,
      });
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digest.weekSessions, dailyGoalMinutes]);

  if (!isOpen) return null;

  return (
    <Card className="relative overflow-hidden border bg-gradient-to-br from-card via-card to-muted/20 shadow-md transition-all duration-300 hover:shadow-lg hover:border-border/80 h-[200px] p-4 flex flex-col justify-between">
      {/* Absolute top-right toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 absolute top-2 right-2 text-muted-foreground hover:text-foreground z-10"
        onClick={onToggle}
        aria-label="Hide digest"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-[65%_35%] h-full gap-4">
        {/* Left Column (65% width) */}
        <div className="flex flex-col justify-between h-full min-w-0 pr-2">
          {/* Left Column Top: Header & Motivational Headline */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Weekly Digest
              </span>
            </div>
            <p className="text-lg font-bold text-foreground truncate leading-snug">
              {emoji} {text}
            </p>
          </div>

          {/* Left Column Middle: 7-day Progress Bar Row */}
          <div>
            <div className="flex items-end gap-1.5 w-full">
              {dayBars.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={[
                      "h-1.5 w-full rounded-full transition-all duration-200",
                      d.hit
                        ? "bg-foreground"
                        : d.partial
                        ? "bg-foreground/30 border border-foreground/10"
                        : "bg-transparent border border-border",
                      d.today ? "ring-1 ring-primary ring-offset-1 ring-offset-card" : "",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "text-[10px] tracking-tight font-medium leading-none",
                      d.today ? "text-primary font-bold" : "text-muted-foreground/75",
                    ].join(" ")}
                  >
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Left Column Bottom: 2x2 Stat Chips */}
          <div className="grid grid-cols-2 gap-2">
            {/* Focus Time */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-1.5 min-w-0">
              <div className="rounded-md bg-purple-500/10 p-1 text-purple-600 dark:text-purple-400 shrink-0">
                <Timer className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-bold tabular-nums text-foreground">{hoursLabel}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-medium truncate">Focus Time</div>
              </div>
            </div>

            {/* Goal Days */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-1.5 min-w-0">
              <div className="rounded-md bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Target className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-bold text-foreground">
                  {daysHit} Hits · {daysMissed} Miss
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-medium truncate">Goal Days</div>
              </div>
            </div>

            {/* Avg Rating */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-1.5 min-w-0">
              <div className="rounded-md bg-amber-500/10 p-1 text-amber-600 dark:text-amber-400 shrink-0">
                <Star className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-bold tabular-nums text-foreground">
                  {avgRating != null ? avgRating.toFixed(1) : "—"}
                  {avgRating != null && <span className="text-[10px] font-normal text-muted-foreground">/5</span>}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-medium truncate">Avg Rating</div>
              </div>
            </div>

            {/* Top Subject */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-1.5 min-w-0">
              <div className="rounded-md bg-rose-500/10 p-1 text-rose-600 dark:text-rose-400 shrink-0">
                <BookOpen className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-bold text-foreground">{topSubject ?? "—"}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-medium truncate">Top Subject</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (35% width) */}
        <div className="flex flex-col items-center justify-center border-l border-border/40 pl-4 h-full shrink-0">
          <div className="text-5xl font-black text-foreground tabular-nums leading-none">{daysHit}/7</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1.5 mb-2.5">
            Days Hit
          </div>
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                className="stroke-muted"
                strokeWidth="3.5"
                fill="transparent"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                className="stroke-primary transition-all duration-500 ease-in-out"
                strokeWidth="3.5"
                fill="transparent"
                strokeDasharray={226.19}
                strokeDashoffset={226.19 - (Math.min(7, Math.max(0, daysHit)) / 7) * 226.19}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const { sessions, tracks } = useStore();
  const { profile, targetDate } = useProfile();
  const days = targetDate ? daysUntilExam(targetDate) : 0;
  const examLabel = profile ? formatExamDate(profile.targetYear) : "";
  const dailyGoalMinutes = profile?.dailyGoalMinutes ?? DEFAULT_DAILY_GOAL_MINUTES;
  const cq = consistencyQuotient(sessions, new Date(), dailyGoalMinutes);
  const today = todayMinutes(sessions);
  const history = dailyMinutes28(sessions);
  const streak = currentStreak(sessions, new Date(), dailyGoalMinutes);
  const best = bestStreak(sessions, dailyGoalMinutes);

  // Weekly digest — auto-open on Mondays
  const isMonday = new Date().getDay() === 1;
  const [digestOpen, setDigestOpen] = useState(isMonday);
  const digest = useMemo(
    () => weeklyDigest(sessions, new Date(), dailyGoalMinutes),
    [sessions, dailyGoalMinutes],
  );
  const topSubject = useMemo(
    () => topSubjectFromWeek(digest.weekSessions, tracks),
    [digest.weekSessions, tracks],
  );

  // Subject-wise time breakdown (all-time)
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
    }
    breakdown[trackName] = (breakdown[trackName] ?? 0) + s.minutes;
  }

  if (breakdown["Uncategorized"] === 0) {
    delete breakdown["Uncategorized"];
  }

  const totalMinutes = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
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
            {!digestOpen && isMonday && (
              <span className="ml-0.5 flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
            )}
          </Button>
          <Button asChild>
            <Link to="/focus">Start focus session</Link>
          </Button>
        </div>
      </div>

      {/* Weekly Digest card */}
      {digestOpen && (
        <WeeklyDigestCard
          digest={digest}
          topSubject={topSubject}
          dailyGoalMinutes={dailyGoalMinutes}
          isOpen={digestOpen}
          onToggle={() => setDigestOpen((o) => !o)}
        />
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">JEE Countdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums">{days}</div>
            <div className="text-xs text-muted-foreground">days until {examLabel}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consistency Quotient</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums">{cq}%</div>
            <Progress value={cq} className="mt-2" />
            <div className="mt-1 text-xs text-muted-foreground">
              ≥{dailyGoalMinutes} min days, last 7
            </div>
            {sessions.length === 0 && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-500 font-medium">
                Complete your first {dailyGoalMinutes}-min day to start your streak →
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
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
        <Card>
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">28-day focus history</CardTitle>
          </CardHeader>
          <CardContent>
            <HistoryChart data={history} dailyGoalMinutes={dailyGoalMinutes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {Object.entries(breakdown).map(([subject, mins]) => {
                const percent = totalMinutes > 0 ? (mins / totalMinutes) * 100 : 0;
                return (
                  <div key={subject} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">{subject}</span>
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
      </div>
    </div>
  );
}
