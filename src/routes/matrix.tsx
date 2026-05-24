import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addChapter, setChapterCompletion, useStore, type Priority } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/matrix")({
  head: () => ({
    meta: [
      { title: "Override Matrix — JEE Console" },
      {
        name: "description",
        content:
          "Administrative grid for manually overriding chapter completion percentages across every JEE subject in one place.",
      },
      { property: "og:title", content: "Global Override Matrix" },
      {
        property: "og:description",
        content:
          "Administrative grid for manually overriding chapter completion percentages across every JEE subject in one place.",
      },
      { property: "og:url", content: "https://addict-to-consistency.lovable.app/matrix" },
    ],
    links: [{ rel: "canonical", href: "https://addict-to-consistency.lovable.app/matrix" }],
  }),
  component: MatrixPage,
});

function priorityVariant(priority: Priority): "default" | "secondary" | "outline" {
  if (priority === "High") return "default";
  if (priority === "Medium") return "secondary";
  return "outline";
}

function MatrixPage() {
  const { tracks } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<number>(0);
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterPriority, setNewChapterPriority] = useState<Priority>("Medium");
  const [savingChapter, setSavingChapter] = useState(false);

  const beginEdit = (id: string, value: number) => {
    setEditing(id);
    setDraft(Math.round(value));
  };

  const save = (id: string) => {
    setChapterCompletion(id, draft);
    setEditing(null);
  };

  const openAddForm = (trackId: string) => {
    setAddingTrackId(trackId);
    setNewChapterName("");
    setNewChapterPriority("Medium");
    setEditing(null);
  };

  const cancelAddForm = () => {
    setAddingTrackId(null);
    setNewChapterName("");
    setNewChapterPriority("Medium");
  };

  const handleSaveChapter = async (trackId: string) => {
    if (!newChapterName.trim()) {
      toast.error("Please enter a chapter name.");
      return;
    }

    setSavingChapter(true);
    try {
      await addChapter(trackId, newChapterName, newChapterPriority);
      cancelAddForm();
      toast.success("Chapter added.");
    } catch (err) {
      console.error("Failed to add chapter:", err);
      toast.error("Could not add chapter. Please try again.");
    } finally {
      setSavingChapter(false);
    }
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">{t.name}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={`Add chapter to ${t.name}`}
                onClick={() => openAddForm(t.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {addingTrackId === t.id && (
                <div className="mb-4 space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={`chapter-name-${t.id}`}>Chapter name</Label>
                    <Input
                      id={`chapter-name-${t.id}`}
                      value={newChapterName}
                      onChange={(e) => setNewChapterName(e.target.value)}
                      placeholder="e.g. Electromagnetic Induction"
                      disabled={savingChapter}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`chapter-priority-${t.id}`}>Priority</Label>
                    <Select
                      value={newChapterPriority}
                      onValueChange={(value) => setNewChapterPriority(value as Priority)}
                      disabled={savingChapter}
                    >
                      <SelectTrigger id={`chapter-priority-${t.id}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void handleSaveChapter(t.id)}
                      disabled={savingChapter}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelAddForm}
                      disabled={savingChapter}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
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
                        <Badge variant={priorityVariant(c.priority)}>{c.priority}</Badge>
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
