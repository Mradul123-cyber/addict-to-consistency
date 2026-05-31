import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import MatrixApp from "@/components/matrix/MatrixApp";
import { NotesProvider } from "@/contexts/NotesContext";
import { CommunityNotesView } from "@/components/community-notes/CommunityNotesView";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, ArrowLeft, ShieldCheck, Flame } from "lucide-react";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes — JEE Console" },
      { name: "description", content: "Matrix Notes and Community Notes for JEE preparation." },
    ],
  }),
  component: NotesRoute,
});

type View = "landing" | "matrix" | "community";

const fadeUp = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.3, delay: i * 0.06 },
  }),
};

function NotesRoute() {
  const [view, setView] = useState<View>("landing");

  if (view === "matrix") {
    return (
      <NotesProvider>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="matrix-notes flex min-h-0 flex-1 flex-col">
            <MatrixApp />
          </div>
          <div className="shrink-0 border-t px-6 py-3 text-center space-y-0.5">
            <p className="text-xs font-bold text-foreground">
              All chapter notes and formula sheets are being prepared and will be available soon.
            </p>
            <p className="text-xs text-muted-foreground">
              Current content is for demo purposes only. Real verified notes will be uploaded shortly.
            </p>
          </div>
        </div>
      </NotesProvider>
    );
  }

  if (view === "community") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Notes
        </button>
        <CommunityNotesView />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-16">
      <motion.div
        className="mb-10 text-center"
        custom={0} variants={fadeUp} initial="hidden" animate="visible"
      >
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Notes</h1>
        <p className="mt-2 text-muted-foreground">Choose your study resource</p>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Matrix Notes */}
        <motion.button
          custom={1} variants={fadeUp} initial="hidden" animate="visible"
          whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView("matrix")}
          className="group flex flex-col items-start gap-5 rounded-2xl border bg-card p-7 text-left transition-colors hover:border-foreground/30"
        >
          <div className="flex w-full items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/8">
              <BookOpen className="h-6 w-6" />
            </div>
            <Badge variant="outline" className="gap-1.5 border-foreground/20 text-xs font-medium">
              <ShieldCheck className="h-3 w-3" />
              Admin Verified
            </Badge>
          </div>
          <div>
            <h2 className="text-xl font-bold">Matrix Notes</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Curated chapter notes, key formulas and concept breakdowns crafted specifically for JEE preparation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-auto">
            {["Physics", "Chemistry", "Mathematics"].map(s => (
              <span key={s} className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        </motion.button>

        {/* Community Notes */}
        <motion.button
          custom={2} variants={fadeUp} initial="hidden" animate="visible"
          whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView("community")}
          className="group flex flex-col items-start gap-5 rounded-2xl border bg-card p-7 text-left transition-colors hover:border-foreground/30"
        >
          <div className="flex w-full items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/8">
              <Users className="h-6 w-6" />
            </div>
            <Badge className="gap-1.5 bg-orange-500 hover:bg-orange-500 text-white text-xs font-medium">
              <Flame className="h-3 w-3" />
              Student Powered
            </Badge>
          </div>
          <div>
            <h2 className="text-xl font-bold">Community Notes</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Notes uploaded by students like you. Multiple perspectives on the same chapter, peer reviewed and approved by the community.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto">
            <Users className="h-3.5 w-3.5" />
            10 upvotes needed to publish
          </div>
        </motion.button>
      </div>
    </div>
  );
}
