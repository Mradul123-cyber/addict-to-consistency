import { DEFAULT_DAILY_GOAL_MINUTES } from "@/lib/profile";

export function HistoryChart({
  data,
  dailyGoalMinutes = DEFAULT_DAILY_GOAL_MINUTES,
}: {
  data: { date: string; minutes: number }[];
  dailyGoalMinutes?: number;
}) {
  const max = Math.max(dailyGoalMinutes, ...data.map((d) => d.minutes));
  return (
    <div>
      <div className="flex h-32 items-end gap-1">
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const h = max === 0 ? 0 : (d.minutes / max) * 100;
          const hit = d.minutes >= dailyGoalMinutes;
          return (
            <div
              key={d.date}
              className="group relative flex-1"
              title={`${d.date}: ${d.minutes} min`}
            >
              <div
                className={`w-full rounded-sm transition-all ${
                  hit ? "bg-primary" : "bg-muted-foreground/40"
                } ${isToday ? `ring-2 ${hit ? "ring-primary" : "ring-muted"}` : ""}`}
                style={{ height: `${h}%`, minHeight: d.minutes > 0 ? 2 : 1 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>28 days ago</span>
        <span>Goal {dailyGoalMinutes}m</span>
        <span className="text-foreground">Today</span>
      </div>
    </div>
  );
}
