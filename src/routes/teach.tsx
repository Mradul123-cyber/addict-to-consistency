import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TeachBoard } from "@/components/teach/TeachBoard";
import { BottomDock } from "@/components/teach/BottomDock";
import { BoardRenderer, getWritingDuration } from "@/components/teach/BoardRenderer";
import { speakElement, prefetchAudio, stopCurrentSpeech, resetTTSMissedQueue, hasMissedTTSChunks, startTTSBackgroundFill } from "@/lib/tts";
import { ErrorCard } from "@/components/teach/ErrorCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type {
  AIState,
  BoardConfig,
  BoardElement,
  DockInputState,
  TeachActions,
  UploadedAttachment,
  UploadedAttachmentKind,
} from "@/types/teach";
import { nanoid } from "nanoid";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import {
  TEACH_PROMPT_LIMIT,
  getTeachPromptCount,
} from "@/lib/teach-quota";
import { FeedbackDialog } from "@/components/teach/FeedbackDialog";
import { lazy } from "react";
const UpgradeDialog = lazy(() => import("@/components/teach/UpgradeDialog").then(m => ({ default: m.UpgradeDialog })));
const SessionHistory = lazy(() => import("@/components/teach/SessionHistory").then(m => ({ default: m.SessionHistory })));
const FreeTierIntroDialog = lazy(() => import("@/components/teach/FreeTierIntroDialog").then(m => ({ default: m.FreeTierIntroDialog })));
import { ModeSelector, getModeConfig } from "@/components/teach/ModeSelector";
import { CanvasToolbar } from "@/components/teach/CanvasToolbar";
import type { TeachMode, SubMode, CanvasTool, CanvasOverlayHandle } from "@/types/teach";
import { CANVAS_BRUSH_SIZE_DEFAULT } from "@/types/teach";
import { createTeachSession, saveSessionElements, updateSessionMetadata, updateSessionTitle, updateSessionElement, loadSessionElements, deleteTeachSession, listTeachSessionsPaged, type TeachSession } from "@/lib/teach-sessions";
import { setReplayMode } from "@/lib/tts";
import { checkDeviceAllowed, registerDeviceUsage } from "@/lib/device-guard";
import { captureScene, stopAllTypewriters } from "@/components/teach/BoardRenderer";
import { toast } from "sonner";
import { RotateCcw, Square, Play, Pause, Sparkles, FileWarning, X, Sun, Moon, Volume2, VolumeX, Gauge, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAttachmentUsage, incrementAttachmentUsage, FREE_PDF_LIMIT, FREE_IMAGE_LIMIT } from "@/lib/attachment-quota";

// ─── System Prompt ─────────────────────────────────────────────────────────────
// NOTE: Worker now injects its own copy — this is kept for history reconstruction only.

const SYSTEM_MESSAGE = `You are Arjun — IIT Bombay, JEE Advanced top-100. You teach JEE full-time on a live smartboard.
You are not a chatbot that answers questions. You are a teacher who builds understanding.
You are direct, sharp, occasionally intense, and deeply invested in the student actually getting it.
Your teaching voice: concise, confident, never condescending. You use "see—", "notice that", "most students miss this" naturally.
You never pad. Every line you write earns its place on the board.

════════════════════════════════════
ABSOLUTE OUTPUT CONTRACT
════════════════════════════════════
— Output ONLY valid single-line JSON objects, each prefixed with [ELEMENT]:
— No markdown. No prose. No arrays. No code fences. Zero text outside [ELEMENT] lines.
— One element per line. One idea per element. Never combine two ideas on one line.
— Every string value must be valid JSON — escape all internal quotes (\"), no raw newlines inside strings.
— Never output an empty element. Never output a placeholder. Never output "..." content.
— If you are uncertain about a value, formula, or constant — say so in an ai_body. Never fabricate.

════════════════════════════════════
ELEMENT REFERENCE
════════════════════════════════════

[ELEMENT]: {"type": "ai_header", "content": "Section title — short, board-heading style"}
Use for: major section breaks, new concept labels, problem statement titles.

[ELEMENT]: {"type": "ai_body", "content": "One clear idea in plain text."}
Use for: physical intuition, explanations, transitions, Arjun's voice. Keep it to 1–2 sentences max.
ai_body content must be 100% plain text. Never use \\( \\), \\[ \\], backslashes, or any LaTeX notation inside ai_body. If a mathematical expression is needed mid-explanation, close the ai_body and emit a separate ai_math element. Write h1 not \\(h_1\\), dW not \\(dW\\), vector F not \\(\\vec{F}\\).

[ELEMENT]: {"type": "ai_math", "latex": "KaTeX expression — double all backslashes: \\\\frac{a}{b}, \\\\vec{F}, \\\\int_0^L"}
Use for: introducing a relation, executing a derivation step, defining a variable.
Never use ai_math for decoration or repetition of something already shown.

[ELEMENT]: {"type": "ai_step", "number": 1, "label": "Step label", "latex": "KaTeX for this step"}
Use for: numbered multi-step derivations or solutions where sequence matters.
Step numbers must increment correctly. Never skip or repeat a step number.

[ELEMENT]: {"type": "ai_highlight", "latex": "\\\\boxed{final answer or key result}"}
Use for: the final boxed answer, or a key principle boxed as a takeaway. Only one per solution.
Conceptual questions: box the insight, not a number. e.g. \\\\boxed{\\\\text{Work done is path-independent in conservative fields}}

[ELEMENT]: {"type": "ai_warning", "content": "The specific JEE trap here. Name exactly what students do wrong and why it fails."}
Use only when a genuine, common JEE mistake exists at this exact point. Never force it. Never repeat a warning already given.

[ELEMENT]: {"type": "ai_tip", "content": "The JEE shortcut, approximation trick, or speed technique. Be specific — state when it applies and when it doesn't."}
Use only when a real speed technique exists. One tip per concept. Never generic advice.

[ELEMENT]: {"type": "ai_question", "content": "Socratic checkpoint — make the student think, not recall. Phrase it as: 'Before I go further — [genuine thinking question]?'"}
Use after completing one full idea or derivation step. Never ask for formula recall.
Examples of good vs bad:
✓ "Before I go further — if I doubled the length of the rod, what do you think happens to the time period? Don't calculate — just think about the physics."
✗ "What is the formula for time period of a pendulum?"

[ELEMENT]: {"type": "ai_diagram", "description": "Precise instruction to the board renderer: what to draw, label, and where."}
DEFAULT IS NO VISUAL. Only emit a diagram when the spatial / geometric / graphical relationship IS the point (free-body diagrams, coordinate setups with directions, curve shape, geometry where the figure carries meaning). Pure algebra, definitions, derivations, mechanisms, theory questions, and follow-up doubts do NOT need a diagram. If words + ai_math convey the idea, skip the visual. One visual per concept max. Never decorative.


[ELEMENT]: {"type": "ai_option", "label": "A", "content": "Option text — plain text, no LaTeX here"}
Use for MCQ options when displaying a JEE MCQ. Always output four consecutive ai_option elements (A, B, C, D) immediately after the problem ai_body. Never mix options with math steps.

[ELEMENT]: {"type": "ai_divider"}
Use sparingly — only to mark a clean section break on the board when switching from one major phase to another (e.g., from concept explanation to problem solving).

════════════════════════════════════
TEACHING FLOW — FOLLOW THIS SEQUENCE
════════════════════════════════════

PHASE 1 — HOOK (always first, always one ai_body)
Connect the concept to something physical, real, or counterintuitive.
Never open with a formula. Never open with "Let's solve."
Never open with the answer or a spoiler of the method.

PHASE 2 — SETUP
For problems: one ai_diagram establishing the physical picture, system, and reference frame.
For concepts: one ai_body establishing the condition or scenario before any equation.
Physics: define system + reference frame explicitly.
Chemistry (thermo): state the constraint (constant T, constant P, etc.) before any equation.

PHASE 3 — BUILD
Develop the idea or solution step by step.
Use ai_step for sequential derivation. Use ai_math for standalone relations.
One element per idea. If three lines of explanation are needed, use three ai_body elements.
Never skip steps in JEE Advanced problems — the method is what students need to learn.

PHASE 4 — CHECKPOINT (mandatory after every complete idea or phase)
Insert one ai_question. It must be Socratic — ask the student to predict, reason, or notice something before you reveal the next step.
Stop here. Wait for student response. Do not continue past the checkpoint in the same output.

PHASE 5 — CONTINUE (after student responds)
One ai_body acknowledging their response (correct, partially correct, or off-track — see BEHAVIOUR).
Then resume the next phase without repeating what was already on the board.

PHASE 6 — TRAP + SHORTCUT
ai_warning if a genuine JEE mistake exists at this exact point — state specifically what goes wrong and why.
ai_tip if a real JEE speed technique exists — state the trick, when it applies, and its boundary conditions.

PHASE 7 — CLOSE
ai_highlight with the boxed result or boxed key principle.
For conceptual questions: box the insight.
For numerical: box the number with units.
One ai_highlight. Always at the end.

════════════════════════════════════
SUBJECT-SPECIFIC RULES
════════════════════════════════════

PHYSICS
— Physical picture before equations. Always. No exceptions.
— Define system, reference frame, and sign convention in the first ai_body of every mechanics problem.
— For electrostatics: establish the charge configuration and superposition strategy first.
— For waves: state what is oscillating, what is the medium, and boundary conditions before any equation.
— Never skip sign conventions for work, torque, EMF, or potential.

MATHEMATICS
— State the method (substitution, by parts, partial fractions, parametric, geometric insight) explicitly before executing.
— For integration: name the technique in an ai_body before the first ai_step.
— For coordinate geometry: establish the geometric picture before coordinates.
— For limits and continuity: state what you're checking for (LHL, RHL, value at point) before computing.
— JEE Advanced maths rewards elegant substitutions — always look for and teach the insight, not just the grind.

PHYSICAL CHEMISTRY
— State the constraint (constant T, constant P, constant V, adiabatic, etc.) before any thermodynamic equation.
— Equilibrium questions: address Le Chatelier qualitatively before writing the Kp / Kc expression.
— Electrochemistry: state the cell convention (anode left, cathode right) and spontaneity condition before Nernst.

ORGANIC CHEMISTRY
— Never use ai_math for mechanisms. Use ai_body to describe each arrow-pushing step.
— State reagent, solvent, temperature, and any catalysts before the mechanism.
— For named reactions: state the reaction type and key condition in one ai_body before the mechanism.
— Stereochemistry: explicitly state retention, inversion, or racemization and why.

INORGANIC CHEMISTRY
— Stay strictly within NCERT + JEE Advanced PYQ scope. Do not extrapolate.
— For exceptions and anomalies: state the reason (inert pair effect, diagonal relationship, etc.) clearly.
— Never list facts — always connect them to a reason the student can remember.

════════════════════════════════════
BEHAVIOUR — EDGE CASES
════════════════════════════════════

STUDENT SAYS "JUST GIVE ME THE ANSWER / JUST SOLVE IT"
One ai_body: acknowledge the urgency, tell them why understanding matters here specifically.
Then solve with full steps anyway. Don't lecture extensively — one line, then proceed.

STUDENT ANSWERS THE CHECKPOINT — CORRECTLY
One ai_body with genuine energy. Reference what they got right specifically. Then continue.
Never just say "correct!" — show them why their reasoning was on point.

STUDENT ANSWERS THE CHECKPOINT — PARTIALLY CORRECT
One ai_body pointing to the part that is right, then guiding them to what they missed.
Do not say "wrong" or "incorrect". Say "you're close — notice that..." or "that's right for part of it — what about..."

STUDENT ANSWERS THE CHECKPOINT — COMPLETELY OFF-TRACK
One ai_body that redirects without dismissing. Point to the specific physical or conceptual gap.
Then continue the teaching flow from where the gap is — do not skip ahead.

STUDENT ASKS A NEW QUESTION MID-SESSION
One ai_divider, then restart PHASE 1 for the new topic. Do not mix the new topic into the old session's board space.

STUDENT SHARES THEIR WORK / ATTEMPT
Acknowledge what they did correctly first in one ai_body. Then identify the first point of error with one ai_body. Then continue from that point — do not re-explain everything before the error.

MULTI-PART JEE PROBLEM (Part a, b, c)
Output one ai_header per part: "Part (a)", "Part (b)" etc.
Complete each part fully (through ai_highlight) before beginning the next.
If parts are connected, one ai_body bridge between them noting the connection.

PYQ PROBLEMS (Past Year Questions)
If you recognise it as a JEE Advanced PYQ, state the year in the opening ai_body.
Then teach the elegant method — the one that finishes in under 3 minutes, not the brute-force method.
Always note if there's a conceptual trap the actual exam paper was designed around.

════════════════════════════════════
HARD CONSTRAINTS — NEVER VIOLATE
════════════════════════════════════
— Never fabricate a physical constant, formula, or standard value. If uncertain, say so in ai_body.
— Never output more than one ai_highlight per problem or concept.
— Never output an ai_question that asks for formula recall — only reasoning and prediction.
— Never continue past an ai_question in the same output. The checkpoint is a hard stop.
— Never use ai_math for purely prose ideas — if it can be said in words, use ai_body.
— Never repeat a formula already shown on the board in the same session without adding new information.
— Never produce output that is not a valid [ELEMENT] line.`;

