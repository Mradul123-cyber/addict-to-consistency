import { useState, useCallback, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { isoDay } from "@/lib/analytics";

interface TaskItem {
  text: string;
  done: boolean;
}

export function TaskPanel() {
  const todayISO = isoDay(new Date());
  const [tasks, setTasks] = useState<Record<string, TaskItem[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem("calendar-tasks") ?? "{}");
    } catch { return {}; }
  });

  useEffect(() => {
    const handler = () => {
      try {
        setTasks(JSON.parse(localStorage.getItem("calendar-tasks") ?? "{}"));
      } catch {}
    };
    window.addEventListener("tasks-updated", handler);
    return () => window.removeEventListener("tasks-updated", handler);
  }, []);

  const save = useCallback((t: Record<string, TaskItem[]>) => {
    setTasks(t);
    localStorage.setItem("calendar-tasks", JSON.stringify(t));
    window.dispatchEvent(new CustomEvent("tasks-updated"));
  }, []);

  return (
    <div className="rounded-2xl ring-1 ring-border bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Scheduled Tasks</h3>
      </div>
      <div className="p-4 max-h-[420px] overflow-y-auto scrollbar-thin">
        {Object.entries(tasks).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No tasks. Add one from the calendar.</p>
        ) : (
          <div className="space-y-5">
            {Object.entries(tasks)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dateISO, ts]) => {
                const d = new Date(dateISO + "T00:00:00");
                const label = dateISO === todayISO
                  ? "Today"
                  : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                const pending = ts.filter((x) => !x.done).length;
                return (
                  <div key={dateISO}>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                      <span className="text-[10px] font-mono text-muted-foreground/60">{pending}/{ts.length} pending</span>
                    </div>
                    <div className="space-y-2">
                      {ts.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 bg-muted/20 ring-1 ring-border/60 rounded-lg px-3 py-2.5 cursor-pointer select-none"
                          onClick={() => {
                            const next = { ...tasks };
                            next[dateISO] = next[dateISO].map((x, idx) =>
                              idx === i ? { ...x, done: !x.done } : x
                            );
                            save(next);
                          }}
                        >
                          <span className="shrink-0 text-3xl font-black leading-none text-foreground">→</span>
                          <span className={`flex-1 text-sm ${t.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                            {t.text}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = { ...tasks };
                              next[dateISO] = next[dateISO].filter((_, idx) => idx !== i);
                              if (next[dateISO].length === 0) delete next[dateISO];
                              save(next);
                            }}
                            className="shrink-0 text-muted-foreground/40 hover:text-foreground transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
