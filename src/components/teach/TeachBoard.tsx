import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Maximize, Minimize, Volume2, VolumeX, History, Plus, RotateCcw, Square, Play, Gauge, MoreHorizontal, Headphones } from "lucide-react";
import { AIStateVisualizer } from "./AIStateVisualizer";
import type { TeachBoardProps } from "@/types/teach";
import { useTheme } from "@/hooks/useTheme";
import { CanvasOverlay } from "./CanvasOverlay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const SPEED_STEPS = [0.75, 1, 1.25, 1.5, 2] as const;

function formatSpeed(s: number): string {
  return s === 1 ? "1×" : `${s}×`;
}

export function TeachBoard({
  config,
  aiState,
  onToggleBoardMode,
  children,
  isFullscreen,
  toggleFullscreen,
  ttsEnabled,
  onToggleTTS,
  elementSpeakEnabled = false,
  onToggleElementSpeak,
  elementSpeakAvailable = true,
  speed = 1,
  onSpeedChange,
  onOpenHistory,
  onNewSession,
  onReplay,
  onStopReplay,
  onResume,
  modeBadge,
  isGuest = false,
  onShowMobileControls,
  speedLocked = false,
  isCanvasActive = false,
  canvasRef,
  canvasTool = "pen",
  canvasColor = "#ffffff",
  brushSize = 5,
  canvasSessionId,
}: TeachBoardProps & {
  onOpenHistory?: () => void;
  onNewSession?: () => void;
  onReplay?: () => void;
  onStopReplay?: () => void;
  onResume?: () => void;
  modeBadge?: string;
  isGuest?: boolean;
  onShowMobileControls?: () => void;
  speedLocked?: boolean;
}) {
  const { isDark } = useTheme();
  const isBlackboard = config.mode === "blackboard";
  const lastTapRef = useRef(0);
  const tapCountRef = useRef(0);
  const styles = (!isBlackboard && isDark)
    ? {
        bg: "radial-gradient(ellipse at top, #ffffff 0%, #efefef 50%, #d2d2da 100%)",
        text: "text-neutral-900",
        border: "border-neutral-300/30 shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.5),0_8px_16px_rgba(0,0,0,0.5),0_20px_40px_rgba(0,0,0,0.5),0_40px_72px_rgba(0,0,0,0.45),0_64px_96px_rgba(0,0,0,0.3)]",
      }
    : BOARD_STYLES[config.mode];

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

        {/* Header — icon-only buttons (hidden on mobile, shown on md+) */}
        <div className={`max-[767px]:hidden [@media(max-height:500px)]:hidden relative z-10 flex items-center justify-between px-4 py-2.5 border-b backdrop-blur-sm ${
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
            {!isGuest && onToggleElementSpeak && (
              <button
                onClick={onToggleElementSpeak}
                title={!elementSpeakAvailable ? "No content yet" : elementSpeakEnabled ? "Hide speak buttons" : "Show speak buttons"}
                className={`${iconBtn} ${!elementSpeakAvailable ? "opacity-30 cursor-not-allowed" : elementSpeakEnabled ? (isBlackboard ? "bg-blue-500/20 border-blue-400/30" : "bg-blue-100 border-blue-300/50") : ""}`}
              >
                <Headphones size={15} className={elementSpeakEnabled && elementSpeakAvailable ? "text-blue-400" : "text-neutral-500"} />
              </button>
            )}
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
            {!isGuest && onSpeedChange && (
              speedLocked ? (
                <button
                  title="Speed locked during playback"
                  className={`${iconBtn} opacity-35 cursor-not-allowed`}
                >
                  <Gauge size={15} />
                </button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button title={`Speed: ${formatSpeed(speed)}`} className={iconBtn}>
                      <Gauge size={15} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={`min-w-[7rem] ${isBlackboard ? "bg-neutral-900 border-white/10 text-neutral-100" : "bg-white border-neutral-200 text-neutral-900"}`}
                  >
                    {SPEED_STEPS.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onSelect={() => onSpeedChange(s)}
                        className={`flex items-center justify-between cursor-pointer ${
                          isBlackboard
                            ? "focus:bg-white/10 hover:bg-white/10 focus:text-neutral-100 text-neutral-100"
                            : "focus:bg-neutral-100 hover:bg-neutral-100 focus:text-neutral-900 text-neutral-900"
                        } ${s === speed ? "font-semibold" : ""}`}
                      >
                        <span>{formatSpeed(s)}</span>
                        {s === speed && <span className="text-emerald-500 text-xs">✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
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

        {/* Mobile dots button — hidden on desktop where header exists */}
        {!isGuest && onShowMobileControls && (
          <button
            className={`max-[767px]:flex [@media(max-height:500px)]:flex hidden absolute top-2 right-2 z-20 items-center justify-center w-7 h-7 rounded-full border transition-all active:scale-90 ${
              isBlackboard
                ? "bg-white/10 hover:bg-white/20 border-white/10 text-neutral-300"
                : "bg-neutral-200/60 hover:bg-neutral-200/90 border-neutral-300/50 text-neutral-700"
            }`}
            onClick={(e) => { e.stopPropagation(); onShowMobileControls(); }}
            title="Controls"
          >
            <MoreHorizontal size={14} />
          </button>
        )}

        {/* Content + Canvas wrapper */}
        <div className="relative flex-1 overflow-hidden">
          <div
            data-teach-board-scroll
            className={`absolute inset-0 overflow-y-auto px-6 md:px-12 pt-8 scrollbar-thin scrollbar-thumb-white/10 ${styles.text} ${
              isFullscreen ? "pb-36" : "pb-12"
            }`}
            onTouchEnd={(e) => {
              const now = Date.now();
              if (now - lastTapRef.current < 350) {
                tapCountRef.current += 1;
              } else {
                tapCountRef.current = 1;
              }
              lastTapRef.current = now;
              if (tapCountRef.current === 2) {
                e.preventDefault();
                toggleFullscreen();
              }
            }}
          >
            {/* Relative wrapper so canvas anchors to content height, not viewport */}
            <div className="relative min-h-full flex flex-col">
              {children}
              <CanvasOverlay
                ref={canvasRef}
                isActive={isCanvasActive}
                tool={canvasTool}
                color={canvasColor}
                brushSize={brushSize}
                sessionId={canvasSessionId}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
