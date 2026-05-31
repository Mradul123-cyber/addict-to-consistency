import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Question, Difficulty } from "@/types/questions";
import { LatexText } from "@/components/problems/LatexText";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Timer,
  Grid3x3,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Flag,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/test/$testId")({
  component: () => { const navigate = useNavigate(); navigate({ to: "/" }); return null; },
});

interface TestConfig {
  subject: string;
  chapterIds: string[] | null;
  difficulties: Difficulty[] | null;
  examPattern: string | null;
  testType: "chapter" | "subject" | "mains-mock";
  timeLimit: number;
  maxQ: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STATUS_COLOR: Record<string, string> = {
  answered: "bg-green-500 text-white border-green-600",
  marked: "bg-amber-400 text-white border-amber-500",
  visited: "bg-red-400 text-white border-red-500",
  unvisited: "bg-muted text-muted-foreground border-border",
};

function TestSession() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();

  const [config, setConfig] = useState<TestConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [numericalInputs, setNumericalInputs] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  const [timeLeft, setTimeLeft] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const submitted = useRef(false);

  // Load config
  useEffect(() => {
    const raw = sessionStorage.getItem(`test-${testId}`);
    if (!raw) { setError("Test session not found."); setLoading(false); return; }
    const cfg: TestConfig = JSON.parse(raw);
    setConfig(cfg);
    setTimeLeft(cfg.timeLimit * 60);
  }, [testId]);

