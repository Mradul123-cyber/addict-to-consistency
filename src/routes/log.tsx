import { createFileRoute } from "@tanstack/react-router";
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
      { title: "Manual Log — JEE Workstation" },
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

  const chapterName = (id: string | null) => {
    if (!id) return "—";
    for (const t of tracks) {
      const c = t.chapters.find((x) => x.id === id);
      if (c) return `${t.name} · ${c.name}`;
    }
    return "—";
  };

  const recent = [...sessions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (minutes <= 0) return;
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
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
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
            <Button type="submit" className="w-full">
              Save block
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{chapterName(s.chapterId)}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.dateISO} · {s.source}
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
