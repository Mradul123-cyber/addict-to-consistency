import { createFileRoute } from "@tanstack/react-router";
import { FocusTimer } from "@/components/FocusTimer";

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title: "Focus Timer — JEE Workstation" },
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
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deep focus</h1>
        <p className="text-sm text-muted-foreground">
          Pick a chapter, choose a duration, then disappear into the work.
        </p>
      </div>
      <FocusTimer />
    </div>
  );
}
