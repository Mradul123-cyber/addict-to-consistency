import { useSyncExternalStore } from "react";
import { SEED_TRACKS } from "./seed";

export type Priority = "High" | "Medium";

export interface Chapter {
  id: string;
  trackId: string;
  name: string;
  priority: Priority;
  completion: number;
}

export interface Track {
  id: string;
  name: string;
  chapters: Chapter[];
}

export interface SessionLog {
  id: string;
  chapterId: string | null;
  dateISO: string; // YYYY-MM-DD
  minutes: number;
  focusRating?: 1 | 2 | 3 | 4 | 5;
  source: "timer" | "manual";
  createdAt: number;
}

const TRACKS_KEY = "jee.tracks";
const SESSIONS_KEY = "jee.sessions";

const isBrowser = typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
}

let tracks: Track[] = [];
let sessions: SessionLog[] = [];
let initialized = false;

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function ensureInit() {
  if (initialized || !isBrowser) return;
  tracks = read<Track[]>(TRACKS_KEY, []);
  if (!tracks || tracks.length === 0) {
    tracks = JSON.parse(JSON.stringify(SEED_TRACKS));
    write(TRACKS_KEY, tracks);
  }
  sessions = read<SessionLog[]>(SESSIONS_KEY, []);
  initialized = true;
}

function snapshot() {
  ensureInit();
  return { tracks, sessions };
}

let cachedSnap: { tracks: Track[]; sessions: SessionLog[] } = { tracks: [], sessions: [] };
let snapVersion = 0;
function getSnapshot() {
  ensureInit();
  return cachedSnap;
}
function refreshSnap() {
  cachedSnap = { tracks, sessions };
  snapVersion++;
}

function subscribe(cb: () => void) {
  ensureInit();
  refreshSnap();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const serverSnap = { tracks: [] as Track[], sessions: [] as SessionLog[] };

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnap);
}

// Mutations
export function setChapterCompletion(chapterId: string, completion: number) {
  ensureInit();
  const clamped = Math.max(0, Math.min(100, Math.round(completion)));
  tracks = tracks.map((t) => ({
    ...t,
    chapters: t.chapters.map((c) =>
      c.id === chapterId ? { ...c, completion: clamped } : c,
    ),
  }));
  write(TRACKS_KEY, tracks);
  refreshSnap();
  emit();
}

export function bumpChapterFromSession(chapterId: string, minutes: number, rating: number) {
  ensureInit();
  const chapter = tracks.flatMap((t) => t.chapters).find((c) => c.id === chapterId);
  if (!chapter) return;
  // weight by rating (3 = neutral)
  const weight = 0.7 + (rating / 5) * 0.6;
  const delta = (minutes / 30) * weight; // ~1% per 30min at rating 3
  setChapterCompletion(chapterId, chapter.completion + delta);
}

export function addSession(input: Omit<SessionLog, "id" | "createdAt">) {
  ensureInit();
  const log: SessionLog = {
    ...input,
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  sessions = [...sessions, log];
  write(SESSIONS_KEY, sessions);
  if (log.chapterId) {
    bumpChapterFromSession(log.chapterId, log.minutes, log.focusRating ?? 3);
  } else {
    refreshSnap();
    emit();
  }
}

export function getSnapshotSync() {
  return snapshot();
}
