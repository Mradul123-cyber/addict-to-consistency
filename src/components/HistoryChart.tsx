import { DAILY_THRESHOLD_MIN } from "@/lib/analytics";

export function HistoryChart({ data }: { data: { date: string; minutes: number }[] }) {
  const max = Math.max(DAILY_THRESHOLD_MIN, ...data.map((d) => d.minutes));
  return (
    <div>
      <div className="flex h-32 items-end gap-1">
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const h = max === 0 ? 0 : (d.minutes / max) * 100;
          const hit = d.minutes >= DAILY_THRESHOLD_MIN;
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
        <span>Threshold {DAILY_THRESHOLD_MIN}m</span>
        <span className="text-foreground">Today</span>
      </div>
    </div>
  );
}
