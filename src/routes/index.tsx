import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import {
  consistencyQuotient,
  currentStreak,
  dailyMinutes28,
  daysUntilJEE,
  todayMinutes,
} from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { HistoryChart } from "@/components/HistoryChart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — JEE Workstation" },
      { name: "description", content: "Track your JEE countdown, daily consistency quotient, and a 28-day study history on a single dashboard." },
      { property: "og:title", content: "JEE Workstation Dashboard" },
      { property: "og:description", content: "Track your JEE countdown, daily consistency quotient, and a 28-day study history on a single dashboard." },
      { property: "og:url", content: "https://addict-to-consistency.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://addict-to-consistency.lovable.app/" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { sessions, tracks } = useStore();
  const days = daysUntilJEE();
  const cq = consistencyQuotient(sessions);
  const today = todayMinutes(sessions);
  const history = dailyMinutes28(sessions);
  const streak = currentStreak(sessions);

  // Subject-wise time breakdown
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
        <Button asChild>
          <Link to="/focus">Start focus session</Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">JEE Countdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums">{days}</div>
            <div className="text-xs text-muted-foreground">days until 20 Jan 2027</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consistency Quotient</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums">{cq}%</div>
            <Progress value={cq} className="mt-2" />
            <div className="mt-1 text-xs text-muted-foreground">≥150 min days, last 7</div>
            {sessions.length === 0 && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-500 font-medium">
                Complete your first 150-min day to start your streak →
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
            <Progress value={Math.min(100, (today / 150) * 100)} className="mt-2" />
            <div className="mt-1 text-xs text-muted-foreground">minutes logged today</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums">{streak} {streak === 1 ? "day" : "days"}</div>
            <div className="mt-1 text-xs text-muted-foreground">consecutive ≥150 min days</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">28-day focus history</CardTitle>
          </CardHeader>
          <CardContent>
            <HistoryChart data={history} />
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
