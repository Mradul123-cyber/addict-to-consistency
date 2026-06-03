import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore, setChapterPriority } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PriorityDropdown } from "@/components/PriorityDropdown";

const TRACK_NAMES = [
  "Physics",
  "Physical Chemistry",
  "Organic Chemistry",
  "Inorganic Chemistry",
  "Mathematics",
];

export const Route = createFileRoute("/tracks")({
  head: () => ({
    meta: [
      { title: "Curriculum Tracks — Matrix" },
      { name: "description", content: "High-yield chapter progress across Physics, Physical, Organic and Inorganic Chemistry, and Mathematics for the JEE syllabus." },
      { property: "og:title", content: "JEE Curriculum Tracks" },
      { property: "og:description", content: "High-yield chapter progress across Physics, Physical, Organic and Inorganic Chemistry, and Mathematics for the JEE syllabus." },
      { property: "og:url", content: "https://addict-to-consistency.lovable.app/tracks" },
    ],
    links: [{ rel: "canonical", href: "https://addict-to-consistency.lovable.app/tracks" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "JEE Curriculum Tracks",
          itemListElement: TRACK_NAMES.map((name, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name,
          })),
        }),
      },
    ],
  }),
  component: TracksPage,
});

function TracksPage() {
  const { tracks, sessions } = useStore();
  const minutesByChapter = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) {
      if (s.chapterId) map[s.chapterId] = (map[s.chapterId] ?? 0) + s.minutes;
    }
    return map;
  }, [sessions]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Curriculum tracks</h1>
        <p className="text-sm text-muted-foreground">High-yield chapters across 5 subjects.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {tracks.map((t) => {
          const PRIORITY_WEIGHT = { High: 3, Medium: 2, Low: 1 };
          const totalWeight = t.chapters.reduce((s, c) => s + PRIORITY_WEIGHT[c.priority], 0);
          const weightedSum = t.chapters.reduce((s, c) => s + c.completion * PRIORITY_WEIGHT[c.priority], 0);
          const avg = totalWeight > 0 ? weightedSum / totalWeight : 0;
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
                        <PriorityDropdown
                          value={c.priority}
                          onChange={(v) => setChapterPriority(c.id, v)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {Math.round(c.completion)}%
                        </span>
                        {minutesByChapter[c.id] > 0 && (
                          <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                            {Math.round(minutesByChapter[c.id] / 60 * 10) / 10}h
                          </span>
                        )}
                      </div>
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
