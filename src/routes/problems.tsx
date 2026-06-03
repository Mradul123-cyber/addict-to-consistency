import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { SEED_TRACKS } from "@/lib/seed";
import type { Subject, Difficulty, ExamPattern } from "@/types/questions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { toast } from "sonner";
import {
  BookOpen, Timer, Zap, ChevronRight, Lightbulb,
  CheckCircle2, BarChart3, Clock, Hash, ChevronDown, X,
} from "lucide-react";

// All chapters grouped by subject for the sheet
const ALL_CHAPTER_GROUPS = [
  { label: "Physics", subject: "physics" as Subject, chapters: SEED_TRACKS.find(t => t.id === "physics")?.chapters ?? [] },
  { label: "Physical Chemistry", subject: "chemistry" as Subject, chapters: SEED_TRACKS.find(t => t.id === "pchem")?.chapters ?? [] },
  { label: "Organic Chemistry", subject: "chemistry" as Subject, chapters: SEED_TRACKS.find(t => t.id === "ochem")?.chapters ?? [] },
  { label: "Inorganic Chemistry", subject: "chemistry" as Subject, chapters: SEED_TRACKS.find(t => t.id === "ichem")?.chapters ?? [] },
  { label: "Mathematics", subject: "maths" as Subject, chapters: SEED_TRACKS.find(t => t.id === "maths")?.chapters ?? [] },
];

const ALL_CHAPTERS_FLAT = ALL_CHAPTER_GROUPS.flatMap(g => g.chapters.map(ch => ({ ...ch, subject: g.subject, groupLabel: g.label })));

export const Route = createFileRoute("/problems")({
  component: () => { const navigate = useNavigate(); navigate({ to: "/" }); return null; },
});

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as any, delay: i * 0.07 },
  }),
};

const spring = { type: "spring" as const, stiffness: 420, damping: 28 };

// ── Static data ───────────────────────────────────────────────────────────────

const SUBJECTS: {
  value: Subject;
  label: string;
  activeClass: string;
  dotInactive: string;
}[] = [
  {
    value: "physics",
    label: "Physics",
    activeClass: "bg-sky-500 text-white border-sky-500",
    dotInactive: "bg-sky-500",
  },
  {
    value: "chemistry",
    label: "Chemistry",
    activeClass: "bg-emerald-500 text-white border-emerald-500",
    dotInactive: "bg-emerald-500",
  },
  {
    value: "maths",
    label: "Maths",
    activeClass: "bg-amber-400 text-amber-950 border-amber-400",
    dotInactive: "bg-amber-400",
  },
];

const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
  { value: 1, label: "Easy", color: "text-green-600 dark:text-green-400" },
  { value: 2, label: "Moderate", color: "text-blue-600 dark:text-blue-400" },
  { value: 3, label: "Mains", color: "text-amber-600 dark:text-amber-400" },
  { value: 4, label: "Hard", color: "text-orange-600 dark:text-orange-400" },
  { value: 5, label: "Advanced", color: "text-red-600 dark:text-red-400" },
];

