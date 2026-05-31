import { createFileRoute } from "@tanstack/react-router";
import { CommunityNotesView } from "@/components/community-notes/CommunityNotesView";

export const Route = createFileRoute("/community-notes")({
  head: () => ({ meta: [{ title: "Community Notes — JEE Console" }] }),
  component: CommunityNotesView,
});
