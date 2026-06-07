import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Undo2, Redo2, Trash2, Eraser, Highlighter, Pen,
  Shapes, Minus, Circle, Square, ChevronUp,
  ArrowRight, ArrowLeftRight, Triangle, Pentagon, Hexagon,
} from "lucide-react";
import type { CanvasTool } from "@/types/teach";
import { CANVAS_COLORS, CANVAS_BRUSH_SIZE_MIN, CANVAS_BRUSH_SIZE_MAX } from "@/types/teach";

interface Props {
  tool: CanvasTool;
  color: string;
  brushSize: number;
  onToolChange: (t: CanvasTool) => void;
  onColorChange: (c: string) => void;
  onBrushSizeChange: (s: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const FREEHAND_TOOLS: { id: CanvasTool; Icon: React.ElementType; label: string }[] = [
  { id: "pen",         Icon: Pen,         label: "Pen"         },
  { id: "highlighter", Icon: Highlighter, label: "Highlighter" },
  { id: "eraser",      Icon: Eraser,      label: "Eraser"      },
];

const SHAPE_TOOLS: { id: CanvasTool; Icon: React.ElementType; label: string }[] = [
  { id: "line",         Icon: Minus,          label: "Line"         },
  { id: "arrow",        Icon: ArrowRight,      label: "Arrow"        },
  { id: "double_arrow", Icon: ArrowLeftRight,  label: "Double Arrow" },
  { id: "circle",       Icon: Circle,          label: "Circle"       },
  { id: "rect",         Icon: Square,          label: "Rectangle"    },
  { id: "triangle",     Icon: Triangle,        label: "Triangle"     },
  { id: "pentagon",     Icon: Pentagon,        label: "Pentagon"     },
  { id: "hexagon",      Icon: Hexagon,         label: "Hexagon"      },
];

const SHAPE_IDS = new Set<CanvasTool>(SHAPE_TOOLS.map(s => s.id));

function isShapeTool(t: CanvasTool) { return SHAPE_IDS.has(t); }
function activeShapeIcon(t: CanvasTool) {
  return SHAPE_TOOLS.find(s => s.id === t)?.Icon ?? Shapes;
}

export function CanvasToolbar({
  tool, color, brushSize,
  onToolChange, onColorChange, onBrushSizeChange,
  onUndo, onRedo, onClear,
}: Props) {
  const [shapesOpen, setShapesOpen] = useState(false);
  const shapesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!shapesRef.current?.contains(e.target as Node)) setShapesOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const ShapeIcon = isShapeTool(tool) ? activeShapeIcon(tool) : Shapes;

  // Visible brush size for the preview dot — cap at 32px so it fits
  const dotSize = Math.min(brushSize, 32);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pointer-events-none fixed bottom-[88px] left-0 right-0 z-[59] flex justify-center px-2 sm:px-4"
    >
      <div
        className="pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2.5 flex-wrap justify-center"
        style={{
          background: "rgba(10,10,10,0.65)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,0.09)",
            "inset 0 -1px 0 rgba(0,0,0,0.4)",
            "0 0 0 1px rgba(255,255,255,0.07)",
            "0 8px 32px -6px rgba(0,0,0,0.8)",
          ].join(", "),
        }}
      >
        {/* ── Freehand brush tools ── */}
        <div className="flex items-center gap-0.5">
          {FREEHAND_TOOLS.map(({ id, Icon, label }) => (
            <button
              key={id}
              title={label}
              onClick={() => { onToolChange(id); setShapesOpen(false); }}
              className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                tool === id
                  ? "bg-white/20 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/8"
              }`}
            >
              <Icon size={15} />
            </button>
        ))}
        </div>

        <div className="w-px h-5 bg-white/10 shrink-0" />

        {/* ── Shapes sub-tool ── */}
        <div ref={shapesRef} className="relative">
          <button
            title="Shapes"
            onClick={() => setShapesOpen(o => !o)}
            className={`flex items-center gap-1 px-2 h-8 rounded-xl transition-all ${
              isShapeTool(tool)
                ? "bg-white/20 text-white"
                : shapesOpen
                  ? "bg-white/12 text-white/80"
                  : "text-white/40 hover:text-white/70 hover:bg-white/8"
            }`}
          >
            <ShapeIcon size={15} />
            <ChevronUp size={11} className={`transition-transform ${shapesOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {shapesOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-xl overflow-hidden"
                style={{
                  background:    "rgba(14,14,14,0.97)",
                  backdropFilter: "blur(20px)",
                  border:        "1px solid rgba(255,255,255,0.1)",
                  boxShadow:     "0 -8px 32px rgba(0,0,0,0.7)",
                  minWidth:      "18rem",
                }}
              >
                <div className="grid grid-cols-2">
                  {SHAPE_TOOLS.map(({ id, Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => { onToolChange(id); setShapesOpen(false); }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/8 ${
                        tool === id ? "text-white" : "text-white/55"
                      }`}
                    >
                      <Icon size={14} />
                      <span className="text-sm font-medium">{label}</span>
                      {tool === id && (
                        <span className="ml-auto text-[10px] font-bold text-blue-400">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-px h-5 bg-white/10 shrink-0" />

        {/* ── Colors ── */}
        <div className="flex items-center gap-1.5">
          {CANVAS_COLORS.map(({ id, hex }) => (
            <button
              key={id}
              title={id}
              onClick={() => onColorChange(hex)}
              className="flex items-center justify-center w-5 h-5 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0"
              style={{
                background: hex,
                boxShadow: color === hex ? "0 0 0 2px rgba(255,255,255,0.9)" : "none",
              }}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-white/10 shrink-0" />

        {/* ── Brush size slider ── */}
        <div className="flex items-center gap-2">
          {/* Live dot preview */}
          <div
            className="rounded-full shrink-0 transition-all"
            style={{
              width:      dotSize,
              height:     dotSize,
              minWidth:   4,
              minHeight:  4,
              background: color === "#1a1a1a" ? "rgba(255,255,255,0.6)" : color,
              opacity:    0.8,
            }}
          />
          <input
            type="range"
            min={CANVAS_BRUSH_SIZE_MIN}
            max={CANVAS_BRUSH_SIZE_MAX}
            value={brushSize}
            onChange={e => onBrushSizeChange(Number(e.target.value))}
            className="w-24 h-1.5 appearance-none rounded-full outline-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgba(255,255,255,0.7) ${
                ((brushSize - CANVAS_BRUSH_SIZE_MIN) / (CANVAS_BRUSH_SIZE_MAX - CANVAS_BRUSH_SIZE_MIN)) * 100
              }%, rgba(255,255,255,0.15) 0%)`,
              accentColor: "rgba(255,255,255,0.8)",
            }}
          />
          <span className="text-[11px] text-white/40 w-5 text-right tabular-nums">{brushSize}</span>
        </div>

        <div className="w-px h-5 bg-white/10 shrink-0" />

        {/* ── Undo / Redo ── */}
        <div className="flex items-center gap-1">
          <button title="Undo" onClick={onUndo}
            className="flex items-center justify-center w-8 h-8 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/8 transition-all">
            <Undo2 size={15} />
          </button>
          <button title="Redo" onClick={onRedo}
            className="flex items-center justify-center w-8 h-8 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/8 transition-all">
            <Redo2 size={15} />
          </button>
        </div>

        <div className="w-px h-5 bg-white/10 shrink-0" />

        {/* ── Clear ── */}
        <button title="Clear canvas" onClick={onClear}
          className="flex items-center justify-center w-8 h-8 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <Trash2 size={15} />
        </button>
      </div>
    </motion.div>
  );
}
