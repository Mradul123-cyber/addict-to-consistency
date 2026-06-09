import { motion } from "framer-motion";
import type { TeachMode } from "@/types/teach";

interface ModeConfig {
  id: TeachMode;
  name: string;
  persona: string;
  description: string;
  subjects: string;
  color: string;
  accent: string;
}

export const MODES: ModeConfig[] = [
  {
    id: "jee",
    name: "JEE",
    persona: "The Professor",
    description: "IIT-level preparation with deep Socratic teaching",
    subjects: "Physics · Chemistry · Mathematics",
    color: "border-cyan-500/30 hover:border-cyan-500/60",
    accent: "text-cyan-400",
  },
  {
    id: "neet",
    name: "NEET",
    persona: "The Naturalist",
    description: "Medical entrance prep with conceptual clarity",
    subjects: "Biology · Chemistry · Physics",
    color: "border-emerald-500/30 hover:border-emerald-500/60",
    accent: "text-emerald-400",
  },
  {
    id: "general",
    name: "General Tutor",
    persona: "The Mentor",
    description: "Any subject, any level — patient and adaptable",
    subjects: "All subjects · School · College",
    color: "border-violet-500/30 hover:border-violet-500/60",
    accent: "text-violet-400",
  },
  {
    id: "coding",
    name: "Coding / CS",
    persona: "The Senior Engineer",
    description: "Code explained like a senior teaching a junior",
    subjects: "DSA · System Design · Web Dev",
    color: "border-amber-500/30 hover:border-amber-500/60",
    accent: "text-amber-400",
  },
  {
    id: "upsc",
    name: "UPSC",
    persona: "The IAS Coach",
    description: "Strategic, mnemonic-driven civil services prep",
    subjects: "GS · Current Affairs · Essay",
    color: "border-orange-500/30 hover:border-orange-500/60",
    accent: "text-orange-400",
  },
  {
    id: "marketing",
    name: "Marketing",
    persona: "The Strategist",
    description: "Frameworks, case studies, real-world strategy",
    subjects: "Brand · Growth · Digital · Strategy",
    color: "border-pink-500/30 hover:border-pink-500/60",
    accent: "text-pink-400",
  },
  {
    id: "sat",
    name: "SAT",
    persona: "The Cold",
    description: "Digital SAT prep with calm, strategic precision",
    subjects: "Math · Reading · Writing",
    color: "border-sky-500/30 hover:border-sky-500/60",
    accent: "text-sky-400",
  },
];

export function getModeConfig(mode: TeachMode): ModeConfig {
  return MODES.find(m => m.id === mode) ?? MODES[0];
}

interface ModeSelectorProps {
  onSelect: (mode: TeachMode) => void;
  isBlackboard: boolean;
  /** When set, only these mode IDs are shown (used for JEE users' change-mode picker). */
  restrictedModes?: TeachMode[];
}

export function ModeSelector({ onSelect, isBlackboard, restrictedModes }: ModeSelectorProps) {
  const visibleModes = restrictedModes
    ? MODES.filter(m => restrictedModes.includes(m.id))
    : MODES;

  const renderCard = (mode: ModeConfig, i: number) => (
    <motion.button
      key={mode.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: i * 0.05 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(mode.id)}
      className={`flex flex-col items-start gap-1.5 rounded-xl border bg-white/5 p-4 text-left transition-colors ${mode.color}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className={`text-sm font-bold ${isBlackboard ? "text-neutral-100" : "text-neutral-900"}`}>
          {mode.name}
        </span>
      </div>
      <span className={`text-xs font-semibold ${mode.accent}`}>
        {mode.persona}
      </span>
      <p className={`text-xs leading-snug ${isBlackboard ? "text-neutral-400" : "text-neutral-500"}`}>
        {mode.description}
      </p>
      <p className={`text-[10px] mt-0.5 ${isBlackboard ? "text-neutral-500" : "text-neutral-400"}`}>
        {mode.subjects}
      </p>
    </motion.button>
  );

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <h2 className={`text-2xl font-bold mb-1.5 ${isBlackboard ? "text-neutral-100" : "text-neutral-900"}`}>
          {restrictedModes ? "Switch mode" : "Choose your mode"}
        </h2>
        <p className={`text-sm ${isBlackboard ? "text-neutral-400" : "text-neutral-500"}`}>
          Each mode has a dedicated persona and teaching style
        </p>
      </motion.div>

      {visibleModes.length > 4 ? (
        <div className="flex flex-col gap-3 w-full max-w-3xl">
          {[visibleModes.slice(0, 3), visibleModes.slice(3)].map((row, rowIdx) => (
            <div key={rowIdx} className={`grid gap-3 ${row.length === 3 ? "grid-cols-3 max-w-xl mx-auto w-full" : "grid-cols-2 sm:grid-cols-4 w-full"}`}>
              {row.map((mode, i) => renderCard(mode, rowIdx * 3 + i))}
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid gap-3 w-full ${visibleModes.length <= 3 ? "max-w-xl grid-cols-1 sm:grid-cols-3" : "max-w-3xl grid-cols-2 sm:grid-cols-4"}`}>
          {visibleModes.map((mode, i) => renderCard(mode, i))}
        </div>
      )}
    </div>
  );
}
