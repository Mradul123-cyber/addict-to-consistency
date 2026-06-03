import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2, GraduationCap, Sparkles, Mail, RefreshCw, ChevronRight } from "lucide-react";
// Loader2 used in JeeSetupStep and OnboardingGate loading state
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DAILY_GOAL_OPTIONS,
  DEFAULT_DAILY_GOAL_MINUTES,
  MAX_DAILY_GOAL_MINUTES,
  MIN_DAILY_GOAL_MINUTES,
  JEE_TARGET_YEARS,
  type JeeTargetYear,
  type AppMode,
} from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const cardBase = "rounded-xl border border-border/80 bg-card/80 shadow-2xl backdrop-blur-xl";

// ── Email verification screen ─────────────────────────────────────────────────
function EmailVerificationScreen({ email, onContinue }: { email: string; onContinue: () => void }) {
  const { resendVerificationEmail } = useAuth();
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    try { await resendVerificationEmail(); setSent(true); } catch { /* ignore */ }
  };

  const handleContinue = async () => {
    setChecking(true);
    try {
      const { getAuth } = await import("firebase/auth");
      await getAuth().currentUser?.reload();
      if (getAuth().currentUser?.emailVerified) {
        onContinue();
      } else {
        toast.error("Email not verified yet. Please check your inbox and click the link.");
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className={`${cardBase} w-full max-w-md p-5 sm:p-8 space-y-6 text-center`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 mx-auto">
        <Mail className="h-7 w-7 text-indigo-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to
        </p>
        <p className="text-sm font-semibold">{email}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Click the link in the email to verify your account, then continue.
      </p>
      <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3 text-left">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Can't find the email?</span> Check your spam or junk folder — verification emails sometimes get filtered automatically. If it's there, mark it as "Not spam" to ensure future emails arrive in your inbox.
        </p>
      </div>
      <div className="space-y-2">
        <Button className="w-full gap-2" onClick={handleContinue} disabled={checking}>
          {checking && <Loader2 className="h-4 w-4 animate-spin" />}
          {checking ? "Checking..." : "I have verified, continue"}
        </Button>
        <button
          onClick={handleResend}
          disabled={sent}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="h-3 w-3" />
          {sent ? "Email sent" : "Resend verification email"}
        </button>
      </div>
    </motion.div>
  );
}

// ── Shared background ─────────────────────────────────────────────────────────
function Background() {
  return (
    <>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />
      <div className="absolute top-1/4 left-1/4 -z-10 h-[50vw] w-[50vw] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[50vw] w-[50vw] rounded-full bg-violet-500/10 blur-[120px]" />
    </>
  );
}

// ── Step 1: Mode selection ────────────────────────────────────────────────────
function ModeSelectionStep({ onSelect }: { onSelect: (mode: AppMode) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-2xl space-y-8"
    >
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Matrix</h1>
        <p className="text-sm text-muted-foreground">How will you be using Matrix?</p>
      </div>

      {/* Mobile: side-by-side compact cards */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {[
          { mode: "jee" as const, icon: <GraduationCap className="h-6 w-6 text-indigo-400" />, label: "JEE Prep", color: "indigo" },
          { mode: "professional" as const, icon: <Sparkles className="h-6 w-6 text-violet-400" />, label: "General", color: "violet" },
        ].map(({ mode, icon, label, color }) => (
          <motion.button
            key={mode}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(mode)}
            className={`group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border p-5 text-center transition-all duration-200 active:scale-95
              ${color === "indigo"
                ? "border-indigo-200 bg-white/90 dark:border-indigo-500/25 dark:bg-indigo-950/30"
                : "border-violet-200 bg-white/90 dark:border-violet-500/25 dark:bg-violet-950/30"
              }`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1
              ${color === "indigo" ? "bg-indigo-500/10 ring-indigo-500/20" : "bg-violet-500/10 ring-violet-500/20"}`}>
              {icon}
            </div>
            <span className="text-sm font-bold">{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Desktop: full cards */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-5">
        {/* JEE card */}
        <motion.button
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={() => onSelect("jee")}
          className="group relative flex flex-col items-start gap-5 overflow-hidden rounded-2xl border border-indigo-200 bg-white/90 shadow-lg p-7 text-left transition-all duration-300 hover:border-indigo-400 hover:shadow-[0_4px_32px_rgba(99,102,241,0.15)] dark:border-indigo-500/25 dark:bg-indigo-950/30 dark:backdrop-blur-2xl dark:shadow-2xl dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/40 dark:hover:shadow-[0_0_56px_rgba(99,102,241,0.22)]"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
          <div className="absolute -top-10 -left-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl hidden dark:block" />
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-indigo-500/8 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-indigo-500/15" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20 transition-all duration-300 group-hover:bg-indigo-500/15 group-hover:ring-indigo-500/40">
            <GraduationCap className="h-7 w-7 text-indigo-400" />
          </div>
          <div className="relative">
            <h2 className="text-xl font-bold">JEE Preparation</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">Full study tracker with daily goals, matrix progress, notes, and your AI teaching board.</p>
          </div>
          <div className="relative flex flex-wrap gap-2 mt-auto">
            {["Dashboard", "Focus", "Matrix", "Studio", "Notes"].map(t => (
              <span key={t} className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-600/70 transition-colors duration-200 group-hover:border-indigo-300 group-hover:text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300/70 dark:group-hover:border-indigo-500/40 dark:group-hover:text-indigo-300">{t}</span>
            ))}
          </div>
          <ChevronRight className="absolute bottom-6 right-6 h-4 w-4 text-indigo-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </motion.button>

        {/* General learning card */}
        <motion.button
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={() => onSelect("professional")}
          className="group relative flex flex-col items-start gap-5 overflow-hidden rounded-2xl border border-violet-200 bg-white/90 shadow-lg p-7 text-left transition-all duration-300 hover:border-violet-400 hover:shadow-[0_4px_32px_rgba(139,92,246,0.15)] dark:border-violet-500/25 dark:bg-violet-950/30 dark:backdrop-blur-2xl dark:shadow-2xl dark:hover:border-violet-500/50 dark:hover:bg-violet-950/40 dark:hover:shadow-[0_0_56px_rgba(139,92,246,0.22)]"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent" />
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl hidden dark:block" />
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-violet-500/8 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-violet-500/15" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 transition-all duration-300 group-hover:bg-violet-500/15 group-hover:ring-violet-500/40">
            <Sparkles className="h-7 w-7 text-violet-400" />
          </div>
          <div className="relative">
            <h2 className="text-xl font-bold">General Learning</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">Learn any subject with an interactive AI teaching board.</p>
          </div>
          <div className="relative flex flex-wrap gap-2 mt-auto">
            {["Studio", "Focus", "Airgap"].map(t => (
              <span key={t} className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs text-violet-600/70 transition-colors duration-200 group-hover:border-violet-300 group-hover:text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300/70 dark:group-hover:border-violet-500/40 dark:group-hover:text-violet-300">{t}</span>
            ))}
          </div>
          <ChevronRight className="absolute bottom-6 right-6 h-4 w-4 text-violet-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </motion.button>
      </div>

    </motion.div>
  );
}

// ── Step 2: JEE setup ─────────────────────────────────────────────────────────
function JeeSetupStep({ onBack, onConfirm }: { onBack: () => void; onConfirm: (year: JeeTargetYear, goal: number) => Promise<void> }) {
  const [selectedYear, setSelectedYear] = useState<JeeTargetYear>(2027);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(DEFAULT_DAILY_GOAL_MINUTES);
  const [dailyGoalMode, setDailyGoalMode] = useState("150");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (dailyGoalMinutes < MIN_DAILY_GOAL_MINUTES || dailyGoalMinutes > MAX_DAILY_GOAL_MINUTES) {
      toast.error(`Daily goal must be between ${MIN_DAILY_GOAL_MINUTES} and ${MAX_DAILY_GOAL_MINUTES} minutes.`);
      return;
    }
    setSaving(true);
    try {
      await onConfirm(selectedYear, dailyGoalMinutes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className="relative w-full max-w-md overflow-hidden rounded-2xl border border-indigo-200 bg-white/90 shadow-lg p-5 sm:p-8 space-y-6 dark:border-indigo-500/25 dark:bg-indigo-950/30 dark:backdrop-blur-2xl dark:shadow-2xl"
    >
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
      {/* Radial glow spot — dark mode only */}
      <div className="absolute -top-10 -left-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none hidden dark:block" />

      <div className="relative space-y-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20 mx-auto mb-3">
          <GraduationCap className="h-7 w-7 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">JEE Preparation</h1>
        <p className="text-sm text-muted-foreground">
          Set your target year and daily focus goal.
        </p>
      </div>

      <div className="relative space-y-2">
        <Label htmlFor="jee-year">When is your JEE?</Label>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v) as JeeTargetYear)} disabled={saving}>
          <SelectTrigger id="jee-year" className="w-full">
            <SelectValue placeholder="Select exam year" />
          </SelectTrigger>
          <SelectContent>
            {JEE_TARGET_YEARS.map((year) => (
              <SelectItem key={year} value={String(year)}>JEE {year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Countdown targets 20 January {selectedYear}.</p>
      </div>

      <div className="relative space-y-2">
        <Label htmlFor="daily-goal">Daily focus goal</Label>
        <Select value={dailyGoalMode} onValueChange={(v) => { setDailyGoalMode(v); if (v !== "custom") setDailyGoalMinutes(Number(v)); }} disabled={saving}>
          <SelectTrigger id="daily-goal" className="w-full">
            <SelectValue placeholder="Select daily goal" />
          </SelectTrigger>
          <SelectContent>
            {DAILY_GOAL_OPTIONS.map((m) => <SelectItem key={m} value={String(m)}>{m} minutes/day</SelectItem>)}
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {dailyGoalMode === "custom" && (
          <Input type="number" min={MIN_DAILY_GOAL_MINUTES} max={MAX_DAILY_GOAL_MINUTES}
            value={dailyGoalMinutes} onChange={(e) => setDailyGoalMinutes(Number(e.target.value))} disabled={saving} />
        )}
      </div>

      <div className="relative flex gap-3">
        <Button variant="outline" className="flex-1 dark:border-indigo-500/20 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/5" onClick={onBack} disabled={saving}>Back</Button>
        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_28px_rgba(99,102,241,0.4)]" onClick={() => void handleConfirm()} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Let's go →"}
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function OnboardingModal() {
  const { saveProfile } = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState<"mode" | "jee">("mode");
  const [saving, setSaving] = useState(false);

  const handleProfessional = async () => {
    setSaving(true);
    try {
      await saveProfile({ targetYear: 2027, dailyGoalMinutes: DEFAULT_DAILY_GOAL_MINUTES, mode: "professional" });
      toast.success("Welcome to Matrix.");
    } catch {
      toast.error("Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleJeeConfirm = async (targetYear: JeeTargetYear, dailyGoalMinutes: number) => {
    try {
      await saveProfile({ targetYear, dailyGoalMinutes, mode: "jee" });
      toast.success(`JEE ${targetYear} countdown ready.`);
      navigate({ to: "/" });
    } catch {
      toast.error("Could not save profile. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="flex min-h-full items-center justify-center px-4 py-8">
        <Background />
        <AnimatePresence mode="wait">
          {step === "mode" ? (
            <ModeSelectionStep
              key="mode"
              onSelect={(mode) => {
                if (mode === "professional") void handleProfessional();
                else setStep("jee");
              }}
            />
          ) : (
            <JeeSetupStep
              key="jee"
              onBack={() => setStep("mode")}
              onConfirm={handleJeeConfirm}
            />
          )}
        </AnimatePresence>
        {saving && (
          <div className="fixed inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

const PUBLIC_ROUTES = ["/privacy"];

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { profile, loading: profileLoading } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const [verificationDone, setVerificationDone] = useState(false);

  if (PUBLIC_ROUTES.includes(pathname)) return <>{children}</>;

  const isEmailUser = user?.providerData?.[0]?.providerId === "password";
  const needsVerification = isEmailUser && !user?.emailVerified && !verificationDone;

  if (profileLoading || authLoading) return null;

  if (needsVerification) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4">
        <Background />
        <AnimatePresence mode="wait">
          <EmailVerificationScreen
            key="verify"
            email={user.email ?? ""}
            onContinue={() => setVerificationDone(true)}
          />
        </AnimatePresence>
      </div>
    );
  }

  if (!profile) return <OnboardingModal />;

  return <>{children}</>;
}
