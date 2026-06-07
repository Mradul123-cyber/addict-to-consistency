import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, AlertTriangle, Lightbulb, Volume2, Square, RotateCcw } from "lucide-react";
// Global flag — when true, all TypewriterText instances instantly complete
const typewriterStopFlag = { current: false };
export function stopAllTypewriters() {
  typewriterStopFlag.current = true;
  setTimeout(() => { typewriterStopFlag.current = false; }, 300);
}

import type { ReactNode } from "react";
import { lazy, Suspense, Fragment } from "react";
import { sceneRegistry } from "./sceneRegistry";
export function captureScene(sceneId: string): string | null {
  return sceneRegistry.get(sceneId)?.capture() ?? null;
}
const ThreeSceneRenderer = lazy(() => import("./ThreeSceneRenderer"));
const LazyCodeBlock = lazy(() => import("./LazyCodeBlock"));
import type {
  BoardElement,
  BoardMode,
  DiagramObject,
  GraphPoint,
  Scene3DObject,
  SemanticDiagramEntity,
  ShapeVector3D,
  UploadedAttachment,
} from "@/types/teach";
import { BlockMath, InlineMath } from "react-katex";

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
  // Handle **double** and *single* asterisk markdown — convert to bold, never show raw asterisks
  const parts = text.split(/(\*{1,2}[^*\n]+\*{1,2})/g);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-bold-${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <strong key={key}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

// Matches:
// 1. \(...\) delimited math
// 2. Naked subscript/superscript: N_A(0), e^(-t), lambda_B
// 3. LaTeX commands: \propto, \frac{1}{\lambda^4}, \alpha, \vec{F}
const INLINE_MATH_RE = /(\\\(.+?\\\)|\\[a-zA-Z]+(?:\{(?:[^{}]|\{[^{}]*\})*\})*(?:[_^][A-Za-z0-9{}]+)*|[A-Za-z][A-Za-z0-9]*(?:[_^][A-Za-z0-9{}()\-+]+)+)/g;

function renderInlineContent(text: string) {
  const parts = text.split(INLINE_MATH_RE);

  return parts.map((part, index) => {
    const key = `inline-${index}`;
    if (!part) return null;
    if (part.startsWith("\\(") && part.endsWith("\\)")) {
      return <InlineMath key={key} math={part.slice(2, -2)} />;
    }
    // LaTeX command: \propto, \frac{1}{\lambda^4}, \alpha etc.
    if (/^\\[a-zA-Z]/.test(part)) {
      try { return <InlineMath key={key} math={part} />; }
      catch { return renderBoldText(part, key); }
    }
    // Naked subscript/superscript: N_A(0), e^(-t)
    if (/^[A-Za-z][A-Za-z0-9]*(?:[_^][A-Za-z0-9{}()\-+]+)+$/.test(part)) {
      try { return <InlineMath key={key} math={part} />; }
      catch { return renderBoldText(part, key); }
    }
    return renderBoldText(part, key);
  });
}

function PlainText({ text }: { text: string }) {
  return <>{renderInlineContent(text)}</>;
}

function TypewriterText({ text, isBlackboard, instant }: { text: string; isBlackboard: boolean; instant?: boolean }) {
  const [displayed, setDisplayed] = useState(instant ? text : "");
  const [done, setDone] = useState(instant ?? false);
  const instantDoneRef = useRef(instant ?? false);

  useEffect(() => {
    if (instant) { setDisplayed(text); setDone(true); instantDoneRef.current = true; return; }
    // If this instance was already completed via instant-render, don't restart animation
    if (instantDoneRef.current) return;
    setDisplayed("");
    setDone(false);
    let active = true;
    let index = 0;
    let timerId: any = null;

    const typeChar = () => {
      if (!active) return;
      // Global stop — instantly show full text
      if (typewriterStopFlag.current) {
        setDisplayed(text);
        setDone(true);
        return;
      }
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
  }, [text, instant]);

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

function StudentAttachmentPreview({
  attachments,
  isBlackboard,
}: {
  attachments: UploadedAttachment[];
  isBlackboard: boolean;
}) {
  const visual = attachments.filter(a => a.kind === "image" || a.kind === "pdf");
  if (visual.length === 0) return null;

  const primary = visual[0];
  const extra = visual.length - 1;
  const surface = isBlackboard
    ? "border-white/12 bg-neutral-950/70 shadow-black/50"
    : "border-neutral-200 bg-white shadow-neutral-300/60";

  return (
    <div className="relative my-3 w-full max-w-xl">
      {/* Stack layers */}
      {visual.length > 2 && (
        <div className={`absolute inset-0 translate-x-4 translate-y-4 rotate-3 rounded-lg border ${surface}`} />
      )}
      {visual.length > 1 && (
        <div className={`absolute inset-0 translate-x-2 translate-y-2 rotate-1 rounded-lg border ${surface}`} />
      )}

      {/* Primary card */}
      <div className={`relative overflow-hidden rounded-lg border shadow-xl ${surface}`}>
        {primary.kind === "image" && primary.storageUrl ? (
          <img src={primary.storageUrl} alt="" className="max-h-[26rem] w-full object-contain" />
        ) : primary.kind === "pdf" ? (
          /* A4-style PDF card — shows filename + page count from extracted text */
          <div className={`flex items-center gap-3 px-4 py-3.5 ${isBlackboard ? "bg-neutral-900/80" : "bg-neutral-50"}`}>
            <div className={`flex h-10 w-8 shrink-0 flex-col items-center justify-center rounded border-2 text-[8px] font-bold uppercase tracking-widest ${isBlackboard ? "border-white/20 text-white/40" : "border-neutral-300 text-neutral-400"}`}>
              <span>PDF</span>
            </div>
            <div className="min-w-0">
              <p className={`truncate text-sm font-medium ${isBlackboard ? "text-white/80" : "text-neutral-800"}`}>{primary.name}</p>
              <p className={`text-xs ${isBlackboard ? "text-white/35" : "text-neutral-400"}`}>
                {primary.text ? `${primary.text.slice(0, 60).trim()}…` : "Pages extracted"}
              </p>
            </div>
          </div>
        ) : null}

        {/* +N badge for stacked attachments */}
        {extra > 0 && (
          <div className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${
            isBlackboard ? "bg-neutral-950/80 text-neutral-100 ring-1 ring-white/15" : "bg-white/90 text-neutral-700 ring-1 ring-neutral-200"
          }`}>
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}

function VisualFrame({
  title,
  isBlackboard,
  children,
}: {
  title?: string;
  isBlackboard: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="my-5 w-full max-w-3xl"
    >
      {title && (
        <div
          className={`mb-2 text-sm font-semibold ${
            isBlackboard ? "text-neutral-300" : "text-neutral-600"
          }`}
        >
          <PlainText text={title} />
        </div>
      )}
      <div
        className={`overflow-hidden rounded-lg border ${
          isBlackboard
            ? "border-white/10 bg-white/[0.03] text-neutral-100"
            : "border-neutral-200 bg-white text-neutral-900"
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}

function clampPoint(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function colorFor(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value;
  return fallback;
}

function SemanticDiagramRenderer({
  view,
  entities,
  title,
  isBlackboard,
}: {
  view: "side_view" | "top_view" | "front_view" | "free_body" | "coordinate_2d";
  entities: SemanticDiagramEntity[];
  title?: string;
  isBlackboard: boolean;
}) {
  const width = 640;
  const height = 360;
  const stroke = isBlackboard ? "#a7f3d0" : "#047857";
  const accent = isBlackboard ? "#fbbf24" : "#d97706";
  const text = isBlackboard ? "#f3f4f6" : "#111827";
  const muted = isBlackboard ? "rgba(167,243,208,0.16)" : "rgba(16,185,129,0.12)";
  const hasLineCharge = entities.some((entity) => entity.kind === "line_charge");
  const hasSurface = entities.some((entity) => entity.kind === "surface");
  const lineCharge = entities.find((entity) => entity.kind === "line_charge");
  const surface = entities.find((entity) => entity.kind === "surface");
  const distance = entities.find((entity) => entity.kind === "distance");
  const vectors = entities.filter((entity) => entity.kind === "vector");
  const labels = entities.filter((entity) => entity.kind === "label");

  const renderAxes = () => (
    <g>
      <line x1="92" y1="280" x2="548" y2="280" stroke={text} strokeWidth="2" markerEnd="url(#semantic-arrow)" />
      <line x1="112" y1="300" x2="112" y2="72" stroke={text} strokeWidth="2" markerEnd="url(#semantic-arrow)" />
      <text x="558" y="286" fill={text} fontSize="18" fontWeight="800">x</text>
      <text x="104" y="62" fill={text} fontSize="18" fontWeight="800">{view === "side_view" ? "z" : "y"}</text>
    </g>
  );

  const renderLineChargeSideView = () => {
    const surfaceY = 270;
    const chargeX = 320;
    const chargeY = 96;
    const surfaceWidth = 330;
    return (
      <g>
        <line x1={chargeX} y1="86" x2={chargeX} y2={surfaceY} stroke={stroke} strokeWidth="4" strokeLinecap="round" />
        <circle cx={chargeX} cy={chargeY} r="13" fill={isBlackboard ? "#06281f" : "#ecfdf5"} stroke={stroke} strokeWidth="4" />
        <text x={chargeX - 92} y={chargeY - 18} fill={text} fontSize="16" fontWeight="800">
          {lineCharge?.label || "line charge"}
        </text>

        <line x1={chargeX - surfaceWidth / 2} y1={surfaceY} x2={chargeX + surfaceWidth / 2} y2={surfaceY} stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        <path d={`M${chargeX - surfaceWidth / 2} ${surfaceY} q20 -9 40 0`} fill="none" stroke={stroke} strokeWidth="4" />
        <path d={`M${chargeX + surfaceWidth / 2 - 40} ${surfaceY} q20 9 40 0`} fill="none" stroke={stroke} strokeWidth="4" />
        <text x={chargeX - 116} y={surfaceY + 26} fill={text} fontSize="16" fontWeight="800">
          {surface?.label || "surface"}
        </text>

        <line x1={chargeX} y1={chargeY + 18} x2={chargeX} y2={surfaceY - 16} stroke={accent} strokeWidth="3" markerEnd="url(#semantic-accent-arrow)" />
        <text x={chargeX + 18} y={(chargeY + surfaceY) / 2} fill={text} fontSize="16" fontWeight="800">
          {distance?.label || lineCharge?.positionLabel || "distance"}
        </text>

        <line x1={chargeX - surfaceWidth / 2} y1={surfaceY + 24} x2={chargeX} y2={surfaceY + 24} stroke={text} strokeWidth="2" markerStart="url(#semantic-arrow-start)" markerEnd="url(#semantic-arrow)" />
        <line x1={chargeX} y1={surfaceY + 24} x2={chargeX + surfaceWidth / 2} y2={surfaceY + 24} stroke={text} strokeWidth="2" markerStart="url(#semantic-arrow-start)" markerEnd="url(#semantic-arrow)" />
        <text x={chargeX - 86} y={surfaceY + 52} fill={text} fontSize="15" fontWeight="800">{surface?.widthLabel || "a/2"}</text>
        <text x={chargeX + 72} y={surfaceY + 52} fill={text} fontSize="15" fontWeight="800">{surface?.heightLabel || "a/2"}</text>
      </g>
    );
  };

  const renderCoordinateSetup = () => (
    <g>
      <polygon points="260,230 420,190 520,230 360,278" fill={muted} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
      <text x="376" y="244" fill={text} fontSize="17" fontWeight="800">{surface?.label || "surface in xy plane"}</text>
      <line x1="360" y1="230" x2="560" y2="230" stroke={text} strokeWidth="3" markerEnd="url(#semantic-arrow)" />
      <line x1="360" y1="230" x2="360" y2="70" stroke={text} strokeWidth="3" markerEnd="url(#semantic-arrow)" />
      <line x1="360" y1="230" x2="240" y2="318" stroke={text} strokeWidth="3" markerEnd="url(#semantic-arrow)" />
      <text x="568" y="236" fill={text} fontSize="18" fontWeight="900">y</text>
      <text x="352" y="62" fill={text} fontSize="18" fontWeight="900">z</text>
      <text x="224" y="332" fill={text} fontSize="18" fontWeight="900">x</text>
      {hasLineCharge && (
        <g>
          <line x1="430" y1="96" x2="430" y2="254" stroke={accent} strokeWidth="5" strokeLinecap="round" />
          <circle cx="430" cy="96" r="10" fill={accent} />
          <text x="444" y="106" fill={text} fontSize="16" fontWeight="800">
            {lineCharge?.label || "line charge"}
          </text>
          <text x="444" y="130" fill={text} fontSize="14" fontWeight="700">
            {lineCharge?.positionLabel || "above xy plane"}
          </text>
        </g>
      )}
    </g>
  );

  const renderFreeBody = () => {
    const block = entities.find((entity) => entity.kind === "block");
    return (
      <g>
        <rect x="278" y="150" width="88" height="64" rx="8" fill={muted} stroke={stroke} strokeWidth="4" />
        <text x="304" y="188" fill={text} fontSize="16" fontWeight="900">{block?.label || "body"}</text>
        {vectors.length > 0 ? vectors.map((vector, index) => {
          const configs = {
            up: [322, 150, 322, 80],
            down: [322, 214, 322, 292],
            left: [278, 182, 192, 182],
            right: [366, 182, 452, 182],
            in: [322, 182, 250, 112],
            out: [322, 182, 394, 112],
          } as const;
          const [x1, y1, x2, y2] = configs[vector.direction || "up"];
          return (
            <g key={index}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colorFor(vector.color, accent)} strokeWidth="4" markerEnd="url(#semantic-accent-arrow)" />
              <text x={x2 + 8} y={y2 - 8} fill={text} fontSize="16" fontWeight="900">{vector.label}</text>
            </g>
          );
        }) : null}
      </g>
    );
  };

  return (
    <VisualFrame title={title} isBlackboard={isBlackboard}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <defs>
          <marker id="semantic-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill={text} />
          </marker>
          <marker id="semantic-arrow-start" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M9,0 L9,6 L0,3 z" fill={text} />
          </marker>
          <marker id="semantic-accent-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill={accent} />
          </marker>
        </defs>

        {(view === "side_view" || view === "front_view" || view === "coordinate_2d") && renderAxes()}
        {view === "side_view" && hasLineCharge && hasSurface
          ? renderLineChargeSideView()
          : view === "free_body"
            ? renderFreeBody()
            : renderCoordinateSetup()}

        {labels.map((label, index) => (
          <text key={index} x="46" y={44 + index * 24} fill={colorFor(label.color, text)} fontSize="16" fontWeight="800">
            {label.label}
          </text>
        ))}
      </svg>
    </VisualFrame>
  );
}

function GraphRenderer({
  points,
  title,
  xLabel,
  yLabel,
  isBlackboard,
}: {
  points: GraphPoint[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
  isBlackboard: boolean;
}) {
  const safePoints = points.length > 0 ? points : [{ x: 0, y: 0 }];
  const xs = safePoints.map((point) => point.x);
  const ys = safePoints.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xSpan = maxX - minX || 1;
  const ySpan = maxY - minY || 1;
  const width = 640;
  const height = 360;
  const pad = 48;
  const plotWidth = width - pad * 2;
  const plotHeight = height - pad * 2;
  const axisColor = isBlackboard ? "#94a3b8" : "#64748b";
  const gridColor = isBlackboard ? "rgba(148,163,184,0.18)" : "rgba(100,116,139,0.18)";
  const lineColor = isBlackboard ? "#67e8f9" : "#0891b2";
  const pointColor = isBlackboard ? "#fbbf24" : "#d97706";
  const mapped = safePoints.map((point) => {
    const x = pad + ((point.x - minX) / xSpan) * plotWidth;
    const y = pad + (1 - (point.y - minY) / ySpan) * plotHeight;
    return { ...point, sx: x, sy: y };
  });
  const polyline = mapped.map((point) => `${point.sx},${point.sy}`).join(" ");

  return (
    <VisualFrame title={title} isBlackboard={isBlackboard}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {[0, 1, 2, 3, 4].map((tick) => {
          const x = pad + (tick / 4) * plotWidth;
          const y = pad + (tick / 4) * plotHeight;
          return (
            <g key={tick}>
              <line x1={x} y1={pad} x2={x} y2={height - pad} stroke={gridColor} />
              <line x1={pad} y1={y} x2={width - pad} y2={y} stroke={gridColor} />
            </g>
          );
        })}
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={axisColor} strokeWidth="2" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke={axisColor} strokeWidth="2" />
        <motion.polyline
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          points={polyline}
          fill="none"
          stroke={lineColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {mapped.map((point, index) => (
          <g key={`${point.x}-${point.y}-${index}`}>
            <circle cx={point.sx} cy={point.sy} r="5" fill={pointColor} />
            {point.label && (
              <text x={point.sx + 8} y={point.sy - 8} fill={axisColor} fontSize="14" fontWeight="700">
                {point.label}
              </text>
            )}
          </g>
        ))}
        {xLabel && (
          <text x={width / 2} y={height - 12} textAnchor="middle" fill={axisColor} fontSize="14" fontWeight="700">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text x="18" y={height / 2} textAnchor="middle" fill={axisColor} fontSize="14" fontWeight="700" transform={`rotate(-90 18 ${height / 2})`}>
            {yLabel}
          </text>
        )}
      </svg>
    </VisualFrame>
  );
}

function DiagramRenderer({
  objects,
  title,
  isBlackboard,
}: {
  objects: DiagramObject[];
  title?: string;
  isBlackboard: boolean;
}) {
  const width = 640;
  const height = 360;
  const defaultStroke = isBlackboard ? "#a7f3d0" : "#047857";
  const defaultText = isBlackboard ? "#e5e7eb" : "#111827";

  const renderObject = (object: DiagramObject, index: number) => {
    const stroke = colorFor(object.color, defaultStroke);
    const x = clampPoint(object.x, 0, width);
    const y = clampPoint(object.y, 0, height);
    const x2 = clampPoint(object.x2 ?? object.x, 0, width);
    const y2 = clampPoint(object.y2 ?? object.y, 0, height);

    if (object.kind === "label") {
      return (
        <text key={index} x={x} y={y} fill={stroke || defaultText} fontSize="16" fontWeight="700">
          {object.label}
        </text>
      );
    }

    if (object.kind === "point") {
      return (
        <g key={index}>
          <circle cx={x} cy={y} r={object.r ?? 5} fill={stroke} />
          {object.label && <text x={x + 9} y={y - 8} fill={defaultText} fontSize="14">{object.label}</text>}
        </g>
      );
    }

    if (object.kind === "circle") {
      const r = object.r ?? 32;
      return (
        <g key={index}>
          <circle cx={x} cy={y} r={r} fill="none" stroke={stroke} strokeWidth="3" />
          {object.label && (
            <text x={x + r + 8} y={y} fill={defaultText} fontSize="14" fontWeight="700">
              {object.label}
            </text>
          )}
        </g>
      );
    }

    if (object.kind === "rect") {
      const rectWidth = object.width ?? 80;
      const rectHeight = object.height ?? 48;
      return (
        <g key={index}>
          <rect
            x={x}
            y={y}
            width={rectWidth}
            height={rectHeight}
            rx="6"
            fill={isBlackboard ? "rgba(255,255,255,0.04)" : "rgba(16,185,129,0.08)"}
            stroke={stroke}
            strokeWidth="3"
          />
          {object.label && (
            <text
              x={x + rectWidth / 2}
              y={y + rectHeight / 2 + 5}
              textAnchor="middle"
              fill={defaultText}
              fontSize="14"
              fontWeight="700"
            >
              {object.label}
            </text>
          )}
        </g>
      );
    }

    const markerEnd = object.kind === "arrow" || object.kind === "vector" ? "url(#diagram-arrow)" : undefined;
    return (
      <g key={index}>
        <line x1={x} y1={y} x2={x2} y2={y2} stroke={stroke} strokeWidth={object.kind === "vector" ? 4 : 3} strokeLinecap="round" markerEnd={markerEnd} />
        {object.label && (
          <text x={(x + x2) / 2 + 8} y={(y + y2) / 2 - 8} fill={defaultText} fontSize="14" fontWeight="700">
            {object.label}
          </text>
        )}
      </g>
    );
  };

  return (
    <VisualFrame title={title} isBlackboard={isBlackboard}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <defs>
          <marker id="diagram-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill={defaultStroke} />
          </marker>
        </defs>
        {objects.map(renderObject)}
      </svg>
    </VisualFrame>
  );
}

function project3D(vector: ShapeVector3D) {
  return {
    x: 320 + vector.x * 88 + vector.z * 42,
    y: 220 - vector.y * 88 - vector.z * 28,
  };
}

function Shape3DRenderer({
  shape,
  title,
  vectors = [],
  labels = [],
  isBlackboard,
}: {
  shape: "cube" | "sphere" | "cylinder" | "axes" | "rotation_axes";
  title?: string;
  vectors?: ShapeVector3D[];
  labels?: string[];
  isBlackboard: boolean;
}) {
  const stroke = isBlackboard ? "#93c5fd" : "#2563eb";
  const accent = isBlackboard ? "#fbbf24" : "#d97706";
  const muted = isBlackboard ? "rgba(147,197,253,0.25)" : "rgba(37,99,235,0.16)";
  const text = isBlackboard ? "#e5e7eb" : "#111827";
  const width = 640;
  const height = 360;

  const renderBaseShape = () => {
    if (shape === "sphere") {
      return (
        <g>
          <circle cx="320" cy="180" r="86" fill={muted} stroke={stroke} strokeWidth="3" />
          <ellipse cx="320" cy="180" rx="86" ry="24" fill="none" stroke={stroke} strokeWidth="2" opacity="0.8" />
          <ellipse cx="320" cy="180" rx="28" ry="86" fill="none" stroke={stroke} strokeWidth="2" opacity="0.55" />
        </g>
      );
    }

    if (shape === "cylinder") {
      return (
        <g>
          <ellipse cx="320" cy="110" rx="82" ry="28" fill={muted} stroke={stroke} strokeWidth="3" />
          <path d="M238 110 V250" stroke={stroke} strokeWidth="3" />
          <path d="M402 110 V250" stroke={stroke} strokeWidth="3" />
          <ellipse cx="320" cy="250" rx="82" ry="28" fill="none" stroke={stroke} strokeWidth="3" />
        </g>
      );
    }

    if (shape === "cube") {
      return (
        <g fill={muted} stroke={stroke} strokeWidth="3">
          <path d="M250 115 H390 V255 H250 Z" />
          <path d="M250 115 L300 75 H440 L390 115 Z" />
          <path d="M390 115 L440 75 V215 L390 255 Z" />
        </g>
      );
    }

    return null;
  };

  const axisVectors: ShapeVector3D[] =
    shape === "axes" || shape === "rotation_axes"
      ? [
          { x: 1.2, y: 0, z: 0, label: "x", color: "#ef4444" },
          { x: 0, y: 1.2, z: 0, label: "y", color: "#22c55e" },
          { x: 0, y: 0, z: 1.2, label: "z", color: "#3b82f6" },
        ]
      : [];
  const allVectors = [...axisVectors, ...vectors];

  return (
    <VisualFrame title={title} isBlackboard={isBlackboard}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <defs>
          <marker id="shape-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill={accent} />
          </marker>
        </defs>
        {renderBaseShape()}
        {shape === "rotation_axes" && (
          <ellipse cx="320" cy="205" rx="105" ry="34" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="8 8" />
        )}
        {allVectors.map((vector, index) => {
          const end = project3D(vector);
          const color = colorFor(vector.color, accent);
          return (
            <g key={index}>
              <line x1="320" y1="220" x2={end.x} y2={end.y} stroke={color} strokeWidth="4" strokeLinecap="round" markerEnd="url(#shape-arrow)" />
              {vector.label && (
                <text x={end.x + 8} y={end.y - 8} fill={text} fontSize="15" fontWeight="800">
                  {vector.label}
                </text>
              )}
            </g>
          );
        })}
        {labels.map((label, index) => (
          <text key={index} x="24" y={32 + index * 22} fill={text} fontSize="14" fontWeight="700">
            {label}
          </text>
        ))}
      </svg>
    </VisualFrame>
  );
}

// ─── Math Renderer ────────────────────────────────────────────────────────────

interface MathRendererProps {
  latex: string;
  isBlackboard: boolean;
}

export function MathRenderer({ latex, isBlackboard }: MathRendererProps) {
  return (
    <div className="my-6 flex justify-start pl-2">
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ transformOrigin: "left", color: "#155e75", boxShadow: isBlackboard
          ? "rgba(0, 0, 0, 0.17) 0px -23px 25px 0px inset, rgba(0, 0, 0, 0.15) 0px -36px 30px 0px inset, rgba(0, 0, 0, 0.1) 0px -79px 40px 0px inset, rgba(0, 0, 0, 0.06) 0px 2px 1px, rgba(0, 0, 0, 0.09) 0px 4px 2px, rgba(0, 0, 0, 0.09) 0px 8px 4px, rgba(0, 0, 0, 0.09) 0px 16px 8px, rgba(0, 0, 0, 0.09) 0px 32px 16px"
          : "rgba(0, 0, 0, 0.07) 0px -23px 25px 0px inset, rgba(0, 0, 0, 0.06) 0px -36px 30px 0px inset, rgba(0, 0, 0, 0.04) 0px -79px 40px 0px inset, rgba(0, 0, 0, 0.03) 0px 2px 1px, rgba(0, 0, 0, 0.04) 0px 4px 2px, rgba(0, 0, 0, 0.04) 0px 8px 4px, rgba(0, 0, 0, 0.04) 0px 16px 8px, rgba(0, 0, 0, 0.04) 0px 32px 16px"
        }}
        className="flex items-center justify-start rounded-xl border-0 px-8 py-5 bg-white relative overflow-hidden transition-all duration-300"
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

// ─── Per-element speak button ─────────────────────────────────────────────────

function SpeakBtn({
  el,
  speakText: speakTextOverride,
  alwaysVisible,
  showSpeakButtons,
  speakingElementId,
  onSpeakElement,
  isBlackboard,
}: {
  el: BoardElement;
  speakText?: string;
  alwaysVisible?: boolean;
  showSpeakButtons: boolean;
  speakingElementId: string | null | undefined;
  onSpeakElement: ((speak: string, id: string) => void) | undefined;
  isBlackboard: boolean;
}) {
  const speak = speakTextOverride ?? (el as any).speak ?? ("content" in el ? (el as any).content : "");
  if (!speak?.trim() || !onSpeakElement) return null;
  if (!alwaysVisible && !showSpeakButtons) return null;
  const isPlaying = speakingElementId === el.id;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSpeakElement(speak, el.id); }}
      title={isPlaying ? "Stop" : "Replay this"}
      className={`flex items-center justify-center w-5 h-5 rounded-full transition-all duration-200 ${
        isBlackboard
          ? isPlaying
            ? "text-emerald-400 bg-emerald-500/20"
            : "text-white/45 hover:text-white hover:bg-white/12"
          : isPlaying
            ? "text-emerald-600 bg-emerald-100"
            : "text-black/35 hover:text-black hover:bg-black/8"
      }`}
    >
      {isPlaying ? <Square size={8} className="fill-current" /> : <Volume2 size={11} />}
    </button>
  );
}

// Wraps content with a left speak-button column that animates width 0↔28px.
// CSS-only show/hide — never unmounts children, preventing TypewriterText re-animation.
function SpeakBtnWrap({
  show,
  btn,
  topPt = "pt-1",
  children,
}: {
  show: boolean;
  btn: ReactNode;
  topPt?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start">
      <div
        className={`shrink-0 overflow-hidden ${topPt} flex justify-center`}
        style={{ width: show ? 28 : 0, transition: "width 150ms ease" }}
      >
        {btn}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
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
  onFixElement?: (id: string, newContent: string) => void;
  instant?: boolean;
  showSpeakButtons?: boolean;
  speakingElementId?: string | null;
  onSpeakElement?: (speak: string, id: string) => void;
  onSpeakBlock?: (items: Array<{ speak: string; id: string }>) => void;
  onStopBlock?: () => void;
}

// Regex layer: fix control-char corruptions from JSON \f \n \t \b \r eaten as escape sequences
function regexFixMath(text: string): string {
  return text
    // \f (0x0C) = form-feed → \frac, \flat etc.
    .replace(/\x0crac/g, '\\frac')
    .replace(/\x0clat\b/g, '\\flat')
    // \b (0x08) = backspace → \boxed, \beta, \big etc.
    .replace(/\x08oxed/g, '\\boxed')
    .replace(/\x08eta\b/g, '\\beta')
    .replace(/\x08ig\b/g, '\\big')
    // \t (0x09) = tab → \text, \theta, \tau, \times etc.
    .replace(/\x09ext\b/g, '\\text')
    .replace(/\x09heta\b/g, '\\theta')
    .replace(/\x09au\b/g, '\\tau')
    .replace(/\x09imes\b/g, '\\times')
    // \n (0x0A) = newline → \nabla, \nu etc.
    .replace(/\x0abla\b/g, '\\nabla')
    .replace(/\x0au\b/g, '\\nu')
    // \r (0x0D) = carriage return → \rho etc.
    .replace(/\x0dheta\b/g, '\\theta')
    .replace(/\x0dho\b/g, '\\rho');
}

function hasLatexCorruption(latex: string): boolean {
  // Control characters left over from JSON escape corruption (\f→0x0C, \b→0x08, \t→0x09, \r→0x0D, \n→0x0A)
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(latex)) return true;
  // Bare fragments that appear when backslash was consumed (rac from \frac, ext from \text, oxed from \boxed)
  if (/(?:^|[^a-zA-Z\\])(rac|oxed|ext\b|imes\b|heta\b|nabla\b|cdot\b)/.test(latex)) return true;
  return false;
}

function FixableLatexWrapper({
  children,
  latex,
  isBlackboard,
  onFix,
}: {
  children: React.ReactNode;
  latex: string;
  isBlackboard: boolean;
  onFix?: () => void;
}) {
  const corrupt = onFix && hasLatexCorruption(latex);

  return (
    <div className="group relative">
      {children}
      {corrupt && (
        <button
          onClick={onFix}
          className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold
            opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity
            ${isBlackboard ? "bg-neutral-900/90 text-amber-400 hover:text-amber-300 border border-amber-400/30" : "bg-white/95 text-amber-600 hover:text-amber-700 border border-amber-400/40"}
            shadow-md`}
        >
          <Sparkles className="h-2.5 w-2.5" />fix math
        </button>
      )}
    </div>
  );
}

function FixableMathContent({
  text,
  isBlackboard,
  instant,
  onFix,
  component,
}: {
  text: string;
  isBlackboard: boolean;
  instant?: boolean;
  onFix?: () => void;
  component: "body" | "tip";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [btnPos, setBtnPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const errorEl = ref.current.querySelector(".katex-error") as HTMLElement | null;
    if (!errorEl) return;
    const errRect = errorEl.getBoundingClientRect();
    const parentRect = ref.current.getBoundingClientRect();
    setBtnPos({ left: errRect.left - parentRect.left, top: errRect.bottom - parentRect.top + 2 });
  }, [text]); // re-check when text changes (e.g. typewriter completes)

  return (
    <div ref={ref} className="group relative">
      {component === "body"
        ? <TypewriterText text={text} isBlackboard={isBlackboard} instant={instant} />
        : <PlainText text={text} />
      }
      {btnPos && onFix && (
        <button
          onClick={onFix}
          style={{ position: "absolute", left: btnPos.left, top: btnPos.top }}
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold
            opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity
            ${isBlackboard ? "bg-neutral-900/90 text-amber-400 hover:text-amber-300 border border-amber-400/30" : "bg-white/95 text-amber-600 hover:text-amber-700 border border-amber-400/40"}
            shadow-md`}
        >
          <Sparkles className="h-2.5 w-2.5" />fix math
        </button>
      )}
    </div>
  );
}

// ─── Colour palette for XY graphs ────────────────────────────────────────────
const XY_C: Record<string, string> = {
  cyan: "#22d3ee", blue: "#60a5fa", amber: "#f59e0b",
  green: "#4ade80", red: "#f87171", white: "#e2e8f0", purple: "#c084fc",
};
const xyCol = (name?: string) => XY_C[name ?? "cyan"] ?? XY_C.cyan;

function niceTicks(min: number, max: number): number[] {
  const range = max - min;
  if (range <= 0) return [min];
  const rawStep = range / 5;
  const exp = Math.floor(Math.log10(rawStep));
  const mag = Math.pow(10, exp);
  const norm = rawStep / mag;
  const step = norm < 1.5 ? mag : norm < 3 ? 2 * mag : norm < 7 ? 5 * mag : 10 * mag;
  const p = Math.max(0, -Math.floor(Math.log10(step)));
  const start = parseFloat((Math.ceil(min / step) * step).toFixed(p));
  const ticks: number[] = [];
  for (let i = 0; i < 20; i++) {
    const v = parseFloat((start + i * step).toFixed(p));
    if (v > max + step * 1e-9) break;
    ticks.push(v);
  }
  return ticks.length >= 2 ? ticks : [min, max];
}

function _sgn(x: number) { return x < 0 ? -1 : x > 0 ? 1 : 0; }
function _slope3(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) {
  const h0 = x1 - x0, h1 = x2 - x1;
  const s0 = h0 ? (y1 - y0) / h0 : 0;
  const s1 = h1 ? (y2 - y1) / h1 : 0;
  const p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (_sgn(s0) + _sgn(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}
function _slope2(x0: number, y0: number, x1: number, y1: number, t: number) {
  const h = x1 - x0;
  return h ? (3 * (y1 - y0) / h - t) / 2 : t;
}
function smoothCurvePath(pts: Array<{ sx: number; sy: number }>): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M ${pts[0].sx},${pts[0].sy}`;
  if (n === 2) return `M ${pts[0].sx},${pts[0].sy} L ${pts[1].sx},${pts[1].sy}`;
  const m: number[] = new Array(n);
  for (let i = 1; i < n - 1; i++)
    m[i] = _slope3(pts[i-1].sx, pts[i-1].sy, pts[i].sx, pts[i].sy, pts[i+1].sx, pts[i+1].sy);
  m[0]     = _slope2(pts[0].sx, pts[0].sy, pts[1].sx, pts[1].sy, m[1]);
  m[n - 1] = _slope2(pts[n-2].sx, pts[n-2].sy, pts[n-1].sx, pts[n-1].sy, m[n-2]);
  let d = `M ${pts[0].sx.toFixed(1)},${pts[0].sy.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i+1].sx - pts[i].sx;
    const cp1x = pts[i].sx   + dx / 3, cp1y = pts[i].sy   + m[i]   * dx / 3;
    const cp2x = pts[i+1].sx - dx / 3, cp2y = pts[i+1].sy - m[i+1] * dx / 3;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${pts[i+1].sx.toFixed(1)},${pts[i+1].sy.toFixed(1)}`;
  }
  return d;
}

type XYGraphEl = Extract<BoardElement, { type: "ai_xy_graph" }>;

function XYGraphRenderer({ el, isBlackboard }: { el: XYGraphEl; isBlackboard: boolean }) {
  const W = 520;
  const H = Math.min(420, Math.max(280, 310 + (el.annotations?.length ?? 0) * 20 + Math.max(0, el.curves.length - 2) * 16));
  const PL = 68, PT = 32, PR = 52, PB = 58;
  const PW = W - PL - PR, PH = H - PT - PB;
  const [xMin, xMax] = el.xRange, [yMin, yMax] = el.yRange;
  const xSpan = xMax - xMin || 1, ySpan = yMax - yMin || 1;
  const px = (x: number) => PL + ((x - xMin) / xSpan) * PW;
  const py = (y: number) => PT + ((yMax - y) / ySpan) * PH;
  const xTicks = niceTicks(xMin, xMax), yTicks = niceTicks(yMin, yMax);
  const grid  = isBlackboard ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const axCol = isBlackboard ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.65)";
  const tCol  = isBlackboard ? "#64748b" : "#94a3b8";
  const lCol  = isBlackboard ? "#94a3b8" : "#64748b";
  const bg    = isBlackboard ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)";
  const titl  = isBlackboard ? "#e2e8f0" : "#1e293b";
  const dotBg = isBlackboard ? "#0f172a" : "#fff";
  const fmt = (n: number) => {
    if (Math.abs(n) < 1e-9) return "0";
    if (Number.isInteger(n)) return String(n);
    return parseFloat(n.toFixed(2)).toString();
  };
  return (
    <motion.div className="w-full max-w-xl my-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {el.title && <p className="text-sm font-semibold mb-2" style={{ color: titl }}>{el.title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl"
        style={{ height: "auto", background: bg, border: isBlackboard ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)" }}>
        {xTicks.map((v, i) => <line key={`xg${i}`} x1={px(v)} y1={PT} x2={px(v)} y2={PT+PH} stroke={grid} strokeWidth="1" />)}
        {yTicks.map((v, i) => <line key={`yg${i}`} x1={PL} y1={py(v)} x2={PL+PW} y2={py(v)} stroke={grid} strokeWidth="1" />)}
        <line x1={PL} y1={PT+PH+6} x2={PL} y2={PT-6} stroke={axCol} strokeWidth="1.5" strokeLinecap="round" />
        <polygon points={`${PL-4},${PT+2} ${PL+4},${PT+2} ${PL},${PT-7}`} fill={axCol} />
        <line x1={PL-6} y1={PT+PH} x2={PL+PW+6} y2={PT+PH} stroke={axCol} strokeWidth="1.5" strokeLinecap="round" />
        <polygon points={`${PL+PW+2},${PT+PH-4} ${PL+PW+2},${PT+PH+4} ${PL+PW+9},${PT+PH}`} fill={axCol} />
        {xTicks.map((val, i) => (
          <g key={`xt${i}`}>
            <line x1={px(val)} y1={PT+PH} x2={px(val)} y2={PT+PH+5} stroke={axCol} strokeWidth="1" />
            <text x={px(val)} y={PT+PH+18} textAnchor="middle" fontSize="11" fill={tCol}>{fmt(val)}</text>
          </g>
        ))}
        {yTicks.map((val, i) => (
          <g key={`yt${i}`}>
            <line x1={PL-5} y1={py(val)} x2={PL} y2={py(val)} stroke={axCol} strokeWidth="1" />
            <text x={PL-9} y={py(val)+4} textAnchor="end" fontSize="11" fill={tCol}>{fmt(val)}</text>
          </g>
        ))}
        {el.xLabel && <text x={PL+PW/2} y={H-6} textAnchor="middle" fontSize="13" fontWeight="600" fill={lCol}>{el.xLabel}</text>}
        {el.yLabel && <text x={14} y={PT+PH/2} textAnchor="middle" fontSize="13" fontWeight="600" fill={lCol} transform={`rotate(-90, 14, ${PT+PH/2})`}>{el.yLabel}</text>}
        {el.curves.map((curve, ci) => {
          const c = xyCol(curve.color);
          const screenPts = curve.points.map(([x, y]) => ({ sx: px(x), sy: py(y) }));
          const pathD = smoothCurvePath(screenPts);
          let labelEl: ReactNode = null;
          if (curve.label) {
            const atX = curve.labelAt ?? curve.points[Math.floor(curve.points.length * 0.45)][0];
            let interpY = curve.points[0][1];
            for (let i = 0; i < curve.points.length - 1; i++) {
              const [x0, y0] = curve.points[i], [x1, y1] = curve.points[i+1];
              if (atX >= x0 && atX <= x1) { interpY = y0 + ((x1===x0?0:(atX-x0)/(x1-x0))) * (y1-y0); break; }
            }
            const i0 = Math.max(0, curve.points.findIndex(([x]) => x >= atX) - 1);
            const i1 = Math.min(curve.points.length - 1, i0 + 1);
            const tdx = px(curve.points[i1][0]) - px(curve.points[i0][0]);
            const tdy = py(curve.points[i1][1]) - py(curve.points[i0][1]);
            const tlen = Math.sqrt(tdx*tdx + tdy*tdy) || 1;
            const OFFSET = 32;
            const lx = px(atX) + (tdy/tlen)*OFFSET, ly = py(interpY) + (-tdx/tlen)*OFFSET;
            const nearRight = lx > PL + PW * 0.65;
            const textW = curve.label.length * 6.5 + 10;
            const textAnchor = nearRight ? "end" : "start";
            const rectX = nearRight ? lx - textW - 2 : lx - 4;
            labelEl = (
              <g>
                <rect x={rectX} y={ly-13} width={textW} height={16} rx="3"
                  fill={isBlackboard ? "rgba(10,18,30,0.82)" : "rgba(255,255,255,0.88)"} />
                <text x={lx} y={ly-1} textAnchor={textAnchor} fontSize="11" fontWeight="700" fill={c}>{curve.label}</text>
              </g>
            );
          }
          return (
            <g key={`cv${ci}`}>
              <path d={pathD} fill="none" stroke={c} strokeWidth="2.5"
                strokeDasharray={curve.dashed ? "8,4" : undefined} strokeLinecap="round" strokeLinejoin="round" />
              {labelEl}
            </g>
          );
        })}
        {(el.markers ?? []).map((m, mi) => {
          const ty = py(m.y) - 16, tw = (m.label?.length ?? 0) * 6.5 + 8;
          const wouldClip = px(m.x) + 8 + tw > W - 4;
          const tx = wouldClip ? px(m.x) - 8 : px(m.x) + 8;
          const anchor = wouldClip ? "end" : "start";
          const rx = wouldClip ? tx - tw : tx - 4;
          return (
            <g key={`mk${mi}`}>
              <line x1={px(m.x)} y1={py(m.y)} x2={px(m.x)} y2={PT+PH} stroke={XY_C.cyan} strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
              <line x1={PL} y1={py(m.y)} x2={px(m.x)} y2={py(m.y)} stroke={XY_C.cyan} strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
              <circle cx={px(m.x)} cy={py(m.y)} r="4.5" fill={dotBg} stroke={XY_C.cyan} strokeWidth="2" />
              {m.label && (
                <g>
                  <rect x={rx} y={ty-12} width={tw} height={15} rx="3"
                    fill={isBlackboard ? "rgba(10,18,30,0.82)" : "rgba(255,255,255,0.88)"} />
                  <text x={tx} y={ty} textAnchor={anchor} fontSize="11" fontWeight="700" fill={XY_C.cyan}>{m.label}</text>
                </g>
              )}
            </g>
          );
        })}
        {(el.annotations ?? []).map((a, ai) => (
          <text key={`an${ai}`} x={px(a.x)} y={py(a.y)}
            textAnchor={px(a.x) > PL+PW*0.65 ? "end" : "start"}
            fontSize="12" fill={lCol} fontStyle="italic">{a.text}</text>
        ))}
      </svg>
    </motion.div>
  );
}

type IframeDiagramEl = Extract<BoardElement, { type: "ai_diagram" }>;

function IframeDiagramRenderer({ el, isBlackboard }: { el: IframeDiagramEl; isBlackboard: boolean }) {
  const titl = isBlackboard ? "#e2e8f0" : "#1e293b";
  const bg   = isBlackboard ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)";
  const bord = isBlackboard ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";
  const aspectRatio = (() => {
    const m = el.html?.match(/viewBox=["']\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/);
    if (m) { const w = parseFloat(m[1]), h = parseFloat(m[2]); if (w > 0 && h > 0) return w / h; }
    return 4 / 3;
  })();
  const srcDoc = `<!DOCTYPE html><html><head><style>* { margin:0;padding:0;box-sizing:border-box } html,body { width:100%;height:100%;background:transparent;overflow:hidden } svg,canvas { width:100%;height:100%;display:block }</style></head><body>${el.html ?? ""}</body></html>`;
  return (
    <motion.div className="w-full my-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {el.title && <p className="text-sm font-semibold mb-2" style={{ color: titl }}>{el.title}</p>}
      <div className="rounded-xl overflow-hidden mx-auto"
        style={{ background: bg, border: bord, aspectRatio: String(aspectRatio), position: "relative", width: "100%", maxWidth: "560px" }}>
        <iframe srcDoc={srcDoc} sandbox="allow-scripts" scrolling="no" title={el.title ?? "diagram"}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} />
      </div>
    </motion.div>
  );
}

export function BoardRenderer({
  elements,
  boardMode,
  checkpointElementId,
  onCheckpointAnswer,
  optionAnswers,
  onOptionSelect,
  onFixElement,
  instant = false,
  showSpeakButtons = false,
  speakingElementId,
  onSpeakElement,
  onSpeakBlock,
  onStopBlock,
}: BoardRendererProps) {
  const isBlackboard = boardMode === "blackboard";
  const items = groupElements(elements);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = sentinel?.closest<HTMLElement>("[data-teach-board-scroll]");
    scrollContainer?.scrollTo({ top: scrollContainer.scrollHeight, behavior: "smooth" });
  }, [elements.length]);

  const renderItem = useCallback((item: ReturnType<typeof groupElements>[number], idx: number) => {
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
                {el.attachments && el.attachments.length > 0 && (
                  <StudentAttachmentPreview
                    attachments={el.attachments}
                    isBlackboard={isBlackboard}
                  />
                )}

                {el.content.trim() && (
                  <p
                    className={`text-lg font-semibold tracking-wide antialiased transition-colors duration-300 ${isBlackboard ? "text-amber-300" : "text-amber-600"
                      }`}
                  >
                    <PlainText text={el.content} />
                  </p>
                )}
              </motion.div>
            );

          // ── Header ───────────────────────────────────────────────────────────
          case "ai_header": {
            const hIdx = elements.findIndex(e => e.id === el.id);
            const nextStudentIdx = elements.findIndex((e, i) => i > hIdx && e.type === "student_text");
            const blockEls = elements.slice(hIdx, nextStudentIdx === -1 ? undefined : nextStudentIdx);
            const blockSpeakItems = blockEls
              .map(e => ({ speak: ((e as any).speak ?? ("content" in e ? (e as any).content : "")) as string, id: e.id }))
              .filter(bi => bi.speak.trim());
            const isBlockPlaying = !!speakingElementId && blockEls.some(e => e.id === speakingElementId);
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-4xl mt-6 border-b pb-2 transition-colors duration-300 ${isBlackboard ? "border-emerald-500/20" : "border-emerald-500/10"}`}
              >
                <SpeakBtnWrap show={showSpeakButtons} topPt="pt-3" btn={<SpeakBtn el={el} showSpeakButtons={showSpeakButtons} speakingElementId={speakingElementId} onSpeakElement={onSpeakElement} isBlackboard={isBlackboard} />}>
                  <div className="flex items-center gap-3">
                    <h2 className={`flex-1 text-3xl md:text-4xl font-black tracking-tight drop-shadow-sm transition-colors duration-300 ${isBlackboard ? "text-emerald-400 drop-shadow-[0_2px_8px_rgba(52,211,153,0.15)]" : "text-emerald-600"}`}>
                      <PlainText text={el.content} />
                    </h2>
                    {showSpeakButtons && blockEls.length > 1 && (
                      isBlockPlaying && onStopBlock ? (
                        <button
                          onClick={onStopBlock}
                          className={`shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 ${
                            isBlackboard
                              ? "bg-blue-500/25 text-blue-200 hover:bg-blue-500/35"
                              : "bg-blue-200 text-blue-800 hover:bg-blue-300"
                          }`}
                        >
                          <Square size={8} className="fill-current" />
                          Stop
                        </button>
                      ) : onSpeakBlock ? (
                        <button
                          onClick={() => onSpeakBlock(blockSpeakItems)}
                          className={`shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 ${
                            isBlackboard
                              ? "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 hover:text-blue-200"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          }`}
                        >
                          <RotateCcw size={10} />
                          Replay
                        </button>
                      ) : null
                    )}
                  </div>
                </SpeakBtnWrap>
              </motion.div>
            );
          }

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
                <SpeakBtnWrap show={showSpeakButtons} topPt="pt-1" btn={<SpeakBtn el={el} showSpeakButtons={showSpeakButtons} speakingElementId={speakingElementId} onSpeakElement={onSpeakElement} isBlackboard={isBlackboard} />}>
                  <FixableMathContent
                    text={el.content}
                    isBlackboard={isBlackboard}
                    instant={instant}
                    component="body"
                    onFix={onFixElement ? () => onFixElement(el.id, regexFixMath(el.content)) : undefined}
                  />
                </SpeakBtnWrap>
              </motion.div>
            );

          // ── Math ─────────────────────────────────────────────────────────────
          case "ai_math":
            return (
              <div key={el.id}>
                <SpeakBtnWrap show={showSpeakButtons} topPt="pt-7" btn={<SpeakBtn el={el} showSpeakButtons={showSpeakButtons} speakingElementId={speakingElementId} onSpeakElement={onSpeakElement} isBlackboard={isBlackboard} />}>
                  <FixableLatexWrapper
                    latex={el.latex}
                    isBlackboard={isBlackboard}
                    onFix={onFixElement ? () => onFixElement(el.id, regexFixMath(el.latex)) : undefined}
                  >
                    <MathRenderer latex={el.latex} isBlackboard={isBlackboard} />
                  </FixableLatexWrapper>
                </SpeakBtnWrap>
              </div>
            );

          // ── Semantic 2D diagram ─────────────────────────────────────────────
          case "ai_semantic_diagram":
            return (
              <SemanticDiagramRenderer
                key={el.id}
                view={el.view}
                title={el.title}
                entities={el.entities}
                isBlackboard={isBlackboard}
              />
            );

          // ── Three.js 3D scene ───────────────────────────────────────────────
          case "ai_3d_build":
            return null; // invisible — only updates the referenced ai_3d_scene's objects

          case "ai_3d_scene":
            return (
              <VisualFrame key={el.id} title={el.title} isBlackboard={isBlackboard}>
                <Suspense fallback={<div className="h-[420px] w-full animate-pulse bg-muted/20 rounded-lg" />}>
                  <ThreeSceneRenderer
                    objects={el.objects}
                    camera={el.camera}
                    isBlackboard={isBlackboard}
                    sceneId={el.sceneId}
                  />
                </Suspense>
              </VisualFrame>
            );

          // ── Graph ────────────────────────────────────────────────────────────
          case "ai_graph":
            return (
              <GraphRenderer
                key={el.id}
                title={el.title}
                xLabel={el.xLabel}
                yLabel={el.yLabel}
                points={el.points}
                isBlackboard={isBlackboard}
              />
            );

          // ── Structured diagram ───────────────────────────────────────────────
          case "ai_diagram_v2":
            return (
              <DiagramRenderer
                key={el.id}
                title={el.title}
                objects={el.objects}
                isBlackboard={isBlackboard}
              />
            );

          // ── Simple 3D visual ─────────────────────────────────────────────────
          case "ai_3d_shape":
            return (
              <Shape3DRenderer
                key={el.id}
                shape={el.shape}
                title={el.title}
                vectors={el.vectors}
                labels={el.labels}
                isBlackboard={isBlackboard}
              />
            );

          // ── Highlight (Chalkboard Masterclass) ───────────────────────────────
          case "ai_highlight":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45 }}
                className="my-6 pl-2"
              >
                <SpeakBtnWrap show={showSpeakButtons} topPt="pt-3" btn={<SpeakBtn el={el} showSpeakButtons={showSpeakButtons} speakingElementId={speakingElementId} onSpeakElement={onSpeakElement} isBlackboard={isBlackboard} />}>
                  <FixableLatexWrapper
                    latex={el.latex}
                    isBlackboard={isBlackboard}
                    onFix={onFixElement ? () => onFixElement(el.id, regexFixMath(el.latex)) : undefined}
                  >
                    <div className={`select-all font-sans text-xl md:text-2xl ${isBlackboard ? "text-emerald-200" : "text-emerald-800"}`}>
                      <BlockMath math={el.latex} />
                    </div>
                  </FixableLatexWrapper>
                </SpeakBtnWrap>
              </motion.div>
            );

          // ── Warning (Chalkboard Masterclass) ─────────────────────────────────
          case "ai_warning":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="max-w-3xl my-4 rotate-[0.25deg]"
              >
                <SpeakBtnWrap show={showSpeakButtons} topPt="pt-5" btn={<SpeakBtn el={el} showSpeakButtons={showSpeakButtons} speakingElementId={speakingElementId} onSpeakElement={onSpeakElement} isBlackboard={isBlackboard} />}>
                  <div className={`relative rounded-lg p-5 transition-all duration-300 ${
                    isBlackboard
                      ? "bg-amber-950/15 text-amber-200/90 shadow-[0_0_18px_rgba(245,158,11,0.04)] border-[2.5px] border-dashed border-amber-500/50"
                      : "bg-amber-500/5 text-amber-900 shadow-[0_4px_12px_rgba(0,0,0,0.02)] border-[2.5px] border-dashed border-amber-600/70"
                  }`}>
                    {isBlackboard && <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-amber-400/20 opacity-60" />}
                    <div className={`flex items-center gap-2 mb-2 font-serif italic text-sm tracking-wide lowercase opacity-80 ${isBlackboard ? "text-amber-400" : "text-amber-700"}`}>
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>warning</span>
                    </div>
                    <p className="text-base font-medium leading-relaxed antialiased tracking-wide">
                      <PlainText text={el.content} />
                    </p>
                  </div>
                </SpeakBtnWrap>
              </motion.div>
            );

          // ── Tip (Chalkboard Masterclass) ──────────────────────────────────────
          case "ai_tip":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="max-w-3xl my-4"
              >
                <SpeakBtnWrap show={showSpeakButtons} topPt="pt-5" btn={<SpeakBtn el={el} showSpeakButtons={showSpeakButtons} speakingElementId={speakingElementId} onSpeakElement={onSpeakElement} isBlackboard={isBlackboard} />}>
                  <div
                    className={`rounded-xl border-0 px-8 py-5 transition-all duration-300 ${isBlackboard ? "text-amber-100" : "text-amber-900"}`}
                    style={{ boxShadow: "rgba(6, 24, 44, 0.4) 0px 0px 0px 2px, rgba(6, 24, 44, 0.65) 0px 4px 6px -1px, rgba(255, 255, 255, 0.08) 0px 1px 0px inset", background: isBlackboard ? "rgba(30,20,5,0.6)" : "rgba(255,251,235,0.9)" }}
                  >
                    <div className={`flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-widest ${isBlackboard ? "text-amber-400 opacity-70" : "text-amber-800 opacity-90"}`}>
                      <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                      <span>Tip</span>
                    </div>
                    <FixableMathContent
                      text={el.content}
                      isBlackboard={isBlackboard}
                      component="tip"
                      onFix={onFixElement ? () => onFixElement(el.id, regexFixMath(el.content)) : undefined}
                    />
                  </div>
                </SpeakBtnWrap>
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
                {/* question text — always has the left speak-button column */}
                <div className="flex items-start gap-2">
                  <div className="w-5 shrink-0 pt-1 flex justify-center">
                    <SpeakBtn el={el} alwaysVisible showSpeakButtons={showSpeakButtons} speakingElementId={speakingElementId} onSpeakElement={onSpeakElement} isBlackboard={isBlackboard} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-lg font-medium tracking-wide leading-relaxed antialiased italic transition-colors duration-300 ${isBlackboard ? "text-neutral-100" : "text-neutral-900"}`}>
                      <PlainText text={el.content} />
                    </p>
                    <AnimatePresence>
                      {isActive && <CheckpointInput isBlackboard={isBlackboard} onSubmit={onCheckpointAnswer} />}
                    </AnimatePresence>
                  </div>
                </div>
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
                className="ml-4 my-2 max-w-3xl flex items-center"
              >
                <div
                  className="shrink-0 overflow-hidden flex justify-center"
                  style={{ width: showSpeakButtons ? 28 : 0, transition: "width 150ms ease" }}
                >
                  <SpeakBtn el={el} speakText={el.speak ?? el.label} showSpeakButtons={showSpeakButtons} speakingElementId={speakingElementId} onSpeakElement={onSpeakElement} isBlackboard={isBlackboard} />
                </div>
                <div
                  className={`flex-1 rounded-xl border-0 px-6 py-3 transition-all duration-300 select-all font-sans text-lg ${isBlackboard ? "bg-white/8 text-cyan-200" : "bg-white text-cyan-800"}`}
                  style={{ boxShadow: isBlackboard
                    ? "rgba(0,0,0,0.4) 3px 3px 6px 0px inset, rgba(255,255,255,0.05) -3px -3px 6px 1px inset"
                    : "rgb(204, 219, 232) 3px 3px 6px 0px inset, rgba(255, 255, 255, 0.5) -3px -3px 6px 1px inset"
                  }}
                >
                  <BlockMath math={el.latex} />
                </div>
                <span className={`text-2xl font-black shrink-0 select-none flex items-center gap-1 ${isBlackboard ? "text-white/80" : "text-neutral-900"}`}>
                  <span className="text-base font-light opacity-40">──</span>
                  {el.number}
                </span>
              </motion.div>
            );

          case "ai_xy_graph":
            return <XYGraphRenderer key={el.id} el={el} isBlackboard={isBlackboard} />;

          case "ai_diagram":
            return <IframeDiagramRenderer key={el.id} el={el} isBlackboard={isBlackboard} />;

          // ── Code block ───────────────────────────────────────────────────────
          case "ai_code":
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="my-4 max-w-3xl w-full"
              >
                {el.label && (
                  <p className={`mb-1.5 text-xs font-semibold uppercase tracking-wide ${isBlackboard ? "text-neutral-400" : "text-neutral-500"}`}>
                    {el.label}
                  </p>
                )}
                <div className="rounded-xl overflow-hidden border border-white/10 text-sm">
                  <Suspense fallback={
                    <pre className="p-4 text-sm leading-relaxed" style={{ background: isBlackboard ? "#0d1117" : "#f6f8fa" }}>
                      {el.code}
                    </pre>
                  }>
                    <LazyCodeBlock
                      code={el.code}
                      language={el.language || "text"}
                      isBlackboard={isBlackboard}
                    />
                  </Suspense>
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlackboard, checkpointElementId, optionAnswers, onCheckpointAnswer, onOptionSelect, instant, showSpeakButtons, speakingElementId, onSpeakElement, onSpeakBlock, onStopBlock, elements]);

  return (
    <MotionConfig reducedMotion={instant ? "always" : "never"}>
    <div className="flex flex-col gap-y-8 pb-12">
      {items.map((item, idx) => renderItem(item, idx))}
      <div ref={sentinelRef} className="h-1 w-full" />
    </div>
    </MotionConfig>
  );
}
