import { motion } from "framer-motion";
import { Sun, Moon, Maximize, Minimize, Volume2, VolumeX, History, Plus, RotateCcw, Square, Play, Sparkles } from "lucide-react";
import { AIStateVisualizer } from "./AIStateVisualizer";
import type { TeachBoardProps } from "@/types/teach";

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
  onOpenHistory,
  onNewSession,
  onReplay,
  onStopReplay,
  onResume,
  modeBadge,
  isGuest = false,
}: TeachBoardProps & {
  onOpenHistory?: () => void;
  onNewSession?: () => void;
  onReplay?: () => void;
  onStopReplay?: () => void;
  onResume?: () => void;
  modeBadge?: string;
  isGuest?: boolean;
}) {
  const isBlackboard = config.mode === "blackboard";
  const styles = BOARD_STYLES[config.mode];

  const iconBtn = `flex items-center justify-center rounded-full w-8 h-8 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm border ${
    isBlackboard
      ? "bg-white/10 hover:bg-white/15 border-white/10 text-neutral-200"
      : "bg-neutral-200/60 hover:bg-neutral-200/80 border-neutral-300/50 text-neutral-800"
  }`;

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 flex h-screen w-screen flex-col bg-neutral-950 p-0" : "relative w-full"}>
      <motion.div
        className={`relative flex h-full flex-col overflow-hidden ${
          isFullscreen ? "rounded-none border-none" : `rounded-2xl border ${styles.border}`
        }`}
        style={{ background: styles.bg }}
        initial={false}
        animate={{ height: isFullscreen ? "100vh" : "75vh" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {isBlackboard && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.08)_0%,transparent_50%)] pointer-events-none" />
        )}

        {/* Header — icon-only buttons */}
        <div className={`relative z-10 flex items-center justify-between px-4 py-2.5 border-b backdrop-blur-sm ${
          isBlackboard ? "border-white/5 bg-black/15" : "border-black/5 bg-white/30"
        }`}>
          <div className="flex items-center gap-3">
            {modeBadge && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                isBlackboard ? "border-white/15 text-neutral-300" : "border-black/10 text-neutral-600"
              }`}>
                {modeBadge}
              </span>
            )}
            <button onClick={onToggleBoardMode} title={isBlackboard ? "Switch to Whiteboard" : "Switch to Blackboard"} className={iconBtn}>
              {isBlackboard ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-600" />}
            </button>
            <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} className={iconBtn}>
              {isFullscreen ? <Minimize size={15} className="text-red-400" /> : <Maximize size={15} className="text-cyan-500" />}
            </button>
            <button
              onClick={isGuest ? undefined : onToggleTTS}
              title={isGuest ? "Sign up to enable voice" : ttsEnabled ? "Mute" : "Unmute"}
              className={`${iconBtn} ${isGuest ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              {(!isGuest && ttsEnabled) ? <Volume2 size={15} className="text-emerald-400" /> : <VolumeX size={15} className="text-neutral-500" />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!isGuest && isFullscreen && onStopReplay && (
              <button onClick={onStopReplay} title="Stop replay" className={iconBtn}>
                <Square size={15} />
              </button>
            )}
            {!isGuest && isFullscreen && onResume && (
              <button onClick={onResume} title="Resume replay" className={iconBtn}>
                <Play size={15} />
              </button>
            )}
            {!isGuest && isFullscreen && onReplay && (
              <button onClick={onReplay} title="Replay" className={iconBtn}>
                <RotateCcw size={15} />
              </button>
            )}
            {!isGuest && onNewSession && (
              <button onClick={onNewSession} title="New session" className={iconBtn}>
                <Plus size={15} />
              </button>
            )}
            {onOpenHistory && (
              <button onClick={onOpenHistory} title={isGuest ? "Replay demo" : "Session history"} className={iconBtn}>
                {isGuest ? <RotateCcw size={15} /> : <History size={15} />}
              </button>
            )}
            <AIStateVisualizer state={aiState} compact />
          </div>
        </div>

        {/* Canvas */}
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
