import { motion, AnimatePresence } from "framer-motion";
import type { AIState, AIStateVisualizerProps } from "@/types/teach";

// ─── Full-size indicators ─────────────────────────────────────────────────────

function IdleDot() {
  return (
    <motion.span
      className="block h-2.5 w-2.5 rounded-full bg-emerald-400"
      animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function ThinkingSpinner() {
  return (
    <span className="relative flex h-5 w-5 items-center justify-center">
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: "conic-gradient(from 0deg, #6366f1, #8b5cf6, #ec4899, #6366f1)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      />
      <span className="absolute inset-[3px] rounded-full bg-neutral-950" />
      <motion.span
        className="relative h-1.5 w-1.5 rounded-full bg-violet-400"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      />
    </span>
  );
}

const FULL_BAR_HEIGHTS = [0.35, 0.7, 1, 0.7, 0.35] as const;

function SpeakingWaveform() {
  return (
    <span className="flex items-center gap-[2px]">
      {FULL_BAR_HEIGHTS.map((base, i) => (
        <motion.span
          key={i}
          className="block w-[3px] rounded-full bg-sky-400"
          style={{ height: 10 }}
          animate={{ scaleY: [base, 1, base * 0.5, 0.9, base], backgroundColor: ["#38bdf8", "#818cf8", "#38bdf8"] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
        />
      ))}
    </span>
  );
}

// ─── Compact hardware-LED indicators ─────────────────────────────────────────

function CompactIdle() {
  return (
    <motion.span
      className="block h-[7px] w-[7px] rounded-full bg-emerald-400"
      animate={{ opacity: [0.45, 1, 0.45] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ boxShadow: "0 0 6px 1px rgba(52,211,153,0.7)" }}
    />
  );
}

function CompactThinking() {
  return (
    <motion.span
      className="block h-[7px] w-[7px] rounded-full border border-violet-400 border-t-transparent"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
      style={{ boxShadow: "0 0 5px 1px rgba(139,92,246,0.55)" }}
    />
  );
}

const COMPACT_BARS = [0.4, 1, 0.4] as const;

function CompactSpeaking() {
  return (
    <span className="flex items-center gap-[1.5px]">
      {COMPACT_BARS.map((base, i) => (
        <motion.span
          key={i}
          className="block w-[2px] rounded-full bg-sky-400"
          style={{ height: 7, boxShadow: "0 0 4px rgba(56,189,248,0.6)" }}
          animate={{ scaleY: [base, 1, base] }}
          transition={{ duration: 0.65, repeat: Infinity, ease: "easeInOut", delay: i * 0.13 }}
        />
      ))}
    </span>
  );
}

// ─── Compact LED dispatcher ───────────────────────────────────────────────────

function CompactLED({ state }: { state: AIState }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={state}
        className="flex items-center"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.2 }}
      >
        {state === "idle" && <CompactIdle />}
        {state === "thinking" && <CompactThinking />}
        {state === "speaking" && <CompactSpeaking />}
      </motion.span>
    </AnimatePresence>
  );
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATE_LABEL: Record<AIState, string> = {
  idle: "Ready",
  thinking: "Thinking…",
  speaking: "Speaking",
};

// ─── Public component ─────────────────────────────────────────────────────────

export function AIStateVisualizer({
  state,
  label,
  className = "",
  compact = false,
}: AIStateVisualizerProps) {
  // ── Compact / hardware LED mode ──
  if (compact) {
    return <CompactLED state={state} />;
  }

  // ── Full badge mode ──
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm ${className}`}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={state}
          className="flex items-center"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.25 }}
        >
          {state === "idle" && <IdleDot />}
          {state === "thinking" && <ThinkingSpinner />}
          {state === "speaking" && <SpeakingWaveform />}
        </motion.span>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.span
          key={state + "-label"}
          className="text-xs font-medium text-white/70"
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.2 }}
        >
          {label ?? STATE_LABEL[state]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
