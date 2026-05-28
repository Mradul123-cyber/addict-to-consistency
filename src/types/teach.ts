// ─── AI State ─────────────────────────────────────────────────────────────────

export type AIState = "idle" | "thinking" | "speaking";

// ─── Board ────────────────────────────────────────────────────────────────────

export type BoardMode = "whiteboard" | "blackboard";

export interface BoardConfig {
  mode: BoardMode;
  /** Content rendered inside the board — swap for a Firebase-backed doc later */
  content: string;
}

// ─── Board Element Types ──────────────────────────────────────────────────────

export type BoardElement =
  | { id: string; type: "student_text"; content: string }
  | { id: string; type: "ai_header"; content: string }
  | { id: string; type: "ai_body"; content: string }
  | { id: string; type: "ai_math"; latex: string }
  | { id: string; type: "ai_highlight"; latex: string }
  | { id: string; type: "ai_warning"; content: string }
  | { id: string; type: "ai_tip"; content: string }
  | { id: string; type: "ai_question"; content: string }
  | { id: string; type: "ai_step"; number: number; label: string; latex: string }
  | { id: string; type: "ai_diagram"; description: string }
  | { id: string; type: "ai_option"; label: string; content: string }
  | { id: string; type: "ai_divider" };

// ─── Teaching Session ─────────────────────────────────────────────────────────

export interface TeachingSession {
  id: string;
  subject: string;
  chapter: string;
  startedAt: number;
  messages: BoardElement[];
}

export interface SessionMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

// ─── Dock Input ───────────────────────────────────────────────────────────────

export interface DockInputState {
  text: string;
  isRecording: boolean;
}

/** Callback contract — swap internals for Firebase / AI SDK without touching UI */
export interface TeachActions {
  onSendMessage: (text: string) => void;
  onToggleRecording: () => void;
  onUploadFile: (file: File) => void;
}

// ─── AI Visualizer ────────────────────────────────────────────────────────────

export interface AIStateVisualizerProps {
  state: AIState;
  /** Optional label shown beside the indicator */
  label?: string;
  className?: string;
  /**
   * Compact / LED mode — renders a hardware-style dot with no text wrapper.
   * Use when embedding the indicator inside a bezel or toolbar.
   */
  compact?: boolean;
}

// ─── Board Props ──────────────────────────────────────────────────────────────

export interface TeachBoardProps {
  config: BoardConfig;
  aiState: AIState;
  onToggleBoardMode: () => void;
  /** Child content rendered on the board surface */
  children?: React.ReactNode;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  /** Whether the TTS voice is currently enabled */
  ttsEnabled: boolean;
  onToggleTTS: () => void;
}

// ─── Bottom Dock Props ────────────────────────────────────────────────────────

export interface BottomDockProps {
  inputState: DockInputState;
  actions: TeachActions;
  onInputChange: (text: string) => void;
  disabled?: boolean;
  /** Override the textarea placeholder — e.g. during checkpoint lock */
  placeholder?: string;
}
