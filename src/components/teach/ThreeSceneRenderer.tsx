import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useState, useRef, useEffect } from "react";
import type { Scene3DObject } from "@/types/teach";
import { sceneRegistry } from "./sceneRegistry";

function colorFor(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value;
  return fallback;
}

// Labels are now drawn on a 2D canvas overlay — no Three.js sprites needed
type LabelEntry = { text: string; pos: THREE.Vector3; color: string };

const AXIS_LABELS = new Set(["x", "y", "z"]);
const MAX_LABELS = 5;

function drawOverlayLabels(
  overlayCanvas: HTMLCanvasElement,
  labels: LabelEntry[],
  camera: THREE.Camera,
  isBlackboard: boolean
) {
  const ctx = overlayCanvas.getContext("2d");
  if (!ctx) return;
  const W = overlayCanvas.width;
  const H = overlayCanvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  ctx.font = "bold 13px Inter, Arial, sans-serif";

  // Separate axis labels from content labels; cap content labels
  const axisLabels = labels.filter(l => AXIS_LABELS.has(l.text));
  const contentLabels = labels.filter(l => !AXIS_LABELS.has(l.text)).slice(0, MAX_LABELS);
  const allLabels = [...axisLabels, ...contentLabels];

  for (const lbl of allLabels) {
    const v = lbl.pos.clone().project(camera);
    if (v.z > 1 || v.z < -1) continue;

    const sx = (v.x * 0.5 + 0.5) * W;
    const sy = (-v.y * 0.5 + 0.5) * H;

    const isAxis = AXIS_LABELS.has(lbl.text);

    if (isAxis) {
      // Axis labels: show near the tip, flip horizontally when near right edge
      const textW = ctx.measureText(lbl.text).width;
      const labelW = textW + 6;
      // Flip to left side if label would overflow right edge
      const offX = sx + 6 + labelW > W ? -(labelW + 4) : 6;
      const offY = sy + 6 + 18 > H ? -18 : -10;
      ctx.fillStyle = isBlackboard ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)";
      ctx.fillRect(sx + offX, sy + offY, labelW, 18);
      ctx.fillStyle = lbl.color;
      ctx.fillText(lbl.text, sx + offX + 3, sy + offY + 13);
    } else {
      // Content labels: push toward canvas edge with leader line
      let dx = sx - cx, dy = sy - cy;
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) { dx = 1; dy = 1; }
      const margin = 70;
      const scaleX = (W / 2 - margin) / Math.abs(dx);
      const scaleY = (H / 2 - margin) / Math.abs(dy);
      const scale = Math.min(scaleX, scaleY) * 0.85;
      const lx = cx + dx * scale;
      const ly = cy + dy * scale;

      // Leader line
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(lx, ly);
      ctx.strokeStyle = lbl.color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.65;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Dot at 3D anchor
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = lbl.color;
      ctx.fill();

      // Label background + text
      const textW = ctx.measureText(lbl.text).width;
      const textX = lx > cx ? lx + 5 : lx - textW - 5;
      ctx.fillStyle = isBlackboard ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.92)";
      ctx.fillRect(textX - 5, ly - 11, textW + 10, 20);
      ctx.fillStyle = lbl.color;
      ctx.fillText(lbl.text, textX, ly + 4);
    }
  }
}

function vectorFromTuple(tuple: [number, number, number] | undefined, fallback: [number, number, number]) {
  const value = tuple ?? fallback;
  return new THREE.Vector3(value[0], value[1], value[2]);
}

function physicsPoint(tuple: [number, number, number] | undefined, fallback: [number, number, number]) {
  const value = tuple ?? fallback;
  // x=right, y=up, z=depth (toward viewer) — standard student convention, matches Three.js natively
  return new THREE.Vector3(value[0], value[1], value[2]);
}

