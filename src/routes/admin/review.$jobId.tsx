import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/admin-auth";
import { publishQuestions, type ReviewedQuestion } from "@/lib/publish-content";
import * as reactKatex from "react-katex";
const InlineMath = (reactKatex as any).InlineMath ?? (reactKatex as any).default?.InlineMath;
const BlockMath = (reactKatex as any).BlockMath ?? (reactKatex as any).default?.BlockMath;
import "katex/dist/katex.min.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/review/$jobId")({
  head: () => ({ meta: [{ title: "Review Questions — JEE Console" }] }),
  component: ReviewPage,
});

// ── LaTeX renderer — handles \(...\) inline and \[...\] block ─────────────────
function LatexText({ text }: { text: string }) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  // Split on \[...\] first (block), then \(...\) (inline)
  const blockRegex = /\\\[([\s\S]*?)\\\]/g;
  const inlineRegex = /\\\(([\s\S]*?)\\\)/g;

  let lastIndex = 0;
  const combined: { start: number; end: number; latex: string; block: boolean }[] = [];

  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(text)) !== null)
    combined.push({ start: m.index, end: m.index + m[0].length, latex: m[1], block: true });
  while ((m = inlineRegex.exec(text)) !== null)
    combined.push({ start: m.index, end: m.index + m[0].length, latex: m[1], block: false });

  combined.sort((a, b) => a.start - b.start);

  for (const part of combined) {
    if (part.start > lastIndex)
      parts.push(<span key={lastIndex}>{text.slice(lastIndex, part.start)}</span>);
    parts.push(
      part.block
        ? <BlockMath key={part.start} math={part.latex} />
        : <InlineMath key={part.start} math={part.latex} />
    );
    lastIndex = part.end;
  }
  if (lastIndex < text.length)
    parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);

  return <>{parts}</>;
}

