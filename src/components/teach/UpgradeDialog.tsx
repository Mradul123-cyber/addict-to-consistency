import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
}

const PLANS = [
  {
    id: "student",
    name: "Student",
    price: "₹299",
    period: "/month",
    tagline: "For the dedicated aspirant",
    highlight: false,
    features: [
      "Unlimited AI teaching sessions",
      "All 6 learning modes — JEE, NEET, Coding, UPSC, Marketing, General",
      "Session history with replay",
      "Voice-enabled interactive board",
      "Personalised explanations at your pace",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹599",
    period: "/month",
    tagline: "For the serious competitor",
    highlight: true,
    features: [
      "Everything in Student",
      "Extended conversation memory",
      "Priority response speed",
      "3D visualisation & progressive diagrams",
      "Early access to new features",
    ],
  },
] as const;

export function UpgradeDialog({ open, onClose }: UpgradeDialogProps) {
  const [selected, setSelected] = useState<"student" | "pro">("student");

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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative z-10 w-full max-w-2xl"
          >
            <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-8 pt-8 pb-6 text-center border-b bg-muted/20">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    Upgrade Matrix
                  </span>
                </div>
                <h2 className="text-2xl font-bold">Continue learning without limits</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Get unlimited access to your personal AI teaching board — available anytime, on any topic.
                </p>
              </div>

              {/* Plans */}
              <div className="p-6 grid grid-cols-2 gap-4">
                {PLANS.map((plan) => (
                  <motion.button
                    key={plan.id}
                    onClick={() => setSelected(plan.id)}
                    whileHover={{ y: selected !== plan.id ? -3 : 0 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`relative flex flex-col items-start gap-4 rounded-xl border-2 p-5 text-left overflow-hidden ${
                      selected === plan.id
                        ? plan.highlight ? "border-amber-500" : "border-foreground"
                        : "border-border"
                    }`}
                  >
                    {/* Smooth background fill slides in */}
                    <AnimatePresence>
                      {selected === plan.id && (
                        <motion.div
                          layoutId="plan-selected-bg"
                          className={`absolute inset-0 ${plan.highlight ? "bg-amber-500/6" : "bg-foreground/5"}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </AnimatePresence>

                    {plan.highlight && (
                      <span className="relative z-10 absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[11px] font-bold text-white uppercase tracking-wide">
                        Most Popular
                      </span>
                    )}

                    <div className="relative z-10">
                      <p className="font-bold text-base">{plan.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
                    </div>

                    <div className="relative z-10 flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>

                    <ul className="relative z-10 space-y-2 w-full">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
                          <span className="text-muted-foreground leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.button>
                ))}
              </div>

              {/* Footer CTA */}
              <div className="px-6 pb-6 space-y-3">
                <Button
                  size="lg"
                  className="w-full gap-2 relative overflow-hidden"
                  onClick={() => {
                    // TODO: open UPI payment flow
                  }}
                >
                  <Zap className="h-4 w-4" />
                  Get {PLANS.find(p => p.id === selected)?.name} — {PLANS.find(p => p.id === selected)?.price}/mo
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Pay via UPI · Manual activation within 24 hours · Cancel anytime
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
