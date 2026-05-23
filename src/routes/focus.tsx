import { createFileRoute } from "@tanstack/react-router";
import { FocusTimer } from "@/components/FocusTimer";

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title: "Focus — JEE Workstation" },
      { name: "description", content: "Deep focus timer with ambient audio and urge surfer." },
    ],
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
