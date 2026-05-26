import { useSyncExternalStore } from "react";

export type AmbientKind = "white" | "brown" | "binaural" | "off" | "custom";

interface CustomAudioEntry {
  name: string;
  data: string;
}

let ctx: AudioContext | null = null;
let activeNodes: AudioNode[] = [];
let customAudioEl: HTMLAudioElement | null = null;

const CUSTOM_AUDIOS_KEY = "custom_ambient_audios";
const LAST_KIND_KEY = "ambient_last_kind";
const LAST_CUSTOM_NAME_KEY = "ambient_last_custom_name";

// Reactive playing state
let _playing = false;
const _playingListeners = new Set<() => void>();

function _emitPlaying() {
  _playingListeners.forEach((l) => l());
}

export function isAudioPlaying(): boolean {
  return _playing;
}

export function subscribeToPlaying(cb: () => void): () => void {
  _playingListeners.add(cb);
  return () => {
    _playingListeners.delete(cb);
  };
}

export function useIsPlaying(): boolean {
  return useSyncExternalStore(subscribeToPlaying, isAudioPlaying, () => false);
}

function loadLastKind(): AmbientKind {
  try {
    const v = localStorage.getItem(LAST_KIND_KEY);
    if (v === "white" || v === "brown" || v === "binaural" || v === "off" || v === "custom") return v;
  } catch { /* ignore */ }
  return "off";
}

function loadLastCustomName(): string | undefined {
  try {
    return localStorage.getItem(LAST_CUSTOM_NAME_KEY) ?? undefined;
  } catch { return undefined; }
}

let lastSelectedKind: AmbientKind = loadLastKind();
let lastSelectedCustomName: string | undefined = loadLastCustomName();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function stopAmbient() {
  for (const n of activeNodes) {
    try {
      (n as AudioScheduledSourceNode).stop?.();
    } catch {
      /* noop */
    }
    try {
      n.disconnect();
    } catch {
      /* noop */
    }
  }
  activeNodes = [];
  if (customAudioEl) {
    customAudioEl.pause();
    customAudioEl = null;
  }
  _playing = false;
  _emitPlaying();
}

export function setLastSelection(kind: AmbientKind, customName?: string) {
  lastSelectedKind = kind;
  lastSelectedCustomName = customName;
  try {
    localStorage.setItem(LAST_KIND_KEY, kind);
    if (customName) {
      localStorage.setItem(LAST_CUSTOM_NAME_KEY, customName);
    } else {
      localStorage.removeItem(LAST_CUSTOM_NAME_KEY);
    }
  } catch { /* ignore */ }
}

export function getLastSelection(): { kind: AmbientKind; customName?: string } {
  return { kind: lastSelectedKind, customName: lastSelectedCustomName };
}

export function loadCustomAudios(): CustomAudioEntry[] {
  try {
    const raw = localStorage.getItem(CUSTOM_AUDIOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addCustomAudio(name: string, data: string): boolean {
  const audios = loadCustomAudios();
  if (audios.length >= 5) return false;
  audios.push({ name, data });
  localStorage.setItem(CUSTOM_AUDIOS_KEY, JSON.stringify(audios));
  return true;
}

export function removeCustomAudio(name: string) {
  const audios = loadCustomAudios().filter((a) => a.name !== name);
  localStorage.setItem(CUSTOM_AUDIOS_KEY, JSON.stringify(audios));
}

export function getCustomAudioData(name: string): string | null {
  const audios = loadCustomAudios();
  return audios.find((a) => a.name === name)?.data ?? null;
}

function makeNoiseBuffer(c: AudioContext, brown: boolean) {
  const length = c.sampleRate * 2;
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

export function playAmbient(kind: AmbientKind, customName?: string) {
  stopAmbient();
  if (kind === "off") return;

  if (kind === "custom") {
    const dataUrl = customName ? getCustomAudioData(customName) : null;
    if (!dataUrl) return;
    const el = new Audio(dataUrl);
    el.loop = true;
    el.volume = 0.5;
    el.play().catch(console.error);
    customAudioEl = el;
    _playing = true;
    _emitPlaying();
    return;
  }

  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume();

  if (kind === "white" || kind === "brown") {
    const src = c.createBufferSource();
    src.buffer = makeNoiseBuffer(c, kind === "brown");
    src.loop = true;
    const gain = c.createGain();
    gain.gain.value = kind === "brown" ? 0.35 : 0.18;
    src.connect(gain).connect(c.destination);
    src.start();
    activeNodes.push(src, gain);
  } else if (kind === "binaural") {
    const merger = c.createChannelMerger(2);
    const gain = c.createGain();
    gain.gain.value = 0.08;

    const oscL = c.createOscillator();
    oscL.frequency.value = 200;
    oscL.connect(merger, 0, 0);

    const oscR = c.createOscillator();
    oscR.frequency.value = 210; // 10 Hz beat
    oscR.connect(merger, 0, 1);

    merger.connect(gain).connect(c.destination);
    oscL.start();
    oscR.start();
    activeNodes.push(oscL, oscR, merger, gain);
  }
  _playing = true;
  _emitPlaying();
}
