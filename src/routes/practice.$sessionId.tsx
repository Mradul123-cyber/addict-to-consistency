import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Question, Difficulty } from "@/types/questions";
import { LatexText } from "@/components/problems/LatexText";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  ChevronRight,
  Trophy,
  RotateCcw,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";

const spring = { type: "spring" as const, stiffness: 500, damping: 32 };

export const Route = createFileRoute("/practice/$sessionId")({
  component: () => { const navigate = useNavigate(); navigate({ to: "/" }); return null; },
});

interface SessionConfig {
  subject: string;
  chapterIds: string[] | null;
  difficulties: Difficulty[] | null;
  examPattern: string | null;
  questionCount: number;
}

const DIFFICULTY_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: "Easy", color: "text-green-600 dark:text-green-400" },
  2: { label: "Moderate", color: "text-blue-600 dark:text-blue-400" },
  3: { label: "JEE Mains", color: "text-amber-600 dark:text-amber-400" },
  4: { label: "Hard", color: "text-orange-600 dark:text-orange-400" },
  5: { label: "Advanced", color: "text-red-600 dark:text-red-400" },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function checkAnswer(question: Question, answer: string | string[] | null): boolean {
  if (answer === null || answer === "") return false;
  if (question.type === "mcq-multiple") {
    if (!Array.isArray(answer) || !Array.isArray(question.correctAnswer)) return false;
    const sa = [...answer].sort();
    const ca = [...(question.correctAnswer as string[])].sort();
    return JSON.stringify(sa) === JSON.stringify(ca);
  }
  if (question.type === "numerical" || question.type === "integer") {
    const num = parseFloat(answer as string);
    if (isNaN(num)) return false;
    const correct = question.numericalAnswer ?? parseFloat(question.correctAnswer as string);
    const tol = question.tolerance ?? (question.type === "integer" ? 0 : 0.01);
    return Math.abs(num - correct) <= Math.abs(correct) * tol + 0.001;
  }
  return answer === question.correctAnswer;
}

