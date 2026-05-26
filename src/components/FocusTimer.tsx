import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChapterPicker } from "./ChapterPicker";
import { AmbientAudioControl } from "./AmbientAudioControl";
import { UrgeSurfer } from "./UrgeSurfer";
import { SessionCommitDialog } from "./SessionCommitDialog";
import { stopAmbient, playAmbient, getLastSelection } from "@/lib/audio";
import { useStore, Chapter } from "@/lib/store";
import type { DriftClassification, DriftSummary } from "@/lib/store";

function toDriftClassification(value: string): DriftClassification {
  if (value === "healthy" || value === "distraction") return value;
  return "neutral";
}
import { useAirgap } from "@/hooks/useAirgap";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

type PomodoroMode = "focus" | "shortBreak" | "longBreak";

const MODE_CONFIG: Record<PomodoroMode, { label: string; defaultMinutes: number; color: string; bg: string }> = {
  focus: { label: "Focus", defaultMinutes: 25, color: "#ba4949", bg: "bg-[#ba4949]" },
  shortBreak: { label: "Short Break", defaultMinutes: 5, color: "#38858a", bg: "bg-[#38858a]" },
  longBreak: { label: "Long Break", defaultMinutes: 15, color: "#397097", bg: "bg-[#397097]" },
};
const DURATIONS_BY_MODE: Record<PomodoroMode, readonly number[]> = {
  focus: [25, 45, 60, 90, 120],
  shortBreak: [5, 10, 15],
  longBreak: [15, 30, 60, 90, 120],
};

function getCustomInfo(value: string, mode: PomodoroMode): { minutes: number; error: string | null } {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return { minutes: MODE_CONFIG[mode].defaultMinutes, error: null };
  }
  if (mode === "shortBreak" && parsed > 15) {
    return { minutes: 15, error: "Short break max is 15 minutes" };
  }
  if (mode === "longBreak" && parsed < 15) {
    return { minutes: 15, error: "Long break min is 15 minutes" };
  }
  return { minutes: parsed, error: null };
}

