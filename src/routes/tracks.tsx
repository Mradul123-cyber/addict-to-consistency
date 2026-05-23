import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/tracks")({
  head: () => ({
    meta: [
      { title: "Tracks — JEE Workstation" },
      { name: "description", content: "Curriculum tracks and chapter progress for all 5 subjects." },
    ],
  }),
  component: TracksPage,
});

function TracksPage() {
  const { tracks } = useStore();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Curriculum tracks</h1>
        <p className="text-sm text-muted-foreground">High-yield chapters across 5 subjects.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {tracks.map((t) => {
          const avg =
            t.chapters.reduce((s, c) => s + c.completion, 0) / Math.max(1, t.chapters.length);
          return (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{t.name}</span>
                  <span className="text-xs font-normal text-muted-foreground tabular-nums">
                    {Math.round(avg)}% avg
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {t.chapters.map((c) => (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        <Badge variant={c.priority === "High" ? "default" : "secondary"}>
                          {c.priority}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {Math.round(c.completion)}%
                      </span>
                    </div>
                    <Progress value={c.completion} />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
