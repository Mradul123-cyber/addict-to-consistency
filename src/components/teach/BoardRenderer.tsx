import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import type { BoardElement, BoardMode } from "@/types/teach";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

export function getWritingDuration(text: string): number {
  let duration = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === " " || char === "\n") {
      duration += 120;
    } else if ([".", ",", "?", "!", "—", ":", ";"].includes(char)) {
      duration += 250;
    } else {
      duration += 45;
    }
  }
  return duration;
}

function renderBoldText(text: string, keyPrefix: string) {
  const parts = text.split(/(\*[^*\n]+\*)/g);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-bold-${index}`;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <strong key={key}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

function renderInlineContent(text: string) {
  const parts = text.split(/(\\\(.+?\\\))/g);

  return parts.map((part, index) => {
    const key = `inline-${index}`;
    if (part.startsWith("\\(") && part.endsWith("\\)")) {
      return <InlineMath key={key} math={part.slice(2, -2)} />;
    }
    return renderBoldText(part, key);
  });
}

function PlainText({ text }: { text: string }) {
  return <>{renderInlineContent(text)}</>;
}

function TypewriterText({ text, isBlackboard }: { text: string; isBlackboard: boolean }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let active = true;
    let index = 0;
    let timerId: any = null;

    const typeChar = () => {
      if (!active) return;
      if (index >= text.length) {
        setDone(true);
        return;
      }

      index++;
      setDisplayed(text.slice(0, index));

      if (index < text.length) {
        const nextChar = text[index];
        let delay = 45;
        if (nextChar === " " || nextChar === "\n") {
          delay = 120;
        } else if ([".", ",", "?", "!", "—", ":", ";"].includes(nextChar)) {
          delay = 250;
        }
        timerId = setTimeout(typeChar, delay);
      } else {
        setDone(true);
      }
    };

    typeChar();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [text]);

  return (
    <p
      className={`text-lg font-medium tracking-wide leading-relaxed antialiased transition-colors duration-300 ${
        isBlackboard ? "text-neutral-100" : "text-neutral-900"
      }`}
    >
      {done ? renderInlineContent(text) : renderBoldText(displayed, "typewriter")}
    </p>
  );
}

// ─── Math Renderer ────────────────────────────────────────────────────────────

interface MathRendererProps {
  latex: string;
  isBlackboard: boolean;
}

export function MathRenderer({ latex, isBlackboard }: MathRendererProps) {
  const bgBox = isBlackboard ? "bg-cyan-500/5" : "bg-neutral-500/5";
  const borderBox = isBlackboard ? "border-cyan-500/20" : "border-neutral-200";
  const textColor = isBlackboard ? "text-cyan-200" : "text-cyan-800";

  return (
    <div className="my-6 flex justify-start pl-2">
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ transformOrigin: "left" }}
        className={`flex items-center justify-start rounded-xl border px-8 py-5 ${bgBox} ${borderBox} relative overflow-hidden transition-all duration-300 shadow-md ${textColor}`}
      >
        <div className="text-xl md:text-2xl select-all font-sans">
          <BlockMath math={latex} />
        </div>
      </motion.div>
    </div>
  );
}

// ─── Option Card ──────────────────────────────────────────────────────────────

type OptionState = "default" | "selected" | "correct" | "incorrect";

interface OptionCardProps {
  label: string;
  content: string;
  state: OptionState;
  disabled: boolean;
  isBlackboard: boolean;
  onClick: () => void;
}

function OptionCard({ label, content, state, disabled, isBlackboard, onClick }: OptionCardProps) {
  const baseCard = isBlackboard
    ? "border-white/10 bg-white/5 text-neutral-100"
    : "border-neutral-200 bg-white text-neutral-900";

  const stateCard =
    state === "selected"
      ? isBlackboard
        ? "border-violet-400/60 bg-violet-500/15 ring-1 ring-violet-400/30"
        : "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
      : state === "correct"
        ? "border-emerald-400/60 bg-emerald-500/15 ring-1 ring-emerald-400/30"
        : state === "incorrect"
          ? "border-red-400/60 bg-red-500/15 ring-1 ring-red-400/30"
          : "";

  const badgeColor =
    state === "selected"
      ? "bg-violet-500 text-white"
      : state === "correct"
        ? "bg-emerald-500 text-white"
        : state === "incorrect"
          ? "bg-red-500 text-white"
          : isBlackboard
            ? "bg-white/10 text-neutral-300"
            : "bg-neutral-100 text-neutral-600";

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={!disabled ? { scale: 1.015 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${baseCard} ${stateCard} ${disabled ? "cursor-default" : ""}`}
    >
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors duration-200 ${badgeColor}`}
      >
        {label}
      </span>
      <span className="text-base font-medium leading-snug">
        <PlainText text={content} />
      </span>
    </motion.button>
  );
}

// ─── Options Group (buffered 2×2) ─────────────────────────────────────────────

interface OptionsGroupProps {
  options: Extract<BoardElement, { type: "ai_option" }>[];
  isBlackboard: boolean;
  groupId: string;
  correctLabel?: string;
  onSelect?: (label: string) => void;
}

function OptionsGroup({ options, isBlackboard, groupId, correctLabel, onSelect }: OptionsGroupProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const revealed = correctLabel !== undefined;

  const handleSelect = (label: string) => {
    if (revealed || selected !== null) return;
    setSelected(label);
    onSelect?.(label);
  };

  const getState = (label: string): OptionState => {
    if (!revealed) return selected === label ? "selected" : "default";
    if (label === correctLabel) return "correct";
    if (label === selected && label !== correctLabel) return "incorrect";
    return "default";
  };

  const isCorrect = revealed && selected === correctLabel;

  return (
    <motion.div
      key={groupId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="my-4 max-w-3xl"
    >
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <OptionCard
            key={opt.id}
            label={opt.label}
            content={opt.content}
            state={getState(opt.label)}
            disabled={revealed}
            isBlackboard={isBlackboard}
            onClick={() => handleSelect(opt.label)}
          />
        ))}
      </div>

      {/* Revealed result line */}
      {revealed && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-3 text-sm font-semibold ${isCorrect
              ? isBlackboard
                ? "text-emerald-400"
                : "text-emerald-600"
              : isBlackboard
                ? "text-red-400"
                : "text-red-600"
            }`}
        >
          {isCorrect ? "✓ Correct" : `The correct answer is (${correctLabel})`}
        </motion.p>
      )}
    </motion.div>
  );
}