export function FocusTimer() {
  const { tracks } = useStore();
  const { healthySites, blocklist, startFocusTracking, endFocusTracking } = useAirgap();
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [duration, setDuration] = useState<number>(MODE_CONFIG.focus.defaultMinutes);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("30");
  const [suggestedDismissed, setSuggestedDismissed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const { minutes: effectiveDuration, error: customError } = isCustomDuration ? getCustomInfo(customMinutes, mode) : { minutes: duration, error: null };

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

  useEffect(() => {
    if (!running) setRemaining(effectiveDuration * 60);
  }, [effectiveDuration, running]);
  const [driftSummary, setDriftSummary] = useState<DriftSummary | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string>("");
  const trackingActiveRef = useRef(false);
  const startedAtRef = useRef<number>(0);
  const totalSecondsRef = useRef<number>(45 * 60);


  const SESSION_KEY = "focusSession_active";
  const STARTED_AT_KEY = "focusSession_startedAt";
  const DURATION_KEY = "focusSession_duration";
  const CHAPTER_KEY = "focusSession_chapterId";

  const clearPersistedSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(STARTED_AT_KEY);
    localStorage.removeItem(DURATION_KEY);
    localStorage.removeItem(CHAPTER_KEY);
  }, []);

  const finishFocusSession = useCallback(
    async (openCommit: boolean) => {
      clearPersistedSession();
      startedAtRef.current = 0;
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
    [endFocusTracking, clearPersistedSession],
  );

  useEffect(() => {
    if (!running) return;

    if (startedAtRef.current === 0) {
      const total = effectiveDuration * 60;
      totalSecondsRef.current = total;
      startedAtRef.current = Date.now();
      setRemaining(total);
      localStorage.setItem(SESSION_KEY, "true");
      localStorage.setItem(STARTED_AT_KEY, String(startedAtRef.current));
      localStorage.setItem(DURATION_KEY, String(total));
      localStorage.setItem(CHAPTER_KEY, chapterId ?? "");
    }

    tickRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const left = Math.max(0, totalSecondsRef.current - elapsed);
      setRemaining(left);

      if (left <= 0) {
        if (tickRef.current) clearInterval(tickRef.current);
        setRunning(false);
        stopAmbient();
        void finishFocusSession(true);
      }
    }, 200);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running, effectiveDuration, finishFocusSession, chapterId, SESSION_KEY, STARTED_AT_KEY, DURATION_KEY, CHAPTER_KEY]);

  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY) === "true") {
      const savedStartedAt = Number(localStorage.getItem(STARTED_AT_KEY));
      const savedDuration = Number(localStorage.getItem(DURATION_KEY));
      const savedChapterId = localStorage.getItem(CHAPTER_KEY) || null;
      if (savedStartedAt && savedDuration) {
        const elapsed = Math.floor((Date.now() - savedStartedAt) / 1000);
        const left = Math.max(0, savedDuration - elapsed);
        if (left > 0) {
          startedAtRef.current = savedStartedAt;
          totalSecondsRef.current = savedDuration;
          setRemaining(left);
          setRunning(true);
          setChapterId(savedChapterId);
          trackingActiveRef.current = true;
        } else {
          clearPersistedSession();
          setChapterId(savedChapterId);
          setRemaining(0);
          void finishFocusSession(true);
        }
      }
    }
  }, [SESSION_KEY, STARTED_AT_KEY, DURATION_KEY, CHAPTER_KEY, clearPersistedSession, finishFocusSession]);

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

  useEffect(() => {
    if (!fullscreen) return;
    document.documentElement.requestFullscreen().catch(() => {});
    const onFsChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [fullscreen]);

  const start = () => {
    startedAtRef.current = 0;
    setRemaining(effectiveDuration * 60);
    setRunning(true);
    setDriftSummary(null);
    trackingActiveRef.current = true;
    void startFocusTracking(healthySites, blocklist);

    const sel = getLastSelection();
    if (sel.kind !== "off") {
      playAmbient(sel.kind, sel.customName);
    }
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
          <label className="text-sm font-medium">Active Task</label>
          {!suggestedDismissed && suggestedChapter && (
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
              <button
                type="button"
                onClick={() => setSuggestedDismissed(true)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                title="Dismiss suggestion"
              >
                ✕
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

      <div className="flex rounded-lg border bg-card p-1">
        {(Object.entries(MODE_CONFIG) as [PomodoroMode, typeof MODE_CONFIG["focus"]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => {
              setMode(key);
              setDuration(cfg.defaultMinutes);
              setCustomMinutes(String(cfg.defaultMinutes));
              setIsCustomDuration(false);
            }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              mode === key
                ? "text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={mode === key ? { backgroundColor: cfg.color } : undefined}
            disabled={running}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Duration</label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS_BY_MODE[mode].map((d) => (
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
            onClick={() => setIsCustomDuration((v) => !v)}
            disabled={running}
          >
            Custom
          </Button>
        </div>
        {isCustomDuration && !running && (
          <div className="flex max-w-xs flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                disabled={running}
                className="h-9 w-24"
                aria-label="Custom duration in minutes"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
            {customError && <p className="text-xs text-destructive">{customError}</p>}
          </div>
        )}
      </div>

      <div
        className="rounded-lg border p-8 text-center transition-colors duration-500"
        style={{
          backgroundColor: running ? MODE_CONFIG[mode].color : undefined,
          borderColor: running ? MODE_CONFIG[mode].color : undefined,
        }}
      >
        <div className="font-mono text-6xl font-semibold tabular-nums" style={{ color: running ? "#fff" : undefined }}>
          {fmt(remaining)}
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {!running ? (
            <Button onClick={start}>Start {mode === "focus" ? "Focus" : "Break"}</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setFullscreen(true)}>
                Fullscreen
              </Button>
              <Button variant="destructive" onClick={cancel}>
                Stop
              </Button>
            </div>
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

      {fullscreen && running && (
        <FullscreenOverlay
          remaining={remaining}
          total={effectiveDuration * 60}
          mode={mode}
          onExit={() => setFullscreen(false)}
          taskName={
            chapterId?.startsWith("custom:")
              ? chapterId.slice("custom:".length)
              : undefined
          }
        />
      )}
    </div>
  );
}

function FullscreenOverlay({
  remaining,
  total,
  mode,
  onExit,
  taskName,
}: {
  remaining: number;
  total: number;
  mode: PomodoroMode;
  onExit: () => void;
  taskName?: string;
}) {
  const cfg = MODE_CONFIG[mode];

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-500"
      style={{ backgroundColor: cfg.color }}
    >
      <button
        onClick={onExit}
        className="absolute right-6 top-6 rounded-full bg-white/20 px-4 py-2 text-sm text-white transition-colors hover:bg-white/30"
      >
        Exit
      </button>

      <p className="mb-2 text-sm font-medium tracking-widest uppercase text-white/60">
        {cfg.label}
      </p>

      {taskName && (
        <p className="mb-4 text-lg font-medium text-white/80">{taskName}</p>
      )}

      <div className="font-mono text-[clamp(4rem,20vw,12rem)] font-bold leading-none text-white tabular-nums">
        {fmt(remaining)}
      </div>

      {remaining <= 0 && (
        <p className="mt-6 text-xl text-white/80">Time's up!</p>
      )}
    </div>
  );
}
