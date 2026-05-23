import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import {
  consistencyQuotient,
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
      { name: "description", content: "Countdown, consistency quotient, and 28-day study history." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { sessions } = useStore();
  const days = daysUntilJEE();
  const cq = consistencyQuotient(sessions);
  const today = todayMinutes(sessions);
  const history = dailyMinutes28(sessions);

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

      <div className="grid gap-4 md:grid-cols-3">
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tabular-nums">{today}</div>
            <div className="text-xs text-muted-foreground">minutes logged today</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">28-day focus history</CardTitle>
        </CardHeader>
        <CardContent>
          <HistoryChart data={history} />
        </CardContent>
      </Card>
    </div>
  );
}
