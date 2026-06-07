import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CanvasOverlayHandle, CanvasTool } from "@/types/teach";
import { saveCanvas, loadCanvas } from "@/lib/canvas-storage";

interface Props {
  isActive: boolean;
  tool: CanvasTool;
  color: string;
  brushSize: number;
  sessionId?: string | null;
}

const MAX_UNDO = 40;

const SHAPE_TOOLS = new Set<CanvasTool>([
  "line", "arrow", "double_arrow", "circle", "rect", "triangle", "pentagon", "hexagon",
]);
const isShape = (t: CanvasTool) => SHAPE_TOOLS.has(t);

function getCursorSize(tool: CanvasTool, brushSize: number): number {
  if (tool === "eraser" || tool === "highlighter") return brushSize * 4;
  return brushSize;
}

export const CanvasOverlay = forwardRef<CanvasOverlayHandle, Props>(
  ({ isActive, tool, color, brushSize, sessionId }, ref) => {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const isDrawing    = useRef(false);
    const undoStack    = useRef<ImageData[]>([]);
    const redoStack    = useRef<ImageData[]>([]);
    const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionIdRef = useRef<string | null | undefined>(sessionId);

    // Highlighter: restore-and-redraw pattern to avoid alpha stacking
    const hlSnapshotRef = useRef<ImageData | null>(null);
    const hlPointsRef   = useRef<{ x: number; y: number }[]>([]);

    // Shape tools: restore-and-redraw pattern
    const shapeSnapshotRef = useRef<ImageData | null>(null);
    const startPosRef      = useRef<{ x: number; y: number } | null>(null);


    // Cursor preview
    const [cursorPos, setCursorPos]   = useState<{ x: number; y: number } | null>(null);
    const [isHovering, setIsHovering] = useState(false);

    // ── Resize canvas, preserving drawing ───────────────────────────────────
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const resize = () => {
        // Use offsetWidth/Height — getBoundingClientRect clips to the scroll viewport
        const width  = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        const dpr = window.devicePixelRatio || 1;
        const ctx  = canvas.getContext("2d");
        let snap: ImageData | null = null;
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          try { snap = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch {}
        }
        canvas.width  = Math.round(width  * dpr);
        canvas.height = Math.round(height * dpr);
        if (ctx) {
          ctx.scale(dpr, dpr);
          if (snap) ctx.putImageData(snap, 0, 0);
        }
      };
      resize();
      const ro = new ResizeObserver(resize);
      // Observe the parent (content wrapper) so canvas resizes when content grows
      ro.observe(canvas.parentElement ?? canvas);
      return () => ro.disconnect();
    }, []);

    // ── Keep sessionId ref current ───────────────────────────────────────────
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

    // ── Load saved canvas when sessionId changes ──────────────────────────────
    useEffect(() => {
      if (!sessionId) return;
      const canvas = canvasRef.current;
      const ctx    = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      loadCanvas(sessionId).then(imageData => {
        if (!imageData) return;
        // Only restore if canvas is still blank (don't clobber live drawing)
        const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const isEmpty = current.data.every(v => v === 0);
        if (isEmpty) ctx.putImageData(imageData, 0, 0);
      });
    }, [sessionId]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    function scheduleSave() {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const sid = sessionIdRef.current;
        const canvas = canvasRef.current;
        const ctx    = canvas?.getContext("2d");
        if (!sid || !canvas || !ctx) return;
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          void saveCanvas(sid, imageData);
        } catch { /* non-fatal */ }
      }, 500);
    }

    function pushUndo() {
      const canvas = canvasRef.current;
      const ctx    = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStack.current.push(data);
      if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
      redoStack.current = [];
    }

    function getPos(e: MouseEvent): { x: number; y: number } {
      const rect = canvasRef.current!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function resetCtx(ctx: CanvasRenderingContext2D) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    function applyFreehandStyle(ctx: CanvasRenderingContext2D) {
      ctx.lineCap  = "round";
      ctx.lineJoin = "round";
      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth   = brushSize * 4;
        ctx.globalAlpha = 1;
      } else if (tool === "highlighter") {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        ctx.lineWidth   = brushSize * 4;
        ctx.globalAlpha = 0.35;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        ctx.lineWidth   = brushSize;
        ctx.globalAlpha = 1;
      }
    }

    function applyShapeStyle(ctx: CanvasRenderingContext2D) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha  = 1;
      ctx.strokeStyle  = color;
      ctx.lineWidth    = brushSize;
      ctx.lineCap      = "round";
      ctx.lineJoin     = "round";
    }

    function drawArrowhead(ctx: CanvasRenderingContext2D, tip: { x: number; y: number }, angle: number) {
      const headLen = Math.max(14, brushSize * 5);
      ctx.save();
      ctx.fillStyle  = color;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(tip.x - headLen * Math.cos(angle - Math.PI / 6), tip.y - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(tip.x - headLen * Math.cos(angle + Math.PI / 6), tip.y - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawRegularPolygon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sides: number) {
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = (i * 2 * Math.PI / sides) - Math.PI / 2;
        i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      ctx.closePath();
      ctx.stroke();
    }

    function drawShape(ctx: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }) {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const cx    = (start.x + end.x) / 2;
      const cy    = (start.y + end.y) / 2;
      const r     = Math.min(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) / 2;

      if (tool === "line") {
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      } else if (tool === "arrow") {
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
        drawArrowhead(ctx, end, angle);
      } else if (tool === "double_arrow") {
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
        drawArrowhead(ctx, end,   angle);
        drawArrowhead(ctx, start, angle + Math.PI);
      } else if (tool === "circle") {
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (tool === "rect") {
        ctx.beginPath(); ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (tool === "triangle") {
        ctx.beginPath(); ctx.moveTo(cx, start.y); ctx.lineTo(end.x, end.y); ctx.lineTo(start.x, end.y); ctx.closePath(); ctx.stroke();
      } else if (tool === "pentagon") {
        drawRegularPolygon(ctx, cx, cy, r, 5);
      } else if (tool === "hexagon") {
        drawRegularPolygon(ctx, cx, cy, r, 6);
      }
    }

    // ── Drawing event listeners ──────────────────────────────────────────────
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const onDown = (e: MouseEvent) => {
        if (!isActive) return;
        e.preventDefault();
        pushUndo();
        isDrawing.current = true;
        const ctx = canvas.getContext("2d")!;
        const pos = getPos(e);

        if (isShape(tool)) {
          startPosRef.current = pos;
          try { shapeSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch {}
        } else if (tool === "highlighter") {
          hlPointsRef.current = [pos];
          try { hlSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch {}
        } else {
          applyFreehandStyle(ctx);
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
        }
      };

      const onMove = (e: MouseEvent) => {
        const pos = getPos(e);
        setCursorPos(pos);
        if (!isDrawing.current || !isActive) return;
        e.preventDefault();
        const ctx = canvas.getContext("2d")!;

        if (isShape(tool)) {
          if (!startPosRef.current || !shapeSnapshotRef.current) return;
          ctx.putImageData(shapeSnapshotRef.current, 0, 0);
          applyShapeStyle(ctx);
          drawShape(ctx, startPosRef.current, pos);
          resetCtx(ctx);

        } else if (tool === "highlighter") {
          hlPointsRef.current.push(pos);
          if (hlSnapshotRef.current) ctx.putImageData(hlSnapshotRef.current, 0, 0);
          const pts = hlPointsRef.current;
          if (pts.length < 2) return;
          applyFreehandStyle(ctx);
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
          resetCtx(ctx);

        } else {
          applyFreehandStyle(ctx);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
          resetCtx(ctx);
        }
      };

      const onUp = () => {
        if (!isDrawing.current) return;
        isDrawing.current        = false;
        hlSnapshotRef.current    = null;
        hlPointsRef.current      = [];
        shapeSnapshotRef.current = null;
        startPosRef.current      = null;
        const ctx = canvas.getContext("2d");
        if (ctx) resetCtx(ctx);
        scheduleSave();
      };

      const onEnter = () => setIsHovering(true);
      const onLeave = () => { setIsHovering(false); setCursorPos(null); onUp(); };

      canvas.addEventListener("mousedown",  onDown);
      canvas.addEventListener("mousemove",  onMove);
      canvas.addEventListener("mouseup",    onUp);
      canvas.addEventListener("mouseenter", onEnter);
      canvas.addEventListener("mouseleave", onLeave);
      return () => {
        canvas.removeEventListener("mousedown",  onDown);
        canvas.removeEventListener("mousemove",  onMove);
        canvas.removeEventListener("mouseup",    onUp);
        canvas.removeEventListener("mouseenter", onEnter);
        canvas.removeEventListener("mouseleave", onLeave);
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, tool, color, brushSize]);

    // ── Imperative handle ────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      undo() {
        const canvas = canvasRef.current;
        const ctx    = canvas?.getContext("2d");
        if (!canvas || !ctx || undoStack.current.length === 0) return;
        try { redoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); } catch {}
        ctx.putImageData(undoStack.current.pop()!, 0, 0);
      },
      redo() {
        const canvas = canvasRef.current;
        const ctx    = canvas?.getContext("2d");
        if (!canvas || !ctx || redoStack.current.length === 0) return;
        try { undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); } catch {}
        ctx.putImageData(redoStack.current.pop()!, 0, 0);
      },
      clear() {
        const canvas = canvasRef.current;
        const ctx    = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        pushUndo();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        scheduleSave();
      },
      captureAsImage() {
        return canvasRef.current?.toDataURL("image/png") ?? null;
      },
    }));

    // ── Cursor preview ───────────────────────────────────────────────────────
    const showCursor  = isActive && isHovering && cursorPos && !isShape(tool);
    const cursorSize  = showCursor ? Math.max(getCursorSize(tool, brushSize), 6) : 0;

    const cursorStyle: React.CSSProperties = showCursor ? {
      position:      "absolute",
      left:          cursorPos!.x - cursorSize / 2,
      top:           cursorPos!.y - cursorSize / 2,
      width:         cursorSize,
      height:        cursorSize,
      borderRadius:  "50%",
      pointerEvents: "none",
      zIndex:        30,
      ...(tool === "eraser"
        ? { border: "1.5px dashed rgba(200,200,200,0.75)", background: "transparent" }
        : tool === "highlighter"
          ? { background: color, opacity: 0.38 }
          : { background: color, opacity: 0.85 }
      ),
    } : {};

    return (
      <>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-20 w-full h-full"
          style={{
            pointerEvents: isActive ? "auto" : "none",
            cursor:        !isActive ? "default" : isShape(tool) ? "crosshair" : "none",
            touchAction:   "none",
          }}
        />
        {showCursor && <div style={cursorStyle} />}
      </>
    );
  }
);

CanvasOverlay.displayName = "CanvasOverlay";
