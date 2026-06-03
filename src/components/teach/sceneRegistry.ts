import type { Scene3DObject } from "@/types/teach";

export const sceneRegistry = new Map<string, {
  add: (obj: Scene3DObject) => void;
  render: () => void;
  capture: () => string | null;
}>();