// ── Difficulty badge ───────────────────────────────────────────────────────────
const DIFFICULTY_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: "Easy", color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  2: { label: "Moderate", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  3: { label: "JEE Mains", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  4: { label: "Hard", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  5: { label: "JEE Advanced", color: "bg-red-500/15 text-red-700 dark:text-red-400" },
};

// ── Single question card ───────────────────────────────────────────────────────
interface QuestionCardProps {
  index: number;
  question: ReviewedQuestion;
  onToggleApprove: (i: number) => void;
}

function QuestionCard({ index, question, onToggleApprove }: QuestionCardProps) {
  const [showSolution, setShowSolution] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number[]>([]); // indices of revealed hints
  const diff = DIFFICULTY_LABEL[question.difficulty] ?? DIFFICULTY_LABEL[3];

  const revealNextHint = () => {
    const next = revealedHints.length;
    if (next < (question.hints?.length ?? 0))
      setRevealedHints((prev) => [...prev, next]);
  };

  return (
    <Card className={`transition-colors ${question.approved ? "ring-1 ring-green-500/40" : "ring-1 ring-red-500/20 opacity-70"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Q number + type badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-muted-foreground">Q{index + 1}</span>
            <Badge variant="outline" className="text-xs capitalize">{question.type}</Badge>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.color}`}>{diff.label}</span>
            {question.confidence < 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                {Math.round(question.confidence * 100)}% conf
              </span>
            )}
          </div>

          {/* Approve / Reject */}
          <button
            onClick={() => onToggleApprove(index)}
            className={`shrink-0 flex items-center gap-1.5 text-sm font-medium rounded-md px-3 py-1.5 transition-colors ${
              question.approved
                ? "bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-red-500/10 hover:text-red-600"
                : "bg-red-500/10 text-red-600 hover:bg-green-500/15 hover:text-green-700"
            }`}
          >
            {question.approved
              ? <><CheckCircle2 className="h-4 w-4" /> Approved</>
              : <><XCircle className="h-4 w-4" /> Rejected</>}
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statement */}
        <div className="text-sm leading-relaxed">
          <LatexText text={question.statement} />
        </div>

        {/* Options */}
        {question.options && question.options.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {question.options.map((opt) => (
              <div
                key={opt.id}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  question.correctAnswer === opt.id ||
                  (Array.isArray(question.correctAnswer) && question.correctAnswer.includes(opt.id))
                    ? "border-green-500/50 bg-green-500/10 font-medium"
                    : "border-border bg-muted/30"
                }`}
              >
                <span className="font-semibold shrink-0">{opt.id}.</span>
                <LatexText text={opt.text} />
              </div>
            ))}
          </div>
        )}

        {/* Hints — progressive reveal (same behaviour as practice UI) */}
        {(question.hints ?? []).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hints ({revealedHints.length}/{question.hints!.length} revealed)
            </p>
            <div className="space-y-1.5">
              {question.hints!.map((hint, i) => (
                <div key={i}>
                  {revealedHints.includes(i) ? (
                    <div className="flex gap-2 text-sm rounded-md bg-blue-500/8 border border-blue-500/20 px-3 py-1.5">
                      <span className="font-semibold text-blue-600 dark:text-blue-400 shrink-0">H{i + 1}</span>
                      <span className="text-muted-foreground">{hint}</span>
                    </div>
                  ) : (
                    i === revealedHints.length && (
                      <button
                        onClick={revealNextHint}
                        className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 border border-blue-500/30 border-dashed rounded-md px-3 py-1.5 w-full hover:bg-blue-500/8 transition-colors"
                      >
                        <span className="font-semibold">H{i + 1}</span>
                        <span>Click to reveal hint {i + 1}</span>
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solution toggle */}
        <button
          onClick={() => setShowSolution((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showSolution ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showSolution ? "Hide solution" : "Show solution"}
        </button>

        {showSolution && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Approach</p>
              <div className="leading-relaxed"><LatexText text={question.solution.approach} /></div>
            </div>
            {question.solution.keyInsights.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Key Insights</p>
                <ul className="space-y-1">
                  {question.solution.keyInsights.map((k, i) => (
                    <li key={i} className="flex gap-2"><span className="text-green-600 shrink-0">✓</span><LatexText text={k} /></li>
                  ))}
                </ul>
              </div>
            )}
            {(question.solution.commonMistakes ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Common Mistakes</p>
                <ul className="space-y-1">
                  {question.solution.commonMistakes!.map((m, i) => (
                    <li key={i} className="flex gap-2"><span className="text-red-500 shrink-0">✗</span><LatexText text={m} /></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {question.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function ReviewPage() {
  const { jobId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState<any>(null);
  const [questions, setQuestions] = useState<ReviewedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Load job in real-time
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "contentUploads", jobId), (snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      const data = snap.data();
      setJob(data);

      // Init questions with approved=true by default
      const extracted = data.extractedData?.questions ?? [];
      setQuestions((prev) => {
        if (prev.length === extracted.length) return prev; // preserve approval state
        return extracted.map((q: any) => ({ ...q, approved: true }));
      });
      setLoading(false);
    });
    return () => unsub();
  }, [jobId]);

  if (!user || !isAdmin()) return <Navigate to="/" />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) return <div className="text-muted-foreground">Job not found.</div>;

  const approvedCount = questions.filter((q) => q.approved).length;

  const handleToggleApprove = (i: number) => {
    setQuestions((prev) => prev.map((q, idx) => idx === i ? { ...q, approved: !q.approved } : q));
  };

  const handleApproveAll = () => setQuestions((prev) => prev.map((q) => ({ ...q, approved: true })));
  const handleRejectAll = () => setQuestions((prev) => prev.map((q) => ({ ...q, approved: false })));

  const handlePublish = async () => {
    if (approvedCount === 0) { toast.error("Approve at least one question first"); return; }
    setPublishing(true);
    try {
      const { published, skipped } = await publishQuestions(
        jobId,
        job.subject,
        job.chapterId ?? "",
        questions,
        user.uid
      );
      toast.success(`Published ${published} questions${skipped > 0 ? `, skipped ${skipped}` : ""}`);
      navigate({ to: "/admin/upload" });
    } catch (err: any) {
      toast.error("Publish failed: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate({ to: "/admin/upload" })}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to upload
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">Review Extracted Questions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium">{job.fileName}</span> · {job.subject} · {job.chapterId} · {questions.length} questions extracted
          </p>
        </div>

        {/* Publish bar */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleApproveAll}>Approve all</Button>
            <Button size="sm" variant="ghost" onClick={handleRejectAll}>Reject all</Button>
          </div>
          <Button
            onClick={handlePublish}
            disabled={approvedCount === 0 || publishing || job.status === "published"}
            className="gap-2"
          >
            {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
            {job.status === "published" ? "Already published" : `Publish ${approvedCount} / ${questions.length}`}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Question list */}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionCard key={i} index={i} question={q} onToggleApprove={handleToggleApprove} />
        ))}
      </div>

      {/* Sticky bottom bar */}
      {questions.length > 3 && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            onClick={handlePublish}
            disabled={approvedCount === 0 || publishing || job.status === "published"}
            className="shadow-lg gap-2"
          >
            {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
            {job.status === "published" ? "Already published" : `Publish ${approvedCount} / ${questions.length}`}
          </Button>
        </div>
      )}
    </div>
  );
}
