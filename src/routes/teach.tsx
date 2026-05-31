import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { TeachBoard } from "@/components/teach/TeachBoard";
import { BottomDock } from "@/components/teach/BottomDock";
import { BoardRenderer, getWritingDuration } from "@/components/teach/BoardRenderer";
import { speakElement, stopCurrentSpeech } from "@/lib/tts";
import { ErrorCard } from "@/components/teach/ErrorCard";
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
import {
  TEACH_PROMPT_LIMIT,
  getTeachPromptCount,
  incrementTeachPromptCount,
} from "@/lib/teach-quota";
import { FeedbackDialog } from "@/components/teach/FeedbackDialog";
import { SessionHistory } from "@/components/teach/SessionHistory";
import { createTeachSession, saveTeachSession, type TeachSession } from "@/lib/teach-sessions";
import { setReplayMode } from "@/lib/tts";
import { captureScene, stopAllTypewriters } from "@/components/teach/BoardRenderer";
import { toast } from "sonner";
import { RotateCcw, Square, Play, Pause } from "lucide-react";

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
      { title: "Teaching Board — JEE Console" },
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
  try {
    return JSON.parse(jsonStr);
  } catch (firstError) {
    const escapedJsonStr = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
    if (escapedJsonStr === jsonStr) {
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

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function getAttachmentKind(file: File): UploadedAttachmentKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name)) return "text";
  return "file";
}

