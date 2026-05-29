import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
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

function StudentAttachmentPreview({
  attachments,
  isBlackboard,
}: {
  attachments: UploadedAttachment[];
  isBlackboard: boolean;
}) {
  const visualAttachments = attachments.filter(
    (attachment) => attachment.kind === "image" || attachment.kind === "pdf"
  );
  const primary = visualAttachments[0];
  if (!primary?.dataUrl) return null;

  const stackCount = visualAttachments.length;
  const showDocumentLayer = primary.kind === "pdf" || stackCount > 1;
  const surface = isBlackboard
    ? "border-white/12 bg-neutral-950/70 shadow-black/50"
    : "border-neutral-200 bg-white shadow-neutral-300/60";

  return (
    <div className="relative my-3 w-full max-w-xl">
      {stackCount > 2 && (
        <div
          className={`absolute inset-0 translate-x-4 translate-y-4 rotate-3 rounded-lg border ${surface}`}
        />
      )}
      {showDocumentLayer && (
        <div
          className={`absolute inset-0 translate-x-2 translate-y-2 rotate-1 rounded-lg border ${surface}`}
        />
      )}

      <div
        className={`relative overflow-hidden rounded-lg border shadow-xl ${surface}`}
      >
        {primary.kind === "image" ? (
          <img
            src={primary.dataUrl}
            alt=""
            className="max-h-[26rem] w-full object-contain"
          />
        ) : (
          <iframe
            title="Uploaded PDF preview"
            src={`${primary.dataUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
            className="h-[26rem] w-full bg-white"
          />
        )}

        {stackCount > 1 && (
          <div
            className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${
              isBlackboard
                ? "bg-neutral-950/80 text-neutral-100 ring-1 ring-white/15"
                : "bg-white/90 text-neutral-700 ring-1 ring-neutral-200"
            }`}
          >
            +{stackCount - 1}
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

function makeTextSprite(label: string, color: string) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 128;
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "700 42px Inter, Arial, sans-serif";
    context.fillStyle = color;
    context.fillText(label, 18, 72);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.6, 0.4, 1);
  return sprite;
}

function addSceneLabel(scene: THREE.Scene, label: string | undefined, position: THREE.Vector3, color: string) {
  if (!label) return;
  const sprite = makeTextSprite(label, color);
  sprite.position.copy(position);
  scene.add(sprite);
}

function vectorFromTuple(tuple: [number, number, number] | undefined, fallback: [number, number, number]) {
  const value = tuple ?? fallback;
  return new THREE.Vector3(value[0], value[1], value[2]);
}

function physicsPoint(tuple: [number, number, number] | undefined, fallback: [number, number, number]) {
  const value = tuple ?? fallback;
  return new THREE.Vector3(value[0], value[2], value[1]);
}

function ThreeSceneRenderer({
  title,
  objects,
  camera,
  isBlackboard,
}: {
  title?: string;
  objects: Scene3DObject[];
  camera?: [number, number, number];
  isBlackboard: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 720;
    const height = 420;
    const textColor = isBlackboard ? "#f3f4f6" : "#111827";
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isBlackboard ? "#060807" : "#ffffff");

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const perspectiveCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const cameraPosition = vectorFromTuple(camera, [3.5, 2.8, 4.2]);
    perspectiveCamera.position.copy(cameraPosition);
    perspectiveCamera.lookAt(0, 0, 0);

    const controls = new OrbitControls(perspectiveCamera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;

    scene.add(new THREE.AmbientLight(0xffffff, isBlackboard ? 1.7 : 1.3));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(4, 5, 6);
    scene.add(directionalLight);

    const addArrow = (start: THREE.Vector3, end: THREE.Vector3, color: string, label?: string) => {
      const direction = end.clone().sub(start);
      const length = direction.length();
      if (length === 0) return;
      const arrow = new THREE.ArrowHelper(direction.normalize(), start, length, new THREE.Color(color), 0.18, 0.08);
      scene.add(arrow);
      addSceneLabel(scene, label, end.clone().add(new THREE.Vector3(0.08, 0.08, 0.08)), textColor);
    };

    const addAxes = () => {
      addArrow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.6, 0, 0), "#ef4444", "x");
      addArrow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1.6), "#22c55e", "y");
      addArrow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.6, 0), "#3b82f6", "z");
    };

    const buildObject = (object: Scene3DObject) => {
      const color = colorFor(object.color, isBlackboard ? "#67e8f9" : "#2563eb");
      const material = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: object.kind === "plane" ? 0.34 : 0.82,
        roughness: 0.55,
        metalness: 0.08,
        side: THREE.DoubleSide,
      });
      const position = physicsPoint(object.position, [0, 0, 0]);

      if (object.kind === "axes") {
        addAxes();
        return;
      }

      if (object.kind === "plane") {
        const size = object.size ?? [2.2, 1.4];
        const geometry = new THREE.PlaneGeometry(size[0], size[1]);
        const plane = new THREE.Mesh(geometry, material);
        if (object.plane === "xy") plane.rotation.x = -Math.PI / 2;
        if (object.plane === "yz") plane.rotation.y = Math.PI / 2;
        if (object.plane === "xz") plane.rotation.z = 0;
        plane.position.copy(position);
        scene.add(plane);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: textColor }));
        edges.rotation.copy(plane.rotation);
        edges.position.copy(plane.position);
        scene.add(edges);
        addSceneLabel(scene, object.label, position.clone().add(new THREE.Vector3(0.1, 0.12, 0.1)), textColor);
        return;
      }

      if (object.kind === "line_charge") {
        const axis = object.axis ?? "y";
        const geometry = new THREE.CylinderGeometry(0.035, 0.035, 2.6, 24);
        const line = new THREE.Mesh(geometry, material);
        if (axis === "x") line.rotation.z = Math.PI / 2;
        if (axis === "y") line.rotation.x = Math.PI / 2;
        line.position.copy(position);
        scene.add(line);
        addSceneLabel(scene, object.label || "line charge", position.clone().add(new THREE.Vector3(0.12, 1.36, 0.12)), textColor);
        return;
      }

      if (object.kind === "vector") {
        addArrow(position, physicsPoint(object.end, [1, 0, 0]), color, object.label);
        return;
      }

      if (object.kind === "point" || object.kind === "sphere") {
        const geometry = new THREE.SphereGeometry(object.radius ?? 0.09, 32, 16);
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        scene.add(sphere);
        addSceneLabel(scene, object.label, position.clone().add(new THREE.Vector3(0.1, 0.1, 0.1)), textColor);
        return;
      }

      if (object.kind === "cube") {
        const size = object.size && object.size.length === 3 ? object.size : [0.6, 0.6, 0.6];
        const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
        const cube = new THREE.Mesh(geometry, material);
        cube.position.copy(position);
        scene.add(cube);
        addSceneLabel(scene, object.label, position.clone().add(new THREE.Vector3(0.1, 0.4, 0.1)), textColor);
      }
    };

    if (!objects.some((object) => object.kind === "axes")) {
      addAxes();
    }
    objects.forEach(buildObject);

    let disposed = false;
    const animate = () => {
      if (disposed) return;
      controls.update();
      renderer.render(scene, perspectiveCamera);
      requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const nextWidth = entry?.contentRect.width || width;
      renderer.setSize(nextWidth, height);
      perspectiveCamera.aspect = nextWidth / height;
      perspectiveCamera.updateProjectionMatrix();
    });
    resizeObserver.observe(mount);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, [camera, isBlackboard, objects]);

  return (
    <VisualFrame title={title} isBlackboard={isBlackboard}>
      <div ref={mountRef} className="h-[420px] w-full" />
    </VisualFrame>
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
          case "ai_3d_scene":
            return (
              <ThreeSceneRenderer
                key={el.id}
                title={el.title}
                objects={el.objects}
                camera={el.camera}
                isBlackboard={isBlackboard}
              />
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
                <p
                  className={`text-lg font-medium tracking-wide leading-relaxed antialiased italic transition-colors duration-300 ${
                    isBlackboard ? "text-neutral-100" : "text-neutral-900"
                  }`}
                >
                  <PlainText text={el.content} />
                </p>

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
