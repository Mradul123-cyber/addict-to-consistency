import { createFileRoute } from "@tanstack/react-router";
import { CommunityNotesView } from "@/components/community-notes/CommunityNotesView";

export const Route = createFileRoute("/community-notes")({
  head: () => ({
    meta: [
      { title: "Community Notes — Matrix" },
      { name: "description", content: "Browse and share concise JEE study notes created by the Matrix community. Upvote the best explanations for Physics, Chemistry, and Maths." },
      { property: "og:title", content: "Community Notes — Matrix" },
      { property: "og:description", content: "Browse and share concise JEE study notes created by the Matrix community. Upvote the best explanations for Physics, Chemistry, and Maths." },
      { property: "og:url", content: "https://addict-to-consistency.lovable.app/community-notes" },
    ],
  }),
  component: CommunityNotesView,
});