// ─── Checkpoint Inline Input ──────────────────────────────────────────────────

interface CheckpointInputProps {
  isBlackboard: boolean;
  onSubmit: (answer: string) => void;
}

function CheckpointInput({ isBlackboard, onSubmit }: CheckpointInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const borderFocus = isBlackboard
    ? "border-violet-400/40 focus:border-violet-400/70 bg-white/5 text-neutral-100 placeholder-neutral-500"
    : "border-violet-300 focus:border-violet-500 bg-white text-neutral-900 placeholder-neutral-400";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-3 flex flex-col gap-2"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your answer… (Enter to submit, Shift+Enter for newline)"
        rows={2}
        className={`w-full resize-none rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-all duration-200 ${borderFocus}`}
      />
      <div className="flex items-center justify-end gap-2">
        <span
          className={`text-xs ${isBlackboard ? "text-neutral-500" : "text-neutral-400"}`}
        >
          Shift+Enter for newline
        </span>
        <button
          onClick={submit}
          disabled={!value.trim()}
          className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-150 disabled:opacity-40 ${isBlackboard
              ? "bg-violet-500/30 hover:bg-violet-500/50 text-violet-200"
              : "bg-violet-100 hover:bg-violet-200 text-violet-700"
            }`}
        >
          Submit
        </button>
      </div>
    </motion.div>
  );
}

// ─── Render-list grouping ─────────────────────────────────────────────────────

type RenderItem =
  | { kind: "single"; element: BoardElement }
  | { kind: "options"; elements: Extract<BoardElement, { type: "ai_option" }>[] };

function groupElements(elements: BoardElement[]): RenderItem[] {
  const items: RenderItem[] = [];
  let i = 0;
  while (i < elements.length) {
    if (elements[i].type === "ai_option") {
      const group: Extract<BoardElement, { type: "ai_option" }>[] = [];
      while (i < elements.length && elements[i].type === "ai_option") {
        group.push(elements[i] as Extract<BoardElement, { type: "ai_option" }>);
        i++;
      }
      items.push({ kind: "options", elements: group });
    } else {
      items.push({ kind: "single", element: elements[i] });
      i++;
    }
  }
  return items;
}

// ─── Main Board Renderer ──────────────────────────────────────────────────────

export interface BoardRendererProps {
  elements: BoardElement[];
  boardMode: BoardMode;
  checkpointElementId: string | null;
  onCheckpointAnswer: (answer: string) => void;
  optionAnswers: Record<string, string>;
  onOptionSelect: (groupId: string, label: string) => void;
}

export function BoardRenderer({
  elements,
  boardMode,
  checkpointElementId,
  onCheckpointAnswer,
  optionAnswers,
  onOptionSelect,
}: BoardRendererProps) {
  const isBlackboard = boardMode === "blackboard";
  const items = groupElements(elements);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll whenever a new element lands
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = sentinel?.closest<HTMLElement>("[data-teach-board-scroll]");

    scrollContainer?.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: "smooth",
    });
  }, [elements.length]);

  return (
    <div className="flex flex-col gap-y-8 pb-12">
      {items.map((item, idx) => {
        // ── Options group (buffered 2×2) ──────────────────────────────────────
        if (item.kind === "options") {
          const groupId = item.elements[0].id;
          return (
            <OptionsGroup
              key={groupId}
              groupId={groupId}
              options={item.elements}
              isBlackboard={isBlackboard}
              correctLabel={optionAnswers[groupId]}
              onSelect={(label) => onOptionSelect(groupId, label)}
            />
          );
        }

        const el = item.element;

        switch (el.type) {
          // ── Student input ────────────────────────────────────────────────────
          case "student_text":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-3xl my-4"
              >
                <p
                  className={`text-lg font-semibold tracking-wide antialiased transition-colors duration-300 ${isBlackboard ? "text-amber-300" : "text-amber-600"
                    }`}
                >
                  <PlainText text={el.content} />
                </p>
              </motion.div>
            );

          // ── Header ───────────────────────────────────────────────────────────
          case "ai_header":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-4xl mt-6 border-b pb-2 transition-colors duration-300 ${isBlackboard ? "border-emerald-500/20" : "border-emerald-500/10"
                  }`}
              >
                <h2
                  className={`text-3xl md:text-4xl font-black tracking-tight drop-shadow-sm transition-colors duration-300 ${isBlackboard
                      ? "text-emerald-400 drop-shadow-[0_2px_8px_rgba(52,211,153,0.15)]"
                      : "text-emerald-600"
                    }`}
                >
                  <PlainText text={el.content} />
                </h2>
              </motion.div>
            );

          // ── Body (typewriter) ─────────────────────────────────────────────────
          case "ai_body":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="max-w-3xl"
              >
                <TypewriterText text={el.content} isBlackboard={isBlackboard} />
              </motion.div>
            );

          // ── Math ─────────────────────────────────────────────────────────────
          case "ai_math":
            return <MathRenderer key={el.id} latex={el.latex} isBlackboard={isBlackboard} />;

          // ── Highlight ────────────────────────────────────────────────────────
          case "ai_highlight":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="my-6 flex justify-start pl-2"
              >
                <div
                  className={`rounded-xl border-2 px-8 py-5 shadow-lg transition-all duration-300 ${isBlackboard
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200 shadow-emerald-500/10"
                      : "border-emerald-500/40 bg-emerald-50 text-emerald-800"
                    }`}
                >
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 opacity-60">
                    ✦ Key Result
                  </div>
                  <div className="text-xl md:text-2xl select-all font-sans">
                    <BlockMath math={el.latex} />
                  </div>
                </div>
              </motion.div>
            );

          // ── Warning ──────────────────────────────────────────────────────────
          case "ai_warning":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="max-w-3xl my-4"
              >
                <div
                  className={`rounded-xl border p-5 shadow-sm transition-all duration-300 ${isBlackboard
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-amber-400/40 bg-amber-50 text-amber-800"
                    }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-2">⚠ JEE Trap</div>
                  <p className="text-lg font-medium leading-relaxed antialiased">
                    <PlainText text={el.content} />
                  </p>
                </div>
              </motion.div>
            );

          // ── Tip ──────────────────────────────────────────────────────────────
          case "ai_tip":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="max-w-3xl my-4"
              >
                <div
                  className={`rounded-xl border p-5 shadow-sm transition-all duration-300 ${isBlackboard
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                      : "border-cyan-400/40 bg-cyan-50 text-cyan-800"
                    }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-2">⚡ JEE Shortcut</div>
                  <p className="text-lg font-medium leading-relaxed antialiased">
                    <PlainText text={el.content} />
                  </p>
                </div>
              </motion.div>
            );

          // ── Question (with optional checkpoint input) ─────────────────────────
          case "ai_question": {
            const isActive = el.id === checkpointElementId;
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="max-w-3xl my-4"
              >
                <div
                  className={`rounded-xl border p-5 shadow-sm transition-all duration-300 ${isActive
                      ? isBlackboard
                        ? "border-violet-400/50 bg-violet-500/12 text-violet-200 ring-1 ring-violet-400/20"
                        : "border-violet-400/60 bg-violet-50 text-violet-800 ring-1 ring-violet-300"
                      : isBlackboard
                        ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
                        : "border-violet-400/40 bg-violet-50 text-violet-800"
                    }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2">
                    🤔 Think
                    {isActive && (
                      <span className="flex items-center gap-1 animate-pulse text-violet-400 font-semibold normal-case tracking-normal ml-2">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />
                        Waiting for your answer…
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-medium leading-relaxed antialiased italic">
                    <PlainText text={el.content} />
                  </p>
                </div>

                {/* Inline answer input — only shown while this is the active checkpoint */}
                <AnimatePresence>
                  {isActive && (
                    <CheckpointInput
                      isBlackboard={isBlackboard}
                      onSubmit={onCheckpointAnswer}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          // ── Numbered step ────────────────────────────────────────────────────
          case "ai_step":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="ml-4 max-w-3xl my-2"
              >
                <div
                  className={`flex gap-4 items-start rounded-xl border px-5 py-4 transition-all duration-300 ${isBlackboard
                      ? "border-white/8 bg-white/4"
                      : "border-neutral-200/70 bg-neutral-50"
                    }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black mt-1 ${isBlackboard
                        ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30"
                        : "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-300/50"
                      }`}
                  >
                    {el.number}
                  </div>
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <span
                      className={`text-sm font-medium tracking-wide ${isBlackboard ? "text-neutral-400" : "text-neutral-500"
                        }`}
                    >
                      <PlainText text={el.label} />
                    </span>
                    <div
                      className={`text-lg select-all font-sans ${isBlackboard ? "text-cyan-200" : "text-cyan-800"
                        }`}
                    >
                      <BlockMath math={el.latex} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );

          // ── Diagram (placeholder, swappable) ─────────────────────────────────
          case "ai_diagram":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-3xl my-4"
              >
                <div
                  className={`rounded-xl border overflow-hidden transition-all duration-300 ${isBlackboard
                      ? "border-indigo-500/25 bg-indigo-500/8"
                      : "border-indigo-300/40 bg-indigo-50/60"
                    }`}
                >
                  <div
                    className={`flex items-center gap-2 px-5 py-3 border-b text-xs font-bold uppercase tracking-widest ${isBlackboard
                        ? "border-indigo-500/20 text-indigo-300"
                        : "border-indigo-200/60 text-indigo-600"
                      }`}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-80">
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Diagram
                  </div>
                  <div
                    className={`flex flex-col items-center justify-center gap-4 px-8 py-10 min-h-[180px] ${isBlackboard ? "text-indigo-200" : "text-indigo-700"
                      }`}
                  >
                    <svg
                      viewBox="0 0 48 48"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-12 h-12 opacity-30"
                    >
                      <rect x="4" y="4" width="40" height="40" rx="4" />
                      <polyline points="4,36 16,22 24,30 32,18 44,32" />
                      <circle cx="34" cy="14" r="4" />
                    </svg>
                    <p className="text-sm font-medium leading-relaxed text-center max-w-md opacity-80">
                      <PlainText text={el.description} />
                    </p>
                  </div>
                </div>
              </motion.div>
            );

          // ── Divider ──────────────────────────────────────────────────────────
          case "ai_divider":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, scaleX: 0.6 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.4 }}
                className="my-2 flex items-center justify-center"
              >
                <div className="flex-1 max-w-3xl flex items-center gap-4">
                  <div
                    className={`flex-1 h-px ${isBlackboard ? "bg-white/10" : "bg-neutral-200"
                      }`}
                  />
                  <span
                    className={`text-xs tracking-widest select-none ${isBlackboard ? "text-white/20" : "text-neutral-300"
                      }`}
                  >
                    · · ·
                  </span>
                  <div
                    className={`flex-1 h-px ${isBlackboard ? "bg-white/10" : "bg-neutral-200"
                      }`}
                  />
                </div>
              </motion.div>
            );

          default:
            return null;
        }
      })}

      {/* Auto-scroll sentinel */}
      <div ref={sentinelRef} className="h-1 w-full" />
    </div>
  );
}
