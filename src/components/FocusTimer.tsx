import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChapterPicker } from "./ChapterPicker";
import { AmbientAudioControl } from "./AmbientAudioControl";
import { UrgeSurfer } from "./UrgeSurfer";
import { SessionCommitDialog } from "./SessionCommitDialog";
import { stopAmbient } from "@/lib/audio";
import { useStore, Chapter } from "@/lib/store";

const DURATIONS = [45, 60, 90, 120] as const;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function FocusTimer() {
  const { tracks } = useStore();
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(45);

  // Suggest the High-priority chapter with the lowest completion %
  const suggestedChapter = tracks
    .flatMap((t) => t.chapters.map((c) => ({ ...c, trackName: t.name })))
    .filter((c) => c.priority === "High")
    .reduce<(Chapter & { trackName: string }) | null>(
      (lowest, cur) => (!lowest || cur.completion < lowest.completion ? cur : lowest),
      null
    );
  const [remaining, setRemaining] = useState<number>(45 * 60);
  const [running, setRunning] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string>("");

  useEffect(() => {
    if (!running) setRemaining(duration * 60);
  }, [duration, running]);

  // tick
  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setRunning(false);
          stopAmbient();
          setCommitOpen(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running]);

  // Tab drift shield
  useEffect(() => {
    if (!running) return;
    originalTitleRef.current = document.title;
    const onVis = () => {
      if (document.hidden) {
        document.title = "⚠ Refocus — JEE Timer running";
      } else {
        document.title = originalTitleRef.current || "JEE Workstation";
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.title = originalTitleRef.current || "JEE Workstation";
    };
  }, [running]);

  const start = () => {
    setRemaining(duration * 60);
    setRunning(true);
  };
  const cancel = () => {
    setRunning(false);
    setRemaining(duration * 60);
    stopAmbient();
  };

  const elapsedMinutes = Math.round((duration * 60 - remaining) / 60);
  const plannedForCommit = elapsedMinutes > 0 ? elapsedMinutes : duration;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-sm font-medium">Active chapter</label>
          {suggestedChapter && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Suggested:</span>
              <button
                type="button"
                onClick={() => setChapterId(suggestedChapter.id)}
                className="inline-flex items-center rounded-full bg-amber-500/10 dark:bg-amber-500/20 px-2.5 py-0.5 font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 dark:hover:bg-amber-500/30 cursor-pointer transition-colors border border-amber-500/20"
                title={`Suggesting high priority chapter ${suggestedChapter.name} at ${suggestedChapter.completion}% completion`}
              >
                ★ {suggestedChapter.trackName} · {suggestedChapter.name} ({suggestedChapter.completion}%)
              </button>
            </div>
          )}
        </div>
        <ChapterPicker value={chapterId} onChange={setChapterId} />
        {!chapterId && (
          <p className="text-xs text-muted-foreground">
            No chapter selected — session won't be tagged.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Duration</label>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={duration === d ? "default" : "outline"}
              onClick={() => setDuration(d)}
              disabled={running}
            >
              {d}m
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="font-mono text-6xl font-semibold tabular-nums">
          {fmt(remaining)}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {running ? "Deep focus in progress" : "Ready"}
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {!running ? (
            <Button onClick={start}>
              Start focus
            </Button>
          ) : (
            <Button variant="destructive" onClick={cancel}>
              Cancel
            </Button>
          )}
          {!running && elapsedMinutes > 0 && (
            <Button variant="outline" onClick={() => setCommitOpen(true)}>
              Commit session
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <AmbientAudioControl />
        <UrgeSurfer />
      </div>

      <SessionCommitDialog
        open={commitOpen}
        plannedMinutes={plannedForCommit}
        chapterId={chapterId}
        onClose={() => setCommitOpen(false)}
      />
    </div>
  );
}
