import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, MessageSquare, Mic, FileText, Image, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FreeTierIntroDialogProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const LIMITS = [
  {
    icon: MessageSquare,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    title: "5 AI prompts",
    desc: "Lifetime. Ask anything across all topics.",
  },
  {
    icon: Mic,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Voice on first 2 prompts",
    desc: "AI explanation read aloud with your chosen voice",
  },
  {
    icon: FileText,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    title: "1 PDF upload",
    desc: "Up to 2 pages. Attach study material to your prompt.",
  },
  {
    icon: Image,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "2 image uploads",
    desc: "Share diagrams, equations, or screenshots",
  },
];

const TIP = "For efficient use, ask clear and focused questions. Vague messages consume your limit without meaningful output.";

export function FreeTierIntroDialog({ open, onClose, onUpgrade }: FreeTierIntroDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative z-10 w-full max-w-sm"
          >
            <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="relative px-6 pt-6 pb-5 text-center border-b bg-muted/20">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    Welcome to Studio
                  </span>
                </div>
                <h2 className="text-lg font-bold">Your free trial includes</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Explore Matrix with no commitment. Upgrade anytime to unlock more.
                </p>
              </div>

              {/* Limits */}
              <div className="p-4 space-y-2.5">
                {LIMITS.map(({ icon: Icon, color, bg, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tip */}
              <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug">{TIP}</p>
              </div>

              {/* Footer */}
              <div className="px-4 pb-4 space-y-2">
                <Button size="sm" className="w-full gap-2" onClick={onClose}>
                  Got it, let's start
                </Button>
                <button
                  onClick={() => { onClose(); onUpgrade(); }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <Zap className="h-3 w-3 text-amber-500" />
                  See paid plans
                </button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