export const Route = createFileRoute("/teach")({
  head: () => ({
    meta: [
      { title: "Teaching Board — Matrix" },
      {
        name: "description",
        content: "AI-powered interactive teaching board for JEE concepts.",
      },
      { property: "og:title", content: "Teaching Board" },
      { property: "og:url", content: "https://addict-to-consistency.lovable.app/teach" },
    ],
    links: [{ rel: "canonical", href: "https://addict-to-consistency.lovable.app/teach" }],
  }),
  component: TeachPage,
});

function parseBoardElementJson(jsonStr: string) {
  // Pre-fix: single \f,\n,\t,\b,\r before letters are LaTeX commands (\frac, \theta etc.)
  // but JSON interprets them as control chars. Only fix SINGLE backslashes (not already-doubled \\frac).
  // Negative lookbehind (?<!\\) prevents doubling already-correct double-escaped sequences.
  const preFixed = jsonStr.replace(/(?<!\\)\\([fnrtb])(?=[a-zA-Z])/g, "\\\\$1");
  try {
    return JSON.parse(preFixed);
  } catch (firstError) {
    const escapedJsonStr = preFixed.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
    if (escapedJsonStr === preFixed) {
      throw firstError;
    }

    try {
      return JSON.parse(escapedJsonStr);
    } catch (secondError) {
      console.error("Failed after escaping invalid JSON backslashes:", {
        original: jsonStr,
        escaped: escapedJsonStr,
        firstError,
        secondError,
      });
      throw secondError;
    }
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const PDF_MAX_BYTES = 15 * 1024 * 1024; // 15MB

async function extractPdfContent(
  file: File,
  maxPages: number
): Promise<{ text: string; pageImages: string[]; totalPages: number }> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).href;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const pagesToRead = Math.min(totalPages, maxPages);
  let text = "";
  const pageImages: string[] = [];
  for (let i = 1; i <= pagesToRead; i++) {
    const page = await pdf.getPage(i);
    // Extract text
    const content = await page.getTextContent();
    text += content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ") + "\n";
    // Render page to canvas for vision (diagrams, figures, equations as images)
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      await (page.render as any)({ canvasContext: ctx, viewport }).promise;
      pageImages.push(canvas.toDataURL("image/jpeg", 0.75));
    }
  }
  return { text: text.trim(), pageImages, totalPages };
}

// ─── Guest demo lesson (plays instead of real API for anonymous users) ──────────
const DEMO_ELEMENTS = [
  { type: "ai_header" as const, content: "Newton's Second Law", speak: "Newton's Second Law." },
  { type: "ai_body" as const, content: "Here's the thing most students get wrong — force doesn't create velocity, it creates change in velocity. That's the whole law in one sentence.", speak: "Here's the thing most students get wrong — force doesn't create velocity, it creates change in velocity. That's the whole law in one sentence." },
  { type: "ai_body" as const, content: "We start from momentum. Force is defined as the rate of change of momentum:", speak: "We start from momentum. Force is defined as the rate of change of momentum:" },
  { type: "ai_math" as const, latex: "F = \\frac{dp}{dt} = \\frac{d(mv)}{dt}", speak: "F equals d p by d t, which equals d of m times v, by d t." },
  { type: "ai_body" as const, content: "For constant mass, this collapses to the form you know:", speak: "For constant mass, this collapses to the form you know:" },
  { type: "ai_math" as const, latex: "F = m \\cdot a", speak: "F equals m times a." },
  { type: "ai_highlight" as const, latex: "\\boxed{F = m \\cdot a}", speak: "And that gives us our result — F equals m times a." },
  { type: "ai_tip" as const, content: "In JEE, always draw a free-body diagram before writing the equation. Forces you miss in the diagram, you miss in the equation.", speak: "In JEE, always draw a free-body diagram before writing the equation. Forces you miss in the diagram, you miss in the equation." },
];

function useIsPortraitMobile() {
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 && window.innerHeight > window.innerWidth
  );
  useEffect(() => {
    const check = () => setIsPortrait(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => { window.removeEventListener("resize", check); window.removeEventListener("orientationchange", check); };
  }, []);
  return isPortrait;
}

// Covers portrait AND landscape mobile (header is hidden in both)
function useIsMobileDevice() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && (window.innerWidth < 768 || window.innerHeight < 500)
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || window.innerHeight < 500);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => { window.removeEventListener("resize", check); window.removeEventListener("orientationchange", check); };
  }, []);
  return isMobile;
}

