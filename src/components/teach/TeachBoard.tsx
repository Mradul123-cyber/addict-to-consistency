import { motion } from "framer-motion";
import { Sun, Moon, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import { AIStateVisualizer } from "./AIStateVisualizer";
import type { TeachBoardProps } from "@/types/teach";

// ─── Theme Configurations ─────────────────────────────────────────────────────

const BOARD_STYLES = {
  blackboard: {
    bg: "radial-gradient(ellipse at top, rgba(20,40,30,0.4) 0%, #050505 70%)",
    text: "text-neutral-100",
    border: "border-emerald-950/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.05)]",
  },
  whiteboard: {
    bg: "radial-gradient(ellipse at top, rgba(244, 244, 245, 0.95) 0%, #f4f4f5 70%, #e4e4e7 100%)",
    text: "text-neutral-900",
    border: "border-neutral-300 shadow-sm",
  },
};

export function TeachBoard({
  config,
  aiState,
  onToggleBoardMode,
  children,
  isFullscreen,
  toggleFullscreen,
  ttsEnabled,
  onToggleTTS,
}: TeachBoardProps) {
  const isBlackboard = config.mode === "blackboard";
  const styles = BOARD_STYLES[config.mode];

  const buttonStyle = isBlackboard
    ? "bg-white/10 hover:bg-white/15 active:bg-white/20 border-white/10 text-neutral-200"
    : "bg-neutral-200/60 hover:bg-neutral-200/80 active:bg-neutral-200 border-neutral-300/50 text-neutral-800";

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex h-screen w-screen flex-col bg-neutral-950 p-0"
          : "relative w-full"
      }
    >
      <motion.div
        className={`relative flex h-full flex-col overflow-hidden ${
          isFullscreen ? "rounded-none border-none" : `rounded-2xl border ${styles.border}`
        }`}
        style={{ background: styles.bg }}
        initial={false}
        animate={{ height: isFullscreen ? "100vh" : "75vh" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Subtle ambient reflection */}
        {isBlackboard && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.08)_0%,transparent_50%)] pointer-events-none" />
        )}

        {/* Outer Bezel Header */}
        <div
          className={`relative z-10 flex items-center justify-between p-4 border-b backdrop-blur-sm ${
            isBlackboard ? "border-white/5 bg-black/15" : "border-black/5 bg-white/30"
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={onToggleBoardMode}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm border ${buttonStyle}`}
            >
              {isBlackboard ? (
                <Sun size={14} className="text-amber-400" />
              ) : (
                <Moon size={14} className="text-indigo-600" />
              )}
              {isBlackboard ? "Switch to Whiteboard" : "Switch to Blackboard"}
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm border ${buttonStyle}`}
            >
              {isFullscreen ? (
                <Minimize size={14} className="text-red-500" />
              ) : (
                <Maximize size={14} className="text-cyan-500" />
              )}
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen Board"}
            </button>

            {/* TTS mute/unmute toggle */}
            <button
              onClick={onToggleTTS}
              title={ttsEnabled ? "Mute Arjun" : "Unmute Arjun"}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm border ${buttonStyle}`}
            >
              {ttsEnabled ? (
                <Volume2 size={14} className="text-emerald-400" />
              ) : (
                <VolumeX size={14} className="text-neutral-500" />
              )}
              {ttsEnabled ? "Mute" : "Unmute"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <AIStateVisualizer state={aiState} compact />
          </div>
        </div>

        {/* Scrollable Canvas */}
        <div
          data-teach-board-scroll
          className={`relative z-10 flex-1 overflow-y-auto px-6 md:px-12 pt-8 scrollbar-thin scrollbar-thumb-white/10 ${styles.text} ${
            isFullscreen ? "pb-36" : "pb-12"
          }`}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
