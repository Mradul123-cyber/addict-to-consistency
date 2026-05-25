import { createFileRoute } from "@tanstack/react-router";
import MatrixApp from "@/components/matrix/MatrixApp";
import { NotesProvider } from "@/contexts/NotesContext";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes Library — JEE Console" },
      {
        name: "description",
        content:
          "Short notes and formula sheets for every JEE chapter — browse by subject, jump to sections, and run quick revision.",
      },
      { property: "og:title", content: "JEE Notes Library" },
      {
        property: "og:description",
        content:
          "Short notes and formula sheets for every JEE chapter across Physics, Chemistry, and Mathematics.",
      },
      { property: "og:url", content: "https://addict-to-consistency.lovable.app/notes" },
    ],
    links: [{ rel: "canonical", href: "https://addict-to-consistency.lovable.app/notes" }],
  }),
  component: NotesRoute,
});

function NotesRoute() {
  return (
    <NotesProvider>
      <div className="matrix-notes flex min-h-0 flex-1 flex-col">
        <MatrixApp />
      </div>
    </NotesProvider>
  );
}
