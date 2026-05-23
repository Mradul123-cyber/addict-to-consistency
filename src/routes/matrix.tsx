import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setChapterCompletion, useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/matrix")({
  head: () => ({
    meta: [
      { title: "Override Matrix — JEE Workstation" },
      { name: "description", content: "Administrative view to override chapter progress directly." },
    ],
  }),
  component: MatrixPage,
});

function MatrixPage() {
  const { tracks } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<number>(0);

  const beginEdit = (id: string, value: number) => {
    setEditing(id);
    setDraft(Math.round(value));
  };
  const save = (id: string) => {
    setChapterCompletion(id, draft);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Global Override Matrix</h1>
        <p className="text-sm text-muted-foreground">
          Click any chapter to manually override its completion percentage.
        </p>
      </div>
      <div className="space-y-4">
        {tracks.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="text-base">{t.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {t.chapters.map((c) => {
                  const isEditing = editing === c.id;
                  return (
                    <div
                      key={c.id}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(c.id, c.completion)}
                          className="text-left text-sm font-medium hover:underline"
                        >
                          {c.name}
                        </button>
                        <Badge variant={c.priority === "High" ? "default" : "secondary"}>
                          {c.priority}
                        </Badge>
                      </div>
                      <div className="w-48">
                        <Progress value={c.completion} />
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={draft}
                            onChange={(e) => setDraft(Number(e.target.value))}
                            className="w-20"
                          />
                          <Button size="sm" onClick={() => save(c.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => beginEdit(c.id, c.completion)}
                          className="w-20 text-right text-sm tabular-nums text-muted-foreground hover:text-foreground"
                        >
                          {Math.round(c.completion)}%
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