function PracticeSession() {
  const { sessionId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [numericalInput, setNumericalInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const questionStartTime = useRef(Date.now());

  // Load config from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem(`practice-${sessionId}`);
    if (!raw) {
      setError("Session not found. Go back and start again.");
      setLoading(false);
      return;
    }
    setConfig(JSON.parse(raw));
  }, [sessionId]);

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
          if (config.examPattern && d.examPattern !== config.examPattern && d.examPattern !== "both") return;
          all.push(d);
        });
        setQuestions(shuffle(all).slice(0, config.questionCount));
      } catch (e: any) {
        setError("Failed to load questions: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [config]);

  const resetQuestionState = () => {
    setSelectedAnswer(null);
    setNumericalInput("");
    setSubmitted(false);
    setShowSolution(false);
    setRevealedHints([]);
    questionStartTime.current = Date.now();
  };

  const getAnswer = (q: Question) =>
    q.type === "numerical" || q.type === "integer" ? numericalInput : selectedAnswer;

  const handleSubmit = async () => {
    const question = questions[currentIndex];
    const answer = getAnswer(question);
    if (!answer || (Array.isArray(answer) && answer.length === 0) || answer === "") {
      toast.warning("Please select or enter an answer first.");
      return;
    }

    const correct = checkAnswer(question, answer);
    if (correct) setCorrectCount((c) => c + 1);

    if (user) {
      try {
        await addDoc(collection(db, "users", user.uid, "practiceAttempts"), {
          questionId: question.id,
          userId: user.uid,
          submittedAt: Date.now(),
          timeSpentSeconds: Math.round((Date.now() - questionStartTime.current) / 1000),
          selectedAnswer: answer,
          isCorrect: correct,
          hintsUsed: revealedHints.length,
          viewedSolution: false,
          chapterId: question.chapterId,
          subject: question.subject,
          difficulty: question.difficulty,
        });
      } catch (e) {
        console.error("Failed to save attempt", e);
      }
    }

    setSubmitted(true);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
      resetQuestionState();
    }
  };

  const revealNextHint = () => {
    const hints = questions[currentIndex]?.hints ?? [];
    if (revealedHints.length < hints.length)
      setRevealedHints((prev) => [...prev, prev.length]);
  };

  const handleMCQSelect = (optionId: string) => {
    if (submitted) return;
    const q = questions[currentIndex];
    if (q.type === "mcq-multiple") {
      setSelectedAnswer((prev) => {
        const arr = (prev as string[]) ?? [];
        return arr.includes(optionId) ? arr.filter((x) => x !== optionId) : [...arr, optionId];
      });
    } else {
      setSelectedAnswer(optionId);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button asChild variant="outline">
          <Link to="/problems">Back to Problems</Link>
        </Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">No approved questions found for these filters.</p>
        <p className="text-sm text-muted-foreground">
          Upload and approve questions from the Admin panel first.
        </p>
        <Button asChild variant="outline">
          <Link to="/problems">Change Filters</Link>
        </Button>
      </div>
    );
  }

  // ── Session done ──────────────────────────────────────────────────────────────
  if (sessionDone) {
    const accuracy = Math.round((correctCount / questions.length) * 100);
    return (
      <motion.div
        className="mx-auto max-w-sm space-y-6 px-4 py-16 text-center"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
        >
          <Trophy
            className={`mx-auto h-16 w-16 ${accuracy >= 70 ? "text-amber-500" : "text-muted-foreground"}`}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold">
            {accuracy >= 70 ? "Great Job!" : accuracy >= 40 ? "Keep Going!" : "More Practice Needed"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {correctCount}/{questions.length} correct · {accuracy}% accuracy
          </p>
        </motion.div>
        <motion.div
          className="flex gap-3 justify-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
        >
          <Button variant="outline" onClick={() => navigate({ to: "/problems" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => {
              resetQuestionState();
              setCurrentIndex(0);
              setCorrectCount(0);
              setSessionDone(false);
              setQuestions((q) => shuffle(q));
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  // ── Active question ───────────────────────────────────────────────────────────
  const question = questions[currentIndex];
  const hints = question.hints ?? [];
  const diff = DIFFICULTY_LABEL[question.difficulty] ?? DIFFICULTY_LABEL[3];
  const answerForCheck = getAnswer(question);
  const isCorrect = submitted ? checkAnswer(question, answerForCheck) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/problems" })}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Exit
        </Button>
        <span className="text-sm text-muted-foreground font-medium">
          {currentIndex + 1} / {questions.length}
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={correctCount}
            initial={{ scale: 1.4, color: "#22c55e" }}
            animate={{ scale: 1, color: "inherit" }}
            transition={spring}
            className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums"
          >
            {correctCount} ✓
          </motion.span>
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ originX: 0 }}
      >
        <Progress value={(currentIndex / questions.length) * 100} className="h-1" />
      </motion.div>

      {/* Question card — slides in from right on new question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
      <Card>
        <CardContent className="pt-5 space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {question.subject}
            </Badge>
            <Badge variant="outline" className={diff.color}>
              {diff.label}
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
                  ? (selectedAnswer as string[] ?? []).includes(opt.id)
                  : selectedAnswer === opt.id;
              const isCorrectOpt = Array.isArray(question.correctAnswer)
                ? question.correctAnswer.includes(opt.id)
                : question.correctAnswer === opt.id;

              let cls =
                "w-full flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors ";
              if (!submitted) {
                cls += isSelected
                  ? "bg-foreground/5 border-foreground"
                  : "hover:bg-accent cursor-pointer";
              } else {
                if (isCorrectOpt) cls += "bg-green-500/10 border-green-500/50";
                else if (isSelected) cls += "bg-red-500/10 border-red-500/50";
                else cls += "opacity-50";
              }

              return (
                <button
                  key={opt.id}
                  className={cls}
                  onClick={() => handleMCQSelect(opt.id)}
                  disabled={submitted}
                >
                  <span
                    className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                      !submitted && isSelected
                        ? "bg-foreground text-background border-foreground"
                        : submitted && isCorrectOpt
                        ? "bg-green-500 text-white border-green-500"
                        : submitted && isSelected
                        ? "bg-red-500 text-white border-red-500"
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
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Enter your answer"
                value={numericalInput}
                onChange={(e) => setNumericalInput(e.target.value)}
                disabled={submitted}
                className="max-w-xs font-mono text-lg"
                step={question.type === "integer" ? "1" : "any"}
              />
              {submitted && (
                <p className="text-sm text-muted-foreground">
                  Correct answer:{" "}
                  <span className="font-mono font-bold text-foreground">
                    {question.numericalAnswer ?? question.correctAnswer}
                    {question.tolerance ? ` ±${question.tolerance}` : ""}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Hints (only before submit) */}
          {!submitted && hints.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence>
                {revealedHints.map((idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm overflow-hidden"
                  >
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      Hint {idx + 1}:{" "}
                    </span>
                    <LatexText text={hints[idx]} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {revealedHints.length < hints.length && (
                <motion.button
                  onClick={revealNextHint}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  {revealedHints.length === 0
                    ? "Show hint (try it yourself first!)"
                    : `Show hint ${revealedHints.length + 1} of ${hints.length}`}
                </motion.button>
              )}
            </div>
          )}

          {/* Result feedback */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={spring}
                className={`flex items-center gap-2 rounded-lg p-3 ${
                  isCorrect ? "bg-green-500/10" : "bg-red-500/10"
                }`}
              >
                {isCorrect ? (
                  <>
                    <motion.div
                      initial={{ rotate: -20, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 600, damping: 20 }}
                    >
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    </motion.div>
                    <span className="font-semibold text-green-700 dark:text-green-400">Correct!</span>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ rotate: 20, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 600, damping: 20 }}
                    >
                      <XCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                    </motion.div>
                    <span className="font-semibold text-red-700 dark:text-red-400">Incorrect</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Solution (after submit) */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.15 }}
              >
                <button
                  onClick={() => setShowSolution((s) => !s)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSolution ? "Hide solution" : "Show solution"}
                </button>
                <AnimatePresence>
                  {showSolution && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-3 rounded-lg border bg-muted/20 p-4 text-sm">
                        <div className="leading-relaxed">
                          <LatexText text={question.solution.approach} />
                        </div>
                        {question.solution.keyInsights?.length > 0 && (
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Key Insights
                            </p>
                            <ul className="space-y-1">
                              {question.solution.keyInsights.map((insight, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="shrink-0 text-primary">•</span>
                                  <LatexText text={insight} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {question.solution.commonMistakes && question.solution.commonMistakes.length > 0 && (
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Common Mistakes
                            </p>
                            <ul className="space-y-1">
                              {question.solution.commonMistakes.map((mistake, i) => (
                                <li key={i} className="flex gap-2 text-orange-700 dark:text-orange-400">
                                  <span className="shrink-0">⚠</span>
                                  <LatexText text={mistake} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
        </motion.div>
      </AnimatePresence>

      {/* Action button */}
      <div className="flex justify-end">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div key="check" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !answerForCheck ||
                    (Array.isArray(answerForCheck) && answerForCheck.length === 0) ||
                    answerForCheck === ""
                  }
                >
                  Check Answer
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="next"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
                <Button onClick={handleNext} className="gap-2">
                  {currentIndex + 1 >= questions.length ? "Finish Session" : "Next Question"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