export default function ThreeSceneRenderer({
  title,
  objects,
  camera,
  isBlackboard,
  sceneId,
}: {
  title?: string;
  objects: Scene3DObject[];
  camera?: [number, number, number];
  isBlackboard: boolean;
  sceneId?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<LabelEntry[]>([]);
  const addObjectRef = useRef<((obj: Scene3DObject) => void) | null>(null);
  const addAxesRef = useRef<(() => void) | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const builtCountRef = useRef(0);
  const axesAddedRef = useRef(false);
  const [sceneVersion, setSceneVersion] = useState(0);

  const safeCamera = Array.isArray(camera) ? camera : [];
  const [cx = 3.5, cy = 2.8, cz = 4.2] = safeCamera;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    builtCountRef.current = 0;
    axesAddedRef.current = false;
    addObjectRef.current = null;
    addAxesRef.current = null;
    renderRef.current = null;
    labelsRef.current = []; // clear labels on scene reinit

    const width = mount.clientWidth || 720;
    const height = 420;
    // Sync overlay canvas buffer size immediately to avoid label offset on first frames
    if (overlayRef.current) { overlayRef.current.width = width; overlayRef.current.height = height; }
    const textColor = isBlackboard ? "#f3f4f6" : "#111827";
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isBlackboard ? "#060807" : "#ffffff");

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const perspectiveCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    perspectiveCamera.position.set(cx, cy, cz);
    perspectiveCamera.lookAt(0, 0, 0);

    const controls = new OrbitControls(perspectiveCamera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;

    scene.add(new THREE.AmbientLight(0xffffff, isBlackboard ? 1.7 : 1.3));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(4, 5, 6);
    scene.add(dirLight);

    const addArrow = (start: THREE.Vector3, end: THREE.Vector3, color: string, label?: string, dashed?: boolean) => {
      const dir = end.clone().sub(start);
      const len = dir.length();
      if (len === 0) return;
      if (dashed) {
        const pts = [start.clone(), end.clone()];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineDashedMaterial({ color: new THREE.Color(color), dashSize: 0.08, gapSize: 0.04 });
        const line = new THREE.Line(geo, mat);
        line.computeLineDistances();
        scene.add(line);
      } else {
        const arrow = new THREE.ArrowHelper(dir.normalize(), start, len, new THREE.Color(color), 0.18, 0.08);
        scene.add(arrow);
      }
      if (label) {
        const dir = end.clone().sub(start).normalize();
        if (label) labelsRef.current.push({ text: label, pos: end.clone().add(dir.multiplyScalar(0.2)), color: textColor });
      }
    };

    const addAxes = () => {
      // x=right (red), y=up (green), z=toward viewer (blue)
      addArrow(new THREE.Vector3(0,0,0), new THREE.Vector3(1.6,0,0), "#ef4444");
      addArrow(new THREE.Vector3(0,0,0), new THREE.Vector3(0,1.6,0), "#22c55e");
      addArrow(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,1.6), "#3b82f6");
      labelsRef.current.push({ text: "x", pos: new THREE.Vector3(1.7,0,0), color: "#ef4444" });
      labelsRef.current.push({ text: "y", pos: new THREE.Vector3(0,1.7,0), color: "#22c55e" });
      labelsRef.current.push({ text: "z", pos: new THREE.Vector3(0,0,1.7), color: "#3b82f6" });
    };

    const buildObject = (object: Scene3DObject) => {
      const color = colorFor(object.color, isBlackboard ? "#67e8f9" : "#2563eb");
      const opacity = object.opacity ?? (object.kind === "plane" ? 0.34 : 0.82);
      const position = physicsPoint(object.position, [0, 0, 0]);

      if (object.kind === "axes") { addAxes(); return; }

      if (object.kind === "plane") {
        const size = object.size ?? [2.2, 1.4];
        const geo = new THREE.PlaneGeometry(size[0], size[1]);
        const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, roughness: 0.55 });
        const plane = new THREE.Mesh(geo, mat);
        if (object.normal) {
          const defNorm = new THREE.Vector3(0, 0, 1);
          const tgtNorm = new THREE.Vector3(...object.normal).normalize();
          plane.quaternion.setFromUnitVectors(defNorm, tgtNorm);
        } else {
          if (object.plane === "xy") plane.rotation.x = -Math.PI / 2;
          else if (object.plane === "yz") plane.rotation.y = Math.PI / 2;
        }
        plane.position.copy(position);
        scene.add(plane);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: textColor }));
        edges.quaternion.copy(plane.quaternion);
        edges.rotation.copy(plane.rotation);
        edges.position.copy(position);
        scene.add(edges);
        if (object.label) labelsRef.current.push({ text: object.label, pos: position.clone().add(new THREE.Vector3(0.1, 0.15, 0.1)), color: textColor });
        return;
      }

      if (object.kind === "vector") {
        addArrow(position, physicsPoint(object.end, [1,0,0]), color, object.label, object.dashed);
        return;
      }

      if (object.kind === "cube") {
        const sz = (object.size?.length === 3 ? object.size : [1, 1, 1]) as [number, number, number];
        const geo = new THREE.BoxGeometry(...sz);
        if (object.wireframe) {
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, linewidth: 2 }));
          edges.position.copy(position);
          scene.add(edges);
        } else {
          const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.55 });
          const cube = new THREE.Mesh(geo, mat);
          cube.position.copy(position);
          scene.add(cube);
        }
        if (object.label) if (object.label) labelsRef.current.push({ text: object.label, pos: position.clone().add(new THREE.Vector3(sz[0]/2+0.12, sz[1]/2+0.12, sz[2]/2+0.12)), color: textColor });
        return;
      }

      if (object.kind === "sphere" || object.kind === "point") {
        const geo = new THREE.SphereGeometry(object.radius ?? (object.kind === "point" ? 0.06 : 0.3), 32, 16);
        const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.55, wireframe: object.wireframe === true });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.position.copy(position);
        scene.add(sphere);
        if (object.label) if (object.label) labelsRef.current.push({ text: object.label, pos: position.clone().add(new THREE.Vector3(0.1, 0.1, 0.1)), color: textColor });
        return;
      }

      if (object.kind === "line_charge") {
        const axis = object.axis ?? "y";
        const geo = new THREE.CylinderGeometry(0.035, 0.035, 2.6, 24);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
        const line = new THREE.Mesh(geo, mat);
        if (axis === "x") line.rotation.z = Math.PI / 2;
        if (axis === "y") line.rotation.x = Math.PI / 2;
        line.position.copy(position);
        scene.add(line);
        if (object.label || "line charge") labelsRef.current.push({ text: object.label || "line charge", pos: position.clone().add(new THREE.Vector3(0.12, 1.36, 0.12)), color: textColor });
      }
    };

    addObjectRef.current = buildObject;
    addAxesRef.current = addAxes;
    renderRef.current = () => renderer.render(scene, perspectiveCamera);

    if (sceneId) {
      sceneRegistry.set(sceneId, {
        add: buildObject,
        render: () => renderer.render(scene, perspectiveCamera),
        capture: () => {
          renderer.render(scene, perspectiveCamera);
          return renderer.domElement.toDataURL("image/jpeg", 0.85);
        },
      });
    }

    let disposed = false;
    const animate = () => {
      if (disposed) return;
      controls.update();
      renderer.render(scene, perspectiveCamera);
      // Draw labels on 2D overlay canvas
      if (overlayRef.current && labelsRef.current.length > 0) {
        drawOverlayLabels(overlayRef.current, labelsRef.current, perspectiveCamera, isBlackboard);
      }
      requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      const nextW = entries[0]?.contentRect.width || width;
      renderer.setSize(nextW, height);
      perspectiveCamera.aspect = nextW / height;
      perspectiveCamera.updateProjectionMatrix();
      if (overlayRef.current) { overlayRef.current.width = nextW; overlayRef.current.height = height; }
    });
    resizeObserver.observe(mount);

    setSceneVersion(v => v + 1);

    return () => {
      disposed = true;
      if (sceneId) sceneRegistry.delete(sceneId);
      addObjectRef.current = null;
      addAxesRef.current = null;
      renderRef.current = null;
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
        }
        if (obj instanceof THREE.Sprite) { obj.material.map?.dispose(); obj.material.dispose(); }
      });
      mount.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlackboard, cx, cy, cz, sceneId]);

  useEffect(() => {
    if (!addObjectRef.current) return;
    if (builtCountRef.current === 0 && !axesAddedRef.current && !objects.some(o => o.kind === "axes")) {
      addAxesRef.current?.();
      axesAddedRef.current = true;
    }
    const newObjs = objects.slice(builtCountRef.current);
    if (newObjs.length === 0) return;
    newObjs.forEach(obj => addObjectRef.current!(obj));
    builtCountRef.current = objects.length;
    renderRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneVersion, objects.length]);

  return (
    <div className="relative h-[420px] w-full">
      <div ref={mountRef} className="h-full w-full" />
      <canvas
        ref={overlayRef}
        width={720}
        height={420}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
}
