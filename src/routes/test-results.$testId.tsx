import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LatexText } from "@/components/problems/LatexText";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, MinusCircle, Trophy, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/test-results/$testId")({
  component: () => { const navigate = useNavigate(); navigate({ to: "/" }); return null; },
});

interface QuestionResult {
  id: string;
  subject: string;
  chapterId: string;
  difficulty: number;
  type: string;
  statement: string;
  options?: { id: string; text: string }[];
  correctAnswer: string | string[];
  numericalAnswer?: number;
  tolerance?: number;
  solution: { approach: string; keyInsights: string[]; commonMistakes?: string[] };
  answer: string | string[] | null;
}

interface ResultData {
  testId: string;
  questions: QuestionResult[];
  submittedAt: number;
  timeTakenSeconds: number;
}

function isCorrect(q: QuestionResult): boolean {
  if (!q.answer) return false;
  if (q.type === "mcq-multiple") {
    if (!Array.isArray(q.answer) || !Array.isArray(q.correctAnswer)) return false;
    return (
      JSON.stringify([...q.answer].sort()) ===
      JSON.stringify([...(q.correctAnswer as string[])].sort())
    );
  }
  if (q.type === "numerical" || q.type === "integer") {
    const num = parseFloat(q.answer as string);
    if (isNaN(num)) return false;
    const correct = q.numericalAnswer ?? parseFloat(q.correctAnswer as string);
    const tol = q.tolerance ?? (q.type === "integer" ? 0 : 0.01);
    return Math.abs(num - correct) <= Math.abs(correct) * tol + 0.001;
  }
  return q.answer === q.correctAnswer;
}

function calcScore(qs: QuestionResult[]): number {
  let score = 0;
  for (const q of qs) {
    if (!q.answer) continue;
    if (isCorrect(q)) score += 4;
    else if (q.type !== "numerical" && q.type !== "integer") score -= 1;
  }
  return Math.max(0, score);
}

const DIFF_LABEL: Record<number, string> = {
  1: "Easy",
  2: "Moderate",
  3: "Mains",
  4: "Hard",
  5: "Advanced",
};

function TestResultsPage() {
  const { testId } = Route.useParams();
  const [data, setData] = useState<ResultData | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`test-results-${testId}`);
    if (raw) setData(JSON.parse(raw));
  }, [testId]);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Results not found.</p>
        <Button asChild variant="outline">
          <Link to="/problems">Back to Problems</Link>
        </Button>
      </div>
    );
  }

  const { questions } = data;
  const correct = questions.filter((q) => q.answer && isCorrect(q)).length;
  const wrong = questions.filter((q) => q.answer && !isCorrect(q)).length;
  const unattempted = questions.filter((q) => !q.answer).length;
  const score = calcScore(questions);
  const maxScore = questions.length * 4;
  const accuracy =
    questions.length - unattempted > 0
      ? Math.round((correct / (questions.length - unattempted)) * 100)
      : 0;

  const subjects = ["physics", "chemistry", "maths"] as const;
  const subjectBreakdown = subjects
    .map((sub) => {
      const qs = questions.filter((q) => q.subject === sub);
      if (qs.length === 0) return null;
      return {
        subject: sub,
        total: qs.length,
        correct: qs.filter((q) => q.answer && isCorrect(q)).length,
        score: calcScore(qs),
      };
    })
    .filter(Boolean);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/problems">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Test Results</h1>
      </div>

      {/* Score card */}
      <Card>
        <CardContent className="pt-6 pb-5">
          <div className="mb-6 text-center">
            <Trophy
              className={`mx-auto mb-3 h-12 w-12 ${
                accuracy >= 70 ? "text-amber-500" : "text-muted-foreground"
              }`}
            />
            <div className="text-5xl font-bold tabular-nums">{score}</div>
            <div className="mt-1 text-muted-foreground">out of {maxScore} marks</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {accuracy}% accuracy · Time: {formatTime(data.timeTakenSeconds)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-green-500/10 p-3">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{correct}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Correct (+{correct * 4})</div>
            </div>
            <div className="rounded-lg bg-red-500/10 p-3">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{wrong}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Wrong (−{wrong})</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-2xl font-bold text-muted-foreground">{unattempted}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Skipped</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject breakdown */}
      {subjectBreakdown.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjectBreakdown.map(
              (s) =>
                s && (
                  <div key={s.subject} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 capitalize text-sm font-medium">
                      {s.subject}
                    </span>
                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-green-500 transition-all"
                        style={{ width: `${s.total ? (s.correct / s.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                      {s.correct}/{s.total} · {s.score}pts
                    </span>
                  </div>
                )
            )}
          </CardContent>
        </Card>
      )}

      {/* Question-by-question review */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Question Review
        </h2>
        {questions.map((q, idx) => {
          const skipped = !q.answer;
          const correct_q = !skipped && isCorrect(q);
          const isExpanded = expanded === q.id;

          return (
            <div key={q.id} className="overflow-hidden rounded-lg border">
              <button
                onClick={() => setExpanded(isExpanded ? null : q.id)}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent"
              >
                {skipped ? (
                  <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : correct_q ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
                <span className="shrink-0 text-sm font-medium">Q{idx + 1}</span>
                <span className="flex-1 truncate text-sm text-muted-foreground">
                  {q.statement.replace(/\\\(.*?\\\)|\\\[[\s\S]*?\\\]/g, "[math]").slice(0, 70)}
                  {q.statement.length > 70 ? "…" : ""}
                </span>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {DIFF_LABEL[q.difficulty] ?? q.difficulty}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="space-y-3 border-t bg-muted/20 p-4 text-sm">
                  {/* Full question */}
                  <div className="leading-relaxed">
                    <LatexText text={q.statement} />
                  </div>

                  {/* Options review */}
                  {q.options && (
                    <div className="space-y-1">
                      {q.options.map((opt) => {
                        const isCorrectOpt = Array.isArray(q.correctAnswer)
                          ? q.correctAnswer.includes(opt.id)
                          : q.correctAnswer === opt.id;
                        const wasSelected = Array.isArray(q.answer)
                          ? q.answer.includes(opt.id)
                          : q.answer === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`flex gap-2 rounded px-2 py-1 ${
                              isCorrectOpt
                                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                : wasSelected
                                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                                : ""
                            }`}
                          >
                            <span className="shrink-0 font-bold">{opt.id}.</span>
                            <LatexText text={opt.text} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Numerical answer */}
                  {(q.type === "numerical" || q.type === "integer") && (
                    <div className="space-y-1">
                      <p>
                        Your answer:{" "}
                        <span className="font-mono font-bold">{q.answer ?? "—"}</span>
                      </p>
                      <p>
                        Correct answer:{" "}
                        <span className="font-mono font-bold text-green-600 dark:text-green-400">
                          {q.numericalAnswer ?? q.correctAnswer}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Solution */}
                  <div className="rounded border bg-card p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Solution
                    </p>
                    <div className="leading-relaxed">
                      <LatexText text={q.solution.approach} />
                    </div>
                    {q.solution.keyInsights?.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {q.solution.keyInsights.map((insight, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="shrink-0 text-primary">•</span>
                            <LatexText text={insight} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