function TeachPage() {
  // ── UI state ──
  const [boardConfig, setBoardConfig] = useState<BoardConfig>({
    mode: "blackboard",
    content: "",
  });
  const [aiState, setAiState] = useState<AIState>("idle");
  const [elements, setElements] = useState<BoardElement[]>([]);
  const isRevealingRef = useRef(false);
  const pendingQueueRef = useRef<BoardElement[]>([]);
  const drainPromiseRef = useRef<Promise<void> | null>(null);
  const [dockInput, setDockInput] = useState<DockInputState>({
    text: "",
    isRecording: false,
  });
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);

  // ── Checkpoint state ──
  const [checkpointElementId, setCheckpointElementId] = useState<string | null>(null);

  // ── MCQ revealed answers: groupId → correct label ──
  const [optionAnswers, setOptionAnswers] = useState<Record<string, string>>({});

  // ── TTS ──
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsEnabledRef = useRef(ttsEnabled);
  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  // ── Error state ──
  const [errorText, setErrorText] = useState<string | null>(null);

  // ── Session history ──
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [boardInstant, setBoardInstant] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const currentSessionIdRef = useRef<string | null>(null);
  const drainAbortRef = useRef(false);
  const drainPausedRef = useRef(false);
  const drainInterruptRef = useRef<(() => void) | null>(null);
  const replaySnapshotRef = useRef<BoardElement[]>([]); // full element list before replay clears board
  const [isPaused, setIsPaused] = useState(false);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);

  // ── Prompt quota ──
  const { user } = useAuth();
  const [promptCount, setPromptCount] = useState<number>(0);
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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

          const animPromise = new Promise<void>((resolve) => setTimeout(resolve, delay));

          const speakText = next.speak ?? ("content" in next ? next.content : "");
          const shouldSpeak = ttsEnabledRef.current && speakText.trim() !== "" && next.type !== "ai_divider";
          const speakPromise = shouldSpeak ? speakElement(speakText) : Promise.resolve();

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
  const handleToggleBoardMode = useCallback(() => {
    setBoardConfig((prev) => ({
      ...prev,
      mode: prev.mode === "blackboard" ? "whiteboard" : "blackboard",
    }));
  }, []);

  // ── Core streaming function ────────────────────────────────────────────────
  const streamToBoard = useCallback(
    async (
      messages: { role: string; content: string }[],
      requestAttachments: UploadedAttachment[] = []
    ) => {
      const workerUrl = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";

      try {
        const response = await fetch(workerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, attachments: requestAttachments }),
        });

        if (!response.ok) {
          throw new Error(`Worker returned status ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is not readable");

        setAiState("speaking");
        const decoder = new TextDecoder("utf-8");
        let accumulatedSseText = "";
        let aiTextBuffer = "";
        let rawModelText = "";
        let sawAiQuestionInStream = false;
        let sawAiQuestionElementLine = false;
        let parsedAiQuestion = false;
        const processedElements = new Set<string>();
        let lastElementType: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedSseText += chunk;

          const sseLines = accumulatedSseText.split("\n");
          accumulatedSseText = sseLines.pop() || "";

          for (const line of sseLines) {
            const trimmed = line.trim();
            if (trimmed === "data: [DONE]") {
              const elements = elementsRef.current;
              console.log("stream done — last element:", elements.at(-1)?.type, elements.at(-1)?.id);
              continue;
            }
            if (!trimmed) continue;

            if (trimmed.startsWith("data: ")) {
              try {
                const sseData = JSON.parse(trimmed.slice(6));
                const content = sseData.choices?.[0]?.delta?.content || "";
                rawModelText += content;
                if (content.includes("ai_question")) {
                  console.log("AI stream contains ai_question delta:", content);
                }
                if (!sawAiQuestionInStream && rawModelText.includes("ai_question")) {
                  sawAiQuestionInStream = true;
                  console.log("AI stream contains ai_question in accumulated response");
                }
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
              if (elementTrimmed.includes("ai_question")) {
                sawAiQuestionElementLine = true;
                console.log("Parser saw ai_question element line:", elementTrimmed);
              }
              const jsonStr = elementTrimmed.slice(11).trim();
              if (!processedElements.has(jsonStr)) {
                processedElements.add(jsonStr);
                try {
                  const parsed = parseBoardElementJson(jsonStr) as Omit<BoardElement, "id">;
                  if (parsed.type === "ai_question") {
                    parsedAiQuestion = true;
                    console.log("Parser parsed ai_question:", parsed);
                  }
                  const el: BoardElement = {
                    ...parsed,
                    id: nanoid(),
                  } as BoardElement;

                  pendingQueueRef.current.push(el);
                  void drainNext();
                  lastElementType = parsed.type;

                  console.log("element parsed:", el.type, el.id);
                } catch (parseError) {
                  console.error("Failed to parse board element JSON:", jsonStr, parseError);
                }
              }
            }
          }
        }

        const finalElementLine = aiTextBuffer.trim();
        if (finalElementLine.startsWith("[ELEMENT]: ")) {
          if (finalElementLine.includes("ai_question")) {
            sawAiQuestionElementLine = true;
            console.log("Parser saw ai_question element line:", finalElementLine);
          }

          const jsonStr = finalElementLine.slice(11).trim();
          if (!processedElements.has(jsonStr)) {
            processedElements.add(jsonStr);
            try {
              const parsed = parseBoardElementJson(jsonStr) as Omit<BoardElement, "id">;
              if (parsed.type === "ai_question") {
                parsedAiQuestion = true;
                console.log("Parser parsed ai_question:", parsed);
              }

              const el: BoardElement = {
                ...parsed,
                id: nanoid(),
              } as BoardElement;

              pendingQueueRef.current.push(el);
              void drainNext();
              lastElementType = parsed.type;

              console.log("element parsed:", el.type, el.id);
            } catch (parseError) {
              console.error("Failed to parse final board element JSON:", jsonStr, parseError);
            }
          }
        } else if (finalElementLine) {
          console.log("Stream ended with non-element text left in parser buffer:", finalElementLine);
        }

        void lastElementType; // suppress unused warning
        console.log("AI question trace summary:", {
          sawAiQuestionInStream,
          sawAiQuestionElementLine,
          parsedAiQuestion,
          responseLength: rawModelText.length,
          lastElementType,
          responseTail: rawModelText.slice(-500),
        });
        if (!sawAiQuestionInStream) {
          console.log("AI response did not contain ai_question", {
            responseLength: rawModelText.length,
            lastElementType,
          });
        } else if (!sawAiQuestionElementLine) {
          console.log("AI response contained ai_question, but parser did not see a complete element line", {
            responseLength: rawModelText.length,
          });
        } else if (!parsedAiQuestion) {
          console.log("Parser saw an ai_question line, but did not parse it as ai_question");
        }
        const finalDrain = drainNext();
        await finalDrain;
        // Vision re-check any 3D scenes that were added in this response
        void verify3DScenes(elementsRef.current);
        return true;
      } catch (err: any) {
        console.error("Streaming error:", err);
        setErrorText(err.message);
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
          acc.push({ role: "user", content: el.content });
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

      // Clear pause if active
      drainPausedRef.current = false;
      setIsPaused(false);

      // Stop any ongoing TTS
      stopCurrentSpeech();

      // Clear any pending queue
      pendingQueueRef.current = [];

      const messageAttachments = attachments;
      const studentContent = text.trim();

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
      setAiState("thinking");

      // Build history including the newly added student element
      const history = buildHistory([...elementsRef.current, studentEl]);
      const messages = [...history];

      const uid = user.uid;
      const isFirstMessage = elementsRef.current.length === 0;
      const allStudentMessages = [...elementsRef.current, { type: "student_text", content: studentContent }]
        .filter((el: any) => el.type === "student_text");
      const meaningfulMsg = allStudentMessages.find((el: any) => el.content.trim().split(" ").length > 3);
      const sessionTitle = (meaningfulMsg?.content ?? studentContent).slice(0, 80);
      void (async () => {
        const ok = await streamToBoard(messages, messageAttachments);
        if (!ok) return;
        try {
          // Auto-save session after each successful AI response
          const sessionId = currentSessionIdRef.current ?? nanoid();
          if (!currentSessionIdRef.current) {
            setCurrentSessionId(sessionId);
            await createTeachSession(uid, sessionId, sessionTitle, elementsRef.current);
          } else {
            await saveTeachSession(uid, sessionId, sessionTitle, elementsRef.current);
          }
        } catch (e) {
          console.error("Failed to save session:", e);
        }
        try {
          const next = await incrementTeachPromptCount(uid);
          setPromptCount(next);
          const remainingAfter = TEACH_PROMPT_LIMIT - next;
          if (next >= TEACH_PROMPT_LIMIT) {
            setFeedbackOpen(true);
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

  // ── Replay current board ─────────────────────────────────────────────────
  const handleReplay = useCallback(async () => {
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

  const handleStopReplay = useCallback(() => {
    drainInterruptRef.current?.();
    drainAbortRef.current = true;
    pendingQueueRef.current = [];
    stopCurrentSpeech();
    stopAllTypewriters();
    setIsReplaying(false);
    setReplayMode(false);
  }, []);

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
    void drainNext(); // continue from pending queue
  }, [drainNext]);

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
        const res = await fetch(`${workerUrl}/api/verify-3d`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    pendingQueueRef.current = [];
    replaySnapshotRef.current = [];
    setElements([]);
    setCurrentSessionId(null);
    setIsReplaying(false);
    setIsPaused(false);
    setReplayMode(false);
    setErrorText(null);
    setCheckpointElementId(null);
    setAttachments([]);
    drainAbortRef.current = false;
  }, []);

  // ── Load session ──────────────────────────────────────────────────────────
  const handleLoadSession = useCallback((session: TeachSession) => {
    stopCurrentSpeech();
    pendingQueueRef.current = [];
    setBoardInstant(true);
    setElements(session.elements ?? []);
    setCurrentSessionId(session.id);
    setErrorText(null);
    setCheckpointElementId(null);
    // Reset instant after render so new AI responses animate normally
    setTimeout(() => setBoardInstant(false), 100);
    toast.success(`Loaded: "${session.title}"`);
  }, []);

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
      try {
        const kind = getAttachmentKind(file);
        const baseAttachment = {
          id: nanoid(),
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          kind,
        };

        const attachment: UploadedAttachment =
          kind === "text"
            ? { ...baseAttachment, text: await readFileAsText(file) }
            : { ...baseAttachment, dataUrl: await readFileAsDataUrl(file) };

        setAttachments((prev) => [...prev, attachment]);
        console.log("File uploaded:", file.name, file.type, file.size);
      } catch (err) {
        console.error("Failed to read uploaded file:", file.name, err);
        setErrorText(`Could not read ${file.name}`);
      }
    },
    onRemoveAttachment: (id) => {
      setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
    },
  };

  // ── Dock disabled conditions ──────────────────────────────────────────────
  const dockDisabled = aiState === "thinking" || isBlocked;
  const dockPlaceholder = isBlocked
    ? "Prompt limit reached — thanks for trying Matrix"
    : checkpointElementId !== null
      ? "Answer, ask a follow-up, or steer the lesson..."
      : undefined;

  return (
    <div className="relative -mx-2 pb-28">
      {/* ── Teaching Smartboard ── */}
      <TeachBoard
        config={boardConfig}
        aiState={aiState}
        onToggleBoardMode={handleToggleBoardMode}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        ttsEnabled={ttsEnabled}
        onOpenHistory={() => setHistoryOpen(true)}
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
      >
        {elements.length === 0 ? (
          <p className="py-20 text-center text-sm font-light h-full opacity-35 max-w-sm mx-auto">
            Type a concept query in the dock below to draw the whiteboard animations…
          </p>
        ) : (
          <div className="w-full">
            <BoardRenderer
              elements={elements}
              boardMode={boardConfig.mode}
              checkpointElementId={checkpointElementId}
              onCheckpointAnswer={handleCheckpointAnswer}
              optionAnswers={optionAnswers}
              onOptionSelect={handleOptionSelect}
              instant={boardInstant}
            />
          </div>
        )}
      </TeachBoard>

      {/* ── Session controls toolbar (below the board) ── */}
      {(elements.length > 0 || isReplaying || isPaused || (replaySnapshotRef.current.length > 0 && elements.length < replaySnapshotRef.current.length)) && (
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

      {/* ── Bottom Dock ── */}
      <BottomDock
        inputState={dockInput}
        actions={actions}
        attachments={attachments}
        onInputChange={(text) => setDockInput((prev) => ({ ...prev, text }))}
        disabled={dockDisabled}
        placeholder={dockPlaceholder}
      />

      {user?.uid && (
        <SessionHistory
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          uid={user.uid}
          currentSessionId={currentSessionId}
          onLoadSession={handleLoadSession}
        />
      )}

      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        uid={user?.uid ?? null}
        promptCount={promptCount}
      />
    </div>
  );
}