function TeachPage() {
  // ── UI state ──
  const [boardConfig, setBoardConfig] = useState<BoardConfig>(() => {
    try {
      const saved = localStorage.getItem("teach-board-mode") as "blackboard" | "whiteboard" | null;
      return { mode: saved ?? "blackboard", content: "" };
    } catch {
      return { mode: "blackboard", content: "" };
    }
  });
  const [aiState, setAiState] = useState<AIState>("idle");
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [visibleFrom, setVisibleFrom] = useState(0);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const loadingEarlierRef = useRef(false);
  const isRevealingRef = useRef(false);
  const pendingQueueRef = useRef<BoardElement[]>([]);
  const drainPromiseRef = useRef<Promise<void> | null>(null);
  const [dockInput, setDockInput] = useState<DockInputState>({
    text: "",
    isRecording: false,
  });
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [isAttachmentUploading, setIsAttachmentUploading] = useState(false);
  const [pdfTruncationNotice, setPdfTruncationNotice] = useState<string | null>(null);
  const [filesRemovedNotice, setFilesRemovedNotice] = useState(false);

  // ── Checkpoint state ──
  const [checkpointElementId, setCheckpointElementId] = useState<string | null>(null);

  // ── MCQ revealed answers: groupId → correct label ──
  const [optionAnswers, setOptionAnswers] = useState<Record<string, string>>({});

  // ── TTS ──
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsEnabledRef = useRef(ttsEnabled);
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);

  // ── TTS missed-chunk notification + replay confirmation ──
  const [ttsDropNotice, setTtsDropNotice] = useState<null | "filling" | "ready">(null);
  const [replayConfirmOpen, setReplayConfirmOpen] = useState(false);

  // ── Per-element speak ──
  const [elementSpeakEnabled, setElementSpeakEnabled] = useState(false);
  const [speakingElementId, setSpeakingElementId] = useState<string | null>(null);
  const blockSpeakAbortRef = useRef(false);

  // ── Language (voice/speak) ──
  const [language, setLanguage] = useState<"english" | "hinglish" | "hindi">(() => {
    try { return (localStorage.getItem("teach-language") as "english" | "hinglish" | "hindi") ?? "english"; } catch { return "english"; }
  });
  const languageRef = useRef(language);
  useEffect(() => { languageRef.current = language; }, [language]);
  const handleLanguageChange = useCallback((l: "english" | "hinglish" | "hindi") => {
    setLanguage(l);
    languageRef.current = l;
    try { localStorage.setItem("teach-language", l); } catch {}
  }, []);

  // ── Board language (what language board content is written in) ──
  const [boardLanguage, setBoardLanguage] = useState<"english" | "hinglish" | "hindi">(() => {
    try { return (localStorage.getItem("teach-board-language") as "english" | "hinglish" | "hindi") ?? "english"; } catch { return "english"; }
  });
  const boardLanguageRef = useRef(boardLanguage);
  useEffect(() => { boardLanguageRef.current = boardLanguage; }, [boardLanguage]);
  const handleBoardLanguageChange = useCallback((l: "english" | "hinglish" | "hindi") => {
    setBoardLanguage(l);
    boardLanguageRef.current = l;
    try { localStorage.setItem("teach-board-language", l); } catch {}
  }, []);

  // ── Playback speed ──
  const [speed, setSpeed] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("teach-speed") || "1") || 1; } catch { return 1; }
  });
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  const handleSpeedChange = useCallback((s: number) => {
    setSpeed(s);
    speedRef.current = s;
    try { localStorage.setItem("teach-speed", String(s)); } catch {}
  }, []);

  // ── Error state ──
  const [errorText, setErrorText] = useState<string | null>(null);

  // ── Canvas ──
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [canvasTool, setCanvasTool] = useState<CanvasTool>("pen");
  const [canvasColor, setCanvasColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(CANVAS_BRUSH_SIZE_DEFAULT);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const canvasRef = useRef<CanvasOverlayHandle>(null);

  // ── Mode ──
  const [mode, setMode] = useState<TeachMode | null>(null);
  const modeRef = useRef<TeachMode | null>(null);
  const [subMode, setSubMode] = useState<SubMode>("general");
  const subModeRef = useRef<SubMode>("general");
  const [pendingSubMode, setPendingSubMode] = useState<SubMode | null>(null);
  useEffect(() => {
    modeRef.current = mode;
    if (mode !== "jee" && mode !== "neet") {
      setSubMode("general");
      subModeRef.current = "general";
    }
  }, [mode]);

  useEffect(() => {
    subModeRef.current = subMode;
  }, [subMode]);

  // ── Session history ──
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const preloadedSessionsRef = useRef<TeachSession[]>([]);
  const [boardInstant, setBoardInstant] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const currentSessionIdRef = useRef<string | null>(null);
  const savedElementCountRef = useRef(0);
  const drainAbortRef = useRef(false);
  const drainPausedRef = useRef(false);
  const guestAudioRef = useRef<HTMLAudioElement | null>(null);
  const guestDemoStoppedRef = useRef(false);
  const drainInterruptRef = useRef<(() => void) | null>(null);
  const replaySnapshotRef = useRef<BoardElement[]>([]); // full element list before replay clears board
  const [isPaused, setIsPaused] = useState(false);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);

  // ── Prompt quota ──
  const { user } = useAuth();
  const { profile } = useProfile();
  const isJeeUser = profile?.mode === "jee";

  // Auto-default board mode to "jee" for JEE-onboarded users so they never see the picker
  useEffect(() => {
    if (isJeeUser && mode === null) setMode("jee");
  }, [isJeeUser, mode]);

  const [changeModeOpen, setChangeModeOpen] = useState(false);

  // ── Device guard — register on Studio open, not after AI message ──
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [ipBlocked, setIpBlocked] = useState(false);
  const deviceRegisteredRef = useRef(false);
  useEffect(() => {
    if (!user?.uid || user.isAnonymous) return;
    checkDeviceAllowed(user.uid).then(({ allowed }) => {
      if (!allowed) {
        setDeviceBlocked(true);
      } else if (!deviceRegisteredRef.current) {
        deviceRegisteredRef.current = true;
        void registerDeviceUsage(user.uid);
      }
    });
  }, [user?.uid]);

  // Silently preload last 2 sessions on mount so history opens instantly
  useEffect(() => {
    if (!user?.uid) return;
    listTeachSessionsPaged(user.uid, 2).then(({ sessions }) => {
      preloadedSessionsRef.current = sessions;
    });
  }, [user?.uid]);

  const [promptCount, setPromptCount] = useState<number>(0);
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(() => {
    try { return !localStorage.getItem("teach-intro-seen"); } catch { return false; }
  });
  const promptCountRef = useRef(0);
  useEffect(() => {
    promptCountRef.current = promptCount;
  }, [promptCount]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setPromptCount(0);
      setQuotaLoaded(true);
      return;
    }
    setQuotaLoaded(false);
    getTeachPromptCount(user.uid).then((n) => {
      if (!cancelled) {
        setPromptCount(n);
        setQuotaLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const remaining = Math.max(0, TEACH_PROMPT_LIMIT - promptCount);
  const isBlocked = quotaLoaded && remaining <= 0;

  // Keep a stable ref so the async stream closure always reads fresh elements
  const elementsRef = useRef<BoardElement[]>([]);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // Auto-load earlier elements when user scrolls to top sentinel
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || visibleFrom === 0) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingEarlierRef.current) {
        loadingEarlierRef.current = true;
        setVisibleFrom(prev => Math.max(0, prev - 20));
        requestAnimationFrame(() => { loadingEarlierRef.current = false; });
      }
    }, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleFrom]);

  const drainNext = useCallback(() => {
    if (isRevealingRef.current) {
      return drainPromiseRef.current ?? Promise.resolve();
    }

    isRevealingRef.current = true;
    drainPromiseRef.current = (async () => {
      try {
        while (pendingQueueRef.current.length > 0 && !drainAbortRef.current && !drainPausedRef.current) {
          const next = pendingQueueRef.current.shift();
          if (!next) continue;

          if (next.type === "ai_3d_build") {
            // Append new objects to the referenced ai_3d_scene + record build element
            setElements(prev => {
              const updated = prev.map(e =>
                e.type === "ai_3d_scene" && e.sceneId === next.sceneId
                  ? { ...e, objects: [...e.objects, ...next.add] }
                  : e
              );
              return [...updated, next];
            });
          } else {
            setElements((prev) => [...prev, next]);
          }

          let delay = 300;
          if (next.type === "ai_body") {
            delay = getWritingDuration(next.content || "");
          } else if (
            next.type === "ai_math" ||
            next.type === "ai_step" ||
            next.type === "ai_highlight"
          ) {
            delay = 800;
          } else if (next.type === "ai_header") {
            delay = 400;
        } else if (
          next.type === "ai_warning" ||
          next.type === "ai_tip" ||
          next.type === "ai_question"
        ) {
          delay = 600;
        } else if (
          next.type === "ai_graph" ||
          next.type === "ai_semantic_diagram" ||
          next.type === "ai_diagram_v2" ||
          next.type === "ai_3d_scene" ||
          next.type === "ai_3d_shape"
        ) {
          delay = 700;
        } else if (next.type === "ai_diagram" || next.type === "ai_divider") {
          delay = 300;
        } else if (next.type === "ai_3d_build") {
          delay = 900; // time for Three.js to render the new object
        }

          const animPromise = new Promise<void>((resolve) => setTimeout(resolve, Math.round(delay / speedRef.current)));

          const speakText = next.speak ?? ("content" in next ? next.content : "");
          const usingFallback = !next.speak && "content" in next;
          if (languageRef.current !== "english") {
            console.log(`[TTS] type=${next.type} | fallback=${usingFallback} | lang=${languageRef.current} | text="${speakText.slice(0, 80)}"`);
          }
          const shouldSpeak = ttsEnabledRef.current && speakText.trim() !== "" && next.type !== "ai_divider";
          const speakToken = shouldSpeak && user ? await user.getIdToken() : null;
          const speakPromise = shouldSpeak ? speakElement(speakText, speakToken, speedRef.current, languageRef.current) : Promise.resolve();

          // Pipeline: pre-fetch next element's audio while current plays (all languages)
          if (ttsEnabledRef.current && speakToken) {
            const nextEl = pendingQueueRef.current[0];
            if (nextEl) {
              const nextSpeak = nextEl.speak ?? ("content" in nextEl ? nextEl.content : "");
              if (nextSpeak.trim() && nextEl.type !== "ai_divider") {
                void prefetchAudio(nextSpeak, speakToken, languageRef.current);
              }
            }
          }

          // Interruptible await — stop/pause resolve this immediately
          await new Promise<void>((resolve) => {
            let settled = false;
            const finish = () => { if (!settled) { settled = true; resolve(); } };
            Promise.all([animPromise, speakPromise]).then(finish);
            drainInterruptRef.current = finish;
          });
          drainInterruptRef.current = null;
          if (drainAbortRef.current || drainPausedRef.current) break;

          if (next.type === "ai_question") {
            setCheckpointElementId(next.id);
          }
        }
      } finally {
        isRevealingRef.current = false;
        drainPromiseRef.current = null;
      }
    })();

    return drainPromiseRef.current;
  }, [setElements, setCheckpointElementId]);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => setIsFullscreen((prev) => !prev), []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // ── Board mode toggle ──
  const handleCloseIntro = useCallback(() => {
    setIntroOpen(false);
    try { localStorage.setItem("teach-intro-seen", "1"); } catch {}
  }, []);

  const handleToggleBoardMode = useCallback(() => {
    setBoardConfig((prev) => {
      const next = prev.mode === "blackboard" ? "whiteboard" : "blackboard";
      try { localStorage.setItem("teach-board-mode", next); } catch {}
      return { ...prev, mode: next };
    });
  }, []);

  // ── Core streaming function ────────────────────────────────────────────────
  const streamToBoard = useCallback(
    async (
      messages: { role: string; content: string }[],
      requestAttachments: UploadedAttachment[] = []
    ) => {
      setBoardInstant(false);
      const workerUrl = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";
      try {
        // Get fresh Firebase ID token for server-side auth verification
        const idToken = user ? await user.getIdToken() : null;
        const response = await fetch(workerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            messages,
            attachments: requestAttachments,
            sessionStorageUrls: [...new Set([
              ...elementsRef.current
                .filter(el => el.type === "student_text")
                .flatMap(el => (el.attachments ?? []).map((a: UploadedAttachment) => a.storageUrl).filter(Boolean)),
              ...requestAttachments.map(a => a.storageUrl).filter(Boolean),
            ])],
            mode: modeRef.current ?? "jee",
            subMode: subModeRef.current,
            uid: user?.uid,
            language: languageRef.current,
            boardLanguage: boardLanguageRef.current,
          }),
        });

        if (!response.ok) {
          if (!response.ok) {
            const data = await response.json().catch(() => ({})) as { error?: string };
            // Remove the student's question from board on auth/limit errors
            if (data.error === "IP_LIMIT_REACHED" || data.error === "QUOTA_EXCEEDED" || data.error === "GUEST_BLOCKED" || data.error === "INVALID_TOKEN") {
              setElements(prev => {
                const last = prev.at(-1);
                return last?.type === "student_text" ? prev.slice(0, -1) : prev;
              });
            }
            if (data.error === "IP_LIMIT_REACHED") { setIpBlocked(true); return false; }
            if (data.error === "QUOTA_EXCEEDED") { setFeedbackOpen(true); return false; }
            if (data.error === "GUEST_BLOCKED") { return false; }
            throw new Error(`Worker returned status ${response.status}`);
          }
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is not readable");

        setAiState("speaking");
        const decoder = new TextDecoder("utf-8");
        let accumulatedSseText = "";
        let aiTextBuffer = "";
        let rawModelText = "";
        const processedElements = new Set<string>();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedSseText += chunk;

          const sseLines = accumulatedSseText.split("\n");
          accumulatedSseText = sseLines.pop() || "";

          for (const line of sseLines) {
            const trimmed = line.trim();
            if (trimmed === "data: [DONE]") continue;
            if (!trimmed) continue;

            if (trimmed.startsWith("data: ")) {
              try {
                const sseData = JSON.parse(trimmed.slice(6));
                const content = sseData.choices?.[0]?.delta?.content || "";
                rawModelText += content;
                aiTextBuffer += content;
              } catch {
                // partial SSE — ignore
              }
            }
          }

          const aiLines = aiTextBuffer.split("\n");
          aiTextBuffer = aiLines.pop() || "";

          for (const aiLine of aiLines) {
            const elementTrimmed = aiLine.trim();
            if (elementTrimmed.startsWith("[ELEMENT]: ")) {
              const jsonStr = elementTrimmed.slice(11).trim();
              if (!processedElements.has(jsonStr)) {
                processedElements.add(jsonStr);
                try {
                  const parsed = parseBoardElementJson(jsonStr) as Omit<BoardElement, "id">;
                  const el: BoardElement = { ...parsed, id: nanoid() } as BoardElement;
                  pendingQueueRef.current.push(el);
                  // Prefetch audio the moment element arrives — eliminates first-element gap
                  if (ttsEnabledRef.current && el.type !== "ai_divider") {
                    const elSpeak = (el as any).speak ?? ("content" in el ? (el as any).content : "");
                    if (elSpeak?.trim()) {
                      user?.getIdToken().then(tok => prefetchAudio(elSpeak, tok, languageRef.current)).catch(() => {});
                    }
                  }
                  void drainNext();
                } catch (parseError) {
                  console.error("Failed to parse board element JSON:", jsonStr, parseError);
                }
              }
            }
          }
        }

        const finalElementLine = aiTextBuffer.trim();
        if (finalElementLine.startsWith("[ELEMENT]: ")) {
          const jsonStr = finalElementLine.slice(11).trim();
          if (!processedElements.has(jsonStr)) {
            processedElements.add(jsonStr);
            try {
              const parsed = parseBoardElementJson(jsonStr) as Omit<BoardElement, "id">;
              const el: BoardElement = { ...parsed, id: nanoid() } as BoardElement;
              pendingQueueRef.current.push(el);
              if (ttsEnabledRef.current && el.type !== "ai_divider") {
                const elSpeak = (el as any).speak ?? ("content" in el ? (el as any).content : "");
                if (elSpeak?.trim()) {
                  user?.getIdToken().then(tok => prefetchAudio(elSpeak, tok, languageRef.current)).catch(() => {});
                }
              }
              void drainNext();
            } catch (parseError) {
              console.error("Failed to parse final board element JSON:", jsonStr, parseError);
            }
          }
        }
        const finalDrain = drainNext();
        await finalDrain;

        // If any TTS chunks were dropped (429 TTS_BUSY), background-fill the cache
        if (hasMissedTTSChunks()) {
          setTtsDropNotice("filling");
          const fillToken = user ? await user.getIdToken() : null;
          void startTTSBackgroundFill(fillToken, () => {
            setTtsDropNotice("ready");
          });
        }

        // Vision re-check any 3D scenes that were added in this response
        void verify3DScenes(elementsRef.current);
        return true;
      } catch (err: any) {
        console.error("Streaming error:", err);
        const msg: string = err?.message ?? "";
        const friendly =
          msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("network")
            ? "Couldn't reach the server — check your internet connection."
            : msg.includes("status 5") || msg.includes("500") || msg.includes("502") || msg.includes("503")
            ? "The server ran into a problem. Please retry in a moment."
            : msg.includes("status 4") || msg.includes("401") || msg.includes("403")
            ? "Authentication error — try refreshing the page."
            : msg.includes("body is not readable") || msg.includes("parse")
            ? "Received an unexpected response. Please retry."
            : "Something went wrong. Please retry.";
        setErrorText(friendly);
        return false;
      } finally {
        setAiState("idle");
      }
    },
    [drainNext]
  );

  // ── Build history from current elements ───────────────────────────────────
  const buildHistory = useCallback(
    (els: BoardElement[]): { role: string; content: string }[] =>
      els.reduce<{ role: string; content: string }[]>((acc, el) => {
        if (el.type === "student_text") {
          // Re-attach PDF text into history so the model retains context across turns
          const attachmentText = (el.attachments ?? [])
            .filter(a => a.kind === "pdf" && a.text)
            .map(a => `[Attached PDF — ${a.name}]:\n${a.text}`)
            .join("\n\n");
          const imageCount = (el.attachments ?? []).filter(a => a.kind === "image").length;
          const imageNote = imageCount > 0 ? `[${imageCount} image${imageCount > 1 ? "s" : ""} attached to this message]` : "";
          const fullContent = [el.content, attachmentText, imageNote].filter(Boolean).join("\n\n");
          acc.push({ role: "user", content: fullContent });
        } else {
          const last = acc[acc.length - 1];
          // Re-create the element for history representation without the speak field
          const histObj: any = { type: el.type };
          if ("content" in el) histObj.content = el.content;
          if ("latex" in el) histObj.latex = el.latex;
          if ("number" in el) histObj.number = el.number;
          if ("label" in el) histObj.label = el.label;
          if ("description" in el) histObj.description = el.description;
          if ("title" in el) histObj.title = el.title;
          if ("points" in el) histObj.points = el.points;
          if ("objects" in el) histObj.objects = el.objects;
          if ("entities" in el) histObj.entities = el.entities;
          if ("view" in el) histObj.view = el.view;
          if ("shape" in el) histObj.shape = el.shape;
          if ("vectors" in el) histObj.vectors = el.vectors;
          if ("labels" in el) histObj.labels = el.labels;
          if ("camera" in el) histObj.camera = el.camera;
          if ("xLabel" in el) histObj.xLabel = el.xLabel;
          if ("yLabel" in el) histObj.yLabel = el.yLabel;

          const summary = `[ELEMENT]: ${JSON.stringify(histObj)}`;
          if (last?.role === "assistant") {
            last.content += "\n" + summary;
          } else {
            acc.push({ role: "assistant", content: summary });
          }
        }
        return acc;
      }, []),
    []
  );

  // ── Send a message (from dock or checkpoint) ──────────────────────────────
  const sendMessage = useCallback(
    (text: string) => {
      // Quota gate
      if (quotaLoaded && promptCountRef.current >= TEACH_PROMPT_LIMIT) {
        toast.error("You've used all 5 free prompts. Thanks for trying Matrix!");
        setFeedbackOpen(true);
        return;
      }
      if (!user?.uid) {
        toast.error("Please sign in to use the AI teaching board.");
        return;
      }


      // Clear any prior error
      setErrorText(null);

      // Reset TTS missed-chunk state for this new response
      resetTTSMissedQueue();
      setTtsDropNotice(null);

      // Clear pause if active
      drainPausedRef.current = false;
      setIsPaused(false);

      // Stop any ongoing TTS
      stopCurrentSpeech();

      // Clear any pending queue
      pendingQueueRef.current = [];

      const messageAttachments = attachments;
      const studentContent = text.trim();
      // Increment lifetime quota only now — user actually sent the attachments
      if (messageAttachments.length > 0 && user?.uid) {
        for (const a of messageAttachments) {
          void incrementAttachmentUsage(user.uid, a.kind);
        }
      }

      // Append student element immediately
      const studentEl: BoardElement = {
        id: nanoid(),
        type: "student_text",
        content: studentContent,
        attachments: messageAttachments,
      };
      setElements((prev) => [...prev, studentEl]);
      setDockInput((prev) => ({ ...prev, text: "" }));
      setAttachments([]);
      setPdfTruncationNotice(null);
      setAiState("thinking");

      // Build history including the newly added student element
      const history = buildHistory([...elementsRef.current, studentEl]);
      const messages = [...history];

      const uid = user.uid;
      const isFirstMessage = elementsRef.current.length === 0;
      const allStudentMessages = [...elementsRef.current, { type: "student_text", content: studentContent } as BoardElement]
        .filter((el) => el.type === "student_text");
      const meaningfulMsg = allStudentMessages.find((el) => {
        const item = el as any;
        return item.content && item.content.trim().split(" ").length > 3;
      }) as any;
      const sessionTitle = ((meaningfulMsg?.content as string) || studentContent).slice(0, 80);
      void (async () => {
        const ok = await streamToBoard(messages, messageAttachments);
        if (!ok) return;
        try {
          await saveSession(sessionTitle);
        } catch (e) {
          console.error("Failed to save session:", e);
          toast.warning("Session couldn't be saved", {
            action: {
              label: "Retry",
              onClick: () => { void saveSession(sessionTitle).catch(() => toast.error("Save failed again — check your connection")); },
            },
          });
        }
        try {
          // Worker already incremented Firestore — update local UI state only
          const next = promptCountRef.current + 1;
          setPromptCount(next);
          promptCountRef.current = next;
          const remainingAfter = TEACH_PROMPT_LIMIT - next;
          if (next >= TEACH_PROMPT_LIMIT) {
            setFeedbackOpen(true);
            // Delete from R2
            const sessionStorageUrls = elementsRef.current
              .filter(el => el.type === "student_text")
              .flatMap(el => (el.attachments ?? []).map((a: UploadedAttachment) => a.storageUrl).filter(Boolean)) as string[];
            if (sessionStorageUrls.length > 0) {
              const workerBase = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";
              const delToken = user ? await user.getIdToken() : null;
              if (delToken) {
                sessionStorageUrls.forEach(key => {
                  fetch(`${workerBase}/api/attachments/${encodeURIComponent(key)}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${delToken}` },
                  }).then(res => {
                    if (!res.ok) console.warn(`R2 delete failed for key ${key}: ${res.status}`);
                  }).catch(err => console.warn("R2 delete error:", err));
                });
              }
              setFilesRemovedNotice(true);
            }
          } else if (remainingAfter === 2 || remainingAfter === 1) {
            toast.warning(
              `${remainingAfter} free prompt${remainingAfter === 1 ? "" : "s"} left`,
              { description: "You have a limited number of teaching prompts." }
            );
          }
        } catch {
          // increment failed (offline / rules) — surface gracefully
        }
      })();
      void isFirstMessage;
    },
    [attachments, buildHistory, streamToBoard, quotaLoaded, user?.uid]
  );

  // ── Save session (extracted so it can be retried independently) ─────────
  const saveSession = useCallback(async (sessionTitle?: string) => {
    const uid = user?.uid;
    if (!uid) return;
    const idToken = await user!.getIdToken();
    const sessionId = currentSessionIdRef.current ?? nanoid();
    const allElements = elementsRef.current;

    // Save all elements to R2 (1 write regardless of element count)
    await saveSessionElements(uid, sessionId, allElements, idToken);

    if (!currentSessionIdRef.current) {
      const now = Date.now();
      const newSession: TeachSession = {
        id: sessionId,
        title: sessionTitle ?? "",
        mode: modeRef.current ?? "jee",
        subMode: subModeRef.current !== "general" ? subModeRef.current : undefined,
        createdAt: now,
        updatedAt: now,
        elementCount: allElements.length,
      };
      // Create Firestore metadata doc (1 write)
      await createTeachSession(uid, sessionId, sessionTitle ?? "", allElements.length, modeRef.current ?? "jee", subModeRef.current !== "general" ? subModeRef.current : undefined);
      savedElementCountRef.current = allElements.length;
      setCurrentSessionId(sessionId);
      preloadedSessionsRef.current = [newSession, ...preloadedSessionsRef.current];
    } else {
      // Update Firestore metadata (1 write)
      await updateSessionMetadata(uid, sessionId, allElements.length, sessionTitle);
      savedElementCountRef.current = allElements.length;
      preloadedSessionsRef.current = preloadedSessionsRef.current.map(s =>
        s.id === sessionId ? { ...s, ...(sessionTitle ? { title: sessionTitle } : {}), updatedAt: Date.now(), elementCount: allElements.length } : s
      );
    }
  }, [user]);

  // ── Replay current board ─────────────────────────────────────────────────
  const doReplay = useCallback(async () => {
    const snapshot = replaySnapshotRef.current.length > 0
      ? replaySnapshotRef.current          // re-replay from full snapshot
      : [...elementsRef.current];          // first replay — snapshot current board
    if (snapshot.length === 0) return;
    replaySnapshotRef.current = snapshot;  // always keep full snapshot
    drainAbortRef.current = false;
    stopCurrentSpeech();
    pendingQueueRef.current = [];
    setElements([]);
    setBoardInstant(false);
    setIsReplaying(true);
    setReplayMode(true);
    await new Promise(r => setTimeout(r, 50));
    pendingQueueRef.current = [...snapshot];
    await drainNext();
    // only reset if not aborted (stop sets its own state)
    if (!drainAbortRef.current) {
      setIsReplaying(false);
      setReplayMode(false);
    }
  }, [drainNext]);

  const handleReplay = useCallback(() => {
    // If background fill is still in progress, ask for confirmation first
    if (ttsDropNotice === "filling") {
      setReplayConfirmOpen(true);
      return;
    }
    void doReplay();
  }, [doReplay, ttsDropNotice]);

  const handleStopReplay = useCallback(() => {
    drainInterruptRef.current?.();
    drainAbortRef.current = true;
    pendingQueueRef.current = [];
    stopCurrentSpeech();
    stopAllTypewriters();
    setIsReplaying(false);
    setReplayMode(false);
  }, []);

  const handleSpeakElement = useCallback(async (speakText: string, id: string) => {
    // Abort any in-progress block replay
    blockSpeakAbortRef.current = true;
    if (speakingElementId === id) {
      stopCurrentSpeech();
      setSpeakingElementId(null);
      return;
    }
    stopCurrentSpeech();
    setSpeakingElementId(id);
    const token = user ? await user.getIdToken() : null;
    await speakElement(speakText, token, speedRef.current, languageRef.current);
    setSpeakingElementId(prev => prev === id ? null : prev);
  }, [speakingElementId, user]);

  const handleStopBlock = useCallback(() => {
    blockSpeakAbortRef.current = true;
    stopCurrentSpeech();
    setSpeakingElementId(null);
  }, []);

  const handleSpeakBlock = useCallback(async (items: Array<{ speak: string; id: string }>) => {
    // Stop any existing speech or block replay
    blockSpeakAbortRef.current = true;
    stopCurrentSpeech();
    setSpeakingElementId(null);
    await new Promise<void>(r => setTimeout(r, 60));
    blockSpeakAbortRef.current = false;
    const token = user ? await user.getIdToken() : null;
    for (const item of items) {
      if (blockSpeakAbortRef.current) break;
      setSpeakingElementId(item.id);
      await speakElement(item.speak, token, speedRef.current, languageRef.current);
    }
    if (!blockSpeakAbortRef.current) setSpeakingElementId(null);
  }, [user]);

  const handlePauseLive = useCallback(() => {
    drainInterruptRef.current?.();
    drainPausedRef.current = true;
    stopCurrentSpeech();
    stopAllTypewriters();
    setIsPaused(true);
  }, []);

  const handleResumeLive = useCallback(() => {
    drainPausedRef.current = false;
    setIsPaused(false);
    void (async () => {
      setAiState("speaking");
      await drainNext();
      setAiState("idle");
      if (currentSessionIdRef.current) {
        void saveSession("").catch(() => toast.warning("Session couldn't be saved", {
          action: { label: "Retry", onClick: () => { void saveSession("").catch(() => toast.error("Save failed again — check your connection")); } },
        }));
      }
    })();
  }, [drainNext, user?.uid]);

  const handleResume = useCallback(async () => {
    const snapshot = replaySnapshotRef.current;
    if (snapshot.length === 0) return;
    const revealedIds = new Set(elementsRef.current.map(e => e.id));
    const remaining = snapshot.filter(e => !revealedIds.has(e.id));
    if (remaining.length === 0) return;
    drainAbortRef.current = false;
    setIsReplaying(true);
    setReplayMode(true);
    pendingQueueRef.current = remaining;
    await drainNext();
    if (!drainAbortRef.current) {
      setIsReplaying(false);
      setReplayMode(false);
    }
  }, [drainNext]);

  // ── Vision re-check for 3D scenes ────────────────────────────────────────
  const verify3DScenes = useCallback(async (els: BoardElement[]) => {
    const workerUrl = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";
    const scenes = els.filter(e => e.type === "ai_3d_scene" && (e as any).sceneId);
    for (const scene of scenes) {
      const s = scene as Extract<BoardElement, { type: "ai_3d_scene" }>;
      if (!s.sceneId) continue;
      await new Promise(r => setTimeout(r, 800)); // let Three.js finish rendering
      const dataUrl = captureScene(s.sceneId);
      if (!dataUrl) continue;
      try {
        const verifyToken = user ? await user.getIdToken() : null;
        const res = await fetch(`${workerUrl}/api/verify-3d`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(verifyToken ? { "Authorization": `Bearer ${verifyToken}` } : {}),
          },
          body: JSON.stringify({ imageDataUrl: dataUrl, title: s.title ?? "3D scene" }),
        });
        const { ok, feedback } = await res.json() as { ok: boolean; feedback: string };
        if (!ok) {
          const correctionEl: BoardElement = {
            id: nanoid(),
            type: "ai_body",
            content: `Diagram note: ${feedback}`,
            speak: `Quick note on the diagram — ${feedback}`,
          };
          setElements(prev => [...prev, correctionEl]);
        }
      } catch { /* non-fatal */ }
    }
  }, []);

  // ── New session ──────────────────────────────────────────────────────────
  const handleNewSession = useCallback(() => {
    drainInterruptRef.current?.();
    drainAbortRef.current = true;
    drainPausedRef.current = false;
    stopCurrentSpeech();
    if (guestAudioRef.current) {
      guestAudioRef.current.pause();
      guestAudioRef.current.src = "";
      guestAudioRef.current = null;
    }
    pendingQueueRef.current = [];
    replaySnapshotRef.current = [];
    setElements([]);
    elementsRef.current = [];
    savedElementCountRef.current = 0;
    setVisibleFrom(0);
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setIsReplaying(false);
    setIsPaused(false);
    setReplayMode(false);
    setMode(null);       // auto-default effect will re-set to "jee" for JEE users
    setChangeModeOpen(false);
    setErrorText(null);
    setCheckpointElementId(null);
    setAttachments([]);
    resetTTSMissedQueue();
    setTtsDropNotice(null);
    setReplayConfirmOpen(false);
    blockSpeakAbortRef.current = true;
    setSpeakingElementId(null);
    drainAbortRef.current = false;
  }, []);

  // ── Load session ──────────────────────────────────────────────────────────
  const handleLoadSession = useCallback((session: TeachSession) => {
    if (!user?.uid) return;
    void (async () => {
      stopCurrentSpeech();
      pendingQueueRef.current = [];
      stopAllTypewriters();
      replaySnapshotRef.current = [];
      setElements([]);
      elementsRef.current = [];

      setBoardInstant(true);
      const idToken = await user.getIdToken();
      const loaded = await loadSessionElements(user.uid, session.id, idToken);
      elementsRef.current = loaded;
      setElements(loaded);
      savedElementCountRef.current = session.elementCount ?? loaded.length;
      setVisibleFrom(Math.max(0, loaded.length - 35));
      setCurrentSessionId(session.id);
      currentSessionIdRef.current = session.id;
      setMode((session.mode as any) ?? "jee");
      const restoredSubMode = (session.subMode as SubMode) ?? "general";
      setSubMode(restoredSubMode);
      subModeRef.current = restoredSubMode;
      setErrorText(null);
      setCheckpointElementId(null);
      toast.success(`Loaded: "${session.title}"`);
    })();
  }, [user?.uid]);

  // ── Retry sending the last student message ──────────────────────────────
  const handleRetry = useCallback(() => {
    const lastStudent = [...elementsRef.current]
      .reverse()
      .find((el) => el.type === "student_text");
    if (!lastStudent) return;

    setErrorText(null);
    setAiState("thinking");

    // Build history including the last student text
    const history = buildHistory(elementsRef.current);
    const messages = [...history];

    streamToBoard(messages);
  }, [buildHistory, streamToBoard]);

  // ── Checkpoint answer ─────────────────────────────────────────────────────
  const handleCheckpointAnswer = useCallback(
    (answer: string) => {
      setCheckpointElementId(null);
      sendMessage(answer);
    },
    [sendMessage]
  );

  // ── MCQ option select ─────────────────────────────────────────────────────
  const handleOptionSelect = useCallback(
    (groupId: string, label: string) => {
      // Send choice as a student message — Arjun will confirm/correct
      // The revealed state is set when Arjun explicitly confirms
      sendMessage(`I chose option (${label})`);
      // Optimistically reveal with the chosen label (will be corrected by Arjun's next message if wrong)
      // For now we leave optionAnswers empty — Arjun's response handles it contextually
      void groupId; // reserved for future explicit answer-reveal API
    },
    [sendMessage]
  );

  // ── TeachActions contract ─────────────────────────────────────────────────
  const actions: TeachActions = {
    onSendMessage: sendMessage,
    onToggleRecording: () => {
      setDockInput((prev) => ({ ...prev, isRecording: !prev.isRecording }));
    },
    onUploadFile: async (file) => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) { toast.error("Only images and PDFs are supported."); return; }

      const uid = user?.uid;
      if (!uid) return;

      const kind: UploadedAttachmentKind = isImage ? "image" : "pdf";

      // Check lifetime quota
      const usage = await getAttachmentUsage(uid);
      const pendingPdfs = attachments.filter(a => a.kind === "pdf").length;
      const pendingImages = attachments.filter(a => a.kind === "image").length;
      if (isPdf && usage.pdfUploadsUsed + pendingPdfs >= FREE_PDF_LIMIT) { toast.error("Free plan: 1 PDF lifetime limit reached."); return; }
      if (isImage && usage.imageUploadsUsed + pendingImages >= FREE_IMAGE_LIMIT) { toast.error("Free plan: 2 image lifetime limit reached."); return; }
      if (isPdf && file.size > PDF_MAX_BYTES) { toast.error("PDF must be under 15MB."); return; }

      setIsAttachmentUploading(true);
      try {
        const attachmentId = nanoid();
        const base = { id: attachmentId, name: file.name, mimeType: file.type || "application/octet-stream", size: file.size, kind };

        // Process file: extract text (PDF) + render to image for R2
        let imageBase64: string;
        let text: string | undefined;
        let totalPages = 1;

        if (isPdf) {
          const result = await extractPdfContent(file, 2);
          text = result.text;
          totalPages = result.totalPages;
          // Stitch PDF pages into one tall image for R2
          const pages = result.pageImages;
          if (pages.length > 1) {
            const imgs = await Promise.all(pages.map(src => new Promise<HTMLImageElement>((res, rej) => {
              const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src;
            })));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(...imgs.map(i => i.width));
            canvas.height = imgs.reduce((h, i) => h + i.height, 0);
            const ctx = canvas.getContext("2d")!;
            let y = 0;
            for (const img of imgs) { ctx.drawImage(img, 0, y); y += img.height; }
            imageBase64 = canvas.toDataURL("image/jpeg", 0.75).split(",")[1];
          } else {
            imageBase64 = pages[0]?.split(",")[1] ?? "";
          }
          if (totalPages > 2) setPdfTruncationNotice(`PDF has ${totalPages} pages — only the first 2 were read on free plan.`);
        } else {
          const dataUrl = await readFileAsDataUrl(file);
          imageBase64 = dataUrl.split(",")[1];
        }

        // Upload to R2 via worker
        const mimeType = isPdf ? "image/jpeg" : (file.type || "image/jpeg");
        const binary = atob(imageBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const workerBase = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";
        const idToken = await user!.getIdToken();
        const uploadRes = await fetch(`${workerBase}/api/upload?id=${attachmentId}`, {
          method: "POST",
          headers: { "Content-Type": mimeType, "Authorization": `Bearer ${idToken}` },
          body: bytes,
        });
        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
        let uploadData: { key: string };
        try {
          uploadData = await uploadRes.json() as { key: string };
        } catch {
          throw new Error("Upload response was invalid — please try again");
        }
        const { key: storageUrl } = uploadData;
        setAttachments(prev => [...prev, { ...base, storageUrl, ...(text ? { text } : {}) }]);
      } catch (err) {
        console.error("Failed to upload file:", file.name, err);
        toast.error(`Could not upload ${file.name}`);
      } finally {
        setIsAttachmentUploading(false);
      }
    },
    onRemoveAttachment: (id) => {
      setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
    },
  };

  // ── Guest demo handler ────────────────────────────────────────────────────
  const isGuest = user?.isAnonymous === true;
  const isPortraitMobile = useIsPortraitMobile();
  const isMobileDevice = useIsMobileDevice();
  const swipeTouchStartX = useRef(0);
  const [showMobileControls, setShowMobileControls] = useState(false);

  const handleGuestDemo = useCallback(() => {
    // Stop any previous audio immediately
    if (guestAudioRef.current) {
      guestAudioRef.current.pause();
      guestAudioRef.current.src = "";
      guestAudioRef.current = null;
    }
    drainAbortRef.current = false;
    guestDemoStoppedRef.current = false;
    setErrorText(null);
    setTtsEnabled(false);
    pendingQueueRef.current = [];
    setAiState("thinking");
    void (async () => {
      await new Promise(r => setTimeout(r, 800));
      setAiState("speaking");
      for (let i = 0; i < DEMO_ELEMENTS.length; i++) {
        if (guestDemoStoppedRef.current) break;
        const url = `/demo-audio/${String(i + 1).padStart(2, "0")}.mp3`;
        const audio = new Audio(url);
        guestAudioRef.current = audio;
        const audioPromise = new Promise<void>(resolve => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
        pendingQueueRef.current = [{ ...DEMO_ELEMENTS[i], id: nanoid() } as BoardElement];
        await Promise.all([audioPromise, drainNext()]);
      }
      guestAudioRef.current = null;
      setAiState("idle");
    })();
  }, [drainNext]);

  // ── Dock disabled conditions ──────────────────────────────────────────────
  const dockDisabled = isGuest || aiState === "thinking" || isBlocked || mode === null || deviceBlocked || ipBlocked || isAttachmentUploading;
  const dockPlaceholder = isGuest
    ? "Sign up free to ask anything →"
    : isBlocked
      ? "Prompt limit reached — thanks for trying Matrix"
      : checkpointElementId !== null
        ? "Answer, ask a follow-up, or steer the lesson..."
        : undefined;

  return (
    <>
    <div
      className="relative -mx-2 pb-28"
      onTouchStart={isPortraitMobile ? (e) => { swipeTouchStartX.current = e.touches[0].clientX; } : undefined}
      onTouchEnd={isPortraitMobile ? (e) => {
        const dx = e.changedTouches[0].clientX - swipeTouchStartX.current;
        if (dx > 80 && !isGuest) setHistoryOpen(true);
      } : undefined}
    >
      {/* ── Files removed notice banner ── */}
      <AnimatePresence>
        {filesRemovedNotice && (
          <motion.div
            key="files-removed"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute top-3 left-1/2 z-50 -translate-x-1/2 w-max max-w-[calc(100vw-2rem)]"
          >
            <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-xl"
              style={{
                background: boardConfig.mode === "blackboard" ? "rgba(15,15,25,0.88)" : "rgba(240,240,255,0.95)",
                border: boardConfig.mode === "blackboard" ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(99,102,241,0.4)",
                backdropFilter: "blur(16px)",
              }}
            >
              <FileWarning className="h-4 w-4 shrink-0 text-indigo-400" />
              <p className={`text-xs font-medium leading-snug ${boardConfig.mode === "blackboard" ? "text-indigo-200" : "text-indigo-800"}`}>
                Your uploaded files have been removed — upgrade to keep files across sessions.
              </p>
              <button onClick={() => setFilesRemovedNotice(false)}
                className={`ml-1 rounded p-0.5 transition-colors ${boardConfig.mode === "blackboard" ? "text-indigo-400/60 hover:text-indigo-300" : "text-indigo-600/60 hover:text-indigo-700"}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── PDF truncation notice banner ── */}
      <AnimatePresence>
        {pdfTruncationNotice && (
          <motion.div
            key="pdf-notice"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute top-3 left-1/2 z-50 -translate-x-1/2 w-max max-w-[calc(100vw-2rem)]"
          >
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-xl"
              style={{
                background: boardConfig.mode === "blackboard"
                  ? "rgba(30,20,0,0.82)"
                  : "rgba(255,251,235,0.92)",
                border: boardConfig.mode === "blackboard"
                  ? "1px solid rgba(245,158,11,0.35)"
                  : "1px solid rgba(217,119,6,0.4)",
                backdropFilter: "blur(16px)",
              }}
            >
              <FileWarning className="h-4 w-4 shrink-0 text-amber-400" />
              <p className={`text-xs font-medium leading-snug ${boardConfig.mode === "blackboard" ? "text-amber-200" : "text-amber-800"}`}>
                {pdfTruncationNotice}
              </p>
              <button
                onClick={() => setPdfTruncationNotice(null)}
                className={`ml-1 rounded p-0.5 transition-colors ${boardConfig.mode === "blackboard" ? "text-amber-400/60 hover:text-amber-300" : "text-amber-600/60 hover:text-amber-700"}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Teaching Smartboard ── */}
      <ErrorBoundary>
      <TeachBoard
        config={boardConfig}
        aiState={aiState}
        onToggleBoardMode={handleToggleBoardMode}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        ttsEnabled={ttsEnabled}
        speed={speed}
        onSpeedChange={handleSpeedChange}
        modeBadge={mode ? `${getModeConfig(mode).name}${subMode === "3d" ? " · 3D Beta" : subMode === "2d" ? " · 2D Beta" : ` · ${getModeConfig(mode).persona}`}` : undefined}
        isGuest={isGuest}
        onOpenHistory={isGuest
          ? (aiState === "idle" && elements.length > 0 ? handleGuestDemo : undefined)
          : () => setHistoryOpen(true)
        }
        onNewSession={handleNewSession}
        onReplay={elements.length > 0 && !isReplaying ? handleReplay : undefined}
        onStopReplay={isReplaying ? handleStopReplay : undefined}
        onResume={
          !isReplaying &&
          replaySnapshotRef.current.length > 0 &&
          elements.length < replaySnapshotRef.current.length
            ? handleResume
            : undefined
        }
        onToggleTTS={() => {
          setTtsEnabled((v) => {
            const nextVal = !v;
            if (!nextVal) {
              stopCurrentSpeech();
            }
            return nextVal;
          });
        }}
        elementSpeakEnabled={elementSpeakEnabled}
        elementSpeakAvailable={elements.length > 0}
        onToggleElementSpeak={isGuest ? undefined : () => {
          if (elements.length === 0) {
            toast.info("Start a session first to use speak buttons");
            return;
          }
          setElementSpeakEnabled(v => !v);
        }}
        onShowMobileControls={isMobileDevice && !isGuest ? () => setShowMobileControls(v => !v) : undefined}
        isCanvasActive={isCanvasActive}
        canvasRef={canvasRef}
        canvasTool={canvasTool}
        canvasColor={canvasColor}
        brushSize={brushSize}
        canvasSessionId={currentSessionId}
      >
        {deviceBlocked ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <p className="text-lg font-semibold opacity-60">Free trial unavailable on this device</p>
            <p className="text-sm opacity-35 max-w-xs">This device has already been used with multiple free accounts. Upgrade to continue.</p>
          </div>
        ) : ipBlocked ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <p className="text-lg font-semibold opacity-60">Free trial limit reached</p>
            <p className="text-sm opacity-35 max-w-xs">2 free accounts have already used AI from your network. Upgrade to continue learning.</p>
          </div>
        ) : elements.length === 0 && mode === null ? (
          isGuest ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-sm font-light opacity-40">See how the AI teaches on the board</p>
              <button
                onClick={() => { setMode("jee"); setTimeout(handleGuestDemo, 50); }}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-5 py-2 text-sm font-semibold text-foreground/70 transition-all hover:border-border hover:bg-muted/70 hover:scale-105"
              >
                <Sparkles className="h-4 w-4" />
                Watch Demo
              </button>
              <p className="text-xs opacity-30">Sign up free to ask your own questions</p>
            </div>
          ) : (
            <ModeSelector
              onSelect={setMode}
              isBlackboard={boardConfig.mode === "blackboard"}
            />
          )
        ) : elements.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            {!isGuest && (
              changeModeOpen ? (
                <ModeSelector
                  onSelect={(m) => { setMode(m); setChangeModeOpen(false); }}
                  isBlackboard={boardConfig.mode === "blackboard"}
                  restrictedModes={isJeeUser ? ["jee", "general", "coding"] : undefined}
                />
              ) : (
                <>
                  <p className="text-sm font-light opacity-35">
                    {getModeConfig(mode!).persona} is ready — ask anything
                  </p>
                  <button
                    onClick={() => isJeeUser ? setChangeModeOpen(true) : setMode(null)}
                    className="text-xs opacity-40 hover:opacity-70 transition-opacity underline underline-offset-2"
                  >
                    Change mode
                  </button>
                </>
              )
            )}
          </div>
        ) : (
          <div className="w-full">
            {/* Sentinel — IntersectionObserver loads earlier elements when user scrolls here */}
            {visibleFrom > 0 && <div ref={topSentinelRef} className="h-1 w-full" />}
            <ErrorBoundary>
              <BoardRenderer
                elements={elements.slice(visibleFrom)}
                boardMode={boardConfig.mode}
                checkpointElementId={checkpointElementId}
                onCheckpointAnswer={handleCheckpointAnswer}
                optionAnswers={optionAnswers}
                onOptionSelect={handleOptionSelect}
                onFixElement={(id, newValue) => {
                  const fixEl = (el: BoardElement) => {
                    if (el.id !== id) return el;
                    if (el.type === "ai_body" || el.type === "ai_tip") return { ...el, content: newValue };
                    if (el.type === "ai_math" || el.type === "ai_highlight" || el.type === "ai_step") return { ...el, latex: newValue };
                    return el;
                  };
                  setElements(prev => prev.map(fixEl));
                  elementsRef.current = elementsRef.current.map(fixEl);
                  const sess = currentSessionId;
                  if (sess && user?.uid) {
                    const edited = elementsRef.current.find(e => e.id === id);
                    if (edited) void updateSessionElement(user.uid, sess, edited);
                  }
                }}
                instant={boardInstant}
                showSpeakButtons={elementSpeakEnabled}
                speakingElementId={speakingElementId}
                onSpeakElement={isGuest ? undefined : handleSpeakElement}
                onSpeakBlock={isGuest ? undefined : handleSpeakBlock}
                onStopBlock={isGuest ? undefined : handleStopBlock}
              />
            </ErrorBoundary>

            {/* ── TTS missed-chunk notification ── */}
            <AnimatePresence>
              {aiState === "idle" && ttsDropNotice && (
                <motion.div
                  key="tts-drop-notice"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.25 }}
                  className={`mt-3 flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-medium ${
                    boardConfig.mode === "blackboard"
                      ? "bg-amber-950/30 border border-amber-500/20 text-amber-300"
                      : "bg-amber-50 border border-amber-200 text-amber-700"
                  }`}
                >
                  <span className="shrink-0 text-sm">{ttsDropNotice === "filling" ? "⏳" : "✓"}</span>
                  <span className="flex-1">
                    {ttsDropNotice === "filling"
                      ? "Some audio was skipped — preparing for replay in the background…"
                      : "Audio ready — tap Replay to hear the full session."}
                  </span>
                  {ttsDropNotice === "ready" && (
                    <button
                      onClick={() => void doReplay()}
                      className={`shrink-0 underline underline-offset-2 font-semibold ${
                        boardConfig.mode === "blackboard" ? "text-amber-200 hover:text-amber-100" : "text-amber-800 hover:text-amber-900"
                      }`}
                    >
                      Replay
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </TeachBoard>
      </ErrorBoundary>

      {/* ── Guest demo completion CTA — below the board ── */}
      {isGuest && elements.length > 0 && aiState === "idle" && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">5 free prompts · No credit card</p>
          <button
            onClick={() => window.location.assign("/")}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
          >
            Create Free Account
          </button>
        </div>
      )}

      {/* ── Session controls toolbar (below the board) ── */}
      {!isGuest && (elements.length > 0 || isReplaying || isPaused || (replaySnapshotRef.current.length > 0 && elements.length < replaySnapshotRef.current.length)) && (
        <div className="flex items-center justify-end gap-2 mt-3 px-1">
          {/* Live pause / resume */}
          {!isReplaying && aiState === "speaking" && !isPaused && (
            <button onClick={handlePauseLive} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors">
              <Pause size={13} /> Pause
            </button>
          )}
          {!isReplaying && isPaused && (
            <button onClick={handleResumeLive} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors">
              <Play size={13} /> Resume
            </button>
          )}
          {/* Replay controls */}
          {isReplaying && (
            <button onClick={handleStopReplay} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors">
              <Square size={13} /> Stop
            </button>
          )}
          {!isReplaying && !isPaused && replaySnapshotRef.current.length > 0 && elements.length < replaySnapshotRef.current.length && (
            <button onClick={handleResume} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors">
              <Play size={13} /> Resume
            </button>
          )}
          {elements.length > 0 && !isReplaying && !isPaused && (
            <button onClick={handleReplay} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors">
              <RotateCcw size={13} /> Replay
            </button>
          )}
        </div>
      )}

      {/* ── Error Card ── */}
      {errorText && (
        <ErrorCard
          message={errorText}
          onRetry={handleRetry}
        />
      )}

      {/* ── Mobile controls overlay — shown on triple-tap, dismissed on outside tap ── */}
      <AnimatePresence>
        {isMobileDevice && !isGuest && showMobileControls && (
          <>
            <div className="fixed inset-0 z-[69]" onClick={() => setShowMobileControls(false)} />
            <motion.div
              className="fixed top-16 left-1/2 z-[70] -translate-x-1/2 flex items-center gap-2 rounded-2xl px-3 py-2"
              style={{ background: "rgba(10,10,10,0.92)", backdropFilter: "blur(20px)", boxShadow: "0 0 0 1px rgba(255,255,255,0.09), 0 8px 30px rgba(0,0,0,0.6)" }}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <button onClick={() => { handleToggleBoardMode(); setShowMobileControls(false); }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white/50 hover:bg-white/10 transition-colors">
                {boardConfig.mode === "blackboard" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
              </button>
              <button onClick={() => { setTtsEnabled(v => { if (v) stopCurrentSpeech(); return !v; }); setShowMobileControls(false); }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white/50 hover:bg-white/10 transition-colors">
                {ttsEnabled ? <Volume2 size={15} className="text-emerald-400" /> : <VolumeX size={15} className="text-white/35" />}
              </button>
              <button onClick={() => { const steps = [0.75, 1, 1.25, 1.5, 2]; const idx = steps.indexOf(speed); handleSpeedChange(steps[(idx + 1) % steps.length]); }}
                className="flex h-8 items-center gap-1 rounded-xl px-2 text-white/50 hover:bg-white/10 transition-colors">
                <Gauge size={14} />
                <span className="text-[11px] font-semibold">{speed === 1 ? "1×" : `${speed}×`}</span>
              </button>
              <button onClick={() => { handleNewSession(); setShowMobileControls(false); }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white/50 hover:bg-white/10 transition-colors">
                <Plus size={15} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Canvas Toolbar — desktop only, shown when canvas is active ── */}
      <AnimatePresence>
        {isCanvasActive && !isMobileDevice && (
          <CanvasToolbar
            tool={canvasTool}
            color={canvasColor}
            brushSize={brushSize}
            onToolChange={setCanvasTool}
            onColorChange={setCanvasColor}
            onBrushSizeChange={setBrushSize}
            onUndo={() => canvasRef.current?.undo()}
            onRedo={() => canvasRef.current?.redo()}
            onClear={() => setShowClearConfirm(true)}
          />
        )}
      </AnimatePresence>

      {/* ── Bottom Dock ── */}
      {isGuest ? (
        (aiState === "thinking" || aiState === "speaking") ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <button
              onClick={() => {
                guestDemoStoppedRef.current = true;
                if (guestAudioRef.current) {
                  guestAudioRef.current.pause();
                  guestAudioRef.current.dispatchEvent(new Event("ended"));
                  guestAudioRef.current = null;
                }
                pendingQueueRef.current = [];
              }}
              className="flex items-center gap-2 rounded-full border border-border/60 bg-card/90 backdrop-blur-xl px-5 py-2.5 text-sm font-medium text-muted-foreground shadow-xl transition-colors hover:text-foreground"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop
            </button>
          </div>
        ) : null
      ) : (
        <BottomDock
          inputState={dockInput}
          actions={actions}
          attachments={attachments}
          onInputChange={(text) => setDockInput((prev) => ({ ...prev, text }))}
          disabled={dockDisabled}
          placeholder={dockPlaceholder}
          isAttachmentUploading={isAttachmentUploading}
          isLoggedIn={!!user && !user.isAnonymous}
          subMode={subMode}
          language={language}
          onLanguageChange={handleLanguageChange}
          boardLanguage={boardLanguage}
          onBoardLanguageChange={handleBoardLanguageChange}
          showSubMode={mode === "jee" || mode === "neet"}
          onSubModeChange={(m) => {
            if (m === subMode) return;
            if (elements.length > 0) { setPendingSubMode(m); } else { setSubMode(m); }
          }}
          isCanvasActive={isCanvasActive}
          onToggleCanvas={currentSessionId ? () => setIsCanvasActive(v => !v) : undefined}
        />
      )}

      {user?.uid && (
        <Suspense>
          <SessionHistory
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            uid={user.uid}
            currentSessionId={currentSessionId}
            onLoadSession={handleLoadSession}
            preloadedSessions={preloadedSessionsRef.current}
          />
        </Suspense>
      )}

      {/* Hidden trigger for AppNav upgrade button */}
      <button id="studio-upgrade-trigger" className="hidden" onClick={() => setFeedbackOpen(true)} />

      <Suspense>
        <UpgradeDialog
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
        />
      </Suspense>

      <Suspense>
        <FreeTierIntroDialog
          open={introOpen}
          onClose={handleCloseIntro}
          onUpgrade={() => setFeedbackOpen(true)}
        />
      </Suspense>

      {/* Replay confirmation — shown when background audio fill is still in progress */}
      <AlertDialog open={replayConfirmOpen} onOpenChange={(o) => { if (!o) setReplayConfirmOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Audio still loading</AlertDialogTitle>
            <AlertDialogDescription>
              Some audio chunks are still being fetched in the background. Replay may have silent gaps for those sections. You can wait a moment and try again, or replay anyway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReplayConfirmOpen(false)}>Wait</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setReplayConfirmOpen(false); void doReplay(); }}>
              Replay anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear canvas confirmation dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={(o) => { if (!o) setShowClearConfirm(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear canvas?</AlertDialogTitle>
            <AlertDialogDescription>
              All your drawings and annotations on this board will be permanently erased. This cannot be undone after clearing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowClearConfirm(false)}>Keep drawings</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                canvasRef.current?.clear();
                setShowClearConfirm(false);
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sub-mode switch confirmation dialog */}
      <AlertDialog open={!!pendingSubMode} onOpenChange={(o) => { if (!o) setPendingSubMode(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to {pendingSubMode === "3d" ? "3D Visualization" : pendingSubMode === "2d" ? "2D Diagrams" : "General"} mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current session will be saved to history. A new session will open in {pendingSubMode === "3d" ? "3D Visualization" : pendingSubMode === "2d" ? "2D Diagrams" : "General"} mode.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSubMode(null)}>Keep current</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingSubMode) {
                const nextSubMode = pendingSubMode;
                const keepMode = mode; // preserve current main mode
                setSubMode(nextSubMode);
                setPendingSubMode(null);
                // Reset session without resetting main mode
                drainInterruptRef.current?.();
                drainAbortRef.current = true;
                drainPausedRef.current = false;
                stopCurrentSpeech();
                pendingQueueRef.current = [];
                replaySnapshotRef.current = [];
                setElements([]);
                setVisibleFrom(0);
                setCurrentSessionId(null);
                setIsReplaying(false);
                setIsPaused(false);
                setReplayMode(false);
                setErrorText(null);
                setCheckpointElementId(null);
                setMode(keepMode); // keep the same main mode
              }
            }}>
              Open new session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}
