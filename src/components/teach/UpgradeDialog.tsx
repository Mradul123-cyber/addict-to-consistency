import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
}

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "₹199",
    period: "/month",
    tagline: "Get started with AI teaching",
    highlight: false,
    badge: null,
    accentClass: "",
    features: [
      "15 AI prompts / month",
      "English voice",
      "2 PDF · 3 image uploads / month",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹399",
    period: "/month",
    tagline: "For the serious student",
    highlight: true,
    badge: "Most Popular",
    accentClass: "border-amber-500",
    features: [
      "40 AI prompts / month",
      "Voice in all languages",
      "5 PDF · 10 image uploads / month",
      "Ask AI from canvas",
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    price: "₹699",
    period: "/month",
    annualPrice: "₹5,999 / yr",
    tagline: "Built for long-term growth",
    highlight: false,
    badge: "Best Value",
    accentClass: "border-blue-500",
    features: [
      "80 AI prompts / month",
      "Voice in all languages",
      "Unlimited uploads",
      "Ask AI from canvas",
      "Early access to new features",
      "Priority support",
    ],
  },
] as const;

type PlanId = typeof PLANS[number]["id"];

export function UpgradeDialog({ open, onClose }: UpgradeDialogProps) {
  const [selected, setSelected] = useState<PlanId>("pro");

  const selectedPlan = PLANS.find(p => p.id === selected)!;

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
            className="relative z-10 w-full max-w-3xl"
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
              <div className="p-6 grid grid-cols-3 gap-3">
                {PLANS.map((plan) => {
                  const isSelected = selected === plan.id;
                  const borderClass = isSelected
                    ? (plan.accentClass || "border-foreground")
                    : "border-border";

                  return (
                    <motion.button
                      key={plan.id}
                      onClick={() => setSelected(plan.id)}
                      whileHover={{ y: !isSelected ? -3 : 0 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={`relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left overflow-hidden ${borderClass}`}
                    >
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            className={`absolute inset-0 ${
                              plan.id === "pro" ? "bg-amber-500/6" :
                              plan.id === "advanced" ? "bg-blue-500/6" :
                              "bg-foreground/5"
                            }`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          />
                        )}
                      </AnimatePresence>

                      {plan.badge && (
                        <span className={`relative z-10 absolute -top-px right-3 rounded-b-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
                          plan.id === "pro" ? "bg-amber-500" : "bg-blue-500"
                        }`}>
                          {plan.badge}
                        </span>
                      )}

                      <div className="relative z-10">
                        <p className="font-bold text-sm">{plan.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{plan.tagline}</p>
                      </div>

                      <div className="relative z-10">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold">{plan.price}</span>
                          <span className="text-xs text-muted-foreground">{plan.period}</span>
                        </div>
                        {"annualPrice" in plan && plan.annualPrice && (
                          <p className="text-[11px] text-blue-500 font-medium mt-0.5">
                            or {plan.annualPrice} — save ₹2,389
                          </p>
                        )}
                      </div>

                      <ul className="relative z-10 space-y-1.5 w-full">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs">
                            <Check className="h-3 w-3 shrink-0 mt-0.5 text-emerald-500" />
                            <span className="text-muted-foreground leading-snug">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer CTA */}
              <div className="px-6 pb-6 space-y-3">
                <Button
                  size="lg"
                  className={`w-full gap-2 ${
                    selected === "pro" ? "bg-amber-500 hover:bg-amber-600 text-white" :
                    selected === "advanced" ? "bg-blue-600 hover:bg-blue-700 text-white" :
                    ""
                  }`}
                  onClick={() => {
                    // TODO: open payment flow
                  }}
                >
                  <Zap className="h-4 w-4" />
                  Get {selectedPlan.name} — {selectedPlan.price}/mo
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Pay via UPI · Manual activation within 24 hours · Cancel anytime
                </p>
                <p className="text-center text-[11px] text-muted-foreground/50">
                  Plans shown for demo purposes. Payments not yet active.
                </p>
                <div className="flex items-center justify-center gap-1 pt-1">
                  {[
                    { to: "/privacy", label: "Privacy Policy" },
                    { to: "/terms", label: "Terms" },
                    { to: "/refund", label: "Refund Policy" },
                  ].map(({ to, label }, i) => (
                    <span key={to} className="flex items-center gap-1">
                      {i !== 0 && <span className="text-muted-foreground/30">·</span>}
                      <Link
                        to={to as any}
                        onClick={onClose}
                        className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      >
                        {label}
                      </Link>
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
