import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, ListChecks, CheckCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  addChapter,
  addChapterAdjustment,
  addConceptToChapter,
  calcWeightedCompletion,
  clearChapterOverride,
  removeChapterOverride,
  setAllConceptsDone,
  setChapterCompletion,
  setChapterPriority,
  setConceptWeight,
  toggleConcept,
  useStore,
  type Chapter,
  type ConceptWeight,
  type Priority,
} from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PriorityDropdown } from "@/components/PriorityDropdown";
 
 function totalOverrideDelta(c: Chapter): number {
   return (c.overrides ?? []).reduce((s, o) => s + o.delta, 0);
 }
 
 function displayPct(c: Chapter): number {
   return Math.round(Math.max(0, Math.min(100, c.completion + totalOverrideDelta(c))));
 }
 
 const PRIORITY_WEIGHT: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };
 
 export const Route = createFileRoute("/matrix")({
  head: () => ({
    meta: [
      { title: "Override Matrix — Matrix" },
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

// ─── Concept Sheet ────────────────────────────────────────────────────────────

interface ConceptSheetProps {
  chapter: Chapter | null;
  trackName: string;
  open: boolean;
  onClose: () => void;
  onResetRequest?: () => void;
}

function ConceptSheet({ chapter, trackName, open, onClose, onResetRequest }: ConceptSheetProps) {
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState<ConceptWeight>("Medium");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [adjValue, setAdjValue] = useState(50);
  const [adjNote, setAdjNote] = useState("");

  if (!chapter) return null;

  const concepts = chapter.concepts ?? [];
  const doneCount = concepts.filter((c) => c.done).length;
  const total = concepts.length;
  const pct = total > 0 ? calcWeightedCompletion(concepts) : 0;

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Enter a concept name.");
      return;
    }
    setAdding(true);
    try {
      await addConceptToChapter(chapter.id, newName.trim(), newWeight);
      setNewName("");
      setNewWeight("Medium");
      setShowForm(false);
      toast.success("Concept added.");
    } catch {
      toast.error("Could not add concept.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => { if (!v) { setShowForm(false); onClose(); } }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {trackName}
          </div>
          <SheetTitle className="text-lg leading-snug">{chapter.name}</SheetTitle>
        </SheetHeader>

        {/* Progress summary */}
        <div className="px-6 pb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {doneCount} / {total} concepts done
            </span>
            <span className="font-semibold tabular-nums">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />

          {total > 0 && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => void setAllConceptsDone(chapter.id, true)}
                disabled={doneCount === total}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all done
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs text-muted-foreground"
                onClick={() => onResetRequest?.()}
                disabled={doneCount === 0}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Concept list */}
        <ScrollArea className="flex-1 px-6 py-4">
          {concepts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No concepts yet — add one below.
            </p>
          ) : (
            <ul className="space-y-3">
              {concepts.map((concept) => (
                <li key={concept.id} className="flex items-start gap-3">
                  <Checkbox
                    id={concept.id}
                    checked={concept.done}
                    onCheckedChange={() => void toggleConcept(chapter.id, concept.id)}
                    className="mt-0.5 shrink-0"
                  />
                  <label
                    htmlFor={concept.id}
                    className={`flex-1 cursor-pointer text-sm leading-snug select-none ${
                      concept.done ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {concept.name}
                  </label>
                  <PriorityDropdown
                    value={concept.weight ?? "Medium"}
                    onChange={(v) => setConceptWeight(chapter.id, concept.id, v)}
                    className="shrink-0"
                  />
                </li>
              ))}
            </ul>
          )}

          {/* Add concept form */}
          <div className="mt-4">
            {!showForm ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-xs"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add concept
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Concept name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
                    placeholder="e.g. Newton's third law"
                    disabled={adding}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Weightage</Label>
                  <Select
                    value={newWeight}
                    onValueChange={(v) => setNewWeight(v as ConceptWeight)}
                    disabled={adding}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High (3×)</SelectItem>
                      <SelectItem value="Medium">Medium (2×)</SelectItem>
                      <SelectItem value="Low">Low (1×)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void handleAdd()} disabled={adding} className="h-7 text-xs">
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowForm(false); setNewName(""); setNewWeight("Medium"); }}
                    disabled={adding}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Add adjustment */}
          <div className="mt-6 border-t border-border/50 pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Add adjustment</p>
            <div className="flex items-center gap-2 mb-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={adjValue}
                onChange={(e) => setAdjValue(Number(e.target.value))}
                className="w-16 h-7 text-sm"
              />
              <span className="text-xs text-muted-foreground">%</span>
              <Input
                value={adjNote}
                onChange={(e) => setAdjNote(e.target.value)}
                placeholder="Why? (optional)"
                maxLength={40}
                className="flex-1 h-7 text-[11px]"
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  addChapterAdjustment(chapter.id, adjValue, adjNote || undefined);
                  toast.success("Adjustment added");
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function MatrixPage() {
  const { tracks, sessions } = useStore();
  const minutesByChapter = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) {
      if (s.chapterId) map[s.chapterId] = (map[s.chapterId] ?? 0) + s.minutes;
    }
    return map;
  }, [sessions]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<number>(0);
  const [draftNote, setDraftNote] = useState("");
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterPriority, setNewChapterPriority] = useState<Priority>("Medium");
  const [savingChapter, setSavingChapter] = useState(false);

  const [sheetChapterId, setSheetChapterId] = useState<string | null>(null);
  const [sheetTrackName, setSheetTrackName] = useState("");
  const [clearConfirm, setClearConfirm] = useState<{ chapterId: string; index: number } | null>(null);
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null);

  const openSheet = (chapterId: string, trackName: string) => {
    setSheetChapterId(chapterId);
    setSheetTrackName(trackName);
    setEditing(null);
  };

  const sheetChapter =
    sheetChapterId
      ? tracks.flatMap((t) => t.chapters).find((c) => c.id === sheetChapterId) ?? null
      : null;

  const beginEdit = (id: string, value: number, note?: string) => {
    setEditing(id);
    setDraft(Math.round(value));
    setDraftNote(note ?? "");
  };

  const save = (id: string) => {
    setChapterCompletion(id, draft, draftNote || undefined);
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
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Global Override Matrix</h1>
          <p className="text-sm text-muted-foreground">
            Click the{" "}
            <ListChecks className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
            icon on any chapter to open its concept checklist. Completion is weighted by concept importance.
          </p>
        </div>

        <div className="space-y-4">
          {tracks.map((t) => {
            const PRIORITY_WEIGHT = { High: 3, Medium: 2, Low: 1 };
            const totalWeight = t.chapters.reduce((s, c) => s + PRIORITY_WEIGHT[c.priority], 0);
            const weightedSum = t.chapters.reduce((s, c) => s + displayPct(c) * PRIORITY_WEIGHT[c.priority], 0);
            const subjectAvg = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

            return (
              <Card key={t.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {subjectAvg}% overall
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden w-24 sm:block">
                      <Progress value={subjectAvg} className="h-1.5" />
                    </div>
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
                  </div>
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
                        <Button size="sm" variant="ghost" onClick={cancelAddForm} disabled={savingChapter}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="divide-y">
                    {t.chapters.map((c) => {
                      const isEditing = editing === c.id;
                      const hasConcepts = (c.concepts?.length ?? 0) > 0;
                      const pct = displayPct(c);
                      const doneCount = hasConcepts
                        ? c.concepts!.filter((con) => con.done).length
                        : null;

                      return (
                        <div
                          key={c.id}
                          className="grid grid-cols-[1fr_auto] items-start gap-x-3 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4"
                        >
                          {/* Column 1: name + priority (+ time on desktop) */}
                          <div className="flex min-w-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => beginEdit(c.id, pct)}
                              className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline"
                            >
                              {c.name}
                            </button>
                            <PriorityDropdown
                              value={c.priority}
                              onChange={(v) => setChapterPriority(c.id, v)}
                            />
                            {minutesByChapter[c.id] > 0 && (
                              <span className="hidden sm:inline shrink-0 text-[10px] text-muted-foreground/60 tabular-nums">
                                {Math.round(minutesByChapter[c.id] / 60 * 10) / 10}h
                              </span>
                            )}
                          </div>

                          {/* Column 2: progress bar — full-width below name on mobile, inline on desktop */}
                          <div className="hidden sm:flex items-center gap-1.5">
                            {hasConcepts && (
                              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                {doneCount}/{c.concepts!.length}
                              </span>
                            )}
                            <div className="w-32 md:w-48">
                              <Progress value={pct} />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col gap-1.5">
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
                                  <Input
                                    value={draftNote}
                                    onChange={(e) => setDraftNote(e.target.value)}
                                    placeholder="Why? (optional)"
                                    maxLength={40}
                                    className="h-7 text-[11px]"
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                              onClick={() => beginEdit(c.id, pct)}
                                    className="w-10 text-right text-sm tabular-nums text-muted-foreground hover:text-foreground"
                                  >
                                    {pct}%
                                  </button>
                                  {(c.overrides ?? []).map((o, i) => (
                                    <span key={i} className="inline-flex items-center gap-0.5">
                                      <span
                                        className="text-[11px] font-normal tabular-nums text-muted-foreground/60 border-b border-dotted border-muted-foreground/30 cursor-help"
                                        title={o.note || "Manual adjustment"}
                                      >
                                        {o.delta > 0 ? "+" : ""}{o.delta}
                                      </span>
                                      <button
                                        onClick={() => setClearConfirm({ chapterId: c.id, index: i })}
                                        className="text-muted-foreground/30 hover:text-red-500 transition-colors leading-none"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  aria-label={`Open concept checklist for ${c.name}`}
                                  onClick={() => openSheet(c.id, t.name)}
                                >
                                  <ListChecks className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <ConceptSheet
        chapter={sheetChapter}
        trackName={sheetTrackName}
        open={sheetChapterId !== null}
        onClose={() => setSheetChapterId(null)}
        onResetRequest={() => { const id = sheetChapterId; setSheetChapterId(null); setResetConfirmId(id); }}
      />

      {clearConfirm && (() => {
        const ch = tracks.flatMap((t) => t.chapters).find((c) => c.id === clearConfirm.chapterId);
        if (!ch) return null;
        const ov = (ch.overrides ?? [])[clearConfirm.index];
        if (!ov) return null;
        return (
          <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setClearConfirm(null)}>
            <div className="bg-card ring-1 ring-border/80 rounded-2xl p-5 w-full max-w-xs shadow-xl" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-semibold text-foreground mb-1">Clear override adjustment?</p>
              <div className="bg-muted/40 rounded-lg px-3 py-2 mb-4 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{ov.delta > 0 ? "+" : ""}{ov.delta}%</span>
                {ov.note ? <span className="block text-muted-foreground/70 mt-0.5">"{ov.note}"</span> : null}
              </div>
              <p className="text-xs text-muted-foreground mb-4">The chapter progress will drop to concept-based completion ({Math.round(ch.completion)}%).</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClearConfirm(null)}
                  className="flex-1 py-2.5 rounded-md text-sm font-semibold bg-muted/40 hover:bg-muted transition-colors text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeChapterOverride(clearConfirm.chapterId, clearConfirm.index);
                    const note = ov.note ? ` (${ov.note})` : "";
                    toast.success(`Override cleared${note}`);
                    setClearConfirm(null);
                  }}
                  className="flex-1 py-2.5 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {resetConfirmId && (() => {
        const ch = tracks.flatMap((t) => t.chapters).find((c) => c.id === resetConfirmId);
        if (!ch) return null;
        const concepts = ch.concepts ?? [];
        const doneCount = concepts.filter((c) => c.done).length;
        const total = concepts.length;
        const overrides = ch.overrides ?? [];
        return (
          <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setResetConfirmId(null)}>
            <div className="bg-card ring-1 ring-border/80 rounded-2xl p-5 w-full max-w-xs shadow-xl" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-semibold text-foreground mb-1">Reset concepts?</p>
              <p className="text-xs text-muted-foreground mb-3">{doneCount}/{total} concepts will be marked undone.</p>
              {overrides.length > 0 ? (
                <div className="bg-muted/40 rounded-lg px-3 py-2 mb-4 text-xs text-muted-foreground space-y-1">
                  <span className="font-medium text-foreground">Override adjustments:</span>
                  {overrides.map((o, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>{o.delta > 0 ? "+" : ""}{o.delta}%{o.note ? <span className="text-muted-foreground/70"> "{o.note}"</span> : null}</span>
                      <button
                        type="button"
                        onClick={() => {
                          removeChapterOverride(ch.id, i);
                          const note = o.note ? ` (${o.note})` : "";
                          toast.success(`Override cleared${note}`);
                          setResetConfirmId(null);
                        }}
                        className="text-red-500 hover:text-red-600 font-semibold text-[11px] uppercase tracking-wider cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => { void setAllConceptsDone(ch.id, false); setResetConfirmId(null); }}
                  className="w-full py-2 rounded-md text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Reset concepts only
                </button>
                {overrides.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      void setAllConceptsDone(ch.id, false);
                      clearChapterOverride(ch.id);
                      setResetConfirmId(null);
                      toast.success("Reset cleared concepts and all override adjustments");
                    }}
                    className="w-full py-2 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-opacity cursor-pointer"
                  >
                    Reset all (clear all overrides)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setResetConfirmId(null)}
                  className="w-full py-2 rounded-md text-sm font-semibold bg-muted/40 hover:bg-muted transition-colors text-foreground cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
