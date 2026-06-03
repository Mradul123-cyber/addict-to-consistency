// ─── AI State ─────────────────────────────────────────────────────────────────

export type AIState = "idle" | "thinking" | "speaking";

// ─── Board ────────────────────────────────────────────────────────────────────

export type BoardMode = "whiteboard" | "blackboard";

export interface BoardConfig {
  mode: BoardMode;
  /** Content rendered inside the board — swap for a Firebase-backed doc later */
  content: string;
}

export type UploadedAttachmentKind = "image" | "pdf";

export interface UploadedAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: UploadedAttachmentKind;
  storageUrl?: string; // Firebase Storage download URL (set after upload)
  text?: string;       // pdf: extracted text (always stored for history)
}

export interface GraphPoint {
  x: number;
  y: number;
  label?: string;
}

export interface DiagramObject {
  kind: "point" | "line" | "arrow" | "vector" | "circle" | "rect" | "label";
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  r?: number;
  width?: number;
  height?: number;
  label?: string;
  color?: string;
}

export interface ShapeVector3D {
  x: number;
  y: number;
  z: number;
  label?: string;
  color?: string;
}

export interface SemanticDiagramEntity {
  kind:
    | "axis"
    | "surface"
    | "line_charge"
    | "point_charge"
    | "distance"
    | "vector"
    | "block"
    | "incline"
    | "label";
  label?: string;
  axis?: "x" | "y" | "z";
  plane?: "xy" | "yz" | "xz";
  direction?: "up" | "down" | "left" | "right" | "in" | "out";
  widthLabel?: string;
  heightLabel?: string;
  lengthLabel?: string;
  positionLabel?: string;
  color?: string;
}

export interface Scene3DObject {
  kind: "axes" | "plane" | "line_charge" | "point" | "vector" | "cube" | "sphere";
  label?: string;
  axis?: "x" | "y" | "z";
  plane?: "xy" | "yz" | "xz";
  normal?: [number, number, number]; // plane normal for diagonal orientations e.g. (1,1,0)
  position?: [number, number, number];
  end?: [number, number, number];
  size?: [number, number] | [number, number, number];
  radius?: number;
  color?: string;
  wireframe?: boolean;  // cube/sphere rendered as edges only
  dashed?: boolean;     // vector rendered as dashed helper line
  opacity?: number;     // 0.0–1.0 override
}

// ─── Board Element Types ──────────────────────────────────────────────────────

export type BoardElement = (
  | { id: string; type: "student_text"; content: string; attachments?: UploadedAttachment[] }
  | { id: string; type: "ai_header"; content: string }
  | { id: string; type: "ai_body"; content: string }
  | { id: string; type: "ai_math"; latex: string }
  | { id: string; type: "ai_highlight"; latex: string }
  | { id: string; type: "ai_warning"; content: string }
  | { id: string; type: "ai_tip"; content: string }
  | { id: string; type: "ai_question"; content: string }
  | { id: string; type: "ai_step"; number: number; label: string; latex: string }
  | { id: string; type: "ai_diagram"; description: string }
  | {
      id: string;
      type: "ai_semantic_diagram";
      view: "side_view" | "top_view" | "front_view" | "free_body" | "coordinate_2d";
      title?: string;
      entities: SemanticDiagramEntity[];
    }
  | {
      id: string;
      type: "ai_3d_scene";
      sceneId?: string;
      title?: string;
      objects: Scene3DObject[];
      camera?: [number, number, number];
    }
  | {
      id: string;
      type: "ai_3d_build";
      sceneId: string;
      add: Scene3DObject[];
    }
  | {
      id: string;
      type: "ai_graph";
      title?: string;
      xLabel?: string;
      yLabel?: string;
      points: GraphPoint[];
    }
  | {
      id: string;
      type: "ai_diagram_v2";
      title?: string;
      objects: DiagramObject[];
    }
  | {
      id: string;
      type: "ai_3d_shape";
      shape: "cube" | "sphere" | "cylinder" | "axes" | "rotation_axes";
      title?: string;
      vectors?: ShapeVector3D[];
      labels?: string[];
    }
  | { id: string; type: "ai_option"; label: string; content: string }
  | { id: string; type: "ai_divider" }
  | { id: string; type: "ai_code"; language: string; code: string; label?: string }
) & { speak?: string };

export type TeachMode = "jee" | "neet" | "general" | "coding" | "upsc" | "marketing";
export type SubMode = "general" | "3d";

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
  onUploadFile: (file: File) => void | Promise<void>;
  onRemoveAttachment: (id: string) => void;
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
  attachments: UploadedAttachment[];
  onInputChange: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  subMode?: SubMode;
  onSubModeChange?: (m: SubMode) => void;
  showSubMode?: boolean;
  isAttachmentUploading?: boolean;
}
