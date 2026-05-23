import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChapterPicker } from "./ChapterPicker";
import { AmbientAudioControl } from "./AmbientAudioControl";
import { UrgeSurfer } from "./UrgeSurfer";
import { SessionCommitDialog } from "./SessionCommitDialog";
import { stopAmbient } from "@/lib/audio";

const DURATIONS = [45, 60, 90, 120] as const;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function FocusTimer() {
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(45);
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
    if (!chapterId) return;
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
        <label className="text-sm font-medium">Active chapter</label>
        <ChapterPicker value={chapterId} onChange={setChapterId} />
        {!chapterId && (
          <p className="text-xs text-muted-foreground">
            Select a chapter to unlock the focus timer.
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
          {running ? "Deep focus in progress" : chapterId ? "Ready" : "Pick a chapter"}
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {!running ? (
            <Button onClick={start} disabled={!chapterId}>
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
