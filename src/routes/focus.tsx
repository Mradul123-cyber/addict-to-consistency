import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { FocusTimer } from "@/components/FocusTimer";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useMemo } from "react";

const VIBRANT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#06b6d4",
  "#84cc16", "#d946ef", "#0ea5e9", "#10b981", "#f59e0b",
];

function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return VIBRANT_COLORS[Math.abs(hash) % VIBRANT_COLORS.length];
}

export const Route = createFileRoute("/focus")({
  validateSearch: (search: Record<string, unknown>) => ({
    subject: (search.subject as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Focus Timer — JEE Console" },
      { name: "description", content: "Run a deep focus session with ambient audio, tab-drift alerts, and a built-in urge surfer to break distraction cravings." },
      { property: "og:title", content: "Deep Focus Timer for JEE Prep" },
      { property: "og:description", content: "Run a deep focus session with ambient audio, tab-drift alerts, and a built-in urge surfer to break distraction cravings." },
      { property: "og:url", content: "https://addict-to-consistency.lovable.app/focus" },
    ],
    links: [{ rel: "canonical", href: "https://addict-to-consistency.lovable.app/focus" }],
  }),
  component: FocusPage,
});

function FocusPage() {
  const navigate = useNavigate();
  const { subject } = Route.useSearch();
  const { tracks } = useStore();
  const selectedTrack = tracks.find((t) => t.name === subject);
  const [showPanel, setShowPanel] = useState(!!selectedTrack);
  const [panelClosing, setPanelClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTrack) setShowPanel(true);
  }, [selectedTrack]);

  const handleChapterSelect = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    setPanelClosing(true);
    navigate({ to: "/focus", search: { subject: undefined }, replace: true });
    timerRef.current = setTimeout(() => {
      setShowPanel(false);
      setPanelClosing(false);
    }, 200);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const showSidePanel = (showPanel || panelClosing) && selectedTrack;

  return (
    <div className={showSidePanel ? "flex gap-6" : "mx-auto max-w-2xl"}>
      <div className={showSidePanel ? "min-w-0 flex-1 space-y-6" : "space-y-6"}>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deep focus</h1>
          <p className="text-sm text-muted-foreground">
            Pick a task, choose a duration, then disappear into the work.
          </p>
        </div>
        <FocusTimer key={selectedChapterId} initialChapterId={selectedChapterId} />
      </div>

      {showSidePanel && (
        <div
          className={`hidden sm:block w-56 shrink-0 transition-all duration-200 ${
            panelClosing ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0"
          }`}
        >
          <div className="sticky top-6 space-y-3 rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">{selectedTrack.name}</h3>
            <div className="space-y-1">
              {selectedTrack.chapters.map((c) => {
                const color = colorFromId(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground/80 transition-all duration-150 hover:-translate-y-0.5"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${color}18`;
                      e.currentTarget.style.color = color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "";
                    }}
                    onClick={() => handleChapterSelect(c.id)}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full transition-transform duration-150 group-hover:scale-125"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