const MODE_FEATURES = {
  practice: [
    { icon: Lightbulb, text: "Progressive hints (3 levels)" },
    { icon: CheckCircle2, text: "Instant correct / incorrect feedback" },
    { icon: BookOpen, text: "Full solution after each answer" },
    { icon: BarChart3, text: "Attempts saved for analysis" },
  ],
  test: [
    { icon: Timer, text: "Countdown timer with auto-submit" },
    { icon: Hash, text: "+4 / −1 JEE-style scoring" },
    { icon: BarChart3, text: "Score card with subject breakdown" },
    { icon: BookOpen, text: "Solutions unlocked after submit" },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

function ProblemsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"practice" | "test">("practice");
  const [subject, setSubject] = useState<Subject>("physics");
  const [chapterIds, setChapterIds] = useState<string[]>([]);
  const [chapterSearch, setChapterSearch] = useState("");
  const [chapterSheetOpen, setChapterSheetOpen] = useState(false);
  const [shakeItemId, setShakeItemId] = useState<string | null>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [examPattern, setExamPattern] = useState<ExamPattern>("both");
  const [questionCount, setQuestionCount] = useState(20);
  const [testType, setTestType] = useState<"chapter" | "subject" | "mains-mock">("chapter");
  const [timeLimit, setTimeLimit] = useState(60);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  if (!user) return <Navigate to="/" />;

  // Max chapters based on question count
  const maxChapters = questionCount === 10 ? 1 : questionCount === 20 ? 2 : 3;

  // Filtered chapters for search
  const filteredGroups = useMemo(() => {
    const q = chapterSearch.toLowerCase();
    if (!q) return ALL_CHAPTER_GROUPS;
    return ALL_CHAPTER_GROUPS.map(g => ({
      ...g,
      chapters: g.chapters.filter(ch => ch.name.toLowerCase().includes(q)),
    })).filter(g => g.chapters.length > 0);
  }, [chapterSearch]);

  const toggleChapter = (id: string) => {
    if (!chapterIds.includes(id) && chapterIds.length >= maxChapters) {
      // Shake the specific item + show toast
      setShakeItemId(id);
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShakeItemId(null), 600);
      toast.error(`Max ${maxChapters} chapter${maxChapters > 1 ? "s" : ""} for ${questionCount} questions`, {
        description: "Remove a selected chapter first.",
        duration: 3000,
      });
      return;
    }
    setChapterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setAvailableCount(null);
  };

  const handleSetQuestionCount = (n: number) => {
    const newMax = n === 10 ? 1 : n === 20 ? 2 : 3;
    if (chapterIds.length > newMax) {
      toast.error(`Remove ${chapterIds.length - newMax} chapter${chapterIds.length - newMax > 1 ? "s" : ""} first`, {
        description: `Max ${newMax} chapter${newMax > 1 ? "s" : ""} allowed for ${n} questions.`,
        duration: 4000,
      });
      return; // block the switch
    }
    setQuestionCount(n);
    setAvailableCount(null);
  };

  const toggleDifficulty = (d: Difficulty) => {
    setDifficulties((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    setAvailableCount(null);
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const snap = await getDocs(
        query(collection(db, "questions"), where("reviewStatus", "==", "approved"))
      );
      let count = 0;
      snap.forEach((doc) => {
        const d = doc.data();
        if (chapterIds.length > 0) {
          if (!chapterIds.includes(d.chapterId)) return;
        } else {
          if (d.subject !== subject) return;
        }
        if (difficulties.length && !difficulties.includes(d.difficulty)) return;
        if (examPattern !== "both" && d.examPattern !== examPattern && d.examPattern !== "both") return;
        count++;
      });
      setAvailableCount(count);
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  const handleStart = () => {
    const id = Date.now().toString();
    const config = {
      subject,
      chapterIds: chapterIds.length ? chapterIds : null,
      difficulties: difficulties.length ? difficulties : null,
      examPattern: examPattern === "both" ? null : examPattern,
    };
    if (mode === "practice") {
      sessionStorage.setItem(`practice-${id}`, JSON.stringify({ ...config, questionCount }));
      navigate({ to: "/practice/$sessionId", params: { sessionId: id } });
    } else {
      const timeLimitMin = testType === "mains-mock" ? 180 : timeLimit;
      const maxQ = testType === "mains-mock" ? 90 : questionCount;
      sessionStorage.setItem(`test-${id}`, JSON.stringify({ ...config, testType, timeLimit: timeLimitMin, maxQ }));
      navigate({ to: "/test/$testId", params: { testId: id } });
    }
  };

  const selectedSubject = SUBJECTS.find((s) => s.value === subject)!;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
      {/* ── Page header ── */}
      <motion.div
        className="mb-6"
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Problems</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Practice topic-wise or attempt a timed JEE test
        </p>
      </motion.div>

      {/* ── Mode toggle with sliding pill ── */}
      <motion.div
        className="mb-6 md:max-w-sm"
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <LayoutGroup id="mode-toggle">
          <div className="relative flex rounded-xl border bg-muted/30 p-1 gap-1">
            {(["practice", "test"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors z-10"
              >
                {mode === m && (
                  <motion.div
                    layoutId="mode-pill"
                    className="absolute inset-0 rounded-lg bg-foreground shadow-sm"
                    transition={spring}
                  />
                )}
                <span
                  className={`relative flex items-center gap-1.5 transition-colors duration-200 ${
                    mode === m ? "text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "practice" ? (
                    <BookOpen className="h-3.5 w-3.5" />
                  ) : (
                    <Timer className="h-3.5 w-3.5" />
                  )}
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </span>
              </button>
            ))}
          </div>
        </LayoutGroup>
      </motion.div>

      {/* ── Main grid ── */}
      <div className="grid gap-6 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px]">
        {/* Left: filter card */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardTitle className="text-base">
                    {mode === "practice" ? "Practice Configuration" : "Test Configuration"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {mode === "practice"
                      ? "Select filters for your practice session"
                      : "Configure your timed test parameters"}
                  </CardDescription>
                </motion.div>
              </AnimatePresence>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Subject */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Subject
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {SUBJECTS.map((s) => {
                    const isActive = subject === s.value;
                    return (
                      <motion.button
                        key={s.value}
                        onClick={() => { setSubject(s.value); setAvailableCount(null); }}
                        whileHover={{ y: -2, transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                          isActive
                            ? s.activeClass
                            : "border-border bg-muted/30 text-muted-foreground hover:border-foreground/20 hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        {s.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Chapter + Exam Pattern */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Chapters{" "}
                    <span className="normal-case font-normal text-muted-foreground/60">
                      (max {maxChapters} for {questionCount}Q)
                    </span>
                  </Label>
                  <button
                    onClick={() => setChapterSheetOpen(true)}
                    className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <span className={chapterIds.length === 0 ? "text-muted-foreground" : "font-medium"}>
                      {chapterIds.length === 0
                        ? `All ${subject} chapters`
                        : chapterIds.length === 1
                        ? ALL_CHAPTERS_FLAT.find(c => c.id === chapterIds[0])?.name
                        : `${chapterIds.length} chapters selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {chapterIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {chapterIds.map(id => {
                        const ch = ALL_CHAPTERS_FLAT.find(c => c.id === id);
                        return (
                          <span key={id} className="flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs">
                            {ch?.name ?? id}
                            <button onClick={() => { setChapterIds(p => p.filter(x => x !== id)); setAvailableCount(null); }}>
                              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Exam Pattern
                  </Label>
                  <Select value={examPattern} onValueChange={(v) => setExamPattern(v as ExamPattern)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">All (Mains + Advanced)</SelectItem>
                      <SelectItem value="mains">JEE Mains only</SelectItem>
                      <SelectItem value="advanced">JEE Advanced only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Difficulty{" "}
                  <span className="normal-case font-normal text-muted-foreground/60">
                    (any if none selected)
                  </span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map((d) => (
                    <motion.button
                      key={d.value}
                      onClick={() => toggleDifficulty(d.value)}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      transition={spring}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        difficulties.includes(d.value)
                          ? "bg-foreground text-background border-foreground"
                          : `${d.color} border-border hover:border-foreground/40`
                      }`}
                    >
                      {d.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Mode-specific options with animated transition */}
              <AnimatePresence mode="wait">
                {mode === "practice" ? (
                  <motion.div
                    key="practice-opts"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-1">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Questions per session
                      </Label>
                      <div className="flex gap-2">
                        {[10, 20, 30].map((n) => (
                          <motion.button
                            key={n}
                            onClick={() => handleSetQuestionCount(n)}
                            whileTap={{ scale: 0.95 }}
                            transition={spring}
                            className={`relative flex-1 rounded-md border py-2 text-sm font-medium transition-colors overflow-hidden ${
                              questionCount === n
                                ? "bg-foreground text-background border-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {questionCount === n && (
                              <motion.div
                                layoutId="q-count-pill"
                                className="absolute inset-0 bg-foreground"
                                transition={spring}
                              />
                            )}
                            <span className="relative">{n}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="test-opts"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 pt-1">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Test Type
                        </Label>
                        <Select value={testType} onValueChange={(v) => setTestType(v as typeof testType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chapter">Chapter Test</SelectItem>
                            <SelectItem value="subject">Full Subject Test</SelectItem>
                            <SelectItem value="mains-mock">JEE Mains Mock (90Q / 3hr)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <AnimatePresence>
                        {testType !== "mains-mock" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="grid gap-4 sm:grid-cols-2 pt-1">
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Questions
                                </Label>
                                <div className="flex gap-1.5">
                                  {[10, 20, 30, 50].map((n) => (
                                    <motion.button
                                      key={n}
                                      onClick={() => handleSetQuestionCount(n)}
                                      whileTap={{ scale: 0.95 }}
                                      transition={spring}
                                      className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                                        questionCount === n
                                          ? "bg-foreground text-background border-foreground"
                                          : "text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      {n}
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Time Limit
                                </Label>
                                <div className="flex gap-1.5">
                                  {[30, 60, 90, 120].map((t) => (
                                    <motion.button
                                      key={t}
                                      onClick={() => setTimeLimit(t)}
                                      whileTap={{ scale: 0.95 }}
                                      transition={spring}
                                      className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                                        timeLimit === t
                                          ? "bg-foreground text-background border-foreground"
                                          : "text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      {t}m
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: summary + start (desktop) */}
        <motion.div
          className="hidden md:flex flex-col gap-4"
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          {/* Mode info card */}
          <Card className="border-dashed overflow-hidden">
            <CardContent className="pt-5 space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        mode === "practice" ? "bg-blue-500/10" : "bg-red-500/10"
                      }`}
                      animate={{ rotate: [0, -8, 8, 0] }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      {mode === "practice" ? (
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Timer className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </motion.div>
                    <div>
                      <p className="font-semibold capitalize">{mode} Mode</p>
                      <p className="text-xs text-muted-foreground">
                        {mode === "practice" ? "No time pressure" : "+4 / −1 marking"}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {MODE_FEATURES[mode].map(({ icon: Icon, text }, i) => (
                      <motion.li
                        key={text}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.05 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
                        {text}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Session summary card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Session Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                {
                  label: "Subject",
                  value: (
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${selectedSubject.dotInactive}`} />
                      <span className="font-medium capitalize">{subject}</span>
                    </div>
                  ),
                  key: subject,
                },
                {
                  label: "Chapters",
                  value: (
                    <span className="font-medium text-right">
                      {chapterIds.length === 0
                        ? `All ${subject}`
                        : chapterIds.length === 1
                        ? ALL_CHAPTERS_FLAT.find(c => c.id === chapterIds[0])?.name
                        : `${chapterIds.length} selected`}
                    </span>
                  ),
                  key: chapterIds.join(",") || "_all",
                },
                {
                  label: "Difficulty",
                  value: (
                    <span className="font-medium">
                      {difficulties.length === 0
                        ? "Any"
                        : difficulties
                            .sort()
                            .map((d) => DIFFICULTIES.find((x) => x.value === d)?.label)
                            .join(", ")}
                    </span>
                  ),
                  key: difficulties.join(",") || "any",
                },
                ...(mode === "practice"
                  ? [{ label: "Questions", value: <span className="font-medium">{questionCount}</span>, key: String(questionCount) }]
                  : [
                      { label: "Type", value: <span className="font-medium capitalize">{testType.replace("-", " ")}</span>, key: testType },
                      {
                        label: "Duration",
                        value: (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">
                              {testType === "mains-mock" ? "3 hrs" : `${timeLimit} min`}
                            </span>
                          </div>
                        ),
                        key: String(timeLimit),
                      },
                    ]),
              ].map(({ label, value, key }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                    >
                      {value}
                    </motion.div>
                  </AnimatePresence>
                </div>
              ))}

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Available</span>
                <AnimatePresence mode="wait">
                  {availableCount === null ? (
                    <motion.div key="check-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCheck} disabled={checking}>
                        {checking ? "Checking…" : "Check →"}
                      </Button>
                    </motion.div>
                  ) : availableCount === 0 ? (
                    <motion.span
                      key="none"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={spring}
                      className="text-xs font-medium text-destructive"
                    >
                      None found
                    </motion.span>
                  ) : (
                    <motion.div
                      key="count"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={spring}
                    >
                      <Badge variant="secondary" className="font-mono">
                        {availableCount}
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          {/* Start button with shimmer */}
          <motion.div
            className="relative overflow-hidden rounded-lg"
            whileHover="hover"
            whileTap={{ scale: 0.98 }}
          >
            <Button onClick={handleStart} size="lg" className="w-full gap-2 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                initial={{ x: "-100%" }}
                variants={{ hover: { x: "200%", transition: { duration: 0.55, ease: "easeInOut" } } }}
              />
              <AnimatePresence mode="wait">
                <motion.span
                  key={mode}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  {mode === "practice" ? <Zap className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
                  {mode === "practice" ? "Start Practice" : "Start Test"}
                </motion.span>
              </AnimatePresence>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Mobile: check + start ── */}
      <motion.div
        className="mt-4 space-y-3 md:hidden"
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <p className="flex-1 text-sm">
            <AnimatePresence mode="wait">
              {availableCount === null ? (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted-foreground">
                  Check how many questions match
                </motion.span>
              ) : availableCount === 0 ? (
                <motion.span key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium text-destructive">
                  No approved questions found
                </motion.span>
              ) : (
                <motion.span key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium">
                  {availableCount} question{availableCount !== 1 ? "s" : ""} available
                </motion.span>
              )}
            </AnimatePresence>
          </p>
          <Button size="sm" variant="outline" onClick={handleCheck} disabled={checking}>
            {checking ? "Checking…" : "Check"}
          </Button>
        </div>

        <motion.div whileTap={{ scale: 0.98 }} className="relative overflow-hidden rounded-lg">
          <Button onClick={handleStart} size="lg" className="w-full gap-2 relative overflow-hidden">
            {mode === "practice" ? <Zap className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
            {mode === "practice" ? "Start Practice" : "Start Test"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>

      {/* ── Chapter selection sheet ── */}
      <Sheet open={chapterSheetOpen} onOpenChange={(open) => { setChapterSheetOpen(open); if (!open) setChapterSearch(""); }}>
        <SheetContent side="bottom" className="h-screen flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="shrink-0 px-6 pt-8 pb-4 text-center">
            <SheetTitle className="text-2xl font-bold md:text-3xl">
              {subject === "physics" ? "Physics" : subject === "maths" ? "Mathematics" : "Chemistry"} Chapters
            </SheetTitle>
            <SheetDescription className="mt-1 text-sm">
              Select up to {maxChapters} chapter{maxChapters > 1 ? "s" : ""} to focus your practice · {chapterIds.length}/{maxChapters} selected
            </SheetDescription>

            {/* Search */}
            <div className="mt-4">
              <Input
                placeholder="Search chapters…"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                className="mx-auto max-w-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Chapter grid */}
          <ScrollArea className="flex-1 px-4 md:px-8">
            <div className="pb-6">
              {filteredGroups.map((group) => (
                <div key={group.label} className="mb-6">
                  {filteredGroups.length > 1 && (
                    <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {group.chapters.map((ch) => {
                      const isChecked = chapterIds.includes(ch.id);
                      const isOverLimit = !isChecked && chapterIds.length >= maxChapters;
                      const isShaking = shakeItemId === ch.id;
                      return (
                        <motion.div
                          key={ch.id}
                          animate={isShaking ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
                          transition={{ duration: 0.35 }}
                          onClick={() => toggleChapter(ch.id)}
                          className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition-all duration-150 ${
                            isChecked
                              ? "border-foreground/40 bg-foreground/8 ring-1 ring-foreground/20"
                              : isShaking
                              ? "border-red-500/50 bg-red-500/8"
                              : isOverLimit
                              ? "border-border bg-muted/20 opacity-40"
                              : "border-border bg-muted/30 hover:bg-muted/60 hover:border-foreground/20"
                          }`}
                        >
                          <span className={`text-sm font-medium leading-snug ${
                            isShaking ? "text-red-600 dark:text-red-400" : ""
                          }`}>
                            {ch.name}
                          </span>
                          <Checkbox
                            checked={isChecked}
                            className={`ml-2 shrink-0 ${isShaking ? "border-red-500" : ""}`}
                            onCheckedChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No chapters match "{chapterSearch}"
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Bottom action bar */}
          <div className="shrink-0 border-t bg-background px-6 py-4">
            <div className="mx-auto flex max-w-sm items-center gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => { setChapterSheetOpen(false); setChapterSearch(""); }}
              >
                Back
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => {
                  if (chapterIds.length === 0) {
                    toast.error("Select at least one chapter");
                    return;
                  }
                  setChapterSheetOpen(false);
                  setChapterSearch("");
                }}
              >
                {chapterIds.length === 0
                  ? "Select a chapter"
                  : `Done (${chapterIds.length} selected)`}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {chapterIds.length > 0 && (
              <button
                onClick={() => { setChapterIds([]); setAvailableCount(null); }}
                className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