  // Fetch questions
  useEffect(() => {
    if (!config) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "questions"), where("reviewStatus", "==", "approved"))
        );
        const all: Question[] = [];
        snap.forEach((doc) => {
          const d = { id: doc.id, ...doc.data() } as Question;
          if (config.chapterIds?.length) {
            if (!config.chapterIds.includes(d.chapterId)) return;
          } else {
            if (d.subject !== config.subject) return;
          }
          if (config.difficulties?.length && !config.difficulties.includes(d.difficulty)) return;
          all.push(d);
        });
        setQuestions(shuffle(all).slice(0, config.maxQ));
      } catch (e: any) {
        setError("Failed to load questions: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [config]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || loading || questions.length === 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          if (!submitted.current) {
            toast.info("Time's up! Submitting your test.");
            doSubmit();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, loading, questions.length]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    setVisited((prev) => new Set([...prev, idx]));
    setPaletteOpen(false);
  };

  const toggleMark = (qId: string) => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      next.has(qId) ? next.delete(qId) : next.add(qId);
      return next;
    });
  };

  const handleMCQSelect = (q: Question, optId: string) => {
    if (q.type === "mcq-multiple") {
      setAnswers((prev) => {
        const cur = (prev[q.id] as string[]) ?? [];
        return { ...prev, [q.id]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
      });
    } else {
      setAnswers((prev) => ({ ...prev, [q.id]: optId }));
    }
  };

  const doSubmit = () => {
    if (submitted.current) return;
    submitted.current = true;
    const results = {
      testId,
      config,
      questions: questions.map((q) => ({
        id: q.id,
        subject: q.subject,
        chapterId: q.chapterId,
        difficulty: q.difficulty,
        type: q.type,
        statement: q.statement,
        options: q.options,
        correctAnswer: q.correctAnswer,
        numericalAnswer: q.numericalAnswer,
        tolerance: q.tolerance,
        solution: q.solution,
        answer:
          q.type === "numerical" || q.type === "integer"
            ? (numericalInputs[q.id] ?? null)
            : (answers[q.id] ?? null),
      })),
      submittedAt: Date.now(),
      timeTakenSeconds: config ? config.timeLimit * 60 - timeLeft : 0,
    };
    sessionStorage.setItem(`test-results-${testId}`, JSON.stringify(results));
    navigate({ to: "/test-results/$testId", params: { testId } });
  };

  const getStatus = (idx: number, qId: string) => {
    const hasAnswer = answers[qId] || numericalInputs[qId];
    if (markedForReview.has(qId)) return "marked";
    if (hasAnswer) return "answered";
    if (visited.has(idx)) return "visited";
    return "unvisited";
  };

  const answeredCount =
    Object.keys(answers).length +
    Object.keys(numericalInputs).filter((k) => numericalInputs[k] !== "").length;

  // ── Loading / Error ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">{error ?? "No approved questions found for these filters."}</p>
        <Button asChild variant="outline">
          <Link to="/problems">Back to Problems</Link>
        </Button>
      </div>
    );
  }

  const question = questions[currentIndex];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <div
        className={`flex shrink-0 items-center justify-between border-b px-4 py-2.5 ${
          timeLeft > 0 && timeLeft <= 300 ? "bg-red-500/10" : "bg-card"
        }`}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/problems" })}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Exit</span>
        </Button>

        <motion.div
          className={`flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums ${
            timeLeft <= 300 ? "text-red-600 dark:text-red-400" : ""
          }`}
          animate={timeLeft <= 300 && timeLeft > 0 ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        >
          <Timer className="h-4 w-4" />
          {formatTime(timeLeft)}
        </motion.div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaletteOpen((p) => !p)}
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Grid3x3 className="h-4 w-4" />
            {answeredCount}/{questions.length}
          </button>
          <Button size="sm" variant="destructive" onClick={() => setSubmitDialogOpen(true)}>
            Submit
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mx-auto max-w-2xl space-y-4 px-4 py-5"
          >
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Q{currentIndex + 1} of {questions.length}
              </span>
              <Badge variant="outline" className="capitalize">
                {question.subject}
              </Badge>
              {question.type === "mcq-multiple" && (
                <Badge variant="outline" className="text-xs">
                  Multiple Correct
                </Badge>
              )}
              {(question.type === "numerical" || question.type === "integer") && (
                <Badge variant="outline" className="text-xs">
                  Numerical
                </Badge>
              )}
              <button
                onClick={() => toggleMark(question.id)}
                className={`ml-auto flex items-center gap-1 text-xs transition-colors ${
                  markedForReview.has(question.id)
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flag className="h-3.5 w-3.5" />
                {markedForReview.has(question.id) ? "Marked" : "Mark for review"}
              </button>
            </div>

            {/* Statement */}
            <div className="text-base leading-relaxed">
              <LatexText text={question.statement} />
            </div>

            {/* MCQ options */}
            {(question.type === "mcq-single" || question.type === "mcq-multiple") &&
              question.options?.map((opt) => {
                const isSelected =
                  question.type === "mcq-multiple"
                    ? ((answers[question.id] as string[]) ?? []).includes(opt.id)
                    : answers[question.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleMCQSelect(question, opt.id)}
                    className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent ${
                      isSelected ? "bg-foreground/5 border-foreground" : ""
                    }`}
                  >
                    <span
                      className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                        isSelected
                          ? "bg-foreground text-background border-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {opt.id}
                    </span>
                    <span className="leading-relaxed">
                      <LatexText text={opt.text} />
                    </span>
                  </button>
                );
              })}

            {/* Numerical input */}
            {(question.type === "numerical" || question.type === "integer") && (
              <Input
                type="number"
                placeholder="Enter your answer"
                value={numericalInputs[question.id] ?? ""}
                onChange={(e) =>
                  setNumericalInputs((prev) => ({ ...prev, [question.id]: e.target.value }))
                }
                className="max-w-xs font-mono text-lg"
                step={question.type === "integer" ? "1" : "any"}
              />
            )}

            {/* Prev / Next */}
            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => goTo(currentIndex - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === questions.length - 1}
                onClick={() => goTo(currentIndex + 1)}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
          </AnimatePresence>
        </div>

        {/* Desktop palette sidebar */}
        {paletteOpen && (
          <aside className="hidden w-60 shrink-0 flex-col border-l bg-card md:flex">
            <div className="border-b p-3">
              <p className="text-sm font-semibold">Question Palette</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {Object.entries({
                  answered: "Answered",
                  marked: "Marked",
                  visited: "Visited",
                  unvisited: "Not visited",
                }).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1">
                    <span className={`h-3 w-3 rounded-sm border ${STATUS_COLOR[k]}`} />
                    {v}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => goTo(idx)}
                    className={`flex h-8 w-full items-center justify-center rounded border text-xs font-medium transition-colors ${
                      STATUS_COLOR[getStatus(idx, q.id)]
                    } ${currentIndex === idx ? "ring-2 ring-primary ring-offset-1" : ""}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile palette bottom sheet */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[55vh] overflow-y-auto rounded-t-2xl border-t bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Question Palette</p>
              <Button size="sm" variant="ghost" onClick={() => setPaletteOpen(false)}>
                Close
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => goTo(idx)}
                  className={`flex h-9 w-full items-center justify-center rounded border text-xs font-medium ${
                    STATUS_COLOR[getStatus(idx, q.id)]
                  } ${currentIndex === idx ? "ring-2 ring-primary" : ""}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Submit dialog */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {questions.length} question
              {questions.length !== 1 ? "s" : ""}.
              {questions.length - answeredCount > 0
                ? ` ${questions.length - answeredCount} question${
                    questions.length - answeredCount !== 1 ? "s" : ""
                  } will be marked as unattempted.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Attempting</AlertDialogCancel>
            <AlertDialogAction onClick={doSubmit}>Submit & See Results</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
