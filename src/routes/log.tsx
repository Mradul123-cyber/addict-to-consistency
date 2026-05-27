import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useState } from "react";
import { addSession, deleteSession, useStore } from "@/lib/store";
import { isoDay } from "@/lib/analytics";
import { ChapterPicker } from "@/components/ChapterPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Manual Log — JEE Console" },
      { name: "description", content: "Record offline JEE study blocks with chapter, minutes, and focus rating so they count toward your consistency quotient." },
      { property: "og:title", content: "Log Offline JEE Study Blocks" },
      { property: "og:description", content: "Record offline JEE study blocks with chapter, minutes, and focus rating so they count toward your consistency quotient." },
      { property: "og:url", content: "https://addict-to-consistency.lovable.app/log" },
    ],
    links: [{ rel: "canonical", href: "https://addict-to-consistency.lovable.app/log" }],
  }),
  component: LogPage,
});

function LogPage() {
  const { sessions, tracks } = useStore();
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [date, setDate] = useState(isoDay(new Date()));
  const [minutes, setMinutes] = useState(60);
  const [rating, setRating] = useState<number>(3);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const SUBJECT_LABELS: Record<string, string> = {
    PHY: "Physics", PCM: "Physical Chemistry", ORG: "Organic Chemistry",
    ICM: "Inorganic Chemistry", MTH: "Mathematics",
  };
  const chapterName = (s: SessionLog) => {
    if (s.chapterId) {
      for (const t of tracks) {
        const c = t.chapters.find((x) => x.id === s.chapterId);
        if (c) return `${t.name} · ${c.name}`;
      }
    }
    if (s.subject) return SUBJECT_LABELS[s.subject] ?? s.subject;
    return "—";
  };

  const recent = [...sessions].sort((a, b) => b.createdAt - a.createdAt);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof recent>();
    for (const s of recent) {
      const g = map.get(s.dateISO) ?? [];
      g.push(s);
      map.set(s.dateISO, g);
    }
    const now = new Date();
    const today = isoDay(now);
    const yesterday = isoDay(new Date(now.getTime() - 86400000));
    const label = (d: string) => {
      if (d === today) return "Today";
      if (d === yesterday) return "Yesterday";
      const p = d.split("-");
      return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    };
    return [...map.entries()].map(([dateISO, sessions]) => ({
      dateISO,
      label: label(dateISO),
      totalMinutes: sessions.reduce((sum, s) => sum + s.minutes, 0),
      sessions,
    }));
  }, [recent]);

  const todayISO = isoDay(new Date());
  const isFuture = date > todayISO;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (minutes <= 0) return;
    if (date > todayISO) return;
    addSession({
      chapterId,
      dateISO: date,
      minutes,
      focusRating: rating as 1 | 2 | 3 | 4 | 5,
      source: "manual",
    });
    setMinutes(60);
  };

  return (
     <div className="flex flex-col md:flex-row gap-6 items-start overflow-hidden">
      <Card className="md:w-[45%]">
        <CardHeader>
          <CardTitle>Log an offline block</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Chapter (optional)</Label>
              <ChapterPicker value={chapterId} onChange={setChapterId} placeholder="No chapter" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m">Minutes</Label>
              <Input
                id="m"
                type="number"
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Focus rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={rating === n ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRating(n)}
                    className="w-12"
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
            {isFuture && (
              <p className="text-xs text-amber-500 font-medium">Can't log sessions for future dates.</p>
            )}
            <Button type="submit" className="w-full" disabled={isFuture}>
              Save block
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="flex flex-col min-h-0 md:w-[55%] w-full md:max-h-[500px]">
        <CardHeader className="shrink-0">
          <CardTitle>Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.dateISO}>
                  <div className="sticky top-0 z-10 -mx-2 mb-2 rounded-md bg-background/90 px-2 py-1.5 backdrop-blur-sm flex items-center justify-between text-xs font-semibold text-foreground/70">
                    <span>{g.label}</span>
                    <span className="tabular-nums text-muted-foreground">{g.totalMinutes}m</span>
                  </div>
                  <ul className="divide-y">
                    {g.sessions.map((s) => (
                      <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <div className="font-medium">{chapterName(s)}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.source}
                            {s.focusRating ? ` · ★${s.focusRating}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums text-muted-foreground">{s.minutes}m</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => setSessionToDelete(s.id)}
                            title="Delete session"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={sessionToDelete !== null}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete focus session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This session will be permanently removed from your history and quotient calculation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (sessionToDelete) {
                  deleteSession(sessionToDelete);
                  setSessionToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
