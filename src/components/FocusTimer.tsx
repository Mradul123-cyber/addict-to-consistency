import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChapterPicker } from "./ChapterPicker";
import { AmbientAudioControl } from "./AmbientAudioControl";
import { UrgeSurfer } from "./UrgeSurfer";
import { SessionCommitDialog } from "./SessionCommitDialog";
import { stopAmbient } from "@/lib/audio";
import { useStore, Chapter } from "@/lib/store";
import type { DriftClassification, DriftSummary } from "@/lib/store";

function toDriftClassification(value: string): DriftClassification {
  if (value === "healthy" || value === "distraction") return value;
  return "neutral";
}
import { useAirgap } from "@/hooks/useAirgap";

const DURATIONS = [45, 60, 90, 120] as const;
const MIN_CUSTOM_MINUTES = 1;
const MAX_CUSTOM_MINUTES = 480;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function parseCustomMinutes(value: string): number {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return MIN_CUSTOM_MINUTES;
  return Math.min(MAX_CUSTOM_MINUTES, Math.max(MIN_CUSTOM_MINUTES, parsed));
}

export function FocusTimer() {
  const { tracks } = useStore();
  const { healthySites, blocklist, startFocusTracking, endFocusTracking } = useAirgap();
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(45);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("30");

  const effectiveDuration = isCustomDuration ? parseCustomMinutes(customMinutes) : duration;

  const suggestedChapter = tracks
    .flatMap((t) => t.chapters.map((c) => ({ ...c, trackName: t.name })))
    .filter((c) => c.priority === "High")
    .reduce<(Chapter & { trackName: string }) | null>(
      (lowest, cur) => (!lowest || cur.completion < lowest.completion ? cur : lowest),
      null,
    );
  const [remaining, setRemaining] = useState<number>(45 * 60);
  const [running, setRunning] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [driftSummary, setDriftSummary] = useState<DriftSummary | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string>("");
  const trackingActiveRef = useRef(false);

  useEffect(() => {
    if (!running) setRemaining(effectiveDuration * 60);
  }, [effectiveDuration, running]);

  const finishFocusSession = useCallback(
    async (openCommit: boolean) => {
      if (trackingActiveRef.current) {
        trackingActiveRef.current = false;
        const summary = await endFocusTracking();
        if (summary) {
          setDriftSummary({
            healthyMinutes: summary.healthyMinutes,
            distractionMinutes: summary.distractionMinutes,
            neutralMinutes: summary.neutralMinutes,
            neutralDomains: summary.neutralDomains,
            topDomains: (summary.topDomains ?? [])
              .filter((d) => d.minutes > 0)
              .map((d) => ({
                domain: d.domain,
                minutes: d.minutes,
                classification: toDriftClassification(d.classification),
              })),
          });
        } else {
          setDriftSummary(null);
        }
      }

      if (openCommit) {
        setCommitOpen(true);
      }
    },
    [endFocusTracking],
  );

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setRunning(false);
          stopAmbient();
          void finishFocusSession(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running, finishFocusSession]);

  useEffect(() => {
    if (!running) return;
    originalTitleRef.current = document.title;
    const onVis = () => {
      if (document.hidden) {
        document.title = "⚠ Refocus — JEE Timer running";
      } else {
        document.title = originalTitleRef.current || "JEE Console";
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.title = originalTitleRef.current || "JEE Console";
    };
  }, [running]);

  const start = () => {
    setRemaining(effectiveDuration * 60);
    setRunning(true);
    setDriftSummary(null);
    trackingActiveRef.current = true;
    void startFocusTracking(healthySites, blocklist);
  };

  const cancel = () => {
    setRunning(false);
    setRemaining(effectiveDuration * 60);
    stopAmbient();
    void finishFocusSession(false);
  };

  const elapsedMinutes = Math.round((effectiveDuration * 60 - remaining) / 60);
  const plannedForCommit = elapsedMinutes > 0 ? elapsedMinutes : effectiveDuration;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-medium">Active chapter</label>
          {suggestedChapter && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Suggested:</span>
              <button
                type="button"
                onClick={() => setChapterId(suggestedChapter.id)}
                className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 font-medium text-amber-600 transition-colors hover:bg-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30"
                title={`Suggesting high priority chapter ${suggestedChapter.name} at ${suggestedChapter.completion}% completion`}
              >
                ★ {suggestedChapter.trackName} · {suggestedChapter.name} (
                {suggestedChapter.completion}%)
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
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={!isCustomDuration && duration === d ? "default" : "outline"}
              onClick={() => {
                setIsCustomDuration(false);
                setDuration(d);
              }}
              disabled={running}
            >
              {d}m
            </Button>
          ))}
          <Button
            size="sm"
            variant={isCustomDuration ? "default" : "outline"}
            onClick={() => setIsCustomDuration(true)}
            disabled={running}
          >
            Custom
          </Button>
        </div>
        {isCustomDuration && (
          <div className="flex max-w-xs items-center gap-2">
            <Input
              type="number"
              min={MIN_CUSTOM_MINUTES}
              max={MAX_CUSTOM_MINUTES}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              disabled={running}
              className="h-9 w-24"
              aria-label="Custom duration in minutes"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="font-mono text-6xl font-semibold tabular-nums">{fmt(remaining)}</div>
        <div className="mt-2 text-xs text-muted-foreground">
          {running ? "Deep focus in progress" : "Ready"}
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {!running ? (
            <Button onClick={start}>Start focus</Button>
          ) : (
            <Button variant="destructive" onClick={cancel}>
              Cancel
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
        driftSummary={driftSummary}
        onClose={() => {
          setCommitOpen(false);
          setDriftSummary(null);
        }}
      />
    </div>
  );
}
